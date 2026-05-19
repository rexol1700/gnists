// ── VIEW ROUTER ───────────────────────────────────────────────────────────────

function updateView() {
    const app = document.getElementById('app');

    if (model.page === 'loading') {
        app.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
        return;
    }
    if (model.page === 'landing')         { app.innerHTML = landingView();         return; }
    if (model.page === 'login')           { app.innerHTML = loginView();           return; }
    if (model.page === 'register')        { app.innerHTML = registerView();        return; }
    if (model.page === 'onboarding')      { app.innerHTML = onboardingView();      return; }
    if (model.page === 'paywall')         { app.innerHTML = paywallView();         return; }
    if (model.page === 'billing-success') { app.innerHTML = billingSuccessView();  return; }
    if (model.page === 'home')            { app.innerHTML = homeView();            return; }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────

model.tileLayout = layoutLoad();
updateView();

// Close any open topbar dropdown when clicking anywhere outside it. The
// triggering pill and the dropdown itself stopPropagation, so a real outside
// click reaches this handler with at least one of the *Open flags still true.
document.addEventListener('click', () => {
    let changed = false;
    if (model.addPanelOpen)     { model.addPanelOpen     = false; changed = true; }
    if (model.accountMenuOpen)  { model.accountMenuOpen  = false; changed = true; }
    if (changed) updateView();
});

// ── INITIAL ROUTING ──────────────────────────────────────────────────────────
// Three things to consider on page load:
//   1. Are we coming back from Stripe Checkout? (?billing=success|cancel)
//   2. Is the user logged in?
//   3. Do they have access? (subscription / grandfathered)
(function bootRoute() {
    const params = new URLSearchParams(window.location.search);
    const billingResult = params.get('billing');

    // Clean the URL either way so a refresh doesn't replay the result
    if (billingResult) {
        const url = new URL(window.location.href);
        url.searchParams.delete('billing');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }

    if (!API.isLoggedIn()) {
        // No session — landing page handles the rest
        model.page = 'landing';
        updateView();
        return;
    }

    if (billingResult === 'success') {
        // Stripe redirected back. Show "activating…" and poll until webhook lands.
        model.page = 'billing-success';
        updateView();
        waitForActivation();
        return;
    }

    // Normal post-login boot: fetch billing status, then either paywall or app
    routeAfterAuth();
})();
