// RaK 1.2 (1.155) – theme, pozadí a profilové UI nastavení.

const RAK_THEME_STORAGE_KEY = APP_KEY + ':theme_v1';
const RAK_THEME_BASE_VARS = {
  '--bg': '#0b0f0c',
  '--panel': '#151a17',
  '--panel2': '#1c1f1d',
  '--green': '#4CAF50',
  '--green2': '#7CFF7C',
  '--text': '#ffffff',
  '--muted': '#777',
  '--soft': '#ccc'
};
const RAK_LEGACY_THEME_DEFS = [
  {
    "id": "default",
    "label": "Zelená",
    "subtitle": "Výchozí zelený vzhled",
    "color": "#7CFF7C",
    "vars": {
      "--bg": "#07100b", "--panel": "rgba(18,28,22,.72)", "--panel2": "rgba(24,36,28,.68)",
      "--green": "#4ADE80", "--green2": "#B7FFBE", "--muted": "#91a396", "--soft": "#e5f7e9",
      "--rakThemeGlow": "rgba(124,255,124,.30)", "--rakThemeBorder": "rgba(124,255,124,.20)"
    }
  },
  {
    "id": "light-brown",
    "label": "Světlá",
    "subtitle": "Světlé pozadí s modrým akcentem",
    "color": "#2563EB",
    "vars": {
      "--bg": "#f7fbff", "--panel": "rgba(255,255,255,.90)", "--panel2": "rgba(232,241,255,.86)",
      "--green": "#2563EB", "--green2": "#60A5FA", "--text": "#0F2E5F", "--muted": "#486A98", "--soft": "#08275A",
      "--rakThemeGlow": "rgba(37,99,235,.20)", "--rakThemeBorder": "rgba(37,99,235,.34)",
      "--rakThemeAccentStrong": "#2563EB", "--rakThemeAccentSoft": "#93C5FD"
    }
  },
  {
    "id": "midnight-blue",
    "label": "Modrá",
    "subtitle": "Tmavě modrý kontrast",
    "color": "#38BDF8",
    "vars": {
      "--bg": "#020617", "--panel": "rgba(9,22,49,.78)", "--panel2": "rgba(18,39,82,.68)",
      "--green": "#38BDF8", "--green2": "#BAE6FD", "--muted": "#90a9c4", "--soft": "#e8f5ff",
      "--rakThemeGlow": "rgba(56,189,248,.38)", "--rakThemeBorder": "rgba(56,189,248,.28)"
    }
  },
  {
    "id": "graphite",
    "label": "Grafitová",
    "subtitle": "Neutrální šedý dark mód",
    "color": "#CBD5E1",
    "vars": {
      "--bg": "#05070a", "--panel": "rgba(17,24,39,.78)", "--panel2": "rgba(31,41,55,.66)",
      "--green": "#CBD5E1", "--green2": "#F8FAFC", "--muted": "#a7b0bd", "--soft": "#edf2f7",
      "--rakThemeGlow": "rgba(203,213,225,.28)", "--rakThemeBorder": "rgba(203,213,225,.22)"
    }
  },
  {
    "id": "sunset-plasma",
    "label": "Oranžová",
    "subtitle": "Teplý oranžový akcent",
    "color": "#FB923C",
    "vars": {
      "--bg": "#17090a", "--panel": "rgba(65,28,18,.76)", "--panel2": "rgba(92,38,24,.64)",
      "--green": "#FB923C", "--green2": "#FED7AA", "--muted": "#c7a28f", "--soft": "#fff4e8",
      "--rakThemeGlow": "rgba(251,146,60,.40)", "--rakThemeBorder": "rgba(251,146,60,.30)"
    }
  },
  {
    "id": "violet-pulse",
    "label": "Fialová",
    "subtitle": "Fialový akcent",
    "color": "#D946EF",
    "vars": {
      "--bg": "#12061b", "--panel": "rgba(45,16,65,.78)", "--panel2": "rgba(72,23,96,.66)",
      "--green": "#D946EF", "--green2": "#F5D0FE", "--muted": "#c39acb", "--soft": "#faeaff",
      "--rakThemeGlow": "rgba(217,70,239,.40)", "--rakThemeBorder": "rgba(217,70,239,.30)"
    }
  }
];
window.RAK_LEGACY_THEME_DEFS = RAK_LEGACY_THEME_DEFS;

const RAK_BACKGROUND_STORAGE_KEY = APP_KEY + ':background_v1';
const RAK_BACKGROUND_BASE_VARS = {
  '--rakBgBase': '#050816',
  '--rakAppBackground': 'radial-gradient(circle at 16% 10%, rgba(56,189,248,.24), transparent 32%), radial-gradient(circle at 84% 18%, rgba(168,85,247,.20), transparent 35%), radial-gradient(circle at 52% 86%, rgba(20,184,166,.16), transparent 38%), linear-gradient(160deg, #050816 0%, #08111f 46%, #0f172a 100%)',
  '--rakAppBackgroundOverlay': 'linear-gradient(90deg, rgba(4,8,18,.40), transparent 26%, rgba(255,255,255,.035) 50%, transparent 74%, rgba(4,8,18,.40)), radial-gradient(circle at 48% 44%, rgba(255,255,255,.055), transparent 44%)',
  '--rakAppBackgroundLite': 'linear-gradient(160deg, #050816 0%, #08111f 52%, #0f172a 100%)',
  '--rakBgAccent': 'rgba(56,189,248,.24)'
};
const RAK_LEGACY_BACKGROUND_DEFS = [
  {
    "id": "ios-mesh",
    "label": "Tmavé sklo",
    "subtitle": "Tmavé modro-fialové pozadí pro glass",
    "color": "#38bdf8",
    "swatch": "radial-gradient(circle at 18% 18%, rgba(56,189,248,.95), transparent 34%), radial-gradient(circle at 82% 22%, rgba(168,85,247,.80), transparent 36%), radial-gradient(circle at 48% 82%, rgba(20,184,166,.70), transparent 40%), linear-gradient(145deg, #050816, #0f172a)",
    "vars": {
      "--rakBgBase": "#050816",
      "--rakAppBackground": "radial-gradient(circle at 15% 10%, rgba(56,189,248,.24), transparent 32%), radial-gradient(circle at 84% 17%, rgba(168,85,247,.20), transparent 34%), radial-gradient(circle at 52% 86%, rgba(20,184,166,.16), transparent 38%), linear-gradient(160deg, #050816 0%, #08111f 45%, #0f172a 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(4,8,18,.42), transparent 25%, rgba(255,255,255,.035) 50%, transparent 75%, rgba(4,8,18,.42)), radial-gradient(circle at 46% 42%, rgba(255,255,255,.055), transparent 46%)",
      "--rakAppBackgroundLite": "linear-gradient(160deg, #050816 0%, #08111f 52%, #0f172a 100%)",
      "--rakBgAccent": "rgba(56,189,248,.24)"
    }
  },
  {
    "id": "skoda-green",
    "label": "Škoda zelená",
    "subtitle": "Zelený glass v barvách Škoda",
    "color": "#78FAAE",
    "swatch": "radial-gradient(circle at 18% 18%, rgba(120,250,174,.95), transparent 34%), radial-gradient(circle at 78% 18%, rgba(14,58,47,.96), transparent 42%), radial-gradient(circle at 55% 86%, rgba(63,215,142,.72), transparent 42%), linear-gradient(145deg, #04100d, #0E3A2F)",
    "vars": {
      "--rakBgBase": "#04100d",
      "--rakAppBackground": "radial-gradient(circle at 14% 12%, rgba(120,250,174,.26), transparent 32%), radial-gradient(circle at 86% 18%, rgba(14,58,47,.72), transparent 38%), radial-gradient(circle at 55% 86%, rgba(38,208,132,.18), transparent 42%), linear-gradient(160deg, #030a08 0%, #082019 48%, #0E3A2F 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(3,10,8,.48), transparent 26%, rgba(120,250,174,.040) 50%, transparent 74%, rgba(3,10,8,.48)), radial-gradient(circle at 48% 42%, rgba(120,250,174,.070), transparent 46%)",
      "--rakAppBackgroundLite": "linear-gradient(160deg, #030a08 0%, #082019 55%, #0E3A2F 100%)",
      "--rakBgAccent": "rgba(120,250,174,.26)", "--green": "#78FAAE", "--green2": "#B9FFD6"
    }
  },
  {
    "id": "deep-aurora",
    "label": "Modré sklo",
    "subtitle": "Tyrkysovo-modré pozadí",
    "color": "#22d3ee",
    "swatch": "radial-gradient(circle at 20% 18%, rgba(34,211,238,.90), transparent 34%), radial-gradient(circle at 80% 20%, rgba(37,99,235,.80), transparent 38%), radial-gradient(circle at 52% 86%, rgba(14,165,233,.58), transparent 42%), linear-gradient(145deg, #03121d, #061826)",
    "vars": {
      "--rakBgBase": "#03121d",
      "--rakAppBackground": "radial-gradient(circle at 16% 12%, rgba(34,211,238,.22), transparent 32%), radial-gradient(circle at 86% 18%, rgba(37,99,235,.22), transparent 36%), radial-gradient(circle at 52% 86%, rgba(14,165,233,.15), transparent 42%), linear-gradient(160deg, #020912 0%, #061826 48%, #0b1326 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(2,9,18,.46), transparent 26%, rgba(34,211,238,.035) 50%, transparent 74%, rgba(2,9,18,.46)), radial-gradient(circle at 45% 42%, rgba(255,255,255,.045), transparent 46%)",
      "--rakAppBackgroundLite": "linear-gradient(160deg, #020912 0%, #061826 55%, #0b1326 100%)",
      "--rakBgAccent": "rgba(34,211,238,.22)"
    }
  },
  {
    "id": "sunset-plasma",
    "label": "Teplé sklo",
    "subtitle": "Oranžovo-růžové pozadí",
    "color": "#fb7185",
    "swatch": "radial-gradient(circle at 16% 18%, rgba(251,113,133,.96), transparent 34%), radial-gradient(circle at 82% 20%, rgba(251,146,60,.88), transparent 38%), radial-gradient(circle at 50% 86%, rgba(168,85,247,.62), transparent 42%), linear-gradient(145deg, #17050c, #431407)",
    "vars": {
      "--rakBgBase": "#17050c",
      "--rakAppBackground": "radial-gradient(circle at 13% 11%, rgba(251,113,133,.30), transparent 32%), radial-gradient(circle at 86% 19%, rgba(251,146,60,.25), transparent 37%), radial-gradient(circle at 50% 86%, rgba(168,85,247,.16), transparent 42%), linear-gradient(160deg, #10030a 0%, #2a0714 48%, #431407 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(16,3,10,.50), transparent 25%, rgba(251,146,60,.062) 50%, transparent 75%, rgba(16,3,10,.50)), radial-gradient(circle at 47% 42%, rgba(255,255,255,.070), transparent 46%)",
      "--rakAppBackgroundLite": "linear-gradient(160deg, #10030a 0%, #2a0714 55%, #431407 100%)",
      "--rakBgAccent": "rgba(251,113,133,.30)", "--green": "#fb7185", "--green2": "#fecdd3"
    }
  },
  {
    "id": "light-zigzag",
    "label": "Světlé",
    "subtitle": "Světlé pozadí s jemným vzorem",
    "color": "#6B3F22",
    "swatch": "linear-gradient(135deg, rgba(107,63,34,.18) 25%, transparent 25%) -8px 0/16px 16px, linear-gradient(225deg, rgba(107,63,34,.14) 25%, transparent 25%) -8px 0/16px 16px, linear-gradient(315deg, rgba(107,63,34,.10) 25%, transparent 25%) 0 0/16px 16px, linear-gradient(45deg, rgba(107,63,34,.10) 25%, #fffdf8 25%) 0 0/16px 16px",
    "vars": {
      "--rakBgBase": "#f8f3eb",
      "--rakAppBackground": "linear-gradient(135deg, rgba(107,63,34,.10) 25%, transparent 25%) -12px 0/24px 24px, linear-gradient(225deg, rgba(107,63,34,.08) 25%, transparent 25%) -12px 0/24px 24px, linear-gradient(315deg, rgba(107,63,34,.065) 25%, transparent 25%) 0 0/24px 24px, linear-gradient(45deg, rgba(107,63,34,.065) 25%, transparent 25%) 0 0/24px 24px, linear-gradient(180deg, #fffefa 0%, #f8f3eb 56%, #efe3d2 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(255,255,255,.70), transparent 24%, rgba(107,63,34,.035) 50%, transparent 76%, rgba(255,255,255,.70)), radial-gradient(circle at 48% 42%, rgba(255,255,255,.48), transparent 46%)",
      "--rakAppBackgroundLite": "linear-gradient(180deg, #fffefa 0%, #f8f3eb 60%, #efe3d2 100%)",
      "--rakBgAccent": "rgba(107,63,34,.18)", "--green": "#6B3F22", "--green2": "#8B5E34"
    }
  },
  {
    "id": "amoled-grid",
    "label": "AMOLED mřížka",
    "subtitle": "Černé pozadí šetřící OLED displej",
    "color": "#38BDF8",
    "swatch": "repeating-linear-gradient(0deg, rgba(56,189,248,.24) 0 1px, transparent 1px 11px), repeating-linear-gradient(90deg, rgba(56,189,248,.18) 0 1px, transparent 1px 11px), linear-gradient(180deg, #000000 0%, #04070c 100%)",
    "vars": {
      "--rakBgBase": "#000000",
      "--rakAppBackground": "repeating-linear-gradient(0deg, rgba(56,189,248,.095) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, rgba(56,189,248,.070) 0 1px, transparent 1px 16px), radial-gradient(circle at 84% 16%, rgba(59,130,246,.12), transparent 24%), linear-gradient(180deg, #000000 0%, #04070c 58%, #0a1019 100%)",
      "--rakAppBackgroundOverlay": "linear-gradient(90deg, rgba(0,0,0,.72), transparent 24%, rgba(56,189,248,.030) 50%, transparent 76%, rgba(0,0,0,.72))",
      "--rakAppBackgroundLite": "linear-gradient(180deg, #000000 0%, #04070c 62%, #0a1019 100%)",
      "--rakBgAccent": "rgba(56,189,248,.24)", "--green": "#38BDF8", "--green2": "#93C5FD"
    }
  }
];

