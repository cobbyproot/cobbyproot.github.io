/* =============================================================================
   THE CRATE — build data/playlist.json

   GitHub Pages cannot run the proxy, so the live site reads a plain file
   instead. This script fills it, using the same reader as the proxy
   (server/spotify-lib.mjs). The daily workflow in
   .github/workflows/playlist.yml runs it with the repository's secrets; you
   can also run it by hand:

       node server/build-playlist.mjs

   It refuses to overwrite a good file with an empty one: if Spotify fails,
   the site keeps yesterday's songs.
   ========================================================================== */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, fetchAllTracks, playlistIds } from './spotify-lib.mjs';

loadEnv();

const OUT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'data', 'playlist.json');

function previous() {
    try { return JSON.parse(readFileSync(OUT, 'utf8')); } catch (err) { return null; }
}

try {
    const { tracks, errors } = await fetchAllTracks();
    for (const e of errors) console.warn('skipped', e);

    /* Only the song list decides whether anything changed, so an unchanged
       playlist does not produce a daily commit just for a new timestamp. */
    const before = previous();
    if (before && JSON.stringify(before.tracks) === JSON.stringify(tracks)) {
        console.log(`unchanged — ${tracks.length} songs`);
        process.exit(0);
    }

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({
        updated: new Date().toISOString(),
        playlists: playlistIds(),
        tracks,
    }, null, 1) + '\n');
    console.log(`wrote ${tracks.length} songs to data/playlist.json`);
} catch (err) {
    console.error('playlist build failed:', err.message);
    process.exit(1);
}
