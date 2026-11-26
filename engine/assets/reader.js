/* ==========================================================================
   Notes reader (NOTES_PROJECT_PLAN.md Phase 1). One shared engine for every
   page, in the style of the UGC NET player: each page has
   <body data-page="home|path|note">, reads data/manifest.json (written by
   scripts/build.mjs), and renders.

   Note pages fetch the note's Markdown and render the Section 8.5 syntax:
   Obsidian callouts, [!quiz] with a collapsed [!answer], $maths$ (KaTeX),
   ```mermaid diagrams, highlighted code, ```output blocks, [[wikilinks]],
   and " :: " flashcards. Libraries load only when a note needs them.
   ========================================================================== */
(function () {
  'use strict';

  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const LIBS = {
    marked: CDN + 'marked/11.1.1/marked.min.js',
    katex: CDN + 'KaTeX/0.16.9/katex.min.js',
    katexCss: CDN + 'KaTeX/0.16.9/katex.min.css',
    mermaid: CDN + 'mermaid/10.9.1/mermaid.min.js',
    hljs: CDN + 'highlight.js/11.9.0/highlight.min.js',
    qrcode: CDN + 'qrcodejs/1.0.0/qrcode.min.js',
  };
  const SETTINGS_KEY = 'notes_reader_settings_v1';

  const app = document.getElementById('app');
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  let M = null; // manifest

  // ---------------- small helpers ----------------

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

  function icon(name, cls) {
    const body = (window.ICONS || {})[name];
    if (!body) return '';
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  const loaded = {};
  function loadScript(src) {
    return loaded[src] || (loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    }));
  }
  function loadCss(href) {
    if (loaded[href]) return;
    loaded[href] = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  function slugify(text) {
    return String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/[\s-]+/g, '-') || 'section';
  }

  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function notice(html) { app.innerHTML = `<div class="notice">${html}</div>`; }

  const isTouch = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;

  async function shareLink(url, title) {
    if (navigator.share && isTouch()) {
      try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch (e) { window.prompt('Copy this link:', url); }
  }

  // ---------------- reader settings (Section 12: dark mode, font size, width) ----------------

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; }
  }
  function applySettings(s) {
    const d = document.documentElement;
    if (s.theme && s.theme !== 'auto') d.setAttribute('data-theme', s.theme); else d.removeAttribute('data-theme');
    if (s.font && s.font !== 'm') d.setAttribute('data-font', s.font); else d.removeAttribute('data-font');
    if (s.width && s.width !== 'normal') d.setAttribute('data-width', s.width); else d.removeAttribute('data-width');
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* private mode: settings last this visit only */ }
    applySettings(s);
  }
  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function setupSettings() {
    const btn = document.getElementById('settingsBtn');
    if (!btn) return;
    btn.innerHTML = icon('sliders-horizontal');
    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Reader settings');
    const groups = [
      ['theme', 'Theme', [['auto', icon('monitor') + 'Auto'], ['light', icon('sun') + 'Light'], ['dark', icon('moon') + 'Dark']], 'auto'],
      ['font', 'Text size', [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']], 'm'],
      ['width', 'Reading width', [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']], 'normal'],
    ];
    panel.innerHTML = groups.map(([key, label, opts]) => `
      <div class="set-group"><div class="set-label">${label}</div>
        <div class="segmented" data-key="${key}">${opts.map(([v, t]) => `<button type="button" data-value="${v}">${t}</button>`).join('')}</div>
      </div>`).join('');
    document.body.appendChild(panel);

    const refresh = () => {
      const s = getSettings();
      groups.forEach(([key, , , def]) => {
        panel.querySelectorAll(`[data-key="${key}"] button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === (s[key] || def))));
      });
    };
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      const s = getSettings();
      const key = b.parentElement.dataset.key;
      const wasDark = isDark();
      s[key] = b.dataset.value;
      saveSettings(s);
      refresh();
      if (key === 'theme' && wasDark !== isDark()) document.dispatchEvent(new Event('themechange'));
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) refresh();
    });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target)) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.hidden = true; });
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!document.documentElement.getAttribute('data-theme')) document.dispatchEvent(new Event('themechange'));
      });
    }
  }

  // ---------------- manifest lookups ----------------

  const written = (id) => !!(M && M.notes[id]);
  const plannedNote = (id) => M && M.planned[id];
  const titleOf = (id) => (M.notes[id] || M.planned[id] || {}).title || id;
  const subjectTitle = (id) => (M.subjectTitles || {})[id] || id;
  const courseOf = (id) => M.courses.find((c) => c.id === id);
  const subjectOf = (id) => M.subjects.find((s) => s.id === id);

  function noteHref(id, course) {
    return 'note.html?id=' + encodeURIComponent(id) + (course ? '&course=' + encodeURIComponent(course) : '');
  }
  // A link to a note: clickable if written, greyed if planned.
  function noteLink(id, text, course) {
    const label = esc(text || titleOf(id));
    if (written(id)) return `<a class="wikilink" href="${noteHref(id, course)}">${label}</a>`;
    if (plannedNote(id)) return `<span class="wikilink planned" title="Planned: not written yet">${label}</span>`;
    return `<span class="wikilink missing" title="Unknown note">${label}</span>`;
  }
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  function badges(n) {
    let b = '';
    if (n.status === 'draft') b += `<span class="badge badge-draft" title="Draft: not yet reviewed by the author">Draft</span>`;
    if ((n.tags || []).includes('interview')) b += `<span class="badge badge-interview">${icon('briefcase')}Interview</span>`;
    return b;
  }

  async function loadManifest() {
    const r = await fetch('data/manifest.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('manifest');
    M = await r.json();
    const brand = document.querySelector('.brand');
    if (brand) brand.innerHTML = `${esc(M.site.title)}<small>${esc(M.site.tagline)}</small>`;
  }

  // ---------------- home page ----------------

  function countWritten(ids) { return ids.filter(written).length; }

  function renderHome() {
    document.title = M.site.title;
    const courseCards = M.courses.map((c) => {
      const ids = c.stages.flatMap((s) => s.items);
      const done = countWritten(ids);
      return `<a class="card path-card" href="path.html?course=${encodeURIComponent(c.id)}">
        <div class="card-icon">${icon('route')}</div>
        <div class="card-body"><div class="card-title">${esc(c.title)}</div>
          <div class="card-text">${esc(c.summary)}</div>
          <div class="bar" aria-hidden="true"><span style="width:${ids.length ? Math.round((done / ids.length) * 100) : 0}%"></span></div>
          <div class="card-meta">${c.stages.length} stages · ${done} of ${ids.length} notes written</div></div></a>`;
    }).join('');
    const subjectCards = M.subjects.map((s) => `<a class="card" href="path.html?subject=${encodeURIComponent(s.id)}">
        <div class="card-icon">${icon('library')}</div>
        <div class="card-body"><div class="card-title">${esc(s.title)}</div>
          ${s.about ? `<div class="card-text">${esc(s.about)}</div>` : ''}
          <div class="card-meta">${countWritten(s.order)} of ${s.order.length} notes written</div></div></a>`).join('');
    app.innerHTML = `
      <section class="home-hero"><h1>${esc(M.site.title)}</h1><p class="sub">${esc(M.site.tagline)}</p></section>
      ${M.site.careerPaths === false ? '' : `<section class="home-block home-paths"><h2>${icon('route')} Choose your career path</h2>
        <p class="lead">Pick the job you want. Each path shows what to learn, stage by stage, and which of your college semesters covers it.</p>
        <div class="card-grid">${courseCards || '<p class="empty">Career paths will appear here soon.</p>'}</div></section>`}
      <section class="home-block"><h2>${icon('library')} Subjects</h2>
        <div class="card-grid">${subjectCards || '<p class="empty">Subjects will appear here soon.</p>'}</div></section>
      ${(M.syllabi || []).length ? `<section class="home-block"><h2>${icon('clipboard-list')} By syllabus</h2>
        <p class="sub">Every note for one university course, from all subjects, unit by unit.</p>
        <div class="card-grid">${M.syllabi.map((y) => {
          const count = y.units.reduce((a, u) => a + u.items.length, 0);
          return `<a class="card" href="syllabus.html?code=${encodeURIComponent(y.code)}"><div class="card-icon">${icon('clipboard-list')}</div>
            <div class="card-body"><div class="card-kicker">${esc(y.code)}</div><div class="card-title">${esc(y.title)}</div>
            ${y.programme ? `<div class="card-text">${esc(y.programme)}</div>` : ''}<div class="card-meta">${count} note${count === 1 ? '' : 's'}</div></div></a>`;
        }).join('')}</div></section>` : ''}`;
  }

  // ---------------- subject / course page ----------------

  function itemRow(id, i, course, selectable, note) {
    const n = M.notes[id];
    const meta = n ? `<span class="row-meta">${n.time ? icon('clock') + esc(n.time) : ''}${badges(n)}</span>`
      : `<span class="row-meta"><span class="badge badge-planned">Planned</span></span>`;
    const tick = selectable && n ? `<input type="checkbox" class="sel-note" value="${esc(id)}" aria-label="Select ${esc(n.title)} for printing">`
      : (selectable ? '<span class="sel-gap"></span>' : '');
    const pr = n && n.practical ? `<span class="pr-num" title="Practical number in the syllabus">Practical ${n.practical}</span>` : '';
    return `<li class="row${n ? '' : ' is-planned'}">${tick}<span class="row-num">${i + 1}</span>
      <span class="row-title">${pr}${noteLink(id, null, course)}${note ? `<span class="row-note">${esc(note)}</span>` : ''}</span>${meta}</li>`;
  }

  // The subject's intro note (plan 8.6), shown first as a "Start here" card.
  function introCard(id) {
    if (!id) return '';
    const n = M.notes[id];
    if (!n) return `<div class="card intro-card is-planned"><div class="card-icon">${icon('flag')}</div><div class="card-body">
      <div class="card-title">Start here: ${esc(titleOf(id))} <span class="badge badge-planned">Planned</span></div></div></div>`;
    return `<a class="card intro-card" href="${noteHref(id)}"><div class="card-icon">${icon('flag')}</div><div class="card-body">
      <div class="card-kicker">Start here</div><div class="card-title">${esc(n.title)}${badges(n)}</div>
      <div class="card-text">Why this subject matters, where it is used, and a map of the topics.</div></div></a>`;
  }

  function renderPath() {
    const sid = params.get('subject'), cid = params.get('course');
    if (sid) {
      const s = subjectOf(sid);
      if (!s) return notice(`No subject called “${esc(sid)}”. <a href="index.html">Back to home</a>.`);
      document.title = `${s.title} · ${M.site.title}`;
      // Level headings in the subject index (## Basics, ## Design, ...) become groups; numbering runs on.
      // The intro note leads as a "Start here" card instead of a numbered row.
      // A group may have a sub-heading (class notes: "Unit 1 · …" under ## Theory or ## Practicals);
      // the ## heading is then shown once above its sub-groups.
      const groups = (s.groups && s.groups.length ? s.groups : [{ title: null, items: s.order }])
        .map((g) => ({ title: g.title, sub: g.sub || null, items: g.items.filter((x) => x !== s.intro) })).filter((g) => g.items.length);
      const notesText = s.notes || {};
      let n = 0, lastTitle;
      const lists = groups.map((g, gi) => {
        const canTick = g.items.some(written);
        const isPr = norm(g.title || '') === 'practicals';
        const tick = (label) => (canTick ? `<input type="checkbox" class="sel-group" aria-label="Select all of ${esc(label)} for printing">` : '');
        let head = '';
        if (g.sub) {
          if (g.title !== lastTitle && g.title) head += `<h2 class="part-title">${isPr ? icon('flask-conical') : ''}${esc(g.title)}</h2>`;
          head += `<h3>${tick(g.sub)}${esc(g.sub)}</h3>`;
        } else if (g.title) head = `<h2>${tick(g.title)}${isPr ? icon('flask-conical') : ''}${esc(g.title)}</h2>`;
        lastTitle = g.title;
        return `<section class="stage${isPr ? ' stage-practicals' : ''}${g.sub ? ' stage-sub' : ''}" data-group="${gi}">${head}
          <ol class="rows">${g.items.map((id) => itemRow(id, n++, null, true, notesText[id])).join('')}</ol></section>`;
      }).join('');
      const anyWritten = s.order.some((x) => written(x) && x !== s.intro);
      app.innerHTML = `<nav class="crumbs"><a href="index.html">Home</a></nav>
        <h1>${esc(s.title)}</h1>${s.about ? `<p class="sub">${esc(s.about)}</p>` : ''}<p class="sub">${countWritten(s.order)} of ${s.order.length} notes written · recommended reading order</p>
        ${introCard(s.intro)}
        ${anyWritten ? `<div class="print-bar"><span class="print-bar-text">${icon('printer')}Tick notes to print them as one document.</span>
          <button type="button" class="btn" id="printSelBtn" disabled>${icon('printer')}Print selected</button></div>` : ''}
        ${lists}`;
      setupSelection();
      return;
    }
    const c = courseOf(cid);
    if (!c) return notice(`No career path called “${esc(cid || '')}”. <a href="index.html">Back to home</a>.`);
    return renderCourse(c);
  }

  // Short Markdown from a path file ("What this job is", milestones, the "Where am I?" table, free
  // resources) rendered with the note renderer, so [[links]], tables and callouts work as in notes.
  async function markdownSnippets(c, parts) {
    try {
      await loadScript(LIBS.marked);
      setupMarked(c.path);
      return parts.map(([md, inline]) => {
        if (!md) return '';
        if (inline) return marked.parseInline(md);
        const div = document.createElement('div');
        div.innerHTML = marked.parse(md);
        convertCallouts(div);
        wrapTables(div);
        return div.innerHTML;
      });
    } catch (e) {
      // offline: show the text without formatting
      return parts.map(([md, inline]) => (md ? (inline ? esc(md) : `<p>${esc(md).replace(/\n{2,}/g, '</p><p>')}</p>`) : ''));
    }
  }

  async function renderCourse(c) {
    document.title = `${c.title} · ${M.site.title}`;
    const ids = c.stages.flatMap((st) => st.items);
    const done = countWritten(ids);
    const [whatIs, whereAmI, resources, ...inline] = await markdownSnippets(c, [
      [c.whatIs, false], [c.whereAmI, false], [c.resources, false],
      ...c.stages.flatMap((st) => [[st.milestone, true], [st.resources, true]]),
    ]);
    const milestones = c.stages.map((_, i) => inline[2 * i]);
    const stageRes = c.stages.map((_, i) => inline[2 * i + 1]);
    const anchor = (t) => 'p-' + slugify(t);
    const jumps = [
      c.whatIs ? ['What this job is', 'p-what'] : null,
      ...c.stages.map((st) => [st.title.replace(/^stage\s*(\d+)\s*[·:.-]\s*/i, 'Stage $1: '), anchor(st.title)]),
      c.whereAmI ? ['Where am I?', 'p-where'] : null,
      c.resources ? ['Free resources', 'p-resources'] : null,
    ].filter(Boolean);
    let n = 0;
    const stages = c.stages.map((st, i) => `<section class="stage path-stage" id="${anchor(st.title)}"><h2>${esc(st.title)}</h2>
        ${st.why ? `<p class="stage-why">${esc(st.why)}</p>` : ''}
        ${!st.items.length ? '<p class="empty">Notes for this stage are coming.</p>'
          : (st.groups && st.groups.length ? st.groups : [{ title: null, items: st.items }]).map((g) =>
            `${g.title ? `<h3 class="path-sub">${esc(g.title)}</h3>` : ''}<ol class="rows">${g.items.map((id) => itemRow(id, n++, c.id)).join('')}</ol>`).join('')}
        ${st.milestone ? `<p class="milestone">${icon('flag')}<span><b>Milestone:</b> ${milestones[i]}</span></p>` : ''}
        ${st.resources ? `<p class="stage-resources">${icon('external-link')}<span><b>Free resources:</b> ${stageRes[i]}</span></p>` : ''}
      </section>`).join('');
    app.innerHTML = `<nav class="crumbs"><a href="index.html">Home</a></nav>
      <p class="card-kicker">Career path</p>
      <h1>${esc(c.title)}</h1><p class="sub">${esc(c.summary)}</p>
      <div class="path-progress" title="${done} of ${ids.length} notes written">
        <div class="bar"><span style="width:${ids.length ? Math.round((done / ids.length) * 100) : 0}%"></span></div>
        <span>${done} of ${ids.length} notes written; greyed notes are planned.</span></div>
      ${jumps.length > 1 ? `<nav class="path-jumps" aria-label="On this page">${jumps.map(([t, a]) => `<a href="#${a}">${esc(t)}</a>`).join('')}</nav>` : ''}
      ${c.whatIs ? `<section class="path-block" id="p-what"><h2>${icon('briefcase')}What this job is</h2><div class="md">${whatIs}</div></section>` : ''}
      ${stages}
      ${c.whereAmI ? `<section class="path-block" id="p-where"><h2>${icon('map-pin')}Where am I?</h2><div class="md">${whereAmI}</div></section>` : ''}
      ${c.resources ? `<section class="path-block" id="p-resources"><h2>${icon('external-link')}Free resources</h2><div class="md">${resources}</div></section>` : ''}`;
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }

  function setupSelection() {
    const btn = document.getElementById('printSelBtn');
    if (!btn) return;
    const notes = () => [...app.querySelectorAll('.sel-note')];
    const refresh = () => {
      const picked = notes().filter((c) => c.checked);
      btn.disabled = !picked.length;
      btn.innerHTML = `${icon('printer')}Print selected${picked.length ? ` (${picked.length})` : ''}`;
      app.querySelectorAll('.stage').forEach((st) => {
        const g = st.querySelector('.sel-group');
        if (!g) return;
        const inGroup = [...st.querySelectorAll('.sel-note')];
        const on = inGroup.filter((c) => c.checked).length;
        g.checked = on === inGroup.length && on > 0;
        g.indeterminate = on > 0 && on < inGroup.length;
      });
    };
    app.addEventListener('change', (e) => {
      if (e.target.classList.contains('sel-group')) {
        e.target.closest('.stage').querySelectorAll('.sel-note').forEach((c) => { c.checked = e.target.checked; });
      }
      refresh();
    });
    btn.addEventListener('click', () => printNotes(notes().filter((c) => c.checked).map((c) => c.value)));
    refresh();
  }

  // ---------------- printing (plan 12: Notebook sheet or Full note, A4 or A5) ----------------

  const PRINT_KEY = 'notes_print_v1';
  function printDialog(heading) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(PRINT_KEY)) || {}; } catch (e) { /* ignore */ }
    const mode = saved.mode === 'full' ? 'full' : 'notebook';
    const size = saved.size === 'A5' ? 'A5' : 'A4';
    const dlg = document.createElement('dialog');
    dlg.className = 'print-dialog';
    dlg.innerHTML = `<form method="dialog">
      <div class="qr-head"><b>${esc(heading)}</b><button type="button" class="icon-btn" value="cancel" aria-label="Close">${icon('x')}</button></div>
      <fieldset><legend>What to print</legend>
        <label class="opt"><input type="radio" name="mode" value="notebook"${mode === 'notebook' ? ' checked' : ''}>
          <span><b>${icon('notebook-text')}Notebook sheet</b><small>Only the parts to write down, about one page per note. A whole unit makes a revision sheet.</small></span></label>
        <label class="opt"><input type="radio" name="mode" value="full"${mode === 'full' ? ' checked' : ''}>
          <span><b>${icon('book-open')}Full note</b><small>Everything, with the answers in a key at the end.</small></span></label>
      </fieldset>
      <fieldset><legend>Page size</legend>
        <div class="segmented">
          <label><input type="radio" name="size" value="A4"${size === 'A4' ? ' checked' : ''}><span>A4</span></label>
          <label><input type="radio" name="size" value="A5"${size === 'A5' ? ' checked' : ''}><span>A5</span></label>
        </div>
      </fieldset>
      <p class="print-hint">${icon('info')}<span>Booklet: choose A5, then <i>Save as PDF</i>. Open the PDF in a PDF reader and print it with its <i>Booklet</i> option.</span></p>
      <div class="dialog-actions"><button type="button" class="btn" value="cancel">Cancel</button>
        <button type="submit" class="btn btn-accent" value="print">${icon('printer')}Print</button></div>
    </form>`;
    document.body.appendChild(dlg);
    return new Promise((resolve) => {
      const done = (val) => { dlg.close(); dlg.remove(); resolve(val); };
      dlg.querySelectorAll('[value="cancel"]').forEach((b) => b.addEventListener('click', () => done(null)));
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
      dlg.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const val = { mode: f.get('mode'), size: f.get('size') };
        try { localStorage.setItem(PRINT_KEY, JSON.stringify(val)); } catch (err) { /* ignore */ }
        done(val);
      });
      dlg.showModal();
    });
  }

  // A hidden print document: kept off screen (not display:none, so diagrams can be drawn into it)
  // and, while printing, the only thing on the page.
  function printDoc(mode) {
    document.getElementById('printDoc')?.remove();
    const doc = document.createElement('div');
    doc.id = 'printDoc';
    doc.className = `print-doc print-doc-${mode}`;
    doc.setAttribute('aria-hidden', 'true');
    document.body.appendChild(doc);
    return doc;
  }

  function printPiece(doc, n, mode, article) {
    const piece = document.createElement('section');
    piece.className = 'pd-note';
    const meta = [subjectTitle(n.subject), n.updated ? `Updated ${fmtDate(n.updated)}` : ''].filter(Boolean).map(esc).join(' · ');
    piece.innerHTML = `<header class="pd-head"><h1>${esc(n.title)}</h1><p>${meta}</p></header>`;
    if (mode === 'notebook') {
      const parts = writeDownParts(article);
      if (parts.length) parts.forEach((p) => piece.appendChild(p));
      else piece.insertAdjacentHTML('beforeend', '<p class="empty">This note has no write-down parts yet.</p>');
    } else {
      const copy = cleanCopy(article);
      piece.appendChild(copy);
      copy.insertAdjacentHTML('beforeend', buildAnswerKey(article));
    }
    doc.appendChild(piece);
  }

  function runPrint(opts, doc) {
    let style = document.getElementById('pageSizeStyle');
    if (!style) { style = document.createElement('style'); style.id = 'pageSizeStyle'; document.head.appendChild(style); }
    style.textContent = opts.size === 'A5'
      ? '@media print { @page { size: A5 portrait; margin: 12mm 10mm 12mm 15mm; } html { font-size: 10pt !important; } }'
      : '@media print { @page { size: A4 portrait; margin: 16mm 14mm 16mm 20mm; } }';
    if (doc) {
      doc.insertAdjacentHTML('beforeend', `<footer class="print-footer pd-footer">${esc(M.site.title)} · ${esc(location.href.split('#')[0])} · Licensed CC BY-NC-SA 4.0</footer>`);
      document.body.classList.add('printing-doc');
    }
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-doc');
      if (doc) doc.remove();
    }, { once: true });
    window.print();
  }

  // Print one or more notes ("Print selected" on the subject page).
  async function printNotes(ids) {
    const opts = await printDialog(ids.length === 1 ? `Print ${titleOf(ids[0])}` : `Print ${ids.length} notes`);
    if (!opts) return;
    const doc = printDoc(opts.mode);
    const stage = document.createElement('div');
    stage.className = 'pd-stage';
    doc.appendChild(stage);
    for (let i = 0; i < ids.length; i++) {
      const n = M.notes[ids[i]];
      toast(`Preparing ${i + 1} of ${ids.length}…`);
      let r;
      try { r = await renderArticle(n); } catch (e) { toast(`Couldn't load ${n.title}`); continue; }
      stage.replaceChildren(r.article);
      await Promise.all([r.mermaidCount ? renderMermaid(r.article) : null, r.codeCount ? highlightCode(r.article) : null]);
      printPiece(doc, n, opts.mode, r.article);
    }
    stage.remove();
    runPrint(opts, doc);
  }

  // ---------------- syllabus pages (plan 12) ----------------

  function renderSyllabus() {
    const code = params.get('code');
    const y = (M.syllabi || []).find((x) => x.code === code);
    if (!y) return notice(`No syllabus page for “${esc(code || '')}”. <a href="index.html">Back to home</a>.`);
    document.title = `${y.code} ${y.title} · ${M.site.title}`;
    let k = 0;
    const units = y.units.map((u) => `<section class="stage"><h2>${u.unit ? `Unit ${u.unit}` : ''}${u.unit && u.title ? ' · ' : ''}${esc(u.title)}</h2>
      <ol class="rows">${u.items.map((id) => {
        const n = M.notes[id];
        const row = itemRow(id, k++, null, false);
        return row.replace('<span class="row-meta">', `<span class="row-meta"><span class="subj-chip">${esc(subjectTitle(n.subject))}</span>`);
      }).join('')}</ol></section>`).join('');
    app.innerHTML = `<nav class="crumbs"><a href="index.html">Home</a></nav>
      <p class="card-kicker">${esc(y.code)}</p><h1>${esc(y.title)}</h1>
      ${y.programme ? `<p class="sub">${esc(y.programme)}</p>` : ''}
      <p class="sub">Notes for this course from every subject, grouped by syllabus unit. Each note also lives in its own subject.</p>${units}`;
  }

  // ---------------- What's new (plan 12) ----------------

  function renderWhatsNew() {
    document.title = `What's new · ${M.site.title}`;
    const rows = Object.entries(M.notes).filter(([, n]) => n.updated)
      .sort((a, b) => new Date(b[1].updated) - new Date(a[1].updated)).slice(0, 50);
    const byDay = new Map();
    rows.forEach(([id, n]) => {
      const day = fmtDate(n.updated);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push([id, n]);
    });
    const days = [...byDay].map(([day, list]) => `<section class="stage"><h2>${esc(day)}</h2><ul class="rows">${list.map(([id, n]) => {
      const isNew = !n.added || n.added === n.updated;
      return `<li class="row"><span class="badge ${isNew ? 'badge-new' : 'badge-updated'}">${isNew ? 'New' : 'Updated'}</span>
        <span class="row-title">${noteLink(id)}</span><span class="row-meta">${esc(subjectTitle(n.subject))}</span></li>`;
    }).join('')}</ul></section>`).join('');
    app.innerHTML = `<nav class="crumbs"><a href="index.html">Home</a></nav>
      <h1>What's new</h1><p class="sub">Notes added or changed recently, newest first.</p>
      ${days || '<p class="empty">Nothing yet. New and updated notes will appear here.</p>'}`;
  }

  // ---------------- Markdown → HTML (note pages) ----------------

  let markedReady = false;
  let noteDir = ''; // folder of the note being rendered, for relative image paths
  function setupMarked(notePath) {
    noteDir = notePath.slice(0, notePath.lastIndexOf('/') + 1);
    if (markedReady) return;
    markedReady = true;
    const katexHtml = (tex, display) => {
      try { return window.katex.renderToString(tex, { displayMode: display, throwOnError: false }); }
      catch (e) { return `<code>${esc(tex)}</code>`; }
    };
    const resolveUrl = (href) => (/^(?:[a-z]+:|\/|#)/i.test(href) ? href : new URL(href, new URL(noteDir, location.href)).href);

    marked.use({
      gfm: true,
      breaks: true, // Obsidian shows single line breaks; options in [!quiz] rely on it
      extensions: [
        { // $$ display maths $$ on its own lines
          name: 'mathBlock', level: 'block',
          start(src) { const m = src.match(/^\$\$/m); return m ? m.index : undefined; },
          tokenizer(src) {
            const m = src.match(/^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/);
            if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
          },
          renderer(t) { return `<div class="math-display">${katexHtml(t.text, true)}</div>\n`; },
        },
        { // $inline$ and $$display$$ inside a line
          name: 'mathInline', level: 'inline',
          start(src) { const m = src.match(/(?<!\\)\$/); return m ? m.index : undefined; },
          tokenizer(src) {
            let m = src.match(/^\$\$([\s\S]+?)\$\$/);
            if (m) return { type: 'mathInline', raw: m[0], text: m[1].trim(), display: true };
            m = src.match(/^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/);
            if (m) return { type: 'mathInline', raw: m[0], text: m[1], display: false };
          },
          renderer(t) { return t.display ? `<span class="math-display">${katexHtml(t.text, true)}</span>` : katexHtml(t.text, false); },
        },
        { // ==write this down== (Obsidian highlight): a highlighted line with a pen icon
          name: 'writeDown', level: 'inline',
          start(src) { const i = src.indexOf('=='); return i < 0 ? undefined : i; },
          tokenizer(src) {
            const m = src.match(/^==(?=\S)([^=\n]*?\S)==/);
            if (m) return { type: 'writeDown', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
          },
          renderer(t) {
            return `<mark class="wd" title="Write this down">${icon('pen-line', 'wd-pen')}${this.parser.parseInline(t.tokens)}</mark>`;
          },
        },
        { // ![[image.png]] embeds and [[note-id|text]] links
          name: 'wikilink', level: 'inline',
          start(src) { const i = src.search(/!?\[\[/); return i < 0 ? undefined : i; },
          tokenizer(src) {
            const m = src.match(/^(!?)\[\[([^\]\n]+?)\]\]/);
            if (!m) return;
            const [target, ...rest] = m[2].split('|');
            return { type: 'wikilink', raw: m[0], embed: !!m[1], target: target.split('#')[0].trim(), heading: target.split('#')[1], text: rest.join('|').trim() };
          },
          renderer(t) {
            if (t.embed) {
              const file = t.target.split('/').pop();
              const src = (M.assets || {})[file];
              return src ? `<img src="${esc(src)}" alt="${esc(t.text || file)}" loading="lazy">` : `<span class="missing">[missing image: ${esc(file)}]</span>`;
            }
            let html = noteLink(t.target, t.text || null, params.get('course'));
            if (t.heading && written(t.target)) html = html.replace(/href="([^"]+)"/, (_, h) => `href="${h}#${slugify(t.heading)}"`);
            return html;
          },
        },
      ],
      renderer: {
        image(href, title, text) {
          return `<img src="${esc(resolveUrl(href))}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy">`;
        },
        link(href, title, text) {
          const ext = /^https?:/i.test(href);
          return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
        },
      },
    });
  }

  // ---------------- DOM post-processing ----------------

  // Obsidian callouts: a blockquote whose first line is [!type], [!type]- (collapsed) or [!type]+ (open).
  function convertCallouts(root) {
    root.querySelectorAll('blockquote').forEach((bq) => {
      const first = bq.firstElementChild;
      if (!first || first.tagName !== 'P') return;
      const m = first.innerHTML.match(/^\s*\[!([a-z][a-z-]*)\]([+-]?)[ \t]*/i);
      if (!m) return;
      const type = m[1].toLowerCase(), fold = m[2];
      const rest = first.innerHTML.slice(m[0].length);
      const br = rest.search(/<br\s*\/?>/i);
      let titleHtml = (br < 0 ? rest : rest.slice(0, br)).trim();
      const bodyHtml = br < 0 ? '' : rest.slice(br).replace(/^<br\s*\/?>\s*/i, '');
      if (bodyHtml.trim()) first.innerHTML = bodyHtml; else first.remove();

      const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.note;
      // "Answer: B" in a closed answer's title would give the answer away, so it shows only once opened.
      const hidesAnswer = type === 'answer' && fold === '-' && /answer\s*:/i.test(titleHtml.replace(/<[^>]+>/g, ''));
      if (!titleHtml) titleHtml = type[0].toUpperCase() + type.slice(1);
      const box = document.createElement(fold ? 'details' : 'div');
      box.className = 'callout callout-' + style.color + (type === 'quiz' ? ' quiz' : '') + (type === 'answer' ? ' callout-answer' : '') + (type === 'beyond' ? ' callout-beyond' : '');
      box.dataset.callout = type;
      if (fold === '+') box.open = true;
      if (hidesAnswer) box.classList.add('ans-hide');
      const title = document.createElement(fold ? 'summary' : 'div');
      title.className = 'callout-title';
      title.innerHTML = `${icon(style.icon)}` +
        (hidesAnswer ? '<span class="ans-closed">Show answer</span>' : '') +
        `<span class="callout-title-text">${titleHtml}</span>` +
        (style.label ? `<span class="callout-label">${esc(style.label)}</span>` : '');
      const body = document.createElement('div');
      body.className = 'callout-body';
      while (bq.firstChild) body.appendChild(bq.firstChild);
      box.append(title, body);
      if (type === 'quiz') formatQuiz(box, body);
      if (type === 'answer') {
        const a = (title.textContent.match(/Answer:\s*([A-E](?:\s*,\s*[A-E])*)/i) || [])[1];
        if (a) box.dataset.answer = a.replace(/\s/g, '');
      }
      bq.replaceWith(box);
    });
  }

  // (A) … (E) lines in a quiz become an option list. Stored as data for exit tickets (Phase 1.5).
  function formatQuiz(box, body) {
    body.querySelectorAll(':scope > p').forEach((p) => {
      const lines = p.innerHTML.split(/<br\s*\/?>\s*/i);
      if (!lines.some((l) => /^\s*\(([A-E])\)\s*/.test(l))) return;
      const frag = document.createDocumentFragment();
      let list = null, plain = [];
      const flush = () => { if (plain.length) { const q = document.createElement('p'); q.innerHTML = plain.join('<br>'); frag.appendChild(q); plain = []; } };
      lines.forEach((l) => {
        const m = l.match(/^\s*\(([A-E])\)\s*([\s\S]*)$/);
        if (m) {
          flush();
          if (!list) { list = document.createElement('ol'); list.className = 'quiz-options'; frag.appendChild(list); }
          const li = document.createElement('li');
          li.dataset.option = m[1];
          li.innerHTML = `<span class="opt-letter">${m[1]}</span><span class="opt-text">${m[2]}</span>`;
          list.appendChild(li);
        } else if (l.trim()) { list = null; plain.push(l); }
      });
      flush();
      p.replaceWith(frag);
    });
  }

  function convertCode(root) {
    let mermaidCount = 0, codeCount = 0;
    root.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      const lang = ((code.className.match(/language-(\S+)/) || [])[1] || '').toLowerCase();
      if (lang === 'mermaid') {
        // accTitle / accDescr (plan 8.5) are the diagram's alt text. Mermaid puts them inside the
        // drawn SVG for screen readers; the title is also shown as a caption, and both are shown
        // in place of the diagram while it loads or if it can't be drawn (slow or no connection).
        const src = code.textContent;
        const accTitle = ((src.match(/^\s*accTitle\s*:\s*(.+)$/m) || [])[1] || '').trim();
        let accDescr = ((src.match(/^\s*accDescr\s*:\s*(.+)$/m) || [])[1] || '').trim();
        if (!accDescr) { const mm = src.match(/^\s*accDescr\s*\{([\s\S]*?)\}/m); if (mm) accDescr = mm[1].replace(/\s+/g, ' ').trim(); }
        const wrap = document.createElement('figure');
        wrap.className = 'diagram';
        const m = document.createElement('pre');
        m.className = 'mermaid';
        m.dataset.src = src;
        m.textContent = src;
        const fb = document.createElement('div');
        fb.className = 'diagram-fallback';
        fb.innerHTML = `${icon('workflow')}<span>${accTitle || accDescr ? `<b>Diagram: ${esc(accTitle || 'untitled')}</b>${accDescr ? ` ${esc(accDescr)}` : ''}` : 'Drawing the diagram…'}</span>`;
        wrap.append(fb, m);
        if (accTitle) wrap.insertAdjacentHTML('beforeend', `<figcaption class="diagram-caption">${esc(accTitle)}</figcaption>`);
        pre.replaceWith(wrap);
        mermaidCount++;
      } else if (lang === 'output') {
        pre.className = 'output-block';
        pre.dataset.label = 'Output';
      } else {
        pre.className = 'code-block';
        if (lang) { pre.dataset.label = lang; codeCount++; }
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'copy-btn'; btn.title = 'Copy code'; btn.setAttribute('aria-label', 'Copy code');
        btn.innerHTML = icon('copy');
        btn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(code.textContent); toast('Code copied'); } catch (e) { toast('Copy not allowed here'); }
        });
        pre.appendChild(btn);
      }
    });
    return { mermaidCount, codeCount };
  }

  // Stable heading IDs for section links, e.g. note.html?id=normalization#q3-how-does-it-work
  function addHeadingIds(root) {
    const used = new Set();
    root.querySelectorAll('h2, h3, h4').forEach((h) => {
      [...h.childNodes].forEach((n) => { if (n.nodeType === 8) n.remove(); }); // drop <!-- template labels -->
      const text = h.textContent.trim();
      let id = slugify(text), k = 2;
      while (used.has(id)) id = slugify(text) + '-' + k++;
      used.add(id);
      h.id = id;
      h.innerHTML = `<span class="h-text">${h.innerHTML.trim()}</span>`;
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = '#' + id;
      a.title = 'Link to this section';
      a.setAttribute('aria-label', 'Share a link to this section');
      a.innerHTML = icon('link');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        history.replaceState(null, '', '#' + id);
        shareLink(location.href, document.title + ' · ' + text);
      });
      h.appendChild(a);
    });
  }

  // Each ## becomes its own <section> (present mode, Phase 1.5, turns these into slides).
  function wrapSections(root) {
    root.querySelectorAll(':scope > h2').forEach((h2) => {
      const sec = document.createElement('section');
      sec.className = 'note-section';
      h2.before(sec);
      let n = h2;
      while (n && !(n !== h2 && n.tagName === 'H2')) { const next = n.nextSibling; sec.appendChild(n); n = next; }
      const name = norm(h2.querySelector('.h-text').textContent);
      sec.dataset.section = slugify(name);
      const st = SECTION_STYLES[name] || SECTION_STYLES[name.replace(/[?:.]$/, '')];
      if (st) {
        sec.dataset.level = st.level;
        h2.insertAdjacentHTML('afterbegin', `<span class="sec-icon">${icon(st.icon)}</span>`);
        if (st.writeDown) {
          sec.classList.add('write-down');
          h2.insertAdjacentHTML('beforeend', `<span class="wd-chip" title="Write this down in your notebook">${icon('pen-line')}<span>Write down</span></span>`);
        }
        if (LEVEL_NAMES[st.level]) h2.insertAdjacentHTML('beforeend', `<span class="lvl-chip" title="Level of teaching">${LEVEL_NAMES[st.level]}</span>`);
      }
    });
  }

  // "front :: back" lines in the Flashcards section become tap-to-reveal cards.
  function convertFlashcards(root) {
    const sec = root.querySelector('.note-section[data-section="flashcards"]');
    if (!sec) return;
    const cards = [];
    sec.querySelectorAll('p, li').forEach((el) => {
      if (el.closest('.callout')) return;
      const lines = el.innerHTML.split(/<br\s*\/?>\s*/i);
      if (!lines.some((l) => l.includes(' :: '))) return;
      lines.forEach((l) => {
        const i = l.indexOf(' :: ');
        if (i >= 0) cards.push([l.slice(0, i).trim(), l.slice(i + 4).trim()]);
      });
      const list = el.closest('ul, ol');
      if (list && el.tagName === 'LI') { el.remove(); if (!list.children.length) list.remove(); } else el.remove();
    });
    if (!cards.length) return;
    const grid = document.createElement('div');
    grid.className = 'flashcards';
    grid.innerHTML = cards.map(([f, b]) => `<details class="flashcard"><summary><span class="fc-front">${f}</span><span class="fc-hint">Tap to reveal</span></summary><div class="fc-back">${b}</div></details>`).join('');
    sec.appendChild(grid);
  }

  function wrapTables(root) {
    root.querySelectorAll('table').forEach((t) => {
      const w = document.createElement('div');
      w.className = 'table-wrap';
      t.replaceWith(w); w.appendChild(t);
    });
  }

  // A picture on its own line becomes a figure whose caption is its alt text (plan 8.5).
  function captionImages(root) {
    root.querySelectorAll('p > img').forEach((img) => {
      const p = img.parentElement;
      if (p.childNodes.length !== 1 && [...p.childNodes].some((c) => c !== img && (c.nodeType !== 3 || c.textContent.trim()))) return;
      const fig = document.createElement('figure');
      fig.className = 'figure-img';
      fig.appendChild(img);
      const alt = img.getAttribute('alt');
      if (alt) fig.insertAdjacentHTML('beforeend', `<figcaption>${esc(alt)}</figcaption>`);
      p.replaceWith(fig);
    });
  }

  // A copy of part of a note without page-only controls or duplicate heading IDs
  // (used by Notebook view, present mode and printing).
  function cleanCopy(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll('.anchor, .copy-btn').forEach((e) => e.remove());
    c.querySelectorAll('[id]').forEach((e) => { if (!e.closest('svg')) e.removeAttribute('id'); });
    c.querySelectorAll('details.callout-answer[open], .flashcard[open]').forEach((d) => { d.open = false; });
    return c;
  }

  // The write-down parts of a rendered note, in note order (plan 8.5 and 12): the write-down sections
  // in full, then elsewhere only ==highlighted== lines, grouped under their section and question.
  // Anything inside a [!beyond] box is left out. Returns an array of elements.
  function writeDownParts(art) {
    const out = [];
    art.querySelectorAll(':scope > .note-section').forEach((sec) => {
      if (sec.classList.contains('write-down')) {
        const c = cleanCopy(sec);
        c.querySelectorAll('.callout-beyond').forEach((b) => b.remove());
        out.push(c);
        return;
      }
      // Answer skeletons (plan v2.6, decision 42): each ### question heading above its highlighted
      // points, so students see which question each skeleton answers. Highlights before the first
      // ### sit under the section's own name. Questions with no highlights are left out.
      const groups = new Map(); // heading element (h3, or the section's h2) -> marks
      sec.querySelectorAll('mark.wd').forEach((m) => {
        if (m.closest('.callout-beyond')) return;
        let head = sec.querySelector(':scope > h2');
        for (let n = m.closest('.note-section > *'); n; n = n.previousElementSibling) { if (n.tagName === 'H3') { head = n; break; } }
        if (!groups.has(head)) groups.set(head, []);
        groups.get(head).push(m);
      });
      groups.forEach((marks, head) => {
        const box = document.createElement('section');
        box.className = 'note-section notebook-lines';
        const h = document.createElement('h3');
        h.className = head.tagName === 'H3' ? 'nb-question' : 'nb-section';
        h.innerHTML = head.querySelector('.h-text').innerHTML; // keeps maths and formatting
        const ul = document.createElement('ul');
        marks.forEach((m) => { const li = document.createElement('li'); li.appendChild(m.cloneNode(true)); ul.appendChild(li); });
        box.append(h, ul);
        out.push(box);
      });
    });
    return out;
  }

  function buildToc(root) {
    const items = [...root.querySelectorAll('h2, h3')].map((h) =>
      `<li class="toc-${h.tagName.toLowerCase()}"><a href="#${h.id}">${esc(h.querySelector('.h-text').textContent)}</a></li>`).join('');
    return items ? `<ul>${items}</ul>` : '';
  }

  // Print: answers go into an answer key at the end (owner's decision), so students can self-test on paper.
  function buildAnswerKey(root) {
    const entries = [];
    root.querySelectorAll('details.callout-answer').forEach((ans) => {
      const quiz = ans.closest('.quiz');
      const sec = ans.closest('.note-section');
      const label = quiz ? quiz.querySelector(':scope > .callout-title .callout-title-text').textContent.trim()
        : (sec ? sec.querySelector('h2 .h-text').textContent.trim() : 'Answer');
      const shortLabel = label.match(/^(Q\d+\.?)/) ? label.match(/^(Q\d+\.?)/)[1] : label;
      entries.push(`<li><b>${esc(shortLabel)}</b> ${ans.querySelector('.callout-title-text').innerHTML}
        <div class="key-body">${ans.querySelector('.callout-body').innerHTML}</div></li>`);
    });
    if (!entries.length) return '';
    return `<section class="answer-key print-only"><h2>Answer key</h2><ol>${entries.join('')}</ol></section>`;
  }

  async function renderMermaid(root) {
    const nodes = root.querySelectorAll('pre.mermaid');
    if (!nodes.length) return;
    try {
      await loadScript(LIBS.mermaid);
      // Diagrams always use the light theme on a light card, so they look the same in dark mode, print and projection.
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default', fontFamily: 'IBM Plex Sans, sans-serif' });
      await mermaid.run({ nodes, suppressErrors: true }).catch((e) => console.warn('Mermaid could not draw a diagram', e));
    } catch (e) { console.warn(e); }
    // A drawn diagram replaces its fallback text; one that failed keeps the text (its alt text).
    nodes.forEach((n) => { if (n.querySelector('svg')) n.closest('.diagram').classList.add('is-drawn'); });
  }

  async function highlightCode(root) {
    const blocks = [...root.querySelectorAll('pre.code-block > code[class*="language-"]')];
    if (!blocks.length) return;
    try {
      await loadScript(LIBS.hljs);
      blocks.forEach((c) => {
        const lang = (c.className.match(/language-(\S+)/) || [])[1];
        if (lang && window.hljs.getLanguage(lang)) window.hljs.highlightElement(c);
      });
    } catch (e) { console.warn(e); }
  }

  // ---------------- note page ----------------

  function sequenceFor(id, course) {
    if (course) { const c = courseOf(course); if (c) return c.stages.flatMap((s) => s.items); }
    const n = M.notes[id];
    const s = n && subjectOf(n.subject);
    return s ? s.order : [];
  }

  function prevNext(id, course) {
    const seq = sequenceFor(id, course).filter(written);
    const i = seq.indexOf(id);
    if (i < 0) return '';
    const p = seq[i - 1], nx = seq[i + 1];
    const cell = (nid, dir) => nid
      ? `<a class="pn pn-${dir}" href="${noteHref(nid, course)}"><span class="pn-label">${dir === 'prev' ? icon('chevron-left') + 'Previous' : 'Next' + icon('chevron-right')}</span><span class="pn-title">${esc(titleOf(nid))}</span></a>`
      : '<span></span>';
    return `<nav class="prevnext" aria-label="Previous and next note">${cell(p, 'prev')}${cell(nx, 'next')}</nav>`;
  }

  function linkBox(cls, title, ic, ids, lead) {
    if (!ids || !ids.length) return '';
    const course = params.get('course');
    return `<aside class="linkbox ${cls}"><div class="linkbox-title">${icon(ic)}${title}</div>
      ${lead ? `<p>${lead}</p>` : ''}<ul>${ids.map((x) => `<li>${noteLink(x, null, course)}</li>`).join('')}</ul></aside>`;
  }

  // "Was this clear?" (plan 12): one site-wide Google Form, with the note ID prefilled.
  function feedbackLink(id) {
    const fb = M.site.feedback;
    if (!fb || !fb.formUrl) return '';
    let url = fb.formUrl;
    if (fb.noteField) url += (url.includes('?') ? '&' : '?') + 'usp=pp_url&' + encodeURIComponent(fb.noteField) + '=' + encodeURIComponent(id);
    return `<p class="feedback">${icon('message-circle-question')}<span>Was this clear?</span>
      <a href="${esc(url)}" target="_blank" rel="noopener">Tell us in a one-minute form</a></p>`;
  }

  function showQr(url, title) {
    let dlg = document.getElementById('qrDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'qrDialog';
      dlg.className = 'qr-dialog';
      dlg.innerHTML = `<div class="qr-head"><b class="qr-title"></b><button type="button" class="icon-btn" aria-label="Close">${icon('x')}</button></div>
        <div class="qr-code"></div><p class="qr-url"></p><p class="sub">Scan with a phone camera to open this note.</p>`;
      dlg.querySelector('button').addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.querySelector('.qr-title').textContent = title;
    dlg.querySelector('.qr-url').textContent = url;
    const box = dlg.querySelector('.qr-code');
    box.innerHTML = '';
    loadScript(LIBS.qrcode).then(() => {
      new QRCode(box, { text: url, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M });
    }).catch(() => { box.textContent = 'QR code unavailable offline.'; });
    dlg.showModal();
  }

  // Fetch one note's Markdown and turn it into an <article>, with every Section 8.5 block converted.
  // Used by the note page and by "Print selected" on the subject page.
  async function renderArticle(n) {
    let text;
    try {
      const r = await fetch(n.path);
      if (!r.ok) throw new Error('fetch');
      text = await r.text();
    } catch (e) { e.kind = 'fetch'; throw e; }
    const body = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/, '');
    const needs = [loadScript(LIBS.marked)];
    if (/(?<!\\)\$/.test(body)) { loadCss(LIBS.katexCss); needs.push(loadScript(LIBS.katex)); }
    try { await Promise.all(needs); } catch (e) { e.kind = 'libs'; throw e; }
    setupMarked(n.path);

    const article = document.createElement('article');
    article.className = 'note-body';
    article.innerHTML = marked.parse(body);
    convertCallouts(article);
    const { mermaidCount, codeCount } = convertCode(article);
    addHeadingIds(article);
    wrapSections(article);
    convertFlashcards(article);
    wrapTables(article);
    captionImages(article);
    return { article, mermaidCount, codeCount };
  }

  async function renderNote() {
    const id = params.get('id');
    const course = params.get('course');
    const n = id && M.notes[id];
    if (!n) {
      const p = id && M.planned[id];
      if (p) {
        document.title = `${p.title} · ${M.site.title}`;
        return notice(`<b>${esc(p.title)}</b> is planned but not written yet. <a href="javascript:history.back()">Go back</a> or visit the <a href="index.html">home page</a>.`);
      }
      return notice(`No note called “${esc(id || '')}”. <a href="index.html">Back to home</a>.`);
    }
    document.title = `${n.title} · ${M.site.title}`;
    app.innerHTML = '<p class="loading">Loading…</p>';

    let rendered;
    try { rendered = await renderArticle(n); }
    catch (e) {
      return notice(e.kind === 'libs' ? 'Could not load the page libraries. Check your internet connection and reload.'
        : `Couldn't load this note. If you opened the file directly from your computer, run <code>npm run serve</code> instead.`);
    }
    const { article, mermaidCount, codeCount } = rendered;
    const toc = buildToc(article);

    const subj = subjectOf(n.subject);
    const c = course && courseOf(course);
    const crumbs = [`<a href="index.html">Home</a>`];
    if (c) crumbs.push(`<a href="path.html?course=${encodeURIComponent(c.id)}">${esc(c.title)}</a>`);
    else if (subj) crumbs.push(`<a href="path.html?subject=${encodeURIComponent(subj.id)}">${esc(subj.title)}</a>`);
    const meta = [
      `<a href="path.html?subject=${encodeURIComponent(n.subject)}">${esc(subjectTitle(n.subject))}</a>`,
      n.time ? icon('clock') + esc(n.time) : '',
      n.level ? esc(n.level[0].toUpperCase() + n.level.slice(1)) : '',
      n.type && n.type !== 'theory' ? esc(n.type[0].toUpperCase() + n.type.slice(1)) : '',
      n.practical ? `<span>Practical ${n.practical}</span>` : '',
      (n.syllabus || []).length ? `<span title="Syllabus course codes">Syllabus: ${n.syllabus.map((c) => `<a href="syllabus.html?code=${encodeURIComponent(c)}">${esc(c)}</a>`).join(', ')}${n.unit ? `, unit ${n.unit}` : ''}</span>` : '',
      n.updated ? `<span class="updated" title="${n.added && n.added !== n.updated ? `Added ${esc(fmtDate(n.added))}` : 'Date added'}">Updated ${esc(fmtDate(n.updated))}</span>` : '',
    ].filter(Boolean).join('<span class="dot">·</span>');

    app.innerHTML = `
      <div class="note-layout">
        <div class="note-main">
          <nav class="crumbs">${crumbs.join(icon('chevron-right', 'crumb-sep'))}</nav>
          <header class="note-head">
            <h1>${esc(n.title)}</h1>
            <div class="note-meta">${meta}${badges(n)}</div>
            ${n.status === 'draft' ? `<p class="draft-note">${icon('pencil')}This note is a draft and has not been reviewed yet.</p>` : ''}
            <div class="note-actions">
              <button type="button" class="btn" id="shareBtn">${icon('share-2')}Share</button>
              <button type="button" class="btn" id="qrBtn">${icon('qr-code')}QR code</button>
              <button type="button" class="btn" id="printBtn">${icon('printer')}Print</button>
            </div>
            <div class="note-actions classroom-actions" aria-label="Classroom">
              <button type="button" class="btn btn-accent" id="presentBtn">${icon('presentation')}Present</button>
              <button type="button" class="btn" id="notebookBtn">${icon('notebook-text')}Notebook</button>
              <button type="button" class="btn" id="whiteboardBtn">${icon('pen-tool')}Whiteboard</button>
            </div>
          </header>
          ${toc ? `<details class="toc-inline"><summary>${icon('list')}Contents</summary>${toc}</details>` : ''}
          ${linkBox('prereq', 'Before you start', 'footprints', n.prerequisites, 'Read these first if they are new to you.')}
          <div id="noteBody"></div>
          ${linkBox('related', 'See also', 'link', n.related)}
          ${feedbackLink(id)}
          ${prevNext(id, course)}
          <footer class="print-only print-footer">${esc(M.site.title)} · ${esc(location.href.split('#')[0])} · Licensed CC BY-NC-SA 4.0</footer>
        </div>
        ${toc ? `<aside class="toc-side" aria-label="Contents"><div class="toc-title">Contents</div>${toc}</aside>` : ''}
      </div>`;
    const holder = document.getElementById('noteBody');
    holder.replaceWith(article);
    const key = buildAnswerKey(article);
    const related = app.querySelector('.linkbox.related');
    (related || article).insertAdjacentHTML(related ? 'afterend' : 'beforeend', key);

    const noteUrl = location.href.split('#')[0];
    document.getElementById('shareBtn').addEventListener('click', () => shareLink(noteUrl, document.title));
    document.getElementById('qrBtn').addEventListener('click', () => showQr(noteUrl, n.title));
    document.getElementById('printBtn').addEventListener('click', async () => {
      const opts = await printDialog(`Print ${n.title}`);
      if (!opts) return;
      if (opts.mode === 'full') return runPrint(opts, null); // the page itself prints as the full note
      const doc = printDoc('notebook');
      printPiece(doc, n, 'notebook', article);
      runPrint(opts, doc);
    });
    // Classroom tools live in classroom.js; they read what they need from window.Sutra.
    window.Sutra = { icon, esc, loadScript, LIBS, toast, note: n, noteUrl, subjectTitle: subjectTitle(n.subject), cleanCopy, writeDownParts };
    const classroom = (fn) => () => (window.SutraClassroom ? window.SutraClassroom[fn]() : toast('Still loading, try again'));
    document.getElementById('presentBtn').addEventListener('click', classroom('present'));
    document.getElementById('notebookBtn').addEventListener('click', classroom('notebook'));
    document.getElementById('whiteboardBtn').addEventListener('click', () => window.open('https://excalidraw.com/', '_blank', 'noopener'));
    setupTocTracking();
    setupPrint();

    await Promise.all([mermaidCount ? renderMermaid(article) : null, codeCount ? highlightCode(article) : null]);
    jumpToHash();
  }

  function jumpToHash() {
    if (!location.hash) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el) return;
    for (let d = el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    el.scrollIntoView();
  }
  window.addEventListener('hashchange', jumpToHash);

  function setupTocTracking() {
    const links = [...document.querySelectorAll('.toc-side a')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('active'));
        const a = byId.get(e.target.id);
        if (a) a.classList.add('active');
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    document.querySelectorAll('.note-body h2, .note-body h3').forEach((h) => obs.observe(h));
  }

  // While printing, open collapsed boxes and flashcards (answers stay hidden: they print in the answer key).
  function setupPrint() {
    let opened = [];
    window.addEventListener('beforeprint', () => {
      opened = [...document.querySelectorAll('.note-body details:not([open]):not(.callout-answer)')];
      opened.forEach((d) => { d.open = true; });
    });
    window.addEventListener('afterprint', () => { opened.forEach((d) => { d.open = false; }); opened = []; });
  }

  // ---------------- boot ----------------

  setupSettings();
  loadManifest().then(() => {
    if (page === 'home') renderHome();
    else if (page === 'path') return renderPath();
    else if (page === 'note') return renderNote();
    else if (page === 'whatsnew') renderWhatsNew();
    else if (page === 'syllabus') renderSyllabus();
  }).catch((e) => {
    console.error(e);
    notice(`Couldn't load the site data. If you opened this file directly from your computer, run <code>npm run serve</code> and open <a href="http://localhost:8000">localhost:8000</a>.`);
  });
})();
