// ── LOGIN ────────────────────────────────────────────────────────────────────

function loginView() {
    return /*html*/`
    <div class="topbar" style="background:transparent;border-bottom:0;">
        ${_mbWordmark()}
        ${langSwitcher()}
    </div>
    <div class="auth-shell">
        <div class="auth-art">
            <div class="quote">${t('login_quote')}</div>
            <div class="footnote">${t('landing_footnote')}</div>
        </div>
        <div class="auth-form">
            <div class="br-eyebrow">${t('login_eyebrow')}</div>
            <h1>${t('login_title')}</h1>

            <div class="field">
                <span class="field-label">${t('login_user')}</span>
                <input class="input" id="loginUser" placeholder="${t('login_user_ph')}"
                       autocomplete="username">
            </div>
            <div class="field">
                <span class="field-label">${t('login_pass')}</span>
                <input class="input" id="loginPass" placeholder="${t('login_pass_ph')}" type="password"
                       autocomplete="current-password"
                       onkeydown="if(event.key==='Enter') _submitLogin()">
            </div>

            <div class="auth-error" id="loginError"></div>

            <button class="btn" onclick="_submitLogin()">
                ${t('login_btn')} <span class="arr">→</span>
            </button>

            <div class="links">${t('login_links')}
                &nbsp;·&nbsp; <a onclick="changePage('landing')">${t('back')}</a>
            </div>
        </div>
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
