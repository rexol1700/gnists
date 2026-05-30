const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const Anthropic = require('@anthropic-ai/sdk');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'myboard-secret-change-in-production';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// ── STRIPE CONFIG ────────────────────────────────────────────────────────────
// STRIPE_MODE picks which set of keys/price IDs are used. Default 'test' so a
// misconfigured deploy can never charge real cards. Flip to 'live' explicitly.
const STRIPE_MODE = (process.env.STRIPE_MODE || 'test').toLowerCase();
const STRIPE_ENABLED = process.env.STRIPE_ENABLED !== 'false'; // set 'false' to disable the paywall entirely
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

function stripeEnv(name) {
    // Reads STRIPE_FOO_TEST or STRIPE_FOO_LIVE depending on mode
    return process.env[`STRIPE_${name}_${STRIPE_MODE.toUpperCase()}`] || '';
}

const STRIPE_SECRET_KEY      = stripeEnv('SECRET_KEY');
const STRIPE_PUBLISHABLE_KEY = stripeEnv('PUBLISHABLE_KEY');
const STRIPE_WEBHOOK_SECRET  = stripeEnv('WEBHOOK_SECRET');
// Four Stripe Price IDs per mode: recurring monthly + one-time "first 30 days" charge, for NOK and EUR.
const PRICE_NOK_MONTHLY = stripeEnv('PRICE_NOK_MONTHLY');
const PRICE_NOK_SETUP   = stripeEnv('PRICE_NOK_SETUP');
const PRICE_EUR_MONTHLY = stripeEnv('PRICE_EUR_MONTHLY');
const PRICE_EUR_SETUP   = stripeEnv('PRICE_EUR_SETUP');

const PRICES = {
    NOK: { monthly: PRICE_NOK_MONTHLY, setup: PRICE_NOK_SETUP, monthlyAmount: 70,   setupAmount: 10   },
    EUR: { monthly: PRICE_EUR_MONTHLY, setup: PRICE_EUR_SETUP, monthlyAmount: 5.95, setupAmount: 0.85 },
};

const stripe = (STRIPE_ENABLED && STRIPE_SECRET_KEY) ? new Stripe(STRIPE_SECRET_KEY) : null;

function billingConfigured() {
    if (!STRIPE_ENABLED) return false;
    if (!stripe) return false;
    // Need at least one currency fully wired (both monthly + setup price)
    return (PRICES.NOK.monthly && PRICES.NOK.setup) || (PRICES.EUR.monthly && PRICES.EUR.setup);
}

console.log(`Stripe: ${STRIPE_ENABLED ? `enabled (${STRIPE_MODE} mode, ${billingConfigured() ? 'configured' : 'NOT FULLY CONFIGURED — paywall disabled'})` : 'disabled'}`);

// ── AI COST GUARDRAIL ────────────────────────────────────────────────────────
// Two-tier model:
//   • Paid users (trialing, active, past_due-in-grace, grandfathered) get a
//     generous soft monthly EUR budget. When tripped, /api/ai returns 429 with
//     code 'ai_budget_exceeded'; the rest of the app keeps working.
//   • Free users get a hard cap of FREE_AI_GENERATIONS_PER_MONTH AI calls per
//     rolling 30-day window. When exceeded, /api/ai returns 402 with code
//     'free_limit_reached'; the rest of the app keeps working.
// Tune the paid budget via AI_BUDGET_EUR_PER_MONTH env var. The pricing
// constants below are Anthropic Haiku 4.5 list prices in USD/M tokens,
// converted to EUR with a fixed FX rate (USD→EUR ~0.92, biased slightly
// upward for safety).
const AI_BUDGET_EUR_PER_MONTH       = parseFloat(process.env.AI_BUDGET_EUR_PER_MONTH || '4');
const FREE_AI_GENERATIONS_PER_MONTH = parseInt(process.env.FREE_AI_GENERATIONS_PER_MONTH || '10', 10);
const HAIKU_INPUT_EUR_PER_TOKEN  = 1.00 * 0.92 / 1_000_000;  // ~€0.00000092
const HAIKU_OUTPUT_EUR_PER_TOKEN = 5.00 * 0.92 / 1_000_000;  // ~€0.0000046
const AI_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function aiCostEur(inTokens, outTokens) {
    return (inTokens || 0) * HAIKU_INPUT_EUR_PER_TOKEN
         + (outTokens || 0) * HAIKU_OUTPUT_EUR_PER_TOKEN;
}

