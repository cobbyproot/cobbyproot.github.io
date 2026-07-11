

window.onbeforeunload = function () {
    window.scrollTo(0, 0);
};

document.addEventListener("DOMContentLoaded", () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);

    gsap.registerPlugin(ScrollTrigger);

    gsap.set(['.hero-avatar', 'h1', '.hero-desc', '.persistent-hero .tag', '.social-btn', '.nav-dock', '.scroll-hint'], { autoAlpha: 1 });

    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        mouseMultiplier: 1,
    });
    lenis.scrollTo(0, { immediate: true });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Detect touch/mobile — disable mouse-only features
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;

    const dot = document.querySelector('.cursor-dot');
    const follower = document.querySelector('.cursor-follower');
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;
    let isStuck = false;
    let stuckEl = null;

    if (!isMobile) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        });
    }

    const lerp = (start, end, f) => start + (end - start) * f;

    let cachedStuckRadius = '50%';

    if (!isMobile) {
        (function animateCursor() {
            if (isStuck && stuckEl) {
                const rect = stuckEl.getBoundingClientRect();
                followerX = lerp(followerX, rect.left + rect.width / 2, 0.15);
                followerY = lerp(followerY, rect.top + rect.height / 2, 0.15);
                follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate3d(-50%, -50%, 0)`;
                follower.style.width = `${rect.width + 10}px`;
                follower.style.height = `${rect.height + 10}px`;
                follower.style.borderRadius = cachedStuckRadius;
            } else {
                followerX = lerp(followerX, mouseX, 0.15);
                followerY = lerp(followerY, mouseY, 0.15);
                follower.style.width = '24px';
                follower.style.height = '24px';
                follower.style.borderRadius = '50%';
                follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate3d(-50%, -50%, 0)`;
            }
            requestAnimationFrame(animateCursor);
        })();
    }

    const refreshSticky = () => {
        if (isMobile) return; // no hover events on touch
        document.querySelectorAll('[data-sticky]').forEach(el => {

            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);

            el.addEventListener('mouseenter', onMouseEnter);
            el.addEventListener('mouseleave', onMouseLeave);
        });
    };

    function onMouseEnter(e) {
        isStuck = true;
        stuckEl = e.currentTarget;
        cachedStuckRadius = window.getComputedStyle(stuckEl).borderRadius;
        follower.classList.add('sticky');
        dot.classList.add('hidden');
    }

    function onMouseLeave() {
        isStuck = false;
        stuckEl = null;
        follower.classList.remove('sticky');
        dot.classList.remove('hidden');
    }

    window.switchTab = (tabId) => {
        // Hide all tabs
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });

        // Remove active class from all buttons
        const btns = document.querySelectorAll('.tab-btn');
        btns.forEach(btn => {
            btn.classList.remove('active');
        });

        // Show target tab
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) {
            targetTab.style.display = 'block';
            setTimeout(() => targetTab.classList.add('active'), 10);
        }

        // Highlight target button
        const targetBtn = document.getElementById(`tab-btn-${tabId}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        if (tabId === 'gallery' && window.renderGallery) {
            window.renderGallery('all');
        }

        if (window.ScrollTrigger) window.ScrollTrigger.refresh();

        const targetEl = document.getElementById(`tabs-container`);
        if (targetEl) {
            const yPos = targetEl.getBoundingClientRect().top + window.pageYOffset - 120;
            window.scrollTo({ top: yPos, behavior: 'smooth' });
            if (lenis) lenis.scrollTo(yPos, { duration: 1.0 });
        }
    };

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

    let galleryScrollTriggers = [];

    window.renderGallery = (filter = 'all') => {
        const grid = document.getElementById('dynamic-gallery-grid');
        if (!grid) return;

        galleryScrollTriggers.forEach(st => {
            if (st) st.kill();
        });
        galleryScrollTriggers = [];

        grid.innerHTML = '';
        const filtered = filter === 'all' ? [...galleryData] : galleryData.filter(item => item.type === filter);

        for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        const itemsToRender = filtered;

        const cards = [];
        itemsToRender.forEach((item) => {
            const cleanSrc = parseImgUrl(item.src);
            const card = document.createElement('div');
            card.className = 'art-card';
            card.setAttribute('data-sticky', '');
            card.onclick = () => openModal(`${cleanSrc}&w=1600&q=90&output=webp`);

            card.style.opacity = '1';
            card.style.transform = 'none';
            const imgWidth = isMobile ? 300 : 600;
            card.innerHTML = `
                <img src="${cleanSrc}&w=${imgWidth}&q=75&output=webp" loading="lazy" onload="this.classList.add('loaded')">
                <div class="art-badge">${item.type === 'fursuit' ? 'Fursuit' : 'Comm'}</div>
            `;
            grid.appendChild(card);
            cards.push(card);

            if (isMobile) {
                gsap.set(card, { opacity: 1, y: 0 });
            } else {
                const anim = gsap.fromTo(card,
                    { opacity: 0, y: 40 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: card,
                            start: "top 95%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
                galleryScrollTriggers.push(anim.scrollTrigger);
            }
        });

        setTimeout(() => ScrollTrigger.refresh(), 100);
        refreshSticky();
    };

    window.filterGallery = (type) => {
        const btns = document.querySelectorAll('.gallery-tab-btn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(type) || (type === 'all' && btn.textContent === 'All')) {
                btn.classList.add('active');
            }
        });
        renderGallery(type);
    };

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
        const langBtn = document.querySelector('.lang-btn');
        langBtn.classList.toggle('flipped');
        document.body.classList.toggle('lang-vi');
        document.body.classList.toggle('lang-en');
        lenis.resize();
    };

    const triggerEls = document.querySelectorAll('.hero-avatar, .nav-brand');
    let isFlipped = false;

    triggerEls.forEach(el => {
        el.addEventListener('click', () => {
            isFlipped = !isFlipped;
            const inners = document.querySelectorAll('.flip-inner');

            gsap.to(inners, {
                rotationY: isFlipped ? 180 : 0,
                duration: 0.8,
                ease: "back.out(1.2)",
                onComplete: () => {
                    if (el.classList.contains('nav-brand')) {
                        lenis.scrollTo(0);
                    }
                }
            });
        });
    });

    const handleSpecialGreet = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const eventParam = urlParams.get('event');

        if (eventParam === 'fuve2026') {
            const overlay = document.getElementById('special-greet-overlay');
            const cardWrapper = document.getElementById('card-anim-wrapper');
            const contentArea = overlay.querySelector('.special-content');

            contentArea.innerHTML = `
                <i class="fas fa-sparkles" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
                <h3>Hi there!</h3>
                <p style="margin-top: 10px;">Thank you for meeting me at <b>FUVE 2026</b>!</p>
                <p>Would you like to explore the site in the <span style="color:var(--primary)">FUVE 2026 Edition</span> theme?</p>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="activate-fuve" class="enter-btn" data-sticky>Yes, please!</button>
                    <button id="close-greet" class="enter-btn" style="background:transparent;" data-sticky>Standard</button>
                </div>
            `;

            overlay.classList.remove('hidden');
            cardWrapper.classList.add('play-enter');

            const activateBtn = document.getElementById('activate-fuve');
            const standardBtn = document.getElementById('close-greet');

            activateBtn.addEventListener('click', () => {
                document.body.classList.add('fuve-edition');
                closeOverlay();
            });

            standardBtn.addEventListener('click', closeOverlay);

            function closeOverlay() {
                gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.8,
                    onComplete: () => overlay.classList.add('hidden')
                });
            }
        } else {
            const standardCloseBtn = document.getElementById('close-greet');
            if (standardCloseBtn) {
                standardCloseBtn.addEventListener('click', () => {
                    const overlay = document.getElementById('special-greet-overlay');
                    gsap.to(overlay, {
                        opacity: 0,
                        duration: 0.8,
                        onComplete: () => overlay.classList.add('hidden')
                    });
                });
            }
        }
    };

    const protoVersions = {
        v1: { img: "https://i.postimg.cc/jqGVbv06/331001879-669549808278428-4042368373563903679-n-1-removebg-preview-(2).png", label: "PROOT 1.0 [OWO]" },
        v2: { img: "https://i.postimg.cc/pXqdCg5k/40ca4ea3-a030-4933-9f1a-689f4691d0d2.png", label: "PROOT 2.0 [UWU]" },
        v3: { img: "https://i.postimg.cc/ZqD3QWBZ/2df3be35-804a-4c48-9df7-ca7ea1ef44c3.png", label: "PROOT 3.0 [AWA]" }
    };

    Object.values(protoVersions).forEach(v => {
        const img = new Image();
        img.src = v.img;
    });

    window.switchProtoVersion = (verId) => {

        const btns = document.querySelectorAll('.v-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');

        const imgEl = document.getElementById('proto-ref-img');
        const labelEl = document.getElementById('proto-ref-label');

        if (imgEl && labelEl && protoVersions[verId]) {
            gsap.to(imgEl, {
                opacity: 0,
                scale: 0.9,
                y: 15,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => {
                    imgEl.src = protoVersions[verId].img;
                    labelEl.textContent = protoVersions[verId].label;

                    gsap.fromTo(labelEl, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3 });

                    const fadeIn = () => {
                        gsap.to(imgEl, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(2)' });
                    };

                    if (imgEl.complete) {
                        fadeIn();
                    } else {
                        imgEl.onload = fadeIn;
                    }
                }
            });
        }
    };

    window.copyGameUsername = (text, btn) => {
        navigator.clipboard.writeText(text).then(() => {
            const icon = btn.querySelector('i');
            icon.className = 'fas fa-check';
            icon.style.color = 'var(--primary)';
            setTimeout(() => {
                icon.className = 'far fa-copy';
                icon.style.color = '';
            }, 2000);
        });
    };

    const bgWallpapers = [...galleryData]
        .sort(() => 0.5 - Math.random())
        .map(item => parseImgUrl(item.src));

    const initBgSlideshow = () => {
        const bgContainer = document.getElementById('bg-slideshow');
        if (!bgContainer) return;

        bgContainer.innerHTML = '';

        let currentIndex = 0;

        bgWallpapers.forEach((url, index) => {
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

    const initAnimations = () => {

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo('.name-char',
            { autoAlpha: 0, y: 80, rotationX: -90 },
            { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.7, stagger: 0.03, ease: "back.out(1.8)" },
            0.1
        );

        tl.fromTo('.hero-character-stage',
            { autoAlpha: 0, scale: 0.7, y: 40 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.4)" },
            "-=0.5"
        );

        tl.fromTo('.ios-widget',
            { autoAlpha: 0, y: 30, scale: 0.9 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.5)" },
            "-=0.6"
        );

        tl.fromTo('.ios-dynamic-island',
            { autoAlpha: 0, y: 40 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(1.6)" },
            "-=0.4"
        );

        tl.fromTo('.social-btn',
            { autoAlpha: 0, scale: 0.5, y: 20 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.03, ease: "back.out(2)" },
            "-=0.4"
        );

        tl.fromTo('.nav-dock',
            { y: 120, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.6, ease: "power4.out" },
            "-=0.3"
        );

        tl.fromTo('.scroll-hint',
            { autoAlpha: 0, y: -20 },
            { autoAlpha: 0.6, y: 0, duration: 0.5 },
            "-=0.2"
        );

        const revealElements = gsap.utils.toArray('.showcase-title-row, .gallery-tab-btn, .project-card, .namecard-grid');

        if (isMobile) {
            gsap.set(revealElements, { autoAlpha: 1, y: 0, scale: 1 });
        } else {
            revealElements.forEach(el => {
                gsap.fromTo(el,
                    { autoAlpha: 0, y: 40, scale: 0.98 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.8,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 90%",
                            toggleActions: "play none none reverse",
                        }
                    }
                );
            });
        }

        gsap.utils.toArray(".game-panel").forEach((panel) => {
            if (isMobile) {
                gsap.set(panel, { autoAlpha: 1, y: 0, scale: 1, scaleX: 1, scaleY: 1 });
            } else {
                const speed = parseFloat(panel.getAttribute("data-speed") || 1);
                gsap.fromTo(panel,
                    { y: 50 * speed },
                    {
                        y: -50 * speed,
                        ease: "none",
                        scrollTrigger: {
                            trigger: panel,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );

                if (panel.classList.contains("terminal-theme")) {
                    gsap.fromTo(panel,
                        { autoAlpha: 0, scaleY: 0.01, scaleX: 0.3 },
                        {
                            autoAlpha: 1,
                            scaleY: 1,
                            scaleX: 1,
                            duration: 1,
                            ease: "expo.out",
                            scrollTrigger: {
                                trigger: panel,
                                start: "top 85%",
                                toggleActions: "play none none reverse"
                            }
                        }
                    );
                } else {
                    gsap.fromTo(panel,
                        { autoAlpha: 0, scale: 0.98 },
                        {
                            autoAlpha: 1,
                            scale: 1,
                            duration: 1,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: panel,
                                start: "top 85%",
                                toggleActions: "play none none reverse"
                            }
                        }
                    );
                }
            }
        });

        gsap.to('.persistent-hero', {
            opacity: 0,
            y: -100,
            scrollTrigger: {
                trigger: '.persistent-hero',
                start: "top top",
                end: "bottom 40%",
                scrub: true
            }
        });
    };

    class Particle {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.density = (Math.random() * 20) + 1;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        draw() {

            this.ctx.fillStyle = `rgba(0, 229, 255, ${this.isNear ? 0.45 : this.opacity})`;
            this.ctx.shadowBlur = this.isNear ? 3 : 0;
            this.ctx.shadowColor = `rgba(0, 229, 255, 0.4)`;

            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, this.isNear ? this.size * 1.2 : this.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        update(mouseX, mouseY) {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0) this.x = this.canvas.width;
            if (this.x > this.canvas.width) this.x = 0;
            if (this.y < 0) this.y = this.canvas.height;
            if (this.y > this.canvas.height) this.y = 0;

            let dx = mouseX - this.x;
            let dy = mouseY - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy) || 1;

            let maxDist = 150;
            this.isNear = distance < maxDist;

            if (distance < maxDist) {
                let force = (maxDist - distance) / maxDist;
                let multiplier = this.density;
                this.x -= (dx / distance) * force * multiplier * 0.8;
                this.y -= (dy / distance) * force * multiplier * 0.8;
            }
        }
    }

    const initParticles = () => {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particlesArray = [];
        let mouseX = -500, mouseY = -500;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            spawn();
        };

        const spawn = () => {
            particlesArray = [];
            const count = (canvas.width * canvas.height) / 7000;
            for (let i = 0; i < count; i++) particlesArray.push(new Particle(canvas));
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach(p => {
                p.draw();
                p.update(mouseX, mouseY);
            });
            requestAnimationFrame(animate);
        };

        resize();
        animate();
    };

    const initInteractiveTitle = () => {
        const title = document.querySelector('h1');
        if (!title) return;

        const text = title.textContent;
        title.innerHTML = '';

        gsap.set(title, { autoAlpha: 1 });

        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.className = 'name-char';

            span.style.animationDelay = `${index * -0.3}s`;

            gsap.set(span, { autoAlpha: 0 });
            title.appendChild(span);
        });

        const chars = title.querySelectorAll('.name-char');

        if (!isMobile) {
            // Cache char positions and refresh on resize/scroll
            let charRects = [];
            const updateCharRects = () => {
                charRects = Array.from(chars).map(char => {
                    const rect = char.getBoundingClientRect();
                    return { el: char, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
                });
            };
            window.addEventListener('resize', updateCharRects);
            window.addEventListener('scroll', updateCharRects, { passive: true });
            lenis.on('scroll', updateCharRects);
            setTimeout(updateCharRects, 300);

            let titleMouseX = -9999, titleMouseY = -9999;
            let titleRafPending = false;

            const processTitleMouse = () => {
                titleRafPending = false;
                const maxDist = 140;
                charRects.forEach(({ el: char, cx: charX, cy: charY }) => {
                    const distX = titleMouseX - charX;
                    const distY = titleMouseY - charY;
                    const distance = Math.sqrt(distX * distX + distY * distY);

                    if (distance < maxDist) {
                        const factor = (maxDist - distance) / maxDist;
                        gsap.to(char, {
                            y: -factor * 35,
                            rotation: (distX / maxDist) * 20 * factor,
                            scale: 1 + (factor * 0.4),
                            duration: 0.4,
                            ease: "power2.out",
                            overwrite: "auto"
                        });
                    } else {
                        gsap.to(char, {
                            y: 0,
                            rotation: 0,
                            scale: 1,
                            duration: 0.8,
                            ease: "elastic.out(1, 0.3)",
                            overwrite: "auto"
                        });
                    }
                });
            };

            document.addEventListener('mousemove', (e) => {
                titleMouseX = e.clientX;
                titleMouseY = e.clientY;
                if (!titleRafPending) {
                    titleRafPending = true;
                    requestAnimationFrame(processTitleMouse);
                }
            });
        }
    };

    const initCharacterSelect = () => {
        const panels = document.querySelectorAll('.character-select-layout');
        if (window.innerWidth > 900) {
            panels.forEach(selectPanel => {
                const leftPanel = selectPanel.querySelector('.cs-left');
                const rightPanel = selectPanel.querySelector('.cs-right');
                const characterImg = selectPanel.querySelector('.cs-character-img');

                if (!leftPanel || !rightPanel || !characterImg) return;

                let csRafPending = false;
                let csMouseX = 0, csMouseY = 0;

                const processCSMouse = () => {
                    csRafPending = false;
                    const rect = selectPanel.getBoundingClientRect();
                    const x = (csMouseX - rect.left - rect.width / 2) / (rect.width / 2);
                    const y = (csMouseY - rect.top - rect.height / 2) / (rect.height / 2);
                    gsap.to(leftPanel, { rotationY: 15 + x * -8, rotationX: y * 4, x: x * -10, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
                    gsap.to(rightPanel, { rotationY: -15 + x * -8, rotationX: y * 4, x: x * 10, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
                    gsap.to(characterImg, { x: x * -15, y: y * -10, rotationY: x * 15, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
                };

                selectPanel.addEventListener('mousemove', (e) => {
                    csMouseX = e.clientX;
                    csMouseY = e.clientY;
                    if (!csRafPending) {
                        csRafPending = true;
                        requestAnimationFrame(processCSMouse);
                    }
                });

                selectPanel.addEventListener('mouseleave', () => {
                    gsap.to([leftPanel, rightPanel, characterImg], {
                        rotationY: (i, el) => el.classList.contains('cs-left') ? 15 : el.classList.contains('cs-right') ? -15 : 0,
                        rotationX: 0, x: 0, y: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)', overwrite: 'auto'
                    });
                });
            });
        }
    };

    const initPongGame = () => {
        const canvas = document.getElementById('pong-canvas');
        if (!canvas) return;
        canvas.style.height = '60px';
        const scoreEl = document.getElementById('pong-score');
        const ctx = canvas.getContext('2d');

        const COLOR = '#00e5ff';
        const COLOR_RGB = '0,229,255';

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
            requestAnimationFrame(loop);
        }
        loop();
    };

    initInteractiveTitle();
    renderGallery('all');
    refreshSticky();
    handleSpecialGreet();
    initBgSlideshow();
    initCharacterSelect();
    initAnimations();
    if (!isMobile) initPongGame();
    if (!isMobile) initParticles();

    window.addEventListener('resize', () => {
        lenis.resize();
        ScrollTrigger.refresh();
    });

    if (!isMobile) {
        (function () {
            const SECRET = 'hypno';
            let typed = '';
            let hypnoActive = false;

            document.addEventListener('keydown', (e) => {
                typed += e.key.toLowerCase();
                if (typed.length > SECRET.length) typed = typed.slice(-SECRET.length);

                if (typed === SECRET) {
                    typed = '';
                    hypnoActive = !hypnoActive;
                    triggerHypnoMode(hypnoActive);
                }
            });

            function triggerHypnoMode(activate) {

                const flash = document.createElement('div');
                flash.className = 'hypno-overlay';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 1500);

                if (activate) {

                    setTimeout(() => {
                        document.body.classList.add('hypno-mode');

                        const heroName = document.querySelector('h1');
                        if (heroName) {
                            const original = heroName.textContent;
                            const forbidden = ['👁', '🌀', 'YOU', 'ARE', 'MINE', 'STARE', 'SLEEP'];
                            let i = 0;
                            heroName.dataset.origText = heroName.innerHTML;
                            const glitch = setInterval(() => {
                                heroName.style.color = i % 2 === 0 ? '#ff003c' : '#d900ff';
                                i++;
                                if (i > 8) {
                                    clearInterval(glitch);
                                    heroName.style.color = '';
                                }
                            }, 80);
                        }

                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(60, ctx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
                            gain.gain.setValueAtTime(0.3, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.start();
                            osc.stop(ctx.currentTime + 1.2);
                        } catch (e) { }
                    }, 200);
                } else {
                    setTimeout(() => {
                        document.body.classList.remove('hypno-mode');
                    }, 200);
                }
            }
        })();
    }

    /* ==========================================================================
       Live Profile Editor System
       ========================================================================== */

    const EDITABLE_STORAGE_KEY = 'cardSite_user_profile_data_v2';
    let isEditModeActive = false;

    window.showToast = function(msg) {
        let toast = document.getElementById('editor-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'editor-toast';
            toast.className = 'editor-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    };
});

/* ==========================================================================
   Spotify Lanyard API & Dynamic Spinning Vinyl Disc Player Controller
   ========================================================================== */

let spotifyIsPlaying = true;
let spotifyProgressSeconds = 84;
let spotifyDurationSeconds = 190;
let spotifyTimer = null;

// Curated Track Pool (Fallback when Spotify Discord presence is offline)
const fallbackTracks = [
    { title: "you", artist: "hehe x3", cover: "https://i.scdn.co/image/ab67616d0000b2734a742880d6b63a92543e49e2", duration: 190 }
];
let currentFallbackIndex = 0;

// Check for Spotify OAuth Redirect Callback Token
handleSpotifyOAuthCallback();

window.initSpotifyPlayer = function() {
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

function fetchLastFmSpotify(username) {
    const LASTFM_API_KEY = "b25752097e8b428d09596e382d56a2bb";
    fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`)
        .then(res => res.json())
        .then(data => {
            if (data && data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
                const track = data.recenttracks.track[0];
                const isNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
                let coverUrl = (track.image && track.image[2] && track.image[2]['#text']) ? track.image[2]['#text'] : "";
                if (!coverUrl || coverUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                    coverUrl = fallbackTracks[0].cover;
                }

                updateSpotifyUI({
                    title: track.name,
                    artist: track.artist['#text'] || track.artist.name,
                    cover: coverUrl,
                    duration: 190,
                    progress: isNowPlaying ? 65 : 190,
                    isLive: isNowPlaying,
                    source: "Last.fm Spotify"
                });
            } else {
                loadFallbackSpotifyTrack();
            }
        })
        .catch(() => loadFallbackSpotifyTrack());
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

