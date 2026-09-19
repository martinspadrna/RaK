# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; pouze větev `development`, testovací verze **1.7.48**. `main` a produkční Supabase se bez výslovného souhlasu nemění. Níže se odlišuje technická oprava od výslovného přijetí rizika.

## Neměnné rozhodnutí vlastníka – OS číslo

**Běžný zaměstnanec se přihlašuje výhradně zadáním OS čísla.** Nevyžadovat heslo, e-mail, Supabase Auth účet, OTP ani další povinný krok. Toto rozhodnutí uzavírá požadavek na přidání silné autentizace běžným zaměstnancům jako **neplánovaný zásah / riziko výslovně přijato**. OS číslo může zjistit i jiný člověk: nesmí se prezentovat jako bezpečný důkaz totožnosti ani jako důvod k zpřístupnění skutečně soukromých dat. Administrátoři nadále používají vlastní heslo a ověřenou Supabase Auth relaci.

| Bod | Oblast | Stav | Doloženo / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ – identita OS-only: riziko přijato | Anonymní úplný adresář uzavřen, omezené jednorázové dohledání účtu v2 zachováno. Povinná silná identita zaměstnance je mimo rozsah na základě rozhodnutí vlastníka. Zbývá nezávislý HTTP/JWT, exportní a enumerovací audit; chránit jakékoliv skutečně soukromé údaje jinými prostředky. |
| P0.2 | Rotace a soukromí | **UZAVŘENO ROZHODNUTÍM – bezpečnostní riziko přijato, nikoliv odstraněno** | Zaměstnanci potřebují společný rozpis, statistiky, generátor a offline režim při loginu pouze OS číslem. Importní `importMeta`, kontaktní tajemství a admin autorství odděleny; guard v1.7.47 blokuje nově vkládané zjevné identifikátory. **Jména, absence, běžné poznámky a 24 měsíců historie zůstávají anonymně čitelné**; 346 poznámek obsahuje jméno, kód a text. Zpřístupnění je vědomě akceptovaná vlastnost současného provozního modelu, NE splněné zabezpečení. Požadavek na silnější autentizaci zaměstnanců znovu neotevírat bez změny zadání. Zabránit přidávání zdravotních údajů či jiných citlivých důvodů absencí do veřejného snímku; zvláštní soukromá data musí zůstat mimo veřejnou rotaci. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Omezené přihlašovací RPC v2, limity starého dotazu, keepalive 6000/h, 15s deduplikace a pole telemetrie. Guard veřejných nastavení strojů od v1.7.47. Zbývá skutečný HTTP/export audit včetně starého PWA. Nezavádět zaměstnancům další login. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverová kontrola owner/admin/deputy. v1.7.48 odhlašuje všechny relace na zvoleném zařízení a váže evidenci na konkrétní Auth session. Zbývá reálné ověření více správců, přihlášení, obnovy a fyzického telefonu. |
| P1.1 | Oprávnění a RLS | ČÁSTEČNĚ | Inventarizována veřejná RPC, guard veřejných nastavení, soukromé zálohy. v1.7.48 testuje anonymní zákaz admin RPC a odvolání session. Zbývá úplný audit RLS, SECURITY DEFINER a skutečné HTTP/JWT testy. Omezení osobních dat není možné považovat za vyřešené kvůli OS číslu. |
| P1.2 | Hesla administrátorů a relace | ČÁSTEČNĚ | Zaměstnanců se netýká. v1.7.48: unikátní vazba zařízení na `user_id + session_id + device_id`, 10min bootstrap pro nové heslem přihlášené admin relace, staré nepřipojené relace ztrácejí admin práva, již odvolaná relace se nemůže oživit. SQL test dvou relací stejného zařízení, úplné odvolání a odmítnutí opětovné registrace prošel v ROLLBACK. Zbývá reálná relace na iPhonu, obnova po revokaci a test různých admin rolí. Odhlášení nepředstavuje trvalý zákaz zařízení: nové přihlášení heslem může vytvořit novou relaci. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | Dva celé buildy, regresní a kritické smoke, samostatná testovací Supabase a nová matice 1.7.48. Zbývá skutečný iPhone smoke, ZIP a produkční reprodukovatelnost. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Pouze development; produkční alias ani rollback neměnit bez souhlasu. |
| P1.5 | Integrita dat a zálohy | ČÁSTEČNĚ | 1.7.42 soukromé importy v owner ZIP, 1.7.46–1.7.47 validace struktury 11 historických záloh. V testovací databázi revize 50, 12 záznamů importů zachováno. Historické owner-only snapshoty stále obsahují `importMeta`, jsou chráněny právy, ne anonymizované. Zbývá skutečný iPhone ZIP, nezávislá obnova a konflikty. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit studený a teplý start na iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Přepínání stránek a vizuální regrese. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Test online/offline, starých PWA a aktualizace. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Skutečná měření, logy, regresní prahy. |

**Bilance: 1/13 uzavřen rozhodnutím a přijetím rizika (P0.2); 0/13 plně technicky a nezávisle ověřených bezpečnostních/technických oprav.** Žádná výjimka neznamená, že anonymně čitelné údaje jsou zabezpečené. P0.1 ponechán otevřený pro zbývající audit účtů a exportů; pouze část vyžadující silné přihlášení je vyřazena.

**Další větší balík:** ověřit administrátorský login/logout/revokaci na skutečném zařízení a kontrolu rolí; HTTP/API/RLS bez zásahu do zaměstnaneckého loginu; owner záloha a izolovaná obnova; potom měření výkonu/offline. Při ochraně zvlášť citlivých údajů je neukládat do veřejné rotace. Produkční cutover vyžaduje výslovné schválení a rollback plán.
