/* =============================================================================
   COBBY — TRAVEL · the globe
   -----------------------------------------------------------------------------
   A plotting instrument, not a screensaver.

   The earth is drawn with Canvas 2D and a projection written here: an
   orthographic sphere, rotated by yaw/pitch, with 110m coastlines stroked as
   hairlines, a 15° graticule, a bezel of tick marks around the limb, and a
   vignette that does the curvature work a texture would normally do. No WebGL,
   no three.js, no image of the earth.

   Every convention in FLIGHTS is a real one, with its real city and its real
   coordinates. The same array drives the pins and the timeline below, so the
   two can never disagree. Each flight is the leg from wherever the previous
   convention happened, which is what a flight log actually is.

   The render loop is opt-in: it runs only while this tab is active, the
   document is visible, and the globe is on screen. When any of those stops
   being true the rAF is cancelled, not merely idled. window.CobbyTravel.frames
   is the counter that proves it.
   ========================================================================== */
(function () {
    'use strict';

    const panel = document.getElementById('tab-travel');
    const stage = document.getElementById('globe-stage');
    const canvas = document.getElementById('globe-canvas');
    if (!panel || !stage || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DEG = Math.PI / 180;
    const EARTH_R = 6371;

    /* -------------------------------------------------------------------------
       Tokens, read from the stylesheet rather than re-typed here. The palette
       is style.css's; this file only borrows it.
       ---------------------------------------------------------------------- */
    const rootStyle = getComputedStyle(document.documentElement);
    const token = (name, fallback) => {
        const v = rootStyle.getPropertyValue(name).trim();
        return v || fallback;
    };
    const RGB = {
        h1: token('--holo-1-rgb', '0, 240, 212'),
        h2: token('--holo-2-rgb', '255, 45, 149'),
        h3: token('--holo-3-rgb', '255, 201, 64'),
    };
    const INK = {
        void: token('--void', '#06080f'),
        voidDeep: token('--void-deep', '#04050b'),
        surfaceSunk: token('--surface-sunk', '#080b16'),
        textBright: token('--text-bright', '#f2fbff'),
    };
    const rgba = (key, a) => `rgba(${RGB[key]}, ${a})`;
    const MONO = '"IBM Plex Mono", ui-monospace, "Cascadia Mono", monospace';

    /* -------------------------------------------------------------------------
       Performance tier. CobbyPerf is optional — every read is guarded.
       ---------------------------------------------------------------------- */
    const perf = window.CobbyPerf;
    const level = perf && typeof perf.level === 'number' ? perf.level : 2;
    const motionQuery = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const trimsMotion = () => {
        if (motionQuery && motionQuery.matches) return true;
        if (perf && typeof perf.trimsMotion === 'function') {
            try { return !!perf.trimsMotion(); } catch (e) { return false; }
        }
        return false;
    };

    /* -------------------------------------------------------------------------
       1. The real data
       ---------------------------------------------------------------------- */
    const CITIES = {
        hcm: {
            key: 'hcm', en: 'Ho Chi Minh City', vi: 'TP. Hồ Chí Minh',
            countryEn: 'Vietnam', countryVi: 'Việt Nam', flag: 'vn',
            lat: 10.8231, lon: 106.6297,
        },
        nbi: {
            key: 'nbi', en: 'Nonthaburi', vi: 'Nonthaburi',
            countryEn: 'Thailand', countryVi: 'Thái Lan', flag: 'th',
            lat: 13.8591, lon: 100.5144,
        },
        han: {
            key: 'han', en: 'Hanoi', vi: 'Hà Nội',
            countryEn: 'Vietnam', countryVi: 'Việt Nam', flag: 'vn',
            lat: 21.0278, lon: 105.8342,
        },
        bkk: {
            key: 'bkk', en: 'Bangkok', vi: 'Bangkok',
            countryEn: 'Thailand', countryVi: 'Thái Lan', flag: 'th',
            lat: 13.7563, lon: 100.5018,
        },
        pj: {
            key: 'pj', en: 'Petaling Jaya', vi: 'Petaling Jaya',
            countryEn: 'Malaysia', countryVi: 'Malaysia', flag: 'my',
            lat: 3.1073, lon: 101.6067,
        },
    };

    const HOME = CITIES.hcm;

    const FLIGHTS = [
        {
            id: 'fuve-2023', name: 'FUVE 2023',
            start: '2023-10-15', end: '2023-10-15',
            dateEn: '15 Oct 2023', dateVi: '15 thg 10, 2023',
            city: CITIES.hcm, photo: null,
            noteEn: 'the first one. i knew nobody.',
            noteVi: 'lần đầu. mình chẳng quen ai.',
        },
        {
            id: 'fuve-2024', name: 'FUVE 2024',
            start: '2024-08-18', end: '2024-08-18',
            dateEn: '18 Aug 2024', dateVi: '18 thg 8, 2024',
            city: CITIES.hcm, photo: 'event4',
            noteEn: 'second year. this time i knew the way.',
            noteVi: 'năm thứ hai. lần này mình đã biết đường.',
        },
        {
            id: 'thaitails-2025', name: 'Thaitails 2025',
            start: '2025-03-22', end: '2025-03-23',
            dateEn: '22–23 Mar 2025', dateVi: '22–23 thg 3, 2025',
            city: CITIES.nbi, photo: 'event3',
            noteEn: 'first passport stamp. my hands were shaking at the gate.',
            noteVi: 'lần đầu đóng dấu hộ chiếu. tay run run ở cổng.',
        },
        {
            id: 'fuve-2025', name: 'FUVE 2025',
            start: '2025-08-02', end: '2025-08-02',
            dateEn: '2 Aug 2025', dateVi: '2 thg 8, 2025',
            city: CITIES.hcm, photo: 'event2',
            noteEn: 'home turf. this time i was the one showing people around.',
            noteVi: 'sân nhà. lần này đến lượt mình dẫn mọi người đi.',
        },
        {
            id: 'furgiv-2025', name: 'FurGIV 2025',
            start: '2025-09-20', end: '2025-09-20',
            dateEn: '20 Sep 2025', dateVi: '20 thg 9, 2025',
            city: CITIES.han, photo: 'event1',
            noteEn: 'hanoi in september. the food alone was worth the flight.',
            noteVi: 'Hà Nội tháng chín. chỉ riêng đồ ăn đã đáng chuyến bay.',
        },
        {
            id: 'siampaws-2026', name: 'SiamPaws 2026',
            start: '2026-06-06', end: '2026-06-07',
            dateEn: '6–7 Jun 2026', dateVi: '6–7 thg 6, 2026',
            city: CITIES.bkk, photo: 'event0',
            noteEn: 'bangkok. hot, loud, and i would go again tomorrow.',
            noteVi: 'Bangkok. nóng, ồn, mà mai mình vẫn đi lại.',
        },
        {
            id: 'fuve-2026', name: 'FUVE 2026',
            start: '2026-08-15', end: '2026-08-15',
            dateEn: '15 Aug 2026', dateVi: '15 thg 8, 2026',
            city: CITIES.hcm, photo: null,
            noteEn: 'four years of the same room, and it still feels like coming home.',
            noteVi: 'bốn năm cùng một căn phòng, mà vẫn như được về nhà.',
        },
        {
            id: 'furgiv-2026', name: 'FurGIV 2026',
            start: '2026-09-19', end: '2026-09-19',
            dateEn: '19 Sep 2026', dateVi: '19 thg 9, 2026',
            city: CITIES.han, photo: null,
            noteEn: 'back to hanoi. i saved up for this one.',
            noteVi: 'lại Hà Nội. chuyến này mình để dành tiền.',
        },
        {
            id: 'furum-2026', name: 'FURUM 2026',
            start: '2026-12-11', end: '2026-12-13',
            dateEn: '11–13 Dec 2026', dateVi: '11–13 thg 12, 2026',
            city: CITIES.pj, photo: null,
            noteEn: 'the one that has not happened yet. i am counting the days.',
            noteVi: 'chuyến chưa tới. mình đang đếm từng ngày.',
        },
    ];

    /* -------------------------------------------------------------------------
       2. Geometry helpers
       ---------------------------------------------------------------------- */
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const easeInOut = (t) => t * t * (3 - 2 * t);

    function haversine(a, b) {
        const p1 = a.lat * DEG;
        const p2 = b.lat * DEG;
        const dp = (b.lat - a.lat) * DEG;
        const dl = (b.lon - a.lon) * DEG;
        const s = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
    }

    // lon/lat → unit vector, y up, +z toward the viewer at yaw = 0, pitch = 0.
    function toVec(lat, lon) {
        const la = lat * DEG;
        const lo = lon * DEG;
        const cl = Math.cos(la);
        return [cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo)];
    }

    function fromVec(v) {
        return {
            lat: Math.asin(Math.max(-1, Math.min(1, v[1]))) / DEG,
            lon: Math.atan2(v[0], v[2]) / DEG,
        };
    }

    function slerpUnit(a, b, t) {
        let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        dot = Math.max(-1, Math.min(1, dot));
        const omega = Math.acos(dot);
        if (omega < 1e-5) {
            return [
                a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t,
                a[2] + (b[2] - a[2]) * t,
            ];
        }
        const so = Math.sin(omega);
        const k1 = Math.sin((1 - t) * omega) / so;
        const k2 = Math.sin(t * omega) / so;
        return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }

    // Shortest signed delta between two angles, in radians.
    function angleDelta(from, to) {
        let d = (to - from) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    // Derive the leg and the honest status of every convention from today.
    const now = Date.now();
    FLIGHTS.forEach((f, i) => {
        f.index = i;
        f.from = i === 0 ? HOME : FLIGHTS[i - 1].city;
        f.distance = haversine(f.from, f.city);
        f.vec = toVec(f.city.lat, f.city.lon);
        f.fromVec = toVec(f.from.lat, f.from.lon);
        const endTs = Date.parse(f.end + 'T23:59:59Z');
        const startTs = Date.parse(f.start + 'T00:00:00Z');
        f.status = endTs < now ? 'past' : startTs > now ? 'planned' : 'now';
    });

    const nextFlight = FLIGHTS.find((f) => f.status !== 'past') || null;
    if (nextFlight) nextFlight.status = 'next';

    // One pin per distinct city; four conventions happened in Saigon.
    const CLUSTERS = [];
    const clusterByKey = new Map();
    FLIGHTS.forEach((f) => {
        let cl = clusterByKey.get(f.city.key);
        if (!cl) {
            cl = {
                city: f.city,
                vec: toVec(f.city.lat, f.city.lon),
                flights: [],
                isHome: f.city.key === HOME.key,
                status: 'past',
                sx: 0, sy: 0, depth: 0, visible: false,
            };
            clusterByKey.set(f.city.key, cl);
            CLUSTERS.push(cl);
        }
        cl.flights.push(f);
        if (f.status === 'next') cl.status = 'next';
        else if (f.status !== 'past' && cl.status !== 'next') cl.status = 'now';
    });

    // Unique great-circle corridors, so the network is not drawn twice.
    const ARCS = [];
    const arcSeen = new Set();
    FLIGHTS.forEach((f) => {
        if (f.distance < 1) return;
        const pair = [f.from.key, f.city.key].sort().join('|');
        if (arcSeen.has(pair)) return;
        arcSeen.add(pair);
        ARCS.push({ a: f.fromVec, b: f.vec, key: pair });
    });

    const TOTAL_KM = Math.round(FLIGHTS.reduce((s, f) => s + f.distance, 0));
    const COUNTRY_COUNT = new Set(FLIGHTS.map((f) => f.city.flag)).size;

    /* -------------------------------------------------------------------------
       3. Land — TopoJSON decoded by hand (arcs are delta-encoded against a
       quantised transform; about twenty lines of actual work).
       ---------------------------------------------------------------------- */
    const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';
    let landRings = [];      // Float32Array triples of unit vectors
    let landReady = false;

    function decodeArcs(topology) {
        const t = topology.transform;
        const sx = t.scale[0];
        const sy = t.scale[1];
        const tx = t.translate[0];
        const ty = t.translate[1];
        return topology.arcs.map((arc) => {
            let x = 0;
            let y = 0;
            const pts = new Array(arc.length);
            for (let i = 0; i < arc.length; i++) {
                x += arc[i][0];
                y += arc[i][1];
                pts[i] = [x * sx + tx, y * sy + ty];
            }
            return pts;
        });
    }

    function arcAt(arcs, index) {
        const a = arcs[index < 0 ? ~index : index];
        return index < 0 ? a.slice().reverse() : a;
    }

    function ringPoints(arcs, ring) {
        const pts = [];
        for (let i = 0; i < ring.length; i++) {
            const seg = arcAt(arcs, ring[i]);
            if (i === 0) {
                for (let k = 0; k < seg.length; k++) pts.push(seg[k]);
            } else {
                for (let k = 1; k < seg.length; k++) pts.push(seg[k]);
            }
        }
        return pts;
    }

    function toVecRing(points) {
        const out = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
            const lon = points[i][0] * DEG;
            const lat = points[i][1] * DEG;
            const cl = Math.cos(lat);
            out[i * 3] = cl * Math.sin(lon);
            out[i * 3 + 1] = Math.sin(lat);
            out[i * 3 + 2] = cl * Math.cos(lon);
        }
        return out;
    }

    function ingestLand(topology) {
        if (!topology || !topology.objects || !topology.objects.land) return;
        const arcs = decodeArcs(topology);
        const rings = [];
        const pushGeometry = (geom) => {
            if (!geom) return;
            if (geom.type === 'Polygon') {
                geom.arcs.forEach((r) => rings.push(ringPoints(arcs, r)));
            } else if (geom.type === 'MultiPolygon') {
                geom.arcs.forEach((poly) => poly.forEach((r) => rings.push(ringPoints(arcs, r))));
            } else if (geom.type === 'GeometryCollection') {
                geom.geometries.forEach(pushGeometry);
            }
        };
        pushGeometry(topology.objects.land);
        // Drop specks — at 110m they are single pixels of noise on a 400px disc.
        landRings = rings
            .filter((r) => r.length > 8)
            .map(toVecRing);
        landReady = landRings.length > 0;
        requestFrame();
    }

    function loadLand() {
        if (level <= 0) return; // lite: graticule and pins only, per the tier rules
        fetch(LAND_URL, { mode: 'cors', credentials: 'omit' })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => { if (json) ingestLand(json); })
            .catch(() => { /* offline: the instrument still draws */ });
    }

    // Graticule, also pre-rotated into unit vectors.
    const GRAT = { meridians: [], parallels: [] };
    (function buildGraticule() {
        for (let lon = -180; lon < 180; lon += 15) {
            const pts = [];
            for (let lat = -90; lat <= 90; lat += 3) pts.push(toVec(lat, lon));
            GRAT.meridians.push(pts);
        }
        for (let lat = -75; lat <= 75; lat += 15) {
            const pts = [];
            for (let lon = -180; lon <= 180; lon += 3) pts.push(toVec(lat, lon));
            GRAT.parallels.push(pts);
        }
    })();

    /* -------------------------------------------------------------------------
       4. View state
       ---------------------------------------------------------------------- */
    let cssW = 0;
    let cssH = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let dpr = 1;

    // Framed on South-East Asia, where every pin is.
    let yaw = -106.6 * DEG;
    let pitch = 12.4 * DEG;
    let camTarget = null;
    let velYaw = 0;
    let velPitch = 0;
    let dragging = false;
    let dragMoved = 0;
    let idleTime = 99;
    let staticMode = trimsMotion();

    let activeIndex = -1;
    let hoverCluster = null;
    let linkedRow = null;

    let flight = null;      // { from, to, fromVec, toVec, t, dur, target }
    let trail = [];         // [{ x, y, age }]
    let pulse = 0;          // seconds of arrival pulse remaining
    let pulseCluster = null;
    let tour = null;        // { queue: [indexes], i, hold }

    let rafId = 0;
    let frames = 0;
    let lastTs = 0;
    let inView = true;

    /* -------------------------------------------------------------------------
       5. Loop lifecycle — the whole point of this file's perf story
       ---------------------------------------------------------------------- */
    function shouldRun() {
        return panel.classList.contains('active') && !document.hidden && inView;
    }

    function animating() {
        if (flight) return true;
        if (camTarget) return true;
        if (pulse > 0) return true;
        if (dragging) return true;
        if (Math.abs(velYaw) > 0.0004 || Math.abs(velPitch) > 0.0004) return true;
        // Idle drift is the resting state: once the camera has settled, the
        // instrument keeps turning, so the loop has to keep running. In static
        // mode there is no drift, and the loop is free to stop.
        if (!staticMode) return true;
        return false;
    }

    function requestFrame() {
        if (rafId || !shouldRun()) return;
        rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        lastTs = 0;
        trail.length = 0;
    }

    function sync() {
        if (shouldRun()) {
            resize();
            requestFrame();
        } else {
            stopLoop();
        }
    }

    function tick(ts) {
        rafId = 0;
        if (!shouldRun()) { lastTs = 0; return; }
        frames += 1;
        const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 1 / 60;
        lastTs = ts;
        update(dt);
        draw();
        if (shouldRun() && animating()) requestFrame();
        else lastTs = 0;
    }

    /* -------------------------------------------------------------------------
       6. Simulation
       ---------------------------------------------------------------------- */
    function update(dt) {
        // Camera glide toward the framed leg.
        if (camTarget) {
            const k = 1 - Math.exp(-dt * 5.2);
            const dy = angleDelta(yaw, camTarget.yaw);
            const dp = camTarget.pitch - pitch;
            yaw += dy * k;
            pitch += dp * k;
            if (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002) {
                yaw = camTarget.yaw;
                pitch = camTarget.pitch;
                camTarget = null;
            }
        } else if (!dragging) {
            // Inertia from the last flick.
            if (Math.abs(velYaw) > 0.0004) {
                yaw += velYaw;
                velYaw *= 0.93;
            }
            if (Math.abs(velPitch) > 0.0004) {
                pitch = clampPitch(pitch + velPitch);
                velPitch *= 0.93;
            } else {
                velPitch = 0;
            }
            if (Math.abs(velYaw) <= 0.0004) velYaw = 0;

            // Idle drift, only when nothing else is asking for the camera.
            if (!staticMode && idleTime > 2.5 && !flight && !tour) {
                yaw += 0.045 * dt;
            }
        }

        idleTime += dt;
        if (flight) {
            flight.t = Math.min(1, flight.t + dt / flight.dur);
            if (flight.t >= 1) arrive();
        }

        if (pulse > 0) {
            pulse = Math.max(0, pulse - dt);
        }

        if (tour) {
            if (flight) {
                // waiting for the leg to land
            } else if (tour.hold > 0) {
                tour.hold -= dt;
                if (tour.hold <= 0) advanceTour();
            } else {
                advanceTour();
            }
        }

        // Age the engine trail.
        for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].age += dt;
            if (trail[i].age > 0.5) trail.splice(i, 1);
        }
    }

    function clampPitch(p) {
        const lim = 74 * DEG;
        return p < -lim ? -lim : p > lim ? lim : p;
    }

    function frameCamera(from, to) {
        // Look at the midpoint of the leg so both ends of the arc are visible.
        const mid = slerpUnit(from, to, 0.5);
        const g = fromVec(mid);
        camTarget = {
            yaw: yaw + angleDelta(yaw, -g.lon * DEG),
            pitch: clampPitch(g.lat * DEG),
        };
    }

    function startFlight(index) {
        const f = FLIGHTS[index];
        if (!f) return;
        activeIndex = index;
        idleTime = 0;
        velYaw = 0;
        velPitch = 0;
        trail.length = 0;

        frameCamera(f.fromVec, f.vec);

        const angle = Math.acos(Math.max(-1, Math.min(1,
            f.fromVec[0] * f.vec[0] + f.fromVec[1] * f.vec[1] + f.fromVec[2] * f.vec[2])));

        if (staticMode || f.distance < 1) {
            flight = null;
            pulse = staticMode ? 0 : 1.2;
            pulseCluster = clusterByKey.get(f.city.key) || null;
            setReadout(f);
            requestFrame();
            return;
        }

        flight = {
            from: f.from,
            to: f.city,
            fromVec: f.fromVec,
            toVec: f.vec,
            t: 0,
            dur: 1.15 + Math.min(1.5, angle / 1.9),
            bulge: Math.min(0.24, 0.05 + angle * 0.45),
            index,
        };
        setReadout(f, true);
        requestFrame();
    }

    function arrive() {
        const f = FLIGHTS[activeIndex];
        flight = null;
        pulse = 1.2;
        pulseCluster = f ? clusterByKey.get(f.city.key) : null;
        if (f) setReadout(f);
        markActiveRow();
        requestFrame();
    }

    /* -------------------------------------------------------------------------
       7. Projection + drawing
       ---------------------------------------------------------------------- */
    let m00 = 1, m01 = 0, m02 = 0;
    let m10 = 0, m11 = 1, m12 = 0;
    let m20 = 0, m21 = 0, m22 = 1;

    function setMatrix(y, p) {
        const cyw = Math.cos(y);
        const syw = Math.sin(y);
        const cp = Math.cos(p);
        const sp = Math.sin(p);
        m00 = cyw; m01 = 0; m02 = syw;
        m10 = syw * sp; m11 = cp; m12 = -cyw * sp;
        m20 = -syw * cp; m21 = sp; m22 = cyw * cp;
    }

    function projectLatLon(lat, lon) {
        const v = toVec(lat, lon);
        const x = m00 * v[0] + m02 * v[2];
        const y = m10 * v[0] + m11 * v[1] + m12 * v[2];
        const z = m20 * v[0] + m21 * v[1] + m22 * v[2];
        return { x: cx + R * x, y: cy - R * y, z, vis: z >= 0 };
    }

    function draw() {
        if (!R || R < 20) return;

        setMatrix(yaw, pitch);

        ctx.clearRect(0, 0, cssW, cssH);

        // --- sphere body -----------------------------------------------------
        const body = ctx.createRadialGradient(
            cx - R * 0.3, cy - R * 0.34, R * 0.1, cx, cy, R * 1.02
        );
        body.addColorStop(0, INK.surfaceSunk);
        body.addColorStop(0.72, INK.voidDeep);
        body.addColorStop(1, INK.void);
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = body;
        ctx.fill();

        drawGraticule();
        drawLand();
        drawVignette();
        drawLimb();
        drawRoutes();
        drawPins();
        drawAircraft();
        drawScan();
        drawInstrumentText();

        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
    }

    function drawGraticule() {
        const step = R < 190 ? 2 : 1;
        ctx.lineWidth = 1;

        ctx.strokeStyle = rgba('h1', 0.055);
        ctx.beginPath();
        for (let i = 0; i < GRAT.meridians.length; i++) {
            polyline(GRAT.meridians[i], step, false);
        }
        for (let i = 0; i < GRAT.parallels.length; i++) {
            polyline(GRAT.parallels[i], step, false);
        }
        ctx.stroke();

        // The equator and the prime meridian get one extra unit of weight —
        // the way a real grid is ruled.
        ctx.strokeStyle = rgba('h1', 0.11);
        ctx.beginPath();
        polyline(GRAT.meridians[12], step, false); // lon 0
        polyline(GRAT.parallels[5], step, false);  // lat 0
        ctx.stroke();
    }

    // Walk a pre-rotated polyline, breaking the pen wherever it crosses the
    // back of the sphere. `pts` is either an array of [x, y, z] triples
    // (graticule) or a flat Float32Array of triples (land); `flat` says which.
    // `stride` lets a small globe skip samples.
    function polyline(pts, stride, flat) {
        const step = flat ? stride * 3 : stride;
        let pen = false;
        for (let i = 0; i < pts.length; i += step) {
            let v0;
            let v1;
            let v2;
            if (flat) {
                v0 = pts[i];
                v1 = pts[i + 1];
                v2 = pts[i + 2];
            } else {
                const v = pts[i];
                v0 = v[0];
                v1 = v[1];
                v2 = v[2];
            }
            const z = m20 * v0 + m21 * v1 + m22 * v2;
            if (z < 0) { pen = false; continue; }
            const x = cx + R * (m00 * v0 + m02 * v2);
            const y = cy - R * (m10 * v0 + m11 * v1 + m12 * v2);
            if (pen) ctx.lineTo(x, y);
            else { ctx.moveTo(x, y); pen = true; }
        }
    }

    function drawLand() {
        if (!landReady) return;
        const stride = R < 170 ? 2 : 1;

        // A wide, faint pass under a crisp one: the coastline reads as lit
        // rather than as a sticker, without a shadow doing the work.
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        for (let i = 0; i < landRings.length; i++) polyline(landRings[i], stride, true);
        ctx.strokeStyle = rgba('h1', 0.13);
        ctx.lineWidth = 2.6;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < landRings.length; i++) polyline(landRings[i], stride, true);
        ctx.strokeStyle = rgba('h1', 0.62);
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawVignette() {
        // Curvature, done with light instead of a texture.
        const g = ctx.createRadialGradient(cx, cy, R * 0.52, cx, cy, R);
        g.addColorStop(0, 'rgba(4, 5, 11, 0)');
        g.addColorStop(0.78, 'rgba(4, 5, 11, 0.34)');
        g.addColorStop(1, 'rgba(4, 5, 11, 0.82)');
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
    }

    function drawLimb() {
        // Three outside rings instead of one shadow: the glow is additive light.
        ctx.globalCompositeOperation = 'lighter';
        const rings = [
            { r: R + 1.5, a: 0.1, w: 2.4 },
            { r: R + 4.5, a: 0.045, w: 2.2 },
            { r: R + 9, a: 0.022, w: 2 },
        ];
        for (let i = 0; i < rings.length; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, rings[i].r, 0, Math.PI * 2);
            ctx.strokeStyle = rgba('h1', rings[i].a);
            ctx.lineWidth = rings[i].w;
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        // The limb itself: one crisp hairline.
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = rgba('h1', 0.92);
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Inner bezel.
        ctx.beginPath();
        ctx.arc(cx, cy, R - 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = rgba('h1', 0.14);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Tick bezel around the limb — the tell that this is an instrument.
        ctx.beginPath();
        for (let i = 0; i < 72; i++) {
            const a = (i / 72) * Math.PI * 2 - Math.PI / 2;
            const major = i % 6 === 0;
            const r0 = R + 2;
            const r1 = R + (major ? 8 : 4.5);
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            ctx.moveTo(cx + ca * r0, cy + sa * r0);
            ctx.lineTo(cx + ca * r1, cy + sa * r1);
        }
        ctx.strokeStyle = rgba('h1', 0.34);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Four index marks, heavier, pointing inward.
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            ctx.moveTo(cx + ca * (R - 2), cy + sa * (R - 2));
            ctx.lineTo(cx + ca * (R - 15), cy + sa * (R - 15));
        }
        ctx.strokeStyle = rgba('h1', 0.42);
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Project a world-space unit vector (already scaled by altitude) through
    // the current view matrix. Everything on the sphere goes through here or
    // through projectLatLon; nothing is ever drawn in world coordinates.
    function viewOf(v, alt) {
        const k = alt === undefined ? 1 : alt;
        const x = v[0] * k;
        const y = v[1] * k;
        const z = v[2] * k;
        return {
            x: cx + R * (m00 * x + m02 * z),
            y: cy - R * (m10 * x + m11 * y + m12 * z),
            // Visible if it is on the near hemisphere, or if the altitude bulge
            // has carried it past the limb into the visible sky.
            vis: (m20 * x + m21 * y + m22 * z) >= 0 || (x * x + y * y) >= 1,
        };
    }

    function strokeArc(a, b, altAt, dash) {
        const N = 72;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const v = slerpUnit(a, b, t);
            const p = viewOf(v, 1 + altAt(t));
            if (!p.vis) { pen = false; continue; }
            if (pen) ctx.lineTo(p.x, p.y);
            else { ctx.moveTo(p.x, p.y); pen = true; }
        }
        if (dash) ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawRoutes() {
        if (level <= 1 && R < 220) return;

        // Every corridor he has actually flown, as a quiet air chart.
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba('h1', 0.13);
        for (let i = 0; i < ARCS.length; i++) {
            const arc = ARCS[i];
            const isActive = flight && (
                (arc.key === [flight.from.key, flight.to.key].sort().join('|'))
            );
            if (isActive) continue;
            strokeArc(arc.a, arc.b, () => 0.02, [3, 7]);
        }
    }

    function drawPins() {
        const hitList = [];
        for (let i = 0; i < CLUSTERS.length; i++) {
            const cl = CLUSTERS[i];
            const v = cl.vec;
            const x = m00 * v[0] + m02 * v[2];
            const y = m10 * v[0] + m11 * v[1] + m12 * v[2];
            const z = m20 * v[0] + m21 * v[1] + m22 * v[2];
            if (z < 0) { cl.visible = false; continue; }
            cl.visible = true;
            cl.sx = cx + R * x;
            cl.sy = cy - R * y;
            cl.depth = z;
            hitList.push(cl);
        }

        resolvePinOverlap(hitList);

        for (let i = 0; i < hitList.length; i++) drawPin(hitList[i]);
        pinHitList = hitList;
    }

    let pinHitList = [];

    // Bangkok and Nonthaburi are 11 km apart: at this scale they project to the
    // same pixel. Nudge coincident pins apart so both stay clickable, and record
    // the true projected point on each so the leader line below can say so —
    // a displaced marker with no tether would be a lie about where the city is.
    function resolvePinOverlap(list) {
        const MIN = 15;
        for (let i = 0; i < list.length; i++) {
            list[i].tx = list[i].sx;
            list[i].ty = list[i].sy;
        }
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                let dx = b.sx - a.sx;
                let dy = b.sy - a.sy;
                let d = Math.sqrt(dx * dx + dy * dy);
                if (d >= MIN) continue;
                if (d < 0.001) {
                    // Perfectly coincident: pick a stable direction per pair.
                    const ang = (i * 7 + j * 13) * 0.9;
                    dx = Math.cos(ang);
                    dy = Math.sin(ang);
                    d = 1;
                }
                const push = (MIN - d) / 2 + 0.5;
                const ux = (dx / d) * push;
                const uy = (dy / d) * push;
                a.sx -= ux; a.sy -= uy;
                b.sx += ux; b.sy += uy;
            }
        }
    }

    function drawPin(cl) {
        const isActive = activeIndex >= 0 && FLIGHTS[activeIndex].city.key === cl.city.key;
        const isHover = hoverCluster === cl;
        const depth = 0.32 + 0.68 * cl.depth;

        // If this pin was displaced to stay clickable, draw the tether back to
        // the true coordinate: the marker moved, the city did not.
        const offX = cl.sx - cl.tx;
        const offY = cl.sy - cl.ty;
        if (offX * offX + offY * offY > 1) {
            ctx.beginPath();
            ctx.moveTo(cl.tx, cl.ty);
            ctx.lineTo(cl.sx, cl.sy);
            ctx.strokeStyle = rgba('h1', 0.4 * depth);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cl.tx, cl.ty, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = rgba('h1', 0.6 * depth);
            ctx.fill();
        }

        let color;
        if (cl.isHome) color = rgba('h2', 0.95);
        else if (cl.status === 'next') color = rgba('h3', 0.95);
        else color = rgba('h1', 0.85);

        const size = (isActive ? 6.4 : isHover ? 5.6 : 4.4);
        const alpha = isActive || isHover ? 1 : depth;

        ctx.globalAlpha = alpha;

        // Ring for the selected / hovered pin.
        if (isActive || isHover) {
            ctx.beginPath();
            ctx.arc(cl.sx, cl.sy, isActive ? 11 : 8.5, 0, Math.PI * 2);
            ctx.strokeStyle = isActive ? rgba('h1', 0.85) : rgba('h1', 0.45);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // The diamond is the site's own dot shape, reused as a plot symbol.
        ctx.beginPath();
        ctx.moveTo(cl.sx, cl.sy - size);
        ctx.lineTo(cl.sx + size, cl.sy);
        ctx.lineTo(cl.sx, cl.sy + size);
        ctx.lineTo(cl.sx - size, cl.sy);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (isActive) {
            ctx.strokeStyle = rgba('h3', 0.9);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Coincident conventions stack into one pin, with an honest count.
        if (cl.flights.length > 1) {
            ctx.font = `600 8px ${MONO}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = rgba('h1', 0.7 * depth);
            ctx.fillText('\u00d7' + cl.flights.length, cl.sx + size + 3, cl.sy - size + 1);
        }

        // Arrival pulse.
        if (pulse > 0 && pulseCluster === cl) {
            const k = 1 - pulse / 1.2;
            const r = 8 + k * 22;
            ctx.beginPath();
            ctx.arc(cl.sx, cl.sy, r, 0, Math.PI * 2);
            ctx.strokeStyle = rgba('h3', (1 - k) * 0.85);
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    function legState() {
        if (flight) {
            return { fromVec: flight.fromVec, toVec: flight.toVec, t: flight.t, bulge: flight.bulge };
        }
        if (activeIndex >= 0) {
            const f = FLIGHTS[activeIndex];
            return { fromVec: f.fromVec, toVec: f.vec, t: 1, bulge: 0 };
        }
        return { fromVec: HOME.vec || toVec(HOME.lat, HOME.lon), toVec: toVec(HOME.lat, HOME.lon), t: 0, bulge: 0 };
    }

    function legPointAt(st, t) {
        const v = slerpUnit(st.fromVec, st.toVec, t);
        const alt = 1 + st.bulge * Math.sin(Math.PI * t);
        return viewOf(v, alt);
    }

    function drawAircraft() {
        const st = legState();
        const t = flight ? easeInOut(clamp01(st.t)) : st.t;

        // The leg being flown, drawn in two weights: what is left, dashed, and
        // what has been covered, solid.
        if (flight) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = rgba('h1', 0.2);
            strokeArc(st.fromVec, st.toVec, (u) => st.bulge * Math.sin(Math.PI * u), [3, 6]);

            if (t > 0.004) {
                ctx.beginPath();
                let pen = false;
                const N = 48;
                for (let i = 0; i <= N; i++) {
                    const u = (i / N) * t;
                    const p = legPointAt(st, u);
                    if (!p.vis) { pen = false; continue; }
                    if (pen) ctx.lineTo(p.x, p.y);
                    else { ctx.moveTo(p.x, p.y); pen = true; }
                }
                ctx.strokeStyle = rgba('h1', 0.72);
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }

        // Aircraft position.
        const p = legPointAt(st, t);
        if (!p.vis) { trail.length = 0; return; }
        const px = p.x;
        const py = p.y;

        // Heading from a short step along the path.
        const step = Math.min(1, t + 0.012);
        const q = legPointAt(st, step > t ? step : Math.max(0, t - 0.012));
        let hx = q.x - px;
        let hy = q.y - py;
        if (step <= t) { hx = -hx; hy = -hy; }
        if (Math.abs(hx) < 0.001 && Math.abs(hy) < 0.001) { hx = 0; hy = -1; }
        const heading = Math.atan2(hy, hx);

        // Engine trail.
        if (flight) {
            trail.push({ x: px, y: py, age: 0 });
            if (trail.length > 26) trail.shift();
            if (trail.length > 1) {
                for (let i = 1; i < trail.length; i++) {
                    const a = trail[i - 1];
                    const b = trail[i];
                    const k = 1 - b.age / 0.5;
                    if (k <= 0) continue;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = rgba('h3', k * 0.5);
                    ctx.lineWidth = 1 + k * 1.4;
                    ctx.stroke();
                }
            }
        } else {
            trail.length = 0;
        }

        // The aircraft: a small dart, not a sprite.
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(heading + Math.PI / 2);

        ctx.beginPath();
        ctx.moveTo(0, -7.2);
        ctx.lineTo(3.4, 3.6);
        ctx.lineTo(0, 1.5);
        ctx.lineTo(-3.4, 3.6);
        ctx.closePath();
        ctx.fillStyle = INK.textBright;
        ctx.fill();
        ctx.strokeStyle = rgba('h3', 0.95);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // A thin ring keeps the aircraft legible against dense coastline.
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.strokeStyle = rgba('h3', 0.32);
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawScan() {
        if (staticMode) return;
        const period = 9;
        const k = ((performance.now() / 1000) % period) / period;
        const x = cx - R + k * R * 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2);
        ctx.clip();

        const g = ctx.createLinearGradient(x - R * 0.5, 0, x, 0);
        g.addColorStop(0, rgba('h1', 0));
        g.addColorStop(1, rgba('h1', 0.05));
        ctx.fillStyle = g;
        ctx.fillRect(x - R * 0.5, cy - R, R * 0.5, R * 2);

        ctx.beginPath();
        ctx.moveTo(x, cy - R);
        ctx.lineTo(x, cy + R);
        ctx.strokeStyle = rgba('h1', 0.14);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    function drawInstrumentText() {
        if (R < 120) return;
        const latC = pitch / DEG;
        const lonC = -yaw / DEG;
        const latTxt = `${Math.abs(latC).toFixed(1)}\u00b0${latC >= 0 ? 'N' : 'S'}`;
        const lonTxt = `${Math.abs(lonC).toFixed(1)}\u00b0${lonC >= 0 ? 'E' : 'W'}`;

        ctx.font = `500 9px ${MONO}`;
        ctx.textBaseline = 'alphabetic';

        ctx.textAlign = 'left';
        ctx.fillStyle = rgba('h1', 0.34);
        ctx.fillText('ORTHOGRAPHIC \u00b7 110m', 2, 11);

        ctx.textAlign = 'left';
        ctx.fillStyle = rgba('h1', 0.5);
        ctx.fillText(`${latTxt}  ${lonTxt}`, 2, cssH - 4);

        ctx.textAlign = 'right';
        ctx.fillStyle = rgba('h1', 0.28);
        ctx.fillText('SEA / 110m', cssW - 2, 11);
    }

    /* -------------------------------------------------------------------------
       8. Sizing
       ---------------------------------------------------------------------- */
    function resize() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        const nextDpr = Math.min(window.devicePixelRatio || 1, level >= 2 ? 2 : 1.5);
        if (w === cssW && h === cssH && nextDpr === dpr) return;

        cssW = w;
        cssH = h;
        dpr = nextDpr;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cx = w / 2;
        cy = h / 2;
        R = Math.min(w, h) / 2 - 18;
        requestFrame();
    }

    /* -------------------------------------------------------------------------
       9. The timeline below — same FLIGHTS array, existing classes
       ---------------------------------------------------------------------- */
    const timeline = panel.querySelector('.roadmap-timeline');
    let rows = [];

    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function bi(node, en, vi) {
        node.appendChild(el('span', null, en)).setAttribute('lang', 'en');
        node.appendChild(el('span', null, vi)).setAttribute('lang', 'vi');
        return node;
    }

    function buildTimeline() {
        if (!timeline) return;
        timeline.textContent = '';
        rows = [];

        const frag = document.createDocumentFragment();
        let year = null;
        let side = 0;

        FLIGHTS.forEach((f, i) => {
            const y = f.start.slice(0, 4);
            if (y !== year) {
                year = y;
                const divider = el('div', 'roadmap-year-divider');
                divider.appendChild(el('span', null, y));
                frag.appendChild(divider);
                // The side counter deliberately does NOT reset at a year break:
                // resetting would put two consecutive cards on the same side.
            }

            const item = el('div', 'roadmap-item');
            item.dataset.flightIndex = String(i);
            item.dataset.status = f.status;

            if (f.status === 'past') item.classList.add('past');
            if (f.status === 'next') item.classList.add('upcoming');
            else item.classList.add(side % 2 === 0 ? 'left-side' : 'right-side');
            side += 1;

            const marker = el('div', 'roadmap-marker');
            marker.setAttribute('aria-hidden', 'true');
            const icon = el('i', f.status === 'past' ? 'fas fa-plane' : 'fas fa-map-marker-alt');
            marker.appendChild(icon);
            item.appendChild(marker);

            const content = el('div', 'roadmap-content');
            content.setAttribute('role', 'button');
            content.tabIndex = 0;
            content.setAttribute('aria-label', `${f.name}, ${f.dateEn}, ${f.city.en}`);

            const header = el('div', 'event-header');
            header.appendChild(el('h4', 'event-name', f.name));

            const tag = el('span', 'event-tag');
            if (f.status === 'next') {
                tag.classList.add('tag-next');
                bi(tag, 'going next', 'sắp tới');
            } else if (f.status === 'past') {
                bi(tag, 'past', 'đã qua');
            } else {
                bi(tag, 'now', 'đang diễn ra');
            }
            header.appendChild(tag);
            content.appendChild(header);

            const meta = el('p', 'event-meta');
            const cal = el('i', 'far fa-calendar-alt');
            cal.setAttribute('aria-hidden', 'true');
            meta.appendChild(cal);
            meta.appendChild(el('span', null, ' '));
            const dateWrap = el('span');
            bi(dateWrap, f.dateEn, f.dateVi);
            meta.appendChild(dateWrap);

            const sep = el('span', 'meta-separator', '\u00b7');
            sep.setAttribute('aria-hidden', 'true');
            meta.appendChild(sep);

            const pin = el('i', 'fas fa-map-marker-alt');
            pin.setAttribute('aria-hidden', 'true');
            meta.appendChild(pin);
            meta.appendChild(el('span', null, ' '));
            const cityWrap = el('span');
            bi(cityWrap, `${f.city.en}, ${f.city.countryEn}`, `${f.city.vi}, ${f.city.countryVi}`);
            meta.appendChild(cityWrap);

            const flag = el('img', 'flag');
            flag.src = `https://flagcdn.com/w20/${f.city.flag}.png`;
            flag.alt = '';
            flag.width = 15;
            flag.loading = 'lazy';
            flag.decoding = 'async';
            meta.appendChild(flag);

            content.appendChild(meta);

            if (f.photo) {
                const photo = el('img', 'event-photo');
                photo.setAttribute('data-image-key', f.photo);
                photo.alt = f.name;
                photo.loading = 'lazy';
                photo.decoding = 'async';
                // The URLs behind IMAGES.events are upstream of this file. If one
                // does not resolve, drop the element: a dossier with no photo of
                // that night is honest, a broken-image glyph is not.
                photo.addEventListener('error', () => photo.remove(), { once: true });
                content.appendChild(photo);
            }

            item.appendChild(content);
            frag.appendChild(item);
            rows.push({ item, content, flight: f });
        });

        timeline.appendChild(frag);

        rows.forEach((row, i) => {
            const fly = () => selectFlight(i);
            row.content.addEventListener('click', fly);
            row.content.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fly();
                }
            });
            row.item.addEventListener('pointerenter', () => {
                hoverCluster = clusterByKey.get(row.flight.city.key) || null;
                requestFrame();
            });
            row.item.addEventListener('pointerleave', () => {
                setHoverCluster(null);
            });
        });
    }

    // One place that changes the hovered pin, so the pin glow and the row
    // highlight can never fall out of step.
    function setHoverCluster(cl) {
        if (hoverCluster === cl) return;
        hoverCluster = cl;
        canvas.style.cursor = cl ? 'pointer' : '';
        hoverRowFor(cl);
        requestFrame();
    }

    function markActiveRow() {
        if (linkedRow) {
            linkedRow.item.classList.remove('is-linked');
            linkedRow = null;
        }
        if (activeIndex < 0 || !rows[activeIndex]) return;
        linkedRow = rows[activeIndex];
        linkedRow.item.classList.add('is-linked');
    }

    // Hovering a pin marks the row it belongs to — the same object, seen twice.
    // A hovered pin carries several conventions (Saigon has four), so the row
    // marked is the next one that has not happened yet, else the latest.
    let hoverRowEl = null;

    function hoverRowFor(cl) {
        if (hoverRowEl) {
            hoverRowEl.classList.remove('is-hover-linked');
            hoverRowEl = null;
        }
        if (!cl) return;
        const flights = cl.flights;
        const pick = flights.find((f) => f.status !== 'past') ||
            flights[flights.length - 1];
        const row = rows[pick.index];
        if (!row) return;
        hoverRowEl = row.item;
        hoverRowEl.classList.add('is-hover-linked');
    }

    /* -------------------------------------------------------------------------
       10. Readouts
       ---------------------------------------------------------------------- */
    const readoutEl = document.getElementById('globe-readout');
    const callsignEl = document.getElementById('globe-callsign');
    const routeEl = document.getElementById('globe-route');
    const detailEl = document.getElementById('globe-detail');
    const gaugeLegs = document.getElementById('gauge-legs');
    const gaugeCountries = document.getElementById('gauge-countries');
    const gaugeRange = document.getElementById('gauge-range');
    const tourBtn = document.getElementById('globe-tour');
    const hintEl = document.getElementById('globe-hint');

    function setBilingual(node, en, vi) {
        if (!node) return;
        let a = node.querySelector('[lang="en"]');
        let b = node.querySelector('[lang="vi"]');
        if (!a) {
            a = el('span');
            a.setAttribute('lang', 'en');
            node.appendChild(a);
        }
        if (!b) {
            b = el('span');
            b.setAttribute('lang', 'vi');
            node.appendChild(b);
        }
        a.textContent = en;
        b.textContent = vi;
    }

    function formatKm(km) {
        return `${Math.round(km).toLocaleString('en-US')} km`;
    }

    function setReadout(f, departing) {
        if (callsignEl) callsignEl.textContent = f.name.toUpperCase();

        const fromEn = f.from.en;
        const fromVi = f.from.vi;
        const toEn = f.city.en;
        const toVi = f.city.vi;
        const arrow = departing ? '\u2192' : '\u2192';

        if (f.from.key === f.city.key) {
            setBilingual(routeEl, `home base \u00b7 ${toEn}`, `sân nhà \u00b7 ${toVi}`);
        } else {
            setBilingual(routeEl, `${fromEn} ${arrow} ${toEn}`, `${fromVi} ${arrow} ${toVi}`);
        }

        const noteEn = f.noteEn;
        const noteVi = f.noteVi;
        setBilingual(detailEl, noteEn, noteVi);

        if (readoutEl) {
            const status = f.status === 'past' ? 'logged'
                : f.status === 'next' ? 'next up' : 'in progress';
            const statusVi = f.status === 'past' ? 'đã ghi'
                : f.status === 'next' ? 'sắp tới' : 'đang diễn ra';
            setBilingual(readoutEl, `${status} \u00b7 ${formatKm(f.distance)}`,
                `${statusVi} \u00b7 ${formatKm(f.distance)}`);
        }

        if (hintEl) hintEl.classList.add('is-off');
    }

    function resetReadout() {
        if (callsignEl) callsignEl.textContent = 'STANDBY';
        setBilingual(routeEl, 'select a convention', 'chọn một sự kiện');
        setBilingual(detailEl, 'the earth, plotted from nine real conventions',
            'trái đất, vẽ lại từ chín sự kiện có thật');
        setBilingual(readoutEl, `standby \u00b7 ${FLIGHTS.length} pins`,
            `chờ lệnh \u00b7 ${FLIGHTS.length} ghim`);
    }

    function paintGauges() {
        if (gaugeLegs) gaugeLegs.textContent = String(FLIGHTS.length).padStart(2, '0');
        if (gaugeCountries) gaugeCountries.textContent = String(COUNTRY_COUNT).padStart(2, '0');
        if (gaugeRange) gaugeRange.textContent = formatKm(TOTAL_KM);
    }

    /* -------------------------------------------------------------------------
       11. Selection + tour
       ---------------------------------------------------------------------- */
    function selectFlight(index) {
        if (index < 0 || index >= FLIGHTS.length) return;
        stopTour(true);
        startFlight(index);
        idleTime = 0;
    }

    function setTourButton(playing) {
        if (!tourBtn) return;
        tourBtn.classList.toggle('is-playing', playing);
        tourBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
        const icon = tourBtn.querySelector('i');
        if (icon) icon.className = playing ? 'fas fa-stop' : 'fas fa-plane-departure';
        const en = tourBtn.querySelector('[lang="en"]');
        const vi = tourBtn.querySelector('[lang="vi"]');
        if (en) en.textContent = playing ? 'stop the tour' : 'fly the whole route';
        if (vi) vi.textContent = playing ? 'dừng hành trình' : 'bay toàn bộ hành trình';
    }

    function startTour() {
        if (tour) return;
        tour = { i: -1, hold: 0 };
        setTourButton(true);
        advanceTour();
    }

    function stopTour(silent) {
        if (!tour) return;
        tour = null;
        setTourButton(false);
        if (!silent) resetReadout();
    }

    function advanceTour() {
        if (!tour) return;
        tour.i += 1;
        if (tour.i >= FLIGHTS.length) {
            tour = null;
            setTourButton(false);
            resetReadout();
            return;
        }
        startFlight(tour.i);
        tour.hold = 1.15;
    }

    if (tourBtn) {
        tourBtn.addEventListener('click', () => {
            if (tour) stopTour(false);
            else startTour();
        });
    }

    /* -------------------------------------------------------------------------
       12. Pointer — drag to spin, tap a pin to fly
       ---------------------------------------------------------------------- */
    const stageEl = stage;

    function localPoint(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function hitPin(p) {
        let best = null;
        let bestD = 18 * 18;
        for (let i = 0; i < pinHitList.length; i++) {
            const cl = pinHitList[i];
            const dx = cl.sx - p.x;
            const dy = cl.sy - p.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = cl; }
        }
        return best;
    }

    let lastMove = null;

    stageEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        // The readout cartridge and the hint line live inside the stage. A
        // press on them is a press on chrome — the tour button in particular —
        // and must not be swallowed as a globe drag.
        if (e.target !== canvas) return;
        lastMove = { x: e.clientX, y: e.clientY };
        dragging = true;
        dragMoved = 0;
        velYaw = 0;
        velPitch = 0;
        camTarget = null;
        idleTime = 0;
        try { stageEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        requestFrame();
    });

    stageEl.addEventListener('pointermove', (e) => {
        if (!dragging) {
            // Hover only means something over the sphere itself.
            if (e.target !== canvas) {
                setHoverCluster(null);
                return;
            }
            setHoverCluster(hitPin(localPoint(e)));
            return;
        }

        const dx = e.clientX - lastMove.x;
        const dy = e.clientY - lastMove.y;
        lastMove = { x: e.clientX, y: e.clientY };
        dragMoved += Math.abs(dx) + Math.abs(dy);

        if (R > 0) {
            const k = 1 / Math.max(90, R);
            yaw += dx * k;
            pitch = clampPitch(pitch - dy * k);
            velYaw = dx * k * 0.55;
            velPitch = -dy * k * 0.55;
        }
        idleTime = 0;
        requestFrame();
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try { stageEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

        if (dragMoved < 7) {
            const p = localPoint(e);
            const cl = hitPin(p);
            if (cl) {
                // Cycle through the conventions that happened in this city.
                const at = cl.flights.findIndex((f) => f.index > activeIndex);
                const pick = cl.flights[at >= 0 ? at : 0];
                selectFlight(pick.index);
            }
        }
        requestFrame();
    }

    stageEl.addEventListener('pointerup', endDrag);
    stageEl.addEventListener('pointercancel', (e) => {
        dragging = false;
        try { stageEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    stageEl.addEventListener('pointerleave', () => {
        setHoverCluster(null);
    });

    /* -------------------------------------------------------------------------
       13. Lifecycle observers
       ---------------------------------------------------------------------- */
    const classObserver = new MutationObserver(() => sync());
    classObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('visibilitychange', () => sync());

    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
            resize();
            if (shouldRun()) requestFrame();
        });
        ro.observe(canvas);
    } else {
        window.addEventListener('resize', resize);
    }

    if (window.IntersectionObserver) {
        const io = new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1];
            inView = entry.isIntersecting;
            if (inView) { resize(); requestFrame(); } else { stopLoop(); }
        }, { rootMargin: '80px' });
        io.observe(stage);
    }

    if (motionQuery) {
        const onMotionChange = () => {
            staticMode = trimsMotion();
            requestFrame();
        };
        if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
        else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
    }

    if (perf && typeof perf.onChange === 'function') {
        try {
            perf.onChange(() => {
                staticMode = trimsMotion();
                requestFrame();
            });
        } catch (e) { /* ignore */ }
    }

    /* -------------------------------------------------------------------------
       14. Image fallback
       main.js fills every [data-image-key] on DOMContentLoaded. If it has not
       by the time we are settled, resolve them here rather than show a hole.
       ---------------------------------------------------------------------- */
    const FALLBACK_PHOTOS = [
        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto,w_900/site/event-siampaws-2026.jpg',
        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto,w_900/site/event-furgiv-2025.jpg',
        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto,w_900/site/event-fuve-2025.jpg',
        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto,w_900/site/event-thaitails-2025.jpg',
        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto,w_900/site/event-fuve-2024.jpg',
    ];

    function ensureEventImages() {
        const imgs = panel.querySelectorAll('img[data-image-key]');
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            if (img.getAttribute('src')) continue;
            const key = img.getAttribute('data-image-key');
            const idx = parseInt(key.replace('event', ''), 10);
            if (FALLBACK_PHOTOS[idx]) img.src = FALLBACK_PHOTOS[idx];
        }
    }

    /* -------------------------------------------------------------------------
       15. Boot
       ---------------------------------------------------------------------- */
    buildTimeline();
    paintGauges();
    resetReadout();
    loadLand();

    window.addEventListener('load', () => {
        ensureEventImages();
        resize();
        sync();
    });

    setTimeout(() => {
        ensureEventImages();
        resize();
        sync();
    }, 1200);

    /* -------------------------------------------------------------------------
       16. Debug handle — the perf assertion surface
       ---------------------------------------------------------------------- */
    window.CobbyTravel = {
        get frames() { return frames; },
        isRunning() { return rafId !== 0; },
        get flights() { return FLIGHTS.map((f) => ({ ...f })); },
        get activeIndex() { return activeIndex; },
        get status() {
            return {
                active: panel.classList.contains('active'),
                hidden: document.hidden,
                inView,
                running: rafId !== 0,
                frames,
                staticMode,
                landRings: landRings.length,
                pins: pinHitList.length,
                arcs: ARCS.length,
                totalKm: TOTAL_KM,
            };
        },
        select: selectFlight,
        playTour: startTour,
        stopTour: () => stopTour(false),
        // Screen position of a real coordinate under the current camera. Used
        // by the verification harness to prove the coastlines are where they
        // claim to be; harmless in production.
        project(lat, lon) {
            const p = projectLatLon(lat, lon);
            return { x: p.x, y: p.y, visible: p.vis };
        },
    };
})();
