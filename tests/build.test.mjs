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
    { title: 'Basics', items: ['aa'] },
    { title: 'Design', items: ['bb', 'future-note'] },
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

test('syllabus field, ==highlights== and [!beyond] checks', () => {
  const body = (extra) => note('aa', { body: extra })
    .replace('## In one line\n\nPlaceholder.', '## In one line\n\n==Do not highlight here.==');
  let root = tree({ 'content/concepts/databases/aa.md': body('==one== ==two== ==three== ==four== ==five== ==six== and `==code==`\n\n> [!beyond] Extra\n> Placeholder.') });
  let w = warnings(build({ root }));
  assert.ok(w.some((x) => x.includes('already a write-down section')), 'highlight in a write-down section warns');
  assert.ok(w.some((x) => x.includes('6 ==highlights==')), 'more than 5 highlights warns (code ignored)');
  assert.ok(w.some((x) => x.includes('uses [!beyond] but has no "syllabus"')), '[!beyond] without syllabus warns');

  root = tree({ 'content/concepts/databases/aa.md': note('aa', { body: '==one==\n\n> [!beyond] Extra\n> Placeholder.', extra: { syllabus: '[UDSII-002]' } }) });
  const r = build({ root });
  assert.deepEqual(errors(r), []);
  assert.ok(!warnings(r).some((x) => /beyond|highlight/.test(x)));
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
  assert.ok(w.some((x) => x.includes('syllabus code "XYZ-1" has no name')));
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
