/**
 * Gallery grid renderer.
 * Cards use gradient-overlay style (image fills card, text at bottom).
 * Thumbnails load first; full-res deferred to lightbox.
 */

export class Gallery {
    constructor(containerEl, emptyEl, loadingEl, countEl, onCardClick, onLike) {
        this.container = containerEl;
        this.emptyEl = emptyEl;
        this.loadingEl = loadingEl;
        this.countEl = countEl;
        this.onCardClick = onCardClick;
        this.onLike = onLike;
        this.observer = null;
        this.currentItems = [];
        this.nsfwMode = 'hide';
        this.likedIds = {};
        this.setupObserver();
    }

    setupObserver() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
                            img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
                            delete img.dataset.src;
                        }
                        this.observer.unobserve(img);
                    }
                });
            },
            { rootMargin: '300px' }
        );
    }

    setNsfwMode(mode) { this.nsfwMode = mode; }
    setLikedIds(liked) { this.likedIds = liked || {}; }

    render(artworks) {
        this.currentItems = artworks;
        this.container.innerHTML = '';

        if (artworks.length === 0) {
            this.emptyEl.classList.remove('hidden');
            this.countEl.textContent = '';
            return;
        }

        this.emptyEl.classList.add('hidden');
        this.countEl.textContent = `${artworks.length} artwork${artworks.length !== 1 ? 's' : ''}`;

        const fragment = document.createDocumentFragment();
        artworks.forEach((art, index) => {
            fragment.appendChild(this.createCard(art, index));
        });
        this.container.appendChild(fragment);
    }

    createCard(art, index) {
        const card = document.createElement('div');
        card.className = 'art-card';
        card.dataset.index = index;

        if (art.is_nsfw && this.nsfwMode === 'blur') {
            card.classList.add('nsfw-blur');
        }

        const thumbUrl = art.thumbnail_url || art.image_url;
        const isBlurred = art.is_nsfw && this.nsfwMode === 'blur';
        const isLiked = !!this.likedIds[art.id];
        const likeCount = art.likes_count || 0;
        const variantCount = 1 + (art.extra_images?.length || 0);

        card.innerHTML = `
            <div class="art-card-image-wrap">
                <img data-src="${thumbUrl}" alt="${this.escape(art.title)}" width="400" height="auto" loading="lazy">
                <div class="card-gradient"></div>
                ${art.is_nsfw ? '<span class="nsfw-badge">NSFW</span>' : ''}
                <span class="type-badge type-${art.type || 'art'}">${art.type === 'fursuit' ? '<i class="fas fa-paw"></i> Suit' : '<i class="fas fa-palette"></i> Art'}</span>
                ${variantCount > 1 ? `<span class="variant-badge" aria-label="${variantCount} variants"><i class="fas fa-images"></i> &times;${variantCount}</span>` : ''}
                <div class="nsfw-reveal-hint"><i class="fas fa-eye"></i> Click to reveal</div>

                <div class="card-overlay-top">
                    <button class="heart-btn ${isLiked ? 'liked' : ''}" data-art-id="${art.id}" title="Like">
                        <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i>
                        <span class="heart-count">${likeCount > 0 ? likeCount : ''}</span>
                    </button>
                </div>

                <div class="card-overlay-bottom">
                    <div class="card-info">
                        <div class="card-fursona">${this.escape(art.fursona)}</div>
                        <div class="card-title">${this.escape(art.title)}</div>
                        <div class="card-artist">by ${this.escape(art.artist_name)}</div>
                    </div>
                    <div class="card-meta">
                        <span class="card-date">${this.formatDate(art.date)}</span>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('a') || e.target.closest('.heart-btn')) return;
            if (isBlurred) {
                card.classList.remove('nsfw-blur');
                return;
            }
            this.onCardClick(index, this.currentItems);
        });

        const heartBtn = card.querySelector('.heart-btn');
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onLike(art.id);
        });

        const img = card.querySelector('img');
        if (img) this.observer.observe(img);

        return card;
    }

    updateLike(artId, liked, newCount) {
        this.likedIds[artId] = liked;
        const card = this.container.querySelector(`[data-art-id="${artId}"]`);
        if (!card) return;

        const icon = card.querySelector('.heart-btn i');
        const countEl = card.querySelector('.heart-count');
        const btn = card.querySelector('.heart-btn');

        icon.className = `fa${liked ? 's' : 'r'} fa-heart`;
        btn.classList.toggle('liked', liked);
        countEl.textContent = newCount > 0 ? newCount : '';
    }

    showLoading() {
        this.loadingEl.classList.remove('hidden');
        this.container.innerHTML = '';
    }

    hideLoading() {
        this.loadingEl.classList.add('hidden');
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const [year, month] = dateStr.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[parseInt(month) - 1] || month} ${year}`;
        } catch {
            return dateStr;
        }
    }

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
