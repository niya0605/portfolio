import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const motion = reduceMotion ? 0.15 : 1;
const COLORS = { pink: 0xff5ca8, soft: 0xffc4e0, lav: 0xa68bff };
const DEPTH = 70; // how far the camera travels down while scrolling the whole page

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09060d);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 12);

scene.add(new THREE.HemisphereLight(0xffe6f3, 0x3a0a2a, 1.6));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
sunLight.position.set(3, 5, 6);
scene.add(sunLight);

/* ---------- twinkling sparkle stars ---------- */
const STAR_COUNT = 1600;
const pos = new Float32Array(STAR_COUNT * 3);
const sizes = new Float32Array(STAR_COUNT);
const phases = new Float32Array(STAR_COUNT);
const cols = new Float32Array(STAR_COUNT * 3);
const palette = [0xffffff, 0xffffff, 0xffffff, COLORS.soft, COLORS.pink, COLORS.lav].map((c) => new THREE.Color(c));
for (let i = 0; i < STAR_COUNT; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 70;
  pos[i * 3 + 1] = 15 - Math.random() * (DEPTH + 35);
  pos[i * 3 + 2] = -Math.random() * 40 - 2;
  // a few big four-point sparkles, mostly tiny dots
  sizes[i] = Math.random() < 0.025 ? 18 + Math.random() * 16 : 2 + Math.random() * 4;
  phases[i] = Math.random() * Math.PI * 2;
  const c = palette[(Math.random() * palette.length) | 0];
  cols.set([c.r, c.g, c.b], i * 3);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
starGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
starGeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
starGeo.setAttribute("aColor", new THREE.BufferAttribute(cols, 3));

const starMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uLight: { value: 0 } },
  vertexShader: /* glsl */ `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uPR;
    varying vec3 vColor;
    varying float vTwinkle;
    varying float vBig;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + fract(aPhase) * 2.0) + aPhase * 7.0);
      vColor = aColor;
      vBig = step(20.0, aSize);
      gl_PointSize = aSize * uPR * (0.6 + 0.4 * vTwinkle) * (14.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uLight;
    varying vec3 vColor;
    varying float vTwinkle;
    varying float vBig;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float core = pow(max(0.0, 1.0 - d * 2.0), 3.0);
      // thin cross rays turn big points into ✦ sparkles
      float rays = (max(0.0, 1.0 - abs(uv.x) * 22.0) + max(0.0, 1.0 - abs(uv.y) * 22.0)) * max(0.0, 1.0 - d * 2.0);
      float a = (core + rays * vBig) * vTwinkle;
      if (a < 0.01) discard;
      // dark theme: glowing additive points; light theme: deep pink ink dots
      vec3 ink = mix(vec3(0.78, 0.11, 0.43), vec3(0.48, 0.35, 0.97), step(0.9, vColor.b) * step(vColor.r, 0.7));
      gl_FragColor = uLight > 0.5 ? vec4(ink, min(a * 0.85, 0.85)) : vec4(vColor * a * 1.4, a);
    }`,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

/* ---------- faceted crystals (collectible) ---------- */
const kinds = [
  { geo: new THREE.OctahedronGeometry(0.6), color: COLORS.pink, emissive: 0x4a0a2c, pts: 50, name: "crystal" },
  { geo: new THREE.IcosahedronGeometry(0.55), color: 0x2a1530, emissive: 0x3a0a2a, pts: 50, name: "shard" },
  { geo: new THREE.TetrahedronGeometry(0.6), color: COLORS.soft, emissive: 0x3a1a2c, pts: 75, name: "prism" },
  { geo: new THREE.OctahedronGeometry(0.5, 0), color: COLORS.lav, emissive: 0x1e1450, pts: 50, name: "crystal" },
  { geo: new THREE.TorusGeometry(0.5, 0.025, 6, 48), color: COLORS.pink, emissive: 0x6a0b3e, pts: 25, name: "ring", wire: true },
  { geo: new THREE.IcosahedronGeometry(0.6, 1), color: COLORS.pink, emissive: 0x6a0b3e, pts: 25, name: "node", wire: true },
];

