/* AstroScape — астрономические расчёты (обёртка над astronomy-engine) */
(function (NS) {
  'use strict';
  const A = window.Astronomy;
  const DAY = 86400000;
  const DEG = Math.PI / 180;
  const KM_PER_AU = 149597870.7;

  const norm360 = d => ((d % 360) + 360) % 360;
  const wrap180 = d => { d = norm360(d); return d > 180 ? d - 360 : d; };

  // ---- координаты ---------------------------------------------------------
  // astronomy-engine EQJ (x→точка Овна, y→RA 6h, z→северный полюс) → three.js (Y вверх)
  function eqjToThree(v) { return [v.x, v.z, -v.y]; }
  function eclToLocal(lonDeg, latDeg, r, latScale) {
    const l = lonDeg * DEG, b = latDeg * DEG;
    const c = Math.cos(b);
    return [r * c * Math.cos(l), r * Math.sin(b) * (latScale || 1), -r * c * Math.sin(l)];
  }

  // ---- геоцентрическое положение --------------------------------------------
  function geoEcliptic(id, date) {
    const v = A.GeoVector(id, date, true);
    const e = A.Ecliptic(v);
    return { lon: norm360(e.elon), lat: e.elat, dist: Math.hypot(v.x, v.y, v.z) };
  }
  function lonRate(id, date) {          // °/сутки, центральная разность
    const dt = id === 'Moon' ? 0.02 : 0.25;
    const a = geoEcliptic(id, new Date(date.getTime() - dt * DAY)).lon;
    const b = geoEcliptic(id, new Date(date.getTime() + dt * DAY)).lon;
    return wrap180(b - a) / (2 * dt);
  }

  function bodyState(id, date, observer, full) {
    const ge = geoEcliptic(id, date);
    const eq = A.Equator(id, date, observer, true, true);
    const hz = A.Horizon(date, observer, eq.ra, eq.dec, 'normal');
    const speed = lonRate(id, date);
    const signIdx = Math.floor(ge.lon / 30);
    const inSign = ge.lon - signIdx * 30;
    const st = {
      id, lon: ge.lon, lat: ge.lat, distAU: ge.dist, distKm: ge.dist * KM_PER_AU,
      ra: eq.ra, dec: eq.dec, alt: hz.altitude, az: hz.azimuth, above: hz.altitude > 0,
      signIdx, deg: Math.floor(inSign), min: Math.floor((inSign % 1) * 60),
      speed, retro: id !== 'Sun' && id !== 'Moon' && speed < 0,
    };
    if (!full) return st;
    try {
      const c = A.Constellation(eq.ra, eq.dec);
      st.constellation = c.symbol;
    } catch (e) { st.constellation = null; }
    if (id !== 'Sun') {
      try {
        const il = A.Illumination(id, date);
        st.mag = il.mag; st.phaseFraction = il.phase_fraction; st.phaseAngle = il.phase_angle;
      } catch (e) { /* Плутон и др. */ }
      try { st.elongation = A.AngleFromSun(id, date); } catch (e) {}
    }
    return st;
  }

  function allStates(date, observer) {
    const out = {};
    NS.BODIES.forEach(b => { out[b.id] = bodyState(b.id, date, observer); });
    return out;
  }

  // ---- аспекты ---------------------------------------------------------------
  function aspects(states) {
    const ids = NS.BODIES.map(b => b.id);
    const list = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = states[ids[i]], b = states[ids[j]];
      const d = Math.abs(wrap180(a.lon - b.lon));
      for (const asp of NS.ASPECTS) {
        const orb = Math.abs(d - asp.angle);
        if (orb <= asp.orb) {
          // сходящийся или расходящийся аспект
          const dNext = Math.abs(wrap180((a.lon + a.speed / 24) - (b.lon + b.speed / 24)));
          list.push({ a: ids[i], b: ids[j], aspect: asp, orb, tight: 1 - orb / asp.orb, applying: Math.abs(dNext - asp.angle) < orb });
          break;
        }
      }
    }
    list.sort((x, y) => x.orb - y.orb);
    return list;
  }

  // ---- Луна ------------------------------------------------------------------
  function moonInfo(date, observer, moonState) {
    const phase = A.MoonPhase(date);                          // 0..360
    const frac = A.Illumination('Moon', date).phase_fraction;
    const prevNew = A.SearchMoonPhase(0, new Date(date.getTime() - 30 * DAY), 31);
    const age = prevNew ? (date - prevNew.date) / DAY : phase / 360 * 29.53;
    const nextNew = A.SearchMoonPhase(0, date, 40);
    const nextFull = A.SearchMoonPhase(180, date, 40);
    const quarters = [];
    let mq = A.SearchMoonQuarter(date);
    for (let i = 0; i < 5; i++) { quarters.push({ q: mq.quarter, date: mq.time.date }); mq = A.NextMoonQuarter(mq); }
    let apsis = null;
    try { const ap = A.SearchLunarApsis(date); apsis = { kind: ap.kind, date: ap.time.date, km: ap.dist_km }; } catch (e) {}
    // название фазы: 8 секторов по 45°, центрированных
    const idx = Math.floor(((phase + 22.5) % 360) / 45);
    return {
      phase, frac, age, phaseIdx: idx, phaseName: NS.PHASE_NAMES[idx],
      nextNew: nextNew && nextNew.date, nextFull: nextFull && nextFull.date, quarters, apsis,
      waxing: phase < 180, distKm: moonState ? moonState.distKm : null,
      riseSet: riseSet('Moon', date, observer),
    };
  }

  // ---- восход/заход в пределах местных солнечных суток ------------------------
  function localDayStart(date, observer) {
    const lmtHours = (((date.getUTCHours() + date.getUTCMinutes() / 60 + observer.longitude / 15) % 24) + 24) % 24;
    return new Date(date.getTime() - lmtHours * 3600000 - date.getUTCSeconds() * 1000);
  }
  function riseSet(id, date, observer) {
    const start = localDayStart(date, observer);
    let rise = null, set = null;
    try { rise = A.SearchRiseSet(id, observer, +1, start, 1.0); } catch (e) {}
    try { set = A.SearchRiseSet(id, observer, -1, start, 1.0); } catch (e) {}
    return { rise: rise && rise.date, set: set && set.date, dayStart: start };
  }

  // ---- Солнце ----------------------------------------------------------------
  function sunInfo(date, observer) {
    const rs = riseSet('Sun', date, observer);
    const start = rs.dayStart;
    let noon = null, dawn = null, dusk = null;
    try { noon = A.SearchHourAngle('Sun', observer, 0, start, +1).time.date; } catch (e) {}
    try { const t = A.SearchAltitude('Sun', observer, +1, start, 1.0, -6); dawn = t && t.date; } catch (e) {}
    try { const t = A.SearchAltitude('Sun', observer, -1, start, 1.0, -6); dusk = t && t.date; } catch (e) {}
    let dayLen = null;
    if (rs.rise && rs.set) {
      dayLen = (rs.set - rs.rise) / 3600000;
      if (dayLen < 0) dayLen += 24;
    }
    // сезоны: ближайшие 4 события
    const y = date.getUTCFullYear();
    const ev = [];
    [y - 1, y, y + 1].forEach(yy => {
      const s = A.Seasons(yy);
      ev.push({ key: 'mar', date: s.mar_equinox.date, k: 'eq' });
      ev.push({ key: 'jun', date: s.jun_solstice.date, k: 'sol' });
      ev.push({ key: 'sep', date: s.sep_equinox.date, k: 'eq' });
      ev.push({ key: 'dec', date: s.dec_solstice.date, k: 'sol' });
    });
    ev.sort((a, b) => a.date - b.date);
    const seasons = ev.filter(e => e.date >= date).slice(0, 4);
    return { rise: rs.rise, set: rs.set, noon, dawn, dusk, dayLen, seasons };
  }

  // ---- ретроградность ---------------------------------------------------------
  const STEP = { Mercury: 2, Venus: 3, Mars: 6, Jupiter: 8, Saturn: 8, Uranus: 8, Neptune: 8, Pluto: 8 };
  function rateAt(id, ms) { return lonRate(id, new Date(ms)); }
  // Поиск ближайшей смены знака скорости вперёд (dir=+1) или назад (dir=-1)
  function findStation(id, fromMs, dir, limitDays) {
    const step = STEP[id] * DAY * dir;
    let t0 = fromMs, r0 = rateAt(id, t0);
    const limit = Math.abs(limitDays * DAY);
    for (let dt = 0; dt < limit; dt += Math.abs(step)) {
      const t1 = t0 + step, r1 = rateAt(id, t1);
      if ((r0 < 0) !== (r1 < 0)) {
        // бисекция
        let a = t0, b = t1, ra = r0;
        for (let i = 0; i < 24; i++) {
          const m = (a + b) / 2, rm = rateAt(id, m);
          if ((rm < 0) === (ra < 0)) { a = m; ra = rm; } else { b = m; }
          if (Math.abs(b - a) < 60000) break;
        }
        return { ms: (a + b) / 2, retroAfter: (dir > 0 ? r1 : r0) < 0 };
      }
      t0 = t1; r0 = r1;
    }
    return null;
  }
  const retroCache = {};
  function retroInfo(id, date) {
    const ms = date.getTime();
    const c = retroCache[id];
    if (c && ms >= c.start && ms < c.end) return c;
    const r = rateAt(id, ms);
    const retro = r < 0;
    const back = findStation(id, ms, -1, 900);
    const fwd = findStation(id, ms, +1, 1200);
    const info = { id, retro, speed: r, start: back ? back.ms : ms - 900 * DAY, end: fwd ? fwd.ms : ms + 1200 * DAY,
      startDate: back ? new Date(back.ms) : null, endDate: fwd ? new Date(fwd.ms) : null, nextRetroEnd: null, shadow: null };
    if (!retro && fwd) {
      const fwd2 = findStation(id, fwd.ms + STEP[id] * DAY, +1, 400);
      info.nextRetroEnd = fwd2 ? new Date(fwd2.ms) : null;
    }
    if (retro && back && fwd) {
      // долготы станций — «тень» ретроградности
      info.stationLon = { s1: geoEcliptic(id, new Date(back.ms)).lon, s2: geoEcliptic(id, new Date(fwd.ms)).lon };
    }
    retroCache[id] = info;
    return info;
  }
  function allRetro(date) {
    return NS.RETRO_BODIES.map(id => retroInfo(id, date));
  }

  // ---- затмения ----------------------------------------------------------------
  let eclCache = null;
  function eclipses(date, observer) {
    const ms = date.getTime();
    const key = observer.latitude.toFixed(2) + ',' + observer.longitude.toFixed(2);
    if (eclCache && eclCache.key === key && ms >= eclCache.from && ms < eclCache.until) return eclCache;
    const out = { key, from: ms, until: Infinity, lunar: null, solar: null, local: null };
    try {
      const le = A.SearchLunarEclipse(date);
      out.lunar = { kind: le.kind, peak: le.peak.date, obscuration: le.obscuration, sdPartial: le.sd_partial, sdTotal: le.sd_total, sdPenum: le.sd_penum };
      out.until = Math.min(out.until, le.peak.date.getTime() + le.sd_penum * 60000);
    } catch (e) {}
    try {
      const se = A.SearchGlobalSolarEclipse(date);
      out.solar = { kind: se.kind, peak: se.peak.date, lat: se.latitude, lon: se.longitude, obscuration: se.obscuration };
      out.until = Math.min(out.until, se.peak.date.getTime() + 3 * 3600000);
    } catch (e) {}
    try {
      const ls = A.SearchLocalSolarEclipse(date, observer);
      out.local = { kind: ls.kind, peak: ls.peak.time.date, obscuration: ls.obscuration, alt: ls.peak.altitude,
        begin: ls.partial_begin && ls.partial_begin.time.date, end: ls.partial_end && ls.partial_end.time.date };
      out.until = Math.min(out.until, ls.peak.time.date.getTime() + 3 * 3600000);
    } catch (e) {}
    eclCache = out;
    return out;
  }

  // ---- гелиоцентрика ------------------------------------------------------------
  const HELIO_K = 0.95;
  function helioScale(rAU) { return HELIO_K * Math.sqrt(rAU); }
  function helioPos(id, date) {
    const v = A.HelioVector(id, date);
    const r = Math.hypot(v.x, v.y, v.z) || 1e-9;
    const s = helioScale(r) / r;
    const t = eqjToThree(v);
    return [t[0] * s, t[1] * s, t[2] * s];
  }
  const orbitCache = {};
  function orbitPath(id, date, n) {
    if (orbitCache[id]) return orbitCache[id];
    const period = id === 'Earth' ? 365.25 : NS.BODY[id].period;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = new Date(date.getTime() + (i / n) * period * DAY);
      pts.push(helioPos(id, t));
    }
    orbitCache[id] = pts;
    return pts;
  }

  // ---- разное ----------------------------------------------------------------------
  function sunDirection(date) {
    const v = A.GeoVector('Sun', date, true);
    const r = Math.hypot(v.x, v.y, v.z);
    const t = eqjToThree(v);
    return [t[0] / r, t[1] / r, t[2] / r];
  }
  function gst(date) { return A.SiderealTime(date); }               // часы
  function lst(date, lonDeg) { return (((gst(date) + lonDeg / 15) % 24) + 24) % 24; }
  function jd(date) { return date.getTime() / DAY + 2440587.5; }
  function obliquity(date) {                                          // ° истинного наклона эклиптики
    const T = (jd(date) - 2451545.0) / 36525;
    return 23.439291 - 0.0130042 * T;
  }

  NS.Astro = {
    DAY, KM_PER_AU, norm360, wrap180, eqjToThree, eclToLocal,
    observer: (lat, lon) => new A.Observer(lat, lon, 0),
    geoEcliptic, bodyState, allStates, aspects, moonInfo, sunInfo, riseSet,
    retroInfo, allRetro, eclipses, helioPos, orbitPath, helioScale, sunDirection, gst, lst, jd, obliquity,
  };
})(window.AstroScape);
