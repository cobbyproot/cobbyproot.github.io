/* =============================================================================
   THE CRATE — local Spotify proxy + site host

   Serves the static site and one JSON endpoint on the same origin, so the
   crate can read your playlists while you develop. The live site (GitHub
   Pages) cannot run this; it reads data/playlist.json instead, which the
   daily GitHub Action builds with the same code (server/spotify-lib.mjs).

   Endpoints:
     /api/spotify/tracks     your playlists' tracks, merged
     /api/spotify/health     signed-in state and a live token check
     /login, /callback       one-time Spotify sign-in (this machine only)

   First run:
     1. In developer.spotify.com > your app > Settings, add the Redirect URI
          http://127.0.0.1:3000/callback
     2. Put SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_PLAYLIST_IDS
        in server/.env (gitignored).
     3. node server/spotify-proxy.mjs, then open http://127.0.0.1:3000/login
        and approve. The refresh token is written to server/.env.
   ========================================================================== */
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    loadEnv, env, saveEnvValue, exchangeCode, userToken, forgetToken,
    fetchAllTracks, playlistIds, SCOPES,
} from './spotify-lib.mjs';

loadEnv();

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

/* Must match a Redirect URI saved in the Spotify dashboard, character for
   character. Spotify only allows plain http on the loopback IP. */
const REDIRECT_URI = env('SPOTIFY_REDIRECT_URI') || `http://127.0.0.1:${PORT}/callback`;

/* The static site root — this server doubles as the site host so the page
   can call /api/spotify/tracks on the same origin. */
const SITE_ROOT = normalize(join(__dirname, '..'));

/* Responses are cached in memory for a few minutes: Spotify rate-limits, and
   every page load would otherwise re-spend the app's quota. */
const TRACKS_TTL_MS = 10 * 60 * 1000;
let tracksCache = null;   /* { at, list } */

/* One pending sign-in at a time; the state value stops a forged callback. */
let loginState = null;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
};

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.ico': 'image/x-icon',
};

function json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
        ...CORS,
    });
    res.end(payload);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(res, status, title, body) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<body style="font:15px/1.5 system-ui;background:#080b16;color:#dfe6f5;max-width:560px;margin:12vh auto;padding:0 20px">
