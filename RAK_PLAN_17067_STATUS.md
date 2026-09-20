# RaK – stav po kandidátu 1.7.67 (20. 9. 2026)

Pouze `development`, TEST Supabase `cgshssdjgzzuprlwnabl`; `main` a produkční DB neměnit. Viditelně `1.7.67`, technická verze `1.7.0`. Kandidát je dokončen až po dvou celých buildech, Actions SUCCESS, CRC archivu, skutečném browser testu a Vercel READY na stejném SHA. Test Chromium není fyzický iPhone. Žádné nové hry ani herní účty.

| Bod | Stav | Doloženo / kritérium uzavření |
|---|---|---|
| P0.1 Pracovní účty | ČÁSTEČNĚ | Omezené OS-only přihlášení a zakázaný anonymní adresář; riziko samotného OS čísla přijato. Chybí audit historických exportů/PWA a reálné role JWT. |
| P0.2 Veřejná rotace | UZAVŘENO ROZHODNUTÍM | Veřejné čtení jmen a 24 měsíců rotace je vědomě přijaté riziko, ne technická oprava; citlivé absence nesdílet. |
| P0.3 API/exporty | ČÁSTEČNĚ | HTTP anonymní sondy, ZIP/CRC, privátní ruční export; reálné JWT, Vercel preview přístup a iPhone download chybí. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Owner RPC, odvolání relací; stále nutné fyzické ověření owner/admin/deputy. |
| P1.1 RLS a oprávnění | ČÁSTEČNĚ | Syntetické SQL matice/anon HTTP, chybí skutečné privilegované JWT RPC. |
| P1.2 Hesla/relace | ČÁSTEČNĚ | Oddělená Auth relace a revokace, chybí ověření na starém/novém iPhonu a skutečné role. |
| P1.3 Build/testy/verze | TECHNICKY UZAVŘENO PRO DEVELOPMENT | Dva celé buildy, npm check/smoke, historické/final gates, ZIP CRC, Chromium start/offline, TEST HTTP; 1.7.67 navíc browser geometrie OBOU tabulek a VM fail-closed reload. Každá verze vyžaduje vlastní zelený CI běh. |
| P1.4 Nasazení/rollback | ČÁSTEČNĚ | READY, SHA a alias se ověřují; skutečný nedestruktivní preview rollback chybí, na main nesahat. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Owner ZIP, částečná shadow DB obnova, ověřená místní záloha při ukládání/navigaci. 1.7.67 opravuje reálné tlačítko Načíst online: při zrušení/selhání bez překreslení editoru, při neúspěchu obnoví dirty příznak; cache nesmí předběhnout vzdálená data. Chybí úplná nezávislá obnova a iPhone export. |
| P2.1 Start PWA | ČÁSTEČNĚ | Chromium cold/offline/recovery; opakované časy a Safari chybí. |
| P2.2 Rozložení/CSS | ČÁSTEČNĚ | 1.7.67 sjednocuje skutečný editor TO a MO: datum 84 px, každý stroj/jméno 52 px, samotný vstup 50 px; pět polí v 344 px. Absence se nemění. Chromium porovná oba stoly po sloupcích a ověří absenci scrollu. Fyzické potvrzení Safari a ostatní vizuální prvky chybí. |
| P2.3 Offline/konflikty | ČÁSTEČNĚ | Server CAS hlavní rotace a fail-closed neznámá revize; 1.7.67 opravuje únik změn při canceled/failed online reload a přepsání stale cache. Ruční řešení konfliktu, staré PWA, nepoužívaná měsíční RPC bez CAS a fyzický iPhone čekají. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Bezobsahové revize/fronta a ruční export návrhů. Reálné JWT, výkon a soukromí celé telemetrie chybí. |

**Bilance 2/13 uzavřené, 11/13 otevřených nebo částečných.** P0.2 je pouze přijaté riziko. Nedeklarovat uzavření P2.2 bez fyzického potvrzení. Nepovažovat Chrome za Safari.

**Následující dokončovací blok:** 1) iPhone potvrzení, že TO a MO mají stejná pole i datum a bez horizontálního scrollu; 2) skutečné Safari testy soukromého exportu a neuloženého návrhu bez záměrného konfliktu online dat; 3) bezpečný preview rollback bez změny main po předchozím ověření identity aliasu; 4) owner/admin/deputy JWT matice z legitimních testovacích relací; 5) úplná separátní obnova jen po schválení nákladů.

**Na iPhonu testovat nyní:** Administrace → Rozpisy – porovnat na jednom dni obě pětice jmen, šířky polí i data; žádné boční posouvání. U rozepsaného neuloženého rozpisu stisknout Načíst online a zrušit potvrzení: jména musí zůstat v editoru. Záměrně nepřepisovat online rozpis; nemaž PWA úložiště, JSON obsahuje osobní údaje.