// Refresh the per-user budget window if the previous one has expired, then
// return { spentEur, remainingEur, resetAtMs }. Pure read + housekeeping.
function aiBudgetState(userId) {
    const user = getUserById(userId);
    if (!user) return { spentEur: 0, remainingEur: AI_BUDGET_EUR_PER_MONTH, resetAtMs: Date.now() + AI_PERIOD_MS };

    const now = Date.now();
    let periodStart = user.ai_period_start || 0;
    let tokensIn  = user.ai_tokens_in  || 0;
    let tokensOut = user.ai_tokens_out || 0;

    // Reset window if it expired (or never started)
    if (!periodStart || now > periodStart + AI_PERIOD_MS) {
        periodStart = now;
        tokensIn = 0;
        tokensOut = 0;
        run('UPDATE users SET ai_period_start = ?, ai_tokens_in = 0, ai_tokens_out = 0 WHERE id = ?', [periodStart, userId]);
    }

    const spentEur = aiCostEur(tokensIn, tokensOut);
    return {
        spentEur,
        remainingEur: Math.max(0, AI_BUDGET_EUR_PER_MONTH - spentEur),
        resetAtMs: periodStart + AI_PERIOD_MS,
    };
}

function aiRecordUsage(userId, inTokens, outTokens) {
    run('UPDATE users SET ai_tokens_in = ai_tokens_in + ?, ai_tokens_out = ai_tokens_out + ? WHERE id = ?',
        [inTokens || 0, outTokens || 0, userId]);
}

// Free-tier generation counter — independent of the paid EUR budget. Counts
// raw AI calls per rolling 30-day window. Returns
// { used, limit, remaining, resetAtMs } and resets the window if expired.
function freeGenState(userId) {
    const user = getUserById(userId);
    if (!user) return { used: 0, limit: FREE_AI_GENERATIONS_PER_MONTH, remaining: FREE_AI_GENERATIONS_PER_MONTH, resetAtMs: Date.now() + AI_PERIOD_MS };

    const now = Date.now();
    let periodStart = user.ai_gen_period_start || 0;
    let used        = user.ai_gen_count || 0;

    if (!periodStart || now > periodStart + AI_PERIOD_MS) {
        // Lazily start the window on first read after expiry. We DON'T start
        // it on signup — only when the user actually makes an AI call. This
        // matches the "30 days from first generation" UX promise.
        if (periodStart) {
            // Expired window — reset
            periodStart = 0;
            used = 0;
            run('UPDATE users SET ai_gen_period_start = 0, ai_gen_count = 0 WHERE id = ?', [userId]);
        }
    }

    const resetAtMs = periodStart ? periodStart + AI_PERIOD_MS : 0; // 0 = not started yet
    return {
        used,
        limit: FREE_AI_GENERATIONS_PER_MONTH,
        remaining: Math.max(0, FREE_AI_GENERATIONS_PER_MONTH - used),
        resetAtMs,
    };
}

// Charge one free-tier generation. Starts the 30-day window on the first
// call. Idempotent w.r.t. window expiry — caller should freeGenState() first.
function freeGenRecord(userId) {
    const user = getUserById(userId);
    if (!user) return;
    const now = Date.now();
    const periodStart = user.ai_gen_period_start || 0;
    if (!periodStart) {
        run('UPDATE users SET ai_gen_period_start = ?, ai_gen_count = 1 WHERE id = ?', [now, userId]);
    } else {
        run('UPDATE users SET ai_gen_count = ai_gen_count + 1 WHERE id = ?', [userId]);
    }
}

// New canonical DB path. If a legacy gnists.db exists in the same dir, use that
// (so existing deployments migrate seamlessly without losing data).
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH_NEW = path.join(DATA_DIR, 'myboard.db');
const DB_PATH_LEGACY = path.join(DATA_DIR, 'gnists.db');
const DB_PATH = fs.existsSync(DB_PATH_NEW) ? DB_PATH_NEW
              : fs.existsSync(DB_PATH_LEGACY) ? DB_PATH_LEGACY
              : DB_PATH_NEW;

// Stripe webhook needs the raw request body for signature verification, so it
// has to be registered BEFORE express.json() rewrites req.body.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => stripeWebhook(req, res));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── DATABASE SETUP ────────────────────────────────────────────────────────────
let db;
let SQL;

