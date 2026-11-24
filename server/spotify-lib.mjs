/* =============================================================================
   THE CRATE — Spotify, the shared half

   Used by both the local proxy (server/spotify-proxy.mjs) and the daily
   GitHub Action (server/build-playlist.mjs), so the two can never disagree
   about how a playlist is read.

   Why a user login and not an app token: since Spotify's February 2026
   Development Mode changes, a playlist's contents are only returned to the
   user who owns or collaborates on it. An app-only (Client Credentials) token
   has no user, so every playlist comes back empty. The owner signs in once
   through /login on the proxy; the long-lived refresh token it hands back is
   all either script needs from then on.

   Environment:
     SPOTIFY_CLIENT_ID        from developer.spotify.com > Dashboard
     SPOTIFY_CLIENT_SECRET    same place
     SPOTIFY_REFRESH_TOKEN    written by the proxy's /login, once
     SPOTIFY_PLAYLIST_IDS     comma-separated; the crate pulls from all of them
   ========================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
export const ENV_FILE = join(HERE, '.env');

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';
export const SCOPES = 'playlist-read-private playlist-read-collaborative';

/* server/.env is a convenience for running locally; it never overrides a
   value the host (or the Action's secrets) already set. */
export function loadEnv() {
    for (const file of [ENV_FILE, join(HERE, '..', '.env')]) {
        let text;
        try { text = readFileSync(file, 'utf8'); } catch (err) { continue; }
        for (const line of text.split(/\r?\n/)) {
            const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
            if (!m) continue;
            const value = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
            if (!(m[1] in process.env)) process.env[m[1]] = value;
        }
    }
}

/* Set or replace one KEY=value line in server/.env, leaving the rest alone. */
export function saveEnvValue(key, value) {
    let text = '';
    try { text = readFileSync(ENV_FILE, 'utf8'); } catch (err) { /* new file */ }
    const line = `${key}=${value}`;
    const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : text.replace(/\n?$/, '\n') + line + '\n';
    writeFileSync(ENV_FILE, text);
    process.env[key] = value;
}

export const env = (k) => (process.env[k] || '').trim();

export function playlistIds() {
    const raw = env('SPOTIFY_PLAYLIST_IDS') || env('SPOTIFY_PLAYLIST_ID');
    return raw.split(/[\s,]+/)
        /* accept a pasted link as well as a bare id */
        .map((s) => (/playlist[/:]([A-Za-z0-9]+)/.exec(s) || [, s])[1])
        .filter(Boolean);
}

function basicAuth() {
    return 'Basic ' + Buffer.from(`${env('SPOTIFY_CLIENT_ID')}:${env('SPOTIFY_CLIENT_SECRET')}`).toString('base64');
}

async function tokenRequest(params) {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
        body: new URLSearchParams(params).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        throw new Error(`token request failed ${res.status}: ${data.error_description || data.error || ''}`);
    }
    return data;
}

/* The one-time login: trade the code Spotify sent to /callback for tokens. */
export function exchangeCode(code, redirectUri) {
    return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
}

/* Access tokens live an hour; mint a fresh one from the refresh token a
   minute before the old one is due. */
let cached = null;   /* { value, expiresAt } */

export async function userToken() {
    if (cached && cached.expiresAt - Date.now() > 60000) return cached.value;
    const refresh = env('SPOTIFY_REFRESH_TOKEN');
    if (!refresh) throw new Error('not signed in — open /login on the proxy once');
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refresh });
    /* Spotify may rotate the refresh token; keep the newest one. */
    if (data.refresh_token && data.refresh_token !== refresh) {
        try { saveEnvValue('SPOTIFY_REFRESH_TOKEN', data.refresh_token); } catch (err) { /* read-only host */ }
    }
    cached = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
    return cached.value;
}

export function forgetToken() { cached = null; }

async function getJson(tok, url) {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`spotify ${res.status} on ${url.replace(API, '')}: ${body.slice(0, 200)}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

/* One playlist entry → the crate's shape. The 2026 API moved the object to
   `item` and left `track` behind as a boolean, so read whichever is an
   object. Podcast episodes and local files are skipped. */
function toCrateTrack(entry) {
    const t = (entry && typeof entry.item === 'object' && entry.item)
        || (entry && typeof entry.track === 'object' && entry.track)
        || null;
    if (!t || !t.name || (t.type && t.type !== 'track') || t.is_local) return null;
    const album = t.album || {};
    return {
        id: t.id || '',
        title: t.name,
        artist: (t.artists || []).map((a) => a.name).filter(Boolean).join(', '),
        album: album.name || '',
        cover: (album.images && album.images[0] && album.images[0].url) || '',
    };
}

async function readPlaylist(tok, id) {
    const out = [];
    /* /items is the 2026 route; /tracks is the old one, kept as a fallback
       for apps Spotify has not migrated yet. */
    for (const route of ['items', 'tracks']) {
        let url = `${API}/playlists/${id}/${route}?limit=50`;
        try {
            for (let page = 0; url && page < 20; page++) {
                const data = await getJson(tok, url);
                for (const entry of data.items || []) {
                    const t = toCrateTrack(entry);
                    if (t) out.push(t);
                }
                url = data.next || null;
            }
            return out;
        } catch (err) {
            if (route === 'items' && err.status === 404) continue;
            throw err;
        }
    }
    return out;
}

/* Every configured playlist, merged, duplicates dropped. A playlist that
   fails is reported but does not sink the others. */
export async function fetchAllTracks() {
    const ids = playlistIds();
    if (!ids.length) throw new Error('set SPOTIFY_PLAYLIST_IDS');
    const tok = await userToken();
    const seen = new Set();
    const tracks = [];
    const errors = [];
    for (const id of ids) {
        try {
            for (const t of await readPlaylist(tok, id)) {
                const key = t.id || (t.title + '|' + t.artist).toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                tracks.push(t);
            }
        } catch (err) {
            errors.push(`${id}: ${err.message}`);
        }
    }
    if (!tracks.length) {
        throw new Error('no tracks' + (errors.length ? ' — ' + errors.join('; ') : ' (are these playlists yours?)'));
    }
    return { tracks, errors };
}
