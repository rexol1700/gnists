// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const LANGS = {
    no: {
        // Landing
        landing_title:    'Gnists',
        landing_sub:      'Et verktøy for å fostre aktiv læring.',
        landing_theory1:  'Gnists er en personlig tavle hvor du samler det som opptar deg — spørsmål, interesser, nøkkelord og mål.',
        landing_theory2:  '',
        landing_register: 'Registrer deg',
        landing_login:    'Logg inn',
        landing_privacy:  'Dataen din lagres sikkert og er kun synlig for deg.',

        // Auth
        login_title:      'Logg inn',
        login_sub:        'Velkommen tilbake til Gnists ✦.',
        login_user:       'Brukernavn',
        login_pass:       'Passord',
        login_user_ph:    'Ditt brukernavn',
        login_pass_ph:    'Ditt passord',
        login_btn:        'Logg inn',
        login_switch:     'Ny bruker?',
        login_switch_lnk: 'Registrer deg her',
        back:             '← Tilbake',

        reg_title:        'Registrer deg',
        reg_sub:          'Opprett en konto for å begynne.',
        reg_user:         'Brukernavn',
        reg_pass:         'Passord',
        reg_user_ph:      'Velg et brukernavn',
        reg_pass_ph:      'Velg et passord',
        reg_btn:          'Opprett konto',
        reg_switch:       'Har du konto?',
        reg_switch_lnk:   'Logg inn her',

        err_fill:         'Fyll inn brukernavn og passord.',

        // Topbar
        btn_light:        '☀️ Lys',
        btn_dark:         '🌙 Mørk',
        btn_logout:       'Logg ut',

        // Sections
        sec_interests:    '💡 Interesser',
        sec_questions:    '❓ Spørsmål',
        sec_learning:     '🎯 Hva burde eksistere?',
        sec_keywords:     '🔑 Nøkkelord',
        sec_tasks:        '✅ Oppgaver',

        // Inputs
        ph_interests:     'Legg til interesse…',
        ph_questions:     'Legg til spørsmål…',
        ph_learning:      'Legg til læringsmål…',
        ph_keywords:      'Legg til nøkkelord…',
        ph_tasks:         'Legg til oppgave…',
        ph_subtask:       'Legg til deloppgave…',
        ph_meaning:       'Legg til forklaring…',

        // Buttons
        btn_clear:        '⟲ Tøm',
        btn_reset_all:    'Tøm alt',

        // Bills panel
        sec_bills:        '💸 Kommende regninger',
        ph_bills:         'Regningsmottaker…',
        ph_bill_amount:   'Beløp (valgfritt)',
        btn_add_bill:     'Legg til',
        empty_bills:      'Ingen regninger ennå…',
        empty_list:       'Ingenting ennå…',
        empty_keywords:   'Ingen nøkkelord ennå…',
        empty_tasks:      'Ingen oppgaver ennå…',
        empty_subtasks:   'Ingen deloppgaver ennå',
    },

    en: {
        // Landing
        landing_title:    'Gnists',
        landing_sub:      'A tool for active learning.',
        landing_theory1:  "Gnists is a personal board where you collect what's on your mind — questions, interests, keywords and goals.",
        landing_theory2:  'The theory is that you distribute your energy so you go further without getting stuck on something less important too early, and that you continuously renew.',
        landing_register: 'Create account',
        landing_login:    'Log in',
        landing_privacy:  'Your data is stored securely and only visible to you.',

        // Auth
        login_title:      'Log in',
        login_sub:        'Welcome back to Gnists ✦.',
        login_user:       'Username',
        login_pass:       'Password',
        login_user_ph:    'Your username',
        login_pass_ph:    'Your password',
        login_btn:        'Log in',
        login_switch:     'New user?',
        login_switch_lnk: 'Register here',
        back:             '← Back',

        reg_title:        'Create account',
        reg_sub:          'Sign up to get started.',
        reg_user:         'Username',
        reg_pass:         'Password',
        reg_user_ph:      'Choose a username',
        reg_pass_ph:      'Choose a password',
        reg_btn:          'Create account',
        reg_switch:       'Already have an account?',
        reg_switch_lnk:   'Log in here',

        err_fill:         'Please enter username and password.',

        // Topbar
        btn_light:        '☀️ Light',
        btn_dark:         '🌙 Dark',
        btn_logout:       'Log out',

        // Sections
        sec_interests:    '💡 Interests',
        sec_questions:    '❓ Questions',
        sec_learning:     '🎯 What should exist?',
        sec_keywords:     '🔑 Keywords',
        sec_tasks:        '✅ Tasks',

        // Inputs
        ph_interests:     'Add an interest…',
        ph_questions:     'Add a question…',
        ph_learning:      'Add a learning goal…',
        ph_keywords:      'Add a keyword…',
        ph_tasks:         'Add a task…',
        ph_subtask:       'Add subtask…',
        ph_meaning:       'Add a definition…',

        // Buttons
        btn_clear:        '⟲ Clear',
        btn_reset_all:    'Clear everything',

        // Bills panel
        sec_bills:        '💸 Upcoming bills',
        ph_bills:         'Bill name…',
        ph_bill_amount:   'Amount (optional)',
        btn_add_bill:     'Add',
        empty_bills:      'No bills yet…',
        empty_list:       'Nothing here yet…',
        empty_keywords:   'No keywords yet…',
        empty_tasks:      'No tasks yet…',
        empty_subtasks:   'No subtasks yet',
    }
};

// Active language — persisted in localStorage
let lang = localStorage.getItem('mb_lang') || 'no';

function t(key) {
    return LANGS[lang][key] ?? LANGS['no'][key] ?? key;
}

function setLang(newLang) {
    lang = newLang;
    localStorage.setItem('mb_lang', newLang);
    updateView();
}
