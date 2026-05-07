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
    model.lists = { interests: [], questions: [], learningGoals: [], Nøkkelord: [], bills: [], times: [], motivations: [], selling: [], shopping: [], notes: [], reminders: [], meals: [] };
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
        model.lists.meals         = data.lists.meals         || [];
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
            API.resetList('meals'),
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
        model.lists.meals         = [];
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
    // extra format: "listName|done" or "listName|"
    const parts = (item.extra || '').split('|');
    const listName = parts[0] || model.activeShoppingList;
    item.extra = `${listName}|${checked ? 'done' : ''}`;
    API.updateItem(id, { extra: item.extra })
        .then(() => updateView())
        .catch(err => toast(err.message, 'error'));
}

function getShoppingLists() {
    const stored = localStorage.getItem('gnists_shopping_lists');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) {}
    }
    return ['Handleliste'];
}

function saveShoppingLists(lists) {
    localStorage.setItem('gnists_shopping_lists', JSON.stringify(lists));
}

function initShoppingLists() {
    model.shoppingLists = getShoppingLists();
    model.activeShoppingList = localStorage.getItem('gnists_active_list') || model.shoppingLists[0];
    if (!model.shoppingLists.includes(model.activeShoppingList)) {
        model.activeShoppingList = model.shoppingLists[0];
    }
}

function setActiveShoppingList(name) {
    model.activeShoppingList = name;
    localStorage.setItem('gnists_active_list', name);
    updateView();
}

function addShoppingList(name) {
    if (!name || model.shoppingLists.includes(name)) return;
    model.shoppingLists.push(name);
    saveShoppingLists(model.shoppingLists);
    setActiveShoppingList(name);
}

function removeShoppingList(name) {
    if (model.shoppingLists.length <= 1) return;
    model.shoppingLists = model.shoppingLists.filter(l => l !== name);
    saveShoppingLists(model.shoppingLists);
    if (model.activeShoppingList === name) {
        model.activeShoppingList = model.shoppingLists[0];
        localStorage.setItem('gnists_active_list', model.activeShoppingList);
    }
    updateView();
}

function addShoppingItemToList(listId, inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    const listName = model.activeShoppingList;
    const extra = `${listName}|`;
    API.addItem(listId, value, extra)
        .then(res => {
            model.lists[listId].push({ id: res.id, value, extra });
            updateView();
        })
        .catch(err => toast(err.message, 'error'));
}

// ── MEALS ─────────────────────────────────────────────────────────────────────

function toggleMeal(id) {
    model.expandedMeal = model.expandedMeal === id ? null : id;
    if (!model.mealActiveTab[id]) model.mealActiveTab[id] = 'ingredients';
    updateView();
}

function setMealTab(id, tab) {
    model.mealActiveTab[id] = tab;
    updateView();
}

function getMealData(item) {
    try { return JSON.parse(item.extra || '{}'); } catch(e) { return {}; }
}

async function addMeal(inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    const extra = JSON.stringify({ ingredients: [], instructions: '' });
    try {
        const res = await API.addItem('meals', value, extra);
        model.lists.meals.push({ id: res.id, value, extra });
        model.expandedMeal = res.id;
        model.mealActiveTab[res.id] = 'ingredients';
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

async function removeMeal(id) {
    try {
        await API.deleteItem(id);
        model.lists.meals = model.lists.meals.filter(m => m.id !== id);
        if (model.expandedMeal === id) model.expandedMeal = null;
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

async function addMealIngredient(mealId, inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    data.ingredients = data.ingredients || [];
    data.ingredients.push({ name: value, id: Date.now() });
    meal.extra = JSON.stringify(data);
    try {
        await API.updateItem(mealId, { extra: meal.extra });
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

async function removeMealIngredient(mealId, ingId) {
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    data.ingredients = (data.ingredients || []).filter(i => i.id !== ingId);
    meal.extra = JSON.stringify(data);
    try {
        await API.updateItem(mealId, { extra: meal.extra });
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

async function saveMealInstructions(mealId, value) {
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    data.instructions = value;
    meal.extra = JSON.stringify(data);
    try {
        await API.updateItem(mealId, { extra: meal.extra });
    } catch(err) { toast(err.message, 'error'); }
}

async function addIngredientToShoppingList(mealId, ingId) {
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    const ing = (data.ingredients || []).find(i => i.id === ingId);
    if (!ing) return;
    const listName = model.activeShoppingList;
    const extra = `${listName}|`;
    try {
        const res = await API.addItem('shopping', ing.name, extra);
        model.lists.shopping.push({ id: res.id, value: ing.name, extra });
        toast((lang === 'no' ? 'Lagt til i ' : 'Added to ') + listName + ' ✓');
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

async function addAllIngredientsToShoppingList(mealId) {
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    const ings = data.ingredients || [];
    if (!ings.length) return;
    const listName = model.activeShoppingList;
    try {
        for (const ing of ings) {
            const extra = `${listName}|`;
            const res = await API.addItem('shopping', ing.name, extra);
            model.lists.shopping.push({ id: res.id, value: ing.name, extra });
        }
        toast((lang === 'no' ? 'Alle ingredienser lagt til i ' : 'All ingredients added to ') + listName + ' ✓');
        updateView();
    } catch(err) { toast(err.message, 'error'); }
}

// Initialise shopping lists on load
initShoppingLists();


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
