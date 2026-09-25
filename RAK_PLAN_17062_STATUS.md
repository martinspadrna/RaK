# RaK – stav plánu 13 bodů po kandidátu 1.7.62 (20. 9. 2026)

Větev výhradně `development`, pouze TEST Supabase `cgshssdjgzzuprlwnabl`, technická verze `1.7.0`. Stav "nasazeno" platí teprve po úspěchu nezávislých GitHub Actions, kontrole odpovídajícího SHA a Vercel READY. Fyzické iOS Safari nelze nahradit Chromiem. Nemaž data PWA ani lokální čekající změny. Výchozí audit a historický kontext jsou v `RAK_HANDOFF.md` a ve stavech 1.7.60/61.

| Bod | Stav | Nový důkaz / zbývá |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | Omezený OS-only lookup, staré PWA a staré exporty bez fyzického ověření. |
| P0.2 Rotace a soukromí | UZAVŘENO ROZHODNUTÍM | Veřejná rotace zůstává přijatým rizikem OS-only režimu, nikoli zabezpečeným soukromým přístupem. |
| P0.3 API a exporty | ČÁSTEČNĚ | Anonymní HTTP, ZIP integrita; zbývají reálné podepsané JWT různých rolí. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Serverové relace; zbývá ověřit owner/admin/deputy na reálném účtu. |
| P1.1 Oprávnění a RLS | ČÁSTEČNĚ | SQL matice, live anon test; skutečné oprávněné RPC testy chybí. |
| P1.2 Hesla a relace | ČÁSTEČNĚ | Odvolání relací připraveno; fyzická zkouška různých zařízení chybí. |
| P1.3 Build/testy | UZAVŘENO TECHNICKY PRO DEVELOPMENT | Dva buildy, check, smoke, historické testy, browser/offline, ZIP/CRC, skutečné anon HTTP, přesné SHA; každý nový SHA ověřit samostatně. |
| P1.4 Nasazení/rollback | ČÁSTEČNĚ | Zkušební preview rollback dosud neproveden, `main` nedotčen. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Owner ZIP a ruční místní záloha fronty z 1.7.60; samostatná kompletní obnova zatím chybí. |
| P2.1 Výkon | ČÁSTEČNĚ | Mobilní Chromium, ale opakovaná měření a iPhone bez výsledku. |
| P2.2 CSS/DOM | ČÁSTEČNĚ – 1.7.61/62 | Veřejná i admin absence mají užší jména a širší datum; editace MO/TO je nově 86 px namísto 90 px, písmo data i absencí 16 px. Ověřit následným Chromium testem; fyzické Safari a screenshoty zbývají. |
| P2.3 Offline/synchronizace | ČÁSTEČNĚ – 1.7.60/62 | Nejednoznačná historická fronta se nebude potichu přepisovat nebo zkracovat; zápis se bezpečně odmítne a lze uložit originální zálohu. Atomické serverové CAS, bezpečné ruční vypořádání konfliktu a staré PWA zbývají. |
| P2.4 Diagnostika | ČÁSTEČNĚ – 1.7.62 | Ruční diagnostika přidává pouze bezpečné počty zadržených a ostatních úloh, stav potvrzeného čtení; výslovně říká, že neporovnává obsah serveru. Bez automatického mazání, uploadu a bez vystavování jmen/ID/payloadu. Chybí reálné iPhone/JWT ověření. |

**Bilance: 2/13 uzavřených, 11/13 částečných/otevřených.** Přijetí rizika P0.2 není technické zabezpečení. Automatika nenahrazuje fyzický iPhone ani nezávislou obnovu. Další velký tematický balík: atomické CAS na izolovaném TEST schématu, plán bezpečného ručního vypořádání pod ověřenou admin relací bez přepsání serveru; poté skutečné přihlášení rolí a nezávislá obnova teprve po schválení nákladů.

Kontrola na iPhonu pouze: Administrace → Rozpisy → MO/TO datum se směnou (bez překryvu), Absence veřejně/admin (datum, jména) a ruční klepnutí na sync badge jen když čekají položky. Neposílat nezabezpečeně soukromý JSON export fronty.
