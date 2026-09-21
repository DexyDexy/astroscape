/* AstroScape — состояние, время, связывание */
(function (NS) {
  'use strict';
  const $ = id => document.getElementById(id);
  const Astro = NS.Astro, UI = NS.UI, fmt = NS.fmt;

  const state = {
    date: new Date(),
    playing: true,
    live: true,
    speed: 1,
    anchor: new Date(),
    span: 30 * 86400,
    observer: null,   // задаётся в boot после инициализации языка
    selected: null,
    mode: 'geo',
  };
  let scene = null, obsObj = null;
  let states = null, aspects = null, riseSets = {}, heavy = null;
  let lastLightMs = -Infinity, lastHeavyMs = -Infinity, heavyTimer = null, heavyPending = false;
  let dragging = false;
  let firstRun = false, guess = null;   // первый запуск: предположение о месте по часовому поясу

  // ---------- сохранение ----------
  function load() {
    let hasObserver = false;
    try {
      const s = JSON.parse(localStorage.getItem('astroscape.state') || '{}');
      if (s.observer && isFinite(s.observer.lat)) {
        hasObserver = true;
        state.observer = s.observer;
        // Город из списка узнаём по координатам, а не по сохранённому номеру:
        // список пересортирован, старые номера указывали бы на другие города.
        const idx = NS.PRESETS.findIndex(p => p.lat === s.observer.lat && p.lon === s.observer.lon);
        if (idx >= 0) { state.observer.name = NS.PRESETS[idx].name; state.observer.preset = idx; }
        else delete state.observer.preset;
      }
      if (s.options) {
        const opts = Object.assign({}, s.options);
        // Значение свечения записывалось автоматически, а не выбиралось пользователем,
        // поэтому после смены умолчания один раз берём новое, а не сохранённое.
        if ((s.prefsVersion || 1) < PREFS_VERSION) delete opts.bloom;
        Object.assign(optionsSaved, opts);
      }
    } catch (e) {}
    return hasObserver;
  }
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 820;
  // Свечение и подписи звёзд включены везде, кроме телефонов: там они съедают память и кадры
  const optionsSaved = { aspects: true, bloom: !smallScreen, starLabels: !smallScreen };
  const PREFS_VERSION = 3;   // 3: свечение снова включено по умолчанию
  function save() {
    try { localStorage.setItem('astroscape.state', JSON.stringify({ observer: state.observer, options: scene ? scene.options : optionsSaved, prefsVersion: PREFS_VERSION })); } catch (e) {}
  }

  // ---------- расчёты ----------
  function setObserver(o, persist) {
    state.observer = o;
    obsObj = Astro.observer(o.lat, o.lon);
    lastLightMs = -Infinity; lastHeavyMs = -Infinity;
    if (persist !== false) save();
  }

  // ---------- города для глобуса ----------
  function cityList() {
    return NS.PRESETS
      .filter(p => p.en !== 'North Pole' && p.en !== 'Greenwich')
      .map(p => ({ name: p.name, lat: p.lat, lon: p.lon, major: p.m === 1 }));
  }

  // ---------- место при первом запуске ----------
  function defaultObserver() {
    const i = NS.PRESETS.findIndex(p => p.en === 'Greenwich');
    const p = NS.PRESETS[i];
    return { name: p.name, lat: p.lat, lon: p.lon, preset: i, source: 'default' };
  }
  // Часовой пояс устройства известен без разрешений: по нему подбираем ближайший крупный город
  function guessFromTimeZone() {
    let tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    if (!tz) return null;
    let hint = NS.TZ_HINTS[tz];
    if (!hint) {
      const city = tz.split('/').pop().replace(/_/g, ' ').toLowerCase();
      const idx = NS.PRESETS.findIndex(p => p.en.toLowerCase() === city);
      if (idx >= 0) hint = NS.PRESETS[idx].en;
    }
    const idx = hint ? NS.PRESETS.findIndex(p => p.en === hint) : -1;
    if (idx < 0) return { tz, observer: null };
    const p = NS.PRESETS[idx];
    return { tz, observer: { name: p.name, lat: p.lat, lon: p.lon, preset: idx, source: 'tz' } };
  }
  // GPS только по явному действию; координаты округляются до 0.01° (около километра)
  function locateGps(ok, fail) {
    if (!navigator.geolocation) { UI.toast(NS.t('noGeo')); if (fail) fail(); return; }
    UI.toast(NS.t('locating'));
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
      let best = -1, bd = 1e9;
      NS.PRESETS.forEach((p, i) => { const d = Math.hypot(p.lat - lat, (p.lon - lon) * Math.cos(lat * Math.PI / 180)); if (d < bd) { bd = d; best = i; } });
      const near = bd < 0.7 ? NS.PRESETS[best] : null;
      ok({ name: near ? near.name : NS.t('namePh'), lat, lon, preset: near ? best : undefined, source: 'gps' });
    }, () => { UI.toast(NS.t('geoFail')); if (fail) fail(); }, { timeout: 12000, maximumAge: 600000 });
  }
  function showWelcome() {
    const m = $('modal-welcome'); if (!m) return;
    const g = guess && guess.observer;
    $('welcome-guess').innerHTML = g ? NS.t('guessLine', { tz: guess.tz, city: g.name }) : NS.t('guessNone', { tz: guess ? guess.tz : '—' });
    $('welcome-use').textContent = NS.t('useGuess', { city: g ? g.name : state.observer.name });
    $('welcome-gps').textContent = NS.t('useGps');
    m.hidden = false;
  }
  function closeWelcome(persist) {
    const m = $('modal-welcome'); if (!m || m.hidden) return;
    m.hidden = true;
    if (persist) save();
  }

  function lightUpdate(force) {
    const ms = state.date.getTime();
    if (!force && Math.abs(ms - lastLightMs) < 1000) return false;
    lastLightMs = ms;
    states = Astro.allStates(state.date, obsObj);
    aspects = Astro.aspects(states);
    return true;
  }

  function scheduleHeavy() {
    if (heavyPending) return;
    heavyPending = true;
    clearTimeout(heavyTimer);
    heavyTimer = setTimeout(() => { heavyPending = false; heavyUpdate(); }, 350);
  }
  function heavyUpdate() {
    const d = state.date;
    lastHeavyMs = d.getTime();
    const t0 = performance.now();
    riseSets = {};
    NS.BODIES.forEach(b => { riseSets[b.id] = Astro.riseSet(b.id, d, obsObj); });
    heavy = {
      moon: Astro.moonInfo(d, obsObj, states.Moon),
      sun: Astro.sunInfo(d, obsObj),
      retro: Astro.allRetro(d),
      eclipses: Astro.eclipses(d, obsObj),
    };
    heavy.retroMap = {};
    heavy.retro.forEach(r => { heavy.retroMap[r.id] = r; });
    renderHeavy();
    const dt = performance.now() - t0;
    if (dt > 400) console.log('heavy update', dt.toFixed(0), 'ms');
  }
  function renderHeavy() {
    if (!heavy) return;
    const d = state.date;
    UI.renderMoon(heavy.moon, states.Moon, d, state.observer);
    UI.renderSun(heavy.sun, states.Sun, d);
    UI.renderRetro(heavy.retro, d);
    UI.renderEclipses(heavy.eclipses, d);
    UI.renderPlanets(states, riseSets, state.selected);
    renderDetail();
  }
  function renderDetail() {
    if (!state.selected) { UI.renderDetail(null); return; }
    const full = Astro.bodyState(state.selected, state.date, obsObj, true);
    UI.renderDetail(state.selected, full, riseSets[state.selected], state.date);
  }

  // ---------- время ----------
  function setDate(d, opts) {
    opts = opts || {};
    state.date = new Date(d.getTime());
    if (!opts.keepLive) state.live = false;
    if (opts.anchor) state.anchor = new Date(state.date.getTime());
    updateTimeUI();
  }
  function goNow() {
    state.live = true; state.playing = true; state.speed = 1;
    $('speed').value = '1';
    setDate(new Date(), { keepLive: true, anchor: true });
    UI.toast(NS.t('nowToast'));
  }
  function updateTimeUI() {
    $('btn-play').textContent = state.playing ? '❚❚' : '▶';
    $('btn-play').classList.toggle('playing', state.playing && !state.live);
    $('btn-now').classList.toggle('live', state.live);
    if (!dragging) {
      const half = state.span * 500;                       // половина диапазона, мс
      const v = 1000 + (state.date - state.anchor) / half * 1000;
      $('slider').value = Math.max(0, Math.min(2000, Math.round(v)));
      $('slider-min').textContent = spanLabel(new Date(state.anchor.getTime() - half));
      $('slider-max').textContent = spanLabel(new Date(state.anchor.getTime() + half));
    }
    if (document.activeElement !== $('dt-input')) $('dt-input').value = fmt.dtLocalInput(state.date);
  }
  function spanLabel(d) {
    if (state.span <= 86400) return fmt.short(d) + ' ' + fmt.time(d);
    if (state.span <= 31536000) return fmt.short(d, state.anchor);
    return fmt.short(d) + ' ' + d.getFullYear();
  }

  // ---------- кадр ----------
  function tick(dt) {
    if (state.playing) {
      if (state.live) state.date = new Date();
      else state.date = new Date(state.date.getTime() + dt * state.speed * 1000);
      if (!dragging) updateTimeUI();
    }
    const changed = lightUpdate(false);
    if (changed || !heavy) {
      if (!heavy || Math.abs(state.date.getTime() - lastHeavyMs) > 60000 || (state.observer !== heavyObserver)) {
        heavyObserver = state.observer;
        scheduleHeavy();
      }
      UI.renderPlanets(states, riseSets, state.selected);
      UI.renderAspects(aspects);
      if (heavy && (state.playing && state.speed > 60 || state.selected)) renderHeavyFast();
    }
    UI.renderClock(state.date, state.observer, state.live);
    scene.update({
      date: state.date, states, aspects,
      gst: Astro.gst(state.date), sunDir: Astro.sunDirection(state.date), obliquity: Astro.obliquity(state.date),
      observer: state.observer,
    });
  }
  let heavyObserver = null;
  // при быстром течении времени — обновлять относительные надписи чаще, чем тяжёлые расчёты
  let fastCounter = 0;
  function renderHeavyFast() {
    if (++fastCounter % 20) return;
    renderHeavy();
  }

  // ---------- место ----------
  let prevObserver = null, locApplied = false, prevView = null;
  function previewObserver(o) { setObserver(o, false); updateLocLive(); }
  function previewFromInputs() {
    const lat = parseFloat($('loc-lat').value), lon = parseFloat($('loc-lon').value);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    previewObserver({ name: $('loc-label').value.trim() || (lat.toFixed(2) + ', ' + lon.toFixed(2)), lat, lon });
  }
  function updateLocLive() {
    const el = $('loc-live'); if (!el) return;
    const o = state.observer;
    el.innerHTML = '<b>' + o.name + '</b>' + fmt.coords(o.lat, o.lon);
  }
  // Режим «выбрать на карте»: окно сжимается, глобус подлетает к текущей точке
  function enterMapMode() {
    const m = $('modal-location');
    if (m.classList.contains('map-mode')) return;
    m.classList.add('map-mode');
    prevView = scene.viewState();
    scene.focusOn(state.observer.lat, state.observer.lon);
    updateLocLive();
  }
  function exitMapMode() {
    const m = $('modal-location');
    if (!m.classList.contains('map-mode')) return;
    m.classList.remove('map-mode');
    scene.restoreView(prevView); prevView = null;
  }
  function openLocation() {
    setMode('geo', true);                    // точку выбирают на глобусе
    const m = $('modal-location'); m.hidden = false;
    prevObserver = state.observer; locApplied = false;
    $('loc-lat').value = state.observer.lat.toFixed(4);
    $('loc-lon').value = state.observer.lon.toFixed(4);
    $('loc-label').value = state.observer.name;
    $('loc-preset').value = '';
    scene.setPickGlobe(true);
  }
  function closeLocation() {
    if ($('modal-location').hidden) return;
    exitMapMode();
    $('modal-location').hidden = true; scene.setPickGlobe(false);
    if (!locApplied && prevObserver) setObserver(prevObserver, false);   // отмена — вернуть прежнее место
  }
  function applyLocation() {
    const lat = parseFloat($('loc-lat').value), lon = parseFloat($('loc-lon').value);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { UI.toast(NS.t('checkCoords')); return; }
    const presetIdx = NS.PRESETS.findIndex(p => p.lat === lat && p.lon === lon);
    const name = presetIdx >= 0 ? NS.PRESETS[presetIdx].name : ($('loc-label').value.trim() || (lat.toFixed(2) + ', ' + lon.toFixed(2)));
    locApplied = true;
    setObserver({ name, lat, lon, preset: presetIdx >= 0 ? presetIdx : undefined });
    closeLocation();
    UI.toast(NS.t('placeSet', { n: name }));
  }

  // ---------- счётчик просмотров ----------
  // Сайт статический, своего сервера нет, поэтому счёт ведёт внешний сервис.
  // Наружу уходит только факт открытия страницы. С localhost счётчик не
  // увеличиваем, чтобы отладочные перезагрузки не накручивали число.
  const VIEWS_URL = 'https://abacus.jasoncameron.dev/{op}/dexydexy-astroscape/views';
  function initViews() {
    const el = $('views');
    if (!el || typeof fetch !== 'function') return;
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    fetch(VIEWS_URL.replace('{op}', local ? 'get' : 'hit'), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || typeof d.value !== 'number') return;
        el.innerHTML = NS.t('views') + ' <b>' + new Intl.NumberFormat(NS.I18N.intl).format(d.value) + '</b>';
        el.hidden = false;
      })
      .catch(() => {});   // счётчик недоступен — просто не показываем
  }

  // ---------- сообщение, если запустить не удалось ----------
  function showBootError(detail) {
    const el = $('loader-err');
    if (!el || !el.hidden) return;              // сообщение показываем один раз
    $('loader').classList.remove('hide');
    el.hidden = false;
    el.innerHTML = (NS.t ? NS.t('bootFail') : 'The 3D scene could not start.') +
      '<code>' + String(detail).slice(0, 300).replace(/[<>&]/g, '') + '</code>';
  }
  function webglAvailable() {
    try {
      const cv = document.createElement('canvas');
      return !!(cv.getContext('webgl2') || cv.getContext('webgl'));
    } catch (e) { return false; }
  }
  // Сторожевой таймер: модуль three.js мог не запуститься (старый браузер, нет сети)
  setTimeout(function () {
    if (!scene) showBootError(webglAvailable() ? 'module not started; UA: ' + navigator.userAgent : 'WebGL unavailable');
  }, 9000);

  // ---------- запуск ----------
  NS.VERSION = '1.0.2';
  NS.boot = function (libs) {
    try { bootInner(libs); } catch (e) { showBootError((e && e.message) || e); throw e; }
  };
  function bootInner(libs) {
    NS.I18N.init();
    $('version').textContent = 'v' + NS.VERSION;
    const saved = load();
    if (!saved) {
      firstRun = true;
      guess = guessFromTimeZone();
      state.observer = (guess && guess.observer) || defaultObserver();
    }
    setObserver(state.observer, saved);     // предварительное место не сохраняем, пока пользователь не выбрал
    UI.fillPresets();
    UI.initPanels();
    UI.buildRows(select);

    scene = new NS.Scene(libs, {
      container: $('scene'), labels: $('labels'),
      onPick: select,
      onGlobePick: (lat, lon) => {
        $('loc-lat').value = lat.toFixed(4); $('loc-lon').value = lon.toFixed(4);
        $('loc-preset').value = ''; $('loc-label').value = '';
        // ближайший город в списке
        let best = null, bd = 1e9;
        NS.PRESETS.forEach(p => { const d = Math.hypot(p.lat - lat, (p.lon - lon) * Math.cos(lat * Math.PI / 180)); if (d < bd) { bd = d; best = p; } });
        if (best && bd < 1.0) $('loc-label').value = best.name;   // ~100 км: иначе подпись вводит в заблуждение
        else $('loc-label').value = '';
        previewFromInputs();
        updateLocLive();
      },
    });
    NS.scene = scene; NS.state = state;
    Object.keys(optionsSaved).forEach(k => scene.setOption(k, optionsSaved[k]));
    syncToolbar();

    // континенты (необязательно)
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json()).then(t => scene.setWorld(t)).catch(() => {});
    scene.setCities(cityList());

    lightUpdate(true);
    heavyUpdate();
    updateTimeUI();
    scene.start(tick);
    setTimeout(() => $('loader').classList.add('hide'), 600);
    bind();
    initViews();
    if (firstRun) setTimeout(showWelcome, 1300);
  }

  function select(id) {
    state.selected = state.selected === id ? null : id;
    scene.setSelected(state.selected);
    UI.renderPlanets(states, riseSets, state.selected);
    renderDetail();
    if (state.selected) {
      const p = $('panel-planets'); p.classList.remove('collapsed');
    }
  }

  function syncToolbar() {
    $('btn-aspects').classList.toggle('on', scene.options.aspects);
    $('btn-stars').classList.toggle('on', scene.options.starLabels);
    $('btn-bloom').classList.toggle('on', scene.options.bloom);
    $('btn-view').classList.toggle('on', state.mode === 'helio');
    $('btn-view').textContent = state.mode === 'helio' ? NS.t('btnGeo') : NS.t('btnHelio');
    $('btn-sky').classList.toggle('on', state.mode === 'sky');
    $('planets-hint').textContent = NS.t(state.mode === 'helio' ? 'hintHelio' : state.mode === 'sky' ? 'hintSky' : 'hintGeo');
  }
  function setMode(mode, quiet) {
    if (state.mode === mode) return;
    state.mode = mode;
    scene.setMode(mode);
    syncToolbar();
    if (!quiet) UI.toast(NS.t(mode === 'helio' ? 'helioToast' : mode === 'sky' ? 'skyToast' : 'geoToast'), mode === 'sky' ? 3600 : 2200);
  }
  function toggleSky() { setMode(state.mode === 'sky' ? 'geo' : 'sky'); }
  // Все панели и кнопки скрыты, пока не нажата кнопка в правом верхнем углу
  function setUiOpen(open) {
    document.body.classList.toggle('ui-open', open);
    $('btn-ui').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function toggleOption(k) { scene.setOption(k, !scene.options[k]); save(); syncToolbar(); }
  function toggleMode() { setMode(state.mode === 'helio' ? 'geo' : 'helio'); }

  function bind() {
    $('btn-play').addEventListener('click', () => { state.playing = !state.playing; if (state.playing && state.live) state.live = state.speed === 1; updateTimeUI(); });
    $('btn-now').addEventListener('click', goNow);
    document.querySelectorAll('.tbtn[data-step]').forEach(b => b.addEventListener('click', () => setDate(new Date(state.date.getTime() + parseInt(b.dataset.step, 10) * 1000))));
    $('speed').addEventListener('change', e => { state.speed = parseFloat(e.target.value); state.live = state.speed === 1 && state.live; state.playing = true; if (state.speed !== 1) state.live = false; updateTimeUI(); });
    $('span').addEventListener('change', e => { state.span = parseFloat(e.target.value); state.anchor = new Date(state.date.getTime()); updateTimeUI(); });
    const slider = $('slider');
    slider.addEventListener('pointerdown', () => { dragging = true; });
    slider.addEventListener('input', () => {
      dragging = true;
      const v = parseFloat(slider.value);
      const d = new Date(state.anchor.getTime() + (v - 1000) / 1000 * state.span * 500);
      state.playing = false; setDate(d);
      $('slider-min').textContent = spanLabel(new Date(state.anchor.getTime() - state.span * 500));
      $('slider-max').textContent = spanLabel(new Date(state.anchor.getTime() + state.span * 500));
    });
    const endDrag = () => { if (dragging) { dragging = false; updateTimeUI(); } };
    slider.addEventListener('pointerup', endDrag); slider.addEventListener('change', endDrag); window.addEventListener('pointerup', endDrag);
    $('dt-input').addEventListener('change', e => { const d = new Date(e.target.value); if (!isNaN(d)) { state.playing = false; setDate(d, { anchor: true }); } });

    $('btn-location').addEventListener('click', openLocation);
    $('loc-close').addEventListener('click', closeLocation);
    $('loc-cancel').addEventListener('click', closeLocation);
    $('loc-map').addEventListener('click', enterMapMode);
    $('loc-apply').addEventListener('click', applyLocation);
    $('loc-preset').addEventListener('change', e => {
      const p = NS.PRESETS[parseInt(e.target.value, 10)];
      if (p) { $('loc-lat').value = p.lat; $('loc-lon').value = p.lon; $('loc-label').value = p.name; previewFromInputs(); }
    });
    ['loc-lat', 'loc-lon'].forEach(id => $(id).addEventListener('input', previewFromInputs));
    $('loc-geo').addEventListener('click', () => locateGps(o => {
      $('loc-lat').value = o.lat.toFixed(2); $('loc-lon').value = o.lon.toFixed(2);
      $('loc-preset').value = ''; $('loc-label').value = o.name;
      previewFromInputs();
      UI.toast(NS.t('gotCoords'));
    }));
    // окно первого запуска
    $('welcome-use').addEventListener('click', () => { closeWelcome(true); UI.toast(NS.t('placeSet', { n: state.observer.name })); });
    $('welcome-gps').addEventListener('click', () => locateGps(o => { setObserver(o); closeWelcome(false); UI.toast(NS.t('gpsDone') + ' · ' + o.name); }));
    $('welcome-manual').addEventListener('click', () => { closeWelcome(false); openLocation(); });
    $('welcome-close').addEventListener('click', () => closeWelcome(!!(guess && guess.observer)));
    $('modal-welcome').addEventListener('click', e => { if (e.target === $('modal-welcome')) closeWelcome(!!(guess && guess.observer)); });
    $('modal-location').addEventListener('click', e => { if (e.target === $('modal-location')) closeLocation(); });

    $('btn-help').addEventListener('click', () => { $('modal-help').hidden = false; });
    $('lang').addEventListener('change', e => NS.I18N.setLang(e.target.value));
    $('help-close').addEventListener('click', () => { $('modal-help').hidden = true; });
    $('modal-help').addEventListener('click', e => { if (e.target === $('modal-help')) $('modal-help').hidden = true; });

    $('btn-view').addEventListener('click', toggleMode);
    $('btn-sky').addEventListener('click', toggleSky);
    $('btn-ui').addEventListener('click', () => setUiOpen(!document.body.classList.contains('ui-open')));
    // полоса времени сворачивается до одной строки кнопок
    let tfold = false;
    try { tfold = localStorage.getItem('astroscape.timefold') === '1'; } catch (e) {}
    $('timebar').classList.toggle('collapsed', tfold);
    $('btn-timefold').addEventListener('click', () => {
      const c = $('timebar').classList.toggle('collapsed');
      try { localStorage.setItem('astroscape.timefold', c ? '1' : '0'); } catch (e) {}
    });
    $('btn-top').addEventListener('click', () => scene.topView());
    $('btn-reset').addEventListener('click', () => scene.resetView());
    $('btn-aspects').addEventListener('click', () => toggleOption('aspects'));
    $('btn-stars').addEventListener('click', () => toggleOption('starLabels'));
    $('btn-bloom').addEventListener('click', () => toggleOption('bloom'));

    window.addEventListener('keydown', e => {
      if (e.target.matches('input, select, textarea')) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') { e.preventDefault(); $('btn-play').click(); }
      else if (e.key === 'ArrowLeft') setDate(new Date(state.date.getTime() - (e.shiftKey ? 86400 : 3600) * 1000));
      else if (e.key === 'ArrowRight') setDate(new Date(state.date.getTime() + (e.shiftKey ? 86400 : 3600) * 1000));
      else if (k === 'n' || k === 'т') goNow();
      else if (k === 'h' || k === 'р') toggleMode();
      else if (k === 'v' || k === 'м') toggleSky();
      else if (k === 't' || k === 'е') scene.topView();
      else if (k === 'r' || k === 'к') scene.resetView();
      else if (k === 'a' || k === 'ф') toggleOption('aspects');
      else if (k === 'b' || k === 'и') toggleOption('bloom');
      else if (k === 's' || k === 'ы') toggleOption('starLabels');
      else if (k === 'l' || k === 'д') openLocation();
      else if (e.key === '?' || e.key === '/') $('modal-help').hidden = !$('modal-help').hidden;
      else if (e.key === 'Escape') { closeLocation(); closeWelcome(!!(guess && guess.observer)); $('modal-help').hidden = true; if (state.selected) select(state.selected); }
    });
  }
})(window.AstroScape);
