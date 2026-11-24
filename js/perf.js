/* =============================================================================
   COBBY — performance governor
   -----------------------------------------------------------------------------
   The card is a holographic set piece: two 3D characters, a projector backdrop,
   a spinning vinyl, an emitter pool. That is the point of it, and on a good
   machine it is cheap. On an old phone it is not — three .glb files weigh
   16 MB and parsing them blocks the main thread for over a second.

   So the page measures the device it landed on and picks one of four tiers.
   Nothing about the design is removed at any tier; how *much* of it runs is.

   Tier          What it is                                       3D models
   ------------  ------------------------------------------------  -------------
   ultra         A desktop with headroom. Everything, unthrottled.  eager
   full          The design as drawn. Default for capable gear.    eager
   balanced      Mid-range phone / older laptop. Motion trimmed,   on demand
                 halo effects composited less, polling slowed.
   lite          Old phone, slow link, or save-data. Static      on tap only
                 surfaces, no infinite animation, no backdrop work.

   Detection happens twice on purpose:

   1. A tiny inline script in <head> (index.html) runs before the first paint,
      so the stylesheet never paints the expensive variant and then has to
      undo it. That script decides the *starting* tier.
   2. This file, loaded with `defer`, confirms that decision, adds the
      persisted memory of previous sessions, and then watches real frame
      timing. It only ever moves *down*, and only on evidence, so a single
      heavy moment (a background tab, an extension) cannot wreck the visit.

   Everything else on the page asks this module rather than measuring again:

       CobbyPerf.level                0 | 1 | 2 | 3
       CobbyPerf.tier                 'lite' | 'balanced' | 'full' | 'ultra'
       CobbyPerf.allows3D             bool — may a .glb load at all?
       CobbyPerf.pollMs(10000)        poll interval, stretched on weak gear
       CobbyPerf.onChange(fn)         fires if the tier drops mid-visit
       CobbyPerf.onIdle(fn)           run non-critical work when the page is quiet
       CobbyPerf.setTier(name, {persist}) manual override from the chip

   Manual control, for the owner or a visitor stuck on a bad guess:

       ?perf=lite|balanced|full|ultra|auto     (auto clears the override)
   ========================================================================== */
