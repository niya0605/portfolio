import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("console");
const wrap = canvas.parentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
// soft studio reflections so the metal finish reads as real hardware
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
camera.position.set(0, 4.2, 7.4);
camera.lookAt(0, 1.05, 0);

scene.add(new THREE.HemisphereLight(0xfff0f8, 0x2a0a1e, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new THREE.PointLight(0xff5ca8, 40, 20);
rim.position.set(-4, 2, -3);
scene.add(rim);

/* ---------- materials ---------- */
const shellMat = new THREE.MeshPhysicalMaterial({
  color: 0xf2559c, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.9,
});
const graphiteMat = new THREE.MeshStandardMaterial({ color: 0x1c171e, metalness: 0.6, roughness: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a080c, metalness: 0, roughness: 0.35, envMapIntensity: 0.06, emissive: 0x0b0208 });
const ledMat = new THREE.MeshBasicMaterial({ color: 0xff5ca8, toneMapped: false });

/* ---------- screen texture: a crisp terminal-style readout ---------- */
const SW = 512, SH = 384;
const scr = document.createElement("canvas");
scr.width = SW; scr.height = SH;
const g = scr.getContext("2d");
const screenTex = new THREE.CanvasTexture(scr);
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.anisotropy = 4;

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const DISPLAY = '"Chakra Petch", system-ui, sans-serif';

const pages = [
  { title: "PLAYER 01", lines: ["Niya Ganesh", "Full-stack · AI", "NIT Jalandhar"], bar: 0.82 },
  { title: "STACK", lines: ["Next.js", "FastAPI", "PostgreSQL"], bar: 0.9 },
  { title: "LAST MISSION", lines: ["Atyaf E Solutions", "3 sites live", "Bahrain"], bar: 1 },
  { title: "STATUS", lines: ["Open to", "internships", "& collabs"], bar: 0.65 },
];
let page = 0;

function drawScreen(t) {
  const p = pages[page];
  g.fillStyle = "#0b0710";
  g.fillRect(0, 0, SW, SH);

  // faint grid
  g.strokeStyle = "rgba(255,92,168,0.06)";
  g.lineWidth = 1;
  for (let x = 0; x <= SW; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, SH); g.stroke(); }
  for (let y = 0; y <= SH; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(SW, y + 0.5); g.stroke(); }

  // header bar
  g.textBaseline = "middle";
  g.font = `500 15px ${MONO}`;
  g.fillStyle = "#6c5966";
  g.fillText("NG-OS  v26", 28, 32);
  g.fillStyle = Math.floor(t * 1.5) % 2 ? "#ff5ca8" : "#7a2c55";
  g.beginPath(); g.arc(SW - 92, 32, 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff8cc4";
  g.fillText("ONLINE", SW - 80, 32);
  g.fillStyle = "rgba(255,92,168,0.3)";
  g.fillRect(28, 54, SW - 56, 1);

  // title + lines
  g.textBaseline = "alphabetic";
  g.font = `500 16px ${MONO}`;
  g.fillStyle = "#ff5ca8";
  g.fillText(`// ${p.title}`, 28, 96);
  p.lines.forEach((l, i) => {
    g.font = i === 0 ? `700 40px ${DISPLAY}` : `500 26px ${DISPLAY}`;
    g.fillStyle = i === 0 ? "#ffffff" : "#c9b3c2";
    g.fillText(l, 28, 146 + i * 40 + (i ? 8 : 0));
  });

  // xp bar
  g.font = `500 13px ${MONO}`;
  g.fillStyle = "#6c5966";
  g.fillText("XP", 28, 290);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.fillRect(60, 282, 240, 6);
  const grad = g.createLinearGradient(60, 0, 300, 0);
  grad.addColorStop(0, "#a68bff");
  grad.addColorStop(1, "#ff5ca8");
  g.fillStyle = grad;
  g.fillRect(60, 282, Math.round(240 * p.bar), 6);

  // live signal trace
  g.strokeStyle = "#ff5ca8";
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= 140; x += 4) {
    const y = 285 + Math.sin(x * 0.09 + t * 4) * 9 * Math.sin(x * 0.02 + t);
    x ? g.lineTo(SW - 168 + x, y) : g.moveTo(SW - 168 + x, y);
  }
  g.stroke();

  // footer: page dots + hint
  pages.forEach((_, i) => {
    g.fillStyle = i === page ? "#ff5ca8" : "rgba(255,255,255,0.15)";
    g.fillRect(28 + i * 22, 334, 14, 3);
  });
  g.font = `500 13px ${MONO}`;
  g.fillStyle = "#6c5966";
  g.textAlign = "right";
  g.fillText("TAP  ▸  NEXT", SW - 28, 340);
  g.textAlign = "left";

  screenTex.needsUpdate = true;
}

/* ---------- console model ---------- */
const W = 3.2, D = 2.5, T = 0.22;
const device = new THREE.Group();
scene.add(device);

// bottom half
const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 0.06), shellMat);
base.position.y = T / 2;
device.add(base);

