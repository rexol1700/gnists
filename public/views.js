// ── VIEW ROUTER ───────────────────────────────────────────────────────────────

function updateView() {
    const app = document.getElementById('app');

    if (model.page === 'loading') {
        app.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
        return;
    }
    if (model.page === 'landing')     { app.innerHTML = landingView();    return; }
    if (model.page === 'login')       { app.innerHTML = loginView();      return; }
    if (model.page === 'register')    { app.innerHTML = registerView();   return; }
    if (model.page === 'onboarding')  { app.innerHTML = onboardingView(); return; }
    if (model.page === 'home')        { app.innerHTML = homeView();       return; }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────

model.tileLayout = layoutLoad();
updateView();

if (API.isLoggedIn()) {
    loadData().then(() => {
        if (localStorage.getItem('mb_onboarding_pending') === '1') {
            obStart();
        } else {
            model.page = 'home';
            updateView();
        }
    });
}