async function initDB() {
    SQL = await initSqlJs();

    // Load existing DB from disk, or create fresh
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // ── BILLING MIGRATION ────────────────────────────────────────────────────
    // Add billing columns to users (idempotent).
    // Status values: 'grandfathered' | 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
    const existingCols = query("PRAGMA table_info(users)").map(c => c.name);
    const subscriptionStatusExisted = existingCols.includes('subscription_status');
    const addCol = (name, def) => {
        if (!existingCols.includes(name)) db.run(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
    };
    addCol('stripe_customer_id',              'TEXT');
    addCol('stripe_subscription_id',          'TEXT');
    addCol('subscription_status',             "TEXT DEFAULT 'none'");
    addCol('subscription_current_period_end', 'INTEGER DEFAULT 0');
    // AI cost tracking — see AI_BUDGET_EUR_PER_MONTH below. Stored as raw
    // token counts so pricing changes don't require a data migration.
    addCol('ai_tokens_in',                    'INTEGER DEFAULT 0');
    addCol('ai_tokens_out',                   'INTEGER DEFAULT 0');
    addCol('ai_period_start',                 'INTEGER DEFAULT 0');
    // Free-tier generation counter (rolling 30-day window). Independent of
    // the EUR token budget above — that one bounds paid users, this one
    // bounds free users at FREE_AI_GENERATIONS_PER_MONTH calls.
    addCol('ai_gen_count',                    'INTEGER DEFAULT 0');
    addCol('ai_gen_period_start',             'INTEGER DEFAULT 0');
    // Sticky flag: once a user has redeemed the 30-day intro trial, they
    // can't redeem it again. New checkouts from this user skip the trial.
    addCol('has_used_trial',                  'INTEGER DEFAULT 0');

    // ONE-TIME grandfather: only on the first boot where subscription_status
    // didn't exist yet. Anyone who already had an account at that moment is
    // marked grandfathered forever. On every subsequent boot this block is a
    // no-op, so a new user who signs up but never pays stays 'none'.
    if (!subscriptionStatusExisted) {
        const result = query("SELECT COUNT(*) as c FROM users");
        const userCount = result[0]?.c || 0;
        if (userCount > 0) {
            db.run(`UPDATE users SET subscription_status = 'grandfathered'`);
            console.log(`Grandfathered ${userCount} existing user(s) onto free access`);
        }
    }

    // Each list type per user: interests, questions, learningGoals, keywords, tasks, ...
    db.run(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            list_name TEXT NOT NULL,
            content TEXT NOT NULL,
            extra TEXT DEFAULT '',
            position INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            ischecked INTEGER DEFAULT 0,
            FOREIGN KEY(task_id) REFERENCES items(id) ON DELETE CASCADE
        )
    `);

    saveDB();
    console.log('Database ready');
}

function saveDB() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function query(sql, params = []) {
    // sql.js exec() returns [{columns, values}] - convert to array of objects
    const results = db.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

function run(sql, params = []) {
    db.run(sql, params);
    const result = query('SELECT last_insert_rowid() as id');
    saveDB();
    return result[0]?.id;
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not signed in' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const rawUser = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!rawUser || !password) return res.status(400).json({ error: 'Missing username or password' });
    if (rawUser.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (rawUser.length > 50) return res.status(400).json({ error: 'Username must be 50 characters or fewer' });
    if (!/^[a-zA-Z0-9_.\-]+$/.test(rawUser)) return res.status(400).json({ error: 'Username may only contain letters, numbers, underscores, hyphens and dots' });
    if (password.length < 4)   return res.status(400).json({ error: 'Password must be at least 4 characters' });
    // Guard against bcrypt DoS — bcrypt truncates at 72 bytes but still allocates/processes the full string.
    if (password.length > 128) return res.status(400).json({ error: 'Password must be 128 characters or fewer' });
    const username = rawUser;

    const existing = query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(409).json({ error: 'Username is already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const id = run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    // isNew flag tells the client to start onboarding for this account
    res.json({ token, username, isNew: true });
});

app.post('/api/login', async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) return res.status(401).json({ error: 'Wrong username or password' });
    if (username.length > 50 || password.length > 128) return res.status(401).json({ error: 'Wrong username or password' });
    const users = query('SELECT * FROM users WHERE username = ?', [username]);
    if (!users.length) return res.status(401).json({ error: 'Wrong username or password' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Wrong username or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, isNew: false });
});

// ── BILLING ──────────────────────────────────────────────────────────────────

function getUserById(id) {
    const rows = query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

// True if the user has a paid (or grandfathered) plan — i.e. unmetered AI.
// Trial counts: during the 30-day trial Stripe sets status='trialing' and we
// honour it. After cancellation but before period_end, Stripe sets
// status='active' with cancel_at_period_end=true — still active.
// past_due gets a short grace via period_end check — payment retry happens
// before the period ends, and when it lapses Stripe transitions to canceled,
// at which point isPaid() returns false and the user falls back to free tier
// (they keep all their data; only AI is now metered).
function isPaid(user) {
    if (!user) return false;
    const s = user.subscription_status;
    if (s === 'grandfathered') return true;
    if (s === 'trialing' || s === 'active') return true;
    if (s === 'past_due' && user.subscription_current_period_end > Math.floor(Date.now() / 1000)) return true;
    return false;
}

// Returns current billing state for the logged-in user, plus the public price
// info the paywall view needs to render. Never returns secret keys.
app.get('/api/billing/status', auth, async (req, res) => {
    let user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If the webhook didn't reach us, this re-pulls the truth from Stripe
    // and updates our row. Then we re-read the user before responding.
    await resyncFromStripeIfStuck(user);
    user = getUserById(req.user.id);

    const access = isPaid(user);
    const tier = access ? 'paid' : 'free';
    const free = freeGenState(user.id);
    const canTrial = !user.has_used_trial;
    res.json({
        enabled: billingConfigured(),
        mode: STRIPE_MODE,
        status: user.subscription_status || 'none',
        // hasAccess used to mean "can use the app at all". Now everyone can
        // use the app — kept here for backwards compat with older clients
        // (always true; clients should use `tier === 'paid'` instead).
        hasAccess: true,
        tier,
        isPaid: access,
        canTrial,
        freeGenerations: {
            used: free.used,
            limit: free.limit,
            remaining: free.remaining,
            resetAtMs: free.resetAtMs,
        },
        currentPeriodEnd: user.subscription_current_period_end || 0,
        prices: {
            NOK: {
                available: !!(PRICES.NOK.monthly && PRICES.NOK.setup),
                setupAmount: PRICES.NOK.setupAmount,
                monthlyAmount: PRICES.NOK.monthlyAmount,
            },
            EUR: {
                available: !!(PRICES.EUR.monthly && PRICES.EUR.setup),
                setupAmount: PRICES.EUR.setupAmount,
                monthlyAmount: PRICES.EUR.monthlyAmount,
            },
        },
    });
});

// Create a Stripe Checkout Session for the requested currency and return its URL.
// Body: { currency: 'NOK' | 'EUR' }
app.post('/api/billing/checkout', auth, async (req, res) => {
    if (!billingConfigured()) return res.status(503).json({ error: 'Billing is not configured on this server' });

    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isPaid(user)) return res.status(400).json({ error: 'You already have access' });

    const currency = (req.body?.currency || 'NOK').toUpperCase();
    const priceSet = PRICES[currency];
    if (!priceSet || !priceSet.monthly || !priceSet.setup) {
        return res.status(400).json({ error: `Currency ${currency} not configured` });
    }

    try {
        // Reuse a Stripe customer per user. The customer object holds the
        // user's payment methods, address and subscription history across
        // visits — without it Stripe would create a new customer per checkout.
        let customerId = user.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                metadata: { user_id: String(user.id), username: user.username },
            });
            customerId = customer.id;
            run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, user.id]);
        }

        // The 30-day intro trial + setup-price combo is once-per-user. If
        // the user has redeemed it before (canceled, came back), Checkout
        // skips both the trial and the one-time setup price, billing the
        // normal monthly price immediately. has_used_trial flips to 1 the
        // first time we see a trialing/active subscription for this user.
        const offerTrial = !user.has_used_trial;
        const line_items = offerTrial
            ? [
                { price: priceSet.monthly, quantity: 1 },  // recurring, billed after trial
                { price: priceSet.setup,   quantity: 1 },  // one-time, billed today
              ]
            : [
                { price: priceSet.monthly, quantity: 1 },  // recurring, billed today
              ];
        const subscription_data = offerTrial
            ? { trial_period_days: 30, metadata: { user_id: String(user.id) } }
            : { metadata: { user_id: String(user.id) } };

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items,
            subscription_data,
            metadata: { user_id: String(user.id) },
            allow_promotion_codes: true,
            success_url: `${APP_URL}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${APP_URL}/?billing=cancel`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: err.message || 'Failed to create checkout session' });
    }
});

// Send the user to Stripe's hosted Customer Portal where they can update card,
// see invoices, and cancel. Cancel-any-time is enforced by Stripe portal settings.
app.post('/api/billing/portal', auth, async (req, res) => {
    if (!billingConfigured()) return res.status(503).json({ error: 'Billing is not configured on this server' });

    const user = getUserById(req.user.id);
    if (!user || !user.stripe_customer_id) {
        return res.status(400).json({ error: 'No Stripe customer for this account yet' });
    }

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${APP_URL}/`,
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe portal error:', err);
        res.status(500).json({ error: err.message || 'Failed to open customer portal' });
    }
});

// ── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
// Registered earlier with express.raw() so req.body is a Buffer for signature
// verification. Stripe is the source of truth for subscription state — we
// mirror only what we need to decide hasAccess().
async function stripeWebhook(req, res) {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        console.error('Stripe webhook: rejected — webhook not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET for current mode)');
        return res.status(503).send('Webhook not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Stripe webhook: signature verification failed (${err.message}). Check STRIPE_WEBHOOK_SECRET_${STRIPE_MODE.toUpperCase()} matches the secret shown in the Stripe Dashboard for this endpoint.`);
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`Stripe webhook: ${event.type} (${event.id})`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = parseInt(session.metadata?.user_id, 10);
                if (!userId) {
                    console.error(`Stripe webhook: ${event.type} has no user_id in metadata — can't link to a user. session=${session.id}`);
                    break;
                }
                if (session.subscription) {
                    const sub = await stripe.subscriptions.retrieve(session.subscription);
                    applySubscriptionToUser(userId, sub, session.customer);
                } else {
                    console.error(`Stripe webhook: checkout.session.completed has no subscription id. session=${session.id}`);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const userId = parseInt(sub.metadata?.user_id, 10) || findUserByCustomerId(sub.customer);
                if (!userId) {
                    console.error(`Stripe webhook: ${event.type} couldn't find a matching local user. customer=${sub.customer} sub=${sub.id}`);
                    break;
                }
                applySubscriptionToUser(userId, sub, sub.customer);
                break;
            }
            // Failed payments leave the subscription in past_due — covered above.
        }
        res.json({ received: true });
    } catch (err) {
        console.error('Stripe webhook: handler error:', err);
        // Returning 200 still — Stripe will retry if we 500, but a handler bug
        // shouldn't cause infinite retries. We logged it; investigate manually.
        res.status(200).json({ received: true, handler_error: true });
    }
}

