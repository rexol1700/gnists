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

// ── External-source aggregation ──────────────────────────────────────────────
// The calendar surfaces items from four other panels alongside its own
// native events. Each source produces a uniform event shape:
//
//   { id, source, title, time, desc, color, done?, meta? }
//
// where `source` is one of 'calendar' | 'task' | 'bill' | 'reminder' | 'habit'
// and the click handler routes by source (see calClickMergedEvent).
//
// Color conventions (chosen to read well against both light and dark themes
// and to match the existing CAL_COLORS palette):
//   calendar  → user-picked (sage / coral / ink / amber / blue)
//   task      → ink   (neutral; checked tasks render with the 'done' modifier)
//   bill      → amber (matches the "due" warm tone in the bills panel)
//   reminder  → coral
//   habit     → sage
function calEventsForDay(ymdStr) {
    const events = [];

    // 1. Native calendar events
    for (const it of (model.lists.calendar || [])) {
        const d = calEventData(it);
        if (d.date === ymdStr) {
            events.push({
                id: it.id, source: 'calendar', title: it.value,
                time: d.time, desc: d.desc, color: d.color,
            });
        }
    }

    // 2. Tasks scheduled for this day
    for (const tk of (model.tasks || [])) {
        if (tk.date && tk.date === ymdStr) {
            events.push({
                id: tk.id, source: 'task', title: tk.task,
                time: '', desc: '', color: 'ink',
                done: !!tk.ischecked,
            });
        }
    }

    // 3. Bills due this day (auto-shown — no opt-in needed)
    for (const b of (model.lists.bills || [])) {
        const [amount = '', dueDate = ''] = (b.extra || '').split('|');
        if (dueDate && dueDate === ymdStr) {
            events.push({
                id: b.id, source: 'bill', title: b.value,
                time: '', desc: amount ? `${amount}` : '',
                color: 'amber', meta: amount,
            });
        }
    }

    // 4. Reminders manually added to the calendar (extra: 'date' | 'date|1')
    for (const r of (model.lists.reminders || [])) {
        const raw = r.extra || '';
        const idx = raw.indexOf('|');
        const date = idx === -1 ? raw : raw.slice(0, idx);
        const onCal = idx !== -1 && raw.slice(idx + 1) === '1';
        if (onCal && date === ymdStr) {
            events.push({
                id: r.id, source: 'reminder', title: r.value,
                time: '', desc: '', color: 'coral',
            });
        }
    }

    // 5. Habits opted in to the calendar — render every day past the habit's
    //    creation so the user has a recurring nudge. Surface completion
    //    state inline so they can tick it off straight from the calendar.
    //    We don't show habits on future dates beyond today + 90 days to
    //    keep the merged event list bounded.
    const todayYmd = ymd(new Date());
    for (const h of (model.lists.habits || [])) {
        const data = habitData(h);
        if (!data.on_calendar) continue;
        // Only render dates from today onward — past completions live in
        // the habits panel's stats view, not on the calendar.
        if (ymdStr < todayYmd) continue;
        const done = data.completions.includes(ymdStr);
        events.push({
            id: h.id, source: 'habit', title: h.value,
            time: data.reminder || '', desc: '', color: 'sage',
            done,
        });
    }

    return events.sort((a, b) => (a.time || 'zz').localeCompare(b.time || 'zz'));
}

