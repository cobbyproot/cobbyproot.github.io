

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

window.onbeforeunload = function () {
    window.scrollTo(0, 0);
};

// ---------------------------------------------------------------------------
// Boot gate
//
// `body.booting` holds the hero's moving parts invisible until the entrance
// timeline is about to play them in. Registered out here, before anything that
// can throw, so a stalled loader or a CDN that never answers still ends with a
// readable page: the gate is a courtesy, not a lock.
// ---------------------------------------------------------------------------
const HERO_PARTS = '.emitter, .hero-character-stage, .name-char, .ios-widget, .social-dock, .social-link, .scroll-hint';
let bootGateLifted = false;

function liftBootGate() {
    if (bootGateLifted) return;
    bootGateLifted = true;
    document.body.classList.remove('booting');
    document.dispatchEvent(new Event('boot:lifted'));
}

// Last resort only: this fires when the boot script never got going, not when
// the visitor is simply reading. The boot screen raises `__cobbyBootLive` once
// its controls are wired, and from then on its exit belongs to the arrow.
setTimeout(() => {
    if (bootGateLifted) return;
    if (window.__cobbyBootLive) return;
    const loader = document.getElementById('global-loader');
    liftBootGate();
    loader?.classList.add('hidden', 'retired');
    // Nothing played them in, so write the end state by hand. GSAP's inline
    // opacity would otherwise outlive the class and keep the hero dark.
    if (window.gsap) gsap.set(HERO_PARTS, { autoAlpha: 1, clearProps: 'transform,filter' });
}, 15000);

