#!/usr/bin/env bash
# THE CRATE — single-process host.
# Serves the static site AND the Spotify playlist proxy on one origin.
# Secrets come from the environment: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET.
set -euo pipefail
cd "$(dirname "$0")"
exec node server/spotify-proxy.mjs
