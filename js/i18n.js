/* AstroScape — локализация: словари, автоопределение языка, перевод разметки */
(function (NS) {
  'use strict';

  const ru = {
    code: 'ru', intl: 'ru-RU', label: 'Русский',
    title: 'AstroScape — живая карта неба',
    description: 'Интерактивная 3D‑астролябия: положения планет, фазы Луны, ретроградность, восходы и закаты для любого места и времени.',
    planets: { Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера', Sun: 'Солнце', Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран', Neptune: 'Нептун', Pluto: 'Плутон', Earth: 'Земля' },
    zodiac: ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'],
    phases: ['Новолуние', 'Растущий серп', 'Первая четверть', 'Растущая Луна', 'Полнолуние', 'Убывающая Луна', 'Последняя четверть', 'Убывающий серп'],
    quarters: ['Новолуние', 'Первая четверть', 'Полнолуние', 'Последняя четверть'],
    aspects: ['Соединение', 'Оппозиция', 'Тригон', 'Квадрат', 'Секстиль'],
    eclipseKind: { penumbral: 'полутеневое', partial: 'частное', total: 'полное', annular: 'кольцеобразное', none: '—' },
    seasons: { mar: 'Весеннее равноденствие', jun: 'Летнее солнцестояние', sep: 'Осеннее равноденствие', dec: 'Зимнее солнцестояние' },
    cardinal: { N: 'С', E: 'В', S: 'Ю', W: 'З' },
    units: { y: 'г.', d: 'д', h: 'ч', min: 'мин', days: 'сут', km: 'км', kkm: 'тыс. км', Mkm: 'млн км', au: 'а.е.', degday: '°/сут' },
    rel: { future: 'через {x}', past: '{x} назад' },
    constellations: {
      And: 'Андромеда', Ant: 'Насос', Aps: 'Райская Птица', Aql: 'Орёл', Aqr: 'Водолей', Ara: 'Жертвенник', Ari: 'Овен', Aur: 'Возничий',
      Boo: 'Волопас', Cae: 'Резец', Cam: 'Жираф', Cap: 'Козерог', Car: 'Киль', Cas: 'Кассиопея', Cen: 'Центавр', Cep: 'Цефей', Cet: 'Кит',
      Cha: 'Хамелеон', Cir: 'Циркуль', CMa: 'Большой Пёс', CMi: 'Малый Пёс', Cnc: 'Рак', Col: 'Голубь', Com: 'Волосы Вероники',
      CrA: 'Южная Корона', CrB: 'Северная Корона', Crt: 'Чаша', Cru: 'Южный Крест', Crv: 'Ворон', CVn: 'Гончие Псы', Cyg: 'Лебедь',
      Del: 'Дельфин', Dor: 'Золотая Рыба', Dra: 'Дракон', Equ: 'Малый Конь', Eri: 'Эридан', For: 'Печь', Gem: 'Близнецы', Gru: 'Журавль',
      Her: 'Геркулес', Hor: 'Часы', Hya: 'Гидра', Hyi: 'Южная Гидра', Ind: 'Индеец', Lac: 'Ящерица', Leo: 'Лев', Lep: 'Заяц', Lib: 'Весы',
      LMi: 'Малый Лев', Lup: 'Волк', Lyn: 'Рысь', Lyr: 'Лира', Men: 'Столовая Гора', Mic: 'Микроскоп', Mon: 'Единорог', Mus: 'Муха',
      Nor: 'Наугольник', Oct: 'Октант', Oph: 'Змееносец', Ori: 'Орион', Pav: 'Павлин', Peg: 'Пегас', Per: 'Персей', Phe: 'Феникс',
      Pic: 'Живописец', PsA: 'Южная Рыба', Psc: 'Рыбы', Pup: 'Корма', Pyx: 'Компас', Ret: 'Сетка', Scl: 'Скульптор', Sco: 'Скорпион',
      Sct: 'Щит', Ser: 'Змея', Sex: 'Секстант', Sge: 'Стрела', Sgr: 'Стрелец', Tau: 'Телец', Tel: 'Телескоп', TrA: 'Южный Треугольник',
      Tri: 'Треугольник', Tuc: 'Тукан', UMa: 'Большая Медведица', UMi: 'Малая Медведица', Vel: 'Паруса', Vir: 'Дева', Vol: 'Летучая Рыба',
      Vul: 'Лисичка',
    },
    ui: {
      loader: 'расчёт эфемерид…', brandSub: 'живая карта неба',
      utc: 'UTC', jd: 'Юлианская дата', lst: 'Звёздное время',
      locTitle: 'Изменить место наблюдения', locEdit: 'изменить',
      moon: '☽ Луна', illum: 'Освещённость', age: 'Возраст', sign: 'Знак', distance: 'Расстояние', riseSet: 'Восход / заход',
      newMoon: 'Новолуние', fullMoon: 'Полнолуние', apsis: 'Перигей / апогей',
      sunPanel: '☉ Солнце и день', sunrise: 'Восход', sunset: 'Заход', dayLength: 'Долгота дня', noon: 'Полдень (кульминация)',
      twilight: 'Гражданские сумерки', altAz: 'Высота / азимут',
      btnHelio: '☉ Гелио', btnGeo: '⊕ Гео', btnViewTitle: 'Переключить геоцентрический / гелиоцентрический вид (H)',
      btnTop: '▣ Сверху', btnTopTitle: 'Вид сверху, как натальная карта (T)', btnResetTitle: 'Сбросить камеру (R)',
      btnAspects: '△ Аспекты', btnAspectsTitle: 'Показывать линии аспектов (A)',
      btnStars: '✦ Звёзды', btnStarsTitle: 'Подписи ярких звёзд (S)',
      btnBloom: '◌ Свечение', btnBloomTitle: 'Свечение линий (B)', btnHelpTitle: 'Справка (?)', langTitle: 'Язык интерфейса',
      planets: 'Планеты', hintGeo: 'геоцентрически · тропический зодиак', hintHelio: 'гелиоцентрический вид',
      thBody: 'Тело', thPos: 'Положение', thAlt: 'Выс / Аз', thAltTitle: 'Высота над горизонтом / азимут', thRise: 'Восх · Зах',
      retro: '℞ Ретроградность', aspects: 'Аспекты', eclipses: 'Затмения',
      stepMinusDay: '−1 день (Shift+←)', stepMinusHour: '−1 час (←)', play: 'Пуск / пауза (Пробел)', stepPlusHour: '+1 час (→)', stepPlusDay: '+1 день (Shift+→)',
      speedTitle: 'Скорость течения времени',
      speeds: ['реальное время', '1 мин / с', '10 мин / с', '1 час / с', '6 ч / с', '1 день / с', '1 нед / с', '1 мес / с'],
      now: 'Сейчас', nowTitle: 'Вернуться к текущему моменту (N)', dtTitle: 'Ввести дату и время', spanTitle: 'Диапазон ползунка',
      spans: ['± 12 ч', '± 15 дней', '± 6 мес', '± 5 лет', '± 50 лет'],
      locHeader: 'Место наблюдения', city: 'Город', lat: 'Широта, °', lon: 'Долгота, °', name: 'Название', namePh: 'Моё место',
      gps: '◎ Определить по GPS', views: 'просмотров:', bootFail: 'Не удалось запустить 3D‑сцену. Обновите браузер (на iPhone — iOS 16.4 или новее) и проверьте, что не блокируется загрузка скриптов.', apply: 'Применить', pickOnMap: '◉ Выбрать на карте', cancel: 'Отмена',
      mapHint: 'Щёлкните по глобусу — метка переместится сразу. Колесо — приблизить, перетаскивание — повернуть.',
      locNote: 'Время в интерфейсе показывается в часовом поясе вашего устройства. Совет: пока это окно открыто, щёлкните по глобусу — координаты подставятся сами.',
      helpHeader: 'Как читать AstroScape', chooseCity: '— выбрать город —',
      // подробности о планете
      position: 'Положение', constellation: 'Созвездие (астрон.)', speed: 'Скорость', retroWord: 'ретроградно', mag: 'Блеск',
      elong: 'Элонгация от Солнца', raDec: 'α / δ (экватор.)', eclLat: 'Экл. широта', riseSetDot: 'Восход · заход',
      // Солнце
      dawn: 'рассвет', duskUntil: 'сумерки до', polarDay: 'полярный день', polarNight: 'полярная ночь', day: 'день',
      twilightWord: 'сумерки', deepTwilight: 'глубокие сумерки', night: 'ночь',
      perigee: 'перигей', apogee: 'апогей',
      // ретроградность
      tagRetro: '℞ ретро', tagDirect: 'директ', tagStation: 'стоянка', from: 'с', until: 'до', nextRx: 'следующий ℞:', noData: 'нет данных',
      mercuryRxUntil: 'Меркурий ℞ до {d}', mercuryDirect: 'Меркурий директный', retroCount: 'ретро: {n}',
      // аспекты
      applying: 'сходящийся', separating: 'расходящийся', noAspects: 'нет точных аспектов', active: '{n} актив.', tightest: 'точнейший',
      // затмения
      lunar: '☽ Лунное', solar: '☉ Солнечное', local: '◎ В вашей точке', max: 'макс.', nearest: 'ближайшее',
      // сообщения
      nowToast: 'Текущий момент · реальное время', checkCoords: 'Проверьте координаты', placeSet: 'Место: {n}',
      helioToast: 'Гелиоцентрический вид: лучи с Земли показывают, в каком знаке планета видна с Земли', geoToast: 'Геоцентрический вид',
      noGeo: 'Геолокация недоступна', locating: 'Определяю положение…', gotCoords: 'Координаты получены — нажмите «Применить»', geoFail: 'Не удалось определить положение',
      // подписи в 3D
      welcomeTitle: 'Откуда смотрим на небо?',
      welcomeText: 'Высота планет, восходы и закаты зависят от места наблюдения. Как его задать?',
      guessLine: 'Судя по часовому поясу устройства ({tz}), вы недалеко от: <b>{city}</b>.',
      guessNone: 'Часовой пояс устройства — {tz}. Подобрать по нему город не удалось, пока используется Гринвич.',
      useGuess: 'Использовать: {city}', useGps: '◎ Точнее — по GPS', pickManual: 'Выбрать на глобусе или из списка',
      privacyNote: 'Место хранится только в этом браузере и никуда не передаётся. GPS запрашивается только по вашему нажатию, координаты округляются примерно до километра. Наружу уходит лишь загрузка библиотек с CDN и общий счётчик просмотров.',
      gpsDone: 'Место определено по GPS', equator: 'небесный экватор', aries: '♈ 0° · точка весеннего равноденствия', noonMark: '☉ полдень', zenith: 'зенит', sunLabel: '☉ Солнце',
    },
    help: [
      '<b>Центр</b> — Земля с сеткой координат и точкой наблюдателя. Земля вращается в реальном звёздном времени.',
      '<b>Кольца</b> — орбиты как на астрологической карте: каждая планета стоит на своём кольце под своей эклиптической долготой. Стебелёк вверх/вниз — эклиптическая широта (преувеличена ×2).',
      '<b>Внешнее кольцо зодиака</b> делится на 12 знаков по 30° (тропический зодиак). Цветные засечки на нём — проекции планет.',
      '<b>Золотое кольцо горизонта</b> — горизонт наблюдателя (С, В, Ю, З). Всё, что выше кольца, сейчас видно над горизонтом в выбранной точке. Тусклые подписи — тело под горизонтом.',
      '<b>Линии между планетами</b> — мажорные аспекты: соединение, секстиль, квадрат, тригон, оппозиция. Толщина/яркость — точность аспекта.',
      '<b>℞</b> — планета ретроградна (движется по зодиаку вспять относительно Земли).',
      '<b>Звёзды</b> расставлены реально: за кольцом зодиака видны Регул, Спика, Антарес, Альдебаран — настоящие звёзды зодиакальных созвездий.',
      '<b>Клавиши:</b> Пробел — пуск/пауза · ←/→ — ±1 час · Shift+←/→ — ±1 день · N — сейчас · H — гелио/гео · T — вид сверху · R — сброс камеры · A — аспекты · B — свечение · L — место.',
      '<b>Мышь:</b> вращение — левая кнопка, зум — колесо, панорама — правая кнопка. Щелчок по планете — подробности. Щелчок по глобусу в окне «Место» — выбор точки.',
      '<b>Язык</b> определяется по настройкам браузера; его можно сменить в тулбаре или параметром ссылки <code>?lang=en</code>.',
    ],
  };

  const en = {
    code: 'en', intl: 'en-GB', label: 'English',
    title: 'AstroScape — living sky map',
    description: 'Interactive 3D astrolabe: planetary positions, Moon phases, retrogrades, sunrise and sunset for any place and time.',
    planets: { Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Sun: 'Sun', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto', Earth: 'Earth' },
    zodiac: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
    phases: ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    quarters: ['New Moon', 'First quarter', 'Full Moon', 'Last quarter'],
    aspects: ['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile'],
    eclipseKind: { penumbral: 'penumbral', partial: 'partial', total: 'total', annular: 'annular', none: '—' },
    seasons: { mar: 'March equinox', jun: 'June solstice', sep: 'September equinox', dec: 'December solstice' },
    cardinal: { N: 'N', E: 'E', S: 'S', W: 'W' },
    units: { y: 'yr', d: 'd', h: 'h', min: 'min', days: 'days', km: 'km', kkm: 'thousand km', Mkm: 'million km', au: 'AU', degday: '°/day' },
    rel: { future: 'in {x}', past: '{x} ago' },
    constellations: {
      And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aql: 'Aquila', Aqr: 'Aquarius', Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga',
      Boo: 'Boötes', Cae: 'Caelum', Cam: 'Camelopardalis', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus', Cep: 'Cepheus', Cet: 'Cetus',
      Cha: 'Chamaeleon', Cir: 'Circinus', CMa: 'Canis Major', CMi: 'Canis Minor', Cnc: 'Cancer', Col: 'Columba', Com: 'Coma Berenices',
      CrA: 'Corona Australis', CrB: 'Corona Borealis', Crt: 'Crater', Cru: 'Crux', Crv: 'Corvus', CVn: 'Canes Venatici', Cyg: 'Cygnus',
      Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini', Gru: 'Grus',
      Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta', Leo: 'Leo', Lep: 'Lepus', Lib: 'Libra',
      LMi: 'Leo Minor', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca',
      Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix',
      Pic: 'Pictor', PsA: 'Piscis Austrinus', Psc: 'Pisces', Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum', Scl: 'Sculptor', Sco: 'Scorpius',
      Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Sge: 'Sagitta', Sgr: 'Sagittarius', Tau: 'Taurus', Tel: 'Telescopium', TrA: 'Triangulum Australe',
      Tri: 'Triangulum', Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo', Vol: 'Volans',
      Vul: 'Vulpecula',
    },
    ui: {
      loader: 'computing ephemerides…', brandSub: 'living sky map',
      utc: 'UTC', jd: 'Julian date', lst: 'Sidereal time',
      locTitle: 'Change observer location', locEdit: 'change',
      moon: '☽ Moon', illum: 'Illumination', age: 'Age', sign: 'Sign', distance: 'Distance', riseSet: 'Rise / set',
      newMoon: 'New Moon', fullMoon: 'Full Moon', apsis: 'Perigee / apogee',
      sunPanel: '☉ Sun & day', sunrise: 'Sunrise', sunset: 'Sunset', dayLength: 'Day length', noon: 'Solar noon',
      twilight: 'Civil twilight', altAz: 'Altitude / azimuth',
      btnHelio: '☉ Helio', btnGeo: '⊕ Geo', btnViewTitle: 'Toggle geocentric / heliocentric view (H)',
      btnTop: '▣ Top', btnTopTitle: 'Top view, like a natal chart (T)', btnResetTitle: 'Reset camera (R)',
      btnAspects: '△ Aspects', btnAspectsTitle: 'Show aspect lines (A)',
      btnStars: '✦ Stars', btnStarsTitle: 'Bright star labels (S)',
      btnBloom: '◌ Glow', btnBloomTitle: 'Line glow (B)', btnHelpTitle: 'Help (?)', langTitle: 'Interface language',
      planets: 'Planets', hintGeo: 'geocentric · tropical zodiac', hintHelio: 'heliocentric view',
      thBody: 'Body', thPos: 'Position', thAlt: 'Alt / Az', thAltTitle: 'Altitude above horizon / azimuth', thRise: 'Rise · Set',
      retro: '℞ Retrograde', aspects: 'Aspects', eclipses: 'Eclipses',
      stepMinusDay: '−1 day (Shift+←)', stepMinusHour: '−1 hour (←)', play: 'Play / pause (Space)', stepPlusHour: '+1 hour (→)', stepPlusDay: '+1 day (Shift+→)',
      speedTitle: 'Time flow speed',
      speeds: ['real time', '1 min / s', '10 min / s', '1 hour / s', '6 h / s', '1 day / s', '1 week / s', '1 month / s'],
      now: 'Now', nowTitle: 'Back to the present moment (N)', dtTitle: 'Enter date and time', spanTitle: 'Slider range',
      spans: ['± 12 h', '± 15 days', '± 6 months', '± 5 years', '± 50 years'],
      locHeader: 'Observer location', city: 'City', lat: 'Latitude, °', lon: 'Longitude, °', name: 'Name', namePh: 'My place',
      gps: '◎ Use GPS', views: 'views:', bootFail: 'The 3D scene could not start. Update your browser (on iPhone, iOS 16.4 or newer) and check that script loading is not blocked.', apply: 'Apply', pickOnMap: '◉ Pick on the map', cancel: 'Cancel',
      mapHint: 'Click the globe — the marker moves right away. Wheel to zoom, drag to rotate.',
      locNote: 'Times in the interface are shown in your device’s time zone. Tip: while this window is open, click the globe to pick a point.',
      helpHeader: 'How to read AstroScape', chooseCity: '— choose a city —',
      position: 'Position', constellation: 'Constellation (astron.)', speed: 'Speed', retroWord: 'retrograde', mag: 'Magnitude',
      elong: 'Elongation from Sun', raDec: 'α / δ (equatorial)', eclLat: 'Ecl. latitude', riseSetDot: 'Rise · set',
      dawn: 'dawn', duskUntil: 'dusk until', polarDay: 'polar day', polarNight: 'polar night', day: 'day',
      twilightWord: 'twilight', deepTwilight: 'deep twilight', night: 'night',
      perigee: 'perigee', apogee: 'apogee',
      tagRetro: '℞ retro', tagDirect: 'direct', tagStation: 'station', from: 'from', until: 'until', nextRx: 'next ℞:', noData: 'no data',
      mercuryRxUntil: 'Mercury ℞ until {d}', mercuryDirect: 'Mercury direct', retroCount: 'retro: {n}',
      applying: 'applying', separating: 'separating', noAspects: 'no tight aspects', active: '{n} active', tightest: 'tightest',
      lunar: '☽ Lunar', solar: '☉ Solar', local: '◎ At your location', max: 'max.', nearest: 'next',
      nowToast: 'Present moment · real time', checkCoords: 'Check the coordinates', placeSet: 'Location: {n}',
      helioToast: 'Heliocentric view: rays from Earth show in which sign each planet appears from Earth', geoToast: 'Geocentric view',
      noGeo: 'Geolocation is unavailable', locating: 'Locating…', gotCoords: 'Coordinates received — press “Apply”', geoFail: 'Could not determine location',
      welcomeTitle: 'Where are we watching the sky from?',
      welcomeText: 'Planet altitudes, sunrises and sunsets depend on the observer’s location. How would you like to set it?',
      guessLine: 'Judging by your device’s time zone ({tz}), you are near: <b>{city}</b>.',
      guessNone: 'Your device’s time zone is {tz}. No city could be matched to it, so Greenwich is used for now.',
      useGuess: 'Use {city}', useGps: '◎ More precise — use GPS', pickManual: 'Pick on the globe or from a list',
      privacyNote: 'Your location is stored only in this browser and is never sent anywhere. GPS is requested only when you press the button, and coordinates are rounded to about a kilometre. The only outgoing traffic is loading libraries from a CDN and the shared view counter.',
      gpsDone: 'Location set from GPS', equator: 'celestial equator', aries: '♈ 0° · vernal equinox point', noonMark: '☉ noon', zenith: 'zenith', sunLabel: '☉ Sun',
    },
    help: [
      '<b>Centre</b> — Earth with a coordinate grid and the observer’s point. Earth rotates in real sidereal time.',
      '<b>Rings</b> — orbits as on an astrological chart: each planet sits on its own ring at its ecliptic longitude. The stem up/down is ecliptic latitude (exaggerated ×2).',
      '<b>Outer zodiac ring</b> is divided into 12 signs of 30° (tropical zodiac). Coloured ticks on it are planet projections.',
      '<b>Golden horizon ring</b> — the observer’s horizon (N, E, S, W). Everything above the ring is currently above the horizon at the chosen place. Dimmed labels mean the body is below the horizon.',
      '<b>Lines between planets</b> — major aspects: conjunction, sextile, square, trine, opposition. Brightness reflects how exact the aspect is.',
      '<b>℞</b> — the planet is retrograde (moving backwards through the zodiac as seen from Earth).',
      '<b>Stars</b> are placed at their real positions: beyond the zodiac ring you can see Regulus, Spica, Antares, Aldebaran — the actual stars of the zodiacal constellations.',
      '<b>Keys:</b> Space — play/pause · ←/→ — ±1 hour · Shift+←/→ — ±1 day · N — now · H — helio/geo · T — top view · R — reset camera · A — aspects · B — glow · L — location.',
      '<b>Mouse:</b> rotate — left button, zoom — wheel, pan — right button. Click a planet for details. Click the globe while the “Location” window is open to pick a point.',
      '<b>Language</b> follows your browser settings; change it in the toolbar or with the link parameter <code>?lang=ru</code>.',
    ],
  };

  NS.LOCALES = { ru, en };
  const FALLBACK = 'en';

  function detect() {
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get('lang') || '').slice(0, 2).toLowerCase();
    if (NS.LOCALES[fromUrl]) return fromUrl;
    let saved = null;
    try { saved = localStorage.getItem('astroscape.lang'); } catch (e) {}
    if (saved && NS.LOCALES[saved]) return saved;
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || FALLBACK];
    for (const p of prefs) {
      const base = String(p).slice(0, 2).toLowerCase();
      if (NS.LOCALES[base]) return base;
    }
    return FALLBACK;
  }

  function lookup(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function t(key, params) {
    let s = lookup(NS.L.ui, key);
    if (s === undefined) s = lookup(NS.L, key);
    if (s === undefined) s = lookup(NS.LOCALES[FALLBACK].ui, key);
    if (s === undefined) return key;
    if (params) Object.keys(params).forEach(k => { s = s.replace('{' + k + '}', params[k]); });
    return s;
  }

  // Подставить локализованные имена в справочники данных
  function applyData(L) {
    NS.BODIES.forEach(b => { b.name = L.planets[b.id]; });
    NS.ZODIAC.forEach((z, i) => { z.name = L.zodiac[i]; });
    NS.ASPECTS.forEach((a, i) => { a.name = L.aspects[i]; });
    NS.PRESETS.forEach(p => { p.name = p[L.code] || p.en; });
    NS.PHASE_NAMES = L.phases;
    NS.QUARTER_NAMES = L.quarters;
    NS.ECLIPSE_KIND = L.eclipseKind;
    NS.CONSTELLATIONS = L.constellations;
    NS.starName = st => (L.code === 'ru' ? st[1] : st[0]);
  }

  function applyDom(L) {
    document.documentElement.lang = L.code;
    document.title = L.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = L.description;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    const help = document.getElementById('help-body');
    if (help) help.innerHTML = L.help.map(p => '<p>' + p + '</p>').join('');
    const sel = document.getElementById('lang');
    if (sel) {
      sel.innerHTML = Object.keys(NS.LOCALES).map(c => '<option value="' + c + '">' + c.toUpperCase() + '</option>').join('');
      sel.value = L.code;
      sel.title = t('langTitle');
    }
  }

  NS.I18N = {
    init() {
      const code = detect();
      NS.L = NS.LOCALES[code];
      this.lang = code;
      this.intl = NS.L.intl;
      applyData(NS.L);
      applyDom(NS.L);
    },
    setLang(code) {
      if (!NS.LOCALES[code]) return;
      try { localStorage.setItem('astroscape.lang', code); } catch (e) {}
      const url = new URL(location.href);
      url.searchParams.delete('lang');
      location.href = url.toString();
    },
    t,
  };
  NS.t = t;
})(window.AstroScape);
