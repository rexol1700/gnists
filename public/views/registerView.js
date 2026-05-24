// ── REGISTER ─────────────────────────────────────────────────────────────────

function registerView() {
    return /*html*/`
    <div class="topbar" style="background:transparent;border-bottom:0;">
        ${_mbWordmark()}
        ${langSwitcher()}
    </div>
    <div class="auth-shell">
        <div class="auth-art">
            <div class="quote">${t('reg_quote')}</div>
            <div class="footnote">${t('landing_footnote')}</div>
        </div>
        <div class="auth-form">
            <div class="br-eyebrow">${t('reg_eyebrow')}</div>
            <h1>${t('reg_title')}</h1>
            <p class="sub">${t('reg_sub')}</p>

            <div class="field">
                <span class="field-label">${t('reg_user')}</span>
                <input class="input" id="regUser" placeholder="${t('reg_user_ph')}"
                       autocomplete="username" maxlength="50">
            </div>
            <div class="field">
                <span class="field-label">${t('reg_pass')}</span>
                <input class="input" id="regPass" placeholder="${t('reg_pass_ph')}" type="password"
                       autocomplete="new-password" maxlength="128"
                       onkeydown="if(event.key==='Enter') _submitRegister()">
            </div>

            <div class="auth-error" id="regError"></div>

            <button class="btn" onclick="_submitRegister()">
                ${t('reg_btn')} <span class="arr">→</span>
            </button>

            <div class="links">${t('reg_links')}
                &nbsp;·&nbsp; <a onclick="changePage('landing')">${t('back')}</a>
            </div>
        </div>
    </div>
    `;
}

function _submitRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const err  = document.getElementById('regError');
    err.textContent = '';
    if (!user || !pass) { err.textContent = t('err_fill'); return; }
    if (user.length < 3) { err.textContent = t('err_user_short') || 'Username must be at least 3 characters.'; return; }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(user)) { err.textContent = t('err_user_chars') || 'Username may only contain letters, numbers, underscores, hyphens and dots.'; return; }
    if (pass.length < 4) { err.textContent = t('err_pass_short') || 'Password must be at least 4 characters.'; return; }
    doRegister(user, pass, err);
}
