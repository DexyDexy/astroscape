/* AstroScape — текстовая база толкования.
   Фрагменты-кирпичики: ключевые слова планет, знаков, домов, значения аспектов и
   достоинств. Движок (js/interp.js) собирает из них фразы по шаблонам.
   Все ключевые слова стоят в именительном падеже, а шаблоны построены через
   тире и двоеточие: так фраза собирается без согласований и не ломает язык.
   Тексты описательные: это язык символов, а не предсказание событий.
   Языки без своей базы берут английскую. */
(function (NS) {
  'use strict';

  NS.TEXTS = {
    ru: {
      // короткие, без внутреннего «и»: они подставляются в перечисления
      planet: {
        Sun: 'воля', Moon: 'настроение', Mercury: 'мысль', Venus: 'согласие',
        Mars: 'действие', Jupiter: 'рост', Saturn: 'порядок',
        Uranus: 'неожиданность', Neptune: 'воображение', Pluto: 'глубина',
      },
      sign: {
        0: 'прямой натиск', 1: 'спокойная основательность', 2: 'любопытство и лёгкость',
        3: 'забота и память', 4: 'щедрость и заметность', 5: 'разбор и точность',
        6: 'равновесие и согласие', 7: 'глубина и упорство', 8: 'размах и поиск смысла',
        9: 'выдержка и расчёт', 10: 'независимость и новизна', 11: 'отзывчивость и текучесть',
      },
      house: {
        1: 'облик и первый шаг', 2: 'своё и надёжное', 3: 'разговоры и ближний круг',
        4: 'дом и корни', 5: 'игра и творчество', 6: 'работа и распорядок',
        7: 'другой человек и договор', 8: 'общее и глубинное', 9: 'дальнее и взгляд на мир',
        10: 'дело и репутация', 11: 'круг людей и замыслы', 12: 'тишина и внутреннее',
      },
      aspect: {
        0: 'действуют заодно и усиливают друг друга',
        1: 'тянут в разные стороны, нужен баланс',
        2: 'поддерживают друг друга, выходит легко',
        3: 'спорят между собой, нужно усилие',
        4: 'дают возможность, если сделать шаг',
      },
      dign: {
        domicile: 'знак обители: действует свободно и уверенно',
        exalt: 'знак экзальтации: качества звучат ярче обычного',
        detriment: 'знак изгнания: приходится действовать чужими средствами',
        fall: 'знак падения: проявиться прямо трудно, нужна опора',
      },
      moonPhase: {
        0: 'Новолуние: начало круга, замыслы ещё без формы.',
        1: 'Растущий серп: первые шаги, всё только набирает силу.',
        2: 'Первая четверть: замысел встречает сопротивление, нужен нажим.',
        3: 'Луна почти полная: дело разворачивается и становится заметным.',
        4: 'Полнолуние: всё видно ясно, противоположности сходятся лицом к лицу.',
        5: 'Убывающая Луна: время отдавать и делиться сделанным.',
        6: 'Последняя четверть: поворот к разбору, лишнее отпадает.',
        7: 'Старая Луна: тишина перед новым кругом, хорошее время закончить.',
      },
      tpl: {
        moonSign: 'Луна в знаке {sign}: настроение дня — {signKw}.',
        moonHouse: 'Луна в {house} доме: в фокусе — {houseKw}.',
        sunSign: 'Солнце в знаке {sign}: на первом плане — {signKw}.',
        sunHouse: 'Солнце в {house} доме: главная область — {houseKw}.',
        aspect: '{a} и {b} {meaning}. Здесь сходятся {aKw} и {bKw}.',
        dignity: '{planet} в знаке {sign} — {meaning}.',
        retro: '{planet} ретрограден: {planetKw} — не для разгона, а для пересмотра.',
        angular: '{planet} у угла карты ({angle}): на видном месте — {planetKw}.',
        hour: 'Час {planet}: тон ближайшего часа — {planetKw}.',
        voidMoon: 'Луна без курса до {t}: начатое сейчас легко повисает, лучше завершать старое.',
        lead: '{phase} · {moonSign} · {chart} · час {hourRuler}',
      },
      angleName: { 1: 'асцендент', 4: 'надир', 7: 'десцендент', 10: 'середина неба' },
      note: 'Толкование собрано по правилам из положения светил. Это язык символов, а не прогноз событий.',
    },

    en: {
      planet: {
        Sun: 'will', Moon: 'mood', Mercury: 'thought', Venus: 'accord',
        Mars: 'action', Jupiter: 'growth', Saturn: 'order',
        Uranus: 'surprise', Neptune: 'imagination', Pluto: 'depth',
      },
      sign: {
        0: 'direct push', 1: 'calm solidity', 2: 'curiosity and lightness',
        3: 'care and memory', 4: 'warmth and visibility', 5: 'sorting and precision',
        6: 'balance and accord', 7: 'depth and persistence', 8: 'scope and a search for meaning',
        9: 'endurance and calculation', 10: 'independence and novelty', 11: 'sensitivity and flow',
      },
      house: {
        1: 'appearance and the first move', 2: 'what is yours and steady', 3: 'talk and the near circle',
        4: 'home and roots', 5: 'play and making things', 6: 'work and routine',
        7: 'the other person and agreements', 8: 'shared and deep matters', 9: 'distance and outlook',
        10: 'work in the world and standing', 11: 'circles of people and plans', 12: 'quiet and inner life',
      },
      aspect: {
        0: 'act as one and strengthen each other',
        1: 'pull opposite ways and ask for balance',
        2: 'support each other, things come easily',
        3: 'argue with each other, effort is needed',
        4: 'offer an opening if you take a step',
      },
      dign: {
        domicile: 'sign of domicile: it acts freely and surely',
        exalt: 'sign of exaltation: its qualities ring louder than usual',
        detriment: 'sign of detriment: it works with borrowed means',
        fall: 'sign of fall: hard to show directly, support is needed',
      },
      moonPhase: {
        0: 'New Moon: the circle begins, ideas have no shape yet.',
        1: 'Waxing crescent: first steps, everything is gathering strength.',
        2: 'First quarter: the idea meets resistance and needs pressure.',
        3: 'Waxing gibbous: the matter unfolds and becomes visible.',
        4: 'Full Moon: everything is plain to see, opposites meet face to face.',
        5: 'Waning gibbous: a time to give and share what was made.',
        6: 'Last quarter: a turn towards sorting, the surplus falls away.',
        7: 'Old Moon: quiet before a new circle, a good time to finish.',
      },
      tpl: {
        moonSign: 'Moon in {sign}: the mood of the day — {signKw}.',
        moonHouse: 'Moon in house {house}: in focus — {houseKw}.',
        sunSign: 'Sun in {sign}: front and centre — {signKw}.',
        sunHouse: 'Sun in house {house}: the main field — {houseKw}.',
        aspect: '{a} and {b} {meaning}. Here {aKw} meets {bKw}.',
        dignity: '{planet} in {sign} — {meaning}.',
        retro: '{planet} is retrograde: {planetKw} — for review rather than for speed.',
        angular: '{planet} at an angle of the chart ({angle}): in plain view — {planetKw}.',
        hour: 'Hour of {planet}: the tone of the coming hour — {planetKw}.',
        voidMoon: 'Moon void of course until {t}: what starts now tends to hang — better to finish old things.',
        lead: '{phase} · {moonSign} · {chart} · hour of {hourRuler}',
      },
      angleName: { 1: 'ascendant', 4: 'nadir', 7: 'descendant', 10: 'midheaven' },
      note: 'This reading is assembled by rules from the positions of the bodies. It is a language of symbols, not a forecast of events.',
    },
  };
})(window.AstroScape);
