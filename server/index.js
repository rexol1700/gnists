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
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const existing = query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(409).json({ error: 'Username is already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const id = run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    // isNew flag tells the client to start onboarding for this account
    res.json({ token, username, isNew: true });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
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

// True if the user has an active paid (or grandfathered) plan.
// Trial counts: during the 30-day trial Stripe sets status='trialing' and we
// honour it. After cancellation but before period_end, Stripe sets
// status='active' with cancel_at_period_end=true — still active.
function hasAccess(user) {
    if (!user) return false;
    if (!billingConfigured()) return true; // Paywall not wired → app stays open (dev/local)
    const s = user.subscription_status;
    if (s === 'grandfathered') return true;
    if (s === 'trialing' || s === 'active') return true;
    // past_due gets a short grace via period_end check
    if (s === 'past_due' && user.subscription_current_period_end > Math.floor(Date.now() / 1000)) return true;
    return false;
}

function requireActiveSubscription(req, res, next) {
    const user = getUserById(req.user.id);
    if (hasAccess(user)) { req._userRow = user; return next(); }
    res.status(402).json({ error: 'Subscription required', code: 'subscription_required' });
}

// Returns current billing state for the logged-in user, plus the public price
// info the paywall view needs to render. Never returns secret keys.
app.get('/api/billing/status', auth, (req, res) => {
    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const access = hasAccess(user);
    res.json({
        enabled: billingConfigured(),
        mode: STRIPE_MODE,
        status: user.subscription_status || 'none',
        hasAccess: access,
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
    if (hasAccess(user)) return res.status(400).json({ error: 'You already have access' });

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

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [
                { price: priceSet.monthly, quantity: 1 },  // recurring, billed after trial
                { price: priceSet.setup,   quantity: 1 },  // one-time, billed today
            ],
            subscription_data: {
                trial_period_days: 30,
                metadata: { user_id: String(user.id) },
            },
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
        return res.status(503).send('Webhook not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature failed:', err.message);
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = parseInt(session.metadata?.user_id, 10);
                if (userId && session.subscription) {
                    const sub = await stripe.subscriptions.retrieve(session.subscription);
                    applySubscriptionToUser(userId, sub, session.customer);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const userId = parseInt(sub.metadata?.user_id, 10) || findUserByCustomerId(sub.customer);
                if (userId) applySubscriptionToUser(userId, sub, sub.customer);
                break;
            }
            // Failed payments leave the subscription in past_due — covered above.
        }
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook handler error:', err);
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

function applySubscriptionToUser(userId, subscription, customerId) {
    // Map Stripe's status onto our column. 'canceled' or 'incomplete_expired'
    // means access is over now. Otherwise mirror what Stripe says.
    let status = subscription.status; // trialing | active | past_due | canceled | unpaid | incomplete | incomplete_expired
    if (status === 'incomplete_expired' || status === 'unpaid') status = 'canceled';

    const periodEnd = subscription.current_period_end || 0;
    run(`UPDATE users SET subscription_status = ?, stripe_subscription_id = ?, stripe_customer_id = COALESCE(stripe_customer_id, ?), subscription_current_period_end = ? WHERE id = ?`,
        [status, subscription.id, customerId || null, periodEnd, userId]);
}

// ── DATA ROUTES ───────────────────────────────────────────────────────────────

// Get all data for logged-in user
app.get('/api/data', auth, requireActiveSubscription, (req, res) => {
    const userId = req.user.id;

    const simpleItems = query(
        `SELECT id, list_name, content, extra, position FROM items WHERE user_id = ? AND list_name != 'tasks' ORDER BY position ASC`,
        [userId]
    );

    const taskItems = query(
        `SELECT id, content, extra, position FROM items WHERE user_id = ? AND list_name = 'tasks' ORDER BY position ASC`,
        [userId]
    );

    // Attach subtasks
    const tasks = taskItems.map(t => {
        const subs = query('SELECT id, content, ischecked FROM subtasks WHERE task_id = ? ORDER BY id ASC', [t.id]);
        return {
            id: t.id,
            task: t.content,
            ischecked: t.extra === '1',
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
app.post('/api/data/:listName', auth, requireActiveSubscription, (req, res) => {
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

// Update item (for keyword meaning, task checked state)
app.patch('/api/data/item/:id', auth, requireActiveSubscription, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { extra, content, ischecked } = req.body;

    const item = query('SELECT id FROM items WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!item.length) return res.status(403).json({ error: 'Not allowed' });

    if (extra !== undefined) run('UPDATE items SET extra = ? WHERE id = ?', [extra, id]);
    if (content !== undefined) run('UPDATE items SET content = ? WHERE id = ?', [content.trim(), id]);
    if (ischecked !== undefined) run('UPDATE items SET extra = ? WHERE id = ?', [ischecked ? '1' : '0', id]);

    res.json({ ok: true });
});

// Delete item
app.delete('/api/data/item/:id', auth, requireActiveSubscription, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = query('SELECT id FROM items WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!item.length) return res.status(403).json({ error: 'Not allowed' });
    run('DELETE FROM subtasks WHERE task_id = ?', [id]);
    run('DELETE FROM items WHERE id = ?', [id]);
    res.json({ ok: true });
});

// Reset entire list
app.delete('/api/data/:listName', auth, requireActiveSubscription, (req, res) => {
    const { listName } = req.params;
    const items = query('SELECT id FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, listName]);
    for (const item of items) {
        run('DELETE FROM subtasks WHERE task_id = ?', [item.id]);
    }
    run('DELETE FROM items WHERE user_id = ? AND list_name = ?', [req.user.id, listName]);
    res.json({ ok: true });
});

// Add task
app.post('/api/tasks', auth, requireActiveSubscription, (req, res) => {
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
app.post('/api/tasks/:taskId/subtasks', auth, requireActiveSubscription, (req, res) => {
    const taskId = parseInt(req.params.taskId, 10);
    const { content } = req.body;
    const task = query('SELECT id FROM items WHERE id = ? AND user_id = ? AND list_name = ?', [taskId, req.user.id, 'tasks']);
    if (!task.length) return res.status(403).json({ error: 'Not allowed' });
    const id = run('INSERT INTO subtasks (task_id, content) VALUES (?, ?)', [taskId, content.trim()]);
    res.json({ id });
});

// Toggle subtask
app.patch('/api/subtasks/:id', auth, requireActiveSubscription, (req, res) => {
    const { ischecked } = req.body;
    run('UPDATE subtasks SET ischecked = ? WHERE id = ?', [ischecked ? 1 : 0, parseInt(req.params.id, 10)]);
    res.json({ ok: true });
});

// Delete subtask
app.delete('/api/subtasks/:id', auth, requireActiveSubscription, (req, res) => {
    run('DELETE FROM subtasks WHERE id = ?', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
});

// ── AI ROUTE ──────────────────────────────────────────────────────────────────
// Simple in-memory throttle: max 20 AI calls per user per 5 minutes
const aiRateBucket = new Map();
function aiRateLimit(userId) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const max = 20;
    const entry = aiRateBucket.get(userId) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count += 1;
    aiRateBucket.set(userId, entry);
    return entry.count <= max;
}

app.post('/api/ai', auth, requireActiveSubscription, async (req, res) => {
    if (!anthropic) return res.status(503).json({ error: 'AI is not configured on this server' });
    if (!aiRateLimit(req.user.id)) return res.status(429).json({ error: 'Too many AI requests — try again later' });

    const { kind, text, lang } = req.body;
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Empty input' });
    if (text.length > 500) return res.status(400).json({ error: 'Input too long' });
    if (kind !== 'define' && kind !== 'answer') return res.status(400).json({ error: 'Invalid kind' });

    const isNo = lang === 'no';
    const system = kind === 'define'
        ? (isNo
            ? 'Du forklarer ord og uttrykk kort og presist. Svar med 1–2 setninger, maks 40 ord. Ingen innledning, ingen "Definisjon:"-prefiks. Skriv på norsk.'
            : 'You explain words and phrases concisely. Answer in 1–2 sentences, max 40 words. No preamble, no "Definition:" prefix. Write in English.')
        : (isNo
            ? 'Du svarer på spørsmål direkte og kort, maks 4 setninger eller en kort punktliste. Ingen innledning som "Godt spørsmål". Hvis du er usikker, si det. Skriv på norsk.'
            : 'You answer questions directly and briefly, max 4 sentences or a short bullet list. No preamble like "Great question". If unsure, say so. Write in English.');

    try {
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 400,
            system,
            messages: [{ role: 'user', content: text.trim() }],
        });
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
