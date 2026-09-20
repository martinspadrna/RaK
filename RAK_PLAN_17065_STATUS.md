# RaK – stav plánu po kandidátu 1.7.65 (20. 9. 2026)

Pracovat výhradně na `development`, TEST Supabase `cgshssdjgzzuprlwnabl`; `main` ani produkční DB neměnit. Viditelná verze 1.7.65; technická package verze `1.7.0`. Kandidát lze označit za nasazený pouze po dvou úspěšných sestaveních, Actions SUCCESS, správném SHA a Vercel READY. Test v Chromiu není fyzický iPhone. Hry jsou odstraněny z RaK; historické herní tabulky/frontu bez zálohy nedestruovat.

| Bod | Stav | Konkrétní dokončení / blokace |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | OS-only s přijatým rizikem, v2 lookup, anonymní adresář zamčen. 1.7.65 odstraní nechtěné vytváření herních profilů při uložení pracovníků. Zbývají staré exporty/PWA a skutečná rolová JWT. |
| P0.2 Soukromí rotace | UZAVŘENO ROZHODNUTÍM | 24 měsíců a jména při OS-only veřejně čitelná. Vědomě přijaté riziko, ne technická oprava. |
| P0.3 API a exporty | ČÁSTEČNĚ | Anon/invalid JWT HTTP testy, ZIP CRC, ošetřený soukromý lokální export. Zbývá reálný owner/admin/deputy token, chráněné Vercel preview a iPhone soubor. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Owner RPC, revokace; skutečné relace všech rolí a reálný iPhone chybí. |
| P1.1 RLS a oprávnění | ČÁSTEČNĚ | SQL syntetické matice a anonymní HTTP; skutečné podepsané JWT a všechny privilegované RPC chybí. |
| P1.2 Hesla/relace | ČÁSTEČNĚ | Oddělená Auth relace a revokace; test starých a nových fyzických zařízení chybí. |
| P1.3 Build/testy | TECHNICKY UZAVŘENO PRO DEVELOPMENT | Dva buildy s check/smoke, historické gates, source ZIP CRC, Chromium a live TEST anon HTTP; každý release musí být samostatně ověřen. |
| P1.4 Nasazení/rollback | ČÁSTEČNĚ | Ověření SHA, aliasu a READY. Skutečný bezpečný preview rollback dosud neproveden, na main nesahat. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Owner/source ZIP, stínová DB obnova, záloha lokální fronty. 1.7.65 konečně pokrývá skutečné tlačítko Uložit rozpis: samostatná ověřená záloha měsíce, uchování při každé chybě a ruční export i po opětovném otevření admina. Nezávislá plná obnova Auth/Storage/data a iPhone download chybí. |
| P2.1 Start PWA | ČÁSTEČNĚ | Chromium start/offline; chybí opakované měření časů a fyzický iPhone. |
| P2.2 Rozložení/CSS | ČÁSTEČNĚ | MO/TO datum upraveno ze 86 na 82 px, sloupec 84 px; absence nedotčeny; browser test musí ověřit celé datum a směnu při 16 px bez překryvu. Chybí fyzické Safari. |
| P2.3 Offline a konflikty | ČÁSTEČNĚ | Hlavní rotace má serverový CAS, neznámá revize fail-closed. Skutečné UI ukládání nyní chrání ověřený lokální návrh PŘED RPC a při nejisté odpovědi ho nedestruktivně ponechá; při nefunkčním storage síťový zápis nespustí. Staré PWA, ruční vypořádání obsahu konfliktu a fyzický iPhone stále chybí. Samostatné staré měsíční tabulky nebyly používány v TEST, jejich RPC nemá CAS – neoznačovat kompletní ochranu. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Sanitizovaná diagnostika sync a revize, nově ručně dostupný seznam anonymních časových metadat lokálních návrhů a tlačítko k soukromému stažení bez auto-odesílání. Zbývá soukromí celé telemetrie, role JWT, iPhone a měření. |

**Bilance 2/13 uzavřené, 11/13 částečně/otevřené.** Nefalšovat uzavření kvůli samotnému releasu. Opravy 1.7.64 se týkaly starší JSON cesty, nikoli hlavního UI tlačítka; 1.7.65 toto napravuje na skutečně volané `saveAdminRotationFromDom` s regresními VM testy a obnovitelnou soukromou kopií. Při opakované instalaci ponechat starší místní návrhy nedotčené a nikdy automaticky nepřepsat online rozpis.

**Následující prioritní blok:** dokončit souběžné ukládání dalších skutečně aktivních admin operací a serverové revize měsíčních zápisů až po ověření používání; fyzická iPhone kontrola obou rozpisů, exportu a offline; JWT rolová matice z legitimních testovacích relací; preview rollback bez zásahu do `main`; samostatná kompletní obnova až po potvrzení nákladů. Žádné herní účty ani CAS herních relací.

**Na iPhonu pro 1.7.65 ověřit pouze:** MO/TO datum se směnou bez ořezu, Absence beze změny, Administrace → Rozpisy nabízí uchované místní návrhy po opětovném otevření a stahuje je jen po kliknutí a souhlasu. Netvořit schválně konflikt ve skutečném rozpisu a nikdy nesmazat PWA data; lokální JSON obsahuje jména a musí zůstat soukromý.
