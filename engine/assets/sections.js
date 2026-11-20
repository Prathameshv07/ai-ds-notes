/* Automatic icons and colours (NOTES_PROJECT_PLAN.md Sections 11 and 12).
   Authors never place icons: the engine looks up each ## section and each callout here.

   level: the colour group, from the template's M / U / R labels (Section 8.1).
     M = Memory, U = Understanding, R = Reflective,
     P = Practice (self-check, viva and interview questions), N = neutral (no chip).
   Section names are matched case-insensitively; text in brackets is ignored,
   so "Concepts used (links)" matches "Concepts used". Unknown sections get no icon.

   writeDown: true marks the sections students copy into their notebooks (plan Section 8.5).
   They get a pen icon and appear in Notebook view, together with ==highlighted== lines.
   Keep this list in step with WRITE_DOWN_SECTIONS in scripts/config.mjs. */
var SECTION_STYLES = {
  // theory (8.1)
  'why should you care?':           { icon: 'lightbulb',              level: 'U' },
  'in one line':                    { icon: 'anchor',                 level: 'M', writeDown: true },
  'explained':                      { icon: 'message-circle-question', level: 'U' },
  'analogy and real-life example':  { icon: 'puzzle',                 level: 'U' },
  'diagram':                        { icon: 'workflow',               level: 'U', writeDown: true },
  'worked example':                 { icon: 'notebook-pen',           level: 'U' },
  'try it':                         { icon: 'pencil',                 level: 'U' },
  'key facts and formulas':         { icon: 'star',                   level: 'M', writeDown: true },
  'common mistakes':                { icon: 'triangle-alert',         level: 'R' },
  'think deeper':                   { icon: 'brain',                  level: 'R' },
  'self-check':                     { icon: 'list-checks',            level: 'P' },
  'flashcards':                     { icon: 'layers',                 level: 'M' },
  'sources':                        { icon: 'book-open',              level: 'N' },
  // practical (8.2)
  'aim':                            { icon: 'crosshair',              level: 'U' },
  'concepts used':                  { icon: 'link',                   level: 'N' },
  'setup':                          { icon: 'wrench',                 level: 'N' },
  'code':                           { icon: 'code',                   level: 'U' },
  'output':                         { icon: 'terminal',               level: 'U' },
  'explanation':                    { icon: 'message-square-text',    level: 'U' },
  'viva questions':                 { icon: 'mic',                    level: 'P' },
  // project (8.3)
  'problem':                        { icon: 'circle-help',            level: 'U' },
  'dataset':                        { icon: 'database',               level: 'N' },
  'steps':                          { icon: 'footprints',             level: 'U' },
  'expected result':                { icon: 'flag',                   level: 'U' },
  'extensions':                     { icon: 'rocket',                 level: 'R' },
  'what interviewers ask about this': { icon: 'briefcase',            level: 'P' },
  // subject intro note (8.6)
  'why this subject matters':       { icon: 'lightbulb',              level: 'U' },
  'a short story':                  { icon: 'book-open',              level: 'U' },
  'where it is used today':         { icon: 'map',                    level: 'U' },
  'what you will be able to do':    { icon: 'crosshair',              level: 'U' },
  'careers that use it':            { icon: 'briefcase',              level: 'U' },
  'map of the subject':             { icon: 'workflow',               level: 'U' },
};

var LEVEL_NAMES = { M: 'Memory', U: 'Understanding', R: 'Reflective', P: 'Practice' };

/* Obsidian callout types (Section 8.5). Unknown types render like "note", as in Obsidian. */
var CALLOUT_STYLES = {
  important: { icon: 'star',           color: 'amber'  },
  warning:   { icon: 'triangle-alert', color: 'red'    },
  caution:   { icon: 'triangle-alert', color: 'red'    },
  danger:    { icon: 'octagon-alert',  color: 'red'    },
  tip:       { icon: 'sparkles',       color: 'green'  },
  success:   { icon: 'circle-check',   color: 'green'  },
  note:      { icon: 'pencil',         color: 'blue'   },
  info:      { icon: 'info',           color: 'blue'   },
  question:  { icon: 'circle-help',    color: 'blue'   },
  example:   { icon: 'flask-conical',  color: 'violet' },
  summary:   { icon: 'clipboard-list', color: 'teal'   },
  abstract:  { icon: 'clipboard-list', color: 'teal'   },
  quote:     { icon: 'quote',          color: 'grey'   },
  quiz:      { icon: 'list-checks',    color: 'blue'   },
  answer:    { icon: 'circle-check',   color: 'green'  },
  beyond:    { icon: 'telescope',      color: 'grey', label: 'Not in syllabus' }, // content outside the note's syllabus
};
