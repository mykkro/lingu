/* Sentence Builder: tap shuffled word tiles to rebuild a phrase.
   After a streak of 3, a decoy word joins the tiles; after 6, two decoys. */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, tag } = App;
  const section = $('#game-builder');
  const q = $('.builder-question', section);
  const line = $('.builder-line', section);
  const pool = $('.builder-pool', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, round: null, missed: [] };

  const MIN_WORDS = 3, MAX_WORDS = 8;
  const tokens = s => s.trim().split(/\s+/);
  const bare = w => w.replace(/^[¿¡"„“”'«»(]+|[!?.,…:;"“”'»)]+$/g, '').toLocaleLowerCase();

  function phrases(lang) {
    return App.data.entries.filter(e => e.cat === 'phrases' && App.has(e, lang) &&
      !e[lang].includes('…') && tokens(e[lang]).length >= MIN_WORDS && tokens(e[lang]).length <= MAX_WORDS);
  }

  function buildRound() {
    const langs = App.S.langs.filter(c => phrases(c).length >= 5);
    if (!langs.length) return null;
    const lang = App.principalLang(langs);
    const e = App.draw('builder-' + lang, () => phrases(lang));
    if (!e) return null;
    const words = tokens(e[lang]);
    const decoyCount = G.streak >= 6 ? 2 : G.streak >= 3 ? 1 : 0;
    const inSentence = new Set(words.map(bare));
    const decoys = [];
    for (const x of shuffle(phrases(lang)).slice(0, 40)) {
      if (decoys.length >= decoyCount) break;
      const w = pick(tokens(x[lang]));
      if (bare(w).length > 1 && !inSentence.has(bare(w)) && !decoys.some(d => bare(d) === bare(w))) decoys.push(w);
    }
    // Shuffle until the order differs from the answer (for short phrases this matters).
    let tiles = shuffle([...words.map((w, i) => ({ w, real: i })), ...decoys.map(w => ({ w, real: -1 }))]);
    for (let k = 0; k < 5 && tiles.every((x, i) => x.real === i); k++) tiles = shuffle(tiles);
    return { e, lang, words, tiles, placed: [] };
  }

  function render() {
    const r = G.round;
    const g = App.gloss(r.e);
    q.innerHTML = `${r.e.emoji ? `<span class="bq-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="bq-target">${tag(r.lang)} ${esc(t('builder.prompt'))}</span>
      ${g && r.lang !== I18N.lang ? `<span class="bq-word builder-gloss">“${esc(g)}”</span>` : ''}`;
    line.innerHTML = r.placed.length
      ? r.placed.map((ti, k) => `<button class="tile builder-tile placed" data-k="${k}">${esc(r.tiles[ti].w)}</button>`).join('')
      : `<span class="builder-placeholder">${esc(t('builder.placeholder'))}</span>`;
    pool.innerHTML = r.tiles.map((x, ti) => r.placed.includes(ti) ? '' :
      `<button class="tile builder-tile" data-ti="${ti}">${esc(x.w)}</button>`).join('');
  }

  function check() {
    const r = G.round;
    const built = r.placed.map(ti => r.tiles[ti].w);
    // Compare text, not tile identity: identical words may be swapped freely.
    const ok = built.join(' ') === r.words.join(' ');
    G.locked = true;
    G.rounds++;
    Progress.answer(r.lang, ok);
    line.classList.add(ok ? 'good' : 'bad');
    if (ok) {
      G.streak++;
      const pts = 5 * r.words.length + Math.min(G.streak - 1, 10) * 2;
      G.score += pts;
      App.floater(line, line.clientWidth / 2, 0, `+${pts}`, 'good');
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 700);
      tm.after(1300, next);
    } else {
      G.streak = 0; G.strikes++; G.missed.push(r);
      buddy.oops();
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
      tm.after(700, () => {
        line.innerHTML = r.words.map(w => `<span class="tile builder-tile placed reveal">${esc(w)}</span>`).join('');
      });
      tm.after(2600, () => (G.strikes >= App.S.strikes ? finish() : next()));
    }
    shell.hud({ score: G.score, streak: G.streak, strikes: shell.strikes(G.strikes, App.S.strikes) });
  }

  function next() {
    line.classList.remove('good', 'bad');
    G.round = buildRound();
    if (!G.round) { q.innerHTML = `<p class="empty">${esc(t('gap.none'))}</p>`; line.innerHTML = ''; pool.innerHTML = ''; return; }
    G.locked = false;
    render();
  }

  pool.addEventListener('click', e => {
    const b = e.target.closest('[data-ti]');
    if (!b || !G.running || G.locked) return;
    G.round.placed.push(+b.dataset.ti);
    render();
    if (G.round.placed.length === G.round.words.length) check();
  });

  line.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b || !G.running || G.locked) return;
    G.round.placed.splice(+b.dataset.k, 1);
    render();
  });

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
    const { record } = Progress.finish('builder', 'builder', G.score, { detail: { rounds: G.rounds } });
    const missed = G.missed.slice(-6).map(r => `<li>${tag(r.lang)} ${esc(r.e[r.lang])}</li>`).join('');
    shell.show({
      title: t('c.gameOver'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.rounds - G.missed.length}/${G.rounds}</b><span>${t('c.correct')}</span></div>
        <div><b>${Progress.best('builder')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${missed ? `<h3>${t('gap.review')}</h3><ul class="review">${missed}</ul>` : ''}`,
      actions: [['start', t('c.playAgain')]],
      mood: record ? 'happy' : 'sad',
      say: Mascot.line(record ? 'cheers' : 'oops'),
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    q.innerHTML = ''; line.innerHTML = ''; pool.innerHTML = '';
    line.classList.remove('good', 'bad');
    shell.show({
      title: t('builder.title'),
      html: `<p>${t('builder.intro')}</p><p class="muted">${t('builder.rules', { strikes: App.S.strikes })}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  App.games.builder = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) {
      if (!G.running || G.locked) return;
      if (e.key === 'Backspace' && G.round.placed.length) { G.round.placed.pop(); render(); }
    },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
