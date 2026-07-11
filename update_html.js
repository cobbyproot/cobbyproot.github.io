const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// For upcoming items, remove the event-image-grid entirely
html = html.replace(/(<div class="roadmap-item upcoming">[\s\S]*?)<div class="event-image-grid">[\s\S]*?<\/div>\s*(<\/div>\s*<\/div>)/g, '$1$2');

// For past items, replace grid with a single image container
const singleImg = '<div class="event-image-container">\n                                        <div class="event-image-placeholder" style="aspect-ratio: 16/9; max-height: 250px; width: 100%;"><i class="fas fa-image"></i> <span style="margin-left: 8px;">Add photo</span></div>\n                                    </div>';
html = html.replace(/<div class="event-image-grid">[\s\S]*?<\/div>/g, singleImg);

fs.writeFileSync('index.html', html);
console.log("Updated index.html");
