# RaK – kanonický handoff a aktuální stav

> **Toto je jediný živý řídicí dokument projektu RaK.**
>
> Stálý odkaz: https://github.com/martinspadrna/RaK/blob/development/RAK_HANDOFF.md
>
> Úplná historická chronologie před konsolidací zůstává v Git historii tohoto souboru, zejména v commitu `a31452ff0644899e4c46a7cce0d544b99da78755`. Staré průběžné FAIL/PARTIAL/PASS mezistavy se do tohoto dokumentu znovu nekopírují, pokud nejsou potřebné pro aktuální rozhodnutí.

## Nejkratší prompt pro nový chat

> Pokračuj v projektu RaK podle aktuálního `RAK_HANDOFF.md` na HEAD větve `development`. Všechno důležité je zapsané v tomto souboru.

## Povinný začátek každého pokračování

1. Online zjistit živý SHA větve `development`; SHA v tomto souboru jsou pouze důkazní body.
2. Načíst tento soubor z aktuálního HEAD a řídit se jím.
3. Ověřit, že `main`, produkční Vercel a produkční Supabase zůstaly beze změny, pokud vlastník výslovně neschválil konkrétní produkční krok.
4. Před každým zápisem znovu načíst živý `development` HEAD. Bez force, bez přepsání souběžné práce.
5. Zdroj, GitHub Actions, Vercel a Supabase řešit online; místní kopii RaK nepoužívat jako autoritu.
6. Rozpor mezi dokumentací a strojovým důkazem řešit fail-closed: nic neprohlásit za splněné bez důkazu.

## Závazné hranice

- Běžná práce pouze na `development`.
- `main`, produkční Vercel deployment/alias a produkční Supabase se nesmí měnit bez nového výslovného souhlasu vlastníka pro konkrétní krok.
- TEST Supabase: `cgshssdjgzzuprlwnabl`.
- Produkční Supabase: `bkqamcbkiwumsvelahxr`.
- Vlastník povolil pouze bezplatná řešení; nový/placený Supabase projekt, branch, PITR nebo add-on vyžaduje předchozí souhlas.
- Nikdy nelogovat JWT, hesla, API klíče, osobní odpovědi ani tajný Vercel share parametr.
- Nemazat Safari/PWA, localStorage, CacheStorage, service worker, frontu ani uživatelská data jako univerzální opravu.
- Testy neobcházet ani neoslabovat. Opravovat kořenovou příčinu.
- Funkční release zvyšuje sjednocenou verzi právě jednou; dokumentační/CI-only změna runtime verzi nezvyšuje.
- CI-only nebo dokumentační změna může vytvořit immutable Vercel preview podle workflow, ale nesmí sama přesunout produkční alias ani měnit produkci.
- Preferovat tematické balíky, minimum commitů a jediný funkční deployment až po zeleném exact-SHA CI.
- Fyzický iPhone test a Chromium test jsou dva různé důkazy; nikdy je nezaměňovat.
- Když vlastník po právě vyžádaném fyzickém testu napíše jen **„ok“**, znamená to PASS tohoto testu. Poté zapsat PASS do handoffu.
- Po větším balíku aktualizovat tento dokument; nevytvářet paralelní plánovací soubor.

## Aktuální stav k 30. 9. 2026

### Development runtime

