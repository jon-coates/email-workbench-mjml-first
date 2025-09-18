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

  if (argv.template && argv.data && argv.out) {
    const mjmlPath = path.join(SRC_TPL_DIR, `${argv.template}.mjml`);
    return compileOne(mjmlPath, argv.data, argv.out);
  }

  const templates = await fg(['*.mjml'], { cwd: SRC_TPL_DIR });
  for (const t of templates) {
    const name = path.basename(t, '.mjml');
    const dataFiles = await fg([`${name}.*.json`], { cwd: DATA_DIR });
    if (!dataFiles.length) {
      console.warn(`(i) No data for template "${name}"`);
      continue;
    }
    for (const df of dataFiles) {
      const variant = df.replace(new RegExp(`^${name}\.`), '').replace(/\.json$/, '');
      const out = path.join(DIST_DIR, `${name}.${variant}.html`);
      await compileOne(path.join(SRC_TPL_DIR, t), path.join(DATA_DIR, df), out);
    }
  }
}

build().catch(err => { console.error(err); process.exit(1); });
