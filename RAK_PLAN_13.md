# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; pouze větev `development`, testovací verze **1.7.49**. `main` a produkční Supabase se bez výslovného souhlasu nemění. Technické opravy nejsou totéž jako přijetí rizika.

## Neměnné rozhodnutí vlastníka – OS číslo

**Běžný zaměstnanec se přihlašuje výhradně zadáním OS čísla.** Nevyžadovat heslo, e-mail, Supabase Auth účet, OTP ani další povinný krok. Požadavek silné autentizace běžných zaměstnanců je **neplánovaný / riziko přijato**. OS číslo není bezpečný důkaz totožnosti a samo o sobě nedovoluje chránit soukromá data. Správci dál potřebují heslo a ověřenou Supabase Auth relaci.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ – OS-only: riziko přijato | Anonymní úplný adresář uzavřen, omezené dohledání účtu v2. Silnější identita zaměstnanců mimo rozsah. Zbývá nezávislý HTTP/JWT, enumerovací a exportní audit; žádné skutečně soukromé údaje nepřidávat do OS-only ploch. |
| P0.2 | Rotace a soukromí | **UZAVŘENO ROZHODNUTÍM – bezpečnostní riziko přijato, nikoli odstraněno** | Pro společný rozpis, statistiky, generátor a offline provoz zůstává veřejná aktivní rotace. `importMeta`, kontaktní tajemství a admin autorství odděleny, ochrana nových explicitních identifikátorů od 1.7.47. **Jména, absence, běžné poznámky a 24 měsíců historie zůstávají anonymně čitelné**; 346 poznámek obsahuje jméno, kód a text. Není to splněné zabezpečení. Zdravotní či jiné zvlášť citlivé důvody absencí se do veřejné rotace nesmějí ukládat. Požadavek na silnější autentizaci znovu neotevírat bez změny zadání. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Přihlašovací RPC v2, limity starého admin dotazu, keepalive 6000/h a 15s deduplikace; guard nastavení strojů 1.7.47. **1.7.49: databázový allowlist metadat hlášení chyb**, anonymní odeslání/duplicita/24 hlášení za hodinu ověřeny v SQL. Pět záměrných anonymních `SECURITY DEFINER` RPC inventarizováno. Zbývá živý HTTP/export audit a kompatibilita starých PWA; OS login beze změny. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverové role owner/admin/deputy, 1.7.48 revokace všech relací zařízení. Zbývá více skutečných správců, nové přihlášení po revokaci a fyzický telefon. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ | **1.7.49 SQL audit:** všech 20 veřejných tabulek má RLS; přímé čtení soukromých tabulek zamítnuto rolím anon i authenticated; veřejné SELECT jen announcements/machine_settings/rotation_state. V 30 soukromých/wrapped záznamech machine_settings nebyla při anonymním SELECT nalezena viditelná privátní položka. Inventarizováno pět záměrných anonymních SECURITY DEFINER RPC, ostatní anon definer zakázané; žádný pomocník ve schématu private spustitelný anonymně. Restriktivní politiky machine_settings zůstaly beze změny. Zbývá skutečný HTTP/JWT a úplný funkční audit všech admin RPC. Bezpečnostní poradce hlásí SECURITY DEFINER jako varování i pro úmyslná rozhraní; neinterpretovat mechanicky jako exploit. |
| P1.2 | Hesla administrátorů a relace | ČÁSTEČNĚ | 1.7.48 unikátní vazba `user_id + session_id + device_id`, nová relace s 10min bootstrapem, staré nepřipojené relace bez práv, odvolané bez znovuoživení. SQL test dvou relací a revokace s ROLLBACK prošel. Zbývá reálný iPhone, různé role a obnova po revokaci. Nové přihlášení heslem může založit novou relaci: revokace není trvalý zákaz zařízení. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Dvě kompletní sestavení, `npm run check`, kritické smoke, verze 1.7.39–1.7.49, SQL matice s ROLLBACK, testovací Supabase. Zbývá reálný iPhone smoke, ZIP a reprodukovatelnost produkce. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Pouze development; produkční alias ani rollback neměnit bez souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | Soukromé importy v owner ZIP od 1.7.42, validace struktury všech 11 historických záloh od 1.7.46–1.7.47. Revize rotace 50, 12 importů zachováno. Historické owner-only snapshoty obsahují `importMeta`, jsou chráněné právy, nikoliv zpětně anonymizované. Zbývá iPhone ZIP, izolovaná obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Studený a teplý start na skutečném iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Vizuální regresní testy a přepínání obrazovek. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Online/offline, aktualizace a starší PWA. |
| P2.4 | Diagnostika a výkon | OTEVŘENO | Měření, logy a regresní prahy. |

**Bilance: 1/13 uzavřen rozhodnutím a přijetím rizika (P0.2); 0/13 plně technicky a nezávisle ověřených bodů.** Anonymně čitelné údaje nejsou zabezpečené. P0.1 zůstává otevřený kvůli auditu účtů/exportů, nikoli kvůli změně přihlašování.

**Další větší balík:** živý HTTP/JWT test pěti anonymních API a exportů; skutečný admin login/logout/revokace na iPhonu; owner ZIP + nezávislá obnova do prázdné izolované databáze. Poté výkon/offline. Produkční cutover vyžaduje výslovné schválení a plán rollbacku.
