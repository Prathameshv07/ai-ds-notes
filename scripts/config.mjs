// Allowed values from NOTES_PROJECT_PLAN.md.
// When the planning chat changes the plan, update this file (and only this file).

// Section 5: subject catalogue
export const SUBJECTS = [
  'linear-algebra', 'calculus', 'prob-stats', 'python', 'databases',
  'data-analysis', 'data-viz', 'ml',
  'dl', 'nlp', 'cv', 'data-eng', 'bi',
  'genai', 'mlops', 'rl', 'research',
];

// Section 6: career paths
export const PATHS = [
  'data-analyst', 'data-scientist', 'data-engineer', 'ml-engineer',
  'ai-engineer', 'mlops-engineer', 'ai-researcher',
];

// Section 7.4 and 8.4
export const LEVELS = ['foundation', 'core', 'advanced'];
export const TYPES = ['theory', 'practical', 'project', 'intro', 'paper'];
export const TAGS = ['interview'];

// Section 10
export const STATUSES = ['planned', 'draft', 'reviewed', 'published'];

// Section 8.1 front matter
export const REQUIRED_FIELDS = ['id', 'title', 'subject', 'level', 'type', 'status'];
export const RECOMMENDED_FIELDS = ['time', 'sources'];

// Section 8: required H2 sections per note type (plan v1.3).
// All other sections listed in the templates are optional.
// Paper notes have no template yet (8.4, later).
export const REQUIRED_SECTIONS = {
  theory: [
    'Why should you care?', 'In one line', 'Explained',
    'Key facts and formulas', 'Self-check', 'Flashcards', 'Sources',
  ],
  // Code is required only when the practical has code (plan 8.2), so the build cannot insist on it.
  practical: ['Aim', 'Output', 'Explanation', 'Viva questions', 'Sources'],
  project: ['Problem', 'Steps', 'Expected result', 'What interviewers ask about this', 'Sources'],
  // Section 8.6: subject intro note, ID <subject-id>-intro, first in the subject index.
  intro: [
    'Why this subject matters', 'A short story', 'Where it is used today',
    'What you will be able to do', 'Careers that use it', 'Map of the subject', 'Sources',
  ],
  paper: [],
};

// Section 8.5 and 11: write-down marking. These sections count as write-down automatically
// (never highlight inside them). Elsewhere ==highlights== build answer skeletons (decision 42):
// per ### answer, a definition plus at most 6 key phrases.
// Keep in step with writeDown in engine/assets/sections.js.
export const WRITE_DOWN_SECTIONS = ['In one line', 'Key facts and formulas', 'Diagram'];
export const HIGHLIGHT_MAX_PER_ANSWER = 7;
// Sections that are for reading, never for copying: no highlights here (Section 11).
export const NO_HIGHLIGHT_SECTIONS = ['Why should you care?', 'Analogy and real-life example', 'Think deeper'];

// Section 10: REGISTRY.md summary column for written notes = first sentence of "In one line",
// trimmed to about this many characters.
export const REGISTRY_SUMMARY_MAX = 120;

// Plan v2.7 (decision 44): newly required practical sections. They warn until the existing practicals
// are updated; then move them into REQUIRED_SECTIONS above to make them errors.
export const PENDING_SECTIONS = {
  practical: ['Before the lab', 'Steps', 'Common errors and fixes'],
};

// Career path files (plan Sections 6 and 9): sections besides the stages, kept as Markdown.
// The seven career paths, in home-page order (plan Section 6). A path whose file is not written yet
// shows as a greyed "coming soon" card.
export const CAREER_PATHS = [
  ['data-analyst', 'Data Analyst'], ['data-scientist', 'Data Scientist'], ['data-engineer', 'Data Engineer'],
  ['ml-engineer', 'ML Engineer'], ['ai-engineer', 'AI / GenAI Engineer'], ['mlops-engineer', 'MLOps Engineer'],
  ['ai-researcher', 'AI Researcher'],
];
export const PATH_MAX_RESOURCE_LINKS = 3;
export const COURSE_SECTION_NAMES = { whatIs: 'What this job is', whereAmI: 'Where am I?', resources: 'Free resources' };
export const COURSE_SECTIONS = { 'what this job is': 'whatIs', 'where am i': 'whereAmI', 'free resources': 'resources' };

// Section 8.1: "Self-check: 3–5 questions"
export const SELF_CHECK_MIN = 3;
export const SELF_CHECK_MAX = 5;

// ---------- Site settings (used by the reader) ----------
// Decision 13 (final): repository ai-ds-notes, site title Sutra.
export const SITE = {
  title: 'Sutra',
  tagline: 'AI, ML and Data Science, one concept at a time',
};

// Section 12: "Was this clear?" link on every note, opening one Google Form with the note ID prefilled.
// formUrl: the form's link ending in /viewform. noteField: the prefill field for the note ID, e.g.
// 'entry.123456789' (Google Forms → ⋮ → Get pre-filled link, type anything in that field, copy the
// link: the field ID is the "entry.…" part). Leave formUrl empty to hide the link.
export const FEEDBACK = {
  formUrl: '',
  noteField: '',
};

