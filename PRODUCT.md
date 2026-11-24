# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: people Cobby has just met — at a SEA furcon, in a Discord server, on VRChat, through Barq or Bump Maps — who open a link on a phone or in a desktop browser to work out who they were talking to and how to find them again.

Secondary: fandom friends who already know Cobby and revisit for the gallery, the convention history, the music crate, and the live "what am I listening to" presence.

## Product Purpose

A personal introduction card. It answers three questions for a stranger in one visit: who is this person, what is their character, and where do I find them next. Success is a first-time visitor leaving with the character in their head and the right social handle in their hand.

## Positioning

It is Cobby's own artifact rather than a link-in-bio template: a genuinely bilingual EN/VI voice in the owner's own words, four years of real convention attendance with dates, cities and photographs flown on an actual globe, two complete character reference sheets, a shelf of game cards that flip to the real handle, and a music crate you open like a case rather than scroll like a list. Nothing here is a placeholder a visitor could mistake for stock content.

## Operating Context

- Shared as a link, usually right after an in-person meeting — often typed or tapped at a convention on a phone, with the Open Graph embed card doing first duty in chat apps.
- Deep link `?event=fuve2026` greets people met at that specific convention.
- Read on phones and on desktop browsers inside Discord/VRChat overlays.
- Bilingual: every piece of owner-authored prose exists in both English and Vietnamese, toggled by a flag button.

## Capabilities and Constraints

- Static site, no build step, no framework. Vanilla JS plus GSAP, ScrollTrigger and Lenis from CDN. Font Awesome 6.4 from CDN.
- Five tabs in the fixed dock: **Fursona · Gallery · Gaming · Music · Travel**. The introduction panel belongs to Fursona only — it is nested inside `#tab-fursona`, so switching tabs removes it from the layout structurally rather than hiding it with a rule that has to be maintained.
- The Gallery tab is a **separate sub-application** (`gallery/`) embedded in an iframe: Supabase-backed, with its own age gate, NSFW filter modes and a hidden admin upload. It has its own HTML, CSS and JS and does not share the parent stylesheet.
- **Gaming** is a shelf of five trading-style cards (`js/gaming.js`), one per real account. Each card carries real key art and flips to reveal the real handle with a copy control. Card art resolves live where an API exists (Riot Data Dragon for the current patch, valorant-api.com, the public Roblox user + thumbnail endpoints) and falls back to a verified static URL.
- **Music** is the crate (`js/music.js`): a CS2-style case opening where the drops are tracks from the owner's real playlist. Only one live tier is used — Discord Lanyard — and it is worth a guaranteed LEGENDARY pull. The catalog resolves to real, playable 30-second previews through the iTunes Search API, which is CORS-enabled, so the hero instrument draws a genuine spectrum from the playing audio.
- **Travel** is the flight log (`js/travel.js`): a Canvas-2D orthographic globe with coastlines from `world-atlas` TopoJSON, pins at the real convention cities, and an aircraft that flies a great-circle arc from Ho Chi Minh City. One `FLIGHTS` array drives both the globe and the timeline beneath it.
- The Last.fm tier and the Spotify Web API OAuth path were **removed**: the Last.fm key answers 403 and the OAuth flow only ever worked for one person on one browser, so the panel spent most of its life on a placeholder. Nothing may reintroduce `#spotify-*` ids.
- `<meta name="referrer" content="no-referrer">` is load-bearing — artwork is hotlinked and the referrer policy is what stops the hosts blocking it. Do not remove.
- Images are hotlinked from Cloudinary, postimg.cc, iili.io and the game CDNs. There are no local image assets beyond the three `.glb` character exports.
- A boot loader with a user-agent bot bypass exists to keep Lighthouse scores clean.
- A four-tier performance governor (`js/perf.js`, `css/perf.css`) decides before first paint what the page is allowed to run: `lite · balanced · full · ultra`, overridable with `?perf=`. Every new tab must read `window.CobbyPerf` and degrade rather than assume.
- All three brand typefaces (Exo 2, Chakra Petch, IBM Plex Mono) ship a Google Fonts `vietnamese` subset — verified 2026-09-10. Any future display face must be re-checked against this before adoption.
- Undecided: no analytics, no CMS, no custom domain requirements were established.

## Brand Commitments

- **Name:** Cobby. Also answers to Cobbi, Cobbie, cobbyproto, Bao Luu (Facebook), JacobUwU (VRChat). Visitors may use any of them.
- **Characters:** Cobby — wolf protogen. Cobbie — wolf canine, the alternate form. Both have complete reference sheets on site.
- **Voice:** warm, shy-then-talkative uwu-speak in the owner's own words ("Hawwwo~", ":333", "hehe x3"). The bio prose is the owner's writing and stays verbatim in both languages.
- **Interface labels** carry the same soft playful voice rather than clinical technical phrasing — decided by the owner 2026-09-10.
- **Pinned visual direction** (owner's brief, 2026-09-10): "Protogen Technical Dossier" — holographic sci-fi HUD, Tron-meets-holographic-trading-card. Palette, typefaces and component vocabulary are fixed by that brief and recorded in the surface brief's direction contract.

## Evidence on Hand

Real, and must not be replaced with invented equivalents:

- Owner-written bio, English and Vietnamese (`index.html`, `.bio-desc[lang]`).
- Two character reference sheets (postimg.cc).
- Convention history 2023–2026: FUVE 2023/2024/2025/2026, Thaitails 2025, FurGIV 2025/2026, SiamPaws 2026, FURUM 2026 — with real dates, cities, country flags and event photographs.
- Game accounts: VRChat, LoL/TFT (VN), Valorant, Roblox, Steam — all with real handles, now presented as the Gaming shelf.
- Social handles: Facebook, X, Discord, Telegram, Bump Maps, Barq, TikTok.
- ~84 artworks in the gallery sub-app (fursuit photography and commissions), Supabase-hosted.
- Live presence: Discord ID `1119272682953900034` via Lanyard. Roblox account id `297588338`, created 2017-05-06, display name `Cobbyyy`.
- Real playable track previews resolved at runtime from the iTunes Search API (country VN).

**Absent, and must never be fabricated:** testimonials, press, client lists, commission pricing, follower counts, awards.

## Product Principles

1. **The character leads.** Cobby the protogen is the artifact, not decoration around it.
2. **Findable in seconds.** A stranger should be able to reach the right social handle from the first viewport without scrolling.
3. **Real data only.** Live presence, real dates, real art, real playable previews, real account handles — nothing that reads as lorem.
4. **Warm voice inside hard chrome.** The interface may be a holographic technical system; the words in it are shy and affectionate.
5. **Bilingual parity is structural, not cosmetic.** Anything the owner authored exists twice; the VI layer must never be dropped, truncated or left unstyled.
6. **Every tab is an instrument, not a section.** Gaming is a shelf you pick from, Music is a crate you open, Travel is a globe you fly. If a tab can be replaced by a list, it has not been designed yet.

## Accessibility & Inclusion

No formal standard was established by the owner. Two requirements are treated as binding anyway: the incumbent `prefers-reduced-motion` handling is preserved rather than dropped in the rewrite, and the Vietnamese layer renders in full in every typeface and weight used for it.