window.RAK_LEGACY_BACKGROUND_DEFS = RAK_LEGACY_BACKGROUND_DEFS;

// Jednotný vzhled vždy obsahuje paletu, karty i pozadí. Staré samostatné volby
// zůstávají pouze v legacy mapě, aby se uživatelům bezpečně převedlo nastavení.
const RAK_DEFAULT_APPEARANCE_ID = 'obsidian';
const RAK_APPEARANCE_DEFS = [
  { id:'atlantic', label:'Modro-fialový', subtitle:'Podoba původního návrhu: tyrkys, indigo, fialová a limetka', color:'#A8FF62', swatch:'radial-gradient(circle at 16% 16%,#10d9c5,transparent 35%),radial-gradient(circle at 84% 18%,#b336d6,transparent 42%),linear-gradient(145deg,#063d5e,#1a1758 55%,#5f126d)', themeVars:{'--bg':'#071841','--panel':'rgba(18,33,89,.76)','--panel2':'rgba(61,27,110,.64)','--green':'#A8FF62','--green2':'#E1FFC9','--text':'#D8FFF4','--muted':'#A4C8FF','--soft':'#E5FFF8','--rakThemeAccentStrong':'#A8FF62','--rakThemeAccentSoft':'rgba(168,255,98,.25)','--rakThemeGlow':'rgba(168,255,98,.34)','--rakThemeBorder':'rgba(168,228,255,.34)'}, bgVars:{'--rakBgBase':'#061437','--rakAppBackground':'radial-gradient(circle at 7% 12%,rgba(0,220,200,.50),transparent 32%),radial-gradient(circle at 57% 17%,rgba(52,87,255,.35),transparent 34%),radial-gradient(circle at 96% 22%,rgba(208,45,225,.52),transparent 42%),linear-gradient(155deg,#063650 0%,#1a1b65 48%,#641068 100%)','--rakAppBackgroundOverlay':'linear-gradient(90deg,rgba(2,7,39,.27),transparent 31%,rgba(161,197,255,.09) 53%,transparent 74%,rgba(47,3,75,.27))','--rakAppBackgroundLite':'linear-gradient(155deg,#073c59,#1c1b68 52%,#68116d)','--rakBgAccent':'rgba(0,220,200,.40)'} },
  { id:'graphite', label:'Neonový orbit', subtitle:'Elektrická modř, neonová růžová a zářivě žlutý text', color:'#F5FF53', swatch:'radial-gradient(circle at 18% 18%,#2167ff,transparent 36%),radial-gradient(circle at 84% 22%,#f02dca,transparent 42%),linear-gradient(145deg,#0b103b,#4a124b)', themeVars:{'--bg':'#0a0d31','--panel':'rgba(25,23,82,.76)','--panel2':'rgba(88,21,91,.64)','--green':'#F5FF53','--green2':'#FFFFBF','--text':'#FFF36A','--muted':'#F1C8FF','--soft':'#FFF9BD','--rakThemeAccentStrong':'#F5FF53','--rakThemeAccentSoft':'rgba(245,255,83,.24)','--rakThemeGlow':'rgba(240,45,202,.34)','--rakThemeBorder':'rgba(112,150,255,.40)'}, bgVars:{'--rakBgBase':'#090b2d','--rakAppBackground':'radial-gradient(circle at 10% 7%,rgba(38,105,255,.62),transparent 34%),radial-gradient(circle at 90% 18%,rgba(247,42,202,.57),transparent 39%),radial-gradient(circle at 54% 90%,rgba(118,37,255,.37),transparent 39%),linear-gradient(155deg,#0a0c31,#29145c 50%,#59114f)','--rakAppBackgroundOverlay':'linear-gradient(135deg,rgba(255,255,255,.08),transparent 38%,rgba(16,5,49,.31) 75%)','--rakAppBackgroundLite':'linear-gradient(155deg,#0b0e38,#2c1662 55%,#5d1255)','--rakBgAccent':'rgba(245,255,83,.35)'} },
  { id:'petrol', label:'Tyrkysový signál', subtitle:'Sytý cyan, hluboká modř a jasně mátové písmo', color:'#58FFD5', swatch:'radial-gradient(circle at 20% 15%,#00e6d2,transparent 38%),radial-gradient(circle at 82% 20%,#1671ee,transparent 42%),linear-gradient(145deg,#004b67,#092a6f)', themeVars:{'--bg':'#03274d','--panel':'rgba(1,66,105,.77)','--panel2':'rgba(11,50,126,.66)','--green':'#58FFD5','--green2':'#C5FFF1','--text':'#86FFE5','--muted':'#A5F4FF','--soft':'#D2FFF5','--rakThemeAccentStrong':'#58FFD5','--rakThemeAccentSoft':'rgba(88,255,213,.25)','--rakThemeGlow':'rgba(0,230,210,.36)','--rakThemeBorder':'rgba(92,243,255,.40)'}, bgVars:{'--rakBgBase':'#002b50','--rakAppBackground':'radial-gradient(circle at 12% 14%,rgba(0,237,207,.58),transparent 34%),radial-gradient(circle at 91% 18%,rgba(36,96,255,.54),transparent 41%),radial-gradient(circle at 43% 89%,rgba(0,128,183,.44),transparent 42%),linear-gradient(158deg,#005168,#063279 53%,#071446)','--rakAppBackgroundOverlay':'repeating-radial-gradient(circle at 16% 8%,rgba(184,255,250,.10) 0 1px,transparent 1px 13px)','--rakAppBackgroundLite':'linear-gradient(158deg,#005c6c,#083a83 53%,#08184f)','--rakBgAccent':'rgba(0,237,207,.39)'} },
  { id:'copper', label:'Žhavá měď', subtitle:'Červená, jantarová a fuchsiová se světle broskvovým písmem', color:'#FFD05D', swatch:'radial-gradient(circle at 17% 18%,#ff8537,transparent 37%),radial-gradient(circle at 85% 18%,#ed2879,transparent 42%),linear-gradient(145deg,#5b1720,#76253c)', themeVars:{'--bg':'#411025','--panel':'rgba(92,23,46,.77)','--panel2':'rgba(126,47,32,.66)','--green':'#FFD05D','--green2':'#FFF0B0','--text':'#FFC8A5','--muted':'#FFAEBA','--soft':'#FFE0C7','--rakThemeAccentStrong':'#FFD05D','--rakThemeAccentSoft':'rgba(255,208,93,.26)','--rakThemeGlow':'rgba(255,92,57,.38)','--rakThemeBorder':'rgba(255,173,113,.42)'}, bgVars:{'--rakBgBase':'#441024','--rakAppBackground':'radial-gradient(circle at 8% 14%,rgba(255,109,43,.61),transparent 34%),radial-gradient(circle at 92% 15%,rgba(245,31,133,.55),transparent 40%),radial-gradient(circle at 58% 94%,rgba(194,37,27,.37),transparent 40%),linear-gradient(155deg,#671625,#741d3d 50%,#401025)','--rakAppBackgroundOverlay':'linear-gradient(90deg,rgba(75,4,18,.25),transparent 38%,rgba(255,218,138,.10) 56%,transparent 70%,rgba(58,4,25,.26))','--rakAppBackgroundLite':'linear-gradient(155deg,#751827,#7d2045 54%,#471127)','--rakBgAccent':'rgba(255,191,53,.38)'} },
  { id:'obsidian', label:'Noční laser', subtitle:'Černý OLED základ, elektrická zelená, cyan a modrý text', color:'#8DFF55', swatch:'radial-gradient(circle at 17% 18%,#7dff3e,transparent 35%),radial-gradient(circle at 84% 18%,#00b8ff,transparent 40%),linear-gradient(145deg,#001d24,#07162e)', themeVars:{'--bg':'#010b13','--panel':'rgba(2,26,35,.80)','--panel2':'rgba(5,43,58,.68)','--green':'#8DFF55','--green2':'#D3FFC2','--text':'#9FEFFF','--muted':'#82C9FF','--soft':'#D6FAFF','--rakThemeAccentStrong':'#8DFF55','--rakThemeAccentSoft':'rgba(141,255,85,.24)','--rakThemeGlow':'rgba(0,207,255,.35)','--rakThemeBorder':'rgba(64,221,255,.37)'}, bgVars:{'--rakBgBase':'#000a0f','--rakAppBackground':'radial-gradient(circle at 10% 12%,rgba(95,255,44,.39),transparent 29%),radial-gradient(circle at 90% 17%,rgba(0,175,255,.49),transparent 36%),radial-gradient(circle at 52% 91%,rgba(0,112,158,.31),transparent 40%),linear-gradient(165deg,#001218,#011623 55%,#000709)','--rakAppBackgroundOverlay':'repeating-linear-gradient(0deg,rgba(144,255,224,.08) 0 1px,transparent 1px 18px)','--rakAppBackgroundLite':'linear-gradient(165deg,#00171d,#022035 55%,#00090d)','--rakBgAccent':'rgba(141,255,85,.31)'} },
  { id:'glacier', label:'Ledovec', subtitle:'Ledová modř, stříbro a jasný cyanový akcent', color:'#4EE8FF', swatch:'radial-gradient(circle at 16% 16%,#83efff,transparent 37%),radial-gradient(circle at 84% 18%,#8099ff,transparent 42%),linear-gradient(145deg,#123f5e,#1c2760)', themeVars:{'--bg':'#102c4d','--panel':'rgba(27,71,112,.76)','--panel2':'rgba(56,84,144,.64)','--green':'#4EE8FF','--green2':'#D2FBFF','--text':'#C7E9FF','--muted':'#A9C8EE','--soft':'#ECFAFF','--rakThemeAccentStrong':'#4EE8FF','--rakThemeAccentSoft':'rgba(78,232,255,.24)','--rakThemeGlow':'rgba(122,218,255,.37)','--rakThemeBorder':'rgba(166,231,255,.44)'}, bgVars:{'--rakBgBase':'#102d4d','--rakAppBackground':'radial-gradient(circle at 8% 12%,rgba(103,238,255,.58),transparent 34%),radial-gradient(circle at 92% 18%,rgba(103,126,255,.50),transparent 39%),radial-gradient(circle at 47% 92%,rgba(205,237,255,.24),transparent 40%),linear-gradient(155deg,#155377,#213b7b 52%,#1b2453)','--rakAppBackgroundOverlay':'linear-gradient(135deg,rgba(255,255,255,.16),transparent 42%,rgba(0,22,62,.20))','--rakAppBackgroundLite':'linear-gradient(155deg,#1a6388,#294b8e 52%,#232b61)','--rakBgAccent':'rgba(78,232,255,.38)'} },
  { id:'forest', label:'Lesní proud', subtitle:'Hluboká zelená, mech a svítivý limetkový akcent', color:'#BEFF4B', swatch:'radial-gradient(circle at 17% 18%,#26d86a,transparent 36%),radial-gradient(circle at 84% 18%,#9acb32,transparent 40%),linear-gradient(145deg,#093b2a,#143d1e)', themeVars:{'--bg':'#082c20','--panel':'rgba(13,67,43,.78)','--panel2':'rgba(38,89,36,.65)','--green':'#BEFF4B','--green2':'#E8FFC4','--text':'#C9FFC4','--muted':'#A8DFA0','--soft':'#E2FFDA','--rakThemeAccentStrong':'#BEFF4B','--rakThemeAccentSoft':'rgba(190,255,75,.24)','--rakThemeGlow':'rgba(60,221,97,.36)','--rakThemeBorder':'rgba(146,249,119,.39)'}, bgVars:{'--rakBgBase':'#082d1e','--rakAppBackground':'radial-gradient(circle at 9% 11%,rgba(21,211,108,.55),transparent 33%),radial-gradient(circle at 92% 18%,rgba(155,211,48,.48),transparent 41%),radial-gradient(circle at 50% 91%,rgba(0,104,78,.40),transparent 42%),linear-gradient(155deg,#0a5038,#0e4b25 50%,#163616)','--rakAppBackgroundOverlay':'linear-gradient(90deg,rgba(2,32,16,.25),transparent 42%,rgba(224,255,132,.09),transparent 68%,rgba(1,23,10,.24))','--rakAppBackgroundLite':'linear-gradient(155deg,#0d6947,#125b2c 52%,#1a421a)','--rakBgAccent':'rgba(190,255,75,.32)'} },
  { id:'solar', label:'Polární zář', subtitle:'Půlnoční modř, oranžové slunce a zlatý text', color:'#FFD45C', swatch:'radial-gradient(circle at 17% 18%,#ffb72d,transparent 36%),radial-gradient(circle at 84% 18%,#ff5c4d,transparent 40%),linear-gradient(145deg,#112553,#55316a)', themeVars:{'--bg':'#101d4b','--panel':'rgba(29,42,96,.77)','--panel2':'rgba(102,46,95,.63)','--green':'#FFD45C','--green2':'#FFF1AF','--text':'#FFD98B','--muted':'#FFBCA0','--soft':'#FFF0C8','--rakThemeAccentStrong':'#FFD45C','--rakThemeAccentSoft':'rgba(255,212,92,.25)','--rakThemeGlow':'rgba(255,121,63,.39)','--rakThemeBorder':'rgba(255,189,96,.42)'}, bgVars:{'--rakBgBase':'#111b49','--rakAppBackground':'radial-gradient(circle at 12% 12%,rgba(255,183,40,.59),transparent 33%),radial-gradient(circle at 91% 18%,rgba(255,78,87,.50),transparent 40%),radial-gradient(circle at 47% 90%,rgba(91,71,237,.38),transparent 41%),linear-gradient(155deg,#163466,#442c75 52%,#5b1e4e)','--rakAppBackgroundOverlay':'linear-gradient(135deg,rgba(255,232,150,.12),transparent 40%,rgba(10,12,61,.24))','--rakAppBackgroundLite':'linear-gradient(155deg,#1d4478,#57357e 52%,#68234d)','--rakBgAccent':'rgba(255,188,50,.37)'} },
  { id:'steel', label:'Modrá ocel', subtitle:'Čistá ocelová modř, bílý text a elektrický akcent', color:'#68A7FF', swatch:'radial-gradient(circle at 16% 18%,#5a9fff,transparent 36%),radial-gradient(circle at 84% 18%,#60748e,transparent 40%),linear-gradient(145deg,#102235,#26394d)', themeVars:{'--bg':'#10243a','--panel':'rgba(26,52,79,.80)','--panel2':'rgba(53,76,103,.66)','--green':'#68A7FF','--green2':'#D5E7FF','--text':'#B9D9FF','--muted':'#9DB7D3','--soft':'#E0EEFF','--rakThemeAccentStrong':'#68A7FF','--rakThemeAccentSoft':'rgba(104,167,255,.24)','--rakThemeGlow':'rgba(73,145,255,.33)','--rakThemeBorder':'rgba(145,190,244,.40)'}, bgVars:{'--rakBgBase':'#11263a','--rakAppBackground':'radial-gradient(circle at 12% 12%,rgba(75,151,255,.48),transparent 33%),radial-gradient(circle at 91% 18%,rgba(124,150,180,.33),transparent 39%),linear-gradient(155deg,#173956,#233a56 52%,#17283b)','--rakAppBackgroundOverlay':'repeating-linear-gradient(0deg,rgba(191,221,255,.06) 0 1px,transparent 1px 16px)','--rakAppBackgroundLite':'linear-gradient(155deg,#1b4669,#2a4868 52%,#1a3148)','--rakBgAccent':'rgba(104,167,255,.30)'} },
  { id:'jade', label:'Jadeit a zlato', subtitle:'Smaragd, petrolej a teplé zlato se zeleným textem', color:'#F2D05C', swatch:'radial-gradient(circle at 17% 18%,#00d2a1,transparent 37%),radial-gradient(circle at 84% 18%,#f5c649,transparent 41%),linear-gradient(145deg,#054638,#27482d)', themeVars:{'--bg':'#063a30','--panel':'rgba(7,82,62,.78)','--panel2':'rgba(50,81,43,.66)','--green':'#F2D05C','--green2':'#FFF0A8','--text':'#B8FFE0','--muted':'#A4DEBD','--soft':'#E3FFDF','--rakThemeAccentStrong':'#F2D05C','--rakThemeAccentSoft':'rgba(242,208,92,.24)','--rakThemeGlow':'rgba(0,210,161,.39)','--rakThemeBorder':'rgba(135,239,188,.39)'}, bgVars:{'--rakBgBase':'#063b31','--rakAppBackground':'radial-gradient(circle at 9% 12%,rgba(0,214,163,.58),transparent 34%),radial-gradient(circle at 92% 18%,rgba(245,194,57,.48),transparent 40%),radial-gradient(circle at 48% 91%,rgba(6,95,103,.38),transparent 42%),linear-gradient(155deg,#075d50,#175a38 51%,#233c27)','--rakAppBackgroundOverlay':'linear-gradient(90deg,rgba(1,36,28,.25),transparent 42%,rgba(255,231,126,.09),transparent 68%,rgba(0,28,20,.26))','--rakAppBackgroundLite':'linear-gradient(155deg,#087767,#226b42 52%,#2c4b2c)','--rakBgAccent':'rgba(242,208,92,.33)'} }
];
const RAK_THEME_DEFS = RAK_APPEARANCE_DEFS.map(item => ({ id:item.id, label:item.label, subtitle:item.subtitle, color:item.color, vars:item.themeVars }));
const RAK_BACKGROUND_DEFS = RAK_APPEARANCE_DEFS.map(item => ({ id:item.id, label:item.label, subtitle:item.subtitle, color:item.color, swatch:item.swatch, vars:item.bgVars }));
window.RAK_APPEARANCE_DEFS = RAK_APPEARANCE_DEFS;
window.RAK_THEME_DEFS = RAK_THEME_DEFS;
window.RAK_BACKGROUND_DEFS = RAK_BACKGROUND_DEFS;