function findUserByCustomerId(customerId) {
    if (!customerId) return null;
    const rows = query('SELECT id FROM users WHERE stripe_customer_id = ?', [customerId]);
    return rows[0]?.id || null;
}

// Stripe API versions >= 2025-03-31 moved current_period_end off the
// Subscription object onto each subscription item. Read whichever is present
// so the same code works against old and new API versions.
function subscriptionPeriodEnd(subscription) {
    if (subscription.current_period_end) return subscription.current_period_end;
    const items = subscription.items?.data || [];
    for (const it of items) {
        if (it.current_period_end) return it.current_period_end;
    }
    return 0;
}

function applySubscriptionToUser(userId, subscription, customerId) {
    // Map Stripe's status onto our column. 'canceled' or 'incomplete_expired'
    // means the user falls back to the free tier. Otherwise mirror Stripe.
    let status = subscription.status; // trialing | active | past_due | canceled | unpaid | incomplete | incomplete_expired
    if (status === 'incomplete_expired' || status === 'unpaid') status = 'canceled';

    // Sticky once-per-user trial flag. The first time we ever see this user
    // in trialing/active (i.e. they actually started a paid plan), record it
    // so a future re-subscribe skips the 30-day trial + setup price.
    const isPaying = status === 'trialing' || status === 'active' || status === 'past_due';
    const trialFlagSet = isPaying ? 1 : 0;

    const periodEnd = subscriptionPeriodEnd(subscription);
    run(`UPDATE users SET subscription_status = ?, stripe_subscription_id = ?, stripe_customer_id = COALESCE(stripe_customer_id, ?), subscription_current_period_end = ?, has_used_trial = MAX(has_used_trial, ?) WHERE id = ?`,
        [status, subscription.id, customerId || null, periodEnd, trialFlagSet, userId]);
    console.log(`Stripe: applied sub ${subscription.id} status=${status} period_end=${periodEnd} to user ${userId}`);
}

