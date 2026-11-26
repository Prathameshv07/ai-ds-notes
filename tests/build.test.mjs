// Tests for scripts/build.mjs. Each test writes a throwaway content tree of
// placeholder notes into a temp folder (never real teaching content).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build.mjs';
import { execFileSync } from 'node:child_process';

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), text);
  }
  return root;
}

const quiz = (n) => `> [!quiz] Q${n}. Placeholder question?
> (A) one
> (B) two
>
> > [!answer]- Answer: A
> > Placeholder explanation.
`;

function note(id, { subject = 'databases', prerequisites = [], related = [], drop = [], body = '', extra = {} } = {}) {
  const fm = {
    id, title: `Title ${id}`, subject, level: 'core', type: 'theory', status: 'draft', time: '5 min',
    ...extra,
  };
  const fmText = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n');
  const sections = {
    'Why should you care?': 'Placeholder text for engine testing.',
    'In one line': 'Placeholder.',
    'Explained': `### Q1. Placeholder?\nPlaceholder. ${body}`,
    'Key facts and formulas': '> [!important] Key facts\n> - Placeholder.',
    'Self-check': [1, 2, 3].map(quiz).join('\n'),
    'Flashcards': `Front ${id} one :: Back one\nFront ${id} two :: Back two`,
    'Sources': '- Placeholder source',
  };
  const md = Object.entries(sections)
    .filter(([k]) => !drop.includes(k))
    .map(([k, v]) => `## ${k}\n\n${v}\n`).join('\n');
  return `---\n${fmText}\nprerequisites: [${prerequisites.join(', ')}]\nrelated: [${related.join(', ')}]\nsources:\n  - "Placeholder"\n---\n\n${md}`;
}

const subject = (id, ids) => `---\nid: ${id}\ntitle: Subject ${id}\ntype: subject\n---\n${ids.map((x, i) => `${i + 1}. [[${x}]]`).join('\n')}\n`;
const course = `---\nid: data-scientist\ntitle: Data Scientist\ntype: course\nsummary: Placeholder.\n---\n## Stage 1 · Foundations\n*Why: placeholder.*\n- [[aa]]\n- [[future-note]]\n\n## Stage 2 · Core\n- [[bb]]\n`;

const registry = (...rows) => '| id | title | subject | type | status |\n|---|---|---|---|---|\n' +
  rows.map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n';
const FUTURE = ['future-note', 'Future Note', 'databases', 'theory', 'planned'];

const errors = (r) => r.problems.filter((p) => p.level === 'error').map((p) => p.msg);
const warnings = (r) => r.problems.filter((p) => p.level === 'warning').map((p) => p.msg);

function validTree() {
  return tree({
    'content/concepts/databases/aa.md': note('aa', { related: ['bb'] }),
    'content/concepts/databases/bb.md': note('bb', { prerequisites: ['aa'], body: 'See [[aa|the first note]] and [[future-note]].' }),
    'content/subjects/databases.md': subject('databases', ['aa', 'bb']),
    'content/courses/data-scientist.md': course,
    'REGISTRY.md': registry(FUTURE),
  });
}

test('valid tree builds and writes all outputs', () => {
  const root = validTree();
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  for (const f of ['manifest', 'graph', 'search', 'flashcards']) {
    assert.ok(fs.existsSync(path.join(root, 'dist/data', `${f}.json`)), `${f}.json missing`);
  }
  assert.ok(fs.existsSync(path.join(root, 'dist/content/concepts/databases/aa.md')));

  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(m.notes), ['aa', 'bb']);
  assert.deepEqual(m.notes.aa.backlinks, ['bb']);
  assert.ok(m.planned['future-note'], 'unknown ID should become planned');
  assert.deepEqual(m.planned['future-note'].referencedBy.sort(), ['bb', 'course:data-scientist']);
  assert.deepEqual(m.subjects[0].order, ['aa', 'bb']);
  assert.equal(m.courses[0].stages[0].why, 'Why: placeholder.');
  assert.deepEqual(m.courses[0].stages[0].items, ['aa', 'future-note']);
  assert.equal(m.notes.aa.quizzes, 3);

  const cards = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/flashcards.json'), 'utf8'));
  assert.equal(cards.length, 4);

  const reg = fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8');
  assert.match(reg, /\| aa \| Title aa \| databases \| theory \| draft \|/);
  assert.match(reg, /\| future-note \| Future Note \| databases \| theory \| planned \|/);
});

