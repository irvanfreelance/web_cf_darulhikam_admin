const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync('refs/lenteradonasi.sql', 'utf-8');
const lines = sql.split('\n');

let currentTable = '';
let currentColumns = [];

lines.forEach((line, index) => {
    const insertMatch = line.match(/INSERT INTO (\w+) \((.*?)\) VALUES/);
    if (insertMatch) {
        currentTable = insertMatch[1];
        currentColumns = insertMatch[2].split(',').map(c => c.trim());
    }

    if (line.trim().startsWith('(') && currentTable) {
        // Simple comma split is dangerous due to strings with commas, but let's try a regex for values
        // This is a naive split
        const valuesPart = line.trim().replace(/^\(/, '').replace(/\),?$/, '').replace(/;$/, '');
        
        // Better way to count top-level commas in values
        let commCount = 0;
        let inString = false;
        let pLevel = 0;
        for (let i = 0; i < valuesPart.length; i++) {
            if (valuesPart[i] === "'" && valuesPart[i-1] !== "\\") inString = !inString;
            if (!inString) {
                if (valuesPart[i] === "(") pLevel++;
                if (valuesPart[i] === ")") pLevel--;
                if (valuesPart[i] === "," && pLevel === 0) commCount++;
            }
        }
        
        const valueCount = commCount + 1;
        if (valueCount !== currentColumns.length) {
            console.log(`Mismatch in table ${currentTable} at line ${index + 1}:`);
            console.log(`Columns (${currentColumns.length}): ${currentColumns.join(', ')}`);
            console.log(`Values (${valueCount}): ${line.trim()}`);
        }
    }
    
    if (line.includes(';')) {
        // Reset if it's the end of a statement
        // currentTable = ''; // Be careful, values can span multiple lines
    }
});