const collectibles = [];
const COUNT = innerWidth < 760 ? 16 : 26;
function place(m, initial) {
  // keep them out of the centre column where the content sits
  const side = Math.random() < 0.5 ? -1 : 1;
  const spread = innerWidth < 760 ? 3.5 : 6;
  m.position.set(
    side * (spread + Math.random() * 7),
    initial ? 6 - Math.random() * (DEPTH + 10) : camera.position.y - 12 - Math.random() * 6,
    -Math.random() * 10 - 1
  );
  m.userData.baseY = m.position.y;
  m.scale.setScalar(0.7 + Math.random() * 0.7);
  m.userData.scale = m.scale.x;
}
for (let i = 0; i < COUNT; i++) {
  const k = kinds[i % kinds.length];
  const m = new THREE.Mesh(
    k.geo,
    k.wire
      ? new THREE.MeshStandardMaterial({ color: k.color, emissive: k.emissive, wireframe: true, transparent: true, opacity: 0.5 })
      : new THREE.MeshStandardMaterial({ color: k.color, emissive: k.emissive, roughness: 0.15, metalness: 0.7, flatShading: true })
  );
  m.userData = { kind: k, spin: 0.3 + Math.random() * 0.8, phase: Math.random() * 10, pop: 0 };
  m.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.4);
  place(m, true);
  scene.add(m);
  collectibles.push(m);
}

/* ---------- burst particles when collecting ---------- */
const bursts = [];
const burstGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
function burst(at, color) {
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(burstGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    p.position.copy(at);
    p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.2) * 6, (Math.random() - 0.5) * 3);
    p.userData.life = 1;
    scene.add(p);
    bursts.push(p);
  }
}

/* ---------- post ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 0.3);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- interaction ---------- */
const mouse = new THREE.Vector2();
let scrollP = 0, turbo = 0, collected = 0, started = false;

addEventListener("mousemove", (e) => mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollP = max > 0 ? scrollY / max : 0;
}
addEventListener("scroll", readScroll, { passive: true });
addEventListener("ng:start", () => { started = true; });
addEventListener("ng:turbo", () => { turbo = 6; });

/* ---------- light / dark theme ---------- */
let light = false;
function applyTheme(theme) {
  light = theme === "light";
  scene.background.setHex(light ? 0xfbf4f8 : 0x09060d);
  starMat.uniforms.uLight.value = light ? 1 : 0;
  starMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
  starMat.needsUpdate = true;
  // bloom and filmic grading would wash out / grey a light background
  bloom.enabled = !light;
  renderer.toneMapping = light ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
}
addEventListener("ng:theme", (e) => applyTheme(e.detail));
applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");

const raycaster = new THREE.Raycaster();
addEventListener("click", (e) => {
  if (!started || e.target.closest("a, button, .panel, .level, .slot, .stats, .hud, .hero-text, #console")) return;
  raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = raycaster.intersectObjects(collectibles.filter((m) => !m.userData.pop))[0];
  if (!hit) return;
  const m = hit.object;
  m.userData.pop = 1;
  burst(m.position, m.material.color);
  collected++;
  const { kind } = m.userData;
  if (collected === 1) window.NG?.toast(`First ${kind.name} collected`, { head: "Item acquired", pts: kind.pts });
  else if (collected === 10) window.NG?.toast("Collected 10 crystals", { head: "Collector", pts: 300 });
  else window.NG?.addScore(kind.pts);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  readScroll();
});

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  turbo = Math.max(0, turbo - dt);
  const speed = (turbo > 0 ? 6 : 1) * motion;

  starMat.uniforms.uTime.value = t * (turbo > 0 ? 4 : 1);

  collectibles.forEach((m) => {
    const u = m.userData;
    m.rotation.y += dt * u.spin * speed;
    m.position.y = u.baseY + Math.sin(t * 0.9 + u.phase) * 0.35 * motion;
    if (u.pop) {
      // shrink away, then respawn somewhere below the camera
      u.pop += dt * 4;
      m.scale.setScalar(u.scale * Math.max(0, 1 + Math.sin(u.pop * 2) * 0.4 - (u.pop - 1) * 0.6));
      if (u.pop > 2.6) { u.pop = 0; place(m, false); }
    }
    if (turbo > 0) m.material.emissive.setHSL((t * 0.5 + u.phase) % 1, 0.8, 0.3);
    else m.material.emissive.setHex(u.kind.emissive);
  });

  for (let i = bursts.length - 1; i >= 0; i--) {
    const p = bursts[i];
    p.userData.life -= dt * 1.4;
    p.userData.v.y -= dt * 9;
    p.position.addScaledVector(p.userData.v, dt);
    p.material.opacity = Math.max(0, p.userData.life);
    if (p.userData.life <= 0) { scene.remove(p); p.material.dispose(); bursts.splice(i, 1); }
  }

  // camera sinks through the starfield as you scroll; mouse adds parallax
  const targetY = -scrollP * DEPTH;
  camera.position.y += (targetY + mouse.y * 0.6 - camera.position.y) * 0.08;
  camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
  camera.rotation.z = Math.sin(t * 0.2) * 0.02 * motion;

  bloom.strength = turbo > 0 ? 1.1 : 0.55;
  composer.render();
  requestAnimationFrame(frame);
}
readScroll();
frame();
