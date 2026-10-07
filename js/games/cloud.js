/* Word Cloud: find the translation of the central word. Wrong answer or timeout = strike. */
'use strict';

(() => {
  const { $, $$, el, esc, rand, pick, shuffle, norm, tag, word, clamp } = App;
  const section = $('#game-cloud');
  const arena = $('.arena', section);
  const timerBar = $('.timer > div', section);
  const shell = App.shell(section);
  const buddy = Mascot.create({ size: 'sm', side: 'right', interactive: false });
  $('.game-mascot', section).append(buddy.el);
  const tm = App.timers();
  const G = { running: false, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, correct: 0, missed: [], round: null, deadline: 0 };

  function buildRound() {
    const langs = App.S.langs;
    const e = App.draw('cloud', () => App.entries({ langs: [] }).filter(x => langs.filter(c => App.has(x, c)).length >= 2));
    if (!e) return null;
    const available = langs.filter(c => App.has(e, c));
    const p = App.principalLang(available);
    const targets = available.filter(c => c !== p);
    const answerLang = pick(targets);
    const forbidden = new Set(App.data.languages.map(l => norm(e[l.code])).filter(Boolean));
    const fit = clamp(Math.floor(arena.clientWidth * arena.clientHeight / 24000), 4, 12);
    const count = Math.min(App.S.options, fit);
    const options = [{ text: word(e, answerLang), lang: answerLang, correct: true }];
    const used = new Set([norm(e[answerLang])]);
    const same = App.S.sameCat ? App.entries({ langs: [] }).filter(x => x.cat === e.cat) : [];
    for (const x of [...shuffle(same), ...shuffle(App.entries({ langs: [] }))]) {
      if (options.length >= count) break;
      if (x === e) continue;
      const choices = targets.filter(c => App.has(x, c));
      if (!choices.length) continue;
      const c = pick(choices), n = norm(x[c]);
      if (forbidden.has(n) || used.has(n)) continue;
      used.add(n);
      options.push({ text: word(x, c), lang: c, correct: false });
    }
    return { e, p, answerLang, options: shuffle(options) };
  }

  function render(r) {
    arena.innerHTML = '';
    const center = el('div', 'principal-bubble', `
      ${App.S.showEmoji && r.e.emoji ? `<span class="pb-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="pb-word">${tag(r.p)} ${esc(word(r.e, r.p))}</span>
      <span class="pb-hint">${t('cloud.find')}</span>`);
    arena.append(center);
    r.options.forEach((o, i) => {
      const b = el('button', 'opt', `${App.S.showTags ? tag(o.lang) : ''}<span>${esc(o.text)}</span>`);
      if (o.correct) b.dataset.correct = '1';
      b.style.setProperty('--i', i);
      b.style.setProperty('--d', rand(0, 4).toFixed(2) + 's');
      arena.append(b);
    });
    layout();
  }

  // Place options around the centre bubble, then push overlapping boxes apart.
  function layout() {
    const W = arena.clientWidth, H = arena.clientHeight;
    const center = $('.principal-bubble', arena);
    if (!center) return;
    const cw = center.offsetWidth + 24, ch = center.offsetHeight + 24;
    const opts = $$('.opt', arena), n = opts.length, offset = rand(0, Math.PI * 2);
    const nodes = opts.map((o, i) => {
      const w = o.offsetWidth + 12, h = o.offsetHeight + 12;
      const a = offset + i / n * Math.PI * 2 + rand(-0.2, 0.2);
      const ring = n > 7 && i % 2 ? 0.62 : 0.92;
      return { o, w, h, x: W / 2 + Math.cos(a) * (W / 2 - w / 2) * ring, y: H / 2 + Math.sin(a) * (H / 2 - h / 2) * ring };
    });
    for (let it = 0; it < 160; it++) {
      let moved = false;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox < oy) { const s = Math.sign(a.x - b.x) || 1; a.x += s * ox / 2; b.x -= s * ox / 2; }
            else { const s = Math.sign(a.y - b.y) || 1; a.y += s * oy / 2; b.y -= s * oy / 2; }
          }
        }
        const ox = (a.w + cw) / 2 - Math.abs(a.x - W / 2), oy = (a.h + ch) / 2 - Math.abs(a.y - H / 2);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) a.x += (Math.sign(a.x - W / 2) || 1) * ox; else a.y += (Math.sign(a.y - H / 2) || 1) * oy;
        }
        a.x = clamp(a.x, a.w / 2, W - a.w / 2);
        a.y = clamp(a.y, a.h / 2, H - a.h / 2);
      }
      if (!moved) break;
    }
    nodes.forEach(nd => { nd.o.style.left = nd.x + 'px'; nd.o.style.top = nd.y + 'px'; });
  }

  function startTimer() {
    const limit = App.S.timeLimit * 1000;
    timerBar.parentElement.hidden = !limit;
    if (!limit) return;
    G.deadline = performance.now() + limit;
    const tick = now => {
      const left = G.deadline - now;
      timerBar.style.transform = `scaleX(${Math.max(0, left / limit)})`;
      timerBar.classList.toggle('low', left < limit * 0.3);
      if (left <= 0) answer(null);
      else tm.frame(tick);
    };
    tm.frame(tick);
  }

  function updateHud() {
    shell.hud({ score: G.score, streak: G.streak, strikes: shell.strikes(G.strikes, App.S.strikes) });
  }

  function nextRound() {
    G.round = buildRound();
    if (!G.round) { end(); return; }
    G.locked = false;
    shell.paintBg();
    render(G.round);
    startTimer();
  }

  function answer(btn) {
    if (G.locked || !G.running) return;
    G.locked = true;
    tm.clear();
    G.rounds++;
    const correctBtn = $('.opt[data-correct="1"]', arena);
    $$('.opt', arena).forEach(o => { if (o !== btn && o !== correctBtn) o.classList.add('dim'); });
    if (btn && btn.dataset.correct) {
      G.correct++; G.streak++;
      const bonus = App.S.timeLimit ? Math.ceil(Math.max(0, G.deadline - performance.now()) / 1000) : 0;
      const pts = 10 + bonus + Math.min(G.streak - 1, 10) * 2;
      G.score += pts;
      btn.classList.add('correct');
      App.floater(arena, btn.offsetLeft, btn.offsetTop - 20, `+${pts}`, 'good');
      if (G.streak % 5 === 0) buddy.cheer(); else buddy.mood('happy', 900);
      tm.after(850, nextRound);
    } else {
      G.streak = 0; G.strikes++;
      if (btn) btn.classList.add('wrong');
      correctBtn?.classList.add('reveal');
      G.missed.push(G.round);
      const r = G.round;
      $('.pb-hint', arena).innerHTML = t(btn ? 'cloud.notQuite' : 'cloud.timesUp');
      buddy.oops();
      buddy.say(`${word(r.e, r.answerLang)}`, { lang: r.answerLang, ms: 1700, speak: false });
      section.classList.add('shake');
      setTimeout(() => section.classList.remove('shake'), 450);
      tm.after(1800, () => (G.strikes >= App.S.strikes ? end() : nextRound()));
    }
    updateHud();
  }

  function start() {
    Object.assign(G, { running: true, locked: false, score: 0, streak: 0, strikes: 0, rounds: 0, correct: 0, missed: [] });
    updateHud();
    shell.hide();
    nextRound();
  }

  function end() {
    G.running = false;
    tm.clear();
    const record = App.best.submit('cloud', G.score);
    const acc = G.rounds ? Math.round(G.correct / G.rounds * 100) : 0;
    const missed = G.missed.slice(-8).map(r =>
      `<li>${tag(r.p)} ${esc(word(r.e, r.p))} <span class="arrow">→</span> ${tag(r.answerLang)} <b>${esc(word(r.e, r.answerLang))}</b></li>`).join('');
    const line = Mascot.line(record ? 'cheers' : 'oops');
    shell.show({
      title: t('c.gameOver'),
      html: `<div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.correct}/${G.rounds}</b><span>${t('c.correct')}</span></div><div><b>${acc}%</b><span>${t('c.accuracy')}</span></div><div><b>${App.best.get('cloud')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>
        ${missed ? `<h3>${t('cloud.review')}</h3><ul class="review">${missed}</ul>` : ''}`,
      actions: [['start', t('c.playAgain')]],
      mood: record ? 'happy' : 'sad',
      say: line,
      onAction: start,
    });
  }

  function intro() {
    shell.paintBg();
    shell.show({
      title: t('cloud.title'),
      html: `<p>${t('cloud.intro')}</p>
        <p class="muted">${App.S.timeLimit ? t('cloud.rulesTimed', { secs: App.S.timeLimit, strikes: App.S.strikes }) : t('cloud.rules', { strikes: App.S.strikes })}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  arena.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) answer(b); });
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (G.running && !section.hidden) layout(); }, 150); });

  App.games.cloud = {
    enter() { if (!G.running) intro(); else { G.running = false; intro(); } },
    leave() { G.running = false; tm.clear(); arena.innerHTML = ''; },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); arena.innerHTML = ''; intro(); } },
  };
})();
