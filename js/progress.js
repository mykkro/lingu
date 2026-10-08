/* Stats, high-score tables and achievements. Everything lives in localStorage. */
'use strict';

const Progress = (() => {
  const KEY = 'lingu.progress.v1';
  const MAX_SCORES = 10;

  const blank = () => ({
    answers: 0, correct: 0, streak: 0, bestStreak: 0, cards: 0,
    perLang: {}, games: {}, scores: {}, days: [], achievements: {},
  });
  let P = Object.assign(blank(), App.store.get(KEY, {}));
  const save = () => App.store.set(KEY, P);
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- Achievements ---------- */
  // Each check receives the progress object and the latest event.
  const ACH = [
    { id: 'first',      icon: '🐣', check: p => p.correct >= 1 },
    { id: 'correct50',  icon: '🥉', check: p => p.correct >= 50 },
    { id: 'correct250', icon: '🥈', check: p => p.correct >= 250 },
    { id: 'correct1000', icon: '🥇', check: p => p.correct >= 1000 },
    { id: 'streak10',   icon: '🔥', check: p => p.bestStreak >= 10 },
    { id: 'streak25',   icon: '☄️', check: p => p.bestStreak >= 25 },
    { id: 'cards50',    icon: '🃏', check: p => p.cards >= 50 },
    { id: 'cards500',   icon: '📚', check: p => p.cards >= 500 },
    { id: 'poly5',      icon: '🌍', check: p => Object.values(p.perLang).filter(l => l.c > 0).length >= 5 },
    { id: 'poly10',     icon: '🗺️', check: p => Object.values(p.perLang).filter(l => l.c > 0).length >= 10 },
    { id: 'explorer',   icon: '🧭', check: p => ['cloud', 'blitz', 'pairs', 'guess', 'articles', 'gap', 'odd', 'builder', 'run'].every(g => p.games[g]) },
    { id: 'blitz20',    icon: '⚡', check: (p, e) => e && e.game === 'blitz' && e.score >= 20 },
    { id: 'pairsClean', icon: '🧩', check: (p, e) => e && e.game === 'pairs' && e.detail && e.detail.boards >= 1 && e.detail.mistakes === 0 },
    { id: 'cloud300',   icon: '☁️', check: (p, e) => e && e.game === 'cloud' && e.score >= 300 },
    { id: 'guessPerfect', icon: '🎯', check: (p, e) => e && e.game === 'guess' && e.detail && e.detail.total >= 5 && e.score === e.detail.total },
    { id: 'articles200', icon: '📝', check: (p, e) => e && e.game === 'articles' && e.score >= 200 },
    { id: 'gap200',     icon: '🕳️', check: (p, e) => e && e.game === 'gap' && e.score >= 200 },
    { id: 'days3',      icon: '📅', check: p => p.days.length >= 3 },
    { id: 'days7',      icon: '🏅', check: p => p.days.length >= 7 },
    { id: 'nightOwl',   icon: '🦉', check: () => new Date().getHours() >= 22 },
    { id: 'earlyBird',  icon: '🐦', check: () => new Date().getHours() < 7 },
    // New games
    { id: 'odd200',     icon: '🕵️', check: (p, e) => e && e.game === 'odd' && e.score >= 200 },
    { id: 'builder250', icon: '🧱', check: (p, e) => e && e.game === 'builder' && e.score >= 250 },
    { id: 'run300',     icon: '🐧', check: (p, e) => e && e.game === 'run' && e.score >= 300 },
    { id: 'run15',      icon: '🐟', check: (p, e) => e && e.game === 'run' && e.detail && e.detail.caught >= 15 },
    { id: 'timeBender', icon: '⏳', check: (p, e) => e && e.game === 'run' && e.detail && e.detail.slowUsed >= 3 },
    // Bigger milestones
    { id: 'correct2500', icon: '🏆', check: p => p.correct >= 2500 },
    { id: 'streak50',   icon: '🌋', check: p => p.bestStreak >= 50 },
    { id: 'cards1000',  icon: '🗃️', check: p => p.cards >= 1000 },
    { id: 'poly15',     icon: '🗼', check: p => Object.values(p.perLang).filter(l => l.c > 0).length >= 15 },
    { id: 'games50',    icon: '🎮', check: p => Object.values(p.games).reduce((a, b) => a + b, 0) >= 50 },
    { id: 'days30',     icon: '🗓️', check: p => p.days.length >= 30 },
    // Scripts and classics
    { id: 'cyrillic',   icon: '🪆', check: p => ((p.perLang.ru || {}).c || 0) + ((p.perLang.uk || {}).c || 0) >= 10 },
    { id: 'greek',      icon: '🏛️', check: p => ((p.perLang.el || {}).c || 0) >= 10 },
    { id: 'latin',      icon: '📜', check: p => ((p.perLang.la || {}).c || 0) >= 10 },
    // All of Scandinavia plus three lands the Vikings sailed to (Dublin, Danelaw, Normandy, Rus', Finland).
    { id: 'viking',     icon: '🛶', check: p => {
      const ok = code => ((p.perLang[code] || {}).c || 0) >= 5;
      return ['da', 'sv', 'no'].every(ok) && ['ga', 'en', 'fr', 'ru', 'fi'].filter(ok).length >= 3;
    } },
    // Just for fun
    { id: 'weekend',    icon: '🛋️', check: p => [6, 0].every(d => p.days.some(x => new Date(x + 'T12:00:00').getDay() === d)) },
    { id: 'linguPal',   icon: '💬', check: p => (p.linguTaps || 0) >= 10 },
    { id: 'collector',  icon: '🎒', check: () => App.S.langs && App.S.langs.length >= 10 },
  ];

  let toastQueue = [], toastBusy = false;
  function toast(a) {
    toastQueue.push(a);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const a = toastQueue.shift();
    if (!a) { toastBusy = false; return; }
    toastBusy = true;
    const el = App.el('div', 'ach-toast', `<span class="ach-icon">${a.icon}</span>
      <span><small>${App.esc(t('ach.unlocked'))}</small><b>${App.esc(t('ach.' + a.id))}</b><em>${App.esc(t('ach.' + a.id + '.d'))}</em></span>`);
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.remove(); nextToast(); }, 400); }, 3600);
  }

  function evaluate(event) {
    let changed = false;
    for (const a of ACH) {
      if (P.achievements[a.id]) continue;
      if (a.check(P, event)) { P.achievements[a.id] = today(); changed = true; toast(a); }
    }
    if (changed) save();
  }

  function touchDay() {
    const d = today();
    if (!P.days.includes(d)) { P.days.push(d); if (P.days.length > 400) P.days.shift(); }
  }

  /* ---------- Recording ---------- */
  function answer(lang, ok) {
    touchDay();
    P.answers++;
    const l = P.perLang[lang] || (P.perLang[lang] = { a: 0, c: 0 });
    l.a++;
    if (ok) { P.correct++; l.c++; P.streak++; P.bestStreak = Math.max(P.bestStreak, P.streak); }
    else P.streak = 0;
    save();
    evaluate(null);
  }

  function card() {
    touchDay();
    P.cards++;
    save();
    if (P.cards % 10 === 0) evaluate(null);
  }

  // Records a finished game. Returns { record, rank } (rank is 1-based, 0 if not in the table).
  function finish(game, key, score, { lowerIsBetter = false, detail = null } = {}) {
    touchDay();
    P.games[game] = (P.games[game] || 0) + 1;
    const table = P.scores[key] || (P.scores[key] = []);
    const prevBest = table.length ? table[0].score : null;
    let rank = 0;
    if (score > 0) {
      table.push({ score, date: today(), detail });
      table.sort((a, b) => (lowerIsBetter ? a.score - b.score : b.score - a.score));
      table.splice(MAX_SCORES);
      rank = table.findIndex(r => r.score === score && r.date === today()) + 1;
    }
    const record = rank === 1 && (prevBest == null || prevBest !== score);
    save();
    evaluate({ game, score, detail });
    return { record, rank };
  }

  const best = key => (P.scores[key] && P.scores[key][0] ? P.scores[key][0].score : 0);

  function linguTap() {
    P.linguTaps = (P.linguTaps || 0) + 1;
    save();
    evaluate(null);
  }

  function reset() {
    P = blank();
    save();
  }

  return {
    answer, card, finish, best, reset, linguTap, ACH,
    get data() { return P; },
  };
})();