- Aktuální TEST runtime je **RaK 1.8.7**, build `v1.8.7-live-auth-source1`.
- Exact runtime/test SHA: `3d919c88757ca75a20020eb2ae51901c922fdbbb`.
- Actions run `36687768493`, attempt 1, je pro tento exact SHA **SUCCESS**: dvě canonical sestavy, npm/check + inherited release gates, rollback/backup, reálný Chromium mobile/offline/update průchod, tříkolový PWA budget, 20kolová parity proti immutable 1.7.69, quality thresholds, TEST HTTP/izolace a release proof. Výkonové limity nebyly uvolněny.
- READY Vercel deployment: `dpl_BeDLm4ABrThiFG7EaFf3TV691msp`; stable development alias byl po exact-SHA ověření přesunut pouze na tento deployment.
- TEST Supabase `cgshssdjgzzuprlwnabl` má aplikovanou migraci `rak_unplanned_kalirna_direct_cell_17148`; definice `rak_admin_apply_unplanned_change_v2` byla po migraci read-only ověřena přímo v DB.
- Produkce i `main` zůstaly při release-preview beze změny.
- **Fyzický iPhone PASS 28. 9. 2026 – bod 1 administrační série:** v Administrace → Rozpisy jsou neuložené místní návrhy, exporty a tlačítko „Smazat všechny místní návrhy“ v jednom rámečku, tlačítka mají požadovaný svislý odstup a blok „Statistické odchylky“ je odstraněný.
- **Fyzický iPhone PASS 28. 9. 2026 – bod 2 administrační série:** přehled jména × skupiny strojů je výchozí rozbalený; TNK/W01/W02; Jméno 54 px; TO/MO i stroje 35 px se svislými čárami; panel místních návrhů je výchozí zabalený.
- **Fyzický iPhone PASS 28. 9. 2026 – bod 3 administrační série:** Administrace → Pravidla generátoru je na 1.7.144 potvrzena jako kompaktní skládací editor s pěti výchozím způsobem zabalenými sekcemi; všechna původní pole a ukládací logika zůstávají zachované.
- **Fyzický iPhone PASS 28. 9. 2026 – bod 4 administrační série:** Administrace → Kantýna / jídelna je na 1.7.145 potvrzena jako kompaktní editor se dvěma výchozím způsobem zabalenými sekcemi „Běžná otevírací doba“ a „Přesčasová doba“; časová pole a řádky jsou zhutněné a tři spodní akce jsou vedle sebe. Původní datové hooky a ukládací logika zůstávají zachované.
- **Fyzický iPhone PASS 28. 9. 2026 – bod 5 administrační série:** Administrace → Správci je na 1.7.146 potvrzena jako kompaktní editor; stav je na mobilu 2×2 a sekce Účty správců, Role a bezpečnost, Přihlášená zařízení a Moje heslo jsou výchozím způsobem zabalené. Secure role gate, revoke zařízení, role, hesla a minimum 6 znaků zůstávají zachované. **Administrační série 1–5 je tím uzavřená.**
- **Fyzický iPhone PASS 29. 9. 2026 – neplánovaná Kalírna 1.7.148:** člověk s „Odešel na kalírnu“ zůstává v rozpisu evidenčně jako růžová buňka `Jméno →K`, ale není započítán do fyzického MO staffingu. Bez jiné absence zůstává fyzicky 5 TO + 4 MO a evidence Kalírny je na volné MFKF06; s jednou další absencí zůstává fyzicky 5 TO + 3 MO a evidence Kalírny je na volné MSKC01. D/NV/§/Lékař zůstávají absencemi a neplánovaná změna se omezuje jen na vybraný den / rozsah. **Backlog „Kalírna → evidenční MFKF06“ je uzavřen.**
- **Fyzický iPhone PASS 29. 9. 2026 – MO-only absence komplet:** Dovolená / Náhradní volno / Paragraf / Lékař jsou fyzicky potvrzené na iPhonu. Člověk původně na MO po neplánované absenci zmizí ze stroje a je v Absencích; pokud TO zůstává validní, zachová se úplně beze změny. MO se přepočítá jen na vybraném dni / rozsahu a jiné dny se nemění. **Cílený MO-only retest všech čtyř důvodů je uzavřen.**
- **Fyzický iPhone PASS 30. 9. 2026 – Administrace → Kalendáře / Report dovolených 1.8.3:** samostatná volba kalendáře pro Report dovolených je funkční, výchozí/fallback zůstává Obrábění D a nový blok má potvrzený svislý odstup od „Směny A“. Report není svázaný se směnou přihlášeného účtu; Dashboard a generátor zůstávají beze změny. **Kalendářový follow-up je uzavřen.**
- **Fyzický iPhone PASS 30. 9. 2026 – Více / diagnostika 1.8.4:** výchozí text „TEST diagnostika se spustí pouze klepnutím.“ je odstraněný.
- **Fyzický iPhone PASS 30. 9. 2026 – RaK 1.8.7 / podepsaná relace zástupce:** změna vlastního hesla funguje a „Ověřit oprávnění“ na testovacím účtu po finální opravě správně používá podepsanou signed-role relaci. Runtime `app-menu.js` a diagnostický helper jsou sjednocené na `getSignedAdminAccessToken`; admin-write gate zůstává pouze owner/admin. **Auth regrese je uzavřená.**

### Produkce – neměnit bez souhlasu

- GitHub `main`: `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`.
- Produkční Vercel: `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, **READY**, target `production`, nasazený SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`.
- Produkční Supabase `bkqamcbkiwumsvelahxr`: **ACTIVE_HEALTHY** při poslední kontrole 28. 9. 2026.
- Produkční runtime zůstává historicky 1.7.83; development sjednocení verzí se do produkce bez souhlasu nepřenáší.
- Rozdíl mezi novějším GitHub `main` a skutečně nasazeným produkčním SHA je známý a úmyslný.

### Aktuální CI poznámka

- Poslední funkční runtime 1.8.7 má zelený exact-SHA run `36687768493` (attempt 1) pro SHA `3d919c88757ca75a20020eb2ae51901c922fdbbb`. Výkonové limity nebyly uvolněny.
- Stabilní TEST alias byl přesunut až po zeleném exact-SHA ověření a immutable HTTP kontrole deploymentu `dpl_BeDLm4ABrThiFG7EaFf3TV691msp`.
- Při dalším funkčním releasu musí opět projít celý fail-closed řetězec na jeho exact SHA.

## Stav 13 bodů – závěrečný audit 28. 9. 2026

Read-only audit na HEAD `a31452ff0644899e4c46a7cce0d544b99da78755` ověřil všech 13 kanonických sekcí: **všechny akceptační checkboxy jsou [x], žádný [ ] nezůstal**. Staré odstavce uvnitř těchto sekcí stále obsahovaly historické mezistavy 43/50/57/60/63/67/75/80/83 %; tato konsolidace je odstranila, aby se nový chat neřídil překonanou historií.

