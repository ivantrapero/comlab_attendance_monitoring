const fs = require('fs');
const path = require('path');
const { transform } = require('lightningcss');

const files = fs.readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => path.join('src', f));

for (const file of files) {
  const css = fs.readFileSync(file, 'utf8');
  try {
    transform({ filename: file, code: Buffer.from(css), minify: true });
    console.log('OK', file);
  } catch (e) {
    console.log('ERR', file);
    console.log(String(e.message || e));
    if (e.line) console.log('line', e.line, 'column', e.column);
  }
}
