import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("console");
const wrap = canvas.parentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
camera.position.set(0, 4.2, 7.4);
camera.lookAt(0, 1.05, 0);

scene.add(new THREE.HemisphereLight(0xfff0f8, 0x4a1238, 1.8));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new THREE.PointLight(0x9b8cff, 30, 20);
rim.position.set(-4, 2, -3);
scene.add(rim);

/* ---------- materials ---------- */
const shellMat = new THREE.MeshStandardMaterial({ color: 0xff3fa0, roughness: 0.32, metalness: 0.1 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xd61f7f, roughness: 0.4 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b0a20, roughness: 0.6 });
const btnMat = new THREE.MeshStandardMaterial({ color: 0xffd1ea, roughness: 0.25 });
const mintMat = new THREE.MeshStandardMaterial({ color: 0x8ff5b0, roughness: 0.3, emissive: 0x1a5a32 });

/* ---------- screen texture (drawn as pixel art each frame it changes) ---------- */
const scr = document.createElement("canvas");
scr.width = 160; scr.height = 120;
const g = scr.getContext("2d");
g.imageSmoothingEnabled = false;
const screenTex = new THREE.CanvasTexture(scr);
screenTex.magFilter = THREE.NearestFilter;
screenTex.minFilter = THREE.NearestFilter;
screenTex.colorSpace = THREE.SRGBColorSpace;

const HEART = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
const STAR = ["0001000", "0011100", "1111111", "0111110", "0110110", "1000001"];
function sprite(rows, x, y, s, color) {
  g.fillStyle = color;
  rows.forEach((r, j) => [...r].forEach((c, i) => c === "1" && g.fillRect(x + i * s, y + j * s, s, s)));
}

const pages = [
  { title: "PLAYER 1", lines: ["NIYA GANESH", "CLASS: DEV+AI", "GUILD: NITJ"], bar: 0.82 },
  { title: "FAV COMBO", lines: ["NEXT.JS", "+ FASTAPI", "+ POSTGRES"], bar: 0.9 },
  { title: "LAST QUEST", lines: ["ATYAF E SOL.", "3 SITES LIVE", "BAHRAIN"], bar: 1 },
  { title: "NOW", lines: ["LOOKING FOR", "INTERNSHIPS", "& COLLABS"], bar: 0.65 },
];
let page = 0;

function drawScreen(t) {
  const p = pages[page];
  g.fillStyle = "#1f3d2c";
  g.fillRect(0, 0, 160, 120);
  // scanline grid
  g.fillStyle = "rgba(143,245,176,0.07)";
  for (let y = 0; y < 120; y += 4) g.fillRect(0, y, 160, 1);

  g.font = "bold 12px monospace";
  g.textBaseline = "top";
  g.fillStyle = "#fff2a8";
  g.fillText(p.title, 8, 7);
  sprite(HEART, 140, 7, 2, "#ff5fb4");

  g.fillStyle = "#ff8fcb";
  g.font = "bold 13px monospace";
  p.lines.forEach((l, i) => g.fillText(l, 8, 28 + i * 17));

  // HP bar
  g.fillStyle = "#8ff5b0";
  g.font = "bold 9px monospace";
  g.fillText("HP", 8, 86);
  g.strokeStyle = "#8ff5b0";
  g.strokeRect(24.5, 86.5, 100, 8);
  g.fillRect(26, 88, Math.round(97 * p.bar), 5);

  // blinking prompt + bobbing star
  if (Math.floor(t * 2) % 2 === 0) {
    g.fillStyle = "#ffd1ea";
    g.fillText("PRESS ▶ / TAP", 8, 104);
  }
  sprite(STAR, 134, 98 + Math.round(Math.sin(t * 4) * 2), 2, "#fff2a8");
  screenTex.needsUpdate = true;
}

/* ---------- console model ---------- */
const W = 3.2, D = 2.5, T = 0.3;
const device = new THREE.Group();
scene.add(device);

// bottom half
const base = new THREE.Mesh(new RoundedBoxGeometry(W, T, D, 4, 0.14), shellMat);
base.position.y = T / 2;
device.add(base);

const touch = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.04, 1.15, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xffb8dc, roughness: 0.15 }));
touch.position.set(0, T + 0.01, 0.12);
device.add(touch);
// faint grid on the touch screen
const touchGrid = new THREE.GridHelper(1.4, 6, 0xffffff, 0xffffff);
touchGrid.material.opacity = 0.35;
touchGrid.material.transparent = true;
touchGrid.scale.z = 1.0 / 1.4;
touchGrid.position.set(0, T + 0.035, 0.12);
device.add(touchGrid);

const dpad = new THREE.Group();
dpad.add(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.16, 2, 0.03), darkMat));
dpad.add(new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.08, 0.5, 2, 0.03), darkMat));
dpad.position.set(-1.15, T + 0.03, 0.2);
device.add(dpad);

const faceBtns = [];
[[0, -0.2], [0.2, 0], [0, 0.2], [-0.2, 0]].forEach(([x, z], i) => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 20), i === 1 ? mintMat : btnMat);
  b.position.set(1.15 + x, T + 0.03, 0.2 + z);
  device.add(b);
  faceBtns.push(b);
});

[-0.25, 0.25].forEach((x) => {
  const pill = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.05, 0.08, 2, 0.025), trimMat);
  pill.position.set(x, T + 0.01, D / 2 - 0.25);
  device.add(pill);
});
const power = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: 0x8ff5b0 }));
power.position.set(-1.35, T + 0.01, D / 2 - 0.25);
device.add(power);

// top half, hinged along the back edge
const hinge = new THREE.Group();
hinge.position.set(0, T, -D / 2);
device.add(hinge);

const lid = new THREE.Mesh(new RoundedBoxGeometry(W, T * 0.8, D, 4, 0.14), shellMat);
lid.position.set(0, T * 0.4, D / 2);
hinge.add(lid);

const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.04, 1.75, 2, 0.04), darkMat);
bezel.position.set(0, -0.005, D / 2 + 0.05);
hinge.add(bezel);

const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
screen.rotation.x = Math.PI / 2;
screen.position.set(0, -0.03, D / 2 + 0.05);
hinge.add(screen);

// speaker dots either side of the top screen
[-1.35, 1.35].forEach((x) => {
  for (let i = 0; i < 6; i++) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), darkMat);
    dot.rotation.x = Math.PI / 2;
    dot.position.set(x + (i % 2) * 0.08 - 0.04, -0.01, D / 2 - 0.15 + Math.floor(i / 2) * 0.1);
    hinge.add(dot);
  }
});

const hingeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, W - 0.5, 20), trimMat);
hingeBar.rotation.z = Math.PI / 2;
hingeBar.position.set(0, T, -D / 2);
device.add(hingeBar);

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
  if (ray.intersectObjects([screen, touch, ...faceBtns, dpad], true).length) {
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
  const bob = reduceMotion ? 0 : Math.sin(t * 1.4) * 0.08;
  device.rotation.y += (userYaw + hover.x * 0.35 - device.rotation.y) * 0.1;
  device.rotation.x += (-hover.y * 0.12 - device.rotation.x) * 0.1;
  device.position.y = -0.1 + bob;

  pressT = Math.max(0, pressT - dt * 4);
  faceBtns[1].position.y = T + 0.03 - pressT * 0.04;
  power.material.color.setHSL(0.38, 0.85, 0.55 + Math.sin(t * 3) * 0.15);

  drawScreen(t);
  renderer.render(scene, camera);
}
frame();