test('card IDs are stable across builds', () => {
  const root = validTree();
  build({ root });
  const a = fs.readFileSync(path.join(root, 'dist/data/flashcards.json'), 'utf8');
  build({ root });
  const b = fs.readFileSync(path.join(root, 'dist/data/flashcards.json'), 'utf8');
  assert.equal(a, b);
});

test('duplicate ID fails', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa'),
    'content/concepts/ml/aa.md': note('aa', { subject: 'ml' }),
  });
  assert.ok(errors(build({ root })).some((e) => e.includes('duplicate id "aa"')));
});

test('missing required section fails', () => {
  const root = tree({ 'content/concepts/databases/aa.md': note('aa', { drop: ['Flashcards'] }) });
  assert.ok(errors(build({ root })).includes('missing required section: ## Flashcards'));
});

test('malformed link fails', () => {
  const root = tree({ 'content/concepts/databases/aa.md': note('aa', { body: '[[Normalization]] and [[gradient descent]]' }) });
  const e = errors(build({ root }));
  assert.ok(e.some((x) => x.includes('malformed link [[Normalization]]')));
  assert.ok(e.some((x) => x.includes('malformed link [[gradient descent]]')));
});

test('link to an ID that is neither written nor planned fails, with a hint', () => {
  const root = tree({
    'content/concepts/databases/normalization.md': note('normalization'),
    'content/concepts/databases/aa.md': note('aa', { body: 'See [[normalisation]].' }),
  });
  const e = errors(build({ root }));
  assert.ok(e.some((x) => x.includes('broken link [[normalisation]]') && x.includes('did you mean "normalization"')));
});

test('link to a planned row is valid', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa', { body: 'See [[later-topic]].' }),
    'REGISTRY.md': registry(['later-topic', 'Later Topic', 'ml', 'theory', 'planned']),
  });
  assert.deepEqual(errors(build({ root })), []);
});

test('planned ID similar to an existing ID warns', () => {
  const root = tree({
    'content/concepts/databases/normalization.md': note('normalization'),
    'REGISTRY.md': registry(['normalisation', 'Normalisation', 'databases', 'theory', 'planned']),
  });
  assert.ok(warnings(build({ root })).some((w) => w.includes('"normalisation" looks very similar to written note "normalization"')));
});

test('incomplete planned row fails', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa'),
    'REGISTRY.md': registry(['later-topic', '?', 'maths', 'theory', 'planned']),
  });
  const e = errors(build({ root }));
  assert.ok(e.some((x) => x.includes('planned row "later-topic"') && x.includes('title is missing') && x.includes('unknown subject "maths"')));
});

test('written note replaces its planned row; differences warn', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa'),
    'REGISTRY.md': registry(['aa', 'Old Title', 'ml', 'theory', 'planned']),
  });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(warnings(r).some((w) => w.includes('"aa" is now written') && w.includes('title "Old Title"') && w.includes('subject "ml"')));
  const reg = fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8');
  assert.match(reg, /\| aa \| Title aa \| databases \| theory \| draft \|/);
  assert.doesNotMatch(reg, /Old Title/);
});

test('practical and project notes: only v1.3 required sections', () => {
  const doc = (id, type, sections) => `---\nid: ${id}\ntitle: T\nsubject: python\nlevel: core\ntype: ${type}\nstatus: draft\ntime: 5 min\nsources: [x]\n---\n` +
    sections.map((h) => `## ${h}\n\nPlaceholder.\n`).join('\n');
  const root = tree({
    'content/concepts/python/pr-ok.md': doc('pr-ok', 'practical', ['Aim', 'Code', 'Output', 'Explanation', 'Viva questions', 'Sources']),
    'content/concepts/python/pj-ok.md': doc('pj-ok', 'project', ['Problem', 'Steps', 'Expected result', 'What interviewers ask about this', 'Sources']),
    'content/concepts/python/pj-bad.md': doc('pj-bad', 'project', ['Problem', 'Steps', 'Expected result', 'What interviewers ask about this']),
  });
  const r = build({ root });
  const e = r.problems.filter((p) => p.level === 'error');
  assert.deepEqual(e.map((p) => `${p.file}: ${p.msg}`), ['content/concepts/python/pj-bad.md: missing required section: ## Sources']);
});

