/**
 * Admin upload module — PIN authentication and artwork form.
 * Handles Cloudinary unsigned upload and Supabase insert.
 */

import { verifyPin, storePinHash, hasPinSet } from './storage.js';
import { insertArtwork } from './supabase.js';

/**
 * Cloudinary configuration.
 * SETUP:
 * 1. Go to https://cloudinary.com → Settings → Upload
 * 2. Create an unsigned upload preset
 * 3. Replace CLOUD_NAME and UPLOAD_PRESET below
 */
const CLOUD_NAME = 'ffppnh9h';
const UPLOAD_PRESET = 'jghd3evl';

// Auto-compression: cap the longest edge (px) and re-encode quality before upload.
const MAX_DIM = 2000;
const QUALITY = 0.82;
// Cloudinary's unsigned-upload limit is 10 MB; keep a hair under it.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export class AdminPanel {
    constructor(onArtworkAdded) {
        this.onArtworkAdded = onArtworkAdded;
        this.modal = document.getElementById('admin-modal');
        this.pinScreen = document.getElementById('admin-pin-screen');
        this.formScreen = document.getElementById('admin-form-screen');
        this.pinInput = document.getElementById('admin-pin-input');
        this.pinError = document.getElementById('pin-error');
        this.form = document.getElementById('upload-form');
        this.fileInput = document.getElementById('file-input');
        this.fileDrop = document.getElementById('file-drop');
        this.filePreview = document.getElementById('file-preview');
        this.selectedFile = null;
        this.isAuthed = false;

        this.bindEvents();
    }

    bindEvents() {
        // Open modal
        document.getElementById('admin-open').addEventListener('click', () => this.open());
        document.getElementById('admin-close').addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // PIN submit
        document.getElementById('admin-pin-submit').addEventListener('click', () => this.submitPin());
        document.getElementById('admin-pin-setup').addEventListener('click', () => this.setupPin());
        this.pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (hasPinSet()) this.submitPin();
                else this.setupPin();
            }
        });

        // File drop
        this.fileDrop.addEventListener('click', () => this.fileInput.click());
        this.fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDrop.classList.add('dragover');
        });
        this.fileDrop.addEventListener('dragleave', () => this.fileDrop.classList.remove('dragover'));
        this.fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]);
        });
        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files.length) this.handleFile(this.fileInput.files[0]);
        });

        // Form submit
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    open() {
        this.modal.classList.remove('hidden');
        this.pinInput.value = '';
        this.pinError.classList.add('hidden');

        if (this.isAuthed) {
            this.showForm();
        } else {
            this.showPinScreen();
        }

        setTimeout(() => this.pinInput.focus(), 100);
    }

    close() {
        this.modal.classList.add('hidden');
    }

    showPinScreen() {
        this.pinScreen.classList.remove('hidden');
        this.formScreen.classList.add('hidden');

        const setupBtn = document.getElementById('admin-pin-setup');
        const submitBtn = document.getElementById('admin-pin-submit');

        if (hasPinSet()) {
            setupBtn.style.display = 'none';
            submitBtn.style.display = '';
            submitBtn.textContent = 'Unlock';
        } else {
            setupBtn.style.display = '';
            submitBtn.style.display = 'none';
        }
    }

    showForm() {
        this.pinScreen.classList.add('hidden');
        this.formScreen.classList.remove('hidden');
        this.isAuthed = true;
        this.resetForm();
    }

    async submitPin() {
        const pin = this.pinInput.value;
        if (!pin) return;

        const valid = await verifyPin(pin);
        if (valid) {
            this.pinError.classList.add('hidden');
            this.showForm();
        } else {
            this.pinError.classList.remove('hidden');
            this.pinInput.value = '';
            this.pinInput.focus();
        }
    }

    async setupPin() {
        const pin = this.pinInput.value;
        if (!pin || pin.length < 4) {
            this.pinError.textContent = 'PIN must be at least 4 characters.';
            this.pinError.classList.remove('hidden');
            return;
        }

        await storePinHash(pin);
        this.pinError.classList.add('hidden');
        this.showForm();
        showToast('PIN set successfully!', 'success');
    }

    async handleFile(file) {
        const isImage = file.type.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name);
        if (!isImage) {
            showToast('Please select an image file.', 'error');
            return;
        }

        let processed;
        try {
            processed = await this.compressImage(file);
        } catch (err) {
            showToast(err.message, 'error');
            this.selectedFile = null;
            this.filePreview.classList.add('hidden');
            this.filePreview.src = '';
            this.fileDrop.querySelector('span').textContent = 'Drop image or click to select';
            return;
        }

        this.selectedFile = processed;
        this.filePreview.src = URL.createObjectURL(processed);
        this.filePreview.classList.remove('hidden');
        this.fileDrop.querySelector('span').textContent = processed === file
            ? `${file.name} · ${(processed.size / 1024).toFixed(0)} KB`
            : `${file.name} → ${(processed.size / 1024).toFixed(0)} KB (was ${(file.size / 1024).toFixed(0)} KB)`;

        this.filePreview.onload = () => {
            this.selectedWidth = this.filePreview.naturalWidth;
            this.selectedHeight = this.filePreview.naturalHeight;
        };
    }

    // Downscale + re-encode large images in the browser before uploading, so
    // phone-camera photos aren't stored (and served) at full sensor size and
    // never hit Cloudinary's 10 MB limit.
    async compressImage(file) {
        if (file.type === 'image/gif') return file; // recompressing would kill animation
        if (file.size < 300 * 1024 && file.size <= MAX_UPLOAD_BYTES) return file;

        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            // Browser can't decode this format (e.g. HEIC on Windows Chrome).
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
        if (blob.size >= file.size) return file; // original already smaller — keep it

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
        this.selectedFile = null;
        this.filePreview.classList.add('hidden');
        this.filePreview.src = '';
        this.fileDrop.querySelector('span').textContent = 'Drop image or click to select';
        document.getElementById('upload-progress').classList.add('hidden');
        document.getElementById('upload-submit').disabled = false;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('f-date').value = month;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.selectedFile) {
            showToast('Please select an image.', 'error');
            return;
        }

        const submitBtn = document.getElementById('upload-submit');
        const progressEl = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        submitBtn.disabled = true;
        progressEl.classList.remove('hidden');
        progressFill.style.width = '0%';

        try {
            // Step 1: Upload to Cloudinary
            progressText.textContent = 'Uploading image...';
            progressFill.style.width = '30%';

            const imageData = await this.uploadToCloudinary(this.selectedFile);

            // Step 2: Build artwork record
            progressText.textContent = 'Saving to database...';
            progressFill.style.width = '70%';

            const tagsRaw = document.getElementById('f-tags').value;
            const tags = tagsRaw
                ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const artwork = {
                fursona: document.getElementById('f-fursona').value.trim(),
                title: document.getElementById('f-title').value.trim(),
                artist_name: document.getElementById('f-artist').value.trim(),
                artist_url: document.getElementById('f-artist-url').value.trim() || null,
                date: document.getElementById('f-date').value || null,
                is_nsfw: document.getElementById('f-nsfw').checked,
                type: document.getElementById('f-type').value,
                tags: tags,
                image_url: imageData.url,
                thumbnail_url: imageData.thumbnailUrl,
                image_width: this.selectedWidth || null,
                image_height: this.selectedHeight || null,
            };

            // Step 3: Insert into Supabase
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
            // Demo mode — return placeholder URL
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