| Bod | Oblast | Stav |
|---|---|---:|
| P0.1 | Účty a data pracovníků | **100 % (5/5)** |
| P0.2 | Soukromí sdílené rotace | **100 % (5/5)** | Uzavřeno rozhodnutím o přijatém riziku; nejde o tvrzení o absolutní technické ochraně |
| P0.3 | API, exporty a historické klienty | **100 % (5/5)** |
| P0.4 | Role vlastníka a administrátorů | **100 % (5/5)** |
| P1.1 | Databázová oprávnění, RLS a RPC | **100 % (5/5)** |
| P1.2 | Administrátorské heslo, relace a zařízení | **100 % (5/5)** |
| P1.3 | Reprodukovatelný build, testy a verze | **100 % (6/6)** |
| P1.4 | CI před nasazením, rollout a rollback | **100 % (6/6)** |
| P1.5 | Úplné zálohy a prokazatelná obnova | **100 % (7/7)** |
| P2.1 | Výkon startu PWA | **100 % (5/5)** |
| P2.2 | Rozložení, DOM, CSS a interakce | **100 % (5/5)** |
| P2.3 | Offline, fronta, verze a konflikty | **100 % (8/8)** |
| P2.4 | Diagnostika, soukromí telemetrie a kvalita | **100 % (6/6)** |

**Bilance: 13/13 uzavřeno.**

## Finální důkazy a trvalá omezení 13 bodů

### P0.1 – Účty a data pracovníků · 100 %

- [x] Zabránit anonymnímu čtení celého adresáře zaměstnanců.
- [x] Zachovat schválené OS-only přihlášení běžných pracovníků bez nových hesel/e-mailů/OTP.
- [x] Auditovat staré exporty, cache a klientské cesty na osobní údaje.
- [x] Ověřit povolené a zakázané datové cesty pro anonymní i privilegované role bez logování tokenů.
- [x] Držet regresní kontroly rozsahu osobních polí v odpovědích a exportech.

- Veřejné/anonymní cesty nevydávají celý adresář ani citlivá osobní pole.
- Přihlášení běžných pracovníků zůstává OS-only podle schváleného modelu; nepřidávat jim hesla/e-mail/OTP/Auth účet.
- Privilegované identity a exporty mají regresní privacy kontroly.

### P0.2 – Sdílená rotace a soukromí · 100 % rozhodnutím

- [x] Zdokumentovat rozsah veřejně čitelné společné rotace potřebný pro OS-only provoz.
- [x] Vyhodnotit technické možnosti privatizace a jejich dopad na schválený model přihlášení.
- [x] Výslovně oddělit technické zabezpečení od rozhodnutí vlastníka přijmout zbytkové riziko.
- [x] Zachovat omezení ostatních osobních údajů mimo přijatý rozsah rotace.
- [x] Udržovat rozhodnutí a jeho dopad jako trvalou součást handoffu.

- Vlastník vědomě přijal rozsah veřejně čitelné společné rotace potřebný pro OS-only provoz.
- 100 % zde znamená dokončené a zdokumentované rozhodnutí o riziku, nikoli absolutní technickou privatizaci.

### P0.3 – API, exporty a historické klienty · 100 %

- [x] Auditovat aktuální i historické API/exportní cesty a staré klienty.
- [x] Omezit veřejné odpovědi na schválený rozsah a zachovat private/no-store ochrany.
- [x] Udržet owner disaster-recovery export owner-only a fail-closed.
- [x] Fyzicky stáhnout, rozbalit a otevřít úplný owner ZIP na skutečném iPhonu.
- [x] Zdokumentovat, že dříve stažené soukromé kopie nelze vzdáleně odvolat.

- Staré API/exportní cesty byly auditovány a veřejné odpovědi omezeny.
- Owner disaster-recovery ZIP je soukromý owner-only artefakt; dříve stažené kopie nelze vzdáleně odvolat.
- Fyzický iPhone PASS 27. 9. 2026: úplný ZIP stažen, rozbalen a otevřen soubor uvnitř.

### P0.4 – Role vlastníka a administrátorů · 100 %

- [x] Používat fail-closed secure role gate pro owner/admin/deputy oprávnění.
- [x] Ověřit skutečné podepsané TEST role owner/admin/deputy/cizí účet.
- [x] Ověřit chování odvolané admin relace a zařízení.
- [x] Fyzicky projít role-gated UI na iPhonu.
- [x] Zabránit automatickému návratu starého privilegovaného přístupu po revoke.

- Secure role gate je fail-closed.
- Podepsaná TEST role matrix ověřila owner/admin/deputy/cizí/odvolanou relaci.
- Fyzický iPhone PASS 27. 9. 2026: změna role + revoke zařízení; starý privilegovaný přístup se po revoke neobnovil.

### P1.1 – Databázová oprávnění, RLS a RPC · 100 %

- [x] Auditovat RLS, GRANT a RPC surface na TEST.
- [x] Ověřit anonymní a authenticated zápisové/čtecí hranice fail-closed.
- [x] Prověřit SECURITY DEFINER a veřejné RPC jako explicitní allowlist.
- [x] Aplikovat schválenou produkční fázi B atomicky až po TEST/CI/fyzické přejímce.
- [x] Udržovat nové DB změny nejprve na TEST a produkci měnit jen po explicitním souhlasu.

- RLS/GRANT/RPC surface byl auditován na TEST a schválená produkční fáze B byla aplikována atomicky.
- Veřejné mutation cesty jsou omezené; privilegované operace vyžadují příslušný kontext.
- Nové DB změny nejprve TEST, potom exact-SHA CI a teprve po explicitním souhlasu produkce.

