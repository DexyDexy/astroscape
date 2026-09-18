/* AstroScape — статические данные (названия подставляются модулем локализации) */
window.AstroScape = window.AstroScape || {};
(function (NS) {
  'use strict';

  // Тела: порядок = порядок колец (от Земли наружу). Поле name заполняет i18n.
  NS.BODIES = [
    { id: 'Moon',    glyph: '☽', color: '#e8eef5', ring: 1.55, size: 0.085, helio: false },
    { id: 'Mercury', glyph: '☿', color: '#b8c4cc', ring: 1.85, size: 0.045, helio: true,  period: 88 },
    { id: 'Venus',   glyph: '♀', color: '#f3d9a0', ring: 2.12, size: 0.06,  helio: true,  period: 225 },
    { id: 'Sun',     glyph: '☉', color: '#ffd36b', ring: 2.40, size: 0.11,  helio: false },
    { id: 'Mars',    glyph: '♂', color: '#ff7a59', ring: 2.68, size: 0.05,  helio: true,  period: 687 },
    { id: 'Jupiter', glyph: '♃', color: '#f0b980', ring: 2.96, size: 0.09,  helio: true,  period: 4333 },
    { id: 'Saturn',  glyph: '♄', color: '#e6d3a3', ring: 3.24, size: 0.08,  helio: true,  period: 10759 },
    { id: 'Uranus',  glyph: '♅', color: '#9fe7ea', ring: 3.52, size: 0.065, helio: true,  period: 30687 },
    { id: 'Neptune', glyph: '♆', color: '#7aa6ff', ring: 3.80, size: 0.065, helio: true,  period: 60190 },
    { id: 'Pluto',   glyph: '♇', color: '#c9b7d9', ring: 4.05, size: 0.04,  helio: true,  period: 90560 },
  ];
  NS.BODY = {};
  NS.BODIES.forEach(b => NS.BODY[b.id] = b);
  NS.RETRO_BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  NS.ZODIAC_R = 4.45;      // радиус кольца зодиака
  NS.HORIZON_R = 5.1;      // радиус кольца горизонта
  NS.EQUATOR_R = 5.5;      // небесный экватор
  NS.LAT_SCALE = 2.0;      // преувеличение эклиптической широты

  NS.ZODIAC = [
    { glyph: '♈', el: 'fire'  }, { glyph: '♉', el: 'earth' }, { glyph: '♊', el: 'air'   }, { glyph: '♋', el: 'water' },
    { glyph: '♌', el: 'fire'  }, { glyph: '♍', el: 'earth' }, { glyph: '♎', el: 'air'   }, { glyph: '♏', el: 'water' },
    { glyph: '♐', el: 'fire'  }, { glyph: '♑', el: 'earth' }, { glyph: '♒', el: 'air'   }, { glyph: '♓', el: 'water' },
  ];
  NS.ELEMENT_COLOR = { fire: '#ff8a5c', earth: '#8ee6a5', air: '#ffe58a', water: '#79b8ff' };

  // Порядок совпадает с массивом aspects в словарях
  NS.ASPECTS = [
    { sym: '☌', angle: 0,   orb: 8, color: '#ffd36b' },
    { sym: '☍', angle: 180, orb: 8, color: '#ff6b6b' },
    { sym: '△', angle: 120, orb: 7, color: '#79b8ff' },
    { sym: '□', angle: 90,  orb: 6, color: '#ff9f68' },
    { sym: '⚹', angle: 60,  orb: 4, color: '#8ee6a5' },
  ];

  NS.QUARTER_ICONS = ['●', '◗', '○', '◖'];

  // Яркие звёзды: [name en, name ru, RA часы, Dec градусы, зв. величина]  (J2000, округлённо)
  NS.STARS = [
    ['Sirius', 'Сириус', 6.752, -16.72, -1.46], ['Canopus', 'Канопус', 6.399, -52.70, -0.74], ['Arcturus', 'Арктур', 14.261, 19.18, -0.05],
    ['Vega', 'Вега', 18.616, 38.78, 0.03], ['Capella', 'Капелла', 5.278, 45.998, 0.08], ['Rigel', 'Ригель', 5.242, -8.20, 0.13],
    ['Procyon', 'Процион', 7.655, 5.22, 0.34], ['Achernar', 'Ахернар', 1.629, -57.24, 0.46], ['Betelgeuse', 'Бетельгейзе', 5.919, 7.41, 0.5],
    ['Hadar', 'Хадар', 14.064, -60.37, 0.61], ['Altair', 'Альтаир', 19.846, 8.87, 0.76], ['Acrux', 'Акрукс', 12.443, -63.10, 0.76],
    ['Aldebaran', 'Альдебаран', 4.599, 16.51, 0.86], ['Antares', 'Антарес', 16.490, -26.43, 1.06], ['Spica', 'Спика', 13.420, -11.16, 0.97],
    ['Pollux', 'Поллукс', 7.755, 28.03, 1.14], ['Fomalhaut', 'Фомальгаут', 22.961, -29.62, 1.16], ['Deneb', 'Денеб', 20.690, 45.28, 1.25],
    ['Mimosa', 'Мимоза', 12.795, -59.69, 1.25], ['Regulus', 'Регул', 10.139, 11.97, 1.35], ['Adhara', 'Адара', 6.977, -28.97, 1.5],
    ['Castor', 'Кастор', 7.577, 31.89, 1.58], ['Gacrux', 'Гакрукс', 12.519, -57.11, 1.63], ['Shaula', 'Шаула', 17.560, -37.10, 1.62],
    ['Bellatrix', 'Беллатрикс', 5.419, 6.35, 1.64], ['Elnath', 'Эльнат', 5.438, 28.61, 1.65], ['Miaplacidus', 'Миаплацидус', 9.220, -69.72, 1.67],
    ['Alnilam', 'Альнилам', 5.604, -1.20, 1.69], ['Alnair', 'Альнаир', 22.137, -46.96, 1.74], ['Alnitak', 'Альнитак', 5.679, -1.94, 1.74],
    ['Alioth', 'Алиот', 12.900, 55.96, 1.76], ['Mirfak', 'Мирфак', 3.405, 49.86, 1.79], ['Dubhe', 'Дубхе', 11.062, 61.75, 1.79],
    ['Wezen', 'Везен', 7.140, -26.39, 1.83], ['Kaus Australis', 'Каус Аустралис', 18.403, -34.38, 1.85], ['Alkaid', 'Бенетнаш', 13.792, 49.31, 1.86],
    ['Avior', 'Авиор', 8.375, -59.51, 1.86], ['Sargas', 'Саргас', 17.622, -43.00, 1.87], ['Menkalinan', 'Менкалинан', 5.992, 44.95, 1.9],
    ['Atria', 'Атрия', 16.811, -69.03, 1.91], ['Alhena', 'Альхена', 6.629, 16.40, 1.93], ['Peacock', 'Пикок', 20.427, -56.74, 1.94],
    ['Polaris', 'Полярная', 2.530, 89.26, 1.98], ['Mirzam', 'Мирцам', 6.378, -17.96, 1.98], ['Alphard', 'Альфард', 9.460, -8.66, 1.98],
    ['Hamal', 'Хамаль', 2.120, 23.46, 2.0], ['Algieba', 'Альгиеба', 10.333, 19.84, 2.08], ['Diadem', 'Диадема', 13.166, 17.53, 4.3],
    ['Denebola', 'Денебола', 11.818, 14.57, 2.14], ['Nunki', 'Нунки', 18.921, -26.30, 2.05], ['Menkent', 'Менкент', 14.111, -36.37, 2.06],
    ['Alpheratz', 'Альферац', 0.140, 29.09, 2.06], ['Mirach', 'Мирах', 1.162, 35.62, 2.05], ['Saiph', 'Саиф', 5.796, -9.67, 2.09],
    ['Kochab', 'Кохаб', 14.845, 74.16, 2.08], ['Rasalhague', 'Рас Альхаге', 17.582, 12.56, 2.08], ['Algol', 'Альголь', 3.136, 40.96, 2.12],
    ['Almach', 'Аламак', 2.065, 42.33, 2.1], ['Diphda', 'Дифда', 0.727, -17.99, 2.04], ['Naos', 'Наос', 8.060, -40.00, 2.25],
    ['Aspidiske', 'Аспидиске', 9.285, -59.28, 2.21], ['Alphecca', 'Альфекка', 15.578, 26.71, 2.23], ['Mizar', 'Мицар', 13.399, 54.93, 2.23],
    ['Sadr', 'Садр', 20.371, 40.26, 2.23], ['Schedar', 'Шедар', 0.675, 56.54, 2.24], ['Eltanin', 'Этамин', 17.943, 51.49, 2.24],
    ['Mintaka', 'Минтака', 5.533, -0.30, 2.25], ['Caph', 'Каф', 0.153, 59.15, 2.28], ['Dschubba', 'Джубба', 16.006, -22.62, 2.29],
    ['Girtab', 'Гиртаб', 17.708, -39.03, 2.4], ['Merak', 'Мерак', 11.031, 56.38, 2.37], ['Ankaa', 'Анкаа', 0.438, -42.31, 2.4],
    ['Izar', 'Ицар', 14.750, 27.07, 2.35], ['Enif', 'Эниф', 21.736, 9.88, 2.38], ['Zubeneschamali', 'Зубенэшамали', 15.283, -9.38, 2.61],
    ['Zubenelgenubi', 'Зубенэльгенуби', 14.848, -16.04, 2.75], ['Markab', 'Маркаб', 23.079, 15.21, 2.49], ['Scheat', 'Шеат', 23.063, 28.08, 2.42],
    ['Algenib', 'Альгениб', 0.220, 15.18, 2.83], ['Phecda', 'Фекда', 11.897, 53.69, 2.44], ['Megrez', 'Мегрец', 12.257, 57.03, 3.31],
    ['Alderamin', 'Альдерамин', 21.310, 62.59, 2.45], ['Menkar', 'Менкар', 3.038, 4.09, 2.53], ['Albireo', 'Альбирео', 19.512, 27.96, 3.18],
    ['Rasalgethi', 'Рас Альгети', 17.244, 14.39, 3.1], ['Unukalhai', 'Унук Эльхайя', 15.738, 6.43, 2.63], ['Achird', 'Ахирд', 0.817, 57.82, 3.44],
    ['Alcyone', 'Альциона', 3.791, 24.11, 2.87], ['Zosma', 'Зосма', 11.235, 20.52, 2.56], ['Vindemiatrix', 'Виндемиатрикс', 13.036, 10.96, 2.83],
    ['Sadalmelik', 'Садальмелик', 22.096, -0.32, 2.94], ['Sadalsuud', 'Садальсууд', 21.526, -5.57, 2.87], ['Dabih', 'Дабих', 20.350, -14.78, 3.05],
    ['Algedi', 'Альгеди', 20.294, -12.51, 3.57], ['Deneb Algedi', 'Денеб Альгеди', 21.784, -16.13, 2.85], ['Tejat', 'Теджат', 6.383, 22.51, 2.87],
    ['Wasat', 'Васат', 7.335, 21.98, 3.5], ['Mebsuta', 'Мебсута', 6.732, 25.13, 3.06], ['Asellus Australis', 'Азеллюс Аустралис', 8.745, 18.15, 3.94],
    ['Acubens', 'Акубенс', 8.975, 11.86, 4.26], ['Tarf', 'Альтарф', 8.275, 9.19, 3.53],
    ['Sheratan', 'Шератан', 1.911, 20.81, 2.64], ['Alrescha', 'Альриша', 2.034, 2.76, 3.82], ['Eta Piscium', 'Эта Рыб', 1.525, 15.35, 3.62],
    ['Kaus Media', 'Каус Медиа', 18.350, -29.83, 2.7], ['Ascella', 'Аскелла', 19.044, -29.88, 2.6], ['Alnasl', 'Альнасль', 18.096, -30.42, 2.98],
    ['Sabik', 'Сабик', 17.173, -15.72, 2.43], ['Yed Prior', 'Йед Приор', 16.239, -3.69, 2.73], ['Cebalrai', 'Кебальрай', 17.725, 4.57, 2.76],
    ['Acrab', 'Акраб', 16.091, -19.81, 2.62], ['Larawag', 'Ларавак', 16.836, -34.29, 2.29],
    ['Porrima', 'Поррима', 12.694, -1.45, 2.74], ['Zaniah', 'Заниах', 12.332, -0.67, 3.89], ['Heze', 'Хезе', 13.578, -0.60, 3.38],
    ['Ras Elased Australis', 'Альгенуби', 9.786, 23.77, 3.44], ['Rasalas', 'Расалас', 9.879, 26.01, 3.88],
    ['Ain', 'Аин', 4.477, 19.18, 3.53], ['Tianguan', 'Тяньгуань', 5.627, 21.14, 3.0], ['Prima Hyadum', 'Гиадум I', 4.330, 15.63, 3.4],
  ];
  // Сколько самых ярких подписывать
  NS.STAR_LABEL_LIMIT = 42;

  // Города: name заполняет i18n из ru/en
  NS.PRESETS = [
    { ru: 'Москва', en: 'Moscow', de: 'Moskau', es: 'Moscú', fr: 'Moscou', it: 'Mosca', pt: 'Moscou', lat: 55.7558, lon: 37.6173 },
    { ru: 'Санкт-Петербург', en: 'Saint Petersburg', de: 'Sankt Petersburg', es: 'San Petersburgo', fr: 'Saint-Pétersbourg', it: 'San Pietroburgo', pt: 'São Petersburgo', lat: 59.9343, lon: 30.3351 },
    { ru: 'Новосибирск', en: 'Novosibirsk', de: 'Nowosibirsk', lat: 55.0084, lon: 82.9357 },
    { ru: 'Екатеринбург', en: 'Yekaterinburg', de: 'Jekaterinburg', es: 'Ekaterimburgo', fr: 'Iekaterinbourg', it: 'Ekaterinburg', pt: 'Ecaterimburgo', lat: 56.8389, lon: 60.6057 },
    { ru: 'Казань', en: 'Kazan', de: 'Kasan', es: 'Kazán', lat: 55.7963, lon: 49.1088 },
    { ru: 'Сочи', en: 'Sochi', de: 'Sotschi', fr: 'Sotchi', lat: 43.6028, lon: 39.7342 },
    { ru: 'Владивосток', en: 'Vladivostok', de: 'Wladiwostok', lat: 43.1155, lon: 131.8855 },
    { ru: 'Минск', en: 'Minsk', lat: 53.9006, lon: 27.5590 },
    { ru: 'Киев', en: 'Kyiv', de: 'Kiew', es: 'Kiev', fr: 'Kiev', it: 'Kiev', pt: 'Kiev', lat: 50.4501, lon: 30.5234 },
    { ru: 'Алматы', en: 'Almaty', lat: 43.2220, lon: 76.8512 },
    { ru: 'Тбилиси', en: 'Tbilisi', de: 'Tiflis', es: 'Tiflis', lat: 41.7151, lon: 44.8271 },
    { ru: 'Ереван', en: 'Yerevan', de: 'Eriwan', es: 'Ereván', fr: 'Erevan', it: 'Erevan', pt: 'Erevan', lat: 40.1792, lon: 44.4991 },
    { ru: 'Ташкент', en: 'Tashkent', de: 'Taschkent', es: 'Taskent', fr: 'Tachkent', lat: 41.2995, lon: 69.2401 },
    { ru: 'Тель-Авив', en: 'Tel Aviv', lat: 32.0853, lon: 34.7818 },
    { ru: 'Дубай', en: 'Dubai', es: 'Dubái', fr: 'Dubaï', lat: 25.2048, lon: 55.2708 },
    { ru: 'Стамбул', en: 'Istanbul', es: 'Estambul', pt: 'Istambul', lat: 41.0082, lon: 28.9784 },
    { ru: 'Лондон', en: 'London', es: 'Londres', fr: 'Londres', it: 'Londra', pt: 'Londres', lat: 51.5074, lon: -0.1278 },
    { ru: 'Париж', en: 'Paris', es: 'París', it: 'Parigi', lat: 48.8566, lon: 2.3522 },
    { ru: 'Берлин', en: 'Berlin', es: 'Berlín', it: 'Berlino', pt: 'Berlim', lat: 52.5200, lon: 13.4050 },
    { ru: 'Рим', en: 'Rome', de: 'Rom', es: 'Roma', it: 'Roma', pt: 'Roma', lat: 41.9028, lon: 12.4964 },
    { ru: 'Мадрид', en: 'Madrid', lat: 40.4168, lon: -3.7038 },
    { ru: 'Лиссабон', en: 'Lisbon', de: 'Lissabon', es: 'Lisboa', fr: 'Lisbonne', it: 'Lisbona', pt: 'Lisboa', lat: 38.7223, lon: -9.1393 },
    { ru: 'Прага', en: 'Prague', de: 'Prag', es: 'Praga', it: 'Praga', pt: 'Praga', lat: 50.0755, lon: 14.4378 },
    { ru: 'Варшава', en: 'Warsaw', de: 'Warschau', es: 'Varsovia', fr: 'Varsovie', it: 'Varsavia', pt: 'Varsóvia', lat: 52.2297, lon: 21.0122 },
    { ru: 'Рига', en: 'Riga', lat: 56.9496, lon: 24.1052 },
    { ru: 'Хельсинки', en: 'Helsinki', lat: 60.1699, lon: 24.9384 },
    { ru: 'Рейкьявик', en: 'Reykjavík', de: 'Reykjavik', es: 'Reikiavik', pt: 'Reiquiavique', lat: 64.1466, lon: -21.9426 },
    { ru: 'Нью-Йорк', en: 'New York', es: 'Nueva York', pt: 'Nova York', lat: 40.7128, lon: -74.0060 },
    { ru: 'Лос-Анджелес', en: 'Los Angeles', es: 'Los Ángeles', lat: 34.0522, lon: -118.2437 },
    { ru: 'Сан-Франциско', en: 'San Francisco', lat: 37.7749, lon: -122.4194 },
    { ru: 'Майами', en: 'Miami', lat: 25.7617, lon: -80.1918 },
    { ru: 'Торонто', en: 'Toronto', lat: 43.6532, lon: -79.3832 },
    { ru: 'Мехико', en: 'Mexico City', de: 'Mexiko-Stadt', es: 'Ciudad de México', fr: 'Mexico', it: 'Città del Messico', pt: 'Cidade do México', lat: 19.4326, lon: -99.1332 },
    { ru: 'Буэнос-Айрес', en: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
    { ru: 'Рио-де-Жанейро', en: 'Rio de Janeiro', es: 'Río de Janeiro', lat: -22.9068, lon: -43.1729 },
    { ru: 'Каир', en: 'Cairo', de: 'Kairo', es: 'El Cairo', fr: 'Le Caire', it: 'Il Cairo', lat: 30.0444, lon: 31.2357 },
    { ru: 'Кейптаун', en: 'Cape Town', de: 'Kapstadt', es: 'Ciudad del Cabo', fr: 'Le Cap', it: 'Città del Capo', pt: 'Cidade do Cabo', lat: -33.9249, lon: 18.4241 },
    { ru: 'Найроби', en: 'Nairobi', lat: -1.2921, lon: 36.8219 },
    { ru: 'Мумбаи', en: 'Mumbai', es: 'Bombay', fr: 'Bombay', lat: 19.0760, lon: 72.8777 },
    { ru: 'Дели', en: 'Delhi', pt: 'Déli', lat: 28.6139, lon: 77.2090 },
    { ru: 'Бангкок', en: 'Bangkok', lat: 13.7563, lon: 100.5018 },
    { ru: 'Сингапур', en: 'Singapore', de: 'Singapur', es: 'Singapur', fr: 'Singapour', pt: 'Singapura', lat: 1.3521, lon: 103.8198 },
    { ru: 'Бали (Денпасар)', en: 'Bali (Denpasar)', lat: -8.6705, lon: 115.2126 },
    { ru: 'Гонконг', en: 'Hong Kong', de: 'Hongkong', lat: 22.3193, lon: 114.1694 },
    { ru: 'Пекин', en: 'Beijing', de: 'Peking', es: 'Pekín', fr: 'Pékin', it: 'Pechino', pt: 'Pequim', lat: 39.9042, lon: 116.4074 },
    { ru: 'Шанхай', en: 'Shanghai', es: 'Shanghái', pt: 'Xangai', lat: 31.2304, lon: 121.4737 },
    { ru: 'Сеул', en: 'Seoul', es: 'Seúl', fr: 'Séoul', it: 'Seul', pt: 'Seul', lat: 37.5665, lon: 126.9780 },
    { ru: 'Токио', en: 'Tokyo', de: 'Tokio', es: 'Tokio', pt: 'Tóquio', lat: 35.6762, lon: 139.6503 },
    { ru: 'Сидней', en: 'Sydney', es: 'Sídney', pt: 'Sydney', lat: -33.8688, lon: 151.2093 },
    { ru: 'Окленд', en: 'Auckland', lat: -36.8485, lon: 174.7633 },
    { ru: 'Гонолулу', en: 'Honolulu', lat: 21.3069, lon: -157.8583 },
    { ru: 'Северный полюс', en: 'North Pole', de: 'Nordpol', es: 'Polo Norte', fr: 'Pôle Nord', it: 'Polo Nord', pt: 'Polo Norte', lat: 89.99, lon: 0 },
    { ru: 'Гринвич', en: 'Greenwich', lat: 51.4779, lon: -0.0015 },
    { ru: 'Экватор (Кито)', en: 'Equator (Quito)', de: 'Äquator (Quito)', es: 'Ecuador (Quito)', fr: 'Équateur (Quito)', it: 'Equatore (Quito)', pt: 'Equador (Quito)', lat: -0.1807, lon: -78.4678 },
  ];

  // Часовой пояс устройства → ближайший крупный город (без сети и разрешений).
  // Значение: имя города из PRESETS (поле en) либо [lat, lon, 'Name', 'Имя по-русски'].
  NS.TZ_HINTS = {
    'Europe/Moscow': 'Moscow', 'Europe/Kiev': 'Kyiv', 'Europe/Kyiv': 'Kyiv', 'Europe/Minsk': 'Minsk', 'Europe/Istanbul': 'Istanbul',
    'Europe/London': 'London', 'Europe/Paris': 'Paris', 'Europe/Berlin': 'Berlin', 'Europe/Rome': 'Rome', 'Europe/Madrid': 'Madrid',
    'Europe/Lisbon': 'Lisbon', 'Europe/Prague': 'Prague', 'Europe/Warsaw': 'Warsaw', 'Europe/Riga': 'Riga', 'Europe/Helsinki': 'Helsinki',
    'Atlantic/Reykjavik': 'Reykjavík', 'Europe/Samara': [53.20, 50.15, 'Samara', 'Самара'], 'Europe/Volgograd': [48.71, 44.51, 'Volgograd', 'Волгоград'],
    'Europe/Kaliningrad': [54.71, 20.45, 'Kaliningrad', 'Калининград'], 'Europe/Vienna': [48.21, 16.37, 'Vienna', 'Вена'], 'Europe/Zurich': [47.38, 8.54, 'Zurich', 'Цюрих'],
    'Europe/Amsterdam': [52.37, 4.90, 'Amsterdam', 'Амстердам'], 'Europe/Brussels': [50.85, 4.35, 'Brussels', 'Брюссель'], 'Europe/Stockholm': [59.33, 18.07, 'Stockholm', 'Стокгольм'],
    'Europe/Oslo': [59.91, 10.75, 'Oslo', 'Осло'], 'Europe/Copenhagen': [55.68, 12.57, 'Copenhagen', 'Копенгаген'], 'Europe/Dublin': [53.35, -6.26, 'Dublin', 'Дублин'],
    'Europe/Athens': [37.98, 23.73, 'Athens', 'Афины'], 'Europe/Budapest': [47.50, 19.04, 'Budapest', 'Будапешт'], 'Europe/Bucharest': [44.43, 26.10, 'Bucharest', 'Бухарест'],
    'Europe/Sofia': [42.70, 23.32, 'Sofia', 'София'], 'Europe/Belgrade': [44.79, 20.45, 'Belgrade', 'Белград'], 'Europe/Zagreb': [45.81, 15.98, 'Zagreb', 'Загреб'],
    'Europe/Ljubljana': [46.06, 14.51, 'Ljubljana', 'Любляна'], 'Europe/Bratislava': [48.15, 17.11, 'Bratislava', 'Братислава'], 'Europe/Vilnius': [54.69, 25.28, 'Vilnius', 'Вильнюс'],
    'Europe/Tallinn': [59.44, 24.75, 'Tallinn', 'Таллин'], 'Europe/Chisinau': [47.01, 28.86, 'Chișinău', 'Кишинёв'], 'Europe/Luxembourg': [49.61, 6.13, 'Luxembourg', 'Люксембург'],
    'Asia/Tbilisi': 'Tbilisi', 'Asia/Yerevan': 'Yerevan', 'Asia/Baku': [40.41, 49.87, 'Baku', 'Баку'], 'Asia/Tashkent': 'Tashkent', 'Asia/Almaty': 'Almaty',
    'Asia/Yekaterinburg': 'Yekaterinburg', 'Asia/Novosibirsk': 'Novosibirsk', 'Asia/Omsk': [54.99, 73.37, 'Omsk', 'Омск'], 'Asia/Krasnoyarsk': [56.01, 92.87, 'Krasnoyarsk', 'Красноярск'],
    'Asia/Irkutsk': [52.29, 104.30, 'Irkutsk', 'Иркутск'], 'Asia/Yakutsk': [62.03, 129.73, 'Yakutsk', 'Якутск'], 'Asia/Vladivostok': 'Vladivostok', 'Asia/Magadan': [59.56, 150.80, 'Magadan', 'Магадан'],
    'Asia/Kamchatka': [53.02, 158.65, 'Petropavlovsk-Kamchatsky', 'Петропавловск-Камчатский'], 'Asia/Tokyo': 'Tokyo', 'Asia/Seoul': 'Seoul', 'Asia/Shanghai': 'Shanghai',
    'Asia/Hong_Kong': 'Hong Kong', 'Asia/Singapore': 'Singapore', 'Asia/Bangkok': 'Bangkok', 'Asia/Jakarta': [-6.21, 106.85, 'Jakarta', 'Джакарта'],
    'Asia/Makassar': 'Bali (Denpasar)', 'Asia/Manila': [14.60, 120.98, 'Manila', 'Манила'], 'Asia/Kolkata': [22.57, 88.36, 'Kolkata', 'Калькутта'], 'Asia/Calcutta': [22.57, 88.36, 'Kolkata', 'Калькутта'],
    'Asia/Dubai': 'Dubai', 'Asia/Jerusalem': 'Tel Aviv', 'Asia/Tel_Aviv': 'Tel Aviv', 'Asia/Riyadh': [24.71, 46.68, 'Riyadh', 'Эр-Рияд'], 'Asia/Tehran': [35.69, 51.39, 'Tehran', 'Тегеран'],
    'Asia/Karachi': [24.86, 67.01, 'Karachi', 'Карачи'], 'Asia/Dhaka': [23.81, 90.41, 'Dhaka', 'Дакка'], 'Asia/Kathmandu': [27.72, 85.32, 'Kathmandu', 'Катманду'], 'Asia/Taipei': [25.03, 121.57, 'Taipei', 'Тайбэй'],
    'Asia/Ho_Chi_Minh': [10.82, 106.63, 'Ho Chi Minh City', 'Хошимин'], 'Asia/Kuala_Lumpur': [3.14, 101.69, 'Kuala Lumpur', 'Куала-Лумпур'], 'Asia/Beirut': [33.89, 35.50, 'Beirut', 'Бейрут'],
    'Australia/Sydney': 'Sydney', 'Australia/Melbourne': [-37.81, 144.96, 'Melbourne', 'Мельбурн'], 'Australia/Brisbane': [-27.47, 153.03, 'Brisbane', 'Брисбен'],
    'Australia/Perth': [-31.95, 115.86, 'Perth', 'Перт'], 'Australia/Adelaide': [-34.93, 138.60, 'Adelaide', 'Аделаида'], 'Pacific/Auckland': 'Auckland', 'Pacific/Honolulu': 'Honolulu',
    'America/New_York': 'New York', 'America/Chicago': [41.88, -87.63, 'Chicago', 'Чикаго'], 'America/Denver': [39.74, -104.99, 'Denver', 'Денвер'], 'America/Phoenix': [33.45, -112.07, 'Phoenix', 'Финикс'],
    'America/Los_Angeles': 'Los Angeles', 'America/Anchorage': [61.22, -149.90, 'Anchorage', 'Анкоридж'], 'America/Toronto': 'Toronto', 'America/Vancouver': [49.28, -123.12, 'Vancouver', 'Ванкувер'],
    'America/Mexico_City': 'Mexico City', 'America/Bogota': [4.71, -74.07, 'Bogotá', 'Богота'], 'America/Lima': [-12.05, -77.04, 'Lima', 'Лима'], 'America/Santiago': [-33.45, -70.67, 'Santiago', 'Сантьяго'],
    'America/Argentina/Buenos_Aires': 'Buenos Aires', 'America/Buenos_Aires': 'Buenos Aires', 'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo', 'Сан-Паулу'],
    'America/Caracas': [10.48, -66.90, 'Caracas', 'Каракас'], 'America/Havana': [23.11, -82.37, 'Havana', 'Гавана'], 'America/Panama': [8.98, -79.52, 'Panama City', 'Панама'],
    'America/Guayaquil': 'Equator (Quito)', 'America/Montevideo': [-34.90, -56.16, 'Montevideo', 'Монтевидео'], 'America/Halifax': [44.65, -63.57, 'Halifax', 'Галифакс'],
    'Africa/Cairo': 'Cairo', 'Africa/Johannesburg': [-26.20, 28.05, 'Johannesburg', 'Йоханнесбург'], 'Africa/Nairobi': 'Nairobi', 'Africa/Lagos': [6.52, 3.38, 'Lagos', 'Лагос'],
    'Africa/Casablanca': [33.57, -7.59, 'Casablanca', 'Касабланка'], 'Africa/Algiers': [36.75, 3.06, 'Algiers', 'Алжир'], 'Africa/Tunis': [36.81, 10.17, 'Tunis', 'Тунис'],
    'Africa/Accra': [5.60, -0.19, 'Accra', 'Аккра'], 'Africa/Addis_Ababa': [9.03, 38.74, 'Addis Ababa', 'Аддис-Абеба'],
  };
})(window.AstroScape);
