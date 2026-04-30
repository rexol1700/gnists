// ── HOME VIEW ─────────────────────────────────────────────────────────────────

function homeView() {
    const lightOn = model.isLightmode;
    const activePanels = layoutGetActive();

    const boardPanels = activePanels.map((panel, idx) => renderPanel(panel, idx)).join('');

    return /*html*/`
    <div class="topbar">
        <span class="topbar-title">Gnists ✦</span>
        <div class="topbar-actions">
            ${langSwitcher()}
            <span class="topbar-user">👤 ${API.username}</span>
            <button class="btn-reset-all" onclick="doResetAll(this)">
                <span class="reset-icon">↺</span> ${t('btn_reset_all')}
            </button>
            <button class="btn-light ${lightOn ? 'on' : ''}"
                onclick="lightToggle()"
                title="${lightOn ? t('btn_dark') : t('btn_light')}"></button>
            <button class="btn-logout" onclick="doLogout()">${t('btn_logout')}</button>
        </div>
    </div>

    <div class="board" id="board-grid"
         ondragover="boardDragOver(event)"
         ondrop="boardDrop(event)"
         ondragleave="boardDragLeave(event)">
        ${boardPanels}
        ${renderAddPanel()}
    </div>
    `;
}

// ── ADD PANEL SLOT ────────────────────────────────────────────────────────────

function renderAddPanel() {
    const inactive = layoutGetInactive();
    const isOpen = model.addPanelOpen;

    if (!inactive.length) return ''; // all panels already on board

    const picker = isOpen ? /*html*/`
        <div class="add-panel-picker">
            ${inactive.map(p => /*html*/`
                <button class="add-panel-option" onclick="layoutAddPanel('${p.id}')">
                    <span class="apo-icon">${p.icon}</span>
                    <span class="apo-label">${t(p.labelKey)}</span>
                </button>
            `).join('')}
        </div>
    ` : '';

    return /*html*/`
        <div class="panel panel-add ${isOpen ? 'panel-add-open' : ''}"
             onclick="${isOpen ? '' : 'toggleAddPanel()'}">
            <button class="add-panel-btn ${isOpen ? 'open' : ''}"
                    onclick="event.stopPropagation(); toggleAddPanel()">
                <span class="add-panel-cross">+</span>
            </button>
            ${isOpen
                ? `<div class="add-panel-label">${lang === 'no' ? 'Legg til panel' : 'Add panel'}</div>`
                : `<div class="add-panel-label muted">${lang === 'no' ? 'Legg til panel' : 'Add panel'}</div>`
            }
            ${picker}
        </div>
    `;
}

// ── PANEL SHELL ───────────────────────────────────────────────────────────────

function renderPanel(panel, idx) {
    const spanStyle = panel.span > 1 ? `style="grid-column: span ${panel.span};"` : '';
    const [bodyHtml, inputHtml] = renderPanelContent(panel);
    const isWide = panel.span > 1;

    return /*html*/`
        <div class="panel" ${spanStyle}
             data-panel-id="${panel.id}"
             data-panel-idx="${idx}"
             draggable="true"
             ondragstart="boardPanelDragStart(event, ${idx})"
             ondragend="boardPanelDragEnd(event)">

            <div class="panel-header">
                <span class="panel-drag-grip" title="${lang === 'no' ? 'Dra for å flytte' : 'Drag to move'}">⠿</span>
                <span class="panel-icon">${panel.icon}</span>
                <span class="panel-title">${t(panel.labelKey)}</span>

                <div class="panel-controls">
                    <button class="panel-ctrl-btn ${isWide ? 'ctrl-active' : ''}"
                        onclick="layoutSetSpan('${panel.id}', ${isWide ? 1 : 2})"
                        title="${isWide ? (lang === 'no' ? 'Gjør smal' : 'Make narrow') : (lang === 'no' ? 'Gjør bred' : 'Make wide')}">
                        ${isWide ? '⇥' : '⇤'}
                    </button>
                    <button class="btn-reset"
                        onclick="spinReset('${panel.id}', this)" title="${t('btn_clear')}">↺</button>
                    <button class="panel-ctrl-btn panel-ctrl-hide"
                        onclick="layoutRemovePanel('${panel.id}')"
                        title="${lang === 'no' ? 'Skjul panel' : 'Hide panel'}">✕</button>
                </div>
            </div>

            ${inputHtml}
            <div class="panel-scroll">${bodyHtml}</div>
        </div>
    `;
}

// ── DRAG & DROP ───────────────────────────────────────────────────────────────

let _boardDragFrom = null;

function boardPanelDragStart(event, idx) {
    _boardDragFrom = idx;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', idx); // required for Firefox
    setTimeout(() => {
        const el = document.querySelector(`.panel[data-panel-idx="${idx}"]`);
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

function boardDragLeave(event) {
    // Only clear if leaving the board entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
        document.querySelectorAll('.panel-drag-over').forEach(el => el.classList.remove('panel-drag-over'));
    }
}

function boardDrop(event) {
    event.preventDefault();
    const target = event.target.closest('.panel[data-panel-idx]');
    document.querySelectorAll('.panel-drag-over').forEach(el => el.classList.remove('panel-drag-over'));
    if (!target || _boardDragFrom === null) return;
    const toIdx = parseInt(target.dataset.panelIdx, 10);
    if (!isNaN(toIdx) && toIdx !== _boardDragFrom) layoutMovePanel(_boardDragFrom, toIdx);
}

// ── SPAN TOGGLE ───────────────────────────────────────────────────────────────

function layoutSetSpan(id, span) {
    const panel = PANEL_REGISTRY.find(p => p.id === id);
    if (panel) { panel.span = span; updateView(); }
}

// ── ADD PANEL TOGGLE ──────────────────────────────────────────────────────────

function toggleAddPanel() {
    model.addPanelOpen = !model.addPanelOpen;
    updateView();
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
