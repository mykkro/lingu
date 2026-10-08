/* Odd One Out: four words, one doesn't belong.
   Round types: "category" (3 words from one category + 1 intruder, same language)
   and "meaning" (the same word in 3 languages + 1 impostor in a 4th language). */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, norm, tag, word } = App;
  const section = $('#game-odd');
  const q = $('.odd-question', section);
  const grid = $('.odd-options', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, round: null, missed: [] };

  // Categories that share a lot of meaning are never mixed (a fork is both food and home…).
  const CLOSE = [['food', 'home'], ['nature', 'city'], ['work', 'things'], ['hobbies', 'things'], ['people', 'work'],
    ['colors', 'adjectives'], ['time', 'adverbs'], ['numbers', 'time'], ['body', 'clothes'], ['home', 'things']];
  const close = (a, b) => a === b || CLOSE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const GROUP_CATS = ['animals', 'food', 'home', 'body', 'clothes', 'nature', 'city', 'people', 'work', 'time',
    'hobbies', 'numbers', 'colors', 'verbs', 'adjectives'];

  function categoryRound() {
    const cats = GROUP_CATS.filter(c => App.S.cats.includes(c));
    for (let tries = 0; tries < 30; tries++) {
      const cat = pick(cats);
      const lang = App.principalLang();
      const pool = shuffle(App.data.entries.filter(e => e.cat === cat && App.has(e, lang)));
      const others = shuffle(App.data.entries.filter(e => App.has(e, lang) && GROUP_CATS.includes(e.cat) && !close(e.cat, cat)));
      if (pool.length < 3 || !others.length) continue;
      const seen = new Set(), members = [];
      for (const e of pool) { const n = norm(e[lang]); if (!seen.has(n)) { seen.add(n); members.push(e); } if (members.length === 3) break; }
      const intruder = others.find(e => !seen.has(norm(e[lang])));
      if (members.length < 3 || !intruder) continue;
      const options = shuffle([...members.map(e => ({ e, lang, odd: false })), { e: intruder, lang, odd: true }]);
      return { type: 'category', lang, cat, intruder, options };
    }
    return null;
  }

  function meaningRound() {
    const langs = App.S.langs;
    if (langs.length < 2) return null;
    for (let tries = 0; tries < 30; tries++) {
      const e = App.draw('odd', () => App.entries({ langs: [] }).filter(x => x.cat !== 'phrases' && langs.filter(c => App.has(x, c)).length >= 2));
      if (!e) return null;
      const avail = shuffle(langs.filter(c => App.has(e, c)));
      // Up to 3 languages show the real word; the impostor uses another language when possible.
      const same = [], seen = new Set();
      for (const c of avail) { const n = norm(e[c]); if (!seen.has(n)) { seen.add(n); same.push(c); } if (same.length === 3) break; }
      if (same.length < 2) continue;
      const impLang = pick(avail.filter(c => !same.includes(c)).concat(avail).slice(0, 3));
      const forbidden = new Set(App.data.languages.map(l => norm(e[l.code])).filter(Boolean));
      const cands = shuffle(App.data.entries.filter(x => x !== e && x.cat === e.cat && App.has(x, impLang) && !forbidden.has(norm(x[impLang]))));
      const imp = cands[0];
      if (!imp) continue;
      const options = shuffle([...same.map(c => ({ e, lang: c, odd: false })), { e: imp, lang: impLang, odd: true }]);
      return { type: 'meaning', e, imp, options };
    }
    return null;
  }

  function buildRound() {
    const r = Math.random() < 0.5 ? categoryRound() || meaningRound() : meaningRound() || categoryRound();
    return r;
  }

  function render(r) {
    if (r.type === 'category') {
      q.innerHTML = `<span class="odd-emoji" aria-hidden="true">🕵️</span><span class="bq-word">${esc(t('odd.findCategory'))}</span>
        <span class="bq-target">${tag(r.lang)} ${esc(App.langName(r.lang))}</span>`;
    } else {
      q.innerHTML = `<span class="odd-emoji" aria-hidden="true">🎭</span><span class="bq-word">${esc(t('odd.findMeaning'))}</span>
        <span class="bq-target">${esc(t('odd.findMeaningHint'))}</span>`;
    }
    grid.innerHTML = r.options.map((o, i) => `<button class="blitz-opt odd-opt" data-i="${i}"><kbd>${i + 1}</kbd>
      ${r.type === 'meaning' ? tag(o.lang) : ''}<span>${esc(word(o.e, o.lang))}</span></button>`).join('');
  }

  function explain(r) {
    if (r.type === 'category') {
      return `${t('odd.explainCategory', { cat: App.catName(r.cat), odd: App.catName(r.intruder.cat) })}`;
    }
    const g = App.gloss(r.e), gi = App.gloss(r.imp);
    return t('odd.explainMeaning', { word: g || r.e.en, odd: gi || r.imp.en });
  }

  function next() {
    G.round = buildRound();
    if (!G.round) { q.innerHTML = `<p class="empty">${esc(t('odd.none'))}</p>`; grid.innerHTML = ''; return; }
    G.locked = false;
    render(G.round);
  }

  function answer(btn) {
    if (!G.running || G.locked || !btn) return;
    G.locked = true;
    G.rounds++;
    const r = G.round, chosen = r.options[+btn.dataset.i], ok = chosen.odd;
    $$('.odd-opt', grid).forEach(b => b.classList.add(r.options[+b.dataset.i].odd ? 'reveal' : 'dim'));
    btn.classList.remove('dim');
    btn.classList.add(ok ? 'correct' : 'wrong');
    $('.bq-target', q).textContent = explain(r);
    Progress.answer(r.type === 'category' ? r.lang : r.options.find(o => o.odd).lang, ok);
    if (ok) {
      G.streak++; G.score += 10 + Math.min(G.streak - 1, 10) * 2;
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 700);
      tm.after(1500, next);
    } else {
      G.streak = 0; G.strikes++; G.missed.push(r);
      buddy.oops();
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
      tm.after(2300, () => (G.strikes >= App.S.strikes ? finish() : next()));
    }
    shell.hud({ score: G.score, streak: G.streak, strikes: shell.strikes(G.strikes, App.S.strikes) });
  }

  function start() {
    shell.hide();
    Object.assign(G, { running: true, score: 0, streak: 0, strikes: 0, rounds: 0, missed: [] });
    shell.hud({ score: 0, streak: 0, strikes: shell.strikes(0, App.S.strikes) });
    shell.paintBg();
    next();
  }

  function finish() {
    G.running = false;
    tm.clear();
    const { record } = Progress.finish('odd', 'odd', G.score, { detail: { rounds: G.rounds } });
    const missed = G.missed.slice(-6).map(r => {
      const o = r.options.find(x => x.odd);
      return `<li>${tag(o.lang)} <b>${esc(word(o.e, o.lang))}</b> <span class="muted">${esc(explain(r))}</span></li>`;
    }).join('');
    shell.show({
      title: t('c.gameOver'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.rounds - G.missed.length}/${G.rounds}</b><span>${t('c.correct')}</span></div>
        <div><b>${Progress.best('odd')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${missed ? `<h3>${t('odd.review')}</h3><ul class="review">${missed}</ul>` : ''}`,
      actions: [['start', t('c.playAgain')]],
      mood: record ? 'happy' : 'sad',
      say: Mascot.line(record ? 'cheers' : 'oops'),
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    q.innerHTML = ''; grid.innerHTML = '';
    shell.show({
      title: t('odd.title'),
      html: `<p>${t('odd.intro')}</p><p class="muted">${t('art.rules', { strikes: App.S.strikes })} ${t('c.keys14')}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  grid.addEventListener('click', e => answer(e.target.closest('.odd-opt')));

  App.games.odd = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) { if (/^[1-4]$/.test(e.key) && G.running) answer($$('.odd-opt', grid)[+e.key - 1]); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
