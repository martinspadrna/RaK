# RaK — stav plánu po balíku 1.7.60 (20. 9. 2026)

Navazuje na `RAK_PLAN_13.md`, nemění přijatá rizika ani historii. Pracovní větev pouze `development`, technická verze `1.7.0`, testovací databáze `cgshssdjgzzuprlwnabl`. Změny 1.7.60 se považují za vydané až po úspěšném GitHub Actions a Vercel READY se stejným SHA. Všechny lokální testy nenahrazují fyzické iOS Safari.

| Bod | Stav | Doložené kroky / zbývá |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | Anonymní adresář uzavřen, lookup v2. Zbývají staré verze, exporty a skutečné rolové relace. |
| P0.2 Soukromí rotace | UZAVŘENO ROZHODNUTÍM | Veřejné čtení jmen a provozních údajů je vědomě přijaté riziko, nikoliv odstraněné. |
| P0.3 API a exporty | ČÁSTEČNĚ | Anonymní HTTP sondy, kontroly ZIP; zbývá reálné owner/admin/deputy JWT, stará PWA, fyzický export. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Odvolání relací, čtecí diagnostika; zbývá skutečná role a iPhone. |
| P1.1 RLS | ČÁSTEČNĚ | Základní RLS a SQL matice; skutečná podepsaná JWT všech rolí ještě neotestována. |
| P1.2 Admin hesla / relace | ČÁSTEČNĚ | Vazby na Auth a odvolání; zbývá fyzický test zařízení. |
| P1.3 Build a testy | UZAVŘENO TECHNICKY | Dva buildy, check, smoke, historické testy, ZIP CRC, Chromium offline a testovací HTTP; každý nový SHA se ověřuje znovu. |
| P1.4 Nasazení a rollback | ČÁSTEČNĚ | Postup zdokumentován; praktický preview rollback stále chybí. |
| P1.5 Zálohy | ČÁSTEČNĚ | ZIP a kontrola shadow obnovy; 1.7.60 přidává ruční lokální export původních bajtů fronty bez uploadu při konfliktu či poruše. Stažení iPhonem ani úplná izolovaná obnova nejsou potvrzené. |
| P2.1 Výkon PWA | ČÁSTEČNĚ | Chromium test; fyzické Safari a měřicí prahy chybí. |
| P2.2 Načítání/CSS | ČÁSTEČNĚ | Mobilní emulace; fyzické obrazovky a role zbývají. |
| P2.3 Offline/cache | ČÁSTEČNĚ | 1.7.59 synchronizace potvrzena uživatelem na iPhonu. 1.7.60 chrání nečitelnou frontu před přepsáním, ověřuje zápis do localStorage a zachovává souběžně upravené ID; chybí serverový atomický CAS a ruční vypořádání konfliktů po skutečném porovnání s DB. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Bezobsahová diagnostika, 1.7.60 červený stav poruchy uložiště a dobrovolný lokální export. Zbývá ověřit na iPhonu a bez osobních údajů v telemetrii. |

**Bilance 2/13 uzavřené, 11/13 částečné.** P0.2 je uzavřené rozhodnutím o přijetí rizika, P1.3 technicky v development CI. Záloha obsahuje citlivé lokální údaje; uživatel ji spouští výslovným potvrzením a má ji uchovávat v soukromí. Stahovací akce není důkazem, že iOS soubor skutečně uložil. Neodstraňovat lokální data při konfliktu.

**Příští tematický balík:** bezpečná manuální rekonciliace konfliktů nad potvrzeným stavem serveru a atomický CAS pro herní stav; až poté možnost odstranit jednotlivou lokální položku s doloženou zálohou. Samostatně reálné JWT rolí a nezávislá obnova se souhlasem k nákladům.