### P1.2 – Heslo, relace a zařízení · 100 %

- [x] Sjednotit minimum admin/správce hesla na 6 znaků v klientu i serverové validační cestě.
- [x] Ověřit online znovuotevření admin relace v PWA.
- [x] Ověřit offline start a návrat offline→online bez mazání dat.
- [x] Ověřit revoke zařízení a zákaz automatického obnovení staré relace.
- [x] Zachovat role/session chování fail-closed při chybě ověření.

- Minimum admin/správce hesla je **6 znaků**, konzistentně klient + TEST serverová validační cesta.
- Fyzicky ověřeno: znovuotevření PWA, offline start, offline→online, revoke a zákaz automatického návratu staré admin relace.

### P1.3 – Reprodukovatelný build a verze · 100 %

- [x] Používat reprodukovatelný canonical build.
- [x] Udržovat jeden zdroj release metadat a sjednocenou verzi runtime/cache/package.
- [x] Provádět dvě čisté sestavy a porovnat jejich výstup.
- [x] Uchovávat immutable 1.7.69 jako performance referenci.
- [x] Fail-closed blokovat release při nesouladu buildů nebo metadat.
- [x] Udržovat regresní testy build/version kontraktu v CI.

- Canonical build je reprodukovatelný, release metadata jsou jediný zdroj verze.
- Viditelná, technická, module cache, package verze a SW marker se u nových runtime release sjednocují.
- Immutable 1.7.69 zůstává performance referencí.

### P1.4 – CI, deployment a rollback · 100 %

- [x] Spouštět povinné syntax/unit/integration/security/offline/browser kontroly před releasem.
- [x] Vyžadovat dvě čisté canonical sestavy a ZIP/CRC důkaz.
- [x] Vyžadovat performance budget a paritu bez oslabování limitů.
- [x] Ověřit TEST HTTP/Supabase izolaci na exact SHA.
- [x] Nasazení považovat za release až po READY + exact SHA + postdeploy kontrole.
- [x] Udržovat konkrétní ověřený rollback cíl; produkci měnit pouze po explicitním souhlasu.

- Funkční release musí projít syntax/unit/integrace, security/offline/browser, dvě čisté sestavy, ZIP/CRC, performance/parity a TEST HTTP.
- Deployment se smí považovat za release až po READY, exact SHA a ověření TEST/produkční izolace.
- Produkční release vyžaduje samostatný explicitní souhlas.
- Rollback musí používat ověřený READY cíl; nikdy nehádat deployment.

### P1.5 – Úplné zálohy a ověřitelná obnova · 100 %

- [x] Záloha zdrojů a owner ZIP mají inventář, manifest/CRC a kontrolu zdrojových Git blobů.
- [x] Je zpracovaný inventář DB schématu, Auth, Storage a rozdělení TEST/produkce.
- [x] Je doložen nedestruktivní shadow/rollback kontrakt a jeho omezení.
- [x] Všechna potřebná TEST data a schéma byla skutečně obnovena do odděleného ephemeral local Supabase.
- [x] Byla ověřena obnova Auth, Storage, rolí/RLS, pořadí migrací a relevantních datových revizí.
- [x] Úplný owner ZIP byl fyzicky stažen, rozbalen a otevřen na iPhonu.
- [x] Restore byl porovnán počty, SHA-256 hashi a funkčními testy a má fail-closed teardown/rollback postup.

