/* Nattvilan – main.js */
(function () {
  'use strict';

  // ── Scroll-aware header ──────────────────────────────────────────────────
  var header = document.getElementById('site-header');
  if (header) {
    function onScroll() {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile nav toggle ────────────────────────────────────────────────────
  var toggle = document.getElementById('nav-toggle');
  var drawer = document.getElementById('nav-drawer');

  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      drawer.classList.toggle('open', !expanded);
      document.body.style.overflow = expanded ? '' : 'hidden';
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (
        drawer.classList.contains('open') &&
        !drawer.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        toggle.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        toggle.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
        toggle.focus();
      }
    });
  }

  // ── Wrap tables for horizontal scroll on mobile ──────────────────────────
  document.querySelectorAll('.content-wrap table').forEach(function (table) {
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // ── Hero slideshow ───────────────────────────────────────────────────────
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    var current = 0;
    var INTERVAL = 6000;
    var timer;

    function showSlide(index) {
      slides[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
    }

    function advance() {
      showSlide(current + 1);
    }

    function startTimer() {
      timer = setInterval(advance, INTERVAL);
    }

    function stopTimer() {
      clearInterval(timer);
    }

    // Pause on hover/focus for accessibility
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('mouseenter', stopTimer);
      hero.addEventListener('mouseleave', startTimer);
      hero.addEventListener('focusin', stopTimer);
      hero.addEventListener('focusout', startTimer);
    }

    // Respect prefers-reduced-motion
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      startTimer();
    }
  }
})();
