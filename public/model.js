// ── CLIENT STATE ──────────────────────────────────────────────────────────────
const model = {
    // page: landing | login | register | onboarding | loading | home
    page: API.isLoggedIn() ? 'loading' : 'landing',

    // Board data from server.
    // Add new list IDs here to match entries in panelRegistry.js
    lists: {
        interests:    [],  // [{ id, value }]
        questions:    [],
        learningGoals:[],
        Nøkkelord:    [],  // [{ id, value, extra }]  extra = meaning
        bills:        [],  // [{ id, value, extra }]  extra = "amount|dueDate"
        times:        [],  // [{ id, value, extra }]  extra = "time|recurrence"
        motivations:  [],  // [{ id, value }]
        selling:      [],  // [{ id, value, extra }]  extra = "price|status"
        shopping:     [],  // [{ id, value, extra }]  extra = "listName|done"
        notes:        [],  // [{ id, value, extra }]  extra = note body
        reminders:    [],  // [{ id, value, extra }]  extra = due date
        meals:        [],  // [{ id, value, extra }]  extra = JSON {ingredients:[],instructions:''}
        calendar:     [],  // [{ id, value, extra }]  extra = JSON {date, time, description, color}
        habits:       [],  // [{ id, value, extra }]  extra = JSON {category, goal, reminder, completions:[]}
    },
    tasks: [], // [{ id, task, ischecked, subtasks: [{ id, task, ischecked }] }]

    // UI state
    editingIndex: new Set(),
    expandedTask: null,
    expandedNote: null,
    expandedMeal: null,
    expandedQuestion: null,
    expandedHabit: null,
    aiLoading: new Set(), // item IDs currently waiting on an AI response
    mealActiveTab: {},
    mealInstrEditing: new Set(), // meal IDs whose instructions tab is in edit mode

    // Calendar UI state — per panel instance (single panel for now), tracks
    // the focused date and the view granularity.
    calendarView: 'month',           // 'month' | 'week' | 'day'
    calendarCursor: null,            // YYYY-MM-DD anchor; null → today
    calendarSelectedDate: null,      // YYYY-MM-DD selected day (for day-detail in month view)
    calendarComposing: false,        // true when the event editor is open
    calendarEditingId: null,         // event id being edited (null = new event)

    // Habits UI state
    habitsView: 'today',             // 'today' | 'week' | 'stats'
    habitsExpanded: null,            // habit id currently expanded for edit
    isDarkmode: false,
    textScale: 1,
    addPanelOpen: false,
    accountMenuOpen: false,
    boardManage: false,
    tileLayout: [],

    // Shopping lists
    shoppingLists: [],
    activeShoppingList: '',

    // ── ONBOARDING ────────────────────────────────────────────────────────────
    // Step is 1..4. Picks is the set of panel IDs the user has selected
    // (defaults defined in onboardingView). Spark is the first item they captured.
    onboardingStep:    1,
    onboardingPicks:   new Set(),
    onboardingSpark:   { text: '', target: 'questions' },

    // ── BILLING ───────────────────────────────────────────────────────────────
    // Populated from /api/billing/status after login. paywallCurrency tracks
    // the user's currency pick on the paywall view (NOK or EUR).
    billing:           null,
    paywallCurrency:   null,
};
