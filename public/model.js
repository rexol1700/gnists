// ── CLIENT STATE ──────────────────────────────────────────────────────────────
const model = {
    page: API.isLoggedIn() ? 'loading' : 'landing', // landing | login | register | loading | home
    
    // Board data from server
    lists: {
        interests:    [],  // [{ id, value }]
        questions:    [],
        learningGoals:[],
        Nøkkelord:    [],  // [{ id, value, extra }]  extra = meaning
    },
    tasks: [], // [{ id, task, ischecked, subtasks: [{ id, task, ischecked }] }]

    // UI state
    editingIndex: null,   // which keyword/task is expanded
    expandedTask: null,   // which task panel is open
    isLightmode: false,
};
