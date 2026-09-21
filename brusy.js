// RaK 1.2 (1.155) – kalkulačky Brusy.
function renderBrusy() {
  const toggleClass = typeof toggleElementClassIfChanged === "function"
    ? toggleElementClassIfChanged
    : ((el, className, force) => { if (el) el.classList.toggle(className, !!force); });

  document.querySelectorAll("#brusy .bbtn").forEach(b => {
    const isMachine = b.getAttribute("data-machine") === String(app.machine || "");
    const isProg = b.getAttribute("data-prog") === String(app.prog || "");
    const btnKey = "brusyBtn:" + (b.getAttribute("data-machine") || b.getAttribute("data-prog") || "unknown");
    toggleClass(b, "activeMachine", isMachine, btnKey + ":machine");
    toggleClass(b, "activeIndex", isProg, btnKey + ":index");
    toggleClass(b, "activeChoice", isMachine || isProg, btnKey + ":choice");
  });

  const info = document.getElementById("brusyInfo");
  if (info) {
    const cfg = getBrusConfig(app.machine, app.prog);
    const titleText = String(app.machine || "") + " / " + String(cfg.label || "");
    const subText = "Kus: " + formatBrusSeconds(cfg.pieceSec) + " · Orovnává po " + formatCount(cfg.dressEvery) + " ks · Orovnává " + formatBrusDuration(cfg.dressSec);
    const fingerprint = ["brusyInfo", titleText, subText].join("|");

    if (typeof setElementChildrenIfChanged === "function") {
      setElementChildrenIfChanged(info, fingerprint, () => {
        const title = document.createElement("div");
        title.className = "brusyInfoTitle";
        const titleStrong = document.createElement("b");
        titleStrong.textContent = titleText;
        title.appendChild(titleStrong);

        const sub = document.createElement("div");
        sub.className = "brusyInfoSub";
        sub.textContent = subText;

        return [title, sub];
      }, "brusyInfo");
    } else {
      const infoHtml =
        "<div class='brusyInfoTitle'><b>" + escapeHtml(titleText) + "</b></div>" +
        "<div class='brusyInfoSub'>" + escapeHtml(subText) + "</div>";
      if (typeof setElementHtmlIfChanged === "function") {
        setElementHtmlIfChanged(info, infoHtml, "brusyInfo:fallback");
      } else {
        info.textContent = titleText + " · " + subText;
      }
    }
  }
}

function monthKeyFromSheetName(sheetName) {
  const m = /^(\d{2})\.(\d{4})$/.exec(String(sheetName || "").trim());
  if (!m) return null;
  return `${parseInt(m[1], 10)}/${String(parseInt(m[2], 10)).slice(-2)}`;
}

function normalizeShiftText(text) {
  const raw = String(text || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const parts = raw.split(" ");
  const dedup = [];
  for (const part of parts) {
    if (dedup.length === 0 || dedup[dedup.length - 1] !== part) dedup.push(part);
  }
  return dedup.join(" ").trim();
}


function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanDateLabel(rawDate, shift) {
  const date = String(rawDate || "").trim().replace(/\s+/g, " ");
  const sh = String(shift || "").trim();
  if (!date || !sh) return date;
  const re = new RegExp("(?:\\s+" + escapeRegExp(sh) + ")+$");
  return date.replace(re, "").trim();
}

function parseDateToken(token) {
  const m = /^(\d{1,2})\.(\d{1,2})\.\s*(.*)$/.exec(token || "");
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const shift = normalizeShiftText(m[3] || "");
  return {
    day,
    month,
    shift,
    sortDate: new Date(2026, month - 1, day).toISOString()
  };
}

var ABSENCE_LABELS = {
  "D": "Dovolená",
  "NV": "Náhradní volno",
  "Š": "Školení",
  "§": "Paragraf",
  "S": "Senior",
  "L": "Lázně"
};

function absenceLabelFromCode(code) {
  const raw = String(code || "").trim();
  if (!raw) return "";
  const key = raw.toUpperCase();
  if (ABSENCE_LABELS && ABSENCE_LABELS[key]) return ABSENCE_LABELS[key];
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) return "";
  return raw;
}

function absenceReasonShortCode(code, label) {
  const rawCode = String(code || "").trim();
  const rawLabel = String(label || "").trim();
  const raw = rawCode || rawLabel;
  if (!raw) return "";
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const upper = raw.toUpperCase().trim();
  if (upper === "D" || normalized === "dovolena") return "D";
  if (upper === "NV" || normalized === "nahradni volno" || normalized === "nahradni") return "NV";
  if (upper === "N" || normalized === "nemoc" || normalized === "neschopenka" || normalized === "pracovni neschopnost") return "N";
  if (upper === "L" || normalized === "lazne") return "L";
  if (upper === "S" || normalized === "senior") return "S";
  if (upper === "Š" || upper === "Š" || normalized === "skoleni") return "Š";
  if (raw === "§" || normalized === "paragraf") return "§";
  if (rawCode && rawCode.length <= 3) return rawCode.toUpperCase();
  const byLabel = Object.entries(ABSENCE_LABELS || {}).find(([, value]) => {
    const clean = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return clean === normalized;
  });
  if (byLabel) return byLabel[0];
  return raw.length <= 3 ? raw.toUpperCase() : raw.slice(0, 3).toUpperCase();
}

function sanitizeAbsencePersonName(text) {
  return String(text || "")
    .trim()
    .replace(/\s+(?:od|do)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitAbsencePeople(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  return raw
    .replace(/\s+(?:a|i|&|\/)\s+/gi, " | ")
    .replace(/[,;+]/g, " | ")
    .split(/\s*\|\s*/g)
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !/^od\s+\d/i.test(part));
}

function looksLikeAbsencePerson(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/\d/.test(t)) return false;
  if (/\bdo\b/i.test(t)) return false;
  if (/[:/]/.test(t)) return false;
  return true;
}