function fetchLastFmSpotify(username) {
    const LASTFM_API_KEY = "4289ea0bf005aa314ebbb1faaeef12bf";
    fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`)
        .then(res => res.json())
        .then(data => {
            if (data && data.recenttracks && data.recenttracks.track && data.recenttracks.track.length > 0) {
                const track = data.recenttracks.track[0];
                const isNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
                const coverUrl = (track.image && track.image[2] && track.image[2]['#text']) ? track.image[2]['#text'] : fallbackTracks[0].cover;
                
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

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (coverEl && track.cover) coverEl.src = track.cover;
    if (labelEl) labelEl.textContent = track.isLive ? "SPOTIFY LIVE" : "LISTENING TO";

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
   cobby.exe Terminal Typing & Retype Cycle Animation
   ========================================================================== */

window.initTerminalTyping = function() {
    // Typing animation removed.
};

/* ==========================================================================
   Constellation Energy Connecting Lines Dynamic Linker
   ========================================================================== */

function updateConstellationLines() {
    const stage = document.querySelector('.hero-stage-container');
    const svg = document.getElementById('constellation-svg');
    if (!stage || !svg) return;

    const stageRect = stage.getBoundingClientRect();

    const getCenter = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - stageRect.left,
            y: rect.top + rect.height / 2 - stageRect.top
        };
    };

    const fb = getCenter('.bubble-fb');
    const tw = getCenter('.bubble-tw');
    const barq = getCenter('.bubble-barq');
    const dc = getCenter('.bubble-dc');
    const bump = getCenter('.bubble-bump');
    const tg = getCenter('.bubble-tg');
    const lang = getCenter('.bubble-lang');
    const center = getCenter('.hero-character-png');

    const drawLine = (lineId, p1, p2) => {
        const line = document.getElementById(lineId);
        if (line && p1 && p2) {
            line.setAttribute('x1', p1.x);
            line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x);
            line.setAttribute('y2', p2.y);
        }
    };

    drawLine('line-fb-barq', fb, barq);
    drawLine('line-barq-bump', barq, bump);
    drawLine('line-tw-dc', tw, dc);
    drawLine('line-dc-tg', dc, tg);
    drawLine('line-tw-lang', tw, lang);
    drawLine('line-center-fb', center, fb);
    drawLine('line-center-tw', center, tw);
    drawLine('line-center-dc', center, dc);
    drawLine('line-center-barq', center, barq);
    drawLine('line-center-lang', center, lang);
}

function loopConstellation() {
    updateConstellationLines();
    requestAnimationFrame(loopConstellation);
}

// Initialize Spotify Player, Terminal Typing & Constellation Web on page load
const initializeSite = () => {
    if (window.initSpotifyPlayer) window.initSpotifyPlayer();
    if (window.initTerminalTyping) window.initTerminalTyping();
    requestAnimationFrame(loopConstellation);
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

/* ==========================================================================
   Global Loader & COBBY Entry Animation
   ========================================================================== */

let isLoaded = false;
function hideLoaderAndAnimate() {
    if (isLoaded) return;
    isLoaded = true;
    const loader = document.getElementById('global-loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            triggerAnimations();
        }, 150);
    } else {
        triggerAnimations();
    }
}

if (document.readyState === 'complete') {
    hideLoaderAndAnimate();
} else {
    window.addEventListener('load', hideLoaderAndAnimate);
    setTimeout(hideLoaderAndAnimate, 1200); // 1.2s max limit!
}

function triggerAnimations() {
    if (typeof gsap !== 'undefined') {
        // Fade in backgrounds
        gsap.fromTo(["#bg-slideshow", ".bg-overlay", ".noise-bg"], 
            { opacity: 0 },
            { opacity: 1, duration: 1.0, ease: "power2.out" }
        );

        // Flash load hero image (no GSAP animation, it's just instantly there)
        
        // After hero is there, animate COBBY text smoothly as a whole
        gsap.fromTo(".giant-cobby-text", 
            { y: 30, opacity: 0, scale: 0.95 },
            { 
                y: 0, 
                opacity: 1, 
                scale: 1,
                duration: 1.0, 
                ease: "back.out(1.2)",
                delay: 0.1
            }
        );
    }
}
