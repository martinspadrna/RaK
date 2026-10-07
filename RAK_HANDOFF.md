# RaK – kanonický handoff

Toto je jediný živý řídicí dokument projektu RaK.

Stálý odkaz: <https://github.com/martinspadrna/RaK/blob/development/RAK_HANDOFF.md>

Historie před konsolidací je v Git historii souboru, zejména v commitu `a31452ff0644899e4c46a7cce0d544b99da78755`. Tento dokument není deník: patří sem jen aktuální stav, trvalé invarianty, rollback a skutečně otevřená práce.

## Nejkratší prompt pro nový chat

> Pokračuj v projektu RaK podle aktuálního `RAK_HANDOFF.md` na živém HEAD větve `development`. Pracuj pouze v TESTu; produkci ani `main` neměň bez mého nového výslovného souhlasu s konkrétním krokem.

## Povinný začátek každého pokračování

1. Online zjistit živé SHA větví `development` a `main`; SHA níže jsou důkazní body, ne náhrada živé kontroly.
2. Načíst tento soubor z aktuálního `development` HEAD.
3. Ověřit, že produkční Vercel alias/deployment, Supabase migration head a produkční Edge Functions zůstaly beze změny.
4. Před zápisem znovu načíst živý `development` HEAD. Bez force push a bez přepsání souběžné práce.
5. Zdroj, Actions, Vercel a Supabase ověřovat online. Místní kopie není autorita.
6. Rozpor dokumentace se strojovým důkazem řešit fail-closed: zastavit, popsat rozdíl a přepočítat plán.

## Závazné hranice

- Od 1. 10. 2026 probíhá veškerý další vývoj, DB práce, Edge Functions, nasazování a testování pouze v TEST prostředí.
- `main`, produkční Vercel deployment/alias a produkční Supabase se nesmí měnit bez nového výslovného souhlasu vlastníka s konkrétním produkčním krokem.
- TEST Supabase: `cgshssdjgzzuprlwnabl`.
- Produkční Supabase: `bkqamcbkiwumsvelahxr`.
- Nový nebo placený Supabase projekt, branch, PITR či add-on vyžaduje předchozí souhlas. Preferovat řešení za 0 Kč.
- Nikdy nevypisovat ani neukládat do chatu, GitHubu, logů nebo artifactů hesla, JWT, API klíče, privátní ICS URL, Vault secret values, osobní odpovědi ani tajný Vercel share parametr.
- Nepřepisovat už aplikované migrace. Nové opravy musí být forward-only migrace.
- `rak-p15-restore-export` je TEST-only a nesmí se nasadit do produkce.
- Nemazat Safari/PWA data, `localStorage`, `CacheStorage`, service worker, frontu ani uživatelská data jako univerzální opravu.
- Testy neobcházet ani neoslabovat; opravovat kořenovou příčinu.
- Fyzický iPhone a Chromium jsou rozdílné důkazy. Chromium nenahrazuje fyzickou přejímku.
- Když vlastník po právě vyžádaném fyzickém testu napíše jen „ok“, znamená to PASS právě tohoto testu.
- Funkční release zvýší sjednocenou runtime verzi právě jednou. Dokumentační nebo CI-only změna verzi nezvyšuje.

## Aktuální stav k 7. 10. 2026

### RaK 1.9.0 je v produkci

Rollout 1.9.0 je dokončený. Produkční release byl proveden auditovaným workflow po exact-main validaci; nejde už o kandidáta ani čekající plán.

- ověřený funkční `development` důkazní bod: `c595880728f449658fe8b14b37768572c4a1dd1f`;
- release větev `release/1.9.0-main-ready`: `65222471c59e655bf6d96f1db0907117b4464ffb`;
- PR `#8`: merged;
- produkční `main` merge commit: `22262ec30312ffb44defa5e21e0e687d3dfa1723`;
- production-target PR CI `#807` / ID `37141811531`, attempt 2: SUCCESS na stejném release SHA bez změny kódu nebo uvolnění limitů;
- exact-main validation `#808` / ID `37143409209`, attempt 1: SUCCESS;
- audited production release `#3` / ID `37143900470`: SUCCESS.

