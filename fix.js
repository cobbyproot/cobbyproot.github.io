const fs = require('fs');

const original = fs.readFileSync('d:/Down/CardSite/index.html', 'utf8');

// The file has a valid top part from <!DOCTYPE html> until <div class="term-line"><span class="term-prompt">&gt;</span> <span class="term-text text-green" id="term-typed-2"></span><span class="term-blinking-cursor" id="term-cursor-2" style="display:none;">█</span></div>
// Let's just find that part.
const topPartEndStr = '<div class="term-line"><span class="term-prompt">&gt;</span> <span class="term-text text-green" id="term-typed-2"></span><span class="term-blinking-cursor" id="term-cursor-2" style="display:none;">█</span></div>\n                    </div>\n                </div>';

const idx1 = original.indexOf(topPartEndStr);

// The valid bottom part starts with <div class="scroll-hint"><i class="fas fa-chevron-down"></i></div>
const bottomPartStartStr = '            <div class="scroll-hint"><i class="fas fa-chevron-down"></i></div>\n        </header>';
const idx2 = original.lastIndexOf(bottomPartStartStr);

if (idx1 !== -1 && idx2 !== -1) {
    const topPart = original.substring(0, idx1 + topPartEndStr.length);
    const bottomPart = original.substring(idx2);

    const middlePart = 

                <!-- Right Floating iOS Card Widget (Sleek Horizontal Rectangle Spotify Player Bar) -->
                <div class="ios-widget widget-right spotify-player-widget horizontal-bar">
                    <div class="spotify-bar-main">
                        <!-- Spinning Vinyl Album Art Disc -->
                        <div class="vinyl-container horizontal-disc">
                            <div class="vinyl-disc spinning" id="spotify-vinyl">
                                <div class="vinyl-center-hole"></div>
                                <img src="https://i.scdn.co/image/ab67616d0000b2734a742880d6b63a92543e49e2" alt="Album Cover" class="vinyl-cover" id="spotify-album-cover">
                            </div>
                        </div>

                        <!-- Track Info & Live Equalizer -->
                        <div class="spotify-bar-content">
                            <div class="spotify-bar-top">
                                <div class="spotify-badge">
                                    <i class="fab fa-spotify spotify-green-icon"></i>
                                    <span id="spotify-status-label">LISTENING TO</span>
                                </div>
                                <div class="equalizer-bars playing" id="spotify-equalizer">
                                    <span></span><span></span><span></span><span></span>
                                </div>
                            </div>

                            <div class="spotify-track-info left-align">
                                <div class="track-title" id="spotify-track-title">you</div>
                                <div class="track-artist" id="spotify-track-artist">hehe x3</div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Progress Fill -->
                    <div class="spotify-widget-footer">
                        <div class="spotify-progress-bar">
                            <div class="spotify-progress-fill" id="spotify-progress-fill" style="width: 45%;"></div>
                        </div>
                        <div class="spotify-time">
                            <span id="spotify-current-time">1:24</span>
                            <span id="spotify-total-time">3:10</span>
                        </div>
                    </div>
                </div>

                <!-- Floating 3D Social Orbit Bubbles with Constellation Connecting Lines -->
                <div class="socials-floating">
                    <a href="https://facebook.com/BasicallyCobby" target="_blank" class="social-btn float-bubble bubble-fb" data-sticky title="Facebook">
                        <i class="fab fa-facebook-f"></i>
                        <span class="bubble-tooltip">Facebook</span>
                    </a>
                    <a href="https://x.com/ItsJacobUwU" target="_blank" class="social-btn float-bubble bubble-tw" data-sticky title="Twitter / X">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span class="bubble-tooltip">Twitter / X</span>
                    </a>
                    <a href="https://discordapp.com/users/1119272682953900034" target="_blank" class="social-btn float-bubble bubble-dc" data-sticky title="Discord">
                        <i class="fab fa-discord"></i>
                        <span class="bubble-tooltip">Discord</span>
                    </a>
                    <a href="http://t.me/cobbyproto" target="_blank" class="social-btn float-bubble bubble-tg" data-sticky title="Telegram">
                        <i class="fab fa-telegram-plane"></i>
                        <span class="bubble-tooltip">Telegram</span>
                    </a>
                    <a href="https://bumpmaps.com/p/pCcKXGLJptihL" target="_blank" class="social-btn float-bubble bubble-bump" data-sticky title="Bump Maps">
                        <img src="https://static.amo.co/shared/images/app-icons/location/20250123-167x167.png" alt="Bump Maps" width="26" height="26" style="border-radius: 6px; object-fit: contain;">
                        <span class="bubble-tooltip">Bump Maps</span>
                    </a>
                    <a href="https://barq.app/@cobbyproto" target="_blank" class="social-btn float-bubble bubble-barq" data-sticky title="Barq">
                        <svg class="barq-icon" viewBox="0 0 408 360" width="28" height="25" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M384,47.6783738 L384,224.286416 C384,250.921324 362.438342,271.96479 336.001875,271.96479 L156.008906,271.96479 L64.5674717,330.067042 C47.9981251,342.14719 47.9981251,333.594447 47.9981251,323.799643 L47.9981251,271.96479 C21.5616577,271.96479 0,250.241284 0,224.286416 L0,47.6783738 C0,21.0434661 21.5616577,0 47.9981251,0 L335.986876,0 C363.075817,0 384,21.7235063 384,47.6783738 Z" fill="#FF6A00"></path>
                            <g transform="translate(24.500000, 98.586845)" fill="#FFFFFF">
                                <path d="M40.7784855,35.4203822 C43.9079972,35.4203822 49.12385,29.7777778 49.12385,21.9065817 C49.12385,11.3800425 38.9766454,2.03892427 25.1309271,2.03892427 L0,2.03892427 L0,78.4748762 L32.6227884,78.4748762 C47.9384289,78.4748762 58.0856334,67.2370842 58.0856334,55.1457891 C58.0856334,43.6234961 48.9341826,35.4203822 40.7784855,35.4203822 Z M32.1012031,25.5576787 C32.1012031,29.4932767 28.7820241,31.6744515 24.3722576,31.6744515 L19.5357396,31.6744515 L19.5357396,19.6779901 L24.5145081,19.6779901 C28.8768577,19.6779901 32.1012031,21.8591649 32.1012031,25.5576787 Z M29.5406936,60.029724 L19.5357396,60.029724 L19.5357396,45.5201699 L29.6829441,45.5675867 C35.4203822,45.5675867 38.6447275,48.2703468 38.6447275,52.7275301 C38.6447275,57.7537155 34.1875442,60.029724 29.5406936,60.029724 Z"></path>
                                <path d="M118.115357,78.4748762 L140.353857,78.4748762 L104.791224,1.0905874 L95.1656051,1.0905874 L59.6503892,78.4748762 L81.841472,78.4748762 L85.7296532,69.5605096 L114.274593,69.5605096 L118.115357,78.4748762 Z M92.1309271,54.7190375 L100.002123,36.6058033 L107.825902,54.7190375 L92.1309271,54.7190375 Z"></path>
                                <path d="M212.56971,78.4748762 L192.085633,47.7961783 C199.577495,44.3821656 205.314933,36.4161359 205.314933,26.8853503 C205.314933,13.1818825 193.508139,2.03892427 177.007077,2.03892427 L147.987969,2.03892427 L148.082803,78.4748762 L168.377212,78.4748762 L168.377212,45.2830856 L188.813871,78.4748762 L212.56971,78.4748762 Z M168.282378,20.2944091 L176.580326,20.2944091 C180.847841,20.2944091 184.830856,23.2342534 184.830856,27.9759377 C184.830856,32.6702052 180.895258,35.7048832 176.580326,35.6574664 L168.282378,35.6100495 L168.282378,20.2944091 Z"></path>
                                <path d="M300.765039,75.2031139 C294.600849,75.0608634 288.484076,74.3021939 283.268224,73.069356 C293.794763,65.9094126 300.480538,54.1500354 300.480538,40.3517339 C300.480538,17.4019816 282.27247,0 258.516631,0 C234.760793,0 216.552725,17.4019816 216.552725,40.3517339 C216.552725,63.1118188 234.713376,80.4189667 258.469214,80.4189667 C260.413305,80.4189667 262.309979,80.3241331 264.206653,80.0870488 C271.129512,86.5831564 279.996461,92.2731776 293.84218,93.2689314 L300.765039,75.2031139 Z M237.084218,40.2094834 C237.084218,28.4026893 246.377919,19.2986553 258.516631,19.2986553 C270.655343,19.2986553 279.949045,28.4026893 279.949045,40.2094834 C279.949045,51.9688606 270.655343,61.0254777 258.516631,61.0254777 C246.377919,61.0254777 237.084218,51.9688606 237.084218,40.2094834 Z"></path>
                                <path d="M314.705591,51.7791932 L331.53857,51.7791932 L334.810333,2.03892427 L311.291578,2.03892427 L314.705591,51.7791932 Z M323.145789,81.1776362 C329.59448,81.1776362 335,76.3411182 335,70.2243454 C335,64.2024062 329.59448,59.0339703 323.050955,59.0339703 C316.697098,59.0339703 311.291578,63.9179052 311.291578,69.9872611 C311.291578,76.1988677 316.649682,81.1776362 323.145789,81.1776362 Z"></path>
                            </g>
                        </svg>
                        <span class="bubble-tooltip">Barq</span>
                    </a>
                    <a href="https://www.tiktok.com/@cobbyproto" target="_blank" class="social-btn float-bubble bubble-tt" data-sticky title="TikTok">
                        <i class="fab fa-tiktok"></i>
                        <span class="bubble-tooltip">TikTok</span>
                    </a>
                </div>
            </div>
;
    
    fs.writeFileSync('d:/Down/CardSite/index.html', topPart + middlePart + bottomPart);
    console.log('Successfully reconstructed index.html');
} else {
    console.log('Failed to find markers!', idx1, idx2);
}