Finální zero-cost isolated restore drill:
- exact SHA `9dd8b3dfc0c38984a327ce2d0ab194c08de1e787`;
- [Actions #539](https://github.com/martinspadrna/RaK/actions/runs/36454437940) **SUCCESS**;
- export z TEST: 22 public tabulek, 62 přesných aplikovaných migrací, sanitizovaná Auth metadata se 3 účty;
- ephemeral local Supabase provedl clean replay všech 62 migrací, obnovu dat, row counts + SHA-256, private rotation metadata, migration order/history a RLS kontrolu 19 policies;
- Auth: 3 účty znovu vytvořeny s náhradními CI-only credentials, funkční login + `rak_admin_context` ověřen pro aktivní 1× owner a 2× admin;
- původní hesla, tokeny a sessions se **nezálohují ani neobnovují**;
- `rak_admin_devices`, `rak_admin_secrets` a ostatní privátní runtime security state se záměrně resetují;
- živý TEST Storage měl 0 bucketů / 0 objektů, proto byl pouze do privátního CI snapshotu přidán synthetic canary bucket + soubor; local restore vytvořil bucket/object, soubor stáhl a ověřil SHA-256;
- sanitized proof artifact: `rak-p15-restore-proof-9dd8b3dfc0c38984a327ce2d0ab194c08de1e787`, ID `10985561355`, digest `sha256:8d14b7c88340d38197350d69da14f5131245cb45736ec7636ab14bbe5a88d352`, retention do 27. 12. 2026;
- každý PASS i FAIL target končí `supabase stop --no-backup` + smazáním privátního workspace;
- produkce se při drillu nepoužívá ani nemění;
- náklady 0 Kč: public GitHub-hosted runner + local Supabase/Docker, bez třetího Supabase projektu/branch/PITR/add-onu.

Historické clean-replay normalizace jsou pouze explicitně whitelistované data-bound guard/verify bloky v migracích `20260918200612`, `20260918203159`, `20260918214441`, `20260918220817` a `20260919054241`; schema/policy změny se aplikují a konečný stav se následně ověřuje datovými, RLS a funkčními kontrolami.

### P2.1 – Výkon startu PWA · 100 %

- [x] CI měří cold start, offline reload a online recovery.
- [x] CI vynucuje časové/velikostní budgety a paritu proti immutable 1.7.69.
- [x] Je měřen první použitelný local-first stav, ne zelený online sync.
- [x] Byl proveden opakovaný fyzický iPhone/PWA cold/warm test.
- [x] Výsledky fyzického měření jsou zdokumentované včetně mediánu a maxima.

- CI měří cold/offline/recovery a paritu proti immutable 1.7.69.
- Fyzický iPhone/PWA PASS 27. 9. 2026: 5× cold = 1,4 / 1,1 / 1,2 / 1,2 / 1,1 s, medián 1,2 s, max 1,4 s; 5× warm = 0,1 s, medián/max 0,1 s.
- Měřicí konec je stabilní local-first Home, ne zelený online sync.

### P2.2 – Rozložení, DOM, CSS a interakce · 100 %

- [x] Chromium hlídá kritické mobilní rooty, geometrii a horizontální overflow.
- [x] Fyzicky projít podporované vzhledy a safe-area navigaci na iPhonu.
- [x] Fyzicky ověřit administraci, tabulkovou editaci a iOS klávesnici.
- [x] Fyzicky ověřit Report směny a exportní akce.
- [x] Fyzicky ověřit role clickthrough owner/admin/deputy/běžný uživatel.

- Chromium hlídá mobilní geometrii, overflow a kritické obrazovky.
- Fyzický iPhone PASS: vzhledy, safe-area, navigace, administrace, klávesnice, Report/export.
- Fyzický role clickthrough PASS: owner/admin/deputy/běžný uživatel; privilegované položky odpovídají role gate.

### P2.3 – Offline, fronta, verze a konflikty · 100 %

- [x] Zachovat pravdivý online/cache stav a neztrácet lokální frontu.
- [x] Zachovat local-first offline/reconnect bez mazání dat.
- [x] Chránit editované návrhy před opožděnou síťovou odpovědí.
- [x] Používat revizní CAS a odmítnout stale zápis bez tichého přepsání serveru.
- [x] Používat nereplayovatelný aplikační SQLSTATE P0001 pro očekávané RaK CAS konflikty.
- [x] Fyzicky ověřit dvouzařízení stale-write scénář.
- [x] Fyzicky ověřit přesný single-item conflict rescue se soukromým exportem a read-only server checkem.
- [x] Zpracovat konflikty podle typu; kategorie „ostatní“ se nesmí automaticky mazat.

- Local-first offline/reconnect funguje bez mazání dat a bez falešného konfliktu.
- CAS je fail-closed a používá nereplayovatelný aplikační SQLSTATE `P0001`; nepoužívat `40001` pro očekávaný RaK stale konflikt, protože PostgREST jej retryuje.
- Fyzický dvouzařízení TEST 28. 9. 2026: stale klient byl odmítnut bez přepsání novějšího serverového stavu.
- Conflict rescue fyzicky ověřen: nejprve soukromý export přesně jedné lokální položky, read-only server check, potom explicitní odstranění právě jedné lokální položky; server se nesmí změnit. Kategorie „ostatní“ se automaticky nemaže.
- Background sync nesmí měnit uživatelem zvolenou route.

### P2.4 – Diagnostika a soukromí telemetrie · 100 %

- [x] Mít sanitizovanou čtecí diagnostiku Auth/fronty/stavu bez syrových payloadů.
- [x] Udržovat Chromium/offline/performance provozní signály s jednoznačným PASS/FAIL.
- [x] Auditovat logy/reporty/screenshoty/exporty proti úniku tokenů, OS čísel, jmen a obsahu rozpisů.
- [x] Ověřit skutečné role/JWT a odmítnuté operace bez vypsání přihlašovacích údajů.
- [x] Fyzicky zobrazit na problematickém iPhonu konkrétní sanitizovanou příčinu konfliktu po vrstvách.
- [x] Používat měřitelné quality thresholds a fail-closed blokovat nebezpečný release.

- Browser/runtime diagnostika je centralizovaně sanitizovaná; žádné tokeny, OS čísla, jména ani obsah rozpisů v běžných logách.
- Role/JWT diagnostika ověřuje identitu/session/role bez vypsání tokenu.
- Fyzický iPhone PASS 28. 9. 2026: conflict diagnostika rozlišila stav aplikace, fronty, úložiště, typ a sanitizovanou příčinu bez zápisu na server.
- 1.7.139 odstranila poslední natvrdo zapsanou 1.7.136 z diagnostického nadpisu/lazy-import cache a používá `RAK_RELEASE_METADATA`.

## Trvalé funkční invariance

### Local-first startup

- Home, Rotace/Rozpisy, Kalkulačky a běžné Více musí být z lokálních dat/cache ve finálním vzhledu ovladatelné co nejdříve, bez čekání na Supabase sync.
- Online sync pouze aktualizuje data na pozadí; nesmí vracet uživatele na Home ani měnit aktuální stránku.
- Secure role prvky mohou čekat na bezpečné ověření, ale nesmí blokovat běžné lokální Více.
- Rotace → Více nesmí ponechat names dock/panel nad menu.
- První otevření Administrace používá malý secure admin shell; plný Admin se lazy-loaduje až při skutečné potřebě a nesmí být svázán se syncem.

### Neplánované absence – MO-only preference

Pro Dovolenou, Náhradní volno, Paragraf a Lékaře:
- mění se pouze vybrané dny;
- pokud chybějící pracovník byl původně na MO a původní TO po absenci zůstává bezpečně validní, **celé TO musí zůstat beze změny** a dopočítá se pouze MO;
- zachované TO musí mít správný počet lidí, žádnou nedostupnou/duplicitní osobu, platné kvalifikace a musí respektovat pravidlo TPKW02 při 3 absencích;
- pokud pracovník byl na TO nebo TO nelze bezpečně zachovat, smí se použít širší lokální přepočet pouze daného dne;
- fail-closed kontrola musí odhalit jakoukoli nepovolenou změnu chráněného TO.
- **Fyzický iPhone PASS 29. 9. 2026 – D / NV / § / Lékař:** všechny čtyři důvody fyzicky potvrzené v MO-only scénáři; při validním původním TO zůstává TO byte-identické, mění se pouze MO na vybraném dni / rozsahu a pracovník je v Absencích.

### „Odešel na kalírnu“ – minimal reflow

- Nejprve se hledá nejmenší bezpečný zásah do existujícího dne, zejména pokud pracovník odchází z MO a TO může zůstat beze změny.
- Každá varianta musí respektovat kvalifikace.
- Skóre: 1) minimum přesunutých lidí; 2) při shodě minimum přesunutých původních soustružníků; 3) minimum změněných buněk.
- Typický stav 5→4 na MO při odchodu soustružníka: pracovník z MFKF06 přejde na uvolněný soustruh, MFKF06 zůstane prázdná a MFKF10 zůstane na místě.
- Odchod z MFKF06 nevyžaduje další přesun. Odchod z MFKF10 preferuje MFKF06→MFKF10.
- Pokud přímý přesun neumožní kvalifikace, smí se použít nejkratší nutný řetězec; až pokud žádná lokální permutace není validní, použít scoped generátor pro konkrétní den.
- RaK 1.7.148 ukládá Kalírnu přímo do chráněné prázdné MO buňky se stejným `kalirnaOut` daymodem: viditelně `Jméno →K`, růžově, ale bez započtení do fyzického staffingu, statistik a historie generátoru.
- Bez jiné absence: fyzicky 5 TO + 4 MO, evidence Kalírny na volné MFKF06. S jednou další absencí: fyzicky 5 TO + 3 MO, evidence Kalírny na volné MSKC01.
- **Fyzický iPhone PASS 29. 9. 2026:** nové přímé evidenční zobrazení i staffing pravidla potvrzena; bod je uzavřen.

