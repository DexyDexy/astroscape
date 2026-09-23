/* AstroScape — движок толкования.
   Собирает из расчётов список «фактов», взвешивает их по значимости и
   превращает в текст по шаблонам из js/texts.js. Никакой магии: правила
   и веса ниже — единственное, что определяет порядок и отбор. */
(function (NS) {
  'use strict';
  const DAY = 86400000;
  const norm360 = d => ((d % 360) + 360) % 360;
  const wrap180 = d => { d = norm360(d); return d > 180 ? d - 360 : d; };

  // Классические семь светил: по ним считается Луна без курса
  const CLASSIC = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  // Вес аспекта по типу: соединение и оппозиция громче секстиля
  const ASPECT_W = [1.0, 0.9, 0.78, 0.85, 0.6];
  const LUMINARY = { Sun: 1.35, Moon: 1.3, Mercury: 1.05, Venus: 1.05, Mars: 1.05 };
  const ANGLE_HOUSES = [1, 4, 7, 10];

  function L() {
    const code = (NS.I18N && NS.I18N.lang) || 'en';
    return NS.TEXTS[code] || NS.TEXTS.en;
  }
  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }
  function planetName(id) { return (NS.BODY[id] && NS.BODY[id].name) || id; }
  // достоинство светила дописывается к строке о его знаке, отдельной строкой не идёт
  function withDignity(T, text, s) {
    if (!s || !s.dignity) return text;
    return text.replace(/\.\s*$/, '') + ' (' + T.dign[s.dignity] + ').';
  }
  function signName(i) { return (NS.ZODIAC[i] && NS.ZODIAC[i].name) || i; }

  // Луна без курса: до выхода из знака больше не делает мажорных аспектов
  // к классическим светилам. Скорости считаем постоянными — на 2–3 часа вперёд
  // этого достаточно, а точную минуту мы и не обещаем.
  function voidMoon(states, date) {
    const m = states.Moon;
    if (!m || !(m.speed > 0)) return null;
    const toExit = (30 - (m.lon % 30)) / m.speed;             // суток до смены знака
    if (!(toExit > 0)) return null;
    let next = Infinity;
    CLASSIC.forEach(id => {
      const p = states[id];
      if (!p) return;
      const rel = m.speed - p.speed;                           // сближение по долготе
      if (Math.abs(rel) < 1e-6) return;
      NS.ASPECTS.forEach(asp => {
        [asp.angle, -asp.angle].forEach(target => {
          const diff = wrap180(m.lon - p.lon);
          let dt = (target - diff) / rel;
          if (dt < 0) dt += 360 / Math.abs(rel);               // следующий оборот
          if (dt > 0 && dt < toExit && dt < next) next = dt;
        });
      });
    });
    if (next < toExit) return null;                            // аспект ещё будет — не без курса
    return { until: new Date(date.getTime() + toExit * DAY) };
  }

  // ---- сбор фактов -----------------------------------------------------------
  function facts(ctx) {
    const T = L(), out = [];
    const st = ctx.states, h = ctx.houses;
    const add = (key, weight, text) => { if (text) out.push({ key, weight, text }); };
    const kwP = id => T.planet[id] || '';
    const kwS = i => T.sign[i] || '';
    const kwH = n => T.house[n] || '';

    // Луна: фаза, знак, дом, без курса
    const moon = st.Moon;
    if (ctx.moon && typeof ctx.moon.phaseIdx === 'number') {
      add('moon.phase', 3.0, T.moonPhase[ctx.moon.phaseIdx]);
    }
    if (moon) {
      add('moon.sign', 2.2, withDignity(T,
        fill(T.tpl.moonSign, { sign: signName(moon.signIdx), signKw: kwS(moon.signIdx) }), moon));
      if (moon.house) add('moon.house', 1.6, fill(T.tpl.moonHouse, { house: moon.house, houseKw: kwH(moon.house) }));
    }
    const vm = ctx.void;
    if (vm) add('moon.void', 2.6, fill(T.tpl.voidMoon, { t: ctx.fmtTime(vm.until) }));

    // Солнце: знак и дом
    const sun = st.Sun;
    if (sun) {
      add('sun.sign', 2.0, withDignity(T,
        fill(T.tpl.sunSign, { sign: signName(sun.signIdx), signKw: kwS(sun.signIdx) }), sun));
      if (sun.house) add('sun.house', 1.7, fill(T.tpl.sunHouse, { house: sun.house, houseKw: kwH(sun.house) }));
    }

    // Аспекты: вес по типу, точности и участникам
    (ctx.aspects || []).forEach(a => {
      const i = NS.ASPECTS.indexOf(a.aspect);
      const w = (ASPECT_W[i] || 0.6) * (0.35 + 0.65 * a.tight)
              * (LUMINARY[a.a] || 0.85) * (LUMINARY[a.b] || 0.85);
      add('aspect.' + a.a + '.' + a.b, w, fill(T.tpl.aspect, {
        a: planetName(a.a), b: planetName(a.b), meaning: T.aspect[i] || '',
        aKw: kwP(a.a), bKw: kwP(a.b),
      }));
    });

    // Достоинства: у Солнца и Луны они уже дописаны к строке о знаке,
    // у дальних планет это фон на месяцы — остаются быстрые планеты
    ['Mercury', 'Venus', 'Mars'].forEach(id => {
      const s = st[id];
      if (!s || !s.dignity) return;
      const strong = s.dignity === 'domicile' || s.dignity === 'exalt';
      add('dign.' + id, strong ? 0.95 : 0.8, fill(T.tpl.dignity, {
        planet: planetName(id), sign: signName(s.signIdx), meaning: T.dign[s.dignity],
      }));
    });

    // Планета у угла карты: в пределах 4° от куспида I, IV, VII, X
    if (h) {
      NS.BODIES.forEach(b => {
        const s = st[b.id];
        if (!s) return;
        ANGLE_HOUSES.forEach(n => {
          const d = Math.abs(wrap180(s.lon - h.cusps[n - 1]));
          if (d <= 4) {
            add('angular.' + b.id, 1.1 * (1 - d / 4) + 0.5, fill(T.tpl.angular, {
              planet: planetName(b.id), angle: T.angleName[n], planetKw: kwP(b.id),
            }));
          }
        });
      });
    }

    // Ретроградность: заметна у быстрых планет, у дальних это фон
    ['Mercury', 'Venus', 'Mars'].forEach(id => {
      const s = st[id];
      if (s && s.retro) add('retro.' + id, id === 'Mercury' ? 1.2 : 0.9,
        fill(T.tpl.retro, { planet: planetName(id), planetKw: kwP(id) }));
    });

    // Планетарный час
    if (ctx.hour) add('hour', 0.6, fill(T.tpl.hour, {
      planet: planetName(ctx.hour.hourRuler), planetKw: kwP(ctx.hour.hourRuler),
    }));

    return out;
  }

  // ---- сборка готового текста -------------------------------------------------
  function build(ctx, limit) {
    const T = L();
    if (!ctx || !ctx.states || !ctx.states.Moon) return null;
    ctx.void = voidMoon(ctx.states, ctx.date);
    const list = facts(ctx).sort((x, y) => y.weight - x.weight);
    // по одному факту на тему, аспектов — не больше трёх, чтобы не повторяться
    const seen = {}; let asp = 0;
    const items = [];
    list.forEach(f => {
      if (items.length >= (limit || 7)) return;
      const top = f.key.split('.')[0];
      if (top === 'aspect') { if (asp >= 3) return; asp++; }
      else { if (seen[top]) return; seen[top] = true; }
      items.push(f);
    });
    const moon = ctx.states.Moon;
    const idx = (ctx.moon && ctx.moon.phaseIdx) || 0;
    const lead = fill(T.tpl.lead, {
      phase: (NS.PHASE_NAMES && NS.PHASE_NAMES[idx]) || '',
      moonSign: signName(moon.signIdx),
      chart: ctx.hour ? NS.t(ctx.hour.isDay ? 'dayChart' : 'nightChart') : '',
      hourRuler: ctx.hour ? planetName(ctx.hour.hourRuler) : '—',
    });
    return { lead, items, note: T.note };
  }

  NS.Interp = { build, voidMoon };
})(window.AstroScape);
