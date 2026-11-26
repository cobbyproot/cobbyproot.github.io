/* =============================================================================
   THE POD — hidden YouTube transport (js/music.js)

   The music lives entirely in the hero's right-hand HUD instrument. There is
   no music tab, no Spotify and no video: the pod plays the owner's *after
   dark* mix playlist (sole space., YouTube PLJESZmrEx7TM) from a player that
   is never shown. No embed chrome, no thumbnails — just the mix, quietly.

   The window above the readout is a night-signal visualiser. YouTube hands the
   page no audio stream to analyse, so the drawing is generated rather than
   measured: a trace and a signal fan seeded from the mix's own id and advanced
   by the player's own clock. It freezes when the mix is paused, re-seeds when
   the next mix lands, and is labelled "night signal" — never "spectrum" —
   because nothing in it comes from the audio. What *is* real is everything the
   visitor can check: the titles, the lengths, the mix counter, the position,
   the state of the transport.

   The playlist is a snapshot, not a live feed. There is no API key and no
   build step; to change the list, edit MIXES below by hand. Every entry was
   checked for embedding: one playlist video (xnFhFEq9y8) is owned with
   embedding disabled and is deliberately absent.

   Playback policy, handled rather than fought: a page may not start audible
   sound before the visitor touches it. The pod therefore starts the mix anyway
   — muted, with the visualiser running and the clock counting — and brings the
   sound up, faded in, on the first gesture of any kind. Nothing is asked of the
   visitor and nothing is lost if they never touch the page.

   The deck is a shuffled permutation of the playlist, not a random draw: a mix
   cannot come back until every other mix has played, and the counter on the
   screen is the mix's real index in the playlist, not its place in the deck.
   ========================================================================== */