const RAK_PROFILE_UI_REMOTE_DEBOUNCE_MS = 650;
const rakProfileUiRemoteSaveTimers = new Map();
const rakProfileUiRemoteSavePromises = new Map();
const rakProfileUiRemoteLoadPromises = new Map();
const rakProfileUiLastRemoteSaveSignatures = new Map();
const rakProfileUiSyncGuard = {
  remoteLoads: 0,
  remoteApplies: 0,
  remoteSameSkips: 0,
  remoteOlderSkips: 0,
  remoteMissingCreates: 0,
  loadInFlightJoins: 0,
  saveInFlightJoins: 0,
  saveSameSkips: 0,
  remoteSaves: 0,
  remoteSaveQueued: 0,
  remoteSaveErrors: 0,
  lastLoadAt: 0,
  lastApplyAt: 0,
  lastSaveAt: 0
};

function getProfileUiPayloadSignature(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return [
    String(payload.account_number || payload.accountNumber || '').trim(),
    normalizeThemePreferenceId(payload.theme_id || payload.themeId || payload.theme || 'default', 'default'),
    normalizeBackgroundPreferenceId(payload.background_id || payload.backgroundId || payload.background || 'ios-mesh', 'ios-mesh')
  ].join('|');
}

function getProfileUiSyncStatus() {
  const account = getActiveProfileUiAccount();
  const ui = ensureAccountUiSettings(account);
  return {
    account: account ? String(account.name || account.id || '').trim() : '',
    themeId: ui && ui.themeId ? ui.themeId : getLocalThemePreference(),
    backgroundId: ui && ui.backgroundId ? ui.backgroundId : getLocalBackgroundPreference(),
    remoteLoadActive: rakProfileUiRemoteLoadPromises.size > 0,
    remoteSaveActive: rakProfileUiRemoteSavePromises.size > 0,
    guard: Object.assign({}, rakProfileUiSyncGuard)
  };
}
window.getProfileUiSyncStatus = getProfileUiSyncStatus;

