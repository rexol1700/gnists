// ── CLIENT STATE ──────────────────────────────────────────────────────────────
const model = {
    page: API.isLoggedIn() ? 'loading' : 'landing', // landing | login | register | loading | home
    
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
        shopping:     [],  // [{ id, value, extra }]  extra = "done" | ""
        notes:        [],  // [{ id, value, extra }]  extra = note body
    },
    tasks: [], // [{ id, task, ischecked, subtasks: [{ id, task, ischecked }] }]

    // UI state
    editingIndex: null,   // which keyword is being edited
    expandedTask: null,   // which task panel is open
    expandedNote: null,   // which note is expanded
    isLightmode: false,
    addPanelOpen: false,  // is the add-panel picker open?
    boardManage: false,
    tileLayout: [],       // 2D array of rows: [[{id,flex},...], ...]  — loaded by layoutLoad()
};
