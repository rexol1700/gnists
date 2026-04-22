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
    model.editingIndex = null;
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
    model.lists = { interests: [], questions: [], learningGoals: [], Nøkkelord: [] };
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
            API.resetList('tasks'),
        ]);
        model.lists.interests     = [];
        model.lists.questions     = [];
        model.lists.learningGoals = [];
        model.lists.Nøkkelord     = [];
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
    model.editingIndex = model.editingIndex === index ? null : index;
    updateView();
}

async function saveMeaning(id, listIndex, value) {
    try {
        await API.updateItem(id, { extra: value });
        model.lists.Nøkkelord[listIndex].extra = value;
        model.editingIndex = null;
        updateView();
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
