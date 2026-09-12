/**
 * Admin upload module — email/password authentication and artwork form.
 * Handles Cloudinary unsigned upload, Supabase insert, multi-file batch upload,
 * and variant management for existing artworks.
 */

import { checkAuthSession, signInWithEmail, signOutAuth } from './supabase.js';
import { insertArtwork, updateArtwork, upsertTag } from './supabase.js';

/**
 * Cloudinary configuration.
 * SETUP:
 * 1. Go to https://cloudinary.com → Settings → Upload
 * 2. Create an unsigned upload preset
 * 3. Replace CLOUD_NAME and UPLOAD_PRESET below
 */
const CLOUD_NAME = 'ffppnh9h';
const UPLOAD_PRESET = 'jghd3evl';

const MAX_DIM = 2000;
const QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_VARIANTS = 8;

export class AdminPanel {
    constructor(onArtworkAdded, onArtworkUpdated, onAuthChange, onTagChanged) {
        this.onArtworkAdded = onArtworkAdded;
        this.onArtworkUpdated = onArtworkUpdated;
        this.onAuthChange = onAuthChange;
        this.onTagChanged = onTagChanged;
        this.modal = document.getElementById('admin-modal');
        this.pinScreen = document.getElementById('admin-pin-screen');
        this.formScreen = document.getElementById('admin-form-screen');
        this.pinInput = document.getElementById('admin-pin-input');
        this.pinError = document.getElementById('pin-error');
        this.form = document.getElementById('upload-form');
        this.fileInput = document.getElementById('file-input');
        this.fileDrop = document.getElementById('file-drop');
        this.filePreview = document.getElementById('file-preview');
        this.previewStrip = document.getElementById('variant-preview-strip');
        this.selectedFiles = [];
        this.selectedDimensions = [];
        this.isAuthed = false;
        this.tags = [];
        this.editingTag = null;

        this.tagSection = document.getElementById('admin-tag-section');
        this.tagList = document.getElementById('admin-tag-list');
        this.tagEditModal = document.getElementById('tag-edit-modal');

        this.variantModal = document.getElementById('variant-modal');
        this.variantList = document.getElementById('variant-manager-list');
        this.variantDrop = document.getElementById('variant-manager-drop');
        this.variantFileInput = document.getElementById('variant-file-input');
        this.variantArtwork = null;
        this.variantEntries = [];

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('admin-open').addEventListener('click', () => this.open());
        document.getElementById('admin-close').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.getElementById('admin-pin-submit').addEventListener('click', () => this.handleLogin());
        document.getElementById('admin-signout').addEventListener('click', () => this.handleSignout());

        const emailInput = document.getElementById('admin-email-input');
        const pinEnterHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        };
        emailInput.addEventListener('keydown', pinEnterHandler);
        this.pinInput.addEventListener('keydown', pinEnterHandler);