test('prerequisite cycle fails', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa', { prerequisites: ['bb'] }),
    'content/concepts/databases/bb.md': note('bb', { prerequisites: ['aa'] }),
  });
  assert.ok(errors(build({ root })).some((e) => e.startsWith('prerequisite cycle')));
});

test('subject must match folder; id must match file name', () => {
  const root = tree({ 'content/concepts/ml/aa.md': note('bb', { subject: 'databases' }) });
  const e = errors(build({ root }));
  assert.ok(e.some((x) => x.includes('must match the file name')));
  assert.ok(e.some((x) => x.includes('file is in concepts/ml/')));
});

test('links and headings inside code blocks are ignored', () => {
  const body = '\n\n```python\n## Flashcards\nx = d[[0]]\n```\n\nInline `[[Bad Link]]` too.';
  const root = tree({ 'content/concepts/databases/aa.md': note('aa', { body }) });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(!warnings(r).some((w) => w.includes('appears twice')));
});

test('registry keeps hand-written planned rows and guards published IDs', () => {
  const root = validTree();
  fs.writeFileSync(path.join(root, 'REGISTRY.md'),
    '| id | title | subject | type | status |\n|---|---|---|---|---|\n' +
    '| future-note | Future Note | databases | theory | planned |\n' +
    '| gone-note | Gone | databases | theory | published |\n');
  const r = build({ root });
  assert.ok(errors(r).some((e) => e.includes('"gone-note" is "published" but no note file exists')));

  fs.writeFileSync(path.join(root, 'REGISTRY.md'),
    '| id | title | subject | type | status |\n|---|---|---|---|---|\n' +
    '| future-note | Future Note | databases | theory | planned |\n' +
    '| gradient-descent | Gradient Descent | calculus | theory | planned |\n');
  const r2 = build({ root });
  assert.deepEqual(errors(r2), []);
  const reg = fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8');
  assert.match(reg, /\| future-note \| Future Note \| databases \| theory \| planned \|/);
  assert.match(reg, /\| gradient-descent \| Gradient Descent \| calculus \|/);
});

