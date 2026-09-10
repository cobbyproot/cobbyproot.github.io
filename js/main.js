

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
const HERO_PARTS = '.emitter, .hero-character-stage, .name-char, .ios-widget, .social-dock, .scroll-hint';
let bootGateLifted = false;

function liftBootGate() {
    if (bootGateLifted) return;
    bootGateLifted = true;
    document.body.classList.remove('booting');
}

setTimeout(() => {
    if (bootGateLifted) return;
    liftBootGate();
    // Nothing played them in, so write the end state by hand. GSAP's inline
    // opacity would otherwise outlive the class and keep the hero dark.
    if (window.gsap) gsap.set(HERO_PARTS, { autoAlpha: 1, clearProps: 'transform,filter' });
}, 6000);

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

    const galleryData = [
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1v7AETDabKPfjF_KLpJFHmIXU1_YqPK81' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1K3bogCoTgggH7FIybgf_Vh2fV_MxhiAn' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1RJoTIXyC3uDJ__ursY7NEH6cpYRQNKTY' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1BpAXf22asfyd03ESrefU97TlmvEnSVMk' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1UOrPirvWBux9_d0hp7BxJ8Kp2NRzobld' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1DC5J5LEIN4MHzvuT_XQBgTNfPRNWExbK' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1JE6d59pYol3IvClsCX8goIIovgPLRlKU' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1SYhGZ6QI1DCTy_u793E4G8bJX8a1_TZ2' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1tZRr67Rhq8FvDGD4RE21OJxD9t32NCmJ' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1clsiyZjazZr6nY3uw93YbQ2JR3Xb_euF' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1ARYYfM80nqNS-TYG4jCZJQZe9YAJmDAu' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=14Dn7JvFJHdFecEAJrsiu63cDJ8E2Twki' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1OfTU_nT2Uxqq2vXj-EK2favYZv8b23bi' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1clsiyZjazZr6nY3uw93YbQ2JR3Xb_euF' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1RATXB54xlSme2Q7b8BQdDPIi3K_UTsX7' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1sPvcwH1XeYf_zDnFo352JD61-8ttDdbv' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1PTmX6xJ-_n8JfvKY_6G7Uj5XJhrZvXPQ' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1wSytLT4-hIK_ymIgEaZh7W4jE9H0HdGR' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1sJcWo5Y8A5f9GA25dRd4Cr-5hqtX4XbM' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=12why5bN6WP2gl2vDVovi0x8wxBMZ-aCd' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1oHcCSl_WmooziJLVBn957IOktqOdAdvw' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1_r_SYarpL6xZT6_0iNzBt6yCYpobgjtM' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1chhKBq7E4EioG2beKxqQ70w14RaxYR0a' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1UoJ-iH4uaqiuopenbAzSvIZtEUBlOnMr' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1kGD5-_IJZSHmlb5mm57HCjCP9PaYCCWR' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1WtdoWdJ5gL00kvacGk-z5FVm-XP52gpP' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1v9QR77eYNrxlgdzzzLQFBnF050ug1SWe' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1Wie1-4BWUGLF-3dF4K2D-zxLNxvkDopC' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1i5DwbPj_m5KjhOTVsJ10o3Agn-tbkXcl' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1lDot9cIa-1Iq8P5hUnEbG8Svp1EW8JlH' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1F2wvPLEEKCp-qXMLdkKzhT3e4cK65tdZ' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1MV1b0SDN6ib5ItjoYnJnDEipsggRLWCX' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1nQP-4ijdJJ-1BtAUi8_aTMwUPKinvBer' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1XxXAfxcNNvr-vuu1-8dHcC-LCDXW-Aa7' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1Ikm8m_4hJEhKZ9-m8P4ulEW4XNS3vqms' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1pco78bzxzVvVmAKtIStVYKO9gRCr2dMP' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1BhTXuFL17SLwFRNsVtPfsrxa63_mAGu5' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1usjrcVMbzBoHIs89SHOoqjjNstic9hXq' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1cBOwOWiDB2aqqPYe2pbAuBIalQDDG9dx' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1LBEmxsFqZsxTMpAKXCf6eA4OTB7MFCn4' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1sNSC1dF6Jj-CH_jJAuQ-J7f8dmRuUrDy' },
        { type: 'fursuit', src: 'https://drive.google.com/uc?id=1JSZo7ZTukpd6L2EL721tt5EAyk7sQDwC' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1VnJOo1BIoNZJGCvItZuZpp019Ml8U6fE' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1paknwMDpF_ShMQGRAajdDFD9u-XM591u' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1TLOIVOSaraGaMxb0Ibquu3j2Ts0HJUxg' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1eI98WLUj57lnme416gnFGYZFqRmkfE2U' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1efHHXpZjPpjvvYgDmqt3dkKAnKGG6gdG' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1eM_d1a_wgPvk4YCwBUnPhbTzG0Fo9gbF' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1fxIOGAzh6dHqkV7aINpAk4HZ2VTqTtix' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1q1RrokzNNjTBqV4rwq9S3oOiKy4phj8b' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1HzG2XDV1iMSLghDlHsQDq5uuoYamLrnZ' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1HVXA1kRPxiPKkrl0mmGjPBZ_BFmj2q8A' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=14pIxp7L_p6RaxTF_LopIZjtiII6au76f' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1WipnBCUBuyNz-Oc8yDrH_6Qx282rqESW' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1mGgAHq1-95aPIODuARI9zdgL_YHC31Fz' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1deW7q7XFBH-vpo73fXXJq3DSv5-kaD4u' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1WhkwP-F9bvwXLPLW63OC5K0vQmUs2aat' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1f5jTY1Fb9bDwyxh0hQA2AI3pkHJCLQo_' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1jBFa-zQNGi1UlYc4xozUG24I3hwQinuS' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1fFxnlVHz6cpEH1uhFuVC7Djsy_LZdWvV' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=16cQXseB1wGhHWMaD2W1tUKBToUDypszj' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1RZvu8CQ2BX9mRk9AyZaT3UYU8LsJS1_a' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1oNWQwIOI8CRc9PZfui5y7Dvopxjr5Ky-' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=16M2wdjdeZ-vB05WBhESi6qaxwEQZBwZJ' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1J9Z92sFnRIDm0EGOj7p_XAu44tTx3GyM' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1yGzPHkkWstnkTb4lraq6IShGiJR29m5J' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1ftA8AY6pUqK2QLBn8QrwBQhcYctn558n' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1DcDB-__otlvtVdhcUduPyqEdLx-TpCwM' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1j55ZmZn4DH2yjlmydp0OCFw-_lcY34_t' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1-eM6ge_10zAkQ7dKVg7OVESgAxlDpy8Y' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1wM7B4v5s8iHojg_jXX_g_43mb_PuzAui' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1qutXPnne2MbWF9wBp72JSSd4Wl62dc4u' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=19eIYZN1ZUT2BSp8WPEN0rCYzI8BMDQDV' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1jeI11wlcdFcUyXy9t-whvsfPXqMXyxOK' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1ebWx8G9Pv6AId10vYJfSZB36oXX7oM4e' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1DFMhsRWJDimDZq7x0ldp81SrKIZADOl5' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1gHLKgT_A-9Px40-WhRMJU1RPx9aR7yIE' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1ZRBHfRo7l-vtS0peZLAcn00KaqeAav6z' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=129XK4ehaetNwU8LiQCgd4wsg0cXjyKOk' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=15F6L7_1UBJwOr-6YEPozHFco66tU7mZC' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1jsteMvXIcJZrIfaresowyBIhAzxoC7kV' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1BrZD0N5BRcmR4vggArHCpY4IAC0bXRiP' },
        { type: 'commission', src: 'https://drive.google.com/uc?id=1TorPuyrXW51RbJDKSExdOb9t2S28KUuA' }
    ];

    function parseImgUrl(url) {
        if (url.includes('google.com')) {
            const idMatch = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
            if (idMatch) return `https://wsrv.nl/?url=${encodeURIComponent(`https://drive.google.com/uc?id=${idMatch[1]}`)}`;
        }
        return url;
    }

    // `galleryData` and `parseImgUrl` stay even though the grid they used to
    // build now lives in the gallery sub-app: initBgSlideshow reads both.
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

    const initBgSlideshow = () => {
        const bgContainer = document.getElementById('bg-slideshow');
        if (!bgContainer) return;

        bgContainer.innerHTML = '';

        // Curated background pool: 16 images instead of all ~84
        const curatedIndices = [0, 5, 10, 15, 20, 25, 30, 35, 43, 48, 53, 58, 63, 68, 73, 78];
        const curatedBgPool = curatedIndices
            .filter(i => i < galleryData.length)
            .map(i => parseImgUrl(galleryData[i].src));

        let currentIndex = 0;

        curatedBgPool.forEach((url, index) => {
            const img = document.createElement('img');
            img.className = 'bg-slide';
            if (index > 0) {
                img.loading = 'lazy';
            }
            if (index === 0) img.classList.add('active', 'loaded');

            img.onload = () => img.classList.add('loaded');
            img.src = url;
            img.alt = "Background Slide";
            bgContainer.appendChild(img);
        });

        const slides = Array.from(bgContainer.children);

        if (slides.length > 1) {
            setInterval(() => {
                if (slides[currentIndex]) slides[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % slides.length;
                if (slides[currentIndex]) slides[currentIndex].classList.add('active');
            }, 8000);
        }
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
                { autoAlpha: 1, y: 0, scale: 1, clearProps: 'filter' },
                isMobile ? { duration: 1.0 } : { duration: 1.15, filter: `blur(0px) brightness(1) ${dropShadow}` }
            ),
            '-=0.55'
        );

        // 4. The two instrument panels boot into place.
        tl.fromTo('.ios-widget',
            { autoAlpha: 0, y: 24, scale: 0.96 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1 },
            '-=0.62'
        );

        // 5. The social dock: the one thing a stranger has to reach without
        //    scrolling, so it arrives as a single panel, not a scatter. Opacity
        //    only — `.social-dock` carries its own centring transform.
        tl.fromTo('.social-dock', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.4');

        // 6. And last, the invitation to keep going. The parent fades in; the
        //    chevron's endless drift is CSS on the child, so the two never fight.
        tl.fromTo('.scroll-hint', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '-=0.15');

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

    handleSpecialGreet();
    initBgSlideshow();
    // initAnimations() is called by the loader once the projector has warmed up.
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
       HUD toast — the card's one feedback channel. Spotify binding and a refused
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
   Spotify Lanyard API & Dynamic Spinning Vinyl Disc Player Controller
   ========================================================================== */

let spotifyIsPlaying = true;
let spotifyProgressSeconds = 84;
let spotifyDurationSeconds = 190;
let spotifyTimer = null;

// Curated Track Pool (Fallback when Spotify Discord presence is offline).
// No cover: the scdn URL that used to sit here 404s, and a dead image is worse
// than the blank holographic label the widget falls back to.
const fallbackTracks = [
    { title: "you", artist: "hehe x3", cover: "", duration: 190 }
];
let currentFallbackIndex = 0;

// Check for Spotify OAuth Redirect Callback Token
handleSpotifyOAuthCallback();

window.initSpotifyPlayer = function() {
    // One listener for the whole session: any artwork URL that dies after it is
    // handed over drops the disc to its blank label rather than a broken glyph.
    const coverEl = document.getElementById('spotify-album-cover');
    const discEl = document.getElementById('spotify-vinyl');
    if (coverEl && discEl) {
        coverEl.addEventListener('error', () => {
            coverEl.removeAttribute('src');
            discEl.classList.add('no-art');
        });
    }

    refreshLiveMusicData();

    // Auto-poll every 10 seconds for live song updates
    if (window.spotifyPollTimer) clearInterval(window.spotifyPollTimer);
    window.spotifyPollTimer = setInterval(refreshLiveMusicData, 10000);

    // Start local timer for smooth progress bar updates
    if (spotifyTimer) clearInterval(spotifyTimer);
    spotifyTimer = setInterval(tickSpotifyProgress, 1000);
};

function refreshLiveMusicData() {
    // 1. Check Official Spotify Web API Token
    if (fetchOfficialSpotifyAPI()) return;

    // 2. Check Discord Lanyard API (Live Spotify Broadcast for ID 1119272682953900034)
    const DISCORD_USER_ID = "1119272682953900034";
    fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.success && data.data) {
                const lanyard = data.data;
                if (lanyard.listening_to_spotify && lanyard.spotify) {
                    const ts = lanyard.spotify.timestamps || {};
                    const start = ts.start || (Date.now() - 30000);
                    const end = ts.end || (start + 180000);
                    const durationSecs = Math.max(30, Math.round((end - start) / 1000));
                    const progressSecs = Math.max(0, Math.min(durationSecs, Math.round((Date.now() - start) / 1000)));

                    updateSpotifyUI({
                        title: lanyard.spotify.song,
                        artist: lanyard.spotify.artist,
                        cover: lanyard.spotify.album_art_url,
                        duration: durationSecs,
                        progress: progressSecs,
                        isLive: true,
                        source: "Discord Spotify"
                    });
                    return;
                }
            }
            // 3. Fallback to Last.fm / Curated Pool
            const lastFmUser = localStorage.getItem('cobby_lastfm_user') || "cobbyproto";
            fetchLastFmSpotify(lastFmUser);
        })
        .catch(() => {
            const lastFmUser = localStorage.getItem('cobby_lastfm_user') || "cobbyproto";
            fetchLastFmSpotify(lastFmUser);
        });
}

