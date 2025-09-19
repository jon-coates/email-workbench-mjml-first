#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const fg = require('fast-glob');
const Handlebars = require('handlebars');
const mjml2html = require('mjml');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('json', (ctx) => JSON.stringify(ctx));

const argv = yargs(hideBin(process.argv))
  .option('template', { type: 'string' })
  .option('data', { type: 'string' })
  .option('out', { type: 'string' })
  .help().argv;

const ROOT = process.cwd();
const SRC_TPL_DIR = path.join(ROOT, 'src', 'templates');
const DATA_DIR = path.join(ROOT, 'data');
const DIST_DIR = path.join(ROOT, 'dist');
const SUBJECTS_DIR = path.join(ROOT, 'src', 'subjects');

async function compileOne(mjmlPath, dataPath, outPath) {
  const mjmlSrc = await fs.readFile(mjmlPath, 'utf-8');
  const { html: preHtml, errors } = mjml2html(mjmlSrc, {
    filePath: mjmlPath,
    minify: true,
    keepComments: true,
    validationLevel: 'soft'
  });
  if (errors?.length) {
    console.warn('MJML warnings:', errors.map(e => e.formattedMessage || e.message));
  }

  const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
  const tpl = Handlebars.compile(preHtml, { noEscape: true });
  const finalHtml = tpl(data);

  await fs.ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, finalHtml, 'utf-8');
  console.log('✓ Built', path.relative(ROOT, outPath));
}

async function build() {
  await fs.ensureDir(DIST_DIR);

  // Single-file mode (if you call with --template, --data, --out)
  if (argv.template && argv.data && argv.out) {
    const name = argv.template;
    const mjmlPath = path.join(SRC_TPL_DIR, `${name}.mjml`);

    // HTML (preview)
    await compileOne(mjmlPath, argv.data, argv.out);

    // Subjects
    await writeSubjectTokens(name, DIST_DIR); // tokenised: <name>.subject.tokens.txt
    const singleData = JSON.parse(await fs.readFile(path.resolve(argv.data), 'utf-8'));
    const subjSingleOut = argv.out.replace(/\.html$/, '.subject.txt'); // preview
    await writeSubjectPreview(name, singleData, subjSingleOut);
    return;
  }

  // Matrix build across all templates
  const templates = await fg(['*.mjml'], { cwd: SRC_TPL_DIR });
  for (const t of templates) {
    const name = path.basename(t, '.mjml');

    // Tokenised subject once per template (no data)
    await writeSubjectTokens(name, DIST_DIR); // writes: dist/<name>.subject.tokens.txt

    const dataFiles = await fg([`${name}.*.json`], { cwd: DATA_DIR });
    if (!dataFiles.length) {
      console.warn(`(i) No data for template "${name}"`);
      continue;
    }

    for (const df of dataFiles) {
      // NOTE: escaped dot in the regex
      const variant = df.replace(new RegExp(`^${name}\\.`), '').replace(/\.json$/, '');
      const out = path.join(DIST_DIR, `${name}.${variant}.html`);

      // HTML (preview)
      await compileOne(path.join(SRC_TPL_DIR, t), path.join(DATA_DIR, df), out);

      // Subject (preview) per variant
      const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, df), 'utf-8'));
      const subjOut = path.join(DIST_DIR, `${name}.${variant}.subject.txt`);
      await writeSubjectPreview(name, data, subjOut);
    }
  }
}


// subjects helpers
async function readSubjectTemplate(name) {
  const p = path.join(SUBJECTS_DIR, `${name}.subject.hbs`);
  return (await fs.pathExists(p)) ? fs.readFile(p, 'utf-8') : null;
}
async function writeSubjectTokens(name, outDir) {
  const tpl = await readSubjectTemplate(name);
  if (!tpl) return;
  await fs.writeFile(path.join(outDir, `${name}.subject.tokens.txt`), tpl, 'utf-8');
  console.log('✓ Built (tokens) ', `${name}.subject.tokens.txt`);
}
async function writeSubjectPreview(name, data, outPath) {
  const tpl = await readSubjectTemplate(name);
  if (!tpl) return;
  const compiled = Handlebars.compile(tpl, { noEscape: true });
  await fs.writeFile(outPath, compiled(data), 'utf-8');
  console.log('✓ Built (preview)', path.basename(outPath));
}

build().catch(err => { console.error(err); process.exit(1); });
