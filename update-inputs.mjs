import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, 'client/src/pages/auth-page.tsx');
let content = readFileSync(filePath, 'utf8');

// Replace all input classes with our auth-input class
content = content.replace(/className="bg-black-light border-offwhite\/20 text-white"/g, 'className="bg-black-light border-offwhite/20 auth-input"');

writeFileSync(filePath, content);
console.log('Updated all inputs with auth-input class');
