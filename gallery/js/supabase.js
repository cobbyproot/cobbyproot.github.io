/**
 * Supabase client initialization.
 *
 * SETUP: Replace these values with your own Supabase project credentials.
 * 1. Go to https://supabase.com → Create new project
 * 2. Settings → API → copy the Project URL and anon public key
 *
 * DATABASE SCHEMA (run in Supabase SQL Editor):
 *
 *   create table artworks (
 *     id uuid default gen_random_uuid() primary key,
 *     fursona text not null,
 *     title text not null,
 *     artist_name text not null,
 *     artist_url text,
 *     date text,
 *     price text,
 *     is_nsfw boolean default false,
 *     type text default 'art',
 *     tags text[] default '{}',
 *     image_url text not null,
 *     thumbnail_url text,
 *     image_width integer,
 *     image_height integer,
 *     extra_images jsonb default '[]',
 *     likes_count integer default 0,
 *     created_at timestamptz default now()
 *   );
 *
 *   -- Tags table for tag metadata (name + description)
 *   -- SETUP: Run this in Supabase SQL Editor alongside the artworks table:
 *
 *   create table gallery_tags (
 *     id uuid default gen_random_uuid() primary key,
 *     name text not null unique,
 *     description text default '',
 *     created_at timestamptz default now()
 *   );
 *
 *   alter table gallery_tags enable row level security;
 *   create policy "public read" on gallery_tags for select using (true);
 *   create policy "admin all" on gallery_tags for all using (auth.role() = 'authenticated');
 *
 *   create table likes (
 *     id uuid default gen_random_uuid() primary key,
 *     artwork_id uuid references artworks(id) on delete cascade,
 *     session_id text not null,
 *     created_at timestamptz default now(),
 *     unique(artwork_id, session_id)
 *   );
 *
 *   -- RLS: public read, authenticated users can write
 *   -- SETUP: Create an admin user in Supabase Dashboard → Authentication → Users
 *   alter table artworks enable row level security;
 *   create policy "public read" on artworks for select using (true);
 *   create policy "admin insert" on artworks for insert with check (auth.role() = 'authenticated');
 *   create policy "admin update" on artworks for update using (auth.role() = 'authenticated');
 *
 *   alter table likes enable row level security;
 *   create policy "public read" on likes for select using (true);
 *   create policy "anyone insert" on likes for insert with check (true);
 *   create policy "own delete" on likes for delete using (true);
 */

const SUPABASE_URL = 'https://jnstohrqcfwfbybnjfhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc3RvaHJxY2Z3ZmJ5Ym5qZmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDQ3MzcsImV4cCI6MjEwNDU4MDczN30.GYtu89cvS4KcDh9xA3dkwP6RVg8s-ElHgYjmAA5O8eY';

let supabaseClient = null;

export function getSupabase() {
    if (supabaseClient) return supabaseClient;

    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || !window.supabase) {
        console.warn('[Gallery] Supabase not configured. Running in demo mode.');
        return null;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

export async function fetchArtworks() {
    const client = getSupabase();
    if (!client) return getDemoData();

    const { data, error } = await client
        .from('artworks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Gallery] Failed to fetch artworks:', error.message);
        return getDemoData();
    }

    return data || [];
}

export async function insertArtwork(artwork) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('artworks')
        .insert([artwork])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateArtwork(id, patch) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('artworks')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function fetchLikes(artworkIds) {
    const client = getSupabase();
    if (!client) return {};

    const sessionId = getSessionId();

    const { data, error } = await client
        .from('likes')
        .select('artwork_id')
        .in('artwork_id', artworkIds);

    if (error) return {};

    const liked = {};
    (data || []).forEach(l => { liked[l.artwork_id] = true; });
    return liked;
}

export async function toggleLike(artworkId) {
    const client = getSupabase();
    if (!client) return { liked: false, count: 0 };

    const sessionId = getSessionId();

    const { data: existing } = await client
        .from('likes')
        .select('id')
        .eq('artwork_id', artworkId)
        .eq('session_id', sessionId)
        .single();

    if (existing) {
        await client.from('likes').delete().eq('id', existing.id);
        await client.rpc('decrement_likes', { row_id: artworkId });
        return { liked: false };
    } else {
        await client.from('likes').insert({ artwork_id: artworkId, session_id: sessionId });
        await client.rpc('increment_likes', { row_id: artworkId });
        return { liked: true };
    }
}

export async function fetchTags() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client
        .from('gallery_tags')
        .select('*')
        .order('name');
    if (error) { console.error('[Tags] fetch:', error.message); return []; }
    return data || [];
}

export async function upsertTag(name, description) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    const { data, error } = await client
        .from('gallery_tags')
        .upsert({ name: name.trim(), description: (description || '').trim() }, { onConflict: 'name' })
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function deleteTag(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    const { error } = await client.from('gallery_tags').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function renameTagAcrossArtworks(oldName, newName) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    const { data: artworks } = await client
        .from('artworks').select('id, tags').contains('tags', [oldName]);
    for (const art of (artworks || [])) {
        const tags = art.tags.map(t => t === oldName ? newName : t);
        await client.from('artworks').update({ tags }).eq('id', art.id);
    }
}

export async function checkAuthSession() {
    const client = getSupabase();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
}

export async function signInWithEmail(email, password) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
}

export async function signOutAuth() {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut();
}

function getSessionId() {
    let sid = sessionStorage.getItem('gallery_session_id');
    if (!sid) {
        sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        sessionStorage.setItem('gallery_session_id', sid);
    }
    return sid;
}

