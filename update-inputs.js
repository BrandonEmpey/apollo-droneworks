const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/auth-page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all input classes with our auth-input class
content = content.replace(/className="bg-black-light border-offwhite\/20 text-white"/g, 'className="bg-black-light border-offwhite/20 auth-input"');

fs.writeFileSync(filePath, content);
console.log('Updated all inputs with auth-input class');
