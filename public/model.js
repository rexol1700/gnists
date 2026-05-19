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
    },
    tasks: [], // [{ id, task, ischecked, subtasks: [{ id, task, ischecked }] }]

    // UI state
    editingIndex: new Set(),
    expandedTask: null,
    expandedNote: null,
    expandedMeal: null,
    expandedQuestion: null,
    aiLoading: new Set(), // item IDs currently waiting on an AI response
    mealActiveTab: {},
    mealInstrEditing: new Set(), // meal IDs whose instructions tab is in edit mode
    isDarkmode: false,
    textScale: 1,
    addPanelOpen: false,
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
