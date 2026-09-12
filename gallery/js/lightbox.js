/**
 * Fullscreen lightbox with zoom, pan, dimensions display, full-quality download,
 * and variant thumbnail strip for multi-image artworks.
 */

export class Lightbox {
    constructor() {
        this.el = document.getElementById('lightbox');
        this.imageWrap = document.getElementById('lb-image-wrap');
        this.image = document.getElementById('lb-image');
        this.titleEl = document.getElementById('lb-title');
        this.fursonaEl = document.getElementById('lb-fursona');
        this.dateEl = document.getElementById('lb-date');
        this.artistLink = document.getElementById('lb-artist-link');
        this.tagsEl = document.getElementById('lb-tags');
        this.dimensionsEl = document.getElementById('lb-dimensions');
        this.fullQualityBtn = document.getElementById('lb-full-quality');
        this.variantStrip = document.getElementById('lb-variant-strip');
        this.manageVariantsBtn = document.getElementById('lb-manage-variants');

        this.items = [];
        this.currentIndex = -1;
        this.variantImages = [];
        this.currentVariant = 0;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.isAdmin = false;
        this.onManageVariants = null;
        this.onTagEdit = null;
        this.tagMap = new Map();

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('lightbox-close').addEventListener('click', () => this.close());
        document.getElementById('lightbox-x').addEventListener('click', () => this.close());
        document.getElementById('lb-prev').addEventListener('click', () => this.prev());
        document.getElementById('lb-next').addEventListener('click', () => this.next());
        document.getElementById('lb-zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('lb-zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('lb-zoom-reset').addEventListener('click', () => this.resetZoom());

        this.fullQualityBtn.addEventListener('click', () => this.openFullQuality());

        this.manageVariantsBtn.addEventListener('click', () => {
            if (this.onManageVariants) {
                const art = this.items[this.currentIndex];
                if (art) this.onManageVariants(art);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.el.classList.contains('hidden')) return;
            switch (e.key) {
                case 'Escape': this.close(); break;
                case 'ArrowLeft': this.prev(); break;
                case 'ArrowRight': this.next(); break;
                case '+': case '=': this.zoomIn(); break;
                case '-': this.zoomOut(); break;
            }
        });

        this.imageWrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) this.zoomIn();
            else this.zoomOut();
        }, { passive: false });

        this.imageWrap.addEventListener('mousedown', (e) => {
            if (this.zoom <= 1) return;
            this.isDragging = true;
            this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.imageWrap.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.panX = e.clientX - this.dragStart.x;
            this.panY = e.clientY - this.dragStart.y;
            this.applyTransform();
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.imageWrap.classList.remove('dragging');
        });

        this.imageWrap.addEventListener('dblclick', () => {
            if (this.zoom > 1) this.resetZoom();
            else this.zoomTo(2.5);
        });
    }

    setAdminMode(isAdmin, onManageVariants, onTagEdit) {
        this.isAdmin = isAdmin;
        this.onManageVariants = onManageVariants;
        this.onTagEdit = onTagEdit;
        this.manageVariantsBtn.classList.toggle('hidden', !isAdmin);
    }

    setTagMap(tagMap) {
        this.tagMap = tagMap || new Map();
    }

    open(index, items) {
        this.items = items;
        this.currentIndex = index;
        this.show(index);
        this.el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.el.classList.add('hidden');
        document.body.style.overflow = '';
        this.resetZoom();
    }

    show(index) {
        const art = this.items[index];
        if (!art) return;

        this.resetZoom();

        this.variantImages = [
            {
                url: art.image_url,
                thumbnail_url: art.thumbnail_url,
                width: art.image_width,
                height: art.image_height
            },
            ...(art.extra_images || [])
        ];
        this.currentVariant = 0;

        this.renderVariantStrip();
        this.applyVariant();

        this.titleEl.textContent = art.title;
        this.fursonaEl.textContent = art.fursona;
        this.dateEl.textContent = this.formatDate(art.date);

        this.artistLink.textContent = art.artist_name;
        if (art.artist_url) {
            this.artistLink.href = art.artist_url;
            this.artistLink.style.pointerEvents = '';
        } else {
            this.artistLink.href = '#';
            this.artistLink.style.pointerEvents = 'none';
        }

        this.tagsEl.innerHTML = '';
        if (art.tags && art.tags.length) {
            art.tags.forEach(tagName => {
                const tagInfo = this.tagMap.get(tagName);
                const span = document.createElement('span');
                span.className = 'lb-tag';
                span.textContent = tagName;
                if (tagInfo?.description) {
                    span.title = tagInfo.description;
                    span.classList.add('lb-tag-has-info');
                }
                if (this.isAdmin) {
                    span.classList.add('lb-tag-admin');
                    span.addEventListener('click', () => {
                        if (this.onTagEdit) this.onTagEdit(tagName, tagInfo);
                    });
                }
                this.tagsEl.appendChild(span);
            });
        }

        document.getElementById('lb-prev').style.display = index > 0 ? '' : 'none';
        document.getElementById('lb-next').style.display = index < this.items.length - 1 ? '' : 'none';

        this.manageVariantsBtn.classList.toggle('hidden', !this.isAdmin);
    }

    renderVariantStrip() {
        this.variantStrip.innerHTML = '';

        if (this.variantImages.length <= 1) {
            this.variantStrip.classList.add('hidden');
            return;
        }

        this.variantStrip.classList.remove('hidden');

        this.variantImages.forEach((v, i) => {
            const thumb = document.createElement('button');
            thumb.className = `lb-variant-thumb${i === this.currentVariant ? ' active' : ''}`;
            thumb.dataset.variantIndex = i;

            const img = document.createElement('img');
            img.src = v.thumbnail_url || v.url;
            img.alt = `Variant ${i + 1}`;
            img.loading = 'lazy';

            if (i === 0) {
                const label = document.createElement('span');
                label.className = 'lb-variant-label';
                label.textContent = 'Cover';
                thumb.appendChild(label);
            }

            thumb.appendChild(img);

            thumb.addEventListener('click', () => this.switchVariant(i));
            this.variantStrip.appendChild(thumb);
        });
    }

    switchVariant(index) {
        if (index < 0 || index >= this.variantImages.length) return;
        this.currentVariant = index;
        this.resetZoom();
        this.applyVariant();
    }

    applyVariant() {
        const v = this.variantImages[this.currentVariant];
        if (!v) return;

        this.image.src = v.url;
        this.image.alt = this.items[this.currentIndex]?.title || '';

        if (v.width && v.height) {
            this.dimensionsEl.textContent = `${v.width} × ${v.height}`;
            this.dimensionsEl.style.display = '';
        } else {
            this.dimensionsEl.style.display = 'none';
        }

        this.fullQualityBtn.href = v.url;
        this.fullQualityBtn.target = '_blank';
        this.fullQualityBtn.rel = 'noopener';

        this.variantStrip.querySelectorAll('.lb-variant-thumb').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === this.currentVariant);
        });
    }

    openFullQuality() {
        const v = this.variantImages[this.currentVariant];
        if (v && v.url) {
            window.open(v.url, '_blank', 'noopener');
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.show(this.currentIndex);
        }
    }

    next() {
        if (this.currentIndex < this.items.length - 1) {
            this.currentIndex++;
            this.show(this.currentIndex);
        }
    }

    zoomIn() { this.zoomTo(Math.min(this.zoom + 0.5, 5)); }
    zoomOut() { this.zoomTo(Math.max(this.zoom - 0.5, 1)); }

    zoomTo(level) {
        this.zoom = level;
        if (this.zoom <= 1) {
            this.panX = 0;
            this.panY = 0;
        }
        this.applyTransform();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    applyTransform() {
        this.image.style.transform = `scale(${this.zoom}) translate(${this.panX / this.zoom}px, ${this.panY / this.zoom}px)`;
        this.imageWrap.style.cursor = this.zoom > 1 ? 'grab' : 'default';
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const [year, month] = dateStr.split('-');
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            return `${months[parseInt(month) - 1] || month} ${year}`;
        } catch {
            return dateStr;
        }
    }
}
