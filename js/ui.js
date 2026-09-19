/* AstroScape — интерфейс (DOM) */
(function (NS) {
  'use strict';
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const t = (k, p) => NS.t(k, p);

  // ---------- форматирование (Intl + словарь единиц) ----------
  const pad = n => String(n).padStart(2, '0');
  const dfCache = {};
  function df(opts) {
    const key = NS.I18N.intl + JSON.stringify(opts);
    return dfCache[key] || (dfCache[key] = new Intl.DateTimeFormat(NS.I18N.intl, opts));
  }
  let nf = null;
  const num = x => (nf || (nf = new Intl.NumberFormat(NS.I18N.intl))).format(x);
  const U = () => NS.L.units;

  const fmt = {
    time: d => d ? df({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d) : '—',
    timeS: d => df({ hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(d),
    date: d => df({ day: 'numeric', month: 'long', year: 'numeric' }).format(d),
    dateW: d => df({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d),
    short: (d, ref) => {
      if (!d) return '—';
      const withYear = ref && d.getFullYear() !== ref.getFullYear();
      return df(withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).format(d);
    },
    dt: (d, ref) => d ? fmt.short(d, ref) + ', ' + fmt.time(d) : '—',
    utc: d => df({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(d) + ' · ' + df({ day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d),
    rel: (d, ref) => {
      if (!d) return '';
      const u = U();
      let ms = d - ref; const past = ms < 0; ms = Math.abs(ms);
      const dd = Math.floor(ms / DAY), hh = Math.floor((ms % DAY) / 3600000), mm = Math.floor((ms % 3600000) / 60000);
      let s;
      if (dd >= 365) s = (ms / DAY / 365.25).toFixed(1) + ' ' + u.y;
      else if (dd >= 60) s = dd + ' ' + u.d;
      else if (dd > 0) s = dd + ' ' + u.d + ' ' + hh + ' ' + u.h;
      else if (hh > 0) s = hh + ' ' + u.h + ' ' + mm + ' ' + u.min;
      else s = mm + ' ' + u.min;
      return (past ? NS.L.rel.past : NS.L.rel.future).replace('{x}', s);
    },
    hours: h => h == null ? '—' : Math.floor(h) + ' ' + U().h + ' ' + pad(Math.round((h % 1) * 60)) + ' ' + U().min,
    hms: h => { const H = Math.floor(h), M = Math.floor((h % 1) * 60), S = Math.floor((((h % 1) * 60) % 1) * 60); return pad(H) + ':' + pad(M) + ':' + pad(S); },
    deg: (x, n) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(n == null ? 1 : n) + '°',
    signPos: s => s.deg + '°' + pad(s.min) + '′ ' + NS.ZODIAC[s.signIdx].glyph + ' ' + NS.ZODIAC[s.signIdx].name,
    km: x => num(Math.round(x)) + ' ' + U().km,
    tz: () => { const o = -new Date().getTimezoneOffset(); const h = Math.trunc(o / 60), m = Math.abs(o % 60); return 'UTC' + (o >= 0 ? '+' : '−') + Math.abs(h) + (m ? ':' + pad(m) : ''); },
    coords: (lat, lon) => { const c = NS.L.cardinal; return Math.abs(lat).toFixed(3) + '°' + (lat >= 0 ? c.N : c.S) + '  ' + Math.abs(lon).toFixed(3) + '°' + (lon >= 0 ? c.E : c.W); },
    dtLocalInput: d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
  };
  NS.fmt = fmt;

  const setText = (id, txt) => { const el = $(id); if (el && el.textContent !== txt) el.textContent = txt; };
  const setHTML = (id, html) => { const el = $(id); if (el && el.innerHTML !== html) el.innerHTML = html; };

  // ---------- часы ----------
  function renderClock(date, obs) {
    setText('clock-time', fmt.timeS(date));
    setText('clock-date', fmt.dateW(date) + ' · ' + fmt.tz());
    setText('clock-utc', fmt.utc(date));
    setText('clock-jd', NS.Astro.jd(date).toFixed(5));
    setText('clock-lst', fmt.hms(NS.Astro.lst(date, obs.lon)));
    setText('loc-name', obs.name);
    setText('loc-coords', fmt.coords(obs.lat, obs.lon));
  }

  // ---------- планеты ----------
  function buildRows(onSelect) {
    const tb = $('planets-table').querySelector('tbody');
    tb.innerHTML = '';
    NS.BODIES.forEach(b => {
      const tr = document.createElement('tr'); tr.dataset.id = b.id;
      tr.innerHTML = '<td class="g" style="color:' + b.color + '">' + b.glyph + '</td><td class="n">' + b.name + '<span class="rx"></span></td><td class="pos"></td><td class="alt"></td><td class="rs"></td>';
      tr.addEventListener('click', () => onSelect(b.id));
      tb.appendChild(tr);
    });
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

  function renderDetail(id, s, rs) {
    const box = $('planet-detail');
    if (!id || !s) { box.classList.remove('show'); box.innerHTML = ''; return; }
    const b = NS.BODY[id], u = U();
    const rows = [];
    rows.push([t('position'), fmt.signPos(s)]);
    if (s.constellation) rows.push([t('constellation'), NS.CONSTELLATIONS[s.constellation] || s.constellation]);
    rows.push([t('speed'), (s.speed >= 0 ? '+' : '−') + Math.abs(s.speed).toFixed(2) + u.degday + (s.retro ? ' · ' + t('retroWord') : '')]);
    rows.push([t('distance'), id === 'Moon' ? fmt.km(s.distKm) : s.distAU.toFixed(3) + ' ' + u.au + ' · ' + (s.distKm / 1e6).toFixed(1) + ' ' + u.Mkm]);
    if (s.mag != null && isFinite(s.mag)) rows.push([t('mag'), (s.mag >= 0 ? '+' : '−') + Math.abs(s.mag).toFixed(1) + 'ᵐ']);
    if (s.phaseFraction != null && id !== 'Sun') rows.push([t('illum'), Math.round(s.phaseFraction * 100) + ' %']);
    if (s.elongation != null) rows.push([t('elong'), s.elongation.toFixed(1) + '°']);
    rows.push([t('altAz'), fmt.deg(s.alt) + ' / ' + s.az.toFixed(1) + '°']);
    rows.push([t('raDec'), fmt.hms(s.ra) + ' / ' + fmt.deg(s.dec)]);
    rows.push([t('eclLat'), fmt.deg(s.lat, 2)]);
    if (rs) rows.push([t('riseSetDot'), fmt.time(rs.rise) + ' · ' + fmt.time(rs.set)]);
    box.innerHTML = '<h3 style="color:' + b.color + '">' + b.glyph + ' ' + b.name + '</h3><div class="kv">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>';
    box.classList.add('show');
  }

  // ---------- Луна ----------
  function drawMoon(canvas, phase, frac, southern) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, cx = W / 2, cy = W / 2, R = W * 0.42;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    if (southern) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = '#0d1420';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    const waxing = phase < 180;
    const light = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    light.addColorStop(0, '#ffffff'); light.addColorStop(1, '#c9d3dd');
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, !waxing); ctx.fill();
    const k = Math.cos(phase * Math.PI / 180);
    ctx.fillStyle = k > 0 ? '#0d1420' : light;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.001, R * Math.abs(k)), R, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(120,135,155,0.35)';
    [[-0.25, -0.3, 0.28], [0.2, -0.15, 0.2], [0.05, 0.25, 0.16], [-0.4, 0.15, 0.14], [0.35, 0.3, 0.1]].forEach(m => {
      ctx.beginPath(); ctx.arc(cx + m[0] * R, cy + m[1] * R, m[2] * R, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    ctx.strokeStyle = 'rgba(127,215,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.stroke();
  }

  function renderMoon(mi, ms, date, obs) {
    drawMoon($('moon-canvas'), mi.phase, mi.frac, obs.lat < 0);
    setText('moon-phase-name', mi.phaseName + (mi.waxing ? ' ↑' : ' ↓'));
    setText('moon-illum', (mi.frac * 100).toFixed(1) + ' %');
    setText('moon-age', mi.age.toFixed(1) + ' ' + U().days);
    setText('moon-sign', ms ? fmt.signPos(ms) : '—');
    setText('moon-dist', ms ? fmt.km(ms.distKm) : '—');
    setText('moon-riseset', fmt.time(mi.riseSet.rise) + ' · ' + fmt.time(mi.riseSet.set));
    setText('moon-next-new', fmt.dt(mi.nextNew, date));
    setText('moon-next-new-in', fmt.rel(mi.nextNew, date));
    setText('moon-next-full', fmt.dt(mi.nextFull, date));
    setText('moon-next-full-in', fmt.rel(mi.nextFull, date));
    setHTML('moon-quarters', mi.quarters.map(q => '<li><span class="l"><span style="width:14px;text-align:center">' + NS.QUARTER_ICONS[q.q] + '</span>' + NS.QUARTER_NAMES[q.q] + '</span><span class="r"><b>' + fmt.dt(q.date, date) + '</b><small>' + fmt.rel(q.date, date) + '</small></span></li>').join(''));
    if (mi.apsis) setText('moon-apsis', (mi.apsis.kind === 0 ? t('perigee') : t('apogee')) + ' ' + fmt.short(mi.apsis.date, date) + ' · ' + Math.round(mi.apsis.km / 1000) + ' ' + U().kkm);
  }

  // ---------- Солнце ----------
  function renderSun(si, ss, date) {
    setText('sun-rise', fmt.time(si.rise) + (si.dawn ? '  (' + t('dawn') + ' ' + fmt.time(si.dawn) + ')' : ''));
    setText('sun-set', fmt.time(si.set) + (si.dusk ? '  (' + t('duskUntil') + ' ' + fmt.time(si.dusk) + ')' : ''));
    setText('sun-daylen', si.dayLen == null ? (ss && ss.alt > 0 ? t('polarDay') : t('polarNight')) : fmt.hours(si.dayLen));
    setText('sun-noon', si.noon ? fmt.time(si.noon) : '—');
    setText('sun-twilight', (si.dawn ? fmt.time(si.dawn) : '—') + ' · ' + (si.dusk ? fmt.time(si.dusk) : '—'));
    setText('sun-altaz', ss ? fmt.deg(ss.alt) + ' / ' + ss.az.toFixed(0) + '°' : '—');
    setText('sun-sign', ss ? fmt.signPos(ss) : '—');
    setText('sun-hint', ss ? (ss.above ? t('day') + ' · ' + fmt.deg(ss.alt, 0) : ss.alt > -6 ? t('twilightWord') : ss.alt > -18 ? t('deepTwilight') : t('night')) : '');
    setHTML('seasons-list', si.seasons.map(e => '<li><span class="l">' + (e.k === 'eq' ? '⚖' : '☀') + ' ' + NS.L.seasons[e.key] + '</span><span class="r"><b>' + fmt.dt(e.date, date) + '</b><small>' + fmt.rel(e.date, date) + '</small></span></li>').join(''));
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
        tag = '<span class="tag retro">' + t('tagRetro') + '</span>';
        txt = (r.startDate ? t('from') + ' ' + fmt.short(r.startDate, date) : '') + (r.endDate ? ' ' + t('until') + ' <b>' + fmt.dt(r.endDate, date) + '</b> · ' + fmt.rel(r.endDate, date) : '');
      } else {
        tag = '<span class="tag direct">' + t('tagDirect') + '</span>';
        txt = r.endDate ? t('nextRx') + ' <b>' + fmt.short(r.endDate, date) + '</b>' + (r.nextRetroEnd ? ' – ' + fmt.short(r.nextRetroEnd, date) : '') + ' · ' + fmt.rel(r.endDate, date) : t('noData');
      }
      if (station) tag += ' <span class="tag station">' + t('tagStation') + '</span>';
      return '<li' + (r.retro ? ' class="now"' : '') + '><span class="l"><span style="color:' + b.color + ';font-size:15px">' + b.glyph + '</span>' + b.name + ' ' + tag + '</span><span class="r">' + txt + '</span></li>';
    }).join('');
    setHTML('retro-list', html);
    const m = list.find(r => r.id === 'Mercury');
    const n = list.filter(r => r.retro).length;
    setText('retro-hint', m ? (m.retro ? t('mercuryRxUntil', { d: fmt.short(m.endDate, date) }) : t('mercuryDirect')) + (n ? ' · ' + t('retroCount', { n }) : '') : '');
  }

  // ---------- аспекты ----------
  function renderAspects(list) {
    const html = list.slice(0, 16).map(a => {
      const A = NS.BODY[a.a], B = NS.BODY[a.b];
      return '<li><span class="l"><span class="g" style="color:' + A.color + '">' + A.glyph + '</span><span class="asp" style="color:' + a.aspect.color + '">' + a.aspect.sym + '</span><span class="g" style="color:' + B.color + '">' + B.glyph + '</span> ' + a.aspect.name + '</span><span class="r"><b>' + a.orb.toFixed(1) + '°</b> · ' + (a.applying ? t('applying') : t('separating')) + '</span></li>';
    }).join('') || '<li><span class="l">' + t('noAspects') + '</span></li>';
    setHTML('aspects-list', html);
    setText('aspects-hint', t('active', { n: list.length }) + (list.length ? ' · ' + t('tightest') + ' ' + NS.BODY[list[0].a].glyph + list[0].aspect.sym + NS.BODY[list[0].b].glyph : ''));
  }

  // ---------- затмения ----------
  function renderEclipses(e, date) {
    const items = [];
    if (e.lunar) items.push('<li><span class="l">' + t('lunar') + ' · ' + NS.ECLIPSE_KIND[e.lunar.kind] + '</span><span class="r"><b>' + fmt.dt(e.lunar.peak, date) + '</b><small>' + fmt.rel(e.lunar.peak, date) + '</small></span></li>');
    if (e.solar) items.push('<li><span class="l">' + t('solar') + ' · ' + NS.ECLIPSE_KIND[e.solar.kind] + '</span><span class="r"><b>' + fmt.dt(e.solar.peak, date) + '</b><small>' + fmt.rel(e.solar.peak, date) + '</small><small>' + t('max') + ' ' + fmt.coords(e.solar.lat, e.solar.lon) + '</small></span></li>');
    if (e.local) items.push('<li><span class="l">' + t('local') + ' · ' + NS.ECLIPSE_KIND[e.local.kind] + ' ' + Math.round(e.local.obscuration * 100) + ' %</span><span class="r"><b>' + fmt.dt(e.local.peak, date) + '</b><small>' + fmt.rel(e.local.peak, date) + '</small>' + (e.local.begin ? '<small>' + fmt.time(e.local.begin) + ' – ' + fmt.time(e.local.end) + '</small>' : '') + '</span></li>');
    setHTML('eclipse-list', items.join(''));
    const next = [e.lunar && e.lunar.peak, e.solar && e.solar.peak].filter(Boolean).sort((a, b) => a - b)[0];
    setText('eclipse-hint', next ? t('nearest') + ' ' + fmt.short(next, date) : '');
  }

  // ---------- панели / модалки / тосты ----------
  function initPanels() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('astroscape.panels') || '{}'); } catch (e) {}
    const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
    document.querySelectorAll('.panel.collapsible').forEach(p => {
      if (saved[p.id] != null) p.classList.toggle('collapsed', saved[p.id]);
      else if (narrow) p.classList.add('collapsed');   // на телефоне сначала показываем небо, а не панели
      p.querySelector('header').addEventListener('click', () => {
        p.classList.toggle('collapsed');
        saved[p.id] = p.classList.contains('collapsed');
        try { localStorage.setItem('astroscape.panels', JSON.stringify(saved)); } catch (e) {}
      });
    });
  }
  let toastTimer = null;
  function toast(msg, ms) {
    const el = $('toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms || 2200);
  }
  function fillPresets() {
    const sel = $('loc-preset');
    // порядок алфавитный по текущему языку; value — исходный индекс в PRESETS
    const coll = new Intl.Collator(NS.I18N.intl, { sensitivity: 'base' });
    const items = NS.PRESETS.map((p, i) => ({ i, name: p.name })).sort((a, b) => coll.compare(a.name, b.name));
    sel.innerHTML = '<option value="">' + t('chooseCity') + '</option>' +
      items.map(o => '<option value="' + o.i + '">' + o.name + '</option>').join('');
  }

  NS.UI = { renderClock, buildRows, renderPlanets, renderDetail, renderMoon, renderSun, renderRetro, renderAspects, renderEclipses, initPanels, toast, fillPresets, drawMoon };
})(window.AstroScape);