## Dodatečný seznam vlastníka – reconciliace 28. 9. 2026

Tento seznam byl po konsolidaci znovu porovnán s aktuálním `development`. Nevracet již implementované požadavky do kódu bez nové konkrétní regrese.

- **Administrace → Rozpisy → místní návrhy – FYZICKY PASS 28. 9. 2026:** RaK 1.7.141 sjednocuje neuložené místní návrhy, jejich exporty a „Smazat všechny místní návrhy“ do jednoho rámečku; tlačítka mají svislý odstup. Mazání zůstává fail-closed a lokální, nezasahuje online rozpis ani jinou frontu. „Statistické odchylky“ byly z této obrazovky odstraněny.
- **Rozpisy → přehled jména × skupiny strojů – FYZICKY PASS 28. 9. 2026:** přehled je výchozí rozbalený, používá TNK/W01/W02, Jméno 54 px, TO/MO i stroje 35 px a svislé oddělení sloupců. Další redesign jen při nové konkrétní fyzické připomínce.
- **Administrace → Pravidla generátoru:** implementovaná sjednocená mobilní karta `adminOpsUnifiedCard`; vlastní obsah používá rule/status/impact cards. Neprovádět další redesign bez fyzické připomínky vlastníka.
- **Administrace → Kantýna / jídelna – FYZICKY PASS 28. 9. 2026:** RaK 1.7.145 rozděluje editor do dvou kompaktních výchozím způsobem zabalených sekcí, zhutňuje tabulky a časová pole a drží tři spodní akce v jednom řádku. Ukládací logika zůstala beze změny; další redesign jen při nové konkrétní fyzické připomínce.
- **Administrace → Správci – FYZICKY PASS 28. 9. 2026:** RaK 1.7.146 zhutňuje obrazovku do kompaktního stavu 2×2 a výchozím způsobem zabalených sekcí Účty správců, Role a bezpečnost, Přihlášená zařízení a Moje heslo. Secure role gate, revoke zařízení, role, hesla a minimum 6 znaků zůstávají zachované; další redesign jen při nové konkrétní fyzické připomínce.
- **Owner 9811 při přesunu mimo rozpis:** architektonicky i automaticky ověřeno. TEST 28. 9. 2026 má `rak_admin_profiles.account_id=9811`, `role=owner`, `enabled=true`. `rak_admin_context` používá `rak_admin_profiles` a neodkazuje na `WORKER_ROSTER_SETTINGS` ani `machine_settings`. Gate `release-gate-17084` navíc synteticky přesouvá aktivní účet z rosteru mimo roster a ověřuje, že account/Auth identita zůstane stejná. **Přesun 9811 z pracovníků mezi účty mimo rozpis tedy sám o sobě owner oprávnění neodebere.**

