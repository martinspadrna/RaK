# RaK 1.7.63 – stav 13 bodů (20. 9. 2026)

Pracovní větev `development`; `main` a produkční Supabase nedotčeny. Technická verze `1.7.0`, viditelná testovací `1.7.63`. Prohlášení o úspěchu platí jen pro commit s dokončenými GitHub Actions, dvěma kompletními buildy, odpovídajícím Vercel READY a fyzickou kontrolu iPhonu odlišujeme od Chromia.

| Bod | Stav | Co máme / co zbývá |
|---|---|---|
| P0.1 Účty pracovníků | ČÁSTEČNĚ | Omezený lookup bez veřejného seznamu; staré PWA, exporty, skutečná role JWT. |
| P0.2 Soukromí rotace | UZAVŘENO ROZHODNUTÍM | Veřejná rotace zůstává přijatým rizikem OS-only režimu; nejde o technicky odstraněné riziko. |
| P0.3 API a exporty | ČÁSTEČNĚ | Anonymní HTTP, ZIP/CRC; reálné role JWT, export na iPhonu, stará PWA. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Revokace relací, omezené RPC; reální owner/admin/deputy bez logování tokenů. |
| P1.1 RLS a oprávnění | ČÁSTEČNĚ | SQL syntetická matice, anonymní HTTP; reálná podepsaná JWT a privilegované RPC. |
| P1.2 Hesla a relace | ČÁSTEČNĚ | Auth přihlášení, odvolávání a zařízení; fyzické ověření chybí. |
| P1.3 Build/testy | UZAVŘENO TECHNICKY PRO DEVELOPMENT | Dva buildy, check, smoke, historické gates, reálné Chromium offline, CRC a HTTP; každý commit potřebuje vlastní úspěšný run. |
| P1.4 Nasazení a rollback | ČÁSTEČNĚ | Ověření branch/SHA/READY; zkušební preview rollback chybí. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Source ZIP, DB shadow restore, volitelná lokální JSON záloha fronty; nezávislá plná obnova a iOS potvrzení chybí. |
| P2.1 Rychlost PWA | ČÁSTEČNĚ | Chromium start/offline; fyzický iPhone a opakovaná měření chybí. |
| P2.2 CSS/DOM | ČÁSTEČNĚ | Rozpisy/absence z 1.7.61–62 prošly browser geometrií; iPhone screenshoty zbývají. |
| P2.3 Offline a konflikty | ČÁSTEČNĚ – POSUN 1.7.63 | Neznámá výchozí revize už nepřebírá aktuální serverové číslo těsně před uložením: zápis je odmítnut. Při známé revizi zůstává DB `rak_admin_save_rotation_v2` atomický CAS s uzamčením, kontrolou revize a zálohou. Přímé obcházení admin RPC při měsíčním ukládání odstraněno. Shadow CAS test TEST DB proběhl bez trvalého zápisu. Další otevřené: game-session CAS, zabezpečená ruční obnova konfliktů a starší PWA. |
| P2.4 Diagnostika | ČÁSTEČNĚ – POSUN 1.7.63 | Ruční kontrola čísla revize vyžaduje síťové `auth.getUser()` a kontrolu admin kontextu; ukazuje výhradně stav revize, ne payload, jména ani token. Bez smazání, přepsání či automatického replaye. Zbývá reálný iPhone/JWT a měření. |

**Bilance 2/13 uzavřeno, 11/13 otevřeno/částečně.** P0.2 je rozhodnutí o riziku, nikoli odstranění. V této verzi nebyla změněna DB schémata ani produkce. Test na TEST DB byl `BEGIN` → dočasná tabulka s revizí 7 → podmíněný zápis 7→8 úspěšný → opožděný zápis s revizí 7 odmítnut → ověření payloadu → `ROLLBACK`. Nešlo o test reálné souběžné admin relace ani game-session CAS.

**Na iPhonu cíleně:** potvrdit 1.7.63, při běžném admin uložení rozpisu načíst nejprve online výchozí verzi. Když se zobrazí chyba neověřené revize, nezkoušet ji obejít: zkopírovat neuložené změny bezpečně a potom obnovit online rozpis. Pokud je stav konfliktu, klepnutí na badge umožní pouze ruční porovnání čísla revize, případně export soukromé zálohy fronty. Lokální data PWA nemaž.

**Další balík:** oddělené atomické CAS pro game-session po ověření aktivního herního RPC a autorizace; bez otevření veřejného `SECURITY DEFINER` zápisu. Poté reálná rolová JWT matice a bezpečná ruční rekonstrukce s nezávislou zálohou; plný samostatný Supabase restore až po schválení nákladů.
