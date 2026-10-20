// Copy only public assets. Never package SQL, tests, credentials or local reports.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist-mobile');
async function build() {
  // This generated directory is fixed inside the project, never supplied by a caller.
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const dir of ['css', 'js', 'assets', 'images']) {
    fs.cpSync(path.join(root, dir), path.join(output, dir), { recursive: true });
  }
  for (const name of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, name), 'utf8')
      // Native startup must not wait for external font stylesheets. Existing CSS
      // provides system/Georgia fallbacks; the website retains its web fonts.
      .replace(/<link\b[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '')
      .replace('</head>', '<script src="js/mobile.bundle.js"></script>\n</head>')
      .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/g, 'js/supabase-sdk.bundle.js')
      .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    fs.writeFileSync(path.join(output, name), html);
  }
  await esbuild.build({ entryPoints: [path.join(root, 'mobile/entry.js')], bundle: true, format: 'iife',
    target: 'es2022', outfile: path.join(output, 'js/mobile.bundle.js') });
  await esbuild.build({ stdin: { contents: "export * from '@supabase/supabase-js';", resolveDir: root },
    bundle: true, format: 'iife', globalName: 'supabase', target: 'es2022',
    outfile: path.join(output, 'js/supabase-sdk.bundle.js') });
  console.log('Mobile assets built from the existing storefront.');
}
build().catch(error => { console.error(error); process.exitCode = 1; });