<h1 style="font-size:20px">${esc(title)}</h1>${body}</body>`);
}

/* Signing in writes a credential to disk, so only this machine may do it —
   never a visitor, if the proxy is ever exposed beyond localhost. */
function fromThisMachine(req) {
    const a = req.socket.remoteAddress || '';
    return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

/* ---------------------------------------------------------------------------
   HTTP
   ------------------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS);
        res.end();
        return;
    }
    if (req.method !== 'GET') {
        json(res, 405, { error: 'method not allowed' });
        return;
    }

    const url = new URL(req.url, 'http://127.0.0.1');
    const path = url.pathname;

    if (path === '/login') {
        if (!fromThisMachine(req)) { json(res, 403, { error: 'sign in from the machine running the proxy' }); return; }
        if (!env('SPOTIFY_CLIENT_ID') || !env('SPOTIFY_CLIENT_SECRET')) {
            page(res, 500, 'Missing keys', '<p>Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in server/.env first.</p>');
            return;
        }
        loginState = randomBytes(16).toString('hex');
        const q = new URLSearchParams({
            response_type: 'code',
            client_id: env('SPOTIFY_CLIENT_ID'),
            scope: SCOPES,
            redirect_uri: REDIRECT_URI,
            state: loginState,
        });
        res.writeHead(302, { Location: 'https://accounts.spotify.com/authorize?' + q });
        res.end();
        return;
    }

    if (path === '/callback') {
        if (!fromThisMachine(req)) { json(res, 403, { error: 'forbidden' }); return; }
        const err = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        if (err || !code) {
            page(res, 400, 'Sign-in cancelled', `<p>Spotify said: ${esc(err || 'no code')}</p><p><a style="color:#00f0d4" href="/login">Try again</a></p>`);
            return;
        }
        if (!loginState || url.searchParams.get('state') !== loginState) {
            page(res, 400, 'Sign-in expired', '<p><a style="color:#00f0d4" href="/login">Start again</a></p>');
            return;
        }
        loginState = null;
        try {
            const data = await exchangeCode(code, REDIRECT_URI);
            if (!data.refresh_token) throw new Error('Spotify returned no refresh token');
            saveEnvValue('SPOTIFY_REFRESH_TOKEN', data.refresh_token);
            forgetToken();
            tracksCache = null;
            const { tracks, errors } = await fetchAllTracks();
            page(res, 200, 'Signed in',
                `<p>The crate can read your playlists: <b>${tracks.length}</b> songs found.</p>` +
                (errors.length ? `<p style="color:#ff6b9d">Skipped: ${esc(errors.join('; '))}</p>` : '') +
                '<p>The refresh token is saved in <code>server/.env</code>. For the live site, copy it into the GitHub repository secret <code>SPOTIFY_REFRESH_TOKEN</code>.</p>' +
                '<p><a style="color:#00f0d4" href="/">Open the site</a></p>');
        } catch (e) {
            page(res, 502, 'Signed in, but reading failed', `<p>${esc(e.message)}</p>`);
        }
        return;
    }

    if (path === '/api/spotify/tracks') {
        try {
            if (tracksCache && Date.now() - tracksCache.at < TRACKS_TTL_MS) {
                json(res, 200, { tracks: tracksCache.list, cached: true });
                return;
            }
            const { tracks } = await fetchAllTracks();
            tracksCache = { at: Date.now(), list: tracks };
            json(res, 200, { tracks });
        } catch (err) {
            json(res, 502, { error: 'spotify refused the playlist', detail: String(err && err.message) });
        }
        return;
    }

    if (path === '/api/spotify/health') {
        if (!env('SPOTIFY_CLIENT_ID') || !env('SPOTIFY_CLIENT_SECRET')) {
            json(res, 503, { ok: false, error: 'set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET' });
            return;
        }
        if (!env('SPOTIFY_REFRESH_TOKEN')) {
            json(res, 503, { ok: false, signedIn: false, error: `open http://127.0.0.1:${PORT}/login once` });
            return;
        }
        try {
            await userToken();
            json(res, 200, { ok: true, signedIn: true, playlists: playlistIds() });
        } catch (err) {
            json(res, 502, { ok: false, signedIn: true, detail: String(err && err.message) });
        }
        return;
    }

    /* Static site. Never walk out of the site root. */
    if (path === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(await readFile(join(SITE_ROOT, 'index.html')));
        return;
    }
    {
        const rel = decodeURIComponent(path).replace(/^[/\\]+/, '');
        /* Never serve the server's own source or any dot-directory. */
        if (rel === '' || rel.split(/[/\\]/)[0] === 'server' || /(^|[/\\])\./.test(rel)) {
            json(res, 404, { error: 'not found' });
            return;
        }
        const filePath = normalize(join(SITE_ROOT, rel));
        if (!filePath.startsWith(SITE_ROOT)) { json(res, 403, { error: 'forbidden' }); return; }
        const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
        try {
            const body = await readFile(filePath);
            res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
            res.end(body);
        } catch (err) {
            json(res, 404, { error: 'not found' });
        }
        return;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`spotify-proxy listening on http://127.0.0.1:${PORT}`);
    if (!env('SPOTIFY_CLIENT_ID') || !env('SPOTIFY_CLIENT_SECRET')) {
        console.warn('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set — the crate will fall back to Deezer');
    } else if (!env('SPOTIFY_REFRESH_TOKEN')) {
        console.warn(`not signed in to Spotify yet — open http://127.0.0.1:${PORT}/login once`);
    } else {
        console.log('signed in — /api/spotify/tracks reads your playlists');
    }
});