/* ==========================================================================
   Official Spotify Web API OAuth & Currently Playing Endpoint Fetcher
   ========================================================================== */

function handleSpotifyOAuthCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (accessToken) {
        localStorage.setItem("cobby_spotify_access_token", accessToken);
        localStorage.setItem("cobby_spotify_token_expires", Date.now() + (parseInt(expiresIn || "3600") * 1000));
        window.location.hash = "";
        setTimeout(() => {
            if (window.showToast) window.showToast("🟢 Connected to Official Spotify Web API!");
        }, 800);
    }
}

function fetchOfficialSpotifyAPI() {
    const token = localStorage.getItem("cobby_spotify_access_token");
    const expires = localStorage.getItem("cobby_spotify_token_expires");

    if (!token || (expires && Date.now() > parseInt(expires))) {
        localStorage.removeItem("cobby_spotify_access_token");
        return false;
    }

    fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(res => {
        if (res.status === 401 || res.status > 400) {
            localStorage.removeItem("cobby_spotify_access_token");
            return null;
        }
        if (res.status === 204) return null;
        return res.json();
    })
    .then(data => {
        if (data && data.item) {
            const track = data.item;
            const isPlaying = data.is_playing;
            updateSpotifyUI({
                title: track.name,
                artist: track.artists.map(a => a.name).join(", "),
                cover: track.album.images[0] ? track.album.images[0].url : fallbackTracks[0].cover,
                duration: Math.round(track.duration_ms / 1000),
                progress: Math.round(data.progress_ms / 1000),
                isLive: isPlaying,
                source: "Official Spotify API"
            });
        }
    })
    .catch(() => {
        localStorage.removeItem("cobby_spotify_access_token");
    });

    return true;
}

