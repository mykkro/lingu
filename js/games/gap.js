/* Fill the gap: a phrase with one missing word, pick the word from the options. */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, tag } = App;
  const section = $('#game-gap');
  const q = $('.gap-question', section);
  const grid = $('.gap-options', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, round: null, missed: [] };

  const PUNCT = /^[¿¡"„“”'«»(]+|[!?.,…:;"“”'»)]+$/g;
  const core = token => token.replace(PUNCT, '');
  const isWord = w => w.length >= 2 && /\p{L}/u.test(w) && !w.includes('…');

  function phrases(lang) {
    return App.data.entries.filter(e => e.cat === 'phrases' && App.has(e, lang) && e[lang].trim().split(/\s+/).length >= 3);
  }

  // All usable words of a language, for distractors.
  const wordCache = new Map();
  function wordsOf(lang) {
    if (!wordCache.has(lang)) {
      const set = new Set();
      phrases(lang).forEach(e => e[lang].split(/\s+/).map(core).filter(isWord).forEach(w => set.add(w)));
      wordCache.set(lang, [...set]);
    }
    return wordCache.get(lang);
  }

  function buildRound() {
    const langs = App.S.langs.filter(c => phrases(c).length >= 4);
    if (!langs.length) return null;
    const lang = App.principalLang(langs);
    const e = App.draw('gap-' + lang, () => phrases(lang));
    if (!e) return null;
    const tokens = e[lang].trim().split(/\s+/);
    // Prefer not to blank the first word: its capital letter would give it away.
    let idx = tokens.map((tk, i) => i).filter(i => i > 0 && isWord(core(tokens[i])));
    if (!idx.length) idx = tokens.map((tk, i) => i).filter(i => isWord(core(tokens[i])));
    if (!idx.length) return null;
    const i = pick(idx);
    const answer = core(tokens[i]);
    const lower = s => s.toLocaleLowerCase();
    const inSentence = new Set(tokens.map(tk => lower(core(tk))));
    const pool = shuffle(wordsOf(lang).filter(w => !inSentence.has(lower(w))));
    // Similar-length distractors feel fairer.
    pool.sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length));
    const distractors = [];
    for (const w of pool.slice(0, 30).sort(() => Math.random() - 0.5)) {
      if (distractors.length === 3) break;
      if (!distractors.some(d => lower(d) === lower(w))) distractors.push(w);
    }
    // Match the answer's capitalisation so case doesn't give the answer away
    // (German keeps its own: capitalised nouns are information there).
    const matchCase = w => {
      if (lang === 'de') return w;
      const up = answer[0] !== answer[0].toLocaleLowerCase();
      return up ? w[0].toLocaleUpperCase() + w.slice(1) : w[0].toLocaleLowerCase() + w.slice(1);
    };
    const cased = [...new Set(distractors.map(matchCase))].filter(w => lower(w) !== lower(answer));
    return { e, lang, tokens, i, answer, options: shuffle([answer, ...cased]) };
  }

  function sentence(r, filled = null, ok = null) {
    return r.tokens.map((tk, k) => {
      if (k !== r.i) return esc(tk);
      const w = core(tk), pre = tk.slice(0, tk.indexOf(w)), post = tk.slice(tk.indexOf(w) + w.length);
      const inner = filled == null ? '<span class="gap-blank">_____</span>'
        : `<b class="art-filled ${ok ? 'good' : 'bad'}">${esc(filled)}</b>`;
      return esc(pre) + inner + esc(post);
    }).join(' ');
  }

  function render(r) {
    const g = App.gloss(r.e);
    q.innerHTML = `${r.e.emoji ? `<span class="bq-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="gap-sentence">${tag(r.lang)} <span class="gap-text">${sentence(r)}</span></span>
      <span class="bq-target">${g && r.lang !== I18N.lang ? '“' + esc(g) + '”' : ''}</span>`;
    grid.innerHTML = r.options.map((w, k) => `<button class="blitz-opt" data-w="${esc(w)}"><kbd>${k + 1}</kbd><span>${esc(w)}</span></button>`).join('');
  }

  function next() {
    G.round = buildRound();
    if (!G.round) { q.innerHTML = `<p class="empty">${esc(t('gap.none'))}</p>`; grid.innerHTML = ''; return; }
    G.locked = false;
    render(G.round);
  }

  function answer(btn) {
    if (!G.running || G.locked || !btn) return;
    G.locked = true;
    G.rounds++;
    const r = G.round, ok = btn.dataset.w === r.answer;
    $$('.blitz-opt', grid).forEach(b => b.classList.add(b.dataset.w === r.answer ? 'reveal' : 'dim'));
    btn.classList.remove('dim');
    btn.classList.add(ok ? 'correct' : 'wrong');
    $('.gap-text', q).innerHTML = sentence(r, r.answer, ok);
    Progress.answer(r.lang, ok);
    if (ok) {
      G.streak++; G.score += 10 + Math.min(G.streak - 1, 10) * 2;
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 700);
      tm.after(1200, next);
    } else {
      G.streak = 0; G.strikes++; G.missed.push(r);
      buddy.oops();
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
      tm.after(2000, () => (G.strikes >= App.S.strikes ? finish() : next()));
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
    const { record } = Progress.finish('gap', 'gap', G.score, { detail: { rounds: G.rounds } });
    const missed = G.missed.slice(-6).map(r => `<li>${tag(r.lang)} ${sentence(r, r.answer, true)}</li>`).join('');
    shell.show({
      title: t('c.gameOver'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.rounds - G.missed.length}/${G.rounds}</b><span>${t('c.correct')}</span></div>
        <div><b>${Progress.best('gap')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${missed ? `<h3>${t('gap.review')}</h3><ul class="review">${missed}</ul>` : ''}`,
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
      title: t('gap.title'),
      html: `<p>${t('gap.intro')}</p><p class="muted">${t('art.rules', { strikes: App.S.strikes })} ${t('c.keys14')}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  grid.addEventListener('click', e => answer(e.target.closest('.blitz-opt')));

  App.games.gap = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) { if (/^[1-4]$/.test(e.key) && G.running) answer($$('.blitz-opt', grid)[+e.key - 1]); },
    settingsChanged() { wordCache.clear(); if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
