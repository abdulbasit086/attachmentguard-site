/* Attachment Guard — site behaviour. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  /* ---------- Theme ---------- */
  var toggle = document.querySelector('.theme-toggle');

  function savedTheme() {
    try { return localStorage.getItem('ag-theme'); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0f0e0c' : '#f4f2ec');
    if (toggle) toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('ag-theme', next); } catch (e) {}

      if (!document.startViewTransition || reduced.matches) { applyTheme(next); return; }

      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var transition = document.startViewTransition(function () { applyTheme(next); });
      // If the browser can't run the reveal promptly, switch without it.
      setTimeout(function () {
        if (root.getAttribute('data-theme') !== next) {
          try { transition.skipTransition(); } catch (e) {}
          applyTheme(next);
        }
      }, 400);
      transition.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
    });
  }

  // Media-query listeners, including Safari before 14.
  function onMQ(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  // Follow the system setting until the visitor picks a theme themselves.
  onMQ(prefersDark, function (e) {
    if (!savedTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* ---------- Header ---------- */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  var mobileNav = document.getElementById('mobile-nav');

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    onMQ(window.matchMedia('(min-width: 901px)'), function (e) {
      if (e.matches) setMenu(false);
    });
  }

  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Current section in the nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if (hasIO && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (hasIO && !reduced.matches) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Hero: the invoice queue plays out ---------- */
  var consoleEl = document.querySelector('.console');
  if (consoleEl) heroDemo(consoleEl);

  function heroDemo(el) {
    var card = el.querySelector('[data-card]');
    var steps = Array.prototype.slice.call(card.querySelectorAll('.send-steps li'));
    var sentList = el.querySelector('[data-sent]');
    function f(name) { return el.querySelector('[data-f="' + name + '"]'); }
    var status = f('status');

    var customers = [
      { cust: 'Northside Freight Ltd', amt: '$2,860.00', doc: 'Proof of delivery', file: 'POD', size: '214 KB', need: 'proof of delivery' },
      { cust: 'Hartley Builders', amt: '$1,240.00', doc: 'Signed job sheet', file: 'JobSheet', size: '388 KB', need: 'signed job sheet' },
      { cust: 'Peak Civil Ltd', amt: '$4,615.50', doc: 'Approved timesheet', file: 'Timesheet', size: '96 KB', need: 'approved timesheet' }
    ];
    var number = 418;
    var turn = 0;
    var sentToday = 3;

    function pad(n) { return String(n).padStart(4, '0'); }
    function text(name, value) { f(name).textContent = value; }
    function setStatus(label, busy) {
      text('status-text', label);
      status.classList.toggle('is-checking', !!busy);
    }

    function fill(c, n) {
      var id = 'INV-' + pad(n);
      text('no', id);
      text('cust', c.cust);
      text('amt', c.amt);
      text('doc', c.doc);
      text('file', c.file + '-' + pad(n) + '.pdf');
      text('size', c.size);
      text('toast-title', id + ' is on hold');
      text('toast-body', 'Waiting for ' + c.need);
    }

    function addSent(c, n) {
      var li = document.createElement('li');
      li.className = 'enter';
      li.innerHTML = '<svg class="s-ok"><use href="#i-check-circle"/></svg><span class="s-no"></span><span class="s-cust"></span><span class="s-files">2 files</span><span class="s-amt"></span>';
      li.querySelector('.s-no').textContent = 'INV-' + pad(n);
      li.querySelector('.s-cust').textContent = c.cust;
      li.querySelector('.s-amt').textContent = c.amt;
      sentList.insertBefore(li, sentList.firstChild);
      while (sentList.children.length > 3) sentList.removeChild(sentList.lastElementChild);
      sentToday += 1;
      text('count', String(sentToday));
    }

    if (reduced.matches) {
      // One calm, finished frame instead of a loop.
      fill(customers[0], number);
      card.classList.add('is-held', 'has-file', 'is-cleared');
      steps.forEach(function (s) { s.classList.add('done'); });
      text('dz-state', 'Attached');
      setStatus('Sent');
      return;
    }

    // Pause while the hero is off screen or the tab is hidden.
    var visible = true;
    var wake = null;
    function gate() {
      if (visible && !document.hidden) return null;
      return new Promise(function (resolve) { wake = resolve; });
    }
    function resume() {
      if (wake && visible && !document.hidden) { var w = wake; wake = null; w(); }
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        resume();
      }, { threshold: 0.1 }).observe(el);
    }
    document.addEventListener('visibilitychange', resume);
    function sleep(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); }).then(gate);
    }

    function scene(first) {
      var c = customers[turn % customers.length];
      if (!first) {
        fill(c, number);
        card.className = 'inv-card is-entering';
        steps.forEach(function (s) { s.classList.remove('done'); });
        setStatus('Checking paperwork', true);
        text('dz-state', 'Required for this customer');
        void card.offsetWidth; // commit the reset before animating back in
        card.classList.remove('is-entering');
      }
      return sleep(first ? 1700 : 1400)
        .then(function () {
          card.classList.add('is-held');
          setStatus('On hold');
          text('dz-state', 'Missing. Invoice is on hold.');
          el.classList.add('show-toast');
          return sleep(2400);
        })
        .then(function () {
          el.classList.remove('show-toast');
          return sleep(450);
        })
        .then(function () {
          card.classList.add('has-file');
          setStatus('File attached');
          text('dz-state', 'Attached just now');
          return sleep(1050);
        })
        .then(function () {
          card.classList.add('is-cleared');
          setStatus('Ready to send');
          return sleep(950);
        })
        .then(function () {
          setStatus('Sending', true);
          return steps.reduce(function (p, s) {
            return p.then(function () { return sleep(480); }).then(function () { s.classList.add('done'); });
          }, Promise.resolve());
        })
        .then(function () {
          setStatus('Sent');
          return sleep(1500);
        })
        .then(function () {
          addSent(c, number);
          card.classList.add('is-leaving');
          return sleep(550);
        })
        .then(function () {
          number += 1;
          turn += 1;
        });
    }

    function loop(first) { scene(first).then(function () { loop(false); }).catch(function () {}); }
    loop(true);
  }

  /* ---------- FAQ: smooth open and close ---------- */
  document.querySelectorAll('details.qa').forEach(function (d) {
    var summary = d.querySelector('summary');
    var body = d.querySelector('.answer');
    summary.addEventListener('click', function (e) {
      if (reduced.matches || !body.animate) return;
      e.preventDefault();
      if (d.dataset.busy) return;
      d.dataset.busy = '1';
      if (d.open) {
        d.classList.add('closing');
        settle(body.animate(
          [{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 320, easing: 'cubic-bezier(.4, 0, .2, 1)' }
        ), 320, function () { d.open = false; d.classList.remove('closing'); delete d.dataset.busy; });
      } else {
        d.open = true;
        settle(body.animate(
          [{ height: '0px', opacity: 0 }, { height: body.offsetHeight + 'px', opacity: 1 }],
          { duration: 460, easing: 'cubic-bezier(.16, 1, .3, 1)' }
        ), 460, function () { delete d.dataset.busy; });
      }
    });
  });

  // Run `done` once when the animation ends, with a timer as a backstop
  // so a throttled or interrupted animation can't leave the FAQ stuck.
  function settle(anim, ms, done) {
    var finished = false;
    function run() {
      if (finished) return;
      finished = true;
      done();
      try { anim.cancel(); } catch (e) {}
    }
    anim.onfinish = run;
    setTimeout(run, ms + 80);
  }

  // Tell the head script everything loaded, so it doesn't unhide content.
  root.classList.add('js-ready');
})();
