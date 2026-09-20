# RaK — stav plánu po verzi 1.7.61 (20. 9. 2026)

Pracovní větev výhradně `development`; technická verze `1.7.0`; jen TEST Supabase `cgshssdjgzzuprlwnabl`. Navazuje na `RAK_PLAN_13.md` a `RAK_PLAN_17060_STATUS.md`. Nový stav označit za nasazený až po GitHub Actions SUCCESS a Vercel READY pro stejné SHA. Chromium není skutečný iPhone a automatické testy nesmějí nahrazovat uživatelskou kontrolu rozpisu. Nevymazávat lokální neodeslaná data.

| Bod | Stav | Doložené kroky / zbývá |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | Anonymní adresář uzavřen a lookup v2; zbývají historické exporty, staré PWA a skutečná autentizace rolí. |
| P0.2 Soukromí rotace | UZAVŘENO ROZHODNUTÍM | Veřejná část rotace je přijímané riziko OS-only režimu, nikoli odstraněné bezpečnostní riziko. |
| P0.3 API a exporty | ČÁSTEČNĚ | CI anonymní HTTP a ZIP kontroly; zbývají podepsaná JWT rolí, stará PWA a fyzický iPhone export. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Kontroly relací a čtecí diagnostika; zbývají skutečná přihlášení vlastníka/správce/zástupce. |
| P1.1 RLS | ČÁSTEČNĚ | SQL matice a anonymní HTTP; zbývá úplné ověření privilegovaných RPC skutečnými JWT. |
| P1.2 Admin hesla a relace | ČÁSTEČNĚ | Vazba zařízení a odvolání; zbývají reálné testy relací na fyzických zařízeních. |
| P1.3 Build a testy | UZAVŘENO TECHNICKY | Dva celé buildy, check, smoke, historické gates, záložní ZIP CRC, anonymní HTTP a Chromium offline. 1.7.61 navíc geometricky kontroluje datum/směnu a absenci v reálném Chromium. Každý SHA se ověřuje samostatně. |
| P1.4 Nasazení a rollback | ČÁSTEČNĚ | Postup zdokumentován; skutečná zkouška rollbacku preview dosud chybí. |
| P1.5 Zálohy | ČÁSTEČNĚ | Zdrojové ZIP, shadow restore a lokální export fronty 1.7.60; fyzický iOS export a úplná nezávislá obnova chybí. |
| P2.1 Výkon PWA | ČÁSTEČNĚ | Mobilní Chromium; zbývají opakovaná měření na fyzickém Safari a prahové hodnoty. |
| P2.2 Načítání, CSS a DOM | ČÁSTEČNĚ — POSUN 1.7.61 | Veřejná i administrátorská tabulka absencí: jmenné sloupce cca o 10 % užší, uvolněný prostor pro datum. Admin editace tvrdoty/měkoty: datum se směnou širší; absence v administraci také. Přidány automatické testy geometrie, ořezu textu a překryvu; zbývá vizuální potvrzení na iPhonu. |
| P2.3 Offline/cache | ČÁSTEČNĚ | Potvrzená synchronizace 1.7.59 na iPhonu; 1.7.60 chrání uložiště a souběžně změněné ID. Zbývá atomický serverový CAS, ruční vypořádání konfliktů a staré PWA. Balík 1.7.61 frontu ani databázi nemění. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Bezobsahová diagnostika a lokální záloha fronty; zbývá fyzické ověření a skutečná diagnostika rolí bez úniku dat. |

**Bilance: 2/13 uzavřených (P0.2 přijaté riziko, P1.3 technicky), 11/13 částečně hotových.** Verze 1.7.61 je tematický balík tří souvisejících změn rozpisů plus viditelný datum/směna a geometrický regresní test. Nezasahuje do `main` ani databáze a nemění pravidla generátoru. Při iPhone ověření zkontrolovat pouze Rotace → Rozpisy → Absence, Administrace → Rozpisy → Absence a zadávací tabulky tvrdoty/měkoty. Následuje bezpečné ruční řešení konfliktů podložené serverovým stavem a atomický CAS; bez důkazu není nic označeno jako dokončené.