// Route a click on a merged calendar event to the right action based on
// its source. Native calendar events open the editor; tasks toggle done;
// habits toggle today's completion; bills/reminders are read-only so the
// click just opens a small inline detail (handled by the caller currently
// as a no-op; future: open a tooltip).
function calClickMergedEvent(source, id) {
    if (source === 'calendar') return calEditEvent(id);
    if (source === 'task')     return toggleTask(id);
    if (source === 'habit')    return habitToggleToday(id);
    // bill / reminder are informational on the calendar — no action.
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

function calEventIcon(e) {
    // Returns a small leading glyph for a merged calendar event based on its source.
    let glyph;
    switch (e.source) {
        case 'task':
            glyph = e.done ? '\u2611' : '\u2610'; // checked / unchecked box
            break;
        case 'bill':
            glyph = '\uD83D\uDCB5'; // banknote
            break;
        case 'reminder':
            glyph = '\uD83D\uDD14'; // bell
            break;
        case 'calendar':
        default:
            glyph = '\uD83D\uDCC5'; // calendar
            break;
    }
    return `<span class="cal-ev-icon" aria-hidden="true">${glyph}</span>`;
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
            <button class="cal-ev cal-ev-${escHtml(e.color)} cal-ev-src-${e.source} ${e.done ? 'cal-ev-done' : ''}"
                onclick="event.stopPropagation();calClickMergedEvent('${e.source}',${e.id})"
                data-testid="calendar-event-${e.source}-${e.id}"
                title="${escHtml(e.title)}">
                ${calEventIcon(e)}${e.time ? `<span class="cal-ev-time">${escHtml(e.time)}</span>` : ''}<span class="cal-ev-title">${escHtml(e.title)}</span>
            </button>
        `).join('');
        const moreHtml = overflow > 0
            ? `<button class="cal-ev-more" onclick="event.stopPropagation();calDrilldown('${dayYmd}')">${t('cal_more_n', { n: overflow })}</button>`
            : '';
        cells.push(`
            <div class="cal-cell ${inMonth ? '' : 'cal-cell-out'} ${isToday ? 'cal-cell-today' : ''} ${isSelected ? 'cal-cell-selected' : ''}"
                 onclick="calCellClick('${dayYmd}')"
                 ondragover="calCellDragOver(event, this)"
                 ondragleave="calCellDragLeave(event, this)"
                 ondrop="calCellDrop(event, '${dayYmd}', this)"
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
                <button class="cal-week-ev cal-ev-${escHtml(e.color)} cal-ev-src-${e.source} ${e.done ? 'cal-ev-done' : ''}"
                    onclick="calClickMergedEvent('${e.source}',${e.id})"
                    data-testid="calendar-event-${e.source}-${e.id}">
                    ${calEventIcon(e)}${e.time ? `<span class="cal-ev-time">${escHtml(e.time)}</span>` : ''}
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

// Count completions within a specific week (startOfWeek date → that week's 7 days).
function habitWeekCountFor(completions, weekStart) {
    const set = new Set(completions);
    let count = 0;
    for (let i = 0; i < 7; i++) {
        if (set.has(ymd(addDays(weekStart, i)))) count += 1;
    }
    return count;
}

// Weekly streak: consecutive weeks (ending with the current week) where the
// number of completions met or exceeded the weekly target. The current week
// is only counted as a "miss" once it is already over — an in-progress week
// that hasn't hit target yet does NOT break the streak.
function habitWeekStreak(completions, target) {
    if (!completions || !completions.length) return 0;
    const tgt = Math.max(1, Math.min(7, Number(target) || 7));
    let streak = 0;
    let weekStart = startOfWeek(new Date());
    // If the current (in-progress) week hasn't reached target yet, don't let it
    // break the streak — start counting from last week instead.
    if (habitWeekCountFor(completions, weekStart) < tgt) {
        weekStart = addDays(weekStart, -7);
    }
    while (habitWeekCountFor(completions, weekStart) >= tgt) {
        streak += 1;
        weekStart = addDays(weekStart, -7);
    }
    return streak;
}

// Best (longest) run of consecutive on-target weeks across all history.
function habitBestWeekStreak(completions, target) {
    if (!completions || !completions.length) return 0;
    const tgt = Math.max(1, Math.min(7, Number(target) || 7));
    const sorted = [...completions].sort();
    const earliest = startOfWeek(parseYmd(sorted[0]));
    const thisWeek = startOfWeek(new Date());
    let best = 0, cur = 0;
    let w = earliest;
    while (w <= thisWeek) {
        if (habitWeekCountFor(completions, w) >= tgt) {
            cur += 1;
            best = Math.max(best, cur);
        } else {
            cur = 0;
        }
        w = addDays(w, 7);
    }
    return best;
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
        // Context-aware streak badge: daily 🔥 for everyday habits,
        // weekly count for habits with a weekly target (< 7/week).
        const dailyHabit = data.target >= 7;
        const streak = dailyHabit
            ? habitStreak(data.completions)
            : habitWeekStreak(data.completions, data.target);
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
                        ${streak ? `<span class="hab-streak-badge" title="${dailyHabit ? t('hab_streak') : t('hab_week_streak')}">${dailyHabit ? '🔥' : '📅'} ${streak}</span>` : ''}
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

// Number of week-rows to show in the stats grid (most recent first).
const HAB_STATS_WEEKS = 12;
const HAB_STATS_WINDOW = HAB_STATS_WEEKS * 7;

function renderHabitsStats(items) {
    const dayInitials = t('hab_day_initials').split(',');
    return `<div class="hab-stats">${items.map(it => {
        const data = habitData(it);
        const today = new Date();
        const tgt = Math.max(1, Math.min(7, Number(data.target) || 7));

        // \u2500\u2500 Open data: just the figures, no pressure framing \u2500\u2500
        let last90 = 0;
        for (let i = 0; i < HAB_STATS_WINDOW; i++) {
            if (data.completions.includes(ymd(addDays(today, -i)))) last90 += 1;
        }
        const totalDone = data.completions.length;
        const completionSet = new Set(data.completions);

        // \u2500\u2500 Streak (consecutive on-target weeks) \u2500\u2500
        const weekStreak = habitWeekStreak(data.completions, data.target);
        const bestWeekStreak = habitBestWeekStreak(data.completions, data.target);

        // \u2500\u2500 Weekly grid: one row per week, most recent at the top \u2500\u2500
        // A week-row turns "completed" once it reaches the weekly target.
        const thisWeekStart = startOfWeek(today);
        const rows = [];
        for (let w = 0; w < HAB_STATS_WEEKS; w++) {
            const weekStart = addDays(thisWeekStart, -7 * w);
            const isCurrent = w === 0;
            let weekCount = 0;
            const cells = [];
            for (let d = 0; d < 7; d++) {
                const cellDate = addDays(weekStart, d);
                const key = ymd(cellDate);
                const isFuture = cellDate > today;
                const done = completionSet.has(key);
                if (done) weekCount += 1;
                const cls = ['hab-sg-cell'];
                if (done) cls.push('on');
                if (isFuture) cls.push('future');
                cells.push(
                    `<span class="${cls.join(' ')}" title="${key}">` +
                    `<span class="hab-sg-cell-d">${dayInitials[d] || ''}</span></span>`
                );
            }
            const complete = weekCount >= tgt;
            const rowCls = ['hab-sg-row'];
            if (complete) rowCls.push('complete');
            if (isCurrent) rowCls.push('current');
            const weekLabel = isCurrent
                ? t('hab_week_this')
                : t('hab_week_ago').replace('{n}', w);
            rows.push(`
                <div class="${rowCls.join(' ')}">
                    <span class="hab-sg-label">${weekLabel}</span>
                    <span class="hab-sg-cells">${cells.join('')}</span>
                    <span class="hab-sg-count">${weekCount}/${tgt}${complete ? ' \u2713' : ''}</span>
                </div>`);
        }

        return `
            <div class="hab-stat-card" data-testid="habit-stat-${it.id}">
                <div class="hab-stat-head">
                    <span class="hab-title">${escHtml(it.value)}</span>
                    ${data.category ? `<span class="hab-cat">${escHtml(data.category)}</span>` : ''}
                </div>
                <div class="hab-stat-numbers">
                    <div class="hab-stat-n hab-stat-streak">
                        <span class="hab-stat-num">\uD83D\uDD25 ${weekStreak}</span>
                        <span class="hab-stat-label">${t('hab_week_streak')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${bestWeekStreak}</span>
                        <span class="hab-stat-label">${t('hab_best_week_streak')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${last90}</span>
                        <span class="hab-stat-label">${t('hab_last_90')}</span>
                    </div>
                    <div class="hab-stat-n">
                        <span class="hab-stat-num">${totalDone}</span>
                        <span class="hab-stat-label">${t('hab_total_completions')}</span>
                    </div>
                </div>
                <div class="hab-sg-grid" data-testid="habit-weekgrid-${it.id}">${rows.join('')}</div>
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
