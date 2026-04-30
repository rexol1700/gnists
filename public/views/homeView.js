// ── HOME VIEW ─────────────────────────────────────────────────────────────────

function homeView() {
    const lightOn = model.isLightmode;
    const activePanels = layoutGetActive();
    const inactivePanels = layoutGetInactive();

    const boardPanels = activePanels.map((panel, idx) =>
        renderPanel(panel, idx, activePanels.length)
    ).join('');

    return /*html*/`
    <div class="topbar">
        <span class="topbar-title">Gnists ✦</span>
        <div class="topbar-actions">
            ${langSwitcher()}
            <span class="topbar-user">👤 ${API.username}</span>
            <button class="btn-manage ${model.boardManage ? 'active' : ''}" onclick="toggleBoardManage()" title="Manage board">
                ⊞ ${lang === 'no' ? 'Tilpass' : 'Customize'}
            </button>
            <button class="btn-reset-all" onclick="doResetAll(this)">
                <span class="reset-icon">↺</span> ${t('btn_reset_all')}
            </button>
            <button class="btn-light ${lightOn ? 'on' : ''}"
                onclick="lightToggle()"
                title="${lightOn ? t('btn_dark') : t('btn_light')}"></button>
            <button class="btn-logout" onclick="doLogout()">${t('btn_logout')}</button>
        </div>
    </div>

    ${model.boardManage ? renderManageDrawer(activePanels, inactivePanels) : ''}

    <div class="board ${model.boardManage ? 'board-dimmed' : ''}" id="board-grid"
         ondragover="boardDragOver(event)" ondrop="boardDrop(event)">
        ${boardPanels}
    </div>
    `;
}

// ── MANAGE DRAWER ─────────────────────────────────────────────────────────────

function renderManageDrawer(activePanels, inactivePanels) {
    const activeItems = activePanels.map((panel, idx) => /*html*/`
        <div class="manage-item manage-item-active"
             draggable="true"
             data-idx="${idx}"
             ondragstart="drawerDragStart(event, ${idx})"
             ondragover="drawerDragOver(event)"
             ondrop="drawerDrop(event, ${idx})"
             ondragend="drawerDragEnd(event)">
            <span class="manage-drag-handle">⠿</span>
            <span class="manage-icon">${panel.icon}</span>
            <span class="manage-label">${t(panel.labelKey)}</span>
            <span class="manage-span-toggle">
                <button class="manage-span-btn ${panel.span === 2 ? 'active' : ''}"
                    onclick="layoutSetSpan('${panel.id}', 2)" title="Wide">▬</button>
                <button class="manage-span-btn ${panel.span === 1 ? 'active' : ''}"
                    onclick="layoutSetSpan('${panel.id}', 1)" title="Normal">▪</button>
            </span>
            <button class="manage-remove-btn" onclick="layoutRemovePanel('${panel.id}')" title="Remove">−</button>
        </div>
    `).join('');

    const inactiveItems = inactivePanels.length ? /*html*/`
        <div class="manage-section-title">${lang === 'no' ? 'Tilgjengelige paneler' : 'Available panels'}</div>
        <div class="manage-inactive">
            ${inactivePanels.map(panel => /*html*/`
                <button class="manage-add-pill" onclick="layoutAddPanel('${panel.id}')">
                    ${panel.icon} ${t(panel.labelKey)} <span class="manage-plus">+</span>
                </button>
            `).join('')}
        </div>
    ` : '';

    return /*html*/`
        <div class="manage-drawer" id="manage-drawer">
            <div class="manage-header">
                <span class="manage-title">${lang === 'no' ? 'Tilpass tavlen' : 'Customize board'}</span>
                <button class="manage-close" onclick="toggleBoardManage()">✕</button>
            </div>
            <div class="manage-hint">${lang === 'no' ? 'Dra for å endre rekkefølge' : 'Drag to reorder'}</div>
            <div class="manage-list" id="manage-list">
                ${activeItems}
            </div>
            ${inactiveItems}
        </div>
    `;
}

// ── PANEL SHELL ───────────────────────────────────────────────────────────────