function resolveLegacyAppearanceId(value, kind) {
  const id = String(value || '').trim();
  if (RAK_APPEARANCE_DEFS.some(item => item.id === id)) return id;
  const themeMap = { 'default':'obsidian', 'light-brown':'obsidian', 'midnight-blue':'petrol', 'graphite':'graphite', 'sunset-plasma':'copper', 'violet-pulse':'obsidian' };
  const backgroundMap = { 'ios-mesh':'obsidian', 'skoda-green':'petrol', 'deep-aurora':'petrol', 'sunset-plasma':'copper', 'light-zigzag':'obsidian', 'amoled-grid':'obsidian' };
  return (kind === 'background' ? backgroundMap : themeMap)[id] || '';
}

function normalizeThemePreferenceId(themeId, fallback = RAK_DEFAULT_APPEARANCE_ID) {
  const normalized = resolveLegacyAppearanceId(themeId, 'theme');
  if (normalized) return normalized;
  if (!String(fallback || '').trim()) return '';
  return resolveLegacyAppearanceId(fallback, 'theme') || RAK_DEFAULT_APPEARANCE_ID;
}

function normalizeBackgroundPreferenceId(bgId, fallback = RAK_DEFAULT_APPEARANCE_ID) {
  const normalized = resolveLegacyAppearanceId(bgId, 'background');
  if (normalized) return normalized;
  if (!String(fallback || '').trim()) return '';
  return resolveLegacyAppearanceId(fallback, 'background') || RAK_DEFAULT_APPEARANCE_ID;
}

function getLocalThemePreference() {
  try {
    const raw = typeof getLocalStorageCached === 'function' ? getLocalStorageCached(RAK_THEME_STORAGE_KEY, RAK_DEFAULT_APPEARANCE_ID) : (localStorage.getItem(RAK_THEME_STORAGE_KEY) || RAK_DEFAULT_APPEARANCE_ID);
    return normalizeThemePreferenceId(raw || RAK_DEFAULT_APPEARANCE_ID, RAK_DEFAULT_APPEARANCE_ID);
  } catch (err) { return RAK_DEFAULT_APPEARANCE_ID; }
}

function getLocalBackgroundPreference() {
  try {
    const raw = typeof getLocalStorageCached === 'function' ? getLocalStorageCached(RAK_BACKGROUND_STORAGE_KEY, RAK_DEFAULT_APPEARANCE_ID) : (localStorage.getItem(RAK_BACKGROUND_STORAGE_KEY) || RAK_DEFAULT_APPEARANCE_ID);
    return normalizeBackgroundPreferenceId(raw || RAK_DEFAULT_APPEARANCE_ID, RAK_DEFAULT_APPEARANCE_ID);
  } catch (err) { return RAK_DEFAULT_APPEARANCE_ID; }
}

function getActiveProfileUiAccount() {
  try {
    const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
    if (!profile || !profile.activeAccountId || !profile.accounts) return null;
    return profile.accounts[profile.activeAccountId] || null;
  } catch (err) {
    return null;
  }
}

function ensureAccountUiSettings(account) {
  if (!account || typeof account !== 'object') return null;
  if (!account.uiSettings || typeof account.uiSettings !== 'object') account.uiSettings = {};
  if (!account.uiSettings.themeId && (account.themeId || account.uiTheme)) account.uiSettings.themeId = String(account.themeId || account.uiTheme || '').trim();
  if (!account.uiSettings.backgroundId && (account.backgroundId || account.uiBackground)) account.uiSettings.backgroundId = String(account.backgroundId || account.uiBackground || '').trim();
  account.uiSettings.themeId = account.uiSettings.themeId ? normalizeThemePreferenceId(account.uiSettings.themeId, '') : '';
  account.uiSettings.backgroundId = account.uiSettings.backgroundId ? normalizeBackgroundPreferenceId(account.uiSettings.backgroundId, '') : '';
  account.uiSettings.updatedAt = Number(account.uiSettings.updatedAt || 0) || 0;
  return account.uiSettings;
}

function getProfileThemePreference() {
  const account = getActiveProfileUiAccount();
  const ui = ensureAccountUiSettings(account);
  return ui && ui.themeId ? normalizeThemePreferenceId(ui.themeId, '') : '';
}

function getProfileBackgroundPreference() {
  const account = getActiveProfileUiAccount();
  const ui = ensureAccountUiSettings(account);
  return ui && ui.backgroundId ? normalizeBackgroundPreferenceId(ui.backgroundId, '') : '';
}

