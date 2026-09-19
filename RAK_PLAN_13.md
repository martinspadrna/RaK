# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; větev `development`, testovací verze 1.7.44. Jde o dílčí bezpečnostní opravy, nikoliv potvrzení úplného auditu. Režim přihlášení pracovníků: **OS číslo** a nic dalšího; bez hesla, e-mailu a zaměstnaneckých Supabase Auth účtů. `main` a produkční databázi neměnit bez výslovného souhlasu.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Anonymní úplný adresář a OS čísla nejsou přímo veřejně čitelná. Dále ověřit RPC/exporty a HTTP/JWT; OS číslo není silné ověření identity. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Soukromý archiv `importMeta` (1.7.40), bezpečnější výběr sloupců, blokace vnořených tajných polí. **1.7.44** upřesňuje kontrolu formátu telefonu a odmítá označená česká telefonní/OS čísla ve volném textu; 13 syntetických SQL případů v TEST DB prošlo bez změny dat. Jména, absence, běžné poznámky a **24 měsíců historie zůstávají anonymně čitelné**. Neukrývat je destruktivním smazáním: generátor z textu detekuje odstávky, statistiky využívají person/code/text, offline funguje z lokálního snapshotu. Chybí kompatibilní autorizovaný model. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Veřejné RPC částečně omezené; zbývá kompletní audit exportů, reálný browser/HTTP test a inventarizace všech veřejných cest k rotaci. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverové podmínky a SQL matice existují; zbývá test reálné relace, dalších adminů a obnovy přístupu. |
| P1.1 | Oprávnění a RLS | OTEVŘENO | Přezkoumat role, policies, SECURITY DEFINER funkce a nový rozsah kontrolního CHECK. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit hesel, kompromitovaných relací a jejich rušení; zaměstnanců se netýká. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Release gate 1.7.39–1.7.44, testovací DB izolace, dvě úplná sestavení v GitHub Actions, nová SQL a unit regresní matice. Zbývá iPhone smoke, úplný ZIP a produkční reprodukovatelnost. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Jeden tematický commit/preview build. Produkční alias a rollback neměnit bez výslovného souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | 1.7.42 zařazuje 12 soukromých záznamů importů do owner-only ZIPu; 1.7.44 nemění historii ani revize. Zbývá ověřit ZIP na iPhonu, kompletní obnovu a konfliktní scénáře. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený a teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Změřit přepínání obrazovek bez vizuálních regresí. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Rozpis se ukládá i lokálně; zbývá ověřit přechod online/offline, starší snapshot a PWA upgrade. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Doplnit skutečná měření, logy a regresní prahy. |

**Bilance: 0/13 plně uzavřených.** Zlepšení kontroly veřejných vstupů není náhradou skutečně neveřejného rozpisu.

**Další kroky:** (1) inventarizovat všechny konzumenty `months.*.notes`, připravit oddělené soukromé důvody a odvozené neosobní příznaky odstávek, rozhodnout kompatibilní klientský/offline model; (2) P0.3/P0.4/P1.1 audit RPC, exportů a rolí; (3) reálná zkouška ZIP restore a admin relací; (4) iPhone/offline výkon. Nezavádět zaměstnancům další přihlašovací údaj.