document.addEventListener("DOMContentLoaded", () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);

    const hasGsap = typeof window.gsap !== 'undefined';

    if (hasGsap) {
        gsap.registerPlugin(ScrollTrigger);
        gsap.set(HERO_PARTS, { autoAlpha: 0 });
    }

    // Detect touch/mobile — disable mouse-only features
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
    // Reduced motion means native, instant scrolling. Lenis is the thing that
    // hijacks the wheel, so under reduced motion it never starts.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth scroll is a nicety; both libraries come from a CDN, and the card
    // gets opened on convention wifi. If either is missing the page still works,
    // it just scrolls like a normal page.
    // lerp rather than duration: a fixed glide per wheel notch always reads as
    // lag behind the hand, while lerp chases the target every frame.
    const lenis = (window.Lenis && !reduceMotion) ? new Lenis({
        lerp: 0.14,
        smoothWheel: true,
    }) : null;

    const scrollToY = (y, opts) => {
        if (lenis) lenis.scrollTo(y, opts);
        else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    // The bottom dock only earns its screen space once the hero is behind us.
    const dock = document.getElementById('tab-dock');
    const raiseDock = () => {
        if (dock) dock.classList.toggle('raised', window.scrollY > window.innerHeight * 0.55);
    };

    if (lenis) {
        lenis.scrollTo(0, { immediate: true });
        lenis.on('scroll', raiseDock);
        if (hasGsap) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            // No GSAP means no ticker to pump Lenis. Without its own loop the
            // wheel is still captured and the page simply stops scrolling.
            const pump = (time) => { lenis.raf(time); requestAnimationFrame(pump); };
            requestAnimationFrame(pump);
        }
    } else {
        window.addEventListener('scroll', raiseDock, { passive: true });
    }
    raiseDock();

    // No scrolling under the loader: the page is still changing height under
    // it, and every trigger measured now would be wrong by the time it lifts.
    // Once it lifts, everything is re-measured against the finished layout.
    if (lenis && document.getElementById('global-loader')) lenis.stop();
    document.addEventListener('boot:lifted', () => {
        if (lenis) {
            lenis.start();
            lenis.resize();
        }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, { once: true });

    window.switchTab = (tabId) => {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab-${tabId}`);
        });

        // Roving tabindex: only the selected tab sits in the tab order, and
        // the arrow keys walk the rail from wherever it currently is.
        document.querySelectorAll('.dock-btn').forEach(btn => {
            const on = btn.id === `tab-btn-${tabId}`;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.tabIndex = on ? 0 : -1;
        });

        if (window.ScrollTrigger) window.ScrollTrigger.refresh();

        const targetEl = document.getElementById('tabs-container');
        if (targetEl) {
            const yPos = targetEl.getBoundingClientRect().top + window.pageYOffset - 120;
            scrollToY(yPos, { duration: 1.0 });
        }
    };

    const dockRail = document.querySelector('.dock-rail');
    if (dockRail) {
        dockRail.addEventListener('keydown', (e) => {
            const btns = [...dockRail.querySelectorAll('.dock-btn')];
            const i = btns.indexOf(document.activeElement);
            if (i < 0) return;
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            const next = step ? btns[(i + step + btns.length) % btns.length]
                : e.key === 'Home' ? btns[0]
                : e.key === 'End' ? btns[btns.length - 1]
                : null;
            if (!next) return;
            e.preventDefault();
            next.focus();
            next.click();
        });
    }

    // -----------------------------------------------------------------------
    // Cloudinary image config
    //
    // Replace these placeholder URLs with real Cloudinary URLs once uploaded.
    // The background slideshow pulls from Supabase (tag: "background"), so it
    // doesn't need entries here.
    // -----------------------------------------------------------------------
    const CLOUDINARY_BASE = 'https://res.cloudinary.com/ffppnh9h/image/upload';

    const IMAGES = {
        hero:        'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789146261/Kho%CC%82ng_Co%CC%81_Tie%CC%82u_%C4%90e%CC%82%CC%80844_20260606005456.png',
        heroFull:    'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789146261/Kho%CC%82ng_Co%CC%81_Tie%CC%82u_%C4%90e%CC%82%CC%80844_20260606005456.png',
        cobbyRef:    'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789146635/Cobby_ref_1.png',
        cobbieRef1:  'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789146651/Cobbie_Refsheet_Template_1_-_Copy.png',
        cobbieRef2:  'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789146366/1787420928827.jpg',
        // Local Blender export (assets/models/cobby.glb). If this moves to
        // Cloudinary later, swap in the hosted URL here.
        cobbyModel3d: './assets/models/cobby.glb',
        // Drop a Cobbie export at this path and the right-hand model appears.
        cobbieModel3d: './assets/models/cobbie.glb',
        // View B on the Cobbie ref sheet swaps to this one.
        cobbieKemoModel3d: './assets/models/cobbie-kemo.glb',
        ogImage:     'https://res.cloudinary.com/ffppnh9h/image/upload/f_auto,q_auto/v1789060845/gallery/jzbjonwksafpwnzmfews.webp',
        favicon:     'https://iili.io/BrOrpGj.png',
        events: [
            `${CLOUDINARY_BASE}/f_auto,q_auto/site/event-siampaws-2026.jpg`,
            `${CLOUDINARY_BASE}/f_auto,q_auto/site/event-furgiv-2025.jpg`,
            `${CLOUDINARY_BASE}/f_auto,q_auto/site/event-fuve-2025.jpg`,
            `${CLOUDINARY_BASE}/f_auto,q_auto/site/event-thaitails-2025.jpg`,
            `${CLOUDINARY_BASE}/f_auto,q_auto/site/event-fuve-2024.jpg`,
        ]
    };

    const SUPABASE_URL = 'https://jnstohrqcfwfbybnjfhh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc3RvaHJxY2Z3ZmJ5Ym5qZmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDQ3MzcsImV4cCI6MjEwNDU4MDczN30.GYtu89cvS4KcDh9xA3dkwP6RVg8s-ElHgYjmAA5O8eY';

    const modal = document.getElementById('artModal');
    const modalImg = document.getElementById('modalImg');

    window.openModal = (src) => {
        modal.classList.add('active');
        modal.classList.add('loading');
        modalImg.classList.remove('ready');

        const tempImg = new Image();
        tempImg.onload = () => {
            modalImg.src = src;
            modalImg.classList.add('ready');
            modal.classList.remove('loading');
        };
        tempImg.src = src;
    };

    window.closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modalImg.src = '';
            modalImg.classList.remove('ready');
            modal.classList.remove('loading');
        }, 300);
    };

    window.toggleLang = () => {
        document.querySelector('.lang-btn').classList.toggle('flipped');
        document.body.classList.toggle('lang-vi');
        const vi = document.body.classList.contains('lang-vi');
        document.body.classList.toggle('lang-en', !vi);

        // Keep the document, the chip's readout and its accessible name in step
        // with the body class the whole bilingual mechanism hangs off.
        document.documentElement.lang = vi ? 'vi' : 'en';
        const code = document.getElementById('lang-code');
        if (code) code.textContent = vi ? 'vi' : 'en';
        const chip = document.getElementById('lang-toggle');
        if (chip) chip.setAttribute('aria-label', vi ? 'Switch language to English' : 'Switch language to Vietnamese');

        if (lenis) lenis.resize();
    };

    // Escape closes the lightbox; it is the one dialog on the card.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) window.closeModal();
    });

    // Anything styled as a button that is not one still has to behave like one
    // for the keyboard: the character stage and both reference sheets.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target;
        if (!(el instanceof Element) || el.getAttribute('role') !== 'button') return;
        if (el.tagName === 'BUTTON' || el.tagName === 'A') return;
        e.preventDefault();
        el.click();
    });

    // The private-link greeting. `?event=fuve2026` swaps the static card for the
    // FUVE offer and the gold-led edition; otherwise the overlay stays hidden and
    // its button is simply wired.
    const handleSpecialGreet = () => {
        const overlay = document.getElementById('special-greet-overlay');
        if (!overlay) return;

        const dismiss = () => {
            if (typeof gsap === 'undefined') {
                overlay.classList.add('hidden');
                return;
            }
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.8,
                onComplete: () => overlay.classList.add('hidden'),
            });
        };

        const eventParam = new URLSearchParams(window.location.search).get('event');

        if (eventParam === 'fuve2026') {
            overlay.querySelector('.special-content').innerHTML = `
                <i class="fas fa-wand-magic-sparkles greet-icon"></i>
                <h3>hi there!</h3>
                <p>thank you for meeting me at <b>FUVE 2026</b>!</p>
                <p>want to read the card in the <b>FUVE 2026 edition</b> theme?</p>
                <div class="greet-actions">
                    <button type="button" id="activate-fuve" class="enter-btn">yes please</button>
                    <button type="button" id="close-greet" class="enter-btn is-ghost">standard</button>
                </div>
            `;
            overlay.classList.remove('hidden');
            document.getElementById('card-anim-wrapper').classList.add('play-enter');
            document.getElementById('activate-fuve').addEventListener('click', () => {
                document.body.classList.add('fuve-edition');
                dismiss();
            });
        }

        const closeBtn = document.getElementById('close-greet');
        if (closeBtn) closeBtn.addEventListener('click', dismiss);
    };

    window.copyGameUsername = (text, btn) => {
        const icon = btn.querySelector('i');
        navigator.clipboard.writeText(text).then(() => {
            btn.classList.add('copied');
            icon.className = 'fas fa-check';
            setTimeout(() => {
                btn.classList.remove('copied');
                icon.className = 'far fa-copy';
            }, 2000);
        }).catch(() => {
            // Clipboard is denied on plain http and behind some permissions, and
            // a silent no-op leaves a stranger thinking the card is broken.
            window.showToast(`could not copy — it is “${text}”`);
        });
    };

    // -----------------------------------------------------------------------
    // Background strip wall
    //
    // The backdrop is the owner's background-tagged artwork cut into rows that
    // drift against each other, under the whole wall turned 30° across the
    // viewport. The rotation is why the wall is sized from the *rotated*
    // viewport cover instead of the viewport: at 30° the viewport's corners
    // land outside a 100vw × 100vh box, and one fixed vmax size would run short
    // on one aspect ratio and waste pixels on another.
    // -----------------------------------------------------------------------
    const BG_ANGLE = 30;
    // px per second, one per row. Deliberately uneven, and the list is cycled.
    const BG_ROW_SPEEDS = [26, 40, 20, 34, 24, 46, 18, 38, 30, 22];

    const makeBgTile = (url) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        return img;
    };

    const initBgSlideshow = async () => {
        const bgContainer = document.getElementById('bg-slideshow');
        if (!bgContainer) return;

        let bgUrls = [];
        try {
            if (window.supabase) {
                const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                const { data, error } = await client
                    .from('artworks')
                    .select('image_url, thumbnail_url')
                    .contains('tags', ['background'])
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    bgUrls = data
                        .map(row => row.thumbnail_url || row.image_url)
                        .filter(Boolean);
                }

                // A wall needs a wall's worth of pictures. When few artworks
                // carry the `background` tag, the rest of the gallery fills it
                // out — safe art only, through the same `is_nsfw` flag the
                // gallery's own default view uses.
                if (bgUrls.length < 10) {
                    const { data: recent, error: recentError } = await client
                        .from('artworks')
                        .select('image_url, thumbnail_url')
                        .eq('is_nsfw', false)
                        .order('created_at', { ascending: false })
                        .limit(60);

                    if (!recentError && recent) {
                        const seen = new Set(bgUrls);
                        recent.forEach((row) => {
                            const url = row.thumbnail_url || row.image_url;
                            if (url && !seen.has(url)) {
                                seen.add(url);
                                bgUrls.push(url);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('[BgSlideshow] Supabase query failed:', err.message);
        }

        if (bgUrls.length === 0) return;

        const perf = window.CobbyPerf;
        const level = perf && typeof perf.level === 'number' ? perf.level : 3;
        // Fewer, larger rows on weaker gear. Lite never animates the wall, and
        // bigger thumbnails mean fewer of them, so there is far less to paint.
        const rowCount = level <= 0 ? 5 : level <= 1 ? 8 : 10;

        let lastVw = 0;
        let lastVh = 0;
        let resizeTimer = 0;

        const build = () => {
            bgContainer.innerHTML = '';

            const vw = window.innerWidth || 1;
            const vh = window.innerHeight || 1;
            const rad = (BG_ANGLE * Math.PI) / 180;
            // The area the wall has to cover once turned, plus 12% overscan so
            // the end of a strip never becomes the edge of the screen.
            const planeW = Math.ceil((vw * Math.cos(rad) + vh * Math.sin(rad)) * 1.12);
            const planeH = Math.ceil((vw * Math.sin(rad) + vh * Math.cos(rad)) * 1.12);
            const gap = 8;

            const plane = document.createElement('div');
            plane.className = 'bg-rows';
            plane.style.width = `${planeW}px`;
            plane.style.height = `${planeH}px`;
            plane.style.setProperty('--bg-row-h', `${Math.max(56, Math.floor(planeH / rowCount) - gap)}px`);
            plane.style.setProperty('--bg-gap', `${gap}px`);
            bgContainer.appendChild(plane);

            for (let r = 0; r < rowCount; r++) {
                const row = document.createElement('div');
                row.className = 'bg-row' + (r % 2 ? ' is-rev' : '');
                plane.appendChild(row);

                // Measure one tile before building the strip: every tile is the
                // same fixed size, so the layout is known before any image has
                // decoded and the strip can be sized without waiting on it.
                row.appendChild(makeBgTile(bgUrls[0]));
                const tileW = row.firstElementChild.offsetWidth;
                row.innerHTML = '';
                const advance = Math.max(1, tileW + gap);

                // Each row takes a different window of the pool, so the wall
                // reads as many pictures instead of the same few repeated. A
                // small pool is repeated to fill its row; a large one is cut
                // into overlapping windows.
                const needed = Math.max(1, Math.ceil(planeW / advance));
                const tableSize = Math.min(bgUrls.length, Math.max(needed, 6));
                const start = Math.floor((r * bgUrls.length) / rowCount);
                const reps = Math.max(1, Math.ceil(planeW / (advance * tableSize)));

                for (let rep = 0; rep < reps; rep++) {
                    for (let i = 0; i < tableSize; i++) {
                        row.appendChild(makeBgTile(bgUrls[(start + i) % bgUrls.length]));
                    }
                }

                // The strip is held twice end to end, so a -50% translation
                // lands on an identical frame and the loop has no seam.
                Array.from(row.children).forEach((tile) => row.appendChild(tile.cloneNode(true)));

                const halfW = row.offsetWidth / 2;
                const speed = BG_ROW_SPEEDS[r % BG_ROW_SPEEDS.length];
                row.style.setProperty('--bg-dur', `${Math.max(30, Math.round(halfW / speed))}s`);
            }

            lastVw = vw;
            lastVh = vh;
        };

        build();

        // A drag or an orientation change changes the planar cover. Rebuild on
        // settle rather than on every frame of the drag.
        const scheduleBuild = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // A phone's URL bar showing/hiding fires resize with only a
                // small height change. Rebuilding for that would restart every
                // row mid-scroll, and the overscan already covers the few pixels
                // it costs.
                if (Math.abs(window.innerWidth - lastVw) < 2 &&
                    Math.abs(window.innerHeight - lastVh) < 140) return;
                build();
            }, 250);
        };
        window.addEventListener('resize', scheduleBuild);
        window.addEventListener('orientationchange', scheduleBuild);

        // A tier drop changes the row count; rebuild once so the wall matches.
        if (perf && typeof perf.onChange === 'function') perf.onChange(build);
    };

    // The one authored motion moment: the projector warms up. Nothing below the
    // hero gets a scroll reveal — the tab switch and the trait bars carry that.
    window.initAnimations = () => {
        liftBootGate();
        if (!hasGsap) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // The stylesheet forces these visible under reduced motion; drop the
            // inline values written above so CSS is the only thing in charge.
            gsap.set(HERO_PARTS, { clearProps: 'opacity,visibility,transform,filter' });
            return;
        }

        // The stage is only a container. Making it visible up front lets the
        // emitter and the character inside it land on separate beats instead of
        // the emitter being multiplied by a parent that is still at zero.
        gsap.set('.hero-character-stage', { autoAlpha: 1 });
        gsap.set('.hero-character-png', { autoAlpha: 0 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // 1. The pool of light ignites where the character is about to land.
        //    Transform stays on the children — `.emitter` carries the centring.
        tl.fromTo('.emitter', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0);
        tl.fromTo('.emitter-pool, .emitter-rim',
            { scale: 0.4, transformOrigin: '50% 50%' },
            { scale: 1, duration: 1.0, ease: 'expo.out' },
            0
        );

        // 2. COBBY resolves out of misregistration: the letters arrive blurred and
        //    low while the CSS aberration-settle keyframes pull the colour
        //    channels back into register over the same beat.
        tl.fromTo('.name-char',
            { autoAlpha: 0, y: 46, filter: 'blur(9px)' },
            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.85, stagger: 0.035, ease: 'power4.out', clearProps: 'filter' },
            0.18
        );

        // 3. The character materialises onto the light. Blur plus over-brightness
        //    is the "still projecting" tell, and it is the expensive half, so
        //    touch screens get the move without the filter. The stylesheet's own
        //    drop-shadow has to ride along or GSAP would flatten it.
        const dropShadow = 'drop-shadow(0 26px 44px rgba(0, 0, 0, 0.62))';
        tl.fromTo('.hero-character-png',
            isMobile
                ? { autoAlpha: 0, y: 26, scale: 0.97 }
                : { autoAlpha: 0, y: 26, scale: 0.97, filter: `blur(14px) brightness(2.1) ${dropShadow}` },
            Object.assign(
                {
                    autoAlpha: 1, y: 0, scale: 1, clearProps: 'filter',
                    onStart: () => gsap.set('.hero-character-png', { clearProps: 'rotate' }),
                },
                isMobile ? { duration: 1.0 } : { duration: 1.15, filter: `blur(0px) brightness(1) ${dropShadow}` }
            ),
            '-=0.55'
        );

        // 4. The two instrument panels boot into place.
        tl.fromTo('.ios-widget',
            { autoAlpha: 0, y: 24, scale: 0.96 },
            {
                autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1,
                /* GSAP writes transform/translate/rotate beside the tween it
                   manages; clear them so the stylesheet's hand-placed rotation,
                   idle bob, and pointer transform all survive. */
                onStart: () => gsap.set('.ios-widget', { clearProps: 'rotate' }),
            },
            '-=0.62'
        );

        // 5. The social links: the one thing a stranger has to reach without
        //    scrolling. On a phone they arrive as a single bar; on a pointer
        //    device each handle is its own node and they land one after another,
        //    so the orbit assembles instead of appearing as one slab.
        //    Opacity only — the layer and the nodes carry their own transforms.
        if (window.matchMedia('(min-width: 901px)').matches) {
            // The orbit layer is only a positioning frame for the nodes, so it
            // comes up instantly and the stagger does the work.
            gsap.set('.social-dock', { autoAlpha: 1 });
            tl.fromTo('.social-link',
                { autoAlpha: 0, scale: 0.9 },
                {
                    autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)',
                    onStart: () => gsap.set('.social-link', { clearProps: 'rotate' }),
                },
                '-=0.5'
            );
        } else {
            // In the bar the links are cells of one panel, so the panel is the
            // thing that arrives. Clear the per-node hidden state written above.
            gsap.set('.social-link', { clearProps: 'opacity,visibility' });
            tl.fromTo('.social-dock', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.4');
        }

        // 6. And last, the invitation to keep going. The parent fades in; the
        //    chevron's endless drift is CSS on the child, so the two never fight.
        tl.fromTo('.scroll-hint', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '-=0.15');

        // The entrance writes transform / translate / rotate inline while it
        // animates a target. Clear them once the whole timeline has finished so
        // the stylesheet's hand-placed rotation and the idle-float / pointer
        // transforms take over; clearing mid-tween would fight the tween itself.
        tl.eventCallback('onComplete', () => {
            /* Removed with the DOM API rather than gsap.set(clearProps): GSAP
               re-reads the computed transform while clearing and bakes the CSS
               rotation / idle translate back in, which would pin both. */
            document.querySelectorAll('.ios-widget, .social-link, .hero-character-png').forEach((el) => {
                el.style.removeProperty('transform');
                el.style.removeProperty('translate');
                el.style.removeProperty('rotate');
                el.style.removeProperty('scale');
            });
        });

        // The hero is a full-screen set, and letting it fall away as the visitor
        // scrolls is the only scroll-linked motion on the card.
        gsap.to('.persistent-hero', {
            opacity: 0,
            y: -60,
            scrollTrigger: {
                trigger: '.persistent-hero',
                start: 'top top',
                end: 'bottom 45%',
                scrub: true,
            },
        });
    };

    const initPongGame = () => {
        const canvas = document.getElementById('pong-canvas');
        if (!canvas) return;
        const scoreEl = document.getElementById('pong-score');
        const ctx = canvas.getContext('2d');

        // The card's accent, not the old cyan.
        const COLOR = '#00f0d4';
        const COLOR_RGB = '0,240,212';

        function resize() {
            canvas.width = canvas.offsetWidth || 300;
            canvas.height = canvas.offsetHeight || 52;
        }
        resize();
        window.addEventListener('resize', resize);

        const paddleW = 4, paddleH = 14;
        const ballSize = 3;
        let frame = 0;
        let leftPaddleY = canvas.height / 2 - paddleH / 2;
        let rightPaddleY = canvas.height / 2 - paddleH / 2;
        let ballX = canvas.width / 2, ballY = canvas.height / 2;
        let ballDX = 0.6, ballDY = 0.4;
        let leftScore = 0, rightScore = 0;

        function resetBall(winner) {
            ballX = canvas.width / 2;
            ballY = canvas.height / 2;
            ballDX = winner === 'left' ? 0.6 : -0.6;

            ballDY = (Math.random() * 0.4 + 0.3) * (Math.random() > 0.5 ? 1 : -1);
        }

        function update() {

            ballX += ballDX;
            ballY += ballDY;

            if (ballY <= 0 || ballY >= canvas.height - ballSize) {
                ballDY *= -1;
            }

        if (ballX < canvas.width * 0.5) {
            const leftTarget = ballY - paddleH / 2 + (Math.sin(frame * 0.05) * 2);
            leftPaddleY += (leftTarget - leftPaddleY) * 0.12;
        }
        leftPaddleY = Math.max(0, Math.min(canvas.height - paddleH, leftPaddleY));

        if (ballX > canvas.width * 0.5) {
            const rightTarget = ballY - paddleH / 2 + (Math.cos(frame * 0.04) * 3);
            rightPaddleY += (rightTarget - rightPaddleY) * 0.06;
        }
        rightPaddleY = Math.max(0, Math.min(canvas.height - paddleH, rightPaddleY));

            if (ballX <= paddleW + 2) {
                if (ballY + ballSize >= leftPaddleY && ballY <= leftPaddleY + paddleH) {
                    ballDX = Math.abs(ballDX);

                    const impactY = (ballY + ballSize / 2) - (leftPaddleY + paddleH / 2);
                    ballDY = impactY * 0.12;

                    if (Math.abs(ballDY) > 0.7) ballDY = Math.sign(ballDY) * 0.7;
                    if (Math.abs(ballDY) < 0.3) ballDY = Math.sign(ballDY || 1) * 0.3;
                    ballX = paddleW + 2;
                } else if (ballX <= 0) {
                    rightScore++;
                    updateScore();
                    resetBall('right');
                }
            }

            if (ballX >= canvas.width - paddleW - ballSize - 2) {
                if (ballY + ballSize >= rightPaddleY && ballY <= rightPaddleY + paddleH) {
                    ballDX = -Math.abs(ballDX);

                    const impactY = (ballY + ballSize / 2) - (rightPaddleY + paddleH / 2);
                    ballDY = impactY * 0.12;

                    if (Math.abs(ballDY) > 0.7) ballDY = Math.sign(ballDY) * 0.7;
                    if (Math.abs(ballDY) < 0.3) ballDY = Math.sign(ballDY || 1) * 0.3;
                    ballX = canvas.width - paddleW - ballSize - 2;
                } else if (ballX >= canvas.width) {
                    leftScore++;
                    updateScore();
                    resetBall('left');
                }
            }

            if (Math.abs(ballDX) > 4) ballDX = Math.sign(ballDX) * 4;
        }

        function updateScore() {
            if (scoreEl) scoreEl.textContent = `PLAYER ${leftScore} | BOT ${rightScore}`;
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < canvas.height; i += 4) {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(0, i, canvas.width, 2);
            }

            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = `rgba(${COLOR_RGB}, 0.2)`;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = COLOR;

            ctx.fillRect(2, leftPaddleY, paddleW, paddleH);
            ctx.fillRect(canvas.width - paddleW - 2, rightPaddleY, paddleW, paddleH);

            ctx.fillRect(ballX, ballY, ballSize, ballSize);

            ctx.shadowBlur = 8;
            ctx.shadowColor = COLOR;
        }

        function loop() {
            frame++;
            update();
            draw();
        }

        if (typeof gsap !== 'undefined') {
            gsap.ticker.add(loop);
        }
    };

    // -----------------------------------------------------------------------
    // Apply image config to all data-image-key elements in the page
    // -----------------------------------------------------------------------
    const applyImageConfig = () => {
        const resolveKey = (key) => {
            if (key.startsWith('event')) {
                const idx = parseInt(key.replace('event', ''), 10);
                return IMAGES.events[idx] || '';
            }
            return IMAGES[key] || '';
        };

        document.querySelectorAll('[data-image-key]').forEach(el => {
            const key = el.getAttribute('data-image-key');
            const url = resolveKey(key);
            if (!url) return;

            if (el.tagName === 'IMG') {
                el.src = url;
            }

            // For elements that open in the modal on click (hero stage, ref sheet wrappers)
            if (el.getAttribute('role') === 'button' || el.classList.contains('hero-character-stage')) {
                const imgKey = el.tagName === 'IMG' ? key : el.getAttribute('data-image-key');
                const modalUrl = (imgKey === 'hero') ? IMAGES.heroFull : url;
                el.setAttribute('onclick', `openModal('${modalUrl}')`);
            }
        });

        document.querySelectorAll('[data-model-key]').forEach(el => {
            const url = IMAGES[el.getAttribute('data-model-key')];
            if (url) el.setAttribute('src', url);
        });
    };

    // -----------------------------------------------------------------------
    // Cobbie ref sheet toggle (View A / View B)
    // -----------------------------------------------------------------------
    // Each bubble swaps the ref sheet image and the 3D model together. The
    // sheet flips edge-on, changes once the new image has loaded, then flips
    // back; the model's own spin-swap lives on the scene (duo.swapModel).
    const COBBIE_VARIANTS = {
        1: { ref: 'cobbieRef1', model: 'cobbieModel3d' },
        2: { ref: 'cobbieRef2', model: 'cobbieKemoModel3d' },
    };

    const initCobbieToggle = () => {
        const duo = document.getElementById('cobbie-scene');
        const buttons = document.querySelectorAll('.variant-bubble');
        const wrapper = document.getElementById('cobbie-ref-wrapper');
        const img = document.getElementById('cobbie-ref-img');
        if (!buttons.length || !wrapper || !img) return;

        const animate = hasGsap && !reduceMotion;
        let current = '1';
        let busy = false;

        const loadImage = (url) => new Promise((resolve) => {
            const probe = new Image();
            probe.onload = probe.onerror = () => resolve();
            probe.src = url;
        });

        const swapSheet = async (url, key) => {
            const apply = () => {
                img.src = url;
                wrapper.setAttribute('data-image-key', key);
                wrapper.setAttribute('onclick', `openModal('${url}')`);
            };
            if (!animate) { apply(); return; }
            const ready = loadImage(url);
            await gsap.to(wrapper, {
                rotateY: 90, scale: 0.94, filter: 'brightness(1.8) saturate(0.4)',
                duration: 0.32, ease: 'power2.in', transformPerspective: 1000,
            });
            await ready;
            apply();
            gsap.set(wrapper, { rotateY: -90 });
            await gsap.to(wrapper, {
                rotateY: 0, scale: 1, filter: 'brightness(1) saturate(1)',
                duration: 0.55, ease: 'back.out(1.6)',
            });
            gsap.set(wrapper, { clearProps: 'filter' });
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const variant = btn.dataset.refVariant;
                if (variant === current || busy) return;
                const v = COBBIE_VARIANTS[variant];
                if (!v) return;
                busy = true;
                current = variant;

                buttons.forEach(b => {
                    const isActive = b === btn;
                    b.classList.toggle('is-active', isActive);
                    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                });
                if (animate) {
                    gsap.fromTo(btn, { scale: 0.8 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
                }

                try {
                    await Promise.all([
                        swapSheet(IMAGES[v.ref], v.ref),
                        duo?.swapModel?.(IMAGES[v.model]),
                    ]);
                } finally {
                    busy = false;
                }
            });
        });
    };

    // -----------------------------------------------------------------------
    // Ref sheet scenes: a 3D model, a stacked name and a tilted ref sheet box
    // that all move with the scroll. Cobby sits on the left; Cobbie is the
    // mirror image, with the model and name on the right.
    // -----------------------------------------------------------------------
    const REF_SCENES = [
        // defaultView is the resting camera angle. Tune it by opening the page
        // with ?tune3d=<name>, dragging the model, and pressing "copy for code".
        { name: 'cobby', duo: '#cobby-scene', side: 1, defaultView: { theta: -3.5, phi: 107.3 } },
        {
            name: 'cobbie', duo: '#cobbie-scene', side: -1, defaultView: { theta: -6, phi: 99 },
            // Other models the scene can swap to, each with its own resting angle.
            variants: [
                { name: 'cobbie-kemo', model: 'cobbieKemoModel3d', defaultView: { theta: -23.5, phi: 105.6 } },
            ],
        },
    ];

    // Shared feel for every scene. The spin is driven by scroll position, not
    // time: scroll slowly and it turns slowly, stop halfway and it stays half
    // turned. The scroll value is eased every frame for a Locomotive-style
    // glide, and a small mouse tilt is added on top.
    const TILT_TURN = 14;
    const TILT_LIFT = 4;
    // Section progress (0 = just entering at the bottom, 1 = gone off the
    // top) at which the spin-in ends and the spin-out begins.
    const IN_END = 0.4;
    const OUT_START = 0.62;
    const SPIN_IN = 360;
    const SPIN_OUT = 200;
    const GLIDE = 0.09;
    const LETTER_STAGGER = 0.035;
    // Ref sheet box: resting turn and lean in degrees, and how far the mouse
    // can lean it on top of that. The turn is mirrored on right-hand scenes.
    const BOX_TURN = -16;
    const BOX_LEAN = 3;
    const BOX_TILT = 5;

    const viewKey = (cfg) => `${cfg.name}_model_view`;
    const loadView = (cfg) => {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(viewKey(cfg))); } catch (err) { /* ignore bad value */ }
        return { ...cfg.defaultView, ...(saved || {}) };
    };

    const initRefScene = (cfg) => {
        const duo = document.querySelector(cfg.duo);
        if (!duo) return;
        const side = cfg.side;

        const viewer = duo.querySelector('model-viewer');
        const panel = viewer?.closest('.refsheet-model-panel');
        const hasModel = !!viewer?.getAttribute('src');
        // No model file yet (or it failed to load): drop the slot rather than
        // leave a poster spinning forever.
        const hidePanel = () => { if (panel) panel.hidden = true; };
        if (!hasModel) hidePanel();
        else viewer.addEventListener('error', hidePanel);

        // Each model keeps its own resting angle; swapping models swaps it too.
        const views = new Map();
        if (hasModel) views.set(viewer.getAttribute('src'), loadView(cfg));
        (cfg.variants || []).forEach(v => views.set(IMAGES[v.model], loadView(v)));
        let view = loadView(cfg);
        let FRONT = view.theta;
        const useView = (url) => {
            view = views.get(url) || view;
            FRONT = view.theta;
        };
        let lastOrbit = '';
        const setOrbit = (theta, phi) => {
            if (!hasModel) return;
            const next = `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg 105%`;
            if (next === lastOrbit) return;
            lastOrbit = next;
            viewer.cameraOrbit = next;
            // Skip model-viewer's own easing so the camera follows exactly.
            viewer.jumpCameraToGoal?.();
        };
        // The poster dismisses itself once the .glb has rendered. The boot
        // loader also sets every viewer to eager, so the models are already
        // downloading by the time the section scrolls in and this is a no-op.
        const reveal = () => { if (hasModel) viewer.dismissPoster?.(); };

        const tune = new URLSearchParams(location.search).get('tune3d');
        const tuneName = tune === null ? null : (tune || 'cobby');
        const tuneVariant = (cfg.variants || []).find(v => v.name === tuneName);
        if (hasModel && (tuneName === cfg.name || tuneVariant)) {
            if (tuneVariant) {
                const url = IMAGES[tuneVariant.model];
                viewer.loading = 'eager';
                viewer.setAttribute('src', url);
                useView(url);
            }
            initModelTuner(viewer, duo, tuneVariant || cfg);
            setOrbit(FRONT, view.phi);
            reveal();
            return;
        }

        // Variant switching (Cobbie's A/B) calls duo.swapModel(url). Without
        // motion it is a plain source swap; the animated version replaces it
        // further down.
        duo.swapModel = async (url) => {
            if (!hasModel || !url) return;
            viewer.loading = 'eager';
            viewer.setAttribute('src', url);
            useView(url);
            setOrbit(FRONT, view.phi);
        };

        if (reduceMotion || !hasGsap || !window.ScrollTrigger) {
            setOrbit(FRONT, view.phi);
            reveal();
            return;
        }

        const nameEl = duo.querySelector('.refsheet-name');
        const bubbles = duo.querySelector('.variant-bubbles');
        const kindEl = nameEl?.querySelector('.char-kind');
        const letters = nameEl ? [...nameEl.querySelectorAll('.char-letter')] : [];
        const box = duo.querySelector('.refsheet-container');
        const anchor = hasModel ? viewer : (box || duo);

        const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
        const scroll = { p: 0, target: 0 };
        // Variant swap: `show` fades/scales the model on top of the scroll
        // presence, `spin` adds a quick extra turn while it changes.
        const swap = { show: 1, spin: 0 };
        let swapping = false;
        let lastPresence = 0;
        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const easeOut = gsap.parseEase('power2.out');
        const easeIn = gsap.parseEase('power2.in');
        let lastLook = '';
        let lastP = -1;
        let lastBox = '';

        const frame = () => {
            scroll.p += (scroll.target - scroll.p) * GLIDE;
            tilt.x += (tilt.tx - tilt.x) * 0.08;
            tilt.y += (tilt.ty - tilt.y) * 0.08;

            const p = scroll.p;
            const enter = easeOut(gsap.utils.clamp(0, 1, p / IN_END));
            const leave = easeIn(gsap.utils.clamp(0, 1, (p - OUT_START) / (1 - OUT_START)));
            const presence = enter * (1 - leave);
            lastPresence = presence;

            if (hasModel) {
                const look = `${presence.toFixed(3)}|${swap.show.toFixed(3)}`;
                if (look !== lastLook) {
                    lastLook = look;
                    gsap.set(viewer, {
                        autoAlpha: presence * swap.show,
                        scale: (0.9 + 0.1 * presence) * (0.7 + 0.3 * swap.show),
                        y: 24 * (1 - enter) - 16 * leave + 30 * (1 - swap.show),
                    });
                }
            }

            if (Math.abs(p - lastP) > 0.0002) {
                lastP = p;
                // Slow drift against the scroll: the name lags, the box leads,
                // which gives the section depth while it passes.
                const drift = p - 0.5;

                letters.forEach((el, i) => {
                    const li = easeOut(gsap.utils.clamp(0, 1, (p - i * LETTER_STAGGER) / (IN_END * 0.85)));
                    const lo = easeIn(gsap.utils.clamp(0, 1,
                        (p - OUT_START - i * LETTER_STAGGER) / (1 - OUT_START - 0.15)));
                    gsap.set(el, {
                        autoAlpha: li * (1 - lo),
                        yPercent: 70 * (1 - li) - 70 * lo,
                        rotateX: -70 * (1 - li) + 50 * lo,
                        transformPerspective: 500,
                    });
                });
                if (kindEl) {
                    const ki = easeOut(gsap.utils.clamp(0, 1, (p - 0.12) / (IN_END * 0.7)));
                    gsap.set(kindEl, { autoAlpha: ki * (1 - leave), y: 30 * (1 - ki) });
                }
                if (nameEl) gsap.set(nameEl, { y: drift * -90 });
            }

            if (box) {
                // Resting 3D angle: hinged on the edge away from the model, the
                // near edge turns back behind it. It swings in from that far
                // side, and the mouse leans it toward the cursor.
                const bi = easeOut(gsap.utils.clamp(0, 1, (p - 0.04) / IN_END));
                const rotY = side * (BOX_TURN - 14 * (1 - bi) + 6 * leave) + tilt.x * BOX_TILT * presence;
                const rotX = BOX_LEAN - tilt.y * BOX_TILT * 0.6 * presence;
                const boxKey = `${p.toFixed(4)}|${rotY.toFixed(2)}|${rotX.toFixed(2)}`;
                if (boxKey !== lastBox) {
                    lastBox = boxKey;
                    gsap.set(box, {
                        autoAlpha: 0.15 + 0.85 * bi * (1 - leave * 0.85),
                        x: side * (70 * (1 - bi) + 40 * leave),
                        y: (p - 0.5) * 50,
                        rotateY: rotY,
                        rotateX: rotX,
                        transformPerspective: 1400,
                        transformOrigin: side > 0 ? '100% 50%' : '0% 50%',
                    });
                    // The A/B bubbles ride along with the box, arriving just after it.
                    if (bubbles) {
                        const bb = easeOut(gsap.utils.clamp(0, 1, (p - 0.1) / IN_END));
                        gsap.set(bubbles, {
                            autoAlpha: bb * (1 - leave),
                            x: side * (40 * (1 - bb) + 30 * leave),
                            y: (p - 0.5) * 50,
                        });
                    }
                }
            }

            // Mirrored scenes spin the other way. Orbiting the camera toward
            // the cursor turns the model away from it, so the camera goes the
            // opposite way.
            const angle = FRONT - side * SPIN_IN * (1 - enter) + side * SPIN_OUT * leave + side * swap.spin;
            setOrbit(angle - tilt.x * TILT_TURN * presence, view.phi - tilt.y * TILT_LIFT * presence);
        };

        const onPointer = (e) => {
            const r = anchor.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            tilt.tx = gsap.utils.clamp(-1, 1, (e.clientX - cx) / (window.innerWidth / 2));
            tilt.ty = gsap.utils.clamp(-1, 1, (e.clientY - cy) / (window.innerHeight / 2));
        };
        const resetTilt = () => { tilt.tx = 0; tilt.ty = 0; };

        // The frame loop and mouse listener only run while the section is
        // anywhere on screen; the loop keeps going until the glide settles.
        let running = false;
        let onScreen = false;
        const tick = () => {
            frame();
            const settled = Math.abs(scroll.target - scroll.p) < 0.0005
                && Math.abs(tilt.tx - tilt.x) < 0.001
                && Math.abs(tilt.ty - tilt.y) < 0.001;
            if (!onScreen && settled && !swapping) stopLoop();
        };
        const startLoop = () => {
            if (running) return;
            running = true;
            gsap.ticker.add(tick);
            if (canHover) {
                window.addEventListener('pointermove', onPointer, { passive: true });
                document.addEventListener('pointerleave', resetTilt);
            }
        };
        const stopLoop = () => {
            if (!running) return;
            running = false;
            gsap.ticker.remove(tick);
            window.removeEventListener('pointermove', onPointer);
            document.removeEventListener('pointerleave', resetTilt);
        };

        if (hasModel) gsap.set(viewer, { autoAlpha: 0, scale: 0.9, y: 24, transformOrigin: '50% 60%' });
        frame();

        // Animated variant swap: spin away and shrink, change the .glb, wait
        // for it to load, then spin back in. A burst on the aura covers the cut.
        // Resolves on load or error, or after a timeout so a stalled download
        // can never lock the A/B bubbles.
        const waitForLoad = (ms = 20000) => new Promise((resolve) => {
            let timer;
            const done = () => {
                clearTimeout(timer);
                viewer.removeEventListener('load', done);
                viewer.removeEventListener('error', done);
                resolve();
            };
            timer = setTimeout(done, ms);
            viewer.addEventListener('load', done);
            viewer.addEventListener('error', done);
        });
        duo.swapModel = async (url) => {
            if (!hasModel || !url || viewer.getAttribute('src') === url) return;
            swapping = true;
            startLoop();
            panel?.classList.add('is-swapping');
            gsap.killTweensOf(swap);
            try {
                await gsap.to(swap, { show: 0, spin: 160, duration: 0.45, ease: 'power2.in' });
                const loaded = waitForLoad();
                // A new src has to be loaded eagerly: `loading="lazy"` holds it
                // until the section scrolls back into view, so the swap would
                // sit blank for as long as the visitor stays where they are.
                viewer.loading = 'eager';
                viewer.setAttribute('src', url);
                useView(url);
                await loaded;

                swap.spin = -200;
                await gsap.to(swap, { show: 1, spin: 0, duration: 0.9, ease: 'expo.out' });
            } finally {
                swap.show = 1;
                panel?.classList.remove('is-swapping');
                swapping = false;
            }
        };

        // A model that finishes downloading after the visitor has already
        // scrolled in missed its scroll spin, so it gets a short spin-in of its
        // own instead of popping into place.
        if (hasModel) {
            viewer.addEventListener('load', () => {
                if (swapping || !onScreen || lastPresence < 0.05) return;
                gsap.killTweensOf(swap);
                swap.spin = -240;
                swap.show = 0;
                gsap.to(swap, { show: 1, duration: 0.6, ease: 'power2.out' });
                gsap.to(swap, { spin: 0, duration: 1.2, ease: 'expo.out' });
            });
        }

        ScrollTrigger.create({
            trigger: duo,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
                scroll.target = self.progress;
                // A fast flick can jump right over the section without it ever
                // counting as on screen. Off screen there is nothing to glide,
                // so snap, or the next visit replays the whole jump.
                if (!running) {
                    scroll.p = self.progress;
                    frame();
                }
            },
            onToggle: (self) => {
                onScreen = self.isActive;
                if (onScreen) {
                    // Arriving from off screen, start at the edge it came in
                    // from, so even a flick deep into the section plays the
                    // spin-in rather than skipping to the middle.
                    if (!running) {
                        scroll.p = self.direction > 0 ? 0 : 1;
                        frame();
                    }
                    reveal();
                    startLoop();
                } else {
                    resetTilt();
                }
            },
            onRefresh: (self) => {
                scroll.target = self.progress;
                scroll.p = self.progress;
                frame();
            },
        });
    };

    // ?tune3d=<name> — drag that model by hand, then save the angle it should
    // rest at. A bare ?tune3d tunes Cobby.
    const initModelTuner = (viewer, duo, cfg) => {
        const key = viewKey(cfg);
        const defaults = cfg.defaultView;
        const panel = viewer.closest('.refsheet-model-panel');
        if (panel) panel.classList.add('is-tuning');
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('interaction-prompt', 'none');
        viewer.setAttribute('disable-zoom', '');
        viewer.setAttribute('disable-pan', '');

        const ui = document.createElement('div');
        ui.className = 'model-tuner hud';
        ui.innerHTML = `
            <p class="model-tuner-title">${cfg.name} · 3d model angle</p>
            <p class="model-tuner-hint">drag the model to face the way you want</p>
            <output class="model-tuner-readout" aria-live="polite"></output>
            <div class="model-tuner-actions">
                <button type="button" data-act="save">save</button>
                <button type="button" data-act="copy">copy for code</button>
                <button type="button" data-act="reset">reset</button>
            </div>`;
        document.body.appendChild(ui);
        const readout = ui.querySelector('.model-tuner-readout');

        const toDeg = (rad) => rad * 180 / Math.PI;
        const current = () => {
            const o = viewer.getCameraOrbit();
            let theta = toDeg(o.theta) % 360;
            if (theta > 180) theta -= 360;
            if (theta < -180) theta += 360;
            return { theta: Math.round(theta * 10) / 10, phi: Math.round(toDeg(o.phi) * 10) / 10 };
        };
        const update = () => {
            const v = current();
            readout.textContent = `turn ${v.theta}° · tilt ${v.phi}°`;
        };
        viewer.addEventListener('camera-change', update);
        viewer.addEventListener('load', update);

        ui.addEventListener('click', async (e) => {
            const act = e.target.closest('button')?.dataset.act;
            if (!act) return;
            const v = current();
            if (act === 'save') {
                localStorage.setItem(key, JSON.stringify(v));
                window.showToast?.(`saved on this browser: turn ${v.theta}°, tilt ${v.phi}°`);
            } else if (act === 'copy') {
                const line = `defaultView: { theta: ${v.theta}, phi: ${v.phi} }`;
                try {
                    await navigator.clipboard.writeText(line);
                    window.showToast?.(`copied — paste it over ${cfg.name}'s defaultView in js/main.js`);
                } catch (err) {
                    window.prompt(`copy this over ${cfg.name}'s defaultView in js/main.js`, line);
                }
            } else if (act === 'reset') {
                localStorage.removeItem(key);
                viewer.cameraOrbit = `${defaults.theta}deg ${defaults.phi}deg 105%`;
                viewer.jumpCameraToGoal?.();
                window.showToast?.('reset to default angle');
            }
        });

        duo.scrollIntoView({ block: 'center' });
        update();
    };

    applyImageConfig();
    initCobbieToggle();
    handleSpecialGreet();
    initBgSlideshow();
    REF_SCENES.forEach(initRefScene);
    // initAnimations() is called by the boot screen when the visitor takes the
    // arrow, so the entrance plays in front of them rather than behind it.
    if (!isMobile) initPongGame();

    // The gallery is a same-origin sub-app, so its height can be read directly.
    // A fixed iframe height would leave a dead zone under a short gallery and
    // clip a long one, so the frame is fitted to the document inside it and
    // re-fitted whenever that document's body changes size.
    const galleryFrame = document.querySelector('.gallery-iframe');
    if (galleryFrame) {
        const fitGallery = () => {
            const doc = galleryFrame.contentDocument;
            if (!doc || !doc.body) return;
            galleryFrame.style.height = `${Math.max(doc.body.scrollHeight, 480)}px`;
        };
        galleryFrame.addEventListener('load', () => {
            fitGallery();
            try {
                new ResizeObserver(fitGallery).observe(galleryFrame.contentDocument.body);
            } catch (err) { /* older browsers: the load-time fit still applies */ }
        });
    }

    window.addEventListener('resize', () => {
        if (lenis) lenis.resize();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    /* ==========================================================================
       HUD toast — the card's one feedback channel. A copied handle and a refused
       clipboard write both speak through it. Built up front and marked as a live
       region, because one created at the moment of the first message is never
       announced.
       ========================================================================== */

    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);

    let toastTimer;
    window.showToast = function (msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
    };
});

