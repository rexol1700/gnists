function registerView() {
    return /*html*/`
    <div class="ab paper">
        <div class="topbar mb-topbar">
            <div class="topbar-brand" onclick="changePage('landing')" style="cursor:pointer">
                <span class="mb-mark"><i></i><i></i><i></i></span>
                <span>My<em>Board</em></span>
            </div>
            <div class="lang-switcher-top">${langSwitcher()}</div>
        </div>
        <div class="auth-shell">
            <div class="auth-art">
                <div class="quote">
                    "${t('reg_quote')} <em>${t('reg_quote_em')}</em>"
                </div>
                <div class="footnote">${t('landing_footnote')}</div>
            </div>
            <div class="auth-form">
                <div class="br-eyebrow">${t('reg_eyebrow')}</div>
                <h1>${t('reg_h1_pre')}<em>${t('reg_h1_em')}</em>${t('reg_h1_post')}</h1>
                <p class="sub">${t('reg_sub')}</p>

                <div class="field">
                    <span class="field-label">${t('reg_user')}</span>
                    <input class="input" id="regUser" placeholder="${t('reg_user_ph')}" autocomplete="username">
                </div>

                <div class="field">
                    <span class="field-label">${t('reg_pass')}</span>
                    <input class="input" id="regPass" placeholder="${t('reg_pass_ph')}" type="password"
                        autocomplete="new-password"
                        onkeydown="if(event.key==='Enter') _submitRegister()">
                </div>

                <div class="auth-error" id="regError"></div>
                <button class="btn" onclick="_submitRegister()">${t('reg_btn')} <span class="arr">→</span></button>

                <div class="links">
                    ${t('reg_switch')} <a onclick="changePage('login')">${t('reg_switch_lnk')}</a>
                    &nbsp;·&nbsp;
                    <a onclick="changePage('landing')">${t('back')}</a>
                </div>
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
    doRegister(user, pass, err);
}
