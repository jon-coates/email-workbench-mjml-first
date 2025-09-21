#!/usr/bin/env node
const fs = require('fs-extra');
const fg = require('fast-glob');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const nodemailer = require('nodemailer');

const argv = yargs(hideBin(process.argv))
  .option('to', { type: 'string', demandOption: true, describe: 'Recipient email(s), comma-separated' })
  .option('glob', { type: 'string', default: 'dist/*.html', describe: 'Glob of HTML files to send' })
  .option('exclude', { type: 'array', default: ['dist/*.tokens.html'], describe: 'Globs to exclude' })
  .option('from', { type: 'string', default: 'CarExpert Exchange <test@localhost>', describe: 'From header' })
  .option('subjectPrefix', { type: 'string', default: '', describe: 'Optional subject prefix, e.g. [DEV] ' })
  .option('host', { type: 'string', default: 'localhost', describe: 'SMTP host (Mailpit default)' })
  .option('port', { type: 'number', default: 1025, describe: 'SMTP port (Mailpit default)' })
  .option('secure', { type: 'boolean', default: false, describe: 'Use TLS (true for port 465)' })
  .option('user', { type: 'string', describe: 'SMTP username (or API key)' })
  .option('pass', { type: 'string', describe: 'SMTP password / token' })
  .option('dryRun', { type: 'boolean', default: false, describe: 'List emails that would be sent, but do not send' })
  .help().argv;

async function getSubjectFor(htmlPath) {
  const { dir, name } = path.parse(htmlPath);
  const subjFile = path.join(dir, `${name}.subject.txt`);
  if (await fs.pathExists(subjFile)) {
    return (await fs.readFile(subjFile, 'utf-8')).trim();
  }
  // Fallback: humanise filename
  return name.replace(/[-_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

(async () => {
  const patterns = [argv.glob, ...argv.exclude.map(g => '!' + g)];
  const files = await fg(patterns, { dot: false });
  if (!files.length) {
    console.log('No HTML files found to send for pattern(s):', patterns.join(' '));
    process.exit(0);
  }

// before:
// const toList = argv.to.split(',').map(s => s.trim()).filter(Boolean);

// after:
const toList = (Array.isArray(argv.to) ? argv.to : [argv.to])
  .flatMap(s => String(s).split(','))   // supports comma-separated + repeated --to flags
  .map(s => s.trim())
  .filter(Boolean);
  if (!toList.length) {
    console.error('At least one recipient is required via --to');
    process.exit(1);
  }

  const transport = nodemailer.createTransport({
    host: argv.host,
    port: argv.port,
    secure: argv.secure,
    auth: (argv.user && argv.pass) ? { user: argv.user, pass: argv.pass } : undefined
  });

  console.log(`Found ${files.length} HTML file(s). Sending to: ${toList.join(', ')}`);
  for (const file of files) {
    const html = await fs.readFile(file, 'utf-8');
    const subjectBase = await getSubjectFor(file);
    const subject = `${argv.subjectPrefix}${subjectBase}`.trim();

    if (argv.dryRun) {
      console.log(`[dry-run] ${path.basename(file)}  →  Subject: "${subject}"`);
      continue;
    }

    const info = await transport.sendMail({
      from: argv.from,
      to: toList,
      subject,
      html
    });

    console.log(`✓ Sent ${path.basename(file)}  →  ${info.messageId}`);
  }

  if (argv.dryRun) {
    console.log('Dry run complete. No emails were sent.');
  } else {
    console.log('All emails sent.');
  }
})().catch(err => { console.error(err); process.exit(1); });