První pokus production-target PR CI #807 selhal pouze na proměnlivém FCP P90 parity signálu; opakování stejného SHA prošlo bez změny kódu nebo limitů. Exact-main #808 následně prošel napoprvé včetně Chromium/offline, PWA budgetu, parity proti 1.7.69, quality thresholdů, HTTP a canonical kontrol.

### Produkční Vercel – aktuální stav

- veřejný alias: <https://skoda-spada.vercel.app>;
- aktivní deployment: `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`;
- immutable URL: <https://skoda-spada-ourw28jh8-martinspadrnas-projects.vercel.app>;
- stav: READY, target production;
- source branch: `main`;
- source commit: `915a75793207b4125a0489dd8e5c824696f227ab`;
- veřejná runtime verze: RaK `1.9.0`;
- veřejný alias po rollout kontrole vracel HTTP 200 a načítal `app.js?v=1.9.0`;
- Vercel po nasazení nehlásil v poslední hodině žádné runtime errors;
- bezprostřední frontend rollback target na poslední ověřenou produkci 1.8.8: `dpl_3qwMi6CGZnnZ29rU5ptYyjKAGFVv`.

Release 1.9.0 byl frontendový rollout přes auditovaný Vercel workflow; produkční DB migrace ani Edge Functions se v tomto release workflow neměnily.

### TEST Vercel – pracovní prostředí

- aktuální `development` HEAD: `067a5aacd67dfd8effbba50cf32e8d5006e1db14`;
- poslední ověřený READY deployment: `dpl_6znxfBFW2tpn1wVze13hpCXiE8PB`;
- stabilní development URL: <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>;
- immutable URL: <https://skoda-spada-rabqhev1r-martinspadrnas-projects.vercel.app>;
- source commit deploymentu: `067a5aacd67dfd8effbba50cf32e8d5006e1db14`;
- development validation `#832` / ID `37603431667`: SUCCESS včetně release-preview jobu;
- TEST obsahuje owner-only prototyp `Administrace → Přehled směny`. Je lokální-only bez Supabase zápisu a obsahuje ALD 1–3, individuální „Vsázky před kalírnou“ (Awa/Awi/TW/SR/FR/ZSB-RLR/SRRG/AAR), poslední vsázky ALD1–3, Výrobu AAR a tabulku 0AM 409 155 / 409 111 s automatickými součty;
- vlastník fyzicky potvrdil relevantní vizuální paritu, cross-shift spodní navigaci a dvousloupcové rozložení Kalendář/Nastavení;
- přibližně 608 KiB nekritického JavaScriptu už není v čekané startovací cestě;
- kalkulačkové styly a route-only styly Nastavení/Statistik jsou odložené mimo kritický start při zachování pořadí kaskády;
- 18 blokujících stylesheetů má celkem 567 228 B;
- CI parity proti neměnné 1.7.69 i produkční exact-main validace #808 prošly bez uvolnění limitů.

Před novou prací vždy ověřit živý `development` HEAD a aktuální TEST alias; hodnoty výše jsou důkazní body, ne pokyn k automatickému přesunu aliasu.

### Produkční Supabase – zmrazený výchozí stav

Projekt `bkqamcbkiwumsvelahxr`:

- migration head: `20260930112049`;
- extension `http` je ve schema `extensions`;
- ve Vault jsou čtyři platné secrety `rak_calendar_kalirna_[a-d]_ics`;
- všechny čtyři chráněné Kalírna feedy byly při rollout kontrole validní ICS a v limitu velikosti;
- CAS postcheck: 0 chybějících relations, 0 chybějících funkcí, 7 CAS funkčních řádků a 0 CAS failures;
- legacy v2 cutover je aktivní: oba staré v2 writery jsou vypnuté;
- account UI RLS a privileges prošly postcheckem.

Známý advisor baseline se rolloutem nezměnil a nesmí se vydávat za novou regresi bez porovnání:

- security: `rls_enabled_no_policy=22`, `anon_security_definer_function_executable=14`, `authenticated_security_definer_function_executable=48`, `auth_leaked_password_protection=1`;
- performance: `unused_index=17`.

### Produkční Edge Functions – zmrazený výchozí stav

