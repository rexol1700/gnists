function landingView() {
    return /*html*/`
    <div class="ab paper">
        <div class="topbar mb-topbar">
            <div class="topbar-brand">
                <span class="mb-mark"><i></i><i></i><i></i></span>
                <span>My<em>Board</em></span>
            </div>
            <div class="lang-switcher-top">${langSwitcher()}</div>
        </div>
        <div class="auth-shell">
            <div class="auth-art">
                <div class="quote">
                    "${t('landing_quote')} <em>${t('landing_quote_em')}</em>"
                </div>
                <div class="footnote">${t('landing_footnote')}</div>
            </div>
            <div class="auth-form">
                <div class="br-eyebrow">${t('landing_eyebrow')}</div>
                <h1>${t('landing_h1_pre')}<em>${t('landing_h1_em')}</em>${t('landing_h1_post')}</h1>
                <p class="sub">${t('landing_sub')}</p>
                <div class="auth-actions">
                    <button class="btn" onclick="changePage('register')">${t('landing_register')} <span class="arr">→</span></button>
                    <button class="btn btn-ghost" onclick="changePage('login')">${t('landing_login')}</button>
                </div>
                <div class="links">${t('landing_privacy')}</div>
            </div>
        </div>
    </div>
    `;
}
