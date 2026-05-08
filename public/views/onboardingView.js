// ── ONBOARDING VIEW ──────────────────────────────────────────────────────────
// Four steps, dispatched via model.onboardingStep:
//   1 — Welcome (greeting + stepper preview)
//   2 — Pick boards (grid of toggleable panel cards)
//   3 — First spark (capture textarea + target list selector)
//   4 — Ready (preview of selected boards) → opens the home board

function onboardingView() {
    const step  = model.onboardingStep || 1;
    const total = 4;

    let body  = '';
    let primaryLabel = t('ob_continue');
    let primaryAction = 'obNext()';
    let showSkip = step !== 1 && step !== 4;
    let showBack = step > 1 && step < 4;

    switch (step) {
        case 1:
            body = _ob1Welcome();
            primaryLabel = t('ob1_btn');
            break;
        case 2:
            body = _ob2PickBoards();
            primaryLabel = t('ob2_btn');
            break;
        case 3:
            body = _ob3FirstSpark();
            primaryLabel = t('ob3_btn');
            break;
        case 4:
            body = _ob4Ready();
            primaryLabel = t('ob4_btn');
            primaryAction = 'obFinish()';
            break;
    }

    const pct = (step / total) * 100;

    return /*html*/`
    <div class="ob-shell">
        <div class="ob-top">
            <span class="topbar-brand" style="font-size:18px;margin-right:0;">
                ${_mbMark(14)}<span>My<em>Board</em></span>
            </span>
            <span class="ob-step-label" style="margin-left:14px;">
                ${t('ob_step')} ${String(step).padStart(2,'0')} ${t('ob_of')} ${String(total).padStart(2,'0')}
            </span>
            <div class="ob-progress" style="margin-left:auto;">
                <i style="width:${pct}%;"></i>
            </div>
            ${showSkip ? `<button class="ob-skip" onclick="obSkip()">${t('ob_skip')}</button>` : ''}
        </div>

        <div class="ob-body">${body}</div>

        <div class="ob-bottom">
            ${showBack
                ? `<button class="btn btn-ghost btn-sm" onclick="obBack()">${t('ob_back')}</button>`
                : `<span></span>`}
            <button class="btn" onclick="${primaryAction}">
                ${primaryLabel} <span class="arr">→</span>
            </button>
        </div>
    </div>
    `;
}

// ── STEP 1 — WELCOME ──────────────────────────────────────────────────────────

function _ob1Welcome() {
    const name = API.username || (lang === 'no' ? 'venn' : 'friend');
    const stepper = [1, 2, 3, 4].map(n => {
        const labels = {
            1: t('ob1_step1'),
            2: t('ob1_step2'),
            3: t('ob1_step3'),
            4: t('ob1_step4'),
        };
        const faint = n !== 1;
        return /*html*/`
            <div class="ob-stepper-item${faint ? ' faint' : ''}">
                <span class="ob-stepper-bullet">${n}</span>
                <span class="ob-stepper-text">${labels[n]}</span>
            </div>
        `;
    }).join('');

    return /*html*/`
        <div style="width:100%;max-width:760px;text-align:center;">
            <div class="br-eyebrow" style="margin-bottom:18px;">${t('ob1_eyebrow')}</div>
            <h1 class="ob-h1">${t('ob1_title', { name: escHtml(name) })}</h1>
            <p class="ob-lede" style="margin:28px auto 0;">${t('ob1_lede')}</p>
            <div class="ob-stepper">${stepper}</div>
        </div>
    `;
}

// ── STEP 2 — PICK BOARDS ──────────────────────────────────────────────────────

function _ob2PickBoards() {
    const picks = model.onboardingPicks;
    const cards = PANEL_REGISTRY.map(p => {
        const on = picks.has(p.id);
        return /*html*/`
            <button type="button" class="ob-board-card${on ? ' on' : ''}"
                    onclick="obToggleBoard('${p.id}')">
                <span class="ico">${p.icon}</span>
                <span class="check">✓</span>
                <span class="name">${t(p.labelKey)}</span>
                <span class="desc">${t(p.descKey)}</span>
            </button>
        `;
    }).join('');

    return /*html*/`
        <div style="width:100%;max-width:780px;">
            <div style="text-align:center;margin-bottom:32px;">
                <h2 class="ob-h2">${t('ob2_title')}</h2>
                <p class="ob-lede" style="margin:14px auto 0;">${t('ob2_lede')}</p>
                <div class="ob-help" style="margin-top:18px;">${t('ob2_helper', { n: picks.size })}</div>
            </div>
            <div class="ob-board-grid">${cards}</div>
        </div>
    `;
}

