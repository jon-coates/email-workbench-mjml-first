#!/usr/bin/env node
const fs = require('fs-extra');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const nodemailer = require('nodemailer');
const path = require('path');

const argv = yargs(hideBin(process.argv))
  .option('file', { type: 'string', demandOption: true })
  .option('to', { type: 'string', demandOption: true })
  .option('subject', { type: 'string', default: 'Test email' })
  .option('from', { type: 'string', default: 'CarExpert Notifications <test@localhost>' })
  .option('host', { type: 'string', default: 'localhost' })
  .option('port', { type: 'number', default: 1025 })
  .help().argv;

(async () => {
  const html = await fs.readFile(path.resolve(argv.file), 'utf-8');
  const transport = nodemailer.createTransport({
    host: argv.host,
    port: argv.port,
    secure: false
  });

  const info = await transport.sendMail({
    from: argv.from,
    to: argv.to,
    subject: argv.subject,
    html
  });

  console.log('✓ Sent', info.messageId);
  console.log('Open Mailpit at http://localhost:8025 to preview.');
})().catch(err => { console.error(err); process.exit(1); });
