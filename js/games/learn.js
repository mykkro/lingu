/* Learn: auto-advancing flash cards with generated art. */
'use strict';

(() => {
  const { $, el, esc, rand, tag, word, speak, paint } = App;
  const section = $('#game-learn');
  const stage = $('.learn-stage', section);
  const bar = $('.learn-progress > div', section);
  const pauseBtn = $('[data-act="pause"]', section);
  const tm = App.timers();
  const L = { history: [], idx: -1, paused: false, active: false, mascot: null, cardsShown: 0 };

  function nextItem() {
    const langs = App.S.langs;
    const e = App.draw('learn', () => App.entries({ langs: [] }).filter(x => langs.filter(c => App.has(x, c)).length >= 2));
    if (!e) return null;
    const available = langs.filter(c => App.has(e, c));
    return { e, lang: App.principalLang(available) };
  }

  function show(item) {
    tm.clear();
    const old = $('.card:not(.leaving)', stage);
    if (old) { old.classList.add('leaving'); setTimeout(() => old.remove(), 450); }
    if (!item) { stage.append(el('p', 'empty', t('learn.noWords'))); return; }

    const { e, lang: p } = item;
    const others = App.S.langs.filter(c => c !== p && App.has(e, c));
    const card = el('article', 'card entering');
    card.style.setProperty('--tilt', rand(-1.6, 1.6).toFixed(2) + 'deg');
    card.innerHTML = `
      <canvas class="card-art" aria-hidden="true"></canvas>
      <div class="card-body">
        <div class="card-meta"><span class="chip">${esc(App.catName(e.cat))}</span><span class="art-name"></span></div>
        ${App.S.showEmoji && e.emoji ? `<div class="card-emoji" aria-hidden="true">${e.emoji}</div>` : ''}
        <button class="principal speakable" data-lang="${p}" data-text="${esc(e[p])}">${tag(p)}<span class="word">${esc(word(e, p))}</span></button>
        <ul class="translations">
          ${others.map((c, i) => `<li style="--i:${i}" class="${App.S.gradual ? 'concealed' : ''}"><button class="tr speakable" data-lang="${c}" data-text="${esc(e[c])}">${tag(c)}<span>${esc(word(e, c))}</span></button></li>`).join('')}
        </ul>
      </div>`;
    stage.append(card);
    requestAnimationFrame(() => {
      card.classList.remove('entering');
      $('.art-name', card).textContent = paint($('canvas', card));
    });

    if (App.S.gradual) {
      const items = [...card.querySelectorAll('.concealed')];
      const budget = App.S.minInterval * 1000 * 0.7;
      const step = Math.min(650, budget / Math.max(1, items.length));
      items.forEach((li, i) => tm.after(500 + i * step, () => li.classList.remove('concealed')));
    }

    L.cardsShown++;
    Progress.card();
    if (L.mascot && L.cardsShown % 7 === 0) tm.after(1200, () => L.mascot.chatter());
    schedule();
  }

  function schedule() {
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
    if (L.paused || !L.active) return;
    const ms = rand(App.S.minInterval, App.S.maxInterval) * 1000;
    void bar.offsetWidth;
    bar.style.transition = `transform ${ms}ms linear`;
    bar.style.transform = 'scaleX(1)';
    tm.after(ms, next);
  }

  function next() {
    if (L.idx < L.history.length - 1) L.idx++;
    else {
      const item = nextItem();
      if (item) { L.history.push(item); if (L.history.length > 300) L.history.shift(); }
      L.idx = L.history.length - 1;
    }
    show(L.history[L.idx]);
  }

  function prev() {
    if (L.idx > 0) { L.idx--; show(L.history[L.idx]); }
  }

  function setPaused(p) {
    L.paused = p;
    pauseBtn.classList.toggle('is-paused', p);
    pauseBtn.setAttribute('aria-label', t(p ? 'learn.resume' : 'learn.pause'));
    if (p) { tm.clear(); $$concealed().forEach(li => li.classList.remove('concealed')); }
    schedule();
  }
  const $$concealed = () => [...stage.querySelectorAll('.card:not(.leaving) .concealed')];

  section.addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('speakable')) {
      const li = btn.closest('.concealed');
      if (li) li.classList.remove('concealed');
      speak(btn.dataset.text, btn.dataset.lang);
      return;
    }
    const act = btn.dataset.act;
    if (act === 'next') next();
    else if (act === 'prev') prev();
    else if (act === 'pause') setPaused(!L.paused);
  });

  // Swipe left/right on the card stage.
  let touch = null;
  stage.addEventListener('touchstart', e => { const p = e.touches[0]; touch = { x: p.clientX, y: p.clientY }; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touch) return;
    const p = e.changedTouches[0], dx = p.clientX - touch.x, dy = p.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  });

  App.games.learn = {
    keys(e) {
      if (e.key === ' ') { e.preventDefault(); setPaused(!L.paused); }
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    },
    enter() {
      L.active = true;
      if (!L.mascot) {
        L.mascot = Mascot.create({ size: 'sm', side: 'right' });
        $('.learn-mascot', section).append(L.mascot.el);
        setTimeout(() => L.mascot.hello(), 600);
      }
      if (L.idx < 0) next(); else schedule();
    },
    leave() { L.active = false; tm.clear(); schedule(); },
    settingsChanged() {
      L.history = L.history.slice(0, L.idx + 1);
      if (L.active) next();
    },
  };
})();
