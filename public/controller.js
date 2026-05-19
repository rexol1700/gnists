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
        // Check billing first — if the user owes money, /api/data will 402
        // and we'd rather show the paywall than a generic error.
        const allowed = await fetchBillingAndRoute();
        if (!allowed) return;
        await loadData();
        changePage('home');
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function doRegister(username, password, errorEl) {
    try {
        const res = await API.register(username, password);
        // We deliberately do NOT billing-check here. New users go through
        // onboarding first so they can see what they're paying for — the
        // paywall comes at the end of obFinish() if they don't have access.
        // Pre-fetch billing status anyway so the paywall view has price data
        // ready by the time they arrive.
        try { model.billing = await API.billingStatus(); } catch (e) { /* non-fatal */ }
        if (res && res.isNew) {
            obStart();
        } else {
            // Existing account being re-created somehow — fall through to billing check
            const allowed = await fetchBillingAndRoute();
            if (!allowed) return;
            await loadData();
            changePage('home');
        }
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

// Fetch billing status from server. If the user has access (paid /
// grandfathered / billing disabled), return true. Otherwise route to the
// paywall and return false so the caller bails out.
async function fetchBillingAndRoute() {
    try {
        const status = await API.billingStatus();
        model.billing = status;
        if (status.hasAccess) return true;
        // No access — paywall it is.
        model.paywallCurrency = model.paywallCurrency
            || localStorage.getItem('mb_currency')
            || ((navigator.language || '').toLowerCase().startsWith('n') ? 'NOK' : 'EUR');
        changePage('paywall');
        return false;
    } catch (err) {
        // If status itself fails, keep the user logged in but show a toast.
        // Don't lock them out of an app they may have legitimate access to.
        toast(err.message || 'Could not check subscription', 'error');
        return true;
    }
}

// Used by views.js boot. Same as fetchBillingAndRoute but if access is
// granted, loads data and routes to home/onboarding.
async function routeAfterAuth() {
    const allowed = await fetchBillingAndRoute();
    if (!allowed) return;
    await loadData();
    if (localStorage.getItem('mb_onboarding_pending') === '1') {
        obStart();
    } else {
        model.page = 'home';
        updateView();
    }
}

// After Stripe Checkout success-redirect, poll the server until the webhook
// has updated subscription_status. Give up after ~30s and refresh anyway.
async function waitForActivation() {
    const start = Date.now();
    const timeoutMs = 30000;
    while (Date.now() - start < timeoutMs) {
        try {
            const status = await API.billingStatus();
            if (status.hasAccess) {
                model.billing = status;
                await loadData();
                // Restore any spark the user typed during onboarding — they
                // paid, so honour the thing they captured before checkout.
                await flushPendingSpark();
                model.page = 'home';
                updateView();
                toast(lang === 'no' ? 'Abonnement aktivt' : 'Subscription active');
                return;
            }
        } catch (e) { /* keep polling */ }
        await new Promise(r => setTimeout(r, 1500));
    }
    // Webhook is slow or misconfigured — fall through to the app and let any
    // gated request 402 if access truly isn't there yet.
    try { await loadData(); model.page = 'home'; } catch (e) { model.page = 'paywall'; }
    updateView();
}

// Open Stripe's hosted customer portal for cancel/update card/invoices.
async function openBillingPortal() {
    try {
        const res = await API.billingPortal();
        if (res.url) window.location.href = res.url;
    } catch (err) {
        toast(err.message, 'error');
    }
}

function doLogout() {
    API.logout();
    localStorage.removeItem('mb_onboarding_pending');
    localStorage.removeItem('mb_pending_spark');
    model.lists = { interests: [], questions: [], learningGoals: [], Nøkkelord: [], bills: [], times: [], motivations: [], selling: [], shopping: [], notes: [], reminders: [], meals: [] };
    model.tasks = [];
    model.billing = null;
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
        if (err.status === 402) {
            // Subscription lapsed mid-session — route to paywall instead of logout
            await fetchBillingAndRoute();
        } else {
            // Token expired or invalid
            API.logout();
            changePage('landing');
        }
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
    // 1) Build the layout from the user's picks (purely client-side)
    const picks = Array.from(model.onboardingPicks);
    const ordered = PANEL_REGISTRY
        .map(p => p.id)
        .filter(id => picks.includes(id));
    const finalIds = ordered.length ? ordered : ['questions'];

    model.tileLayout = layoutFromPicks(finalIds);
    layoutSave(model.tileLayout);

    // Onboarding itself is "done" once the layout is saved — even if the user
    // bails at the paywall, we don't want to re-run onboarding on next login.
    localStorage.removeItem('mb_onboarding_pending');

    const spark = (model.onboardingSpark.text || '').trim();
    const target = model.onboardingSpark.target;
    const sparkValid = spark && finalIds.includes(target);

    // 2) Billing check — if the user doesn't have access yet, defer the spark
    //    save and route them to the paywall. The pending spark gets written
    //    to the server after they pay (handled in waitForActivation).
    const billing = await API.billingStatus().catch(() => null);
    model.billing = billing;
    if (billing && billing.enabled && !billing.hasAccess) {
        if (sparkValid) {
            localStorage.setItem('mb_pending_spark', JSON.stringify({ spark, target }));
        }
        model.paywallCurrency = model.paywallCurrency
            || localStorage.getItem('mb_currency')
            || ((navigator.language || '').toLowerCase().startsWith('n') ? 'NOK' : 'EUR');
        changePage('paywall');
        return;
    }

    // 3) Has access — save the spark and drop into the board
    if (sparkValid) {
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
    changePage('home');
}

// Save a spark that was captured during onboarding but couldn't be written
// until the user paid. Called from waitForActivation after access is granted.
async function flushPendingSpark() {
    const raw = localStorage.getItem('mb_pending_spark');
    if (!raw) return;
    localStorage.removeItem('mb_pending_spark');
    try {
        const { spark, target } = JSON.parse(raw);
        if (!spark || !target) return;
        if (target === 'tasks') {
            const r = await API.addTask(spark);
            model.tasks.push({ id: r.id, task: spark, ischecked: false, subtasks: [] });
        } else {
            const r = await API.addItem(target, spark);
            if (!model.lists[target]) model.lists[target] = [];
            model.lists[target].push({ id: r.id, value: spark, extra: '' });
        }
    } catch (e) { /* swallow — not worth disrupting the welcome */ }
}

// ── SIMPLE LISTS ──────────────────────────────────────────────────────────────

async function addItem(listName, inputEl) {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = '';
    try {
        const res = await API.addItem(listName, value);
        model.lists[listName].push({ id: res.id, value, extra: '' });
        rerenderPanel(listName);
        rerenderSubbarCount();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function removeItem(listName, id) {
    try {
        await API.deleteItem(id);
        model.lists[listName] = model.lists[listName].filter(i => i.id !== id);
        rerenderPanel(listName);
        rerenderSubbarCount();
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
        rerenderPanel(listName);
        rerenderSubbarCount();
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
        rerenderPanel('Nøkkelord');
        rerenderSubbarCount();
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
    rerenderPanel('Nøkkelord');
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
        rerenderPanel('tasks');
        rerenderSubbarCount();
    } catch (err) {
        toast(err.message, 'error');
    }
}

function toggleTaskPanel(id) {
    model.expandedTask = model.expandedTask === id ? null : id;
    rerenderPanel('tasks');
}

async function toggleTask(id) {
    const task = model.tasks.find(t => t.id === id);
    if (!task) return;
    task.ischecked = !task.ischecked;
    rerenderPanel('tasks');
    try {
        await API.updateItem(id, { ischecked: task.ischecked });
    } catch (err) {
        task.ischecked = !task.ischecked;
        rerenderPanel('tasks');
    }
}

async function removeTask(id) {
    try {
        await API.deleteItem(id);
        model.tasks = model.tasks.filter(t => t.id !== id);
        if (model.expandedTask === id) model.expandedTask = null;
        rerenderPanel('tasks');
        rerenderSubbarCount();
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
        rerenderPanel('tasks');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function toggleSubtask(taskId, subtaskId) {
    const task = model.tasks.find(t => t.id === taskId);
    const sub = task?.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;
    sub.ischecked = !sub.ischecked;
    rerenderPanel('tasks');
    try {
        await API.toggleSubtask(subtaskId, sub.ischecked);
    } catch (err) {
        sub.ischecked = !sub.ischecked;
        rerenderPanel('tasks');
    }
}

async function removeSubtask(taskId, subtaskId) {
    try {
        await API.deleteSubtask(subtaskId);
        const task = model.tasks.find(t => t.id === taskId);
        if (task) task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        rerenderPanel('tasks');
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

// Scales only the content inside .panel-scroll via CSS `zoom` — leaves the
// panel header, topbar and surrounding chrome at their original sizes.
function setTextScale(val) {
    const n = Math.min(1.6, Math.max(0.8, parseFloat(val) || 1));
    model.textScale = n;
    document.documentElement.style.setProperty('--panel-content-scale', String(n));
    localStorage.setItem('mb_text_scale', String(n));
}

(function applyStoredTextScale() {
    const stored = parseFloat(localStorage.getItem('mb_text_scale'));
    if (stored && stored >= 0.8 && stored <= 1.6) {
        model.textScale = stored;
        document.documentElement.style.setProperty('--panel-content-scale', String(stored));
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
            rerenderPanel(listId);
            rerenderSubbarCount();
        })
        .catch(err => toast(err.message, 'error'));
}

function removeBill(id) {
    API.deleteItem(id)
        .then(() => {
            model.lists.bills = model.lists.bills.filter(b => b.id !== id);
            rerenderPanel('bills');
            rerenderSubbarCount();
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
            rerenderPanel(listId);
            rerenderSubbarCount();
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
            rerenderPanel(listId);
            rerenderSubbarCount();
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
            rerenderPanel(listId);
            rerenderSubbarCount();
        })
        .catch(err => toast(err.message, 'error'));
}

function updateSellingStatus(id, listId, newStatus) {
    const item = model.lists[listId]?.find(i => i.id === id);
    if (!item) return;
    const [price = ''] = (item.extra || '').split('|');
    item.extra = `${price}|${newStatus}`;
    API.updateItem(id, { extra: item.extra })
        .then(() => rerenderPanel(listId))
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
        .then(() => rerenderPanel(listId))
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
    rerenderPanel('shopping');
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
    rerenderPanel('shopping');
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
            rerenderPanel(listId);
            rerenderSubbarCount();
        })
        .catch(err => toast(err.message, 'error'));
}

// ── MEALS ─────────────────────────────────────────────────────────────────────

function toggleMeal(id) {
    model.expandedMeal = model.expandedMeal === id ? null : id;
    if (!model.mealActiveTab[id]) model.mealActiveTab[id] = 'ingredients';
    rerenderPanel('meals');
}

function setMealTab(id, tab) {
    model.mealActiveTab[id] = tab;
    rerenderPanel('meals');
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
        rerenderPanel('meals');
        rerenderSubbarCount();
    } catch (err) { toast(err.message, 'error'); }
}

async function removeMeal(id) {
    try {
        await API.deleteItem(id);
        model.lists.meals = model.lists.meals.filter(m => m.id !== id);
        if (model.expandedMeal === id) model.expandedMeal = null;
        rerenderPanel('meals');
        rerenderSubbarCount();
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
        rerenderPanel('meals');
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
        rerenderPanel('meals');
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
        rerenderPanel('shopping');
        rerenderSubbarCount();
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
        rerenderPanel('shopping');
        rerenderSubbarCount();
    } catch (err) { toast(err.message, 'error'); }
}

// Initialise shopping lists on load
initShoppingLists();

// ── NOTES ─────────────────────────────────────────────────────────────────────

function toggleNote(id) {
    model.expandedNote = model.expandedNote === id ? null : id;
    rerenderPanel('notes');
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
    rerenderPanel('questions');
}

// ── AI ────────────────────────────────────────────────────────────────────────

async function aiDefineKeyword(id, listIndex) {
    const item = model.lists.Nøkkelord?.[listIndex];
    if (!item || model.aiLoading.has(id)) return;
    model.aiLoading.add(id);
    rerenderPanel('Nøkkelord');
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
        rerenderPanel('Nøkkelord');
    }
}

async function aiAnswerQuestion(id) {
    const item = model.lists.questions?.find(q => q.id === id);
    if (!item || model.aiLoading.has(id)) return;
    model.aiLoading.add(id);
    rerenderPanel('questions');
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
        rerenderPanel('questions');
    }
}

// Suggest ingredients for a meal via AI. Appends non-duplicate names to the
// existing ingredients list and persists.
async function aiSuggestMealIngredients(mealId) {
    const meal = model.lists.meals?.find(m => m.id === mealId);
    if (!meal || model.aiLoading.has(mealId)) return;
    model.aiLoading.add(mealId);
    updateView();
    try {
        const res = await API.aiComplete('ingredients', meal.value, lang);
        const out = (res.text || '').trim();
        if (!out) throw new Error('Empty response');
        const data = getMealData(meal);
        data.ingredients = data.ingredients || [];
        const existing = new Set(data.ingredients.map(i => i.name.trim().toLowerCase()));
        const lines = out.split('\n')
            .map(l => l.replace(/^\s*[-*•\d.]+\s*/, '').trim())
            .filter(l => l && !existing.has(l.toLowerCase()));
        let nextId = Date.now();
        for (const name of lines) {
            data.ingredients.push({ id: nextId++, name });
        }
        meal.extra = JSON.stringify(data);
        await API.updateItem(mealId, { extra: meal.extra });
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        model.aiLoading.delete(mealId);
        updateView();
    }
}

// Generate cooking instructions via AI. Passes the meal name + current
// ingredients so the model can explain WHY each is added. Saves as markdown
// and exits edit mode so the rendered view shows.
async function aiGenerateMealInstructions(mealId) {
    const meal = model.lists.meals?.find(m => m.id === mealId);
    if (!meal || model.aiLoading.has(mealId)) return;
    const data = getMealData(meal);
    const ings = (data.ingredients || []).map(i => i.name).filter(Boolean);
    const header = lang === 'no' ? 'Ingredienser' : 'Ingredients';
    const prompt = ings.length
        ? `${meal.value}\n\n${header}:\n${ings.map(n => '- ' + n).join('\n')}`
        : meal.value;
    model.aiLoading.add(mealId);
    updateView();
    try {
        const res = await API.aiComplete('instructions', prompt, lang);
        const out = (res.text || '').trim();
        if (!out) throw new Error('Empty response');
        data.instructions = out;
        meal.extra = JSON.stringify(data);
        model.mealInstrEditing.delete(mealId);
        await API.updateItem(mealId, { extra: meal.extra });
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        model.aiLoading.delete(mealId);
        updateView();
    }
}

function toggleMealInstrEdit(mealId) {
    if (model.mealInstrEditing.has(mealId)) model.mealInstrEditing.delete(mealId);
    else model.mealInstrEditing.add(mealId);
    updateView();
}
