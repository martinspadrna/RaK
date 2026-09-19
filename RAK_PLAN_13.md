# RaK – průběžný plán 13 úkolů

Stav 19. 9. 2026, pouze `development`, testovací verze **1.7.51**. Produkční `main` a produkční Supabase neměněné. Celkový počet odlišuje dokončenou technickou oblast od rozhodnutím přijatého rizika; částečné opravy nejsou vydávány za hotové celé body.

## Neměnné rozhodnutí vlastníka – OS číslo

Běžný zaměstnanec se přihlašuje jen **OS číslo**; bez hesla, e-mailu, OTP a dodatečné Supabase Auth registrace. **Riziko přijato, nikoli odstraněno** – OS číslo nedokazuje totožnost. Admin/owner mají oddělené heslo a ověřenou Auth relaci.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ – OS-only riziko přijato | Zakázaný anonymní adresář; omezený lookup v2 a 401 při HTTP čtení účtů i s falešným JWT. 1.7.51: odstraněno konkrétní OS číslo vlastníka z aktuálního zastaralého veřejného provozního návodu, historické Git commity přetrvávají. Zbývá úplný audit dalších souborů/exportů, platné JWT různých rolí a staré PWA. |
| P0.2 | Rotace a soukromí | **UZAVŘENO ROZHODNUTÍM – riziko přijato, nikoli zabezpečeno** | Společná rotace, statistiky, generátor a offline zachovávají veřejné čtení v OS-only režimu. Soukromá `importMeta`, kontakty a autorství admina odděleny. Jména, absence, běžné poznámky a **24 měsíců** historie jsou stále **anonymně čitelné**. Zvlášť citlivé důvody absencí do veřejné tabulky neukládat. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Login v2, omezený legacy admin dotaz, keepalive limity, report metadata allowlist; 18 skutečných anonymních/invalid-JWT HTTP sond z 1.7.50 v CI. 1.7.51: záložní zdrojový ZIP omezen na whitelist souborů, nezahrnuje zakázané typy a kontroluje se shoda inventáře + CRC. Zbývá živý owner/admin/deputy JWT, Vercel SSO, staré PWA a uživatelský ZIP export. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Od 1.7.48 odvolání všech Auth relací zařízení a SQL scénáře. Zbývá fyzický iPhone, různí správci a opětovné přihlášení. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ | RLS všech 20 veřejných tabulek; 1.7.50 odstraněn únik soukromých nastavení při rozdílné velikosti písmen restriktivními politikami. Pět SQL variant skryto, veřejných 20 HTTP řádků zachováno. Zbývá úplná autorizace všech privilegovaných RPC pod skutečnými různými rolemi. |
| P1.2 | Hesla administrátorů a relace | ČÁSTEČNĚ | Vazba user_id/session_id/device_id, omezená bootstrap doba a blokace obnovení odvolané relace. Zbývá test skutečných owner/admin/deputy tokenů a iPhonu. Odvolání relace není trvalé zablokování nového přihlášení heslem. |
| P1.3 | Build, automatické testy a verze | **UZAVŘENO TECHNICKY – pro development CI** | Dva celé `npm run vercel-build`, při obou `npm run check` a critical smoke; historické i finální release gates, přímý HTTP audit 18 požadavků proti testovací DB. Od 1.7.51 nezávislé porovnání každého souboru ZIP s inventářem a CRC, exact Git SHA, test-only konfigurace, finální verzovací gate. Skutečné iPhone/UI/offline zkoušky jsou vedeny pod P2.2/P2.3, produkční reprodukovatelnost/rollback pod P1.4 a obnova pod P1.5 – automatické CI je nezastupuje. |
| P1.4 | Nasazování a rollback | ČÁSTEČNĚ | Přepsán zastaralý `SECURITY_DEPLOYMENT.md` na aktuální development/TEST postup: SHA, dva buildy, READY alias, kontrola configu, kompatibilní návrat bez force-push a bez slepého DB rollbacku. Skutečný zkušební rollback preview a případná produkční procedura dosud neprovedeny. Na `main` nesahat. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | Owner ZIP se soukromými importy, strukturální kontrola 11 historických záloh, 1.7.51 ZIP zdrojů pouze ze stejného bezpečného inventáře + úplná ZIP/CRC kontrola v CI. Zbývá výsledný ZIP na iPhonu, izolovaná plná obnova Auth/Storage/dat a konflikty revizí. Sanitizovaná Auth metadata nejsou aktivní přihlašovací údaje. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Studený/teplý start na skutečném iPhonu a rozbor načítání. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Browser/mobile screenshot regrese, přepínání stránek a ověření konkrétních rolí. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Starší PWA, online/offline přechody, potvrzení aktualizace, iPhone. |
| P2.4 | Diagnostika a výkonnost | OTEVŘENO | Skutečné měření, logy, regresní prahy a žádné osobní údaje v telemetrii. |

**Současná bilance: 2/13 uzavřené celkem = 1/13 technicky (P1.3, výhradně development CI) + 1/13 uzavřen rozhodnutím o přijetí rizika (P0.2). Zbývá 11/13 otevřených nebo částečných.** Toto není tvrzení o kompletní bezpečnosti ani o funkční obnově. Historická bilance před verzí 1.7.51: 1/13 uzavřen rozhodnutím; 0/13 plně technicky. Starší automatické testy tuto historickou hodnotu nadále používají jako pojistku proti falešnému označení všech úkolů za hotové.

**Další větší balík:** skutečný browser/iPhone provoz a stará/offline PWA společně (P2.1–P2.3), poté izolovaný recovery drill a role owner/admin/deputy. Jen testovací prostředí; pro fyzický iPhone a autorizaci reálného správce je nutný skutečný test, nikoli prohlášení na základě SQL simulace.
