#!/usr/bin/env node
const fs = require('fs-extra');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const nodemailer = require('nodemailer');
const path = require('path');

const argv = yargs(hideBin(process.argv))
  .option('file', { type: 'string', demandOption: true, describe: 'Path to compiled HTML file' })
  .option('to', { type: 'string', demandOption: true, describe: 'Recipient email' })
  .option('subject', { type: 'string', default: 'Test email', describe: 'Subject line (overrides auto-detect)' })
  .option('subjectFile', { type: 'string', describe: 'Path to subject text file; overrides --subject and auto-detect' })
  .option('from', { type: 'string', default: 'CarExpert Notifications <test@localhost>', describe: 'From header' })
  .option('host', { type: 'string', default: 'localhost', describe: 'SMTP host (Mailpit default)' })
  .option('port', { type: 'number', default: 1025, describe: 'SMTP port (Mailpit default)' })
  .help().argv;

async function getSubject({ subjectArg, subjectFileArg, htmlFile }) {
  // 1) Explicit file wins
  if (subjectFileArg) {
    const txt = await fs.readFile(path.resolve(subjectFileArg), 'utf-8');
    return txt.trim();
  }
  // 2) Explicit string next
  if (subjectArg && subjectArg !== 'Test email') return subjectArg;

  // 3) Auto-detect a sibling subject file: dist/<name>.subject.txt
  const { dir, name } = path.parse(path.resolve(htmlFile)); // e.g. price-drop.example
  const candidate = path.join(dir, `${name}.subject.txt`);
  if (await fs.pathExists(candidate)) {
    const txt = await fs.readFile(candidate, 'utf-8');
    return txt.trim();
  }

  // Fallback
  return subjectArg || 'Test email';
}

(async () => {
  const htmlPath = path.resolve(argv.file);
  const html = await fs.readFile(htmlPath, 'utf-8');
  const subject = await getSubject({
    subjectArg: argv.subject,
    subjectFileArg: argv.subjectFile,
    htmlFile: htmlPath
  });

  const transport = nodemailer.createTransport({
    host: argv.host,
    port: argv.port,
    secure: false
  });

  const info = await transport.sendMail({
    from: argv.from,
    to: argv.to,
    subject,
    html
  });

  console.log('✓ Sent', info.messageId);
  console.log('Subject:', subject);
  console.log('Open Mailpit at http://localhost:8025 to preview.');
})().catch(err => { console.error(err); process.exit(1); });
