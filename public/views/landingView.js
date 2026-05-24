// ── LANDING ──────────────────────────────────────────────────────────────────
// Split-panel: paper quote on the left, hero + CTAs on the right.
// Topbar holds the wordmark and language switch.

function _mbMark(size = 16) {
    return /*html*/`<span class="mb-mark" style="width:${size}px;height:${size}px"><i></i><i></i><i></i></span>`;
}

function _mbWordmark() {
    return /*html*/`<span class="topbar-brand">${_mbMark(16)}<span>My<em>Board</em></span></span>`;
}

function landingView() {
    return /*html*/`
    <div class="topbar" style="background:transparent;border-bottom:0;">
        ${_mbWordmark()}
        ${langSwitcher()}
    </div>
    <div class="auth-shell">
        <div class="auth-art">
            <div class="quote">${t('landing_quote')}</div>
            <div class="footnote">${t('landing_footnote')}</div>
        </div>
        <div class="auth-form">
            <div class="br-eyebrow">${t('landing_eyebrow')}</div>
            <h1>${t('landing_title')}</h1>
            <p class="sub">${t('landing_sub')}</p>
            <div class="auth-row">
                <button class="btn" onclick="changePage('register')">
                    ${t('landing_register')} <span class="arr">→</span>
                </button>
                <button class="btn btn-ghost" onclick="changePage('login')">
                    ${t('landing_login')}
                </button>
            </div>
            <div class="links">${t('landing_privacy')}</div>
        </div>
    </div>
    `;
}
