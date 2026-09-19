# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; větev `development`, testovací verze 1.7.45. Jde o dílčí bezpečnostní opravy, nikoliv potvrzení úplného auditu. Přihlášení běžných pracovníků: **OS číslo** a nic dalšího; bez hesla, e-mailu a zaměstnaneckých Supabase Auth účtů. `main` a produkční databázi neměnit bez výslovného souhlasu.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Anonymní úplný adresář není veřejně čitelný. 1.7.45 sjednocuje přihlášení a informaci o heslu admina v jednom již omezeném lookup RPC v2. OS číslo není silné ověření identity; zbývá reálný HTTP/JWT a export audit. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Soukromý archiv `importMeta` (1.7.40), ochrana tajných polí a vybraných údajů v poznámkách (1.7.44). Jména, absence, běžné poznámky a **24 měsíců historie zůstávají anonymně čitelné**. Generátor z poznámek rozpoznává odstávky; statistiky využívají person/code/text; offline ukládá snapshot. Neodstraňovat záznamy bez kompatibilního přístupového a offline modelu. |
| P0.3 | API a exporty | ČÁSTEČNĚ | 1.7.45 zavádí kombinované RPC s limity 300/h globálně a 60/h podle nedůvěryhodného síťového identifikátoru v podkladovém v1. Samostatný starý dotaz na administrátorský účet zůstává pro staré PWA dostupný, ale nyní má vlastní limity a při překročení selže uzavřeně. Po potvrzení přechodu starých klientů endpoint úplně uzavřít. Zbývá kompletní export/HTTP audit. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverové podmínky a SQL matice existují; administrátoři nadále zadávají heslo. Zbývá reálná relace, další admini a obnova přístupu. |
| P1.1 | Oprávnění a RLS | OTEVŘENO | Přezkoumat role, policies a všechny SECURITY DEFINER funkce. V2 je zamýšlená veřejná přihlašovací RPC, není náhradou skutečného ověření identity. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit hesel, kompromitovaných relací a jejich rušení; zaměstnanců se netýká. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Release gate 1.7.39–1.7.45, testovací DB izolace, dva úplné buildy v GitHub Actions a SQL test se skutečnými účty bez zveřejnění hodnot a s ROLLBACK. Zbývá iPhone smoke, ZIP a produkční reprodukovatelnost. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Vývoj pouze na development. Produkční alias a rollback neměnit bez výslovného souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | 1.7.42 doplňuje 12 soukromých importních záznamů do owner-only ZIPu; 1.7.45 nemění rotace a revize. Zbývá iPhone ZIP, úplná obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený a teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Změřit přepínání obrazovek bez vizuálních regresí. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Ověřit přechod online/offline, starší PWA/lookup v1 a aktualizaci. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Skutečná měření, logy a regresní prahy. |

**Bilance: 0/13 plně uzavřených.** Limity dotazů zpomalují hromadné hledání, ale nejsou autentizací. Veřejné rotace ani starý API endpoint dosud nejsou úplně soukromé.

**Další kroky:** (1) mapovat konzumenty `months.*.notes` a navrhnout soukromé důvody + neosobní odstávkové příznaky s kompatibilním offline modelem; (2) po reálném ověření klientů zrušit starý admin dotaz, dokončit API/export/RLS audit; (3) nezávislý ZIP restore, admin relace; (4) iPhone a offline výkon. Běžným uživatelům nepřidávat další přihlašovací údaj.