test('--check writes nothing and flags a stale registry', () => {
  const root = validTree();
  const r = build({ root, check: true });
  assert.deepEqual(errors(r), []);
  assert.ok(!fs.existsSync(path.join(root, 'dist')));
  assert.equal(fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8'), registry(FUTURE));
  assert.ok(warnings(r).some((w) => w.includes('out of date')));
});

test('quiz without answer fails', () => {
  const md = note('aa').replace('> > [!answer]- Answer: A', '> > no answer here');
  const root = tree({ 'content/concepts/databases/aa.md': md });
  assert.ok(errors(build({ root })).some((e) => e.includes('each question needs one answer')));
});

test('similar-ID check: typos warn, distinct concepts do not', () => {
  const root = tree({
    'content/concepts/databases/normalization.md': note('normalization'),
    'REGISTRY.md': registry(
      ['denormalization', 'Denormalization', 'databases', 'theory', 'planned'],
      ['noramlization', 'Typo', 'databases', 'theory', 'planned'],
      ['normal-ization', 'Typo', 'databases', 'theory', 'planned'],
    ),
  });
  const w = warnings(build({ root })).filter((x) => x.includes('looks very similar'));
  assert.ok(!w.some((x) => x.includes('"denormalization"')));
  assert.ok(w.some((x) => x.includes('"noramlization"')));
  assert.ok(w.some((x) => x.includes('"normal-ization"')));
});

test('build copies the reader engine and adds site data to the manifest', () => {
  const root = validTree();
  fs.mkdirSync(path.join(root, 'content/assets/img/databases'), { recursive: true });
  fs.writeFileSync(path.join(root, 'content/assets/img/databases/er.png'), 'x');
  build({ root });
  for (const f of ['index.html', 'path.html', 'note.html', 'assets/reader.js', 'assets/notes.css', 'assets/icons.js', 'assets/sections.js', 'assets/classroom.js', 'whats-new.html', 'syllabus.html', '.nojekyll']) {
    assert.ok(fs.existsSync(path.join(root, 'dist', f)), `${f} missing from dist`);
  }
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.ok(m.site.title);
  assert.equal(m.subjectTitles.databases, 'Subject databases'); // subject index title wins
  assert.equal(m.subjectTitles.ml, 'Machine Learning'); // config fallback
  assert.equal(m.assets['er.png'], 'content/assets/img/databases/er.png');
});

test('subject index level headings become groups; flat order kept for navigation', () => {
  const root = validTree();
  fs.writeFileSync(path.join(root, 'content/subjects/databases.md'),
    '---\nid: databases\ntitle: DB\ntype: subject\n---\n## Basics\n1. [[aa]]\n\n## Design\n2. [[bb]]\n3. [[future-note]]\n');
  build({ root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.deepEqual(m.subjects[0].order, ['aa', 'bb', 'future-note']);
  assert.deepEqual(m.subjects[0].groups, [
    { title: 'Basics', sub: null, items: ['aa'] },
    { title: 'Design', sub: null, items: ['bb', 'future-note'] },
  ]);
});

test('a repository with no content/ yet still builds an empty site', () => {
  const root = tree({ 'README.md': 'x' });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(fs.existsSync(path.join(root, 'dist/index.html')));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.deepEqual(m.notes, {});
});

test('registry: written rows get summary (first sentence of "In one line") and prerequisites', () => {
  const long = 'A database management system is software that stores, organises and protects shared data for many users at once, safely and efficiently';
  const root = tree({
    'content/concepts/databases/aa.md': note('aa').replace('## In one line\n\nPlaceholder.', '## In one line\n\nStores **shared** data, see [[bb|the bb note]]. Second sentence is ignored.'),
    'content/concepts/databases/bb.md': note('bb', { prerequisites: ['aa', 'cc'] }).replace('## In one line\n\nPlaceholder.', `## In one line\n\n${long}.`),
    'content/concepts/databases/cc.md': note('cc'),
  });
  build({ root });
  const reg = fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8');
  assert.match(reg, /\| id \| title \| subject \| type \| status \| summary \| prerequisites \|/);
  assert.match(reg, /\| aa \| Title aa \| databases \| theory \| draft \| Stores shared data, see the bb note \|  \|/);
  const bb = reg.split('\n').find((l) => l.startsWith('| bb |'));
  const summary = bb.split(' | ')[5];
  assert.ok(summary.endsWith('…') && summary.length <= 121, `trimmed summary: ${summary}`);
  assert.ok(bb.endsWith('| aa, cc |'));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.notes.aa.summary, 'Stores shared data, see the bb note');
});

test('registry: planned rows keep hand-typed summary and prerequisites; old 5-column rows still parse', () => {
  const root = validTree();
  fs.writeFileSync(path.join(root, 'REGISTRY.md'),
    '| id | title | subject | type | status | summary | prerequisites |\n|---|---|---|---|---|---|---|\n' +
    '| future-note | Future Note | databases | theory | planned | Covers: a, b \\| c, and d | aa, bb |\n' +
    '| old-style | Old Style | ml | theory | planned |\n');
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  const reg = fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8');
  assert.match(reg, /\| future-note \| Future Note \| databases \| theory \| planned \| Covers: a, b \\\| c, and d \| aa, bb \|/);
  assert.match(reg, /\| old-style \| Old Style \| ml \| theory \| planned \|  \|  \|/);
  // a second build leaves the file unchanged
  build({ root });
  assert.equal(fs.readFileSync(path.join(root, 'REGISTRY.md'), 'utf8'), reg);
});

test('summary keeps maths subscripts and snake_case, drops emphasis markers', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa').replace('## In one line\n\nPlaceholder.',
      '## In one line\n\nThe mean $x_i$ of _each_ user_id is **bold**.'),
  });
  build({ root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.notes.aa.summary, 'The mean $x_i$ of each user_id is bold');
});

