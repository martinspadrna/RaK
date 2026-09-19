# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; výhradně `development`, testovací verze **1.7.50**. Produkční `main` a produkční Supabase beze změn. Oddělujeme skutečně vyřešené problémy od přijatých rizik a dosud neprovedených testů.

## Neměnné rozhodnutí vlastníka – OS číslo

Běžný zaměstnanec se přihlašuje **jen OS číslem**. Nezavádět heslo, e-mail, Supabase Auth, OTP ani další povinný krok. Silná identita zaměstnanců je mimo rozsah; **riziko přijato, nikoli odstraněno**. OS číslo není bezpečný důkaz totožnosti. Admin/owner mají samostatné heslo a ověřenou Supabase Auth relaci.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ – OS-only riziko přijato | Úplný anonymní adresář zakázán, omezený lookup v2. 1.7.50: skutečné anonymní HTTP čtení účtů a neplatný bearer JWT zamítnut kódem 401; opakovatelné CI HTTP sondy zavedeny. Zbývá platný JWT více rolí, stará PWA a úplný audit exportů. Silnější login zaměstnanců nevyžadovat. |
| P0.2 | Rotace a soukromí | **UZAVŘENO ROZHODNUTÍM – riziko přijato, nikoli zabezpečeno** | Společná rotace, statistiky, generátor a offline vyžadují veřejný read v OS-only provozu; importMeta, kontakty a autorství admina odděleny. **Jména, absence, běžné poznámky a 24 měsíců historie jsou stále anonymně čitelné**; 346 poznámek obsahuje jméno, kód i text. Zdravotní či další zvlášť citlivé důvody absencí do této tabulky neukládat. Přihlášení znovu neotevírat bez změny zadání. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Login v2, omezený legacy admin oracle, keepalive limity, report metadata allowlist 1.7.49. **1.7.50: skutečné HTTP 401 pro účty, admin zařízení, reporty a owner zálohy; 200 pro zamýšlenou veřejnou rotaci; 400 pro neplatný report; 401 pro owner export.** Reprodukovatelný 18-sondový HTTP test přidán do CI; administrátorské RPC zůstává chráněné. Zbývá živý platný admin/deputy JWT, Vercel SSO, staré PWA a funkční export ZIP. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | 1.7.48 session-scoped odhlašování všech relací zařízení, SQL regresní scénáře. Zbývá fyzický iPhone, skuteční různí správci a opětovné přihlášení. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ – **konkrétní únik opraven v testu 1.7.50** | Všech 20 veřejných tabulek má RLS, soukromé tabulky bez přímého frontend SELECT. 1.7.50 objeven a reprodukován únik při `category='ADMIN_ACCOUNTS_SETTINGS'`: dřívější RLS porovnávalo velikost písmen jinak než trigger. Přidány dvě RESTRICTIVE SELECT casefold politiky pro anon a authenticated se zachováním ověřeného admina. Po opravě 5 variant skryto, veřejných 20 HTTP řádků zachováno, 0 soukromých. Zbývá plný audit všech admin RPC s platnými rolemi a vývozů. |
| P1.2 | Hesla administrátorů a relace | ČÁSTEČNĚ | 1.7.48 unikátní vazba user_id + session_id + device_id, 10min bootstrap a nepovolená obnova odvolané relace. Skutečný platný token iPhone a role owner/admin/deputy neověřeny. Odhlášení zařízení není trvalý zákaz nového přihlášení heslem. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Dva buildy s `npm run check`, kritická smoke a historické release gates před finalizací verze; 1.7.50 závěrečná version gate a živé anonymní HTTP sondy v CI. Zbývá iPhone smoke, reprodukovatelnost produkce. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Jen development. Produkční alias, main a produkční DB neměnit bez souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | Owner-only ZIP se soukromými importy, 11 historických záloh se strukturální kontrolou, aktivní revize 50. Zbývá skutečný ZIP na iPhonu, izolovaná plná obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený/teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Vizuální regrese a přepínání stránek. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Stará PWA, přechody online/offline, aktualizační potvrzení. |
| P2.4 | Diagnostika a výkonnost | OTEVŘENO | Skutečné měření, logy, regresní prahy. |

**Bilance: 1/13 uzavřen rozhodnutím a přijetím rizika (P0.2); 0/13 plně technicky a nezávisle ověřených bodů.** Část P1.1 (case-insensitive únik) je technicky opravena a SQL/HTTP otestována, ale celý bod P1.1 ještě není hotový. Pozitivní anonymní HTTP testy neprokazují oprávnění platných správcovských JWT ani fungování chráněného Vercel preview na telefonu.

**Další větší balík:** živé role owner/admin/deputy na skutečném zařízení, ZIP a obnova do nové izolované DB, poté výkon/offline. Bez produkčního cutoveru a bez přihlašovacích změn zaměstnanců.
