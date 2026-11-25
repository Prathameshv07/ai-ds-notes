#!/usr/bin/env node
// Sutra (ai-ds-notes) build script (NOTES_PROJECT_PLAN.md, Sections 7, 8, 10 and 13).
//
// Reads content/ (never modifies it), validates every note, subject index and
// course, then writes:
//   dist/data/manifest.json    notes, subjects, courses, planned IDs, backlinks
//   dist/data/graph.json       nodes + prerequisite/related edges
//   dist/data/search.json      plain text for search
//   dist/data/flashcards.json  every flashcard, with a stable card ID
//   dist/content/              copy of content/ for the browser to fetch
//   dist/*.html, dist/assets/  the reader engine (copied from engine/)
//   REGISTRY.md                concept registry (planned rows are kept as written)
//
// Usage:
//   node scripts/build.mjs            validate and write everything
//   node scripts/build.mjs --check    validate only; write nothing (used in CI)
//   options: --strict (warnings fail too), --root=<repo>, --out=<dir>

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import * as BASE from './config.mjs';

// The active profile's settings (plan Section 18): the ai-ds-notes defaults from config.mjs,
// overridden by the chosen profile. Set at the start of every build.
let C = profileConfig('ai-ds-notes');
export function profileConfig(name) {
  const prof = BASE.PROFILES[name];
  if (!prof) throw new Error(`unknown profile "${name}" (known: ${Object.keys(BASE.PROFILES).join(', ')})`);
  return { ...BASE, ...BASE.PROFILES['ai-ds-notes'], ...prof, name };
}

const ENGINE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine');
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const USAGE = 'Usage: node scripts/build.mjs [--check] [--strict] [--profile=ai-ds-notes|class-notes] [--root=<repo>] [--out=<dir>]';

// ---------- small helpers ----------

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// Edit distance where swapping two neighbouring letters counts as one edit
// (optimal string alignment). Used to warn about IDs that look like typos.
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Last-updated and added dates per note file, from git history (plan Section 12).
// Returns Map(path relative to root → { updated, added }), ISO dates. Empty when git or history
// is unavailable; the GitHub Action fetches the full history so the dates are right.
function gitDates(root, dir) {
  const dates = new Map();
  try {
    const out = execFileSync('git', ['-C', root, 'log', '--relative', '--no-renames', '--format=@@%cI', '--name-status', '--', dir],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    let cur = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('@@')) { cur = line.slice(2).trim(); continue; }
      const m = line.match(/^([AMD])\t(.+)$/);
      if (!m || !cur) continue;
      const d = dates.get(m[2]) || {};
      if (!d.updated) d.updated = cur; // log is newest first
      if (m[1] === 'A') d.added = cur; // keeps the oldest "added"
      dates.set(m[2], d);
    }
  } catch (e) { /* not a git repository, or git missing */ }
  return dates;
}

// Image files under content/assets, by file name, so ![[file.png]] embeds resolve like in Obsidian.
function listAssets(dir, root) {
  const out = {};
  const visit = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visit(p);
      else out[e.name] = path.relative(root, p).split(path.sep).join('/');
    }
  };
  visit(dir);
  return out;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

// Split front matter from body. Returns null (and reports) if unusable.
function readDoc(file, f, error) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) { error(f, 'no front matter', 'start the file with a --- line, the fields (id, title, …), and another --- line; copy them from the template'); return null; }
  let fm;
  try {
    fm = yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) ?? {};
  } catch (e) {
    error(f, `front matter is not valid YAML: ${e.reason ?? e.message}${e.mark ? ` (front matter line ${e.mark.line + 1})` : ''}`, 'check that line: one "key: value" per line, lists in [brackets], and quotes around text containing a colon');
    return null;
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) { error(f, 'front matter must be key: value pairs', 'write one "key: value" per line between the --- lines'); return null; }
  const bodyLine = m[0].split('\n').length; // 1-based line where the body starts
  return { fm, body: text.slice(m[0].length), bodyLine };
}

