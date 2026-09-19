# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; větev `development`, testovací verze **1.7.46**. Dílčí opravy nejsou potvrzením úplného auditu. Zaměstnanci se přihlašují **pouze OS číslem** bez hesla, e-mailu a Supabase Auth účtu. `main` a produkční databáze vyžadují výslovný souhlas.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Anonymní úplný adresář uzavřen. Kombinovaný omezený login v2 (1.7.45); OS číslo není silné ověření identity. Zbývá reálný HTTP/JWT a export audit. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Importní provenience soukromá, tajné kontaktní hodnoty a admin autorství chráněny. **Jména, absence, běžné poznámky a 24 měsíců historie jsou stále anonymně čitelné.** Poznámky používá generátor, statistiky person/code/text, offline používá snímek; bez kompatibilního přístupového modelu veřejné čtení neuzavírat. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Login v2 sdílí omezení v1, starý admin dotaz má samostatné limity. 1.7.46 přidává globální limit keepalive 6000/h, deduplikaci zápisů za 15 s a omezení polí telemetrie. Reporty už dříve mají globální denní/hodinový limit. Staré PWA a kompletní HTTP/export audit zbývají. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Existují serverové podmínky a SQL matice, heslo pro admina zachováno. Zbývá reálné ověření více relací, dalších adminů a obnovy. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ | 1.7.46 ověřena anonymní práva k účtům, zálohám a keepalive, inventarizována veřejně spustitelná RPC a kontrola SECURITY DEFINER. Zbývá úplný audit implementací a ověření v HTTP/JWT. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit kompromitovaných relací a jejich rušení; zaměstnanců se netýká. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Release gate 1.7.39–1.7.46, dvě sestavení, kritické smoke, oddělená testovací DB a SQL testy s ROLLBACK. Zbývá iPhone smoke, ZIP a produkční reprodukovatelnost. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Pouze development; produkční alias ani rollback neměnit bez souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | 1.7.42 privátní importy součástí owner ZIP; 1.7.46 validovaný CHECK pro nově ukládané snímky rotací. Ověřen beze změny stav revize 50, 11 záloh a 12 importů. Zbývá iPhone ZIP, nezávislá obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený a teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Přepínání stránek a vizuální regrese. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Test online/offline, kompatibility starých PWA a aktualizace. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Skutečná měření, logy, regresní prahy. |

**Bilance: 0/13 plně uzavřených.** Nové limity snižují riziko zahlcení, ale nejsou autentizací. Veřejné rotace a staré API ještě nejsou plně uzavřeny.

**Další balík:** návrh a implementace neosobních odstávkových příznaků, oddělených důvodů absencí a kompatibilního offline čtení; poté uzavření starého admin dotazu po otestování starých klientů. Následně kompletní audit relací, reálné obnovení ZIPu a iPhone výkonnost.
