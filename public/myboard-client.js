// ── API CLIENT ────────────────────────────────────────────────────────────────
// All communication with the backend goes through these functions.

const API = {
    token: localStorage.getItem('mb_token'),
    username: localStorage.getItem('mb_username'),

    _headers() {
        return {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        };
    },

    async _req(method, path, body) {
        const res = await fetch(path, {
            method,
            headers: this._headers(),
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.error || 'Something went wrong');
            err.status = res.status;
            err.code = data.code;
            throw err;
        }
        return data;
    },

    async register(username, password) {
        const data = await this._req('POST', '/api/register', { username, password });
        this.token = data.token;
        this.username = data.username;
        localStorage.setItem('mb_token', data.token);
        localStorage.setItem('mb_username', data.username);
        return data; // includes { isNew: true }
    },

    async login(username, password) {
        const data = await this._req('POST', '/api/login', { username, password });
        this.token = data.token;
        this.username = data.username;
        localStorage.setItem('mb_token', data.token);
        localStorage.setItem('mb_username', data.username);
        return data; // includes { isNew: false }
    },

    logout() {
        this.token = null;
        this.username = null;
        localStorage.removeItem('mb_token');
        localStorage.removeItem('mb_username');
    },

    async getData() {
        return this._req('GET', '/api/data');
    },

    async addItem(listName, content, extra = '') {
        return this._req('POST', `/api/data/${listName}`, { content, extra });
    },

    async updateItem(id, patch) {
        return this._req('PATCH', `/api/data/item/${id}`, patch);
    },

    async deleteItem(id) {
        return this._req('DELETE', `/api/data/item/${id}`);
    },

    async resetList(listName) {
        return this._req('DELETE', `/api/data/${listName}`);
    },

    async addTask(content) {
        return this._req('POST', '/api/tasks', { content });
    },

    async addSubtask(taskId, content) {
        return this._req('POST', `/api/tasks/${taskId}/subtasks`, { content });
    },

    async toggleSubtask(id, ischecked) {
        return this._req('PATCH', `/api/subtasks/${id}`, { ischecked });
    },

    async deleteSubtask(id) {
        return this._req('DELETE', `/api/subtasks/${id}`);
    },

    async aiComplete(kind, text, lang) {
        return this._req('POST', '/api/ai', { kind, text, lang });
    },

    // ── BILLING ─────────────────────────────────────────────────────────────
    async billingStatus() {
        return this._req('GET', '/api/billing/status');
    },

    async billingCheckout(currency) {
        return this._req('POST', '/api/billing/checkout', { currency });
    },

    async billingPortal() {
        return this._req('POST', '/api/billing/portal');
    },

    isLoggedIn() {
        return !!this.token;
    }
};