// Walk the body line by line, skipping fenced code, collecting H2 sections,
// headings, wikilinks and plain text.
function scanBody(body, startLine) {
  const sections = [];
  const headings = [];
  const links = [];
  const text = [];
  let cur = null;
  let fence = null;

  body.split('\n').forEach((line, i) => {
    const lineNo = startLine + i;
    const fm = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    let inCode = false;
    if (fence) {
      inCode = true;
      if (fm && fm[1][0] === fence.ch && fm[1].length >= fence.len && fm[2].trim() === '') fence = null;
    } else if (fm) {
      fence = { ch: fm[1][0], len: fm[1].length };
      inCode = true;
    }

    if (!inCode) {
      const h = line.match(/^(#{2,3})\s+(.*\S)\s*$/);
      if (h) {
        const name = h[2].replace(/<!--.*?-->/g, '').trim();
        headings.push({ level: h[1].length, text: name });
        if (h[1] === '##') {
          cur = { name, line: lineNo, lines: [] };
          sections.push(cur);
          return;
        }
      }
      const noInline = line.replace(/`[^`\n]*`/g, '');
      for (const m of noInline.matchAll(/(!?)\[\[([^\]\n]*?)\]\]/g)) {
        if (m[1]) continue; // ![[embed]] is not a note link
        const raw = m[2];
        const target = raw.split('|')[0].split('#')[0].trim();
        links.push({ raw, target, line: lineNo, section: cur?.name ?? null });
      }
      text.push(noInline);
    }
    if (cur) cur.lines.push({ text: line, inCode, line: lineNo });
  });

  return { sections, headings, links, text: plain(text.join('\n')) };
}

// Markdown → rough plain text for the search index.
function plain(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[![a-z]+\][-+]?/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[ \t>#]+/gm, '')
    .replace(/\*\*|\*|~~/g, '')
    .replace(/(^|[^\w$\\])_([^_\n]+)_(?!\w)/g, '$1$2') // _italic_ only; keeps x_i and user_id
    .replace(/\s+/g, ' ')
    .trim();
}

// Entries of a subject index: every [[link]] with its ## section, the sub-heading it sits under
// (a ### heading or a line that is only bold text, e.g. "**Unit 1 · Basics (8 h)**"), and any text
// after the link on its line (e.g. "[[endianness]]: big endian vs little endian").
function indexEntries(body, startLine) {
  const out = [];
  let section = null, sub = null, fence = false;
  body.split('\n').forEach((line, i) => {
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) { fence = !fence; return; }
    if (fence) return;
    let m = line.match(/^##\s+(.*\S)\s*$/);
    if (m) { section = m[1].replace(/<!--.*?-->/g, '').trim(); sub = null; return; }
    m = line.match(/^#{3,4}\s+(.*\S)\s*$/) || line.match(/^\s*\*\*([^*]+?)\*\*\s*$/);
    if (m) { sub = m[1].replace(/<!--.*?-->/g, '').trim(); return; }
    const noInline = line.replace(/`[^`\n]*`/g, '');
    for (const lm of noInline.matchAll(/(!?)\[\[([^\]\n]*?)\]\]/g)) {
      if (lm[1]) continue;
      const after = noInline.slice(lm.index + lm[0].length).replace(/^\s*[:—–-]\s*/, '').replace(/\[\[[^\]]*\]\]/g, '').trim();
      out.push({ raw: lm[2], target: lm[2].split('|')[0].split('#')[0].trim(), line: startLine + i, section, sub, note: after.replace(/[*_]/g, '') });
    }
  });
  return out;
}

// "risc-vs-cisc" → "Risc vs cisc": a readable label for a planned note that has no title yet.
const humanize = (id) => id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

function findSection(scan, name) {
  return scan.sections.find((s) => norm(s.name) === norm(name)) ?? null;
}

// Reads REGISTRY.md rows. Columns (plan Section 10): id, title, subject, type, status, summary,
// prerequisites. Older 5-column rows still parse, with the two new columns empty.
function parseRegistry(text, warn) {
  const rows = new Map();
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const inner = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
    const cells = inner.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length < 5) continue;
    if (cells[0] === 'id' || /^:?-+:?$/.test(cells[0])) continue;
    const [id, title, subject, type, status, summary = '', prerequisites = ''] = cells;
    if (rows.has(id)) warn('REGISTRY.md', `duplicate row for "${id}"; keeping the first`);
    else rows.set(id, { id, title, subject, type, status, summary, prerequisites });
  }
  return rows;
}

// Summary for a written note: the first sentence of its "In one line" section, as plain text.
function oneLineSummary(scan) {
  const sec = findSection(scan, 'In one line');
  if (!sec) return '';
  const text = plain(sec.lines.filter((l) => !l.inCode).map((l) => l.text).join('\n'));
  let s = ((text.match(/^.*?[.!?](?=\s|$)/) || [text])[0]).trim().replace(/\.$/, '');
  const max = C.REGISTRY_SUMMARY_MAX;
  if (s.length > max) {
    const cut = s.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    s = (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, '') + '…';
  }
  return s;
}

function registryText(rows) {
  const order = (s) => { const i = C.SUBJECTS.indexOf(s); return i < 0 ? 999 : i; };
  const sorted = [...rows].sort((a, b) => order(a.subject) - order(b.subject) || a.id.localeCompare(b.id));
  const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
  return [
    '# Concept registry',
    '',
    '> Generated by `scripts/build.mjs`. Rows for written notes come from the notes themselves',
    '> (summary = first sentence of "In one line"; prerequisites = front matter): to change one,',
    '> edit the note. Rows with status `planned` are kept exactly as written here, so add or fix',
    '> planned rows in this file, with summary as "Covers: ..." and prerequisites as comma-separated IDs.',
    '',
    '| id | title | subject | type | status | summary | prerequisites |',
    '|---|---|---|---|---|---|---|',
    ...sorted.map((r) => `| ${[r.id, r.title, r.subject, r.type, r.status, r.summary, r.prerequisites].map(esc).join(' | ')} |`),
    '',
  ].join('\n');
}

// ---------- the build ----------

