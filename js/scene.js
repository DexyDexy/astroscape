/* AstroScape — 3D‑сцена (three.js) */
(function (NS) {
  'use strict';
  const DEG = Math.PI / 180;

  function Scene(libs, opts) {
    const { THREE, OrbitControls, CSS2DRenderer, CSS2DObject, EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = libs;
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

    const controls = new OrbitControls(camera, renderer.domElement);
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
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.35, 0.3);
    composer.addPass(bloom);
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
    function glowTexture(inner) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,' + (inner || 1) + ')');
      g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
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
    const TEX_GLOW = glowTexture(1), TEX_RING = ringTexture(), TEX_STAR = starTexture();
    function sprite(tex, color, scale, opacity) {
      const m = new THREE.SpriteMaterial({ map: tex, color: C(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      const s = new THREE.Sprite(m); s.scale.setScalar(scale); return s;
    }
    const pickables = [];
    const labelTargets = [];   // подписи планет: pointer-events у них выключены, попадание считаем по прямоугольнику
    function labelAt(x, y) {
      for (const t of labelTargets) {
        if (t.mode !== S.mode) continue;
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
      const stars = NS.STARS.slice().sort((a, b) => a[3] - b[3]);
      const bright = [], brightCol = [];
      S.starLabels = [];
      stars.forEach((st, i) => {
        const ra = st[1] * 15 * DEG, dec = st[2] * DEG, mag = st[3];
        const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
        const p = [x * 300, z * 300, -y * 300];
        const w = Math.min(1, Math.max(0.3, 1.15 - mag * 0.22));
        bright.push(p[0], p[1], p[2]); brightCol.push(w, w, w);
        if (i < NS.STAR_LABEL_LIMIT) {
          const l = makeLabel(st[0], 'lbl-star');
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
      const eqLbl = makeLabel('небесный экватор', 'lbl-tiny'); eqLbl.position.set(0, 0.08, NS.EQUATOR_R + 0.05); scene.add(eqLbl);
      const ariesLbl = makeLabel('♈ 0° · точка весеннего равноденствия', 'lbl-tiny'); ariesLbl.position.set(NS.EQUATOR_R + 0.6, -0.12, 0); scene.add(ariesLbl);
    })();

    // ------------------------------------------------------------ Земля
    const earthGroup = new THREE.Group(); scene.add(earthGroup);
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: new THREE.Vector3(1, 0, 0) },
        cDay: { value: new THREE.Color(0.035, 0.11, 0.15) },
        cNight: { value: new THREE.Color(0.004, 0.009, 0.02) },
        cRim: { value: new THREE.Color(0.22, 0.6, 0.9) },
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vW;
        void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec3 sunDir; uniform vec3 cDay; uniform vec3 cNight; uniform vec3 cRim;
        varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
          float ndl = dot(n, sunDir);
          float day = smoothstep(-0.08, 0.32, ndl);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          float term = 1.0 - smoothstep(0.0, 0.05, abs(ndl));
          vec3 col = mix(cNight, cDay, day) + cRim * fres * 1.1 + vec3(0.2,0.45,0.65) * term * 0.45;
          gl_FragColor = vec4(col, 0.96);
        }`,
      transparent: true, depthWrite: true,
    });
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), earthMat);
    earthMesh.renderOrder = -1;
    earthGroup.add(earthMesh);

    (function buildGraticule() {
      const arr = [];
      const R = 1.004;
      const push = (la1, lo1, la2, lo2) => {
        const p = (la, lo) => { const c = Math.cos(la * DEG); return [R * c * Math.cos(lo * DEG), R * Math.sin(la * DEG), -R * c * Math.sin(lo * DEG)]; };
        const a = p(la1, lo1), b = p(la2, lo2); arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      };
      for (let la = -75; la <= 75; la += 15) for (let lo = 0; lo < 360; lo += 3) push(la, lo, la, lo + 3);
      for (let lo = 0; lo < 360; lo += 15) for (let la = -90; la < 90; la += 3) push(la, lo, la + 3, lo);
      earthGroup.add(segments(arr, '#7fd7ff', 0.16));
      const eq = circle(1.006, '#7fd7ff', 0.5, 'xz'); earthGroup.add(eq);
      const pm = circle(1.006, '#7fd7ff', 0.3, 'xy'); earthGroup.add(pm);
      // ось
      earthGroup.add(segments([0, -1.7, 0, 0, 1.7, 0], '#7fd7ff', 0.35));
      const n = makeLabel('N', 'lbl-tiny'); n.position.set(0, 1.8, 0); earthGroup.add(n);
    })();

    S.setContinents = function (topology) {
      try {
        const mesh = topojson.mesh(topology, topology.objects.land);
        const arr = [];
        const R = 1.008;
        const p = (lo, la) => { const c = Math.cos(la * DEG); return [R * c * Math.cos(lo * DEG), R * Math.sin(la * DEG), -R * c * Math.sin(lo * DEG)]; };
        mesh.coordinates.forEach(line => {
          for (let i = 1; i < line.length; i++) {
            const a = p(line[i - 1][0], line[i - 1][1]), b = p(line[i][0], line[i][1]);
            arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
          }
        });
        earthGroup.add(segments(arr, '#bfeaff', 0.55));
      } catch (e) { console.warn('continents', e); }
    };

    // маркер наблюдателя
    const locGroup = new THREE.Group(); earthGroup.add(locGroup);
    const locDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf5c56b }));
    locGroup.add(locDot);
    locGroup.add(sprite(TEX_GLOW, '#f5c56b', 0.22, 0.9));
    const locStem = segments([0, 0, 0, 0, 0.45, 0], '#f5c56b', 0.7); locGroup.add(locStem);
    const locRing = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.06, 32), new THREE.MeshBasicMaterial({ color: 0xf5c56b, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    locRing.rotation.x = -Math.PI / 2; locGroup.add(locRing);
    const locLabel = makeLabel('', 'lbl-here'); locLabel.position.set(0, 0.45, 0); locGroup.add(locLabel);
    // подсолнечная точка
    const subsolar = new THREE.Group(); scene.add(subsolar);
    subsolar.add(sprite(TEX_GLOW, '#ffd36b', 0.18, 0.9));
    const ssl = makeLabel('☉ полдень', 'lbl-tiny'); ssl.position.set(0, 0.06, 0); subsolar.add(ssl);

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
        const sector = new THREE.Mesh(new THREE.RingGeometry(Ri, R, 24, 1, i * 30 * DEG, 30 * DEG),
          new THREE.MeshBasicMaterial({ color: C(col), transparent: true, opacity: 0.045, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        sector.rotation.x = -Math.PI / 2; zodiacGroup.add(sector);
        const l = makeLabel(z.glyph + '<small>' + z.ru + '</small>', 'lbl-zodiac');
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
      geoGroup.add(circle(b.ring, b.color, 0.2, 'xz', 256));
      const isSun = b.id === 'Sun', isMoon = b.id === 'Moon';
      let mesh;
      if (isMoon) mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, 32, 24), new THREE.MeshStandardMaterial({ color: 0xe6ecf2, roughness: 1, metalness: 0 }));
      else mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, 24, 16), new THREE.MeshBasicMaterial({ color: C(b.color) }));
      g.add(mesh);
      const halo = sprite(TEX_GLOW, b.color, b.size * (isSun ? 9 : isMoon ? 3.5 : 5), isSun ? 0.95 : 0.7);
      g.add(halo);
      pickables.push({ obj: halo, id: b.id });
      const retro = sprite(TEX_RING, '#ff6b6b', b.size * 4.2, 0.9); retro.visible = false; g.add(retro);
      const label = makeLabel('', 'lbl-planet'); label.el.style.color = b.color;
      labelTargets.push({ el: label.el, id: b.id, mode: 'geo' });
      g.add(label);
      geoGroup.add(g);
      const stem = dynLine(2, b.color, 0.4); geoGroup.add(stem);
      const tick = dynLine(2, b.color, 0.9); geoGroup.add(tick);
      const spoke = dynLine(2, b.color, isSun ? 0.35 : 0.12); geoGroup.add(spoke);
      S.geo[b.id] = { g, mesh, halo, retro, label, stem, tick, spoke, text: '' };
    });

    // аспекты
    const MAX_ASP = 80;
    const aspGeo = new THREE.BufferGeometry();
    aspGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_ASP * 6), 3));
    aspGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_ASP * 6), 3));
    const aspLines = new THREE.LineSegments(aspGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    aspLines.frustumCulled = false;
    geoGroup.add(aspLines);

    // ------------------------------------------------------------ горизонт наблюдателя
    const horGroup = new THREE.Group(); horGroup.matrixAutoUpdate = false; scene.add(horGroup);
    (function buildHorizon() {
      const R = NS.HORIZON_R;
      horGroup.add(circle(R, '#f5c56b', 0.8, 'xz', 360));
      const ticks = [];
      for (let a = 0; a < 360; a += 5) {
        const r = a * DEG, len = a % 90 === 0 ? 0.28 : a % 30 === 0 ? 0.16 : a % 10 === 0 ? 0.09 : 0.05;
        // азимут от севера (+X) к востоку (+Z)
        ticks.push(R * Math.cos(r), 0, R * Math.sin(r), (R + len) * Math.cos(r), 0, (R + len) * Math.sin(r));
      }
      horGroup.add(segments(ticks, '#f5c56b', 0.45));
      // «стенка» под горизонтом
      const c = document.createElement('canvas'); c.width = 4; c.height = 64;
      const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, 'rgba(245,197,107,0.16)'); gr.addColorStop(1, 'rgba(245,197,107,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
      const tex = new THREE.CanvasTexture(c);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 128, 1, true),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      wall.position.y = -0.25; horGroup.add(wall);
      // меридиан и первый вертикал
      const mer = new THREE.Line(circleGeo(R, 256, 'xy'), lineMat('#f5c56b', 0.22)); horGroup.add(mer);
      const pv = new THREE.Line(circleGeo(R, 256, 'yz'), lineMat('#f5c56b', 0.12)); horGroup.add(pv);
      // круги высот 30° и 60°
      [30, 60].forEach(h => {
        const rr = R * Math.cos(h * DEG), yy = R * Math.sin(h * DEG);
        const cc = circle(rr, '#f5c56b', 0.07, 'xz', 180); cc.position.y = yy; horGroup.add(cc);
      });
      const zen = makeLabel('зенит', 'lbl-tiny'); zen.position.set(0, R + 0.1, 0); horGroup.add(zen);
      horGroup.add(segments([0, R - 0.12, 0, 0, R + 0.02, 0], '#f5c56b', 0.6));
      [['С', 0], ['В', 90], ['Ю', 180], ['З', 270]].forEach(([t, a]) => {
        const l = makeLabel(t, 'lbl-card'); const r = a * DEG;
        l.position.set((R + 0.45) * Math.cos(r), 0, (R + 0.45) * Math.sin(r)); horGroup.add(l);
      });
    })();

    // ------------------------------------------------------------ гелиоцентр
    const helioGroup = new THREE.Group(); helioGroup.visible = false; scene.add(helioGroup);
    S.helio = {};
    (function buildHelio() {
      const sun = new THREE.Group();
      sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffd36b })));
      sun.add(sprite(TEX_GLOW, '#ffd36b', 1.6, 1));
      const sl = makeLabel('☉ Солнце', 'lbl-sun'); sun.add(sl);
      helioGroup.add(sun);
      const bodies = NS.BODIES.filter(b => b.helio).map(b => b.id);
      bodies.splice(2, 0, 'Earth');
      bodies.forEach(id => {
        const b = id === 'Earth' ? { id: 'Earth', ru: 'Земля', glyph: '⊕', color: '#6fb7ff', size: 0.07 } : NS.BODY[id];
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(b.size * 0.9, 24, 16), new THREE.MeshBasicMaterial({ color: C(b.color) })));
        const halo = sprite(TEX_GLOW, b.color, b.size * 5, 0.7); g.add(halo);
        if (id !== 'Earth') pickables.push({ obj: halo, id });
        const label = makeLabel('', 'lbl-planet'); label.el.style.color = b.color;
        if (id !== 'Earth') labelTargets.push({ el: label.el, id, mode: 'helio' });
        g.add(label);
        helioGroup.add(g);
        const orbit = dynLine(257, b.color, 0.28); helioGroup.add(orbit);
        const ray = dynLine(2, b.color, id === 'Earth' ? 0.35 : 0.18); helioGroup.add(ray);
        S.helio[id] = { g, halo, label, orbit, ray, orbitDone: false, text: '', def: b };
      });
      // Луна возле Земли
      const moon = new THREE.Group();
      moon.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe6ecf2 })));
      helioGroup.add(moon);
      S.helio.moon = moon;
    })();

    // ------------------------------------------------------------ обновление
    const tmpV = new THREE.Vector3(), tmpN = new THREE.Vector3(), tmpE = new THREE.Vector3(), tmpM = new THREE.Matrix4();
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
      horGroup.matrix.copy(tmpM);
      horGroup.matrixWorldNeedsUpdate = true;

      if (S.mode === 'geo') updateGeo(f); else updateHelio(f);
    };

    function updateGeo(f) {
      const st = f.states;
      NS.BODIES.forEach(b => {
        const s = st[b.id], G = S.geo[b.id];
        const p = Astro.eclToLocal(s.lon, s.lat, b.ring, NS.LAT_SCALE);
        G.g.position.set(p[0], p[1], p[2]);
        setLine(G.stem, [[p[0], 0, p[2]], p]);
        const a = s.lon * DEG, Ri = NS.ZODIAC_R - 0.3;
        setLine(G.tick, [[(Ri - 0.1) * Math.cos(a), 0, -(Ri - 0.1) * Math.sin(a)], [Ri * Math.cos(a), 0, -Ri * Math.sin(a)]]);
        setLine(G.spoke, [b.id === 'Sun' ? [0, 0, 0] : [p[0], 0, p[2]], [(Ri - 0.1) * Math.cos(a), 0, -(Ri - 0.1) * Math.sin(a)]]);
        G.retro.visible = !!s.retro;
        G.halo.material.opacity = (s.above ? 1 : 0.35) * (b.id === 'Sun' ? 0.95 : 0.7);
        const z = NS.ZODIAC[s.signIdx];
        const txt = '<span class="g">' + b.glyph + '</span><span class="nm">' + b.ru + '</span><span class="ps">' + s.deg + '°' + String(s.min).padStart(2, '0') + '′ ' + z.glyph + '</span>' + (s.retro ? '<span class="rx">℞</span>' : '');
        if (txt !== G.text) { G.text = txt; G.label.el.innerHTML = txt; }
        G.label.el.classList.toggle('below', !s.above);
        G.label.el.classList.toggle('sel', S.selected === b.id);
      });
      // аспекты
      const pos = aspGeo.attributes.position, col = aspGeo.attributes.color;
      let n = 0;
      if (S.options.aspects && f.aspects) {
        for (const asp of f.aspects) {
          if (n >= MAX_ASP) break;
          const pa = S.geo[asp.a].g.position, pb = S.geo[asp.b].g.position;
          const c = C(asp.aspect.color).multiplyScalar(0.25 + 0.75 * asp.tight);
          pos.setXYZ(n * 2, pa.x, pa.y, pa.z); pos.setXYZ(n * 2 + 1, pb.x, pb.y, pb.z);
          col.setXYZ(n * 2, c.r, c.g, c.b); col.setXYZ(n * 2 + 1, c.r, c.g, c.b);
          n++;
        }
      }
      aspGeo.setDrawRange(0, n * 2); pos.needsUpdate = true; col.needsUpdate = true;
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
        if (id === 'Earth') txt = '<span class="g">⊕</span><span class="nm">Земля</span>';
        else {
          const s = f.states[id];
          const z = NS.ZODIAC[s.signIdx];
          txt = '<span class="g">' + H.def.glyph + '</span><span class="nm">' + H.def.ru + '</span><span class="ps">' + s.distAU.toFixed(2) + ' а.е. · ' + z.glyph + '</span>' + (s.retro ? '<span class="rx">℞</span>' : '');
        }
        if (txt !== H.text) { H.text = txt; H.label.el.innerHTML = txt; }
        H.label.el.classList.toggle('sel', S.selected === id);
      });
      const m = f.states.Moon;
      const md = Astro.eclToLocal(m.lon, m.lat, 0.13, 1);
      // направление на Луну задано в эклиптических координатах → повернуть в мировые (наклон эклиптики)
      const ob = f.obliquity * DEG;
      const my = md[1] * Math.cos(ob) - md[2] * Math.sin(ob), mz = md[1] * Math.sin(ob) + md[2] * Math.cos(ob);
      S.helio.moon.position.set(earth[0] + md[0], earth[1] + my, earth[2] + mz);
    }

    // ------------------------------------------------------------ режимы / опции
    S.setMode = function (mode) {
      S.mode = mode;
      const geo = mode === 'geo';
      earthGroup.visible = geo; horGroup.visible = geo; geoGroup.visible = geo; helioGroup.visible = !geo; subsolar.visible = geo;
      zodiacGroup.scale.setScalar(geo ? 1 : 1.5);
      Object.values(S.helio).forEach(h => { if (h.orbitDone !== undefined) h.orbitDone = false; });
      S.flyTo(geo ? HOME : HOME_HELIO);
    };
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
      const ob = NS.Astro.obliquity(new Date()) * DEG;
      const d = S.mode === 'geo' ? 15 : 24;
      // взгляд с северного полюса эклиптики; лёгкий сдвиг к −Z, чтобы Овен оказался слева, как на карте
      S.flyTo(new THREE.Vector3(0.001, Math.cos(ob) * d, Math.sin(ob) * d - 0.02));
    };
    S.resetView = function () { S.flyTo(S.mode === 'geo' ? HOME : HOME_HELIO); controls.target.set(0, 0, 0); };

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
      composer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    let last = performance.now();
    S.start = function (tick) {
      function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        tick(dt);
        if (fly) {
          fly.t = Math.min(1, fly.t + dt / 0.9);
          const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
          camera.position.lerpVectors(fly.from, fly.to, k);
          if (fly.t >= 1) fly = null;
        }
        controls.update();
        if (S.options.bloom) composer.render(); else renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    };
  }

  NS.Scene = Scene;
})(window.AstroScape);
