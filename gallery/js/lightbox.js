/**
 * Fullscreen lightbox with zoom, pan, dimensions display, and full-quality download.
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

        this.items = [];
        this.currentIndex = -1;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

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
        this.image.src = art.image_url;
        this.image.alt = art.title;
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

        // Dimensions
        if (art.image_width && art.image_height) {
            this.dimensionsEl.textContent = `${art.image_width} × ${art.image_height}`;
            this.dimensionsEl.style.display = '';
        } else {
            this.dimensionsEl.style.display = 'none';
        }

        // Full quality button
        this.fullQualityBtn.href = art.image_url;
        this.fullQualityBtn.target = '_blank';
        this.fullQualityBtn.rel = 'noopener';

        this.tagsEl.innerHTML = '';
        if (art.tags && art.tags.length) {
            art.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'lb-tag';
                span.textContent = tag;
                this.tagsEl.appendChild(span);
            });
        }

        document.getElementById('lb-prev').style.display = index > 0 ? '' : 'none';
        document.getElementById('lb-next').style.display = index < this.items.length - 1 ? '' : 'none';
    }

    openFullQuality() {
        const art = this.items[this.currentIndex];
        if (art && art.image_url) {
            window.open(art.image_url, '_blank', 'noopener');
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
