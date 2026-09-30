// Shared Rotation name/schedule index.
// Kept outside calculator modules so Rotace and Dashboard never depend on Brusy loading order.
// RAK_17082_ROTATION_INDEX_SHARED
(function installRakRotationNameIndex(root) {
  function getKnownStatNames() {
    try {
      if (typeof getActiveWorkerNames === 'function') return getActiveWorkerNames();
    } catch (_) {}
    try {
      if (typeof KNOWN_STAT_NAMES !== 'undefined' && KNOWN_STAT_NAMES) return KNOWN_STAT_NAMES;
    } catch (_) {}
    return new Set();
  }

  function parseRotationDateToken(value) {
    if (typeof parseDateToken === 'function') {
      try { return parseDateToken(value); } catch (_) {}
    }
    const match = /^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/.exec(String(value || ''));
    if (!match) return null;
    return { day: parseInt(match[1], 10), month: parseInt(match[2], 10), shift: String(match[3] || '').trim() };
  }

  function normalizeRotationNote(note) {
    if (typeof normalizeNoteEntry === 'function') {
      try { return normalizeNoteEntry(note); } catch (_) {}
    }
    const value = note && typeof note === 'object' ? note : {};
    const person = String(value.person || '').trim();
    const people = Array.isArray(value.people)
      ? value.people.map(item => String(item || '').trim()).filter(Boolean)
      : (person ? [person] : []);
    const code = String(value.code || '').trim();
    const label = String(value.label || code || '').trim();
    return {
      date: String(value.date || '').trim(),
      shift: String(value.shift || '').trim(),
      person,
      people,
      code,
      label,
      isAbsence: !!(people.length && label)
    };
  }

  function cleanRotationDateLabel(rawDate, shift) {
    let date = String(rawDate || '').trim().replace(/\s+/g, ' ');
    const suffix = String(shift || '').trim();
    if (!date || !suffix) return date;
    while (date.endsWith(' ' + suffix)) date = date.slice(0, -(suffix.length + 1)).trim();
    return date;
  }

  function rotationSortDate(monthKey, parsed) {
    if (typeof makeSortDateFromMonthKey === 'function' && parsed) {
      try { return makeSortDateFromMonthKey(monthKey, parsed.day, parsed.month); } catch (_) {}
    }
    const monthMatch = /^(\d{1,2})\/(\d{2})$/.exec(String(monthKey || ''));
    if (!monthMatch || !parsed) return new Date(2026, 0, 1).toISOString();
    return new Date(
      2000 + Number(monthMatch[2]),
      Math.max(0, Number(parsed.month || monthMatch[1]) - 1),
      Number(parsed.day || 1),
      0, 0, 0, 0
    ).toISOString();
  }

  function buildNameIndex(rotation) {
    const map = new Map();
    const knownNames = getKnownStatNames();
    knownNames.forEach(name => { if (name) map.set(name, []); });

    Object.entries((rotation && rotation.months) || {}).forEach(([monthKey, month]) => {
      ['hard', 'soft'].forEach(section => {
        const sec = month && month[section];
        if (!sec || !Array.isArray(sec.rows)) return;
        sec.rows.forEach(row => {
          const parsed = parseRotationDateToken(row && row.date);
          if (!parsed) return;
          (row.cells || []).forEach((cell, idx) => {
            const name = String(cell || '').trim();
            if (!name || !knownNames.has(name)) return;
            if (!map.has(name)) map.set(name, []);
            const machine = (sec.machines && sec.machines[idx]) ? sec.machines[idx] : '';
            map.get(name).push({
              monthKey,
              section,
              date: row.date,
              dateLabel: cleanRotationDateLabel(row.date, parsed.shift),
              shift: parsed.shift,
              machine,
              sortDate: rotationSortDate(monthKey, parsed)
            });
          });
        });
      });

      (Array.isArray(month && month.dayMods) ? month.dayMods : []).forEach(mod => {
        if (!mod || String(mod.type || '').trim() !== 'kalirnaOut') return;
        const name = String(mod.person || '').trim();
        if (!name || !knownNames.has(name)) return;
        const parsed = parseRotationDateToken(mod.date);
        if (!parsed) return;
        if (!map.has(name)) map.set(name, []);
        const existingWorkEntry = map.get(name).some((entry) => entry
          && entry.monthKey === monthKey
          && String(entry.date || '').trim() === String(mod.date || '').trim()
          && !entry.absence);
        if (existingWorkEntry) return; // legacy dayMod: runtime override changes the existing machine entry to Kalírna.
        map.get(name).push({
          monthKey,
          section: 'dayMods',
          date: String(mod.date || '').trim(),
          dateLabel: cleanRotationDateLabel(mod.date, parsed.shift),
          shift: parsed.shift,
          machine: 'Kalírna',
          target: 'Kalírna',
          kalirnaOut: true,
          sortDate: rotationSortDate(monthKey, parsed)
        });
      });

      (Array.isArray(month && month.notes) ? month.notes : []).forEach(note => {
        const normalized = normalizeRotationNote(note);
        if (!normalized.isAbsence || !normalized.people || !normalized.people.length) return;
        const parsed = parseRotationDateToken(normalized.date);
        const shift = normalized.shift || (parsed ? parsed.shift : '');
        normalized.people.forEach(personName => {
          const name = String(personName || '').trim();
          if (!name || !knownNames.has(name)) return;
          if (!map.has(name)) map.set(name, []);
          map.get(name).push({
            monthKey,
            section: 'notes',
            date: normalized.date,
            dateLabel: cleanRotationDateLabel(normalized.date, shift),
            shift,
            machine: normalized.label || 'Dovolená',
            absence: true,
            sortDate: rotationSortDate(monthKey, parsed)
          });
        });
      });
    });

    const result = {};
    [...map.keys()].sort((a, b) => a.localeCompare(b, 'cs')).forEach(name => {
      result[name] = map.get(name).sort((a, b) => a.sortDate.localeCompare(b.sortDate));
    });
    return result;
  }

  root.getKnownStatNames = getKnownStatNames;
  root.buildNameIndex = buildNameIndex;
})(typeof window !== 'undefined' ? window : globalThis);
