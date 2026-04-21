function registerView() {
    return /*html*/`
    <div class="auth-wrap">
        <div class="lang-switcher-top">${langSwitcher()}</div>
        <div class="auth-card">
            <h1>${t('reg_title')}</h1>
            <p>${t('reg_sub')}</p>

            <label>${t('reg_user')}</label>
            <input class="add-input" id="regUser" placeholder="${t('reg_user_ph')}" autocomplete="username">

            <label>${t('reg_pass')}</label>
            <input class="add-input" id="regPass" placeholder="${t('reg_pass_ph')}" type="password"
                autocomplete="new-password"
                onkeydown="if(event.key==='Enter') _submitRegister()">

            <div class="auth-error" id="regError"></div>
            <button class="btn" onclick="_submitRegister()">${t('reg_btn')}</button>
        </div>
        <p class="auth-switch">
            ${t('reg_switch')} <a onclick="changePage('login')">${t('reg_switch_lnk')}</a>
        </p>
        <p class="auth-switch"><a onclick="changePage('landing')">${t('back')}</a></p>
    </div>
    `;
}

function _submitRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const err  = document.getElementById('regError');
    err.textContent = '';
    if (!user || !pass) { err.textContent = t('err_fill'); return; }
    doRegister(user, pass, err);
}
