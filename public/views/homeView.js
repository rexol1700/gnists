// ── HOME VIEW ─────────────────────────────────────────────────────────────────
// Renders the board by looping over PANEL_REGISTRY.
// To add, remove, or reorder panels — edit panelRegistry.js only.

function homeView() {
    const lightOn = model.isLightmode;
    const boardPanels = PANEL_REGISTRY.map(panel => renderPanel(panel)).join('');

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

    <div class="board">
        ${boardPanels}
    </div>
    `;
}

// ── PANEL SHELL ───────────────────────────────────────────────────────────────
// Wraps any panel definition in the standard chrome (header, input, scroll area).

function renderPanel(panel) {
    const spanStyle = panel.span > 1 ? `style="grid-column: span ${panel.span};"` : '';
    const [bodyHtml, inputHtml] = renderPanelContent(panel);

    return /*html*/`
        <div class="panel" ${spanStyle}>
            <div class="panel-header">
                <span class="panel-title">${t(panel.labelKey)}</span>
                <button class="btn-reset"
                    onclick="spinReset('${panel.id}', this)" title="${t('btn_clear')}">↺</button>
            </div>
            ${inputHtml}
            <div class="panel-scroll">${bodyHtml}</div>
        </div>
    `;
}

// ── LANG SWITCHER ─────────────────────────────────────────────────────────────
function langSwitcher() {
    return /*html*/`
        <div class="lang-switcher">
            <button class="lang-btn ${lang === 'no' ? 'active' : ''}" onclick="setLang('no')">NO</button>
            <button class="lang-btn ${lang === 'en' ? 'active' : ''}" onclick="setLang('en')">EN</button>
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
