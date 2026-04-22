function homeView() {
    const lightOn = model.isLightmode;
    return /*html*/`
    <div class="topbar">
        <span class="topbar-title">Gnists ✦</span>
        <div class="topbar-actions">
            ${langSwitcher()}
            <span class="topbar-user">👤 ${API.username}</span>
            <button class="btn-light ${lightOn ? 'on' : ''}"
                onclick="lightToggle()"
                title="${lightOn ? t('btn_dark') : t('btn_light')}"></button>
            <button class="btn-logout" onclick="doLogout()">${t('btn_logout')}</button>
        </div>
    </div>

    <div class="board">

        <!-- Row 2: Questions (wide) | Tasks -->
        <div class="panel" style="grid-column: span 2;">
            <div class="panel-header">
                <span class="panel-title">${t('sec_questions')}</span>
                <button class="btn-reset"
                    onclick="spinReset('questions', this)" title="${t('btn_clear')}">↺</button>
            </div>
            <input class="add-input" placeholder="${t('ph_questions')}"
                onkeydown="if(event.key==='Enter') addItem('questions',this)">
            <div class="panel-scroll"><ul>${renderSimpleList('questions')}</ul></div>
            <button class="btn-reset-all" onclick="doResetAll(this)">
                <span class="reset-icon">↺</span> ${t('btn_reset_all')}
            </button>
        </div>

        <div class="panel">
            <div class="panel-header">
                <span class="panel-title">${t('sec_tasks')}</span>
            </div>
            <input class="add-input" placeholder="${t('ph_tasks')}"
                onkeydown="if(event.key==='Enter') addTask(this)">
            <div class="panel-scroll">${renderTasks()}</div>
        </div>
        
        <!-- Row 1: Interests | Learning | Keywords -->
        <div class="panel">
            <div class="panel-header">
                <span class="panel-title">${t('sec_interests')}</span>
                <button class="btn-reset" id="reset-interests"
                    onclick="spinReset('interests', this)" title="${t('btn_clear')}">↺</button>
            </div>
            <input class="add-input" placeholder="${t('ph_interests')}"
                onkeydown="if(event.key==='Enter') addItem('interests',this)">
            <div class="panel-scroll"><ul>${renderSimpleList('interests')}</ul></div>
        </div>

        <div class="panel">
            <div class="panel-header">
                <span class="panel-title">${t('sec_learning')}</span>
                <button class="btn-reset"
                    onclick="spinReset('learningGoals', this)" title="${t('btn_clear')}">↺</button>
            </div>
            <input class="add-input" placeholder="${t('ph_learning')}"
                onkeydown="if(event.key==='Enter') addItem('learningGoals',this)">
            <div class="panel-scroll"><ul>${renderSimpleList('learningGoals')}</ul></div>
        </div>

        <div class="panel">
            <div class="panel-header">
                <span class="panel-title">${t('sec_keywords')}</span>
                <button class="btn-reset"
                    onclick="spinReset('Nøkkelord', this)" title="${t('btn_clear')}">↺</button>
            </div>
            <input class="add-input" placeholder="${t('ph_keywords')}"
                onkeydown="if(event.key==='Enter') addKeyword(this)">
            <div class="panel-scroll"><ul>${renderKeywords()}</ul></div>
        </div>

        

    </div>
    `;
}

// ── LANG SWITCHER ─────────────────────────────────────────────────────────────
function langSwitcher() {
    return /*html*/`
        <div class="lang-switcher">
            <button class="lang-btn ${lang === 'no' ? 'active' : ''}" onclick="setLang('no')">🇳🇴 NO</button>
            <button class="lang-btn ${lang === 'en' ? 'active' : ''}" onclick="setLang('en')">🇬🇧 EN</button>
        </div>
    `;
}

// Reset with spin animation
function spinReset(listName, btn) {
    btn.classList.remove('spinning');
    void btn.offsetWidth; // reflow to restart animation
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    resetList(listName);
}

// Reset all with confirmation
async function doResetAll(btn) {
    const label = btn.querySelector('.reset-icon');
    label.style.transform = 'rotate(-360deg)';
    label.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
    setTimeout(() => { label.style.transform = ''; label.style.transition = ''; }, 500);
    await resetAll();
}

// ── RENDER HELPERS ────────────────────────────────────────────────────────────

function renderSimpleList(listName) {
    const items = model.lists[listName];
    if (!items.length) return `<li class="empty-msg">${t('empty_list')}</li>`;
    return items.map(item => /*html*/`
        <div class="item-row">
            <li>${escHtml(item.value)}</li>
            <button class="btn-icon" onclick="removeItem('${listName}',${item.id})">✕</button>
        </div>
    `).join('');
}

function renderKeywords() {
    const items = model.lists.Nøkkelord;
    if (!items.length) return `<li class="empty-msg">${t('empty_keywords')}</li>`;
    return items.map((item, idx) => {
        const isEditing = model.editingIndex === idx;
        let html = /*html*/`
            <div class="item-row">
                <li onclick="editKeyword(${idx})" style="cursor:pointer;">${escHtml(item.value)}</li>
                <button class="btn-icon" onclick="removeItem('Nøkkelord',${item.id})">✕</button>
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

function renderTasks() {
    if (!model.tasks.length) return `<p class="empty-msg">${t('empty_tasks')}</p>`;
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

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
