/* =============================================================================
   THE FLOATING SHELF — js/gaming.js

   Twenty-seven titles, split in two. The five real accounts are flat badges in
   a rack (logo, big game name, username, copy key). The other twenty-two are
   Steam games in a floating field: each is a landscape poster — the game's own
   art, a dark fade up from the foot, and the game's name on that fade. No
   rank, no serial, no platform code, no flavour line and no flip: a card is
   the game and its name, nothing else.

   Everything that makes the field feel physical — the drift, the tilt — is
   slow and quiet, and the drift stops the moment you reach for a card.

   The order below is the order the comment in index.html promises:
     the slots → the deck (real data) → the render → the light → the copy →
     the reveal.
   ========================================================================== */
(() => {
    'use strict';

    const deck = document.getElementById('game-deck');
    const handleDeck = document.getElementById('handle-deck');
    const panel = document.getElementById('tab-gaming');
    if (!deck || !handleDeck || !panel) return;

    const perf = window.CobbyPerf;
    const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Guarded reads. `window.CobbyPerf` is set by js/perf.js, which loads
       before this file, but a CDN hiccup must never take the shelf down with
       it: absent means "assume a healthy desktop", which is the old default. */
    const perfReduced = () => (typeof perf?.reducedMotion === 'boolean' ? perf.reducedMotion : reducedMQ.matches);
    const perfTrims = () => {
        try {
            if (perf && typeof perf.trimsMotion === 'function') return perf.trimsMotion();
        } catch (err) { /* a broken governor is not a broken card */ }
        return reducedMQ.matches;
    };
    const perfLevel = () => {
        const lvl = perf?.level;
        return typeof lvl === 'number' ? lvl : 2;
    };

    /* -----------------------------------------------------------------------
       Endpoints
       --------------------------------------------------------------------- */
    /* All verified live against the running site on 2026-11-12. Every one of
       them is only ever an *upgrade*: the card is rendered from the fallbacks
       below before any request leaves the page, so a dead network, a CORS
       refusal or a Roblox outage degrades to a card that still looks finished
       rather than to a hole in the shelf. */
    const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps/';
    /* Every extra card is a real Steam store page, so its capsule (460x215) is
       a real, stable image and the card can be printed in `banner` mode. No
       screenshot or wallpaper is invented. */
    const steamHeader = (appId) => STEAM_CDN + appId + '/header.jpg';
    const DDRAGON = 'https://ddragon.leagueoflegends.com/';
    const LOL_VERSION_FALLBACK = '16.22.1';       /* newest on the CDN today */
    const VALORANT_AGENTS = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true';
    const RBX_USER_ID = '297588338';              /* CobbyProto, resolved live */
    const RBX_USER = 'https://users.roblox.com/v1/users/' + RBX_USER_ID;
    const RBX_THUMB = 'https://thumbnails.roblox.com/v1/users/avatar-headshot'
        + '?userIds=' + RBX_USER_ID + '&size=420x420&format=Png&isCircular=false';

    /* Fallbacks, each one fetched and opened in the browser before being
       written here. They are complete URLs, not templates: a fallback that
       still needs a version number is not a fallback. */
    const ART = {
        vrchat: STEAM_CDN + '438100/header.jpg',                    /* 460x215, 200 OK */
        /* Riot's loading-screen card (308x560) rather than the 1215x717 splash:
           it is Riot's own portrait crop, so it is already the shape of the
           card it is printed on and nothing important gets cut. */
        league: DDRAGON + 'cdn/img/champion/loading/Warwick_0.jpg',
        leagueSigil: DDRAGON + 'cdn/' + LOL_VERSION_FALLBACK + '/img/champion/Warwick.png',
        valorant: 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png',
        roblox: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-F836D0ED3EFE30016C09B58BACF1F316-Png'
            + '/420/420/AvatarHeadshot/Png/noFilter',
        steam: STEAM_CDN + '753/header.jpg'                         /* 460x215, 200 OK */
    };

    /* The badge mark: the game's own wordmark, not a screenshot of it. Each
       URL was loaded in a browser and measured before it was written here, and
       each one is the publisher's own logo — VRChat's Steam logo plate, Riot's
       League wordmark, Riot's pink VALORANT wordmark, Roblox's 2017 wordmark and
       the Steam mark. They are marks, so they are drawn at their own aspect
       ratio on the badge rather than cropped to a tile. */
    const WM = 'https://upload.wikimedia.org/wikipedia/commons/';
    const LOGO = {
        vrchat: STEAM_CDN + '438100/logo.png',                      /* 640x360, 200 OK */
        league: WM + 'd/d8/League_of_Legends_2019_vector.svg',       /* 600x229, gold */
        valorant: WM + 'f/fc/Valorant_logo_-_pink_color_version.svg',/* 580x396, #ff4655 */
        roblox: WM + '5/5c/Roblox_logo_2017.svg',                    /* 300x52, #e2231a */
        steam: WM + '8/83/Steam_icon_logo.svg'                       /* 65x65 */
    };

    /* -----------------------------------------------------------------------
       The deck
       --------------------------------------------------------------------- */
    /* `rank` is invented — it is how much Cobby plays the thing, which is an
       opinion and therefore allowed. Every *fact* on the card (the handle, the
       champion, the agent, the join year, the profile URL) is real and was
       verified.

       `art.mode` is chosen per source, by what the real asset actually is:

         cover    a tall or shape-agnostic picture. Fills the card edge to edge;
                  the type is struck across a scrim over it.
         banner   a 460x215 Steam capsule. A wide capsule cannot fill a portrait
                  card without destroying its composition, so it is printed as a
                  band at the top of the card — which is how a physical card
                  would actually mount a wide logo — and the plate below carries
                  the type.
         niche    square art on transparency (Riot's agent icon, Roblox's
                  headshot). Cropping a cut-out head is always wrong, so it is
                  framed in a lit niche instead. */
    const DECK = [
        {
            id: 'vrchat',
            name: { en: 'VRChat', vi: 'VRChat' },
            platform: 'steam // 438100',
            kicker: { en: 'the social one', vi: 'chỗ tụ tập' },
            rank: 'main',
            rankLabel: { en: 'main', vi: 'chính' },
            handle: 'JacobUwU',
            sub: { en: 'the name in the mirror', vi: 'cái tên trong gương' },
            flavour: { en: 'where the wolf gets to be a wolf.', vi: 'chỗ con sói được làm sói thật sự.' },
            voice: {
                en: 'if you see a big fluffy protogen staring at the mirror, that\'s me. wave first — i get shy~',
                vi: 'nếu bạn thấy một bé protogen lông xù đứng ngắm gương, đó là mình á. vẫy tay trước nha, mình ngại~'
            },
            art: { src: ART.vrchat, mode: 'banner' },
            logo: { src: LOGO.vrchat, wide: false }
        },
        {
            id: 'league',
            name: { en: 'League of Legends', vi: 'League of Legends' },
            platform: 'riot // vn',
            kicker: { en: 'summoner\'s rift + tft', vi: 'rift + đấu trường' },
            rank: 'main',
            rankLabel: { en: 'main', vi: 'chính' },
            handle: 'Cobbi#GRRR',
            sub: { en: 'warwick — the wolf that will not stay dead', vi: 'warwick — con sói không chịu chết' },
            flavour: { en: 'warwick. all bite, no plan.', vi: 'warwick. chỉ cắn, không có kế hoạch gì hết.' },
            voice: {
                en: 'i play TFT on the VN server. i will lose to you beautifully and then ask for one more.',
                vi: 'mình chơi TFT server VN. mình sẽ thua bạn thật đẹp rồi đòi thêm một ván nữa á.'
            },
            /* The loading-screen card, 308x560 — Riot's own portrait crop of the
               splash, which is exactly the shape of the card this is printed on. */
            art: { src: ART.league, mode: 'cover' },
            logo: { src: LOGO.league, wide: true },
            sigil: { src: ART.leagueSigil, label: 'Warwick' }
        },
        {
            id: 'valorant',
            name: { en: 'VALORANT', vi: 'VALORANT' },
            platform: 'riot // ap',
            kicker: { en: 'tactical, allegedly', vi: 'chiến thuật, chắc vậy' },
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            handle: 'Con Cobbi Báo#PROOT',
            sub: { en: 'fade — initiator. i hunt with hounds.', vi: 'fade — mở đường. mình đi săn cùng mấy bé chó.' },
            flavour: { en: 'fade. i hunt with hounds.', vi: 'fade. mình đi săn cùng mấy bé chó.' },
            voice: {
                en: 'i am not good. i am loud. those are different things, i checked.',
                vi: 'mình không giỏi, nhưng mình hét to. hai cái đó khác nhau nha, mình kiểm tra rồi.'
            },
            art: { src: ART.valorant, mode: 'niche', tint: 'magenta' },
            logo: { src: LOGO.valorant, wide: true },
            role: 'Initiator'
        },
        {
            id: 'roblox',
            name: { en: 'Roblox', vi: 'Roblox' },
            platform: 'roblox // 297588338',
            kicker: { en: 'the oldest save file', vi: 'file lưu lâu nhất' },
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            handle: 'CobbyProto',
            /* Filled from the live API; this is what was verified on the day. */
            sub: { en: 'shown as Cobbyyy · since 2017', vi: 'hiển thị là Cobbyyy · từ 2017' },
            flavour: { en: 'the oldest save file of me.', vi: 'file lưu cổ nhất của mình.' },
            voice: {
                en: 'made this account when i was a pup. still wandering the same maps.',
                vi: 'mở tài khoản này hồi còn là sói con. tới giờ vẫn đi lạc mấy map đó.'
            },
            art: { src: ART.roblox, mode: 'niche', tint: 'cyan' },
            logo: { src: LOGO.roblox, wide: true },
            since: 2017
        },
        {
            id: 'steam',
            name: { en: 'Steam', vi: 'Steam' },
            platform: 'steam // 753',
            kicker: { en: 'the library', vi: 'cả thư viện' },
            rank: 'library',
            rankLabel: { en: 'library', vi: 'thư viện' },
            handle: 'BasicallyJacob',
            sub: { en: 'steamcommunity.com/id/BasicallyJacob', vi: 'steamcommunity.com/id/BasicallyJacob' },
            flavour: { en: 'everything i own, filed badly.', vi: 'everything i own, filed badly.' },
            voice: {
                en: 'my backlog is a haunted house. come in, it\'s warm in here.',
                vi: 'cái backlog của mình giống nhà ma á. vô đi, trong này ấm lắm.'
            },
            art: { src: ART.steam, mode: 'banner' },
            logo: { src: LOGO.steam, wide: false },
            /* This one is a place, not an account: copying the handle alone
               would be useless, so the copy key takes the whole address. */
            copyValue: 'https://steamcommunity.com/id/BasicallyJacob/',
            link: 'https://steamcommunity.com/id/BasicallyJacob/'
        },
        {
            id: 'cs2',
            name: { en: 'Counter-Strike 2', vi: 'Counter-Strike 2' },
            platform: 'steam // 730',
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            sub: { en: 'tactical shooter · clutch or cry', vi: 'bắn súng chiến thuật · gánh hoặc khóc' },
            flavour: { en: 'five rounds of silence, then shouting.', vi: 'năm hiệp im lặng, rồi hét.' },
            voice: {
                en: 'i am the one who says "one more" after losing nine in a row.',
                vi: 'mình là đứa nói "thêm ván nữa" sau khi thua chín ván liền.'
            },
            note: { en: 'no handle — my crosshair placement is a secret.', vi: 'không có tài khoản — chỗ đặt tâm của mình là bí mật.' },
            art: { src: steamHeader('730'), mode: 'banner' }
        },
        {
            id: 'l4d2',
            name: { en: 'Left 4 Dead 2', vi: 'Left 4 Dead 2' },
            platform: 'steam // 550',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op shooter · the comfort horde', vi: 'bắn súng co-op · bầy zombie quen thuộc' },
            flavour: { en: 'four survivors, one witch, no plan.', vi: 'bốn người sống sót, một con witch, không kế hoạch.' },
            voice: {
                en: 'i still flinch at the witch. i still run at her anyway.',
                vi: 'mình vẫn giật mình vì con witch. mà vẫn lao vào nó.'
            },
            note: { en: 'no handle — the survivors don\'t need my name.', vi: 'không có tài khoản — mấy người sống sót đâu cần tên mình.' },
            art: { src: steamHeader('550'), mode: 'banner' }
        },
        {
            id: 'repo',
            name: { en: 'R.E.P.O', vi: 'R.E.P.O' },
            platform: 'steam // 3241660',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op horror · carry the fragile thing', vi: 'kinh dị co-op · khiêng món đồ mong manh' },
            flavour: { en: 'do not drop the vase. do not drop the vase.', vi: 'đừng làm rơi cái bình. đừng làm rơi cái bình.' },
            voice: {
                en: 'i am the one who drops the vase. i am very sorry.',
                vi: 'mình là đứa làm rơi cái bình. mình xin lỗi nhiều lắm.'
            },
            note: { en: 'no handle — the quota is the only boss here.', vi: 'không có tài khoản — chỉ tiêu là ông chủ duy nhất ở đây.' },
            art: { src: steamHeader('3241660'), mode: 'banner' }
        },
        {
            id: 'peak',
            name: { en: 'PEAK', vi: 'PEAK' },
            platform: 'steam // 3527290',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op climbing · everything is a handhold', vi: 'leo núi co-op · chỗ nào cũng bám được' },
            flavour: { en: 'climb badly, together.', vi: 'leo dở, nhưng leo cùng nhau.' },
            voice: {
                en: 'i fall, i laugh, i fall again. that is the whole loop and i love it.',
                vi: 'mình té, mình cười, rồi té tiếp. vòng lặp đó mà mình mê.'
            },
            note: { en: 'no handle — my climbing partner knows who i am.', vi: 'không có tài khoản — bạn leo cùng mình biết mình là ai rồi.' },
            /* Newer store assets live on the shared host, not the old CDN. */
            art: {
                src: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3527290/31bac6b2eccf09b368f5e95ce510bae2baf3cfcd/header.jpg?t=1792684718',
                mode: 'banner'
            }
        },
        {
            id: 'phasmophobia',
            name: { en: 'Phasmophobia', vi: 'Phasmophobia' },
            platform: 'steam // 739630',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op horror · ghost tour', vi: 'kinh dị co-op · tour ma' },
            flavour: { en: 'please respond, ghost.', vi: 'trả lời đi mà, ma ơi.' },
            voice: {
                en: 'i scream first and investigate later. sorry to whoever is in voice chat.',
                vi: 'mình hét trước rồi mới điều tra sau. xin lỗi ai đang ở trong voice chat.'
            },
            note: { en: 'no handle — the ghost doesn\'t need my username.', vi: 'không có tài khoản — con ma đâu cần tên của mình.' },
            art: { src: steamHeader('739630'), mode: 'banner' }
        },
        {
            id: 'lethal',
            name: { en: 'Lethal Company', vi: 'Lethal Company' },
            platform: 'steam // 1966720',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op horror · quota day', vi: 'kinh dị co-op · ngày chỉ tiêu' },
            flavour: { en: 'the company is always watching.', vi: 'công ty luôn dõi theo.' },
            voice: {
                en: 'i am the one who runs back for the shiny thing. i am not invited back.',
                vi: 'mình là đứa chạy lại lấy món đồ bóng loáng. mình không được rủ lại.'
            },
            note: { en: 'no handle — the quota knows who i am.', vi: 'không có tài khoản — chỉ tiêu biết mình là ai.' },
            art: { src: steamHeader('1966720'), mode: 'banner' }
        },
        {
            id: 'division2',
            name: { en: 'The Division 2', vi: 'The Division 2' },
            platform: 'steam // 2221490',
            rank: 'library',
            rankLabel: { en: 'library', vi: 'thư viện' },
            sub: { en: 'looter shooter · washington, after', vi: 'bắn súng nhặt đồ · washington, sau đó' },
            flavour: { en: 'a city in pieces, a backpack full of loot.', vi: 'thành phố vỡ vụn, ba lô đầy đồ nhặt.' },
            voice: {
                en: 'i spend more time in the inventory than in the actual apocalypse.',
                vi: 'mình dành nhiều thời gian trong túi đồ hơn là trong ngày tận thế thật sự.'
            },
            note: { en: 'no handle — my agent works alone.', vi: 'không có tài khoản — đặc vụ của mình làm việc một mình.' },
            art: { src: steamHeader('2221490'), mode: 'banner' }
        },
        {
            id: 'satisfactory',
            name: { en: 'Satisfactory', vi: 'Satisfactory' },
            platform: 'steam // 526870',
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            sub: { en: 'factory builder · the conveyor must flow', vi: 'xây nhà máy · băng tải phải chạy' },
            flavour: { en: 'the factory grows. i do not sleep.', vi: 'nhà máy lớn lên. mình thì không ngủ.' },
            voice: {
                en: 'i say the factory is finished. the factory is never finished.',
                vi: 'mình nói nhà máy xong rồi. nhà máy không bao giờ xong.'
            },
            note: { en: 'no handle — the factory does not need a username.', vi: 'không có tài khoản — nhà máy đâu cần tên người dùng.' },
            art: { src: steamHeader('526870'), mode: 'banner' }
        },
        {
            id: 'rhythmdoctor',
            name: { en: 'Rhythm Doctor', vi: 'Rhythm Doctor' },
            platform: 'steam // 774181',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'rhythm · press on the seventh beat', vi: 'nhịp điệu · bấm vào nhịp thứ bảy' },
            flavour: { en: 'one button. seven beats. no mercy.', vi: 'một nút. bảy nhịp. không thương tiếc.' },
            voice: {
                en: 'i have heard this song two hundred times and i still miss the seventh beat.',
                vi: 'mình nghe bài này hai trăm lần rồi mà vẫn trượt nhịp thứ bảy.'
            },
            note: { en: 'no handle — the beat does not care who i am.', vi: 'không có tài khoản — nhịp điệu đâu cần biết mình là ai.' },
            art: { src: steamHeader('774181'), mode: 'banner' }
        },
        {
            id: 'terraria',
            name: { en: 'Terraria', vi: 'Terraria' },
            platform: 'steam // 105600',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'sandbox · dig forever', vi: 'sandbox · đào mãi' },
            flavour: { en: 'a whole world, one pickaxe.', vi: 'cả một thế giới, một cái cuốc.' },
            voice: {
                en: 'i build a pretty house and then the corruption eats it. every single time.',
                vi: 'mình xây một căn nhà xinh rồi bị ăn mòn nuốt mất. lần nào cũng vậy.'
            },
            note: { en: 'no public handle — the world is between me and the dirt.', vi: 'không để tài khoản — thế giới này chỉ giữa mình và đất.' },
            art: { src: steamHeader('105600'), mode: 'banner' }
        },
        {
            id: 'adofai',
            name: { en: 'A Dance of Fire and Ice', vi: 'A Dance of Fire and Ice' },
            platform: 'steam // 977950',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'rhythm · two planets, one orbit', vi: 'nhịp điệu · hai hành tinh, một quỹ đạo' },
            flavour: { en: 'keep the orbit. do not blink.', vi: 'giữ quỹ đạo. đừng chớp mắt.' },
            voice: {
                en: 'it looks so calm and then my hands forget how to move.',
                vi: 'nó nhìn bình yên vậy mà tay mình quên mất cách cử động.'
            },
            note: { en: 'no handle — this one is just me and the planets.', vi: 'không có tài khoản — cái này chỉ có mình và mấy hành tinh.' },
            art: { src: steamHeader('977950'), mode: 'banner' }
        },
        {
            id: 'gunfire',
            name: { en: 'Gunfire Reborn', vi: 'Gunfire Reborn' },
            platform: 'steam // 1217060',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'roguelite shooter · one more scroll', vi: 'bắn súng roguelite · thêm một cuộn bí kíp' },
            flavour: { en: 'a cat with a gun. that is the pitch.', vi: 'một bé mèo cầm súng. vậy là đủ.' },
            voice: {
                en: 'i play the bird because he looks confused. same, little guy.',
                vi: 'mình chơi bé chim vì nó trông ngơ ngác. giống mình ghê, bé ơi.'
            },
            note: { en: 'no handle — my cat does not need a username.', vi: 'không có tài khoản — bé mèo của mình đâu cần tên người dùng.' },
            art: { src: steamHeader('1217060'), mode: 'banner' }
        },
        {
            id: 'drg',
            name: { en: 'Deep Rock Galactic', vi: 'Deep Rock Galactic' },
            platform: 'steam // 548430',
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            sub: { en: 'co-op mining · rock and stone', vi: 'đào mỏ co-op · đá và đá' },
            flavour: { en: 'rock and stone, or you ain\'t coming home.', vi: 'rock and stone, không thì đừng về nhà.' },
            voice: {
                en: 'i press V every ten seconds. it is a reflex now.',
                vi: 'mười giây mình bấm V một lần. thành phản xạ rồi.'
            },
            note: { en: 'no handle — the dwarves already know my voice.', vi: 'không có tài khoản — mấy chú lùn nhận ra giọng mình rồi.' },
            art: { src: steamHeader('548430'), mode: 'banner' }
        },
        {
            id: 'meccachameleon',
            name: { en: 'MECCHA CHAMELEON', vi: 'MECCHA CHAMELEON' },
            platform: 'steam // 4704690',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'hide and seek · blend into the paint', vi: 'trốn tìm · hòa vào lớp sơn' },
            flavour: { en: 'become the wall. be the wall.', vi: 'hóa thành bức tường. làm bức tường đi.' },
            voice: {
                en: 'i am a very convincing lamp. nobody has found me yet. it is lonely.',
                vi: 'mình là một cái đèn rất thuyết phục. chưa ai tìm ra mình. hơi cô đơn.'
            },
            note: { en: 'no handle — you have to find me first.', vi: 'không có tài khoản — tìm ra mình trước đã.' },
            art: {
                src: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/163e2a742e5fb8e1f5d1e3a890da98f04ab809d4/header.jpg?t=1789464996',
                mode: 'banner'
            }
        },
        {
            id: 'musedash',
            name: { en: 'Muse Dash', vi: 'Muse Dash' },
            platform: 'steam // 774171',
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            sub: { en: 'rhythm · run, jump, tap', vi: 'nhịp điệu · chạy, nhảy, bấm' },
            flavour: { en: 'pastel colours, brutal timing.', vi: 'màu pastel, canh nhịp tàn nhẫn.' },
            voice: {
                en: 'it is so cute that i forget it is also extremely hard.',
                vi: 'nó dễ thương tới mức mình quên mất nó cũng cực kỳ khó.'
            },
            note: { en: 'no handle — the girls do not need my name.', vi: 'không có tài khoản — mấy bé gái đâu cần tên mình.' },
            art: { src: steamHeader('774171'), mode: 'banner' }
        },
        {
            id: 'superanimalroyale',
            name: { en: 'Super Animal Royale', vi: 'Super Animal Royale' },
            platform: 'steam // 843380',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'battle royale · tiny animals, big guns', vi: 'battle royale · thú nhỏ, súng to' },
            flavour: { en: 'a fox with a rifle. i am the fox.', vi: 'một bé cáo cầm súng. mình là bé cáo đó.' },
            voice: {
                en: 'i hide in a bush the entire match and i am not ashamed.',
                vi: 'mình trốn trong bụi cả ván và mình không thấy xấu hổ.'
            },
            note: { en: 'no handle — the bush is my address.', vi: 'không có tài khoản — bụi cây là địa chỉ của mình.' },
            art: { src: steamHeader('843380'), mode: 'banner' }
        },
        {
            id: 'amongus',
            name: { en: 'Among Us', vi: 'Among Us' },
            platform: 'steam // 945360',
            rank: 'library',
            rankLabel: { en: 'library', vi: 'thư viện' },
            sub: { en: 'social deduction · trust nobody', vi: 'suy luận xã hội · đừng tin ai' },
            flavour: { en: 'i was in electrical. i swear.', vi: 'mình ở phòng điện mà. mình thề.' },
            voice: {
                en: 'i am a terrible liar and an even worse crewmate.',
                vi: 'mình nói dối dở lắm mà làm crewmate còn dở hơn.'
            },
            note: { en: 'no handle — the impostor does not need my name.', vi: 'không có tài khoản — kẻ giả mạo đâu cần tên mình.' },
            art: { src: steamHeader('945360'), mode: 'banner' }
        },
        {
            id: 'devour',
            name: { en: 'DEVOUR', vi: 'DEVOUR' },
            platform: 'steam // 1274570',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op horror · burn the goats', vi: 'kinh dị co-op · đốt mấy con dê' },
            flavour: { en: 'do not look at her. do not look.', vi: 'đừng nhìn bà ta. đừng nhìn.' },
            voice: {
                en: 'i carry the fuel. i also scream the whole time.',
                vi: 'mình cầm bình xăng. mà mình cũng hét suốt.'
            },
            note: { en: 'no handle — the ritual does not need a username.', vi: 'không có tài khoản — nghi lễ đâu cần tên người dùng.' },
            art: { src: steamHeader('1274570'), mode: 'banner' }
        },
        {
            id: 'changed',
            name: { en: 'Changed', vi: 'Changed' },
            platform: 'steam // 814540',
            rank: 'library',
            rankLabel: { en: 'library', vi: 'thư viện' },
            sub: { en: 'puzzle · escape the facility', vi: 'giải đố · thoát khỏi cơ sở' },
            flavour: { en: 'a strange place, a stranger body.', vi: 'một nơi lạ, một cơ thể lạ.' },
            voice: {
                en: 'i solve the puzzles and then apologise to everyone i meet.',
                vi: 'mình giải đố xong rồi xin lỗi tất cả những ai mình gặp.'
            },
            note: { en: 'no handle — the facility keeps its own records.', vi: 'không có tài khoản — cơ sở tự lưu hồ sơ riêng.' },
            art: { src: steamHeader('814540'), mode: 'banner' }
        },
        {
            id: 'deadisland2',
            name: { en: 'Dead Island 2', vi: 'Dead Island 2' },
            platform: 'steam // 934700',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'zombie action · hello, LA', vi: 'hành động zombie · chào LA' },
            flavour: { en: 'the apocalypse, but make it sunny.', vi: 'tận thế, nhưng mà nắng đẹp.' },
            voice: {
                en: 'i use a fire axe and i am having a lovely time, actually.',
                vi: 'mình dùng rìu cứu hỏa và thật ra mình đang rất vui.'
            },
            note: { en: 'no handle — the zombies do not check usernames.', vi: 'không có tài khoản — zombie đâu có kiểm tra tên người dùng.' },
            art: { src: steamHeader('934700'), mode: 'banner' }
        },
        {
            id: 'partyanimals',
            name: { en: 'Party Animals', vi: 'Party Animals' },
            platform: 'steam // 1260320',
            rank: 'regular',
            rankLabel: { en: 'regular', vi: 'thường xuyên' },
            sub: { en: 'party brawler · floppy physics', vi: 'đánh nhau tiệc tùng · vật lý mềm nhũn' },
            flavour: { en: 'a puppy with a hammer. chaos.', vi: 'một bé cún cầm búa. hỗn loạn.' },
            voice: {
                en: 'i laugh so hard i forget to actually play the game.',
                vi: 'mình cười tới mức quên chơi game luôn.'
            },
            note: { en: 'no handle — you will hear me laughing anyway.', vi: 'không có tài khoản — kiểu gì cũng nghe mình cười.' },
            art: { src: steamHeader('1260320'), mode: 'banner' }
        },
        {
            id: 'contentwarning',
            name: { en: 'Content Warning', vi: 'Content Warning' },
            platform: 'steam // 2881650',
            rank: 'rotation',
            rankLabel: { en: 'on rotation', vi: 'xoay vòng' },
            sub: { en: 'co-op horror · film it or it didn\'t happen', vi: 'kinh dị co-op · quay lại không thì không tính' },
            flavour: { en: 'views are nice. surviving is nicer.', vi: 'nhiều view thì tốt. sống sót thì tốt hơn.' },
            voice: {
                en: 'i hold the camera and narrate. my narration is mostly screaming.',
                vi: 'mình cầm máy quay và bình luận. bình luận của mình chủ yếu là hét.'
            },
            note: { en: 'no handle — the footage is enough.', vi: 'không có tài khoản — có cảnh quay là đủ.' },
            art: { src: steamHeader('2881650'), mode: 'banner' }
        }
    ];

    /* The five account cards are badged, not floated; the twenty-two Steam
       games are the floating field. Splitting them here is what lets the two
       groups have different layouts without either knowing about the other. */
    const HANDLES = DECK.filter((g) => !!g.handle);
    const GAMES = DECK.filter((g) => !g.handle);

    /* -----------------------------------------------------------------------
       The slots — six loose rows for the twenty-two Steam games
       --------------------------------------------------------------------- */
    /* x/y/w are percentages of the stage, so the composition survives any
       desktop width; rot/z/drift are hand-tuned per card so no two neighbours
       share a line or a speed. The order is the order GAMES is rendered in.
       Rows run 4 / 4 / 4 / 4 / 3 / 3, which is 22. */
    const GAME_SLOTS = [
        /* row 1 — 4 */
        { x: 1,    y: 0,  w: 21.4, rot: -1.6, z: 6,  dx: 6, dy: -8,  dur: 13, delay: -2 },
        { x: 24,   y: 1,  w: 20.8, rot: 1.4,  z: 8,  dx: 5, dy: -7,  dur: 15, delay: -5 },
        { x: 47,   y: 0,  w: 21.6, rot: -1.1, z: 4,  dx: 8, dy: -9,  dur: 12, delay: -1 },
        { x: 70,   y: 1,  w: 21.2, rot: 1.8,  z: 7,  dx: 6, dy: -6,  dur: 16, delay: -7 },
        /* row 2 — 4 */
        { x: 6,    y: 17, w: 21.0, rot: 1.2,  z: 9,  dx: 7, dy: -6,  dur: 12, delay: -4 },
        { x: 29,   y: 18, w: 21.6, rot: -1.7, z: 3,  dx: 5, dy: -9,  dur: 15, delay: -8 },
        { x: 52,   y: 17, w: 20.8, rot: 1.0,  z: 10, dx: 9, dy: -7,  dur: 13, delay: -2 },
        { x: 75,   y: 18, w: 21.4, rot: -1.4, z: 6,  dx: 6, dy: -8,  dur: 16, delay: -6 },
        /* row 3 — 4 */
        { x: 1,    y: 34, w: 21.2, rot: -1.3, z: 7,  dx: 7, dy: -9,  dur: 14, delay: -5 },
        { x: 24,   y: 35, w: 21.6, rot: 1.6,  z: 5,  dx: 5, dy: -7,  dur: 13, delay: -2 },
        { x: 47,   y: 34, w: 21.0, rot: -1.8, z: 9,  dx: 8, dy: -6,  dur: 16, delay: -9 },
        { x: 70,   y: 35, w: 21.4, rot: 1.1,  z: 3,  dx: 6, dy: -10, dur: 12, delay: -4 },
        /* row 4 — 4 */
        { x: 6,    y: 51, w: 21.6, rot: -1.5, z: 8,  dx: 5, dy: -8,  dur: 15, delay: -7 },
        { x: 29,   y: 52, w: 20.8, rot: 1.7,  z: 4,  dx: 7, dy: -6,  dur: 11, delay: -3 },
        { x: 52,   y: 51, w: 21.2, rot: -1.2, z: 10, dx: 5, dy: -9,  dur: 14, delay: -6 },
        { x: 75,   y: 52, w: 21.4, rot: 1.5,  z: 6,  dx: 8, dy: -7,  dur: 16, delay: -1 },
        /* row 5 — 3, centred */
        { x: 14.5, y: 68, w: 21.4, rot: 1.2,  z: 5,  dx: 6, dy: -8,  dur: 13, delay: -8 },
        { x: 39.5, y: 69, w: 21.0, rot: -1.6, z: 9,  dx: 5, dy: -6,  dur: 15, delay: -4 },
        { x: 64.5, y: 68, w: 21.6, rot: 1.4,  z: 3,  dx: 7, dy: -10, dur: 12, delay: -2 },
        /* row 6 — 3, centred */
        { x: 14.5, y: 85, w: 21.2, rot: -1.4, z: 7,  dx: 6, dy: -7,  dur: 14, delay: -5 },
        { x: 39.5, y: 86, w: 21.6, rot: 1.3,  z: 4,  dx: 5, dy: -9,  dur: 13, delay: -1 },
        { x: 64.5, y: 85, w: 20.8, rot: -1.1, z: 8,  dx: 8, dy: -6,  dur: 15, delay: -6 }
    ];

    /* -----------------------------------------------------------------------
       Small helpers
       --------------------------------------------------------------------- */
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    /* Both languages, always, in that order. Every prose string on this tab
       goes through here so there is exactly one way to be bilingual and no
       way to forget. */
    const bi = (pair, cls = '') => `<span${cls ? ` class="${cls}"` : ''}>`
        + `<span lang="en">${esc(pair.en)}</span>`
        + `<span lang="vi">${esc(pair.vi)}</span></span>`;

    async function fetchJSON(url, opts, ms = 6500) {
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : 0;
        try {
            const res = await fetch(url, Object.assign({
                signal: ctrl ? ctrl.signal : undefined,
                credentials: 'omit',
                mode: 'cors'
            }, opts || {}));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /* -----------------------------------------------------------------------
       The render
       --------------------------------------------------------------------- */
    /* A game card is: an outer box (perspective + lift) → a tilt plane → the
       picture, a dark fade, and the name. There is no flip plane and no second
       face, because there is nothing to reveal: the card is the game and its
       name, and that is the whole object. */
    function gameMarkup(g, i) {
        const slot = GAME_SLOTS[i] || {};

        const style = `--x:${slot.x ?? 0}%;--y:${slot.y ?? 0}%;--w:${slot.w ?? 16}%;`
            + `--rot:${slot.rot ?? 0}deg;--z:${slot.z ?? 1};--dx:${slot.dx ?? 6}px;`
            + `--dy:${slot.dy ?? -8}px;--dur:${slot.dur ?? 12}s;--delay:${slot.delay ?? 0}s;`
            /* The sway is derived from the card's resting rotation, so it
               leans the way the card is already printed; a card at rest at
               -3deg drifts with a -1deg sway rather than against its tilt. */
            + `--sway:${((slot.rot ?? 0) / 3).toFixed(2)}deg`;

        /* One picture, one fade, one name. No rank, serial, platform code,
           flavour line or flip: those were a database view of a game, and this
           card is meant to be a poster of it. */
        return `
        <div class="float-card" role="listitem" data-slot="${i}" style="${style}">
        <div class="float-drift">
        <div class="game-card" data-game="${g.id}" style="--i:${i}">
          <div class="gc-tilt">
            <span class="gcard-art" data-art>
              <img alt="" decoding="async" loading="lazy">
            </span>
            <span class="gcard-shade" aria-hidden="true"></span>
            <span class="gcard-name">${esc(g.name.en)}</span>
          </div>
        </div>
        </div>
        </div>`;
    }

    /* The badge for one of the five real accounts. Deliberately a different
       object from a trading card: flat, pinned, landscape, with no tilt, drift
       or flip. The game's own wordmark sits on the plate, the name is set big
       beneath it, and the handle is the largest line on the badge. */
    function handleCardMarkup(g, i) {
        const accents = ['cyan', 'gold', 'magenta', 'cyan', 'gold'];
        const accent = accents[i] || 'cyan';
        const copyLabel = g.copyValue
            ? { en: 'copy link', vi: 'chép liên kết' }
            : { en: 'copy handle', vi: 'chép tài khoản' };
        return `
        <article class="handle-card" role="listitem" data-game="${g.id}"
                 data-accent="${accent}" style="--i:${i}">
          <div class="hc-main">
            <span class="hc-logo" data-art>
              <img alt="" decoding="async" loading="lazy">
            </span>
          </div>
          <span class="hc-name">${esc(g.name.en)}</span>
          <span class="hc-handle" data-handle>${handleMarkup(g.handle)}</span>
          <button class="gc-copy" type="button" data-copy
                  aria-label="Copy ${esc(g.copyValue || g.handle)}">
            <i class="far fa-copy" aria-hidden="true"></i>
            <span class="gc-copy-label">${bi(copyLabel)}</span>
          </button>
        </article>`;
    }

    /* `Cobbi#GRRR` — the discriminator is the part you actually paste, so it
       gets the accent and the rack number treatment, not the body colour. */
    function handleMarkup(handle) {
        const i = handle.indexOf('#');
        if (i < 0) return `<span class="gc-handle-main">${esc(handle)}</span>`;
        return `<span class="gc-handle-main">${esc(handle.slice(0, i))}</span>`
            + `<span class="gc-handle-tag"><i>#</i>${esc(handle.slice(i + 1))}</span>`;
    }

    handleDeck.innerHTML = HANDLES.map(handleCardMarkup).join('');
    deck.innerHTML = GAMES.map(gameMarkup).join('');

    const cards = Array.from(deck.querySelectorAll('.game-card'));
    const handleCards = Array.from(handleDeck.querySelectorAll('.handle-card'));
    const allCards = handleCards.concat(cards);
    const byId = new Map(DECK.map((g) => [g.id, g]));

    /* Art is written straight after the markup, before paint. The <img> has no
       src until now, so the browser never gets the chance to show a broken
       icon — and `data-art-state` is what the verification harness reads. */
    allCards.forEach((cardEl) => {
        const g = byId.get(cardEl.dataset.game);
        const holder = cardEl.querySelector('[data-art]');
        const img = holder.querySelector('img');
        img.addEventListener('load', () => { holder.dataset.artState = 'loaded'; });
        img.addEventListener('error', () => {
            /* No broken frame, ever: the window keeps its tint and its
               registration marks and gains a mono monogram instead. */
            holder.dataset.artState = 'error';
            holder.classList.add('is-missing');
            /* Two initials from the title, not the platform: fifteen cards all
               reading "STEAM" would look like one broken template. */
            const initials = (g.name.en.match(/[A-Za-z0-9]/g) || ['?']).slice(0, 2).join('').toUpperCase();
            holder.style.setProperty('--mono-mark', `"${initials}"`);
        });
        /* A badge carries the game's wordmark; a game card carries its art. */
        const isBadge = cardEl.classList.contains('handle-card');
        img.src = isBadge ? (g.logo?.src || g.art.src) : g.art.src;

        /* The sigil is a small icon, not a hero: it is set from the verified
           fallback immediately so it is never an empty box, and the live patch
           upgrade only ever swaps it for the same champion's current icon. */
        const sigil = cardEl.querySelector('[data-sigil]');
        if (sigil && g.sigil) {
            const si = sigil.querySelector('img');
            if (si) {
                si.src = g.sigil.src;
                sigil.title = g.sigil.label;
            }
        }
    });

    /* -----------------------------------------------------------------------
       Live upgrade
       --------------------------------------------------------------------- */
    /* Three independent requests, each one allowed to fail alone. Nothing is
       awaited before the shelf is usable: this runs after the cards are on
       screen and only ever replaces a URL that already works. */
    function upgradeArt(id, url) {
        const cardEl = allCards.find((c) => c.dataset.game === id);
        if (!cardEl || !url) return;
        /* A badge shows the game's wordmark. The live APIs answer with an
           avatar or an agent bust, so upgrading a badge would replace a logo
           with a picture of a person — never do that. */
        if (cardEl.classList.contains('handle-card')) return;
        const holder = cardEl.querySelector('[data-art]');
        const img = holder.querySelector('img');
        if (!img || img.getAttribute('src') === url) return;
        img.src = url;
    }

    function setSub(id, pair) {
        const cardEl = allCards.find((c) => c.dataset.game === id);
        if (!cardEl || !pair) return;
        const el = cardEl.querySelector('[data-sub]');
        if (el) el.innerHTML = bi(pair);
    }

    function setSigil(id, url, label) {
        const cardEl = allCards.find((c) => c.dataset.game === id);
        if (!cardEl) return;
        const holder = cardEl.querySelector('[data-sigil]');
        if (!holder) return;
        const img = holder.querySelector('img');
        if (!img) return;
        if (url) img.src = url;
        if (label) holder.title = label;
    }

    /* Only the squad lead's version-list changes between patches, so the icon
       URL is rebuilt from the live patch rather than cached in the file. */
    (async () => {
        try {
            const versions = await fetchJSON(DDRAGON + 'api/versions.json', {}, 5000);
            const v = Array.isArray(versions) && versions[0] ? String(versions[0]).replace(/[^0-9.]/g, '') : '';
            if (!v) return;
            setSigil('league', `${DDRAGON}cdn/${v}/img/champion/Warwick.png`);
        } catch (err) { /* the fallback sigil is already on the card */ }
    })();

    (async () => {
        try {
            const json = await fetchJSON(VALORANT_AGENTS, {}, 6000);
            const agents = Array.isArray(json?.data) ? json.data : [];
            const agent = agents.find((a) => a.displayName === 'Fade') || agents[0];
            if (!agent) return;
            if (agent.displayIcon) upgradeArt('valorant', agent.displayIcon);
            const role = agent.role?.displayName || '';
            if (role) {
                /* The role is a real field from the same response, so the card
                   can say what she actually does instead of guessing. */
                allCards.find((c) => c.dataset.game === 'valorant')
                    ?.style.setProperty('--role', '1');
                setSub('valorant', {
                    en: `${(agent.displayName || 'Fade').toLowerCase()} — ${role.toLowerCase()}. i hunt with hounds.`,
                    vi: `${(agent.displayName || 'Fade').toLowerCase()} — ${role === 'Initiator' ? 'mở đường' : role.toLowerCase()}. mình đi săn cùng mấy bé chó.`
                });
            }
        } catch (err) { /* keep the verified fallback art and copy */ }
    })();

    /* Roblox is the one card with a real date on it, so the date is read
       rather than typed. The POST that resolves the username is not used here:
       the id is already known and verified, and one GET is cheaper than two. */
    (async () => {
        try {
            const [user, thumb] = await Promise.all([
                fetchJSON(RBX_USER, {}, 6000),
                fetchJSON(RBX_THUMB, {}, 6000)
            ]);
            const created = user?.created ? new Date(user.created) : null;
            const year = created && !isNaN(created.valueOf()) ? created.getUTCFullYear() : null;
            const shown = user?.displayName || '';
            if (year) {
                setSub('roblox', {
                    en: `shown as ${shown || 'Cobbyyy'} · since ${year}`,
                    vi: `hiển thị là ${shown || 'Cobbyyy'} · từ ${year}`
                });
            }
            const url = thumb?.data?.[0]?.imageUrl;
            if (url) upgradeArt('roblox', url);
        } catch (err) { /* the verified headshot and "since 2017" stay */ }
    })();

    /* -----------------------------------------------------------------------
       The light — pointer tilt, spring damped, one shared rAF
       --------------------------------------------------------------------- */
    /* A holographic card is only convincing if the light moves *with* the card
       rather than on a timer under it. So: no idle animation at all here. At
       rest the deck is completely still; the tilt exists only while a pointer
       is on a card, and it is the same frame that drives the foil's specular
       band and the face glare.

       Everything is written as custom properties, which is what lets the CSS
       own the composition (`rotateX(var(--rx)) …`) while this file owns only
       the numbers. */
    const MAX_TILT = 10;          /* degrees, as specified */
    const STIFF = 0.17;           /* spring pull toward the target */
    const DAMP = 0.74;            /* velocity bleed — under 1, so it settles */

    const motionAllowed = () => !perfReduced();
    const tiltOn = () => motionAllowed() && canHover();

    const springs = new Map();    /* cardEl → spring state */
    let raf = 0;

    function springFor(cardEl) {
        let s = springs.get(cardEl);
        if (!s) {
            s = { rx: 0, ry: 0, vx: 0, vy: 0, tx: 0, ty: 0, mx: 0.5, my: 0.5, tmx: 0.5, tmy: 0.5, hot: false };
            springs.set(cardEl, s);
        }
        return s;
    }

    function frame() {
        raf = 0;
        let alive = false;

        springs.forEach((s, cardEl) => {
            s.vx = (s.vx + (s.tx - s.rx) * STIFF) * DAMP;
            s.vy = (s.vy + (s.ty - s.ry) * STIFF) * DAMP;
            s.rx += s.vx;
            s.ry += s.vy;

            /* The glare is not on a spring: a reflection does not have mass,
               it snaps to where the eye expects the light to be. */
            s.mx += (s.tmx - s.mx) * 0.22;
            s.my += (s.tmy - s.my) * 0.22;

            const tilt = cardEl.querySelector('.gc-tilt');
            if (tilt) {
                tilt.style.setProperty('--rx', `${s.rx.toFixed(3)}deg`);
                tilt.style.setProperty('--ry', `${s.ry.toFixed(3)}deg`);
            }
            cardEl.style.setProperty('--mx', s.mx.toFixed(4));
            cardEl.style.setProperty('--my', s.my.toFixed(4));

            const settled = !s.hot
                && Math.abs(s.tx - s.rx) < 0.015 && Math.abs(s.vx) < 0.02
                && Math.abs(s.ty - s.ry) < 0.015 && Math.abs(s.vy) < 0.02
                && Math.abs(s.tmx - s.mx) < 0.002 && Math.abs(s.tmy - s.my) < 0.002;

            if (settled) {
                /* Land exactly on rest so nothing is left a third of a degree
                   off, which is visible as a slanted hairline on a 1px edge. */
                if (tilt) {
                    tilt.style.setProperty('--rx', '0deg');
                    tilt.style.setProperty('--ry', '0deg');
                }
                cardEl.style.removeProperty('--mx');
                cardEl.style.removeProperty('--my');
                springs.delete(cardEl);
            } else {
                alive = true;
            }
        });

        if (alive) raf = requestAnimationFrame(frame);
    }

    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    function trackPointer(cardEl, ev) {
        if (!tiltOn()) return;
        const s = springFor(cardEl);
        const r = cardEl.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const mx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        const my = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        s.tmx = mx;
        s.tmy = my;
        /* Tip away from the pointer, the way a card held by its far edge
           tips: the corner nearest the eye comes toward you. */
        s.ty = (mx - 0.5) * 2 * MAX_TILT;
        s.tx = -(my - 0.5) * 2 * MAX_TILT;
        s.hot = true;
        wake();
    }

    function releasePointer(cardEl) {
        const s = springs.get(cardEl);
        if (!s) return;
        s.hot = false;
        s.tx = 0;
        s.ty = 0;
        s.tmx = 0.5;
        s.tmy = 0.5;
        wake();
    }

    if (canHover()) {
        deck.addEventListener('pointermove', (ev) => {
            const cardEl = ev.target.closest?.('.game-card');
            if (!cardEl || !deck.contains(cardEl)) return;
            if (ev.pointerType === 'touch') return;
            trackPointer(cardEl, ev);
        }, { passive: true });

        deck.addEventListener('pointerout', (ev) => {
            const cardEl = ev.target.closest?.('.game-card');
            if (!cardEl) return;
            /* `pointerout` also fires moving between children; only a real
               exit counts. */
            if (ev.relatedTarget && cardEl.contains(ev.relatedTarget)) return;
            releasePointer(cardEl);
        }, { passive: true });

        /* A keyboard visitor gets no tilt, and a card left mid-tilt because
           the pointer went out of the window must unwind. */
        window.addEventListener('blur', () => {
            springs.forEach((s, cardEl) => releasePointer(cardEl));
        });
    }

    /* -----------------------------------------------------------------------
       The live region
       --------------------------------------------------------------------- */
    /* The game cards no longer flip, but the badge copy key still announces
       its result. One polite live region is enough for the tab. */
    const live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panel.appendChild(live);
    const announce = (msg) => { live.textContent = msg; };

    /* -----------------------------------------------------------------------
       The copy
       --------------------------------------------------------------------- */
    /* Same copied affordance main.js uses (gold, two seconds, icon becomes a
       tick), plus the two things that one is missing: a fallback for browsers
       where `navigator.clipboard` is refused, and an honest message when even
       that fails.

       `navigator.clipboard.writeText` rejects on plain http, in an iframe
       without the permission, and in some headless configurations. A rejection
       is not a failure of the copy — it is a signal to use the old path, so the
       two are chained rather than one being a pre-check. `isSecureContext` is
       deliberately NOT used as the gate: localhost is a secure context and a
       file:// page is not, and either can still be denied at call time. */
    function legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.setAttribute('aria-hidden', 'true');
        /* Inside the viewport but invisible: Safari and Firefox refuse to
           select a textarea positioned off-screen, and `display: none` cannot
           be selected at all. */
        ta.style.cssText = 'position:fixed;top:50%;left:50%;width:1px;height:1px;'
            + 'padding:0;border:0;opacity:0;font-size:1px;z-index:-1';
        document.body.appendChild(ta);
        try {
            ta.focus({ preventScroll: true });
            ta.select();
            ta.setSelectionRange(0, text.length);
            const ok = document.execCommand('copy');
            if (!ok) throw new Error('execCommand returned false');
            return true;
        } finally {
            document.body.removeChild(ta);
        }
    }

    function copyText(text) {
        const legacy = () => {
            try {
                return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error('copy refused'));
            } catch (err) { return Promise.reject(err); }
        };
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return legacy();
        return navigator.clipboard.writeText(text).catch(legacy);
    }

    let copyTimer = 0;
    /* The copy key is the one interaction the badge rack and the card field
       share, so the handler is one function bound to both containers. */
    const onCopy = (ev) => {
        const btn = ev.target.closest('[data-copy]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();

        const cardEl = btn.closest('[data-game]');
        const g = byId.get(cardEl?.dataset.game);
        if (!g) return;
        const value = g.copyValue || g.handle;

        copyText(value).then(() => {
            btn.classList.add('copied');
            const icon = btn.querySelector('i');
            const prev = icon?.className;
            if (icon) icon.className = 'fas fa-check';
            announce(`copied ${value}`);
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                btn.classList.remove('copied');
                if (icon && prev) icon.className = prev;
            }, 2000);
        }).catch(() => {
            /* Never a silent no-op: a stranger would just think the card is
               broken. main.js's toast is the site's one failure channel. */
            if (typeof window.showToast === 'function') window.showToast(`could not copy — it is “${value}”`);
            else announce(`could not copy. it is ${value}`);
        });
    };
    deck.addEventListener('click', onCopy);
    handleDeck.addEventListener('click', onCopy);

    /* -----------------------------------------------------------------------
       The reveal — stagger in, once, on first sight
       --------------------------------------------------------------------- */
    /* The panel is `display: none` until `switchTab` adds `.active`, and
       `switchTab` also re-runs its own panel-in animation on every switch.
       Restarting five cards every time would turn an entrance into a tic, so
       this fires exactly once.

       There is a trap in "once" that is easy to miss: taking an element out of
       `display: none` restarts its CSS animations, so leaving the tab and
       coming back would replay the stagger even though this function never runs
       again. The fix is to *remove* the triggering class once the entrance has
       finished, which leaves the cards in their plain, visible resting state.

       The pending state is added after the cards exist and in the same task, so
       it can never survive a script that dies: worst case the CSS never sees
       `.is-pending` and the cards are simply already there. */
    const staggerOn = () => motionAllowed() && perfLevel() >= 1 && !reducedMQ.matches;
    let revealed = false;

    function endEntrance() {
        deck.classList.remove('is-in');
        handleDeck.classList.remove('is-in');
    }

    function reveal() {
        if (revealed) return;
        revealed = true;
        deck.classList.remove('is-pending');
        handleDeck.classList.remove('is-pending');
        if (staggerOn()) {
            deck.classList.add('is-in');
            handleDeck.classList.add('is-in');
            /* The badges land first (48ms apart), then the fifteen game cards
               follow at 52ms. The listener is the authority; the timer is a
               floor in case `animationend` never arrives (it does not fire
               when the element is display:none when the animation would have
               ended). */
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                deck.removeEventListener('animationend', onEnd);
                handleDeck.removeEventListener('animationend', onEnd);
                endEntrance();
            };
            const onEnd = (ev) => {
                if (ev.target.closest?.('.game-card, .handle-card')) finish();
            };
            deck.addEventListener('animationend', onEnd);
            handleDeck.addEventListener('animationend', onEnd);
            setTimeout(finish, 2600);
        }
    }

    if (staggerOn()) {
        deck.classList.add('is-pending');
        handleDeck.classList.add('is-pending');
    }

    if (panel.classList.contains('active')) {
        reveal();
    } else {
        /* MutationObserver on the class attribute is the contract the task
           names, and it is the only signal that fires for *any* caller of
           switchTab. The dock click is a belt-and-braces second trigger for
           the one path a visitor can actually take. */
        if (typeof MutationObserver === 'function') {
            const mo = new MutationObserver(() => {
                if (panel.classList.contains('active')) reveal();
            });
            mo.observe(panel, { attributes: true, attributeFilter: ['class'] });
        }
        document.getElementById('tab-btn-gaming')?.addEventListener('click', reveal);
    }

    /* A viewport change re-lays the field; the springs hold degrees, not
       pixels, so nothing needs recomputing, but a card caught mid-tilt while
       the window is resized should unwind. */
    window.addEventListener('resize', () => {
        springs.forEach((s, cardEl) => releasePointer(cardEl));
    }, { passive: true });

    /* Debug/verification handle. Read-only, and small: the harness needs to
       assert the deck's real state without scraping markup. */
    window.CobbyShelf = {
        get cards() { return cards.length; },
        get handles() { return handleCards.length; },
        get pending() { return deck.classList.contains('is-pending'); },
        get revealed() { return revealed; },
        get artStates() {
            return allCards.map((c) => ({
                game: c.dataset.game,
                state: c.querySelector('[data-art]')?.dataset.artState || 'pending',
                src: c.querySelector('[data-art] img')?.currentSrc || ''
            }));
        },
        trimsMotion: perfTrims
    };
})();