test('syllabus field, answer-skeleton highlights and [!beyond] checks', () => {
  const eight = Array.from({ length: 8 }, (_, i) => `- ==point ${i + 1}== more words`).join('\n');
  const seven = Array.from({ length: 7 }, (_, i) => `- ==point ${i + 1}== more words`).join('\n');
  const body = `\n\n### Q2. Long answer?\n${eight}\n\n### Q3. Fine answer?\n${seven} and \`==code==\`\n\n> [!beyond] Extra\n> A ==beyond highlight==.`;
  const md = note('aa', { body }).replace('## In one line\n\nPlaceholder.', '## In one line\n\n==Do not highlight here.==')
    .replace('## Why should you care?\n\nPlaceholder text for engine testing.', '## Why should you care?\n\n==Not for copying.==');
  const w = warnings(build({ root: tree({ 'content/concepts/databases/aa.md': md }) }));
  assert.ok(w.some((x) => x.includes('already a write-down section')), 'highlight in a write-down section warns');
  assert.ok(w.some((x) => x.includes('"## Why should you care?" is for reading')), 'highlight in a reading section warns');
  assert.ok(w.some((x) => x.includes('"Q2. Long answer?" has 8 ==highlights==')), 'more than 7 in one answer warns');
  assert.ok(!w.some((x) => x.includes('Q3. Fine answer?')), '7 in one answer is fine (code ignored)');
  assert.ok(w.some((x) => x.includes('highlight inside a [!beyond] box')), 'highlight in [!beyond] warns');
  assert.ok(w.some((x) => x.includes('uses [!beyond] but has no "syllabus"')), '[!beyond] without syllabus warns');

  // many highlights across a note are fine when each answer stays within the limit (old 5-per-note cap gone)
  const many = [2, 3, 4].map((q) => `### Q${q}. Answer?\n${seven}`).join('\n\n');
  let root = tree({ 'content/concepts/databases/aa.md': note('aa', { body: `\n\n${many}\n\n> [!beyond] Extra\n> Placeholder.`, extra: { syllabus: '[UDSII-002]' } }) });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(!warnings(r).some((x) => /beyond|highlight/.test(x)), JSON.stringify(warnings(r)));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.deepEqual(m.notes.aa.syllabus, ['UDSII-002']);

  root = tree({ 'content/concepts/databases/aa.md': note('aa', { extra: { syllabus: 'UDSII-002' } }) });
  assert.ok(errors(build({ root })).some((x) => x.includes('syllabus must be a list')));
});

const introNote = (subject, id = `${subject}-intro`) => `---\nid: ${id}\ntitle: Intro\nsubject: ${subject}\ntype: intro\nstatus: draft\ntime: 5 min\nsources: [x]\n---\n` +
  ['Why this subject matters', 'A short story', 'Where it is used today', 'What you will be able to do', 'Careers that use it', 'Map of the subject', 'Sources']
    .map((h) => `## ${h}\n\nPlaceholder.\n`).join('\n');

test('intro notes: required sections, ID rule, no level needed, first in the index', () => {
  let root = tree({
    'content/concepts/databases/databases-intro.md': introNote('databases'),
    'content/concepts/databases/aa.md': note('aa'),
    'content/subjects/databases.md': subject('databases', ['aa', 'databases-intro']),
  });
  let r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(warnings(r).some((w) => w.includes('"databases-intro" should be first')));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.subjects[0].intro, 'databases-intro');

  root = tree({ 'content/concepts/databases/db-start.md': introNote('databases', 'db-start') });
  assert.ok(errors(build({ root })).some((e) => e.includes('must be "databases-intro"')));
  root = tree({ 'content/concepts/databases/databases-intro.md': introNote('databases').replace('## A short story\n\nPlaceholder.\n', '') });
  assert.ok(errors(build({ root })).includes('missing required section: ## A short story'));
});

test('alt text: diagrams need accTitle and accDescr, images need alt text', () => {
  const md = note('aa', { body: '\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```mermaid\nflowchart LR\n  accTitle: T\n  accDescr: D\n  A --> B\n```\n\n![](x.png) ![ok](y.png) ![[z.png]] ![[w.png|fine]]' });
  const w = warnings(build({ root: tree({ 'content/concepts/databases/aa.md': md }) }));
  assert.equal(w.filter((x) => x.includes('no accTitle or accDescr')).length, 1);
  assert.equal(w.filter((x) => x.includes('image without alt text')).length, 1); // one line, two bad images
});