export function build(opts = {}) {
  C = profileConfig(opts.profile ?? 'ai-ds-notes');
  const flat = C.layout === 'flat';
  const root = path.resolve(opts.root ?? '.');
  const contentDir = path.join(root, 'content');
  const outDir = path.resolve(root, opts.out ?? 'dist');
  const problems = [];
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  // Every problem names its file; most also say how to fix it (the class-notes chats read these).
  const error = (file, msg, fix) => problems.push({ level: 'error', file, msg, fix });
  const warn = (file, msg, fix) => problems.push({ level: 'warning', file, msg, fix });
  const tmpl = (type) => (C.templates[type] ? ` (template: ${C.templates[type]})` : '');
  const indexFile = (subject) => (flat ? `content/${subject}/_index.md` : `content/subjects/${subject}.md`);
  const done = (stats = {}) => ({ problems, stats });

  // A new, empty repository still builds: it publishes an empty site until notes arrive.
  if (!fs.existsSync(contentDir)) warn('content/', 'folder not found; building an empty site');

  // --- concept notes ---
  const notes = new Map();
  let conceptFiles;
  if (flat) {
    // content/<subject>/<note>.md; _index.md files are subject indexes; assets/ holds images
    conceptFiles = [];
    for (const file of walk(contentDir)) {
      const parts = path.relative(contentDir, file).split(path.sep);
      if (parts[0] === 'assets' || path.basename(file) === '_index.md') continue;
      if (parts.length !== 2) {
        warn(rel(file), 'is not inside a subject folder, so it is ignored', 'move it to content/<subject-id>/<note-id>.md');
        continue;
      }
      conceptFiles.push(file);
    }
  } else conceptFiles = walk(path.join(contentDir, 'concepts'));
  if (conceptFiles.length === 0) warn(flat ? 'content/' : 'content/concepts/', 'no notes found');

  for (const file of conceptFiles) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = path.basename(file, '.md');
    const folder = path.basename(path.dirname(file));

    for (const k of C.REQUIRED_FIELDS) {
      if (k === 'level' && fm.type === 'intro') continue; // an intro note covers the whole subject
      if (fm[k] == null || fm[k] === '') error(f, `missing front matter field: ${k}`, `add "${k}: ..." between the --- lines at the top${tmpl(fm.type)}`);
    }
    if (fm.type === 'intro' && fm.subject && String(fm.id ?? fileId) !== `${fm.subject}-intro`) {
      error(f, `an intro note's ID must be "${fm.subject}-intro"`, `rename the file to ${fm.subject}-intro.md and set id: ${fm.subject}-intro`);
    }
    for (const k of C.RECOMMENDED_FIELDS) if (fm[k] == null) warn(f, `missing recommended field: ${k}`, `add "${k}:" to the front matter`);

    const id = String(fm.id ?? fileId);
    if (!ID_RE.test(id)) error(f, `id "${id}" is not lowercase kebab-case`, 'use only lowercase letters, digits and hyphens, e.g. symmetric-encryption, and rename the file to match');
    if (fm.id != null && id !== fileId) error(f, `id "${id}" must match the file name (${fileId}.md)`, `set id: ${fileId}, or rename the file to ${id}.md`);

    if (fm.subject != null) {
      const folderPath = flat ? `content/${folder}/` : `concepts/${folder}/`;
      if (C.fixedSubjects && !C.SUBJECTS.includes(fm.subject)) error(f, `unknown subject "${fm.subject}"`, `use one of: ${C.SUBJECTS.join(', ')}`);
      else if (fm.subject !== folder) error(f, `subject is "${fm.subject}" but the file is in ${folderPath}`, `set subject: ${folder}, or move the file to the "${fm.subject}" folder`);
    }
    const enumCheck = (key, allowed) => {
      if (fm[key] != null && !allowed.includes(fm[key])) error(f, `${key} "${fm[key]}" is not one of: ${allowed.join(', ')}`, `set ${key}: to one of those values`);
    };
    enumCheck('level', C.LEVELS);
    enumCheck('type', C.TYPES);
    enumCheck('status', C.STATUSES);
    if (fm.status === 'planned') warn(f, 'a written note should be draft, reviewed or published, not planned', 'set status: draft');

    const list = (key) => {
      const v = fm[key];
      if (v == null) return [];
      if (Array.isArray(v)) return v.filter((x) => x != null).map((x) => String(x).trim());
      error(f, `${key} must be a list`, `write it in square brackets, e.g. ${key}: [a, b]`);
      return [];
    };
    const tags = list('tags');
    const syllabus = list('syllabus'); // optional course codes, e.g. [UDSII-002] (plan Section 8.5)
    // unit (syllabus unit) and practical (practical number) are positive whole numbers (plan 7.4)
    const wholeNumber = (key, min) => {
      if (fm[key] == null) return null;
      const v = Number(fm[key]);
      if (!Number.isInteger(v) || v < min) { error(f, `${key} must be a whole number${min ? ' from 1 up' : ' (0 for an intro note)'}, not "${fm[key]}"`, `write e.g. ${key}: ${min || 1}`); return null; }
      return v;
    };
    const unit = wholeNumber('unit', 0); // 0 = the subject's intro (class notes)
    const practical = wholeNumber('practical', 1);
    if (unit != null && !syllabus.length) warn(f, 'has a "unit" but no "syllabus" field, so it appears on no syllabus page', 'add syllabus: [<course code>]');
    if (fm.type === 'practical') {
      if (practical == null) warn(f, 'a practical note has no practical number', 'add "practical: <number>" (its number in the syllabus list)');
      if (!String(fm.id ?? fileId).endsWith('-practical')) warn(f, 'a practical note\'s ID should end in "-practical"', 'rename it <topic>-practical, e.g. correlation-practical');
    } else if (practical != null) warn(f, '"practical" is only for practical notes', 'remove the practical: line, or set type: practical');
    for (const code of syllabus) if (!C.COURSES[code]) warn(f, `syllabus code "${code}" has no course name in the engine`, 'check the code; if it is right, ask the engine chat to add it to COURSES in scripts/config.mjs');
    const prerequisites = list('prerequisites');
    const related = list('related');
    for (const t of tags) if (!C.TAGS.includes(t)) error(f, `unknown tag "${t}" (allowed: ${C.TAGS.join(', ')})`);

    if (notes.has(id)) { error(f, `duplicate id "${id}" (also used by ${notes.get(id).path})`, 'give one of the two notes a different ID and file name'); continue; }

    const scan = scanBody(body, bodyLine);

    // required sections
    const seen = new Set();
    for (const s of scan.sections) {
      if (seen.has(norm(s.name))) warn(f, `section "## ${s.name}" appears twice (line ${s.line})`, 'merge the two sections into one');
      seen.add(norm(s.name));
    }
    for (const s of C.REQUIRED_SECTIONS[fm.type] ?? []) {
      if (!seen.has(norm(s))) error(f, `missing required section: ## ${s}`, `add a "## ${s}" heading with its content${tmpl(fm.type)}`);
    }

    // flashcards
    const cards = [];
    const fc = findSection(scan, 'Flashcards');
    if (fc) {
      for (const l of fc.lines) {
        if (l.inCode) continue;
        let t = l.text.trim();
        if (!t || t.startsWith('<!--')) continue;
        t = t.replace(/^[-*+]\s+/, '');
        const at = t.indexOf(' :: ');
        if (at < 0) { warn(f, `line ${l.line} in Flashcards has no " :: " and is ignored`, 'write it as question :: answer'); continue; }
        const front = t.slice(0, at).trim();
        const back = t.slice(at + 4).trim();
        if (!front || !back) { error(f, `flashcard on line ${l.line} has an empty question or answer`, 'write both sides: question :: answer'); continue; }
        const cardId = hash(`${id}\n${front}`);
        if (cards.some((c) => c.cardId === cardId)) { warn(f, `duplicate flashcard question on line ${l.line}`, 'remove the repeated card'); continue; }
        cards.push({ cardId, noteId: id, subject: fm.subject ?? null, front, back });
      }
      if (cards.length === 0) warn(f, 'Flashcards section has no cards', 'add lines of the form question :: answer');
    }

    // self-check
    let quizCount = 0;
    const sc = findSection(scan, 'Self-check');
    if (sc) {
      let answers = 0;
      for (const l of sc.lines) {
        if (l.inCode) continue;
        if (/^\s*>\s*\[!quiz\]/i.test(l.text)) quizCount++;
        if (/^\s*>\s*>\s*\[!answer\]/i.test(l.text)) answers++;
      }
      if (quizCount !== answers) error(f, `Self-check has ${quizCount} [!quiz] and ${answers} [!answer] blocks; each question needs one answer`, 'give every "> [!quiz]" block one nested "> > [!answer]- Answer: X" block');
      if (quizCount < C.SELF_CHECK_MIN || quizCount > C.SELF_CHECK_MAX) {
        warn(f, `Self-check has ${quizCount} questions (plan: ${C.SELF_CHECK_MIN}–${C.SELF_CHECK_MAX})`, `write ${C.SELF_CHECK_MIN} to ${C.SELF_CHECK_MAX} [!quiz] questions`);
      }
    }

    // write-down marking and [!beyond] (plan Sections 8.5 and 11)
    const wdSections = new Set(C.WRITE_DOWN_SECTIONS.map(norm));
    const readOnly = new Set(C.NO_HIGHLIGHT_SECTIONS.map(norm));
    const HL = /==(?=\S)[^=\n]*?\S==/g;
    let beyond = false;
    for (const sec of scan.sections) {
      const name = norm(sec.name);
      let answer = sec.name, answerLine = sec.line, count = 0, inBeyond = false;
      const closeAnswer = () => {
        if (count > C.HIGHLIGHT_MAX_PER_ANSWER) {
          warn(f, `line ${answerLine}: "${answer}" has ${count} ==highlights==; an answer skeleton is a definition plus at most ${C.HIGHLIGHT_MAX_PER_ANSWER - 1} key phrases`,
            'keep the definition and the key phrase that opens each main point; unmark the rest');
        }
      };
      for (const l of sec.lines) {
        if (l.inCode) continue;
        const h3 = l.text.match(/^###\s+(.*\S)\s*$/);
        if (h3) { closeAnswer(); answer = h3[1].replace(/<!--.*?-->/g, '').trim(); answerLine = l.line; count = 0; continue; }
        if (/^\s*>\s*\[!beyond\]/i.test(l.text)) { beyond = true; inBeyond = true; }
        else if (!/^\s*>/.test(l.text)) inBeyond = false;
        const n = (l.text.replace(/`[^`\n]*`/g, '').match(HL) || []).length;
        if (!n) continue;
        if (wdSections.has(name)) warn(f, `line ${l.line}: "## ${sec.name}" is already a write-down section; don't highlight inside it`, 'remove the == marks in that section');
        else if (readOnly.has(name)) warn(f, `line ${l.line}: "## ${sec.name}" is for reading, not copying; don't highlight in it`, 'remove the == marks in that section');
        else if (inBeyond) warn(f, `line ${l.line}: highlight inside a [!beyond] box (not examined)`, 'remove the == marks inside the box');
        else count += n;
      }
      closeAnswer();
    }
    // alt text for every diagram and image (plan Sections 8.5, 11)
    for (const m of body.matchAll(/^ {0,3}(`{3,}|~{3,})[ \t]*mermaid[ \t]*\n([\s\S]*?)^ {0,3}\1[ \t]*$/gm)) {
      const missing = ['accTitle', 'accDescr'].filter((k) => !new RegExp(`^\\s*${k}\\s*[:{]`, 'm').test(m[2]));
      if (missing.length) warn(f, `a Mermaid diagram has no ${missing.join(' or ')} (alt text)`, 'add "accTitle: <short title>" and "accDescr: <one sentence>" lines inside the ```mermaid block');
    }
    for (const sec of scan.sections) {
      for (const l of sec.lines) {
        if (l.inCode) continue;
        const t = l.text.replace(/`[^`\n]*`/g, '');
        if (/!\[\s*\]\(/.test(t) || /!\[\[[^|\]]+\]\]/.test(t)) warn(f, `line ${l.line}: image without alt text`, 'write ![what the picture shows](path) or ![[file.png|what it shows]]');
      }
    }
    if (beyond && !syllabus.length) warn(f, 'uses [!beyond] but has no "syllabus" field, so "beyond the syllabus" has no meaning here', 'add syllabus: [<course code>], or turn the box into a normal callout');

    notes.set(id, {
      id, path: f, fm, tags, prerequisites, related,
      headings: scan.headings, bodyLinks: scan.links, text: scan.text, cards, quizCount,
      summary: oneLineSummary(scan),
      syllabus, unit, practical,
    });
  }

  // --- subject index files ---
  const indexFiles = flat
    ? fs.existsSync(contentDir) ? fs.readdirSync(contentDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'assets' && fs.existsSync(path.join(contentDir, e.name, '_index.md')))
      .map((e) => path.join(contentDir, e.name, '_index.md')).sort() : []
    : walk(path.join(contentDir, 'subjects'));

  // --- registry: read the hand-typed planned rows (plan Section 10) ---
  const regPath = path.join(root, 'REGISTRY.md');
  const oldRegistry = C.registry && fs.existsSync(regPath) ? fs.readFileSync(regPath, 'utf8') : null;
  const existing = oldRegistry ? parseRegistry(oldRegistry, warn) : new Map();
  const plannedRows = new Map(); // planned rows with no written note yet
  // Without a registry (class notes), an ID listed in a subject's _index.md is a planned note.
  if (!C.registry) {
    for (const file of indexFiles) {
      const subject = path.basename(path.dirname(file));
      const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
      for (const e of indexEntries(text, 1)) {
        if (!ID_RE.test(e.target) || notes.has(e.target) || plannedRows.has(e.target)) continue;
        plannedRows.set(e.target, {
          id: e.target, title: humanize(e.target), subject, file: rel(file),
          type: e.target.endsWith('-practical') ? 'practical' : 'theory', status: 'planned', summary: '', prerequisites: '',
        });
      }
    }
  }
  for (const [id, r] of existing) {
    if (r.status !== 'planned' || notes.has(id)) continue;
    const bad = [];
    if (!ID_RE.test(id)) bad.push('ID is not lowercase kebab-case');
    if (!r.title || r.title === '?') bad.push('title is missing');
    if (!C.SUBJECTS.includes(r.subject)) bad.push(`unknown subject "${r.subject}"`);
    if (!C.TYPES.includes(r.type)) bad.push(`unknown type "${r.type}"`);
    if (bad.length) error('REGISTRY.md', `planned row "${id}": ${bad.join('; ')}`, 'fix that row: | id | title | subject | type | planned | Covers: ... | prerequisites |');
    else plannedRows.set(id, r);
  }

  // --- similar-ID warning: catches typos such as normalisation / normalization ---
  const allIds = [...new Set([...notes.keys(), ...plannedRows.keys()])].sort();
  const similar = (a, b) => a.replace(/-/g, '') === b.replace(/-/g, '') ||
    editDistance(a, b) === 1;
  for (const p of [...plannedRows.keys()].sort()) {
    for (const other of allIds) {
      if (other === p || (plannedRows.has(other) && other < p)) continue; // each planned pair once
      if (similar(p, other)) {
        warn(plannedRows.get(p).file ?? 'REGISTRY.md', `planned ID "${p}" looks very similar to ${notes.has(other) ? 'written note' : 'planned ID'} "${other}"`, 'check both spellings and correct the one that is wrong');
      }
    }
  }

  // --- links: valid = written note or planned row (plan Section 7.3) ---
  const planned = new Map(); // planned id -> Set of referrers
  const backlinks = new Map(); // id -> Set of note IDs linking to it
  const resolve = (target, raw, from, file, line) => {
    const where = line ? ` on line ${line}` : '';
    if (!ID_RE.test(target)) {
      error(file, `malformed link [[${raw}]]${where}`, 'link to the note ID: lowercase letters, digits and hyphens, e.g. [[symmetric-encryption]] or [[symmetric-encryption|shown text]]');
      return false;
    }
    if (notes.has(target)) return true;
    if (plannedRows.has(target)) {
      if (!planned.has(target)) planned.set(target, new Set());
      planned.get(target).add(from);
      return true;
    }
    const near = allIds.filter((id) => similar(target, id));
    const didYouMean = near.length ? ` (did you mean ${near.map((x) => `"${x}"`).join(' or ')}?)` : '';
    if (C.registry) {
      error(file, `broken link [[${raw}]]${where}: "${target}" is neither a written note nor a planned row in REGISTRY.md${didYouMean}`,
        near.length ? 'correct the ID' : 'add a planned row for it to REGISTRY.md, or correct the ID');
    } else {
      error(file, `broken link [[${raw}]]${where}: "${target}" is neither a written note nor listed in any _index.md${didYouMean}`,
        near.length ? 'correct the ID' : 'add it to its subject\'s _index.md, or correct the ID');
    }
    return false;
  };
  const addBacklink = (to, from) => {
    if (!backlinks.has(to)) backlinks.set(to, new Set());
    backlinks.get(to).add(from);
  };

  for (const n of notes.values()) {
    for (const kind of ['prerequisites', 'related']) {
      for (const t of n[kind]) {
        if (t === n.id) { error(n.path, `${kind} lists the note itself`, `remove "${t}" from ${kind}`); continue; }
        if (resolve(t, t, n.id, n.path)) addBacklink(t, n.id);
      }
    }
    for (const t of n.prerequisites) if (n.related.includes(t)) warn(n.path, `"${t}" is in both prerequisites and related`);
    for (const l of n.bodyLinks) {
      if (l.target === n.id) { warn(n.path, `line ${l.line} links to the note itself`); continue; }
      if (resolve(l.target, l.raw, n.id, n.path, l.line)) addBacklink(l.target, n.id);
    }
  }

  // --- prerequisite cycles ---
  const color = new Map();
  const stack = [];
  const visit = (id) => {
    color.set(id, 1);
    stack.push(id);
    for (const p of notes.get(id).prerequisites) {
      if (!notes.has(p)) continue;
      if (color.get(p) === 1) {
        const cycle = [...stack.slice(stack.indexOf(p)), p];
        error(notes.get(p).path, `prerequisite cycle: ${cycle.join(' → ')}`, 'remove one of these prerequisites so the chain has a start');
      } else if (!color.get(p)) visit(p);
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const id of notes.keys()) if (!color.get(id)) visit(id);

  // --- subject indexes ---
  const subjects = [];
  for (const file of indexFiles) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = flat ? path.basename(path.dirname(file)) : path.basename(file, '.md');
    const id = String(fm.id ?? fileId);
    if (fm.type !== C.indexType) error(f, `type must be "${C.indexType}"`, `set type: ${C.indexType} in the front matter`);
    if (id !== fileId) error(f, `id "${id}" must match the ${flat ? 'folder' : 'file'} name (${fileId})`, `set id: ${fileId}`);
    if (C.fixedSubjects && !C.SUBJECTS.includes(id)) error(f, `unknown subject "${id}"`, `use one of: ${C.SUBJECTS.join(', ')}`);
    if (!C.fixedSubjects && !ID_RE.test(id)) error(f, `subject folder "${id}" is not lowercase kebab-case`, 'rename the folder, e.g. security-in-computing');
    if (!fm.title) error(f, 'missing front matter field: title', 'add "title: <subject name>" to the front matter');

    // ## headings (Basics, Design, Practicals…) group the list (plan Section 9); a ### heading or a
    // bold line such as "**Unit 1 · …**" under one starts a sub-group (class notes).
    const order = [];
    const groups = [];
    const notesText = {};
    for (const l of indexEntries(body, bodyLine)) {
      if (!resolve(l.target, l.raw, `subject:${id}`, f, l.line)) continue;
      if (order.includes(l.target)) { warn(f, `"${l.target}" is listed twice (line ${l.line})`, 'keep it in one place only'); continue; }
      order.push(l.target);
      if (l.note) notesText[l.target] = l.note;
      const g = groups.at(-1);
      if (g && g.title === l.section && g.sub === l.sub) g.items.push(l.target);
      else groups.push({ title: l.section, sub: l.sub, items: [l.target] });
    }
    for (const nid of order) {
      const n = notes.get(nid);
      if (n && n.fm.subject !== id) warn(f, `"${nid}" belongs to subject "${n.fm.subject}"`, 'a subject index lists only its own notes: remove it here');
    }
    for (const g of groups) {
      const isPracticals = norm(g.title || '') === 'practicals';
      for (const x of g.items) {
        const t = notes.get(x)?.fm.type;
        if (t === 'practical' && !isPracticals) warn(f, `practical "${x}" should be listed under "## Practicals"`, 'move its line under the ## Practicals heading');
        if (isPracticals && t && t !== 'practical') warn(f, `"${x}" is a ${t} note but is listed under "## Practicals"`, 'move its line out of ## Practicals, or set type: practical');
      }
    }
    const intro = order.find((x) => notes.get(x)?.fm.type === 'intro');
    if (intro && order[0] !== intro) warn(f, `the intro note "${intro}" should be first in the subject index`, 'move its line to the top of the list');
    for (const n of notes.values()) {
      if (n.fm.subject === id && !order.includes(n.id)) warn(f, `note "${n.id}" is missing from this index`, `add a line [[${n.id}]] in its place in the list`);
    }
    subjects.push({ id, title: fm.title ?? id, about: fm.class ? String(fm.class) : null, path: f, order, groups, intro: intro ?? null, notes: notesText });
  }
  for (const s of new Set([...notes.values()].map((n) => n.fm.subject).filter(Boolean))) {
    if (!subjects.some((x) => x.id === s)) warn(indexFile(s), `subject "${s}" has notes but no subject index`, `create ${indexFile(s)} listing its notes`);
  }

  // --- courses ---
  const courses = [];
  for (const file of C.courses ? walk(path.join(contentDir, 'courses')) : []) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = path.basename(file, '.md');
    const id = String(fm.id ?? fileId);
    if (fm.type !== 'course') error(f, 'type must be "course"', 'set type: course');
    if (id !== fileId) error(f, `id "${id}" must match the file name (${fileId}.md)`, `set id: ${fileId}`);
    if (!C.PATHS.includes(id)) error(f, `unknown career path "${id}"`, `use one of: ${C.PATHS.join(', ')}`);
    if (!fm.title) error(f, 'missing front matter field: title', 'add "title: <career name>"');
    if (!fm.summary) warn(f, 'missing front matter field: summary', 'add "summary: <one sentence>"');

    const scan = scanBody(body, bodyLine);
    const stages = scan.sections.map((s) => {
      const whyLine = s.lines.find((l) => !l.inCode && /^\s*\*(?!\*)(.+)\*\s*$/.test(l.text));
      if (!/^stage\b/i.test(s.name)) warn(f, `section "## ${s.name}" should be a stage`, 'name it like "## Stage 1 · Foundations"');
      return { title: s.name, why: whyLine ? whyLine.text.trim().slice(1, -1).trim() : null, items: [] };
    });
    for (const l of scan.links) {
      if (!resolve(l.target, l.raw, `course:${id}`, f, l.line)) continue;
      const stage = stages.find((s) => s.title === l.section);
      if (!stage) { warn(f, `link [[${l.raw}]] on line ${l.line} is outside any stage`, 'move it under a ## Stage heading'); continue; }
      if (stage.items.includes(l.target)) warn(f, `"${l.target}" is listed twice in "${stage.title}"`, 'keep one');
      else stage.items.push(l.target);
    }
    courses.push({ id, title: fm.title ?? id, summary: fm.summary ?? '', path: f, stages });
  }

  // --- registry: merge generated rows with hand-typed planned rows ---
  const rows = [];
  for (const n of C.registry ? notes.values() : []) {
    const r = existing.get(n.id);
    if (r && r.status === 'planned') {
      // A planned note has now been written: the generated row wins.
      const diff = [];
      if (norm(r.title) !== norm(n.fm.title)) diff.push(`title "${r.title}" → "${n.fm.title}"`);
      if (r.subject !== n.fm.subject) diff.push(`subject "${r.subject}" → "${n.fm.subject}"`);
      if (diff.length) warn('REGISTRY.md', `"${n.id}" is now written; its planned row differed (${diff.join(', ')}). Using the note`);
    }
    rows.push({
      id: n.id, title: n.fm.title, subject: n.fm.subject, type: n.fm.type, status: n.fm.status,
      summary: n.summary, prerequisites: n.prerequisites.join(', '),
    });
  }
  for (const [id, r] of existing) {
    if (notes.has(id)) continue;
    if (r.status !== 'planned') {
      error('REGISTRY.md', `"${id}" is "${r.status}" but no note file exists (a published ID must never disappear)`, 'restore the note file, or set that row back to planned');
    }
    rows.push(r); // planned rows (valid or not) are kept exactly as typed
  }
  if (!C.registry) for (const r of plannedRows.values()) rows.push(r); // planned = listed in an _index.md
  const newRegistry = C.registry ? registryText(rows) : null;

  const stats = {
    notes: notes.size,
    planned: rows.filter((r) => r.status === 'planned').length,
    flashcards: [...notes.values()].reduce((a, n) => a + n.cards.length, 0),
    subjects: subjects.length,
    courses: courses.length,
  };

  const hasErrors = problems.some((p) => p.level === 'error');
  if (opts.check) {
    if (C.registry && oldRegistry !== newRegistry) warn('REGISTRY.md', 'out of date', 'run "npm run build" and commit REGISTRY.md');
    return done(stats);
  }
  if (hasErrors) return done(stats);

  // --- write outputs ---
  const plannedOut = {};
  for (const r of rows) {
    if (notes.has(r.id)) continue;
    plannedOut[r.id] = { title: r.title, subject: r.subject, referencedBy: [...(planned.get(r.id) ?? [])] };
  }
  const dates = gitDates(root, flat ? 'content' : 'content/concepts');
  const notesOut = {};
  for (const n of notes.values()) {
    notesOut[n.id] = {
      title: n.fm.title, subject: n.fm.subject, level: n.fm.level, type: n.fm.type, status: n.fm.status,
      updated: dates.get(n.path)?.updated ?? null, added: dates.get(n.path)?.added ?? null,
      unit: n.unit, practical: n.practical,
      time: n.fm.time ?? null, summary: n.summary, syllabus: n.syllabus, tags: n.tags, prerequisites: n.prerequisites, related: n.related,
      path: n.path, headings: n.headings, flashcards: n.cards.length, quizzes: n.quizCount,
      backlinks: [...(backlinks.get(n.id) ?? [])].sort(),
    };
  }
  const subjectTitle = (id) => subjects.find((s) => s.id === id)?.title ?? C.SUBJECT_TITLES[id] ?? id;
  const subjectIds = C.fixedSubjects ? C.SUBJECTS : subjects.map((x) => x.id);
  const manifest = {
    version: 1,
    site: {
      ...C.SITE, built: new Date().toISOString(), profile: C.name, careerPaths: C.courses,
      feedback: C.FEEDBACK.formUrl ? { formUrl: C.FEEDBACK.formUrl, noteField: C.FEEDBACK.noteField } : null,
    },
    subjectTitles: Object.fromEntries(subjectIds.map((id) => [id, subjectTitle(id)])),
    assets: listAssets(path.join(contentDir, 'assets'), root),
    notes: notesOut,
    planned: plannedOut,
    subjects: subjects.map(({ id, title, about, path: p, order, groups, intro, notes: nt }) => ({ id, title, about, path: p, order, groups, intro, notes: nt })),
    courses: courses.map(({ id, title, summary, path: p, stages }) => ({ id, title, summary, path: p, stages })),
  };
  // Syllabus pages (plan 12): one per course code, notes from every subject grouped by unit.
  // Within a unit: theory in subject-index order, then practicals by number.
  const indexPos = new Map();
  subjects.forEach((sub, si) => sub.order.forEach((x, i) => { if (!indexPos.has(x)) indexPos.set(x, si * 10000 + i); }));
  const codes = [...new Set([...notes.values()].flatMap((n) => n.syllabus))].sort();
  const unitTitleOf = new Map(); // note ID -> [unit number, title] from its index sub-group
  subjects.forEach((sub) => sub.groups.forEach((g) => {
    const m = (g.sub || '').match(/^unit\s+(\d+)\s*[·:.\-–—]\s*(.+?)(?:\s*\(\s*\d+\s*h(?:ours?)?\s*\))?\s*$/i);
    if (m) g.items.forEach((x) => unitTitleOf.set(x, [Number(m[1]), m[2].trim()]));
  }));
  const syllabi = codes.map((code) => {
    const info = C.COURSES[code] || {};
    const members = [...notes.values()].filter((n) => n.syllabus.includes(code));
    const units = new Map();
    for (const n of members) {
      const u = n.unit ?? -1;
      if (!units.has(u)) units.set(u, []);
      units.get(u).push(n);
    }
    const rank = (n) => [n.fm.type === 'intro' ? 0 : n.fm.type === 'practical' ? 2 : 1, n.fm.type === 'practical' ? (n.practical ?? 999) : (indexPos.get(n.id) ?? 1e9)];
    return {
      code, title: info.title ?? code, programme: info.programme ?? '',
      units: [...units.keys()].sort((a, b) => (a < 0 ? 1e9 : a) - (b < 0 ? 1e9 : b)).map((u) => ({
        unit: u < 0 ? null : u,
        title: u < 0 ? 'Other notes' : u === 0 ? 'Introduction'
          : (info.units?.[u] ?? units.get(u).map((n) => unitTitleOf.get(n.id)).find((t) => t && t[0] === u)?.[1] ?? ''),
        items: units.get(u).sort((a, b) => { const ra = rank(a), rb = rank(b); return ra[0] - rb[0] || ra[1] - rb[1] || a.id.localeCompare(b.id); }).map((n) => n.id),
      })),
    };
  });
  manifest.syllabi = syllabi;

  const graph = {
    nodes: [
      ...[...notes.values()].map((n) => ({ id: n.id, title: n.fm.title, subject: n.fm.subject, status: n.fm.status })),
      ...Object.entries(plannedOut).map(([id, p]) => ({ id, title: p.title, subject: p.subject, status: 'planned' })),
    ],
    edges: [...notes.values()].flatMap((n) => [
      ...n.prerequisites.map((t) => ({ source: t, target: n.id, kind: 'prerequisite' })),
      ...n.related.map((t) => ({ source: n.id, target: t, kind: 'related' })),
    ]),
  };
  const search = [...notes.values()].map((n) => ({
    id: n.id, title: n.fm.title, subject: n.fm.subject,
    headings: n.headings.map((h) => h.text), text: n.text,
  }));
  const flashcards = [...notes.values()].flatMap((n) => n.cards);

  const dataDir = path.join(outDir, 'data');
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(path.join(outDir, 'content'), { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const write = (name, obj) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(obj, null, 1) + '\n');
  write('manifest.json', manifest);
  write('graph.json', graph);
  write('search.json', search);
  write('flashcards.json', flashcards);
  if (fs.existsSync(contentDir)) fs.cpSync(contentDir, path.join(outDir, 'content'), { recursive: true });
  if (fs.existsSync(ENGINE_DIR)) fs.cpSync(ENGINE_DIR, outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, '.nojekyll'), ''); // let GitHub Pages serve every file as-is
  if (C.registry && oldRegistry !== newRegistry) fs.writeFileSync(regPath, newRegistry);

  return done(stats);
}

// ---------- command line ----------

function main() {
  const opts = { check: false, strict: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--check') opts.check = true;
    else if (a === '--strict') opts.strict = true;
    else if (a.startsWith('--root=')) opts.root = a.slice(7);
    else if (a.startsWith('--out=')) opts.out = a.slice(6);
    else if (a.startsWith('--profile=')) opts.profile = a.slice(10);
    else if (a === '--help' || a === '-h') { console.log(USAGE); return 0; }
    else { console.error(`Unknown option: ${a}\n${USAGE}`); return 2; }
  }

  let result;
  try { result = build(opts); } catch (e) { console.error(e.message); return 2; }
  const { problems, stats } = result;
  const gha = process.env.GITHUB_ACTIONS === 'true';
  const prefix = process.env.NOTES_PATH_PREFIX || ''; // where content sits in the checkout, for annotations
  const byFile = new Map();
  for (const p of problems) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }
  for (const [file, list] of byFile) {
    const bad = list.some((p) => p.level === 'error');
    console.log(`${bad ? '✖' : '⚠'} ${file}`);
    for (const p of list) {
      console.log(`    ${p.level.padEnd(8)} ${p.msg}`);
      if (p.fix) console.log(`    ${''.padEnd(8)} fix: ${p.fix}`);
      // On GitHub, also show each problem on the run's summary page, attached to its file.
      if (gha) console.log(`::${p.level === 'error' ? 'error' : 'warning'} file=${prefix}${file},title=${file}::${p.msg}${p.fix ? ' — fix: ' + p.fix : ''}`);
    }
  }
  const errors = problems.filter((p) => p.level === 'error').length;
  const warnings = problems.length - errors;
  const fail = errors > 0 || (opts.strict && warnings > 0);
  console.log(
    `\n[${C.name}] Notes: ${stats.notes ?? 0} · planned: ${stats.planned ?? 0} · flashcards: ${stats.flashcards ?? 0}` +
    ` · errors: ${errors} · warnings: ${warnings}`,
  );
  console.log(fail ? 'Build FAILED.' : opts.check ? 'Check passed.' : 'Build done.');
  return fail ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
