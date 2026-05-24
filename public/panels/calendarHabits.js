// ── CALENDAR + HABITS PANELS ──────────────────────────────────────────────────
// Two newer panels. Both store data in the same `items` table as the others,
// using `extra` for JSON payloads.
//
// Calendar event JSON:  { date: 'YYYY-MM-DD', time: 'HH:MM' | '', desc: string, color: 'sage'|'coral'|'ink'|'amber'|'blue' }
// Habit JSON:           { category, target, reminder: 'HH:MM' | '', goal: string, completions: ['YYYY-MM-DD', ...] }

// ── shared date helpers ───────────────────────────────────────────────────────
function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}
function parseYmd(s) {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}
function calCursorDate() {
    return model.calendarCursor ? parseYmd(model.calendarCursor) : new Date();
}
function calSetCursor(d) {
    model.calendarCursor = ymd(d);
}
function startOfWeek(d) {
    // Week starts on Monday (ISO-like). For Sunday→Monday: 0→6, 1→0, …, 6→5
    const day = (d.getDay() + 6) % 7;
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    return out;
}
function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}
function isoWeek(d) {
    // ISO 8601 week number
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
}

function safeJson(s, fallback) {
    try { return JSON.parse(s || ''); } catch (_) { return fallback; }
}

// Parse a stored calendar event from the items.extra payload.
function calEventData(item) {
    const d = safeJson(item.extra, {});
    return {
        date: d.date || '',
        time: d.time || '',
        desc: d.desc || '',
        color: d.color || 'sage',
    };
}

