const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
const errors = data.filter(d => d.errorCount > 0 || d.warningCount > 0);
errors.forEach(e => {
  console.log(e.filePath);
  e.messages.forEach(m => console.log(`  Line ${m.line}: ${m.message} (${m.ruleId})`));
});
console.log('Total files with issues:', errors.length);