(() => {
    'use strict';

    /* -----------------------------------------------------------------------
       0. The governor
       --------------------------------------------------------------------- */
    const perf = window.CobbyPerf;
    const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    const level = () => {
        try {
            if (perf && typeof perf.level === 'number') return perf.level;
        } catch (err) { /* a broken governor is not a broken player */ }
        return 2;
    };
    /* Lite, and every visitor who asked for less motion, gets still frames
       instead of a running signal. The drawing is identical; only time stops. */
    const still = () => {
        try { return reducedMQ.matches || level() <= 0; } catch (err) { return true; }
    };
    const stretchPoll = (base) => {
        try {
            if (perf && typeof perf.pollMs === 'function') return perf.pollMs(base);
        } catch (err) { /* fall through */ }
        return base;
    };
    const whenIdle = (fn, delay = 400) => {
        try {
            if (perf && typeof perf.onIdle === 'function') return perf.onIdle(fn);
        } catch (err) { /* fall through */ }
        return setTimeout(fn, delay);
    };

    /* -----------------------------------------------------------------------
       1. DOM — the hero widget only
       --------------------------------------------------------------------- */
    const $ = (id) => document.getElementById(id);

    const pod = $('pod');
    const stage = $('pod-stage');
    const canvas = $('pod-scope');
    const modeEl = $('pod-mode');
    const seqEl = $('pod-seq');
    const titleEl = $('pod-title');
    const artistEl = $('pod-artist');
    const railEl = $('pod-rail');
    const railFill = $('pod-rail-fill');
    const clockEl = $('pod-clock');
    const durEl = $('pod-duration');
    const openEl = $('pod-open');
    const bodyEl = $('pod-body');
    const moreBtn = $('pod-more');
    const glyphEl = $('pod-glyph');
    const pillTitle = $('pod-pill-title');
    const pillState = $('pod-pill-state');
    const wheel = $('pod-wheel');
    const playBtn = $('pod-play');
    const prevBtn = $('pod-prev');
    const nextBtn = $('pod-next');
    const menuBtn = $('pod-menu');
    const muteBtn = $('pod-mute');
    const volumeEl = $('pod-volume');

    if (!pod || !canvas) return;

    /* -----------------------------------------------------------------------
       2. Constants
       --------------------------------------------------------------------- */
    const PLAYLIST = {
        id: 'PLJESZmrEx7TM',
        title: 'after dark',
        channel: 'sole space.',
        playlistUrl: 'https://www.youtube.com/playlist?list=PLJESZmrEx7TM',
        watchUrl: 'https://www.youtube.com/watch?v=',
    };

    /* Snapshotted 2026-11-25, in playlist order. Titles, lengths and ids are
       the playlist's own; nothing here is invented. */
    const MIXES = [
        { id: 'na_2cd4-_lo', title: 'nighttime.', len: '1:00:12' },
        { id: 'ZA0dZQTSK-0', title: 'funky night.', len: '1:00:12' },
        { id: 'S5DV8dlJYHI', title: 'midnight.', len: '1:00:12' },
        { id: 'Oai4Nrz9FE4', title: 'midnight gaze.', len: '1:00:55' },
        { id: 'lr1vdOcNEV4', title: 'blue star.', len: '1:00:12' },
        { id: 'YAYstVex08o', title: 'moonshade.', len: '1:00:12' },
        { id: 'h2cI4CAS5XA', title: 'starry night.', len: '1:00:12' },
        { id: 'VgYca053G78', title: 'late shift.', len: '1:00:13' },
        { id: 'm0EXzfzAz3s', title: 'lost signals.', len: '1:00:12' },
        { id: 'd28t7N0XV1Y', title: 'rainy days.', len: '1:00:12' },
        { id: 'JHzWQIEa3a4', title: 'rainy day.', len: '1:00:12' },
        { id: 'wfrsQrh2dnY', title: 'welcome home.', len: '1:00:12' },
        { id: 'Ba9lPcu-1Tg', title: 'rainy mood.', len: '2:00:06' },
        { id: 'TWEgPtXqfGg', title: 'cloudy day.', len: '1:00:12' },
        { id: 'pOW_u5tfekM', title: 'skyfall.', len: '1:00:12' },
        { id: 'ZSbOUKuTAwM', title: 'lunar track.', len: '2:00:03' },
        { id: 'CNjsEmH73oc', title: 'moon cat.', len: '1:00:12' },
        { id: '-ZXtXfGKntU', title: 'purrverse.', len: '2:00:06' },
        { id: 'bcoUf7YINUI', title: 'space time.', len: '1:00:12' },
        { id: '9LWWdAAEu5M', title: 'homebound.', len: '1:00:12' },
        { id: 'sdjaUUrqWBs', title: 'starry night.', len: '1:00:12' },
        { id: 'P50wTi0Pog0', title: 'Interstellar.', len: '1:00:12' },
        { id: '6O15C3IXNkM', title: 'cloudy night.', len: '1:00:12' },
        { id: 'iuDDgh1yMTw', title: 'cyber cat.', len: '1:00:12' },
        { id: 'fVS48Ueh_f0', title: 'nightcall.', len: '1:00:12' },
        { id: '7CakT-rs5Mg', title: 'overthinker.', len: '1:00:13' },
        { id: 'PcqNyCm5h0Q', title: 'outer space.', len: '2:00:06' },
        { id: 'goOFIrR1j6Y', title: 'spooky files.', len: '2:00:06' },
        { id: 'bR38g6E4xfQ', title: 'ghost club.', len: '2:00:06' },
        { id: 'uEi0EqnZ0Tw', title: 'pumpkin head.', len: '2:00:06' },
        { id: 'NHD0CTqOfZg', title: 'silly scarf.', len: '2:00:06' },
        { id: 'GNRwiNe13hE', title: 'camptime.', len: '2:00:06' },
        { id: 'touqOAt4Ago', title: 'wizardly time.', len: '2:00:06' },
    ];

    /* The mix plays as ambience, not as a broadcast. The slider owns the real
       level; mute silences without moving the slider. */
    const DEFAULT_VOLUME = 0.10;
    const SEEK_PER_PX = 1.9;          /* a drag across the wheel ≈ 3 minutes */
    const TAU = Math.PI * 2;

    /* -----------------------------------------------------------------------
       3. State
       --------------------------------------------------------------------- */
    const state = {
        deck: [],               /* the shuffled permutation, never mutated in place */
        cursor: 0,
        track: null,
        player: null,
        ready: false,
        apiTries: 0,
        apiPending: false,
        lost: false,
        switching: false,
        buffering: false,
        seeking: false,         /* a wheel drag owns the readout until release */
        pending: 0,             /* presses that arrived while a mix was loading */
        playing: false,
        blocked: true,          /* the browser holds the sound until a gesture */
        muted: false,
        volume: DEFAULT_VOLUME,
        applied: -1,            /* the level last written to the player */
        gestured: false,        /* the visitor has touched the page at all */
        time: 0,
        duration: 0,
        dead: new Set(),        /* ids the embedder refused this session */
        switchTimer: 0,
        pollTimer: 0,
    };

    /* -----------------------------------------------------------------------
       4. Small utilities
       --------------------------------------------------------------------- */
    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const mod = (n, m) => ((n % m) + m) % m;

    function hms(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const s = Math.floor(sec % 60);
        const m = Math.floor(sec / 60) % 60;
        const h = Math.floor(sec / 3600);
        const pad = (n) => (n < 10 ? '0' : '') + n;
        return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }

    function secondsOf(len) {
        return String(len || '').split(':').reduce((acc, part) => acc * 60 + (Number(part) || 0), 0);
    }

    /* Fisher-Yates, in place on a copy, so every order is equally likely. */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function setMode(en, vi, icon) {
        if (!modeEl) return;
        const e = modeEl.querySelector('[lang="en"]');
        const v = modeEl.querySelector('[lang="vi"]');
        const i = modeEl.querySelector('i');
        if (e) e.textContent = en;
        if (v) v.textContent = vi;
        if (i && icon) i.className = icon;
    }

    const rgba = (tok, a) => 'rgba(' + tok + ', ' + a.toFixed(3) + ')';

    /* -----------------------------------------------------------------------
       5. The deck

       A shuffled permutation of the playlist. Advancing wraps around the deck,
       so every mix plays before any repeats; the counter on screen is the
       mix's real index in the playlist, not its place in the deck.
       --------------------------------------------------------------------- */
    function buildDeck() {
        state.deck = shuffle(MIXES);
        state.cursor = state.deck.length ? Math.floor(Math.random() * state.deck.length) : 0;
    }

    function firstMix() {
        return state.deck[state.cursor] || MIXES[0];
    }

    function advance(step) {
        if (!state.deck.length) return;
        if (!state.ready) { loadApi(); return; }
        if (state.switching) { state.pending += step > 0 ? 1 : -1; return; }

        const n = state.deck.length;
        let tries = 0;
        let mix = null;
        do {
            state.cursor = mod(state.cursor + step, n);
            mix = state.deck[state.cursor];
            tries++;
        } while (state.dead.has(mix.id) && tries < n);
        playMix(mix);
    }

    /* -----------------------------------------------------------------------
       6. The hidden player

       YouTube is the only source of audio, and the iframe is kept off-screen
       rather than hidden: a `display:none` or `visibility:hidden` frame can be
       paused by some browsers, and this one has to keep playing all visit.
       --------------------------------------------------------------------- */
    function loadApi() {
        if (state.lost || state.apiPending || state.player) return;
        if (window.YT && typeof window.YT.Player === 'function') { createPlayer(); return; }
        if (state.apiTries >= 2) { setLost(); return; }

        state.apiTries++;
        state.apiPending = true;
        window.onYouTubeIframeAPIReady = () => { state.apiPending = false; createPlayer(); };

        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => { state.apiPending = false; loadApi(); };
        document.head.appendChild(s);

        /* The API announces itself by calling the global above. If the script
           loaded but the callback never arrives (an extension swallowed it,
           say), try once more rather than waiting out the visit. */
        setTimeout(() => {
            if (!state.ready && !state.lost) {
                state.apiPending = false;
                loadApi();
            }
        }, 9000);
    }

    function createPlayer() {
        if (state.player || state.lost) return;
        if (!window.YT || typeof window.YT.Player !== 'function') { setLost(); return; }

        const mount = document.createElement('div');
        mount.id = 'pod-yt';
        mount.setAttribute('aria-hidden', 'true');
        mount.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:180px;' +
            'pointer-events:none;z-index:-1;';
        const host = document.createElement('div');
        host.id = 'pod-yt-host';
        mount.appendChild(host);
        document.body.appendChild(mount);

        const mix = state.track || firstMix();
        try {
            state.player = new window.YT.Player(host, {
                width: 320,
                height: 180,
                host: 'https://www.youtube-nocookie.com',
                videoId: mix.id,
                playerVars: {
                    autoplay: 1,
                    /* Not pre-muted: modern browsers allow muted autoplay and
                       many allow audible autoplay on a site the visitor has
                       already engaged with. Ask for sound, and fall back to
                       muted only if the frame reports back silent. */
                    mute: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    playsinline: 1,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    enablejsapi: 1,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerState,
                    onError: onPlayerError,
                },
            });
        } catch (err) {
            setLost();
        }
    }

    function onPlayerReady() {
        state.ready = true;
        state.lost = false;
        const p = state.player;
        try { p.setVolume(Math.round(state.volume * 100)); } catch (err) { /* not ready */ }
        state.applied = Math.round(state.volume * 100);
        try { p.unMute(); } catch (err) { /* stays muted */ }
        state.blocked = false;
        pod.classList.remove('is-blocked');
        paintMode();
        try { p.playVideo(); } catch (err) { /* autoplay already asked */ }
        startPolling();

        /* The probe. Asking for sound is not the same as getting it: Chrome and
           Firefox will refuse audible playback to a page the visitor has not
           touched, and YouTube's own embed quietly falls back to autoplay-
           muted when that happens. So the honest signal is not "is it playing"
           — a muted frame plays happily — but "is it muted".

           Read that at 1.8s, once the frame has had time to settle, and if the
           answer is muted, say so on the capsule and arm the first-gesture
           unmute. If the visitor already touched the page, the unmute asked for
           at ready has already taken effect and this finds `false`.

           `isMuted()` is what gets read, never `state.playing`: a browser that
           refused sound still reports PLAYING while silent, and trusting that
           is exactly how a pod ends up drawing a lively signal in total
           silence. */
        clearTimeout(silentProbe);
        silentProbe = setTimeout(() => {
            if (!state.player || state.lost) return;
            let muted = true;
            try { muted = state.player.isMuted(); } catch (err) { muted = true; }
            if (!muted) {
                state.blocked = false;
                pod.classList.remove('is-blocked');
                paintMode();
                return;
            }
            state.blocked = true;
            pod.classList.add('is-blocked');
            paintMode();
            armUnmute();
        }, 1800);
    }

    function onPlayerState(e) {
        const S = window.YT && window.YT.PlayerState;
        if (!S) return;

        if (e.data === S.PLAYING) {
            state.playing = true;
            state.buffering = false;
            state.switching = false;
            clearTimeout(state.switchTimer);
            pod.classList.add('is-playing');
            anchor(readTime());
            paintMode();
            startSignal();
            handlePending();
        } else if (e.data === S.PAUSED) {
            state.playing = false;
            state.buffering = false;
            pod.classList.remove('is-playing');
            anchor(readTime());
            paintMode();
            stopSignal();
        } else if (e.data === S.BUFFERING) {
            state.buffering = true;
            paintMode();
        } else if (e.data === S.ENDED) {
            state.playing = false;
            pod.classList.remove('is-playing');
            stopSignal();
            anchor(0);
            if (!state.blocked) advance(1);
        } else if (e.data === S.CUED) {
            try { state.player.playVideo(); } catch (err) { /* next state will tell */ }
        }
    }

    function onPlayerError(code) {
        const mix = state.track;
        if (mix) state.dead.add(mix.id);
        if (state.dead.size >= state.deck.length) { setLost(); return; }
        /* 101 and 150 mean the owner disallows embedding; the rest are dead
           ends too. Drop the id for this visit and try the next mix. */
        state.switching = false;
        clearTimeout(state.switchTimer);
        setTimeout(() => { if (!state.lost) advance(1); }, 500);
    }

    function setLost() {
        state.lost = true;
        state.playing = false;
        state.buffering = false;
        state.switching = false;
        pod.classList.remove('is-playing');
        stopSignal();
        paintMode();
    }

    function playMix(mix) {
        if (!mix) return;
        state.switching = true;
        state.buffering = false;
        paintTrack(mix);
        paintMode();

        if (state.player && state.ready) {
            try {
                state.player.loadVideoById(mix.id);
            } catch (err) {
                onPlayerError(5);
            }
        }

        clearTimeout(state.switchTimer);
        /* A mix that never reports PLAYING (a stalled embed) must not lock the
           transport; the timer releases it and the next press is honoured. */
        state.switchTimer = setTimeout(() => {
            state.switching = false;
            paintMode();
            handlePending();
        }, 1600);
    }

    function handlePending() {
        if (!state.pending) return;
        const again = state.pending;
        state.pending = 0;
        advance(again > 0 ? 1 : -1);
    }

    /* -----------------------------------------------------------------------
       7. Transport
       --------------------------------------------------------------------- */
    function readTime() {
        try {
            const t = state.player.getCurrentTime();
            return isFinite(t) && t > 0 ? t : 0;
        } catch (err) {
            return 0;
        }
    }

    function startPolling() {
        clearInterval(state.pollTimer);
        state.pollTimer = setInterval(tick, stretchPoll(500));
        tick();
    }

    function tick() {
        if (!state.player || !state.ready) return;
        try {
            const d = state.player.getDuration();
            if (isFinite(d) && d > 0 && Math.abs(d - state.duration) > 0.5) {
                state.duration = d;
                if (durEl) durEl.textContent = hms(d);
            }
            const t = state.player.getCurrentTime();
            /* A drag owns the readout: the poll must not walk the clock out from
               under the thumb that is scrubbing. */
            if (isFinite(t) && t >= 0 && !state.seeking) paintTime(t);
        } catch (err) { /* a torn-down frame reports nothing */ }
    }

    /* A lost pod is not a dead pod: a tap on the transport tears the failed
       frame down and tries the API once more, because the usual cause is a
       transient block (an extension, a flaky network), not a bad playlist. */
    function retry() {
        state.lost = false;
        state.apiTries = 0;
        state.apiPending = false;
        state.dead = new Set();
        try { if (state.player && state.player.destroy) state.player.destroy(); } catch (err) { /* torn down */ }
        state.player = null;
        state.ready = false;
        const stale = document.getElementById('pod-yt');
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        paintMode();
        loadApi();
    }

    function togglePlay() {
        if (state.lost) { retry(); return; }
        if (!state.ready) { loadApi(); return; }

        if (state.blocked) {
            /* A press on the pod is a gesture: bring the sound up. */
            unblock();
            try { state.player.playVideo(); } catch (err) { /* next state will tell */ }
            paintMode();
            return;
        }

        if (state.playing) {
            try { state.player.pauseVideo(); } catch (err) { /* next state will tell */ }
        } else {
            anchor(readTime());
            try { state.player.playVideo(); } catch (err) { /* next state will tell */ }
            paintMode();
            startSignal();
        }
    }

    function previous() {
        if (state.lost) { retry(); return; }
        if (!state.ready) { loadApi(); return; }
        advance(-1);
    }

    function next() {
        if (state.lost) { retry(); return; }
        if (!state.ready) { loadApi(); return; }
        advance(1);
    }

    /* Shuffle is a spin, not a toggle: a fresh deck with the current mix at its
       head, then a jump, so the gesture reads as "deal me something else". */
    function shuffleDeck() {
        if (state.lost) { retry(); return; }
        if (!state.ready || !state.deck.length) return;
        const current = state.track;
        const rest = state.deck.filter((m) => m !== current);
        state.deck = current ? [current].concat(shuffle(rest)) : shuffle(rest);
        state.cursor = 0;
        state.pending = 0;
        advance(1);
    }

    /* -----------------------------------------------------------------------
       8. Volume, mute and the autoplay hand-off

       Every audible change goes through fadeVolume. `state.applied` is the
       level last written, so dragging the dial mid-fade never jumps.
       --------------------------------------------------------------------- */
    const volumePct = () => Math.round(clamp(state.volume, 0, 1) * 100);

    let volTimer = 0;

    function writeVolume(pct) {
        state.applied = pct;
        try { state.player.setVolume(pct); } catch (err) { /* not ready yet */ }
    }

    function audioMuted(v) {
        try {
            if (!state.player) return;
            if (v) state.player.mute();
            else state.player.unMute();
        } catch (err) { /* the frame is gone */ }
    }

    function fadeVolume(to, ms) {
        clearInterval(volTimer);
        const target = clamp(Math.round(to), 0, 100);
        const from = state.applied >= 0 ? state.applied : volumePct();
        if (!state.ready) { state.applied = target; return; }
        if (ms <= 0 || from === target) { writeVolume(target); return; }

        const t0 = performance.now();
        volTimer = setInterval(() => {
            const p = clamp((performance.now() - t0) / ms, 0, 1);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            writeVolume(Math.round(from + (target - from) * e));
            if (p >= 1) clearInterval(volTimer);
        }, 40);
    }

    /* The browser may refuse audible playback before a gesture. Start muted
       instead: the mix, the clock and the signal all run, and the first touch
       of any kind brings the sound up in a fade. No prompt is shown, because
       the pod is already playing. */
    let unmuteArmed = false;
    let silentProbe = 0;

    function unblock() {
        if (!state.blocked) return;
        state.blocked = false;
        pod.classList.remove('is-blocked');
        if (state.muted) {
            audioMuted(true);
        } else {
            audioMuted(false);
            fadeVolume(volumePct(), 700);
        }
        /* The gesture that opened the gate is also the one that may re-start a
           player the browser paused at the unmute. */
        if (!state.playing) {
            try { state.player.playVideo(); } catch (err) { /* next state will tell */ }
        }
        paintMode();
    }

    function armUnmute() {
        if (unmuteArmed) return;
        unmuteArmed = true;
        const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
        const go = () => {
            events.forEach((ev) => window.removeEventListener(ev, go, true));
            unmuteArmed = false;
            if (!state.blocked) return;
            unblock();
        };
        events.forEach((ev) => window.addEventListener(ev, go, { capture: true, passive: true }));
    }

    /* -----------------------------------------------------------------------
       9. The readout
       --------------------------------------------------------------------- */
    function paintTrack(mix) {
        state.track = mix;
        const i = MIXES.indexOf(mix);
        if (titleEl) titleEl.textContent = mix.title;
        if (artistEl) artistEl.textContent = PLAYLIST.channel;
        if (clockEl) clockEl.textContent = '0:00';
        if (durEl) durEl.textContent = mix.len || hms(0);
        if (seqEl) seqEl.textContent = (i >= 0 ? String(i + 1).padStart(2, '0') : '—') + ' / ' + MIXES.length;
        if (pillTitle) pillTitle.textContent = mix.title;
        if (openEl) {
            openEl.href = PLAYLIST.watchUrl + mix.id;
            openEl.setAttribute('title', mix.title + ' — on youtube');
        }
        state.time = 0;
        state.duration = secondsOf(mix.len);
        paintRail(0);
        anchor(0);
        seedSignal(mix.id);
        paintMode();
    }

    function paintTime(t) {
        state.time = t;
        const d = state.duration;
        paintRail(d > 0 ? clamp((t / d) * 100, 0, 100) : 0);
        if (clockEl) clockEl.textContent = hms(t);
    }

    function paintRail(pct) {
        if (railFill) railFill.style.transform = 'scaleX(' + (pct / 100).toFixed(4) + ')';
        if (railEl) railEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    function paintMode() {
        if (state.lost) {
            setMode('signal lost', 'mất sóng', 'fas fa-triangle-exclamation');
        } else if (!state.ready) {
            setMode('tuning', 'đang dò sóng', 'fas fa-satellite-dish');
        } else if (state.blocked) {
            setMode('sound on touch', 'chạm để nghe', 'fas fa-volume-xmark');
        } else if (state.switching || state.buffering) {
            setMode('tuning', 'đang dò sóng', 'fas fa-satellite-dish');
        } else if (state.playing) {
            setMode('night signal', 'tín hiệu đêm', 'fas fa-wave-square');
        } else if (state.track) {
            setMode('paused', 'tạm dừng', 'fas fa-circle-pause');
        } else {
            setMode('ready', 'sẵn sàng', 'fas fa-circle-play');
        }

        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon) icon.className = state.playing ? 'fas fa-pause' : 'fas fa-play';
            playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
        }
        if (muteBtn) {
            /* While the browser holds the sound the hub is the key that lets it
               out, so it must not call itself "Mute". */
            muteBtn.setAttribute('aria-label',
                state.blocked ? 'Turn the sound on'
                    : state.muted ? 'Unmute' : 'Mute');
        }
        pod.classList.toggle('is-playing', !!state.playing);

        /* The capsule mirrors the screen: one glyph, one word, no second state
           machine to keep in step. */
        if (glyphEl) {
            const icon = glyphEl.querySelector('i');
            if (icon) {
                icon.className = state.blocked ? 'fas fa-volume-xmark'
                    : state.playing ? 'fas fa-wave-square' : 'fas fa-play';
            }
        }
        if (pillState) {
            const en = pillState.querySelector('[lang="en"]');
            const vi = pillState.querySelector('[lang="vi"]');
            const pair = state.lost ? ['signal lost', 'mất sóng']
                : !state.ready ? ['tuning', 'đang dò sóng']
                    : state.blocked ? ['tap for sound', 'chạm để nghe']
                        : state.switching || state.buffering ? ['tuning', 'đang dò sóng']
                            : state.playing ? ['night signal', 'tín hiệu đêm']
                                : ['paused', 'tạm dừng'];
            if (en) en.textContent = pair[0];
            if (vi) vi.textContent = pair[1];
        }
        if (stage) {
            stage.setAttribute('aria-label',
                state.blocked ? 'Turn the sound on' : state.playing ? 'Pause the mix' : 'Play the mix');
        }
    }

    /* -----------------------------------------------------------------------
       10. The night signal

       A generated instrument reading, not an analyser: four seeded sine
       components ride the mix's own clock, a pulse derived from the mix's seed
       drives the bars, and the pointer bends the trace toward itself. The
       player's clock is the only measured input, so pausing freezes the frame
       exactly where the music stopped.
       --------------------------------------------------------------------- */
    const scope = {
        cv: canvas,
        ctx: canvas.getContext('2d'),
        w: 0,
        h: 0,
        dpr: 1,
        tokens: null,
        comps: [],
        dust: [],
        rate: 96,
        base: 0,
        baseAt: 0,
        mx: 0.5,
        my: 0.5,
        magnet: 0,
        magnetOn: false,
        flash: 0,
        raf: 0,
        running: false,
        last: 0,
        skip: 0,
        glow: true,
    };

    function hash32(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    /* mulberry32 — small, fast, and the same seed always draws the same mix. */
    function rand(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function tokensFromCSS() {
        const cs = getComputedStyle(document.documentElement);
        const rgb = (name, fallback) => {
            const v = (cs.getPropertyValue(name) || '').trim();
            return v || fallback;
        };
        return {
            one: rgb('--holo-1-rgb', '0, 240, 212'),
            two: rgb('--holo-2-rgb', '255, 45, 149'),
            three: rgb('--holo-3-rgb', '255, 201, 64'),
        };
    }

    function seedSignal(id) {
        const r = rand(hash32(String(id || 'after-dark')));
        const bases = [0.9, 1.7, 2.6, 3.9];
        scope.comps = bases.map((base, i) => ({
            k: base + r() * 0.9,
            w: 0.05 + r() * 0.16,
            p: r() * TAU,
            a: 1 / Math.pow(1.45, i),
        }));
        const sum = scope.comps.reduce((s, c) => s + c.a, 0) || 1;
        scope.comps.forEach((c) => { c.a /= sum; });

        scope.rate = 76 + Math.floor(r() * 44);
        scope.dust = [];
        for (let i = 0; i < 26; i++) {
            scope.dust.push({
                x: r(),
                y: r(),
                s: 0.15 + r() * 0.85,
                r: 0.6 + r() * 1.1,
                p: r() * TAU,
                a: 0.25 + r() * 0.6,
                gold: r() < 0.22,
            });
        }
        scope.base = 0;
        scope.baseAt = performance.now();
        scope.flash = 1;
        paintOnce();
    }

    function wave(u, t) {
        let v = 0;
        for (let i = 0; i < scope.comps.length; i++) {
            const c = scope.comps[i];
            v += c.a * Math.sin(c.k * TAU * u + c.w * TAU * t + c.p);
        }
        return v;
    }

    function pulse(t) {
        const per = 60 / scope.rate;
        const f = mod(t, per) / per;
        return Math.pow(1 - f, 3);
    }

    function anchor(seconds) {
        scope.base = isFinite(seconds) && seconds > 0 ? seconds : 0;
        scope.baseAt = performance.now();
    }

    function sizeScope() {
        if (!scope.ctx) return;
        /* Measure the element the canvas actually lives in — the glass is a
           different box when the instrument is collapsed. */
        const host = canvas.parentNode;
        const rect = host ? host.getBoundingClientRect() : null;
        const w = Math.max(120, Math.round(rect ? rect.width : 288));
        const h = Math.max(28, Math.round(rect ? rect.height : 44));
        const dpr = clamp(window.devicePixelRatio || 1, 1, level() <= 1 ? 1.5 : 2);
        if (w === scope.w && h === scope.h && dpr === scope.dpr) return;

        scope.w = w;
        scope.h = h;
        scope.dpr = dpr;
        scope.tokens = tokensFromCSS();
        scope.glow = level() >= 2;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        scope.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintOnce();
    }

    function paintOnce() {
        sizeScope();
        paint(performance.now());
    }

    function paint(now) {
        const ctx = scope.ctx;
        if (!ctx || !scope.w || !scope.tokens) return;

        const w = scope.w;
        const h = scope.h;
        const T = scope.tokens;
        const live = state.playing && !!state.player;
        const t = (scope.running && state.playing)
            ? scope.base + (now - scope.baseAt) / 1000
            : scope.base;

        const dt = clamp((now - scope.last) / 1000, 0, 0.06);
        scope.last = now;
        scope.flash = Math.max(0, scope.flash - dt * 2.2);
        scope.magnet += ((scope.magnetOn && !still() ? 1 : 0) - scope.magnet) * Math.min(1, dt * 9);

        const horizon = h * 0.9;
        const cy = h * 0.34;
        const beat = pulse(t);

        ctx.clearRect(0, 0, w, h);

        /* The graticule: four rules and their edge ticks. It is an instrument
           face, not a page background — it exists so the trace has a scale. */
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(T.one, 0.05);
        ctx.beginPath();
        for (let i = 1; i <= 3; i++) {
            const y = Math.round((horizon * i) / 4) + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
        ctx.strokeStyle = rgba(T.one, 0.12);
        ctx.beginPath();
        for (let i = 1; i <= 3; i++) {
            const y = Math.round((horizon * i) / 4) + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(3.5, y);
            ctx.moveTo(w - 3.5, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        /* Dust. It drifts only while the mix is playing, so a paused pod looks
           paused rather than merely quiet. */
        if (live) {
            for (let i = 0; i < scope.dust.length; i++) {
                const m = scope.dust[i];
                m.y -= m.s * dt * 0.014;
                if (m.y < -0.04) { m.y = 1.04; m.x = Math.random(); }
            }
        }
        for (let i = 0; i < scope.dust.length; i++) {
            const m = scope.dust[i];
            const tw = 0.55 + 0.45 * Math.sin(t * (0.4 + m.s * 0.7) + m.p);
            const a = m.a * tw * (live ? 0.9 : 0.3);
            ctx.fillStyle = rgba(m.gold ? T.three : T.one, a * 0.5);
            ctx.fillRect(m.x * w, m.y * h, m.r, m.r);
        }

        /* The signal fan. Each bar reads the same wave at its own x, so the fan
           and the trace always tell one story. */
        const n = clamp(Math.round(w / 11), 12, 30);
        const slot = w / n;
        const bw = Math.max(1.5, slot * 0.3);
        const grad = ctx.createLinearGradient(0, horizon, 0, h * 0.42);
        grad.addColorStop(0, rgba(T.one, 0.55));
        grad.addColorStop(0.58, rgba(T.one, 0.95));
        grad.addColorStop(1, rgba(T.two, 0.9));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = grad;
        ctx.lineWidth = bw;
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n;
            const x = u * w;
            const fall = 0.34 + Math.pow(1 - u * 0.62, 0.8) * 0.66;
            const near = scope.magnet * Math.exp(-Math.pow((u - scope.mx) / 0.09, 2));
            const amp = clamp(
                (0.08 + Math.abs(wave(u, t)) * fall * 1.05) * (0.84 + beat * 0.5) + near * 0.35,
                0.02,
                1
            );
            ctx.globalAlpha = 0.3 + amp * 0.6;
            ctx.beginPath();
            ctx.moveTo(x, horizon);
            ctx.lineTo(x, horizon - amp * h * 0.38);
            ctx.stroke();
        }
        ctx.restore();

        /* The mix's own light spilling under the fan. */
        const spill = ctx.createLinearGradient(0, horizon, 0, h);
        spill.addColorStop(0, rgba(T.one, 0.07 + beat * 0.09));
        spill.addColorStop(1, rgba(T.one, 0));
        ctx.fillStyle = spill;
        ctx.fillRect(0, horizon, w, h - horizon);

        /* The trace: computed once, drawn as a magenta ghost, a cyan body and a
           bright core — the same chromatic split the giant word carries. */
        const pts = [];
        const ampBase = h * 0.185;
        for (let x = 0; x <= w; x += 2) {
            const u = x / w;
            const bump = scope.magnet * Math.exp(-Math.pow((u - scope.mx) / 0.075, 2));
            const y = cy
                + wave(u, t) * ampBase * (0.85 + beat * 0.35)
                + (scope.my - 0.5) * h * 0.34 * bump;
            pts.push([x, y]);
        }

        const path = (dx, dy) => {
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                if (i === 0) ctx.moveTo(p[0] + dx, p[1] + dy);
                else ctx.lineTo(p[0] + dx, p[1] + dy);
            }
        };

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        path(2.1, 0);
        ctx.strokeStyle = rgba(T.two, 0.34 + beat * 0.14);
        ctx.lineWidth = 1.3;
        ctx.stroke();

        path(-1.1, 0.7);
        ctx.strokeStyle = rgba(T.one, 0.22);
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.restore();

        path(0, 0);
        if (scope.glow) {
            ctx.shadowColor = rgba(T.one, 0.5);
            ctx.shadowBlur = 9;
        }
        ctx.strokeStyle = rgba(T.one, 0.95);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        path(0, 0);
        ctx.strokeStyle = 'rgba(242, 251, 255, 0.38)';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        /* The sweep: one gold hairline crosses the window every 26 seconds and
           lights the point of the trace it is reading. */
        const phase = mod(t, 26) / 26;
        const sx = phase * w;
        ctx.strokeStyle = rgba(T.three, 0.08 + (1 - phase) * 0.18);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 0.5, h * 0.14);
        ctx.lineTo(sx + 0.5, horizon);
        ctx.stroke();
        const at = pts[Math.min(pts.length - 1, Math.round(sx / 2))];
        if (at) {
            ctx.fillStyle = rgba(T.three, 0.8);
            ctx.fillRect(at[0] - 1, at[1] - 1, 2.4, 2.4);
        }

        /* A landing mix washes the screen once, then decays. */
        if (scope.flash > 0) {
            ctx.fillStyle = rgba(T.one, scope.flash * 0.1);
            ctx.fillRect(0, 0, w, h);
        }
    }

    function loop(now) {
        if (!scope.running) return;
        scope.raf = requestAnimationFrame(loop);
        /* Balanced smears the signal to ~30fps; full and ultra get every frame. */
        if (level() === 1) {
            scope.skip = 1 - scope.skip;
            if (scope.skip) return;
        }
        paint(now);
    }

    function startSignal() {
        if (still()) { paintOnce(); return; }
        if (scope.running) return;
        scope.running = true;
        scope.last = performance.now();
        anchor(readTime());
        scope.raf = requestAnimationFrame(loop);
    }

    function stopSignal() {
        scope.running = false;
        cancelAnimationFrame(scope.raf);
        scope.raf = 0;
        paintOnce();
    }

    /* -----------------------------------------------------------------------
       11. Wiring
       --------------------------------------------------------------------- */
    /* Collapse and expand. The collapsed capsule stays a live player; opening
       the body only reveals the wheel, the clock and the volume, and never
       interrupts the mix. */
    function setOpen(open) {
        if (!bodyEl || !moreBtn) return;
        bodyEl.hidden = !open;
        pod.classList.toggle('is-compact', !open);
        moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        moreBtn.setAttribute('aria-label', open ? 'Hide the full player' : 'Show the full player');
        const icon = moreBtn.querySelector('i');
        if (icon) icon.className = open ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        if (open) {
            /* The canvas is measured against a box that did not exist while the
               body was hidden, so it has to be re-sized on the way back. */
            sizeScope();
            paintOnce();
        }
    }

    if (moreBtn) {
        moreBtn.addEventListener('click', () => {
            setOpen(!!bodyEl.hidden);
        });
    }

    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', previous);
    if (menuBtn) menuBtn.addEventListener('click', shuffleDeck);

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            if (state.blocked) {
                /* While the browser holds the sound, the hub is the "let me
                   hear it" key, not a mute key. */
                unblock();
                return;
            }
            state.muted = !state.muted;
            audioMuted(state.muted);
            if (!state.muted) fadeVolume(volumePct(), 400);
            muteBtn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
            const icon = muteBtn.querySelector('i');
            if (icon) icon.className = state.muted ? 'fas fa-volume-xmark' : 'fas fa-volume-up';
            paintMode();
        });
    }

    if (volumeEl) {
        volumeEl.addEventListener('input', () => {
            state.volume = clamp(Number(volumeEl.value) / 100, 0, 1);
            if (state.blocked) unblock();
            if (state.muted) {
                state.muted = false;
                audioMuted(false);
                if (muteBtn) {
                    muteBtn.setAttribute('aria-pressed', 'false');
                    const icon = muteBtn.querySelector('i');
                    if (icon) icon.className = 'fas fa-volume-up';
                }
            }
            writeVolume(volumePct());
            paintMode();
        });
    }

    /* The signal window is a play/pause surface with a magnet in it: moving
       over the glass bends the trace toward the pointer. */
    if (stage) {
        stage.addEventListener('click', togglePlay);

        stage.addEventListener('pointermove', (e) => {
            const r = stage.getBoundingClientRect();
            if (!r.width || !r.height) return;
            scope.mx = clamp((e.clientX - r.left) / r.width, 0, 1);
            scope.my = clamp((e.clientY - r.top) / r.height, 0, 1);
            scope.magnetOn = true;
        }, { passive: true });

        stage.addEventListener('pointerleave', () => { scope.magnetOn = false; });
        stage.addEventListener('pointercancel', () => { scope.magnetOn = false; });
    }

    /* The wheel. The four bands are ordinary buttons; a drag across the ring
       seeks the mix instead — an hour-long set needs a scrub, not a next. */
    if (wheel) {
        let drag = null;

        wheel.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.pod-wheel-hub')) return; /* mute is its own key */
            /* No capture yet on purpose: capturing on press retargets the click
               to the wheel and swallows the band the finger pressed. Capture is
               taken on the first real move, once this is definitely a drag. */
            drag = { id: e.pointerId, x: e.clientX, moved: false, base: state.time, target: state.time };
        });

        wheel.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 6) {
                drag.moved = true;
                try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
            }
            if (!drag.moved) return;
            const d = state.duration || 0;
            state.seeking = true;
            drag.target = clamp(drag.base + (-dx) * SEEK_PER_PX, 0, d || drag.base);
            pod.classList.add('is-seeking');
            paintRail(d > 0 ? clamp((drag.target / d) * 100, 0, 100) : 0);
            if (clockEl) clockEl.textContent = hms(drag.target);
        });

        const endDrag = (e) => {
            if (!drag || (e && e.pointerId !== drag.id)) return;
            const wasDrag = drag.moved;
            const target = drag.target;
            drag = null;
            state.seeking = false;
            pod.classList.remove('is-seeking');
            if (!wasDrag) return;

            swipeClick(wheel);
            if (state.player && state.ready) {
                try { state.player.seekTo(target, true); } catch (err) { /* ignore */ }
            }
            state.time = target;
            anchor(target);
            paintRail(state.duration > 0 ? clamp((target / state.duration) * 100, 0, 100) : 0);
            if (clockEl) clockEl.textContent = hms(target);
            if (!state.playing) paintOnce();
        };

        wheel.addEventListener('pointerup', endDrag);
        wheel.addEventListener('pointercancel', endDrag);

        /* Keyboard, because the wheel's bands are already focusable. */
        wheel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); previous(); }
            else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePlay(); }
        });
    }

    /* Swallow the click a drag leaves on whichever band it ended over. */
    function swipeClick(host) {
        const kill = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            host.removeEventListener('click', kill, true);
        };
        host.addEventListener('click', kill, true);
        setTimeout(() => host.removeEventListener('click', kill, true), 420);
    }

    /* -----------------------------------------------------------------------
       12. Diagnostics
       --------------------------------------------------------------------- */
    window.__pod = {
        get ready() { return state.ready; },
        get lost() { return state.lost; },
        get track() { return state.track; },
        get playing() { return state.playing; },
        get blocked() { return state.blocked; },
        get muted() { return state.muted; },
        get volume() { return state.volume; },
        get deck() { return state.deck.length; },
        get dead() { return Array.from(state.dead); },
        get time() { return state.time; },
        get duration() { return state.duration; },
        get playerState() {
            try { return state.player ? state.player.getPlayerState() : -99; } catch (err) { return -98; }
        },
        get videoId() { return state.track ? state.track.id : ''; },
        get signal() { return { running: scope.running, frames: scope.raf, w: scope.w, h: scope.h }; },
    };

    /* -----------------------------------------------------------------------
       13. Boot

       Nothing to press and nothing to opt into: the pod deals the playlist,
       settles on a mix and starts. The sound arrives on the first gesture, by
       itself; until then the mix runs muted with the signal drawing it.
       --------------------------------------------------------------------- */
    buildDeck();
    paintTrack(firstMix());
    sizeScope();

    const boot = () => {
        whenIdle(() => { loadApi(); });
    };

    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
        window.addEventListener(ev, () => { state.gestured = true; }, { capture: true, passive: true, once: true });
    });

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });

    window.addEventListener('resize', paintOnce);
    if (typeof ResizeObserver === 'function' && stage) {
        try { new ResizeObserver(() => paintOnce()).observe(stage); } catch (err) { /* fine */ }
    }

    /* A hidden tab draws nothing; a returning tab picks the signal back up. */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopSignal();
        else if (state.playing) startSignal();
    });

    /* If the governor drops the page to lite mid-visit (or a tier override
       arrives), the loop stops and the frame freezes; if it recovers, the
       signal resumes. */
    try {
        if (perf && typeof perf.onChange === 'function') {
            perf.onChange(() => {
                scope.glow = level() >= 2;
                if (still()) { stopSignal(); paintOnce(); }
                else if (state.playing) startSignal();
            });
        }
    } catch (err) { /* the governor is optional */ }
})();