// Self-heal: if our local row says "no subscription" but the user has a
// Stripe customer (i.e. they went through checkout), ask Stripe what their
// subscription actually looks like and mirror it locally. Covers the case
// where the webhook never reached us (bad URL, wrong secret, brief outage).
// Safe to call on every /api/billing/status; cheap when there's nothing to do.
async function resyncFromStripeIfStuck(user) {
    if (!user || !stripe) return;
    if (!user.stripe_customer_id) return;
    const s = user.subscription_status;
    // Only resync when we'd otherwise tell the user "no access" — don't
    // hammer Stripe for every status check from a healthy subscriber.
    if (s === 'trialing' || s === 'active' || s === 'grandfathered') return;

    try {
        const list = await stripe.subscriptions.list({
            customer: user.stripe_customer_id,
            status: 'all',
            limit: 5,
        });
        // Prefer an active/trialing/past_due subscription; fall back to most recent
        const live = list.data.find(x => x.status === 'trialing' || x.status === 'active' || x.status === 'past_due');
        const sub  = live || list.data[0];
        if (sub) {
            console.log(`Stripe: resync recovered user ${user.id} (was '${s}', stripe says '${sub.status}')`);
            applySubscriptionToUser(user.id, sub, user.stripe_customer_id);
        }
    } catch (err) {
        console.error(`Stripe: resync for user ${user.id} failed:`, err.message);
    }
}

// ── DATA ROUTES ───────────────────────────────────────────────────────────────

// Get all data for logged-in user
app.get('/api/data', auth, (req, res) => {
    const userId = req.user.id;

    const simpleItems = query(
        `SELECT id, list_name, content, extra, position FROM items WHERE user_id = ? AND list_name != 'tasks' ORDER BY position ASC`,
        [userId]
    );

    const taskItems = query(
        `SELECT id, content, extra, position FROM items WHERE user_id = ? AND list_name = 'tasks' ORDER BY position ASC`,
        [userId]
    );

    // Attach subtasks. Tasks store their state in `extra` using a small
    // pipe-separated format so a scheduled date can ride along with the
    // checkbox state without a schema change:
    //   ''        → unchecked, no date          (legacy)
    //   '0'       → unchecked, no date          (legacy)
    //   '1'       → checked, no date            (legacy)
    //   '0|2026-02-15' → unchecked, scheduled on that day
    //   '1|2026-02-15' → checked,   scheduled on that day
    // Older rows without a pipe still parse correctly.
    const tasks = taskItems.map(t => {
        const subs = query('SELECT id, content, ischecked FROM subtasks WHERE task_id = ? ORDER BY id ASC', [t.id]);
        const extra = t.extra || '';
        const idx = extra.indexOf('|');
        const flag = idx === -1 ? extra : extra.slice(0, idx);
        const date = idx === -1 ? '' : extra.slice(idx + 1);
        return {
            id: t.id,
            task: t.content,
            ischecked: flag === '1',
            date,
            subtasks: subs.map(s => ({ id: s.id, task: s.content, ischecked: s.ischecked === 1 }))
        };
    });

    // Group simple items by list
    const grouped = {};
    for (const item of simpleItems) {
        if (!grouped[item.list_name]) grouped[item.list_name] = [];
        grouped[item.list_name].push({ id: item.id, value: item.content, extra: item.extra });
    }

    res.json({ lists: grouped, tasks });
});

