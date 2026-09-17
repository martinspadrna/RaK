// Denní úkoly odvozené z přidělení ve směnovém rozpisu.
// KP lze později upravit pouze v tomto přehledu; data se nikam neukládají.
(function installRotationTasks() {
  'use strict';

  const RAK_SHARED_MSKC01_TASKS_MODE = '1.6.13-two-lathes';

  const MACHINE_TASKS = Object.freeze({
    TNKS01: Object.freeze([
      Object.freeze({ label: 'O nic se nestarej a jen si užij nýtování.' })
    ]),
    TPKW01: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel' }),
      Object.freeze({ label: 'TPM' })
    ]),
    TPKW02: Object.freeze([
      Object.freeze({ label: 'TPM za TNKS01', place: 'KP516' })
    ]),
    TBKR01: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel a TPM', place: 'KP515' })
    ]),
    TBKR07: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel a TPM', place: 'KP516' })
    ]),
    MSKC01: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel', place: 'KP518' }),
      Object.freeze({ label: 'TPM', place: 'KP512' })
    ]),
    MSKC03: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel a TPM', place: 'KP512' })
    ]),
    MSKC04: Object.freeze([
      Object.freeze({ label: 'TPM', place: 'KP512' })
    ]),
    MFKF06: Object.freeze([
      Object.freeze({ label: 'Kontrola měřidel a TPM', place: 'KP511' })
    ]),
    MFKF10: Object.freeze([
      Object.freeze({ label: 'TPM', place: 'KP511' })
    ]),
    'Kalírna': Object.freeze([
      Object.freeze({ label: 'Tak tam hlavně nedělej ostudu.' })
    ])
  });

  // Úkoly navíc platné jen pro konkrétní směnu. Základní úkoly stroje
  // zůstávají vždy stejné; tyto se pouze doplní do okna po trojitém klepnutí.
  const MACHINE_SHIFT_TASKS = Object.freeze({
    TPKW01: Object.freeze({
      N: Object.freeze([
        Object.freeze({ label: 'ALMEN' })
      ]),
      R: Object.freeze([
        Object.freeze({ label: 'Odebrat jeden kus na RTG' })
      ])
    })
  });

  const TAP_WINDOW_MS = 1100;
  let lastCard = null;
  let tapCount = 0;
  let lastTapAt = 0;

  function assignmentMachine(value) {
    const text = String(value || '').toUpperCase();
    if (/KAL[IÍ]RNA/.test(text)) return 'Kalírna';
    // Při společné obsluze frézek už rozpis uvádí „MFKF10 (+ MFKF06)“.
    // V takovém případě má přednost společný rozsah úkolu z MFKF06.
    if (/\bMFKF06\b/.test(text)) return 'MFKF06';
    const match = text.match(/\b(?:TNKS01|TPKW01|TPKW02|TBKR01|TBKR07|MSKC01|MSKC03|MSKC04|MFKF10)\b/);
    return match ? match[0] : '';
  }

  function assignmentShift(value) {
    const shift = String(value || '').trim().toUpperCase();
    return /^N/.test(shift) || /NOČN/.test(shift) ? 'N' : ( /^R/.test(shift) || /RANN/.test(shift) ? 'R' : '');
  }

  function tasksForMachine(machine, normalizedShift) {
    const configuredTasks = typeof window.getRotationMachineTasksForMachine === 'function'
      ? window.getRotationMachineTasksForMachine(machine, normalizedShift)
      : null;
    const baseTasks = configuredTasks || (MACHINE_TASKS[machine] || []);
    const shiftTasks = configuredTasks ? [] : ((MACHINE_SHIFT_TASKS[machine] && MACHINE_SHIFT_TASKS[machine][normalizedShift]) || []);
    return baseTasks.concat(shiftTasks).map((task) => ({ label: task.label, place: task.place || '' }));
  }

  function mergeTasks() {
    const seen = new Set();
    const merged = [];
    Array.from(arguments).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((task) => {
        const safe = { label: String(task && task.label || '').trim(), place: String(task && task.place || '').trim() };
        if (!safe.label) return;
        const key = safe.label.toLowerCase() + '\u0000' + safe.place.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(safe);
      });
    });
    return merged;
  }

  function getTasksForAssignment(value, shift, options) {
    const machine = assignmentMachine(value);
    const normalizedShift = assignmentShift(shift);
    // Kalírna je zvláštní denní výjimka, ne konfigurovatelný výrobní stroj.
    // Proto nepoužívá admin mapu strojů a má pevný krátký úkol.
    if (machine === 'Kalírna') {
      return {
        machine,
        tasks: (MACHINE_TASKS[machine] || []).map((task) => ({ label: task.label, place: task.place || '' }))
      };
    }
    const sharedMskc01 = !!(options && options.sharedMskc01 && (machine === 'MSKC03' || machine === 'MSKC04'));
    const sharedTpkw02 = !!(options && options.sharedTpkw02 && (machine === 'TBKR01' || machine === 'TBKR07'));
    const ownTasks = tasksForMachine(machine, normalizedShift);
    const ownAndMsk = sharedMskc01 ? mergeTasks(ownTasks, tasksForMachine('MSKC01', normalizedShift)) : ownTasks;
    const tasks = sharedTpkw02 ? mergeTasks(ownAndMsk, tasksForMachine('TPKW02', normalizedShift)) : ownAndMsk;
    return {
      machine: (sharedMskc01 ? machine + ' (+MSKC01)' : machine) + (sharedTpkw02 ? ' (+TPKW02)' : ''),
      tasks
    };
  }

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  function hideRotationTaskModal() {
    const overlay = document.getElementById('rotationTaskModal');
    if (!overlay) return;
    overlay.classList.remove('isVisible');
    document.body.classList.remove('rotationTaskModalOpen');
  }

  function ensureRotationTaskModal() {
    let overlay = document.getElementById('rotationTaskModal');
    if (overlay) return overlay;

    overlay = node('div', 'personScheduleOverlay rotationTaskOverlay');
    overlay.id = 'rotationTaskModal';

    const modal = node('section', 'personScheduleModal rotationTaskModal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'rotationTaskModalTitle');

    const close = node('button', 'personScheduleClose', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Zavřít úkol');
    close.addEventListener('click', hideRotationTaskModal);

    const title = node('h3', 'rotationTaskTitle');
    title.id = 'rotationTaskModalTitle';
    const meta = node('div', 'rotationTaskMeta');
    const body = node('div', 'rotationTaskBody');
    body.id = 'rotationTaskModalBody';

    modal.append(close, title, meta, body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) hideRotationTaskModal();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function showRotationTaskModal(details) {
    const input = details || {};
    const result = getTasksForAssignment(input.machine, input.shift, { sharedMskc01: !!input.sharedMskc01, sharedTpkw02: !!input.sharedTpkw02 });
    const overlay = ensureRotationTaskModal();
    const title = overlay.querySelector('#rotationTaskModalTitle');
    const meta = overlay.querySelector('.rotationTaskMeta');
    const body = overlay.querySelector('#rotationTaskModalBody');
    const person = String(input.person || '').trim();
    const shiftText = [String(input.date || '').trim(), String(input.shift || '').trim()].filter(Boolean).join(' · ');

    title.textContent = person ? 'Úkol pro ' + person : 'Úkol ve směně';
    meta.replaceChildren();
    const machineBadge = node('span', 'rotationTaskMachine', result.machine || String(input.machine || 'Bez stroje'));
    meta.appendChild(machineBadge);
    if (shiftText) meta.appendChild(node('span', 'rotationTaskShift', shiftText));

    body.replaceChildren();
    if (!result.machine) {
      body.appendChild(node('p', 'rotationTaskEmpty', 'Pro toto přidělení zatím není nastavený žádný úkol.'));
    } else {
      const intro = node('p', 'rotationTaskIntro', 'Na této směně zkontroluj:');
      const list = node('ul', 'rotationTaskList');
      result.tasks.forEach((task) => {
        const item = node('li', 'rotationTaskItem');
        item.appendChild(node('span', 'rotationTaskLabel', task.label));
        if (task.place) item.appendChild(node('span', 'rotationTaskPlace', task.place));
        list.appendChild(item);
      });
      body.append(intro, list);
    }

    overlay.classList.add('isVisible');
    document.body.classList.add('rotationTaskModalOpen');
    return result;
  }

  function shouldShareMskc01FromCard(card) {
    if (!card) return false;
    const currentMachine = assignmentMachine(card.dataset.rotationTaskMachine || '');
    if (currentMachine !== 'MSKC03' && currentMachine !== 'MSKC04') return false;
    const date = String(card.dataset.rotationTaskDate || '').trim();
    const shift = assignmentShift(card.dataset.rotationTaskShift || '');
    const occupied = new Set();
    document.querySelectorAll('.rotaceShiftTaskCard').forEach((candidate) => {
      if (String(candidate.dataset.rotationTaskDate || '').trim() !== date) return;
      if (assignmentShift(candidate.dataset.rotationTaskShift || '') !== shift) return;
      const machine = assignmentMachine(candidate.dataset.rotationTaskMachine || '');
      if (machine === 'MSKC01' || machine === 'MSKC03' || machine === 'MSKC04') occupied.add(machine);
    });
    return occupied.size === 2 && occupied.has('MSKC03') && occupied.has('MSKC04') && !occupied.has('MSKC01');
  }

  function shouldShareTpkw02FromCard(card) {
    if (!card) return false;
    const machine = assignmentMachine(card.dataset.rotationTaskMachine || '');
    if (machine !== 'TBKR01' && machine !== 'TBKR07') return false;
    const date = String(card.dataset.rotationTaskDate || '').trim();
    const shift = assignmentShift(card.dataset.rotationTaskShift || '');
    let tpkw02Occupied = false;
    let grinderOccupied = false;
    document.querySelectorAll('.rotaceShiftTaskCard').forEach((other) => {
      if (String(other.dataset.rotationTaskDate || '').trim() !== date) return;
      if (assignmentShift(other.dataset.rotationTaskShift || '') !== shift) return;
      const otherMachine = assignmentMachine(other.dataset.rotationTaskMachine || '');
      if (otherMachine === 'TPKW02') tpkw02Occupied = true;
      if (otherMachine === machine) grinderOccupied = true;
    });
    return grinderOccupied && !tpkw02Occupied;
  }

  function openTaskFromCard(card) {
    showRotationTaskModal({
      person: card.dataset.rotationTaskPerson || '',
      date: card.dataset.rotationTaskDate || '',
      shift: card.dataset.rotationTaskShift || '',
      machine: card.dataset.rotationTaskMachine || '',
      sharedMskc01: shouldShareMskc01FromCard(card),
      sharedTpkw02: shouldShareTpkw02FromCard(card)
    });
  }

  function registerTap(card) {
    const now = Date.now();
    if (card !== lastCard || now - lastTapAt > TAP_WINDOW_MS) tapCount = 0;
    lastCard = card;
    lastTapAt = now;
    tapCount += 1;
    if (tapCount < 3) return;
    tapCount = 0;
    openTaskFromCard(card);
  }

  document.addEventListener('click', (event) => {
    const card = event.target && event.target.closest ? event.target.closest('.rotaceShiftTaskCard') : null;
    if (card) registerTap(card);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideRotationTaskModal();
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target && event.target.closest ? event.target.closest('.rotaceShiftTaskCard') : null;
    if (!card) return;
    event.preventDefault();
    registerTap(card);
  });

  window.RAK_ROTATION_MACHINE_TASKS = MACHINE_TASKS;
  window.RAK_ROTATION_MACHINE_SHIFT_TASKS = MACHINE_SHIFT_TASKS;
  window.getRotationMachineTasksForAssignment = getTasksForAssignment;
  window.showRotationTaskModal = showRotationTaskModal;
  window.hideRotationTaskModal = hideRotationTaskModal;
})();
