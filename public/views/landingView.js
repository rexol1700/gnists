function landingView() {
    return /*html*/`
    <div class="landing-wrap">
        <div class="lang-switcher-top">${langSwitcher()}</div>
        <div class="landing-hero">
            <div class="landing-title">${t('landing_title')}</div>
            <p class="landing-sub">${t('landing_sub')}</p>
        </div>
        <div class="landing-theory">
            <p>${t('landing_theory1')}</p>
            <p>${t('landing_theory2')}</p>
        </div>
        <div class="landing-btns">
            <button class="btn" onclick="changePage('register')">${t('landing_register')}</button>
            <button class="btn-ghost" onclick="changePage('login')">${t('landing_login')}</button>
        </div>
        <p class="landing-privacy">${t('landing_privacy')}</p>
    </div>
    `;
}