// Add item to a list
app.post('/api/data/:listName', auth, (req, res) => {
    const { listName } = req.params;
    const { content, extra = '' } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Empty content' });

    const count = query('SELECT COUNT(*) as c FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, listName]);
    const pos = count[0].c;

    const id = run(
        'INSERT INTO items (user_id, list_name, content, extra, position) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, listName, content.trim(), extra, pos]
    );
    res.json({ id });
});

// Update item (for keyword meaning, task checked state, scheduled date, etc.)
app.patch('/api/data/item/:id', auth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { extra, content, ischecked } = req.body;

    const rows = query('SELECT id, extra FROM items WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Not allowed' });

    if (extra !== undefined) run('UPDATE items SET extra = ? WHERE id = ?', [extra, id]);
    if (content !== undefined) run('UPDATE items SET content = ? WHERE id = ?', [content.trim(), id]);
    // Toggling the checkbox shouldn't blow away the task's scheduled date.
    // Preserve everything to the right of the first '|' (the task `date`
    // payload) and rewrite only the first segment.
    if (ischecked !== undefined) {
        const cur = rows[0].extra || '';
        const idx = cur.indexOf('|');
        const rest = idx === -1 ? '' : cur.slice(idx); // includes the leading '|'
        const next = `${ischecked ? '1' : '0'}${rest}`;
        run('UPDATE items SET extra = ? WHERE id = ?', [next, id]);
    }

    res.json({ ok: true });
});

// Delete item
app.delete('/api/data/item/:id', auth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = query('SELECT id FROM items WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!item.length) return res.status(403).json({ error: 'Not allowed' });
    run('DELETE FROM subtasks WHERE task_id = ?', [id]);
    run('DELETE FROM items WHERE id = ?', [id]);
    res.json({ ok: true });
});

