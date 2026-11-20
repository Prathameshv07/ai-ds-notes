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
  note.html              ?id=<note-id>: one note
  assets/reader.js       the shared engine (rendering, navigation, settings, share, QR, print)
  assets/notes.css       styles, including dark mode and print
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

## Changing things

- **Site title and tagline:** `SITE` in `scripts/config.mjs` (title: Sutra).
- **Subjects, paths, required sections:** `scripts/config.mjs`.
- **Section icons and colours:** `engine/assets/sections.js`. To add an icon, copy its inner SVG
  from lucide.dev into `engine/assets/icons.js`.
- **Reusing the engine for `class-notes`:** the reader (`engine/`) works as is. The build
  script needs a small change for that repo's folder layout and lighter template (plan,
  Section 18); do that when the repo is ready to become a website.
