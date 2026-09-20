# RaK – průběžný stav 1.7.66 (20. 9. 2026)

Pouze `development`, oddělená TEST Supabase `cgshssdjgzzuprlwnabl`; `main` a produkční DB bez zásahů. Viditelná testovací verze `1.7.66`, technická `1.7.0`. Označit za hotovou pouze po dvou buildech, Actions SUCCESS, archivní CRC, skutečném Chromium a Vercel READY se stejným SHA. Prohlížeč Chromium nenahrazuje fyzické Safari.

| Bod | Stav | Doložené dokončené kroky a konkrétní překážka uzavření |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | V2 omezený login, anonymní adresář zamčen, herní profily se nevytvářejí. OS-only je vědomé riziko. Chybí audit starých exportů/PWA a role pod reálným JWT. |
| P0.2 Veřejná rotace | UZAVŘENO ROZHODNUTÍM | Anonymní přístup ke jménům a 24 měsícům rotace je přijaté riziko, nikoli technické zabezpečení. Citlivé důvody absence nesdílet. |
| P0.3 API a exporty | ČÁSTEČNĚ | Anonymní HTTP testy, bezpečný ZIP/CRC, soukromý ruční JSON. Chybí reálné přihlášené role, Vercel preview SSO, Safari ZIP. |
| P0.4 Vlastnické role | ČÁSTEČNĚ | Revokace a owner RPC; zbývá fyzická role owner/admin/deputy, podepsané JWT a iPhone. |
| P1.1 RLS a oprávnění | ČÁSTEČNĚ | RLS/SQL matice a HTTP bez relace otestovány, chybí úplná matice privilegovaných RPC s reálnými rolemi. |
| P1.2 Hesla/relace | ČÁSTEČNĚ | Auth relace a revokace; zbývá ověřit staré/nové fyzické zařízení a role. |
| P1.3 Build, testy, verze | TECHNICKY UZAVŘENO PRO DEVELOPMENT | Při každém commitu dva celé buildy, `npm run check`, smoke, historické brány, ZIP CRC, Chromium offline a TEST HTTP; 1.7.66 rozšiřuje skutečný CSS test MO a regresní testy neuložených změn. Každý release znovu ověřit. |
| P1.4 Nasazení, rollback | ČÁSTEČNĚ | SHA, development alias, READY a obnovovací postup ověřovány. Skutečný nedestruktivní preview rollback neproveden. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Owner ZIP + částečná shadow obnova; 1.7.65 ověřený JSON při ukládání, **1.7.66 ověřený místní návrh navíc před přepnutím měsíce, roku, návratem a online reloadem**; při selhání uložení do telefonu přepnutí zablokováno, žádné automatické přepsání serveru. Zbývá kompletní izolovaná obnova Auth/Storage/dat a fyzický export na iPhonu. |
| P2.1 Start PWA | ČÁSTEČNĚ | Start/offline/online Chromium; chybí opakovaná měření výkonu a Safari. |
| P2.2 Rozložení/CSS | ČÁSTEČNĚ | 1.7.66 odstraní roztažení jmenných sloupců MO: datum 84 px + 48 px na každé jméno, vstupy 46 px, pět jmen 324 px, TO/Absence beze změny. Nový Chromium měří skutečnou geometrii a horizontální scroll. Fyzické potvrzení na iPhonu stále chybí. |
| P2.3 Offline/konflikty | ČÁSTEČNĚ | Hlavní rotace má serverový CAS, neznámá revize se neukládá. 1.7.65 ošetřila hlavní tlačítko, 1.7.66 chrání také navigaci a online reload proti zahození rozepsané práce. Zbývá ručně vyřešit obsah konfliktů, staré PWA/iPhone; nepoužívaná historická měsíční RPC nemají CAS. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Bezobsahová diagnostika fronty a revizí, ruční export uložených návrhů; zbývá reálné JWT/Safari, soukromí telemetrie a měřené limity. |

**Bilance: 2/13 uzavřené, 11/13 částečné.** Technický dokončený podúkol v 1.7.66: konkrétní ztráta rozepsaného rozpisu při běžném přepnutí nebo ručním online načtení má testovanou ochranu; celou P1.5 ani P2.3 to neuzavírá. Nenavyšovat bilanci bez naplnění celého kritéria.

**Cíl dalšího balíku:** ověřit přepnutí a pět polí MO fyzicky na iPhonu; poté uzavřít mobilní vizuální akceptaci P2.2 a připravit zkušební preview rollback P1.4 bez zásahu do main. Reálné JWT rolové testy vyžadují legitimní testovací relace, nesbírat hesla ani tokeny do logů. Plná oddělená obnova jen po schválení nákladů. Žádné hry, herní účty ani herní CAS.

**iPhone kontrola 1.7.66:** Administrace → Rozpisy → Měkota: pět jmen na jediném řádku bez horizontálního posunu, datum/TO/Absence zůstávají čitelné. Při editaci jednoho neprodukčního měsíce, klepnutí na jiný měsíc nabídne potvrzení uchované místní zálohy; zrušení ponechá rozepsaná pole. Netestovat úmyslným přepsáním skutečných online dat; nemazat PWA storage. Soukromý JSON obsahuje jména.