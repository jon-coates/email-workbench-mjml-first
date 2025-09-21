#!/usr/bin/env node
const fs = require('fs-extra');
const fg = require('fast-glob');
const path = require('path');

/** Collapse whitespace to single spaces, trim ends. */
function squish(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/** Remove HTML comments, <script>, <style>, and <head> blocks. */
function stripHeadScriptStyle(html) {
  return html
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ');
}

/**
 * Remove hidden blocks likely used for preheaders or tracking:
 * display:none / opacity:0 / visibility:hidden / max-height:0 / mso-hide:all / font-size:0 / width:0 / height:0
 */
function stripHiddenBlocks(html) {
  const patterns = [
    /<(div|span|p|table|tr|td)[^>]*style="[^"]*(display\s*:\s*none|opacity\s*:\s*0|visibility\s*:\s*hidden|max-height\s*:\s*0|mso-hide\s*:\s*all|font-size\s*:\s*0|width\s*:\s*0|height\s*:\s*0)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi,
    /<(div|span|p|table|tr|td)[^>]*style='[^']*(display\s*:\s*none|opacity\s*:\s*0|visibility\s*:\s*hidden|max-height\s*:\s*0|mso-hide\s*:\s*all|font-size\s*:\s*0|width\s*:\s*0|height\s*:\s*0)[^']*'[^>]*>[\s\S]*?<\/\1>/gi
  ];
  let out = html;
  patterns.forEach(rx => { out = out.replace(rx, ' '); });
  return out;
}

/** Extract the mj-preview text (hidden block) if present. */
function extractPreheader(html) {
  const head = html.slice(0, 20000); // search near top
  const patterns = [
    /<(div|span)[^>]*style="[^"]*(display\s*:\s*none|opacity\s*:\s*0)[^"]*"[^>]*>([\s\S]*?)<\/\1>/i,
    /<(div|span)[^>]*style='[^']*(display\s*:\s*none|opacity\s*:\s*0)[^']*'[^>]*>([\s\S]*?)<\/\1>/i
  ];
  for (const rx of patterns) {
    const m = head.match(rx);
    if (m && m[3]) {
      const txt = squish(m[3].replace(/<[^>]+>/g, ' '));
      if (txt) return txt;
    }
  }
  return null;
}

/** Fallback: derive a snippet from visible body text. */
function extractBodySnippet(html, maxLen = 140) {
  // Keep only body onwards
  const body = html.split(/<body[^>]*>/i)[1] || html;

  // Remove head/scripts/styles + hidden/zero-sized blocks
  let cleaned = stripHeadScriptStyle(body);
  cleaned = stripHiddenBlocks(cleaned);

  // Heuristic: drop obvious header/footer blocks by class/id keywords (best-effort, safe if absent)
  cleaned = cleaned
    .replace(/<[^>]*(id|class)\s*=\s*["'][^"']*(header|logo|footer|social)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');

  // Strip remaining tags to text
  const text = squish(cleaned.replace(/<[^>]+>/g, ' '));

  // Return first ~140 chars (word-safe)
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : maxLen) + '…';
}

(async () => {
  const DIST = path.resolve('dist');
  const PUB_PREV = path.resolve('public', 'previews');

  if (!(await fs.pathExists(DIST))) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Reset public/previews and copy the built files
  await fs.remove(PUB_PREV);
  await fs.ensureDir(PUB_PREV);
  await fs.copy(DIST, PUB_PREV);

  // Build manifest
  const htmlFiles = await fg(['*.html', '!*.tokens.html'], { cwd: DIST });
  const manifest = [];

  for (const f of htmlFiles) {
    const abs = path.join(DIST, f);
    const html = await fs.readFile(abs, 'utf-8');

    const name = path.basename(f, '.html'); // e.g. invitation.example
    const subjectPath = path.join(DIST, `${name}.subject.txt`);
    const preheaderPath = path.join(DIST, `${name}.preheader.txt`);

    // Subject
    const subject = (await fs.pathExists(subjectPath))
      ? (await fs.readFile(subjectPath, 'utf-8')).trim()
      : null;

    // Preheader: explicit file > hidden preview > body snippet fallback
    let preheader = null;
    if (await fs.pathExists(preheaderPath)) {
      preheader = (await fs.readFile(preheaderPath, 'utf-8')).trim();
    }
    if (!preheader) preheader = extractPreheader(html);
    if (!preheader) preheader = extractBodySnippet(html);

    // Derive template (keep variant only for grouping if you want)
    const parts = name.split('.');
    const template = parts[0];
    const variant = parts.slice(1).join('.') || 'default';

    manifest.push({
      file: f,
      url: `/previews/${f}`,
      template,
      variant,    // keep or remove — UI can ignore it
      subject,
      preheader   // always populated now (real preheader or body snippet)
    });
  }

  const grouped = manifest.reduce((acc, item) => {
    (acc[item.template] ||= []).push(item);
    return acc;
  }, {});

  await fs.writeJson(path.join(PUB_PREV, 'manifest.json'), { items: manifest, grouped }, { spaces: 2 });
  console.log(`✓ Prepared ${manifest.length} preview file(s) → public/previews/ + manifest.json`);
})();