Původně příliš roztažené obrazovky Pravidla generátoru, Kantýna/jídelna a Správci byly postupně zhutněny a fyzicky potvrzeny na iPhonu v releasech 1.7.144–1.7.146. Administrační série 1–5 je uzavřená.

## Jediný aktuální funkční backlog mimo uzavřených 13 bodů

Tyto položky jsou produktové požadavky; **neotevírají znovu 13bodový audit**, dokud neodhalí regresi některé jeho akceptace.

### Aktuální administrační série – řešit striktně po jednom

1. **Bod 1 – místní návrhy / Statistické odchylky: UZAVŘENO, FYZICKY PASS na 1.7.141.**
2. **Bod 2 – Administrace → Rozpisy → přehled jména × skupiny strojů: UZAVŘENO, FYZICKY PASS na 1.7.143.** Přehled je defaultně rozbalený; TNK/W01/W02; Jméno 54 px; TO, MO i strojové sloupce 35 px; TO/MO i stroje mají svislé oddělení. Panel „Neuložené místní návrhy“ je defaultně zabalený.
3. **Bod 3 – Administrace → Pravidla generátoru: UZAVŘENO, FYZICKY PASS na 1.7.144.** Pět kompaktních skládacích sekcí je výchozí zabalených; všechna původní ID polí, data atributy a ukládací logika zůstávají zachované.
4. **Bod 4 – Administrace → Kantýna/jídelna: UZAVŘENO, FYZICKY PASS na 1.7.145.** Dvě kompaktní výchozím způsobem zabalené sekce, zhutněné řádky/časy a tři spodní akce vedle sebe; původní datové hooky a ukládací logika zachované.
5. **Bod 5 – Administrace → Správci: UZAVŘENO, FYZICKY PASS na 1.7.146.** Stav správců je na iPhonu kompaktní 2×2; Účty správců, Role a bezpečnost, Přihlášená zařízení a Moje heslo jsou výchozím způsobem zabalené. Secure role/revoke/password logika zůstává zachovaná.

**Administrační série 1–5 je kompletně uzavřená.**

Po každém bodu: zelený exact-SHA CI → TEST preview → fyzický iPhone test → teprve po „ok“ bod uzavřít a přejít na další.

### Dashboard → Kalendář

- **RaK 1.7.153 – FYZICKY PASS na iPhonu 29. 9. 2026:** originální Google Calendar iframe, barevná legenda zdrojů, zavření modalu při spodní navigaci a account-scoped synchronizace kalendářů vybraných v Nastavení mezi zařízeními potvrzeny.
- **RaK 1.7.155 – FYZICKY PASS šířky legendy 29. 9. 2026:** štítky jsou jen na šířku krátkého popisku a řadí se vedle sebe.
- **RaK 1.7.158 – FYZICKY PASS na iPhonu 29. 9. 2026:** po deaktivaci všech štítků už poslední aktivní kalendář nezůstává zobrazený.
- Uložený výběr v Nastavení ovlivňuje pouze dashboard. Generátor rozpisu dál používá právě jeden pracovní kalendář podle zařazení účtu. Report dovolených od RaK 1.8.2 používá samostatně nastavený jeden kalendář v Administrace → Kalendáře; výchozí i bezpečný fallback je Obrábění D.
- **Obrábění D používané směnou D pro dovolené je chráněná invarianta:** neměnit jeho zdroj, název ani události v rámci dashboardových úprav.
- RaK 1.7.160 doplnila account-scoped `calendar_hidden_keys` pro přenos zapnuto/vypnuto legendy mezi zařízeními. Fyzický nulový stav ale FAIL: Google iframe bez zdroje na iPhonu zobrazil cookie bránu.
- **RaK 1.7.161 – exact-SHA CI GREEN, fyzický iPhone test 29. 9. 2026 částečný PASS:** při nule aktivních štítků se správně zobrazí lokální prázdný měsíční kalendář bez událostí a bez Google cookie brány; po zapnutí zdroje se vrátí originální Google iframe. Account sync viditelnosti z 1.7.160 zůstává.
- **RaK 1.7.163 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 29. 9. 2026:** při 0 aktivních kalendářích lokální prázdný měsíc vyplňuje stejnou šířku i výšku jako Google iframe a pravá mezera je odstraněná. Po zapnutí zdroje se vrací originální Google Calendar iframe. Výběr kalendářů, `calendar_hidden_keys`, account sync, pracovní kalendáře i chráněné Obrábění D pro dovolené zůstaly beze změny. Produkce ani `main` nebyly změněny.

### Ostatní produktový backlog

Uzavřené položky:

