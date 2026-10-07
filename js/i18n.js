/* UI translations (English / Czech). Static markup uses data-i18n, data-i18n-aria and data-i18n-html. */
'use strict';

const I18N = (() => {
  const STRINGS = {
    en: {
      'nav.learn': 'Learn', 'nav.cloud': 'Cloud', 'nav.blitz': 'Blitz', 'nav.pairs': 'Pairs', 'nav.guess': 'Language?', 'nav.articles': 'Articles',
      'app.tagline': 'playful language trainer', 'app.settings': 'Settings',

      'c.start': 'Start', 'c.playAgain': 'Play again', 'c.again': 'Again!', 'c.gameOver': 'Game over',
      'c.score': 'score', 'c.correct': 'correct', 'c.wrong': 'wrong', 'c.accuracy': 'accuracy', 'c.best': 'best', 'c.newBest': 'new best!',
      'c.time': 'time', 'c.mistakes': 'mistakes', 'hud.score': 'Score', 'hud.streak': 'Streak', 'hud.time': 'Time',
      'hud.mistakes': 'Mistakes', 'hud.boards': 'Boards', 'hud.question': 'Question', 'c.strikesOf': '{used} of {max} strikes',
      'c.keys14': 'Keys 1–4 work too.',

      'learn.noWords': 'No words match your settings.', 'learn.prev': 'Previous card', 'learn.next': 'Next card',
      'learn.pause': 'Pause', 'learn.resume': 'Resume', 'learn.swipe': 'Swipe or use ← → for the next card · space pauses',

      'cloud.title': 'Word Cloud', 'cloud.intro': 'A word sits in the middle. Somewhere in the cloud floats its translation. Tap it!',
      'cloud.rulesTimed': '{secs}s per word. A wrong tap or a timeout is a strike. {strikes} strikes and the game is over.',
      'cloud.rules': 'A wrong tap is a strike. {strikes} strikes and the game is over.',
      'cloud.find': 'find the translation', 'cloud.notQuite': 'not quite…', 'cloud.timesUp': 'time’s up!', 'cloud.review': 'Worth another look',

      'blitz.title': 'Blitz', 'blitz.intro': '{secs} seconds on the clock. Pick the right translation as fast as you can.',
      'blitz.rules': 'Right answer: +1s. Wrong answer: −3s.', 'blitz.timeUp': 'Time!', 'blitz.inLang': 'in {lang}?',

      'pairs.title': 'Pairs', 'pairs.intro': 'Match each word on the left with its translation on the right.',
      'pairs.rules': '{n} pairs per board. The clock is running, and every mistake adds 2 seconds.',
      'pairs.cleared': 'Board cleared!', 'pairs.next': 'Next board', 'pairs.scoreLabel': 'score (+2s per miss)',
      'pairs.notEnough': 'Not enough words for these settings.',

      'guess.title': 'Which language?', 'guess.intro': 'A word or phrase appears. Which of {n} languages is it?',
      'guess.rules': '{n} questions.', 'guess.review': 'Tricky ones',

      'art.title': 'Articles', 'art.intro': 'Pick the right article for each noun.', 'art.rules': '{strikes} strikes and you’re out.',
      'art.review': 'Remember these', 'art.none': 'No nouns with articles available.',

      'm.didYouKnow': 'Did you know?', 'm.aria': 'Lingu the penguin. Tap him for a fun fact or a saying.',

      's.title': 'Settings', 's.close': 'Close', 's.ui': 'Interface', 's.uiLang': 'App language', 's.theme': 'Theme',
      's.themeAuto': 'Automatic', 's.themeLight': 'Light', 's.themeDark': 'Dark',
      's.langs': 'Languages to practise', 's.principal': 'Main (question) language', 's.random': 'Random',
      's.vocab': 'Vocabulary', 's.articles': 'Show articles with nouns (der Apfel, la pomme…)', 's.emoji': 'Show emoji hints',
      's.learn': 'Learn mode', 's.interval': 'Next card after (seconds)', 's.from': 'from', 's.to': 'to',
      's.gradual': 'Reveal translations one by one',
      's.games': 'Games', 's.timeLimit': 'Cloud: time per word', 's.off': 'off', 's.options': 'Cloud: words in the cloud',
      's.strikes': 'Strikes until game over', 's.tags': 'Cloud: show language tags', 's.sameCat': 'Cloud: distractors from the same category',
      's.blitz': 'Blitz: length', 's.pairs': 'Pairs: pairs per board', 's.guessN': 'Which language?: questions',
      's.guessAll': 'Which language?: use all languages, not only mine',
      's.lingu': 'Lingu', 's.mascot': 'Show Lingu the penguin',
      's.art': 'Backgrounds', 's.strength': 'Art intensity',
      's.data': 'Vocabulary file', 's.import': 'Import JSON…', 's.export': 'Download JSON', 's.restore': 'Use built-in',
      's.entries': '{n} entries · {l} languages · {src}', 's.custom': 'custom file', 's.builtin': 'built-in',
      's.reset': 'Reset defaults', 's.cancel': 'Cancel', 's.save': 'Save',
      's.errLangs': 'Pick at least two languages.', 's.errCats': 'Pick at least one vocabulary category.', 's.errStyles': 'Pick at least one background style.',
      's.errFile': 'Could not use that file: {msg}',

      'load.title': 'Lingu needs its vocabulary',
      'load.fileHint': 'Start a tiny local web server in this folder (see README), or pick data/vocabulary.json below. Lingu will remember it.',
      'load.pick': 'Choose vocabulary.json',
    },
    cs: {
      'nav.learn': 'Učení', 'nav.cloud': 'Oblak', 'nav.blitz': 'Blesk', 'nav.pairs': 'Dvojice', 'nav.guess': 'Jazyk?', 'nav.articles': 'Členy',
      'app.tagline': 'hravý trenér jazyků', 'app.settings': 'Nastavení',

      'c.start': 'Start', 'c.playAgain': 'Hrát znovu', 'c.again': 'Ještě jednou!', 'c.gameOver': 'Konec hry',
      'c.score': 'body', 'c.correct': 'správně', 'c.wrong': 'špatně', 'c.accuracy': 'přesnost', 'c.best': 'rekord', 'c.newBest': 'nový rekord!',
      'c.time': 'čas', 'c.mistakes': 'chyby', 'hud.score': 'Body', 'hud.streak': 'Série', 'hud.time': 'Čas',
      'hud.mistakes': 'Chyby', 'hud.boards': 'Kola', 'hud.question': 'Otázka', 'c.strikesOf': '{used} z {max} chyb',
      'c.keys14': 'Fungují i klávesy 1–4.',

      'learn.noWords': 'Nastavení neodpovídají žádná slova.', 'learn.prev': 'Předchozí karta', 'learn.next': 'Další karta',
      'learn.pause': 'Pozastavit', 'learn.resume': 'Pokračovat', 'learn.swipe': 'Přejeď prstem nebo použij ← → · mezerník pozastaví',

      'cloud.title': 'Slovní oblak', 'cloud.intro': 'Uprostřed je slovo. Někde v oblaku se vznáší jeho překlad. Klepni na něj!',
      'cloud.rulesTimed': 'Na každé slovo máš {secs} s. Špatná odpověď nebo vypršený čas je chyba. Po {strikes} chybách hra končí.',
      'cloud.rules': 'Špatná odpověď je chyba. Po {strikes} chybách hra končí.',
      'cloud.find': 'najdi překlad', 'cloud.notQuite': 'tohle ne…', 'cloud.timesUp': 'čas vypršel!', 'cloud.review': 'Stojí za zopakování',

      'blitz.title': 'Blesk', 'blitz.intro': 'Máš {secs} sekund. Vybírej správný překlad co nejrychleji.',
      'blitz.rules': 'Správně: +1 s. Špatně: −3 s.', 'blitz.timeUp': 'Čas!', 'blitz.inLang': '{lang}?',

      'pairs.title': 'Dvojice', 'pairs.intro': 'Spoj každé slovo vlevo s jeho překladem vpravo.',
      'pairs.rules': '{n} dvojic v každém kole. Čas běží a každá chyba přidá 2 sekundy.',
      'pairs.cleared': 'Kolo hotové!', 'pairs.next': 'Další kolo', 'pairs.scoreLabel': 'výsledek (+2 s za chybu)',
      'pairs.notEnough': 'Pro toto nastavení není dost slov.',

      'guess.title': 'Který jazyk?', 'guess.intro': 'Objeví se slovo nebo fráze. Který z {n} jazyků to je?',
      'guess.rules': '{n} otázek.', 'guess.review': 'Záludné kousky',

      'art.title': 'Členy', 'art.intro': 'Vyber správný člen ke každému podstatnému jménu.', 'art.rules': 'Po {strikes} chybách končíš.',
      'art.review': 'Zapamatuj si', 'art.none': 'Nejsou k dispozici žádná podstatná jména se členy.',

      'm.didYouKnow': 'Víš, že…?', 'm.aria': 'Tučňák Lingu. Klepni na něj a řekne ti zajímavost nebo moudro.',

      's.title': 'Nastavení', 's.close': 'Zavřít', 's.ui': 'Rozhraní', 's.uiLang': 'Jazyk aplikace', 's.theme': 'Vzhled',
      's.themeAuto': 'Automaticky', 's.themeLight': 'Světlý', 's.themeDark': 'Tmavý',
      's.langs': 'Jazyky k procvičování', 's.principal': 'Hlavní jazyk (otázky)', 's.random': 'Náhodně',
      's.vocab': 'Slovní zásoba', 's.articles': 'Zobrazovat členy u podstatných jmen (der Apfel, la pomme…)', 's.emoji': 'Zobrazovat emoji nápovědy',
      's.learn': 'Režim učení', 's.interval': 'Další karta po (sekundách)', 's.from': 'od', 's.to': 'do',
      's.gradual': 'Odkrývat překlady postupně',
      's.games': 'Hry', 's.timeLimit': 'Oblak: čas na slovo', 's.off': 'vyp.', 's.options': 'Oblak: počet slov',
      's.strikes': 'Počet chyb do konce hry', 's.tags': 'Oblak: zobrazovat jazykové štítky', 's.sameCat': 'Oblak: matoucí slova ze stejné kategorie',
      's.blitz': 'Blesk: délka', 's.pairs': 'Dvojice: počet dvojic', 's.guessN': 'Který jazyk?: počet otázek',
      's.guessAll': 'Který jazyk?: použít všechny jazyky, nejen moje',
      's.lingu': 'Lingu', 's.mascot': 'Zobrazovat tučňáka Lingu',
      's.art': 'Pozadí', 's.strength': 'Výraznost grafiky',
      's.data': 'Soubor se slovní zásobou', 's.import': 'Načíst JSON…', 's.export': 'Stáhnout JSON', 's.restore': 'Použít vestavěný',
      's.entries': '{n} položek · {l} jazyků · {src}', 's.custom': 'vlastní soubor', 's.builtin': 'vestavěný',
      's.reset': 'Výchozí nastavení', 's.cancel': 'Zrušit', 's.save': 'Uložit',
      's.errLangs': 'Vyber alespoň dva jazyky.', 's.errCats': 'Vyber alespoň jednu kategorii.', 's.errStyles': 'Vyber alespoň jeden styl pozadí.',
      's.errFile': 'Soubor nelze použít: {msg}',

      'load.title': 'Lingu potřebuje svůj slovník',
      'load.fileHint': 'Spusť v této složce malý webový server (viz README), nebo níže vyber soubor data/vocabulary.json. Lingu si ho zapamatuje.',
      'load.pick': 'Vybrat vocabulary.json',
    },
  };

  const UI_LANGS = { en: 'English', cs: 'Čeština' };
  let current = (navigator.language || 'en').toLowerCase().startsWith('cs') ? 'cs' : 'en';

  function t(key, vars) {
    let s = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  // Pick the UI-language variant of a {en, cs} object (or return a plain string as is).
  function pickText(obj) {
    if (obj == null || typeof obj !== 'object') return obj ?? '';
    return obj[current] ?? obj.en ?? Object.values(obj)[0] ?? '';
  }

  function apply(root = document) {
    document.documentElement.lang = current;
    root.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach(n => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); n.title = t(n.dataset.i18nAria); });
  }

  return {
    t, pickText, apply, UI_LANGS,
    get lang() { return current; },
    set lang(v) { if (STRINGS[v]) current = v; },
    detect: () => ((navigator.language || 'en').toLowerCase().startsWith('cs') ? 'cs' : 'en'),
  };
})();
const t = I18N.t;
