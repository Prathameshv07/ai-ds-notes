/* ==========================================================================
   Classroom tools (NOTES_PROJECT_PLAN.md Section 12, "Classroom"; Phase 1.5).

   Present mode: full-screen slides made from the rendered note, one per
   ## section. A section too long for one slide is split at its ### headings.
   The first slide shows the note's QR code; the last is an exit ticket with
   two Self-check questions. Arrow keys, swipe or tap to move; Esc exits.
   Step-by-step reveal shows list items one at a time.

   Notebook view: only the write-down parts (In one line, Diagram, Key facts,
   and ==highlighted== lines), large enough for a projector.

   Both work on copies of the rendered note, so they never change the page.
   reader.js provides helpers through window.Sutra.
   ========================================================================== */
(function () {
  'use strict';

  const REVEAL_KEY = 'notes_present_reveal_v1';
  // Sections left out of the slides: Self-check becomes the exit ticket; flashcards and
  // sources are for students' own study, not for teaching from.
  const SKIP_SECTIONS = ['self-check', 'flashcards', 'sources'];

  const S = () => window.Sutra;
  const article = () => document.querySelector('.note-body');

  function readReveal() { try { return localStorage.getItem(REVEAL_KEY) === '1'; } catch (e) { return false; } }
  function saveReveal(on) { try { localStorage.setItem(REVEAL_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ } }

  // A copy of part of the note, without the page-only controls and without duplicate heading IDs.
  function cleanCopy(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll('.anchor, .copy-btn').forEach((e) => e.remove());
    c.querySelectorAll('h2[id], h3[id], h4[id]').forEach((h) => h.removeAttribute('id'));
    c.querySelectorAll('details.callout-answer[open], .flashcard[open]').forEach((d) => { d.open = false; });
    return c;
  }

  function lockScroll(on) { document.documentElement.classList.toggle('overlay-open', on); }

  function overlay(cls, label) {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', label);
    el.tabIndex = -1;
    document.body.appendChild(el);
    lockScroll(true);
    return el;
  }

  // ======================= present mode =======================

  let P = null; // the open presentation

  function sectionShell(section) {
    const shell = document.createElement('section');
    shell.className = section.className + ' slide-section';
    for (const k of Object.keys(section.dataset)) shell.dataset[k] = section.dataset[k];
    return shell;
  }

  // Split a section's children into groups: [intro + h2], then one group per ### heading.
  function groupsOf(section) {
    const groups = [[]];
    [...section.children].forEach((ch) => {
      if (ch.tagName === 'H3') groups.push([]);
      groups[groups.length - 1].push(ch);
    });
    return groups.filter((g) => g.length);
  }

  function titleSlide() {
    const { note, noteUrl, subjectTitle, esc, icon } = S();
    const el = document.createElement('div');
    el.className = 'slide slide-cover';
    el.innerHTML = `
      <div class="cover-text">
        <p class="cover-subject">${esc(subjectTitle)}</p>
        <h1>${esc(note.title)}</h1>
        <p class="cover-meta">${note.time ? icon('clock') + esc(note.time) : ''}</p>
      </div>
      <div class="cover-qr">
        <div class="qr-box" aria-label="QR code for this note"></div>
        <p class="cover-qr-hint">Scan to open these notes on your phone</p>
        <p class="cover-url">${esc(noteUrl)}</p>
      </div>`;
    const box = el.querySelector('.qr-box');
    S().loadScript(S().LIBS.qrcode).then(() => {
      const size = Math.round(Math.min(window.innerHeight * 0.42, window.innerWidth * 0.36, 380));
      new QRCode(box, { text: noteUrl, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
    }).catch(() => { box.textContent = 'QR code needs an internet connection.'; });
    return el;
  }

  function exitTicketSlide(quizzes) {
    const { icon } = S();
    const el = document.createElement('div');
    el.className = 'slide slide-ticket';
    const draw = () => {
      const pool = quizzes.map((q, i) => [Math.random(), i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map((x) => x[1]).sort((a, b) => a - b);
      el.innerHTML = `<section class="note-section slide-section" data-level="P">
          <h2><span class="sec-icon">${icon('ticket')}</span><span class="h-text">Exit ticket</span>
            ${quizzes.length > 2 ? `<button type="button" class="btn ticket-shuffle" title="Pick two other questions">${icon('shuffle')}Other questions</button>` : ''}</h2>
          <p class="ticket-lead">Answer on paper in one minute, then tap a question to check.</p>
        </section>`;
      const sec = el.querySelector('section');
      pool.forEach((i) => sec.appendChild(cleanCopy(quizzes[i])));
      const btn = el.querySelector('.ticket-shuffle');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); draw(); if (P) P.render(); });
    };
    draw();
    return el;
  }

  // Build the slides. Sections that overflow are split at ### headings, packing as many
  // groups per slide as fit, measured in the real slide area.
  function buildSlides(stage) {
    const art = article();
    const slides = [titleSlide()];
    const fits = (el) => { stage.replaceChildren(el); return el.scrollHeight <= el.clientHeight + 2; };

    art.querySelectorAll(':scope > .note-section').forEach((sec) => {
      if (SKIP_SECTIONS.includes(sec.dataset.section)) return;
      const copy = cleanCopy(sec);
      const whole = document.createElement('div');
      whole.className = 'slide';
      whole.appendChild(copy);
      const groups = groupsOf(copy);
      if (groups.length < 2 || fits(whole)) { slides.push(whole); return; }

      const heading = groups[0].find((n) => n.tagName === 'H2');
      const parts = [];
      let cur = null;
      const start = (first) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const shell = sectionShell(copy);
        if (!first && heading) { const h = heading.cloneNode(true); h.classList.add('h-continued'); shell.appendChild(h); }
        slide.appendChild(shell);
        return { slide, shell, count: 0 };
      };
      groups.forEach((g, gi) => {
        if (!cur) cur = start(gi === 0);
        const added = g.map((n) => n);
        added.forEach((n) => cur.shell.appendChild(n));
        cur.count++;
        if (cur.count > 1 && !fits(cur.slide)) {
          added.forEach((n) => n.remove());
          parts.push(cur);
          cur = start(false);
          added.forEach((n) => cur.shell.appendChild(n));
          cur.count = 1;
        }
      });
      if (cur) parts.push(cur);
      parts.forEach((p, i) => {
        if (parts.length > 1) {
          const h = p.shell.querySelector('h2 .h-text');
          if (h) h.insertAdjacentHTML('beforeend', ` <span class="part-count">${i + 1}/${parts.length}</span>`);
        }
        slides.push(p.slide);
      });
    });

    const quizzes = [...art.querySelectorAll('.note-section[data-section="self-check"] .quiz')];
    if (quizzes.length) slides.push(exitTicketSlide(quizzes));
    stage.replaceChildren();
    return slides;
  }

  // A slide that is still too tall shrinks its text, down to 70%; beyond that it scrolls.
  // (Hidden step items keep their space, so revealing never changes the size mid-slide.)
  function fitText(slide) {
    let scale = 1;
    slide.style.fontSize = '';
    while (slide.scrollHeight > slide.clientHeight + 2 && scale > 0.71) {
      scale -= 0.05;
      slide.style.fontSize = scale + 'em';
    }
  }

  // List items revealed one by one (not quiz options or flashcards).
  const stepsOf = (slide) => [...slide.querySelectorAll('li')].filter((li) => !li.closest('.quiz-options, .flashcards, .slide-cover'));

  function present() {
    if (P) return;
    if (!article()) return;
    const { icon } = S();
    const root = overlay('present', 'Present mode');
    root.innerHTML = `
      <div class="present-progress"><span></span></div>
      <div class="present-stage"></div>
      <div class="present-bar">
        <button type="button" class="pbtn" data-act="prev" aria-label="Previous slide">${icon('chevron-left')}</button>
        <span class="present-count" aria-live="polite"></span>
        <button type="button" class="pbtn" data-act="next" aria-label="Next slide">${icon('chevron-right')}</button>
        <span class="present-gap"></span>
        <button type="button" class="pbtn pbtn-text" data-act="reveal" aria-pressed="false" title="Show list items one at a time (R)">${icon('list-ordered')}<span>Step by step</span></button>
        <button type="button" class="pbtn pbtn-text" data-act="whiteboard" title="Open the Excalidraw whiteboard in a new tab">${icon('pen-tool')}<span>Whiteboard</span></button>
        <button type="button" class="pbtn" data-act="full" aria-label="Full screen (F)" title="Full screen (F)">${icon('maximize')}</button>
        <button type="button" class="pbtn" data-act="exit" aria-label="Exit present mode (Esc)" title="Exit (Esc)">${icon('x')}</button>
      </div>`;
    const stage = root.querySelector('.present-stage');
    const count = root.querySelector('.present-count');
    const bar = root.querySelector('.present-progress span');
    const revealBtn = root.querySelector('[data-act="reveal"]');

    P = { root, stage, slides: [], i: 0, shown: 0, reveal: readReveal(), fullOnOpen: false };
    P.slides = buildSlides(stage);

    P.render = () => {
      const slide = P.slides[P.i];
      stage.replaceChildren(slide);
      slide.scrollTop = 0;
      const steps = stepsOf(slide);
      steps.forEach((li, k) => li.classList.toggle('step-pending', P.reveal && k >= P.shown));
      fitText(slide);
      count.textContent = `${P.i + 1} / ${P.slides.length}`;
      bar.style.width = `${((P.i + 1) / P.slides.length) * 100}%`;
      revealBtn.setAttribute('aria-pressed', String(P.reveal));
      root.querySelector('[data-act="prev"]').disabled = P.i === 0 && P.shown === 0;
    };
    P.go = (i, showAll) => {
      P.i = Math.max(0, Math.min(P.slides.length - 1, i));
      P.shown = showAll ? stepsOf(P.slides[P.i]).length : 0;
      P.render();
    };
    P.next = () => {
      const total = stepsOf(P.slides[P.i]).length;
      if (P.reveal && P.shown < total) { P.shown++; P.render(); return; }
      if (P.i < P.slides.length - 1) P.go(P.i + 1, false);
    };
    P.prev = () => {
      if (P.reveal && P.shown > 0) { P.shown--; P.render(); return; }
      if (P.i > 0) P.go(P.i - 1, true);
    };
    P.toggleReveal = () => { P.reveal = !P.reveal; saveReveal(P.reveal); P.shown = 0; P.render(); };

    root.querySelector('.present-bar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'prev') P.prev();
      else if (act === 'next') P.next();
      else if (act === 'reveal') P.toggleReveal();
      else if (act === 'whiteboard') window.open('https://excalidraw.com/', '_blank', 'noopener');
      else if (act === 'full') toggleFullscreen();
      else if (act === 'exit') closePresent();
    });

    // Tap or click on the slide: left third goes back, the rest goes forward.
    // Taps on links, buttons and answers keep their normal job.
    let swiped = false;
    stage.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target.closest('a, button, summary, details, input, select, textarea')) return;
      if (window.getSelection && String(window.getSelection())) return;
      if (e.clientX < window.innerWidth / 3) P.prev(); else P.next();
    });
    let tx = 0, ty = 0;
    stage.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; if (dx < 0) P.next(); else P.prev(); setTimeout(() => { swiped = false; }, 400); }
    }, { passive: true });

    document.addEventListener('keydown', onPresentKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    P.go(0, false);
    root.focus();
    // Ask for full screen; browsers allow it because this runs from the button click.
    if (root.requestFullscreen) root.requestFullscreen().then(() => { if (P) P.fullOnOpen = true; }).catch(() => {});
  }

  function onPresentKey(e) {
    if (!P || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(k)) { e.preventDefault(); P.next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace', 'ArrowUp'].includes(k)) { e.preventDefault(); P.prev(); }
    else if (k === 'Home') { e.preventDefault(); P.go(0, false); }
    else if (k === 'End') { e.preventDefault(); P.go(P.slides.length - 1, false); }
    else if (k === 'Escape') { e.preventDefault(); closePresent(); }
    else if (k === 'r' || k === 'R') P.toggleReveal();
    else if (k === 'f' || k === 'F') toggleFullscreen();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (P && P.root.requestFullscreen) P.root.requestFullscreen().catch(() => {});
  }

  // In full screen, the browser uses Esc to leave full screen; treat that as "exit present mode".
  function onFullscreenChange() {
    if (P && P.fullOnOpen && !document.fullscreenElement) closePresent();
  }

  function closePresent() {
    if (!P) return;
    document.removeEventListener('keydown', onPresentKey);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    const root = P.root;
    P = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    root.remove();
    lockScroll(false);
    const btn = document.getElementById('presentBtn');
    if (btn) btn.focus();
  }

  // ======================= notebook view =======================

  let NB = null;

  function notebook() {
    if (NB) return;
    const art = article();
    if (!art) return;
    const { icon, esc, note } = S();
    const root = overlay('notebook', 'Notebook view');
    root.innerHTML = `
      <div class="notebook-bar">
        <span class="notebook-title">${icon('notebook-text')}<span>Write this down · ${esc(note.title)}</span></span>
        <button type="button" class="pbtn" data-act="close" aria-label="Close notebook view (Esc)" title="Close (Esc)">${icon('x')}</button>
      </div>
      <div class="notebook-page"></div>`;
    const page = root.querySelector('.notebook-page');

    // Walk the note in order: write-down sections in full; elsewhere, only highlighted lines,
    // grouped under their section (and question) heading. Content marked [!beyond] is left out.
    art.querySelectorAll(':scope > .note-section').forEach((sec) => {
      if (sec.classList.contains('write-down')) {
        const c = cleanCopy(sec);
        c.querySelectorAll('.callout-beyond').forEach((b) => b.remove());
        page.appendChild(c);
        return;
      }
      const groups = new Map();
      sec.querySelectorAll('mark.wd').forEach((m) => {
        if (m.closest('.callout-beyond')) return;
        let label = sec.querySelector('h2 .h-text').textContent.trim();
        let h3 = null;
        for (let n = m.closest('.note-section > *'); n; n = n.previousElementSibling) { if (n.tagName === 'H3') { h3 = n; break; } }
        if (h3) label += ' · ' + h3.querySelector('.h-text').textContent.trim();
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(m);
      });
      groups.forEach((marks, label) => {
        const box = document.createElement('section');
        box.className = 'note-section notebook-lines';
        box.innerHTML = `<h3>${esc(label)}</h3><ul></ul>`;
        const ul = box.querySelector('ul');
        marks.forEach((m) => { const li = document.createElement('li'); li.appendChild(m.cloneNode(true)); ul.appendChild(li); });
        page.appendChild(box);
      });
    });
    if (!page.children.length) page.innerHTML = '<p class="empty">This note has no write-down parts yet.</p>';

    root.querySelector('[data-act="close"]').addEventListener('click', closeNotebook);
    document.addEventListener('keydown', onNotebookKey);
    NB = { root };
    root.focus();
  }

  function onNotebookKey(e) { if (NB && e.key === 'Escape') { e.preventDefault(); closeNotebook(); } }

  function closeNotebook() {
    if (!NB) return;
    document.removeEventListener('keydown', onNotebookKey);
    NB.root.remove();
    NB = null;
    lockScroll(false);
    const btn = document.getElementById('notebookBtn');
    if (btn) btn.focus();
  }

  window.SutraClassroom = { present, notebook, closePresent, closeNotebook };
})();
