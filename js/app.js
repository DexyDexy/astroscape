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

  // ---------- сохранение ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('astroscape.state') || '{}');
      if (s.observer && isFinite(s.observer.lat)) {
        state.observer = s.observer;
        // город из списка — берём имя на текущем языке (старые записи без preset сопоставляем по координатам)
        let idx = s.observer.preset;
        if (idx == null) idx = NS.PRESETS.findIndex(p => p.lat === s.observer.lat && p.lon === s.observer.lon);
        if (idx != null && idx >= 0 && NS.PRESETS[idx]) { state.observer.name = NS.PRESETS[idx].name; state.observer.preset = idx; }
      }
      if (s.options) Object.assign(optionsSaved, s.options);
    } catch (e) {}
  }
  const optionsSaved = { aspects: true, bloom: true, starLabels: true };
  function save() {
    try { localStorage.setItem('astroscape.state', JSON.stringify({ observer: state.observer, options: scene ? scene.options : optionsSaved })); } catch (e) {}
  }

  // ---------- расчёты ----------
  function setObserver(o) {
    state.observer = o;
    obsObj = Astro.observer(o.lat, o.lon);
    lastLightMs = -Infinity; lastHeavyMs = -Infinity;
    save();
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
  function openLocation() {
    const m = $('modal-location'); m.hidden = false;
    $('loc-lat').value = state.observer.lat.toFixed(4);
    $('loc-lon').value = state.observer.lon.toFixed(4);
    $('loc-label').value = state.observer.name;
    $('loc-preset').value = '';
    scene.setPickGlobe(true);
  }
  function closeLocation() { $('modal-location').hidden = true; scene.setPickGlobe(false); }
  function applyLocation() {
    const lat = parseFloat($('loc-lat').value), lon = parseFloat($('loc-lon').value);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { UI.toast(NS.t('checkCoords')); return; }
    const presetIdx = NS.PRESETS.findIndex(p => p.lat === lat && p.lon === lon);
    const name = presetIdx >= 0 ? NS.PRESETS[presetIdx].name : ($('loc-label').value.trim() || (lat.toFixed(2) + ', ' + lon.toFixed(2)));
    setObserver({ name, lat, lon, preset: presetIdx >= 0 ? presetIdx : undefined });
    closeLocation();
    UI.toast(NS.t('placeSet', { n: name }));
  }

  // ---------- запуск ----------
  NS.boot = function (libs) {
    NS.I18N.init();
    const p0 = NS.PRESETS[0];
    state.observer = { name: p0.name, lat: p0.lat, lon: p0.lon, preset: 0 };
    load();
    setObserver(state.observer);
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
        if (best && bd < 3) $('loc-label').value = best.name;
      },
    });
    NS.scene = scene; NS.state = state;
    Object.keys(optionsSaved).forEach(k => scene.setOption(k, optionsSaved[k]));
    syncToolbar();

    // континенты (необязательно)
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(r => r.json()).then(t => scene.setContinents(t)).catch(() => {});

    lightUpdate(true);
    heavyUpdate();
    updateTimeUI();
    scene.start(tick);
    setTimeout(() => $('loader').classList.add('hide'), 600);
    bind();
  };

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
    $('planets-hint').textContent = state.mode === 'helio' ? NS.t('hintHelio') : NS.t('hintGeo');
  }
  function toggleOption(k) { scene.setOption(k, !scene.options[k]); save(); syncToolbar(); }
  function toggleMode() {
    state.mode = state.mode === 'geo' ? 'helio' : 'geo';
    scene.setMode(state.mode);
    syncToolbar();
    UI.toast(state.mode === 'helio' ? NS.t('helioToast') : NS.t('geoToast'));
  }

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
    $('loc-apply').addEventListener('click', applyLocation);
    $('loc-preset').addEventListener('change', e => {
      const p = NS.PRESETS[parseInt(e.target.value, 10)];
      if (p) { $('loc-lat').value = p.lat; $('loc-lon').value = p.lon; $('loc-label').value = p.name; }
    });
    $('loc-geo').addEventListener('click', () => {
      if (!navigator.geolocation) { UI.toast(NS.t('noGeo')); return; }
      UI.toast(NS.t('locating'));
      navigator.geolocation.getCurrentPosition(pos => {
        $('loc-lat').value = pos.coords.latitude.toFixed(4); $('loc-lon').value = pos.coords.longitude.toFixed(4);
        if (!$('loc-label').value) $('loc-label').value = NS.t('namePh');
        UI.toast(NS.t('gotCoords'));
      }, () => UI.toast(NS.t('geoFail')), { timeout: 10000 });
    });
    $('modal-location').addEventListener('click', e => { if (e.target === $('modal-location')) closeLocation(); });

    $('btn-help').addEventListener('click', () => { $('modal-help').hidden = false; });
    $('lang').addEventListener('change', e => NS.I18N.setLang(e.target.value));
    $('help-close').addEventListener('click', () => { $('modal-help').hidden = true; });
    $('modal-help').addEventListener('click', e => { if (e.target === $('modal-help')) $('modal-help').hidden = true; });

    $('btn-view').addEventListener('click', toggleMode);
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
      else if (k === 't' || k === 'е') scene.topView();
      else if (k === 'r' || k === 'к') scene.resetView();
      else if (k === 'a' || k === 'ф') toggleOption('aspects');
      else if (k === 'b' || k === 'и') toggleOption('bloom');
      else if (k === 's' || k === 'ы') toggleOption('starLabels');
      else if (k === 'l' || k === 'д') openLocation();
      else if (e.key === '?' || e.key === '/') $('modal-help').hidden = !$('modal-help').hidden;
      else if (e.key === 'Escape') { closeLocation(); $('modal-help').hidden = true; if (state.selected) select(state.selected); }
    });
  }
})(window.AstroScape);