function saveActiveAccountUiSettings(partial, options = {}) {
  const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
  const account = profile && profile.activeAccountId && profile.accounts ? profile.accounts[profile.activeAccountId] : null;
  const ui = ensureAccountUiSettings(account);
  if (!profile || !account || !ui) return false;
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(partial || {}, 'themeId')) {
    const nextTheme = normalizeThemePreferenceId(partial.themeId, ui.themeId || getLocalThemePreference());
    if (ui.themeId !== nextTheme) { ui.themeId = nextTheme; changed = true; }
  }
  if (Object.prototype.hasOwnProperty.call(partial || {}, 'backgroundId')) {
    const nextBg = normalizeBackgroundPreferenceId(partial.backgroundId, ui.backgroundId || getLocalBackgroundPreference());
    if (ui.backgroundId !== nextBg) { ui.backgroundId = nextBg; changed = true; }
  }
  if (changed || !ui.updatedAt) {
    ui.updatedAt = Date.now();
    account.updatedAt = Math.max(Number(account.updatedAt || 0) || 0, ui.updatedAt);
    profile.profileVersion = GAMES_PROFILE_RESET_VERSION;
    gamesSaveProfile(profile);
    app.gamesProfile = profile;
  }
  if (!options.skipRemote) scheduleActiveAccountUiRemoteSave(options.reason || 'profile-ui-local-save');
  return true;
}

function getAccountUiRemotePayload(accountId) {
  const account = getProfileUiAccountById(accountId);
  const ui = ensureAccountUiSettings(account);
  if (!account || !ui) return null;
  const appearance = normalizeThemePreferenceId(ui.themeId || ui.backgroundId || RAK_DEFAULT_APPEARANCE_ID, RAK_DEFAULT_APPEARANCE_ID);
  return {
    account_number: String(account.id || '').trim(),
    theme_id: appearance,
    background_id: appearance,
    updated_at: new Date(Number(ui.updatedAt || Date.now()) || Date.now()).toISOString()
  };
}

function getActiveAccountUiRemotePayload() {
  const account = getActiveProfileUiAccount();
  return account ? getAccountUiRemotePayload(account.id) : null;
}

function scheduleActiveAccountUiRemoteSave(reason) {
  const bridge = window.RotationSupabaseBridge;
  if (!bridge || typeof bridge.saveGameAccountUiSettings !== 'function') {
    if (typeof window.rakEnsureFeature === 'function') {
      if (!window.__rakProfileUiRemoteSaveSyncEnsurePromise) {
        window.__rakProfileUiRemoteSaveSyncEnsurePromise = Promise.resolve()
          .then(() => window.rakEnsureFeature('sync'))
          .catch((err) => { console.warn('Profile UI sync feature load failed', err); return null; })
          .finally(() => { window.__rakProfileUiRemoteSaveSyncEnsurePromise = null; });
      }
      void window.__rakProfileUiRemoteSaveSyncEnsurePromise.then(() => {
        const readyBridge = window.RotationSupabaseBridge;
        if (readyBridge && typeof readyBridge.saveGameAccountUiSettings === 'function') {
          scheduleActiveAccountUiRemoteSave(reason || 'profile-ui-sync-ready-save');
        }
      });
      return true;
    }
    return false;
  }
  const payload = getActiveAccountUiRemotePayload();
  if (!payload || !payload.account_number) return false;
  const accountId = payload.account_number;
  const signature = getProfileUiPayloadSignature(payload);
  if (signature && signature === rakProfileUiLastRemoteSaveSignatures.get(accountId) && !rakProfileUiRemoteSavePromises.has(accountId)) {
    rakProfileUiSyncGuard.saveSameSkips += 1;
    return false;
  }
  const previousTimer = rakProfileUiRemoteSaveTimers.get(accountId);
  if (previousTimer) clearTimeout(previousTimer);
  const timer = setTimeout(() => {
    rakProfileUiRemoteSaveTimers.delete(accountId);
    void pushAccountUiRemoteSettings(accountId, reason || 'profile-ui-debounced');
  }, RAK_PROFILE_UI_REMOTE_DEBOUNCE_MS);
  rakProfileUiRemoteSaveTimers.set(accountId, timer);
  return true;
}

async function pushAccountUiRemoteSettings(accountId, reason) {
  const id = String(accountId || '').trim();
  const bridge = window.RotationSupabaseBridge;
  if (!id || !bridge || typeof bridge.saveGameAccountUiSettings !== 'function') return null;
  const payload = getAccountUiRemotePayload(id);
  if (!payload || !payload.account_number) return null;
  const signature = getProfileUiPayloadSignature(payload);
  if (signature && signature === rakProfileUiLastRemoteSaveSignatures.get(id) && !rakProfileUiRemoteSavePromises.has(id)) {
    rakProfileUiSyncGuard.saveSameSkips += 1;
    return { ok: true, skipped: true, reason: 'same-profile-ui' };
  }
  if (rakProfileUiRemoteSavePromises.has(id)) {
    rakProfileUiSyncGuard.saveInFlightJoins += 1;
    await rakProfileUiRemoteSavePromises.get(id);
    return await pushAccountUiRemoteSettings(id, reason);
  }
  let savePromise;
  savePromise = bridge.saveGameAccountUiSettings(Object.assign({ reason: reason || 'profile-ui-save' }, payload))
    .then((result) => {
      if (result && result.ok !== false) {
        rakProfileUiLastRemoteSaveSignatures.set(id, signature);
        rakProfileUiSyncGuard.remoteSaves += 1;
        rakProfileUiSyncGuard.lastSaveAt = Date.now();
        if (result.queued || result.deferred) rakProfileUiSyncGuard.remoteSaveQueued += 1;
      } else {
        rakProfileUiSyncGuard.remoteSaveErrors += 1;
      }
      return result;
    })
    .catch((err) => {
      rakProfileUiSyncGuard.remoteSaveErrors += 1;
      console.warn('Profile UI remote save failed', err);
      return { ok: false, error: err };
    })
    .finally(() => {
      if (rakProfileUiRemoteSavePromises.get(id) === savePromise) rakProfileUiRemoteSavePromises.delete(id);
    });
  rakProfileUiRemoteSavePromises.set(id, savePromise);
  return await savePromise;
}

async function pushActiveAccountUiRemoteSettings(reason) {
  const payload = getActiveAccountUiRemotePayload();
  return payload && payload.account_number ? await pushAccountUiRemoteSettings(payload.account_number, reason) : null;
}

async function loadActiveAccountUiRemoteSettings(accountId) {
  const id = String(accountId || '').trim();
  const bridge = window.RotationSupabaseBridge;
  if (!id || !bridge || typeof bridge.loadGameAccountUiSettings !== 'function') return null;
  if (rakProfileUiRemoteLoadPromises.has(id)) {
    rakProfileUiSyncGuard.loadInFlightJoins += 1;
    return await rakProfileUiRemoteLoadPromises.get(id);
  }
  const loadPromise = (async () => {
    try {
      rakProfileUiSyncGuard.remoteLoads += 1;
      rakProfileUiSyncGuard.lastLoadAt = Date.now();
      const remote = await bridge.loadGameAccountUiSettings(id);
      if (remote && remote.__rakUnavailable === true) {
        rakProfileUiSyncGuard.remoteUnavailableSkips = Number(rakProfileUiSyncGuard.remoteUnavailableSkips || 0) + 1;
        return { ok: true, skipped: true, reason: String(remote.reason || 'remote-unavailable') };
      }
      if (!remote || typeof remote !== 'object') {
        rakProfileUiSyncGuard.remoteMissingCreates += 1;
        if (!isProfileUiAccountActive(id)) return { ok: true, skipped: true, reason: 'account-switched' };
        const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
        const account = profile && profile.accounts ? profile.accounts[id] : null;
        const ui = ensureAccountUiSettings(account);
        if (!profile || !account || !ui) return null;
        if (!ui.themeId && !ui.backgroundId) {
          ui.themeId = RAK_DEFAULT_APPEARANCE_ID;
          ui.backgroundId = RAK_DEFAULT_APPEARANCE_ID;
          ui.updatedAt = Date.now();
          account.updatedAt = Math.max(Number(account.updatedAt || 0) || 0, ui.updatedAt);
          profile.profileVersion = GAMES_PROFILE_RESET_VERSION;
          gamesSaveProfile(profile);
          app.gamesProfile = profile;
          applyAppearancePreference(RAK_DEFAULT_APPEARANCE_ID, true, { skipProfile: true });
        }
        void pushAccountUiRemoteSettings(id, 'profile-ui-create-missing-remote');
        return null;
      }
      const remoteTheme = normalizeThemePreferenceId(remote.theme_id || remote.themeId || remote.theme || '', '');
      const remoteBg = normalizeBackgroundPreferenceId(remote.background_id || remote.backgroundId || remote.background || '', '');
      const remoteAppearance = remoteTheme || remoteBg;
      if (!remoteAppearance) return null;
      if (!isProfileUiAccountActive(id)) return { ok: true, skipped: true, reason: 'account-switched' };
      const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
      const account = profile && profile.accounts ? profile.accounts[id] : null;
      const ui = ensureAccountUiSettings(account);
      if (!profile || !account || !ui) return null;
      const localTs = Number(ui.updatedAt || 0) || 0;
      const remoteTs = Date.parse(String(remote.updated_at || remote.updatedAt || '')) || 0;
      const remoteIsOlder = localTs > 0 && remoteTs > 0 && remoteTs + 1000 < localTs;
      if (remoteIsOlder) {
        rakProfileUiSyncGuard.remoteOlderSkips += 1;
        void pushAccountUiRemoteSettings(id, 'profile-ui-remote-older-push-local');
        return Object.assign({ ok: true, skipped: true, reason: 'remote-older' }, remote);
      }
      let changed = false;
      if (ui.themeId !== remoteAppearance) { ui.themeId = remoteAppearance; changed = true; }
      if (ui.backgroundId !== remoteAppearance) { ui.backgroundId = remoteAppearance; changed = true; }
      ui.updatedAt = Math.max(localTs, remoteTs || Date.now());
      if (changed) {
        rakProfileUiSyncGuard.remoteApplies += 1;
        rakProfileUiSyncGuard.lastApplyAt = Date.now();
        account.updatedAt = Math.max(Number(account.updatedAt || 0) || 0, ui.updatedAt);
        profile.profileVersion = GAMES_PROFILE_RESET_VERSION;
        gamesSaveProfile(profile);
        app.gamesProfile = profile;
        applyAppearancePreference(ui.themeId || RAK_DEFAULT_APPEARANCE_ID, true, { skipProfile: true });
        if (remoteTheme !== remoteAppearance || remoteBg !== remoteAppearance) scheduleActiveAccountUiRemoteSave('profile-ui-locked-remote-normalized');
        if (typeof renderThemeSettingsCards === 'function') renderThemeSettingsCards();
      } else {
        rakProfileUiSyncGuard.remoteSameSkips += 1;
        if (remoteTheme || remoteBg) {
          rakProfileUiLastRemoteSaveSignatures.set(id, getProfileUiPayloadSignature({ account_number: id, theme_id: remoteAppearance, background_id: remoteAppearance }));
        }
      }
      return remote;
    } catch (err) {
      console.warn('Profile UI remote load failed', err);
      return null;
    }
  })();
  rakProfileUiRemoteLoadPromises.set(id, loadPromise);
  try {
    return await loadPromise;
  } finally {
    if (rakProfileUiRemoteLoadPromises.get(id) === loadPromise) rakProfileUiRemoteLoadPromises.delete(id);
  }
}

