/* Articles: der/die/das, le/la, el/la, il/lo/la, o/a, de/het, en/ett. */
'use strict';

(() => {
  const { $, $$, esc, pick, tag, word } = App;
  const section = $('#game-articles');
  const q = $('.art-question', section);
  const grid = $('.art-options', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, round: null, missed: [] };

  function langs() {
    const sets = App.data.articleSets;
    const mine = App.S.langs.filter(c => sets[c]);
    return mine.length ? mine : Object.keys(sets);
  }

  const playable = c => App.data.entries.filter(e => App.has(e, c) && e.articles && App.data.articleSets[c].includes(e.articles[c]));

  function buildRound() {
    const ls = langs().filter(c => playable(c).length);
    if (!ls.length) return null;
    const c = pick(ls);
    const e = App.draw('articles-' + c, () => playable(c));
    return e ? { e, c } : null;
  }

  function render(r) {
    q.innerHTML = `${r.e.emoji ? `<span class="bq-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="bq-word">${tag(r.c)} <span class="art-blank">___</span> ${esc(r.e[r.c])}</span>
      <span class="bq-target">${App.gloss(r.e) && r.c !== I18N.lang ? '“' + esc(App.gloss(r.e)) + '”' : ''}</span>`;
    grid.innerHTML = App.data.articleSets[r.c].map((a, i) => `<button class="blitz-opt" data-a="${esc(a)}"><kbd>${i + 1}</kbd><span>${esc(a)}</span></button>`).join('');
  }

  function next() {
    G.round = buildRound();
    if (!G.round) { q.innerHTML = `<p class="empty">${t('art.none')}</p>`; return; }
    G.locked = false;
    render(G.round);
  }

  function answer(btn) {
    if (!G.running || G.locked || !btn) return;
    G.locked = true;
    G.rounds++;
    const r = G.round, right = r.e.articles[r.c], ok = btn.dataset.a === right;
    $$('.blitz-opt', grid).forEach(b => b.classList.add(b.dataset.a === right ? 'reveal' : 'dim'));
    btn.classList.remove('dim');
    btn.classList.add(ok ? 'correct' : 'wrong');
    $('.art-blank', q).outerHTML = `<b class="art-filled ${ok ? 'good' : 'bad'}">${esc(right)}</b>`;
    Progress.answer(r.c, ok);
    if (ok) {
      G.streak++; G.score += 10 + Math.min(G.streak - 1, 10) * 2;
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 700);
      tm.after(900, next);
    } else {
      G.streak = 0; G.strikes++; G.missed.push(r);
      buddy.oops();
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
      tm.after(1600, () => (G.strikes >= App.S.strikes ? finish() : next()));
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
    const { record } = Progress.finish('articles', 'articles', G.score, { detail: { rounds: G.rounds } });
    const missed = G.missed.slice(-8).map(r => `<li>${tag(r.c)} <b>${esc(word(r.e, r.c, true))}</b>${App.gloss(r.e) ? ` <span class="muted">${esc(App.gloss(r.e))}</span>` : ''}</li>`).join('');
    shell.show({
      title: t('c.gameOver'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.rounds - G.missed.length}/${G.rounds}</b><span>${t('c.correct')}</span></div>
        <div><b>${Progress.best('articles')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${missed ? `<h3>${t('art.review')}</h3><ul class="review">${missed}</ul>` : ''}`,
      actions: [['start', t('c.playAgain')]],
      mood: record ? 'happy' : 'sad',
      say: Mascot.line(record ? 'cheers' : 'oops'),
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    q.innerHTML = ''; grid.innerHTML = '';
    const ls = langs().map(c => `${tag(c)} ${esc(App.data.articleSets[c].join(' / '))}`).join('<br>');
    shell.show({
      title: t('art.title'),
      html: `<p>${t('art.intro')}</p><p class="muted art-langs">${ls}</p><p class="muted">${t('art.rules', { strikes: App.S.strikes })}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  grid.addEventListener('click', e => answer(e.target.closest('.blitz-opt')));

  App.games.articles = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    keys(e) { if (/^[1-9]$/.test(e.key) && G.running) answer($$('.blitz-opt', grid)[+e.key - 1]); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