// ── STEP 3 — FIRST SPARK ──────────────────────────────────────────────────────

function _ob3FirstSpark() {
    const picks = Array.from(model.onboardingPicks);
    // Build a target dropdown limited to the panels they actually picked
    // (excluding panel types where pasting raw text doesn't make sense).
    const textTargets = picks
        .map(id => PANEL_REGISTRY.find(p => p.id === id))
        .filter(p => p && (p.type === 'simple' || p.type === 'tasks' || p.type === 'keywords'));

    // If nothing suitable is selected, fall back to questions.
    if (textTargets.length === 0) {
        const q = PANEL_REGISTRY.find(p => p.id === 'questions');
        if (q) textTargets.push(q);
    }

    // If our remembered target isn't in the list, snap to first available
    if (!textTargets.some(p => p.id === model.onboardingSpark.target)) {
        model.onboardingSpark.target = textTargets[0].id;
    }

    const targetOptions = textTargets.map(p => /*html*/`
        <option value="${p.id}" ${model.onboardingSpark.target === p.id ? 'selected' : ''}>
            ${p.icon}  ${t(p.labelKey)}
        </option>
    `).join('');

    const sug1 = t('ob3_sug1');
    const sug2 = t('ob3_sug2');
    const sug3 = t('ob3_sug3');

    return /*html*/`
        <div class="ob-spark-wrap">
            <div class="br-eyebrow" style="margin-bottom:18px;">${t('ob3_eyebrow')}</div>
            <h2 class="ob-h2">${t('ob3_title')}</h2>
            <p class="ob-lede" style="margin:14px auto 0;">${t('ob3_lede')}</p>

            <div class="ob-spark-input">
                <textarea id="ob-spark-text"
                          placeholder="${lang === 'no' ? 'noe du har på hjertet…' : "something on your mind…"}"
                          oninput="obSetSparkText(this.value)"
                          onkeydown="if((event.metaKey||event.ctrlKey)&&event.key==='Enter')obNext()"
                          autofocus>${escHtml(model.onboardingSpark.text)}</textarea>
                <div class="ob-spark-foot">
                    <span class="ob-spark-tag">
                        ${t('ob3_target')}
                        <select id="ob-spark-target" class="ob-spark-target-select"
                                onchange="obSetSparkTarget(this.value)">
                            ${targetOptions}
                        </select>
                    </span>
                    <span class="ob-spark-tag" style="color:var(--muted);">${t('ob3_hint')}</span>
                </div>
            </div>

            <div class="ob-suggestions">
                <span class="pill muted">${t('ob3_or')}</span>
                <button class="pill" onclick="obUseSuggestion('${escAttr(sug1)}')">${sug1}</button>
                <button class="pill" onclick="obUseSuggestion('${escAttr(sug2)}')">${sug2}</button>
                <button class="pill" onclick="obUseSuggestion('${escAttr(sug3)}')">${sug3}</button>
            </div>
        </div>
    `;
}

// ── STEP 4 — READY ────────────────────────────────────────────────────────────

function _ob4Ready() {
    const picks = Array.from(model.onboardingPicks);
    const sparkText = (model.onboardingSpark.text || '').trim();
    const sparkTarget = model.onboardingSpark.target;

    const rows = (picks.length
        ? picks.map(id => PANEL_REGISTRY.find(p => p.id === id)).filter(Boolean)
        : [PANEL_REGISTRY.find(p => p.id === 'questions')]
    ).map(p => {
        const isSparkTarget = sparkText && p.id === sparkTarget;
        const ct = isSparkTarget ? t('ob4_count_one') : t('ob4_count_empty');
        return /*html*/`
            <div class="ob-ready-row">
                <span class="ico">${p.icon}</span>
                <span class="nm">${t(p.labelKey)}</span>
                <span class="ct">${ct}</span>
            </div>
        `;
    }).join('');

    return /*html*/`
        <div class="ob-ready-wrap">
            <div class="br-eyebrow" style="margin-bottom:18px;">${t('ob4_eyebrow')}</div>
            <h2 class="ob-h2">${t('ob4_title')}</h2>
            <p class="ob-lede" style="margin:14px auto 0;">${t('ob4_lede')}</p>
            <div class="ob-ready-stack">${rows}</div>
        </div>
    `;
}

// Tiny attribute escape — for inserting strings into onclick="…'X'…" handlers
function escAttr(s) {
    return String(s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
