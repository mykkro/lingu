/* Boot, navigation and the settings dialog. */
'use strict';

(() => {
  const { $, $$, el, esc, store } = App;
  const MODE_KEY = 'lingu.mode.v1';
  const GAMES = [
    { id: 'learn', icon: '<path d="M4 6h12a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z"/><path d="M8 3h12v12"/>' },
    { id: 'cloud', icon: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>' },
    { id: 'blitz', icon: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
    { id: 'pairs', icon: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="16" rx="2"/><path d="M10 12h4"/>' },
    { id: 'guess', icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>' },
    { id: 'articles', icon: '<path d="M5 19 9.5 5h1L15 19M7 14h6"/><path d="M17 9h4M19 7v4"/>' },
  ];
  let mode = null;

  /* ---------- Theme ---------- */
  function applyTheme() {
    const t = App.S.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    document.body.classList.toggle('no-mascot', !App.S.mascot);
  }

  /* ---------- Navigation ---------- */
  function buildNav() {
    const nav = $('#nav');
    nav.innerHTML = GAMES.map(g => `
      <button role="tab" class="nav-btn" data-mode="${g.id}" aria-selected="false" aria-controls="game-${g.id}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${g.icon}</svg><span>${esc(t('nav.' + g.id))}</span>
      </button>`).join('');
    syncNav();
  }

  function syncNav() { $$('.nav-btn').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === mode))); }

  function setMode(next) {
    if (!App.games[next]) next = 'learn';
    if (mode === next) return;
    if (mode) App.games[mode].leave();
    mode = next;
    store.set(MODE_KEY, mode);
    syncNav();
    $$('.game').forEach(s => { s.hidden = s.id !== 'game-' + mode; });
    App.games[mode].enter();
  }

  /* ---------- Settings dialog ---------- */
  const dlg = $('#settings');
  const form = $('#settings-form');

  function checks(name, items, selected) {
    return items.map(([value, label]) =>
      `<label class="check"><input type="checkbox" name="${name}" value="${esc(value)}" ${selected.includes(value) ? 'checked' : ''}><span>${label}</span></label>`).join('');
  }

  function fillForm() {
    const S = App.S, d = App.data;
    $('#set-langs').innerHTML = checks('langs', d.languages.map(l => [l.code, `${Flags.svg(l.code)} ${esc(l.native)}`]), S.langs);
    $('#set-principal').innerHTML = `<option value="random">${esc(t('s.random'))}</option>` +
      d.languages.map(l => `<option value="${l.code}">${esc(App.langName(l.code))}</option>`).join('');
    const counts = {};
    d.entries.forEach(e => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    $('#set-cats').innerHTML = checks('cats', Object.entries(d.categories).filter(([k]) => counts[k]).map(([k, v]) => [k, `${esc(App.catName(k))} <small>${counts[k]}</small>`]), S.cats);
    $('#set-styles').innerHTML = checks('styles', Object.entries(Art.STYLES).map(([k, v]) => [k, esc(v.name)]), S.styles);
    $('#vocab-info').textContent = t('s.entries', { n: d.entries.length, l: d.languages.length, src: t(d.source === 'custom' ? 's.custom' : 's.builtin') });
    $('#vocab-restore').hidden = d.source !== 'custom';
    for (const input of form.elements) {
      if (!input.name || ['langs', 'cats', 'styles'].includes(input.name)) continue;
      const v = S[input.name];
      if (input.type === 'checkbox') input.checked = !!v;
      else if (input.name === 'strength') input.value = Math.round(v * 100);
      else input.value = v;
    }
    syncOutputs();
    $('#settings-error').textContent = '';
  }

  function syncOutputs() {
    $$('input[type="range"]', form).forEach(r => {
      const out = $(`output[for="${r.id}"]`, form);
      if (out) out.textContent = r.dataset.zero && r.value === '0' ? t(r.dataset.zero) : r.value + (r.dataset.unit || '');
    });
  }

  function readForm() {
    const S = { ...App.S };
    const all = name => $$(`input[name="${name}"]:checked`, form).map(i => i.value);
    S.langs = all('langs'); S.cats = all('cats'); S.styles = all('styles');
    for (const input of form.elements) {
      if (!input.name || ['langs', 'cats', 'styles'].includes(input.name)) continue;
      if (input.type === 'checkbox') S[input.name] = input.checked;
      else if (input.type === 'number' || input.type === 'range') S[input.name] = input.name === 'strength' ? +input.value / 100 : +input.value;
      else S[input.name] = input.value;
    }
    return S;
  }

  function validateForm(S) {
    if (S.langs.length < 2) return t('s.errLangs');
    if (!S.cats.length) return t('s.errCats');
    if (!S.styles.length) return t('s.errStyles');
    return '';
  }

  function openSettings() { fillForm(); dlg.showModal(); }

  function applySettings(next) {
    App.saveSettings(next);
    applyTheme();
    I18N.apply();
    buildNav();
    App.games[mode]?.settingsChanged?.();
  }

  form.addEventListener('input', syncOutputs);
  form.addEventListener('submit', e => {
    if (e.submitter?.value !== 'save') return;
    const S = readForm(), err = validateForm(S);
    if (err) { e.preventDefault(); $('#settings-error').textContent = err; return; }
    applySettings(S);
  });
  $('#set-reset').addEventListener('click', () => { App.resetSettings(); fillForm(); });
  $('#open-settings').addEventListener('click', openSettings);

  /* Vocabulary import/export */
  async function readJsonFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  $('#vocab-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      App.importCustom(await readJsonFile(file));
      applySettings(App.S);
      fillForm();
    } catch (err) {
      $('#settings-error').textContent = t('s.errFile', { msg: err.message });
    }
  });

  $('#vocab-restore').addEventListener('click', async () => {
    App.clearCustom();
    try { await App.loadData(); applySettings(App.S); fillForm(); }
    catch (err) { $('#settings-error').textContent = t('s.errFile', { msg: err.message }); }
  });

  $('#vocab-download').addEventListener('click', () => {
    const d = App.data;
    const strip = ({ id, ...rest }) => rest;
    const json = JSON.stringify({ languages: d.languages, defaultLanguages: d.defaultLanguages, categories: d.categories,
      articleSets: d.articleSets, mascot: d.mascot, entries: d.entries.map(strip) }, null, 1);
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'lingu-vocabulary.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', e => {
    if (dlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, select, textarea')) return;
    if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    App.games[mode]?.keys?.(e);
  });

  /* ---------- Boot ---------- */
  function showLoadError(err) {
    I18N.apply();
    const box = $('#load-error');
    box.hidden = false;
    $('#load-error-msg').textContent = err.message;
    $('#load-error-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        App.importCustom(await readJsonFile(file));
        box.hidden = true;
        start();
      } catch (er) {
        $('#load-error-msg').textContent = t('s.errFile', { msg: er.message });
      }
    });
  }

  function start() {
    App.loadSettings();
    applyTheme();
    I18N.apply();
    buildNav();
    $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
    const logo = Mascot.create({ size: 'xs', side: 'below' });
    $('#brand-mascot').append(logo.el);
    $('#app').hidden = false;
    setMode(store.get(MODE_KEY, 'learn'));
  }

  App.loadData().then(start, err => {
    console.error(err);
    showLoadError(location.protocol === 'file:'
      ? new Error('Your browser blocks reading files when the page is opened directly from disk.')
      : err);
  });
})();
