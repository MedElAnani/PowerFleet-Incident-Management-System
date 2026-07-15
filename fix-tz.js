const fs = require('fs');
const path = 'db/schema.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/timestamp\((['"])([a-zA-Z0-9_]+)\1\)/g, "timestamp($1$2$1, { mode: 'date', withTimezone: true })");
fs.writeFileSync(path, code);
console.log('Successfully updated timestamps with timezone.');
