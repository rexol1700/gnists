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
    },
    tasks: [], // [{ id, task, ischecked, subtasks: [{ id, task, ischecked }] }]

    // UI state
    editingIndex: null,   // which keyword is being edited
    expandedTask: null,   // which task panel is open
    isLightmode: false,
};