function calEventsForDay(ymdStr) {
    return (model.lists.calendar || [])
        .map(it => ({ id: it.id, title: it.value, ...calEventData(it) }))
        .filter(e => e.date === ymdStr)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

const CAL_COLORS = ['sage', 'coral', 'ink', 'amber', 'blue'];

// ── calendar panel renderer ───────────────────────────────────────────────────
function renderCalendarPanel(panel) {
    const view = model.calendarView || 'month';
    const cursor = calCursorDate();

    const header = renderCalendarHeader(cursor, view);
    let body;
    if (view === 'month') body = renderCalendarMonth(cursor);
    else if (view === 'week') body = renderCalendarWeek(cursor);
    else body = renderCalendarDay(cursor);

    const editor = model.calendarComposing ? renderCalendarEditor() : '';

    return `<div class="cal-root">${header}${body}${editor}</div>`;
}

function renderCalendarPanelInput(_panel) {
    // The calendar panel uses its own action affordances (header buttons + cell
    // clicks) instead of a single text input. We still emit a small toolbar so
    // the panel header layout matches the others — handled by the "New event"
    // pill inside the calendar header.
    return '';
}

function renderCalendarHeader(cursor, view) {
    const monthName = t('mof_' + cursor.getMonth());
    const year = cursor.getFullYear();
    let label;
    if (view === 'month') {
        label = lang === 'no' ? `${monthName} ${year}` : `${monthName} ${year}`;
    } else if (view === 'week') {
        const start = startOfWeek(cursor);
        const end = addDays(start, 6);
        const wk = isoWeek(cursor);
        const s = `${start.getDate()}. ${t('mo_' + start.getMonth())}`;
        const e = `${end.getDate()}. ${t('mo_' + end.getMonth())} ${end.getFullYear()}`;
        label = `${t('cal_wk')}${wk} · ${s}–${e}`;
    } else {
        const wd = t('wd_' + cursor.getDay());
        label = `${wd}, ${cursor.getDate()}. ${t('mof_' + cursor.getMonth())} ${cursor.getFullYear()}`;
    }
    return `
        <div class="cal-header" data-testid="calendar-header">
            <div class="cal-nav">
                <button class="cal-nav-btn" onclick="calNavigate(-1)" data-testid="calendar-prev-btn" title="${lang === 'no' ? 'Forrige' : 'Previous'}">‹</button>
                <button class="cal-today-btn" onclick="calGoToday()" data-testid="calendar-today-btn">${t('cal_today')}</button>
                <button class="cal-nav-btn" onclick="calNavigate(1)" data-testid="calendar-next-btn" title="${lang === 'no' ? 'Neste' : 'Next'}">›</button>
            </div>
            <div class="cal-label" data-testid="calendar-label">${escHtml(label)}</div>
            <div class="cal-view-tabs">
                <button class="cal-view-tab ${view === 'month' ? 'active' : ''}" onclick="calSetView('month')" data-testid="calendar-view-month-btn">${t('cal_view_month')}</button>
                <button class="cal-view-tab ${view === 'week' ? 'active' : ''}" onclick="calSetView('week')" data-testid="calendar-view-week-btn">${t('cal_view_week')}</button>
                <button class="cal-view-tab ${view === 'day' ? 'active' : ''}" onclick="calSetView('day')" data-testid="calendar-view-day-btn">${t('cal_view_day')}</button>
            </div>
            <button class="cal-new-btn" onclick="calOpenNewEvent()" data-testid="calendar-new-event-btn">+ ${t('cal_new_event')}</button>
        </div>
    `;
}

function renderCalendarMonth(cursor) {
    // Grid: 6 rows × 7 cols, starting on Monday
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const today = new Date();
    const selected = model.calendarSelectedDate ? parseYmd(model.calendarSelectedDate) : null;

    // Weekday labels (Mon..Sun)
    const wkLabels = [1, 2, 3, 4, 5, 6, 0].map(d => `<div class="cal-wk-label">${t('wds_' + d)}</div>`).join('');

    const cells = [];
    for (let i = 0; i < 42; i++) {
        const d = addDays(gridStart, i);
        const inMonth = d.getMonth() === cursor.getMonth();
        const isToday = isSameDay(d, today);
        const isSelected = selected && isSameDay(d, selected);
        const dayYmd = ymd(d);
        const events = calEventsForDay(dayYmd);
        const visible = events.slice(0, 3);
        const overflow = events.length - visible.length;
        const evHtml = visible.map(e => `
            <button class="cal-ev cal-ev-${escHtml(e.color)}"
                onclick="event.stopPropagation();calEditEvent(${e.id})"
                data-testid="calendar-event-${e.id}"
                title="${escHtml(e.title)}">
                ${e.time ? `<span class="cal-ev-time">${escHtml(e.time)}</span>` : ''}<span class="cal-ev-title">${escHtml(e.title)}</span>
            </button>
        `).join('');
        const moreHtml = overflow > 0
            ? `<button class="cal-ev-more" onclick="event.stopPropagation();calDrilldown('${dayYmd}')">${t('cal_more_n', { n: overflow })}</button>`
            : '';
        cells.push(`
            <div class="cal-cell ${inMonth ? '' : 'cal-cell-out'} ${isToday ? 'cal-cell-today' : ''} ${isSelected ? 'cal-cell-selected' : ''}"
                 onclick="calCellClick('${dayYmd}')"
                 data-testid="calendar-cell-${dayYmd}">
                <div class="cal-cell-num">${d.getDate()}</div>
                <div class="cal-cell-events">${evHtml}${moreHtml}</div>
            </div>
        `);
    }
    return `
        <div class="cal-month-view">
            <div class="cal-wk-row">${wkLabels}</div>
            <div class="cal-grid">${cells.join('')}</div>
        </div>
    `;
}

function renderCalendarWeek(cursor) {
    const start = startOfWeek(cursor);
    const today = new Date();
    const cols = [];
    for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const dayYmd = ymd(d);
        const events = calEventsForDay(dayYmd);
        const isToday = isSameDay(d, today);
        const evHtml = events.length
            ? events.map(e => `
                <button class="cal-week-ev cal-ev-${escHtml(e.color)}"
                    onclick="calEditEvent(${e.id})"
                    data-testid="calendar-event-${e.id}">
                    ${e.time ? `<span class="cal-ev-time">${escHtml(e.time)}</span>` : ''}
                    <span class="cal-ev-title">${escHtml(e.title)}</span>
                    ${e.desc ? `<span class="cal-ev-desc">${escHtml(e.desc.slice(0, 60))}${e.desc.length > 60 ? '…' : ''}</span>` : ''}
                </button>
            `).join('')
            : `<span class="cal-week-empty">·</span>`;
        cols.push(`
            <div class="cal-week-col ${isToday ? 'cal-week-col-today' : ''}"
                 onclick="calCellClick('${dayYmd}')"
                 data-testid="calendar-week-col-${dayYmd}">
                <div class="cal-week-col-head">
                    <span class="cal-week-wd">${t('wds_' + d.getDay())}</span>
                    <span class="cal-week-dnum">${d.getDate()}</span>
                </div>
                <div class="cal-week-col-body">${evHtml}</div>
            </div>
        `);
    }
    return `<div class="cal-week-view">${cols.join('')}</div>`;
}

