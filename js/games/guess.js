/* Which language? Identify the language of a word or phrase. */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, norm, word } = App;
  const section = $('#game-guess');
  const cardSlot = $('.guess-card', section);
  const grid = $('.guess-options', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, n: 0, score: 0, streak: 0, round: null, log: [] };

  const pool = () => (App.S.guessAllLangs ? App.data.languages.map(l => l.code) : App.S.langs);

  function buildRound() {
    const langs = pool();
    for (let tries = 0; tries < 50; tries++) {
      const e = App.draw('guess', () => App.entries({ langs: [] }));
      if (!e) return null;
      // Only languages whose spelling of this entry is unique, so the answer is unambiguous.
      const counts = {};
      langs.forEach(c => { if (App.has(e, c)) { const n = norm(e[c]); counts[n] = (counts[n] || 0) + 1; } });
      const unique = langs.filter(c => App.has(e, c) && counts[norm(e[c])] === 1);
      if (!unique.length) continue;
      const answer = pick(unique);
      const others = shuffle(langs.filter(c => c !== answer && (!App.has(e, c) || norm(e[c]) !== norm(e[answer])))).slice(0, 3);
      return { e, answer, options: shuffle([answer, ...others]) };
    }
    return null;
  }

  function render(r) {
    cardSlot.innerHTML = `<canvas class="card-art" aria-hidden="true"></canvas>
      <div class="guess-text"><span class="guess-word">${esc(word(r.e, r.answer))}</span><span class="guess-meaning"></span></div>`;
    requestAnimationFrame(() => App.paint($('canvas', cardSlot)));
    grid.innerHTML = r.options.map((c, i) => {
      const l = App.lang(c);
      return `<button class="lang-opt" data-lang="${c}"><kbd>${i + 1}</kbd>${Flags.svg(c)}<span><b>${esc(l.native)}</b><small>${esc(App.langName(c))}</small></span></button>`;
    }).join('');
    shell.hud({ progress: `${G.n + 1}/${App.S.guessQuestions}` });
  }

  function next() {
    if (G.n >= App.S.guessQuestions) { finish(); return; }
    G.round = buildRound();
    if (!G.round) { finish(); return; }
    G.locked = false;
    render(G.round);
  }

  function answer(btn) {
    if (!G.running || G.locked || !btn) return;
    G.locked = true;
    const r = G.round, ok = btn.dataset.lang === r.answer;
    $$('.lang-opt', grid).forEach(b => b.classList.add(b.dataset.lang === r.answer ? 'reveal' : 'dim'));
    btn.classList.remove('dim');
    btn.classList.add(ok ? 'correct' : 'wrong');
    const g = App.gloss(r.e), meaning = g && norm(g) !== norm(r.e[r.answer]) ? `“${g}”` : '';
    $('.guess-meaning', cardSlot).textContent = `${App.langName(r.answer)}${meaning ? ' · ' + meaning : ''}`;
    App.speak(r.e[r.answer], r.answer);
    if (ok) { G.score++; G.streak++; if (G.streak % 4 === 0) buddy.cheer(); else buddy.mood('happy', 800); }
    else { G.streak = 0; buddy.mood('sad', 900); }
    G.log.push({ r, ok });
    G.n++;
    shell.hud({ score: G.score });
    tm.after(ok ? 1300 : 2200, next);
  }

  function start() {
    shell.hide();
    Object.assign(G, { running: true, n: 0, score: 0, streak: 0, log: [] });
    shell.hud({ score: 0 });
    shell.paintBg();
    next();
  }

  function finish() {
    G.running = false;
    tm.clear();
    const key = 'guess' + App.S.guessQuestions;
    const record = App.best.submit(key, G.score);
    const misses = G.log.filter(x => !x.ok).slice(-8).map(({ r }) =>
      `<li>${esc(word(r.e, r.answer))} <span class="arrow">→</span> ${App.tag(r.answer)} ${esc(App.langName(r.answer))}</li>`).join('');
    shell.show({
      title: `${G.score} / ${G.n}`,
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.correct')}</span></div><div><b>${App.best.get(key)}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${misses ? `<h3>${t('guess.review')}</h3><ul class="review">${misses}</ul>` : ''}`,
      actions: [['start', t('c.playAgain')]],
      mood: G.score >= G.n * 0.7 ? 'happy' : 'wave',
      say: Mascot.line(G.score >= G.n * 0.7 ? 'cheers' : 'hello'),
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    cardSlot.innerHTML = ''; grid.innerHTML = '';
    const n = pool().length;
    shell.show({
      title: t('guess.title'),
      html: `<p>${t('guess.intro', { n })}</p><p class="muted">${t('guess.rules', { n: App.S.guessQuestions })} ${t('c.keys14')}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  grid.addEventListener('click', e => answer(e.target.closest('.lang-opt')));

  App.games.guess = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) { if (/^[1-4]$/.test(e.key) && G.running) answer($$('.lang-opt', grid)[+e.key - 1]); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
