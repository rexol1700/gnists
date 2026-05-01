// ── CONTROLLER ───────────────────────────────────────────────────────────────

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

function changePage(page) {
    model.page = page;
    model.editingIndex = new Set();
    model.expandedTask = null;
    updateView();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function doLogin(username, password, errorEl) {
    try {
        await API.login(username, password);
        await loadData();
        changePage('home');
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function doRegister(username, password, errorEl) {
    try {
        await API.register(username, password);
        await loadData();
        changePage('home');
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

function doLogout() {
    API.logout();
    model.lists = { interests: [], questions: [], learningGoals: [], Nøkkelord: [], bills: [], times: [], motivations: [], selling: [], shopping: [], notes: [], reminders: [] };
    model.tasks = [];
    changePage('landing');
}

// ── DATA LOADING ──────────────────────────────────────────────────────────────

async function loadData() {
    try {
        const data = await API.getData();
        model.lists.interests     = data.lists.interests     || [];
        model.lists.questions     = data.lists.questions     || [];
        model.lists.learningGoals = data.lists.learningGoals || [];
        model.lists.Nøkkelord     = data.lists.Nøkkelord     || [];
        model.lists.bills         = data.lists.bills         || [];
        model.lists.times         = data.lists.times         || [];
        model.lists.motivations   = data.lists.motivations   || [];
        model.lists.selling       = data.lists.selling       || [];
        model.lists.shopping      = data.lists.shopping      || [];
        model.lists.notes         = data.lists.notes         || [];
        model.lists.reminders     = data.lists.reminders     || [];
        model.tasks = data.tasks || [];
        model.page = 'home';
    } catch (err) {
        // Token expired or invalid
        API.logout();
        changePage('landing');
    }
}

// ── SIMPLE LISTS ──────────────────────────────────────────────────────────────

async function addItem(listName, inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    try {
        const res = await API.addItem(listName, value);
        model.lists[listName].push({ id: res.id, value, extra: '' });
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function removeItem(listName, id) {
    try {
        await API.deleteItem(id);
        model.lists[listName] = model.lists[listName].filter(i => i.id !== id);
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function resetAll() {
    try {
        await Promise.all([
            API.resetList('interests'),
            API.resetList('questions'),
            API.resetList('learningGoals'),
            API.resetList('Nøkkelord'),
            API.resetList('bills'),
            API.resetList('times'),
            API.resetList('motivations'),
            API.resetList('selling'),
            API.resetList('shopping'),
            API.resetList('notes'),
            API.resetList('reminders'),
            API.resetList('tasks'),
        ]);
        model.lists.interests     = [];
        model.lists.questions     = [];
        model.lists.learningGoals = [];
        model.lists.Nøkkelord     = [];
        model.lists.bills         = [];
        model.lists.times         = [];
        model.lists.motivations   = [];
        model.lists.selling       = [];
        model.lists.shopping      = [];
        model.lists.notes         = [];
        model.lists.reminders     = [];
        model.tasks               = [];
        updateView();
        toast(lang === 'no' ? 'Alt tømt' : 'All cleared');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function resetList(listName) {
    try {
        await API.resetList(listName);
        if (listName === 'tasks') {
            model.tasks = [];
        } else {
            model.lists[listName] = [];
        }
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── KEYWORDS ──────────────────────────────────────────────────────────────────

async function addKeyword(inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    try {
        const res = await API.addItem('Nøkkelord', value, '');
        model.lists.Nøkkelord.push({ id: res.id, value, extra: '' });
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

function editKeyword(index) {
    if (model.editingIndex.has(index)) {
        model.editingIndex.delete(index);
    } else {
        model.editingIndex.add(index);
    }
    updateView();
    requestAnimationFrame(() => {
        document.querySelectorAll('.keyword-meaning').forEach(el => {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        });
    });
}

async function saveMeaning(id, listIndex, value) {
    const item = model.lists.Nøkkelord[listIndex];
    if (!item) return;
    if (item.extra === value) return; // no change
    item.extra = value;
    try {
        await API.updateItem(id, { extra: value });
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── TASKS ─────────────────────────────────────────────────────────────────────

async function addTask(inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    try {
        const res = await API.addTask(value);
        model.tasks.push({ id: res.id, task: value, ischecked: false, subtasks: [] });
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

function toggleTaskPanel(id) {
    model.expandedTask = model.expandedTask === id ? null : id;
    updateView();
}

async function toggleTask(id) {
    const task = model.tasks.find(t => t.id === id);
    if (!task) return;
    task.ischecked = !task.ischecked;
    updateView();
    try {
        await API.updateItem(id, { ischecked: task.ischecked });
    } catch (err) {
        task.ischecked = !task.ischecked;
        updateView();
    }
}

async function removeTask(id) {
    try {
        await API.deleteItem(id);
        model.tasks = model.tasks.filter(t => t.id !== id);
        if (model.expandedTask === id) model.expandedTask = null;
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function addSubtask(taskId, inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    try {
        const res = await API.addSubtask(taskId, value);
        const task = model.tasks.find(t => t.id === taskId);
        if (task) task.subtasks.push({ id: res.id, task: value, ischecked: false });
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function toggleSubtask(taskId, subtaskId) {
    const task = model.tasks.find(t => t.id === taskId);
    const sub = task?.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    sub.ischecked = !sub.ischecked;
    updateView();
    try {
        await API.toggleSubtask(subtaskId, sub.ischecked);
    } catch (err) {
        sub.ischecked = !sub.ischecked;
        updateView();
    }
}

async function removeSubtask(taskId, subtaskId) {
    try {
        await API.deleteSubtask(subtaskId);
        const task = model.tasks.find(t => t.id === taskId);
        if (task) task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        updateView();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── UI TOGGLES ────────────────────────────────────────────────────────────────

function lightToggle() {
    model.isLightmode = !model.isLightmode;
    document.body.classList.toggle('lightmode', model.isLightmode);
    const btn = document.querySelector('.btn-light');
    if (btn) btn.classList.toggle('on', model.isLightmode);
}

// ── INIT ──────────────────────────────────────────────────────────────────────

if (API.isLoggedIn()) {
    // Will be called from views.js after first render
}

// ── BILLS ─────────────────────────────────────────────────────────────────────

function addBill(listId) {
    const nameEl   = document.getElementById('bill-name-input');
    const amountEl = document.getElementById('bill-amount-input');
    const dateEl   = document.getElementById('bill-date-input');
    const name = nameEl?.value.trim();
    if (!name) return;
    const extra = `${amountEl?.value.trim() || ''}|${dateEl?.value || ''}`;
    nameEl.value = '';
    if (amountEl) amountEl.value = '';
    if (dateEl)   dateEl.value   = '';
    API.addItem(listId, name, extra)
        .then(res => {
            model.lists[listId].push({ id: res.id, value: name, extra });
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

function removeBill(id) {
    API.deleteItem(id)
        .then(() => {
            model.lists.bills = model.lists.bills.filter(b => b.id !== id);
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

// ── REMINDERS ─────────────────────────────────────────────────────────────────

function addReminder(listId) {
    const textEl = document.getElementById('reminders-text-input');
    const dateEl = document.getElementById('reminders-date-input');
    const text   = textEl?.value.trim();
    if (!text) return;
    const extra = dateEl?.value || '';
    textEl.value = '';
    if (dateEl) dateEl.value = '';
    API.addItem(listId, text, extra)
        .then(res => {
            model.lists[listId].push({ id: res.id, value: text, extra });
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

function langSwitcher() {
    return /*html*/`
        <div class="lang-switcher">
            <button class="lang-btn ${lang === 'no' ? 'active' : ''}" onclick="setLang('no')">🇳🇴 NO</button>
            <button class="lang-btn ${lang === 'en' ? 'active' : ''}" onclick="setLang('en')">🇬🇧 EN</button>
        </div>
    `;
}

// ── TIMES ─────────────────────────────────────────────────────────────────────

function addTimeEntry(listId) {
    const labelEl = document.getElementById('times-label-input');
    const timeEl  = document.getElementById('times-time-input');
    const recEl   = document.getElementById('times-rec-input');
    const label   = labelEl?.value.trim();
    if (!label) return;
    const extra = `${timeEl?.value.trim() || ''}|${recEl?.value.trim() || ''}`;
    labelEl.value = '';
    if (timeEl) timeEl.value = '';
    if (recEl)  recEl.value  = '';
    API.addItem(listId, label, extra)
        .then(res => {
            model.lists[listId].push({ id: res.id, value: label, extra });
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

// ── SELLING ───────────────────────────────────────────────────────────────────

function addSellingItem(listId) {
    const nameEl  = document.getElementById('selling-name-input');
    const priceEl = document.getElementById('selling-price-input');
    const name    = nameEl?.value.trim();
    if (!name) return;
    const extra = `${priceEl?.value.trim() || ''}|listed`;
    nameEl.value = '';
    if (priceEl) priceEl.value = '';
    API.addItem(listId, name, extra)
        .then(res => {
            model.lists[listId].push({ id: res.id, value: name, extra });
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

function updateSellingStatus(id, listId, newStatus) {
    const item = model.lists[listId]?.find(i => i.id === id);
    if (!item) return;
    const [price = ''] = (item.extra || '').split('|');
    item.extra = `${price}|${newStatus}`;
    API.updateItem(id, { extra: item.extra })
        .then(() => updateView())
        .catch(err => toast(err.message, 'error'));
}

// ── SHOPPING ──────────────────────────────────────────────────────────────────

function toggleShoppingItem(id, listId, checked) {
    const item = model.lists[listId]?.find(i => i.id === id);
    if (!item) return;
    item.extra = checked ? 'done' : '';
    API.updateItem(id, { extra: item.extra })
        .then(() => updateView())
        .catch(err => toast(err.message, 'error'));
}

// ── NOTES ─────────────────────────────────────────────────────────────────────

function toggleNote(id) {
    model.expandedNote = model.expandedNote === id ? null : id;
    updateView();
}

function saveNoteBody(id, listId, value) {
    const item = model.lists[listId]?.find(i => i.id === id);
    if (!item) return;
    item.extra = value;
    API.updateItem(id, { extra: value })
        .catch(err => toast(err.message, 'error'));
}