/* ==========================================================================
   Boot screen. The loading screen is Cobby's compact introduction: an ASCII
   wordmark that fills with the holo gradient as the real assets settle, three
   lines of who this is, and one arrow into the card.

   Nothing runs on a clock and nothing blocks the download. The bar tracks the
   two things that decide whether the first screen is presentable — fonts and
   the hero art — so the arrow lights within a second or two; both 3D models
   keep streaming behind it and spin into their panels when they land. The 4s
   cap is only there for a stalled CDN, and even then the arrow works: the
   visitor is never held on this screen.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('global-loader');
    const msgEl = document.getElementById('loader-message');
    const pctEl = document.getElementById('loader-percent');
    const litEl = document.getElementById('boot-art-lit');
    const enterBtn = document.getElementById('boot-enter');
    const langBtn = document.getElementById('boot-lang');
    const veilEl = document.getElementById('boot-unveil');

    if (!loader) {
        if (window.initAnimations) window.initAnimations();
        else liftBootGate();
        return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isBot = ua.includes('lighthouse') || ua.includes('googlebot') || ua.includes('pagespeed');

    const ENTRY_MAX_TIME = 4000;

    /* The pixel dissolve. Canvas rather than a few hundred animated DOM cells:
       one surface, one rAF loop, and every cell's alpha computed continuously,
       so the wave is smooth instead of a stack of staggered transitions.

       Timeline, from the click:
         0-120ms    the pixel field fades in over the readout
         ~180ms     the loader steps aside and the entrance starts underneath
         200-760ms  the field dissolves on a soft diagonal

       Returns false when it cannot run (no 2d context, reduced motion) and the
       caller opens the card directly. */
    const runUnveil = (onCovered) => {
        if (!veilEl || !veilEl.getContext) return false;
        const ctx = veilEl.getContext('2d');
        if (!ctx) return false;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

        const w = window.innerWidth;
        const h = window.innerHeight;
        // Solid, axis-aligned blocks need no extra resolution; a 1x surface
        // keeps the allocation small enough to happen inside the click.
        veilEl.width = w;
        veilEl.height = h;

        const size = w < 700 ? 34 : 48;
        const cols = Math.ceil(w / size);
        const rows = Math.ceil(h / size);
        const span = Math.max(1, cols + rows - 2);
        const cells = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // A deterministic jitter breaks the ruler edge without making
                // the wave random; the fade window below softens it.
                const jitter = (((x * 37 + y * 61) % 9) / 8 - 0.5) * 0.1;
                cells.push({
                    x: x * size,
                    y: y * size,
                    w: Math.min(size, w - x * size),
                    h: Math.min(size, h - y * size),
                    th: ((x + y) / span) * 0.72 + jitter,
                });
            }
        }

        const COVER_MS = 120;
        const WAVE_START = 200;
        const WAVE_MS = 560;
        // Narrow enough that the wave reads as a moving edge of pixels rather
        // than a uniform dimming of the whole screen; wide enough that each
        // block still eases over ~120ms instead of popping.
        const FADE = 0.22;
        const start = performance.now();

        let covered = false;
        const reveal = () => {
            if (covered) return;
            covered = true;
            onCovered();
        };

        // A background tab pauses rAF, so the loader would never step aside.
        // The timer is the guarantee; the frame loop is the animation.
        setTimeout(reveal, COVER_MS + 60);

        const finish = () => {
            ctx.clearRect(0, 0, w, h);
            veilEl.style.opacity = '0';
            // Drop the backing store: ~5MB on a 1440x900 window that would
            // otherwise sit around for the life of the page.
            veilEl.width = 0;
            veilEl.height = 0;
        };

        const frame = (now) => {
            const t = now - start;
            const p = (t - WAVE_START) / WAVE_MS;

            // Checked before anything is painted, so a tab that was asleep at
            // the start cannot flash an opaque canvas over the finished card.
            if (p >= 1.04) {
                finish();
                return;
            }

            veilEl.style.opacity = String(Math.min(1, t / COVER_MS));
            if (t >= COVER_MS + 60) reveal();

            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#04050b';
            ctx.globalAlpha = 1;

            for (let i = 0; i < cells.length; i++) {
                const c = cells[i];
                let a = 1;
                if (p > 0) {
                    const local = (p - c.th) / FADE;
                    if (local >= 1) continue;
                    if (local > 0) a = 1 - local;
                }
                if (a === 1) {
                    ctx.fillRect(c.x, c.y, c.w, c.h);
                } else {
                    // Hold the block solid, then ease its alpha out.
                    ctx.globalAlpha = a * a * (3 - 2 * a);
                    ctx.fillRect(c.x, c.y, c.w, c.h);
                    ctx.globalAlpha = 1;
                }
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        return true;
    };

    let entered = false;
    const enter = () => {
        if (entered) return;
        entered = true;
        document.removeEventListener('keydown', trapFocus);
        document.removeEventListener('keydown', onBootKey);

        const open = () => {
            loader.classList.add('hidden');
            // Retire it from the render tree once the fade has played out.
            // Hidden but still displayed, its animations would keep running
            // forever underneath the page.
            setTimeout(() => loader.classList.add('retired'), 750);
            if (window.initAnimations) window.initAnimations();
            else liftBootGate();
        };

        if (!runUnveil(open)) open();
    };

    // The boot screen is modal, so Tab must not reach the card behind it. Tab
    // cycles between the two controls that live on it: the language key and
    // the way in.
    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const stops = [...loader.querySelectorAll('button')];
        e.preventDefault();
        if (!stops.length) return;
        const at = stops.indexOf(document.activeElement);
        const step = e.shiftKey ? -1 : 1;
        stops[(at + step + stops.length) % stops.length].focus({ preventScroll: true });
    };
    document.addEventListener('keydown', trapFocus);

    // A terminal's continue key, available even while the bar is still filling.
    // Enter on the focused button also lands here, and enter() is idempotent,
    // so the two paths cannot double-fire.
    function onBootKey(e) {
        if (entered || (e.key !== 'Enter' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        enter();
    }
    document.addEventListener('keydown', onBootKey);

    if (enterBtn) enterBtn.addEventListener('click', enter);

    // The intro exists in both languages; this key flips the whole document so
    // the card opens in the language the visitor chose on the boot screen.
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            if (window.toggleLang) window.toggleLang();
            const vi = document.body.classList.contains('lang-vi');
            langBtn.setAttribute('aria-label', vi ? 'Switch language to English' : 'Switch language to Vietnamese');
        });
    }

    // The screen is fully operable from here: arrow, language key, keyboard.
    // The failsafe near the top of this file defers to this flag, so a healthy
    // intro is never torn away while someone is still reading it.
    window.__cobbyBootLive = true;

    if (isBot) {
        enter();
        return;
    }

    // Each entry task reports its own 0..1 progress; weight is its share of the
    // fill. Only layout-critical assets belong here — see the model note below.
    const tasks = [];
    const addTask = (weight, run) => {
        const task = { weight, p: 0 };
        const report = (p) => { task.p = Math.max(task.p, Math.min(1, p || 0)); };
        task.done = Promise.resolve()
            .then(() => run(report))
            .catch(() => { /* a failed asset still counts as settled */ })
            .then(() => report(1));
        tasks.push(task);
    };

    if (document.fonts && document.fonts.ready) addTask(0.45, () => document.fonts.ready);

    const hero = document.querySelector('.hero-character-png');
    addTask(0.55, () => new Promise((resolve) => {
        if (!hero || hero.complete) return resolve();
        hero.addEventListener('load', resolve, { once: true });
        hero.addEventListener('error', resolve, { once: true });
    }));

    // The models do not hold the intro. Their panels are absolutely sized, so
    // they cannot move anything ScrollTrigger measures; they are progressive
    // enhancement that keeps downloading while the visitor reads, and each one
    // plays its own spin-in when it lands.
    document.querySelectorAll('model-viewer[src]').forEach((viewer) => {
        if (!viewer.closest('[hidden]')) viewer.setAttribute('loading', 'eager');
    });

    const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0) || 1;
    const progress = () => tasks.reduce((sum, t) => sum + t.weight * t.p, 0) / totalWeight;

    let ready = false;
    Promise.all(tasks.map((t) => t.done)).then(() => { ready = true; });

    // Paint the readout: the lit wordmark is clipped to the same figure as the
    // percentage, so the wordmark is the progress bar.
    const paint = (p) => {
        if (litEl) litEl.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(1)}% 0 0)`;
        if (pctEl) pctEl.textContent = `${Math.round(p * 100)}%`;
    };

    let armed = false;
    const arm = () => {
        if (armed || entered) return;
        armed = true;
        paint(1);
        if (msgEl) msgEl.textContent = 'ready';
        loader.classList.add('is-ready');
    };

    let shown = 0;
    const start = performance.now();
    // requestAnimationFrame is paused in background tabs, so a page opened
    // with ctrl+click would never arm the arrow. Timers still run there.
    const next = () => {
        if (document.hidden) setTimeout(() => tick(performance.now()), 100);
        else requestAnimationFrame(tick);
    };
    function tick(now) {
        if (entered) return;
        if (!ready && now - start > ENTRY_MAX_TIME) ready = true;

        // Ease toward the real figure so the fill glides instead of jumping
        // in asset-sized steps.
        const target = ready ? 1 : progress();
        shown += (target - shown) * (ready ? 0.2 : 0.08);

        if (ready && shown > 0.995) {
            arm();
            return;
        }

        paint(shown);
        next();
    }
    paint(0);
    next();
});

