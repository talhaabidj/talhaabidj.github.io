(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
    header.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }
  document.querySelectorAll(".sky").forEach(function (sky) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    sky.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var stars = [];
    var visible = true;
    var density = Number(sky.getAttribute("data-stars") || 90);

    function size() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var w = sky.clientWidth, h = sky.clientHeight;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      var count = Math.round(density * (w * h) / (1280 * 720));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.8,
          r: Math.random() * 1.2 + 0.3,
          p: Math.random() * Math.PI * 2,
          s: 0.4 + Math.random() * 1.4,
          warm: Math.random() < 0.3
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = still ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(st.p + t * 0.001 * st.s));
        ctx.globalAlpha = a;
        ctx.fillStyle = st.warm ? "#ffd9a0" : "#f3ecff";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (st.r > 1.25) {
          ctx.globalAlpha = a * 0.35;
          ctx.fillRect(st.x - st.r * 3, st.y - 0.3, st.r * 6, 0.6);
          ctx.fillRect(st.x - 0.3, st.y - st.r * 3, 0.6, st.r * 6);
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      if (visible) draw(t);
      if (!still) window.requestAnimationFrame(loop);
    }

    size();
    if (still) draw(0); else window.requestAnimationFrame(loop);
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { size(); if (still) draw(0); }, 150);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(sky);
    }
    var motes = Number(sky.getAttribute("data-motes") || 0);
    if (!still) {
      for (var m = 0; m < motes; m++) {
        var dot = document.createElement("span");
        dot.className = "mote";
        dot.style.left = (Math.random() * 100).toFixed(1) + "%";
        dot.style.setProperty("--s", (3 + Math.random() * 6).toFixed(1) + "px");
        dot.style.setProperty("--d", (12 + Math.random() * 16).toFixed(1) + "s");
        dot.style.setProperty("--delay", (-Math.random() * 20).toFixed(1) + "s");
        dot.style.setProperty("--x", (Math.random() * 120 - 60).toFixed(0) + "px");
        dot.style.setProperty("--o", (0.35 + Math.random() * 0.55).toFixed(2));
        sky.appendChild(dot);
      }
    }
  });
  var heroArt = document.querySelector(".hero-art img");
  var hero = document.querySelector(".hero");
  if (heroArt && hero && !still) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, hero.offsetHeight);
        heroArt.style.setProperty("--parallax", (y * 0.25).toFixed(1) + "px");
        ticking = false;
      });
    }, { passive: true });
    var glow = hero.querySelector(".hero-glow");
    if (glow && window.matchMedia("(pointer: fine)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        glow.style.setProperty("--gx", (e.clientX - r.left) + "px");
        glow.style.setProperty("--gy", (e.clientY - r.top) + "px");
      });
    }
  }
  var risers = document.querySelectorAll(".rise");
  if ("IntersectionObserver" in window && !still) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    risers.forEach(function (el) { io.observe(el); });
  } else {
    risers.forEach(function (el) { el.classList.add("in"); });
  }
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var current = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (current) current.classList.remove("active");
          current = byId[entry.target.id];
          if (current) current.classList.add("active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) {
      var h = document.getElementById(id);
      if (h) spy.observe(h);
    });
  }
  var tocDetails = document.querySelector(".toc details");
  if (tocDetails && window.matchMedia("(min-width: 1081px)").matches) tocDetails.open = true;

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
