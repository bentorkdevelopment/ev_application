const fs = require('fs');
const code = fs.readFileSync('dateUtils.js', 'utf8');
const transformed = code.replace(/export const /g, 'const ');
eval(transformed);
console.log('Parsed:', parseMaintenanceDate('March 12, 2026'));
console.log('isFuture:', isTodayOrFuture(parseMaintenanceDate('March 12, 2026')));
