/* Stats: overview tiles, accuracy per language, high-score tables, achievements. */
'use strict';

(() => {
  const { $, esc, tag } = App;
  const section = $('#game-stats');
  const body = $('.stats-page', section);

  const GAME_KEYS = [
    [/^cloud$/, 'nav.cloud', null],
    [/^blitz(\d+)$/, 'nav.blitz', m => `${m[1]} s`],
    [/^pairs(\d+)$/, 'nav.pairs', m => t('st.pairsN', { n: m[1] })],
    [/^guess(\d+)$/, 'guess.title', m => t('st.questionsN', { n: m[1] })],
    [/^articles$/, 'nav.articles', null],
    [/^gap$/, 'gap.title', null],
  ];
  const LOWER_IS_BETTER = /^$/;

  function label(key) {
    for (const [re, title, sub] of GAME_KEYS) {
      const m = key.match(re);
      if (m) return t(title) + (sub ? ` · ${sub(m)}` : '');
    }
    return key;
  }

  const fmtDate = d => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString(I18N.lang === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  function render() {
    const P = Progress.data;
    const acc = P.answers ? Math.round(P.correct / P.answers * 100) : 0;
    const unlocked = Object.keys(P.achievements).length;
    const tiles = [
      [P.answers, t('st.answers')], [`${acc}%`, t('c.accuracy')], [P.bestStreak, t('st.bestStreak')],
      [P.cards, t('st.cards')], [P.days.length, t('st.days')], [`${unlocked}/${Progress.ACH.length}`, t('st.achievements')],
    ];

    const langs = Object.entries(P.perLang).filter(([, v]) => v.a > 0).sort((a, b) => b[1].a - a[1].a);
    const bars = langs.map(([code, v]) => {
      const pct = Math.round(v.c / v.a * 100);
      return `<li title="${esc(App.langName(code))}: ${v.c}/${v.a} (${pct}%)">
        <span class="lb-lang">${tag(code)}</span>
        <span class="lb-track"><span class="lb-fill" style="width:${pct}%"></span></span>
        <span class="lb-val"><b>${pct}%</b> <small>${v.c}/${v.a}</small></span></li>`;
    }).join('');

    const keys = Object.keys(P.scores).filter(k => P.scores[k].length).sort();
    const tables = keys.map(k => `
      <div class="hs-table">
        <h4>${esc(label(k))}</h4>
        <ol>${P.scores[k].map((r, i) => `<li class="${i === 0 ? 'top' : ''}"><span class="hs-rank">${i + 1}.</span>
          <b>${r.score}${LOWER_IS_BETTER.test(k) ? ' s' : ''}</b><span class="hs-date">${esc(fmtDate(r.date))}</span></li>`).join('')}</ol>
      </div>`).join('');

    const ach = Progress.ACH.map(a => {
      const when = P.achievements[a.id];
      return `<li class="ach ${when ? 'on' : ''}"><span class="ach-icon">${when ? a.icon : '🔒'}</span>
        <span><b>${esc(t('ach.' + a.id))}</b><small>${esc(t('ach.' + a.id + '.d'))}</small>${when ? `<em>${esc(fmtDate(when))}</em>` : ''}</span></li>`;
    }).join('');

    body.innerHTML = `
      <section class="st-block">
        <h2>${t('st.title')}</h2>
        <div class="stat-tiles">${tiles.map(([v, l]) => `<div class="stat-tile"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>
      </section>
      <section class="st-block">
        <h3>${t('st.perLang')}</h3>
        ${bars ? `<ul class="lang-bars">${bars}</ul>` : `<p class="muted">${t('st.empty')}</p>`}
      </section>
      <section class="st-block">
        <h3>${t('st.highScores')}</h3>
        ${tables ? `<div class="hs-grid">${tables}</div>` : `<p class="muted">${t('st.noScores')}</p>`}
      </section>
      <section class="st-block">
        <h3>${t('st.achievements')}</h3>
        <ul class="ach-grid">${ach}</ul>
      </section>
      <p class="st-reset"><button class="btn ghost" data-act="reset">${t('st.reset')}</button></p>`;
  }

  section.addEventListener('click', e => {
    if (e.target.closest('[data-act="reset"]') && confirm(t('st.resetConfirm'))) { Progress.reset(); render(); }
  });

  App.games.stats = {
    enter() { render(); },
    leave() {},
    settingsChanged() { if (!section.hidden) render(); },
  };
})();