function applyProfileUiPreferencesForActiveAccount(options = {}) {
  const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
  const account = profile && profile.activeAccountId && profile.accounts ? profile.accounts[profile.activeAccountId] : null;
  const ui = ensureAccountUiSettings(account);
  if (!profile || !account || !ui) return false;
  const defaultTheme = RAK_DEFAULT_APPEARANCE_ID;
  const hasStoredAppearance = !!(ui.themeId || ui.backgroundId);

  // Účet bez vlastního nastavení nikdy nesmí zdědit vzhled předchozího účtu ze
  // společného localStorage. Do načtení serverové volby zobrazíme Noční laser.
  if (!hasStoredAppearance) {
    applyAppearancePreference(defaultTheme, true, { skipProfile: true });
    if (typeof renderThemeSettingsCards === 'function') renderThemeSettingsCards();
    if (options.loadRemote !== false) void loadActiveAccountUiRemoteSettings(account.id);
    return true;
  }

  let changed = false;
  const appearanceToApply = normalizeThemePreferenceId(ui.themeId || ui.backgroundId || defaultTheme, defaultTheme);
  if (!ui.themeId) { ui.themeId = appearanceToApply; changed = true; }
  if (!ui.backgroundId) { ui.backgroundId = appearanceToApply; changed = true; }
  if (ui.themeId !== appearanceToApply) { ui.themeId = appearanceToApply; changed = true; }
  if (ui.backgroundId !== appearanceToApply) { ui.backgroundId = appearanceToApply; changed = true; }
  if (changed || !ui.updatedAt) {
    ui.updatedAt = Date.now();
    account.updatedAt = Math.max(Number(account.updatedAt || 0) || 0, ui.updatedAt);
    profile.profileVersion = GAMES_PROFILE_RESET_VERSION;
    gamesSaveProfile(profile);
    app.gamesProfile = profile;
  }
  applyAppearancePreference(appearanceToApply, true, { skipProfile: true });
  if (typeof renderThemeSettingsCards === 'function') renderThemeSettingsCards();
  // RAK_17071_OFFLINE_PROFILE_READ_ONLY: startup normalization is not a user edit.
  // While offline, keep it local and reconcile by reading the server after the online event.
  if (changed && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    scheduleActiveAccountUiRemoteSave('profile-ui-normalized-local');
  }
  if (options.loadRemote !== false) void loadActiveAccountUiRemoteSettings(account.id);
  return true;
}

window.applyProfileUiPreferencesForActiveAccount = applyProfileUiPreferencesForActiveAccount;
window.pushActiveAccountUiRemoteSettings = pushActiveAccountUiRemoteSettings;
window.loadActiveAccountUiRemoteSettings = loadActiveAccountUiRemoteSettings;

function getThemePreference() {
  const account = getActiveProfileUiAccount();
  const profileTheme = getProfileThemePreference();
  if (profileTheme) return profileTheme;
  if (account) return getProfileBackgroundPreference() || RAK_DEFAULT_APPEARANCE_ID;
  return getLocalThemePreference();
}


function getBackgroundPreference() {
  const account = getActiveProfileUiAccount();
  const profileBg = getProfileBackgroundPreference();
  if (profileBg) return profileBg;
  if (account) return getProfileThemePreference() || RAK_DEFAULT_APPEARANCE_ID;
  return getLocalBackgroundPreference();
}

function updateBackgroundMetaColor(bg) {
  try {
    const vars = bg && bg.vars && typeof bg.vars === 'object' ? bg.vars : {};
    const nextColor = String((bg && bg.themeColor) || vars['--rakBgBase'] || '#050816').trim() || '#050816';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta && document.head) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    if (meta && meta.getAttribute('content') !== nextColor) meta.setAttribute('content', nextColor);
  } catch (err) {}
}
window.updateBackgroundMetaColor = updateBackgroundMetaColor;

function setRakStyleProperty(target, key, value, priority = '', statKey = '') {
  if (!target || !target.style) return false;
  if (typeof setStylePropertyIfChanged === 'function') {
    return setStylePropertyIfChanged(target, key, value, priority, statKey || key);
  }
  try {
    target.style.setProperty(key, value, priority || '');
    return true;
  } catch (err) {
    return false;
  }
}

function applyBackgroundPreference(bgId, persist = true, options = {}) {
  const bg = RAK_BACKGROUND_DEFS.find(item => item.id === normalizeBackgroundPreferenceId(bgId, 'ios-mesh')) || RAK_BACKGROUND_DEFS[0];
  const root = document.documentElement;
  root.dataset.rakBackground = bg.id;
  Object.entries(RAK_BACKGROUND_BASE_VARS).forEach(([key, value]) => {
    setRakStyleProperty(root, key, value, '', 'background-' + key);
  });
  Object.entries(bg.vars || {}).forEach(([key, value]) => {
    setRakStyleProperty(root, key, value, '', 'background-' + key);
  });
  updateBackgroundMetaColor(bg);
  if (persist) {
    try {
      if (typeof setLocalStorageIfChanged === 'function') setLocalStorageIfChanged(RAK_BACKGROUND_STORAGE_KEY, bg.id);
      else localStorage.setItem(RAK_BACKGROUND_STORAGE_KEY, bg.id);
    } catch (err) {}
    if (!options.skipProfile) saveActiveAccountUiSettings({ backgroundId: bg.id }, { reason: 'background-change', skipRemote: !!options.skipRemote });
  }
  return bg.id;
}
window.getBackgroundPreference = getBackgroundPreference;
window.applyBackgroundPreference = applyBackgroundPreference;
window.RAK_BACKGROUND_STORAGE_KEY = RAK_BACKGROUND_STORAGE_KEY;

(function initBackgroundPreference() {
  try { applyAppearancePreference(getAppearancePreference(), false); } catch (err) {}
})();

(function installAppearancePreferenceGuards() {
  if (window.__rakAppearancePreferenceGuardV556) return;
  window.__rakAppearancePreferenceGuardV556 = true;
  const syncAppearance = () => {
    try {
      applyAppearancePreference(getAppearancePreference(), false);
      if (typeof renderThemeSettingsCards === 'function') renderThemeSettingsCards();
    } catch (err) {}
  };
  window.addEventListener('pageshow', syncAppearance);
  window.addEventListener('focus', syncAppearance);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncAppearance();
  });
  window.addEventListener('storage', (event) => {
    if (!event || event.key === RAK_BACKGROUND_STORAGE_KEY || event.key === RAK_THEME_STORAGE_KEY) syncAppearance();
  });
})();

function applyThemePreference(themeId, persist = true, options = {}) {
  const theme = RAK_THEME_DEFS.find(t => t.id === normalizeThemePreferenceId(themeId, 'default')) || RAK_THEME_DEFS[0];
  const root = document.documentElement;
  root.dataset.rakTheme = theme.id;
  setRakStyleProperty(root, '--rakThemeAccent', String(theme.color || '#7CFF7C'), '', 'theme-accent');
  Object.entries(RAK_THEME_BASE_VARS).forEach(([key, value]) => {
    setRakStyleProperty(root, key, value, '', 'theme-base-' + key);
  });
  Object.entries(theme.vars || {}).forEach(([key, value]) => {
    setRakStyleProperty(root, key, value, '', 'theme-' + key);
  });
  if (persist) {
    try {
      if (typeof setLocalStorageIfChanged === 'function') setLocalStorageIfChanged(RAK_THEME_STORAGE_KEY, theme.id);
      else localStorage.setItem(RAK_THEME_STORAGE_KEY, theme.id);
    } catch (err) {}
    if (!options.skipProfile) saveActiveAccountUiSettings({ themeId: theme.id }, { reason: 'theme-change', skipRemote: !!options.skipRemote });
  }
  return theme.id;
}

(function initThemePreference() {
  try {
    applyAppearancePreference(getAppearancePreference(), false);
  } catch (err) {}
})();

