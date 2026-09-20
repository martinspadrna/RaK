# RaK – stav kandidáta 1.7.68 (20. 9. 2026)

Platí výhradně pro `development` a TEST Supabase `cgshssdjgzzuprlwnabl`. Produkční `main` a produkční Supabase jsou mimo rozsah. Technická verze `1.7.0`, viditelná verze kandidáta `1.7.68`. Toto je položkový stav plánu, **nikoli samo o sobě důkaz vydání**: definitivní stav vyžaduje dva buildy, všechny historické a finální testy, CRC archivu, Chromium PWA/offline, TEST HTTP, Actions SUCCESS a Vercel READY pro stejný aktuální SHA. Fyzický iPhone musí ověřit uživatel.

| Bod | Stav | Co zbývá |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | Audit historických exportů/PWA, skutečné role JWT. OS-only riziko přijato. |
| P0.2 Veřejná rotace | UZAVŘENO ROZHODNUTÍM | Veřejné čtení jmen, běžných absencí a historie je přijaté riziko, nikoli technická ochrana. Citlivé důvody absencí nesdílet. |
| P0.3 API/exporty | ČÁSTEČNĚ | Skutečné JWT, preview přístup a iPhone stažení, historické PWA. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Skutečně přihlášený owner/admin/deputy a fyzické ověření. |
| P1.1 RLS a oprávnění | ČÁSTEČNĚ | Privilegované RPC s legitimními podepsanými JWT všech rolí. |
| P1.2 Hesla/relace | ČÁSTEČNĚ | Odvolání a nové relace na skutečném iPhonu. |
| P1.3 Build/testy/verze | TECHNICKY UZAVŘENO PRO DEVELOPMENT | Každý nový commit musí projít vlastní kompletní pipeline a odpovídat READY deploymentu. |
| P1.4 Nasazení/rollback | ČÁSTEČNĚ | Kontrola SHA/READY, preflight a dostupná záložní 1.7.66. Skutečné přepnutí a obnovení preview aliasu není provedeno: aktuální chráněná preview URL vracela 302 do Vercel SSO, ani sdílená URL nezpřístupnila skutečnou HTTP 200 stránku. Main ani alias nepřepínat naslepo. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Ruční zálohy a shadow test existují; úplná nezávislá obnova a soukromý export na iPhonu chybí. |
| P2.1 Start PWA | ČÁSTEČNĚ | Trojité měření v Chromiu bylo integrováno do CI ve starším balíku; fyzické Safari a jeho časy chybí. |
| P2.2 Rozložení/CSS | ČÁSTEČNĚ | Shodná geometrie TO/MO ověřovaná Chromium; nutné fyzické Safari a ostatní vizuální prvky. Absence se nemění. |
| P2.3 Offline/konflikty | ČÁSTEČNĚ – NOVÁ DÍLČÍ OPRAVA | Kandidát 1.7.68 přidává kontrolu identity editoru, otisku jeho hodnot a pořadí požadavku bezprostředně před použitím online odpovědi. Změna během načítání, nečitelný editor nebo opožděná odpověď nesmějí přepsat nový návrh. Deset izolovaných testů prošlo, ale celá CI/Safari ještě musí projít. Zbývá ruční správa konfliktů, staré PWA, měsíční RPC bez CAS a iPhone. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Reálné JWT, výkon a soukromí telemetrie. Žádná osobní data nová kontrola neukládá ani nevypisuje. |

**Bilance: 2/13 uzavřené, 11/13 částečných.** Dokud není kompletní Actions SUCCESS a Vercel READY stejného SHA, neoznačovat kandidáta 1.7.68 za vydaný. Nepoužívat produkční data pro záměrné kolize a nemazat PWA úložiště.

**Zaměřená iPhone kontrola po úspěšném vydání:** v Administraci → Rozpisy začít ruční načtení online, při pomalejším spojení změnit místní pole a zkontrolovat, že příchozí výsledek novou úpravu nepřepíše. Bez zápisu na server; zkoušet jen bezpečně v TEST prostředí. Dále ověřit shodné šířky MO/TO bez horizontálního scrollu.
