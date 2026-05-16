// ── PANEL RENDERERS ───────────────────────────────────────────────────────────
// One render function per panel `type`. The homeView.js loop calls the right
// one based on panel.type. To support a new type, add a case here + an entry
// in panelRegistry.js.

function robotIcon() {
    return /*html*/`<svg class="ai-robot" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 1.6v1.8"/>
        <circle cx="8" cy="1.4" r="0.7" fill="currentColor" stroke="none"/>
        <rect x="3" y="3.6" width="10" height="7.4" rx="1.6"/>
        <circle cx="6" cy="7.2" r="0.95" fill="currentColor" stroke="none"/>
        <circle cx="10" cy="7.2" r="0.95" fill="currentColor" stroke="none"/>
        <path d="M6.2 9.4h3.6"/>
        <path d="M3 6.5H1.5"/>
        <path d="M13 6.5h1.5"/>
        <path d="M5.5 11v1.6"/>
        <path d="M10.5 11v1.6"/>
    </svg>`;
}

// ── simple ────────────────────────────────────────────────────────────────────
function renderSimplePanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<li class="empty-msg">${t(panel.emptyKey)}</li>`;
    return items.map(item => /*html*/`
        <div class="item-row">
            <li>${escHtml(item.value)}</li>
            <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
        </div>
    `).join('');
}

function renderSimplePanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addItem('${panel.id}',this)">
    `;
}

// ── keywords ──────────────────────────────────────────────────────────────────
function renderKeywordsPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<li class="empty-msg">${t(panel.emptyKey)}</li>`;
    return items.map((item, idx) => {
        const isOpen = model.editingIndex.has(idx);
        const hasMeaning = item.extra && item.extra.trim();
        const loading = model.aiLoading.has(item.id);
        return /*html*/`
            <div class="keyword-block ${isOpen ? 'kw-open' : 'kw-closed'}">
                <div class="kw-header" onclick="editKeyword(${idx})">
                    <span class="kw-chip">
                        <span class="kw-indicator"></span>
                        <span class="kw-word">${escHtml(item.value)}</span>
                        ${hasMeaning && !isOpen ? `<span class="kw-preview">${escHtml(item.extra.slice(0, 38))}${item.extra.length > 38 ? '…' : ''}</span>` : ''}
                    </span>
                    <span class="kw-meta">
                        <button class="btn-icon btn-ai ${loading ? 'ai-loading' : ''}" title="${t('ai_define')}"
                            onclick="event.stopPropagation();aiDefineKeyword(${item.id},${idx})"
                            ${loading ? 'disabled' : ''}>${loading ? '◌' : robotIcon()}</button>
                        <span class="kw-arrow">${isOpen ? '▲' : '▼'}</span>
                        <button class="btn-icon kw-delete" onclick="event.stopPropagation();removeItem('${panel.id}',${item.id})">✕</button>
                    </span>
                </div>
                ${isOpen ? /*html*/`
                    <div class="kw-body">
                        <textarea class="keyword-meaning"
                            placeholder="${t('ph_meaning')}"
                            onchange="saveMeaning(${item.id},${idx},this.value)"
                            onblur="saveMeaning(${item.id},${idx},this.value)"
                            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                            >${escHtml(item.extra || '')}</textarea>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderKeywordsPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addKeyword(this)">
    `;
}

