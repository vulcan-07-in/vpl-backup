const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Apoorv\\.gemini\\antigravity\\brain';

function searchLogs(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchLogs(fullPath);
        } else if (item === 'overview.txt') {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes('VAR-') && !line.includes('inspect_history') && !line.includes('restore_data')) {
                    console.log(`Found in ${fullPath} Line ${idx + 1}:`);
                    console.log(line.substring(0, 300));
                }
            });
        }
    }
}

searchLogs(brainDir);