// pink LED line along the front edge
const frontLed = new THREE.Mesh(new THREE.BoxGeometry(W - 0.9, 0.012, 0.01), ledMat);
frontLed.position.set(0, T / 2, D / 2 + 0.002);
device.add(frontLed);

const touch = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.02, 1.15, 2, 0.02), glassMat);
touch.position.set(0, T + 0.002, 0.12);
device.add(touch);
const touchGrid = new THREE.GridHelper(1.4, 10, 0xff5ca8, 0xff5ca8);
touchGrid.material.opacity = 0.28;
touchGrid.material.transparent = true;
touchGrid.scale.z = 1.0 / 1.4;
touchGrid.position.set(0, T + 0.014, 0.12);
device.add(touchGrid);

const dpad = new THREE.Group();
dpad.add(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.05, 0.14, 2, 0.02), graphiteMat));
dpad.add(new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.05, 0.46, 2, 0.02), graphiteMat));
dpad.position.set(-1.15, T + 0.02, 0.2);
device.add(dpad);

// face buttons: graphite caps, one with a pink LED ring
const faceBtns = [];
[[0, -0.2], [0.2, 0], [0, 0.2], [-0.2, 0]].forEach(([x, z], i) => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 28), graphiteMat);
  b.position.set(1.15 + x, T + 0.02, 0.2 + z);
  device.add(b);
  faceBtns.push(b);
  if (i === 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 8, 32), ledMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(1.15 + x, T + 0.003, 0.2 + z);
    device.add(ring);
  }
});

[-0.25, 0.25].forEach((x) => {
  const pill = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.03, 0.06, 2, 0.015), graphiteMat);
  pill.position.set(x, T + 0.005, D / 2 - 0.25);
  device.add(pill);
});
const power = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x7ee2b8, toneMapped: false }));
power.rotation.x = -Math.PI / 2;
power.position.set(-1.35, T + 0.002, D / 2 - 0.25);
device.add(power);

// top half, hinged along the back edge
const hinge = new THREE.Group();
hinge.position.set(0, T, -D / 2);
device.add(hinge);

const lid = new THREE.Mesh(new RoundedBoxGeometry(W, 0.16, D, 4, 0.06), shellMat);
lid.position.set(0, 0.08, D / 2);
hinge.add(lid);

// edge-to-edge dark glass front with the display inset
const bezel = new THREE.Mesh(new RoundedBoxGeometry(W - 0.12, 0.02, D - 0.12, 2, 0.04), glassMat);
bezel.position.set(0, -0.005, D / 2);
hinge.add(bezel);

const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
screen.rotation.x = Math.PI / 2;
screen.position.set(0, -0.017, D / 2 + 0.02);
hinge.add(screen);