// ── tasks ─────────────────────────────────────────────────────────────────────
function renderTasksPanel(panel) {
    if (!model.tasks.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;
    return model.tasks.map(task => {
        const isOpen = model.expandedTask === task.id;
        const doneCount = task.subtasks.filter(s => s.ischecked).length;
        const subInfo = task.subtasks.length ? ` · ${doneCount}/${task.subtasks.length}` : '';
        let subtaskHtml = '';
        if (isOpen) {
            const subRows = task.subtasks.map(sub => /*html*/`
                <div class="subtask-row">
                    <input type="checkbox" ${sub.ischecked ? 'checked' : ''}
                        onchange="toggleSubtask(${task.id},${sub.id})">
                    <span class="subtask-label ${sub.ischecked ? 'done' : ''}">${escHtml(sub.task)}</span>
                    <button class="btn-icon" onclick="removeSubtask(${task.id},${sub.id})">✕</button>
                </div>
            `).join('');
            subtaskHtml = /*html*/`
                <div class="task-panel">
                    ${subRows || `<span class="empty-msg">${t('empty_subtasks')}</span>`}
                    <div class="subtask-add-row">
                        <input class="add-input" placeholder="${t('ph_subtask')}"
                            onkeydown="if(event.key==='Enter') addSubtask(${task.id},this)">
                    </div>
                </div>
            `;
        }
        return /*html*/`
            <div class="task-item">
                <div class="task-main">
                    <input type="checkbox" ${task.ischecked ? 'checked' : ''}
                        onchange="toggleTask(${task.id})">
                    <span class="task-label ${task.ischecked ? 'done' : ''}"
                        onclick="toggleTaskPanel(${task.id})">${escHtml(task.task)}</span>
                    <span class="task-expand" onclick="toggleTaskPanel(${task.id})">
                        ${subInfo} ${isOpen ? '▲' : '▼'}
                    </span>
                    <button class="btn-icon" onclick="removeTask(${task.id})">✕</button>
                </div>
                ${subtaskHtml}
            </div>
        `;
    }).join('');
}

function renderTasksPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addTask(this)">
    `;
}

// ── bills ─────────────────────────────────────────────────────────────────────
// Each bill: { id, value, extra }   value = bill name,  extra = "amount|dueDate"
function renderBillsPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;

    return items.map(item => {
        const [amount = '', dueDate = ''] = (item.extra || '').split('|');
        const isPast = dueDate && new Date(dueDate) < new Date();
        return /*html*/`
            <div class="bill-item ${isPast ? 'bill-overdue' : ''}">
                <div class="bill-main">
                    <span class="bill-name">${escHtml(item.value)}</span>
                    <span class="bill-meta">
                        ${amount ? `<span class="bill-amount">${escHtml(amount)}</span>` : ''}
                        ${dueDate ? `<span class="bill-due ${isPast ? 'overdue' : ''}">${dueDate}</span>` : ''}
                    </span>
                    <button class="btn-icon" onclick="removeBill(${item.id})">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderBillsPanelInput(panel) {
    return /*html*/`
        <div class="bill-add-row">
            <input class="add-input bill-name-input" id="bill-name-input" placeholder="${t(panel.phKey)}">
            <input class="add-input bill-amount-input" id="bill-amount-input" placeholder="${t('ph_bill_amount')}">
            <input class="add-input bill-date-input" id="bill-date-input" type="date">
            <button class="btn btn-add-bill" onclick="addBill('${panel.id}')">${t('btn_add_bill')}</button>
        </div>
    `;
}

// ── times ─────────────────────────────────────────────────────────────────────
function renderTimesPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;
    return items.map(item => {
        const [time = '', recurrence = ''] = (item.extra || '').split('|');
        return /*html*/`
            <div class="time-item">
                <span class="time-badge">${escHtml(time)}</span>
                <span class="time-label">${escHtml(item.value)}</span>
                ${recurrence ? `<span class="time-recurrence">${escHtml(recurrence)}</span>` : ''}
                <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
            </div>
        `;
    }).join('');
}

function renderTimesPanelInput(panel) {
    return /*html*/`
        <div class="times-add-row">
            <input class="add-input times-label-input" id="times-label-input" placeholder="${t(panel.phKey)}">
            <input class="add-input times-time-input" id="times-time-input" placeholder="${t('ph_times_time')}">
            <input class="add-input times-rec-input" id="times-rec-input" placeholder="${t('ph_times_rec')}">
            <button class="btn btn-add-time" onclick="addTimeEntry('${panel.id}')">${t('btn_add_time')}</button>
        </div>
    `;
}

// ── selling ───────────────────────────────────────────────────────────────────
function renderSellingPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;
    return items.map(item => {
        const [price = '', status = 'listed'] = (item.extra || '').split('|');
        const statusClass = status === 'sold' ? 'sold' : status === 'pending' ? 'pending' : 'listed';
        return /*html*/`
            <div class="selling-item ${statusClass}">
                <span class="selling-name">${escHtml(item.value)}</span>
                <span class="selling-meta">
                    ${price ? `<span class="selling-price">${escHtml(price)}</span>` : ''}
                    <select class="selling-status-select" onchange="updateSellingStatus(${item.id}, '${panel.id}', this.value)">
                        <option value="listed" ${status === 'listed' ? 'selected' : ''}>${t('sell_listed')}</option>
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>${t('sell_pending')}</option>
                        <option value="sold" ${status === 'sold' ? 'selected' : ''}>${t('sell_sold')}</option>
                    </select>
                </span>
                <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
            </div>
        `;
    }).join('');
}

