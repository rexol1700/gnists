// ── PAYWALL ──────────────────────────────────────────────────────────────────
// Shown after login/register when the server reports hasAccess=false.
// Two currencies (NOK, EUR) — pick one and we redirect to Stripe Checkout.

function _defaultCurrency() {
    // If the user has previously chosen, honour it.
    const stored = localStorage.getItem('mb_currency');
    if (stored === 'NOK' || stored === 'EUR') return stored;
    // Otherwise pick NOK for Norwegian browsers, EUR for everyone else.
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('nb') || nav.startsWith('nn') || nav.startsWith('no') ? 'NOK' : 'EUR';
}

function _fmtPrice(currency, amount) {
    // NOK uses "kr" suffix; EUR uses "€" prefix. Trailing .00 trimmed.
    const n = Number(amount);
    const isInt = Math.abs(n - Math.round(n)) < 0.005;
    const s = isInt ? String(Math.round(n)) : n.toFixed(2);
    return currency === 'NOK' ? `${s} kr` : `€${s}`;
}

function paywallView() {
    const billing = model.billing || {};
    const prices  = billing.prices || { NOK: {}, EUR: {} };
    const cur = model.paywallCurrency || _defaultCurrency();

    // If the chosen currency isn't configured, fall back to whichever is.
    const safeCur = prices[cur]?.available ? cur
                  : prices.NOK?.available ? 'NOK'
                  : prices.EUR?.available ? 'EUR'
                  : cur;
    const p = prices[safeCur] || {};

    const otherCur = safeCur === 'NOK' ? 'EUR' : 'NOK';
    const otherAvailable = !!prices[otherCur]?.available;

    return /*html*/`
    <div class="topbar" style="background:transparent;border-bottom:0;">
        ${_mbWordmark()}
        <div style="margin-left:auto;display:flex;gap:10px;align-items:center;">
            ${langSwitcher()}
            <button class="btn btn-ghost" style="padding:6px 14px;" onclick="doLogout()">${t('btn_logout')}</button>
        </div>
    </div>
    <div class="auth-shell">
        <div class="auth-art">
            <div class="quote">${t('paywall_quote')}</div>
            <div class="footnote">${t('landing_footnote')}</div>
        </div>
        <div class="auth-form">
            <div class="br-eyebrow">${t('paywall_eyebrow')}</div>
            <h1>${t('paywall_title')}</h1>
            <p class="sub">${t('paywall_sub')}</p>

            <div class="paywall-price">
                <div class="paywall-price-row">
                    <span class="paywall-price-big">${_fmtPrice(safeCur, p.setupAmount)}</span>
                    <span class="paywall-price-label">${t('paywall_first30')}</span>
                </div>
                <div class="paywall-price-row paywall-price-row--sub">
                    <span class="paywall-price-then">${t('paywall_then')}</span>
                    <span class="paywall-price-monthly">${_fmtPrice(safeCur, p.monthlyAmount)}</span>
                    <span class="paywall-price-period">${t('paywall_per_month')}</span>
                </div>
                <div class="paywall-cancel">${t('paywall_cancel')}</div>
            </div>

            <div class="auth-error" id="paywallError"></div>

            <button class="btn" id="paywallBtn" onclick="_startCheckout()">
                ${t('paywall_btn')} <span class="arr">→</span>
            </button>

            ${otherAvailable ? /*html*/`
                <div class="links" style="margin-top:18px;">
                    <a onclick="_switchPaywallCurrency('${otherCur}')">${t('paywall_switch_currency').replace('{cur}', otherCur)}</a>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}

function _switchPaywallCurrency(cur) {
    model.paywallCurrency = cur;
    localStorage.setItem('mb_currency', cur);
    updateView();
}

async function _startCheckout() {
    const btn = document.getElementById('paywallBtn');
    const err = document.getElementById('paywallError');
    err.textContent = '';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    const cur = model.paywallCurrency || _defaultCurrency();
    try {
        const res = await API.billingCheckout(cur);
        if (res.url) window.location.href = res.url;
        else throw new Error('No checkout URL returned');
    } catch (e) {
        err.textContent = e.message || 'Could not start checkout';
        btn.disabled = false;
        btn.style.opacity = '';
    }
}

// Shown briefly after returning from Stripe — we poll until the webhook has
// updated the user's status, then drop into the app.
function billingSuccessView() {
    return /*html*/`
    <div class="topbar" style="background:transparent;border-bottom:0;">
        ${_mbWordmark()}
    </div>
    <div class="auth-shell">
        <div class="auth-art">
            <div class="quote">${t('paywall_success_quote')}</div>
            <div class="footnote">${t('landing_footnote')}</div>
        </div>
        <div class="auth-form" style="text-align:center;">
            <div class="br-eyebrow">${t('paywall_success_eyebrow')}</div>
            <h1>${t('paywall_success_title')}</h1>
            <p class="sub">${t('paywall_success_sub')}</p>
            <div class="spinner-wrap" style="padding:24px 0;"><div class="spinner"></div></div>
        </div>
    </div>
    `;
}
