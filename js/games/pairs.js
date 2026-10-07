/* Pairs: match words between two languages against the clock. */
'use strict';

(() => {
  const { $, $$, esc, pick, shuffle, norm, tag, word } = App;
  const section = $('#game-pairs');
  const board = $('.pairs-board', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, start: 0, mistakes: 0, left: 0, selected: null, boards: 0, langs: [] };

  function buildBoard() {
    const langs = shuffle(App.S.langs);
    for (let i = 0; i < langs.length; i++) {
      for (let j = i + 1; j < langs.length; j++) {
        const a = langs[i], b = langs[j];
        const seenA = new Set(), seenB = new Set(), picked = [];
        for (const e of shuffle(App.entries({ langs: [a, b] }))) {
          const na = norm(e[a]), nb = norm(e[b]);
          if (seenA.has(na) || seenB.has(nb)) continue;
          seenA.add(na); seenB.add(nb); picked.push(e);
          if (picked.length === App.S.pairsCount) return { a, b, picked };
        }
      }
    }
    return null;
  }

  function render({ a, b, picked }) {
    const col = (code, side) => shuffle(picked).map(e =>
      `<button class="tile" data-id="${e.id}" data-side="${side}" data-lang="${code}"><span>${esc(word(e, code))}</span></button>`).join('');
    board.innerHTML = `
      <div class="pairs-col"><div class="pairs-head">${tag(a)} ${esc(App.langName(a))}</div>${col(a, 'a')}</div>
      <div class="pairs-col"><div class="pairs-head">${tag(b)} ${esc(App.langName(b))}</div>${col(b, 'b')}</div>`;
  }

  function tick() {
    if (!G.running) return;
    shell.hud({ time: ((performance.now() - G.start) / 1000).toFixed(1) + 's' });
    tm.frame(tick);
  }

  function pickTile(tile) {
    if (!G.running || !tile || tile.classList.contains('matched')) return;
    App.speak(tile.textContent, tile.dataset.lang);
    const sel = G.selected;
    if (!sel || sel === tile || sel.dataset.side === tile.dataset.side) {
      sel?.classList.remove('selected');
      G.selected = sel === tile ? null : tile;
      G.selected?.classList.add('selected');
      return;
    }
    sel.classList.remove('selected');
    G.selected = null;
    if (sel.dataset.id === tile.dataset.id) {
      [sel, tile].forEach(x => { x.classList.add('matched'); x.disabled = true; });
      G.left--;
      if (G.left === 0) done();
      else buddy.mood('happy', 600);
    } else {
      G.mistakes++;
      [sel, tile].forEach(x => { x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 500); });
      buddy.mood('sad', 700);
    }
    shell.hud({ mistakes: G.mistakes });
  }

  function startBoard() {
    const b = buildBoard();
    if (!b) { board.innerHTML = `<p class="empty">${t('pairs.notEnough')}</p>`; return; }
    shell.hide();
    Object.assign(G, { running: true, mistakes: 0, left: b.picked.length, selected: null, start: performance.now() });
    shell.hud({ mistakes: 0, boards: G.boards });
    shell.paintBg();
    render(b);
    tm.frame(tick);
  }

  function done() {
    G.running = false;
    tm.clear();
    G.boards++;
    const secs = (performance.now() - G.start) / 1000;
    const scoreTime = +(secs + G.mistakes * 2).toFixed(1);
    const key = 'pairs' + App.S.pairsCount;
    const record = App.best.submit(key, scoreTime, true);
    shell.hud({ boards: G.boards });
    buddy.cheer();
    setTimeout(() => shell.show({
      title: t('pairs.cleared'),
      html: `<div class="stats"><div><b>${secs.toFixed(1)}s</b><span>${t('c.time')}</span></div><div><b>${G.mistakes}</b><span>${t('c.mistakes')}</span></div>
        <div><b>${scoreTime}s</b><span>${t('pairs.scoreLabel')}</span></div><div><b>${App.best.get(key)}s</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>`,
      actions: [['next', t('pairs.next')]],
      mood: 'happy',
      say: Mascot.line('cheers'),
      onAction: startBoard,
    }), 600);
  }

  function intro() {
    shell.paintBg();
    board.innerHTML = '';
    shell.hud({ time: '0.0s', mistakes: 0, boards: G.boards });
    shell.show({
      title: t('pairs.title'),
      html: `<p>${t('pairs.intro')}</p>
        <p class="muted">${t('pairs.rules', { n: App.S.pairsCount })}</p>`,
      say: Mascot.line('hello'),
      onAction: startBoard,
    });
  }

  board.addEventListener('click', e => pickTile(e.target.closest('.tile')));

  App.games.pairs = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
