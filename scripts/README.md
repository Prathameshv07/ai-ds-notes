# Build script

Reads `content/` (never changes it), validates it, generates the site data, and copies the
reader from `engine/` into `dist/`.
Follows NOTES_PROJECT_PLAN.md v1.3.

```
npm install        # once
npm run build      # validate, write dist/ and update REGISTRY.md
npm run check      # validate only, write nothing (what CI runs)
npm test           # test the build script itself
```

## Links (plan 7.3)

A link is valid if its ID is a written note, or a `planned` row in `REGISTRY.md`.
The build fails on:
- malformed links, e.g. `[[Normalization]]` or `[[gradient descent]]`;
- links to an ID that is neither written nor planned, e.g. a typo like
  `[[normalisation]]`. The error suggests the closest existing ID.

A planned ID one letter away from another ID (or with two letters swapped, or only
a hyphen different) gives a warning, as a second check against typos.

## Registry (plan 10)

Columns: `id | title | subject | type | status | summary | prerequisites`.

- Rows for written notes are generated from each note:
  - `summary` is the first sentence of its "In one line" section, as plain text,
    trimmed to about 120 characters (`REGISTRY_SUMMARY_MAX` in `config.mjs`);
  - `prerequisites` are the IDs from its front matter, comma-separated.
- Planned rows are typed by hand and kept exactly as written, including their
  `summary` (written as `Covers: …`) and `prerequisites`. Each must have a title, a
  known subject and a known type, or the build fails. Old 5-column rows still work;
  their two new columns are simply empty.
- When a planned note is written, the generated row replaces the planned one. The
  build warns if the title or subject differ.
- A non-planned ID whose note file disappears fails the build.

## Other checks

**Errors:** duplicate IDs, ID not matching file name, ID not kebab-case, missing
front matter fields, unknown subject/level/type/status/tag, note in the wrong subject
folder, missing required sections, prerequisite cycles, a quiz without an answer, and
an empty flashcard side.

**Warnings:** self-check outside 3–5 questions, a note missing from its subject index,
course links outside a stage, and a stale `REGISTRY.md` (in `--check` mode).
`--strict` turns warnings into failures.

**Required sections** (in `config.mjs`):
- theory: Why should you care?, In one line, Explained, Key facts and formulas,
  Self-check, Flashcards, Sources
- practical: Aim, Code, Output, Explanation, Viva questions, Sources
- project: Problem, Steps, Expected result, What interviewers ask about this, Sources

**Flashcard IDs** are a hash of the note ID plus the question text, so spaced-repetition
progress survives rebuilds. Editing a card's question resets that card's progress.

When the plan changes, edit only `config.mjs`.
