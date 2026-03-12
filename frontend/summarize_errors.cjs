const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

let totalErrors = 0;
let totalWarnings = 0;
let out = '';

report.filter(file => file.errorCount > 0 || file.warningCount > 0).forEach(file => {
    out += `\nFile: ${file.filePath.split(/[\\/]/).pop()}\n`;
    out += `Path: ${file.filePath}\n`;
    file.messages.forEach(msg => {
        const type = msg.severity === 2 ? 'ERROR' : 'WARN';
        if (msg.severity === 2) totalErrors++; else totalWarnings++;
        out += `  [${type}] Line ${msg.line}: ${msg.message} (${msg.ruleId})\n`;
    });
});
out += `\nTotal Errors: ${totalErrors}\n`;
out += `Total Warnings: ${totalWarnings}\n`;
fs.writeFileSync('errors_summary_utf8.txt', out, 'utf8');
