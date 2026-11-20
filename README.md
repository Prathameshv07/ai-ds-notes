# Sutra (ai-ds-notes): engine

Sutra is a static notes website on GitHub Pages (NOTES_PROJECT_PLAN.md). Notes are Obsidian Markdown in
`content/`; this engine validates them and publishes them as a website. Phase 1 (reader) is built.

## Commands

```
npm install        # once
npm run build      # validate content/, update REGISTRY.md, write the site to dist/
npm run serve      # build, then preview at http://localhost:8000
npm run demo       # preview the reader with placeholder test notes (before real notes exist)
npm run check      # validate only, write nothing (what GitHub runs)
npm test           # test the build script
```

Opening `dist/index.html` by double-clicking won't work (browsers block local file loading);
use `npm run serve`.

## Folders

```
content/               notes (read-only for the engine; see the plan, Section 7.2)
engine/                the reader, copied into dist/ by the build
  index.html             home: career paths and subjects
  path.html              ?subject=<id> (grouped by level headings) or ?course=<id> (stages)
  syllabus.html          ?code=<course code>: notes for one university course, by unit
  whats-new.html         notes added or changed recently (from git history)
  note.html              ?id=<note-id>: one note
  assets/reader.js       the shared engine (rendering, navigation, settings, share, QR, print)
  assets/notes.css       styles, including dark mode and print
  assets/classroom.js    present mode, step-by-step reveal, exit ticket, Notebook view
  assets/sections.js     icon and colour for each section type and callout  ← edit to restyle
  assets/icons.js        the Lucide icons the site uses (ISC licence)
scripts/
  build.mjs              validation + site data (see scripts/README.md)
  config.mjs             subjects, paths, required sections, site title     ← edit when the plan changes
  serve.mjs              local preview server
tests/                 build tests; fixtures/site/ holds placeholder notes for the demo
.github/workflows/     tests, validation and deployment to GitHub Pages
```

## Publishing on GitHub Pages (one-time setup)

1. Push the repository to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` now runs the tests, validates the notes, builds and publishes the site.
   If a note has an error (broken link, missing section…), the push is not published and the
   Actions tab shows what to fix.

## What the reader does (Phase 1)

- Renders the plan's Section 8.5 syntax exactly: callouts, `[!quiz]` with collapsed `[!answer]`,
  `$maths$`, Mermaid diagrams, highlighted code with a copy button, `output` blocks, wikilinks,
  and `front :: back` flashcards (tap to reveal; spaced repetition comes in Phase 2).
- Adds an icon and colour to every known section and callout; the chip shows the level of
  teaching (Memory, Understanding, Reflective, Practice). Authors never place icons.
- Planned notes appear greyed. Each note shows "Before you start" (prerequisites), "See also"
  (related), a table of contents, and previous/next along the subject, or along the course when
  opened from a career path.
- Draft notes are shown with a "Draft" badge.
- Reader settings: theme (auto/light/dark), text size, reading width. Saved in the browser.
- Every heading has a link button (share sheet on phones, copy on laptops). Links look like
  `note.html?id=normalization#q3-how-does-it-work`; renaming a heading changes its link.
- Share and QR code buttons on every note.
- Print (Ctrl+P): no menus or buttons, collapsed boxes opened, answers moved to an answer key on
  the last page, footer with the link and licence, extra left margin for binding.
- Libraries (marked, KaTeX, Mermaid, highlight.js, qrcodejs) load from cdnjs only when a note
  needs them, to keep data use low.

## Pages and print (plan v2.2, v2.3)

- **Subject page:** the intro note (`type: intro`, ID `<subject>-intro`) leads as a "Start here"
  card. Level headings (`## Basics`, `## Practicals`…) become groups; practicals show
  "Practical N" from their `practical:` field. Tick notes (or a whole group) and press
  **Print selected** to print them as one document.
