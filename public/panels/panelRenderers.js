// ── PANEL RENDERERS ───────────────────────────────────────────────────────────
// One render function per panel `type`. The homeView.js loop calls the right
// one based on panel.type. To support a new type, add a case here + an entry
// in panelRegistry.js.

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
        const isEditing = model.editingIndex === idx;
        let html = /*html*/`
            <div class="item-row">
                <li onclick="editKeyword(${idx})" style="cursor:pointer;">${escHtml(item.value)}</li>
                <button class="btn-icon" onclick="removeItem('${panel.id}',${item.id})">✕</button>
            </div>
        `;
        if (isEditing) {
            html += /*html*/`
                <input class="add-input meaning-input"
                    placeholder="${t('ph_meaning')}"
                    value="${escHtml(item.extra)}"
                    onblur="saveMeaning(${item.id},${idx},this.value)"
                    onkeydown="if(event.key==='Enter') saveMeaning(${item.id},${idx},this.value)"
                    autofocus>
            `;
        } else if (item.extra) {
            html += /*html*/`
                <p class="keyword-meaning"
                    contenteditable="true"
                    onblur="saveMeaning(${item.id},${idx},this.innerText)">${escHtml(item.extra)}</p>
            `;
        }
        return html;
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
        default:
            return [`<p class="empty-msg">Unknown panel type: ${panel.type}</p>`, ''];
    }
}
