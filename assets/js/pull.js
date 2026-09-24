(function () {
  "use strict";
  var dataEl = document.getElementById("game-data");
  if (!dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RARITY_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary", mythical: "Mythical" };
  var PIPS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythical: 6 };
  var CAPSULE_COLOURS = ["#f19aa1", "#f3c969", "#8fd3a8", "#8cc1ea", "#c3a3ef", "#f3a15a", "#f5e2a0", "#7fd8d0"];
  var STORE_KEY = "pawpon.site.found";
  var HIDDEN = { legendary: true, mythical: true };

  var found = {};
  try { found = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { found = {}; }
  function remember(id) {
    found[id] = true;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(found)); } catch (e) {  }
  }

  var catsById = {};
  var setById = {};
  data.sets.forEach(function (set) {
    setById[set.id] = set;
    set.cats.forEach(function (cat) { cat.setId = set.id; cat.setName = set.name; catsById[cat.id] = cat; });
  });

  function accent(hue) { return hue == null ? "#e8c879" : "oklch(0.80 0.10 " + hue + ")"; }
  function pct(x) {
    var v = x * 100;
    if (v === 0) return "0%";
    if (v < 1) return v.toFixed(2) + "%";
    return v.toFixed(1) + "%";
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var cabinet = document.querySelector(".cabinet");
  var picker = document.querySelector(".machine-picker");
  var oddsList = document.querySelector(".demo-odds");
  var sign = document.querySelector(".cab-sign");
  var glass = document.querySelector(".cab-glass");
  var pile = document.querySelector(".pile");
  var claw = document.querySelector(".claw");
  var held = claw.querySelector(".held");
  var stick = document.querySelector(".stick");
  var grabBtn = document.querySelector(".grab-btn");
  var dropBtn = document.querySelector(".drop-btn");
  var capsule = document.querySelector(".drop-capsule");
  var status = document.querySelector(".pull-status");
  var machine = data.machines[0];
  var busy = false;
  var CHUTE_X = 0.082, PARK = CHUTE_X, MIN_X = 0.3, MAX_X = 0.9;
  var clawX = PARK;
  var pending = null;

  function setClaw(x, animate, ms) {
    clawX = x;
    claw.style.transition = animate ? "left " + (ms || 700) + "ms cubic-bezier(.45,0,.3,1)" : "none";
    claw.style.left = (x * 100).toFixed(2) + "%";
  }
  var cable = claw.querySelector(".cable");
  function setCable(px, ms) {
    cable.style.transition = "height " + (ms || 600) + "ms cubic-bezier(.45,0,.3,1)";
    cable.style.height = px + "px";
  }
  function setJaws(open) { claw.classList.toggle("closed", !open); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, still ? Math.min(ms, 60) : ms); }); }

  function fillPile() {
    pile.textContent = "";
    for (var i = 0; i < 24; i++) {
      var s = el("span");
      var w = 24 + Math.round(Math.random() * 8);
      var row = Math.floor(i / 8);
      s.style.setProperty("--w", w + "px");
      s.style.setProperty("--c", CAPSULE_COLOURS[(i * 7 + row) % CAPSULE_COLOURS.length]);
      s.style.setProperty("--jx", (Math.random() * 6 - 3).toFixed(1) + "px");
      s.style.left = (21 + (i % 8) * 9.4 + (row % 2) * 3 + Math.random() * 2).toFixed(1) + "%";
      s.style.bottom = (row * 20 + Math.random() * 5).toFixed(0) + "px";
      pile.appendChild(s);
    }
  }

  function showMachine(m) {
    machine = m;
    pending = null;
    cabinet.style.setProperty("--accent", accent(m.accentHue));
    sign.innerHTML = "";
    sign.appendChild(document.createTextNode(m.name));
    var set = setById[m.setId], got = set.cats.filter(function (c) { return found[c.id]; }).length;
    sign.appendChild(el("small", null, got + " / " + set.cats.length + " collected"));
    oddsList.textContent = "";
    data.rarities.forEach(function (r) {
      var chance = m.clean[r] || 0;
      var li = el("li", "r-" + r);
      li.appendChild(el("span", null, RARITY_LABEL[r]));
      var bar = el("span", "bar");
      var fill = el("i");
      fill.style.width = Math.max(chance * 100, chance > 0 ? 0.6 : 0) + "%";
      bar.appendChild(fill);
      li.appendChild(bar);
      li.appendChild(el("span", "pct", pct(chance)));
      oddsList.appendChild(li);
    });
    var note = document.querySelector(".demo-odds-note");
    if (note) {
      note.textContent = m.timeLocked.length
        ? m.timeLocked.join(", ") + " only comes out during the 3 a.m. hour, so its chance here is 0%."
        : "Starting odds for a clean cabinet. In the game, pity and upgrades move them in your favour.";
    }
    picker.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-id") === m.id ? "true" : "false");
    });
    fillPile();
  }

  data.machines.forEach(function (m) {
    var chip = el("button", "chip", m.name);
    chip.type = "button";
    chip.setAttribute("data-id", m.id);
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", function () { if (!busy) { showMachine(m); setClaw(PARK, true, 300); } });
    picker.appendChild(chip);
  });

  function roll() {
    var table = machine.clean;
    var x = Math.random(), acc = 0, chosen = "common";
    for (var i = 0; i < data.rarities.length; i++) {
      var r = data.rarities[i];
      acc += table[r] || 0;
      if (x < acc) { chosen = r; break; }
    }
    var name = machine.cats[chosen];
    var set = setById[machine.setId];
    for (var j = 0; j < set.cats.length; j++) if (set.cats[j].name === name) return set.cats[j];
    return set.cats[0];
  }
  function slipChance(rarity, attempt) {
    var f = data.fumble;
    if (attempt >= f.guaranteedAttempt) return 0;
    return (f.chanceByRarity[rarity] || 0) * Math.pow(f.attemptFalloff, attempt - 1);
  }

  function ghost(fromX, fromTop, colour) {
    var g = el("span", "loose-capsule");
    g.style.left = (fromX * 100) + "%";
    g.style.top = fromTop + "px";
    g.style.setProperty("--cap", colour);
    glass.appendChild(g);
    return g;
  }

  async function grab() {
    if (busy) return;
    busy = true;
    grabBtn.disabled = true;
    grabBtn.classList.add("pressed");
    setTimeout(function () { grabBtn.classList.remove("pressed"); }, 180);
    if (!pending) pending = { cat: roll(), attempt: 1, colour: CAPSULE_COLOURS[Math.floor(Math.random() * CAPSULE_COLOURS.length)] };
    status.textContent = pending.attempt > 1 ? "Free retry, try " + pending.attempt + "." : "The claw is going down…";
    var depth = Math.max(40, glass.clientHeight - 128);
    setCable(depth, 650);
    await wait(700);
    setJaws(false);
    held.style.setProperty("--cap", pending.colour);
    held.hidden = false;
    cabinet.classList.add("shaking");
    await wait(320);
    cabinet.classList.remove("shaking");
    setCable(14, 650);
    await wait(700);
    var slips = Math.random() < slipChance(pending.cat.rarity, pending.attempt);
    setClaw(CHUTE_X, true, 900);
    if (slips) {
      await wait(420);
      held.hidden = true;
      var r = claw.getBoundingClientRect(), g = glass.getBoundingClientRect();
      var lost = ghost((r.left + r.width / 2 - g.left) / g.width, r.bottom - g.top - 18, pending.colour);
      lost.classList.add("slip");
      await wait(900);
      lost.remove();
      await wait(80);
      setJaws(true);
      pending.attempt += 1;
      status.textContent = "It slipped! That try cost nothing. Press GRAB again: the next one is less likely to slip.";
      setClaw(PARK, true, 700);
      await wait(720);
      busy = false;
      grabBtn.disabled = false;
      return;
    }
    await wait(950);
    carrying = true;
    dropBtn.disabled = false;
    dropBtn.classList.add("ready");
    status.textContent = "Over the chute. Press DROP to let it go.";
    dropBtn.focus({ preventScroll: true });
  }

  var carrying = false;
  async function drop() {
    if (!carrying) return;
    carrying = false;
    dropBtn.disabled = true;
    dropBtn.classList.remove("ready");
    dropBtn.classList.add("pressed");
    setTimeout(function () { dropBtn.classList.remove("pressed"); }, 180);
    setJaws(true);
    held.hidden = true;
    var r = claw.getBoundingClientRect(), g = glass.getBoundingClientRect();
    var fall = ghost(CHUTE_X, r.bottom - g.top - 26, pending.colour);
    fall.classList.add("vent-fall");
    await wait(450);
    fall.remove();
    capsule.style.setProperty("--cap", pending.colour);
    capsule.className = "drop-capsule falling";
    setClaw(PARK, true, 800);
    await wait(650);
    capsule.className = "drop-capsule wobble";
    await wait(600);
    var cat = pending.cat;
    pending = null;
    status.textContent = cat.name + " came home. " + RARITY_LABEL[cat.rarity] + ".";
    openReveal(cat);
  }
  dropBtn.addEventListener("click", drop);
  grabBtn.addEventListener("click", grab);
  var tilt = 0, dragging = false, startX = 0, raf = 0;
  function setTilt(t) {
    tilt = Math.max(-1, Math.min(1, t));
    stick.style.setProperty("--tilt", (tilt * 24).toFixed(1) + "deg");
    if (tilt !== 0 && !raf) raf = window.requestAnimationFrame(travel);
  }
  var last = 0;
  function travel(t) {
    var dt = last ? Math.min(t - last, 50) : 16;
    last = t;
    if (!busy && tilt !== 0) setClaw(Math.max(MIN_X, Math.min(MAX_X, clawX + tilt * dt * 0.0006)), false);
    if (tilt !== 0) raf = window.requestAnimationFrame(travel); else { raf = 0; last = 0; }
  }
  stick.addEventListener("pointerdown", function (e) {
    dragging = true; startX = e.clientX; stick.setPointerCapture(e.pointerId);
  });
  stick.addEventListener("pointermove", function (e) { if (dragging) setTilt((e.clientX - startX) / 28); });
  function release() { dragging = false; setTilt(0); }
  stick.addEventListener("pointerup", release);
  stick.addEventListener("pointercancel", release);
  stick.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (!busy) setClaw(Math.max(MIN_X, Math.min(MAX_X, clawX + (e.key === "ArrowLeft" ? -0.05 : 0.05))), true, 150);
      stick.style.setProperty("--tilt", (e.key === "ArrowLeft" ? -20 : 20) + "deg");
      setTimeout(function () { stick.style.setProperty("--tilt", "0deg"); }, 160);
    }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); grab(); }
  });
  var reveal = document.querySelector(".reveal");
  var revealCard = reveal.querySelector(".reveal-card");
  var keep = reveal.querySelector(".keep");
  var lastFocus = null;

  function openReveal(cat) {
    revealCard.className = "reveal-card glass r-" + cat.rarity;
    reveal.querySelector("img").src = "/assets/img/cats/" + cat.id + ".webp?v=" + data.v;
    reveal.querySelector("img").alt = cat.name;
    reveal.querySelector(".set").textContent = cat.setName;
    reveal.querySelector("h3").textContent = cat.name;
    var tag = reveal.querySelector(".rarity-tag");
    tag.textContent = "";
    tag.appendChild(el("span", "pips", new Array(PIPS[cat.rarity] + 1).join("✦")));
    tag.appendChild(document.createTextNode(RARITY_LABEL[cat.rarity]));
    reveal.querySelector(".quote").textContent = "“" + cat.flavor + "”";
    reveal.querySelector(".new-flag").hidden = !!found[cat.id];
    remember(cat.id);
    lastFocus = grabBtn;
    reveal.classList.add("open");
    reveal.setAttribute("aria-hidden", "false");
    keep.focus();
    renderGallery();
  }
  function closeReveal() {
    reveal.classList.remove("open");
    reveal.setAttribute("aria-hidden", "true");
    capsule.className = "drop-capsule";
    busy = false;
    grabBtn.disabled = false;
    showMachine(machine);
    if (lastFocus) lastFocus.focus();
  }
  keep.addEventListener("click", closeReveal);
  reveal.addEventListener("click", function (e) { if (e.target === reveal) closeReveal(); });
  document.addEventListener("keydown", function (e) {
    if (!reveal.classList.contains("open")) return;
    if (e.key === "Escape") closeReveal();
    if (e.key === "Tab") { e.preventDefault(); keep.focus(); }
  });

  setClaw(PARK, false);
  setCable(14);
  var tabs = document.querySelector(".cat-tabs");
  var grid = document.querySelector(".cat-grid");
  var intro = document.querySelector(".set-intro");
  var counter = document.querySelector(".found-count");
  var activeSet = data.sets[0].id;

  data.sets.forEach(function (set) {
    var t = el("button", "chip", set.name);
    t.type = "button";
    t.setAttribute("role", "tab");
    t.setAttribute("aria-selected", set.id === activeSet ? "true" : "false");
    t.setAttribute("aria-controls", "cat-panel");
    t.addEventListener("click", function () { activeSet = set.id; renderGallery(); });
    t.setAttribute("data-id", set.id);
    tabs.appendChild(t);
  });

  function renderGallery() {
    var set = setById[activeSet];
    tabs.querySelectorAll(".chip").forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-id") === activeSet ? "true" : "false");
    });
    intro.textContent = "";
    var head = el("div");
    head.appendChild(el("h3", null, set.name));
    head.appendChild(el("p", null, set.premium
      ? "Six companions who come with the Nightlight Pass. They are never in a machine, so nobody has to gamble for them."
      : set.theme + "."));
    intro.appendChild(head);
    if (set.postcard) {
      var pc = el("blockquote", "postcard", set.postcard);
      pc.appendChild(el("cite", null, "— a postcard from M."));
      intro.appendChild(pc);
    }
    grid.textContent = "";
    set.cats.forEach(function (cat) {
      var hidden = !set.premium && HIDDEN[cat.rarity] && !found[cat.id];
      var li = el("li", "cat-card r-" + cat.rarity + (hidden ? " hidden" : "") + (found[cat.id] ? " found" : ""));
      var img = el("img");
      img.src = "/assets/img/cats/" + cat.id + ".webp?v=" + data.v;
      img.alt = hidden ? "A " + RARITY_LABEL[cat.rarity].toLowerCase() + " cat you have not found yet" : cat.name;
      img.width = 200; img.height = 200;
      img.loading = "lazy";
      img.decoding = "async";
      li.appendChild(img);
      li.appendChild(el("span", "name", hidden ? "? ? ?" : cat.name));
      li.appendChild(el("span", "rar", RARITY_LABEL[cat.rarity]));
      if (found[cat.id]) li.appendChild(el("span", "flag", "Found"));
      if (!hidden) li.title = cat.flavor;
      grid.appendChild(li);
    });
    var total = 0, got = 0;
    data.sets.forEach(function (s) {
      if (s.premium) return;
      s.cats.forEach(function (c) { total++; if (found[c.id]) got++; });
    });
    counter.textContent = got
      ? "You have turned up " + got + " of " + total + " on this page. The rest are waiting in the game."
      : "Legendary and mythical cats stay in shadow until you find them. Try the claw above.";
  }

  showMachine(machine);
  renderGallery();
})();
