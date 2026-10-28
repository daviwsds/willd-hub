// Verificação de sintaxe complementar no ambiente de desenvolvimento do Codex.
// Não substitui npm run typecheck ou npm run build.
const fs = require('node:fs');
const path = require('node:path');
const compiler = process.env.BABEL_PARSER_BUNDLE;
if (!compiler) { console.error('Defina BABEL_PARSER_BUNDLE para um módulo que exponha babelParse.'); process.exit(1); }
const { babelParse } = require(compiler);
let count = 0;
function walk(dir) {
 for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
  const file = path.resolve(dir, entry.name);
  if (entry.isDirectory()) walk(file);
  else if (/\.tsx?$/.test(file)) { babelParse(fs.readFileSync(file, 'utf8'), file, false); count++; }
 }
}
walk('.');
console.log(`${count} arquivos TypeScript/TSX com sintaxe válida.`);
