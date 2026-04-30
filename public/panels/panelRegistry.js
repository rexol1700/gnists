// ── PANEL REGISTRY ────────────────────────────────────────────────────────────
// Each panel definition describes a self-contained board block.
// To add a new panel type, push a new entry here — nothing else needs changing.
//
// Shape:
// {
//   id:          string  — unique key, also used as the list name in model.lists
//   icon:        string  — emoji
//   labelKey:    string  — i18n key for the section title
//   phKey:       string  — i18n key for the input placeholder
//   emptyKey:    string  — i18n key for the empty-state message
//   type:        'simple' | 'keywords' | 'tasks' | 'bills'
//   span:        number  — how many grid columns to span (1 or 2)
// }

const PANEL_REGISTRY = [
    {
        id: 'questions',
        icon: '❓',
        labelKey: 'sec_questions',
        phKey: 'ph_questions',
        emptyKey: 'empty_list',
        type: 'simple',
        span: 2,
    },
    {
        id: 'Nøkkelord',
        icon: '🔑',
        labelKey: 'sec_keywords',
        phKey: 'ph_keywords',
        emptyKey: 'empty_keywords',
        type: 'keywords',
        span: 1,
    },
    {
        id: 'interests',
        icon: '💡',
        labelKey: 'sec_interests',
        phKey: 'ph_interests',
        emptyKey: 'empty_list',
        type: 'simple',
        span: 1,
    },
    {
        id: 'learningGoals',
        icon: '🎯',
        labelKey: 'sec_learning',
        phKey: 'ph_learning',
        emptyKey: 'empty_list',
        type: 'simple',
        span: 1,
    },
    {
        id: 'tasks',
        icon: '✅',
        labelKey: 'sec_tasks',
        phKey: 'ph_tasks',
        emptyKey: 'empty_tasks',
        type: 'tasks',
        span: 1,
    },

    // ── ADD NEW PANEL TYPES BELOW ──────────────────────────────────────────
    {
        id: 'bills',
        icon: '💸',
        labelKey: 'sec_bills',
        phKey: 'ph_bills',
        emptyKey: 'empty_bills',
        type: 'bills',
        span: 1,
    },
    {
        id: 'times',
        icon: '🕐',
        labelKey: 'sec_times',
        phKey: 'ph_times',
        emptyKey: 'empty_times',
        type: 'times',
        span: 1,
    },
    {
        id: 'motivations',
        icon: '🔥',
        labelKey: 'sec_motivations',
        phKey: 'ph_motivations',
        emptyKey: 'empty_motivations',
        type: 'simple',
        span: 1,
    },
    {
        id: 'selling',
        icon: '🏷️',
        labelKey: 'sec_selling',
        phKey: 'ph_selling',
        emptyKey: 'empty_selling',
        type: 'selling',
        span: 1,
    },
    {
        id: 'shopping',
        icon: '🛒',
        labelKey: 'sec_shopping',
        phKey: 'ph_shopping',
        emptyKey: 'empty_shopping',
        type: 'shopping',
        span: 1,
    },
    {
        id: 'notes',
        icon: '📝',
        labelKey: 'sec_notes',
        phKey: 'ph_notes',
        emptyKey: 'empty_notes',
        type: 'notes',
        span: 2,
    },
    {
        id: 'reminders',
        icon: '🔔',
        labelKey: 'sec_reminders',
        phKey: 'ph_reminders',
        emptyKey: 'empty_reminders',
        type: 'reminders',
        span: 1,
    },
];
