(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- score + toasts ---------- */
  let score = 0;
  const scoreEl = $("#score");
  const hiEl = $("#hiscore");
  const pad = (n) => String(n).padStart(6, "0");

  let hiscore = 0;
  try { hiscore = Number(localStorage.getItem("ng-hiscore")) || 0; } catch {}
  hiEl.textContent = pad(hiscore);

  function addScore(pts) {
    score += pts;
    scoreEl.textContent = pad(score);
    const box = scoreEl.parentElement;
    box.classList.remove("bump");
    void box.offsetWidth;
    box.classList.add("bump");
    if (score > hiscore) {
      hiscore = score;
      hiEl.textContent = pad(hiscore);
      try { localStorage.setItem("ng-hiscore", hiscore); } catch {}
    }
  }

  function toast(text, { head = "Achievement unlocked", pts = 100 } = {}) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="toast-icon"></span>
      <div><p class="toast-head"></p><p class="toast-body"></p></div>
      ${pts ? `<span class="toast-pts">+${pts}</span>` : ""}`;
    t.querySelector(".toast-head").textContent = head;
    t.querySelector(".toast-body").textContent = text;
    $("#toasts").appendChild(t);
    if (pts) addScore(pts);
    setTimeout(() => {
      t.classList.add("out");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, 2600);
  }
  window.NG = { toast, addScore };

  /* ---------- boot screen ---------- */
  const loader = $("#loader");
  const bootLines = [
    "loading player profile",
    "compiling shaders",
    "mounting mission log",
    "syncing loadout",
    "powering up console",
  ];
  document.body.classList.add("loading");
  let started = false;

  function startGame() {
    if (started) return;
    started = true;
    loader.classList.add("done");
    document.body.classList.remove("loading");
    window.dispatchEvent(new Event("ng:start"));
    startTyping();
  }

  (function boot() {
    const log = $("#boot-log");
    const fill = $("#boot-fill");
    let i = 0;
    const step = reduceMotion ? 60 : 260;
    const tick = () => {
      if (i > 0) log.lastElementChild.classList.add("ok");
      if (i < bootLines.length) {
        const li = document.createElement("li");
        li.textContent = bootLines[i];
        log.appendChild(li);
        fill.style.width = ((i + 1) / bootLines.length) * 100 + "%";
        i++;
        setTimeout(tick, step);
      } else {
        if (new URLSearchParams(location.search).has("skip")) return startGame();
        $("#press-start").hidden = false;
        $("#boot-hint").hidden = false;
        $("#press-start").focus({ preventScroll: true });
        loader.addEventListener("click", startGame);
        addEventListener("keydown", startGame, { once: true });
      }
    };
    tick();
  })();

  /* ---------- typing role line ---------- */
  const roles = [
    "Frontend Developer",
    "Full-Stack Builder",
    "AI / ML Engineer in training",
    "B.Tech IT @ NIT Jalandhar",
  ];
  function startTyping() {
    const el = $("#typed");
    if (reduceMotion) { el.textContent = roles[0]; return; }
    let r = 0, c = 0, deleting = false;
    const loop = () => {
      const word = roles[r];
      c += deleting ? -1 : 1;
      el.textContent = word.slice(0, c);
      let delay = deleting ? 35 : 70;
      if (!deleting && c === word.length) { deleting = true; delay = 1800; }
      else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 300; }
      setTimeout(loop, delay);
    };
    loop();
  }

  /* ---------- HUD: nav, xp, level ---------- */
  const nav = $("#hud-nav");
  const menuBtn = $("#hud-menu");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));

  const xpFill = $("#xp-fill");
  const levelEl = $("#level");
  const sections = $$("main section");
  const navLinks = $$("a", nav);

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    xpFill.style.width = p * 100 + "%";

    let current = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) current = i; });
    levelEl.textContent = current + 1;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + sections[current].id));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveals + section achievements ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealObs.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 90 + "ms";
    revealObs.observe(el);
  });

  const seen = new Set();
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const id = e.target.id;
      if (!e.isIntersecting || seen.has(id) || id === "home" || !started) return;
      seen.add(id);
      toast(e.target.dataset.achievement);
      if (seen.size === sections.length - 1) {
        setTimeout(() => toast("Every section explored", { head: "100% complete", pts: 500 }), 1200);
      }
    });
  }, { threshold: 0.3 });
  sections.forEach((s) => sectionObs.observe(s));

  /* ---------- stat counters ---------- */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = Number(el.dataset.count);
      const t0 = performance.now();
      const dur = reduceMotion ? 1 : 1200;
      const step = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3)))).padStart(2, "0");
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObs.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countObs.observe(el));

  /* ---------- 3D tilt + spotlight on project cards ---------- */
  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    $$(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotateY(${(x - 0.5) * 8}deg) rotateX(${(0.5 - y) * 8}deg)`;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- custom cursor ---------- */
  const cursor = $(".cursor");
  if (getComputedStyle(cursor).display !== "none") {
    const dot = $(".cursor-dot"), ring = $(".cursor-ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    const follow = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    };
    follow();
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("hover", !!e.target.closest("a, button, .chips span, .tilt, #console"));
    });
  }

  /* ---------- light / dark theme ---------- */
  const themeBtn = $("#theme-toggle");
  const root = document.documentElement;
  function setTheme(theme, save) {
    if (theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    themeBtn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    if (save) { try { localStorage.setItem("ng-theme", theme); } catch {} }
    window.dispatchEvent(new CustomEvent("ng:theme", { detail: theme }));
  }
  themeBtn.addEventListener("click", () => setTheme(root.dataset.theme === "light" ? "dark" : "light", true));
  setTheme(root.dataset.theme === "light" ? "light" : "dark", false);

  /* ---------- copy email ---------- */
  $("#copy-email")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("niyaganesh06@gmail.com");
      toast("Email copied to clipboard", { head: "Copied", pts: 0 });
    } catch {
      location.href = "mailto:niyaganesh06@gmail.com";
    }
  });

  /* ---------- continue countdown ---------- */
  const cd = $("#countdown");
  let cdTimer = null;
  const cdObs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || cdTimer) return;
    let n = 9;
    cd.textContent = n;
    cd.classList.remove("small");
    cdTimer = setInterval(() => {
      n--;
      if (n >= 0) { cd.textContent = n; return; }
      clearInterval(cdTimer);
      cd.classList.add("small");
      cd.textContent = "Still here? Let's build something.";
    }, 900);
  }, { threshold: 0.5 });
  cdObs.observe(cd);

  /* ---------- konami code ---------- */
  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kIdx = 0;
  addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kIdx = key === konami[kIdx] ? kIdx + 1 : (key === konami[0] ? 1 : 0);
    if (kIdx < konami.length) return;
    kIdx = 0;
    toast("Turbo mode activated", { head: "Cheat code", pts: 1000 });
    document.body.classList.add("turbo");
    window.dispatchEvent(new Event("ng:turbo"));
    sparkRain();
    setTimeout(() => document.body.classList.remove("turbo"), 6000);
  });

  function sparkRain() {
    if (reduceMotion) return;
    for (let i = 0; i < 50; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.style.left = Math.random() * 100 + "vw";
      s.style.top = "0";
      s.style.animationDuration = 0.8 + Math.random() * 1.2 + "s";
      s.style.animationDelay = Math.random() * 1.5 + "s";
      document.body.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }
  }
})();