- `rak-admin-users`: platform version `v13`, ACTIVE, `verify_jwt=true`, zdroj shodný s ověřeným TEST/release zdrojem;
- `rak-absence-calendar`: platform version `v15`, ACTIVE, `verify_jwt=true`; zdroj je shodný s repozitářem. Bez nové konkrétní příčiny jej neměnit;
- `hradnik-sync`: nesouvisející platform version `v3`.

TEST-only `rak-p15-restore-export` byl po odhalení nechtěného hromadného deploye se souhlasem vlastníka z produkce odstraněn; měl 0 invocations. V produkci nesmí být a znovu se tam nikdy nenasazuje.

## Kalendáře – trvalý model

RaK pracuje s osmi provozními kalendáři:

- 4× Kalírna A–D: privátní ICS zdroje chráněné produkčním Vaultem pod `rak_calendar_kalirna_[a-d]_ics`;
- 4× Obrábění/Diferenciál A–D: nastavované v RaK podle existujícího modelu aplikace.

Privátní ICS URL se nesmí zapsat do repozitáře, handoffu, logů ani artifactů. Správa kalendářů v aplikaci nesmí omylem přepsat Vault secrety.

- Dashboard může zobrazovat uživatelem zvolené kalendáře a synchronizovat viditelnost účtu mezi zařízeními.
- Generátor používá právě jeden pracovní kalendář podle zařazení účtu.
- Report dovolených má samostatnou volbu v `Administrace → Kalendáře`; výchozí a bezpečný fallback je Obrábění D.
- Obrábění D používané pro report dovolených je chráněná invarianta: dashboardové změny nesmějí změnit jeho zdroj, název ani události.

## Trvalé funkční a bezpečnostní invarianty

### Local-first a PWA

- Home, Rotace/Rozpisy, Kalkulačky a běžné Více musí být z lokálních dat/cache rychle ovladatelné bez čekání na Supabase sync.
- Online sync aktualizuje data na pozadí a nesmí měnit aktuální route ani vracet uživatele na Home.
- Secure role UI smí čekat na bezpečné ověření, ale nesmí blokovat běžné lokální Více.
- Offline/reconnect nesmí ztratit lokální frontu nebo uživatelská data.

### Účty, role a soukromí

- Běžní pracovníci zůstávají v OS-only modelu bez nových hesel, e-mailů, OTP či Auth účtů.
- Veřejné/anonymní cesty nesmějí vydávat celý adresář ani citlivá osobní pole.
- Owner/admin/deputy oprávnění používají fail-closed signed-role gate; admin zápisy zůstávají pouze owner/admin podle konkrétní operace.
- Owner účet `9811` není oprávněním závislý na přítomnosti v pracovním rosteru.
- Známý nezbytný rozsah veřejně čitelné společné rotace je vědomě přijaté zbytkové riziko; nerozšiřovat jej.
- Logy, diagnostika, screenshoty a exporty nesmějí obsahovat tokeny, OS čísla, jména ani obsah rozpisů mimo výslovně schválený soukromý export.

### CAS a konflikty

- Očekávané RaK stale/CAS konflikty používají nereplayovatelný SQLSTATE `P0001`, ne `40001`.
- Stale klient musí být odmítnut bez tichého přepsání novějšího serverového stavu.
- Conflict rescue nejprve vytvoří soukromý export přesně dotčené lokální položky, potom provede read-only server check a teprve po explicitní akci odstraní pouze tuto lokální položku.
- Kategorie „ostatní“ se nesmí automaticky mazat.

### Rozpisy a absence

- Dovolená, Náhradní volno, Paragraf a Lékař mění jen vybrané dny.
- Pokud chybějící pracovník byl na MO a původní TO zůstává bezpečně validní, celé TO musí zůstat beze změny a dopočítá se jen MO.
- „Odešel na kalírnu“ používá nejmenší bezpečný zásah, respektuje kvalifikace a evidenční růžovou buňku `Jméno →K` nezapočítává do fyzického staffingu.
- Již fyzicky schválené administrační a mobilní obrazovky bez nové konkrétní regrese znovu neredesignovat.

## Nouzový rollback produkce 1.9.0

