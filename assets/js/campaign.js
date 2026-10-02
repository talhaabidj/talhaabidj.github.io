(function () {
  'use strict';
  var hero = document.querySelector('.landing-hero');
  if (!hero) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(pointer: fine)');
  var paused = reduced.matches;
  var toggle = document.querySelector('.motion-toggle');
  var art = hero.querySelector('.campaign-art');
  var motes = hero.querySelector('.campaign-motes');
  var header = document.querySelector('.site-header');
  var pointerX = 0, pointerY = 0, raf = 0;
  var heroVisible = true;

  for (var i = 0; i < 16; i++) {
    var mote = document.createElement('i');
    mote.style.setProperty('--x', (12 + Math.random() * 85) + '%');
    mote.style.setProperty('--size', (2 + Math.random() * 3) + 'px');
    mote.style.setProperty('--duration', (10 + Math.random() * 15) + 's');
    mote.style.setProperty('--delay', (-Math.random() * 25) + 's');
    motes.appendChild(mote);
  }
  function paint() {
    raf = 0;
    header.classList.toggle('scrolled', window.scrollY > 80);
    if (paused || !fine.matches || !heroVisible) return;
    art.style.setProperty('--scene-x', pointerX.toFixed(2) + 'px');
    art.style.setProperty('--scene-y', (pointerY + Math.min(window.scrollY * .1, 65)).toFixed(2) + 'px');
  }
  function schedule() { if (!raf) raf = window.requestAnimationFrame(paint); }
  function setMotion() {
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Enable motion' : 'Pause motion';
    if (paused) {
      art.style.removeProperty('--scene-x');
      art.style.removeProperty('--scene-y');
    }
    schedule();
  }
  toggle.hidden = false;
  toggle.addEventListener('click', function () { paused = !paused; setMotion(); });
  reduced.addEventListener('change', function () { paused = reduced.matches; setMotion(); });
  hero.addEventListener('pointermove', function (e) {
    if (paused || !fine.matches) return;
    var rect = hero.getBoundingClientRect();
    pointerX = (e.clientX / rect.width - .5) * -12;
    pointerY = ((e.clientY - rect.top) / rect.height - .5) * -8;
    schedule();
  });
  hero.addEventListener('pointerleave', function () { pointerX = 0; pointerY = 0; schedule(); });
  window.addEventListener('scroll', schedule, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      motes.style.visibility = heroVisible ? '' : 'hidden';
      motes.querySelectorAll('i').forEach(function (mote) { mote.style.animationPlayState = heroVisible ? '' : 'paused'; });
      schedule();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    motes.querySelectorAll('i').forEach(function (mote) { mote.style.animationPlayState = document.hidden || !heroVisible ? 'paused' : ''; });
  });
  setMotion();

  var gallery = document.querySelector('.game-gallery');
  var slides = Array.from(gallery.querySelectorAll('.game-slide'));
  var previous = document.querySelector('.gallery-prev');
  var next = document.querySelector('.gallery-next');
  var count = document.querySelector('.gallery-count');
  var index = 0;
  var scrollFrame = 0;
  function updateGallery() {
    scrollFrame = 0;
    index = Math.max(0, Math.min(slides.length - 1, Math.round(gallery.scrollLeft / gallery.clientWidth)));
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  }
  function goTo(target) {
    target = Math.max(0, Math.min(slides.length - 1, target));
    gallery.scrollTo({ left: target * gallery.clientWidth, behavior: paused ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', function () { goTo(index - 1); });
  next.addEventListener('click', function () { goTo(index + 1); });
  gallery.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : e.key === 'End' ? slides.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  gallery.addEventListener('scroll', function () { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateGallery); }, { passive: true });
  var galleryWidth = gallery.clientWidth;
  function resizeGallery() {
    var width = gallery.clientWidth;
    if (width === galleryWidth) return;
    galleryWidth = width;
    gallery.scrollTo({ left: index * width, behavior: 'instant' });
    updateGallery();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resizeGallery).observe(gallery);
  else window.addEventListener('resize', resizeGallery);
  updateGallery();
})();