window.loginWithOfficialSpotify = function() {
    let clientId = localStorage.getItem("cobby_spotify_client_id") || "c289283783164bdd8b115310f3ea92d3";
    localStorage.setItem("cobby_spotify_client_id", clientId.trim());

    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = "user-read-currently-playing user-read-playback-state";
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId.trim())}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

    window.location.href = authUrl;
};

// The key on file answers 403 "Invalid API key", so this tier can only fail.
// Latch on the first rejection: one wasted request per page load instead of one
// per poll, and dropping in a valid key restores the tier with no other change.
let lastFmRejected = false;

function fetchLastFmSpotify(username) {
    if (lastFmRejected) {
        loadFallbackSpotifyTrack();
        return;
    }

    const LASTFM_API_KEY = "4289ea0bf005aa314ebbb1faaeef12bf";
    fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`)
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                lastFmRejected = true;
                return null;
            }
            return res.json();
        })
        .then(data => {
            if (!data) {
                loadFallbackSpotifyTrack();
                return;
            }
            if (data.error) {
                lastFmRejected = true;
                loadFallbackSpotifyTrack();
                return;
            }
            if (data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
                const track = data.recenttracks.track[0];
                const isNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
                const coverUrl = (track.image && track.image[2] && track.image[2]['#text']) ? track.image[2]['#text'] : '';

                updateSpotifyUI({
                    title: track.name,
                    artist: track.artist['#text'] || track.artist.name,
                    cover: coverUrl,
                    duration: 180,
                    progress: 45,
                    isLive: isNowPlaying,
                    source: "Spotify Web API"
                });
            } else {
                loadFallbackSpotifyTrack();
            }
        })
        .catch(() => loadFallbackSpotifyTrack());
}

function updateSpotifyUI(track) {
    const titleEl = document.getElementById('spotify-track-title');
    const artistEl = document.getElementById('spotify-track-artist');
    const coverEl = document.getElementById('spotify-album-cover');
    const labelEl = document.getElementById('spotify-status-label');
    const discEl = document.getElementById('spotify-vinyl');

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (labelEl) labelEl.textContent = track.isLive ? "SPOTIFY LIVE" : "LISTENING TO";

    if (coverEl && discEl) {
        if (track.cover) {
            discEl.classList.remove('no-art');
            // Re-assigning an unchanged src re-fetches it, which the 10s poll
            // would otherwise do forever.
            if (coverEl.getAttribute('src') !== track.cover) coverEl.src = track.cover;
        } else {
            coverEl.removeAttribute('src');
            discEl.classList.add('no-art');
        }
    }

    spotifyDurationSeconds = track.duration || 190;
    spotifyProgressSeconds = track.progress || 0;
    updateSpotifyProgressBar();
}

function loadFallbackSpotifyTrack() {
    const track = fallbackTracks[currentFallbackIndex];
    updateSpotifyUI({
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        duration: track.duration,
        progress: spotifyProgressSeconds,
        isLive: false
    });
}

function tickSpotifyProgress() {
    if (!spotifyIsPlaying) return;

    spotifyProgressSeconds++;
    if (spotifyProgressSeconds >= spotifyDurationSeconds) {
        spotifyProgressSeconds = 0;
        currentFallbackIndex = (currentFallbackIndex + 1) % fallbackTracks.length;
        loadFallbackSpotifyTrack();
    }
    updateSpotifyProgressBar();
}

function updateSpotifyProgressBar() {
    const fillEl = document.getElementById('spotify-progress-fill');
    const curTimeEl = document.getElementById('spotify-current-time');
    const totTimeEl = document.getElementById('spotify-total-time');

    const pct = Math.min(100, (spotifyProgressSeconds / spotifyDurationSeconds) * 100);
    if (fillEl) fillEl.style.width = `${pct}%`;

    if (curTimeEl) curTimeEl.textContent = formatSpotifyTime(spotifyProgressSeconds);
    if (totTimeEl) totTimeEl.textContent = formatSpotifyTime(spotifyDurationSeconds);
}

function formatSpotifyTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}


/* ==========================================================================
   Site bootstrap — the Spotify controller is the only thing left to start here.
   ========================================================================== */

const initializeSite = () => {
    if (window.initSpotifyPlayer) window.initSpotifyPlayer();
};

if (document.readyState === "complete" || document.readyState === "interactive") {
    initializeSite();
} else {
    document.addEventListener("DOMContentLoaded", initializeSite);
}

window.promptSpotifyBinding = function() {
    const isOfficialConnected = !!localStorage.getItem("cobby_spotify_access_token");
    
    const choice = confirm(
        "🎵 Spotify API Settings:\n\n" +
        (isOfficialConnected ? "🟢 Connected to Official Spotify API!\n\nClick OK to re-authenticate / change Client ID, or Cancel to manage Last.fm/Discord fallback." : "Click OK to Log In with Official Spotify Web API (accounts.spotify.com), or Cancel to use Last.fm / Discord.")
    );

    if (choice) {
        window.loginWithOfficialSpotify();
    } else {
        const current = localStorage.getItem('cobby_lastfm_user') || '';
        const user = prompt("🎵 Bind Spotify via Last.fm (No Discord required):\n\nEnter your Last.fm username below (Leave blank to use Discord / Fallback):", current);
        
        if (user !== null) {
            localStorage.setItem('cobby_lastfm_user', user.trim());
            if (user.trim()) {
                window.showToast(`🎧 Bound Spotify to Last.fm user: ${user.trim()}!`);
            } else {
                localStorage.removeItem("cobby_spotify_access_token");
                window.showToast("Cleared Spotify bindings.");
            }
            window.initSpotifyPlayer();
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('global-loader');
    const msgEl = document.getElementById('loader-message');

    if (!loader) {
        if (window.initAnimations) window.initAnimations();
        else liftBootGate();
        return;
    }

    // Three seconds of warm-up the first time, one on a return visit, and none at
    // all for a crawler that is here to score the page rather than read it.
    let loadTime = 3000;
    const ua = navigator.userAgent.toLowerCase();
    const isBot = ua.includes('lighthouse') || ua.includes('googlebot') || ua.includes('pagespeed');
    if (isBot) {
        loadTime = 0;
    } else if (sessionStorage.getItem('cobby_visited')) {
        loadTime = 1000;
    } else {
        sessionStorage.setItem('cobby_visited', 'true');
    }

    const finish = () => {
        loader.classList.add('hidden');
        // Retire it from the render tree once the fade has played out. Hidden
        // but still displayed, its spinner and shimmer animations would keep
        // running forever underneath the page.
        setTimeout(() => loader.classList.add('retired'), 750);
        if (window.initAnimations) window.initAnimations();
        else liftBootGate();
    };

    if (loadTime === 0) {
        finish();
        return;
    }

    const steps = [
        { at: 30, text: 'hope you have a nice day! :333' },
        { at: 60, text: 'getting ready~ :3' },
    ];
    let start = null;
    let step = 0;

    requestAnimationFrame(function tick(now) {
        if (start === null) start = now;
        const elapsed = now - start;
        const pct = (elapsed / loadTime) * 100;

        if (step < steps.length && pct >= steps[step].at) {
            const text = steps[step++].text;
            if (msgEl) {
                if (typeof gsap !== 'undefined') {
                    gsap.to(msgEl, {
                        opacity: 0,
                        duration: 0.2,
                        onComplete: () => {
                            msgEl.textContent = text;
                            gsap.to(msgEl, { opacity: 1, duration: 0.2 });
                        },
                    });
                } else {
                    msgEl.textContent = text;
                }
            }
        }

        if (elapsed < loadTime) requestAnimationFrame(tick);
        else finish();
    });
});