function renderSellingPanelInput(panel) {
    return /*html*/`
        <div class="selling-add-row">
            <input class="add-input selling-name-input" id="selling-name-input" placeholder="${t(panel.phKey)}">
            <input class="add-input selling-price-input" id="selling-price-input" placeholder="${t('ph_selling_price')}">
            <button class="btn btn-add-selling" onclick="addSellingItem('${panel.id}')">${t('btn_add_selling')}</button>
        </div>
    `;
}

// ── shopping ──────────────────────────────────────────────────────────────────
function renderShoppingPanel(panel) {
    const allItems = model.lists[panel.id] || [];
    const lists = model.shoppingLists || ['Handleliste'];
    const active = model.activeShoppingList || lists[0];

    // Filter to active list (support both old format "done"|"" and new "listName|done")
    const items = allItems.filter(item => {
        const parts = (item.extra || '').split('|');
        if (parts.length >= 2) return parts[0] === active;
        return active === lists[0]; // legacy items go to first list
    });

    const tabsHtml = lists.map(l => /*html*/`
        <button class="shop-tab ${l === active ? 'active' : ''}" onclick="setActiveShoppingList('${escHtml(l)}')">${escHtml(l)}</button>
    `).join('');

    const addListHtml = /*html*/`
        <div class="shop-tab-add" onclick="promptAddShoppingList()">＋</div>
    `;

    const listHtml = items.length
        ? /*html*/`<ul class="shopping-list">${items.map(item => {
            const parts = (item.extra || '').split('|');
            const checked = parts.length >= 2 ? parts[1] === 'done' : item.extra === 'done';
            return /*html*/`
                <div class="shopping-item ${checked ? 'checked' : ''}">
                    <input type="checkbox" ${checked ? 'checked' : ''}
                        onchange="toggleShoppingItem(${item.id}, '${panel.id}', this.checked)">
                    <span class="shopping-label">${escHtml(item.value)}</span>
                    <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
                </div>
            `;
        }).join('')}</ul>`
        : `<p class="empty-msg">${t(panel.emptyKey)}</p>`;

    const manageBtnHtml = lists.length > 1 ? /*html*/`
        <button class="btn-icon shop-remove-list" title="${lang === 'no' ? 'Slett denne listen' : 'Delete this list'}"
            onclick="removeShoppingList('${escHtml(active)}')">🗑️</button>
    ` : '';

    return /*html*/`
        <div class="shop-tabs-row">
            <div class="shop-tabs">${tabsHtml}${addListHtml}</div>
            ${manageBtnHtml}
        </div>
        ${listHtml}
    `;
}

function renderShoppingPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addShoppingItemToList('${panel.id}',this)">
    `;
}

function promptAddShoppingList() {
    const name = prompt(lang === 'no' ? 'Navn på ny handleliste:' : 'New shopping list name:');
    if (name && name.trim()) addShoppingList(name.trim());
}

// ── meals ─────────────────────────────────────────────────────────────────────
function renderMealsPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;

    return items.map(meal => {
        const isOpen = model.expandedMeal === meal.id;
        const data = (() => { try { return JSON.parse(meal.extra || '{}'); } catch(e) { return {}; } })();
        const ingredients = data.ingredients || [];
        const instructions = data.instructions || '';
        const tab = model.mealActiveTab[meal.id] || 'ingredients';

        let bodyHtml = '';
        if (isOpen) {
            const ingTab = tab === 'ingredients';
            const ingHtml = ingTab ? /*html*/`
                <div class="meal-ingredients">
                    <div class="meal-ing-list">
                        ${ingredients.length
                            ? ingredients.map(ing => /*html*/`
                                <div class="meal-ing-row">
                                    <span class="meal-ing-name">${escHtml(ing.name)}</span>
                                    <div class="meal-ing-actions">
                                        <button class="btn-meal-add-shop" title="${lang === 'no' ? 'Legg til i handleliste' : 'Add to shopping list'}"
                                            onclick="addIngredientToShoppingList(${meal.id},${ing.id})">🛒</button>
                                        <button class="btn-icon" onclick="removeMealIngredient(${meal.id},${ing.id})">✕</button>
                                    </div>
                                </div>
                            `).join('')
                            : `<span class="empty-msg">${t('empty_ingredients')}</span>`
                        }
                    </div>
                    <div class="meal-ing-add">
                        <input class="add-input meal-ing-input" placeholder="${t('ph_ingredient')}"
                            onkeydown="if(event.key==='Enter') addMealIngredient(${meal.id},this)">
                        ${ingredients.length ? /*html*/`
                            <button class="btn btn-meal-all-shop" onclick="addAllIngredientsToShoppingList(${meal.id})">
                                🛒 ${lang === 'no' ? 'Legg alle til handleliste' : 'Add all to shopping list'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : '';

            const instrHtml = !ingTab ? /*html*/`
                <div class="meal-instructions">
                    <textarea class="meal-instr-area" rows="6"
                        placeholder="${t('ph_instructions')}"
                        onblur="saveMealInstructions(${meal.id}, this.value)"
                        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                    >${escHtml(instructions)}</textarea>
                </div>
            ` : '';

            bodyHtml = /*html*/`
                <div class="meal-body">
                    <div class="meal-tabs">
                        <button class="meal-tab ${ingTab ? 'active' : ''}" onclick="setMealTab(${meal.id},'ingredients')">
                            🥕 ${t('tab_ingredients')} ${ingredients.length ? `<span class="meal-ing-count">${ingredients.length}</span>` : ''}
                        </button>
                        <button class="meal-tab ${!ingTab ? 'active' : ''}" onclick="setMealTab(${meal.id},'instructions')">
                            📋 ${t('tab_instructions')}
                        </button>
                    </div>
                    ${ingHtml}${instrHtml}
                </div>
            `;
        }

        const hasInstr = instructions && instructions.trim().length > 0;
        return /*html*/`
            <div class="meal-item ${isOpen ? 'meal-open' : ''}">
                <div class="meal-header" onclick="toggleMeal(${meal.id})">
                    <div class="meal-title-row">
                        <span class="meal-name">${escHtml(meal.value)}</span>
                        <div class="meal-meta">
                            ${ingredients.length ? `<span class="meal-badge">${ingredients.length} ${lang === 'no' ? 'ingredienser' : 'ingredients'}</span>` : ''}
                            ${hasInstr ? `<span class="meal-badge meal-badge-instr">📋</span>` : ''}
                            <span class="meal-arrow">${isOpen ? '▲' : '▼'}</span>
                        </div>
                    </div>
                    <button class="btn-icon meal-delete" onclick="event.stopPropagation();removeMeal(${meal.id})">✕</button>
                </div>
                ${bodyHtml}
            </div>
        `;
    }).join('');
}

function renderMealsPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addMeal(this)">
    `;
}

// ── notes ─────────────────────────────────────────────────────────────────────
function renderNotesPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;
    return items.map(item => {
        const isOpen = model.expandedNote === item.id;
        return /*html*/`
            <div class="note-item">
                <div class="note-header" onclick="toggleNote(${item.id})">
                    <span class="note-title">${escHtml(item.value)}</span>
                    <span class="note-toggle">${isOpen ? '▲' : '▼'}</span>
                    <button class="btn-icon" onclick="event.stopPropagation();removeItem('${panel.id}',${item.id})">✕</button>
                </div>
                ${isOpen ? /*html*/`
                    <textarea class="note-body" rows="4"
                        placeholder="${t('ph_note_body')}"
                        onblur="saveNoteBody(${item.id}, '${panel.id}', this.value)">${escHtml(item.extra || '')}</textarea>
                ` : (item.extra ? `<p class="note-preview">${escHtml(item.extra.slice(0, 80))}${item.extra.length > 80 ? '…' : ''}</p>` : '')}
            </div>
        `;
    }).join('');
}

function renderNotesPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addItem('${panel.id}',this)">
    `;
}

// ── questions ─────────────────────────────────────────────────────────────────
// Each question: { id, value, extra }  value = question, extra = AI answer
function renderQuestionsPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<li class="empty-msg">${t(panel.emptyKey)}</li>`;
    return items.map(item => {
        const isOpen = model.expandedQuestion === item.id;
        const hasAnswer = item.extra && item.extra.trim();
        const loading = model.aiLoading.has(item.id);
        return /*html*/`
            <div class="question-item ${isOpen ? 'q-open' : ''}">
                <div class="question-header" onclick="toggleQuestion(${item.id})">
                    <span class="question-text">${escHtml(item.value)}</span>
                    <span class="question-meta">
                        <button class="btn-icon btn-ai ${loading ? 'ai-loading' : ''}" title="${t('ai_answer')}"
                            onclick="event.stopPropagation();aiAnswerQuestion(${item.id})"
                            ${loading ? 'disabled' : ''}>${loading ? '◌' : robotIcon()}</button>
                        ${hasAnswer ? `<span class="question-arrow">${isOpen ? '▲' : '▼'}</span>` : ''}
                        <button class="btn-icon" onclick="event.stopPropagation();removeItem('${panel.id}',${item.id})">✕</button>
                    </span>
                </div>
                ${isOpen && hasAnswer ? /*html*/`
                    <div class="question-answer">${mdToHtml(item.extra)}</div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderQuestionsPanelInput(panel) {
    return /*html*/`
        <input class="add-input" placeholder="${t(panel.phKey)}"
            onkeydown="if(event.key==='Enter') addItem('${panel.id}',this)">
    `;
}

// ── reminders ─────────────────────────────────────────────────────────────────
// Huskeliste: { id, value, extra }  value = reminder text, extra = due date or ''
function renderRemindersPanel(panel) {
    const items = model.lists[panel.id] || [];
    if (!items.length) return `<p class="empty-msg">${t(panel.emptyKey)}</p>`;
    const today = new Date().toISOString().slice(0, 10);
    return items.map(item => {
        const due = item.extra || '';
        const isPast = due && due < today;
        const isToday = due === today;
        return /*html*/`
            <div class="reminder-item ${isPast ? 'reminder-past' : ''} ${isToday ? 'reminder-today' : ''}">
                <span class="reminder-text">${escHtml(item.value)}</span>
                ${due ? `<span class="reminder-date ${isPast ? 'overdue' : isToday ? 'today' : ''}">${due}</span>` : ''}
                <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
            </div>
        `;
    }).join('');
}

function renderRemindersPanelInput(panel) {
    return /*html*/`
        <div class="reminders-add-row">
            <input class="add-input reminders-text-input" id="reminders-text-input" placeholder="${t(panel.phKey)}">
            <input class="add-input reminders-date-input" id="reminders-date-input" type="date">
            <button class="btn btn-add-reminder" onclick="addReminder('${panel.id}')">${t('btn_add_reminder')}</button>
        </div>
    `;
}

// ── DISPATCHER ────────────────────────────────────────────────────────────────
// Returns [bodyHtml, inputHtml] for any panel type.
function renderPanelContent(panel) {
    switch (panel.type) {
        case 'simple':
            return [
                `<ul>${renderSimplePanel(panel)}</ul>`,
                renderSimplePanelInput(panel),
            ];
        case 'keywords':
            return [
                `<ul>${renderKeywordsPanel(panel)}</ul>`,
                renderKeywordsPanelInput(panel),
            ];
        case 'tasks':
            return [
                renderTasksPanel(panel),
                renderTasksPanelInput(panel),
            ];
        case 'bills':
            return [
                renderBillsPanel(panel),
                renderBillsPanelInput(panel),
            ];
        case 'times':
            return [
                renderTimesPanel(panel),
                renderTimesPanelInput(panel),
            ];
        case 'selling':
            return [
                renderSellingPanel(panel),
                renderSellingPanelInput(panel),
            ];
        case 'shopping':
            return [
                renderShoppingPanel(panel),
                renderShoppingPanelInput(panel),
            ];
        case 'meals':
            return [
                renderMealsPanel(panel),
                renderMealsPanelInput(panel),
            ];
        case 'notes':
            return [
                renderNotesPanel(panel),
                renderNotesPanelInput(panel),
            ];
        case 'reminders':
            return [
                renderRemindersPanel(panel),
                renderRemindersPanelInput(panel),
            ];
        case 'questions':
            return [
                `<ul>${renderQuestionsPanel(panel)}</ul>`,
                renderQuestionsPanelInput(panel),
            ];
        default:
            return [`<p class="empty-msg">Unknown panel type: ${panel.type}</p>`, ''];
    }
}
