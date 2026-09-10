# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: people Cobby has just met — at a SEA furcon, in a Discord server, on VRChat, through Barq or Bump Maps — who open a link on a phone or in a desktop browser to work out who they were talking to and how to find them again.

Secondary: fandom friends who already know Cobby and revisit for the gallery, the convention history, and the live "what am I listening to" presence.

## Product Purpose

A personal introduction card. It answers three questions for a stranger in one visit: who is this person, what is their character, and where do I find them next. Success is a first-time visitor leaving with the character in their head and the right social handle in their hand.

## Positioning

It is Cobby's own artifact rather than a link-in-bio template: live music presence pulled from Discord Lanyard / Last.fm / the Spotify Web API, a genuinely bilingual EN/VI voice in the owner's own words, four years of real convention attendance with dates, cities and photographs, and two complete character reference sheets. Nothing here is a placeholder a visitor could mistake for stock content.

## Operating Context

- Shared as a link, usually right after an in-person meeting — often typed or tapped at a convention on a phone, with the Open Graph embed card doing first duty in chat apps.
- Deep link `?event=fuve2026` greets people met at that specific convention.
- Read on phones and on desktop browsers inside Discord/VRChat overlays.
- Bilingual: every piece of owner-authored prose exists in both English and Vietnamese, toggled by a flag button.

## Capabilities and Constraints

- Static site, no build step, no framework. Vanilla JS plus GSAP, ScrollTrigger and Lenis from CDN. Font Awesome 6.4 from CDN.
- The Gallery tab is a **separate sub-application** (`gallery/`) embedded in an iframe: Supabase-backed, with its own age gate, NSFW filter modes and a hidden admin upload. It has its own HTML, CSS and JS and does not share the parent stylesheet.
- `<meta name="referrer" content="no-referrer">` is load-bearing — artwork is hotlinked and the referrer policy is what stops the hosts blocking it. Do not remove.
- Images are hotlinked from postimg.cc, iili.io and Google Drive (Drive URLs proxied and resized through `wsrv.nl`). There are no local image assets.
- A boot loader with a user-agent bot bypass exists to keep Lighthouse scores clean.
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
- Game accounts: VRChat, LoL/TFT (VN), Valorant, Roblox, Steam.
- Social handles: Facebook, X, Discord, Telegram, Bump Maps, Barq, TikTok.
- ~84 artworks in the gallery sub-app (fursuit photography and commissions), Supabase-hosted.
- Live presence integration: Discord ID `1119272682953900034`, Last.fm user `cobbyproto`.

**Absent, and must never be fabricated:** testimonials, press, client lists, commission pricing, follower counts, awards.

## Product Principles

1. **The character leads.** Cobby the protogen is the artifact, not decoration around it.
2. **Findable in seconds.** A stranger should be able to reach the right social handle from the first viewport without scrolling.
3. **Real data only.** Live presence, real dates, real art — nothing that reads as lorem.
4. **Warm voice inside hard chrome.** The interface may be a holographic technical system; the words in it are shy and affectionate.
5. **Bilingual parity is structural, not cosmetic.** Anything the owner authored exists twice; the VI layer must never be dropped, truncated or left unstyled.

## Accessibility & Inclusion

No formal standard was established by the owner. Two requirements are treated as binding anyway: the incumbent `prefers-reduced-motion` handling is preserved rather than dropped in the rewrite, and the Vietnamese layer renders in full in every typeface and weight used for it.
