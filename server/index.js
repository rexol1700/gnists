const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'myboard-secret-change-in-production';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// New canonical DB path. If a legacy gnists.db exists in the same dir, use that
// (so existing deployments migrate seamlessly without losing data).
const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH_NEW = path.join(DATA_DIR, 'myboard.db');
const DB_PATH_LEGACY = path.join(DATA_DIR, 'gnists.db');
const DB_PATH = fs.existsSync(DB_PATH_NEW) ? DB_PATH_NEW
              : fs.existsSync(DB_PATH_LEGACY) ? DB_PATH_LEGACY
              : DB_PATH_NEW;

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

// Update item (for keyword meaning, task checked state)
app.patch('/api/data/item/:id', auth, (req, res) => {
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

app.post('/api/ai', auth, async (req, res) => {
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
