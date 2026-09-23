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
  // Историческая выдержка к строке о знаке светила: включается кнопкой «Традиция».
  // Текст показывается в оригинале и с указанием источника — это документ эпохи,
  // а не наше толкование, поэтому мы его не переводим и не переписываем.
  function quoteFor(ctx, body, signIdx) {
    if (!ctx.withQuotes || !NS.QUOTES) return null;
    const text = NS.QUOTES[body] && NS.QUOTES[body][signIdx];
    if (!text) return null;
    const s = NS.QUOTES.source;
    return { text, source: s.author + ', ' + s.title + ', ' + s.year, url: s.url };
  }
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

  // Ближайший точный аспект Луны к классическим светилам: считаем по скоростям,
  // на несколько часов вперёд этого достаточно.
  function moonNext(states, date) {
    const m = states.Moon;
    if (!m) return null;
    let best = null;
    CLASSIC.forEach(id => {
      const p = states[id];
      if (!p) return;
      const rel = m.speed - p.speed;
      if (Math.abs(rel) < 1e-6) return;
      NS.ASPECTS.forEach((asp, ai) => {
        [asp.angle, -asp.angle].forEach(target => {
          const diff = wrap180(m.lon - p.lon);
          const dt = (target - diff) / rel;
          if (dt > 0 && dt < 2 && (!best || dt < best.dt)) best = { dt, id, ai };
        });
      });
    });
    if (!best) return null;
    return { id: best.id, ai: best.ai, when: new Date(date.getTime() + best.dt * DAY) };
  }
  // Сколько осталось до смены знака: у быстрых тел это ощутимое событие
  function ingress(states, date, id, maxDays) {
    const s = states[id];
    if (!s || !(s.speed > 0)) return null;
    const dt = (30 - (s.lon % 30)) / s.speed;
    if (!(dt > 0) || dt > maxDays) return null;
    return { id, dt, when: new Date(date.getTime() + dt * DAY), sign: (s.signIdx + 1) % 12 };
  }
  function whenWord(T, date, now) {
    const d = Math.round((date - now) / DAY);
    if (d <= 0) return T.whenWord.today;
    if (d === 1) return T.whenWord.tomorrow;
    return fill(T.whenWord.inDays, { n: d });
  }

  // ---- сбор фактов -----------------------------------------------------------
  function facts(ctx) {
    const T = L(), out = [];
    const st = ctx.states, h = ctx.houses;
    const add = (key, weight, text, quote) => { if (text) out.push({ key, weight, text, quote }); };
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
        fill(T.tpl.moonSign, { sign: signName(moon.signIdx), signKw: kwS(moon.signIdx) }), moon),
        quoteFor(ctx, 'moon', moon.signIdx));
      if (moon.house) add('moon.house', 1.6, fill(T.tpl.moonHouse, { house: moon.house, houseKw: kwH(moon.house) }));
    }
    const vm = ctx.void;
    if (vm) add('moon.void', 2.6, fill(T.tpl.voidMoon, { t: ctx.fmtTime(vm.until) }));

    // Солнце: знак и дом
    const sun = st.Sun;
    if (sun) {
      add('sun.sign', 2.0, withDignity(T,
        fill(T.tpl.sunSign, { sign: signName(sun.signIdx), signKw: kwS(sun.signIdx) }), sun),
        quoteFor(ctx, 'sun', sun.signIdx));
      if (sun.house) add('sun.house', 1.7, fill(T.tpl.sunHouse, { house: sun.house, houseKw: kwH(sun.house) }));
    }

    // Аспекты: вес по типу, точности и участникам; сходящийся весомее расходящегося
    (ctx.aspects || []).forEach(a => {
      const i = NS.ASPECTS.indexOf(a.aspect);
      const w = (ASPECT_W[i] || 0.6) * (0.35 + 0.65 * a.tight) * (a.applying ? 1.1 : 0.9)
              * (LUMINARY[a.a] || 0.85) * (LUMINARY[a.b] || 0.85);
      add('aspect.' + a.a + '.' + a.b, w, fill(T.tpl.aspect, {
        a: planetName(a.a), b: planetName(a.b), meaning: T.aspect[i] || '',
        phase: (T.phase2 && T.phase2[a.applying ? 'applying' : 'separating']) || '',
        aKw: kwP(a.a), bKw: kwP(a.b),
      }));
    });

    // Ближайший аспект Луны: чем ближе, тем весомее
    const mn = ctx.moonNext;
    if (mn) add('moon.next', 1.9 - Math.min(1.0, (mn.when - ctx.date) / DAY), fill(T.tpl.moonNext, {
      asp: (NS.L.aspects && NS.L.aspects[mn.ai]) || '', sym: (NS.ASPECTS[mn.ai] || {}).sym || '',
      planet: planetName(mn.id), t: ctx.fmtTime(mn.when),
    }));

    // Смена знака у быстрых тел
    ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars'].forEach(id => {
      const g = ingress(st, ctx.date, id, id === 'Moon' ? 0.4 : 3);
      if (!g) return;
      add('ingress.' + id, id === 'Moon' ? 1.3 : 1.5 - g.dt * 0.2, fill(T.tpl.ingress, {
        planet: planetName(id), sign: signName(g.sign), signKw: kwS(g.sign),
        when: whenWord(T, g.when, ctx.date),
      }));
    });

    // Стоянка планеты: разворот на ретроградное или прямое движение
    (ctx.retro || []).forEach(r => {
      const next = r.retro ? r.endDate : r.startDate && r.startDate > ctx.date ? r.startDate : r.nextRetroEnd;
      const turn = r.retro ? r.endDate : r.nextRetroEnd;
      if (!turn) return;
      const days = (turn - ctx.date) / DAY;
      if (days < 0 || days > 6) return;
      add('station.' + r.id, 1.4 - days * 0.12, fill(T.tpl.station, {
        planet: planetName(r.id), dir: T.dirWord[r.retro ? 'toDirect' : 'toRetro'],
        when: whenWord(T, turn, ctx.date),
      }));
    });

    // Затмение в ближайшую неделю
    const ec = ctx.eclipses;
    if (ec) {
      [['solar', 'eclipseSun'], ['lunar', 'eclipseMoon']].forEach(([k, tplKey]) => {
        const e = ec[k];
        if (!e || !e.peak) return;
        const days = (e.peak - ctx.date) / DAY;
        if (days < 0 || days > 7) return;
        add('eclipse.' + k, 2.4 - days * 0.15, fill(T.tpl[tplKey], { when: whenWord(T, e.peak, ctx.date) }));
      });
    }

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
    ctx.moonNext = ctx.void ? null : moonNext(ctx.states, ctx.date);
    // Порядок: по весу, но с огрублением до 0,05. Иначе два почти равных факта
    // меняются местами от кадра к кадру и текст в панели дёргается.
    const list = facts(ctx).sort((x, y) =>
      (Math.round(y.weight * 20) - Math.round(x.weight * 20)) || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
    // один факт на ключ; сверх того потолок по темам, чтобы одна из них не забрала всё
    const CAP = { aspect: 3, moon: 3, sun: 2 };
    const seen = {}, count = {}, items = [];
    list.forEach(f => {
      if (items.length >= (limit || 7) || seen[f.key]) return;
      const top = f.key.split('.')[0];
      const cap = CAP[top] || 2;
      if ((count[top] || 0) >= cap) return;
      count[top] = (count[top] || 0) + 1;
      seen[f.key] = true;
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

  NS.Interp = { build, voidMoon, moonNext };
})(window.AstroScape);
