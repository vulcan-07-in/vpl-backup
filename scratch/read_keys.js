const fs = require('fs');
const data = JSON.parse(fs.readFileSync('vpl_backup_2026-03-14T18-44-57-761Z.json', 'utf-8'));
console.log("Root keys in backup:", Object.keys(data).filter(k => !k.startsWith('live_match_')));
const matchKeys = Object.keys(data).filter(k => k.startsWith('live_match_'));
console.log("Match keys in backup:", matchKeys);
