const fs = require('fs');

const text = fs.readFileSync('raw_data.tsv', 'utf-8');
const lines = text.split('\n').filter(l => l.trim().length > 0);
const rows = lines.slice(1);

console.log("Retained players in raw_data.tsv:");
rows.forEach((row, idx) => {
    const parts = row.split('\t');
    if (parts.length >= 6) {
        const name = parts[1].trim();
        const retained = parts[5].trim();
        if (retained.toLowerCase() === 'yes') {
            console.log(` - Row ${idx + 1}: ${name} (Retained)`);
        }
    }
});
