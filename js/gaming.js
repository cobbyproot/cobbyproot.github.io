/* =============================================================================
   THE SHELF — js/gaming.js

   Five games, five objects.

   The old tab was a list of account rows, which is a database view of a
   person. This is the same information on the back of a card you have to
   pick up first: the front is the game, the back is the handle. Everything
   that makes it feel physical — the tilt, the foil catching light, the flip —
   is motion the visitor causes, not ambience that runs at them.

   The order below is the order the comment in index.html promises:
     the deck (real data) → the render → the light → the flip → the copy →
     the reveal → the pong nudge.
   ========================================================================== */
(() => {
    'use strict';

    const deck = document.getElementById('shelf-deck');
    const panel = document.getElementById('tab-gaming');
    if (!deck || !panel) return;

    const perf = window.CobbyPerf;
    const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Guarded reads. `window.CobbyPerf` is set by js/perf.js, which loads
       before this file, but a CDN hiccup must never take the shelf down with
       it: absent means "assume a healthy desktop", which is the old default. */
    const perfReduced = () => (typeof perf?.reducedMotion === 'boolean' ? perf.reducedMotion : reducedMQ.matches);
    const perfTrims = () => {
        try {
            if (perf && typeof perf.trimsMotion === 'function') return perf.trimsMotion();
        } catch (err) { /* a broken governor is not a broken card */ }
        return reducedMQ.matches;
    };
    const perfLevel = () => {
        const lvl = perf?.level;
        return typeof lvl === 'number' ? lvl : 2;
    };

    /* -----------------------------------------------------------------------
       Endpoints
       --------------------------------------------------------------------- */
    /* All verified live against the running site on 2026-11-12. Every one of
       them is only ever an *upgrade*: the card is rendered from the fallbacks
       below before any request leaves the page, so a dead network, a CORS
       refusal or a Roblox outage degrades to a card that still looks finished
       rather than to a hole in the shelf. */
    const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps/';
    const DDRAGON = 'https://ddragon.leagueoflegends.com/';
    const LOL_VERSION_FALLBACK = '16.22.1';       /* newest on the CDN today */
    const VALORANT_AGENTS = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true';
    const RBX_USER_ID = '297588338';              /* CobbyProto, resolved live */
    const RBX_USER = 'https://users.roblox.com/v1/users/' + RBX_USER_ID;
    const RBX_THUMB = 'https://thumbnails.roblox.com/v1/users/avatar-headshot'
        + '?userIds=' + RBX_USER_ID + '&size=420x420&format=Png&isCircular=false';

    /* Fallbacks, each one fetched and opened in the browser before being
       written here. They are complete URLs, not templates: a fallback that
       still needs a version number is not a fallback. */
    const ART = {
        vrchat: STEAM_CDN + '438100/header.jpg',                    /* 460x215, 200 OK */
        /* Riot's loading-screen card (308x560) rather than the 1215x717 splash:
           it is Riot's own portrait crop, so it is already the shape of the
           card it is printed on and nothing important gets cut. */
        league: DDRAGON + 'cdn/img/champion/loading/Warwick_0.jpg',
        leagueSigil: DDRAGON + 'cdn/' + LOL_VERSION_FALLBACK + '/img/champion/Warwick.png',
        valorant: 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png',
        roblox: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-F836D0ED3EFE30016C09B58BACF1F316-Png'
            + '/420/420/AvatarHeadshot/Png/noFilter',
        steam: STEAM_CDN + '753/header.jpg'                         /* 460x215, 200 OK */
    };

    /* -----------------------------------------------------------------------
       The deck
       --------------------------------------------------------------------- */
    /* `rank` is invented — it is how much Cobby plays the thing, which is an
       opinion and therefore allowed. Every *fact* on the card (the handle, the
       champion, the agent, the join year, the profile URL) is real and was
       verified.

       `art.mode` is chosen per source, by what the real asset actually is:

         cover    a tall or shape-agnostic picture. Fills the card edge to edge;
                  the type is struck across a scrim over it.
         banner   a 460x215 Steam capsule. A wide capsule cannot fill a portrait
                  card without destroying its composition, so it is printed as a
                  band at the top of the card — which is how a physical card
                  would actually mount a wide logo — and the plate below carries
                  the type.
         niche    square art on transparency (Riot's agent icon, Roblox's
                  headshot). Cropping a cut-out head is always wrong, so it is
                  framed in a lit niche instead. */
    const DECK = [
        {
            id: 'vrchat',
            name: { en: 'VRChat', vi: 'VRChat' },
            platform: 'steam // 438100',
            kicker: { en: 'the social one', vi: 'chỗ tụ tập' },
            rank: 'main',
            rankLabel: { en: 'main', vi: 'chính' },
            handle: 'JacobUwU',
            sub: { en: 'the name in the mirror', vi: 'cái tên trong gương' },
            flavour: { en: 'where the wolf gets to be a wolf.', vi: 'chỗ con sói được làm sói thật sự.' },
            voice: {
                en: 'if you see a big fluffy protogen staring at the mirror, that\'s me. wave first — i get shy~',
                vi: 'nếu bạn thấy một bé protogen lông xù đứng ngắm gương, đó là mình á. vẫy tay trước nha, mình ngại~'
            },
            art: { src: ART.vrchat, mode: 'banner' }
        },
        {
            id: 'league',
            name: { en: 'League of Legends', vi: 'League of Legends' },
            platform: 'riot // vn',
            kicker: { en: 'summoner\'s rift + tft', vi: 'rift + đấu trường' },
            rank: 'main',
            rankLabel: { en: 'main', vi: 'chính' },
            handle: 'Cobbi#GRRR',
            sub: { en: 'warwick — the wolf that will not stay dead', vi: 'warwick — con sói không chịu chết' },
            flavour: { en: 'warwick. all bite, no plan.', vi: 'warwick. chỉ cắn, không có kế hoạch gì hết.' },
            voice: {
                en: 'i play TFT on the VN server. i will lose to you beautifully and then ask for one more.',
                vi: 'mình chơi TFT server VN. mình sẽ thua bạn thật đẹp rồi đòi thêm một ván nữa á.'
            },
            /* The loading-screen card, 308x560 — Riot's own portrait crop of the
               splash, which is exactly the shape of the card this is printed on. */
            art: { src: ART.league, mode: 'cover' },
            sigil: { src: ART.leagueSigil, label: 'Warwick' }
        },
        {
            id: 'valorant',
            name: { en: 'VALORANT', vi: 'VALORANT' },
            platform: 'riot // ap',
            kicker: { en: 'tactical, allegedly', vi: 'chiến thuật, chắc vậy' },
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            handle: 'Con Cobbi Báo#PROOT',
            sub: { en: 'fade — initiator. i hunt with hounds.', vi: 'fade — mở đường. mình đi săn cùng mấy bé chó.' },
            flavour: { en: 'fade. i hunt with hounds.', vi: 'fade. mình đi săn cùng mấy bé chó.' },
            voice: {
                en: 'i am not good. i am loud. those are different things, i checked.',
                vi: 'mình không giỏi, nhưng mình hét to. hai cái đó khác nhau nha, mình kiểm tra rồi.'
            },
            art: { src: ART.valorant, mode: 'niche', tint: 'magenta' },
            role: 'Initiator'
        },
        {
            id: 'roblox',
            name: { en: 'Roblox', vi: 'Roblox' },
            platform: 'roblox // 297588338',
            kicker: { en: 'the oldest save file', vi: 'file lưu lâu nhất' },
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            handle: 'CobbyProto',
            /* Filled from the live API; this is what was verified on the day. */
            sub: { en: 'shown as Cobbyyy · since 2017', vi: 'hiển thị là Cobbyyy · từ 2017' },
            flavour: { en: 'the oldest save file of me.', vi: 'file lưu cổ nhất của mình.' },
            voice: {
                en: 'made this account when i was a pup. still wandering the same maps.',
                vi: 'mở tài khoản này hồi còn là sói con. tới giờ vẫn đi lạc mấy map đó.'
            },
            art: { src: ART.roblox, mode: 'niche', tint: 'cyan' },
            since: 2017
        },
        {
            id: 'steam',
            name: { en: 'Steam', vi: 'Steam' },
            platform: 'steam // 753',
            kicker: { en: 'the library', vi: 'cả thư viện' },
            rank: 'library',
            rankLabel: { en: 'library', vi: 'thư viện' },
            handle: 'BasicallyJacob',
            sub: { en: 'steamcommunity.com/id/BasicallyJacob', vi: 'steamcommunity.com/id/BasicallyJacob' },
            flavour: { en: 'everything i own, filed badly.', vi: 'everything i own, filed badly.' },
            voice: {
                en: 'my backlog is a haunted house. come in, it\'s warm in here.',
                vi: 'cái backlog của mình giống nhà ma á. vô đi, trong này ấm lắm.'
            },
            art: { src: ART.steam, mode: 'banner' },
            /* This one is a place, not an account: copying the handle alone
               would be useless, so the copy key takes the whole address. */
            copyValue: 'https://steamcommunity.com/id/BasicallyJacob/',
            link: 'https://steamcommunity.com/id/BasicallyJacob/'
        }
    ];

    const N = DECK.length;

    /* -----------------------------------------------------------------------
       Small helpers
       --------------------------------------------------------------------- */
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    /* Both languages, always, in that order. Every prose string on this tab
       goes through here so there is exactly one way to be bilingual and no
       way to forget. */
    const bi = (pair, cls = '') => `<span${cls ? ` class="${cls}"` : ''}>`
        + `<span lang="en">${esc(pair.en)}</span>`
        + `<span lang="vi">${esc(pair.vi)}</span></span>`;

    const pad2 = (n) => String(n).padStart(2, '0');

    async function fetchJSON(url, opts, ms = 6500) {
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : 0;
        try {
            const res = await fetch(url, Object.assign({
                signal: ctrl ? ctrl.signal : undefined,
                credentials: 'omit',
                mode: 'cors'
            }, opts || {}));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /* -----------------------------------------------------------------------
       The render
       --------------------------------------------------------------------- */
    /* A card is: an outer box (perspective + lift) → a tilt plane → the flip
       plane → two faces. Three elements, three jobs, because a single element
       cannot be perspective, spring and flip at once without fighting itself.

       The front is a real <button> rather than a div with role="button": the
       whole face is the affordance, and a button gets Enter/Space and a focus
       ring for free. The back cannot live inside it (a button may not contain
       interactive content), so the back is a sibling with its own controls —
       which is also why it gets a `inert` toggle instead of pointer-events
       games. */
    function faceMarkup(g, i) {
        const sigil = g.sigil
            ? `<span class="gc-sigil" data-sigil>
                 <img alt="" decoding="async" loading="lazy">
                 <span class="gc-sigil-name">${esc(g.sigil.label)}</span>
               </span>`
            : '';
        const tint = g.art.tint ? ` is-tint-${g.art.tint}` : '';
        return `
        <div class="game-card" role="listitem" data-game="${g.id}" data-art-mode="${g.art.mode}" style="--i:${i}">
          <div class="gc-tilt">
            <div class="gc-flip">
              <div class="gc-face gc-front">
                <button class="gc-flipbtn" type="button" data-flip="front"
                        aria-label="Flip the ${esc(g.name.en)} card to see the account handle">
                  <span class="gc-art gc-art--${g.art.mode}${tint}" data-art>
                    <img alt="" decoding="async" loading="lazy">
                    <span class="gc-art-scan" aria-hidden="true"></span>
                    <span class="gc-art-marks" aria-hidden="true"></span>
                    <span class="gc-art-veil" aria-hidden="true"></span>
                    <span class="gc-serial" aria-hidden="true">${pad2(i + 1)}<i>/</i>${pad2(N)}</span>
                  </span>
                  <span class="gc-rank is-${g.rank}">${bi(g.rankLabel)}</span>
                  <span class="gc-body">
                    <span class="gc-kicker">${esc(g.platform)}</span>
                    <span class="gc-name">${esc(g.name.en)}</span>
                    <span class="gc-flavour">${bi(g.flavour)}</span>
                    <span class="gc-foot">
                      ${sigil}
                      <span class="gc-flipkey" aria-hidden="true">
                        <i class="fas fa-arrows-rotate"></i>
                        <span class="gc-flipkey-txt"><span lang="en">flip</span><span lang="vi">lật</span></span>
                      </span>
                    </span>
                  </span>
                  <span class="gc-foil" aria-hidden="true">
                    <span class="gc-foil-holo"></span>
                    <span class="gc-foil-spark"></span>
                  </span>
                  <span class="gc-glare" aria-hidden="true"></span>
                </button>
              </div>

              <div class="gc-face gc-back" inert>
                <div class="gc-back-inner">
                  <div class="gc-back-head">
                    <span class="gc-kicker">${bi({ en: 'account', vi: 'tài khoản' })}</span>
                    <button class="gc-flipback" type="button" data-flip="back"
                            aria-label="Flip the ${esc(g.name.en)} card back over">
                      <i class="fas fa-rotate-left" aria-hidden="true"></i>
                    </button>
                  </div>
                  <div class="gc-handle" data-handle>${handleMarkup(g.handle)}</div>
                  <p class="gc-sub" data-sub>${bi(g.sub)}</p>
                  <button class="gc-copy" type="button" data-copy
                          aria-label="Copy ${esc(g.copyValue || g.handle)}">
                    <i class="far fa-copy" aria-hidden="true"></i>
                    <span class="gc-copy-label">${bi({ en: 'copy', vi: 'chép' })}</span>
                  </button>
                  ${g.link ? `<a class="gc-link" href="${esc(g.link)}" target="_blank" rel="noopener noreferrer">
                    <span>${bi({ en: 'open profile', vi: 'mở trang' })}</span>
                    <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
                  </a>` : ''}
                  <p class="gc-voice">${bi(g.voice)}</p>
                  <span class="gc-foil is-back" aria-hidden="true"><span class="gc-foil-holo"></span></span>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }

    /* `Cobbi#GRRR` — the discriminator is the part you actually paste, so it
       gets the accent and the rack number treatment, not the body colour. */
    function handleMarkup(handle) {
        const i = handle.indexOf('#');
        if (i < 0) return `<span class="gc-handle-main">${esc(handle)}</span>`;
        return `<span class="gc-handle-main">${esc(handle.slice(0, i))}</span>`
            + `<span class="gc-handle-tag"><i>#</i>${esc(handle.slice(i + 1))}</span>`;
    }

    deck.innerHTML = DECK.map(faceMarkup).join('');

    const cards = Array.from(deck.querySelectorAll('.game-card'));
    const byId = new Map(DECK.map((g) => [g.id, g]));

    /* Art is written straight after the markup, before paint. The <img> has no
       src until now, so the browser never gets the chance to show a broken
       icon — and `data-art-state` is what the verification harness reads. */
    cards.forEach((cardEl) => {
        const g = byId.get(cardEl.dataset.game);
        const holder = cardEl.querySelector('[data-art]');
        const img = holder.querySelector('img');
        img.addEventListener('load', () => { holder.dataset.artState = 'loaded'; });
        img.addEventListener('error', () => {
            /* No broken frame, ever: the window keeps its tint and its
               registration marks and gains a mono monogram instead. */
            holder.dataset.artState = 'error';
            holder.classList.add('is-missing');
            holder.style.setProperty('--mono-mark', `"${(g.platform.split(' ')[0] || '?').toUpperCase()}"`);
        });
        img.src = g.art.src;

        /* The sigil is a small icon, not a hero: it is set from the verified
           fallback immediately so it is never an empty box, and the live patch
           upgrade only ever swaps it for the same champion's current icon. */
        const sigil = cardEl.querySelector('[data-sigil]');
        if (sigil && g.sigil) {
            const si = sigil.querySelector('img');
            if (si) {
                si.src = g.sigil.src;
                sigil.title = g.sigil.label;
            }
        }
    });

    /* -----------------------------------------------------------------------
       Live upgrade
       --------------------------------------------------------------------- */
    /* Three independent requests, each one allowed to fail alone. Nothing is
       awaited before the shelf is usable: this runs after the cards are on
       screen and only ever replaces a URL that already works. */
    function upgradeArt(id, url) {
        const cardEl = cards.find((c) => c.dataset.game === id);
        if (!cardEl || !url) return;
        const holder = cardEl.querySelector('[data-art]');
        const img = holder.querySelector('img');
        if (!img || img.getAttribute('src') === url) return;
        img.src = url;
    }

    function setSub(id, pair) {
        const cardEl = cards.find((c) => c.dataset.game === id);
        if (!cardEl || !pair) return;
        const el = cardEl.querySelector('[data-sub]');
        if (el) el.innerHTML = bi(pair);
    }

    function setSigil(id, url, label) {
        const cardEl = cards.find((c) => c.dataset.game === id);
        if (!cardEl) return;
        const holder = cardEl.querySelector('[data-sigil]');
        if (!holder) return;
        const img = holder.querySelector('img');
        if (!img) return;
        if (url) img.src = url;
        if (label) holder.title = label;
    }

    /* Only the squad lead's version-list changes between patches, so the icon
       URL is rebuilt from the live patch rather than cached in the file. */
    (async () => {
        try {
            const versions = await fetchJSON(DDRAGON + 'api/versions.json', {}, 5000);
            const v = Array.isArray(versions) && versions[0] ? String(versions[0]).replace(/[^0-9.]/g, '') : '';
            if (!v) return;
            setSigil('league', `${DDRAGON}cdn/${v}/img/champion/Warwick.png`);
        } catch (err) { /* the fallback sigil is already on the card */ }
    })();

    (async () => {
        try {
            const json = await fetchJSON(VALORANT_AGENTS, {}, 6000);
            const agents = Array.isArray(json?.data) ? json.data : [];
            const agent = agents.find((a) => a.displayName === 'Fade') || agents[0];
            if (!agent) return;
            if (agent.displayIcon) upgradeArt('valorant', agent.displayIcon);
            const role = agent.role?.displayName || '';
            if (role) {
                /* The role is a real field from the same response, so the card
                   can say what she actually does instead of guessing. */
                cards.find((c) => c.dataset.game === 'valorant')
                    ?.style.setProperty('--role', '1');
                setSub('valorant', {
                    en: `${(agent.displayName || 'Fade').toLowerCase()} — ${role.toLowerCase()}. i hunt with hounds.`,
                    vi: `${(agent.displayName || 'Fade').toLowerCase()} — ${role === 'Initiator' ? 'mở đường' : role.toLowerCase()}. mình đi săn cùng mấy bé chó.`
                });
            }
        } catch (err) { /* keep the verified fallback art and copy */ }
    })();

    /* Roblox is the one card with a real date on it, so the date is read
       rather than typed. The POST that resolves the username is not used here:
       the id is already known and verified, and one GET is cheaper than two. */
    (async () => {
        try {
            const [user, thumb] = await Promise.all([
                fetchJSON(RBX_USER, {}, 6000),
                fetchJSON(RBX_THUMB, {}, 6000)
            ]);
            const created = user?.created ? new Date(user.created) : null;
            const year = created && !isNaN(created.valueOf()) ? created.getUTCFullYear() : null;
            const shown = user?.displayName || '';
            if (year) {
                setSub('roblox', {
                    en: `shown as ${shown || 'Cobbyyy'} · since ${year}`,
                    vi: `hiển thị là ${shown || 'Cobbyyy'} · từ ${year}`
                });
            }
            const url = thumb?.data?.[0]?.imageUrl;
            if (url) upgradeArt('roblox', url);
        } catch (err) { /* the verified headshot and "since 2017" stay */ }
    })();

    /* -----------------------------------------------------------------------
       The light — pointer tilt, spring damped, one shared rAF
       --------------------------------------------------------------------- */
    /* A holographic card is only convincing if the light moves *with* the card
       rather than on a timer under it. So: no idle animation at all here. At
       rest the deck is completely still; the tilt exists only while a pointer
       is on a card, and it is the same frame that drives the foil's specular
       band and the face glare.

       Everything is written as custom properties, which is what lets the CSS
       own the composition (`rotateX(var(--rx)) …`) while this file owns only
       the numbers. */
    const MAX_TILT = 10;          /* degrees, as specified */
    const STIFF = 0.17;           /* spring pull toward the target */
    const DAMP = 0.74;            /* velocity bleed — under 1, so it settles */

    const motionAllowed = () => !perfReduced();
    const tiltOn = () => motionAllowed() && canHover();

    const springs = new Map();    /* cardEl → spring state */
    let raf = 0;

    function springFor(cardEl) {
        let s = springs.get(cardEl);
        if (!s) {
            s = { rx: 0, ry: 0, vx: 0, vy: 0, tx: 0, ty: 0, mx: 0.5, my: 0.5, tmx: 0.5, tmy: 0.5, hot: false };
            springs.set(cardEl, s);
        }
        return s;
    }

    function frame() {
        raf = 0;
        let alive = false;

        springs.forEach((s, cardEl) => {
            s.vx = (s.vx + (s.tx - s.rx) * STIFF) * DAMP;
            s.vy = (s.vy + (s.ty - s.ry) * STIFF) * DAMP;
            s.rx += s.vx;
            s.ry += s.vy;

            /* The glare is not on a spring: a reflection does not have mass,
               it snaps to where the eye expects the light to be. */
            s.mx += (s.tmx - s.mx) * 0.22;
            s.my += (s.tmy - s.my) * 0.22;

            const tilt = cardEl.querySelector('.gc-tilt');
            if (tilt) {
                tilt.style.setProperty('--rx', `${s.rx.toFixed(3)}deg`);
                tilt.style.setProperty('--ry', `${s.ry.toFixed(3)}deg`);
            }
            cardEl.style.setProperty('--mx', s.mx.toFixed(4));
            cardEl.style.setProperty('--my', s.my.toFixed(4));

            const settled = !s.hot
                && Math.abs(s.tx - s.rx) < 0.015 && Math.abs(s.vx) < 0.02
                && Math.abs(s.ty - s.ry) < 0.015 && Math.abs(s.vy) < 0.02
                && Math.abs(s.tmx - s.mx) < 0.002 && Math.abs(s.tmy - s.my) < 0.002;

            if (settled) {
                /* Land exactly on rest so nothing is left a third of a degree
                   off, which is visible as a slanted hairline on a 1px edge. */
                if (tilt) {
                    tilt.style.setProperty('--rx', '0deg');
                    tilt.style.setProperty('--ry', '0deg');
                }
                cardEl.style.removeProperty('--mx');
                cardEl.style.removeProperty('--my');
                springs.delete(cardEl);
            } else {
                alive = true;
            }
        });

        if (alive) raf = requestAnimationFrame(frame);
    }

    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    function trackPointer(cardEl, ev) {
        if (!tiltOn()) return;
        const s = springFor(cardEl);
        const r = cardEl.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const mx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        const my = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        s.tmx = mx;
        s.tmy = my;
        /* Tip away from the pointer, the way a card held by its far edge
           tips: the corner nearest the eye comes toward you. */
        const base = cardEl.dataset.flipped === 'true' ? 1 : 0;
        s.ty = (base ? -1 : 1) * (mx - 0.5) * 2 * MAX_TILT;
        s.tx = -(my - 0.5) * 2 * MAX_TILT;
        s.hot = true;
        wake();
    }

    function releasePointer(cardEl) {
        const s = springs.get(cardEl);
        if (!s) return;
        s.hot = false;
        s.tx = 0;
        s.ty = 0;
        s.tmx = 0.5;
        s.tmy = 0.5;
        wake();
    }

    if (canHover()) {
        deck.addEventListener('pointermove', (ev) => {
            const cardEl = ev.target.closest?.('.game-card');
            if (!cardEl || !deck.contains(cardEl)) return;
            if (ev.pointerType === 'touch') return;
            trackPointer(cardEl, ev);
        }, { passive: true });

        deck.addEventListener('pointerout', (ev) => {
            const cardEl = ev.target.closest?.('.game-card');
            if (!cardEl) return;
            /* `pointerout` also fires moving between children; only a real
               exit counts. */
            if (ev.relatedTarget && cardEl.contains(ev.relatedTarget)) return;
            releasePointer(cardEl);
        }, { passive: true });

        /* A keyboard visitor gets no tilt, and a card left mid-tilt because
           the pointer went out of the window must unwind. */
        window.addEventListener('blur', () => {
            springs.forEach((s, cardEl) => releasePointer(cardEl));
        });
    }

    /* -----------------------------------------------------------------------
       The shelf light — one glow on the shelf lip, under the card you are on
       --------------------------------------------------------------------- */
    /* Cheaper than five per-card glows and it reads as one lamp: the pool
       slides along the shelf rather than each card glowing about itself. */
    function moveShelfLight(cardEl) {
        const deckRect = deck.getBoundingClientRect();
        const r = cardEl.getBoundingClientRect();
        deck.style.setProperty('--shelf-x', `${(r.left - deckRect.left) + r.width / 2}px`);
        deck.style.setProperty('--shelf-o', '1');
    }

    function dimShelfLight() {
        deck.style.setProperty('--shelf-o', '0');
    }

    deck.addEventListener('pointerover', (ev) => {
        const cardEl = ev.target.closest?.('.game-card');
        if (!cardEl) return;
        moveShelfLight(cardEl);
    }, { passive: true });

    deck.addEventListener('pointerleave', dimShelfLight, { passive: true });
    deck.addEventListener('focusin', (ev) => {
        const cardEl = ev.target.closest?.('.game-card');
        if (cardEl) moveShelfLight(cardEl);
    });
    deck.addEventListener('focusout', (ev) => {
        if (!deck.contains(ev.relatedTarget)) dimShelfLight();
    });

    /* -----------------------------------------------------------------------
       The flip
       --------------------------------------------------------------------- */
    /* Flipping is state, so it lives on the card element as `data-flipped`.
       The CSS does the rotation; this function only decides which face is
       allowed to exist in the accessibility tree. `inert` is doing the heavy
       lifting: without it a keyboard visitor tabbing forward from the front
       would land on a copy button that is facing away from them. */
    const flipCard = (cardEl, want) => {
        const next = typeof want === 'boolean' ? want : cardEl.dataset.flipped !== 'true';
        if ((cardEl.dataset.flipped === 'true') === next) return;

        const front = cardEl.querySelector('.gc-front');
        const back = cardEl.querySelector('.gc-back');
        cardEl.dataset.flipped = next ? 'true' : 'false';
        cardEl.classList.toggle('is-flipped', next);

        if (next) {
            front?.setAttribute('inert', '');
            front?.setAttribute('aria-hidden', 'true');
            back?.removeAttribute('inert');
            back?.removeAttribute('aria-hidden');
        } else {
            back?.setAttribute('inert', '');
            back?.setAttribute('aria-hidden', 'true');
            front?.removeAttribute('inert');
            front?.removeAttribute('aria-hidden');
        }

        const g = byId.get(cardEl.dataset.game);
        if (g) announce(next
            ? `${g.name.en}: ${g.handle}`
            : `${g.name.en} card, front`);

        /* A face that just turned away must not keep focus, and the face that
           just turned toward you is where the visitor was already going. */
        const box = next ? back : front;
        if (!box) return;
        const target = next ? box.querySelector('.gc-copy') : box.querySelector('.gc-flipbtn');
        const active = document.activeElement;
        const wasHere = cardEl.contains(active);
        if (wasHere || document.activeElement === document.body) {
            /* Do not yank the page. Only take focus when it was already inside
               this card (a keyboard flip) or was dropped by `inert` (a click
               flip), which are exactly the two cases where focus has nowhere
               sensible to be. */
            target?.focus({ preventScroll: true });
        }
    };

    /* One polite live region for the whole deck, announced on flip and copy.
       Five live regions would talk over each other. */
    const live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panel.appendChild(live);
    const announce = (msg) => { live.textContent = msg; };

    deck.addEventListener('click', (ev) => {
        const cardEl = ev.target.closest?.('.game-card');
        if (!cardEl) return;

        /* The copy key and the outbound link are their own verbs. */
        if (ev.target.closest('[data-copy]') || ev.target.closest('a')) return;

        const flipBtn = ev.target.closest('[data-flip]');
        if (flipBtn) {
            flipCard(cardEl);
            return;
        }

        /* Convenience only: on the back, a click on dead space turns the card
           over. The handle and the voice line are excluded so text stays
           selectable, which is the whole point of putting a handle on a card. */
        if (cardEl.dataset.flipped === 'true'
            && !ev.target.closest('.gc-handle')
            && !ev.target.closest('.gc-sub')
            && !ev.target.closest('.gc-voice')) {
            flipCard(cardEl, false);
        }
    });

    /* The front button is a real <button>, so Enter and Space already click
       it. The back's dead-space flip is a click anywhere, which needs the two
       keys spelled out for a visitor who is on the card and not on a button. */
    deck.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Escape') return;
        const cardEl = ev.target.closest?.('.game-card');
        if (!cardEl || cardEl.dataset.flipped !== 'true') return;
        ev.preventDefault();
        flipCard(cardEl, false);
    });

    /* -----------------------------------------------------------------------
       The copy
       --------------------------------------------------------------------- */
    /* Same copied affordance main.js uses (gold, two seconds, icon becomes a
       tick), plus the two things that one is missing: a fallback for browsers
       where `navigator.clipboard` is refused, and an honest message when even
       that fails.

       `navigator.clipboard.writeText` rejects on plain http, in an iframe
       without the permission, and in some headless configurations. A rejection
       is not a failure of the copy — it is a signal to use the old path, so the
       two are chained rather than one being a pre-check. `isSecureContext` is
       deliberately NOT used as the gate: localhost is a secure context and a
       file:// page is not, and either can still be denied at call time. */
    function legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.setAttribute('aria-hidden', 'true');
        /* Inside the viewport but invisible: Safari and Firefox refuse to
           select a textarea positioned off-screen, and `display: none` cannot
           be selected at all. */
        ta.style.cssText = 'position:fixed;top:50%;left:50%;width:1px;height:1px;'
            + 'padding:0;border:0;opacity:0;font-size:1px;z-index:-1';
        document.body.appendChild(ta);
        try {
            ta.focus({ preventScroll: true });
            ta.select();
            ta.setSelectionRange(0, text.length);
            const ok = document.execCommand('copy');
            if (!ok) throw new Error('execCommand returned false');
            return true;
        } finally {
            document.body.removeChild(ta);
        }
    }

    function copyText(text) {
        const legacy = () => {
            try {
                return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('copy refused'));
            } catch (err) { return Promise.reject(err); }
        };
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return legacy();
        return navigator.clipboard.writeText(text).catch(legacy);
    }

    let copyTimer = 0;
    deck.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-copy]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();

        const cardEl = btn.closest('.game-card');
        const g = byId.get(cardEl?.dataset.game);
        if (!g) return;
        const value = g.copyValue || g.handle;

        copyText(value).then(() => {
            btn.classList.add('copied');
            const icon = btn.querySelector('i');
            const prev = icon?.className;
            if (icon) icon.className = 'fas fa-check';
            announce(`copied ${value}`);
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                btn.classList.remove('copied');
                if (icon && prev) icon.className = prev;
            }, 2000);
        }).catch(() => {
            /* Never a silent no-op: a stranger would just think the card is
               broken. main.js's toast is the site's one failure channel. */
            if (typeof window.showToast === 'function') window.showToast(`could not copy — it is “${value}”`);
            else announce(`could not copy. it is ${value}`);
        });
    });

    /* -----------------------------------------------------------------------
       The reveal — stagger in, once, on first sight
       --------------------------------------------------------------------- */
    /* The panel is `display: none` until `switchTab` adds `.active`, and
       `switchTab` also re-runs its own panel-in animation on every switch.
       Restarting five cards every time would turn an entrance into a tic, so
       this fires exactly once.

       There is a trap in "once" that is easy to miss: taking an element out of
       `display: none` restarts its CSS animations, so leaving the tab and
       coming back would replay the stagger even though this function never runs
       again. The fix is to *remove* the triggering class once the entrance has
       finished, which leaves the cards in their plain, visible resting state.

       The pending state is added after the cards exist and in the same task, so
       it can never survive a script that dies: worst case the CSS never sees
       `.is-pending` and the cards are simply already there. */
    const staggerOn = () => motionAllowed() && perfLevel() >= 1 && !reducedMQ.matches;
    let revealed = false;

    function endEntrance() {
        deck.classList.remove('is-in');
    }

    function reveal() {
        if (revealed) return;
        revealed = true;
        deck.classList.remove('is-pending');
        if (staggerOn()) {
            deck.classList.add('is-in');
            /* Five cards, 72ms apart, 0.58s each — the last one lands at
               ~0.87s. The listener is the authority; the timer is a floor in
               case `animationend` never arrives (it does not fire when the
               element is display:none when the animation would have ended). */
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                deck.removeEventListener('animationend', onEnd);
                endEntrance();
            };
            const onEnd = (ev) => {
                if (ev.target.closest?.('.game-card')) finish();
            };
            deck.addEventListener('animationend', onEnd);
            setTimeout(finish, 2400);
        }
        pokePong();
    }

    if (staggerOn()) deck.classList.add('is-pending');

    if (panel.classList.contains('active')) {
        reveal();
    } else {
        /* MutationObserver on the class attribute is the contract the task
           names, and it is the only signal that fires for *any* caller of
           switchTab. The dock click is a belt-and-braces second trigger for
           the one path a visitor can actually take. */
        if (typeof MutationObserver === 'function') {
            const mo = new MutationObserver(() => {
                if (panel.classList.contains('active')) reveal();
            });
            mo.observe(panel, { attributes: true, attributeFilter: ['class'] });
        }
        document.getElementById('tab-btn-gaming')?.addEventListener('click', reveal);
    }

    /* -----------------------------------------------------------------------
       The pong nudge
       --------------------------------------------------------------------- */
    /* main.js sizes the pong canvas once, at a moment when this tab is
       `display: none` — so `offsetWidth` is 0 and the backing store falls back
       to 300x52, then gets stretched across the real 60px strip. The drawing
       loop reads `canvas.width` every frame, so the fix is one honest resize
       the first time the tab is actually on screen. No main.js edit, no
       synthetic window resize (which would also drag ScrollTrigger into it). */
    let pongPoked = false;
    function pokePong() {
        if (pongPoked) return;
        requestAnimationFrame(() => {
            const cv = document.getElementById('pong-canvas');
            if (!cv) return;
            const w = cv.offsetWidth;
            const h = cv.offsetHeight;
            if (!w || !h) return;          /* still hidden: try again next time */
            if (cv.width !== w) cv.width = w;
            if (cv.height !== h) cv.height = h;
            pongPoked = true;
        });
    }

    /* A viewport change re-lays the deck; the springs hold degrees, not
       pixels, so nothing needs recomputing, but a card caught mid-tilt while
       the window is resized should unwind. */
    window.addEventListener('resize', () => {
        springs.forEach((s, cardEl) => releasePointer(cardEl));
        dimShelfLight();
    }, { passive: true });

    /* Debug/verification handle. Read-only, and small: the harness needs to
       assert the deck's real state without scraping markup. */
    window.CobbyShelf = {
        get cards() { return cards.length; },
        get pending() { return deck.classList.contains('is-pending'); },
        get revealed() { return revealed; },
        get flipped() { return cards.filter((c) => c.dataset.flipped === 'true').length; },
        get artStates() {
            return cards.map((c) => ({
                game: c.dataset.game,
                state: c.querySelector('[data-art]')?.dataset.artState || 'pending',
                src: c.querySelector('[data-art] img')?.currentSrc || ''
            }));
        },
        trimsMotion: perfTrims
    };
})();
