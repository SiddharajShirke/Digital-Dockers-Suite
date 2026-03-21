import fs from 'fs';
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

let totalErrors = 0;
let totalWarnings = 0;

report.filter(file => file.errorCount > 0 || file.warningCount > 0).forEach(file => {
    console.log(`\nFile: ${file.filePath.split('\\\\').pop()}`);
    console.log(`Path: ${file.filePath}`);
    file.messages.forEach(msg => {
        const type = msg.severity === 2 ? 'ERROR' : 'WARN';
        if (msg.severity === 2) totalErrors++; else totalWarnings++;
        console.log(`  [${type}] Line ${msg.line}: ${msg.message} (${msg.ruleId})`);
    });
});
console.log(`\nTotal Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);