function buildThemeSystemSettingsHtml() {
  const defs = Array.isArray(window.RAK_THEME_DEFS) ? window.RAK_THEME_DEFS : [];
  const currentId = getThemePreference();
  const currentTheme = defs.find(theme => String(theme.id || '') === String(currentId)) || defs[0] || { label: 'Výchozí' };
  const cards = defs.map(theme => {
    return '<button type="button" class="appMenuThemeCard" data-theme-id="' + escapeHtml(String(theme.id || '')) + '">' +
      '<div class="appMenuThemeSwatch" style="--theme-swatch:' + escapeHtml(String(theme.color || '#7CFF7C')) + '"></div>' +
      '<div class="appMenuThemeInfo">' +
      '<div class="appMenuThemeTitle">' + escapeHtml(String(theme.label || '')) + '</div>' +
      '</div>' +
    '</button>';
  }).join('');
  const bgDefs = Array.isArray(window.RAK_BACKGROUND_DEFS) ? window.RAK_BACKGROUND_DEFS : [];
  const currentBgId = typeof getBackgroundPreference === 'function' ? getBackgroundPreference() : 'ios-mesh';
  const currentBg = bgDefs.find(bg => String(bg.id || '') === String(currentBgId)) || bgDefs[0] || { label: 'iOS mesh' };
  const bgCards = bgDefs.map(bg => {
    const swatch = String(bg.swatch || bg.color || '#38bdf8');
    return '<button type="button" class="appMenuBackgroundCard" data-bg-id="' + escapeHtml(String(bg.id || '')) + '">' +
      '<div class="appMenuBackgroundSwatch" style="--background-swatch:' + escapeHtml(swatch) + '"></div>' +
      '<div class="appMenuThemeInfo">' +
      '<div class="appMenuThemeTitle">' + escapeHtml(String(bg.label || '')) + '</div>' +
      '</div>' +
    '</button>';
  }).join('');
  return [
    '<div class="appMenuCard appMenuSettingsCard appMenuThemeCardWrap">',
    '  <div class="appMenuCardTitle">Theme / barvy aplikace</div>',
    '  <details class="appMenuThemeAccordion" id="appMenuThemeAccordion">',
    '    <summary class="appMenuAction appMenuSettingBtn appMenuThemeSummary">',
    '      <span class="appMenuThemeSummaryLeft">',
    '        <span class="appMenuThemeSummaryTitle">Theme / barvy</span>',
    '        <span class="appMenuThemeSummaryMeta" id="appMenuThemeSummaryMeta">Aktivní: ' + escapeHtml(String(currentTheme.label || 'Výchozí')) + '</span>',
    '      </span>',
    '      <span class="appMenuThemeSummaryChevron" aria-hidden="true">⌄</span>',
    '    </summary>',
    '    <div class="appMenuThemeAccordionBody">',
    '      <div class="appMenuThemeGrid" id="appMenuThemeGrid">' + cards + '</div>',
    '      <div class="appMenuThemeHint" id="appMenuThemeHint"></div>',
    '    </div>',
    '  </details>',
    '  <details class="appMenuThemeAccordion appMenuBackgroundAccordion" id="appMenuBackgroundAccordion">',
    '    <summary class="appMenuAction appMenuSettingBtn appMenuThemeSummary">',
    '      <span class="appMenuThemeSummaryLeft">',
    '        <span class="appMenuThemeSummaryTitle">Pozadí</span>',
    '        <span class="appMenuThemeSummaryMeta" id="appMenuBackgroundSummaryMeta">Aktivní: ' + escapeHtml(String(currentBg.label || 'iOS mesh')) + '</span>',
    '      </span>',
    '      <span class="appMenuThemeSummaryChevron" aria-hidden="true">⌄</span>',
    '    </summary>',
    '    <div class="appMenuThemeAccordionBody">',
    '      <div class="appMenuBackgroundGrid" id="appMenuBackgroundGrid">' + bgCards + '</div>',
    '      <div class="appMenuThemeHint" id="appMenuBackgroundHint"></div>',
    '    </div>',
    '  </details>',
    '</div>'
  ].join('');
}

function renderThemeSettingsCards() {
  const grid = document.getElementById('appMenuThemeGrid');
  const hint = document.getElementById('appMenuThemeHint');
  const summaryMeta = document.getElementById('appMenuThemeSummaryMeta');
  if (!grid) return;
  const current = getThemePreference();
  const themeList = Array.isArray(window.RAK_THEME_DEFS) ? window.RAK_THEME_DEFS : [];
  const themeById = new Map(themeList.map(theme => [String(theme.id || ''), theme]));

  Array.from(grid.querySelectorAll('.appMenuThemeCard')).forEach(card => {
    const id = String(card.dataset.themeId || '').trim();
    card.classList.toggle('isActive', id === current);
    card.setAttribute('aria-pressed', id === current ? 'true' : 'false');
    if (!card.dataset.bound) {
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        const nextTheme = themeById.get(id) || null;
        if (!nextTheme) return;
        applyThemePreference(id, true);
        if (typeof applyBackgroundPreference === 'function') applyBackgroundPreference(getBackgroundPreference(), false);
        renderThemeSettingsCards();
      });
    }
  });

  const bgGrid = document.getElementById('appMenuBackgroundGrid');
  const bgSummaryMeta = document.getElementById('appMenuBackgroundSummaryMeta');
  const bgList = Array.isArray(window.RAK_BACKGROUND_DEFS) ? window.RAK_BACKGROUND_DEFS : [];
  const bgById = new Map(bgList.map(bg => [String(bg.id || ''), bg]));
  const currentBg = typeof getBackgroundPreference === 'function' ? getBackgroundPreference() : 'ios-mesh';
  if (bgGrid) {
    Array.from(bgGrid.querySelectorAll('.appMenuBackgroundCard')).forEach(card => {
      const id = String(card.dataset.bgId || '').trim();
      card.classList.toggle('isActive', id === currentBg);
      card.setAttribute('aria-pressed', id === currentBg ? 'true' : 'false');
      if (!card.dataset.bound) {
        card.dataset.bound = '1';
        card.addEventListener('click', () => {
          const nextBg = bgById.get(id) || null;
          if (!nextBg) return;
          if (typeof applyBackgroundPreference === 'function') applyBackgroundPreference(id, true);
          renderThemeSettingsCards();
        });
      }
    });
  }
  if (bgSummaryMeta) {
    const activeBgName = (bgById.get(currentBg) || bgList[0] || { label: 'iOS mesh' }).label;
    const nextBgSummary = 'Aktivní: ' + String(activeBgName);
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(bgSummaryMeta, nextBgSummary, 'backgroundSummaryMeta');
    else bgSummaryMeta.textContent = nextBgSummary;
  }

  if (summaryMeta) {
    const activeName = (themeById.get(current) || themeList[0] || { label: 'Výchozí' }).label;
    const nextThemeSummary = 'Aktivní: ' + String(activeName);
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(summaryMeta, nextThemeSummary, 'themeSummaryMeta');
    else summaryMeta.textContent = nextThemeSummary;
  }

  if (hint) {
    const nextThemeHint = '';
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(hint, nextThemeHint, 'themeHintSummary');
    else hint.textContent = nextThemeHint;
  }
}

function getAppearancePreference() {
  const themeId = getThemePreference();
  const backgroundId = getBackgroundPreference();
  if (themeId && RAK_APPEARANCE_DEFS.some(item => item.id === themeId)) return themeId;
  if (backgroundId && RAK_APPEARANCE_DEFS.some(item => item.id === backgroundId)) return backgroundId;
  return RAK_DEFAULT_APPEARANCE_ID;
}

function getProfileUiAccountById(accountId) {
  try {
    const id = String(accountId || '').trim();
    const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
    if (!id || !profile || !profile.accounts) return null;
    return profile.accounts[id] || null;
  } catch (err) {
    return null;
  }
}

function isProfileUiAccountActive(accountId) {
  try {
    const id = String(accountId || '').trim();
    const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
    return !!(id && profile && String(profile.activeAccountId || '').trim() === id && profile.accounts && profile.accounts[id]);
  } catch (err) {
    return false;
  }
}

function applyAppearancePreference(appearanceId, persist = true, options = {}) {
  const id = normalizeThemePreferenceId(appearanceId, RAK_DEFAULT_APPEARANCE_ID);
  applyThemePreference(id, persist, Object.assign({}, options, { skipProfile:true }));
  applyBackgroundPreference(id, persist, Object.assign({}, options, { skipProfile:true }));
  if (persist && !options.skipProfile) {
    saveActiveAccountUiSettings({ themeId:id, backgroundId:id }, { reason:'appearance-change', skipRemote:true });
    if (!options.skipRemote) {
      const pushAppearanceNow = () => {
        try { if (typeof pushActiveAccountUiRemoteSettings === 'function') void pushActiveAccountUiRemoteSettings('appearance-change-immediate'); } catch (err) { console.warn('Profile UI immediate remote save failed', err); }
      };
      if (typeof window.rakEnsureFeature === 'function') {
        void window.rakEnsureFeature('sync').then(pushAppearanceNow).catch((err) => console.warn('Profile UI immediate sync load failed', err));
      } else {
        pushAppearanceNow();
      }
    }
  }
  return id;
}

window.getAppearancePreference = getAppearancePreference;
window.applyAppearancePreference = applyAppearancePreference;