// Reset entire list
app.delete('/api/data/:listName', auth, (req, res) => {
    const { listName } = req.params;
    const items = query('SELECT id FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, listName]);
    for (const item of items) {
        run('DELETE FROM subtasks WHERE task_id = ?', [item.id]);
    }
    run('DELETE FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, listName]);
    res.json({ ok: true });
});

// Add task
app.post('/api/tasks', auth, (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Empty content' });
    const count = query('SELECT COUNT(*) as c FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, 'tasks']);
    const id = run(
        'INSERT INTO items (user_id, list_name, content, extra, position) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'tasks', content.trim(), '0', count[0].c]
    );
    res.json({ id });
});

// Add subtask
app.post('/api/tasks/:taskId/subtasks', auth, (req, res) => {
    const taskId = parseInt(req.params.taskId, 10);
    const { content } = req.body;
    const task = query('SELECT id FROM items WHERE id = ? AND user_id = ? AND list_name = ?', [taskId, req.user.id, 'tasks']);
    if (!task.length) return res.status(403).json({ error: 'Not allowed' });
    const id = run('INSERT INTO subtasks (task_id, content) VALUES (?, ?)', [taskId, content.trim()]);
    res.json({ id });
});

// Toggle subtask
app.patch('/api/subtasks/:id', auth, (req, res) => {
    const { ischecked } = req.body;
    run('UPDATE subtasks SET ischecked = ? WHERE id = ?', [ischecked ? 1 : 0, parseInt(req.params.id, 10)]);
    res.json({ ok: true });
});

// Delete subtask
app.delete('/api/subtasks/:id', auth, (req, res) => {
    run('DELETE FROM subtasks WHERE id = ?', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
});

// ── AI ROUTE ──────────────────────────────────────────────────────────────────
// Short-window spam throttle: max 100 AI calls per user per 5 minutes. Real
// cost protection lives in the monthly EUR budget cap above; this just stops
// runaway clients and accidental button-mashing.
const aiRateBucket = new Map();
function aiRateLimit(userId) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const max = 100;
    const entry = aiRateBucket.get(userId) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count += 1;
    aiRateBucket.set(userId, entry);
    return entry.count <= max;
}

app.post('/api/ai', auth, async (req, res) => {
    if (!aiRateLimit(req.user.id)) return res.status(429).json({ error: 'Too many AI requests — try again later' });

    // Two-tier gate. Paid users hit the EUR cost budget; free users hit the
    // hard generation count cap. The client distinguishes the two by `code`
    // so it can show the right message (and the right CTA — "Upgrade" for
    // free_limit_reached, "Come back next month" for ai_budget_exceeded).
    // Gate runs BEFORE the anthropic-availability check so the user sees a
    // useful free-tier nudge even on misconfigured deployments.
    const userRow = getUserById(req.user.id);
    const userIsPaid = isPaid(userRow);
    if (userIsPaid) {
        const budget = aiBudgetState(req.user.id);
        if (budget.remainingEur <= 0) {
            return res.status(429).json({
                error: 'AI budget for this month is used up',
                code: 'ai_budget_exceeded',
                resetAt: budget.resetAtMs,
                budgetEur: AI_BUDGET_EUR_PER_MONTH,
            });
        }
    } else {
        const free = freeGenState(req.user.id);
        if (free.remaining <= 0) {
            return res.status(402).json({
                error: `Free plan limit reached (${free.used}/${free.limit} AI generations this month)`,
                code: 'free_limit_reached',
                used: free.used,
                limit: free.limit,
                resetAt: free.resetAtMs,
            });
        }
    }

    if (!anthropic) return res.status(503).json({ error: 'AI is not configured on this server' });

    const { kind, text, lang } = req.body;
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Empty input' });
    if (text.length > 1500) return res.status(400).json({ error: 'Input too long' });
    const validKinds = ['define', 'answer', 'ingredients', 'instructions'];
    if (!validKinds.includes(kind)) return res.status(400).json({ error: 'Invalid kind' });

    const isNo = lang === 'no';
    let system;
    if (kind === 'define') {
        system = isNo
            ? 'Du forklarer ord og uttrykk kort og presist. Svar med 1–2 setninger, maks 40 ord. Ingen innledning, ingen "Definisjon:"-prefiks. Skriv på norsk.'
            : 'You explain words and phrases concisely. Answer in 1–2 sentences, max 40 words. No preamble, no "Definition:" prefix. Write in English.';
    } else if (kind === 'answer') {
        system = isNo
            ? 'Du svarer på spørsmål direkte og kort, maks 4 setninger eller en kort punktliste. Ingen innledning som "Godt spørsmål". Hvis du er usikker, si det. Skriv på norsk.'
            : 'You answer questions directly and briefly, max 4 sentences or a short bullet list. No preamble like "Great question". If unsure, say so. Write in English.';
    } else if (kind === 'ingredients') {
        system = isNo
            ? 'Du foreslår ingredienser for en oppskrift. Returner KUN ingrediensnavn, ett per linje. Ingen nummerering, punktlister, overskrifter eller forklaringer. Inkluder mengder der det er naturlig (f.eks. "500 g kjøttdeig", "2 hvitløksfedd"). Antar 4 porsjoner. Maks 12 ingredienser. Skriv på norsk.'
            : 'You suggest ingredients for a recipe. Return ONLY ingredient names, one per line. No numbering, bullets, headings, or explanations. Include quantities where natural (e.g. "500 g ground beef", "2 cloves garlic"). Assume 4 servings. Max 12 ingredients. Write in English.';
    } else { // instructions
        system = isNo
            ? 'Du skriver tydelige oppskriftsinstruksjoner i markdown. Bruk nummererte steg (1., 2., …). For hver ingrediens som tilsettes, forklar KORT hvorfor – smak, tekstur, kjemi eller teknikk – i kursiv eller parentes. Hold tonen varm og praktisk, ikke akademisk. Maks 8 steg. Start direkte med steg 1, ingen innledning. Skriv på norsk.'
            : 'You write clear cooking instructions in markdown. Use numbered steps (1., 2., …). For each ingredient added, briefly explain WHY — flavor, texture, chemistry, or technique — in italics or parentheses. Keep the tone warm and practical, not academic. Max 8 steps. Start directly with step 1, no preamble. Write in English.';
    }

    try {
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: kind === 'instructions' ? 1200 : 400,
            system,
            messages: [{ role: 'user', content: text.trim() }],
        });

        // Always charge the user for what the API actually billed us, even on
        // partial/errored responses below. Anthropic returns usage even on
        // stop_reason='max_tokens' etc.
        const usage = response.usage || {};
        const inTok  = (usage.input_tokens  || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
        const outTok = usage.output_tokens || 0;
        aiRecordUsage(req.user.id, inTok, outTok);
        // Free-tier users also burn one of their 10 monthly generations.
        // Paid users only pay against the EUR budget; their gen counter
        // is left alone so it doesn't matter if they ever drop to free
        // later — they'd start with a fresh quota.
        if (!userIsPaid) freeGenRecord(req.user.id);

        const out = (response.content || [])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('')
            .trim();
        res.json({ text: out });
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const msg = err && err.message ? err.message : 'AI request failed';
        res.status(status === 401 || status === 403 ? 503 : 500).json({ error: msg });
    }
});

// Fallback to index.html for SPA
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// ── START ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
    app.listen(PORT, () => console.log(`MyBoard running on http://localhost:${PORT}`));
});
