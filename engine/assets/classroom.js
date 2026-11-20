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
  const KEYPOINTS_KEY = 'notes_present_keypoints_v1';
  const MIN_SCALE = 0.7; // text may shrink to 70% before a slide is split further (plan 12)
  // Sections left out of the slides: Self-check becomes the exit ticket; flashcards and
  // sources are for students' own study, not for teaching from.
  const SKIP_SECTIONS = ['self-check', 'flashcards', 'sources'];

  const S = () => window.Sutra;
  const article = () => document.querySelector('.note-body');

  const readFlag = (k) => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
  const saveFlag = (k, on) => { try { localStorage.setItem(k, on ? '1' : '0'); } catch (e) { /* ignore */ } };

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

  // ---- Key points (plan 12): only headings, ==highlights==, lists, tables, callouts and diagrams.
  // Paragraphs and code are hidden; a paragraph with highlights keeps just its highlighted lines.
  // Display maths stays too: formulas are key points.
  function keyPointsOnly(sec) {
    const keep = (el) => el.matches('h2, h3, h4, ul, ol, .table-wrap, table, .callout, .diagram, figure, .math-display, .flashcards');
    [...sec.children].forEach((el) => {
      if (keep(el)) return;
      const marks = [...el.querySelectorAll('mark.wd')];
      if (marks.length) {
        const p = document.createElement('p');
        p.className = 'kp-lines';
        marks.forEach((m, i) => { if (i) p.appendChild(document.createElement('br')); p.appendChild(m.cloneNode(true)); });
        el.replaceWith(p);
      } else el.remove();
    });
    // a ### heading left with nothing under it is dropped too
    [...sec.querySelectorAll(':scope > h3')].forEach((h) => {
      const next = h.nextElementSibling;
      if (!next || /^H[23]$/.test(next.tagName)) h.remove();
    });
    return [...sec.children].some((el) => el.tagName !== 'H2');
  }

  // ---- Splitting one block too tall for a slide on its own, at natural boundaries:
  // list items, table rows (header repeated), callout body blocks, or sentences of a paragraph.
  function splitBlock(el) {
    const halves = (items, make) => {
      if (items.length < 2) return null;
      const mid = Math.ceil(items.length / 2);
      return [make(items.slice(0, mid), 0), make(items.slice(mid), mid)];
    };
    if (el.matches('ul, ol')) {
      return halves([...el.children], (lis, offset) => {
        const l = el.cloneNode(false);
        if (el.tagName === 'OL') l.start = (el.start || 1) + offset;
        lis.forEach((li) => l.appendChild(li.cloneNode(true)));
        return l;
      });
    }
    if (el.matches('.table-wrap')) {
      const body = el.querySelector('tbody');
      if (!body) return null;
      return halves([...body.rows], (rows) => {
        const w = el.cloneNode(true);
        w.querySelector('tbody').replaceChildren(...rows.map((r) => r.cloneNode(true)));
        return w;
      });
    }
    if (el.matches('div.callout')) {
      const parts = [...el.querySelector('.callout-body').children];
      return halves(parts, (kids, offset) => {
        const c = el.cloneNode(true);
        c.querySelector('.callout-body').replaceChildren(...kids.map((k) => k.cloneNode(true)));
        if (offset) c.querySelector('.callout-title-text').insertAdjacentHTML('beforeend', ' <span class="cont">(continued)</span>');
        return c;
      });
    }
    if (el.tagName === 'P') {
      const sentences = el.innerHTML.split(/(?<=[.!?])\s+(?=[A-Z0-9<])/);
      return halves(sentences, (ss) => { const p = el.cloneNode(false); p.innerHTML = ss.join(' '); return p; });
    }
    return null;
  }

  // Build the slides from the rendered note (plan 12, "No scrolling slides"):
  // 1. a section that fits (text may shrink to 70%) is one slide;
  // 2. otherwise its ### questions are packed onto slides, a question moving whole to a new
  //    slide when it fits there;
  // 3. a question still too tall is split at block boundaries onto "continued" slides, and a single
  //    block still too tall is split inside (list items, table rows, callout parts, sentences).
  function buildSlides(stage, keyPoints) {
    const art = article();
    const slides = [titleSlide()];
    const fitsAt = (slide, scale) => {
      slide.style.fontSize = scale === 1 ? '' : scale + 'em';
      stage.replaceChildren(slide);
      const ok = slide.scrollHeight <= slide.clientHeight;
      slide.style.fontSize = '';
      return ok;
    };

    art.querySelectorAll(':scope > .note-section').forEach((sec) => {
      if (SKIP_SECTIONS.includes(sec.dataset.section)) return;
      const copy = cleanCopy(sec);
      if (keyPoints && !keyPointsOnly(copy)) return; // nothing key in this section: no slide
      const whole = document.createElement('div');
      whole.className = 'slide';
      whole.appendChild(copy);
      if (fitsAt(whole, MIN_SCALE)) { slides.push(whole); return; }

      const heading = copy.querySelector(':scope > h2');
      const parts = [];
      let cur = null;
      const newSlide = () => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const shell = sectionShell(copy);
        if (heading) {
          const h = heading.cloneNode(true);
          if (parts.length) h.classList.add('h-continued');
          shell.appendChild(h);
        }
        slide.appendChild(shell);
        cur = { slide, shell, blocks: 0 };
        parts.push(cur);
      };
      const continuedH3 = (h3) => {
        const h = h3.cloneNode(true);
        const t = h.querySelector('.h-text') || h;
        t.insertAdjacentHTML('beforeend', ' <span class="cont">(continued)</span>');
        return h;
      };

      // Place one block on the current slide; move it on, or split it, when it doesn't fit.
      const place = (block, h3) => {
        cur.shell.appendChild(block);
        cur.blocks++;
        if (fitsAt(cur.slide, 1)) return;
        if (cur.blocks > 1) {
          block.remove(); cur.blocks--;
          newSlide();
          if (h3) cur.shell.appendChild(continuedH3(h3));
          cur.shell.appendChild(block); cur.blocks++;
          if (fitsAt(cur.slide, 1)) return;
        }
        if (fitsAt(cur.slide, MIN_SCALE)) return;
        const pieces = splitBlock(block);
        if (!pieces) return; // cannot be split: fitText shrinks it further when shown
        block.remove(); cur.blocks--;
        pieces.forEach((pc) => place(pc, h3));
      };

      // groups: the part before the first ###, then one group per ### question
      const groups = [[]];
      [...copy.children].forEach((ch) => {
        if (ch.tagName === 'H2') return;
        if (ch.tagName === 'H3') groups.push([]);
        groups[groups.length - 1].push(ch);
      });
      newSlide();
      groups.filter((g) => g.length).forEach((g) => {
        const h3 = g[0].tagName === 'H3' ? g[0] : null;
        g.forEach((n) => cur.shell.appendChild(n));
        if (fitsAt(cur.slide, 1)) { cur.blocks += g.length; return; }
        g.forEach((n) => n.remove());
        if (cur.blocks > 0) newSlide();
        g.forEach((n) => cur.shell.appendChild(n));
        if (fitsAt(cur.slide, MIN_SCALE)) { cur.blocks += g.length; return; }
        g.forEach((n) => n.remove());
        if (h3) cur.shell.appendChild(h3);
        g.filter((n) => n !== h3).forEach((n) => place(n, h3));
      });
      const real = parts.filter((pt) => pt.shell.children.length > 1);
      real.forEach((pt, i) => {
        if (real.length > 1) {
          const h = pt.shell.querySelector('h2 .h-text');
          if (h) h.insertAdjacentHTML('beforeend', ` <span class="part-count">${i + 1}/${real.length}</span>`);
        }
        slides.push(pt.slide);
      });
    });

    const quizzes = [...art.querySelectorAll('.note-section[data-section="self-check"] .quiz')];
    if (quizzes.length) slides.push(exitTicketSlide(quizzes));
    stage.replaceChildren();
    return slides;
  }

  // Shrink a slide's text until it fits. Slides are built to fit at 70% or more; only a block
  // that cannot be split (a very long code block, say) goes smaller, so a slide never scrolls.
  // (Hidden step items keep their space, so revealing never changes the size mid-slide.)
  function fitText(slide) {
    let scale = 1;
    slide.style.fontSize = '';
    while (slide.scrollHeight > slide.clientHeight && scale > 0.41) {
      scale -= 0.05;
      slide.style.fontSize = scale.toFixed(2) + 'em';
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
        <button type="button" class="pbtn pbtn-text" data-act="keypoints" aria-pressed="false" title="Show only headings, highlights, lists, tables, boxes and diagrams (K)">${icon('star')}<span>Key points</span></button>
        <button type="button" class="pbtn pbtn-text" data-act="reveal" aria-pressed="false" title="Show list items one at a time (R)">${icon('list-ordered')}<span>Step by step</span></button>
        <button type="button" class="pbtn pbtn-text" data-act="whiteboard" title="Open the Excalidraw whiteboard in a new tab">${icon('pen-tool')}<span>Whiteboard</span></button>
        <button type="button" class="pbtn" data-act="full" aria-label="Full screen (F)" title="Full screen (F)">${icon('maximize')}</button>
        <button type="button" class="pbtn" data-act="exit" aria-label="Exit present mode (Esc)" title="Exit (Esc)">${icon('x')}</button>
      </div>`;
    const stage = root.querySelector('.present-stage');
    const count = root.querySelector('.present-count');
    const bar = root.querySelector('.present-progress span');
    const revealBtn = root.querySelector('[data-act="reveal"]');
    const kpBtn = root.querySelector('[data-act="keypoints"]');

    P = { root, stage, slides: [], i: 0, shown: 0, reveal: readFlag(REVEAL_KEY), keyPoints: readFlag(KEYPOINTS_KEY), fullOnOpen: false };
    P.slides = buildSlides(stage, P.keyPoints);
    // Rebuild (for a new screen size, or the Key points switch) and stay on the same section.
    P.rebuild = () => {
      const was = P.slides[P.i];
      const secName = was && was.querySelector('.note-section') ? was.querySelector('.note-section').dataset.section : null;
      const wasLast = P.i === P.slides.length - 1;
      P.slides = buildSlides(stage, P.keyPoints);
      let i = 0;
      if (wasLast) i = P.slides.length - 1;
      else if (secName) { const k = P.slides.findIndex((sl) => sl.querySelector(`.note-section[data-section="${secName}"]`)); if (k >= 0) i = k; }
      else if (P.i > 0) i = Math.min(P.i, P.slides.length - 1);
      P.go(i, false);
    };

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
      kpBtn.setAttribute('aria-pressed', String(P.keyPoints));
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
    P.toggleReveal = () => { P.reveal = !P.reveal; saveFlag(REVEAL_KEY, P.reveal); P.shown = 0; P.render(); };
    P.toggleKeyPoints = () => { P.keyPoints = !P.keyPoints; saveFlag(KEYPOINTS_KEY, P.keyPoints); P.rebuild(); };
    let resizeTimer = null;
    P.onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (P) P.rebuild(); }, 250); };
    window.addEventListener('resize', P.onResize);

    root.querySelector('.present-bar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'prev') P.prev();
      else if (act === 'next') P.next();
      else if (act === 'reveal') P.toggleReveal();
      else if (act === 'keypoints') P.toggleKeyPoints();
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
    else if (k === 'k' || k === 'K') P.toggleKeyPoints();
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
    window.removeEventListener('resize', P.onResize);
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

    S().writeDownParts(art).forEach((part) => page.appendChild(part));
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
