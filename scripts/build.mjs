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
import { pathToFileURL, fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import * as C from './config.mjs';

const ENGINE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine');
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const USAGE = 'Usage: node scripts/build.mjs [--check] [--strict] [--root=<repo>] [--out=<dir>]';

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
  if (!m) { error(f, 'no front matter (file must start with a --- block)'); return null; }
  let fm;
  try {
    fm = yaml.load(m[1], { schema: yaml.CORE_SCHEMA }) ?? {};
  } catch (e) {
    error(f, `front matter is not valid YAML: ${e.reason ?? e.message}`);
    return null;
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) { error(f, 'front matter must be key: value pairs'); return null; }
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
  const root = path.resolve(opts.root ?? '.');
  const contentDir = path.join(root, 'content');
  const outDir = path.resolve(root, opts.out ?? 'dist');
  const problems = [];
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const error = (file, msg) => problems.push({ level: 'error', file, msg });
  const warn = (file, msg) => problems.push({ level: 'warning', file, msg });
  const done = (stats = {}) => ({ problems, stats });

  // A new, empty repository still builds: it publishes an empty site until notes arrive.
  if (!fs.existsSync(contentDir)) warn('content/', 'folder not found; building an empty site');

  // --- concept notes ---
  const notes = new Map();
  const conceptFiles = walk(path.join(contentDir, 'concepts'));
  if (conceptFiles.length === 0) warn('content/concepts/', 'no notes found');

  for (const file of conceptFiles) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = path.basename(file, '.md');
    const folder = path.basename(path.dirname(file));

    for (const k of C.REQUIRED_FIELDS) if (fm[k] == null || fm[k] === '') error(f, `missing front matter field: ${k}`);
    for (const k of C.RECOMMENDED_FIELDS) if (fm[k] == null) warn(f, `missing recommended field: ${k}`);

    const id = String(fm.id ?? fileId);
    if (!ID_RE.test(id)) error(f, `id "${id}" is not lowercase kebab-case`);
    if (fm.id != null && id !== fileId) error(f, `id "${id}" must match the file name (${fileId}.md)`);

    if (fm.subject != null) {
      if (!C.SUBJECTS.includes(fm.subject)) error(f, `unknown subject "${fm.subject}"`);
      else if (fm.subject !== folder) error(f, `subject is "${fm.subject}" but the file is in concepts/${folder}/`);
    }
    const enumCheck = (key, allowed) => {
      if (fm[key] != null && !allowed.includes(fm[key])) error(f, `${key} "${fm[key]}" is not one of: ${allowed.join(', ')}`);
    };
    enumCheck('level', C.LEVELS);
    enumCheck('type', C.TYPES);
    enumCheck('status', C.STATUSES);
    if (fm.status === 'planned') warn(f, 'a written note should be draft, reviewed or published, not planned');

    const list = (key) => {
      const v = fm[key];
      if (v == null) return [];
      if (Array.isArray(v)) return v.filter((x) => x != null).map((x) => String(x).trim());
      error(f, `${key} must be a list, e.g. ${key}: [a, b]`);
      return [];
    };
    const tags = list('tags');
    const syllabus = list('syllabus'); // optional course codes, e.g. [UDSII-002] (plan Section 8.5)
    const prerequisites = list('prerequisites');
    const related = list('related');
    for (const t of tags) if (!C.TAGS.includes(t)) error(f, `unknown tag "${t}" (allowed: ${C.TAGS.join(', ')})`);

    if (notes.has(id)) { error(f, `duplicate id "${id}" (also used by ${notes.get(id).path})`); continue; }

    const scan = scanBody(body, bodyLine);

    // required sections
    const seen = new Set();
    for (const s of scan.sections) {
      if (seen.has(norm(s.name))) warn(f, `section "## ${s.name}" appears twice (line ${s.line})`);
      seen.add(norm(s.name));
    }
    for (const s of C.REQUIRED_SECTIONS[fm.type] ?? []) {
      if (!seen.has(norm(s))) error(f, `missing required section: ## ${s}`);
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
        if (at < 0) { warn(f, `line ${l.line} in Flashcards has no " :: " and is ignored`); continue; }
        const front = t.slice(0, at).trim();
        const back = t.slice(at + 4).trim();
        if (!front || !back) { error(f, `flashcard on line ${l.line} has an empty question or answer`); continue; }
        const cardId = hash(`${id}\n${front}`);
        if (cards.some((c) => c.cardId === cardId)) { warn(f, `duplicate flashcard question on line ${l.line}`); continue; }
        cards.push({ cardId, noteId: id, subject: fm.subject ?? null, front, back });
      }
      if (cards.length === 0) warn(f, 'Flashcards section has no cards');
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
      if (quizCount !== answers) error(f, `Self-check has ${quizCount} [!quiz] and ${answers} [!answer] blocks; each question needs one answer`);
      if (quizCount < C.SELF_CHECK_MIN || quizCount > C.SELF_CHECK_MAX) {
        warn(f, `Self-check has ${quizCount} questions (plan: ${C.SELF_CHECK_MIN}–${C.SELF_CHECK_MAX})`);
      }
    }

    // write-down marking and [!beyond] (plan Sections 8.5 and 11)
    const wdSections = new Set(C.WRITE_DOWN_SECTIONS.map(norm));
    let highlights = 0, beyond = false;
    for (const sec of scan.sections) {
      for (const l of sec.lines) {
        if (l.inCode) continue;
        const text = l.text.replace(/`[^`\n]*`/g, '');
        const n = (text.match(/==(?=\S)[^=\n]*?\S==/g) || []).length;
        if (n && wdSections.has(norm(sec.name))) {
          warn(f, `line ${l.line}: "## ${sec.name}" is already a write-down section; don't highlight inside it`);
        } else highlights += n;
        if (/^\s*>\s*\[!beyond\]/i.test(l.text)) beyond = true;
      }
    }
    if (highlights > C.HIGHLIGHT_MAX) warn(f, `${highlights} ==highlights==; the style guide asks for at most ${C.HIGHLIGHT_MAX} short lines`);
    if (beyond && !syllabus.length) warn(f, 'uses [!beyond] but has no "syllabus" field, so "beyond the syllabus" has no meaning here');

    notes.set(id, {
      id, path: f, fm, tags, prerequisites, related,
      headings: scan.headings, bodyLinks: scan.links, text: scan.text, cards, quizCount,
      summary: oneLineSummary(scan),
      syllabus,
    });
  }

  // --- registry: read the hand-typed planned rows (plan Section 10) ---
  const regPath = path.join(root, 'REGISTRY.md');
  const oldRegistry = fs.existsSync(regPath) ? fs.readFileSync(regPath, 'utf8') : null;
  const existing = oldRegistry ? parseRegistry(oldRegistry, warn) : new Map();
  const plannedRows = new Map(); // planned rows with no written note yet
  for (const [id, r] of existing) {
    if (r.status !== 'planned' || notes.has(id)) continue;
    const bad = [];
    if (!ID_RE.test(id)) bad.push('ID is not lowercase kebab-case');
    if (!r.title || r.title === '?') bad.push('title is missing');
    if (!C.SUBJECTS.includes(r.subject)) bad.push(`unknown subject "${r.subject}"`);
    if (!C.TYPES.includes(r.type)) bad.push(`unknown type "${r.type}"`);
    if (bad.length) error('REGISTRY.md', `planned row "${id}": ${bad.join('; ')}`);
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
        warn('REGISTRY.md', `planned ID "${p}" looks very similar to ${notes.has(other) ? 'written note' : 'planned ID'} "${other}"; check for a typo`);
      }
    }
  }

  // --- links: valid = written note or planned row (plan Section 7.3) ---
  const planned = new Map(); // planned id -> Set of referrers
  const backlinks = new Map(); // id -> Set of note IDs linking to it
  const resolve = (target, raw, from, file, line) => {
    const where = line ? ` on line ${line}` : '';
    if (!ID_RE.test(target)) {
      error(file, `malformed link [[${raw}]]${where}: link targets must be note IDs in lowercase kebab-case`);
      return false;
    }
    if (notes.has(target)) return true;
    if (plannedRows.has(target)) {
      if (!planned.has(target)) planned.set(target, new Set());
      planned.get(target).add(from);
      return true;
    }
    const near = allIds.filter((id) => similar(target, id));
    error(file, `broken link [[${raw}]]${where}: "${target}" is neither a written note nor a planned row in REGISTRY.md` +
      (near.length ? ` (did you mean ${near.map((x) => `"${x}"`).join(' or ')}?)` : ''));
    return false;
  };
  const addBacklink = (to, from) => {
    if (!backlinks.has(to)) backlinks.set(to, new Set());
    backlinks.get(to).add(from);
  };

  for (const n of notes.values()) {
    for (const kind of ['prerequisites', 'related']) {
      for (const t of n[kind]) {
        if (t === n.id) { error(n.path, `${kind} lists the note itself`); continue; }
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
        error(notes.get(p).path, `prerequisite cycle: ${cycle.join(' → ')}`);
      } else if (!color.get(p)) visit(p);
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const id of notes.keys()) if (!color.get(id)) visit(id);

  // --- subject indexes ---
  const subjects = [];
  for (const file of walk(path.join(contentDir, 'subjects'))) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = path.basename(file, '.md');
    const id = String(fm.id ?? fileId);
    if (fm.type !== 'subject') error(f, 'type must be "subject"');
    if (id !== fileId) error(f, `id "${id}" must match the file name (${fileId}.md)`);
    if (!C.SUBJECTS.includes(id)) error(f, `unknown subject "${id}"`);
    if (!fm.title) error(f, 'missing front matter field: title');

    // Optional level headings (## Basics, ## Design, ## Advanced) group the list (plan Section 9).
    const order = [];
    const groups = [];
    for (const l of scanBody(body, bodyLine).links) {
      if (!resolve(l.target, l.raw, `subject:${id}`, f, l.line)) continue;
      if (order.includes(l.target)) { warn(f, `"${l.target}" is listed twice`); continue; }
      order.push(l.target);
      const g = groups.at(-1);
      if (g && g.title === l.section) g.items.push(l.target);
      else groups.push({ title: l.section, items: [l.target] });
    }
    for (const nid of order) {
      const n = notes.get(nid);
      if (n && n.fm.subject !== id) warn(f, `"${nid}" belongs to subject "${n.fm.subject}"; a subject index lists its own notes`);
    }
    for (const n of notes.values()) {
      if (n.fm.subject === id && !order.includes(n.id)) warn(f, `note "${n.id}" is missing from this index`);
    }
    subjects.push({ id, title: fm.title ?? id, path: f, order, groups });
  }
  for (const s of new Set([...notes.values()].map((n) => n.fm.subject).filter(Boolean))) {
    if (!subjects.some((x) => x.id === s)) warn(`content/subjects/${s}.md`, `subject "${s}" has notes but no subject index`);
  }

  // --- courses ---
  const courses = [];
  for (const file of walk(path.join(contentDir, 'courses'))) {
    const f = rel(file);
    const doc = readDoc(file, f, error);
    if (!doc) continue;
    const { fm, body, bodyLine } = doc;
    const fileId = path.basename(file, '.md');
    const id = String(fm.id ?? fileId);
    if (fm.type !== 'course') error(f, 'type must be "course"');
    if (id !== fileId) error(f, `id "${id}" must match the file name (${fileId}.md)`);
    if (!C.PATHS.includes(id)) error(f, `unknown career path "${id}"`);
    if (!fm.title) error(f, 'missing front matter field: title');
    if (!fm.summary) warn(f, 'missing front matter field: summary');

    const scan = scanBody(body, bodyLine);
    const stages = scan.sections.map((s) => {
      const whyLine = s.lines.find((l) => !l.inCode && /^\s*\*(?!\*)(.+)\*\s*$/.test(l.text));
      if (!/^stage\b/i.test(s.name)) warn(f, `section "## ${s.name}" should be a stage, e.g. "## Stage 1 · Foundations"`);
      return { title: s.name, why: whyLine ? whyLine.text.trim().slice(1, -1).trim() : null, items: [] };
    });
    for (const l of scan.links) {
      if (!resolve(l.target, l.raw, `course:${id}`, f, l.line)) continue;
      const stage = stages.find((s) => s.title === l.section);
      if (!stage) { warn(f, `link [[${l.raw}]] on line ${l.line} is outside any stage`); continue; }
      if (stage.items.includes(l.target)) warn(f, `"${l.target}" is listed twice in "${stage.title}"`);
      else stage.items.push(l.target);
    }
    courses.push({ id, title: fm.title ?? id, summary: fm.summary ?? '', path: f, stages });
  }

  // --- registry: merge generated rows with hand-typed planned rows ---
  const rows = [];
  for (const n of notes.values()) {
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
      error('REGISTRY.md', `"${id}" is "${r.status}" but no note file exists (a published ID must never disappear)`);
    }
    rows.push(r); // planned rows (valid or not) are kept exactly as typed
  }
  const newRegistry = registryText(rows);

  const stats = {
    notes: notes.size,
    planned: rows.filter((r) => r.status === 'planned').length,
    flashcards: [...notes.values()].reduce((a, n) => a + n.cards.length, 0),
    subjects: subjects.length,
    courses: courses.length,
  };

  const hasErrors = problems.some((p) => p.level === 'error');
  if (opts.check) {
    if (oldRegistry !== newRegistry) warn('REGISTRY.md', 'out of date; run "npm run build" and commit it');
    return done(stats);
  }
  if (hasErrors) return done(stats);

  // --- write outputs ---
  const plannedOut = {};
  for (const r of rows) {
    if (notes.has(r.id)) continue;
    plannedOut[r.id] = { title: r.title, subject: r.subject, referencedBy: [...(planned.get(r.id) ?? [])] };
  }
  const notesOut = {};
  for (const n of notes.values()) {
    notesOut[n.id] = {
      title: n.fm.title, subject: n.fm.subject, level: n.fm.level, type: n.fm.type, status: n.fm.status,
      time: n.fm.time ?? null, summary: n.summary, syllabus: n.syllabus, tags: n.tags, prerequisites: n.prerequisites, related: n.related,
      path: n.path, headings: n.headings, flashcards: n.cards.length, quizzes: n.quizCount,
      backlinks: [...(backlinks.get(n.id) ?? [])].sort(),
    };
  }
  const subjectTitle = (id) => subjects.find((s) => s.id === id)?.title ?? C.SUBJECT_TITLES[id] ?? id;
  const manifest = {
    version: 1,
    site: { ...C.SITE, built: new Date().toISOString() },
    subjectTitles: Object.fromEntries(C.SUBJECTS.map((id) => [id, subjectTitle(id)])),
    assets: listAssets(path.join(contentDir, 'assets'), root),
    notes: notesOut,
    planned: plannedOut,
    subjects: subjects.map(({ id, title, path: p, order, groups }) => ({ id, title, path: p, order, groups })),
    courses: courses.map(({ id, title, summary, path: p, stages }) => ({ id, title, summary, path: p, stages })),
  };
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
  if (oldRegistry !== newRegistry) fs.writeFileSync(regPath, newRegistry);

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
    else if (a === '--help' || a === '-h') { console.log(USAGE); return 0; }
    else { console.error(`Unknown option: ${a}\n${USAGE}`); return 2; }
  }

  const { problems, stats } = build(opts);
  const byFile = new Map();
  for (const p of problems) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }
  for (const [file, list] of byFile) {
    const bad = list.some((p) => p.level === 'error');
    console.log(`${bad ? '✖' : '⚠'} ${file}`);
    for (const p of list) console.log(`    ${p.level.padEnd(8)} ${p.msg}`);
  }
  const errors = problems.filter((p) => p.level === 'error').length;
  const warnings = problems.length - errors;
  const fail = errors > 0 || (opts.strict && warnings > 0);
  console.log(
    `\nNotes: ${stats.notes ?? 0} · planned: ${stats.planned ?? 0} · flashcards: ${stats.flashcards ?? 0}` +
    ` · errors: ${errors} · warnings: ${warnings}`,
  );
  console.log(fail ? 'Build FAILED.' : opts.check ? 'Check passed.' : 'Build done.');
  return fail ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
