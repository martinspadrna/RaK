# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; výchozí větev `development`, testovací verze 1.7.43. Tento soubor není potvrzením dokončeného auditu. „Hotovo“ až po nezávislém testu a ověření provozu. Zaměstnanci používají pouze OS číslo, bez hesla, e-mailu či zaměstnaneckých Supabase Auth účtů. `main` a produkční Supabase bez výslovného souhlasu neměnit.

| Bod | Oblast | Stav | Doložený výsledek / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Adresář a kompletní OS čísla nejsou anonymně čitelná. Zbývá ověřit RPC, exporty a HTTP/JWT test; OS číslo samo nepotvrzuje identitu. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Kontroly tajných polí/textů a odstranění `savedBy` trvají. 1.7.40 odděluje `importMeta` soukromě, chrání prázdný veřejný sloupec jména a zúží klientský SELECT. Jména, absence, poznámky a 24 měsíců historie jsou stále anonymně čitelné; jejich oddělení blokují závislosti zaměstnanců/statistik/offline a chybějící bezpečné ověření identity. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Veřejné RPC částečně omezené; zbývá kompletní audit exportů a reálný browser/HTTP test. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverové podmínky a SQL matice existují; zbývá test reálné relace, dalších adminů a obnovy přístupu. |
| P1.1 | Oprávnění a RLS | OTEVŘENO | Důkladně prověřit role, politiky a všechny SECURITY DEFINER funkce, včetně nového soukromého archivu. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit hesel, ochrany uniklých hesel a rušení relací; neplatí pro zaměstnance. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Gate 1.7.39–1.7.43 obsahuje kontrolu značek/databáze, unit testy a v GitHub Actions dva kompletní build průchody; 1.7.42 je na Vercelu READY; 1.7.43 opravuje zastaralý finální CI test a ověřuje nové PWA značky. Zbývá nezávislý iPhone smoke, ověření nového ZIPu a plná reprodukovatelnost na Vercelu. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Přehled verzí, jeden commit a jeden preview build na balík. Produkční alias stále přidělen chybnému starému deploymentu, i když `main` je opraven; rollback aliasu je bez souhlasu zakázán. |
| P1.5 | Integrita dat a zálohy | OTEVŘENO | Historie, zálohy, audity a revize ponechány. 1.7.42 přidává dosud vynechaných 12 soukromých importních záznamů do owner-only úplné zálohy, manifestu a README; anon přístup odmítnut SQL testem. Zbývá ověřit ZIP na iPhonu, úplný restore a konfliktní scénáře. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený/teplý start na reálném iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Změřit náklady přepínání obrazovek a cíleně optimalizovat bez vizuálních regresí. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Zmapováno, že localStorage obsahuje plný rozpis a SW cachuje vlastní assety. Zbývá test obnovy online, starých snapshotů a aktualizace PWA. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Doplnit reálná měření, logy a regresní prahy. |

**Bilance: 0/13** bodů plně uzavřeno. Změny P0.2, P1.3, P1.5 a P2.3 v 1.7.40–1.7.43 jsou dílčí; soukromá záloha `importMeta` neřeší veřejně čitelné absence.

**Pořadí dalších tematických balíků:** (1) P0.2 + P1.5: navrhnout autorizovaný model skutečně neveřejných poznámek, ověřit zachování statistiky/offline bez hesla pro zaměstnance; (2) P0.3 + P0.4 + P1.1: oprávnění, API, exporty a role; (3) P1.2–P1.4: provoz, admin relace, rollback po samostatném souhlasu; (4) P2.1–P2.4: výkon a offline měření.
