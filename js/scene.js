/* AstroScape — 3D‑сцена (three.js) */
(function (NS) {
  'use strict';
  const DEG = Math.PI / 180;

  function Scene(libs, opts) {
    const { THREE, OrbitControls, CSS2DRenderer, CSS2DObject, EffectComposer, RenderPass, UnrealBloomPass, OutputPass,
      LineSegments2, LineSegmentsGeometry, LineMaterial } = libs;
    const S = this;
    const Astro = NS.Astro;
    S.mode = 'geo';
    S.options = { aspects: true, bloom: true, starLabels: true };
    S.selected = null;
    S.pickGlobe = false;
    S.onPick = opts.onPick || function () {};
    S.onGlobePick = opts.onGlobePick || function () {};
    S.onInteract = opts.onInteract || function () {};

    // ------------------------------------------------------------ базовое
    // На телефонах ограничиваем плотность пикселей: иначе буферы постобработки
    // съедают память и вкладка может быть выгружена (особенно в iOS Safari).
    const small = Math.min(window.innerWidth, window.innerHeight) <= 820;
    const renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    opts.container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer({ element: opts.labels });
    labelRenderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 3000);
    const HOME = new THREE.Vector3(2.2, 9.2, -7.4);
    const HOME_HELIO = new THREE.Vector3(3, 13, -11);
    camera.position.copy(HOME);
    S.camera = camera;
    S.scene = scene;

    const controls = new OrbitControls(camera, renderer.domElement);
    S.controls = controls;
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 2.0; controls.maxDistance = 70;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.12;
    controls.rotateSpeed = 0.7;
    let idleTimer = null;
    controls.addEventListener('start', () => {
      controls.autoRotate = false; clearTimeout(idleTimer); S.onInteract();
      idleTimer = setTimeout(() => { controls.autoRotate = true; }, 40000);
    });

    // постобработка
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // Страховка перед свечением. Если на какой-то видеокарте шейдер выдаст в пиксель NaN
    // («не число») или бесконечность, размытие растащит его на большой блок и на кадр
    // появится чёрный прямоугольник. Здесь такие значения заменяются нулём.
    const sanitize = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0);
          gl_FragColor = clamp(c, 0.0, 65000.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    const sanitizeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sanitize);
    const sanitizeScene = new THREE.Scene(); sanitizeScene.add(sanitizeQuad);
    const sanitizeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    composer.addPass({
      enabled: true, needsSwap: true, clear: false, renderToScreen: false,
      setSize() {}, dispose() {},
      render(r, writeBuffer, readBuffer) {
        sanitize.uniforms.tDiffuse.value = readBuffer.texture;
        r.setRenderTarget(writeBuffer); r.render(sanitizeScene, sanitizeCam);
      },
    });
    // Свечение складывается из пяти размытий с ширинами примерно 6, 20, 56, 144 и 352 px.
    // При весах по умолчанию вклады почти равны, сумма даёт степенной хвост: яркое ядро,
    // затем длинная почти плоская дымка на пол-экрана — её и видно как некрасивый градиент.
    // Веса ниже гасят широкие уровни, поэтому яркость спадает почти по экспоненте и дымка
    // исчезает. Радиус ставим в 0: иначе проход подмешивает к весам их зеркальные значения.
    // Аргументы: разрешение, сила, радиус, порог яркости.
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.267, 0.0, 0.3);
    bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.80, 0.50, 0.22, 0.06];
    composer.addPass(bloom);
    S.bloom = bloom;
    composer.addPass(new OutputPass());

    // свет (для Луны и планет-сфер)
    const sunLight = new THREE.DirectionalLight(0xfff2dc, 2.6);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x334455, 0.35));

    // ------------------------------------------------------------ утилиты
    const C = hex => new THREE.Color(hex);
    function lineMat(color, opacity) {
      return new THREE.LineBasicMaterial({ color: C(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    }
    function circleGeo(r, seg, plane) {
      const pts = [];
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2;
        if (plane === 'xy') pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0));
        else if (plane === 'yz') pts.push(new THREE.Vector3(0, r * Math.cos(a), r * Math.sin(a)));
        else pts.push(new THREE.Vector3(r * Math.cos(a), 0, -r * Math.sin(a)));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    }
    function circle(r, color, opacity, plane, seg) {
      return new THREE.Line(circleGeo(r, seg || 256, plane), lineMat(color, opacity));
    }
    function segments(arr, color, opacity) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return new THREE.LineSegments(g, lineMat(color, opacity));
    }
    function dynLine(n, color, opacity) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const l = new THREE.Line(g, lineMat(color, opacity));
      l.frustumCulled = false;
      return l;
    }
    function setLine(line, pts) {
      const a = line.geometry.attributes.position;
      for (let i = 0; i < pts.length; i++) { a.setXYZ(i, pts[i][0], pts[i][1], pts[i][2]); }
      a.needsUpdate = true;
    }
    function makeLabel(html, cls) {
      const wrap = document.createElement('div');
      const el = document.createElement('div');
      el.className = 'lbl ' + cls;
      el.innerHTML = html;
      wrap.appendChild(el);
      const o = new CSS2DObject(wrap);
      o.el = el;
      return o;
    }
    // Ореол светил. Яркость на ЭКРАНЕ падает как exp(-k·t) и ровно обнуляется у края,
    // поэтому нет ни плоского плато, ни заметной границы «шарика».
    // Кривую пишем в цвет, а не в прозрачность: цветовой канал трактуется как sRGB,
    // его 8 бит распределены перцептивно, и у слабого свечения не появляется ступеней.
    // В прозрачности та же кривая после поправки на гамму ушла бы ниже одной 255-й.
    function glowTexture(k) {
      const N = 160, R = N / 2, kk = k || 6, e = Math.exp(-kk);
      const c = document.createElement('canvas'); c.width = c.height = N;
      const x = c.getContext('2d');
      const img = x.createImageData(N, N), d = img.data;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const dx = i + 0.5 - R, dy = j + 0.5 - R;
          const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / R);
          const v = Math.max(0, (Math.exp(-kk * t) - e) / (1 - e));
          const o = (j * N + i) * 4;
          d[o] = d[o + 1] = d[o + 2] = Math.round(v * 255);
          d[o + 3] = 255;
        }
      }
      x.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    function ringTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 5;
      x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 2; x.globalAlpha = 0.5;
      x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    function starTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    const TEX_GLOW = glowTexture(3), TEX_RING = ringTexture(), TEX_STAR = starTexture();
    function sprite(tex, color, scale, opacity) {
      const m = new THREE.SpriteMaterial({ map: tex, color: C(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      const s = new THREE.Sprite(m); s.scale.setScalar(scale); return s;
    }
    const pickables = [];
    const SUN_DISC = '#f8d8a7';   // диск Солнца: тёплый золотой, осветлённый к белому
    const SUN_RAYS = 0.35;        // размер венца лучей (76% от прежних 0.46)
    const labelTargets = [];   // подписи планет: pointer-events у них выключены, попадание считаем по прямоугольнику
    function labelAt(x, y) {
      for (const t of labelTargets) {
        if (t.mode !== (S.mode === 'helio' ? 'helio' : 'geo')) continue;
        const r = t.el.getBoundingClientRect();
        if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return t;
      }
      return null;
    }

    // ------------------------------------------------------------ звёзды
    const starGroup = new THREE.Group(); scene.add(starGroup);
    (function buildStars() {
      const N = 6000, R = 320;
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < N; i++) {
        const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        pos[i * 3] = R * s * Math.cos(th); pos[i * 3 + 1] = R * u; pos[i * 3 + 2] = R * s * Math.sin(th);
        const t = rnd(), w = 0.35 + Math.pow(rnd(), 3) * 0.65;
        const tint = t < 0.15 ? [0.75, 0.85, 1] : t < 0.85 ? [1, 1, 1] : [1, 0.9, 0.75];
        col[i * 3] = tint[0] * w; col[i * 3 + 1] = tint[1] * w; col[i * 3 + 2] = tint[2] * w;
        size[i] = 1 + Math.pow(rnd(), 4) * 2.2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, map: TEX_STAR, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      starGroup.add(new THREE.Points(g, m));

      // реальные яркие звёзды
      const stars = NS.STARS.slice().sort((a, b) => a[4] - b[4]);
      const bright = [], brightCol = [];
      S.starLabels = [];
      stars.forEach((st, i) => {
        const ra = st[2] * 15 * DEG, dec = st[3] * DEG, mag = st[4];
        const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
        const p = [x * 300, z * 300, -y * 300];
        const w = Math.min(1, Math.max(0.3, 1.15 - mag * 0.22));
        bright.push(p[0], p[1], p[2]); brightCol.push(w, w, w);
        if (i < NS.STAR_LABEL_LIMIT) {
          const l = makeLabel(NS.starName(st), 'lbl-star');
          l.position.set(p[0], p[1], p[2]);
          starGroup.add(l); S.starLabels.push(l);
        }
      });
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(bright, 3));
      g2.setAttribute('color', new THREE.Float32BufferAttribute(brightCol, 3));
      const m2 = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, map: TEX_STAR, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
      starGroup.add(new THREE.Points(g2, m2));

      // небесный экватор
      const eq = circle(NS.EQUATOR_R, '#7fd7ff', 0.16, 'xz', 256);
      scene.add(eq);
      const eqTicks = [];
      for (let h = 0; h < 24; h++) {
        const a = h * 15 * DEG, r1 = NS.EQUATOR_R, r2 = NS.EQUATOR_R + (h % 6 === 0 ? 0.16 : 0.07);
        eqTicks.push(r1 * Math.cos(a), 0, -r1 * Math.sin(a), r2 * Math.cos(a), 0, -r2 * Math.sin(a));
      }
      scene.add(segments(eqTicks, '#7fd7ff', 0.25));
      const eqLbl = makeLabel(NS.t('equator'), 'lbl-tiny'); eqLbl.position.set(0, 0.08, NS.EQUATOR_R + 0.05); scene.add(eqLbl);
      const ariesLbl = makeLabel(NS.t('aries'), 'lbl-tiny'); ariesLbl.position.set(NS.EQUATOR_R + 0.6, -0.12, 0); scene.add(ariesLbl);
    })();



    // Плоскость, перпендикулярная лучу «камера → центр тела», в плоскости касания шара.
    // Круги в такой плоскости проецируются как конусы, соосные с конусом силуэта шара,
    // поэтому у края кадра они искажаются ровно так же, как сам шар. Экранно-выровненный
    // билборд так не умеет: у края он смещается относительно эллипса шара.
    const FACING_VS = `
      uniform float uScale;    // половина стороны квадрата, мировые единицы
      uniform float uSphereR;  // радиус шара тела
      uniform float uLift;     // сдвиг к камере в долях радиуса, против спора глубин
      varying vec2 vP;
      void main() {
        vP = position.xy * 2.0;
        vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float d = max(length(c), 1e-4);
        vec3 u = c / d;                                       // от камеры к центру
        vec3 rx = cross(u, vec3(0.0, 1.0, 0.0));
        vec3 right = dot(rx, rx) > 1e-8 ? normalize(rx) : vec3(1.0, 0.0, 0.0);
        vec3 up = cross(right, u);
        float R = min(uSphereR, d * 0.999);
        float dt = d - R * R / d;                             // расстояние до плоскости касания
        float k = sqrt(max(1.0 - R * R / (d * d), 0.0));       // радиус касания, делённый на R
        float at = max(dt - uLift * R, 1e-4);
        float s = at / dt;                                    // сдвинув плоскость, сохраняем угловой размер
        vec3 p = u * at + (right * position.x + up * position.y) * (2.0 * uScale * k * s);
        gl_Position = projectionMatrix * vec4(p, 1.0);
      }`;

    // Обводка Луны: силуэт шара всегда круг, поэтому рисуем кольцо на билборде.
    // Толщина задаётся в пикселях экрана и обновляется каждый кадр, иначе на
    // общем плане линия стала бы тоньше пикселя и пропала.
    const outlineMats = [];
    function bodyOutline(radius, color) {
      const HALF = radius * 1.8;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uScale: { value: HALF },
          uSphereR: { value: radius },
          uLift: { value: 0.25 },              // четверть радиуса к камере: линия не тонет в шаре
          uR: { value: radius / HALF },        // где проходит край шара
          uW: { value: 0.02 },                 // полутолщина линии в тех же единицах
          uColor: { value: C(color) },
        },
        vertexShader: FACING_VS,
        fragmentShader: `
          precision highp float;
          uniform float uR; uniform float uW; uniform vec3 uColor;
          varying vec2 vP;
          void main() {
            float d = abs(length(vP) - uR);
            float a = 1.0 - smoothstep(uW * 0.55, uW * 1.55, d);
            if (a <= 0.004) discard;
            gl_FragColor = vec4(uColor, a);
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.frustumCulled = false;
      m.userData.half = HALF;
      m.userData.sphereR = radius;
      outlineMats.push(m);
      return m;
    }

    // Ореол на той же касательной плоскости, что лучи и обводка: у края кадра
    // он искажается вместе с шаром и остаётся концентричным с диском.
    function facingGlow(tex, color, scale, opacity, sphereR) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uScale: { value: scale / 2 }, uSphereR: { value: sphereR }, uLift: { value: 0.0 },
          uMap: { value: tex }, uColor: { value: C(color) }, uOpacity: { value: opacity },
        },
        vertexShader: FACING_VS,
        fragmentShader: `
          uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity;
          varying vec2 vP;
          void main() {
            vec4 t = texture2D(uMap, vP * 0.5 + 0.5);
            gl_FragColor = vec4(uColor * t.rgb, t.a * uOpacity);
            #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      mat.opacity = opacity;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.frustumCulled = false;
      m.onBeforeRender = () => { mat.uniforms.uOpacity.value = mat.opacity; };
      return m;
    }
    // Невидимый спрайт того же размера — мишень для клика по телу
    function pickProxy(scale) {
      const s = sprite(TEX_GLOW, '#fff', scale, 0); s.material.visible = false; return s;
    }

    // ------------------------------------------------------------ лучи Солнца
    // Средневековое «пылающее» солнце: остроугольные лучи, изгибающиеся змейкой.
    // Плоскость всегда развёрнута к камере, волна бежит от основания к остриям.
    const rayMats = [];
    function sunRays(scale, opacity, sphereR) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: scale },
          uSphereR: { value: sphereR },
          uLift: { value: 0.0 },
          uColor: { value: C('#ffcf72') },
          uOpacity: { value: opacity },
        },
        vertexShader: FACING_VS,
        fragmentShader: `
          precision highp float;
          uniform float uTime; uniform vec3 uColor; uniform float uOpacity;
          varying vec2 vP;
          const float PI = 3.141592653589793;
          const float N     = 20.0;    // число лучей (чётное: длинные чередуются с короткими)
          const float R0    = 0.27;    // основание у края диска (зазор вдвое меньше прежнего)
          const float LONG  = 0.65;    // остриё длинного луча
          const float SHORT = 0.54;    // остриё короткого
          const float AMP   = 0.055;   // размах змейки, радианы
          const float WID   = 0.110;   // полуширина у основания, радианы
          const float FREQ  = 1.1;     // сколько волн укладывается вдоль луча
          const float SPD   = 0.30;    // скорость бега волны наружу

          float rayCov(float a, float r, float idx, out float tOut) {
            float st = 2.0 * PI / N;
            float base = -PI + (idx + 0.5) * st;
            float odd = mod(idx, 2.0);
            float r1 = mix(LONG, SHORT, odd);
            float t = (r - R0) / (r1 - R0);
            tOut = t;
            if (t < 0.0 || t > 1.0) return 0.0;
            float amp = AMP * smoothstep(0.0, 0.35, t);
            float ph = 2.0 * PI * (FREQ * t - uTime * SPD);           // бежит от основания к острию
            float c = base + amp * sin(ph);
            float w = WID * pow(max(1.0 - t, 0.0), 0.8);        // основания короткие и длинные одинаковой ширины
            float d = a - c;
            d = atan(sin(d), cos(d));
            float e = max(0.3 * w, 0.004);
            float cov = 1.0 - smoothstep(w - e, w + e, abs(d));
            return cov * smoothstep(0.0, 0.06, t);
          }

          void main() {
            float r = length(vP);
            if (r > LONG) discard;
            float a = atan(vP.y, vP.x);
            float st = 2.0 * PI / N;
            float k = floor((a + PI) / st);
            float cov = 0.0, t = 0.0, tt = 0.0;
            for (int i = -1; i <= 1; i++) {                            // соседние сектора: луч мог сместиться
              float cv = rayCov(a, r, k + float(i), tt);
              if (cv > cov) { cov = cv; t = tt; }
            }
            if (cov <= 0.001) discard;
            float fade = mix(1.0, 0.16, clamp(t, 0.0, 1.0));           // к острию тусклее
            gl_FragColor = vec4(uColor, cov * fade * uOpacity);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      rayMats.push(mat);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.frustumCulled = false;
      return m;
    }


    // Кольца планет: лежат в плоскости экватора планеты, ось задана по данным IAU.
    const RING_STYLE = { faint: 0, saturn: 1, narrow: 2 };
    const OBLIQ = 23.4393 * DEG;
    function poleVector(pole, ecliptic) {
      const a = pole[0] * DEG, dcl = pole[1] * DEG;
      const n = new THREE.Vector3(Math.cos(dcl) * Math.cos(a), Math.sin(dcl), -Math.cos(dcl) * Math.sin(a));
      if (ecliptic) {                 // внутри группы эклиптики: обратный поворот на наклон
        const y = n.y * Math.cos(OBLIQ) + n.z * Math.sin(OBLIQ);
        const z = -n.y * Math.sin(OBLIQ) + n.z * Math.cos(OBLIQ);
        n.set(n.x, y, z);
      }
      return n.normalize();
    }
    function planetRing(b, radius, ecliptic) {
      const r = b.rings, inner = r.inner * radius, outer = r.outer * radius;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: C(b.color) }, uOpacity: { value: r.opacity },
          uInner: { value: inner }, uOuter: { value: outer }, uStyle: { value: RING_STYLE[r.style] || 0 },
        },
        vertexShader: `
          varying vec3 vL;
          void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform vec3 uColor; uniform float uOpacity; uniform float uInner; uniform float uOuter; uniform int uStyle;
          varying vec3 vL;
          void main() {
            float t = (length(vL.xy) - uInner) / (uOuter - uInner);   // 0 у внутреннего края, 1 у внешнего
            if (t < 0.0 || t > 1.0) discard;
            float a = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t));
            if (uStyle == 1) {
              // Сатурн: тусклое кольцо C, яркое B, щель Кассини, кольцо A
              a *= mix(0.35, 1.0, smoothstep(0.24, 0.32, t));
              a *= 1.0 - 0.92 * (smoothstep(0.66, 0.69, t) - smoothstep(0.76, 0.79, t));
              a *= mix(1.0, 0.72, step(0.77, t));
            } else if (uStyle == 2) {
              // Уран: несколько узких колец, внешнее ярче
              a *= (0.2 + 0.8 * pow(0.5 + 0.5 * cos(t * 6.2831853 * 4.5), 8.0)) * mix(0.55, 1.0, t);
            } else {
              a *= 0.85;
            }
            gl_FragColor = vec4(uColor, a * uOpacity);
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160, 1), mat);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), poleVector(b.pole, ecliptic));
      return m;
    }

    // ------------------------------------------------------------ Земля
    const earthGroup = new THREE.Group(); scene.add(earthGroup);
    // Ночные огни: NASA Black Marble 2016 (равнопромежуточная проекция, долгота −180…180)
    // Страница, открытая с диска (file://), не может отдать WebGL локальную картинку —
    // браузер считает её «чужой». Тогда берём ту же карту с CDN, он разрешает такое использование.
    const NIGHT_URL = location.protocol === 'file:'
      ? 'https://cdn.jsdelivr.net/gh/DexyDexy/astroscape@main/assets/night-lights.jpg'
      : 'assets/night-lights.jpg';
    const TEX_NIGHT = new THREE.TextureLoader().load(NIGHT_URL);
    TEX_NIGHT.colorSpace = THREE.SRGBColorSpace;
    TEX_NIGHT.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: new THREE.Vector3(1, 0, 0) },
        tNight: { value: TEX_NIGHT },
        cDay: { value: new THREE.Color(0.040, 0.175, 0.255) },   // дневная сторона: светлее и холоднее
        cNight: { value: new THREE.Color(0.0008, 0.0016, 0.0035) },
        cRim: { value: new THREE.Color(0.22, 0.6, 0.9) },
        cTerm: { value: C('#e0a04a') },            // линия терминатора — цвет группы наблюдателя
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vW; varying vec2 vUv;
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec3 sunDir; uniform vec3 cDay; uniform vec3 cNight; uniform vec3 cRim; uniform sampler2D tNight; uniform vec3 cTerm;
        varying vec3 vN; varying vec3 vW; varying vec2 vUv;
        void main(){
          vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
          float ndl = dot(n, sunDir);
          // освещённость по закону Ламберта (яркость ~ косинусу угла Солнца) в линейном
          // пространстве — после гамма-кодирования градиент выглядит естественно;
          // плюс узкая полоса сумерек, чтобы край ночи не обрывался резко
          float lam = pow(max(ndl, 0.0), 0.85);
          float twi = smoothstep(-0.10, 0.08, ndl);
          float day = 0.1 * twi + 0.9 * lam;
          float fres = pow(1.0 - max(dot(n, v), 0.0), 4.5);
          // терминатор: тонкая пунктирная линия постоянной толщины в пикселях
          float fw = max(fwidth(ndl), 1e-5);
          float term = 1.0 - smoothstep(0.6 * fw, 1.6 * fw, abs(ndl));
          vec3 ax1 = normalize(cross(sunDir, abs(sunDir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 ax2 = cross(sunDir, ax1);
          float py = dot(n, ax2), px = dot(n, ax1);
          float ang = (abs(px) + abs(py) > 1e-6) ? atan(py, px) : 0.0;   // положение вдоль окружности терминатора
          float dc = ang * 1152.0 / 6.2831853;                     // 1152 штриха по кругу
          float fd = min(fwidth(dc), 0.5);                         // сглаживание краёв штриха на пиксель
          term *= smoothstep(0.25 - fd, 0.25 + fd, abs(fract(dc) - 0.5));
          // огни включаются в сумерках, когда Солнце уходит на несколько градусов под горизонт
          float night = 1.0 - smoothstep(-0.14, -0.02, ndl);
          // на карте кроме огней есть подсвеченный луной голубоватый рельеф: оставляем только тёплый свет
          vec3 tx = texture2D(tNight, vUv).rgb;
          float lit = max(tx.r + tx.g - 1.25 * tx.b, 0.0);
          vec3 lights = vec3(1.0, 0.72, 0.38) * pow(lit, 1.25) * 1.1;
          vec3 col = mix(cNight, cDay, day) + cRim * fres * mix(0.15, 0.55, day)
                   + cTerm * term * 0.7 + lights * night;
          gl_FragColor = vec4(col, 0.96);
        }`,
      transparent: true, depthWrite: true,
    });
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), earthMat);
    earthMesh.renderOrder = -1;
    earthGroup.add(earthMesh);

    // Атмосфера: мягкий ореол по краю шара на той же касательной плоскости, что обводка Луны.
    // Для каждой точки ободка восстанавливаем её нормаль в мире и считаем, как она освещена:
    // день — голубое рассеяние, ночь — почти ничего, на границе — сумерки. Восход от заката
    // отличаем по вращению Земли: точка, которая въезжает в свет, — утро, уходящая в тень — вечер.
    // Закат глубже и краснее (к вечеру в воздухе больше пыли и дымки) и уходит в пурпур,
    // восход светлее и прохладнее — розово-золотой. На просвет против Солнца ореол ярче.
    const ATMO_HALF = 1.3;
    const ATMO_VS = FACING_VS
      .replace('varying vec2 vP;', 'varying vec2 vP; varying vec3 vView; varying vec3 vCenter;')
      .replace('gl_Position = projectionMatrix * vec4(p, 1.0);',
               'vView = p; vCenter = c; gl_Position = projectionMatrix * vec4(p, 1.0);');
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: ATMO_HALF }, uSphereR: { value: 1.0 }, uLift: { value: 0.0 },
        uR: { value: 1.0 / ATMO_HALF },          // край шара в координатах квадрата
        uW: { value: 0.034 / ATMO_HALF },        // толщина ореола (экспоненциальный спад наружу), 75% от прежней
        sunDir: earthMat.uniforms.sunDir,         // общий с материалом Земли
      },
      vertexShader: ATMO_VS,
      fragmentShader: `
        precision highp float;
        uniform float uR; uniform float uW; uniform vec3 sunDir;
        varying vec2 vP; varying vec3 vView; varying vec3 vCenter;
        void main() {
          float rho = length(vP);
          float x = (rho - uR) / uW;                         // 0 на краю шара, в толщинах ореола
          if (x > 7.0) discard;
          // профиль: быстрый подъём у самого края и мягкий экспоненциальный спад наружу
          float prof = x < 0.0 ? exp(-x * x * 3.0) : exp(-x);
          // нормаль точки ободка: от центра шара к точке на плоскости касания, в мир
          vec3 nV = normalize(vView - vCenter);
          mat3 invView = transpose(mat3(viewMatrix));
          vec3 n = normalize(invView * nV);
          vec3 sd = normalize(sunDir);
          float mu = dot(n, sd);                             // высота Солнца над горизонтом этой точки
          // утро или вечер: скорость точки при вращении Земли вокруг оси Y
          // у полюсов скорость вращения мала — там утро и вечер плавно смешиваются, без шва
          float morning = smoothstep(-0.18, 0.18, dot(cross(vec3(0.0, 1.0, 0.0), n), sd));
          // Солнце освещает атмосферу и чуть за линией терминатора (она выше поверхности)
          float lit = smoothstep(-0.20, 0.03, mu);
          // Покраснение: чем ниже Солнце для этой точки, тем длиннее путь света сквозь воздух.
          // Тёплый цвет плавно слабеет, пока Солнце не поднимется примерно на 45°, а не
          // только ровно на горизонте — поэтому он виден по всему краю вдоль терминатора.
          float red = 1.0 - smoothstep(0.0, 0.72, mu);
          float tail = exp(-pow((mu + 0.15) / 0.09, 2.0));   // пурпурный хвост в сторону ночи
          vec3 cDay     = vec3(0.09, 0.40, 0.70);            // дневная атмосфера: темнее и в бирюзу
          vec3 cNight   = vec3(0.010, 0.020, 0.060);
          vec3 cSunset  = vec3(1.00, 0.30, 0.07);            // глубокий оранжево-красный
          vec3 cSunrise = vec3(1.00, 0.62, 0.42);            // розово-золотой, светлее
          vec3 cPurpleE = vec3(0.45, 0.10, 0.35);            // вечерний пурпур
          vec3 cPurpleM = vec3(0.30, 0.16, 0.42);            // утренний, холоднее
          vec3 warm = mix(cSunset, cSunrise, morning) * 0.7;   // приглушено, чтобы свечение не выбеливало оттенок
          // Закатные цвета видны только на просвет — когда камера смотрит в сторону Солнца
          // сквозь край атмосферы. Сбоку голубое рассеяние у границы ночи просто гаснет.
          vec3 sunV = normalize(mat3(viewMatrix) * sd);
          float g = max(dot(normalize(vView), sunV), 0.0);
          float back = smoothstep(0.15, 0.8, g);
          // тёплым бывает только участок ободка со стороны Солнца (по экрану), дальше по кругу —
          // обычное голубое; если Солнце точно за Землёй, светится всё кольцо, как при затмении
          vec2 sxy = sunV.xy; float sl = length(sxy);
          float side = sl > 1e-4 ? dot(normalize(nV.xy), sxy / sl) : 1.0;
          float near = mix(1.0, smoothstep(0.70, 0.987, side), smoothstep(0.08, 0.35, sl));   // радиус тепла у Солнца 0.66 прежнего
          back *= near;
          float w = pow(red, 1.6) * back;
          float blue = smoothstep(-0.40, 0.75, mu);          // голубое сходит на нет к ночи мягко, широкой растяжкой
          vec3 col = cNight + cDay * blue * (1.0 - w) + warm * lit * w;
          col += mix(cPurpleE, cPurpleM, morning) * tail * 0.6 * back;
          // на просвет свет идёт сквозь всю толщу воздуха и краснеет (как Земля с Луны в затмение)
          col = mix(col, warm * lit, clamp(pow(g, 3.0) * 0.75 * near, 0.0, 1.0));
          float glow = 1.0 + 1.1 * pow(g, 6.0) * lit;
          gl_FragColor = vec4(col * prof * glow * 0.64, 1.0);   // общая яркость 75% от прежней
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const atmosphere = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), atmoMat);
    atmosphere.frustumCulled = false;
    earthGroup.add(atmosphere);

    (function buildGraticule() {
      const arr = [];
      const R = 1.0012;
      const push = (la1, lo1, la2, lo2) => {
        const p = (la, lo) => { const c = Math.cos(la * DEG); return [R * c * Math.cos(lo * DEG), R * Math.sin(la * DEG), -R * c * Math.sin(lo * DEG)]; };
        const a = p(la1, lo1), b = p(la2, lo2); arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      };
      for (let la = -75; la <= 75; la += 15) for (let lo = 0; lo < 360; lo += 3) push(la, lo, la, lo + 3);
      for (let lo = 0; lo < 360; lo += 15) for (let la = -90; la < 90; la += 3) push(la, lo, la + 3, lo);
      earthGroup.add(segments(arr, '#7fd7ff', 0.16));
      // тонкая сетка через 5° (без линий, совпадающих с основной)
      const fine = [];
      const pushF = (la1, lo1, la2, lo2) => {
        const p = (la, lo) => { const c = Math.cos(la * DEG); return [R * c * Math.cos(lo * DEG), R * Math.sin(la * DEG), -R * c * Math.sin(lo * DEG)]; };
        const a = p(la1, lo1), b = p(la2, lo2); fine.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      };
      for (let la = -85; la <= 85; la += 5) { if (la % 15 === 0) continue; for (let lo = 0; lo < 360; lo += 4) pushF(la, lo, la, lo + 4); }
      for (let lo = 0; lo < 360; lo += 5) { if (lo % 15 === 0) continue; for (let la = -85; la < 85; la += 5) pushF(la, lo, la + 5, lo); }
      earthGroup.add(segments(fine, '#7fd7ff', 0.05));
      const eq = circle(1.0014, '#7fd7ff', 0.5, 'xz'); earthGroup.add(eq);
      const pm = circle(1.0014, '#7fd7ff', 0.3, 'xy'); earthGroup.add(pm);
      // ось
      earthGroup.add(segments([0, -1.7, 0, 0, 1.7, 0], '#7fd7ff', 0.35));
      const n = makeLabel('N', 'lbl-tiny'); n.position.set(0, 1.8, 0); earthGroup.add(n);
    })();

    S.setWorld = function (topology) {
      try {
        const R = 1.0016;
        const p = (lo, la) => { const c = Math.cos(la * DEG); return [R * c * Math.cos(lo * DEG), R * Math.sin(la * DEG), -R * c * Math.sin(lo * DEG)]; };
        const toSegs = mesh => {
          const arr = [];
          mesh.coordinates.forEach(line => {
            for (let i = 1; i < line.length; i++) {
              const a = p(line[i - 1][0], line[i - 1][1]), b = p(line[i][0], line[i][1]);
              arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
            }
          });
          return arr;
        };
        if (topology.objects.countries) {
          const obj = topology.objects.countries;
          earthGroup.add(segments(toSegs(topojson.mesh(topology, obj, (a, b) => a === b)), '#bfeaff', 0.55));   // побережья
          earthGroup.add(segments(toSegs(topojson.mesh(topology, obj, (a, b) => a !== b)), '#bfeaff', 0.2));    // границы государств
        } else {
          earthGroup.add(segments(toSegs(topojson.mesh(topology, topology.objects.land)), '#bfeaff', 0.55));
        }
      } catch (e) { console.warn('world', e); }
    };
    S.setContinents = S.setWorld;

    // города: точки на глобусе + подписи (видны при приближении или в режиме выбора места)
    const cityLabels = [];
    let cityGroup = null;
    S.setCities = function (list) {
      if (cityGroup) { earthGroup.remove(cityGroup); cityLabels.length = 0; }
      cityGroup = new THREE.Group(); earthGroup.add(cityGroup);
      const pos = [];
      const R = 1.0022;
      list.forEach(cty => {
        const la = cty.lat * DEG, lo = cty.lon * DEG, c = Math.cos(la);
        const v = new THREE.Vector3(R * c * Math.cos(lo), R * Math.sin(la), -R * c * Math.sin(lo));
        pos.push(v.x, v.y, v.z);
        const l = makeLabel(cty.name, 'lbl-city'); l.position.copy(v); l.visible = false;
        cityGroup.add(l); cityLabels.push({ obj: l, pos: v, major: !!cty.major });
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, map: TEX_STAR, color: C('#f5c56b'), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      cityGroup.add(new THREE.Points(g, m));
    };
    const camLocal = new THREE.Vector3();
    function updateCityLabels() {
      if (!cityLabels.length) return;
      const dist = camera.position.length();
      const show = S.mode === 'geo' && (S.pickGlobe || dist < 3.8);
      if (!show) { cityLabels.forEach(c => { c.obj.visible = false; }); return; }
      camLocal.copy(camera.position); earthGroup.worldToLocal(camLocal);
      const showMinor = dist < 2.6;   // второстепенные города — только при сильном приближении
      cityLabels.forEach(c => {
        // подпись видна, если точка обращена к камере
        c.obj.visible = (c.major || showMinor) && c.pos.dot(camLocal) > c.pos.lengthSq();
      });
    }

    // всё, что привязано к наблюдателю (маркер, горизонт, юбка, меридиан), — охристое
    const OBS_COLOR = '#e0a04a';
    // маркер наблюдателя
    const locGroup = new THREE.Group(); earthGroup.add(locGroup);
    const locDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), new THREE.MeshBasicMaterial({ color: C(OBS_COLOR) }));
    locGroup.add(locDot);
    locGroup.add(sprite(TEX_GLOW, OBS_COLOR, 0.055, 0.9));
    const locStem = segments([0, 0, 0, 0, 0.45, 0], OBS_COLOR, 0.7); locGroup.add(locStem);
    const locRing = new THREE.Mesh(new THREE.RingGeometry(0.0125, 0.015, 32), new THREE.MeshBasicMaterial({ color: C(OBS_COLOR), transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    locRing.rotation.x = -Math.PI / 2; locGroup.add(locRing);
    const locLabel = makeLabel('', 'lbl-here'); locLabel.position.set(0, 0.45, 0); locGroup.add(locLabel);
    // подсолнечная точка
    const subsolar = new THREE.Group(); scene.add(subsolar);
    subsolar.add(sprite(TEX_GLOW, '#ffd36b', 0.18, 0.9));
    const ssl = makeLabel(NS.t('noonMark'), 'lbl-tiny'); ssl.position.set(0, 0.06, 0); subsolar.add(ssl);

    // Заливка сектора знака: внутри — прямоугольная вставка с отступом от краёв,
    // темнее фона. Отступы заданы в координатах самого сектора (по радиусу и по углу),
    // поэтому вставка изогнута по дуге вместе с ним.
    function zodiacFill(color, inner, outer, a0, span) {
      const w = outer - inner;
      return new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: C(color) },
          uOpacity: { value: 0.052 },      // фон сектора
          uDark: { value: 0.71 },          // вставка темнее фона
          uInner: { value: inner }, uOuter: { value: outer },
          uA0: { value: a0 }, uSpan: { value: span },
          // кантик: узкий с боков и со стороны центра, широкий со стороны делений шкалы —
          // прямоугольник заканчивается раньше, чем начинаются самые длинные деления
          uMargin: { value: new THREE.Vector3(w * 0.11, w * 0.55, w * 0.11) },   // внутрь, наружу, с боков
        },
        vertexShader: `
          varying vec2 vXY;
          void main(){ vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform vec3 uColor; uniform float uOpacity; uniform float uDark;
          uniform float uInner; uniform float uOuter; uniform float uA0; uniform float uSpan;
          uniform vec3 uMargin;
          varying vec2 vXY;
          void main() {
            float r = length(vXY);
            float da = mod(atan(vXY.y, vXY.x) - uA0 + 12.566370614, 6.283185307);
            // расстояния до краёв прямоугольника в мировых единицах
            float er = min(r - uInner - uMargin.x, uOuter - uMargin.y - r);
            float ea = min(da, uSpan - da) * r - uMargin.z;
            float fr = max(fwidth(r), 1e-5), fa = max(fwidth(da) * r, 1e-5);
            float inside = smoothstep(0.0, fr * 1.5, er) * smoothstep(0.0, fa * 1.5, ea);
            gl_FragColor = vec4(uColor, uOpacity * mix(1.0, uDark, inside));
          }`,
        transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
    }

    // ------------------------------------------------------------ эклиптика и зодиак
    const eclGroup = new THREE.Group(); scene.add(eclGroup);      // наклон = наклон эклиптики
    const zodiacGroup = new THREE.Group(); eclGroup.add(zodiacGroup);
    (function buildZodiac() {
      const R = NS.ZODIAC_R, Ri = R - 0.3;
      zodiacGroup.add(circle(R, '#7fd7ff', 0.75, 'xz', 360));
      zodiacGroup.add(circle(Ri, '#7fd7ff', 0.35, 'xz', 360));
      const ticks = [], divs = [];
      for (let d = 0; d < 360; d++) {
        const a = d * DEG, len = d % 30 === 0 ? 0.3 : d % 10 === 0 ? 0.14 : d % 5 === 0 ? 0.09 : 0.045;
        const r1 = R - len, r2 = R;
        (d % 30 === 0 ? divs : ticks).push(r1 * Math.cos(a), 0, -r1 * Math.sin(a), r2 * Math.cos(a), 0, -r2 * Math.sin(a));
      }
      zodiacGroup.add(segments(ticks, '#7fd7ff', 0.38));
      zodiacGroup.add(segments(divs, '#bfeaff', 0.8));
      NS.ZODIAC.forEach((z, i) => {
        const col = NS.ELEMENT_COLOR[z.el];
        const sector = new THREE.Mesh(new THREE.RingGeometry(Ri, R, 48, 1, i * 30 * DEG, 30 * DEG),
          zodiacFill(col, Ri, R, i * 30 * DEG, 30 * DEG));
        sector.rotation.x = -Math.PI / 2; zodiacGroup.add(sector);
        const l = makeLabel(z.glyph + '<small>' + z.name + '</small>', 'lbl-zodiac');
        l.el.style.color = col;
        const a = (i * 30 + 15) * DEG, r = R + 0.42;
        l.position.set(r * Math.cos(a), 0, -r * Math.sin(a));
        zodiacGroup.add(l);
      });
    })();

    // ------------------------------------------------------------ планеты (геоцентр)
    const geoGroup = new THREE.Group(); eclGroup.add(geoGroup);
    S.geo = {};
    NS.BODIES.forEach(b => {
      const g = new THREE.Group();
      const orbitRing = circle(b.ring, b.color, 0.2, 'xz', 256); geoGroup.add(orbitRing);
      const isSun = b.id === 'Sun', isMoon = b.id === 'Moon';
      let mesh;
      if (isMoon) mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, 32, 24), new THREE.MeshStandardMaterial({ color: 0xe6ecf2, roughness: 1, metalness: 0 }));
      else mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, 24, 16), new THREE.MeshBasicMaterial({ color: C(isSun ? SUN_DISC : b.color) }));
      g.add(mesh);
      const haloS = b.size * (isSun ? 9 : isMoon ? 3.5 : 5);
      const halo = facingGlow(TEX_GLOW, b.color, haloS, isSun ? 0.95 : 0.7, b.size);
      const pick = pickProxy(haloS);
      g.add(halo, pick);
      if (isSun) g.add(sunRays(SUN_RAYS, 0.85, b.size));
      let outline = null;
      if (isMoon) { outline = bodyOutline(b.size, '#c3d6e6'); g.add(outline); }
      pickables.push({ obj: pick, id: b.id });
      if (b.rings) g.add(planetRing(b, b.size, true));
      const label = makeLabel('', 'lbl-planet'); label.el.style.color = b.color;
      label.center.set(0.5, 0);            // якорь: середина верхнего края плашки
      labelTargets.push({ el: label.el, id: b.id, mode: 'geo' });
      g.add(label);
      geoGroup.add(g);
      const stem = dynLine(2, b.color, 0.4); geoGroup.add(stem);
      const tick = dynLine(2, b.color, 0.9); geoGroup.add(tick);
      const spoke = dynLine(2, b.color, isSun ? 0.35 : 0.12); geoGroup.add(spoke);
      // радиус, от которого отсчитывается вынос подписи вниз, и зазор в пикселях.
      // У Солнца это кончики лучей, а зазор отрицательный: кончики заходят под плашку.
      S.geo[b.id] = { g, mesh, halo, label, stem, tick, spoke, outline, orbitRing, text: '',
        labelR: isSun ? SUN_RAYS * 0.65 : b.size * Math.max(1.5, b.rings ? b.rings.outer * 0.75 : 0),
        labelRel: isSun ? 0.91 : 1, labelGap: isSun ? 0 : 5, labelY: null };
    });

    // аспекты
    const MAX_ASP = 80;
    // толстые линии: обычные линии WebGL всегда в один пиксель
    const aspGeo = new LineSegmentsGeometry();
    aspGeo.setPositions(new Float32Array(MAX_ASP * 6));
    aspGeo.setColors(new Float32Array(MAX_ASP * 6));
    const aspMat = new LineMaterial({ linewidth: 2, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false });
    aspMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('dir = normalize( dir );',
        'dir = dot( dir, dir ) > 1e-12 ? normalize( dir ) : vec2( 1.0, 0.0 );');
    };
    const aspLines = new LineSegments2(aspGeo, aspMat);
    aspLines.frustumCulled = false;
    geoGroup.add(aspLines);

    // ------------------------------------------------------------ горизонт наблюдателя
    const horGroup = new THREE.Group(); horGroup.matrixAutoUpdate = false; scene.add(horGroup);
    (function buildHorizon() {
      const R = NS.HORIZON_R;
      horGroup.add(circle(R, OBS_COLOR, 0.8, 'xz', 360));
      const ticks = [];
      for (let a = 0; a < 360; a += 5) {
        const r = a * DEG, len = a % 90 === 0 ? 0.28 : a % 30 === 0 ? 0.16 : a % 10 === 0 ? 0.09 : 0.05;
        // азимут от севера (+X) к востоку (+Z)
        ticks.push(R * Math.cos(r), 0, R * Math.sin(r), (R + len) * Math.cos(r), 0, (R + len) * Math.sin(r));
      }
      horGroup.add(segments(ticks, OBS_COLOR, 0.45));
      // «юбка» под горизонтом.
      // Яркость на ЭКРАНЕ должна падать экспоненциально: brightness(t) = exp(-k·t).
      // Рендерер выводит кадр в sRGB, поэтому в линейном пространстве задаём
      // pow(curve, 2.2) — после кодирования это даёт ровно нужную кривую.
      // Считаем в шейдере: нет 8-битных ступеней канала прозрачности.
      const WH = 0.9;
      const wallMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: C(OBS_COLOR) },
          uPeak: { value: 0.24 },   // яркость у самого кольца
          uK: { value: 4.2 },       // скорость экранного затухания
        },
        vertexShader: `
          varying float vT;
          void main(){ vT = clamp(-position.y / ${WH.toFixed(3)} + 0.5, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uPeak; uniform float uK;
          varying float vT;
          void main(){
            float e = exp(-uK);
            float curve = (exp(-uK * vT) - e) / (1.0 - e);   // 1 у кольца, ровно 0 у нижнего края
            gl_FragColor = vec4(uColor, uPeak * pow(max(curve, 0.0), 2.2));
          }`,
        transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, WH, 128, 1, true), wallMat);
      wall.position.y = -WH / 2; horGroup.add(wall);
      // меридиан и первый вертикал
      const mer = new THREE.Line(circleGeo(R, 256, 'xy'), lineMat(OBS_COLOR, 0.22)); horGroup.add(mer);
      const pv = new THREE.Line(circleGeo(R, 256, 'yz'), lineMat(OBS_COLOR, 0.12)); horGroup.add(pv);
      // круги высот 30° и 60°
      [30, 60].forEach(h => {
        const rr = R * Math.cos(h * DEG), yy = R * Math.sin(h * DEG);
        const cc = circle(rr, OBS_COLOR, 0.07, 'xz', 180); cc.position.y = yy; horGroup.add(cc);
      });
      const zen = makeLabel(NS.t('zenith'), 'lbl-tiny'); zen.position.set(0, R + 0.1, 0); horGroup.add(zen);
      horGroup.add(segments([0, R - 0.12, 0, 0, R + 0.02, 0], OBS_COLOR, 0.6));
      [[NS.L.cardinal.N, 0], [NS.L.cardinal.E, 90], [NS.L.cardinal.S, 180], [NS.L.cardinal.W, 270]].forEach(([t, a]) => {
        const l = makeLabel(t, 'lbl-card'); const r = a * DEG;
        l.position.set((R + 0.45) * Math.cos(r), 0, (R + 0.45) * Math.sin(r)); horGroup.add(l);
      });
    })();

    // ------------------------------------------------------------ гелиоцентр
    const helioGroup = new THREE.Group(); helioGroup.visible = false; scene.add(helioGroup);
    S.helio = {};
    (function buildHelio() {
      const sun = new THREE.Group();
      sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), new THREE.MeshBasicMaterial({ color: C(SUN_DISC) })));
      sun.add(facingGlow(TEX_GLOW, '#ffd36b', 1.6, 1, 0.16));
      sun.add(sunRays(0.62, 0.8, 0.16));
      const sl = makeLabel(NS.t('sunLabel'), 'lbl-sun'); sl.center.set(0.5, 0); sun.add(sl);
      S.helioSun = { g: sun, label: sl, labelR: 0.62 * 0.65, labelRel: 0.91, labelGap: 0, labelY: null };
      helioGroup.add(sun);
      const bodies = NS.BODIES.filter(b => b.helio).map(b => b.id);
      bodies.splice(2, 0, 'Earth');
      bodies.forEach(id => {
        const b = id === 'Earth' ? { id: 'Earth', name: NS.L.planets.Earth, glyph: '⊕', color: '#6fb7ff', size: 0.07 } : NS.BODY[id];
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(b.size * 0.9, 24, 16), new THREE.MeshBasicMaterial({ color: C(b.color) })));
        if (b.rings) g.add(planetRing(b, b.size * 0.9, false));
        const halo = facingGlow(TEX_GLOW, b.color, b.size * 5, 0.7, b.size * 0.9);
        const pick = pickProxy(b.size * 5); g.add(halo, pick);
        if (id !== 'Earth') pickables.push({ obj: pick, id });
        const label = makeLabel('', 'lbl-planet'); label.el.style.color = b.color;
        label.center.set(0.5, 0);
        if (id !== 'Earth') labelTargets.push({ el: label.el, id, mode: 'helio' });
        g.add(label);
        helioGroup.add(g);
        const orbit = dynLine(257, b.color, 0.28); helioGroup.add(orbit);
        const ray = dynLine(2, b.color, id === 'Earth' ? 0.35 : 0.18); helioGroup.add(ray);
        S.helio[id] = { g, halo, label, orbit, ray, orbitDone: false, text: '', def: b,
          labelR: b.size * 1.5, labelRel: 1, labelGap: 5, labelY: null };
      });
      // Луна возле Земли
      const moon = new THREE.Group();
      moon.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe6ecf2 })));
      helioGroup.add(moon);
      S.helio.moon = moon;
    })();

    // ------------------------------------------------------------ обновление
    const tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpE = new THREE.Vector3(), tmpM = new THREE.Matrix4();
    const tmpW = new THREE.Vector3();
    // Сколько пикселей экрана занимает единица мира на расстоянии 1 от камеры
    function focalPx() {
      return (window.innerHeight / 2) / Math.tan(camera.fov * 0.5 * DEG);
    }
    // Подпись висит под телом: отступ считается от его экранного радиуса
    function placeLabel(G, parent) {
      if (!G || !G.label) return 0;
      tmpW.copy(G.g.position); if (parent) parent.localToWorld(tmpW);
      const d = Math.max(camera.position.distanceTo(tmpW), 1e-4);
      const y = Math.round(focalPx() * G.labelR * G.g.scale.x / d * (G.labelRel || 1) + G.labelGap);
      if (G.labelY !== y) { G.labelY = y; G.label.el.style.transform = 'translateY(' + y + 'px)'; }
      return d;
    }
    let lastLoc = '';
    S.update = function (f) {
      const ob = f.obliquity * DEG;
      eclGroup.rotation.x = ob;
      earthGroup.rotation.y = f.gst * 15 * DEG;
      earthMat.uniforms.sunDir.value.set(f.sunDir[0], f.sunDir[1], f.sunDir[2]);
      sunLight.position.set(f.sunDir[0] * 30, f.sunDir[1] * 30, f.sunDir[2] * 30);
      subsolar.position.set(f.sunDir[0] * 1.02, f.sunDir[1] * 1.02, f.sunDir[2] * 1.02);

      // наблюдатель
      const lat = f.observer.lat * DEG, lon = f.observer.lon * DEG;
      const key = f.observer.lat + ',' + f.observer.lon + ',' + f.observer.name;
      if (key !== lastLoc) {
        lastLoc = key;
        const c = Math.cos(lat);
        locGroup.position.set(c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon));
        locGroup.lookAt(0, 0, 0); locGroup.rotateX(-Math.PI / 2);
        locLabel.el.textContent = f.observer.name;
      }
      // зенит в мировых координатах
      const alpha = f.gst * 15 * DEG + lon, cl = Math.cos(lat);
      tmpV.set(cl * Math.cos(alpha), Math.sin(lat), -cl * Math.sin(alpha));
      tmpN.set(0, 1, 0).addScaledVector(tmpV, -tmpV.y);
      if (tmpN.lengthSq() < 1e-9) tmpN.set(1, 0, 0); else tmpN.normalize();
      tmpE.crossVectors(tmpN, tmpV);
      tmpM.makeBasis(tmpN, tmpV, tmpE);
      skyN.copy(tmpN); skyZ.copy(tmpV); skyE.copy(tmpE);
      horGroup.matrix.copy(tmpM);
      horGroup.matrixWorldNeedsUpdate = true;

      if (S.mode === 'helio') updateHelio(f); else updateGeo(f);
    };

    function updateGeo(f) {
      const st = f.states;
      NS.BODIES.forEach(b => {
        const s = st[b.id], G = S.geo[b.id];
        const p = Astro.eclToLocal(s.lon, s.lat, b.ring, NS.LAT_SCALE);
        if (S.mode === 'sky' && b.id === 'Moon' && s.distKm) {
          // наблюдатель стоит на поверхности, а не в центре Земли: Луна смещается до ~1°
          eclGroup.updateMatrixWorld();
          tmpW.copy(skyZ).transformDirection(tmpM.copy(eclGroup.matrixWorld).invert());
          const k = s.distKm / 6371;
          const q = [p[0] / b.ring * k - tmpW.x, p[1] / b.ring * k - tmpW.y, p[2] / b.ring * k - tmpW.z];
          const L = Math.hypot(q[0], q[1], q[2]);
          p[0] = q[0] / L * b.ring; p[1] = q[1] / L * b.ring; p[2] = q[2] / L * b.ring;
        }
        G.g.position.set(p[0], p[1], p[2]);
        setLine(G.stem, [[p[0], 0, p[2]], p]);
        const a = s.lon * DEG, Ri = NS.ZODIAC_R - 0.3;
        setLine(G.tick, [[(Ri - 0.1) * Math.cos(a), 0, -(Ri - 0.1) * Math.sin(a)], [Ri * Math.cos(a), 0, -Ri * Math.sin(a)]]);
        setLine(G.spoke, [b.id === 'Sun' ? [0, 0, 0] : [p[0], 0, p[2]], [(Ri - 0.1) * Math.cos(a), 0, -(Ri - 0.1) * Math.sin(a)]]);
        G.halo.material.opacity = (s.above ? 1 : 0.35) * (b.id === 'Sun' ? 0.95 : 0.7);
        const z = NS.ZODIAC[s.signIdx];
        const txt = '<span class="g">' + b.glyph + '</span><span class="nm">' + b.name + '</span><span class="ps">' + s.deg + '°' + String(s.min).padStart(2, '0') + '′ ' + z.glyph + '</span>' + (s.retro ? '<span class="rx">℞</span>' : '');
        if (txt !== G.text) { G.text = txt; G.label.el.innerHTML = txt; }
        G.label.el.classList.toggle('below', !s.above);
        G.label.el.classList.toggle('sel', S.selected === b.id);
        const d = placeLabel(G, eclGroup);
        if (G.outline) {                       // толщина обводки — постоянная в пикселях
          const sc = G.outline.userData.k || 1;
          const R = G.outline.userData.sphereR * sc, dd = Math.max(d, R * 1.001);
          const dt = dd - R * R / dd, k = Math.sqrt(1 - (R * R) / (dd * dd));
          G.outline.material.uniforms.uW.value = 1.3 * dt / (focalPx() * G.outline.userData.half * sc * k);
        }
      });
      // аспекты
      const pos = aspGeo.attributes.instanceStart.data.array, col = aspGeo.attributes.instanceColorStart.data.array;
      const aspPrev = S._aspPrev || (S._aspPrev = new Float32Array(pos.length));
      const colPrev = S._colPrev || (S._colPrev = new Float32Array(col.length));
      let n = 0;
      if (S.options.aspects && f.aspects) {
        for (const asp of f.aspects) {
          if (n >= MAX_ASP) break;
          const pa = S.geo[asp.a].g.position, pb = S.geo[asp.b].g.position;
          const c = C(asp.aspect.color).multiplyScalar(0.25 + 0.75 * asp.tight);
          pos.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], n * 6);
          col.set([c.r, c.g, c.b, c.r, c.g, c.b], n * 6);
          n++;
        }
      }
      let changed = n !== aspGeo.instanceCount;
      for (let i = 0; i < n * 6 && !changed; i++) if (pos[i] !== aspPrev[i] || col[i] !== colPrev[i]) changed = true;
      if (changed) {
        aspPrev.set(pos.subarray(0, MAX_ASP * 6)); colPrev.set(col.subarray(0, MAX_ASP * 6));
        aspGeo.instanceCount = n;
        aspGeo.attributes.instanceStart.data.needsUpdate = true;
        aspGeo.attributes.instanceColorStart.data.needsUpdate = true;
      }
      renderer.getDrawingBufferSize(aspMat.resolution);
    }

    function updateHelio(f) {
      const R = NS.ZODIAC_R * 1.5;
      const earth = Astro.helioPos('Earth', f.date);
      Object.keys(S.helio).forEach(id => {
        if (id === 'moon') return;
        const H = S.helio[id];
        const p = Astro.helioPos(id, f.date);
        H.g.position.set(p[0], p[1], p[2]);
        if (!H.orbitDone) { setLine(H.orbit, Astro.orbitPath(id, f.date, 256)); H.orbitDone = true; }
        // луч: направление с Земли на тело, продлённое до кольца зодиака
        let d;
        if (id === 'Earth') d = [-earth[0], -earth[1], -earth[2]];          // Земля → Солнце → знак Солнца
        else d = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
        const L = Math.hypot(d[0], d[1], d[2]) || 1; d = d.map(v => v / L);
        // |E + t d| = R
        const bq = 2 * (earth[0] * d[0] + earth[1] * d[1] + earth[2] * d[2]);
        const cq = earth[0] ** 2 + earth[1] ** 2 + earth[2] ** 2 - R * R;
        const t = (-bq + Math.sqrt(Math.max(0, bq * bq - 4 * cq))) / 2;
        setLine(H.ray, [earth, [earth[0] + d[0] * t, earth[1] + d[1] * t, earth[2] + d[2] * t]]);
        let txt;
        if (id === 'Earth') txt = '<span class="g">⊕</span><span class="nm">' + NS.L.planets.Earth + '</span>';
        else {
          const s = f.states[id];
          const z = NS.ZODIAC[s.signIdx];
          txt = '<span class="g">' + H.def.glyph + '</span><span class="nm">' + H.def.name + '</span><span class="ps">' + s.distAU.toFixed(2) + ' ' + NS.L.units.au + ' · ' + z.glyph + '</span>' + (s.retro ? '<span class="rx">℞</span>' : '');
        }
        if (txt !== H.text) { H.text = txt; H.label.el.innerHTML = txt; }
        H.label.el.classList.toggle('sel', S.selected === id);
        placeLabel(H, null);
      });
      placeLabel(S.helioSun, null);
      const m = f.states.Moon;
      const md = Astro.eclToLocal(m.lon, m.lat, 0.13, 1);
      // направление на Луну задано в эклиптических координатах → повернуть в мировые (наклон эклиптики)
      const ob = f.obliquity * DEG;
      const my = md[1] * Math.cos(ob) - md[2] * Math.sin(ob), mz = md[1] * Math.sin(ob) + md[2] * Math.cos(ob);
      S.helio.moon.position.set(earth[0] + md[0], earth[1] + my, earth[2] + mz);
    }

    // ------------------------------------------------------------ режимы / опции
    S.setMode = function (mode) {
      const was = S.mode;
      S.mode = mode;
      const geo = mode === 'geo', sky = mode === 'sky', helio = mode === 'helio';
      earthGroup.visible = geo; horGroup.visible = !helio; geoGroup.visible = !helio; helioGroup.visible = helio; subsolar.visible = geo;
      ground.visible = sky;
      aspLines.visible = !sky;                 // хорды между телами из центра режут всё небо
      zodiacGroup.scale.setScalar(helio ? 1.5 : 1);
      Object.values(S.helio).forEach(h => { if (h.orbitDone !== undefined) h.orbitDone = false; });
      NS.BODIES.forEach(b => {
        const G = S.geo[b.id];
        G.orbitRing.visible = G.stem.visible = G.tick.visible = G.spoke.visible = !sky;
        setBodyScale(G, sky ? skyScale(b) : 1);
      });
      S.starLabels.forEach(l => { l.visible = S.options.starLabels; });
      if (sky) {
        controls.enabled = false; fly = null;
        if (was !== 'sky') skyDefault();
        camera.near = 0.02; camera.updateProjectionMatrix();
        camera.position.set(0, 0, 0);
        fadeIn();
        return;
      }
      if (was === 'sky') {
        controls.enabled = true; camera.up.set(0, 1, 0);
        camera.fov = 42; camera.near = 0.05; camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        camera.position.copy(geo ? HOME : HOME_HELIO).multiplyScalar(0.25);
        fadeIn();
      }
      S.flyTo(geo ? HOME : HOME_HELIO);
    };

    // ------------------------------------------------------------ небо из точки наблюдения
    // Камера стоит в центре Земли: оттуда направления на все светила настоящие
    // (кольца построены вокруг центра). Горизонт проходит через центр параллельно
    // горизонту наблюдателя — для далёких объектов это тот же горизонт.
    const skyN = new THREE.Vector3(1, 0, 0), skyZ = new THREE.Vector3(0, 1, 0), skyE = new THREE.Vector3(0, 0, 1);
    const look = { az: 180, alt: 22, fov: 70 };               // азимут от севера к востоку, высота, поле зрения
    const SKY_SIZE = { Sun: 2.4, Moon: 1.5 };                  // условный угловой диаметр, градусы; остальные 0.8°
    function skyScale(b) {
      const ang = (SKY_SIZE[b.id] || 0.8) * DEG;
      return Math.tan(ang / 2) * b.ring / b.size;
    }
    // Масштаб тела вместе с его билбордами: они считают размеры в единицах вида и масштаб группы не видят
    function setBodyScale(G, k) {
      G.g.scale.setScalar(k);
      G.g.traverse(o => {
        const u = o.material && o.material.uniforms;
        if (!u || !u.uSphereR) return;
        if (!o.userData.base) o.userData.base = { r: u.uSphereR.value, s: u.uScale.value };
        u.uSphereR.value = o.userData.base.r * k; u.uScale.value = o.userData.base.s * k;
      });
      if (G.outline) G.outline.userData.k = k;
    }
    // Земля под горизонтом: затемнение нижней полусферы (камера внутри неё)
    const ground = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x010203, transparent: true, opacity: 0.84, side: THREE.BackSide, depthTest: false, depthWrite: false }));
    ground.renderOrder = 5; ground.visible = false; horGroup.add(ground);
    function fadeIn() {
      const el = renderer.domElement;
      el.style.transition = 'none'; el.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'opacity .45s'; el.style.opacity = '1'; }));
    }
    function skyDefault() {
      // смотрим на экватор неба: на юг в северном полушарии, на север — в южном
      look.az = skyZ.y >= 0 ? 180 : 0; look.alt = 22; look.fov = 70;
      camera.fov = look.fov; camera.updateProjectionMatrix();
    }
    const skyDir = new THREE.Vector3();
    function updateSkyCamera() {
      const az = look.az * DEG, alt = look.alt * DEG;
      skyDir.copy(skyN).multiplyScalar(Math.cos(alt) * Math.cos(az))
        .addScaledVector(skyE, Math.cos(alt) * Math.sin(az)).addScaledVector(skyZ, Math.sin(alt));
      camera.position.set(0, 0, 0);
      camera.up.copy(skyZ);
      camera.lookAt(skyDir);
      // подписи звёзд под горизонтом прячем
      if (S.options.starLabels) S.starLabels.forEach(l => { l.visible = l.position.dot(skyZ) > 0; });
    }
    let skyDrag = null;
    renderer.domElement.addEventListener('pointerdown', e => {
      if (S.mode !== 'sky') return;
      skyDrag = { x: e.clientX, y: e.clientY, az: look.az, alt: look.alt };
      S.onInteract();
    });
    window.addEventListener('pointermove', e => {
      if (!skyDrag || S.mode !== 'sky') return;
      const degPerPx = look.fov / window.innerHeight;           // «тянем небо»: точка под курсором едет за ним
      look.az = skyDrag.az - (e.clientX - skyDrag.x) * degPerPx;
      look.alt = Math.max(-89, Math.min(89, skyDrag.alt + (e.clientY - skyDrag.y) * degPerPx));
    });
    const endSkyDrag = () => { skyDrag = null; };
    window.addEventListener('pointerup', endSkyDrag);
    window.addEventListener('pointercancel', endSkyDrag);
    renderer.domElement.addEventListener('wheel', e => {
      if (S.mode !== 'sky') return;
      e.preventDefault();
      look.fov = Math.max(12, Math.min(100, look.fov * Math.exp(e.deltaY * 0.0012)));
      camera.fov = look.fov; camera.updateProjectionMatrix();
    }, { passive: false });
    S.setOption = function (k, v) {
      S.options[k] = v;
      if (k === 'starLabels') S.starLabels.forEach(l => { l.visible = v; });
    };
    S.setSelected = function (id) { S.selected = id; };
    S.setPickGlobe = function (on) { S.pickGlobe = on; renderer.domElement.style.cursor = on ? 'crosshair' : ''; };

    // камера
    let fly = null;
    S.flyTo = function (pos) {
      fly = { from: camera.position.clone(), to: pos.clone(), t: 0 };
      controls.autoRotate = false;
    };
    S.topView = function () {
      if (S.mode === 'sky') { look.alt = 89; return; }             // в небе «сверху» — взгляд в зенит
      const ob = NS.Astro.obliquity(new Date()) * DEG;
      const d = S.mode === 'geo' ? 15 : 24;
      // взгляд с северного полюса эклиптики; лёгкий сдвиг к −Z, чтобы Овен оказался слева, как на карте
      S.flyTo(new THREE.Vector3(0.001, Math.cos(ob) * d, Math.sin(ob) * d - 0.02));
    };
    S.resetView = function () {
      if (S.mode === 'sky') { skyDefault(); return; }
      S.flyTo(S.mode === 'geo' ? HOME : HOME_HELIO); controls.target.set(0, 0, 0);
    };
    // Запомнить / вернуть положение камеры (для режима выбора точки на карте)
    S.viewState = function () { return { pos: camera.position.clone(), target: controls.target.clone() }; };
    S.restoreView = function (st) { if (!st) return; controls.target.copy(st.target); S.flyTo(st.pos); };
    // Подлететь к точке на поверхности Земли, чтобы она смотрела на камеру
    S.focusOn = function (lat, lon, dist) {
      const la = lat * DEG, lo = lon * DEG, cl = Math.cos(la);
      const v = new THREE.Vector3(cl * Math.cos(lo), Math.sin(la), -cl * Math.sin(lo));
      earthGroup.updateMatrixWorld();
      earthGroup.localToWorld(v);
      v.normalize().multiplyScalar(dist || 3.1);
      controls.target.set(0, 0, 0);
      S.flyTo(v);
    };

    // ------------------------------------------------------------ выбор мышью
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downX = 0, downY = 0;
    renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return;
      ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      if (S.pickGlobe && S.mode === 'geo') {
        const hit = ray.intersectObject(earthMesh, false)[0];
        if (hit) {
          const lp = earthGroup.worldToLocal(hit.point.clone());
          const la = Math.asin(Math.max(-1, Math.min(1, lp.y))) / DEG;
          const lo = Math.atan2(-lp.z, lp.x) / DEG;
          S.onGlobePick(la, lo);
          return;
        }
      }
      const lt = labelAt(e.clientX, e.clientY);
      if (lt) { S.onPick(lt.id); return; }
      const objs = pickables.filter(p => p.obj.visible && isVisible(p.obj)).map(p => p.obj);
      const hits = ray.intersectObjects(objs, false);
      if (hits.length) {
        const pk = pickables.find(p => p.obj === hits[0].object);
        if (pk) S.onPick(pk.id);
      }
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (S.pickGlobe) return;
      ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const lt = labelAt(e.clientX, e.clientY);
      if (hoverLabel && hoverLabel !== (lt && lt.el)) hoverLabel.classList.remove('hover');
      hoverLabel = lt ? lt.el : null;
      if (hoverLabel) hoverLabel.classList.add('hover');
      const objs = pickables.filter(p => isVisible(p.obj)).map(p => p.obj);
      renderer.domElement.style.cursor = (lt || ray.intersectObjects(objs, false).length) ? 'pointer' : '';
    });
    let hoverLabel = null;
    function isVisible(o) { let x = o; while (x) { if (!x.visible) return false; x = x.parent; } return true; }

    // ------------------------------------------------------------ цикл
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      const db = renderer.getDrawingBufferSize(new THREE.Vector2());
      composer.setSize(db.x, db.y);
      bloom.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    let last = performance.now();
    S.start = function (tick) {
      function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        for (let i = 0; i < rayMats.length; i++) rayMats[i].uniforms.uTime.value = now * 0.001;
        tick(dt);
        if (fly) {
          fly.t = Math.min(1, fly.t + dt / 0.9);
          const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
          camera.position.lerpVectors(fly.from, fly.to, k);
          if (fly.t >= 1) fly = null;
        }
        if (S.mode === 'sky') updateSkyCamera(); else controls.update();
        updateCityLabels();
        if (S.options.bloom) composer.render(); else renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    };
  }

  NS.Scene = Scene;
})(window.AstroScape);