        this.fileDrop.addEventListener('click', () => this.fileInput.click());
        this.fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDrop.classList.add('dragover');
        });
        this.fileDrop.addEventListener('dragleave', () => this.fileDrop.classList.remove('dragover'));
        this.fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleFiles(Array.from(e.dataTransfer.files));
        });
        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files.length) this.handleFiles(Array.from(this.fileInput.files));
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        document.getElementById('variant-close').addEventListener('click', () => this.closeVariantManager());
        this.variantModal.addEventListener('click', (e) => {
            if (e.target === this.variantModal) this.closeVariantManager();
        });

        this.variantDrop.addEventListener('click', () => this.variantFileInput.click());
        this.variantDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.variantDrop.classList.add('dragover');
        });
        this.variantDrop.addEventListener('dragleave', () => this.variantDrop.classList.remove('dragover'));
        this.variantDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            this.variantDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleVariantFiles(Array.from(e.dataTransfer.files));
        });
        this.variantFileInput.addEventListener('change', () => {
            if (this.variantFileInput.files.length) this.handleVariantFiles(Array.from(this.variantFileInput.files));
        });

        document.getElementById('variant-save').addEventListener('click', () => this.saveVariants());

        document.getElementById('admin-tags-toggle').addEventListener('click', () => this.toggleTagSection());
        document.getElementById('admin-tag-add-btn').addEventListener('click', () => this.handleTagAdd());
    }

    async open() {
        this.modal.classList.remove('hidden');
        this.pinError.classList.add('hidden');

        if (this.isAuthed) {
            this.showForm();
        } else {
            const session = await checkAuthSession();
            if (session) {
                this.showForm();
            } else {
                this.showPinScreen();
            }
        }

        setTimeout(() => {
            const emailInput = document.getElementById('admin-email-input');
            (this.isAuthed ? this.form.querySelector('input') : emailInput)?.focus();
        }, 100);
    }

    close() {
        this.modal.classList.add('hidden');
    }

    showPinScreen() {
        this.pinScreen.classList.remove('hidden');
        this.formScreen.classList.add('hidden');
        this.pinInput.value = '';
        document.getElementById('admin-email-input').value = '';
    }

    showForm() {
        this.pinScreen.classList.add('hidden');
        this.formScreen.classList.remove('hidden');
        this.tagSection.classList.add('hidden');
        this.isAuthed = true;
        if (this.onAuthChange) this.onAuthChange(true);
        this.resetForm();
    }

    async handleLogin() {
        const email = document.getElementById('admin-email-input').value.trim();
        const password = this.pinInput.value;
        if (!email || !password) return;

        const submitBtn = document.getElementById('admin-pin-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            await signInWithEmail(email, password);
            this.pinError.classList.add('hidden');
            this.showForm();
        } catch (err) {
            this.pinError.textContent = err.message || 'Invalid credentials. Try again.';
            this.pinError.classList.remove('hidden');
            this.pinInput.value = '';
            this.pinInput.focus();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    async handleSignout() {
        await signOutAuth();
        this.isAuthed = false;
        if (this.onAuthChange) this.onAuthChange(false);
        this.showPinScreen();
        showToast('Signed out.', 'success');
    }

    // --- Multi-file handling ---

    async handleFiles(files) {
        const remaining = MAX_VARIANTS - this.selectedFiles.length;
        if (remaining <= 0) {
            showToast(`Maximum ${MAX_VARIANTS} variants allowed.`, 'error');
            return;
        }

        const toProcess = files.slice(0, remaining);
        if (files.length > remaining) {
            showToast(`${files.length - remaining} file(s) skipped — max ${MAX_VARIANTS} variants.`, 'error');
        }

        for (const file of toProcess) {
            const isImage = file.type.startsWith('image/') ||
                /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name);
            if (!isImage) {
                showToast(`"${file.name}" is not an image — skipped.`, 'error');
                continue;
            }

            try {
                const processed = await this.compressImage(file);
                this.selectedFiles.push(processed);
                this.selectedDimensions.push(null);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        this.renderPreviewStrip();
    }

    renderPreviewStrip() {
        this.previewStrip.innerHTML = '';
        this.filePreview.classList.add('hidden');
        this.filePreview.src = '';

        if (this.selectedFiles.length === 0) {
            this.fileDrop.querySelector('span').textContent = 'Drop images or click to select';
            return;
        }

        this.fileDrop.querySelector('span').textContent =
            `${this.selectedFiles.length} image${this.selectedFiles.length !== 1 ? 's' : ''} selected — drop more to add`;

        this.selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'variant-preview-item';
            item.draggable = true;
            item.dataset.index = index;

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = `Preview ${index + 1}`;

            img.onload = () => {
                this.selectedDimensions[index] = {
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
            };

            const label = document.createElement('span');
            label.className = 'variant-preview-label';
            label.textContent = index === 0 ? 'Cover' : `${index + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'variant-preview-remove';
            removeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedFiles.splice(index, 1);
                this.selectedDimensions.splice(index, 1);
                this.renderPreviewStrip();
            });

            const moveBtns = document.createElement('div');
            moveBtns.className = 'variant-preview-moves';

            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.className = 'variant-preview-move';
                upBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.swapFiles(index, index - 1);
                });
                moveBtns.appendChild(upBtn);
            }

            if (index < this.selectedFiles.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.className = 'variant-preview-move';
                downBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.swapFiles(index, index + 1);
                });
                moveBtns.appendChild(downBtn);
            }

            item.appendChild(img);
            item.appendChild(label);
            item.appendChild(removeBtn);
            if (moveBtns.children.length > 0) item.appendChild(moveBtns);

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(index));
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
            item.addEventListener('dragover', (e) => e.preventDefault());
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                if (fromIndex !== index) {
                    const [moved] = this.selectedFiles.splice(fromIndex, 1);
                    const [movedDim] = this.selectedDimensions.splice(fromIndex, 1);
                    this.selectedFiles.splice(index, 0, moved);
                    this.selectedDimensions.splice(index, 0, movedDim);
                    this.renderPreviewStrip();
                }
            });

            this.previewStrip.appendChild(item);
        });
    }

    swapFiles(a, b) {
        [this.selectedFiles[a], this.selectedFiles[b]] = [this.selectedFiles[b], this.selectedFiles[a]];
        [this.selectedDimensions[a], this.selectedDimensions[b]] = [this.selectedDimensions[b], this.selectedDimensions[a]];
        this.renderPreviewStrip();
    }

    async compressImage(file) {
        if (file.type === 'image/gif') return file;
        if (file.size < 300 * 1024 && file.size <= MAX_UPLOAD_BYTES) return file;

        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            if (file.size > MAX_UPLOAD_BYTES) {
                throw new Error(`"${file.name}" is too large and this format can't be auto-compressed. Please export it as JPG or PNG first.`);
            }
            return file;
        }

        const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
        const mime = hasAlpha ? 'image/webp' : 'image/jpeg';

        let blob = null;
        try {
            for (const quality of [QUALITY, 0.6, 0.45]) {
                blob = await this.encodeToBlob(bitmap, mime, quality);
                if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
            }
        } finally {
            bitmap.close?.();
        }

        if (!blob) return file;
        if (blob.size > MAX_UPLOAD_BYTES) {
            throw new Error(`"${file.name}" couldn't be compressed below the 10 MB upload limit.`);
        }
        if (blob.size >= file.size) return file;

        const ext = mime === 'image/webp' ? '.webp' : '.jpg';
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type: mime });
    }

    async encodeToBlob(bitmap, mime, quality) {
        const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
        return new Promise(res => canvas.toBlob(res, mime, quality));
    }

    resetForm() {
        this.form.reset();
        this.selectedFiles = [];
        this.selectedDimensions = [];
        this.previewStrip.innerHTML = '';
        this.filePreview.classList.add('hidden');
        this.filePreview.src = '';
        this.fileDrop.querySelector('span').textContent = 'Drop images or click to select';
        document.getElementById('upload-progress').classList.add('hidden');
        document.getElementById('upload-submit').disabled = false;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('f-date').value = month;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.selectedFiles.length === 0) {
            showToast('Please select at least one image.', 'error');
            return;
        }

        const submitBtn = document.getElementById('upload-submit');
        const progressEl = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        submitBtn.disabled = true;
        progressEl.classList.remove('hidden');
        progressFill.style.width = '0%';

        const total = this.selectedFiles.length;
        const results = [];

        try {
            for (let i = 0; i < total; i++) {
                progressText.textContent = total > 1
                    ? `Uploading ${i + 1}/${total}...`
                    : 'Uploading image...';
                progressFill.style.width = `${((i) / total) * 60}%`;

                const imageData = await this.uploadToCloudinary(this.selectedFiles[i]);
                const dim = this.selectedDimensions[i];
                results.push({
                    url: imageData.url,
                    thumbnailUrl: imageData.thumbnailUrl,
                    width: dim?.width || null,
                    height: dim?.height || null,
                });
            }

            progressText.textContent = 'Saving to database...';
            progressFill.style.width = '80%';

            const tagsRaw = document.getElementById('f-tags').value;
            const tags = tagsRaw
                ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const cover = results[0];
            const extras = results.slice(1).map(r => ({
                url: r.url,
                thumbnail_url: r.thumbnailUrl,
                width: r.width,
                height: r.height,
            }));

            const artwork = {
                fursona: document.getElementById('f-fursona').value.trim(),
                title: document.getElementById('f-title').value.trim(),
                artist_name: document.getElementById('f-artist').value.trim(),
                artist_url: document.getElementById('f-artist-url').value.trim() || null,
                date: document.getElementById('f-date').value || null,
                is_nsfw: document.getElementById('f-nsfw').checked,
                type: document.getElementById('f-type').value,
                tags: tags,
                image_url: cover.url,
                thumbnail_url: cover.thumbnailUrl,
                image_width: cover.width,
                image_height: cover.height,
                extra_images: extras,
            };

            const saved = await insertArtwork(artwork);

            progressFill.style.width = '100%';
            progressText.textContent = 'Done!';

            showToast('Artwork added successfully!', 'success');

            if (this.onArtworkAdded) this.onArtworkAdded(saved);

            setTimeout(() => {
                this.close();
                this.resetForm();
            }, 800);

        } catch (err) {
            console.error('[Admin] Upload failed:', err);
            showToast(`Upload failed: ${err.message}`, 'error');
            progressEl.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    async uploadToCloudinary(file) {
        if (CLOUD_NAME === 'YOUR_CLOUD_NAME') {
            const localUrl = URL.createObjectURL(file);
            return {
                url: localUrl,
                thumbnailUrl: localUrl,
                publicId: 'demo',
            };
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'gallery');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'Cloudinary upload failed');
        }

        const data = await response.json();
        const publicId = data.public_id;

        return {
            url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`,
            thumbnailUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_scale,w_400,q_75/${publicId}`,
            publicId,
        };
    }

    // --- Tag management ---

    setTags(tags) {
        this.tags = tags || [];
        if (!this.tagSection.classList.contains('hidden')) this.renderTagList();
    }

    toggleTagSection() {
        const isHidden = this.tagSection.classList.contains('hidden');
        this.tagSection.classList.toggle('hidden');
        if (isHidden) {
            document.getElementById('admin-tags-toggle').innerHTML =
                '<i class="fas fa-arrow-left"></i> Back to Upload';
            this.renderTagList();
        } else {
            document.getElementById('admin-tags-toggle').innerHTML =
                '<i class="fas fa-tags"></i> Manage Tags';
        }
    }

    renderTagList() {
        this.tagList.innerHTML = '';
        if (this.tags.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'admin-tag-empty';
            empty.textContent = 'No tags yet. Add one above.';
            this.tagList.appendChild(empty);
            return;
        }
        this.tags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'admin-tag-item';
            const name = document.createElement('span');
            name.className = 'admin-tag-name';
            name.textContent = tag.name;
            const desc = document.createElement('span');
            desc.className = 'admin-tag-desc';
            desc.textContent = tag.description || 'No description';
            const editBtn = document.createElement('button');
            editBtn.className = 'admin-tag-edit-btn';
            editBtn.innerHTML = '<i class="fas fa-pen"></i>';
            editBtn.title = 'Edit tag';
            editBtn.addEventListener('click', () => this.openTagEdit(tag));
            item.appendChild(name);
            item.appendChild(desc);
            item.appendChild(editBtn);
            this.tagList.appendChild(item);
        });
    }

    openTagEdit(tag) {
        if (this.openTagEditModal) {
            this.openTagEditModal(tag, () => this.onTagChanged?.());
        }
    }

    onExternalTagEdit() {
        if (!this.tagSection.classList.contains('hidden')) this.renderTagList();
    }

    async handleTagAdd() {
        const name = prompt('New tag name:');
        if (!name || !name.trim()) return;
        const desc = prompt('Description (optional):') || '';
        try {
            await upsertTag(name.trim(), desc.trim());
            showToast(`Tag "${name.trim()}" added!`, 'success');
            if (this.onTagChanged) this.onTagChanged();
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    // --- Variant manager for existing artworks ---

    openVariantManager(artwork) {
        this.variantArtwork = artwork;
        this.variantEntries = [];

        this.variantEntries.push({
            url: artwork.image_url,
            thumbnail_url: artwork.thumbnail_url || artwork.image_url,
            width: artwork.image_width,
            height: artwork.image_height,
            isNew: false,
            file: null,
        });

        (artwork.extra_images || []).forEach(v => {
            this.variantEntries.push({
                url: v.url,
                thumbnail_url: v.thumbnail_url || v.url,
                width: v.width,
                height: v.height,
                isNew: false,
                file: null,
            });
        });

        document.getElementById('variant-modal-subtitle').textContent =
            `"${artwork.title}" — ${this.variantEntries.length} variant${this.variantEntries.length !== 1 ? 's' : ''}`;

        this.renderVariantManagerList();
        this.variantModal.classList.remove('hidden');

        document.getElementById('variant-progress').classList.add('hidden');
    }

    closeVariantManager() {
        this.variantModal.classList.add('hidden');
        this.variantArtwork = null;
        this.variantEntries = [];
        this.variantFileInput.value = '';
    }

    renderVariantManagerList() {
        this.variantList.innerHTML = '';

        this.variantEntries.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'variant-manager-item';
            item.draggable = true;
            item.dataset.index = index;

            const img = document.createElement('img');
            img.src = entry.thumbnail_url;
            img.alt = `Variant ${index + 1}`;

            const label = document.createElement('span');
            label.className = 'variant-manager-label';
            label.textContent = index === 0 ? 'Cover' : `${index + 1}`;

            const controls = document.createElement('div');
            controls.className = 'variant-manager-controls';

            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.className = 'variant-manager-move';
                upBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.swapVariants(index, index - 1);
                });
                controls.appendChild(upBtn);
            }

            if (index < this.variantEntries.length - 1) {
                const downBtn = document.createElement('button');
                downBtn.className = 'variant-manager-move';
                downBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.swapVariants(index, index + 1);
                });
                controls.appendChild(downBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'variant-manager-remove';
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.variantEntries.splice(index, 1);
                this.renderVariantManagerList();
                document.getElementById('variant-modal-subtitle').textContent =
                    `"${this.variantArtwork.title}" — ${this.variantEntries.length} variant${this.variantEntries.length !== 1 ? 's' : ''}`;
            });
            controls.appendChild(removeBtn);

            item.appendChild(img);
            item.appendChild(label);
            item.appendChild(controls);

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(index));
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
            item.addEventListener('dragover', (e) => e.preventDefault());
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                if (fromIndex !== index) {
                    const [moved] = this.variantEntries.splice(fromIndex, 1);
                    this.variantEntries.splice(index, 0, moved);
                    this.renderVariantManagerList();
                }
            });

            this.variantList.appendChild(item);
        });
    }

    swapVariants(a, b) {
        [this.variantEntries[a], this.variantEntries[b]] = [this.variantEntries[b], this.variantEntries[a]];
        this.renderVariantManagerList();
    }

    async handleVariantFiles(files) {
        const remaining = MAX_VARIANTS - this.variantEntries.length;
        if (remaining <= 0) {
            showToast(`Maximum ${MAX_VARIANTS} variants allowed.`, 'error');
            return;
        }

        const toProcess = files.slice(0, remaining);
        if (files.length > remaining) {
            showToast(`${files.length - remaining} file(s) skipped — max ${MAX_VARIANTS} variants.`, 'error');
        }

        for (const file of toProcess) {
            const isImage = file.type.startsWith('image/') ||
                /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name);
            if (!isImage) {
                showToast(`"${file.name}" is not an image — skipped.`, 'error');
                continue;
            }

            try {
                const processed = await this.compressImage(file);
                this.variantEntries.push({
                    url: null,
                    thumbnail_url: URL.createObjectURL(processed),
                    width: null,
                    height: null,
                    isNew: true,
                    file: processed,
                });
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        this.renderVariantManagerList();
        document.getElementById('variant-modal-subtitle').textContent =
            `"${this.variantArtwork.title}" — ${this.variantEntries.length} variant${this.variantEntries.length !== 1 ? 's' : ''}`;
    }

    async saveVariants() {
        if (!this.variantArtwork) return;
        if (this.variantEntries.length === 0) {
            showToast('At least one image is required.', 'error');
            return;
        }

        const saveBtn = document.getElementById('variant-save');
        const progressEl = document.getElementById('variant-progress');
        const progressFill = document.getElementById('variant-progress-fill');
        const progressText = document.getElementById('variant-progress-text');

        saveBtn.disabled = true;
        progressEl.classList.remove('hidden');
        progressFill.style.width = '0%';

        try {
            const newEntries = this.variantEntries.filter(e => e.isNew && e.file);
            const total = newEntries.length;

            for (let i = 0; i < total; i++) {
                progressText.textContent = total > 1
                    ? `Uploading ${i + 1}/${total}...`
                    : 'Uploading new image...';
                progressFill.style.width = `${((i) / Math.max(total, 1)) * 60}%`;

                const entry = newEntries[i];
                const result = await this.uploadToCloudinary(entry.file);
                entry.url = result.url;
                entry.thumbnail_url = result.thumbnailUrl;
            }

            progressText.textContent = 'Saving...';
            progressFill.style.width = '80%';

            const cover = this.variantEntries[0];
            const extras = this.variantEntries.slice(1).map(e => ({
                url: e.url,
                thumbnail_url: e.thumbnail_url,
                width: e.width,
                height: e.height,
            }));

            const patch = {
                image_url: cover.url,
                thumbnail_url: cover.thumbnail_url,
                image_width: cover.width,
                image_height: cover.height,
                extra_images: extras,
            };

            const updated = await updateArtwork(this.variantArtwork.id, patch);

            progressFill.style.width = '100%';
            progressText.textContent = 'Done!';

            showToast('Variants updated successfully!', 'success');

            if (this.onArtworkUpdated) this.onArtworkUpdated(updated);

            setTimeout(() => {
                this.closeVariantManager();
                saveBtn.disabled = false;
            }, 600);

        } catch (err) {
            console.error('[Admin] Variant save failed:', err);
            showToast(`Save failed: ${err.message}`, 'error');
            progressEl.classList.add('hidden');
            saveBtn.disabled = false;
        }
    }
}

function showToast(message, type = '') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    });
}

export { showToast };