function renderCalendarDay(cursor) {
    const dayYmd = ymd(cursor);
    const events = calEventsForDay(dayYmd);
    if (!events.length) {
        return `<div class="cal-day-view"><p class="empty-msg" data-testid="calendar-day-empty">${t('cal_no_events_today')}</p></div>`;
    }
    return `
        <div class="cal-day-view" data-testid="calendar-day-view">
            ${events.map(e => `
                <button class="cal-day-ev cal-ev-${escHtml(e.color)}"
                    onclick="calEditEvent(${e.id})"
                    data-testid="calendar-event-${e.id}">
                    <div class="cal-day-ev-head">
                        ${e.time ? `<span class="cal-ev-time">${escHtml(e.time)}</span>` : `<span class="cal-ev-time cal-ev-allday">${t('cal_all_day')}</span>`}
                        <span class="cal-ev-title">${escHtml(e.title)}</span>
                    </div>
                    ${e.desc ? `<div class="cal-ev-desc">${escHtml(e.desc)}</div>` : ''}
                </button>
            `).join('')}
        </div>
    `;
}

function renderCalendarEditor() {
    const editing = model.calendarEditingId;
    let date = model.calendarSelectedDate || ymd(new Date());
    let title = '', time = '', desc = '', color = 'sage';
    if (editing) {
        const item = (model.lists.calendar || []).find(i => i.id === editing);
        if (item) {
            const d = calEventData(item);
            title = item.value;
            date = d.date || date;
            time = d.time || '';
            desc = d.desc || '';
            color = d.color || 'sage';
        }
    }
    const heading = editing ? t('cal_edit_event') : t('cal_new_event');
    const colorBtns = CAL_COLORS.map(c => `
        <button type="button" class="cal-color-swatch cal-ev-${c} ${c === color ? 'active' : ''}"
            onclick="calSetEditorColor('${c}')"
            data-testid="calendar-editor-color-${c}"
            title="${c}"></button>
    `).join('');

    return `
        <div class="cal-editor-overlay" onclick="calCloseEditor()" data-testid="calendar-editor-overlay">
            <div class="cal-editor" onclick="event.stopPropagation()" data-testid="calendar-editor">
                <div class="cal-editor-head">
                    <span>${heading}</span>
                    <button class="cal-editor-x" onclick="calCloseEditor()" data-testid="calendar-editor-close">✕</button>
                </div>
                <input class="add-input cal-editor-title" id="cal-editor-title"
                    data-testid="calendar-editor-title-input"
                    placeholder="${t('cal_event_title_ph')}" value="${escHtml(title)}"
                    onkeydown="if(event.key==='Enter') calSaveEditor()">
                <div class="cal-editor-row">
                    <label>${t('cal_event_date')}
                        <input class="add-input" type="date" id="cal-editor-date"
                            data-testid="calendar-editor-date-input" value="${escHtml(date)}">
                    </label>
                    <label>${t('cal_event_time')}
                        <input class="add-input" type="time" id="cal-editor-time"
                            data-testid="calendar-editor-time-input" value="${escHtml(time)}"
                            placeholder="--:--">
                    </label>
                </div>
                <textarea class="cal-editor-desc" id="cal-editor-desc"
                    data-testid="calendar-editor-desc-input"
                    placeholder="${t('cal_event_desc_ph')}" rows="3">${escHtml(desc)}</textarea>
                <div class="cal-editor-colors">
                    <span class="cal-editor-label">${t('cal_event_color')}</span>
                    ${colorBtns}
                </div>
                <div class="cal-editor-actions">
                    ${editing ? `<button class="cal-editor-del" onclick="calDeleteEvent()" data-testid="calendar-editor-delete-btn">${t('cal_delete')}</button>` : ''}
                    <button class="cal-editor-cancel" onclick="calCloseEditor()" data-testid="calendar-editor-cancel-btn">${t('cal_cancel')}</button>
                    <button class="cal-editor-save" onclick="calSaveEditor()" data-testid="calendar-editor-save-btn">${t('cal_save')}</button>
                </div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── habits panel renderer ────────────────────────────────────────────────────
function habitData(item) {
    const d = safeJson(item.extra, {});
    return {
        category: d.category || '',
        target: Number(d.target) || 7,
        reminder: d.reminder || '',
        goal: d.goal || '',
        completions: Array.isArray(d.completions) ? d.completions : [],
    };
}

function habitStreak(completions) {
    if (!completions || !completions.length) return 0;
    const set = new Set(completions);
    let streak = 0;
    const cursor = new Date();
    // If today not done yet, streak still counts up to yesterday.
    if (!set.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(ymd(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function habitBestStreak(completions) {
    if (!completions || !completions.length) return 0;
    const sorted = [...completions].sort();
    let best = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
        const prev = parseYmd(sorted[i - 1]);
        const now = parseYmd(sorted[i]);
        const diff = Math.round((now - prev) / 86400000);
        if (diff === 1) { cur += 1; best = Math.max(best, cur); }
        else { cur = 1; }
    }
    return best;
}

function habitDoneToday(item) {
    const data = habitData(item);
    return data.completions.includes(ymd(new Date()));
}

function habitWeekCount(item) {
    const data = habitData(item);
    const start = startOfWeek(new Date());
    let count = 0;
    for (let i = 0; i < 7; i++) {
        if (data.completions.includes(ymd(addDays(start, i)))) count += 1;
    }
    return count;
}

function renderHabitsPanel(panel) {
    const view = model.habitsView || 'today';
    const tabs = `
        <div class="hab-tabs" data-testid="habits-tabs">
            <button class="hab-tab ${view === 'today' ? 'active' : ''}" onclick="habitsSetView('today')" data-testid="habits-view-today-btn">${t('hab_view_today')}</button>
            <button class="hab-tab ${view === 'week' ? 'active' : ''}" onclick="habitsSetView('week')" data-testid="habits-view-week-btn">${t('hab_view_week')}</button>
            <button class="hab-tab ${view === 'stats' ? 'active' : ''}" onclick="habitsSetView('stats')" data-testid="habits-view-stats-btn">${t('hab_view_stats')}</button>
        </div>
    `;
    const items = model.lists.habits || [];
    if (!items.length) {
        return `${tabs}<p class="empty-msg" data-testid="habits-empty">${t(panel.emptyKey)}</p>`;
    }
    let body;
    if (view === 'today') body = renderHabitsToday(items);
    else if (view === 'week') body = renderHabitsWeek(items);
    else body = renderHabitsStats(items);
    return `${tabs}${body}`;
}

function renderHabitsPanelInput(panel) {
    return `
        <input class="add-input" placeholder="${t(panel.phKey)}"
            data-testid="habits-add-input"
            onkeydown="if(event.key==='Enter') addHabit(this)">
    `;
}

function renderHabitsToday(items) {
    return `<div class="hab-list">${items.map(it => {
        const data = habitData(it);
        const done = habitDoneToday(it);
        const streak = habitStreak(data.completions);
        const isOpen = model.habitsExpanded === it.id;
        const editor = isOpen ? renderHabitEditor(it, data) : '';
        return `
            <div class="hab-item ${done ? 'hab-done' : ''} ${isOpen ? 'hab-open' : ''}" data-testid="habit-item-${it.id}">
                <div class="hab-main">
                    <button class="hab-check ${done ? 'on' : ''}"
                        onclick="habitToggleToday(${it.id})"
                        data-testid="habit-toggle-${it.id}"
                        title="${done ? t('hab_mark_undone') : t('hab_mark_done')}">
                        ${done ? '✓' : ''}
                    </button>
                    <div class="hab-info" onclick="habitToggleExpand(${it.id})">
                        <div class="hab-title-row">
                            <span class="hab-title">${escHtml(it.value)}</span>
                            ${data.category ? `<span class="hab-cat">${escHtml(data.category)}</span>` : ''}
                        </div>
                        ${data.goal ? `<div class="hab-goal">${escHtml(data.goal)}</div>` : ''}
                    </div>
                    <div class="hab-meta">
                        ${streak ? `<span class="hab-streak-badge" title="${t('hab_streak')}">🔥 ${streak}</span>` : ''}
                        ${data.reminder ? `<span class="hab-reminder">⏰ ${escHtml(data.reminder)}</span>` : ''}
                        <button class="btn-icon" onclick="habitToggleExpand(${it.id})" data-testid="habit-edit-${it.id}">${isOpen ? '▲' : '▼'}</button>
                    </div>
                </div>
                ${editor}
            </div>
        `;
    }).join('')}</div>`;
}

function renderHabitsWeek(items) {
    const start = startOfWeek(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) days.push(addDays(start, i));
    const today = new Date();

    const head = `
        <div class="hab-week-row hab-week-head">
            <div class="hab-week-cell hab-week-cell-name"></div>
            ${days.map(d => `
                <div class="hab-week-cell hab-week-day-head ${isSameDay(d, today) ? 'hab-week-today' : ''}">
                    <span class="hab-week-wd">${t('wds_' + d.getDay())}</span>
                    <span class="hab-week-dn">${d.getDate()}</span>
                </div>
            `).join('')}
        </div>
    `;
    const rows = items.map(it => {
        const data = habitData(it);
        const cells = days.map(d => {
            const dy = ymd(d);
            const done = data.completions.includes(dy);
            const isFuture = d > today && !isSameDay(d, today);
            return `
                <div class="hab-week-cell">
                    <button class="hab-week-dot ${done ? 'on' : ''} ${isFuture ? 'future' : ''}"
                        ${isFuture ? 'disabled' : ''}
                        onclick="habitToggleDate(${it.id}, '${dy}')"
                        data-testid="habit-week-${it.id}-${dy}">
                        ${done ? '✓' : ''}
                    </button>
                </div>
            `;
        }).join('');
        return `
            <div class="hab-week-row" data-testid="habit-week-row-${it.id}">
                <div class="hab-week-cell hab-week-cell-name">
                    <span class="hab-week-name">${escHtml(it.value)}</span>
                    ${data.category ? `<span class="hab-cat hab-cat-sm">${escHtml(data.category)}</span>` : ''}
                </div>
                ${cells}
            </div>
        `;
    }).join('');
    return `<div class="hab-week-grid">${head}${rows}</div>`;
}

function renderHabitsStats(items) {
    return `<div class="hab-stats">${items.map(it => {
        const data = habitData(it);
        const last30 = (() => {
            let n = 0;
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                if (data.completions.includes(ymd(addDays(today, -i)))) n += 1;
            }
            return n;
        })();
        const rate = Math.round((last30 / 30) * 100);
        const best = habitBestStreak(data.completions);
        const streak = habitStreak(data.completions);

        // Tiny inline bar chart over the last 30 days (one bar per day)
        const today = new Date();
        const bars = [];
        for (let i = 29; i >= 0; i--) {
            const d = addDays(today, -i);
            const done = data.completions.includes(ymd(d));
            bars.push(`<span class="hab-bar ${done ? 'on' : ''}" title="${ymd(d)}"></span>`);
        }
        return `
            <div class="hab-stat-card" data-testid="habit-stat-${it.id}">
                <div class="hab-stat-head">
                    <span class="hab-title">${escHtml(it.value)}</span>
                    ${data.category ? `<span class="hab-cat">${escHtml(data.category)}</span>` : ''}
                </div>
                <div class="hab-stat-numbers">
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${last30}/30</span>
                        <span class="hab-stat-label">${t('hab_last_30')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${rate}%</span>
                        <span class="hab-stat-label">${t('hab_completion_rate')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${streak}</span>
                        <span class="hab-stat-label">${t('hab_streak')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${best}</span>
                        <span class="hab-stat-label">${t('hab_best_streak')}</span>
                    </div>
                </div>
                <div class="hab-bars">${bars.join('')}</div>
            </div>
        `;
    }).join('')}</div>`;
}

function renderHabitEditor(item, data) {
    return `
        <div class="hab-editor" data-testid="habit-editor-${item.id}">
            <div class="hab-editor-row">
                <label>${t('hab_category')}
                    <input class="add-input" id="hab-cat-${item.id}"
                        data-testid="habit-editor-category-${item.id}"
                        value="${escHtml(data.category)}" placeholder="${t('hab_category_ph')}">
                </label>
                <label>${t('hab_reminder')}
                    <input class="add-input" id="hab-rem-${item.id}" type="time"
                        data-testid="habit-editor-reminder-${item.id}"
                        value="${escHtml(data.reminder)}">
                </label>
                <label>${t('hab_target')}
                    <input class="add-input" id="hab-tgt-${item.id}" type="number" min="1" max="7"
                        data-testid="habit-editor-target-${item.id}"
                        value="${data.target || 7}">
                </label>
            </div>
            <label class="hab-goal-label">${t('hab_goal')}
                <textarea class="hab-editor-goal" id="hab-goal-${item.id}" rows="2"
                    data-testid="habit-editor-goal-${item.id}"
                    placeholder="${t('hab_goal_ph')}">${escHtml(data.goal)}</textarea>
            </label>
            <div class="hab-editor-actions">
                <button class="hab-editor-del" onclick="removeHabit(${item.id})" data-testid="habit-delete-${item.id}">${t('hab_delete')}</button>
                <button class="hab-editor-save" onclick="saveHabitEdits(${item.id})" data-testid="habit-save-${item.id}">${t('hab_save')}</button>
            </div>
        </div>
    `;
}
