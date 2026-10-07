/* Pairs: match words between two languages. Each board has a countdown; wrong matches are strikes.
   The game ends when the clock runs out or the strikes are used up. Cleared boards give a time bonus. */
'use strict';

(() => {
  const { $, esc, shuffle, norm, tag, word } = App;
  const section = $('#game-pairs');
  const board = $('.pairs-board', section);
  const timerBar = $('.timer > div', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const SECONDS_PER_PAIR = 5;
  const G = { running: false, score: 0, strikes: 0, mistakes: 0, matched: 0, left: 0, selected: null, boards: 0, deadline: 0, limit: 0 };

  function buildBoard() {
    const langs = shuffle(App.S.langs);
    for (let i = 0; i < langs.length; i++) {
      for (let j = i + 1; j < langs.length; j++) {
        const a = langs[i], b = langs[j];
        const seenA = new Set(), seenB = new Set(), picked = [];
        for (const e of shuffle(App.entries({ langs: [a, b] }).filter(x => x.cat !== 'phrases'))) {
          const na = norm(e[a]), nb = norm(e[b]);
          if (seenA.has(na) || seenB.has(nb) || na === nb) continue;
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

  function hud() {
    shell.hud({ score: G.score, boards: G.boards, strikes: shell.strikes(G.strikes, App.S.strikes) });
  }

  function tick(now) {
    if (!G.running) return;
    const left = G.deadline - now;
    timerBar.style.transform = `scaleX(${Math.max(0, left / G.limit)})`;
    timerBar.classList.toggle('low', left < G.limit * 0.3);
    shell.hud({ time: Math.max(0, Math.ceil(left / 1000)) + 's' });
    if (left <= 0) { buddy.oops(); finish(t('pairs.timeUp')); return; }
    tm.frame(tick);
  }

  function pickTile(tile) {
    if (!G.running || !tile || tile.classList.contains('matched')) return;
    const sel = G.selected;
    if (!sel || sel === tile || sel.dataset.side === tile.dataset.side) {
      sel?.classList.remove('selected');
      G.selected = sel === tile ? null : tile;
      G.selected?.classList.add('selected');
      return;
    }
    sel.classList.remove('selected');
    G.selected = null;
    const lang = tile.dataset.side === 'b' ? tile.dataset.lang : sel.dataset.lang;
    if (sel.dataset.id === tile.dataset.id) {
      [sel, tile].forEach(x => { x.classList.add('matched'); x.disabled = true; });
      G.left--; G.matched++; G.score += 10;
      Progress.answer(lang, true);
      App.floater(board, tile.offsetLeft + tile.offsetWidth / 2, tile.offsetTop, '+10', 'good');
      if (G.left === 0) boardCleared();
      else buddy.mood('happy', 600);
    } else {
      G.mistakes++; G.strikes++;
      Progress.answer(lang, false);
      [sel, tile].forEach(x => { x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 500); });
      buddy.mood('sad', 700);
      if (G.strikes >= App.S.strikes) { hud(); finish(t('pairs.outOfStrikes')); return; }
    }
    hud();
  }

  function boardCleared() {
    G.boards++;
    const bonus = Math.max(0, Math.ceil((G.deadline - performance.now()) / 1000)) * 2;
    G.score += bonus;
    App.floater(board, board.clientWidth / 2, 20, t('pairs.bonus', { n: bonus }), 'good');
    buddy.cheer();
    hud();
    tm.clear();
    G.running = false;
    tm.after(1100, () => { G.running = true; nextBoard(); });
  }

  function nextBoard() {
    const b = buildBoard();
    if (!b) { board.innerHTML = `<p class="empty">${esc(t('pairs.notEnough'))}</p>`; G.running = false; return; }
    G.left = b.picked.length;
    G.selected = null;
    G.limit = b.picked.length * SECONDS_PER_PAIR * 1000;
    G.deadline = performance.now() + G.limit;
    shell.paintBg();
    render(b);
    tm.frame(tick);
  }

  function start() {
    shell.hide();
    Object.assign(G, { running: true, score: 0, strikes: 0, mistakes: 0, matched: 0, boards: 0 });
    hud();
    nextBoard();
  }

  function finish(reason) {
    G.running = false;
    tm.clear();
    const key = 'pairs' + App.S.pairsCount;
    const { record } = Progress.finish('pairs', key, G.score, { detail: { boards: G.boards, mistakes: G.mistakes } });
    tm.after(500, () => shell.show({
      title: t('c.gameOver'),
      html: `<p class="muted">${esc(reason)}</p>
        <div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.boards}</b><span>${t('pairs.boardsCleared')}</span></div>
        <div><b>${G.matched}</b><span>${t('pairs.pairsMatched')}</span></div><div><b>${Progress.best(key)}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>`,
      actions: [['start', t('c.playAgain')]],
      mood: record ? 'happy' : 'sad',
      say: Mascot.line(record ? 'cheers' : 'oops'),
      onAction: start,
    }));
  }

  function intro() {
    shell.paintBg();
    board.innerHTML = '';
    shell.hud({ time: App.S.pairsCount * SECONDS_PER_PAIR + 's', score: 0, boards: 0, strikes: shell.strikes(0, App.S.strikes) });
    timerBar.style.transform = 'scaleX(1)';
    timerBar.classList.remove('low');
    shell.show({
      title: t('pairs.title'),
      html: `<p>${t('pairs.intro')}</p>
        <p class="muted">${t('pairs.rules', { n: App.S.pairsCount, secs: App.S.pairsCount * SECONDS_PER_PAIR, strikes: App.S.strikes })}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  board.addEventListener('click', e => pickTile(e.target.closest('.tile')));

  App.games.pairs = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