test('last updated and added dates come from git history', () => {
  const root = validTree();
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  git('add', '-A');
  execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'first'], { stdio: 'ignore', env: { ...process.env, GIT_COMMITTER_DATE: '2026-01-01T10:00:00+05:30' } });
  fs.appendFileSync(path.join(root, 'content/concepts/databases/bb.md'), '\n');
  git('add', '-A');
  execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'second'], { stdio: 'ignore', env: { ...process.env, GIT_COMMITTER_DATE: '2026-02-01T10:00:00+05:30' } });
  build({ root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.ok(m.notes.bb.updated.startsWith('2026-02-01'), m.notes.bb.updated);
  assert.ok(m.notes.bb.added < m.notes.bb.updated);
  assert.equal(m.notes.aa.updated, m.notes.aa.added);
});

test('a note outside git has no dates; feedback link is off until configured', () => {
  const root = validTree();
  build({ root });
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.notes.aa.updated, null);
  assert.equal(m.site.feedback, null);
});

test('unit and practical fields, Practicals heading and syllabus pages', () => {
  const prac = (id, n, extra = '') => `---\nid: ${id}\ntitle: P${n}\nsubject: databases\nlevel: core\ntype: practical\nstatus: draft\ntime: 5 min\nsources: [x]\n${extra}---\n` +
    ['Aim', 'Code', 'Output', 'Explanation', 'Viva questions', 'Sources'].map((h) => `## ${h}\n\nPlaceholder.\n`).join('\n');
  const root = tree({
    'content/concepts/databases/aa.md': note('aa', { extra: { syllabus: '[UDSVI-006]', unit: 2 } }),
    'content/concepts/databases/bb.md': note('bb', { extra: { syllabus: '[UDSVI-006]', unit: 1 } }),
    'content/concepts/databases/cc.md': note('cc', { extra: { syllabus: '[UDSVI-006]' } }),
    'content/concepts/databases/two-practical.md': prac('two-practical', 2, 'practical: 2\nsyllabus: [UDSVI-006]\nunit: 2\n'),
    'content/concepts/databases/one-practical.md': prac('one-practical', 1, 'practical: 1\nsyllabus: [UDSVI-006, XYZ-1]\nunit: 2\n'),
    'content/subjects/databases.md': '---\nid: databases\ntitle: DB\ntype: subject\n---\n## Basics\n1. [[bb]]\n2. [[aa]]\n3. [[cc]]\n4. [[two-practical]]\n\n## Practicals\n5. [[one-practical]]\n',
  });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  const w = warnings(r);
  assert.ok(w.some((x) => x.includes('practical "two-practical" should be listed under "## Practicals"')));
  assert.ok(w.some((x) => x.includes('syllabus code "XYZ-1" has no course name')));
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.notes['one-practical'].practical, 1);
  const aba = m.syllabi.find((y) => y.code === 'UDSVI-006');
  assert.equal(aba.title, 'Applied Business Analytics');
  assert.deepEqual(aba.units.map((u) => [u.unit, u.items]), [
    [1, ['bb']],
    [2, ['aa', 'one-practical', 'two-practical']], // theory first, then practicals by number
    [null, ['cc']], // no unit: "Other notes", last
  ]);
  assert.equal(aba.units[0].title, 'Introduction to Business Analytics');
  assert.equal(m.syllabi.find((y) => y.code === 'XYZ-1').title, 'XYZ-1');
});

test('unit and practical must be whole numbers; practical warnings', () => {
  let root = tree({ 'content/concepts/databases/aa.md': note('aa', { extra: { unit: 'one' } }) });
  assert.ok(errors(build({ root })).some((e) => e.includes('unit must be a whole number')));
  root = tree({ 'content/concepts/databases/aa.md': note('aa', { extra: { practical: 3, unit: 1 } }) });
  const w = warnings(build({ root }));
  assert.ok(w.some((x) => x.includes('"practical" is only for practical notes')));
  assert.ok(w.some((x) => x.includes('has a "unit" but no "syllabus"')));
});

// ---------- class-notes profile (plan Section 18) ----------

const cnTheory = (id, subject, extra = '', drop = []) => `---\nid: ${id}\ntitle: T ${id}\nsubject: ${subject}\nunit: 1\ntype: theory\nsyllabus: [UITVI-001]\nstatus: draft\nsources: [x]\n${extra}---\n` +
  ['Why should you care?', 'In one line', 'Explained', 'Analogy and real-life example', 'Key points', 'Exam questions', 'Sources']
    .filter((h) => !drop.includes(h)).map((h) => `## ${h}\n\nPlaceholder.\n`).join('\n');