- **Syllabus pages:** one per course code found in notes' `syllabus:` field, notes from every
  subject grouped by `unit:` (theory in subject order, then practicals by number; notes without a
  unit go to "Other notes"). Linked from the home page. Course names and unit titles are in
  `COURSES` in `scripts/config.mjs`; add an entry when a new course starts (the build warns).
- **Print** (button on each note, and Print selected): **Notebook sheet** (default; write-down
  parts only) or **Full note** (answers in a key at the end), page size **A4 or A5**, with a
  one-line booklet hint. The last choice is remembered. Ctrl+P prints the note as shown.
- **Last updated** under each note's title and the **What's new** page come from git history
  (the GitHub Action fetches the full history for this).
- **"Was this clear?"** link at the end of every note, once `FEEDBACK` in `scripts/config.mjs`
  has the form link and its note-ID field (instructions in that file). Hidden until then.
- **Alt text:** a diagram's `accTitle` is shown as its caption, and `accTitle`/`accDescr` replace
  the diagram while it loads or if it can't be drawn. A picture on its own line gets its alt text
  as a caption. The build warns about diagrams or pictures without alt text.

## Classroom (Phase 1.5)

Buttons under each note's title:

- **Present:** full-screen slides, one per `##` section. Slides never scroll: a long section is
  split at its `###` questions, text may shrink to 70%, and anything still too tall continues on
  "(continued)" slides, split between paragraphs, list items, table rows or callout parts. Slides
  are rebuilt when the window size changes (e.g. entering full screen). **Key points** (K) shows
  only headings, highlights, lists, tables, boxes, formulas and diagrams. The first slide shows the
  note's QR code; the last is an **exit ticket** with two random Self-check questions (tap to see
  the answer; "Other questions" picks two more). Self-check, Flashcards and Sources are not slides.
  Keys: → / Space next, ← back, Home / End, **K** key points, **R** step by step, **F** full screen, **Esc** exit.
  On a phone or tablet: swipe, or tap the right/left side.
- **Step by step** (in present mode): list items appear one at a time. The choice is remembered.
- **Notebook:** only the write-down parts, projector-sized, as a dictation sheet: "In one line",
  "Diagram", "Key facts and formulas", and every `==highlighted==` line, grouped under its question.
  Highlights inside `[!beyond]` boxes are left out.
- **Whiteboard:** opens excalidraw.com in a new tab (also in the present-mode toolbar).

Write-down marking (plan 8.5): `==text==` shows as a highlight with a pen icon, on the page, in
slides and in print. The three write-down sections get a pen "Write down" chip automatically.
`> [!beyond]` boxes are muted and labelled "Not in syllabus". A note may list its course codes in
`syllabus: [UDSII-002]`, shown under the title. The build warns about a highlight inside a
write-down section, more than 5 highlights, or `[!beyond]` without a `syllabus` field.

Self-check answers: a closed answer whose title gives the answer away (`Answer: B`) shows
"Show answer" instead; the full title appears once it is opened.

## Changing things

- **Site title and tagline:** `SITE` in `scripts/config.mjs` (title: Sutra).
- **Subjects, paths, required sections, registry summary length:** `scripts/config.mjs`.
- **REGISTRY.md** is the topic map (plan Section 10): `id | title | subject | type | status |
  summary | prerequisites`. Written-note rows are generated by `npm run build`; planned rows are
  typed by hand and kept as written. See `scripts/README.md`.
- **Write-down sections and highlight limit:** `WRITE_DOWN_SECTIONS` and `HIGHLIGHT_MAX` in
  `scripts/config.mjs`, plus `writeDown: true` in `engine/assets/sections.js` (keep both in step).
- **Section icons and colours:** `engine/assets/sections.js`. To add an icon, copy its inner SVG
  from lucide.dev into `engine/assets/icons.js`.
- **Reusing the engine for `class-notes`:** the reader (`engine/`) works as is. The build
  script needs a small change for that repo's folder layout and lighter template (plan,
  Section 18); do that when the repo is ready to become a website.

## Licence

The notes in `content/` are licensed **CC BY-NC-SA 4.0** (plan Section 7.6); the full text is in
`LICENSE`.
