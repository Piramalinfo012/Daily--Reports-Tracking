const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'UserManagement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The main card doesn't need to be changed because it uses Card which is glass
// But inside:
content = content.replace(/className="bg-ink-900\/50 p-4 rounded-xl border border-white\/5 mb-6 space-y-4"/g, 'className="glass p-4 rounded-xl mb-6 space-y-4"');
content = content.replace(/className="p-3 bg-ink-800\/40 border border-ink-700\/50 rounded-xl/g, 'className="p-3 glass rounded-xl');

// Dropdown styles
content = content.replace(/bg-ink-900 px-3 py-2 text-\[13px\] text-mist-100/g, 'bg-transparent px-3 py-2 text-[13px] text-inherit');

// Edit permissions box
content = content.replace(/className="bg-ink-900 p-2 rounded-lg border border-teal-500\/30/g, 'className="glass p-2 rounded-lg border border-teal-500/30');

// Small badges
content = content.replace(/className="text-\[10px\] bg-ink-700 text-mist-400 px-1\.5 py-0\.5 rounded"/g, 'className="text-[10px] bg-ink-700/20 text-inherit px-1.5 py-0.5 rounded"');

// Checkbox background
content = content.replace(/bg-ink-800 px-2/g, 'bg-ink-800/20 px-2');
content = content.replace(/bg-ink-950/g, 'bg-transparent');

// Hover effects
content = content.replace(/hover:bg-ink-800\/60/g, 'hover:bg-ink-800/10');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched light mode classes");