const cnIndex = (subject, body) => `---\nid: ${subject}\ntitle: Subject ${subject}\ntype: index\nclass: Sem 6 BSc IT\n---\nSome prose.\n\n${body}`;

test('class-notes profile: layout, _index.md, planned from index, unit titles, no registry', () => {
  const root = tree({
    'content/sec/sec-intro.md': introNote('sec').replace('status: draft', 'status: draft\nunit: 0\nsyllabus: [UITVI-001]'),
    'content/sec/alpha.md': cnTheory('alpha', 'sec', '', []).replace('Placeholder.\n\n## Analogy', 'See [[beta]] and [[gamma-practical]].\n\n## Analogy'),
    'content/sec/_index.md': cnIndex('sec', '## Start here\n\n0. [[sec-intro]]\n\n## Theory\n\n### Module 1\n\n**Unit 1 · Fundamentals (8 h)**\n1. [[alpha]]: what it is\n2. [[beta]]\n\n## Practicals\n\n**Unit 1 · Router security**\n1. [[gamma-practical]]\n'),
    'content/assets/img/sec/.gitkeep': '',
  });
  const r = build({ root, profile: 'class-notes' });
  assert.deepEqual(errors(r), []);
  assert.ok(!fs.existsSync(path.join(root, 'REGISTRY.md')), 'no registry written');
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  assert.equal(m.site.title, 'Sutra · Class Notes');
  assert.equal(m.site.careerPaths, false);
  assert.deepEqual(Object.keys(m.notes).sort(), ['alpha', 'sec-intro']);
  assert.equal(m.planned.beta.title, 'Beta');
  assert.deepEqual(m.planned['gamma-practical'].referencedBy.sort(), ['alpha', 'subject:sec']);
  const s = m.subjects[0];
  assert.equal(s.about, 'Sem 6 BSc IT');
  assert.equal(s.intro, 'sec-intro');
  assert.deepEqual(s.groups.map((g) => [g.title, g.sub]), [['Start here', null], ['Theory', 'Unit 1 · Fundamentals (8 h)'], ['Practicals', 'Unit 1 · Router security']]);
  assert.equal(s.notes.alpha, 'what it is');
  const y = m.syllabi.find((x) => x.code === 'UITVI-001');
  assert.equal(y.title, 'Security in Computing');
  assert.deepEqual(y.units.map((u) => [u.unit, u.title]), [[0, 'Introduction'], [1, 'Fundamentals']]);
});

test('class-notes profile: required sections and broken links name the file and the fix', () => {
  const root = tree({
    'content/sec/alpha.md': cnTheory('alpha', 'sec', '', ['Exam questions']).replace('## Sources', 'Typo [[betta]].\n\n## Sources'),
    'content/sec/_index.md': cnIndex('sec', '## Theory\n1. [[alpha]]\n2. [[beta]]\n'),
    'content/stray.md': '# x',
  });
  const r = build({ root, profile: 'class-notes' });
  const e = r.problems.filter((p) => p.level === 'error');
  const miss = e.find((p) => p.msg === 'missing required section: ## Exam questions');
  assert.equal(miss.file, 'content/sec/alpha.md');
  assert.match(miss.fix, /add a "## Exam questions" heading.*templates\/theory-note\.md/);
  const broken = e.find((p) => p.msg.includes('broken link [[betta]]'));
  assert.ok(broken.msg.includes('did you mean "beta"') && broken.msg.includes('_index.md'), broken.msg);
  assert.equal(broken.fix, 'correct the ID');
  assert.ok(r.problems.some((p) => p.file === 'content/stray.md' && p.fix.includes('content/<subject-id>/')));
  // the main-site profile is unaffected by class-notes files: different layout, nothing found
  assert.ok(warnings(build({ root })).some((w) => w.includes('no notes found')));
});

test('every error carries a fix', () => {
  const root = tree({
    'content/concepts/databases/aa.md': note('aa', { drop: ['Flashcards'], body: '[[Bad Link]] [[nope-x]]', extra: { unit: 'x', level: 'expert' } }),
    'content/concepts/databases/bb.md': note('bb', { subject: 'ml' }),
  });
  const r = build({ root });
  const noFix = r.problems.filter((p) => p.level === 'error' && !p.fix);
  assert.deepEqual(noFix, []);
  assert.ok(r.problems.filter((p) => p.level === 'error').length >= 5);
});