(function () {
    'use strict';

    var STORE_KEY = 'cobby.perf.v1';
    var STORE_TTL = 7 * 24 * 60 * 60 * 1000;   // a week; a bad day is not a verdict

    var TIERS = ['lite', 'balanced', 'full', 'ultra'];
    var LEVEL = { lite: 0, balanced: 1, full: 2, ultra: 3 };

    // Coarse buckets CSS keys off, so a rule shared by two tiers is written once.
    function bucket(level) {
        return level <= 0 ? 'low' : level === 1 ? 'mid' : 'high';
    }

    var root = document.documentElement;
    var listeners = [];
    var state = {
        tier: 'full',
        level: LEVEL.full,
        reasons: [],
        source: 'default',
        locked: false,      // a query-param or stored override owns the tier
        reduced: false,
        saveData: false,
    };

    /* -------------------------------------------------------------------------
       Storage — a small, failure-tolerant wrapper. Private mode and a full disk
       both throw, and neither is worth breaking the page over.
       ---------------------------------------------------------------------- */
    function readStore() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || typeof data !== 'object') return null;
            if (data.ts && Date.now() - data.ts > STORE_TTL) return null;
            if (data.tier && !(data.tier in LEVEL)) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

    function writeStore(tier, source) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                tier: tier, source: source, ts: Date.now(),
            }));
        } catch (err) { /* private mode, quota, nothing to do */ }
    }

    function clearStore() {
        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    }

    /* -------------------------------------------------------------------------
       Device read. Every signal is optional: an older browser that reports
       nothing is treated as *capable*, because guessing "slow" for a desktop
       that simply doesn't expose deviceMemory would be wrong far more often.
       ---------------------------------------------------------------------- */
    var SIGNALS = (function () {
        var nav = navigator;
        var conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
        var reduced = false;
        try {
            reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (err) { /* no matchMedia */ }

        // Touch and pointer capability. These are the most reliable signals
        // available: hardwareConcurrency and deviceMemory describe the machine,
        // but this describes how the page is being *used*, which is what
        // decides whether a 16 MB WebGL model and a hijacked scroll wheel are
        // worth their cost.
        var coarse = false, hoverNone = false, maxTouch = 0;
        try {
            coarse = window.matchMedia('(pointer: coarse)').matches;
            hoverNone = window.matchMedia('(hover: none)').matches;
        } catch (err) { /* no matchMedia */ }
        maxTouch = nav.maxTouchPoints || 0;

        // Client hints, where they exist, say "this is a phone" outright and
        // without any UA string guessing.
        var uaMobile = null;
        try {
            uaMobile = nav.userAgentData ? nav.userAgentData.mobile : null;
        } catch (err) { /* not supported */ }

        return {
            cores: nav.hardwareConcurrency || 0,
            memory: nav.deviceMemory || 0,
            connection: conn,
            saveData: !!(conn && conn.saveData),
            effectiveType: (conn && conn.effectiveType) || '',
            reduced: reduced,
            dpr: window.devicePixelRatio || 1,
            viewport: Math.max(window.innerWidth || 0, 1),
            coarse: coarse,
            hoverNone: hoverNone,
            maxTouch: maxTouch,
            uaMobile: uaMobile,
        };
    })();

    function detect() {
        var reasons = [];
        // Start optimistic; each signal below can only pull the tier down.
        var level = LEVEL.ultra;

        if (SIGNALS.cores) {
            if (SIGNALS.cores <= 2) { level = Math.min(level, 0); reasons.push('2 cpu cores'); }
            else if (SIGNALS.cores <= 4) { level = Math.min(level, 1); reasons.push(SIGNALS.cores + ' cpu cores'); }
        }

        if (SIGNALS.memory) {
            if (SIGNALS.memory <= 2) { level = Math.min(level, 0); reasons.push(SIGNALS.memory + 'gb memory'); }
            else if (SIGNALS.memory <= 4) { level = Math.min(level, 1); reasons.push(SIGNALS.memory + 'gb memory'); }
        }

        if (SIGNALS.saveData) { level = Math.min(level, 0); reasons.push('data saver on'); }
        if (SIGNALS.effectiveType) {
            if (/^(slow-)?2g$/.test(SIGNALS.effectiveType)) {
                level = Math.min(level, 0);
                reasons.push(SIGNALS.effectiveType + ' connection');
            } else if (SIGNALS.effectiveType === '3g') {
                level = Math.min(level, 1);
                reasons.push('3g connection');
            }
        }

        // A small screen with a huge pixel ratio is the signature of a cheap
        // phone: the GPU is asked to shade many more pixels than it can afford.
        if (SIGNALS.dpr >= 3 && SIGNALS.viewport <= 480 && level > 0) {
            level = Math.min(level, 1);
            reasons.push('dpr ' + SIGNALS.dpr + ' on a small screen');
        }

        // A touch-first device never gets `ultra`.
        //
        // This is the correction to the most important blind spot the first
        // version had. `hardwareConcurrency` and `deviceMemory` describe the
        // machine and are widely reported, but they are also reported by a
        // desktop browser narrowed to a phone width, and a high-end laptop
        // reports 20 cores and 32 GB whether or not it has a battery. The
        // signals that actually distinguish a phone are these: a coarse pointer,
        // no hover, a touch screen, or client hints saying mobile.
        //
        // The cost of being wrong is asymmetric. Guessing "capable" for a phone
        // hands it a 16 MB download and a hijacked scroll; guessing "balanced"
        // for a touch laptop costs it some decorative animation, which nobody
        // misses. So a touch device tops out at `balanced`.
        var touchFirst = SIGNALS.coarse || SIGNALS.hoverNone
            || SIGNALS.maxTouch > 0 || SIGNALS.uaMobile === true;
        if (touchFirst && level > 1) {
            level = 1;
            reasons.push(SIGNALS.uaMobile === true ? 'mobile client hint'
                : SIGNALS.coarse ? 'coarse pointer'
                    : SIGNALS.hoverNone ? 'no hover' : 'touch screen');
        }

        return { level: level, reasons: reasons };
    }

    /* -------------------------------------------------------------------------
       Apply — the single place that writes the tier to the document.
       ---------------------------------------------------------------------- */
    function apply(tier, meta) {
        state.tier = tier;
        state.level = LEVEL[tier];
        state.source = (meta && meta.source) || 'auto';
        state.reasons = (meta && meta.reasons) || [];

        root.setAttribute('data-perf', tier);
        root.setAttribute('data-perf-lvl', String(state.level));
        if (SIGNALS.reduced) root.setAttribute('data-perf-rm', '1');
        else root.removeAttribute('data-perf-rm');

        var classes = root.classList;
        classes.toggle('perf-low', state.level === 0);
        classes.toggle('perf-mid', state.level === 1);
        classes.toggle('perf-high', state.level >= 2);
        classes.toggle('perf-lowish', state.level <= 1);   // low + mid together

        return state.level;
    }

    /* -------------------------------------------------------------------------
       Query parameter and stored override. ?perf= wins over everything.
       ---------------------------------------------------------------------- */
    function resolveStart() {
        var forced = null;
        try {
            forced = new URLSearchParams(window.location.search).get('perf');
        } catch (err) { /* very old browser, no URLSearchParams */ }

        if (forced) {
            forced = forced.toLowerCase();
            if (forced === 'auto' || forced === 'reset') {
                clearStore();
                return null;
            }
            if (forced in LEVEL) {
                writeStore(forced, 'query');
                return { tier: forced, source: 'query', reasons: ['?perf=' + forced] };
            }
        }

        var stored = readStore();
        if (stored && stored.tier) {
            return { tier: stored.tier, source: stored.source || 'stored', reasons: ['remembered from an earlier visit'] };
        }
        return null;
    }

    /* -------------------------------------------------------------------------
       Boot: the inline <head> script already wrote a starting tier. Trust it
       unless there is a real override, and never move the tier *up* here —
       upgrading after paint is a visible flash.
       ---------------------------------------------------------------------- */
    function boot() {
        var current = root.getAttribute('data-perf');
        var detected = detect();

        state.reduced = SIGNALS.reduced;
        state.saveData = SIGNALS.saveData;

        var start = resolveStart();
        if (start) {
            state.locked = true;
            var lvl = apply(start.tier, start);
            // A stored *downgrade* can still be beaten by the device read when
            // the device is clearly weaker than what was remembered.
            if (lvl > detected.level && start.source !== 'query') {
                apply(TIERS[detected.level], { source: 'auto', reasons: detected.reasons });
                state.locked = false;
            }
            return;
        }

        if (current && current in LEVEL) {
            // The inline script's verdict stands: it ran before paint and used
            // the same signals.
            state.tier = current;
            state.level = LEVEL[current];
            state.source = 'detected';
            state.reasons = detected.reasons;
            apply(current, { source: 'detected', reasons: detected.reasons });
            return;
        }

        apply(TIERS[detected.level], { source: 'detected', reasons: detected.reasons });
    }

    /* -------------------------------------------------------------------------
       Adaptive monitoring — real frame timing beats every heuristic, but only
       when it is evidence rather than noise. Three consecutive bad windows
       (each ≥ 700ms of real frames) walk the tier down one step, at most twice
       per visit. Good windows never promote, so nothing oscillates.
       ---------------------------------------------------------------------- */
    function monitor() {
        if (state.locked) return;
        if (state.level === 0) return;              // nothing left to shed
        if (SIGNALS.reduced) return;                // motion is already off
        if (typeof requestAnimationFrame !== 'function') return;

        var WINDOW = 700;          // ms of sampling per verdict
        var BAD_FPS = 26;          // below this a visitor can feel it
        var STRIKES = 3;           // consecutive bad windows before acting
        var MAX_DROPS = 2;

        var drops = 0;
        var strikes = 0;
        var windowStart = 0;
        var frames = 0;
        var running = true;

        function tick(now) {
            if (!running) return;
            if (document.hidden) {
                // A hidden tab is throttled to ~1fps by the browser. That is not
                // the device struggling, and it must not count as a strike.
                windowStart = 0;
                frames = 0;
                return requestAnimationFrame(tick);
            }

            if (!windowStart) windowStart = now;
            frames++;

            var elapsed = now - windowStart;
            if (elapsed >= WINDOW) {
                var fps = frames / (elapsed / 1000);
                frames = 0;
                windowStart = now;

                if (fps < BAD_FPS) {
                    strikes++;
                    if (strikes >= STRIKES) {
                        strikes = 0;
                        drops++;
                        var next = TIERS[Math.max(0, state.level - 1)];
                        apply(next, {
                            source: 'measured',
                            reasons: ['sustained ' + Math.round(fps) + 'fps'],
                        });
                        writeStore(next, 'measured');
                        notify();
                        if (drops >= MAX_DROPS || state.level === 0) {
                            running = false;
                            return;
                        }
                    }
                } else {
                    strikes = 0;
                }

                // Sampling is itself a frame callback, so stop it once the page
                // has had long enough to show what it is made of.
                if (now - startedAt > 20000) { running = false; return; }
            }

            requestAnimationFrame(tick);
        }

        var startedAt = performance.now();
        requestAnimationFrame(tick);

        // A tab that comes back after a long sleep deserves a fresh look.
        document.addEventListener('visibilitychange', function () {
            if (document.hidden || running) return;
            if (drops >= MAX_DROPS || state.level === 0) return;
            startedAt = performance.now();
            windowStart = 0;
            frames = 0;
            strikes = 0;
            running = true;
            requestAnimationFrame(tick);
        });
    }

    function notify() {
        listeners.forEach(function (fn) {
            try { fn(state.tier, state.level, state); } catch (err) { /* isolated */ }
        });
    }

    /* -------------------------------------------------------------------------
       Public API
       ---------------------------------------------------------------------- */
    var api = {
        get tier() { return state.tier; },
        get level() { return state.level; },
        get reasons() { return state.reasons.slice(); },
        get source() { return state.source; },
        get reducedMotion() { return state.reduced; },
        get saveData() { return state.saveData; },

        /** True when a .glb is cheap enough to fetch without being asked. */
        permits3D: function () { return state.level >= 2; },
        /** True when decorative infinite animation should be suppressed. */
        trimsMotion: function () { return state.level <= 1 || state.reduced; },

        /** Stretch a poll interval on weak gear, and always when hidden. */
        pollMs: function (base) {
            if (document.hidden) return base * 4;
            if (state.level <= 0) return base * 4;
            if (state.level === 1) return base * 2;
            return base;
        },

        /** Lower the tier by hand, e.g. when a feature proves too expensive. */
        degrade: function (reason) {
            if (state.locked || state.level === 0) return null;
            var next = TIERS[state.level - 1];
            apply(next, { source: 'manual', reasons: [reason || 'degraded by the page'] });
            notify();
            return next;
        },

        /** Absolute tier change. Used by the chip and by ?perf=. */
        setTier: function (tier, opts) {
            if (!(tier in LEVEL)) return state.tier;
            var persist = !opts || opts.persist !== false;
            apply(tier, { source: 'manual', reasons: ['chosen by hand'] });
            state.locked = persist;
            if (persist) writeStore(tier, 'manual');
            else clearStore();
            notify();
            return tier;
        },

        onChange: function (fn) {
            if (typeof fn === 'function') listeners.push(fn);
            return function () {
                var i = listeners.indexOf(fn);
                if (i >= 0) listeners.splice(i, 1);
            };
        },

        /** Defer anything that can wait until the page is quiet. */
        onIdle: function (fn, timeout) {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(function () {
                    try { fn(); } catch (err) { /* isolated */ }
                }, { timeout: timeout || 2500 });
            } else {
                setTimeout(function () {
                    try { fn(); } catch (err) { /* isolated */ }
                }, 220);
            }
        },
    };

    boot();
    window.CobbyPerf = api;

    // Monitoring waits for the entrance to finish: measuring frames during the
    // hero timeline would just measure the timeline.
    if (document.readyState === 'complete') {
        setTimeout(monitor, 2500);
    } else {
        window.addEventListener('load', function () { setTimeout(monitor, 2500); }, { once: true });
    }

    // One line, only for someone looking for it, so a bad guess is diagnosable.
    if (/[?&]perfdebug/.test(window.location.search)) {
        console.log('[CobbyPerf] ' + state.tier + ' (level ' + state.level + ')'
            + ' — source: ' + state.source
            + (state.reasons.length ? ' — ' + state.reasons.join(', ') : ''));
    }
})();
