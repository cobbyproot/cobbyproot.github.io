/**
 * Main entry point — wires up all gallery modules.
 */

import { fetchArtworks, fetchLikes, toggleLike } from './supabase.js';
import { getNsfwMode, setNsfwMode, isAgeVerified, setAgeVerified } from './storage.js';
import { FilterEngine } from './filters.js';
import { Gallery } from './gallery.js';
import { Lightbox } from './lightbox.js';
import { AdminPanel, showToast } from './admin.js';

// --- State ---
let allArtworks = [];
let filteredItems = [];
let nsfwMode = getNsfwMode();
let likedIds = {};

// --- DOM refs ---
const fursonaSelect = document.getElementById('fursona-select');
const typePills = document.getElementById('type-pills');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const nsfwToggle = document.getElementById('nsfw-toggle');
const nsfwDropdown = document.getElementById('nsfw-dropdown');

// --- Init modules ---
const filterEngine = new FilterEngine();

const lightbox = new Lightbox();

const gallery = new Gallery(
    document.getElementById('gallery-grid'),
    document.getElementById('gallery-empty'),
    document.getElementById('gallery-loading'),
    document.getElementById('artwork-count'),
    (index, items) => lightbox.open(index, items),
    (artId) => handleLike(artId)
);

const admin = new AdminPanel(
    (newArtwork) => {
        allArtworks.unshift(newArtwork);
        filterEngine.setArtworks(allArtworks);
        buildFursonaPills();
    },
    (updatedArtwork) => {
        const idx = allArtworks.findIndex(a => a.id === updatedArtwork.id);
        if (idx !== -1) allArtworks[idx] = updatedArtwork;
        filterEngine.setArtworks(allArtworks);
    },
    (isAuthed) => {
        lightbox.setAdminMode(isAuthed, (art) => admin.openVariantManager(art));
    }
);

// --- Filter engine listener ---
filterEngine.onChange((items) => {
    filteredItems = items;
    gallery.setNsfwMode(nsfwMode);
    gallery.setLikedIds(likedIds);
    gallery.render(items);
});

// --- Like handler ---
async function handleLike(artId) {
    const result = await toggleLike(artId);

    // Update local state
    const art = allArtworks.find(a => a.id === artId);
    if (art) {
        art.likes_count = (art.likes_count || 0) + (result.liked ? 1 : -1);
        if (art.likes_count < 0) art.likes_count = 0;
    }

    // Update UI without full re-render
    gallery.updateLike(artId, result.liked, art ? art.likes_count : 0);

    // Also update in filtered items
    const filteredArt = filteredItems.find(a => a.id === artId);
    if (filteredArt) {
        filteredArt.likes_count = art ? art.likes_count : 0;
    }
}

// --- Load data ---
async function init() {
    gallery.showLoading();
    allArtworks = await fetchArtworks();
    gallery.hideLoading();

    // Fetch liked state
    const artIds = allArtworks.map(a => a.id);
    likedIds = await fetchLikes(artIds);

    filterEngine.setNsfwMode(nsfwMode);
    filterEngine.setArtworks(allArtworks);

    buildFursonaPills();
    setupTypePills();
    updateNsfwUI();
}

// --- Fursona dropdown ---
function buildFursonaPills() {
    const fursonas = filterEngine.getFursonas();
    fursonaSelect.innerHTML = '<option value="all">All</option>';

    fursonas.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        fursonaSelect.appendChild(option);
    });
}

fursonaSelect.addEventListener('change', () => {
    filterEngine.setFursona(fursonaSelect.value);
});

// --- Type pills (static HTML, setup once) ---
function setupTypePills() {
    if (!typePills) return;

    typePills.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            typePills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterEngine.setType(pill.dataset.type);
        });
    });
}

// --- NSFW controls ---
nsfwToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    nsfwDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.nsfw-control')) {
        nsfwDropdown.classList.remove('open');
    }
});

document.querySelectorAll('.nsfw-option').forEach(option => {
    option.addEventListener('click', () => {
        const mode = option.dataset.mode;

        if (mode !== 'hide' && !isAgeVerified()) {
            showAgeGate(() => {
                applyNsfwMode(mode);
            });
            nsfwDropdown.classList.remove('open');
            return;
        }

        applyNsfwMode(mode);
        nsfwDropdown.classList.remove('open');
    });
});

function applyNsfwMode(mode) {
    nsfwMode = mode;
    setNsfwMode(mode);
    filterEngine.setNsfwMode(mode);
    updateNsfwUI();
    filterEngine.notify();
}

function updateNsfwUI() {
    const icons = { hide: 'fa-eye-slash', blur: 'fa-blur', show: 'fa-eye' };
    const labels = { hide: 'NSFW: Hidden', blur: 'NSFW: Blurred', show: 'NSFW: Shown' };

    nsfwToggle.dataset.mode = nsfwMode;
    nsfwToggle.querySelector('i').className = `fas ${icons[nsfwMode] || icons.hide}`;
    nsfwToggle.querySelector('.control-label').textContent = labels[nsfwMode] || labels.hide;

    document.querySelectorAll('.nsfw-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.mode === nsfwMode);
    });
}

// --- Age gate ---
function showAgeGate(onConfirm) {
    const gate = document.getElementById('age-gate');
    gate.classList.remove('hidden');

    document.getElementById('age-confirm').onclick = () => {
        setAgeVerified(true);
        gate.classList.add('hidden');
        onConfirm();
    };

    document.getElementById('age-deny').onclick = () => {
        gate.classList.add('hidden');
        applyNsfwMode('hide');
    };
}

// --- Search ---
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterEngine.setSearch(searchInput.value);
    }, 250);
});

// --- Sort ---
sortSelect.addEventListener('change', () => {
    filterEngine.setSort(sortSelect.value);
});

// --- "upload" keystroke to reveal admin button ---
(function() {
    const SECRET = 'upload';
    let typed = '';
    const adminBtn = document.getElementById('admin-open');
    if (!adminBtn) return;

    document.addEventListener('keydown', (e) => {
        typed += e.key.toLowerCase();
        if (typed.length > SECRET.length) typed = typed.slice(-SECRET.length);
        if (typed === SECRET) {
            typed = '';
            adminBtn.classList.remove('hidden');
        }
    });
})();

// --- Start ---
init();