test('career path format: What this job is, stages with why and milestone, Where am I?, Free resources', () => {
  const root = validTree();
  fs.writeFileSync(path.join(root, 'content/courses/data-scientist.md'),
    '---\nid: data-scientist\ntitle: Data Scientist\ntype: course\nsummary: S.\n---\n## What this job is\nA day at work with [[aa]].\n\n' +
    '## Stage 1 · Foundations\n*Why: because.*\n- [[aa]]\n- [[future-note]]\n\n**Milestone:** you can now\ndo X.\n\n' +
    '## Stage 2 · Core\n- [[bb]]\n\n## Stage 3 · Specialisation\n\n## Where am I?\n| Sem | Stage |\n|---|---|\n| 1 | 1 |\n\n## Free resources\n- [NPTEL](https://nptel.ac.in)\n');
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  const w = warnings(r);
  assert.ok(w.some((x) => x.includes('"Stage 2 · Core" has no milestone')), 'stage with notes but no milestone warns');
  assert.ok(!w.some((x) => x.includes('Stage 3')), 'an empty future stage needs nothing');
  assert.ok(!w.some((x) => x.includes('not a stage')), 'the named sections are accepted');
  const m = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/manifest.json'), 'utf8'));
  const c = m.courses[0];
  assert.equal(c.whatIs, 'A day at work with [[aa]].');
  assert.match(c.whereAmI, /^\| Sem \| Stage \|/);
  assert.equal(c.resources, '- [NPTEL](https://nptel.ac.in)');
  assert.deepEqual(c.stages.map((s) => [s.title, s.why, s.milestone, s.items]), [
    ['Stage 1 · Foundations', 'Why: because.', 'you can now do X.', ['aa', 'future-note']],
    ['Stage 2 · Core', null, null, ['bb']],
    ['Stage 3 · Specialisation', null, null, []],
  ]);
  assert.ok(m.notes.aa.backlinks.includes('course:data-scientist') === false); // backlinks list notes only
});

test('a path file without the new sections warns, naming the fix', () => {
  const root = validTree(); // old-format course
  const w = build({ root }).problems.filter((p) => p.file === 'content/courses/data-scientist.md' && p.level === 'warning');
  assert.ok(w.some((p) => p.msg.includes('no "## What this job is"') && p.fix.includes('Indian employers')));
  assert.ok(w.some((p) => p.msg.includes('no "## Where am I?"')));
});

test('practicals: Before the lab, Steps, Common errors and fixes warn for now; Code no longer required', () => {
  const prac = (sections) => `---\nid: p-practical\ntitle: P\nsubject: databases\nlevel: core\ntype: practical\npractical: 1\nstatus: draft\ntime: 5 min\nsources: [x]\n---\n` +
    sections.map((h) => `## ${h}\n\nPlaceholder.\n`).join('\n');
  let r = build({ root: tree({ 'content/concepts/databases/p-practical.md': prac(['Aim', 'Output', 'Explanation', 'Viva questions', 'Sources']) }) });
  assert.deepEqual(errors(r), []);
  const w = r.problems.filter((p) => p.level === 'warning' && p.msg.includes('will become an error'));
  assert.deepEqual(w.map((p) => p.msg.match(/## (.*) \(/)[1]), ['Before the lab', 'Steps', 'Common errors and fixes']);
  r = build({ root: tree({ 'content/concepts/databases/p-practical.md': prac(['Aim', 'Before the lab', 'Steps', 'Output', 'Explanation', 'Common errors and fixes', 'Viva questions', 'Sources']) }) });
  assert.ok(!r.problems.some((p) => p.msg.includes('will become an error')));
  // class-notes profile: same rule
  r = build({ root: tree({ 'content/sec/p-practical.md': prac(['Aim', 'Output', 'Explanation', 'Viva questions', 'Sources']).replace('subject: databases', 'subject: sec'), 'content/sec/_index.md': '---\nid: sec\ntitle: S\ntype: index\n---\n## Practicals\n1. [[p-practical]]\n' }), profile: 'class-notes' });
  assert.deepEqual(errors(r), []);
  assert.equal(r.problems.filter((p) => p.msg.includes('will become an error')).length, 3);
});