1. **RaK 1.7.166 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 29. 9. 2026:** Kalkulačky → Brusy a Administrace → Brusy jsou dorovnané na referenční vzhled Frézek; `+ / −` má správné rozměry, výšku, glass vzhled i centrování. Oprava je přímo ve skutečných vlastnících `brusy-fhb-v157.js` a `brusy-fhb-v158.js`; Administrace → Frézky zůstala beze změny.
2. **RaK 1.8.1 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 30. 9. 2026:** popis nové generace v „O aplikaci“ je zkrácený přibližně na polovinu do pěti kratších bodů. Uživatelské označení zůstává `RaK 1.8`, historická 1.7 zůstává „Stabilizace a local-first základ“. Runtime SHA `5a5e655517b89deb19af2e7d4911c7a73aa0167d`; první parity běh měl dvě FCP špičky, čistý rerun stejného SHA prošel bez změny limitů.
3. **RaK 1.8.3 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 30. 9. 2026:** Administrace → Kalendáře má samostatný „Kalendář pro report dovolených“, uložený ve stávajícím `SHIFT_CALENDAR_SETTINGS`; výchozí/fallback je Obrábění D. Report už není svázaný se směnou přihlášeného účtu, Dashboard a generátor zůstávají beze změny. Finální fyzicky ověřený SHA `d964ff2da700423a1932cff9d42032ccbd0ecf39`; 1.8.3 navíc potvrzuje požadovaný odstup bloku od „Směny A“.
4. **RaK 1.8.4 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 30. 9. 2026:** ve Více → Správce je odstraněný výchozí text „TEST diagnostika se spustí pouze klepnutím.“; stavový prvek zůstává zachovaný a po „Ověřit oprávnění“ dál zobrazí výsledek živé diagnostiky. Finální fyzicky ověřený SHA `8678cb313ecb84513f36b1339468c2c03a2fe4d5`.
5. **RaK 1.8.5 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 30. 9. 2026:** Dashboard → Kantýna i Jídelna se při klepnutí na spodní navigaci včetně local-first „Více“ správně zavřou před změnou obrazovky. Oprava je ve společném teardownu spodní navigace; finální fyzicky ověřený SHA `aa2b26c35f7c866613d420c2dd8f93dfae7a0f6d`.

6. **RaK 1.8.7 – exact-SHA CI GREEN + TEST preview READY + fyzický iPhone PASS 30. 9. 2026:** testovací účet může změnit vlastní heslo a „Ověřit oprávnění“ už nepíše, že podepsaná relace není dostupná. Kořen byl v duplicitním runtime zdroji: `app-menu.js` zůstal na admin-only `getAdminAccessToken`, i když helper a změna hesla už používaly signed-role token. Finální oprava sjednotila runtime i helper na `getSignedAdminAccessToken` a regresní test hlídá jejich shodu; admin-write oprávnění zůstává pouze owner/admin. Fyzicky ověřený SHA `3d919c88757ca75a20020eb2ae51901c922fdbbb`.

**Aktuálně není evidovaný žádný otevřený produktový bod.**

- Neplánovaná Kalírna 1.7.148: **FYZICKY PASS**.
- MO-only Dovolená / Náhradní volno / Paragraf / Lékař: **FYZICKY PASS**.
- Pokud se objeví nová konkrétní regrese nebo nový požadavek vlastníka, řešit jej jako nový samostatný bod; automaticky neotvírat znovu uzavřený 13bodový audit.


## Kandidát pro budoucí `main` – aktuální stav

- Původní připravený kandidát RaK 1.8.4 a draft PR #5 jsou **zastaralé a uzavřené bez merge**.
- Nové regresní opravy 1.8.5–1.8.7 jsou fyzicky potvrzené; aktuálně není evidovaný otevřený produktový bod. Až vlastník výslovně řekne pokračovat s přípravou pro `main`, připravit nový kandidát z fyzicky ověřeného RaK 1.8.7 a znovu projít produkčními fail-closed guardy. Samotné zapsání tohoto PASS nic do `main` ani produkce nenasazuje.
- Aktuální `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`; produkční Vercel ani produkční Supabase nebyly změněny.

## Release / test checklist pro další funkční změnu

Před commitem/releasem:
- načíst živý `development` HEAD;
- opravit kořen, ne přidat další compatibility/preboot záplatu;
- syntax + relevantní unit/integrace;
- security/privacy/offline/CAS regrese podle dotčené oblasti;
- dvě čisté canonical sestavy a jednotná release metadata;
- performance budget + parity bez uvolnění limitů;
- TEST-only HTTP/DB ověření.

Po CI:
- exact SHA musí mít požadované PASS důkazy;
- Vercel deployment musí být READY a odpovídat exact SHA;
- ověřit, že konfigurace používá TEST Supabase a ne produkční ID;
- produkci neměnit bez nového výslovného souhlasu;
- pokud změna vyžaduje fyzický iPhone test, neoznačit ji za fyzicky uzavřenou před potvrzením vlastníka.

## Údržba tohoto dokumentu

- Udržovat pouze **současný stav, trvalé invariance, finální důkazy a skutečný otevřený backlog**.
- Nevracet do něj chronologii všech mezikroků, neúspěšných CI pokusů a dávno překonaných procent.
- Po uzavření backlog položky ji přesunout do jedné stručné finální věty k příslušné invariantě a odstranit starý průběh.
- Pokud je potřeba historický detail, použít Git historii, Actions run nebo konkrétní artifact; tento soubor není deník.
