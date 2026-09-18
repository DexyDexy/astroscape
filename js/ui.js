/* AstroScape — интерфейс (DOM) */
(function (NS) {
  'use strict';
  const $ = id => document.getElementById(id);
  const DAY = 86400000;

  // ---------- форматирование ----------
  const pad = n => String(n).padStart(2, '0');
  const fmt = {
    time: d => d ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '—',
    timeS: d => pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()),
    date: d => d.getDate() + ' ' + NS.MONTHS_GEN[d.getMonth()] + ' ' + d.getFullYear(),
    dateW: d => NS.WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + NS.MONTHS_GEN[d.getMonth()] + ' ' + d.getFullYear(),
    short: (d, ref) => {
      if (!d) return '—';
      const s = d.getDate() + ' ' + NS.MONTHS_GEN[d.getMonth()].slice(0, 3);
      return (ref && d.getFullYear() !== ref.getFullYear()) ? s + ' ' + d.getFullYear() : s;
    },
    dt: (d, ref) => d ? fmt.short(d, ref) + ', ' + fmt.time(d) : '—',
    utc: d => pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' · ' + d.getUTCDate() + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear(),
    rel: (d, ref) => {
      if (!d) return '';
      let ms = d - ref; const past = ms < 0; ms = Math.abs(ms);
      const dd = Math.floor(ms / DAY), hh = Math.floor((ms % DAY) / 3600000), mm = Math.floor((ms % 3600000) / 60000);
      let s;
      if (dd >= 365) s = (ms / DAY / 365.25).toFixed(1) + ' г.';
      else if (dd >= 60) s = dd + ' д';
      else if (dd > 0) s = dd + ' д ' + hh + ' ч';
      else if (hh > 0) s = hh + ' ч ' + mm + ' мин';
      else s = mm + ' мин';
      return past ? s + ' назад' : 'через ' + s;
    },
    hours: h => h == null ? '—' : Math.floor(h) + ' ч ' + pad(Math.round((h % 1) * 60)) + ' мин',
    hms: h => { const H = Math.floor(h), M = Math.floor((h % 1) * 60), S = Math.floor((((h % 1) * 60) % 1) * 60); return pad(H) + ':' + pad(M) + ':' + pad(S); },
    deg: (x, n) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(n == null ? 1 : n) + '°',
    signPos: s => s.deg + '°' + pad(s.min) + '′ ' + NS.ZODIAC[s.signIdx].glyph + ' ' + NS.ZODIAC[s.signIdx].ru,
    km: x => Math.round(x).toLocaleString('ru-RU') + ' км',
    tz: () => { const o = -new Date().getTimezoneOffset(); const h = Math.trunc(o / 60), m = Math.abs(o % 60); return 'UTC' + (o >= 0 ? '+' : '−') + Math.abs(h) + (m ? ':' + pad(m) : ''); },
    coords: (lat, lon) => Math.abs(lat).toFixed(3) + '°' + (lat >= 0 ? 'N' : 'S') + '  ' + Math.abs(lon).toFixed(3) + '°' + (lon >= 0 ? 'E' : 'W'),
    dtLocalInput: d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
  };
  NS.fmt = fmt;

  const setText = (id, txt) => { const el = $(id); if (el && el.textContent !== txt) el.textContent = txt; };
  const setHTML = (id, html) => { const el = $(id); if (el && el.innerHTML !== html) el.innerHTML = html; };

  // ---------- часы ----------
  function renderClock(date, obs, live) {
    setText('clock-time', fmt.timeS(date));
    setText('clock-date', fmt.dateW(date) + ' · ' + fmt.tz());
    setText('clock-utc', fmt.utc(date));
    setText('clock-jd', NS.Astro.jd(date).toFixed(5));
    setText('clock-lst', fmt.hms(NS.Astro.lst(date, obs.lon)));
    setText('loc-name', obs.name);
    setText('loc-coords', fmt.coords(obs.lat, obs.lon));
  }

  // ---------- планеты ----------
  let rowsBuilt = false;
  function buildRows(onSelect) {
    const tb = $('planets-table').querySelector('tbody');
    tb.innerHTML = '';
    NS.BODIES.forEach(b => {
      const tr = document.createElement('tr'); tr.dataset.id = b.id;
      tr.innerHTML = '<td class="g" style="color:' + b.color + '">' + b.glyph + '</td><td class="n">' + b.ru + '<span class="rx"></span></td><td class="pos"></td><td class="alt"></td><td class="rs"></td>';
      tr.addEventListener('click', () => onSelect(b.id));
      tb.appendChild(tr);
    });
    rowsBuilt = true;
  }
  function renderPlanets(states, riseSets, selected) {
    const tb = $('planets-table').querySelector('tbody');
    NS.BODIES.forEach(b => {
      const s = states[b.id]; const tr = tb.querySelector('tr[data-id="' + b.id + '"]');
      if (!tr || !s) return;
      const z = NS.ZODIAC[s.signIdx];
      setHTMLel(tr.children[1].querySelector('.rx'), s.retro ? '℞' : '');
      setHTMLel(tr.children[2], '<span class="sg" style="color:' + NS.ELEMENT_COLOR[z.el] + '">' + z.glyph + '</span>' + s.deg + '°' + pad(s.min) + '′');
      setHTMLel(tr.children[3], '<span class="' + (s.above ? 'up' : 'dn') + '">' + (s.above ? '↑' : '↓') + fmt.deg(s.alt, 0) + '</span> <span style="opacity:.6">' + Math.round(s.az) + '°</span>');
      const rs = riseSets && riseSets[b.id];
      setHTMLel(tr.children[4], rs ? fmt.time(rs.rise) + ' · ' + fmt.time(rs.set) : '…');
      tr.classList.toggle('below', !s.above);
      tr.classList.toggle('sel', selected === b.id);
    });
  }
  function setHTMLel(el, html) { if (el.innerHTML !== html) el.innerHTML = html; }

  function renderDetail(id, s, rs, date) {
    const box = $('planet-detail');
    if (!id || !s) { box.classList.remove('show'); box.innerHTML = ''; return; }
    const b = NS.BODY[id];
    const rows = [];
    rows.push(['Положение', fmt.signPos(s)]);
    if (s.constellation) rows.push(['Созвездие (астрон.)', NS.CONSTELLATIONS_RU[s.constellation] || s.constellation]);
    rows.push(['Скорость', (s.speed >= 0 ? '+' : '−') + Math.abs(s.speed).toFixed(2) + '°/сут' + (s.retro ? ' · ретроградно' : '')]);
    rows.push(['Расстояние', id === 'Moon' ? fmt.km(s.distKm) : s.distAU.toFixed(3) + ' а.е. · ' + (s.distKm / 1e6).toFixed(1) + ' млн км']);
    if (s.mag != null && isFinite(s.mag)) rows.push(['Блеск', (s.mag >= 0 ? '+' : '−') + Math.abs(s.mag).toFixed(1) + 'ᵐ']);
    if (s.phaseFraction != null && id !== 'Sun') rows.push(['Освещённость', Math.round(s.phaseFraction * 100) + ' %']);
    if (s.elongation != null) rows.push(['Элонгация от Солнца', s.elongation.toFixed(1) + '°']);
    rows.push(['Высота / азимут', fmt.deg(s.alt) + ' / ' + s.az.toFixed(1) + '°']);
    rows.push(['α / δ (экватор.)', fmt.hms(s.ra) + ' / ' + fmt.deg(s.dec)]);
    rows.push(['Экл. широта', fmt.deg(s.lat, 2)]);
    if (rs) rows.push(['Восход · заход', fmt.time(rs.rise) + ' · ' + fmt.time(rs.set)]);
    box.innerHTML = '<h3 style="color:' + b.color + '">' + b.glyph + ' ' + b.ru + '</h3><div class="kv">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>';
    box.classList.add('show');
  }

  // ---------- Луна ----------
  function drawMoon(canvas, phase, frac, southern) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, cx = W / 2, cy = W / 2, R = W * 0.42;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    if (southern) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    // тёмный диск
    ctx.fillStyle = '#0d1420';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // светлая половина
    const waxing = phase < 180;
    const light = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    light.addColorStop(0, '#ffffff'); light.addColorStop(1, '#c9d3dd');
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, !waxing); ctx.fill();
    // терминатор
    const k = Math.cos(phase * Math.PI / 180);
    ctx.fillStyle = k > 0 ? '#0d1420' : light;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.001, R * Math.abs(k)), R, 0, 0, Math.PI * 2); ctx.fill();
    // «моря»
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120,135,155,0.35)';
    [[-0.25, -0.3, 0.28], [0.2, -0.15, 0.2], [0.05, 0.25, 0.16], [-0.4, 0.15, 0.14], [0.35, 0.3, 0.1]].forEach(m => {
      ctx.beginPath(); ctx.arc(cx + m[0] * R, cy + m[1] * R, m[2] * R, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // контур
    ctx.strokeStyle = 'rgba(127,215,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.stroke();
  }

  function renderMoon(mi, ms, date, obs) {
    drawMoon($('moon-canvas'), mi.phase, mi.frac, obs.lat < 0);
    setText('moon-phase-name', mi.phaseName + (mi.waxing ? ' ↑' : ' ↓'));
    setText('moon-illum', (mi.frac * 100).toFixed(1) + ' %');
    setText('moon-age', mi.age.toFixed(1) + ' сут');
    setText('moon-sign', ms ? fmt.signPos(ms) : '—');
    setText('moon-dist', ms ? fmt.km(ms.distKm) : '—');
    setText('moon-riseset', fmt.time(mi.riseSet.rise) + ' · ' + fmt.time(mi.riseSet.set));
    setText('moon-next-new', fmt.dt(mi.nextNew, date));
    setText('moon-next-new-in', fmt.rel(mi.nextNew, date));
    setText('moon-next-full', fmt.dt(mi.nextFull, date));
    setText('moon-next-full-in', fmt.rel(mi.nextFull, date));
    setHTML('moon-quarters', mi.quarters.map(q => '<li><span class="l"><span style="width:14px;text-align:center">' + NS.QUARTER_ICONS[q.q] + '</span>' + NS.QUARTER_NAMES[q.q] + '</span><span class="r"><b>' + fmt.dt(q.date, date) + '</b><small>' + fmt.rel(q.date, date) + '</small></span></li>').join(''));
    if (mi.apsis) setText('moon-apsis', (mi.apsis.kind === 0 ? 'перигей ' : 'апогей ') + fmt.short(mi.apsis.date, date) + ' · ' + Math.round(mi.apsis.km / 1000) + ' тыс. км');
  }

  // ---------- Солнце ----------
  function renderSun(si, ss, date) {
    setText('sun-rise', fmt.time(si.rise) + (si.dawn ? '  (рассвет ' + fmt.time(si.dawn) + ')' : ''));
    setText('sun-set', fmt.time(si.set) + (si.dusk ? '  (сумерки до ' + fmt.time(si.dusk) + ')' : ''));
    setText('sun-daylen', si.dayLen == null ? (ss && ss.alt > 0 ? 'полярный день' : 'полярная ночь') : fmt.hours(si.dayLen));
    setText('sun-noon', si.noon ? fmt.time(si.noon) : '—');
    setText('sun-twilight', (si.dawn ? fmt.time(si.dawn) : '—') + ' · ' + (si.dusk ? fmt.time(si.dusk) : '—'));
    setText('sun-altaz', ss ? fmt.deg(ss.alt) + ' / ' + ss.az.toFixed(0) + '°' : '—');
    setText('sun-sign', ss ? fmt.signPos(ss) : '—');
    setText('sun-hint', ss ? (ss.above ? 'день · ' + fmt.deg(ss.alt, 0) : ss.alt > -6 ? 'сумерки' : ss.alt > -18 ? 'глубокие сумерки' : 'ночь') : '');
    setHTML('seasons-list', si.seasons.map(e => '<li><span class="l">' + (e.k === 'eq' ? '⚖' : '☀') + ' ' + e.name + '</span><span class="r"><b>' + fmt.dt(e.date, date) + '</b><small>' + fmt.rel(e.date, date) + '</small></span></li>').join(''));
  }

  // ---------- ретроградность ----------
  function renderRetro(list, date) {
    const html = list.map(r => {
      const b = NS.BODY[r.id];
      let tag, txt;
      const hoursToStation = r.endDate ? Math.abs(r.endDate - date) / 3600000 : 999;
      const hoursFromStation = r.startDate ? Math.abs(date - r.startDate) / 3600000 : 999;
      const station = Math.min(hoursToStation, hoursFromStation) < 36;
      if (r.retro) {
        tag = '<span class="tag retro">℞ ретро</span>';
        txt = (r.startDate ? 'с ' + fmt.short(r.startDate, date) : '') + (r.endDate ? ' до <b>' + fmt.dt(r.endDate, date) + '</b> · ' + fmt.rel(r.endDate, date) : '');
      } else {
        tag = '<span class="tag direct">директ</span>';
        txt = r.endDate ? 'следующий ℞: <b>' + fmt.short(r.endDate, date) + '</b>' + (r.nextRetroEnd ? ' – ' + fmt.short(r.nextRetroEnd, date) : '') + ' · ' + fmt.rel(r.endDate, date) : 'нет данных';
      }
      if (station) tag += ' <span class="tag station">стоянка</span>';
      return '<li' + (r.retro ? ' class="now"' : '') + '><span class="l"><span style="color:' + b.color + ';font-size:15px">' + b.glyph + '</span>' + b.ru + ' ' + tag + '</span><span class="r">' + txt + '</span></li>';
    }).join('');
    setHTML('retro-list', html);
    const m = list.find(r => r.id === 'Mercury');
    const n = list.filter(r => r.retro).length;
    setText('retro-hint', m ? (m.retro ? 'Меркурий ℞ до ' + fmt.short(m.endDate, date) : 'Меркурий директный') + (n ? ' · ретро: ' + n : '') : '');
  }

  // ---------- аспекты ----------
  function renderAspects(list) {
    const html = list.slice(0, 16).map(a => {
      const A = NS.BODY[a.a], B = NS.BODY[a.b];
      return '<li><span class="l"><span class="g" style="color:' + A.color + '">' + A.glyph + '</span><span class="asp" style="color:' + a.aspect.color + '">' + a.aspect.sym + '</span><span class="g" style="color:' + B.color + '">' + B.glyph + '</span> ' + a.aspect.name + '</span><span class="r"><b>' + a.orb.toFixed(1) + '°</b> · ' + (a.applying ? 'сходящийся' : 'расходящийся') + '</span></li>';
    }).join('') || '<li><span class="l">нет точных аспектов</span></li>';
    setHTML('aspects-list', html);
    setText('aspects-hint', list.length + ' актив.' + (list.length ? ' · точнейший ' + NS.BODY[list[0].a].glyph + list[0].aspect.sym + NS.BODY[list[0].b].glyph : ''));
  }

  // ---------- затмения ----------
  function renderEclipses(e, date) {
    const items = [];
    if (e.lunar) items.push('<li><span class="l">☽ Лунное · ' + NS.ECLIPSE_KIND[e.lunar.kind] + '</span><span class="r"><b>' + fmt.dt(e.lunar.peak, date) + '</b><small>' + fmt.rel(e.lunar.peak, date) + '</small></span></li>');
    if (e.solar) items.push('<li><span class="l">☉ Солнечное · ' + NS.ECLIPSE_KIND[e.solar.kind] + '</span><span class="r"><b>' + fmt.dt(e.solar.peak, date) + '</b><small>' + fmt.rel(e.solar.peak, date) + '</small><small>макс. ' + fmt.coords(e.solar.lat, e.solar.lon) + '</small></span></li>');
    if (e.local) items.push('<li><span class="l">◎ В вашей точке · ' + NS.ECLIPSE_KIND[e.local.kind] + ' ' + Math.round(e.local.obscuration * 100) + ' %</span><span class="r"><b>' + fmt.dt(e.local.peak, date) + '</b> · ' + fmt.rel(e.local.peak, date) + (e.local.begin ? '<br>' + fmt.time(e.local.begin) + ' – ' + fmt.time(e.local.end) : '') + '</span></li>');
    setHTML('eclipse-list', items.join(''));
    const next = [e.lunar && e.lunar.peak, e.solar && e.solar.peak].filter(Boolean).sort((a, b) => a - b)[0];
    setText('eclipse-hint', next ? 'ближайшее ' + fmt.short(next, date) : '');
  }

  // ---------- панели / модалки / тосты ----------
  function initPanels() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('astroscape.panels') || '{}'); } catch (e) {}
    document.querySelectorAll('.panel.collapsible').forEach(p => {
      if (saved[p.id] != null) p.classList.toggle('collapsed', saved[p.id]);
      p.querySelector('header').addEventListener('click', () => {
        p.classList.toggle('collapsed');
        saved[p.id] = p.classList.contains('collapsed');
        try { localStorage.setItem('astroscape.panels', JSON.stringify(saved)); } catch (e) {}
      });
    });
  }
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2200);
  }
  function fillPresets() {
    const sel = $('loc-preset');
    sel.innerHTML = '<option value="">— выбрать город —</option>' + NS.PRESETS.map((p, i) => '<option value="' + i + '">' + p.name + '</option>').join('');
  }

  NS.UI = { renderClock, buildRows, renderPlanets, renderDetail, renderMoon, renderSun, renderRetro, renderAspects, renderEclipses, initPanels, toast, fillPresets, drawMoon };
})(window.AstroScape);