// Section 12: syllabus pages, one per course code used in notes' "syllabus" field.
// Names and unit titles come from the university syllabus. A code missing here still gets a page
// (titled by its code) and the build warns, so add its entry when a new course starts.
export const COURSES = {
  'UDSII-002': {
    title: 'Database Management System', programme: 'BSc Data Science · Semester II',
    units: {
      1: 'DBMS Fundamentals and Data Modelling', 2: 'ER Modelling and Advanced Design',
      3: 'Normalization and Database Design', 4: 'Transactions, Performance and Security',
    },
  },
  'UDSVI-006': {
    title: 'Applied Business Analytics', programme: 'BSc Data Science · Semester VI (theory and practical)',
    units: {
      1: 'Introduction to Business Analytics', 2: 'Business Intelligence and Statistical Foundations',
      3: 'Regression and Forecasting', 4: 'Optimization and Simulation Techniques',
    },
  },
};

// Display names for subjects (Section 5). A subject index file's own title takes priority.
export const SUBJECT_TITLES = {
  'linear-algebra': 'Linear Algebra', calculus: 'Calculus & Optimization',
  'prob-stats': 'Probability & Statistics', python: 'Python for Data & AI',
  databases: 'Databases & SQL', 'data-analysis': 'Data Analysis',
  'data-viz': 'Data Visualization & Storytelling', ml: 'Machine Learning',
  dl: 'Deep Learning', nlp: 'Natural Language Processing', cv: 'Computer Vision',
  'data-eng': 'Data Engineering', bi: 'BI & Dashboards', genai: 'Generative AI',
  mlops: 'MLOps', rl: 'Reinforcement Learning', research: 'Research Methods',
};

// ---------- Profiles (plan Section 18, decision 39) ----------
// The same engine builds two sites. Everything above is the "ai-ds-notes" profile (the default).
// A profile below overrides only what differs. Build with: node scripts/build.mjs --profile=class-notes
export const PROFILES = {
  'ai-ds-notes': {
    layout: 'concepts',      // content/concepts/<subject>/<note>.md, indexes in content/subjects/<subject>.md
    indexType: 'subject',    // the "type" a subject index declares
    registry: true,          // REGISTRY.md: planned rows, generated rows
    courses: true,           // career paths in content/courses/
    fixedSubjects: true,     // subjects must be in SUBJECTS (plan Section 5)
    templates: {
      theory: 'plan Section 8.1', practical: 'plan Section 8.2', project: 'plan Section 8.3', intro: 'plan Section 8.6',
    },
  },
  'class-notes': {
    layout: 'flat',          // content/<subject>/<note>.md, index in content/<subject>/_index.md
    indexType: 'index',
    registry: false,         // no registry: IDs listed in a subject's _index.md count as planned
    courses: false,          // no career paths
    fixedSubjects: false,    // any kebab-case subject folder
    SITE: { title: 'Sutra · Class Notes', tagline: 'Lecture notes for BSc IT and Data Science classes' },
    TYPES: ['theory', 'practical', 'intro'],
    REQUIRED_FIELDS: ['id', 'title', 'subject', 'type', 'status'],
    RECOMMENDED_FIELDS: ['sources'],
    // Section 18 template; practicals as Section 8.2; intro as Section 8.6. No self-check or flashcards.
    REQUIRED_SECTIONS: {
      theory: ['Why should you care?', 'In one line', 'Explained', 'Analogy and real-life example', 'Key points', 'Exam questions', 'Sources'],
      practical: ['Aim', 'Output', 'Explanation', 'Viva questions', 'Sources'],
      intro: ['Why this subject matters', 'A short story', 'Where it is used today', 'What you will be able to do', 'Careers that use it', 'Map of the subject', 'Sources'],
    },
    WRITE_DOWN_SECTIONS: ['In one line', 'Key points', 'Diagram'],
    templates: { theory: 'templates/theory-note.md', practical: 'templates/practical-note.md', intro: 'templates/intro-note.md' },
    // Unit titles come from the "**Unit N · Title**" lines in each _index.md, so only names are needed here.
    COURSES: {
      'UITIV-005': { title: 'Embedded System', programme: 'BSc IT · Semester IV' },
      'UITIV-006': { title: 'Embedded System Practical', programme: 'BSc IT · Semester IV' },
      'UDSIV-005': { title: 'Embedded System', programme: 'BSc Data Science · Semester IV' },
      'UDSIV-006': { title: 'Embedded System Practical', programme: 'BSc Data Science · Semester IV' },
      'UITVI-001': { title: 'Security in Computing', programme: 'BSc IT · Semester VI' },
      'UITVI-002': { title: 'Security in Computing Practical', programme: 'BSc IT · Semester VI' },
    },
    FEEDBACK: { formUrl: '', noteField: '' },
  },
};
