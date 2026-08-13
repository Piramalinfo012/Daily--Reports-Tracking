const fs = require('fs');
const path = require('path');

const mdReportPath = path.join(__dirname, 'src', 'pages', 'MDReport.tsx');
let mdContent = fs.readFileSync(mdReportPath, 'utf8');
mdContent = mdContent.replace('key={e.id}', 'key={e._id}');
fs.writeFileSync(mdReportPath, mdContent, 'utf8');

const dailyTrackerPath = path.join(__dirname, 'src', 'pages', 'DailyTracker.tsx');
let dtContent = fs.readFileSync(dailyTrackerPath, 'utf8');
dtContent = dtContent.replace('key={p.id}', 'key={p._id}');
fs.writeFileSync(dailyTrackerPath, dtContent, 'utf8');

console.log('Keys fixed');
