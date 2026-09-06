/* ==========================================================================
   交互脚本：毛玻璃导航 / 汉堡菜单 / 滚动淡入 / 导航高亮
   ========================================================================== */

(function () {
  'use strict';

  // ---------- 导航栏：滚动后变为半透明毛玻璃 ----------
  const navbar = document.getElementById('navbar');
  const scrollState = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', scrollState, { passive: true });
  scrollState();

  // ---------- 汉堡菜单（移动端） ----------
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  function closeMenu() {
    navToggle.classList.remove('open');
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const opened = navMenu.classList.toggle('open');
    navToggle.classList.toggle('open', opened);
    navToggle.setAttribute('aria-expanded', String(opened));
  });

  // 点击菜单项后自动收起（移动端）
  navMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  // ---------- 滚动进入动画：淡入 + 上滑 ----------
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target); // 只播放一次
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    // 兜底：不支持 IntersectionObserver 时直接显示
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // ---------- 导航链接随滚动高亮当前区域 ----------
  const sections = Array.from(document.querySelectorAll('section[id], header[id]'));
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));

  function highlightNav() {
    const pos = window.scrollY + window.innerHeight * 0.35;
    let currentId = sections[0] ? sections[0].id : null;

    sections.forEach((sec) => {
      if (sec.offsetTop <= pos) currentId = sec.id;
    });

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // ---------- 点击锚点：平滑滚动到对应区域 ----------
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { history.replaceState(null, '', link.getAttribute('href')); } catch (_) { /* file:// 下忽略 */ }
    });
  });

  // ---------- Hero 打字机效果：轮流显示三个身份 ----------
  const typeEl = document.getElementById('typeText');
  const roles = ['3D设计师', '创意开发者', '浪漫主义者'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeEl) {
    if (reduceMotion) {
      typeEl.textContent = roles[0];
    } else {
      let ri = 0, ci = 0, deleting = false;
      (function type() {
        const word = roles[ri];
        typeEl.textContent = word.slice(0, ci);
        let delay;
        if (!deleting) {
          if (ci < word.length) { ci++; delay = 150; }
          else { deleting = true; delay = 1700; }   // 打完后停顿
        } else {
          if (ci > 0) { ci--; delay = 70; }
          else { deleting = false; ri = (ri + 1) % roles.length; delay = 420; }
        }
        setTimeout(type, delay);
      })();
    }
  }

  // ---------- 全局星空粒子背景（细微闪烁 + 缓慢漂移） ----------
  const canvas = document.getElementById('starfield');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];

    function buildStars() {
      // 粒子数量随屏幕面积缩放，上限 150，保证性能
      const count = Math.min(150, Math.floor((w * h) / 11000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -(Math.random() * 0.16 + 0.04),        // 缓慢上飘
        tw: Math.random() * Math.PI * 2,           // 闪烁相位
        ts: Math.random() * 0.02 + 0.006,
        tint: Math.random() > 0.82,                // 少量粉紫色星星
      }));
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      buildStars();
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.tw += s.ts;
        if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
        if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
        const a = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.tint
          ? 'rgba(233,110,190,' + a.toFixed(3) + ')'
          : 'rgba(255,255,255,' + a.toFixed(3) + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    tick();
  }
})();