function renderPanel(panel, idx, total) {
    const spanStyle = panel.span > 1 ? `style="grid-column: span ${panel.span};"` : '';
    const [bodyHtml, inputHtml] = renderPanelContent(panel);

    return /*html*/`
        <div class="panel" ${spanStyle}
             data-panel-id="${panel.id}"
             data-panel-idx="${idx}"
             draggable="${model.boardManage ? 'true' : 'false'}"
             ondragstart="boardPanelDragStart(event, ${idx})"
             ondragend="boardPanelDragEnd(event)">
            <div class="panel-header">
                <span class="panel-icon">${panel.icon}</span>
                <span class="panel-title">${t(panel.labelKey)}</span>
                <button class="btn-reset"
                    onclick="spinReset('${panel.id}', this)" title="${t('btn_clear')}">↺</button>
            </div>
            ${inputHtml}
            <div class="panel-scroll">${bodyHtml}</div>
        </div>
    `;
}

// ── DRAG & DROP — BOARD GRID ──────────────────────────────────────────────────
// Drag panels directly on the board (only when manage drawer is open)

let _boardDragFrom = null;

function boardPanelDragStart(event, idx) {
    if (!model.boardManage) { event.preventDefault(); return; }
    _boardDragFrom = idx;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        const el = event.target.closest('.panel');
        if (el) el.classList.add('panel-dragging');
    }, 0);
}

function boardPanelDragEnd(event) {
    document.querySelectorAll('.panel-dragging, .panel-drag-over').forEach(el => {
        el.classList.remove('panel-dragging', 'panel-drag-over');
    });
    _boardDragFrom = null;
}

function boardDragOver(event) {
    if (_boardDragFrom === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.panel[data-panel-idx]');
    document.querySelectorAll('.panel-drag-over').forEach(el => el.classList.remove('panel-drag-over'));
    if (target) target.classList.add('panel-drag-over');
}

function boardDrop(event) {
    event.preventDefault();
    const target = event.target.closest('.panel[data-panel-idx]');
    if (!target || _boardDragFrom === null) return;
    const toIdx = parseInt(target.dataset.panelIdx, 10);
    if (!isNaN(toIdx)) layoutMovePanel(_boardDragFrom, toIdx);
}

// ── DRAG & DROP — MANAGE DRAWER ───────────────────────────────────────────────

let _drawerDragFrom = null;

function drawerDragStart(event, idx) {
    _drawerDragFrom = idx;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.closest('.manage-item')?.classList.add('drawer-dragging'), 0);
}

function drawerDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drawer-drag-over').forEach(el => el.classList.remove('drawer-drag-over'));
    event.currentTarget.classList.add('drawer-drag-over');
}

function drawerDrop(event, toIdx) {
    event.preventDefault();
    document.querySelectorAll('.drawer-dragging, .drawer-drag-over').forEach(el => {
        el.classList.remove('drawer-dragging', 'drawer-drag-over');
    });
    if (_drawerDragFrom !== null) layoutMovePanel(_drawerDragFrom, toIdx);
    _drawerDragFrom = null;
}

function drawerDragEnd(event) {
    document.querySelectorAll('.drawer-dragging, .drawer-drag-over').forEach(el => {
        el.classList.remove('drawer-dragging', 'drawer-drag-over');
    });
    _drawerDragFrom = null;
}

// ── SPAN TOGGLE ───────────────────────────────────────────────────────────────

function layoutSetSpan(id, span) {
    const panel = PANEL_REGISTRY.find(p => p.id === id);
    if (panel) {
        panel.span = span;
        updateView();
    }
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

// ── RESET HELPERS ─────────────────────────────────────────────────────────────

function spinReset(listName, btn) {
    btn.classList.remove('spinning');
    void btn.offsetWidth;
    btn.classList.add('spinning');
    btn.addEventListener('animationend', () => btn.classList.remove('spinning'), { once: true });
    resetList(listName);
}

async function doResetAll(btn) {
    const confirmed = confirm(lang === 'no'
        ? 'Er du sikker? Dette sletter alt.'
        : 'Are you sure? This will clear everything.');
    if (!confirmed) return;
    const label = btn.querySelector('.reset-icon');
    label.style.transform = 'rotate(-360deg)';
    label.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
    setTimeout(() => { label.style.transform = ''; label.style.transition = ''; }, 500);
    await resetAll();
}

// ── UTILITY ───────────────────────────────────────────────────────────────────

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
