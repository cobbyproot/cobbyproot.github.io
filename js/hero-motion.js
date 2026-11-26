/* =============================================================================
   HERO MOTION — the pointer half of the hero's idle float

   The idle bobs are CSS keyframes; this file only adds the depth response to
   the cursor. It writes two unitless variables on <html> (--mx / --my), and
   css/style.css turns them into a small translate on each hero layer. Nearer
   layers carry a larger --par-x / --par-y, so the word, the character, the
   instruments and the social orbit all move at different depths.

   The html.hero-pointer class is the on/off switch for those transforms: it is
   only present while the cursor layer is actually running, so touch devices,
   reduced-motion visitors and lite/balanced tiers never keep composited layers
   alive for it.

   Only a fine pointer above the balanced tier gets this. The layer pauses when
   the hero leaves the viewport, when the tab is hidden, and when the perf
   governor drops the tier mid-visit.
   ========================================================================== */
(() => {
    'use strict';

    const root = document.documentElement;
    const hero = document.querySelector('.persistent-hero');
    if (!hero) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const perf = window.CobbyPerf;
    const level = perf && typeof perf.level === 'number' ? perf.level : 2;

    if (!finePointer || reducedMotion || level < 2) return;

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let running = false;
    let visible = true;

    const clamp = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

    function write() {
        root.style.setProperty('--mx', x.toFixed(4));
        root.style.setProperty('--my', y.toFixed(4));
    }

    function frame() {
        if (!running) return;

        x += (targetX - x) * 0.075;
        y += (targetY - y) * 0.075;

        if (Math.abs(x - targetX) < 0.0005) x = targetX;
        if (Math.abs(y - targetY) < 0.0005) y = targetY;
        if (Math.abs(x) < 0.0005) x = 0;
        if (Math.abs(y) < 0.0005) y = 0;

        write();

        /* Settled at rest. The idle float is CSS, so there is nothing left for
           this loop to do until the pointer moves again. */
        if (x === 0 && y === 0 && targetX === 0 && targetY === 0) {
            running = false;
            raf = 0;
            root.classList.remove('hero-pointer');
            return;
        }

        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (running || document.hidden || !visible) return;
        root.classList.add('hero-pointer');
        running = true;
        raf = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        targetX = 0;
        targetY = 0;
        x = 0;
        y = 0;
        write();
        root.classList.remove('hero-pointer');
    }

    function onMove(e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        targetX = clamp((e.clientX / window.innerWidth) * 2 - 1);
        targetY = clamp((e.clientY / window.innerHeight) * 2 - 1);
        start();
    }

    function onLeave(e) {
        if (e && e.relatedTarget) return;
        targetX = 0;
        targetY = 0;
        start();
    }

    function bind() {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', onLeave, { passive: true });
        window.addEventListener('blur', onLeave);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                if (!visible) stop();
            }, { threshold: 0 }).observe(hero);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
        });

        if (perf && typeof perf.onChange === 'function') {
            perf.onChange((tier, nextLevel) => {
                if (nextLevel < 2) stop();
            });
        }

        window.addEventListener('pagehide', stop);
    }

    /* Bind after the projector has finished assembling the hero, so the pointer
       never tugs at an entrance that is still moving the same elements. */
    if (document.body.classList.contains('booting')) {
        document.addEventListener('boot:lifted', bind, { once: true });
    } else {
        bind();
    }
})();
