/* Blitz: answer as many as you can before the clock runs out. Correct +1s, wrong -3s. */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, norm, tag, word } = App;
  const section = $('#game-blitz');
  const q = $('.blitz-question', section);
  const grid = $('.blitz-options', section);
  const timerBar = $('.timer > div', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, wrong: 0, end: 0, total: 0, round: null, streak: 0 };

  function buildRound() {
    const langs = App.S.langs;
    const e = App.draw('blitz', () => App.entries({ langs: [] }).filter(x => langs.filter(c => App.has(x, c)).length >= 2));
    if (!e) return null;
    const available = langs.filter(c => App.has(e, c));
    const p = App.principalLang(available);
    const target = pick(available.filter(c => c !== p));
    const forbidden = new Set(App.data.languages.map(l => norm(e[l.code])).filter(Boolean));
    const pool = App.entries({ langs: [target] });
    const same = shuffle(pool.filter(x => x.cat === e.cat)), rest = shuffle(pool);
    const options = [{ text: word(e, target), correct: true }];
    const used = new Set();
    for (const x of [...same, ...rest]) {
      if (options.length >= 4) break;
      const n = norm(x[target]);
      if (x === e || forbidden.has(n) || used.has(n)) continue;
      used.add(n);
      options.push({ text: word(x, target), correct: false });
    }
    return { e, p, target, options: shuffle(options) };
  }

  function render(r) {
    q.innerHTML = `${App.S.showEmoji && r.e.emoji ? `<span class="bq-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="bq-word">${tag(r.p)} ${esc(word(r.e, r.p))}</span>
      <span class="bq-target">${tag(r.target)} ${esc(t('blitz.inLang', { lang: App.langName(r.target) }))}</span>`;
    grid.innerHTML = r.options.map((o, i) =>
      `<button class="blitz-opt" ${o.correct ? 'data-correct="1"' : ''}><kbd>${i + 1}</kbd><span>${esc(o.text)}</span></button>`).join('');
  }

  function tick(now) {
    if (!G.running) return;
    const left = G.end - now;
    timerBar.style.transform = `scaleX(${Math.max(0, left / G.total)})`;
    timerBar.classList.toggle('low', left < 10000);
    shell.hud({ time: Math.max(0, Math.ceil(left / 1000)) + 's' });
    if (left <= 0) { finish(); return; }
    tm.frame(tick);
  }

  function next() {
    G.round = buildRound();
    if (!G.round) { finish(); return; }
    G.locked = false;
    render(G.round);
  }

  function answer(btn) {
    if (!G.running || G.locked || !btn) return;
    G.locked = true;
    const ok = !!btn.dataset.correct;
    Progress.answer(G.round.target, ok);
    $$('.blitz-opt', grid).forEach(b => b.classList.add(b.dataset.correct ? 'reveal' : 'dim'));
    btn.classList.remove('dim');
    btn.classList.add(ok ? 'correct' : 'wrong');
    if (ok) {
      G.score++; G.streak++;
      G.end += 1000;
      App.floater(grid, btn.offsetLeft + btn.offsetWidth / 2, btn.offsetTop, '+1s', 'good');
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 700);
    } else {
      G.wrong++; G.streak = 0;
      G.end -= 3000;
      App.floater(grid, btn.offsetLeft + btn.offsetWidth / 2, btn.offsetTop, '−3s', 'bad');
      buddy.mood('sad', 900);
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
    }
    shell.hud({ score: G.score });
    setTimeout(() => { if (G.running) next(); }, ok ? 350 : 900);
  }

  function start() {
    shell.hide();
    G.total = App.S.blitzSeconds * 1000;
    Object.assign(G, { running: true, score: 0, wrong: 0, streak: 0, end: performance.now() + G.total });
    shell.hud({ score: 0 });
    shell.paintBg();
    next();
    tm.frame(tick);
  }

  function finish() {
    G.running = false;
    tm.clear();
    const key = 'blitz' + App.S.blitzSeconds;
    const { record } = Progress.finish('blitz', key, G.score, { detail: { wrong: G.wrong } });
    const answered = G.score + G.wrong;
    shell.show({
      title: t('blitz.timeUp'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.correct')}</span></div><div><b>${G.wrong}</b><span>${t('c.wrong')}</span></div>
        <div><b>${answered ? Math.round(G.score / answered * 100) : 0}%</b><span>${t('c.accuracy')}</span></div><div><b>${Progress.best(key)}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>`,
      actions: [['start', t('c.again')]],
      mood: record ? 'happy' : 'wave',
      say: Mascot.line(record ? 'cheers' : 'hello'),
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    shell.hud({ score: 0, time: App.S.blitzSeconds + 's' });
    shell.show({
      title: t('blitz.title'),
      html: `<p>${t('blitz.intro', { secs: App.S.blitzSeconds })}</p>
        <p class="muted">${t('blitz.rules')} ${t('c.keys14')}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  grid.addEventListener('click', e => answer(e.target.closest('.blitz-opt')));

  App.games.blitz = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) { if (/^[1-4]$/.test(e.key) && G.running) answer($$('.blitz-opt', grid)[+e.key - 1]); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