// Přepis starého dvoustupňového UI: uživatel vždy volí jeden kompletní vzhled.
function buildThemeSystemSettingsHtml() {
  const currentId = getAppearancePreference();
  const current = RAK_APPEARANCE_DEFS.find(item => item.id === currentId) || RAK_APPEARANCE_DEFS[0];
  const cards = RAK_APPEARANCE_DEFS.map(item => {
    const previewVars = [
      '--appearance-preview-bg:' + String(item.bgVars['--rakAppBackgroundLite'] || item.swatch),
      '--appearance-preview-panel:' + String(item.themeVars['--panel'] || 'rgba(255,255,255,.12)'),
      '--appearance-preview-panel2:' + String(item.themeVars['--panel2'] || 'rgba(255,255,255,.18)'),
      '--appearance-preview-text:' + String(item.themeVars['--text'] || '#ffffff'),
      '--appearance-preview-muted:' + String(item.themeVars['--muted'] || '#cbd5e1'),
      '--appearance-preview-soft:' + String(item.themeVars['--soft'] || '#f8fafc'),
      '--appearance-preview-accent:' + String(item.color || '#7CFF7C')
    ].join(';');
    return [
    '<button type="button" class="appMenuThemeCard appMenuAppearanceCard" data-appearance-id="' + escapeHtml(item.id) + '" style="' + escapeHtml(previewVars) + '">',
    '<div class="appMenuAppearancePreview">',
    '<div class="appMenuAppearancePreviewHead"><span></span><strong>RaK</strong><i></i></div>',
    '<div class="appMenuAppearancePreviewTiles"><b>Směna</b><em>Rotace</em></div>',
    '<div class="appMenuAppearancePreviewPanel"><strong>Dnešní přehled</strong><span>Aktuální data</span><i>●</i></div>',
    '</div>',
    '<div class="appMenuThemeInfo"><div class="appMenuThemeTitle">' + escapeHtml(item.label) + '</div><div class="smallText">' + escapeHtml(item.subtitle) + '</div></div>',
    '</button>'
    ].join('');
  }).join('');
  return [
    '<div class="appMenuCard appMenuSettingsCard appMenuThemeCardWrap">',
    '<div class="appMenuCardTitle">Vzhled aplikace</div>',
    '<details class="appMenuThemeAccordion" id="appMenuThemeAccordion">',
    '<summary class="appMenuAction appMenuSettingBtn appMenuThemeSummary">',
    '<span class="appMenuThemeSummaryLeft"><span class="appMenuThemeSummaryTitle">Vzhled aplikace</span><span class="appMenuThemeSummaryMeta" id="appMenuThemeSummaryMeta">Aktivní: ' + escapeHtml(current.label) + '</span></span>',
    '<span class="appMenuThemeSummaryChevron" aria-hidden="true">⌄</span>',
    '</summary>',
    '<div class="appMenuThemeAccordionBody"><div class="appMenuThemeGrid" id="appMenuThemeGrid">' + cards + '</div><div class="appMenuThemeHint">Vzhled mění barvy, karty i pozadí najednou.</div></div>',
    '</details>',
    '</div>'
  ].join('');
}

function renderThemeSettingsCards() {
  const grid = document.getElementById('appMenuThemeGrid');
  const summaryMeta = document.getElementById('appMenuThemeSummaryMeta');
  if (!grid) return;
  const currentId = getAppearancePreference();
  Array.from(grid.querySelectorAll('.appMenuAppearanceCard')).forEach(card => {
    const id = String(card.dataset.appearanceId || '').trim();
    const active = id === currentId;
    card.classList.toggle('isActive', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (!card.dataset.bound) {
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        if (!RAK_APPEARANCE_DEFS.some(item => item.id === id)) return;
        applyAppearancePreference(id, true);
        renderThemeSettingsCards();
      });
    }
  });
  if (summaryMeta) {
    const label = (RAK_APPEARANCE_DEFS.find(item => item.id === currentId) || RAK_APPEARANCE_DEFS[0]).label;
    const value = 'Aktivní: ' + label;
    if (typeof setElementTextIfChanged === 'function') setElementTextIfChanged(summaryMeta, value, 'appearanceSummaryMeta');
    else summaryMeta.textContent = value;
  }
}

const RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105 = Object.freeze({
  scope: 'profile-appearance-update-migration',
  intent: 'nevracet vybrané pozadí po aktualizaci na základní',
  migrationSource: 'localStorage fallback při chybějícím account.uiSettings.backgroundId',
  protectedStorage: Object.freeze(['account.uiSettings.backgroundId', RAK_BACKGROUND_STORAGE_KEY]),
  fallbackBackground: 'ios-mesh'
});
window.RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105 = RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105;

window.openGameShell = function openGameShellPublic(gameId) {
  const id = String(gameId || '').trim();
  if (!id) return false;
  if (typeof gamesStopActiveLoops === 'function') gamesStopActiveLoops();
  if (typeof app !== 'undefined') app.activeGameShell = id;
  if (typeof window.rakGameEngineActivate === 'function') window.rakGameEngineActivate(id, 'public-open');
  if (id === 'ttt' && typeof openTicTacToeGame === 'function') {
    openTicTacToeGame();
    return true;
  }
  if (document.body && document.body.classList) document.body.classList.add('gamesOpen');
  if (typeof renderGameShell === 'function') {
    renderGameShell(id);
    return true;
  }
  return false;
};


const rakInternalCloseGameShell = (typeof closeGameShell === 'function') ? closeGameShell : null;
window.closeGameShell = function closeGameShellProxy() {
  if (typeof rakInternalCloseGameShell === 'function') return rakInternalCloseGameShell();
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('gamesOpen');
    document.body.classList.remove('tttOpen');
    if (document.body.dataset) delete document.body.dataset.rakArcadeGame;
  }
  if (typeof app !== 'undefined') app.activeGameShell = '';
  return true;
};


function syncGamesLockedSections() {
  const profile = typeof gamesGetProfile === 'function' ? gamesGetProfile() : null;
  const active = profile && profile.activeAccountId && profile.accounts ? profile.accounts[profile.activeAccountId] : null;
  const lockedEls = [
    document.querySelector('#games .gamesProfilesFolder'),
    document.querySelector('#games .gamesAchievementsFolder')
  ];
  lockedEls.forEach((el) => {
    if (!el) return;
    el.hidden = !active;
  });
  const duplicateStatsFolder = document.querySelector('#games .gamesStatsFolder');
  if (duplicateStatsFolder) duplicateStatsFolder.hidden = true;
}



window.addEventListener('load', () => {
  try {
    if (typeof applyThemePreference === 'function') applyThemePreference(getThemePreference(), false);
    if (typeof syncGamesLockedSections === 'function') syncGamesLockedSections();
    if (typeof renderGamesProfileStatus === 'function') renderGamesProfileStatus();
    if (typeof applyProfileUiPreferencesForActiveAccount === 'function') applyProfileUiPreferencesForActiveAccount({ loadRemote: true, source: 'window-load' });
    if (typeof renderThemeSettingsCards === 'function') renderThemeSettingsCards();
  } catch (err) {}
}, { once: true });




function getRakDashboardGlassThemeHealth() {
  let rootStyle = null;
  let bodyClass = '';
  try { rootStyle = getComputedStyle(document.documentElement); } catch (err) { rootStyle = null; }
  try { bodyClass = String(document.body && document.body.className || ''); } catch (err) { bodyClass = ''; }
  const readVar = (name) => {
    try { return rootStyle ? String(rootStyle.getPropertyValue(name) || '').trim() : ''; } catch (err) { return ''; }
  };
  const theme = String(typeof getThemePreference === 'function' ? getThemePreference() : (document.documentElement.dataset.rakTheme || 'default'));
  const background = String(typeof getBackgroundPreference === 'function' ? getBackgroundPreference() : (document.documentElement.dataset.rakBackground || 'ios-mesh'));
  const lightweight = /(?:^|\s)(?:lightweightMode|lowEndDevice|ladaMode)(?:\s|$)/.test(bodyClass);
  return {
    ok: true,
    version: window.APP_VERSION || '1.2 (1.155)',
    mode: 'dashboard-ios-glass-viewport-fit-v945',
    theme,
    background,
    themeAware: !!(readVar('--green') && readVar('--green2')),
    themeIconAware: true,
    dashboardCards: 'dark-unified-transparent-glass-viewport-fit-v945',
    dashboardPanelHeight: 'height-aware-balanced-360x800-slightly-taller-cards',
    viewportFit: {
      enabled: true,
      target: '360x800',
      strategy: 'CSS media queries podle šířky i výšky displeje, s chráněnou velikostí horního směnového panelu',
      dashboardScrollGoal: 'bez zbytečného scrollu na běžném 360×800 viewportu'
    },
    dashboardIcons: 'theme-color',
    activeBottomNavIcon: 'theme-color',
    glassVariables: {
      panel: readVar('--panel'),
      panel2: readVar('--panel2'),
      green: readVar('--green'),
      green2: readVar('--green2'),
      themeGlow: readVar('--rakThemeGlow'),
      themeBorder: readVar('--rakThemeBorder'),
      dashboardBlur: readVar('--rakDashboardGlassBlur')
    },
    selectors: [
      '#home .dashboardShell',
      '#home .dashboardHeroCard',
      '#home .dashboardCard',
      'body.lightweightMode #home .dashboardCard',
      'body.lowEndDevice #home .dashboardCard',
      'body.ladaMode #home .dashboardCard'
    ],
    lightweightSafe: lightweight ? 'blur-off' : 'full-glass',
    note: 'Dashboard panely drží tmavší odstín a průhledný glass; ve v945 zůstává horní směnový panel čitelný a běžné dashboard panely jsou lehce zvětšené, protože nad spodní lištou byla ještě rezerva.'
  };
}
window.getRakDashboardGlassThemeHealth = getRakDashboardGlassThemeHealth;
try {
  if (window.RaK && window.RaK.diagnostics && typeof window.RaK.diagnostics.register === 'function') {
    window.RaK.diagnostics.register('dashboardGlassTheme', getRakDashboardGlassThemeHealth);
  }
} catch (err) {}

try { if (typeof window !== 'undefined' && typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('appearance-theme.js','loaded',{source:'appearance-theme'}); } catch (err) {}
