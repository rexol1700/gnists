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
        // Existing accounts always go straight to the home board
        changePage('home');
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function doRegister(username, password, errorEl) {
    try {
        const res = await API.register(username, password);
        await loadData();
        // Brand-new accounts go through onboarding; everyone else lands on home.
        if (res && res.isNew) {
            obStart();
        } else {
            changePage('home');
        }
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

function doLogout() {
    API.logout();
    localStorage.removeItem('mb_onboarding_pending');
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
        model.tasks               = data.tasks               || [];
    } catch (err) {
        // Token expired or invalid
        API.logout();
        changePage('landing');
    }
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────

function obStart() {
    // Seed picks with the registry's defaultOn entries
    model.onboardingStep = 1;
    model.onboardingPicks = new Set(
        PANEL_REGISTRY.filter(p => p.defaultOn).map(p => p.id)
    );
    model.onboardingSpark = { text: '', target: 'questions' };
    model.page = 'onboarding';
    // Mark onboarding as in-progress so a page reload returns the user here
    // instead of dropping them on a blank board with no picks made.
    localStorage.setItem('mb_onboarding_pending', '1');
    updateView();
}

function obNext() {
    // Capture any in-progress field state from the DOM before advancing.
    if (model.onboardingStep === 3) {
        const ta = document.getElementById('ob-spark-text');
        if (ta) model.onboardingSpark.text = ta.value;
        const sel = document.getElementById('ob-spark-target');
        if (sel) model.onboardingSpark.target = sel.value;
    }

    if (model.onboardingStep < 4) {
        model.onboardingStep += 1;
        updateView();
    } else {
        obFinish();
    }
}

function obBack() {
    if (model.onboardingStep > 1) {
        model.onboardingStep -= 1;
        updateView();
    }
}

function obSkip() {
    // Skip means: bypass onboarding, use the default layout, no spark captured.
    model.tileLayout = layoutDefault();
    layoutSave(model.tileLayout);
    localStorage.removeItem('mb_onboarding_pending');
    changePage('home');
}

function obToggleBoard(id) {
    if (model.onboardingPicks.has(id)) {
        model.onboardingPicks.delete(id);
    } else {
        model.onboardingPicks.add(id);
    }
    updateView();
}

function obSetSparkText(value) {
    model.onboardingSpark.text = value;
}

function obSetSparkTarget(value) {
    model.onboardingSpark.target = value;
    updateView();
}

function obUseSuggestion(text) {
    model.onboardingSpark.text = text;
    updateView();
    // Focus textarea after re-render
    requestAnimationFrame(() => {
        const ta = document.getElementById('ob-spark-text');
        if (ta) {
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
        }
    });
}

async function obFinish() {
    // 1) Build the layout from the user's picks
    const picks = Array.from(model.onboardingPicks);
    // Always include questions as a backbone if they picked nothing meaningful
    const ordered = PANEL_REGISTRY
        .map(p => p.id)
        .filter(id => picks.includes(id));
    const finalIds = ordered.length ? ordered : ['questions'];

    model.tileLayout = layoutFromPicks(finalIds);
    layoutSave(model.tileLayout);

    // 2) Save the spark, if any, into the chosen list
    const spark = (model.onboardingSpark.text || '').trim();
    const target = model.onboardingSpark.target;
    if (spark && finalIds.includes(target)) {
        try {
            if (target === 'tasks') {
                const r = await API.addTask(spark);
                model.tasks.push({ id: r.id, task: spark, ischecked: false, subtasks: [] });
            } else {
                const r = await API.addItem(target, spark);
                if (!model.lists[target]) model.lists[target] = [];
                model.lists[target].push({ id: r.id, value: spark, extra: '' });
            }
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    // 3) Done. Show the board.
    localStorage.removeItem('mb_onboarding_pending');
    changePage('home');
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
        for (const k of Object.keys(model.lists)) model.lists[k] = [];
        model.tasks = [];
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
    if (item.extra === value) return;
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

// In the new design, the default theme is light (paper). The toggle puts the
// app into dark mode for those who prefer it.
function themeToggle() {
    model.isDarkmode = !model.isDarkmode;
    document.body.classList.toggle('darkmode', model.isDarkmode);
    localStorage.setItem('mb_dark', model.isDarkmode ? '1' : '0');
    const btn = document.querySelector('.btn-light');
    if (btn) btn.classList.toggle('on', model.isDarkmode);
}
// Backwards-compatible alias for any old onclick handlers
const lightToggle = themeToggle;

// Restore theme preference on load
(function applyStoredTheme() {
    const stored = localStorage.getItem('mb_dark');
    if (stored === '1') {
        model.isDarkmode = true;
        document.body.classList.add('darkmode');
    }
})();

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

// Lang switcher (used in topbar / auth headers)
function langSwitcher() {
    return /*html*/`
        <span class="lang-switch">
            <button class="${lang === 'no' ? 'on' : ''}" onclick="setLang('no')">NO</button>
            <button class="${lang === 'en' ? 'on' : ''}" onclick="setLang('en')">EN</button>
        </span>
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
    const parts = (item.extra || '').split('|');
    const listName = parts[0] || model.activeShoppingList;
    item.extra = `${listName}|${checked ? 'done' : ''}`;
    API.updateItem(id, { extra: item.extra })
        .then(() => updateView())
        .catch(err => toast(err.message, 'error'));
}

function getShoppingLists() {
    const stored = localStorage.getItem('mb_shopping_lists');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
    }
    return [t('shopping_default')];
}

function saveShoppingLists(lists) {
    localStorage.setItem('mb_shopping_lists', JSON.stringify(lists));
}

function initShoppingLists() {
    model.shoppingLists = getShoppingLists();
    model.activeShoppingList = localStorage.getItem('mb_active_list') || model.shoppingLists[0];
    if (!model.shoppingLists.includes(model.activeShoppingList)) {
        model.activeShoppingList = model.shoppingLists[0];
    }
}

function setActiveShoppingList(name) {
    model.activeShoppingList = name;
    localStorage.setItem('mb_active_list', name);
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
        localStorage.setItem('mb_active_list', model.activeShoppingList);
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
    try { return JSON.parse(item.extra || '{}'); } catch (e) { return {}; }
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
    } catch (err) { toast(err.message, 'error'); }
}

async function removeMeal(id) {
    try {
        await API.deleteItem(id);
        model.lists.meals = model.lists.meals.filter(m => m.id !== id);
        if (model.expandedMeal === id) model.expandedMeal = null;
        updateView();
    } catch (err) { toast(err.message, 'error'); }
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
    } catch (err) { toast(err.message, 'error'); }
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
    } catch (err) { toast(err.message, 'error'); }
}

async function saveMealInstructions(mealId, value) {
    const meal = model.lists.meals.find(m => m.id === mealId);
    if (!meal) return;
    const data = getMealData(meal);
    data.instructions = value;
    meal.extra = JSON.stringify(data);
    try {
        await API.updateItem(mealId, { extra: meal.extra });
    } catch (err) { toast(err.message, 'error'); }
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
    } catch (err) { toast(err.message, 'error'); }
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
    } catch (err) { toast(err.message, 'error'); }
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

// ── QUESTIONS ─────────────────────────────────────────────────────────────────

function toggleQuestion(id) {
    model.expandedQuestion = model.expandedQuestion === id ? null : id;
    updateView();
}

// ── AI ────────────────────────────────────────────────────────────────────────

async function aiDefineKeyword(id, listIndex) {
    const item = model.lists.Nøkkelord?.[listIndex];
    if (!item || model.aiLoading.has(id)) return;
    model.aiLoading.add(id);
    updateView();
    try {
        const res = await API.aiComplete('define', item.value, lang);
        const def = (res.text || '').trim();
        if (!def) throw new Error('Empty response');
        item.extra = def;
        model.editingIndex.add(listIndex);
        await API.updateItem(id, { extra: def });
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        model.aiLoading.delete(id);
        updateView();
    }
}

async function aiAnswerQuestion(id) {
    const item = model.lists.questions?.find(q => q.id === id);
    if (!item || model.aiLoading.has(id)) return;
    model.aiLoading.add(id);
    updateView();
    try {
        const res = await API.aiComplete('answer', item.value, lang);
        const ans = (res.text || '').trim();
        if (!ans) throw new Error('Empty response');
        item.extra = ans;
        model.expandedQuestion = id;
        await API.updateItem(id, { extra: ans });
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        model.aiLoading.delete(id);
        updateView();
    }
}
