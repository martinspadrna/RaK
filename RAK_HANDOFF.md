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

## Aktuální stav k 3. 10. 2026

### RaK 1.8.8 je v produkci

Rollout je dokončený. Nejde už o kandidáta ani čekající produkční plán.

- původní funkční `development` důkazní bod: `4767037231705be53817201e3fe4a5c854ff31fb`;
- release větev `release/1.8.8-main-ready`: `716cb7806f742136cc93fef30432f249e37b7f97`;
- PR `#7`: merged;
- produkční release commit: `ec7e9147f85028038286a66eacf40d352c12a513`; aktuální `main` nad ním obsahuje pouze dokumentační commit `fa782f1fc1346115954eb51b9fbb5b7b37741c46`;
- release HEAD a merge commit mají shodný tree SHA `e91ac3c6e91583769779218a90a95ecbd85e543d`;
- production-target CI `#778`, attempt 3: PASS;
- exact-main validation run `#779` / ID `36764543066`, attempt 2: SUCCESS;
- audited production release run `#2` / ID `36766143512`: SUCCESS.

První pokus exact-main validace selhal pouze na proměnlivém FCP P95 benchmarku. Opakování stejného SHA prošlo bez změny kódu nebo uvolnění limitů.

### Produkční Vercel – zmrazený výchozí stav

- alias: <https://skoda-spada.vercel.app>;
- aktivní deployment: `dpl_3qwMi6CGZnnZ29rU5ptYyjKAGFVv`;
- stav: READY, target production;
- source commit: `ec7e9147f85028038286a66eacf40d352c12a513`;
- veřejná runtime verze: RaK `1.8.8`;
- produkční `supabase-config.js` používá pouze produkční projekt a neobsahuje TEST ref;
- při rollout kontrole nebyly na login obrazovce konzolové chyby ani warningy;
- 120 first-party funkčních/vizuálních JS/CSS assetů bylo proti poslednímu ověřenému TEST deploymentu hashově shodných; výjimkou je jen prostředí-specifický `supabase-config.js` a Vercel feedback injection;
- ověřený starý frontend rollback target: `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`.

V okamžiku rollout kontroly byla produkce funkčně a vzhledově 1:1 s ověřenou TEST verzí 1.8.8. Další změny v TESTu smějí prostředí záměrně rozdělit až do případného nového, samostatně schváleného produkčního releasu.

### TEST Vercel – pracovní prostředí

- ověřený aplikační HEAD nasazený do TESTu: `c595880728f449658fe8b14b37768572c4a1dd1f`; novější dokumentační commity se vždy zjišťují živě podle povinného úvodního postupu;
- poslední ověřený READY deployment: `dpl_5BWrpyh11dHEVLWveoxqv3UpkKQK`;
- stabilní development URL: <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>;
- immutable URL: <https://skoda-spada-7v2pomczl-martinspadrnas-projects.vercel.app>;
- source commit deploymentu: `c595880728f449658fe8b14b37768572c4a1dd1f`;
- veřejná runtime verze: RaK `1.9.0`;
- development validation `#806` / ID `37138303892`, attempt 1: SUCCESS; úplná sada prošla 125 kontrolami;
- vlastník fyzicky potvrdil opravenou vzhledovou paritu proti 1.8, rozložení navigace účtů bez Rotace a dvousloupcové rozložení směn v Nastavení → Kalendář.

Aktuální optimalizační důkaz:

- přibližně 608 KiB nekritického JavaScriptu už není v čekané startovací cestě;
- kalkulačkové styly `styles-calc-panels.css` a `styles-calculators-mid.css` o celkové velikosti 69 911 B se načítají až s kalkulačkami, ale před jejich označením jako připravené;
- `styles-settings-runtime.css` a `styles-stats-polish.css` o dalších 22 611 B se načítají až s Více/Rotací, ale před prvním úplným vykreslením příslušné feature;
- počet blokujících stylesheetů klesl z 22 na 18 a jejich objem na 567 228 B; pořadí CSS kaskády zůstává zachované přes původní sloty;
- run `#789` proti neměnné 1.7.69 naměřil FCP p50 232 ms proti 264 ms (−12,1 %) a p90 352 ms proti 364 ms; jde o CI signál, ne tvrzení o každém zařízení;
- úplná lokální kontrola prošla 125 bloky, browser smoke prošel ve třech mobilních rozměrech bez runtime výjimky a dvě čisté canonical sestavy měly shodný digest `41f7bab27d2607f2ce27c020b8616aa4c943caecb8d6b4ead05e1403d1d93c1a`;
- CI `#806` zachovalo performance budget i paritu bez uvolnění limitů; veřejný TEST alias vrátil HTTP 200, nasazený zdroj používá pouze TEST Supabase a runtime i release metadata hlásí 1.9.0;
- dashboard a „kam jdeš“, Rotace, Kalkulačky, Více, administrační obrazovky, účet mimo směnu D i Nastavení → Kalendář byly zkontrolovány automaticky a dotčené vizuální opravy také fyzicky vlastníkem.

Před novou prací vždy ověřit živý `development` HEAD a aktuální TEST alias; hodnoty výše nejsou pokyn k automatickému přesunu aliasu.

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

## Nouzový rollback produkce 1.8.8

Produkční rollback není pouze přesun Vercel aliasu. CAS cutover vypnul dva v2 writery, které starý frontend 1.7.83 potřebuje.

Při skutečně schváleném rollbacku musí koordinovaně proběhnout oba kroky:

1. vrátit produkční Vercel alias na ověřený deployment `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`;
2. v produkční DB spustit připravený `supabase/ops/rollback_188_restore_legacy_v2_writers.sql` a ověřit jeho postcheck.

Neprovádět ani jeden krok samostatně a nic z toho nespouštět bez nového výslovného souhlasu vlastníka s rollbackem.

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