Release 1.9.0 neměnil produkční DB migrace ani Edge Functions. Bezprostřední rollback 1.9.0 → 1.8.8 je proto frontendový: po novém výslovném souhlasu vlastníka vrátit produkční Vercel alias na ověřený deployment `dpl_3qwMi6CGZnnZ29rU5ptYyjKAGFVv` a znovu provést veřejný HTTP/runtime smoke.

Pokud by bylo potřeba rollbackovat ještě dál z 1.8.8 na starý frontend 1.7.83, stále platí původní koordinovaný rollback kvůli CAS cutoveru:

1. vrátit produkční Vercel alias na ověřený deployment `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`;
2. v produkční DB spustit připravený `supabase/ops/rollback_188_restore_legacy_v2_writers.sql` a ověřit jeho postcheck.

Druhý, hlubší rollback nikdy neprovádět jen na jedné vrstvě. Žádný rollback nespouštět bez nového výslovného souhlasu vlastníka.

Rolloutové soubory zůstávají auditním a nouzovým důkazem:

- `supabase/ops/PRODUCTION_ROLLOUT_188.md` – rollout dokončen, dokument už není aktivní čekající plán;
- `supabase/ops/production_preflight_188.sql`;
- `supabase/ops/production_calendar_prerequisite_188.sql`;
- `supabase/ops/production_postcheck_188.sql`;
- `supabase/ops/rollback_188_restore_legacy_v2_writers.sql`.

Forward rollout SQL už byl aplikovaný. Nespouštět jej znovu naslepo a nepřepisovat aplikované migrace.

## Otevřený backlog

- Vlastník znovu výslovně otevřel stabilizační a výkonnostní plán v TESTu. Etapa odložení nekritického JavaScriptu, kalkulačkových stylů a prokazatelně route-only stylů Nastavení/Statistik je uzavřená výše uvedenými důkazy; Rotace a „kam jdu“ zůstaly v povinném startovacím jádru.
- Zbývajících 18 blokujících stylesheetů (567 228 B) zatím dále neodkládat naslepo. `styles-menu-polish.css`, dashboardové, theme a rotační jádro ponechat beze změny, dokud nové měření a regresní test neprokážou další bezpečnou hranici.
- Současně proměřit síťové a databázové požadavky dashboardu a teprve podle důkazu odstranit duplicity nebo paralelizovat nezávislá čtení. Indexy ani datový model neměnit bez naměřeného pomalého dotazu.
- Otevřená fyzická přejímka owner-only prototypu `Administrace → Přehled směny`: na iPhonu zkontrolovat použitelnost zadávání, šířky/scroll tabulek a podle výsledku upravit rozložení. Dokud vlastník neschválí datový model, zůstává ukládání pouze lokální a bez produkčního/TEST Supabase zápisu.

Uzavřené administrační série automaticky znovu neotvírat bez nové konkrétní regrese.

## Checklist pro další funkční změnu v TESTu

Před commitem:

1. načíst živý `development` HEAD;
2. opravit kořenovou příčinu;
3. spustit syntax, relevantní unit/integration a dotčené security/privacy/offline/CAS regrese;
4. ověřit dvě čisté canonical sestavy a jednotná release metadata;
5. zachovat performance budget a paritu bez uvolnění limitů;
6. provést pouze TEST HTTP/DB ověření.

Po CI:

1. exact SHA musí mít požadované PASS důkazy;
2. TEST Vercel deployment musí být READY a odpovídat exact SHA;
3. konfigurace musí používat TEST Supabase a nesmí obsahovat produkční projekt;
4. při požadovaném fyzickém iPhone testu čekat na potvrzení vlastníka;
5. produkci a `main` ponechat beze změny, dokud vlastník výslovně neschválí konkrétní další krok.

## Údržba tohoto dokumentu

- Udržovat jen současný stav, trvalé invarianty, rollback, finální důkazy a skutečný otevřený backlog.
- Nevracet sem chronologii mezikroků, staré procentuální audity, dávno uzavřené série ani neúspěšné CI pokusy bez aktuálního dopadu.
- Po uzavření bodu ponechat nejvýše jednu stručnou finální větu u příslušné invarianty.
- Historický detail hledat v Git historii, Actions runu nebo konkrétním artifactu.
- Po větším balíku aktualizovat tento soubor; nevytvářet paralelní plánovací handoff.
