function loginView() {
    return /*html*/`
    <div class="auth-wrap">
        <div class="lang-switcher-top">${langSwitcher()}</div>
        <div class="auth-card">
            <h1>${t('login_title')}</h1>
            <p>${t('login_sub')}</p>

            <label>${t('login_user')}</label>
            <input class="add-input" id="loginUser" placeholder="${t('login_user_ph')}" autocomplete="username">

            <label>${t('login_pass')}</label>
            <input class="add-input" id="loginPass" placeholder="${t('login_pass_ph')}" type="password"
                autocomplete="current-password"
                onkeydown="if(event.key==='Enter') _submitLogin()">

            <div class="auth-error" id="loginError"></div>
            <button class="btn" onclick="_submitLogin()">${t('login_btn')}</button>
        </div>
        <p class="auth-switch">
            ${t('login_switch')} <a onclick="changePage('register')">${t('login_switch_lnk')}</a>
        </p>
        <p class="auth-switch"><a onclick="changePage('landing')">${t('back')}</a></p>
    </div>
    `;
}

function _submitLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err  = document.getElementById('loginError');
    err.textContent = '';
    if (!user || !pass) { err.textContent = t('err_fill'); return; }
    doLogin(user, pass, err);
}
