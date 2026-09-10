/**
 * Filtering, sorting, and search logic.
 * Emits filtered artwork lists for the gallery renderer.
 */

export class FilterEngine {
    constructor() {
        this.artworks = [];
        this.activeFursona = 'all';
        this.activeType = 'all';
        this.searchQuery = '';
        this.sortBy = 'date-desc';
        this.nsfwMode = 'hide';
        this.listeners = [];
    }

    setArtworks(artworks) {
        this.artworks = artworks;
        this.notify();
    }

    getFursonas() {
        const set = new Set();
        this.artworks.forEach(a => set.add(a.fursona));
        return Array.from(set).sort();
    }

    setFursona(fursona) {
        this.activeFursona = fursona;
        this.notify();
    }

    setType(type) {
        this.activeType = type;
        this.notify();
    }

    setSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.notify();
    }

    setSort(sortBy) {
        this.sortBy = sortBy;
        this.notify();
    }

    setNsfwMode(mode) {
        this.nsfwMode = mode;
        this.notify();
    }

    onChange(fn) {
        this.listeners.push(fn);
    }

    notify() {
        const result = this.apply();
        this.listeners.forEach(fn => fn(result));
    }

    apply() {
        let items = [...this.artworks];

        // NSFW filter
        if (this.nsfwMode === 'hide') {
            items = items.filter(a => !a.is_nsfw);
        }

        // Type filter
        if (this.activeType !== 'all') {
            items = items.filter(a => (a.type || 'art') === this.activeType);
        }

        // Fursona filter
        if (this.activeFursona !== 'all') {
            items = items.filter(a => a.fursona === this.activeFursona);
        }

        // Search
        if (this.searchQuery) {
            items = items.filter(a => {
                const haystack = [
                    a.title,
                    a.artist_name,
                    a.fursona,
                    ...(a.tags || [])
                ].join(' ').toLowerCase();
                return haystack.includes(this.searchQuery);
            });
        }

        // Sort
        switch (this.sortBy) {
            case 'date-desc':
                items.sort((a, b) => (b.date || b.created_at || '').localeCompare(a.date || a.created_at || ''));
                break;
            case 'date-asc':
                items.sort((a, b) => (a.date || a.created_at || '').localeCompare(b.date || b.created_at || ''));
                break;
            case 'artist':
                items.sort((a, b) => (a.artist_name || '').localeCompare(b.artist_name || ''));
                break;
        }

        return items;
    }
}
