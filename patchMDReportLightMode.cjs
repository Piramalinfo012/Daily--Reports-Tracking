const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The main tables in MDReport:
// "text-mist-100" -> "" (so it inherits body color)
// "text-mist-300" -> "opacity-80" (inherits body color but slightly lighter)
// "text-mist-400" -> "opacity-60" (inherits body color but even lighter)

content = content.replace(/text-mist-100/g, ''); // Let the default body color handle main text
content = content.replace(/text-mist-300/g, 'opacity-80'); 
content = content.replace(/text-mist-400/g, 'opacity-60 text-[11px] sm:text-xs'); 

// Table header colors
content = content.replace(/text-mist-500/g, 'opacity-50 text-[11px] font-semibold uppercase tracking-wide'); 

// Backgrounds
content = content.replace(/bg-ink-900\/50/g, 'glass'); 
content = content.replace(/bg-ink-800\/60/g, 'border-white/5'); 

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched MDReport light mode classes");
