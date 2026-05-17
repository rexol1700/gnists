// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const LANGS = {
    no: {
        // Landing
        landing_eyebrow:  'Velkommen',
        landing_title:    'Din alt-i-ett-<em>tavle</em>.',
        landing_sub:      'Et personlig lerret for spørsmål, idéer, ærender og planer. Dra inn paneler, flytt dem rundt — la den vokse med deg.',
        landing_register: 'Lag tavlen din',
        landing_login:    'Jeg har en allerede',
        landing_privacy:  'Gratis, ingen kortinfo. Dataen din blir på kontoen din — vi selger ikke, trener ikke på, og titter ikke.',
        landing_quote:    '"Fang gnisten før den forsvinner. Sorter senere — eller aldri. <em>Begge deler er greit.</em>"',
        landing_footnote: 'Din tavle · Lokal-først · Bare din',

        // Auth
        login_eyebrow:    'Logg inn',
        login_title:      'Fortsett der<br/>du <em>slapp.</em>',
        login_user:       'Brukernavn',
        login_pass:       'Passord',
        login_user_ph:    'ditt brukernavn',
        login_pass_ph:    '••••••••',
        login_btn:        'Åpne tavlen',
        login_quote:      '"Velkommen <em>tilbake.</em> Tavlen er akkurat slik du forlot den."',
        login_links:      'Ny her? <a onclick="changePage(\'register\')">Lag en konto.</a>',
        back:             '← Tilbake',

        reg_eyebrow:      'Lag konto',
        reg_title:        'Start<br/>din <em>tavle.</em>',
        reg_sub:          'Seksti sekunder. Ingen e-post nødvendig.',
        reg_user:         'Brukernavn',
        reg_pass:         'Passord',
        reg_user_ph:      'velg hva du vil',
        reg_pass_ph:      'noe du husker',
        reg_btn:          'Fortsett',
        reg_quote:        '"Først et navn. Så alt det <em>andre.</em>"',
        reg_links:        'Har du allerede en? <a onclick="changePage(\'login\')">Logg inn.</a>',

        err_fill:         'Fyll inn brukernavn og passord.',

        // Onboarding
        ob_skip:          'Hopp over',
        ob_step:          'Steg',
        ob_of:            'av',
        ob_back:          '← Tilbake',
        ob_continue:      'Fortsett',

        ob1_eyebrow:      'Velkommen til MyBoard',
        ob1_title:        'Hei, {name}.<br/>Hva har du<br/>på <em>hjertet</em>?',
        ob1_lede:         'MyBoard er et personlig lerret du dyrker over tid. Vi setter opp ditt på fire små steg — omtrent ett minutt.',
        ob1_step1:        'Bli kjent',
        ob1_step2:        'Velg tavler',
        ob1_step3:        'Første gnist',
        ob1_step4:        'Klar',
        ob1_btn:          'La oss begynne',

        ob2_title:        'Velg noen <em>tavler</em>.',
        ob2_lede:         'Ikke tenk for mye — du kan legge til eller fjerne disse senere. De fleste starter med tre eller fire.',
        ob2_helper:       '{n} valgt · trykk for å veksle',
        ob2_btn:          'Ser bra ut',

        ob3_eyebrow:      'Steg tre · Den første',
        ob3_title:        'Slipp inn <em>noe</em>.',
        ob3_lede:         'Et spørsmål du går rundt med. En ting å huske. En bok å lese. Tavlen liker løse tråder.',
        ob3_target:       'Legg til i',
        ob3_hint:         '⌘ ↵ for å lagre',
        ob3_btn:          'Slipp den inn',
        ob3_skip_btn:     'Hopp over for nå',
        ob3_or:           'Eller prøv en →',
        ob3_sug1:         'Lære norsk strikkemønster',
        ob3_sug2:         'Ringe mor tilbake',
        ob3_sug3:         'Lære rust',

        ob4_eyebrow:      'Du er klar',
        ob4_title:        'Din <em>tavle</em>,<br/>klar når du er.',
        ob4_lede:         'Du kan dra paneler rundt, endre størrelsen, eller skjule de du ikke bruker. Det finnes ingen feil form.',
        ob4_btn:          'Åpne tavlen min',
        ob4_count_one:    '1 element',
        ob4_count_many:   '{n} elementer',
        ob4_count_empty:  'tom',

        // Topbar
        btn_light:        '☾',
        btn_dark:         '☀',
        btn_logout:       'Logg ut',
        btn_user:         '{user}',

        // Subbar (greeting + summary)
        sub_morning:      'morgen',
        sub_afternoon:    'ettermiddag',
        sub_evening:      'kveld',
        sub_count_one:    '1 element på tavlen',
        sub_count_many:   '{n} elementer på tavlen',
        sub_count_empty:  'tavlen er tom',
        // Norwegian weekdays (Sunday=0)
        wd_0:             'Søndag',
        wd_1:             'Mandag',
        wd_2:             'Tirsdag',
        wd_3:             'Onsdag',
        wd_4:             'Torsdag',
        wd_5:             'Fredag',
        wd_6:             'Lørdag',
        // Norwegian short month names (Jan=0)
        mo_0:  'jan', mo_1:  'feb', mo_2:  'mar', mo_3:  'apr',
        mo_4:  'mai', mo_5:  'jun', mo_6:  'jul', mo_7:  'aug',
        mo_8:  'sep', mo_9:  'okt', mo_10: 'nov', mo_11: 'des',

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
        btn_clear:        '↺',
        btn_reset_all:    'Tøm alt',
        btn_add_panel:    '+ Legg til tavle',
        btn_add_panel_short: 'Legg til',
        btn_pick_panel:   'Velg tavle',
        btn_add_board:    '+ Legg til tavle',
        ap_more:          '{n} TIL TILGJENGELIG',
        ap_picker_title:  'Velg en tavle',

        // Bills
        sec_bills:        'Regninger',
        ph_bills:         'Regningsmottaker…',
        ph_bill_amount:   'Beløp',
        btn_add_bill:     'Legg til',
        empty_bills:      'Ingen regninger ennå…',

        // Times
        sec_times:        'Tider',
        ph_times:         'Beskrivelse (f.eks. US market åpner)…',
        ph_times_time:    'Tid (f.eks. 14:30)',
        ph_times_rec:     'Gjentakelse (f.eks. ukentlig)',
        btn_add_time:     'Legg til',
        empty_times:      'Ingen tider ennå…',

        // Motivations
        sec_motivations:  'Motivasjon',
        ph_motivations:   'Legg til motivasjon…',
        empty_motivations:'Ingen motivasjoner ennå…',

        // Selling
        sec_selling:      'Selge',
        ph_selling:       'Hva selger du?',
        ph_selling_price: 'Pris',
        btn_add_selling:  'Legg til',
        sell_listed:      'Ute for salg',
        sell_pending:     'Interessert kjøper',
        sell_sold:        'Solgt',
        empty_selling:    'Ingenting til salgs ennå…',

        // Shopping
        sec_shopping:     'Handleliste',
        ph_shopping:      'Legg til vare…',
        empty_shopping:   'Handlelisten er tom…',
        shopping_default: 'Handleliste',

        // Meals
        sec_meals:        'Måltider & Oppskrifter',
        ph_meals:         'Legg til måltid…',
        empty_meals:      'Ingen måltider ennå…',
        tab_ingredients:  'Ingredienser',
        tab_instructions: 'Fremgangsmåte',
        ph_ingredient:    'Legg til ingrediens…',
        ph_instructions:  'Skriv fremgangsmåte her…',
        empty_ingredients:'Ingen ingredienser ennå…',

        // Notes
        sec_notes:        'Notater',
        ph_notes:         'Tittel på notat…',
        ph_note_body:     'Skriv notat her…',
        empty_notes:      'Ingen notater ennå…',

        // Reminders
        sec_reminders:    'Huskeliste',
        ph_reminders:     'Legg til påminnelse…',
        btn_add_reminder: 'Legg til',
        empty_reminders:  'Huskelisten er tom…',

        empty_list:       'Ingenting ennå…',
        empty_keywords:   'Ingen nøkkelord ennå…',
        empty_tasks:      'Ingen oppgaver ennå…',
        empty_subtasks:   'Ingen deloppgaver ennå',

        // AI
        ai_define:        'Forklar med AI',
        ai_answer:        'Svar med AI',

        // Panel descriptions (used in onboarding step 2)
        desc_questions:   'Ting du vil finne ut',
        desc_interests:   'Det som opptar deg',
        desc_learning:    'Hva burde finnes',
        desc_keywords:    'Ord du vil lære',
        desc_tasks:       'Ting å gjøre',
        desc_reminders:   'Ting å ikke glemme',
        desc_shopping:    'En liste, eller flere',
        desc_notes:       'Lengre tanker',
        desc_meals:       'Hva å lage denne uken',
        desc_bills:       'Hva som forfaller, og når',
        desc_times:       'Tilbakevendende øyeblikk',
        desc_selling:     'Annonser & status',
        desc_motivations: 'Hva som driver deg',

        // Paywall
        paywall_eyebrow:        'Lås opp tavlen',
        paywall_title:          'Få hele <em>tavlen</em>.',
        paywall_sub:            'Prøv hele MyBoard i 30 dager for en symbolsk sum. Hvis du liker det, fortsetter abonnementet automatisk.',
        paywall_first30:        'de første 30 dagene',
        paywall_then:           'deretter',
        paywall_per_month:      '/ måned',
        paywall_cancel:         'Si opp når som helst — ingen binding.',
        paywall_btn:            'Start',
        paywall_switch_currency:'Bytt til {cur}',
        paywall_quote:          '"Tavlen din, for prisen av en kaffe."',
        paywall_manage:         'Administrer abonnement',
        paywall_success_eyebrow:'Aktiverer',
        paywall_success_title:  'Et øyeblikk…',
        paywall_success_sub:    'Vi setter opp kontoen din. Det tar bare noen sekunder.',
    },

    en: {
        // Landing
        landing_eyebrow:  'Welcome',
        landing_title:    'Your everything-<em>board</em>.',
        landing_sub:      'A personal canvas for questions, ideas, errands and plans. Drag panels in, drag them around, let it grow with you.',
        landing_register: 'Create your board',
        landing_login:    'I already have one',
        landing_privacy:  "Free, no card required. Your data stays on your account — we don't sell it, train on it, or peek.",
        landing_quote:    '"Capture the spark before it disappears. Sort it later — or never. <em>Either is fine.</em>"',
        landing_footnote: 'Your board · Local-first · Yours alone',

        // Auth
        login_eyebrow:    'Sign in',
        login_title:      'Pick up<br/>where you <em>stopped.</em>',
        login_user:       'Username',
        login_pass:       'Password',
        login_user_ph:    'your username',
        login_pass_ph:    '••••••••',
        login_btn:        'Open my board',
        login_quote:      '"Welcome <em>back.</em> The board is exactly where you left it."',
        login_links:      'New here? <a onclick="changePage(\'register\')">Create an account.</a>',
        back:             '← Back',

        reg_eyebrow:      'Create account',
        reg_title:        'Start<br/>your <em>board.</em>',
        reg_sub:          'Sixty seconds. No email needed.',
        reg_user:         'Username',
        reg_pass:         'Password',
        reg_user_ph:      'pick anything',
        reg_pass_ph:      "something you'll remember",
        reg_btn:          'Continue',
        reg_quote:        '"First a name. Then everything <em>else.</em>"',
        reg_links:        'Already have one? <a onclick="changePage(\'login\')">Sign in.</a>',

        err_fill:         'Please enter username and password.',

        // Onboarding
        ob_skip:          'Skip setup',
        ob_step:          'Step',
        ob_of:            'of',
        ob_back:          '← Back',
        ob_continue:      'Continue',

        ob1_eyebrow:      'Welcome to MyBoard',
        ob1_title:        'Hi, {name}.<br/>What\'s on<br/>your <em>mind</em>?',
        ob1_lede:         "MyBoard is a personal canvas you grow over time. We'll set yours up in four small steps — about a minute.",
        ob1_step1:        'Get oriented',
        ob1_step2:        'Pick boards',
        ob1_step3:        'First spark',
        ob1_step4:        "You're set",
        ob1_btn:          "Let's begin",

        ob2_title:        'Pick a few <em>boards</em>.',
        ob2_lede:         "Don't overthink — you can add or remove any of these later. Most people start with three or four.",
        ob2_helper:       '{n} selected · tap to toggle',
        ob2_btn:          'Looks good',

        ob3_eyebrow:      'Step three · The first one',
        ob3_title:        'Drop in <em>something</em>.',
        ob3_lede:         "A question you're sitting with. A thing to remember. A book to read. The board likes loose ends.",
        ob3_target:       'Add to',
        ob3_hint:         '⌘ ↵ to save',
        ob3_btn:          'Drop it in',
        ob3_skip_btn:     'Skip for now',
        ob3_or:           'Or try one →',
        ob3_sug1:         'Read a book this month',
        ob3_sug2:         'Email Mom back',
        ob3_sug3:         'Learn rust',

        ob4_eyebrow:      "You're all set",
        ob4_title:        'Your <em>board</em>,<br/>ready when you are.',
        ob4_lede:         "You can drag panels around, resize them, or hide ones you don't use. There's no wrong shape.",
        ob4_btn:          'Open my board',
        ob4_count_one:    '1 item',
        ob4_count_many:   '{n} items',
        ob4_count_empty:  'empty',

        // Topbar
        btn_light:        '☾',
        btn_dark:         '☀',
        btn_logout:       'Sign out',
        btn_user:         '{user}',

        // Subbar
        sub_morning:      'morning',
        sub_afternoon:    'afternoon',
        sub_evening:      'evening',
        sub_count_one:    '1 item on the board',
        sub_count_many:   '{n} items on the board',
        sub_count_empty:  'board is empty',
        // English weekdays (Sunday=0)
        wd_0:             'Sunday',
        wd_1:             'Monday',
        wd_2:             'Tuesday',
        wd_3:             'Wednesday',
        wd_4:             'Thursday',
        wd_5:             'Friday',
        wd_6:             'Saturday',
        // English short month names (Jan=0)
        mo_0:  'Jan', mo_1:  'Feb', mo_2:  'Mar', mo_3:  'Apr',
        mo_4:  'May', mo_5:  'Jun', mo_6:  'Jul', mo_7:  'Aug',
        mo_8:  'Sep', mo_9:  'Oct', mo_10: 'Nov', mo_11: 'Dec',

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
        btn_clear:        '↺',
        btn_reset_all:    'Reset all',
        btn_add_panel:    '+ Add a board',
        btn_add_panel_short: 'Add',
        btn_pick_panel:   'Choose panel',
        btn_add_board:    '+ Add a board',
        ap_more:          '{n} MORE AVAILABLE',
        ap_picker_title:  'Pick a board',

        // Bills
        sec_bills:        'Bills',
        ph_bills:         'Bill name…',
        ph_bill_amount:   'Amount',
        btn_add_bill:     'Add',
        empty_bills:      'No bills yet…',

        // Times
        sec_times:        'Times',
        ph_times:         'Description (e.g. US market opens)…',
        ph_times_time:    'Time (e.g. 14:30)',
        ph_times_rec:     'Recurrence (e.g. weekly)',
        btn_add_time:     'Add',
        empty_times:      'No times noted yet…',

        // Motivations
        sec_motivations:  'Motivations',
        ph_motivations:   'Add a motivation…',
        empty_motivations:'No motivations yet…',

        // Selling
        sec_selling:      'Selling',
        ph_selling:       'What are you selling?',
        ph_selling_price: 'Price',
        btn_add_selling:  'Add',
        sell_listed:      'Listed',
        sell_pending:     'Interested buyer',
        sell_sold:        'Sold',
        empty_selling:    'Nothing for sale yet…',

        // Shopping
        sec_shopping:     'Shopping',
        ph_shopping:      'Add item…',
        empty_shopping:   'Shopping list is empty…',
        shopping_default: 'Groceries',

        // Meals
        sec_meals:        'Meals & Recipes',
        ph_meals:         'Add a meal…',
        empty_meals:      'No meals yet…',
        tab_ingredients:  'Ingredients',
        tab_instructions: 'Instructions',
        ph_ingredient:    'Add ingredient…',
        ph_instructions:  'Write cooking instructions here…',
        empty_ingredients:'No ingredients yet…',

        // Notes
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

        // AI
        ai_define:        'Define with AI',
        ai_answer:        'Answer with AI',

        // Panel descriptions (onboarding step 2)
        desc_questions:   'Things you want to find out',
        desc_interests:   "Sparks worth keeping",
        desc_learning:    'What should exist',
        desc_keywords:    'Words you want to learn',
        desc_tasks:       'Things to actually do',
        desc_reminders:   'Things not to forget',
        desc_shopping:    'A list, or a few',
        desc_notes:       'Longer thoughts',
        desc_meals:       'What to cook this week',
        desc_bills:       'What is due, when',
        desc_times:       'Recurring moments',
        desc_selling:     'Listings & status',
        desc_motivations: 'What drives you',

        // Paywall
        paywall_eyebrow:        'Unlock the board',
        paywall_title:          'Get the full <em>board</em>.',
        paywall_sub:            'Try all of MyBoard for 30 days for a token price. If you like it, your subscription continues automatically.',
        paywall_first30:        'for the first 30 days',
        paywall_then:           'then',
        paywall_per_month:      '/ month',
        paywall_cancel:         'Cancel any time — no commitment.',
        paywall_btn:            'Start',
        paywall_switch_currency:'Switch to {cur}',
        paywall_quote:          '"Your board, for the price of a coffee."',
        paywall_manage:         'Manage subscription',
        paywall_success_eyebrow:'Activating',
        paywall_success_title:  'One moment…',
        paywall_success_sub:    "We're setting up your account. This only takes a few seconds.",
    }
};

// Active language — persisted in localStorage
let lang = localStorage.getItem('mb_lang') || 'en';

function t(key, vars) {
    let str = LANGS[lang][key] ?? LANGS['en'][key] ?? key;
    if (vars) {
        for (const k in vars) {
            str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
        }
    }
    return str;
}

function setLang(newLang) {
    lang = newLang;
    localStorage.setItem('mb_lang', newLang);
    if (typeof updateView === 'function') updateView();
}
