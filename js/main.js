

document.addEventListener("DOMContentLoaded", () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    gsap.registerPlugin(ScrollTrigger);

    gsap.set(['.hero-avatar', 'h1', '.hero-desc', '.persistent-hero .tag', '.social-btn', '.nav-dock', '.scroll-hint'], { autoAlpha: 0 });

    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        mouseMultiplier: 1,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    const dot = document.querySelector('.cursor-dot');
    const follower = document.querySelector('.cursor-follower');
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;
    let isStuck = false;
    let stuckEl = null;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    const lerp = (start, end, f) => start + (end - start) * f;

    let cachedStuckRadius = '50%';

    function animateCursor() {
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
    }
    animateCursor();

    const refreshSticky = () => {
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

    let currentView = 'profile';

    window.switchView = (viewName) => {
        if (currentView === viewName) {
            lenis.scrollTo(window.innerHeight, { duration: 1.5 });
            return;
        }

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(el => el.classList.remove('active'));

        const targetBtn = document.getElementById(`btn-${viewName}`);
        if (targetBtn) targetBtn.classList.add('active');

        const oldView = document.getElementById(`view-${currentView}`);
        const newView = document.getElementById(`view-${viewName}`);

        if (!oldView || !newView) return;

        gsap.to(oldView, {
            opacity: 0,
            y: -30,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => {
                oldView.style.display = 'none';
                newView.style.display = 'block';

                ScrollTrigger.refresh();

                gsap.fromTo(newView,
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                );

                currentView = viewName;
                lenis.resize();
                lenis.scrollTo(window.innerHeight, { duration: 1.5 });
            }
        });
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

            card.style.opacity = '0';
            card.style.transform = 'translateY(40px)';
            card.innerHTML = `
                <img src="${cleanSrc}&w=600&q=75&output=webp" loading="lazy" onload="this.classList.add('loaded')">
                <div class="art-badge">${item.type === 'fursuit' ? 'Fursuit' : 'Comm'}</div>
            `;
            grid.appendChild(card);
            cards.push(card);

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

    const initBgSlideshow = () => {
        const bgContainer = document.getElementById('bg-slideshow');
        if (!bgContainer || !galleryData || galleryData.length === 0) return;

        const shuffled = [...galleryData].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);
        let currentIndex = 0;

        selected.forEach((item, index) => {
            const imgUrl = parseImgUrl(item.src) + '&w=1920&q=50&output=webp';
            const img = document.createElement('img');
            img.className = 'bg-slide';

            img.onload = () => {
                img.classList.add('loaded');

                if (index === currentIndex && !bgContainer.querySelector('.bg-slide.active')) {
                    img.classList.add('active');
                }
            };

            img.src = imgUrl;
            img.alt = "";
            bgContainer.appendChild(img);
        });

        const slides = bgContainer.childNodes;

        if (slides.length > 1) {
            setInterval(() => {
                let attempts = 0;
                let nextIndex = (currentIndex + 1) % slides.length;

                while (!slides[nextIndex].classList.contains('loaded') && attempts < slides.length) {
                    nextIndex = (nextIndex + 1) % slides.length;
                    attempts++;
                }

                if (attempts < slides.length && nextIndex !== currentIndex) {
                    if (slides[currentIndex]) slides[currentIndex].classList.remove('active');
                    currentIndex = nextIndex;
                    slides[currentIndex].classList.add('active');
                }
            }, 7000);
        }
    };

    const initAnimations = () => {

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo('.hero-avatar',
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 1.5, ease: "power2.out" },
            0.1
        );

        tl.fromTo('.hero-avatar .flip-inner',
            { scale: 0.5, rotationY: -360 },
            {
                scale: 1,
                rotationY: 0,
                duration: 1.8,
                ease: "back.out(1.2)",
                onStart: () => gsap.set('.hero-avatar .flip-inner', { transition: 'none' }),
                onComplete: () => gsap.set('.hero-avatar .flip-inner', { clearProps: 'transition' })
            },
            0.1
        );

        tl.fromTo('.name-char',
            { autoAlpha: 0, y: 80, rotationX: -90 },
            { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.2, stagger: 0.05, ease: "back.out(1.8)" },
            "-=1.0"
        );

        tl.fromTo('.hero-desc',
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.8 },
            "-=0.8"
        );

        tl.fromTo('.persistent-hero .tag',
            { autoAlpha: 0, scale: 0.8, y: 20 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" },
            "-=0.6"
        );

        tl.fromTo('.social-btn',
            { autoAlpha: 0, y: 30, rotation: -20 },
            { autoAlpha: 1, y: 0, rotation: 0, duration: 0.6, stagger: 0.05, ease: "back.out(2)" },
            "-=0.5"
        );

        tl.fromTo('.nav-dock',
            { y: 120, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 1.2, ease: "power4.out" },
            "-=0.7"
        );

        tl.fromTo('.scroll-hint',
            { autoAlpha: 0, y: -20 },
            { autoAlpha: 0.6, y: 0, duration: 1 },
            "-=0.5"
        );

        const revealElements = gsap.utils.toArray('.showcase-title-row, .gallery-tab-btn, .project-card, .namecard-grid');

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

        gsap.utils.toArray(".game-panel").forEach((panel) => {

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
    initPongGame();
    initParticles();

    window.addEventListener('resize', () => {
        lenis.resize();
        ScrollTrigger.refresh();
    });

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
});