function normalizeNoteEntry(note) {
  const date = String(note && note.date ? note.date : "").trim();
  const shiftFromDate = parseDateToken(date);
  let shift = normalizeShiftText(String(note && note.shift ? note.shift : (shiftFromDate ? shiftFromDate.shift : "")) || "");
  let person = sanitizeAbsencePersonName(note && note.person ? note.person : "");
  let code = String(note && note.code ? note.code : "").trim();
  let text = String(note && note.text ? note.text : "").trim();
  let people = [];

  if (!person && text) {
    const tokens = text.split(/\s+/).filter(Boolean);
    let start = 0;

    // ignore leading date token from the notes column text, e.g. "29.4. R Špadrna D"
    if (tokens[start] && /^\d{1,2}\.\d{1,2}\.$/.test(tokens[start])) {
      start += 1;
    }

    // ignore / capture an explicit shift token if it is part of the note text
    if (tokens[start] && /^(?:N8|R8|N|R)$/i.test(tokens[start])) {
      if (!shift) shift = normalizeShiftText(tokens[start].toUpperCase());
      start += 1;
    }

    const remaining = tokens.slice(start);

    if (remaining.length >= 2 && absenceLabelFromCode(remaining[remaining.length - 1])) {
      code = code || remaining[remaining.length - 1];
      const peopleText = remaining.slice(0, -1).join(" ").trim();
      people = splitAbsencePeople(peopleText).map(sanitizeAbsencePersonName).filter(Boolean);
      person = sanitizeAbsencePersonName(people[0] || peopleText);
    } else if (remaining.length === 1 && !absenceLabelFromCode(remaining[0])) {
      person = sanitizeAbsencePersonName(remaining[0]);
    } else if (remaining.length > 1 && !code && looksLikeAbsencePerson(remaining[0])) {
      // fallback: "Jméno" without an explicit code means vacation
      person = sanitizeAbsencePersonName(remaining[0]);
      code = "D";
    }
  }

  person = sanitizeAbsencePersonName(person);

  if (!code && person) {
    code = "D";
  }

  const label = absenceLabelFromCode(code);
  if (!people.length && person) people = splitAbsencePeople(person).map(sanitizeAbsencePersonName).filter(Boolean);
  if (!people.length && person) people = [person];
  const isAbsence = !!label && !!person;

  return {
    date,
    shift,
    person,
    people,
    code,
    label,
    isAbsence,
    text
  };
}


// RAK_ROTATION_NAMES_ACTIVE_ROSTER_17007
function buildNameIndex(rotation) {
  const map = new Map();
  const knownNames = getKnownStatNames();
  knownNames.forEach((name) => { if (name) map.set(name, []); });
  Object.entries(rotation.months || {}).forEach(([monthKey, month]) => {
    ["hard", "soft"].forEach(section => {
      const sec = month[section];
      if (!sec || !sec.rows) return;
      sec.rows.forEach(row => {
        const parsed = parseDateToken(row.date);
        if (!parsed) return;
        (row.cells || []).forEach((cell, idx) => {
          const name = (cell || "").trim();
          if (!name || !knownNames.has(name)) return;
          if (!map.has(name)) map.set(name, []);
          const machine = (sec.machines && sec.machines[idx]) ? sec.machines[idx] : "";
          map.get(name).push({
            monthKey,
            section,
            date: row.date,
            dateLabel: cleanDateLabel(row.date, parsed.shift),
            shift: parsed.shift,
            machine,
            sortDate: makeSortDateFromMonthKey(monthKey, parsed.day, parsed.month)
          });
        });
      });
    });

    (month.notes || []).forEach(note => {
      const n = normalizeNoteEntry(note);
      if (!n.isAbsence || !n.people || !n.people.length) return;
      const parsed = parseDateToken(n.date);
      const shift = n.shift || (parsed ? parsed.shift : "");
      n.people.forEach(personName => {
        const name = String(personName || "").trim();
        if (!name || !knownNames.has(name)) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push({
          monthKey,
          section: "notes",
          date: n.date,
          dateLabel: cleanDateLabel(n.date, shift),
          shift,
          machine: n.label || "Dovolená",
          absence: true,
          sortDate: parsed ? makeSortDateFromMonthKey(monthKey, parsed.day, parsed.month) : new Date(2026, 0, 1).toISOString()
        });
      });
    });
  });
  const result = {};
  [...map.keys()].sort((a, b) => a.localeCompare(b, "cs")).forEach(name => {
    result[name] = map.get(name).sort((a, b) => a.sortDate.localeCompare(b.sortDate));
  });
  return result;
}

function getKnownStatNames() {
  try {
    if (typeof getActiveWorkerNames === 'function') return getActiveWorkerNames();
  } catch (err) {}
  return KNOWN_STAT_NAMES;
}



function formatAbsenceNoteLine(note) {
  const n = normalizeNoteEntry(note);
  if (!n.isAbsence) return "";
  const people = (n.people && n.people.length)
    ? n.people.join(" a ")
    : (n.person || "");
  const code = n.code ? " " + n.code : "";
  return [n.date, people, n.label && !people ? n.label : ""].filter(Boolean).join(" ");
}



window.parseDateToken = parseDateToken;
window.normalizeNoteEntry = normalizeNoteEntry;
window.normalizeShiftText = normalizeShiftText;
window.sanitizeAbsencePersonName = sanitizeAbsencePersonName;
window.absenceLabelFromCode = absenceLabelFromCode;
window.absenceReasonShortCode = absenceReasonShortCode;
window.splitAbsencePeople = splitAbsencePeople;
window.getKnownStatNames = getKnownStatNames;