function getDemoData() {
    return [
        {
            id: 'demo-1',
            fursona: 'Cobby',
            title: 'Sunset Portrait',
            artist_name: 'ArtistAlpha',
            artist_url: 'https://twitter.com',
            date: '2026-08',
            price: '$120 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['portrait', 'digital', 'sunset'],
            image_url: 'https://picsum.photos/seed/art1/1200/1600',
            thumbnail_url: 'https://picsum.photos/seed/art1/400/530',
            image_width: 1200,
            image_height: 1600,
            extra_images: [
                { url: 'https://picsum.photos/seed/art1b/1200/1600', thumbnail_url: 'https://picsum.photos/seed/art1b/400/530', width: 1200, height: 1600 },
                { url: 'https://picsum.photos/seed/art1c/1400/1000', thumbnail_url: 'https://picsum.photos/seed/art1c/400/285', width: 1400, height: 1000 }
            ],
            likes_count: 24,
            created_at: '2026-08-15'
        },
        {
            id: 'demo-2',
            fursona: 'Cobby',
            title: 'Chibi Stickers',
            artist_name: 'DrawFox',
            artist_url: 'https://bsky.app',
            date: '2026-07',
            price: '$45 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['chibi', 'stickers', 'cute'],
            image_url: 'https://picsum.photos/seed/art2/1000/1000',
            thumbnail_url: 'https://picsum.photos/seed/art2/400/400',
            image_width: 1000,
            image_height: 1000,
            likes_count: 57,
            created_at: '2026-07-20'
        },
        {
            id: 'demo-3',
            fursona: 'Cobby',
            title: 'Anthrocon 2026',
            artist_name: 'Cobby',
            artist_url: '',
            date: '2026-07',
            price: null,
            is_nsfw: false,
            type: 'fursuit',
            tags: ['con', 'fullsuit', 'outdoor'],
            image_url: 'https://picsum.photos/seed/suit1/1000/1400',
            thumbnail_url: 'https://picsum.photos/seed/suit1/400/560',
            image_width: 1000,
            image_height: 1400,
            likes_count: 83,
            created_at: '2026-07-05'
        },
        {
            id: 'demo-4',
            fursona: 'Koda',
            title: 'Full Body Reference',
            artist_name: 'InkPaw',
            artist_url: 'https://furaffinity.net',
            date: '2026-06',
            price: '$200 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['fullbody', 'ref sheet', 'kemono'],
            image_url: 'https://picsum.photos/seed/art3/1200/1800',
            thumbnail_url: 'https://picsum.photos/seed/art3/400/600',
            image_width: 1200,
            image_height: 1800,
            likes_count: 38,
            created_at: '2026-06-10'
        },
        {
            id: 'demo-5',
            fursona: 'Cobby',
            title: 'Fursuit Friday',
            artist_name: 'Cobby',
            artist_url: '',
            date: '2026-06',
            price: null,
            is_nsfw: false,
            type: 'fursuit',
            tags: ['selfie', 'indoors', 'casual'],
            image_url: 'https://picsum.photos/seed/suit2/900/1200',
            thumbnail_url: 'https://picsum.photos/seed/suit2/400/530',
            image_width: 900,
            image_height: 1200,
            likes_count: 61,
            created_at: '2026-06-20'
        },
        {
            id: 'demo-6',
            fursona: 'Cobby',
            title: 'Beach Day',
            artist_name: 'SunnyBrush',
            artist_url: 'https://twitter.com',
            date: '2026-05',
            price: '$80 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['fullbody', 'beach', 'summer'],
            image_url: 'https://picsum.photos/seed/art4/1400/1000',
            thumbnail_url: 'https://picsum.photos/seed/art4/400/285',
            image_width: 1400,
            image_height: 1000,
            likes_count: 12,
            created_at: '2026-05-05'
        },
        {
            id: 'demo-7',
            fursona: 'Koda',
            title: 'Rainy Mood',
            artist_name: 'MistDraw',
            artist_url: 'https://twitter.com',
            date: '2026-04',
            price: '$95 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['portrait', 'rain', 'moody'],
            image_url: 'https://picsum.photos/seed/art5/1000/1400',
            thumbnail_url: 'https://picsum.photos/seed/art5/400/560',
            image_width: 1000,
            image_height: 1400,
            likes_count: 31,
            created_at: '2026-04-18'
        },
        {
            id: 'demo-8',
            fursona: 'Cobby',
            title: 'Neon Night',
            artist_name: 'GlowPaw',
            artist_url: 'https://bsky.app',
            date: '2026-09',
            price: '$150 USD',
            is_nsfw: false,
            type: 'art',
            tags: ['fullbody', 'neon', 'cyberpunk'],
            image_url: 'https://picsum.photos/seed/art6/1200/1500',
            thumbnail_url: 'https://picsum.photos/seed/art6/400/500',
            image_width: 1200,
            image_height: 1500,
            extra_images: [
                { url: 'https://picsum.photos/seed/art6b/1200/1500', thumbnail_url: 'https://picsum.photos/seed/art6b/400/500', width: 1200, height: 1500 }
            ],
            likes_count: 45,
            created_at: '2026-09-01'
        },
        {
            id: 'demo-9',
            fursona: 'Koda',
            title: 'Midwest FurFest',
            artist_name: 'Koda',
            artist_url: '',
            date: '2025-12',
            price: null,
            is_nsfw: false,
            type: 'fursuit',
            tags: ['con', 'group photo', 'headless'],
            image_url: 'https://picsum.photos/seed/suit3/1100/800',
            thumbnail_url: 'https://picsum.photos/seed/suit3/400/290',
            image_width: 1100,
            image_height: 800,
            likes_count: 47,
            created_at: '2025-12-14'
        }
    ];
}
