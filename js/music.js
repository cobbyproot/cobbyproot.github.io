/* =============================================================================
   THE CRATE — hero instrument (js/music.js)

   The music lives entirely in the hero's right-hand HUD widget now. There is
   no music tab: the tiny box IS the player.

   The loop, in order:
     gesture (first tap/click anywhere) → the mini case spins (a real CS2-style
     strip that decelerates onto a winner) → the winner plays at low volume →
     when it ends, the case spins again for another song.

   The song list comes from your own Spotify playlists: live from
   server/spotify-proxy.mjs (/api/spotify/tracks) when it runs locally, or
   from data/playlist.json, which a daily GitHub Action rebuilds for the live
   site. Each title is resolved to a real 30-second Deezer preview at the
   moment it plays. With neither source the crate falls back to the Deezer
   seed catalogue, so it is never empty.

   Two hard rules from the measurement pass, both load-bearing:
     1. Deezer is reached through JSONP only. A plain fetch() is CORS-blocked.
     2. Preview URLs are signed and expire, so the catalogue stores ids/titles;
        the URL is resolved fresh at the moment of playback.
   ========================================================================== */
(() => {
    'use strict';

    /* -----------------------------------------------------------------------
       0. The governor
       --------------------------------------------------------------------- */
    const perf = window.CobbyPerf;
    const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

    const trims = () => {
        try {
            if (perf && typeof perf.trimsMotion === 'function') return perf.trimsMotion();
        } catch (err) { /* a broken governor is not a broken crate */ }
        return reducedMQ.matches;
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

    const widget = $('crate-widget');
    const slot = $('crate-slot');
    const slotArt = $('crate-slot-art');
    const eqCanvas = $('crate-eq');
    const statusEl = $('crate-status');
    const tierEl = $('crate-tier');
    const titleEl = $('crate-track-title');
    const artistEl = $('crate-track-artist');
    const playBtn = $('crate-play');
    const muteBtn = $('crate-mute');
    const nextBtn = $('crate-next');
    const volumeEl = $('crate-volume');
    const progressFill = $('crate-progress-fill');
    const clockEl = $('crate-current-time');
    const caseEl = $('crate-case');
    const caseReel = $('crate-case-reel');

    if (!widget || !slot) return;

    /* -----------------------------------------------------------------------
       2. Constants
       --------------------------------------------------------------------- */
    const DEEZER = 'https://api.deezer.com/';
    const LANYARD = 'https://api.lanyard.rest/v1/users/1119272682953900034';
    const SPOTIFY_PROXY = '/api/spotify/tracks';
    const SPOTIFY_FILE = 'data/playlist.json';

    /* The hero instrument plays at low volume by default — an ambience, not a
       broadcast. The slider owns the real level; mute silences without moving
       the slider, so unmuting restores exactly what was dialled in. */
    const DEFAULT_VOLUME = 0.05;

    const CASE_CELLS = 18;        /* cells in the mini strip */
    const CASE_WIN = 9;           /* the winner sits mid-strip */
    const CASE_SPIN_MS = 2600;    /* a miniature of the tab's 4200ms pull */
    const CASE_FADE_MS = 320;     /* reel fade-in at the start of a pull */
    const CASE_WIND_MS = 120;

    /* Songs swell in and ebb out instead of starting and cutting dead. */
    const FADE_IN_MS = 1800;
    const FADE_PAUSE_MS = 450;    /* pause from the transport */
    const FADE_SKIP_MS = 900;     /* the outgoing song under a NEXT spin */
    /* The hand-off: this many seconds before a preview ends, the case starts
       spinning for the next song while the current one fades out beneath it,
       so the new song lands right as the old one goes quiet. */
    const HANDOFF_S = 3.4;

    /* 20 seeds — the fallback catalogue when the Spotify mirror is down. */
    const SEEDS = [
        { q: 'Hoang Dung', covert: true },
        { q: 'Wren Evans', covert: true },
        { q: 'RPT MCK', covert: true },
        { q: 'Vu Cat Tien' },
        { q: 'HIEUTHUHAI' },
        { q: 'Quang Hung MasterD' },
        { q: 'Tang Duy Tan' },
        { q: 'GREY D' },
        { q: 'ERIK' },
        { q: 'Phuong Ly' },
        { q: 'Orange' },
        { q: 'PHUC DU' },
        { q: 'tlinh' },
        { q: 'Suboi' },
        { q: 'Vu.' },
        { q: 'Mono' },
        { q: 'Andree' },
        { q: 'B Ray' },
        { q: 'Low G' },
        { q: 'HURRYKNG' },
    ];

    /* A real, verified preview so the crate can always play something even
       while the Spotify mirror and the Deezer seeds are still loading. */
    const FALLBACK_TRACK = {
        id: '1498454112',
        title: 'Nàng Thơ',
        artist: 'Hoàng Dũng',
        album: 'Yên - EP',
        cover: '',
        coverBig: '',
        preview: 'https://cdnt-preview.dzcdn.net/api/1/1/b/9/b/0/b9b6e34d1e87652cb998a52f277cc21c.mp3',
        duration: 30,
        covert: false,
        source: 'deezer',
    };

    /* -----------------------------------------------------------------------
       3. State
       --------------------------------------------------------------------- */
    const state = {
        catalogue: [],
        loading: false,
        loadedOnce: false,
        failed: false,
        live: null,
        current: null,          /* the last pull: {track, rarity} */
        playing: false,
        resolved: null,
        retried: false,
        auto: false,            /* the hero box auto-spins through the set */
        autoChain: 0,
        spinning: false,        /* the mini case is mid-spin */
        muted: false,
        volume: DEFAULT_VOLUME,
        spotifyTracks: [],
        eqRaf: 0,
    };

    /* -----------------------------------------------------------------------
       4. Small utilities
       --------------------------------------------------------------------- */
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const mmss = (sec) => {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    };

    /* Both languages, always, in that order. */
    const pair = (en, vi) => `<span lang="en">${esc(en)}</span><span lang="vi">${esc(vi)}</span>`;

    function setStatus(en, vi) {
        if (!statusEl) return;
        const e = statusEl.querySelector('[lang="en"]');
        const v = statusEl.querySelector('[lang="vi"]');
        if (e) e.textContent = en;
        if (v) v.textContent = vi;
    }

    /* -----------------------------------------------------------------------
       5. The wire — Deezer over JSONP
       --------------------------------------------------------------------- */
    function deezerJsonp(url) {
        return new Promise((resolve, reject) => {
            const cb = '__dz' + Math.random().toString(36).slice(2);
            const s = document.createElement('script');
            const cleanup = () => {
                clearTimeout(t);
                delete window[cb];
                if (s.parentNode) s.remove();
            };
            const t = setTimeout(() => { cleanup(); reject(new Error('deezer timeout')); }, 9000);
            window[cb] = (d) => { cleanup(); resolve(d); };
            s.onerror = () => { cleanup(); reject(new Error('deezer script error')); };
            s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'output=jsonp&callback=' + cb;
            s.async = true;
            document.head.appendChild(s);
        });
    }

    /* -----------------------------------------------------------------------
       6. The catalogue — Deezer seeds (fallback)
       --------------------------------------------------------------------- */
    function normalise(raw, covert) {
        if (!raw || !raw.id) return null;
        if (!raw.preview || typeof raw.preview !== 'string') return null;
        const title = raw.title_short || raw.title || '';
        const artist = raw.artist && raw.artist.name ? raw.artist.name : '';
        if (!title || !artist) return null;
        const album = raw.album || {};
        return {
            id: String(raw.id),
            title: title,
            artist: artist,
            album: album.title || '',
            cover: album.cover_medium || album.cover_big || '',
            coverBig: album.cover_big || album.cover_medium || '',
            preview: raw.preview,
            duration: typeof raw.duration === 'number' ? raw.duration : 30,
            covert: !!covert,
            source: 'deezer',
        };
    }

    async function loadCatalogue() {
        if (state.loading || state.loadedOnce) return;
        state.loading = true;
        state.failed = false;

        const seen = new Set();
        const out = [];

        for (let i = 0; i < SEEDS.length; i += 3) {
            const wave = SEEDS.slice(i, i + 3);
            const results = await Promise.all(wave.map((seed) =>
                deezerJsonp(DEEZER + 'search?q=' + encodeURIComponent(seed.q) + '&limit=5')
                    .then((d) => ({ seed, data: (d && Array.isArray(d.data)) ? d.data : [] }))
                    .catch(() => ({ seed, data: [] }))
            ));
            results.forEach(({ seed, data }) => {
                data.forEach((raw) => {
                    const track = normalise(raw, seed.covert);
                    if (!track) return;
                    if (seen.has(track.id)) return;
                    seen.add(track.id);
                    out.push(track);
                });
            });
            if (out.length >= 12 && !state.catalogue.length) {
                state.catalogue = out.slice();
                afterCatalogue();
            }
        }

        state.catalogue = out;
        state.loading = false;
        state.loadedOnce = true;
        state.failed = out.length === 0;
        afterCatalogue();
        expose();
    }

    function afterCatalogue() {
        if (!state.catalogue.length) {
            setStatus('wire down — retrying', 'mất sóng — thử lại');
            return;
        }
        setStatus('crate loaded', 'thùng đã nạp');
        if (playBtn) playBtn.disabled = false;
    }

    /* -----------------------------------------------------------------------
       6b. The playlist — Spotify, mirrored
       --------------------------------------------------------------------- */
    function spotifyTrackToCrate(t, i) {
        return {
            id: 'spotify:' + (t.id || 'i' + i),
            title: String(t.title || '').trim(),
            artist: String(t.artist || '').trim(),
            album: t.album || '',
            cover: t.cover || '',
            coverBig: t.cover || '',
            preview: '',
            duration: 30,
            covert: false,
            source: 'spotify',
        };
    }

    async function readTrackList(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(url + ' ' + res.status);
        const body = await res.json();
        const raw = Array.isArray(body.tracks) ? body.tracks : [];
        const tracks = raw.map(spotifyTrackToCrate).filter((t) => t.title && t.artist);
        if (!tracks.length) throw new Error('empty playlist');
        return tracks;
    }

    /* The live proxy when it is running (local dev), else the file the daily
       GitHub Action builds (the live site on GitHub Pages), else Deezer. */
    async function hydrateSpotify() {
        let tracks = null;
        for (const url of [SPOTIFY_PROXY, SPOTIFY_FILE]) {
            try { tracks = await readTrackList(url); break; } catch (err) { /* next source */ }
        }
        if (!tracks) { loadCatalogue(); return; }
        state.spotifyTracks = tracks;
        state.catalogue = tracks.slice();
        state.loading = false;
        state.loadedOnce = true;
        state.failed = false;
        afterCatalogue();
        expose();
    }

    /* -----------------------------------------------------------------------
       7. The live channel — Lanyard (legendary tier only)
       --------------------------------------------------------------------- */
    async function pollLive() {
        try {
            const res = await fetch(LANYARD, { cache: 'no-store' });
            if (!res.ok) throw new Error('lanyard ' + res.status);
            const body = await res.json();
            const d = body && body.data;
            if (body && body.success && d && d.listening_to_spotify && d.spotify) {
                state.live = {
                    title: d.spotify.song || '',
                    artist: d.spotify.artist || '',
                    cover: d.spotify.album_art_url || '',
                };
            } else {
                state.live = null;
            }
        } catch (err) {
            state.live = null;
        }
        applyLive();
        scheduleLive();
    }

    let liveTimer = 0;
    function scheduleLive() {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(() => {
            if (document.hidden) { scheduleLive(); return; }
            pollLive();
        }, stretchPoll(20000));
    }

    function applyLive() {
        const live = state.live;
        if (widget) widget.classList.toggle('is-live', !!live);
    }

    /* -----------------------------------------------------------------------
       8. The pick

       The rarity is a colour, not a promise. One random roll for the tier
       badge; with no live track the legendary slice collapses into covert.
       --------------------------------------------------------------------- */
    function pickDrop() {
        const live = state.live;
        const roll = Math.random() * 100;
        let rarity;
        if (live && roll < 8) {
            rarity = 'legendary';
        } else if (roll < 35) {
            rarity = 'covert';
        } else {
            rarity = 'classified';
        }

        if (rarity === 'legendary' && live) {
            return {
                rarity: 'legendary',
                track: {
                    id: null,
                    title: live.title,
                    artist: live.artist,
                    album: '',
                    cover: live.cover,
                    coverBig: live.cover,
                    preview: '',
                    isLive: true,
                },
            };
        }
        const pool = state.catalogue.filter((t) => rarity === 'covert' ? t.covert : !t.covert);
        const fallback = pool.length ? pool : state.catalogue;
        const track = fallback.length ? pick(fallback) : pick(state.catalogue);
        if (!track) {
            /* The catalogue is still on its way (or every wire is down). Play
               a known, real preview so the button always does something. */
            return { rarity: 'classified', track: FALLBACK_TRACK };
        }
        return { rarity, track };
    }

    /* -----------------------------------------------------------------------
       9. The mini case

       The CS2 strip in miniature. A row of covers decelerates onto the winner
       under a fixed reticle, then the winner plays. Driven by CSS transition
       so reduced-motion can flatten it in one rule.
       --------------------------------------------------------------------- */
    function caseCellW() {
        const first = caseReel && caseReel.firstElementChild;
        if (first && first.getBoundingClientRect().width > 4) {
            return first.getBoundingClientRect().width;
        }
        const declared = parseFloat(getComputedStyle(caseEl || widget).getPropertyValue('--case-cell-w'));
        return declared > 0 ? declared : 44;
    }

    function buildCaseReel(drop) {
        if (!caseReel) return;
        const winner = drop.track;
        const pool = state.catalogue.slice();
        const frag = document.createDocumentFragment();

        for (let i = 0; i < CASE_CELLS; i++) {
            const cell = document.createElement('div');
            const isWin = i === CASE_WIN;
            cell.className = 'crate-case-cell' + (isWin ? ' rarity-' + drop.rarity : '');
            const track = (isWin || !pool.length) ? winner : pool[i % pool.length];
            const cover = track.cover || track.coverBig || '';
            if (cover) {
                cell.innerHTML = '<img alt="" decoding="async" src="' + esc(cover) + '">';
            }
            frag.appendChild(cell);
        }
        caseReel.innerHTML = '';
        caseReel.appendChild(frag);
    }

    /* Places the strip so cell `index` sits under the reticle. */
    function caseReelX(index) {
        const w = caseEl ? caseEl.clientWidth : 0;
        const cw = caseCellW();
        const gap = parseFloat(getComputedStyle(caseReel).columnGap || getComputedStyle(caseReel).gap) || 6;
        return (w || 240) / 2 - (index * (cw + gap) + cw / 2);
    }

    function caseSpinTo(index) {
        return new Promise((resolve) => {
            if (!caseReel) { resolve(); return; }

            /* The pull always plays, even on gear the governor trims: it is
               the instrument's whole show, and one transform is cheap. */
            const w = caseEl.clientWidth || 240;
            const cw = caseCellW();
            const start = w / 2 - cw / 2;
            caseReel.style.transition = 'none';
            caseReel.style.opacity = '0';
            caseReel.style.transform = 'translate3d(' + start.toFixed(2) + 'px, -50%, 0)';
            void caseReel.offsetWidth; /* flush, so the run reads as motion */

            /* Softer launch than before, long glide into the winner; the reel
               fades in over the first few hundred ms instead of popping. */
            caseReel.style.transition =
                'transform ' + CASE_SPIN_MS + 'ms cubic-bezier(0.22, 0.61, 0.18, 1), ' +
                'opacity ' + CASE_FADE_MS + 'ms ease-out';
            caseReel.style.opacity = '1';
            caseReel.style.transform = 'translate3d(' + caseReelX(index).toFixed(2) + 'px, -50%, 0)';

            /* The ratchet: one tick each time a cell crosses the reticle,
               read off the reel's live position so the clicks slow down
               exactly as the strip does. */
            const pitch = cw + (parseFloat(getComputedStyle(caseReel).columnGap) || 6);
            let lastCell = null;
            let tickRaf = 0;
            const watch = () => {
                const m = getComputedStyle(caseReel).transform;
                const x = m && m !== 'none' ? new DOMMatrixReadOnly(m).m41 : start;
                const cell = Math.floor((w / 2 - x) / pitch);
                if (lastCell !== null && cell !== lastCell) playTick();
                lastCell = cell;
                tickRaf = requestAnimationFrame(watch);
            };
            tickRaf = requestAnimationFrame(watch);

            let settled = false;
            const done = (e) => {
                /* the opacity fade ends first; only the transform means "landed" */
                if (e && e.propertyName && e.propertyName !== 'transform') return;
                if (settled) return;
                settled = true;
                cancelAnimationFrame(tickRaf);
                caseReel.removeEventListener('transitionend', done);
                playLand();
                resolve();
            };
            caseReel.addEventListener('transitionend', done);
            setTimeout(done, CASE_SPIN_MS + 120);
        });
    }

    function setCaseSpinning(on) {
        if (caseEl) caseEl.classList.toggle('is-spinning', !!on);
        if (slot) slot.classList.toggle('is-spinning', !!on);
    }

    /* Spin sounds, synthesized rather than fetched: a dry plastic tick per
       cell and a two-note chime on the land. They ride the music's volume
       dial (and mute), a little louder so they read over a quiet song. They
       need a running AudioContext, so before the visitor's first gesture the
       spin is simply silent. */
    function sfxGain() {
        if (state.muted) return 0;
        return clamp(state.volume * 2.2, 0, 0.35);
    }

    function playTick() {
        const g = sfxGain();
        if (!g || !ctx || ctx.state !== 'running') return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2300 + Math.random() * 250, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.03);
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.exponentialRampToValueAtTime(g, t + 0.002);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        osc.connect(amp).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    function playLand() {
        const g = sfxGain();
        if (!g || !ctx || ctx.state !== 'running') return;
        const t = ctx.currentTime;
        [[880, 0], [1320, 0.07]].forEach(([f, at]) => {
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t + at);
            amp.gain.setValueAtTime(0.0001, t + at);
            amp.gain.exponentialRampToValueAtTime(g * 0.8, t + at + 0.01);
            amp.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.5);
            osc.connect(amp).connect(ctx.destination);
            osc.start(t + at);
            osc.stop(t + at + 0.55);
        });
    }

    /* -----------------------------------------------------------------------
       10. The instrument — hero readout
       --------------------------------------------------------------------- */
    function paintHero(drop) {
        const t = drop.track;
        slot.classList.remove('is-empty', 'is-loaded', 'is-playing',
            'rarity-legendary', 'rarity-covert', 'rarity-classified');
        slot.classList.add('is-loaded', 'rarity-' + drop.rarity);

        if (slotArt && (t.cover || t.coverBig)) {
            slotArt.src = t.cover || t.coverBig;
            slotArt.alt = t.title + ' — ' + t.artist;
        }
        if (titleEl) titleEl.textContent = t.title;
        if (artistEl) artistEl.textContent = t.artist;
        if (tierEl) tierEl.innerHTML = pair(drop.rarity, drop.rarity);
        widget.classList.toggle('is-live', !!state.live && drop.rarity === 'legendary');
        if (playBtn) playBtn.disabled = false;

        if (state.playing) {
            slot.classList.add('is-playing');
            setStatus('now spinning', 'đang phát');
        } else {
            setStatus('case loaded', 'thùng đã nạp');
        }
    }

    function paintPlaying(on) {
        state.playing = !!on;
        if (widget) widget.classList.toggle('is-playing', !!on);
        if (slot) slot.classList.toggle('is-playing', !!on && !!state.current);
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon) icon.className = on ? 'fas fa-pause' : 'fas fa-play';
            playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
        }
        if (on) {
            setStatus('now spinning', 'đang phát');
        } else if (state.current) {
            setStatus('case loaded', 'thùng đã nạp');
        }
        if (on) startEq(); else stopEq();
    }

    /* -----------------------------------------------------------------------
       11. Sound
       --------------------------------------------------------------------- */
    const audio = document.createElement('audio');
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audio.setAttribute('playsinline', '');
    audio.style.display = 'none';
    audio.volume = DEFAULT_VOLUME;
    document.body.appendChild(audio);

    let ctx = null;
    let analyser = null;
    let sourceNode = null;
    let graphOn = false;
    let eqColors = null;

    function ensureAudioCtx() {
        if (ctx) {
            if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
                try { ctx.resume().catch(() => {}); } catch (err) { /* headless */ }
            }
            return ctx;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (err) { ctx = null; return null; }
        if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
            try { ctx.resume().catch(() => {}); } catch (err) { /* expected without a gesture */ }
        }
        if (typeof ctx.addEventListener === 'function') {
            ctx.addEventListener('statechange', () => { if (ctx.state === 'running') connectGraph(); });
        }
        connectGraph();
        return ctx;
    }

    function connectGraph() {
        if (graphOn || !ctx || ctx.state !== 'running') return false;
        try {
            analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.78;
            sourceNode = ctx.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(ctx.destination);
            graphOn = true;
            return true;
        } catch (err) {
            graphOn = false;
            return false;
        }
    }

    /* -----------------------------------------------------------------------
       12. Resolving a playable URL

       A mirrored Spotify track has no preview of its own; find the same song
       on Deezer and cache the hit on the track.
       --------------------------------------------------------------------- */
    async function freshPreview(id) {
        if (!id) return '';
        try {
            const d = await deezerJsonp(DEEZER + 'track/' + encodeURIComponent(id));
            if (d && typeof d.preview === 'string' && d.preview) {
                state.resolved = { id: String(id), url: d.preview, at: Date.now() };
                return d.preview;
            }
        } catch (err) { /* fall through */ }
        return '';
    }

    async function resolvePreview(track) {
        if (track.isLive) {
            try {
                const d = await deezerJsonp(DEEZER + 'search?q='
                    + encodeURIComponent(track.title + ' ' + track.artist) + '&limit=3');
                const hit = (d && Array.isArray(d.data)) ? d.data.find((x) => x && x.preview) : null;
                if (hit) {
                    track.preview = hit.preview;
                    state.resolved = { id: track.id, url: hit.preview, at: Date.now() };
                    return hit.preview;
                }
            } catch (err) { /* no preview */ }
            return '';
        }
        if (track.source === 'spotify') {
            if (track.preview) {
                state.resolved = { id: track.id, url: track.preview, at: Date.now() };
                return track.preview;
            }
            /* Spotify titles carry soundtrack tags and long featured-artist
               lists that Deezer's search chokes on, so try the full name
               first, then the bare title with the lead artist, then the
               bare title alone. */
            const bare = track.title
                .replace(/\s*[\(\[].*?[\)\]]/g, '')
                .replace(/\s+-\s+.*$/, '')
                .replace(/^['"]|['"]$/g, '')
                .trim() || track.title;
            const lead = track.artist.split(',')[0].trim();
            const queries = [
                (track.title + ' ' + track.artist).trim(),
                (bare + ' ' + lead).trim(),
                bare,
            ].filter((q, i, all) => q && all.indexOf(q) === i);
            for (const q of queries) {
                try {
                    const d = await deezerJsonp(DEEZER + 'search?q=' + encodeURIComponent(q) + '&limit=8');
                    const hits = ((d && Array.isArray(d.data)) ? d.data : []).filter((x) => x && x.preview);
                    if (!hits.length) continue;
                    /* On the loosest query, insist on the right title so an
                       unrelated song with a common name never plays instead. */
                    const want = bare.toLowerCase();
                    const hit = q === bare
                        ? hits.find((x) => String(x.title || '').toLowerCase().indexOf(want) === 0)
                        : (hits.find((x) => String(x.title || '').toLowerCase().indexOf(want) === 0) || hits[0]);
                    if (!hit) continue;
                    track.preview = hit.preview;
                    state.resolved = { id: track.id, url: hit.preview, at: Date.now() };
                    return hit.preview;
                } catch (err) { /* next query */ }
            }
            return '';
        }
        const fresh = await freshPreview(track.id);
        return fresh || track.preview || '';
    }

    /* -----------------------------------------------------------------------
       13. Playback

       Every level change goes through the fader. `fade.level` is a 0..1
       envelope multiplied onto the slider's volume, so dragging the dial
       mid-fade never jumps.
       --------------------------------------------------------------------- */
    let playToken = 0;
    const fade = { level: 0, raf: 0, tailing: false };

    function applyVolume() {
        audio.volume = clamp(state.volume * fade.level, 0, 1);
    }

    /* Ramp the envelope to `target`; resolves when it gets there or when a
       newer fade takes over. Timer-driven rather than rAF so a background tab
       still lands its fade-out instead of hanging at half volume. */
    function fadeTo(target, ms) {
        clearInterval(fade.raf);
        return new Promise((resolve) => {
            const from = fade.level;
            if (ms <= 0 || from === target) {
                fade.level = target;
                applyVolume();
                resolve();
                return;
            }
            const t0 = performance.now();
            fade.raf = setInterval(() => {
                const p = clamp((performance.now() - t0) / ms, 0, 1);
                /* ease-in-out: the ear hears a linear ramp as abrupt at the ends */
                const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                fade.level = from + (target - from) * e;
                applyVolume();
                if (p >= 1) { clearInterval(fade.raf); resolve(); }
            }, 30);
        });
    }

    /* Autoplay policy: a page may not start sound before the visitor has
       touched it. If the browser refuses, the song stays loaded and starts —
       faded in — on the first tap, click, key or scroll anywhere. */
    let waitingForGesture = false;

    function playWithFade() {
        fade.tailing = false;
        fade.level = 0;
        applyVolume();
        let p;
        try { p = audio.play(); } catch (err) { p = Promise.reject(err); }
        return Promise.resolve(p).then(() => {
            fadeTo(1, FADE_IN_MS);
            return true;
        }, () => {
            armGesture();
            return false;
        });
    }

    function armGesture() {
        if (waitingForGesture) return;
        waitingForGesture = true;
        setStatus('tap anywhere for sound', 'chạm để bật nhạc');
        const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
        const go = () => {
            events.forEach((ev) => window.removeEventListener(ev, go, true));
            waitingForGesture = false;
            ensureAudioCtx();
            if (!state.auto) return;
            if (audio.src && audio.src.indexOf('data:') !== 0 && audio.paused) playWithFade();
            else if (!audio.src) autoNext();
        };
        events.forEach((ev) => window.addEventListener(ev, go, { capture: true, passive: true }));
    }

    async function startPlayback(drop, previewPromise) {
        const token = ++playToken;
        const url = await previewPromise;
        if (token !== playToken) return null;

        if (!url) { return false; }   /* the chain skips it: no preview, no stall */

        audio.src = url;
        audio.currentTime = 0;
        audio.muted = state.muted;
        playWithFade();
        return true;
    }

    audio.addEventListener('playing', () => {
        if (audio.src.indexOf('data:') === 0) return;
        paintPlaying(true);
        state.retried = false;
    });

    audio.addEventListener('pause', () => {
        if (audio.ended || audio.src.indexOf('data:') === 0) return;
        paintPlaying(false);
    });

    audio.addEventListener('ended', () => {
        paintPlaying(false);
        if (progressFill) progressFill.style.width = '100%';
        if (clockEl) clockEl.textContent = mmss(audio.duration || 30);
        /* Normally the hand-off already started the next spin; this only
           catches a song that ended without one (seeked past it, say). */
        if (state.auto && !state.spinning) autoNext();
    });

    audio.addEventListener('timeupdate', () => {
        const d = audio.duration;
        if (!isFinite(d) || d <= 0) return;
        const left = d - audio.currentTime;
        if (!fade.tailing && !audio.paused && left <= HANDOFF_S) {
            fade.tailing = true;
            /* The old song is gone by the time the next one lands. */
            fadeTo(0, Math.max(300, Math.min(left, HANDOFF_S - 0.5) * 1000));
            if (state.auto && !state.spinning) pullOnce();
        }
        const pct = clamp((audio.currentTime / d) * 100, 0, 100);
        if (progressFill) progressFill.style.width = pct.toFixed(2) + '%';
        if (clockEl) clockEl.textContent = mmss(audio.currentTime);
        const bar = progressFill && progressFill.parentElement;
        if (bar) bar.setAttribute('aria-valuenow', Math.round(pct));
    });

    audio.addEventListener('error', async () => {
        if (!state.current || state.retried) return;
        const track = state.current.track;
        if (!track || !track.id) return;
        state.retried = true;
        const fresh = await freshPreview(track.id);
        if (!fresh || fresh === audio.src) return;
        audio.src = fresh;
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => paintPlaying(false));
    });

    /* -----------------------------------------------------------------------
       14. The spectrum
       --------------------------------------------------------------------- */
    function readEqColors() {
        if (eqColors) return eqColors;
        try {
            const cs = getComputedStyle(document.documentElement);
            const a = (cs.getPropertyValue('--holo-1-rgb') || '0, 240, 212').trim();
            const b = (cs.getPropertyValue('--holo-2-rgb') || '255, 45, 149').trim();
            eqColors = { a: a, b: b };
        } catch (err) {
            eqColors = { a: '0, 240, 212', b: '255, 45, 149' };
        }
        return eqColors;
    }

    let freq = null;

    function startEq() {
        if (!eqCanvas) return;
        stopEq();
        const g = eqCanvas.getContext('2d');
        if (!g) return;
        const colors = readEqColors();
        const W = eqCanvas.width;
        const H = eqCanvas.height;
        const bars = 11;
        const gap = 3;
        const barW = (W - gap * (bars - 1)) / bars;
        const t0 = performance.now();
        let last = 0;
        if (graphOn && analyser) freq = new Uint8Array(analyser.frequencyBinCount);

        const draw = (now) => {
            if (now - last < 33) {
                state.eqRaf = requestAnimationFrame(draw);
                return;
            }
            last = now;
            const t = (now - t0) / 1000;
            g.clearRect(0, 0, W, H);

            let values;
            if (graphOn && analyser) {
                analyser.getByteFrequencyData(freq);
                values = [];
                for (let i = 0; i < bars; i++) {
                    const idx = Math.floor((i / bars) * (freq.length * 0.72)) + 1;
                    values.push((freq[idx] || 0) / 255);
                }
            } else {
                values = [];
                for (let i = 0; i < bars; i++) {
                    const s = Math.sin(t * 2.1 + i * 0.9) * Math.sin(t * 0.73 + i * 1.7);
                    values.push(0.24 + Math.abs(s) * 0.62);
                }
            }

            for (let i = 0; i < bars; i++) {
                const v = clamp(values[i], 0, 1);
                const h = Math.max(2, v * (H - 14));
                const x = i * (barW + gap);
                const y = H - h - 4;
                const mix = i / (bars - 1);
                g.fillStyle = 'rgba(' + colors.a + ',' + (0.95 - mix * 0.25).toFixed(2) + ')';
                g.fillRect(x, y, barW, h);
                g.fillStyle = 'rgba(' + colors.b + ',' + (0.5 + mix * 0.4).toFixed(2) + ')';
                g.fillRect(x, y, barW, 2);
            }

            g.fillStyle = 'rgba(' + colors.a + ',0.18)';
            g.fillRect(0, H - 3, W, 1);

            state.eqRaf = requestAnimationFrame(draw);
        };
        state.eqRaf = requestAnimationFrame(draw);
    }

    function stopEq() {
        cancelAnimationFrame(state.eqRaf);
        state.eqRaf = 0;
        if (!eqCanvas) return;
        const g = eqCanvas.getContext('2d');
        if (g) g.clearRect(0, 0, eqCanvas.width, eqCanvas.height);
    }

    /* -----------------------------------------------------------------------
       15. The pull — spin the mini case, land, play

       One function, the same shape the old tab's openCase had: choose the
       drop, resolve its URL while the strip moves, spin, land, reveal, play.
       --------------------------------------------------------------------- */
    async function pullOnce() {
        if (state.spinning) return;
        state.spinning = true;
        state.retried = false;

        /* Before the catalogue lands, pull the known preview so the first
           spin never waits on the network. */
        const drop = state.catalogue.length
            ? pickDrop()
            : { rarity: 'classified', track: FALLBACK_TRACK };
        state.current = drop;

        const previewPromise = resolvePreview(drop.track);
        buildCaseReel(drop);
        setCaseSpinning(true);

        await caseSpinTo(CASE_WIN);

        const winCell = caseReel && caseReel.children[CASE_WIN];
        if (winCell) winCell.classList.add('is-win');

        await sleep(420);
        setCaseSpinning(false);
        paintHero(drop);
        state.spinning = false;
        const played = await startPlayback(drop, previewPromise);
        /* A song with no playable preview never fires `ended`, so skip ahead
           instead of stalling on silence. */
        if (played === false && state.auto) setTimeout(autoNext, 900);
        return drop;
    }

    /* -----------------------------------------------------------------------
       16. The auto chain

       The crate starts itself once the loader lifts and spins to a new song
       after every ending, forever, until the visitor pauses.
       --------------------------------------------------------------------- */
    function autoNext() {
        if (!state.auto || state.spinning) return;
        const chain = ++state.autoChain;
        whenIdle(() => {
            if (chain !== state.autoChain || !state.auto) return;
            pullOnce();
        });
    }

    function setAuto(on) {
        state.auto = !!on;
        if (widget) widget.classList.toggle('is-auto', !!on);
    }

    /* -----------------------------------------------------------------------
       17. Wiring — the transport
       --------------------------------------------------------------------- */
    if (playBtn) {
        playBtn.disabled = false;
        playBtn.addEventListener('click', () => {
            ensureAudioCtx();
            setAuto(true);
            if (!state.current || !audio.src || audio.src.indexOf('data:') === 0) {
                pullOnce();
                return;
            }
            if (audio.paused) {
                playWithFade();
            } else {
                const token = playToken;
                fadeTo(0, FADE_PAUSE_MS).then(() => { if (token === playToken) audio.pause(); });
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (state.spinning) return;
            ensureAudioCtx();
            setAuto(true);
            /* Same shape as the natural hand-off, just sooner: the current
               song sinks under the spin instead of stopping dead. */
            fade.tailing = true;
            if (!audio.paused) fadeTo(0, FADE_SKIP_MS);
            pullOnce();
        });
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            state.muted = !state.muted;
            audio.muted = state.muted;
            muteBtn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
            const icon = muteBtn.querySelector('i');
            if (icon) icon.className = state.muted ? 'fas fa-volume-xmark' : 'fas fa-volume-up';
            if (state.muted) setStatus('muted', 'đã tắt tiếng');
            else if (state.playing) setStatus('now spinning', 'đang phát');
            else if (state.current) setStatus('case loaded', 'thùng đã nạp');
        });
    }

    if (volumeEl) {
        volumeEl.addEventListener('input', () => {
            state.volume = clamp(Number(volumeEl.value) / 100, 0, 1);
            applyVolume();
            /* Dragging volume unmutes: the dial is the source of truth. */
            if (state.muted) {
                state.muted = false;
                audio.muted = false;
                if (muteBtn) muteBtn.setAttribute('aria-pressed', 'false');
                const icon = muteBtn && muteBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-volume-up';
            }
        });
    }

    /* -----------------------------------------------------------------------
       18. Diagnostics
       --------------------------------------------------------------------- */
    function expose() {
        window.__crate = {
            get catalogue() { return state.catalogue.length; },
            get ready() { return state.catalogue.length > 0; },
            get lastPull() { return state.current; },
            get previewUrl() { return (state.resolved && state.resolved.url) || ''; },
            get playing() { return state.playing; },
            get live() { return state.live; },
            get auto() { return state.auto; },
            get muted() { return state.muted; },
            get volume() { return state.volume; },
            get spotifyTracks() { return state.spotifyTracks.length; },
            get audioSrc() { return audio.src || ''; },
            get graph() { return graphOn; },
        };
    }
    expose();

    /* -----------------------------------------------------------------------
       19. Boot
       --------------------------------------------------------------------- */
    setStatus('crate idle', 'thùng đang trống');
    if (playBtn) playBtn.disabled = false;

    /* No play button: the crate spins up by itself the moment the loader
       lifts. If the browser blocks sound until a gesture, the spin and the
       readout still run and the song fades in on the first touch. */
    let autoStarted = false;
    const autoStart = () => {
        if (autoStarted) return;
        autoStarted = true;
        setAuto(true);
        ensureAudioCtx();
        pullOnce();
    };

    const boot = () => {
        whenIdle(() => { hydrateSpotify(); });
        scheduleLive();
        if (!document.body.classList.contains('booting')) autoStart();
    };

    document.addEventListener('boot:lifted', autoStart, { once: true });
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });
})();
