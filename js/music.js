/* =============================================================================
   THE POD — ad-free radio dial (js/music.js)

   The music lives entirely in the hero's right-hand HUD instrument. There is
   no music tab, no Spotify and no video: the pod is a tuner for six SomaFM
   channels — listener-supported, carried without ads — played through an
   <audio> element that is never shown. No embed chrome, no thumbnails, and no
   spot breaking in halfway through the night.

   Why radio, when the pod used to play the owner's *after dark* playlist
   (sole space., YouTube PLJESZmrEx7TM): an embedded YouTube player serves
   pre-roll and mid-roll ads on monetised videos, and the IFrame API exposes no
   control over them at all — not `youtube-nocookie`, not `modestbranding`, not
   anything else. SomaFM's streams are the closest thing to that playlist's
   mood (ambient, downtempo, drone, late-night deep house) that can run all
   visit with nothing interrupting it.

   The window above the readout is a night-signal visualiser. The stream is
   deliberately not routed through Web Audio: createMediaElementSource() would
   leave the pod silent whenever the AudioContext is suspended, which is a bad
   trade for a drawing. So the trace is generated rather than measured — seeded
   from the station's own id and advanced by a local clock. It freezes when the
   station is paused, re-seeds when the dial moves, and is never called a
   "spectrum" — nothing in it comes from the audio.
   What *is* real is everything the visitor can check: the station, the artist
   and track the station is playing right now (its own now-playing feed), the
   dial position, and the state of the transport.

   A live stream has no duration and cannot be seeked, so the readout carries
   no position rail and no scrub: dragging the wheel tunes up and down the dial
   instead, and the foot shows the stream's format and its source rather than a
   track clock.

   The dial is a hand-kept snapshot, not a live directory. There is no API key
   and no build step; to change the stations, edit STATIONS below by hand.

   Playback policy, handled rather than fought: a page may not start audible
   sound before the visitor touches it. The pod therefore starts the stream
   anyway — muted, with the visualiser running — and brings the sound up, faded
   in, on the first gesture of any kind. Nothing is asked of the visitor and
   nothing is lost if they never touch the page.
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
    /* Six channels that sit in the same after-dark corner as the playlist the
       pod used to carry: downtempo beats, drone, deep space, late-night house,
       spy lounge and instrumental hiphop. Ids, titles and blurbs are SomaFM's
       own; the stream and feed paths are derived from the id. */
    const STATIONS = [
        { id: 'groovesalad', title: 'groove salad', blurb: 'ambient / downtempo beats' },
        { id: 'dronezone', title: 'drone zone', blurb: 'atmospheric textures, minimal beats' },
        { id: 'deepspaceone', title: 'deep space one', blurb: 'deep ambient / space music' },
        { id: 'beatblender', title: 'beat blender', blurb: 'late-night deep house / downtempo' },
        { id: 'secretagent', title: 'secret agent', blurb: 'lounge for spies and PIs' },
        { id: 'fluid', title: 'fluid', blurb: 'instrumental hiphop / future soul' },
    ];

    const STREAM = (id) => 'https://ice1.somafm.com/' + id + '-128-mp3';
    const FEED = (id) => 'https://somafm.com/songs/' + id + '.json';
    const PAGE = (id) => 'https://somafm.com/' + id + '/';

    /* The stream plays as ambience, not as a broadcast. The slider owns the real
       level; mute silences without moving the slider. */
    const DEFAULT_VOLUME = 0.10;
    const TAU = Math.PI * 2;

    /* -----------------------------------------------------------------------
       3. State
       --------------------------------------------------------------------- */
    const state = {
        cursor: 0,              /* the dial's index, not a deck position */
        station: null,
        audio: null,            /* the <audio> transport, created once */
        ready: false,           /* the transport exists and has a source */
        lost: false,
        switching: false,       /* a tune is loading; its stream has not spoken */
        buffering: false,
        pending: 0,             /* presses that arrived while a station loaded */
        playing: false,
        blocked: true,          /* the browser holds the sound until a gesture */
        muted: false,
        volume: DEFAULT_VOLUME,
        applied: -1,            /* the level last written to the transport */
        gestured: false,        /* the visitor has touched the page at all */
        time: 0,                /* seconds of *this* station, this visit */
        baseTime: 0,
        startedAt: 0,
        now: null,              /* {artist, title} from the station's own feed */
        dead: new Set(),        /* ids that failed to stream this session */
        switchTimer: 0,
        metaTimer: 0,
    };

    /* -----------------------------------------------------------------------
       4. Small utilities
       --------------------------------------------------------------------- */
    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const mod = (n, m) => ((n % m) + m) % m;

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
       5. The dial

       Six stations in a fixed order — a dial has a place, and there is no deck
       state to keep in step. Advancing wraps, skipping any station that failed
       to stream this visit; the counter on the screen is the station's real
       index in the dial.
       --------------------------------------------------------------------- */
    function stationAt(i) {
        return STATIONS[mod(i, STATIONS.length)];
    }

    function advance(step) {
        if (!STATIONS.length) return;
        if (!state.audio) { boot(); return; }
        if (state.switching) { state.pending += step > 0 ? 1 : -1; return; }

        const n = STATIONS.length;
        let i = state.cursor;
        let tries = 0;
        do {
            i = mod(i + step, n);
            tries++;
        } while (state.dead.has(STATIONS[i].id) && tries < n);
        tune(i);
    }

    function tune(i) {
        const st = stationAt(i);
        if (!st) return;

        state.cursor = mod(i, STATIONS.length);
        state.station = st;
        state.switching = true;
        state.buffering = false;
        state.playing = false;
        state.time = 0;
        state.baseTime = 0;
        state.startedAt = 0;
        state.now = null;
        pod.classList.remove('is-playing');
        paintStation(st);
        paintMode();

        const a = state.audio;
        if (a) {
            try {
                a.pause();
                a.src = STREAM(st.id);
                a.load();
                const p = a.play();
                if (p && typeof p.catch === 'function') p.catch(() => { armUnmute(); });
            } catch (err) {
                onStreamError();
            }
        }

        /* A stream that never says PLAYING must not lock the transport; the
           timer releases it and the next press is honoured. */
        clearTimeout(state.switchTimer);
        state.switchTimer = setTimeout(() => {
            if (!state.switching) return;
            state.switching = false;
            paintMode();
        }, 2600);

        pollNow(0);
    }

    function handlePending() {
        if (!state.pending) return;
        const again = state.pending;
        state.pending = 0;
        advance(again > 0 ? 1 : -1);
    }

    /* -----------------------------------------------------------------------
       6. The transport

       A plain <audio> element, created once and never shown: a live stream has
       no duration and no chrome worth offering. It is not given `crossorigin`,
       because the stream is played rather than sampled — playback must not
       depend on the station answering a CORS preflight.
       --------------------------------------------------------------------- */
    function createTransport() {
        if (state.audio || state.lost) return;

        const a = new Audio();
        a.preload = 'none';
        a.autoplay = false;
        /* Muted, because an unmuted play() is refused before the first gesture.
           The level starts at zero so the first fade has somewhere to rise from. */
        a.muted = true;
        a.volume = 0;
        state.applied = 0;
        a.setAttribute('aria-hidden', 'true');
        a.style.display = 'none';

        a.addEventListener('playing', onPlaying);
        a.addEventListener('pause', onPaused);
        a.addEventListener('waiting', () => { state.buffering = true; paintMode(); });
        a.addEventListener('stalled', () => { state.buffering = true; paintMode(); });
        a.addEventListener('ended', onStreamEnded);
        a.addEventListener('error', onStreamError);

        document.body.appendChild(a);
        state.audio = a;
        state.ready = true;
        tune(state.cursor);

        /* Nothing was pressed to get here, so the stream is muted. Arm the first
           gesture of any kind — a tab, a scroll, a key — to bring the sound up,
           rather than making the visitor find the pod first. */
        armUnmute();
    }

    function onPlaying() {
        if (!state.playing) {
            state.baseTime = state.time;
            state.startedAt = performance.now();
        }
        state.playing = true;
        state.buffering = false;
        state.switching = false;
        state.ready = true;
        clearTimeout(state.switchTimer);
        pod.classList.add('is-playing');
        anchor(readTime());
        paintMode();
        startSignal();
        handlePending();
    }

    function onPaused() {
        state.time = readTime();
        state.playing = false;
        state.buffering = false;
        pod.classList.remove('is-playing');
        anchor(state.time);
        paintMode();
        stopSignal();
    }

    function onStreamEnded() {
        /* A live stream that ends is a dropped connection, not a finished
           track: reopen it rather than moving the dial. */
        setTimeout(() => {
            if (!state.audio || state.lost) return;
            try {
                state.audio.load();
                const p = state.audio.play();
                if (p && typeof p.catch === 'function') p.catch(() => { /* still offline */ });
            } catch (err) { onStreamError(); }
        }, 800);
    }

    function onStreamError() {
        /* Code 1 is MEDIA_ERR_ABORTED — we changed stations on purpose. */
        try {
            if (state.audio && state.audio.error && state.audio.error.code === 1) return;
        } catch (err) { /* read what you can */ }

        const st = state.station;
        if (st) state.dead.add(st.id);
        if (state.dead.size >= STATIONS.length) { setLost(); return; }
        state.switching = false;
        state.buffering = false;
        clearTimeout(state.switchTimer);
        setTimeout(() => { if (!state.lost) advance(1); }, 600);
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

    /* -----------------------------------------------------------------------
       7. Transport

       There is no position to read: a live stream reports no useful duration
       and its currentTime is the stream's own, not the station's. The clock
       below is our own — seconds of this station, this visit — which is what
       the visualiser advances on and nothing more.
       --------------------------------------------------------------------- */
    function readTime() {
        if (state.playing) {
            return state.baseTime + Math.max(0, (performance.now() - state.startedAt) / 1000);
        }
        return state.time;
    }

    /* A lost pod is not a dead pod: a tap on the transport tears the failed
       element down and builds a fresh one, because the usual cause is a
       transient block (offline, a flaky stream), not a dead dial. */
    function retry() {
        state.lost = false;
        state.dead = new Set();
        state.ready = false;
        /* The fresh element starts muted, as any autoplay must; if this retry
           came from a tap, that same tap can open the sound. */
        state.blocked = true;
        pod.classList.add('is-blocked');
        if (state.audio) {
            try {
                state.audio.pause();
                state.audio.removeAttribute('src');
                state.audio.load();
            } catch (err) { /* already detached */ }
            if (state.audio.parentNode) state.audio.parentNode.removeChild(state.audio);
            state.audio = null;
        }
        paintMode();
        createTransport();
        if (state.gestured && state.audio) unblock();
    }

    function togglePlay() {
        if (state.lost) { retry(); return; }
        if (!state.audio) { boot(); return; }

        if (state.blocked) {
            /* A press on the pod is a gesture: bring the sound up. */
            unblock();
            return;
        }

        if (state.playing) {
            try { state.audio.pause(); } catch (err) { /* the state event will tell */ }
            return;
        }

        /* A live stream cannot resume where it stopped: re-open it so the
           visitor hears the station as it is now, not the buffer they left. */
        try { state.audio.load(); } catch (err) { /* the play attempt will tell */ }
        playStation();
        paintMode();
    }

    function playStation() {
        if (!state.audio) return;
        const p = state.audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => { armUnmute(); paintMode(); });
    }

    function previous() {
        if (state.lost) { retry(); return; }
        advance(-1);
    }

    function next() {
        if (state.lost) { retry(); return; }
        advance(1);
    }

    /* Shuffle is a spin, not a toggle: land on a different station, so the
       gesture reads as "find me something else on the dial". */
    function shuffleStation() {
        if (state.lost) { retry(); return; }
        if (!state.audio || STATIONS.length < 2) return;
        let i = state.cursor;
        let guard = 0;
        do {
            i = Math.floor(Math.random() * STATIONS.length);
            guard++;
        } while (i === state.cursor && guard < 12);
        tune(i);
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
        try { if (state.audio) state.audio.volume = clamp(pct, 0, 100) / 100; } catch (err) { /* not ready yet */ }
    }

    function audioMuted(v) {
        try { if (state.audio) state.audio.muted = !!v; } catch (err) { /* the element is gone */ }
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
       instead: the station, the signal and the feed all run, and the first touch
       of any kind brings the sound up in a fade. No prompt is shown, because
       the pod is already playing. */
    let unmuteArmed = false;

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
           transport the browser paused at the unmute. */
        if (!state.playing && state.audio && state.audio.paused) playStation();
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

    /* The way in. The boot screen's "see full card" arrow is the visitor's
       first real gesture, so it doubles as the hand-off autoplay is waiting
       for: the station comes up with sound as the card opens, instead of muted
       until a later tap on the pod. Called from main.js inside the click, so
       the browser's activation is still live. */
    function startWithSound() {
        if (state.lost) return;
        state.gestured = true;

        if (!state.audio) {
            /* Built inside the click, not on idle: the visitor's activation is
               still live right now, which is the only moment a browser will let
               the stream start audible. */
            createTransport();
            if (!state.audio) { paintMode(); return; }
        }

        if (state.blocked) {
            unblock();
            return;
        }

        if (!state.muted) {
            audioMuted(false);
            fadeVolume(volumePct(), 700);
        }
        if (!state.playing && state.audio.paused) playStation();
        paintMode();
    }

    window.startPodMusic = startWithSound;

    /* -----------------------------------------------------------------------
       9. The readout

       The screen names the station — stable, and what the capsule mirrors — and
       its second line carries whatever the station says it is playing. That
       line comes from the station's own now-playing feed, so it is real, late
       by however long the feed lags, and falls back to the station's blurb when
       the feed cannot be reached.
       --------------------------------------------------------------------- */
    function paintStation(st) {
        const i = STATIONS.indexOf(st);
        if (titleEl) titleEl.textContent = st.title;
        if (artistEl) artistEl.textContent = st.blurb;
        if (seqEl) seqEl.textContent = (i >= 0 ? String(i + 1).padStart(2, '0') : '—') + ' / ' + String(STATIONS.length).padStart(2, '0');
        if (pillTitle) pillTitle.textContent = st.title;
        if (openEl) {
            openEl.href = PAGE(st.id);
            openEl.setAttribute('title', st.title + ' — on somafm');
            openEl.setAttribute('aria-label', 'Open ' + st.title + ' on SomaFM');
        }
        anchor(0);
        seedSignal(st.id);
        paintMode();
    }

    function paintNow(song) {
        state.now = song && (song.title || song.artist) ? song : null;
        if (!state.station || !artistEl) return;
        const line = state.now
            ? [state.now.artist, state.now.title].filter(Boolean).join(' — ')
            : state.station.blurb;
        artistEl.textContent = line;
    }

    /* The feed is a nicety, not the product: a failed fetch keeps whatever the
       screen last said, and the stream keeps playing. */
    function pollNow(delay) {
        clearTimeout(state.metaTimer);
        const st = state.station;
        if (!st) return;
        state.metaTimer = setTimeout(() => { refreshNow(st); }, delay);
    }

    async function refreshNow(st) {
        if (!state.station || state.station.id !== st.id) return;
        try {
            const res = await fetch(FEED(st.id), { cache: 'no-store' });
            if (!res.ok) throw new Error('feed ' + res.status);
            const data = await res.json();
            if (!state.station || state.station.id !== st.id) return;
            const song = (data.songs || [])[0];
            if (song) paintNow({ artist: song.artist || '', title: song.title || '' });
        } catch (err) { /* the screen keeps the station's blurb */ }
        finally {
            if (!state.lost && state.station && state.station.id === st.id) pollNow(stretchPoll(20000));
        }
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
            setMode('on air', 'đang phát sóng', 'fas fa-tower-broadcast');
        } else if (state.station) {
            setMode('off air', 'tạm dừng', 'fas fa-circle-pause');
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
                            : state.playing ? ['on air', 'đang phát sóng']
                                : ['off air', 'tạm dừng'];
            if (en) en.textContent = pair[0];
            if (vi) vi.textContent = pair[1];
        }
        if (stage) {
            stage.setAttribute('aria-label',
                state.blocked ? 'Turn the sound on' : state.playing ? 'Pause the station' : 'Play the station');
        }
    }

    /* -----------------------------------------------------------------------
       10. The night signal

       A generated instrument reading, not an analyser: four seeded sine
       components ride our own clock, a pulse derived from the station's seed
       drives the bars, and the pointer bends the trace toward itself. Nothing
       here is sampled from the stream, so pausing freezes the frame exactly
       where it stands, and the label never claims otherwise.
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

    /* mulberry32 — small, fast, and the same seed always draws the same signal. */
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
        const live = state.playing && !!state.audio;
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

        /* Dust. It drifts only while the station is playing, so a paused pod
           looks paused rather than merely quiet. */
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

        /* The station's own light spilling under the fan. */
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

        /* A landing station washes the screen once, then decays. */
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
       the body only reveals the wheel, the format readout and the volume, and
       never interrupts the station. */
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
    if (menuBtn) menuBtn.addEventListener('click', shuffleStation);

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
       steps up and down the dial on release. A live stream has no position to
       scrub, so the gesture that used to seek tunes instead. */
    if (wheel) {
        let drag = null;

        wheel.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.pod-wheel-hub')) return; /* mute is its own key */
            /* No capture yet on purpose: capturing on press retargets the click
               to the wheel and swallows the band the finger pressed. Capture is
               taken on the first real move, once this is definitely a drag. */
            drag = { id: e.pointerId, x: e.clientX, moved: false };
        });

        wheel.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 10) {
                drag.moved = true;
                try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
                pod.classList.add('is-tuning');
            }
        });

        const endDrag = (e, cancelled) => {
            if (!drag || (e && e.pointerId !== drag.id)) return;
            const dx = e.clientX - drag.x;
            const wasDrag = drag.moved;
            drag = null;
            pod.classList.remove('is-tuning');
            if (!wasDrag) return;

            swipeClick(wheel);
            if (cancelled || Math.abs(dx) < 10) return;
            if (dx < 0) next();
            else previous();
        };

        wheel.addEventListener('pointerup', endDrag);
        wheel.addEventListener('pointercancel', (e) => endDrag(e, true));

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
        get station() { return state.station ? state.station.id : ''; },
        get song() { return state.now; },
        get playing() { return state.playing; },
        get blocked() { return state.blocked; },
        get muted() { return state.muted; },
        get volume() { return state.volume; },
        get dial() { return STATIONS.map((s) => s.id); },
        get dead() { return Array.from(state.dead); },
        get time() { return readTime(); },
        get stream() { return state.audio ? (state.audio.currentSrc || '') : ''; },
        get signal() { return { running: scope.running, frames: scope.raf, w: scope.w, h: scope.h }; },
    };

    /* -----------------------------------------------------------------------
       13. Boot

       Nothing to press and nothing to opt into: the pod tunes the dial and
       starts. The sound arrives on the first gesture, by itself; until then the
       station runs muted with the signal drawing it.
       --------------------------------------------------------------------- */
    paintStation(STATIONS[0]);
    sizeScope();

    function boot() {
        if (state.audio || state.lost) return;
        whenIdle(() => { createTransport(); });
    }

    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
        window.addEventListener(ev, () => { state.gestured = true; }, { capture: true, passive: true, once: true });
    });

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });

    window.addEventListener('resize', paintOnce);
    if (typeof ResizeObserver === 'function' && stage) {
        try { new ResizeObserver(() => paintOnce()).observe(stage); } catch (err) { /* fine */ }
    }

    /* A hidden tab draws nothing; a returning tab picks the signal back up and
       asks the feed what came on while nobody was looking. */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopSignal();
        else if (state.playing) startSignal();
        if (!document.hidden && state.station) pollNow(0);
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