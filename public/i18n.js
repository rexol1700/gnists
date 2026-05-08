// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const LANGS = {
    no: {
        // Landing
        landing_eyebrow:  'Velkommen',
        landing_h1_pre:   'Din alt-i-ett-',
        landing_h1_em:    'tavle',
        landing_h1_post:  '.',
        landing_sub:      'Et personlig lerret for spørsmål, ideer, ærender og planer. Dra inn paneler, flytt dem rundt, la den vokse med deg.',
        landing_register: 'Lag tavlen din',
        landing_login:    'Jeg har allerede en',
        landing_privacy:  'Gratis, uten kort. Dataen din er din alene — vi selger den ikke, trener ikke på den, og kikker ikke.',
        landing_quote:    'Fang gnisten før den forsvinner. Sorter den senere — eller aldri.',
        landing_quote_em: 'Begge er greit.',
        landing_footnote: 'Din tavle · Lokal-først · Bare din',

        // Auth
        login_eyebrow:    'Logg inn',
        login_h1_pre:     'Fortsett der du ',
        login_h1_em:      'slapp',
        login_h1_post:    '.',
        login_quote:      'Velkommen',
        login_quote_em:   'tilbake. Tavlen er akkurat der du forlot den.',
        login_user:       'Brukernavn',
        login_pass:       'Passord',
        login_user_ph:    'ditt brukernavn',
        login_pass_ph:    '••••••••',
        login_btn:        'Åpne tavlen min',
        login_switch:     'Ny her?',
        login_switch_lnk: 'Lag en konto',
        back:             '← Tilbake',

        reg_eyebrow:      'Lag konto',
        reg_h1_pre:       'Start din ',
        reg_h1_em:        'tavle',
        reg_h1_post:      '.',
        reg_sub:          'Seksti sekunder. Ingen e-post nødvendig.',
        reg_quote:        'Først et navn. Så alt',
        reg_quote_em:     'annet.',
        reg_user:         'Brukernavn',
        reg_pass:         'Passord',
        reg_user_ph:      'velg hva du vil',
        reg_pass_ph:      'noe du husker',
        reg_btn:          'Fortsett',
        reg_switch:       'Har du allerede konto?',
        reg_switch_lnk:   'Logg inn',

        err_fill:         'Fyll inn brukernavn og passord.',

        // Home
        home_greeting_pre:  'Din ',
        home_greeting_em:   'tavle',
        home_greeting_post: '.',
        home_items_on_board:'ting på tavlen',

        // Topbar
        btn_light:        'Mørk',
        btn_dark:         'Lys',
        btn_theme:        'Tema',
        btn_logout:       'Logg ut',

        // Sections
        sec_interests:    'Interesser',
        sec_questions:    'Spørsmål',
        sec_learning:     'Hva burde eksistere?',
        sec_keywords:     'Nøkkelord',
        sec_tasks:        'Oppgaver',

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
        sec_bills:        'Kommende regninger',
        ph_bills:         'Regningsmottaker…',
        ph_bill_amount:   'Beløp (valgfritt)',
        btn_add_bill:     'Legg til',
        empty_bills:      'Ingen regninger ennå…',

        // Times panel
        sec_times:        'Tider',
        ph_times:         'Beskrivelse (f.eks. US market åpner)…',
        ph_times_time:    'Tid (f.eks. 14:30 / tirsdag 15:00)',
        ph_times_rec:     'Gjentakelse (f.eks. ukentlig)',
        btn_add_time:     'Legg til',
        empty_times:      'Ingen tider ennå…',

        // Motivations panel
        sec_motivations:  'Motivasjon',
        ph_motivations:   'Legg til motivasjon…',
        empty_motivations:'Ingen motivasjoner ennå…',

        // Selling panel
        sec_selling:      'Selge',
        ph_selling:       'Hva selger du?',
        ph_selling_price: 'Pris (valgfritt)',
        btn_add_selling:  'Legg til',
        sell_listed:      'Ute for salg',
        sell_pending:     'Interessert kjøper',
        sell_sold:        'Solgt',
        empty_selling:    'Ingenting til salgs ennå…',

        // Shopping panel (multi-list)
        sec_shopping:     'Handleliste',
        ph_shopping:      'Legg til vare…',
        empty_shopping:   'Handlelisten er tom…',

        // Meals panel
        sec_meals:        'Måltider & Oppskrifter',
        ph_meals:         'Legg til måltid…',
        empty_meals:      'Ingen måltider ennå…',
        tab_ingredients:  'Ingredienser',
        tab_instructions: 'Fremgangsmåte',
        ph_ingredient:    'Legg til ingrediens…',
        ph_instructions:  'Skriv fremgangsmåte her…',
        empty_ingredients:'Ingen ingredienser ennå…',

        // Notes panel
        sec_notes:        'Notater',
        ph_notes:         'Tittel på notat…',
        ph_note_body:     'Skriv notat her…',
        empty_notes:      'Ingen notater ennå…',

        // Reminders / Huskeliste
        sec_reminders:    'Huskeliste',
        ph_reminders:     'Legg til påminnelse…',
        btn_add_reminder: 'Legg til',
        empty_reminders:  'Huskelisten er tom…',

        empty_list:       'Ingenting ennå…',
        empty_keywords:   'Ingen nøkkelord ennå…',
        empty_tasks:      'Ingen oppgaver ennå…',
        empty_subtasks:   'Ingen deloppgaver ennå',
    },

    en: {
        // Landing
        landing_eyebrow:  'Welcome',
        landing_h1_pre:   'Your everything-',
        landing_h1_em:    'board',
        landing_h1_post:  '.',
        landing_sub:      'A personal canvas for questions, ideas, errands and plans. Drag panels in, drag them around, let it grow with you.',
        landing_register: 'Create your board',
        landing_login:    'I already have one',
        landing_privacy:  "Free, no card required. Your data stays on your account — we don't sell it, train on it, or peek.",
        landing_quote:    'Capture the spark before it disappears. Sort it later — or never.',
        landing_quote_em: 'Either is fine.',
        landing_footnote: 'Your board · Local-first · Yours alone',

        // Auth
        login_eyebrow:    'Sign in',
        login_h1_pre:     'Pick up where you ',
        login_h1_em:      'stopped',
        login_h1_post:    '.',
        login_quote:      'Welcome',
        login_quote_em:   'back. The board is exactly where you left it.',
        login_user:       'Username',
        login_pass:       'Password',
        login_user_ph:    'your username',
        login_pass_ph:    '••••••••',
        login_btn:        'Open my board',
        login_switch:     'New here?',
        login_switch_lnk: 'Create an account',
        back:             '← Back',

        reg_eyebrow:      'Create account',
        reg_h1_pre:       'Start your ',
        reg_h1_em:        'board',
        reg_h1_post:      '.',
        reg_sub:          'Sixty seconds. No email needed.',
        reg_quote:        'First a name. Then everything',
        reg_quote_em:     'else.',
        reg_user:         'Username',
        reg_pass:         'Password',
        reg_user_ph:      'pick anything',
        reg_pass_ph:      "something you'll remember",
        reg_btn:          'Continue',
        reg_switch:       'Already have one?',
        reg_switch_lnk:   'Sign in',

        err_fill:         'Please enter username and password.',

        // Home
        home_greeting_pre:  'Your ',
        home_greeting_em:   'board',
        home_greeting_post: '.',
        home_items_on_board:'items on the board',

        // Topbar
        btn_light:        'Dark',
        btn_dark:         'Light',
        btn_theme:        'Theme',
        btn_logout:       'Sign out',

        // Sections
        sec_interests:    'Interests',
        sec_questions:    'Questions',
        sec_learning:     'What should exist?',
        sec_keywords:     'Keywords',
        sec_tasks:        'Tasks',

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
        btn_reset_all:    'Reset all',

        // Bills panel
        sec_bills:        'Upcoming bills',
        ph_bills:         'Bill name…',
        ph_bill_amount:   'Amount (optional)',
        btn_add_bill:     'Add',
        empty_bills:      'No bills yet…',

        // Times panel
        sec_times:        'Times',
        ph_times:         'Description (e.g. US market opens)…',
        ph_times_time:    'Time (e.g. 14:30 / every Tuesday 15:00)',
        ph_times_rec:     'Recurrence (e.g. weekly)',
        btn_add_time:     'Add',
        empty_times:      'No times noted yet…',

        // Motivations panel
        sec_motivations:  'Motivations',
        ph_motivations:   'Add a motivation…',
        empty_motivations:'No motivations yet…',

        // Selling panel
        sec_selling:      'Selling',
        ph_selling:       'What are you selling?',
        ph_selling_price: 'Price (optional)',
        btn_add_selling:  'Add',
        sell_listed:      'Listed',
        sell_pending:     'Interested buyer',
        sell_sold:        'Sold',
        empty_selling:    'Nothing for sale yet…',

        // Shopping panel (multi-list)
        sec_shopping:     'Shopping list',
        ph_shopping:      'Add item…',
        empty_shopping:   'Shopping list is empty…',

        // Meals panel
        sec_meals:        'Meals & Recipes',
        ph_meals:         'Add a meal…',
        empty_meals:      'No meals yet…',
        tab_ingredients:  'Ingredients',
        tab_instructions: 'Instructions',
        ph_ingredient:    'Add ingredient…',
        ph_instructions:  'Write cooking instructions here…',
        empty_ingredients:'No ingredients yet…',

        // Notes panel
        sec_notes:        'Notes',
        ph_notes:         'Note title…',
        ph_note_body:     'Write your note here…',
        empty_notes:      'No notes yet…',

        // Reminders
        sec_reminders:    'Reminders',
        ph_reminders:     'Add a reminder…',
        btn_add_reminder: 'Add',
        empty_reminders:  'No reminders yet…',

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
