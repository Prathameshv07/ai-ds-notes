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
export const TYPES = ['theory', 'practical', 'project', 'paper'];
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
  practical: ['Aim', 'Code', 'Output', 'Explanation', 'Viva questions', 'Sources'],
  project: ['Problem', 'Steps', 'Expected result', 'What interviewers ask about this', 'Sources'],
  paper: [],
};

// Section 10: REGISTRY.md summary column for written notes = first sentence of "In one line",
// trimmed to about this many characters.
export const REGISTRY_SUMMARY_MAX = 120;

// Section 8.1: "Self-check: 3–5 questions"
export const SELF_CHECK_MIN = 3;
export const SELF_CHECK_MAX = 5;

// ---------- Site settings (used by the reader) ----------
// Decision 13 (final): repository ai-ds-notes, site title Sutra.
export const SITE = {
  title: 'Sutra',
  tagline: 'AI, ML and Data Science, one concept at a time',
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
