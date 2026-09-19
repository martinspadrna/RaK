# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; větev `development`, testovací verze **1.7.47**. Dílčí opravy nejsou potvrzením úplného auditu. Zaměstnanci se přihlašují **pouze OS číslo** bez hesla, e-mailu a Supabase Auth účtu. `main` a produkční databáze vyžadují výslovný souhlas.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Anonymní úplný adresář uzavřen. Kombinovaný omezený login v2 (1.7.45); OS číslo není silné ověření identity. Zbývá reálný HTTP/JWT a export audit. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Importní provenience `importMeta` je soukromá, tajné kontaktní hodnoty a admin autorství chráněny. 1.7.47 navíc odmítá vnořené identifikátory typu `accountNumber`, `osNumber`, `userId`, `workers` ve veřejných nových rotacích. **Jména, absence, běžné poznámky a 24 měsíců historie zůstávají anonymně čitelné.** Všech 346 aktuálních poznámek obsahuje jméno, kód i text; generátor čte `note.text`, statistiky `person/code/text`, offline používá celý snímek. Bez kompatibilního přístupového modelu veřejné čtení neuzavírat. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Login v2 sdílí omezení v1, starý admin dotaz má samostatné limity. 1.7.46 keepalive 6000/h, deduplikace 15 s a omezení polí telemetrie. 1.7.47 nový serverový guard proti zapsání osobních identifikátorů do veřejných nastavení strojů. Staré PWA a kompletní HTTP/export audit zbývají. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Existují serverové podmínky a SQL matice, heslo pro admina zachováno. Zbývá reálné ověření více relací, dalších adminů a obnovy. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ | Inventarizována veřejná RPC. 1.7.47 přidán trigger na veřejná nastavení, zachována výjimka pro RLS-skryté zálohy, soukromý seznam a admin audit; anonymní volání validačních funkcí a čtení záloh zamítnuto. Zbývá úplný audit RLS, SECURITY DEFINER a HTTP/JWT. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit kompromitovaných relací a jejich rušení; zaměstnanců se netýká. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Release gate 1.7.39–1.7.47, dvě sestavení, kritické smoke, oddělená testovací DB a SQL testy s ROLLBACK. Zbývá skutečný iPhone smoke, ZIP a produkční reprodukovatelnost. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Pouze development; produkční alias ani rollback neměnit bez souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | 1.7.42 privátní importy součástí owner ZIP; 1.7.46 top-level CHECK a 1.7.47 nové ověření hard/soft/notes/dayMods i povinných polí poznámek každého měsíce. Ověřeno 11/11 historických záloh, revize 50, 50 nastavení, 12 importů bez trvalé změny obsahu. Pozor: historických 11 owner-only snapshotů obsahuje `importMeta`; jsou chráněné přístupovými právy, ne zpětně anonymizované. Zbývá iPhone ZIP, nezávislá obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený a teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Přepínání stránek a vizuální regrese. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Test online/offline, kompatibility starých PWA a aktualizace. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Skutečná měření, logy, regresní prahy. |

**Bilance: 0/13 plně uzavřených.** Ochrana nových identifikátorů a integrita záloh nejsou autentizací. **Aktivní veřejná rotace a 24 měsíců historie zůstávají anonymně čitelné**, protože běžný uživatel nemá ověřenou identitu nad rámec snadno zjistitelného OS čísla.

**Další souvislý balík:** příprava oddělení osobních důvodů absencí od neosobních signálů, nová čtecí API a kompatibilní offline model. Při skutečném omezení čtení musí být současně zachovány statistiky/generátor/staré PWA; ověřit na telefonu před cutover. Poté starý admin dotaz, úplný audit relací, nezávislá obnova ZIP a výkon. Není dovoleno tiše přidat zaměstnancům heslo ani předstírat, že OS číslo zajišťuje důvěrnost.