// speaker slots either side of the display
[-1.4, 1.4].forEach((x) => {
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.16), graphiteMat);
    slot.rotation.x = Math.PI / 2;
    slot.position.set(x + (i - 2) * 0.05, -0.017, D / 2);
    hinge.add(slot);
  }
});

const hingeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, W - 0.5, 28), graphiteMat);
hingeBar.rotation.z = Math.PI / 2;
hingeBar.position.set(0, T, -D / 2);
device.add(hingeBar);
const hingeLed = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.5, 28, 1, true), ledMat);
hingeLed.rotation.z = Math.PI / 2;
hingeLed.position.set(0, T, -D / 2);
device.add(hingeLed);

device.position.y = -0.1;
const OPEN = -1.92; // ~110°

/* ---------- interaction ---------- */
let openK = reduceMotion ? 1 : 0;
let opening = reduceMotion;
let dragging = false, lastX = 0, spinVel = 0, userYaw = 0;
const hover = new THREE.Vector2();
let pressT = 0;

function size() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // pull back on narrow layouts so the open console still fits
  camera.position.z = w / h < 0.8 ? 8.6 : 6.4;
  camera.position.y = w / h < 0.8 ? 4.0 : 3.6;
  camera.lookAt(0, 1.05, 0);
  camera.updateProjectionMatrix();
}
new ResizeObserver(size).observe(wrap);
size();

let visible = false;
let started = false;
addEventListener("ng:start", () => { started = true; if (visible) opening = true; });
new IntersectionObserver(([e]) => {
  visible = e.isIntersecting;
  if (visible && started) opening = true;
}, { threshold: 0.25 }).observe(canvas);

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  hover.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  if (dragging) {
    spinVel = (e.clientX - lastX) * 0.01;
    userYaw += spinVel;
    lastX = e.clientX;
  }
});
canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastX = e.clientX;
  canvas.setPointerCapture(e.pointerId);
  pressStart = performance.now();
});
let pressStart = 0;
canvas.addEventListener("pointerup", (e) => {
  dragging = false;
  // treat a short press without much drag as a tap
  if (performance.now() - pressStart > 250 || Math.abs(spinVel) > 0.05) return;
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  if (ray.intersectObjects([screen, bezel, touch, ...faceBtns, dpad], true).length) {
    page = (page + 1) % pages.length;
    pressT = 1;
    if (page === pages.length - 1) window.NG?.toast("Read every screen", { head: "Console", pts: 150 });
    else window.NG?.addScore(10);
  }
});
canvas.addEventListener("pointerleave", () => hover.set(0, 0));

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!visible) return;
  const t = clock.elapsedTime;

  if (opening) openK = Math.min(openK + dt * 0.9, 1);
  // overshoot ease so the lid snaps open with a little bounce
  const k = openK;
  const ease = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
  hinge.rotation.x = OPEN * ease;

  if (!dragging) {
    spinVel *= 0.94;
    userYaw += spinVel;
    userYaw *= 0.97; // drift back to facing the viewer
  }
  const bob = reduceMotion ? 0 : Math.sin(t * 1.4) * 0.06;
  device.rotation.y += (userYaw + hover.x * 0.35 - device.rotation.y) * 0.1;
  device.rotation.x += (-hover.y * 0.12 - device.rotation.x) * 0.1;
  device.position.y = -0.1 + bob;

  pressT = Math.max(0, pressT - dt * 4);
  faceBtns[1].position.y = T + 0.02 - pressT * 0.025;
  const pulse = 0.75 + Math.sin(t * 2.2) * 0.25 + pressT * 0.5;
  ledMat.color.setRGB(1 * pulse, 0.36 * pulse, 0.66 * pulse);
  power.material.color.setHSL(0.43, 0.6, 0.6 + Math.sin(t * 3) * 0.12);

  drawScreen(t);
  renderer.render(scene, camera);
}
frame();
