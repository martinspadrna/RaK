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

## Aktuální stav k 11. 10. 2026

TEST v2.0.2 je nasazený: kantýna/jídelna mají denní panely ve dvojicích, toolbar rozpisu má odstup od okraje a Kalírna je jen ve Výjimkách dne. Přehled směny průběžně ukládá oddělený místní draft, obnovuje jej po zavření a nabízí Vymazat přehled bez smazání online zálohy; Uložit výslovně zálohuje online. O aplikaci má stručný souhrn bez zmínky o Mistrovi a data všech generací (doložené release dny, nejstarší verze 5/26). Neschopenka se zobrazuje bez (N), uložený kód N zachován. Role, glass/časy, Neschopenka a zabezpečené přihlášení zachovány. Aktuální TEST kandidát připraven, fyzická iPhone přejímka čeká; produkce zmrazená.

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

- funkční TEST důkazní bod v2.0.2: `05029ee224f96ac021726ed8dfebfe6b2392c2b0`;
- poslední ověřený READY deployment: `dpl_94zskQZjN9H9B8jPfab9rdpQXfgq`;
- stabilní development URL: <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>;
- immutable URL: <https://skoda-spada-pltd69k7p-martinspadrnas-projects.vercel.app>;
- source commit deploymentu: `05029ee224f96ac021726ed8dfebfe6b2392c2b0`;
- development validation `#911` / ID `38165217440`, attempt 1: SUCCESS včetně release-preview jobu. Veřejný TEST HTTP200, v2.0.2, TEST Supabase isolation a přesná shoda 12 assetů ověřeny;
- Nad Tvrdotou/Měkotou jsou samostatná tlačítka Výjimky dne / Neplánovaná dovolená / Odebrat. Plovoucí nabídka při běžném nebo výjimkovém kliknutí je odstraněna. Režimy jsou výlučné v každé tabulce; výběr dovolené otevře původní dialog a ukončí readonly režim pro Ručně upravit. Odebrat mění jen místní návrh do Uložit rozpis. Absence mají také samostatné Odebrat. Mobilní toolbar má tři akce vedle sebe podle dostupné šířky; do 420px Odebrat jako ×, dotykové cíle nejméně 44px. Načíst měsíc a Obnovit náhled reportu odstraněny, živý náhled a Načíst online zachovány.
- TEST 1.9.26 obsahuje owner/Mistr přehled po pracovištích (v každém všechny tři aktivní indexy); datum/směna vedle sebe i na mobilu; automatickou směnu A–D, ranní/noční a 8/12 h podle aktivního cyklu RaK při otevření. Noční datum odpovídá začátku směny. Vždy dostupný ruční výběr; bez aktivní směny žádná falešná automatická volba. Vsázky ALD1/ALD2 jsou nefocusovatelná output počítadla − / počet / + vpravo s minimem 0. ALD3 má Poslední vsázku i ruční Celkem vsázek. Editovatelná číselná pole otevírají numeric/decimal klávesnici, pomocná lišta + / − umožňuje výpočty bez změny focusu. Poslední výpočet a Vrátit jsou přechodně pod indexem, zmizí při zápisu jinde a po vrácení; Vrátit neotevírá pole ani klávesnici. Historická calculations data jsou uchována bez trvalého UI. Párová pole mají stejnou pevnou výšku a zarovnání. Poslední vsázka a ruční Celkem vsázek mají název vlevo a pole vpravo; názvy dílů ALD1/2 zvětšené na 16px, Hodnota u Dusíku odstraněna. Před 145 nabízí ×64, Po nýtování je přejmenováno Po 145 s ×32. Doplňující údaje odstraněny z UI; historická data se při uložení zachovávají. Staré klíče se čtou jako směna D, nové obsahují tým. Datum je v ohraničeném rámečku s českým textem a nativním pickerem; popisky operací vystředěné; řádky ALD1/ALD2 oddělené čarou, počítadla roztažená blíž k názvům, +/hodnota/− mají stejný střed a výšku bez obecného spodního marginu. Celé indexové řádky barevné (zelená/modrá/oranžová). Zadaná celá čísla 1–99 nabízejí ×32 ve Skladu, Montáži, MO Lis a TO; ×64 u Lisů před a po kalení. Jednosloupcová pole roztažená pro nabídku přepočtu; popisky zůstávají nad polem. Kliknutí přepočítá pouze vybrané pole s owner kontrolou. Bez horizontálního posouvání, online záloha k ověřenému owner/Mistr účtu, místní kopie a trvalá offline fronta; nová DB/RPC pouze v TESTu, bez Edge zápisů;
- Úplně dole je živý SVG obrázkový souhrn na výšku: jedna celá souvislá výrobní tabulka podle Excelu, všech 18 dílů svisle bez opakování ALD a s prázdnými nulovými počty, automatické součty a readonly fullscreen dialog (pinch, pan, dvojklik, ×/Escape; tlačítka −/+ a Celek odstraněna). Vlastník fyzicky schválil předchozí 1.9.20; nový náhled 1.9.24 čeká na jeho přejímku. Načíst předchozí odstraněno z UI i obsluhy.
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
- Owner/admin/deputy/Mistr oprávnění používají fail-closed signed-role gate; admin zápisy zůstávají pouze owner/admin podle konkrétní operace.
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

- Produkční rozpor z read-only kontroly 9. 10. 2026: migration head a Vercel zůstávají dle baseline, ale API vrací `rak-admin-users` v15, `rak-absence-calendar` v17 a aktivní `rak-p15-restore-export` v2 (`verify_jwt=false`). Původní tvrzení o odstranění exportu výše není aktuálním strojovým důkazem potvrzené. Produkční stav se v této práci nemění. Po upozornění na rozpor vlastník výslovně zadal pokračovat přehledem směny; rozsah je omezen na lokální frontend TESTu bez DB/Edge zápisů. Před jakýmkoli dalším produkčním krokem tento rozpor objasnit.

- Vlastník znovu výslovně otevřel stabilizační a výkonnostní plán v TESTu. Etapa odložení nekritického JavaScriptu, kalkulačkových stylů a prokazatelně route-only stylů Nastavení/Statistik je uzavřená výše uvedenými důkazy; Rotace a „kam jdu“ zůstaly v povinném startovacím jádru.
- Zbývajících 18 blokujících stylesheetů (567 228 B) zatím dále neodkládat naslepo. `styles-menu-polish.css`, dashboardové, theme a rotační jádro ponechat beze změny, dokud nové měření a regresní test neprokážou další bezpečnou hranici.
- Současně proměřit síťové a databázové požadavky dashboardu a teprve podle důkazu odstranit duplicity nebo paralelizovat nezávislá čtení. Indexy ani datový model neměnit bez naměřeného pomalého dotazu.
- TEST 1.9.11 má nasazené celé barevné pruhy podle indexu (zelená/modrá/oranžová) a ruční přepočet zadaných celých hodnot 1–99: ×32 u Skladu, Montáže, MO Lis (11+21) a TO (212); ×64 u Lisů skladu před kalením (31) a po kalení (121). Nabídka vedle pole reaguje na ruční vstup i načtený záznam; kliknutí přepočítá pouze dané pole, owner gate kontrolován. Ostatní sloupce přepočet nenabízejí. Jedenáct unit/VM testů, dvě čisté canonical sestavy a CI #868 (ID 38074715518) včetně release-preview prošly. Chromium 320/390/768/1366 px ověřil všechny násobitele, rozsah 1–99 a odmítnutí 0/negativních/desetinných/100+, kliknutí 12×32=384 a 12×64=768, save/reload, všechny barevné pruhy, nabídky bez horizontálního přetečení a owner gate; původní kontrola data, centrování a počítadel také prošla. READY deployment odpovídá přesnému funkčnímu SHA; veřejný HTTP 200, verze 1.9.11, přesná shoda modulu a TEST izolace ověřeny. Produkční deployment, main, migration head a Edge Functions při pre/post kontrole beze změny. Čeká fyzická přejímka na iPhonu včetně rámečku data; Chromium nenahrazuje Safari.

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


## TEST 1.9.12 – rozlišení nýtování (2026-10-10)
- Na žádost uživatele rozdělen blok Nýtování na Před 145 a Po 145 vedle sebe u každého aktivního indexu.
- Dosavadní op145 zachováno jako Před 145 (odpovídá původnímu sloupci před 145 v provozní tabulce); nové after145 ukládá nezávisle Po 145. Historické hodnoty nejsou kopírovány do obou polí.
- Změna pouze development/TEST; produkce, main a Supabase beze změny. Ověření a nasazení dokončeno: 19 cílených testů PASS, dvě čisté canonical sestavy PASS (digest cc5f0fdfdc7a806ee21184397f1d21bb534a3ac0097bea18d34729957e1c031b). Chromium 320/390/768/1366 px bez horizontálního přetečení, save/reload Před 145=384 a Po 145=288 nezávisle PASS. CI #870 / 38080358694 verify i release-preview SUCCESS. Funkční SHA ecb3517216773458f5bb65ecd1c35493821b6044. READY dpl_6ZfUk6FfRcXhAbX9r5dnC7DJrk8B (skoda-spada-k5ddex2v8-martinspadrnas-projects.vercel.app). Veřejný TEST HTTP 200, verze 1.9.12, přesná shoda modulu a TEST konfigurace ověřeny. Main nezměněno. Fyzická přejímka iPhone čeká na uživatele.


## TEST 1.9.13 – nouzový sklad a před pračkou (2026-10-10)
- Na žádost uživatele pole 212 v bloku Tvrdé obrábění nahrazeno dvěma poli vedle sebe: „v nouz. skl.“ a „před pračkou“ u všech tří aktivních indexů.
- Dosavadní hard zachováno v nouzovém skladu; nové beforeWasher nezávislé a zpočátku prázdné. Obě pole TO nabízejí ×32 pro celá čísla 1–99.
- Pouze development/TEST, main a Supabase beze změny. Ověření dokončeno: 20 cílených testů PASS; dvě čisté canonical sestavy PASS (digest 03c0d0ba31e88e19149c8606d17bc3de7e12aa609a1f1816a86e13da3541475d). Chromium 320/390/768/1366 px: save/reload hard=384 a beforeWasher=256 nezávisle, oba ×32 v rozsahu 1–99, bez horizontálního přetečení a původní funkce PASS. CI #872 / 38082902489 verify i release-preview SUCCESS. Funkční SHA 971519a8fef1eb4c797c579daad07994647b742a. READY dpl_DjkVReB94dqJtaBNbUFyiQaBZTFd (skoda-spada-6notprkbb-martinspadrnas-projects.vercel.app), přesný SHA potvrzen. Veřejný TEST HTTP 200, verze 1.9.13, přesná shoda modulu a TEST konfigurace ověřeny. Main beze změny. Fyzická přejímka iPhone čeká na uživatele.


## TEST 1.9.14 – tok podle přiloženého Excelu (2026-10-10)
- Uživatel požaduje upravit nýtování a TO podle listu Tok dílů v Přehled směny.xlsx: Před 145 patří do Skladu po kalení společně s 120/121; následuje Po nýtování / 145 a Po broušení / 212.
- Stávající op145, after145 a hard hodnoty zachovány. Nově skryté beforeWasher z 1.9.13 zachováno v uloženém záznamu bez zahrnutí do aktivních polí; žádné automatické sčítání historických polí. ×32 zachováno u 212.
- Pouze development/TEST. Ověření dokončeno: 20 cílených testů PASS; dvě čisté canonical sestavy PASS (digest 5197848194dad2f8b34aefee1eaa91d8b461d2c501d99b84491570cbfedbef3e). Chromium 320/390/768/1366 px: Před 145/Po 145/212 save-reload, ×32 a původní funkce PASS, bez horizontálního přetečení. CI #874 / 38084277472: první pokus selhal na přechodném čtení documentElement=null při aktualizační navigaci v browser-offline-17052; retry neúspěšných jobs se stejným SHA prošel, verify i release-preview SUCCESS. Bez změny testových limitů či obcházení gate. Funkční SHA d4a97c6d86d859324c8c999ac3967c674be1d8fa. READY dpl_A2WBpprhez93jE1K3SUcxdwV28RY (skoda-spada-ozhuysdie-martinspadrnas-projects.vercel.app), přesný SHA potvrzen. Veřejný TEST HTTP 200, verze 1.9.14, přesná shoda modulu a TEST konfigurace ověřeny. Main beze změny. Fyzická přejímka iPhone čeká na uživatele.


## TEST 1.9.15 – samostatná část Před 145 (2026-10-10)
- Uživatel upřesnil oddělit Před 145 od 120/121: Sklad po kalení má nejprve tři indexové řádky s 120 Volné / 121 Lis, poté uvnitř stejného panelu samostatnou část Před 145 s vlastními třemi barevnými indexovými řádky.
- Odděleno jemnou čarou a nadpisem. Pole Před 145 je široké, datové klíče a hodnoty beze změny. Po nýtování 145 a Po broušení 212 zachovány.
- Pouze development/TEST. Nahrazeno souhrnným vydáním 1.9.17 po dalších požadavcích uživatele. CI #876 / 38087132855 první pokus selhal na čtení prázdné release identity během aktualizační navigace browser-offline-17052, retry byl automaticky zrušen novějším commitem. Funkční změna byla následně ověřena v 1.9.17.


## TEST 1.9.16 – výrazy +/− v číselných polích (2026-10-10)
- Během ověřování 1.9.15 uživatel doplnil výpočet po opuštění pole: 320+256 → 576, 320−256 → 64. Vydání 1.9.16 obsahuje i vlastní oddělenou část Před 145 z 1.9.15.
- Editovatelná množství toku a Dusík přijímají +/− včetně řetězení a desetinné tečky/čárky (max. 6 desetinných míst). Parser bez eval, přesné sčítání škálovaných safe integer hodnot. Výpočet při change/focusout i před Uložit. Neplatný/neúplný výraz zůstává beze změny, readonly počítadla a textové poznámky nejsou vyhodnocovány. Množství mají běžnou textovou klávesnici, která umožní zapsat znaménka na mobilu.
- ×32/×64 se obnoví podle vypočtené hodnoty. Pouze development/TEST. Nahrazeno souhrnným vydáním 1.9.17; CI #877 / 38087395045 automaticky zrušeno novějším commitem po požadavku na plus vpravo.

- Uživatel následně požaduje součty naklikaných vsázek: pod seznamem ALD1 a ALD2 samostatný readonly výstup Celkem vsázek. Počítá pouze viditelné díly příslušné ALD, mění se po +/− i načtení; skryté historické kombinace se nezahrnují.


## TEST 1.9.17 – plus vpravo u ALD (2026-10-10)
- Během ověřování 1.9.16 uživatel doplnil přesun + vpravo kvůli ovládání palcem: ALD1 i ALD2 mají pořadí název / − / readonly počet / +. Minus menší/ztlumené vlevo od hodnoty, plus vpravo má plnou dostupnou šířku.
- Vydání obsahuje všechny průběžné požadavky: samostatnou část Před 145, výpočty +/− po opuštění množství, Celkem vsázek pod každou ALD.
- Pouze development/TEST. Ověření a nasazení dokončeno.

- Ověření souhrnného vydání 1.9.17: 22 cílených testů PASS. Dvě čisté canonical sestavy PASS, digest 1e459ea423120fc2d2dc865616cec71f1f9ddfb5db42f5453ca79623db57a0ec, zdroje nezměněny.
- Chromium 320/390/768/1366 px: vlastní sekce Před 145, save/reload, výrazy 320+256=576 / 320−256=64 / řetězení / desetinné 0,1+0,2=0.3 / neúplný výraz zachován, nabídky ×32/×64, readonly počítadla −/počet/+ s minimem 0 a součty ALD1/ALD2 12/8, owner gate a historická data PASS. Vše bez horizontálního přetečení.
- CI #878 / 38087582230 verify i release-preview SUCCESS. Funkční SHA c2b8c6b5875322e87859b38566831fcccc5574b6. READY dpl_4zrEu4U2DY6Znaxm6EFHVRqZ2KWn (skoda-spada-h34uji5ms-martinspadrnas-projects.vercel.app), přesný SHA potvrzen. Veřejný TEST HTTP 200, verze 1.9.17, přesná shoda modulu a TEST Supabase konfigurace ověřeny. Main 915a75793207b4125a0489dd8e5c824696f227ab nezměněno. Produkce/Supabase bez zápisů. Fyzická přejímka iPhone čeká na uživatele.


## TEST 1.9.18 – ALD3 celkem a číselná klávesnice (2026-10-11)

- ALD3 má samostatné ruční pole Celkem vsázek (`inputs.ald3`); uloží se a načte nezávisle na součtech ALD1/ALD2. Staré záznamy dostanou prázdnou hodnotu.
- Všechna editovatelná číselná pole mají inputmode numeric; Dusík decimal. Nativní číselná klávesnice iOS nemá operátory, proto je při zaměření pole nad viditelnou klávesnicí pomocná lišta + / − / Hotovo. Vkládá na místo kurzoru nebo nahradí výběr, zachovává focus, výpočet proběhne při opuštění pole. Poslední vsázky také otevírají číselnou klávesnici.
- Lišta sleduje visualViewport (resize/scroll), při odchodu z přehledu se odstraní a odpojí listenery. Owner kontrola zachována. Pouze frontend development/TEST; DB ani Edge se nemění.
- 23 cílených testů PASS. Browser fixture Chromium 320/390/768/1366 px PASS: operátory, kurzor/výběr, focus, Hotovo/blur výpočty, ALD3 save/reload, součty ALD1/2, ×32/×64, owner gate, historická data, bez horizontálního posouvání. Nativní klávesnice fyzického iPhonu vyžaduje přejímku vlastníka.
- Před změnou online potvrzen main 915a75793207b4125a0489dd8e5c824696f227ab, produkční READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, produkční migration head 20260930112049 a Edge absence v17/admin v15/hradnik v3/export v2 beze změny proti poslednímu strojovému důkazu.
- Dvě čisté canonical sestavy PASS; digest faca26f6cd33dae87206eb5b76e381dbc4d1a25049d24f2ae74a7293d1ccb577, zdroje nezměněny. CI #880 / 38114086625 attempt 2 verify i release-preview SUCCESS. První pokus selhal na známé update-navigation race v browser-offline-17052 (prázdná release identity během navigace); opakování stejného SHA bez změny kódu/limitů prošlo.
- Funkční SHA ab494f600dc9510d98e7bd055b8169f01903b172; READY dpl_4XepGgBJN9LUvRrGnDJ3qaDYnwGE, https://skoda-spada-k9ydp9o3r-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.18, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Main 915a75793207b4125a0489dd8e5c824696f227ab nezměněno; pouze development zápisy. Fyzická přejímka klávesnice iPhone čeká na vlastníka.


## TEST 1.9.19 – vrácení výpočtu a kompaktní popisky (2026-10-11)

- Odstraněno Hotovo z pomocné číselné lišty, zůstává + / −. Nativní dokončení klávesnice nebo opuštění pole nadále provede výpočet.
- Pod každým číselným polem se jemně zobrazí poslední výpočet a odkaz Vrátit. Obnoví původní výraz do stejného pole, zaměří jej a umístí kurzor na konec pro opravu/dopsání. Samostatná historie na pole je lokálně uložena v calculations a zachována při save/load. Záznam se ověřuje podle skutečného výsledku; nepoužívá eval. Výpočet se nepřepíše druhou událostí blur po change.
- Totéž platí pro ×32/×64: historie ukazuje např. 5 × 64 = 320 a Vrátit obnoví 5. Před 145 (op145) nově ×64, Po nýtování přejmenováno na Po 145 (after145) s ×32, stále nabídka pouze pro celá čísla 1–99. Datové klíče i oddělení od 120/121 zůstaly stejné.
- Poslední vsázka u ALD1/2/3 a ruční Celkem vsázek ALD3 jsou placeholdery uvnitř polí; přístupné názvy zachovány. Hodnota u Dusíku odstraněna, pole má přístupný název Dusík. Automatické součty ALD1/2 zůstávají čitelné jako výstup pod počítadly.
- 24 cílených testů PASS. Chromium fixture 320/390/768/1366px PASS: 200+32 → 232 → Vrátit → doplnění 1 → 521, odečítání, opakovaný blur, kurzor/focus, save/load historie, multiplier undo, nabídky 1–99, placeholdery, owner gate, součty a archivovaná data, bez horizontálního posouvání. Vizuálně ověřeno jemné Vrátit bez velkého tlačítka. Fyzická přejímka iPhone čeká na vlastníka.
- Před změnou online potvrzen main 915a75793207b4125a0489dd8e5c824696f227ab, produkční READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, migration head 20260930112049 a Edge absence v17/admin v15/hradnik v3/export v2 beze změny proti poslednímu strojovému důkazu. Pouze development frontend, žádné DB/Edge zápisy.
- Dvě čisté canonical sestavy PASS, digest 2915af5472de2f693d162dcbb2caab0d9977c4aff2784bccae347232a3e2acdb; zdroje nezměněny. CI #882 / 38115343524, attempt 1 verify i release-preview SUCCESS bez změny limitů nebo opakování.
- Funkční SHA 4758f72bc092730fb6b2af2cd65f32af1253a922; READY dpl_7pf9XAT5rBHsjJojP2KPVJyhTRCT, https://skoda-spada-ctqbmnto8-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.19, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Main 915a75793207b4125a0489dd8e5c824696f227ab beze změny, pouze development zápisy. Fyzická přejímka aktuálních úprav čeká na vlastníka.


## TEST 1.9.20 – přechodné Vrátit pod indexem a ALD popisky (2026-10-11)

- Fyzický screenshot 1.9.19 ukázal natahování sousedních polí historií. Historie a Vrátit v toku dílů jsou nyní pod názvem indexu, mimo sloupce vyplňovacích polí. Pole mají pevnou výšku 44px a operace jednotný prostor nad polem; sousední pole zůstávají stejně vysoká a zarovnaná.
- Viditelné je pouze Vrátit posledního výpočtu v právě otevřeném přehledu. Zápis do jiného pole (i poznámky/datum nebo +/- počítadlo) ho skryje; samotné zaměření jiného pole ho neskryje. Uložení/načtení neobnoví staré viditelné nabídky. Historická calculations data se zachovávají bez trvalého zobrazování v UI.
- Vrátit obnoví původní výraz/operand bez focus(), otevření klávesnice, přesunu kurzoru nebo automatického scrollování. Po vrácení nabídka zmizí. Owner kontrola zachována.
- Názvy dílů ALD1/ALD2 16px místo 12px. Poslední vsázka ALD1/2/3 a Celkem vsázek ALD3 jsou řádky název vlevo / vstup vpravo, stejné zarovnání. Dusík bez Hodnota. ×64 Před 145, ×32 Po 145 a ostatní pravidla zachována.
- 25 cílených testů PASS. Chromium fixture 320/390/768/1366px PASS: rovná výška i horní hrana párových polí s historií, jedno přechodné Vrátit pod indexem, obnova bez focusu a klávesnice, zmizení při jiné editaci i počítadle, žádné obnovení po reload, side-label geometrie, větší názvy, owner gate, archivovaná data/součty/multipliers, bez horizontálního overflow. Mobilní screenshoty vizuálně ověřeny. Fyzická přejímka iPhone čeká na vlastníka.
- Před změnou online potvrzen main 915a75793207b4125a0489dd8e5c824696f227ab, produkční READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, migration head 20260930112049 a Edge absence v17/admin v15/hradnik v3/export v2 beze změny. Pouze frontend development/TEST; žádné DB/Edge zápisy.
- Dvě čisté canonical sestavy PASS, digest 697fd0240ec6fce9799e976404d5c201e90fab38510ba0d6f0e7f013f148dda4; zdroje nezměněny. CI #884 / 38117165792, attempt 1 verify i release-preview SUCCESS bez opakování nebo změny limitů.
- Funkční SHA c5e3700b674de9fb0c57d2fb960634fa3b73a574; READY dpl_BwpMi9PAATQugpMPPNKDhveZVoyi, https://skoda-spada-5jj3z7e10-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.20, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Main 915a75793207b4125a0489dd8e5c824696f227ab beze změny, pouze development zápisy. Implementace/nasazení/automatické ověření 100 %; fyzická přejímka těchto úprav iPhone čeká na vlastníka.

## TEST 1.9.21 – živý obrázkový souhrn směny (2026-10-11)

- Vlastník potvrdil vzhled a chování TEST 1.9.20 slovy „Vypada to ok“; fyzická přejímka této verze PASS.
- Nová objednávka: úplně dole automatický celkový přehled ve stylu Excelu, náhled obrázku s otevřením přes celou obrazovku.
- Vektorový SVG náhled bere aktuální zadané hodnoty i před uložením, všechny tři aktivní indexy a součty po operacích. Obsahuje ALD1/2 součty viditelných dílů, ALD3 ruční součet, poslední vsázky, dusík, zapsané díly a neprázdné závady/poznámky. Žádné nové editovatelné nebo uložené hodnoty; žlutý index a archivní skrytá data v součtech chybí. Plán skladu, normativ a Min/Max se nevymýšlejí. Díly v toku = devět operací před skladem/montáží; Celkem kusů = tok + sklad + montáž.
- Native fullscreen dialog: +/− zoom, Celek, tažení/pinch/dvojklik a zavření ×/Escape. Vrací focus na náhled, odstraní se při renderu/opuštění obrazovky; owner kontrola před otevřením. SVG escapuje uživatelský text.
- Cílené testy 26/26 PASS. Chromium 320/390/768/1366 px: live hodnoty, výpočty, součty, counter, SVG/XML escaping, žádný horizontální overflow, dialog/zoom/pan/fit/Escape/focus, route cleanup a owner gate PASS. Fyzická přejímka nového náhledu na iPhone čeká na vlastníka.
- Canonical dva čisté buildy PASS, 166 souborů, digest d2f9160f96453a25326bb06cb244d99f2aa729638305d178f15b0aa2631e4a80. GitHub development validation #886 / 38118849331 attempt 1 SUCCESS včetně release-preview.
- Funkční SHA 33dcc6059693c00cf1ee743bf54869ce1fa51385; READY dpl_S5BbeqJdu5eMbeyayxVqmsjXMMxr, https://skoda-spada-e0f4wqia4-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.21, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Chromium dvouprstý pinch rovněž PASS.
- Živý main 915a75793207b4125a0489dd8e5c824696f227ab, produkční deployment dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, migration head 20260930112049 a Edge versions 17/15/3/2 ověřeny beze změny. Opraven pouze zastaralý text immutable produkčního odkazu dle živého deploymentu; produkce se neměnila.

## TEST 1.9.22 – mobilní souhrn na výšku a odstranění předchozího načítání (2026-10-11)

- Objednávka vlastníka: odstranit Načíst předchozí; obrázkový souhrn více na výšku a blíže tabulkové předloze; díly ALD pod sebou, bez ALD popisků u jednotlivých počtů, všechny názvy včetně nenaklikaných a jejich nuly ponechat prázdné.
- Tlačítko i obsluha Načíst předchozí odstraněny. Načíst dál otevírá vybraný den/směnu a lokální uložená data zůstávají zachována.
- SVG má 900px šířku a portrétní poměr: tabulka 0AM 409 155 s Excel seskupením MO/před a po kalení nahoře, tabulka 0AM 409 111 Po 145/Po broušení/Sklad/Montáž pod ní. Všechny tři aktivní barevné řádky a součty zůstávají. Existující operace 212 zachována bez přeznačení uložených dat na jinou operaci.
- Pod tabulkami všech 18 dílů v pořadí předlohy, jeden díl/jeden řádek s celkovým viditelným počtem; názvy nezávisí na počtu, 0 je prázdná buňka. Historické skryté ALD kombinace se do počtů nezapočítávají. Vedle je kompaktní celkový souhrn, poslední a celkové vsázky ALD1/2/3 a dusík; závady/poznámky dole.
- Cílené testy 27/27 PASS. Chromium 320/390/768/1366px: portrétní SVG, 18 svislých řádků, prázdné nulové počty, živé součty, SVG/XML escaping, odstranění předchozího načítání, zoom/pan/pinch/fit/Escape/focus, route cleanup/owner gate a formulářové regrese PASS. Render ručně zkontrolován ze screenshotu. Fyzická přejímka 1.9.22 na iPhone čeká na vlastníka.
- Canonical dva čisté buildy PASS, 166 souborů, digest 8db9a37820496a863af1587d910f46f7a4632423ca98a2518b37d9746bd4f81a. GitHub development validation #888 / 38120226357 attempt 1 SUCCESS včetně release-preview.
- Funkční SHA 15fecb53421a7506b4cf6dd2178ef5c16269a5fc; READY dpl_8v5FCzHuM1SqZn8cRVZwK3GcBoFj, https://skoda-spada-hx3agql5n-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.22, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Implementace/nasazení/automatické ověření 100 %, fyzická přejímka nového layoutu čeká na vlastníka.
- Živý main 915a75793207b4125a0489dd8e5c824696f227ab, produkční deployment dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, migration head 20260930112049 a Edge versions 17/15/3/2 ověřeny beze změny. Pouze development frontend a handoff zápisy.

## TEST 1.9.23 – výrobní tabulka v jednom celku (2026-10-11)

- Vlastník upřesnil: „Tu tabulku bych chtel v celku“. Obě výrobní poloviny spojeny do jedné souvislé Excel-style tabulky s MO až montáží ve společných barevných řádcích AG/AE, AF/AD a AH. Zachovány všechny operace a součty, bez žlutého indexu a bez domýšlení nevyplňovaných polí.
- Celý obrázek zůstává na výšku; pod výrobní tabulkou všech 18 dílů svisle, bez ALD popisků u jednotlivých počtů a bez nul v nevyplněných řádcích. Vsázky, dusík, souhrny a poznámky zůstávají. Načíst předchozí zůstává odstraněno.
- Cílené testy 28/28 PASS. Chromium 320/390/768/1366px: právě jedna výrobní tabulka se 13 buňkami v každém společném řádku, hodnoty/součty, 18 dílů/prázdné nuly, SVG/XML escaping, zoom/pan/pinch/fit/Escape/focus, owner gate/route cleanup a formulářové regrese PASS. Screenshot nového celku zkontrolován. Fyzická přejímka 1.9.23 na iPhone čeká na vlastníka.
- Canonical dva čisté buildy PASS, 166 souborů, digest 935103aabf59fe8f08090a05f7d21c811f8ab088ef7ed207104f453eb96bb92e. GitHub development validation #890 / 38121255527 attempt 1 SUCCESS včetně release-preview.
- Funkční SHA 323d7f6b0d8f642aa2b1790308bd0a2a2d449399; READY dpl_CUjYfL8d5i3cDnDvfumSHLDnkkxv, https://skoda-spada-7yj2cwo7v-martinspadrnas-projects.vercel.app. Veřejný TEST HTTP 200, verze 1.9.23, přesná shoda admin-shift-overview.js a TEST Supabase isolation PASS. Implementace/nasazení/automatické ověření 100 %, fyzická přejímka nové tabulky čeká na vlastníka.
- Živý main 915a75793207b4125a0489dd8e5c824696f227ab, produkční deployment dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, migration head 20260930112049 a Edge versions 17/15/3/2 ověřeny beze změny. Pouze development frontend a handoff zápisy.

## TEST 1.9.24 – online záloha přehledů směn k účtu (2026-10-11)

- Objednávka: „Ted bych potřeboval at se to zalohuje online na prihlaseny ucet.“ Nová TEST tabulka rak_shift_overviews a owner RPC rak_list_shift_overviews/rak_save_shift_overview; žádné produkční DB ani Edge zápisy.
- Server odvozuje user_id z ověřeného Supabase Auth + rak_admin_context, kontroluje enabled owner a platnou správní session. RLS zapnuté, přímá práva tabulky PUBLIC/anon/authenticated odebraná, RPC execute pouze authenticated. Security definer s prázdným search_path je záměrný pro stejnou session/profile kontrolu jako ostatní správní funkce. Advisor INFO pro RLS bez policy znamená záměrné deny-all přímých přístupů; authenticated definer WARN je pokryt explicitním owner/session gate. Žádný nový anonymní definer endpoint.
- Uložit zapisuje trvalou místní frontu oddělenou podle auth user_id a následně online zálohu; potvrzení online až po úspěchu. Offline kopie se odešle po online/focus/visibility nebo příštím otevření/Načíst. Fronta drží in-flight UUID pro idempotentní retry i po reloadu; CAS revision chrání novější záznam jiného zařízení. Konflikt nabízí Načíst online verzi / Zálohovat místní verzi místo online; původní místní kopie se uchová v recovery. Starý rak_admin_shift_overview_v1 zůstává nedotčený a jednorázově se připojí k prvnímu ověřenému owner účtu. Další účet jej nedostane.
- Načíst i otevření přehledu načítá serverová data vlastního účtu. Odpověď po změně účtu se nepřijme; opožděné načtení nepřepíše právě rozepsaný formulář. Výpočty, counters, celá tabulka/SVG náhled a layout zachovány.
- 29 cílených testů PASS, z toho 8 nových: druhé zařízení, izolace účtů, offline/reload, ztracená odpověď, legacy migrace, CAS konflikt, save během in-flight, stale editor při background refresh a přepnutí účtu. Reálný TEST SQL fixture test PASS (rollback všech testovacích uživatelů/session/dat): auth/owner/disabled/session gate, oddělení účtů, CAS/idempotence, date/size validace, grants a RLS. Fyzická přejímka účtu na iPhone čeká na vlastníka.

- Chromium účetní fixture PASS: druhý browser context, offline/online fronta, obě konfliktní volby, načítání vs. rozepsané pole, skutečné výpočty/counters, SVG fullscreen a 320/390/768/1366px bez overflow. Skutečný supabase-bridge VM PASS pro owner/selected-account gate a odmítnutí odpovědi po přepnutí účtu. Reálný nepřihlášený HTTP přístup na TEST list/save RPC i přímou tabulku odmítnut 401; žádné klíče/tokeny v důkazech.
- Canonical dva čisté buildy na přesném finálním zdrojovém SHA PASS, 166 souborů, stable digest e862b41058b0455e601a2ef181ff1430e126bf695eb5d504c57f52b8b456313d.
- TEST databázová migrace rak_shift_overview_account_cloud_1924 aplikována pod serverovou verzí 20261011105302; CLI source soubor 20261011105146_rak_shift_overview_account_cloud_1924.sql. Fixture rollback ověřen (0 testovacích profilů). Produkce beze změny: main 915a75793207b4125a0489dd8e5c824696f227ab, READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, DB head 20260930112049, tabulka rak_shift_overviews v produkci neexistuje, Edge 17/15/3/2.

- Finální funkční SHA 9d4b71957483844e10cb4acbfe35508b60a2a11e; READY dpl_4vvxsAwZnXr6uER5KhiRjUozCCzG, https://skoda-spada-266i7612w-martinspadrnas-projects.vercel.app. GitHub development validation #893 / 38134566095, attempt 1 SUCCESS včetně verify/release-preview. Veřejná stabilní TEST URL HTTP 200, 1.9.24 a přesná byte shoda feature/bridge/config PASS. Immutable preview je záměrně chráněný Vercel Auth; autentizovaná HTTP verifikace přes vercel curl v CI PASS, ochrana nebyla vypnuta. Implementace/nasazení/automatické ověření dokončené; fyzický účet na iPhone čeká na vlastníka.

## TEST 1.9.25 – režimy nad rozpisem (2026-10-11)

- Nová autorizovaná oprava: při Výjimkách dne nesmí vyskočit neplánovaná dovolená; dovolená i Odebrat patří na samostatná tlačítka nad rozpisem.
- Tvrdota/Měkota mají Výjimky dne / Neplánovaná dovolená / Odebrat mimo summary. Jeden režim v příslušné tabulce, nezávisle na druhé; aktivace výjimek zruší jmennou akci a naopak. Běžné obsazené jméno jde ručně upravit bez automatické nabídky.
- Dovolená používá stávající velký dialog a původní generátor/CAS. Výběr jména ukončí režim dovolené, takže Ruční změna v dialogu vrací editovatelné pole. Odebrat vyprázdní jen zvolené jméno, vydá input/change pro stávající trvalý místní návrh a publikuje se až Uložit rozpis. Absence mají samostatné Odebrat. Číselníky absence ani data se nemění. Nový document router používá existující signed-role gate fail-closed; neotevírá klávesnici v akčních režimech.
- Tlačítka se na mobilu zalamují, minimálně 44px; aktivní režim je označen i aria-pressed a krátkým pokynem. Legacy focus/input callbacky pouze zavírají již nepoužívanou plovoucí nabídku.
- Pouze frontend development/TEST, bez DB/Edge zápisů. Předchozí online záloha Přehledu směny zůstává zachována.
- Sedm cílených regresí rozpisů PASS; kompletní npm check/smoke a dvě čisté canonical sestavy na finálním exact SHA PASS, 166 souborů, digest 9de48459d147172aef531ef680e8b9bdffdb3c4ce1fbc57747749b7edf236c6c. Historické menu testy zachovávají dialog/generátor, nově ověřují toolbar místo odstraněného popupu.
- Chromium se skutečnými capture/pointer/touch handlery editoru a výjimek 320/390/768/1366px PASS: běžná editace bez menu; jediný výjimkový dialog; výlučnost režimů v tabulce a nezávislost druhé tabulky; dovolená pouze z explicitního režimu; Odebrat vydá draft input/change bez focusu; role gate; prázdné/sentinel buňky; readonly a reset při re-renderu; absence Odebrat; 44px cíle a žádný horizontální overflow/chyby. Skutečný původní wizard → Ručně upravit → focus a editovatelný vstup bez popupu PASS. Fyzická přejímka těchto nových režimů na iPhone čeká na vlastníka; Chromium není Safari důkaz.
- Finální funkční SHA 66eea4bbdcce994a369f813bf6436f5cd4531003; CI #896 / 38137514197 attempt 1 SUCCESS včetně verify/release-preview, bez úpravy limitů. READY dpl_8h9KbkvLctHUKg8wcEqRefpXdb47, https://skoda-spada-rayahespt-martinspadrnas-projects.vercel.app. Stabilní veřejná TEST URL HTTP 200, 1.9.25, přesná byte shoda editor/daymods/renderer/metadata/config a TEST isolation PASS. Immutable preview zůstává chráněný; autentizovaná HTTP kontrola v CI PASS.
- Produkční pre/post kontrola beze změny: main 915a75793207b4125a0489dd8e5c824696f227ab, READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, DB head 20260930112049, Edge absence17/admin15/hradnik3/export2. Žádné DB/Edge/produkční zápisy.

## TEST 1.9.26 – Mistr, cache rozpisů a mobilní přehled (2026-10-11)

- Fyzický FAIL 1.9.25: vlastník i s aktuální verzí viděl původní Výjimky v summary bez nového toolbaru. Kořen reprodukován ve skutečném SW VM: runtime/moduleCacheVersion stále 1.9.0 a cached editor nebyl v hotfix obnově; číslo verze 1.9.25 nezaručilo nové JS tělo. Instalace nového SW nyní síťově fetch/reload ověří editor/daymods/renderer, nejprve uloží všechny nové kopie do prewarm, potom cíleně odstraní staré přesné URL ze static/runtime. Žádné mazání uživatelských dat ani nesouvisejících cache; pokud síť/cache selže před stagingem, nové SW se neaktivuje a starý editor zůstane.
- Na výslovnou žádost vlastníka odstraněna tlačítka − / Celek / + z fullscreen náhledu Přehledu směny, včetně nepotřebné click obsluhy. Zůstává Celkový přehled a ×. Pinch, pan, dvojklik pro zoom/reset, Escape, owner gate a focus/route cleanup zachovány.
- Další fyzický iPhone FAIL: tap na readonly počtu ALD1/2 krátce skrýval spodní navigaci. Počty jsou nyní skutečné nefocusovatelné HTML output bez tabindex/contenteditable; stávající .value binding a input události tlačítek zachovávají dirty flag, součty, save/load i online frontu. Vzhled 44px a centrování zachovány.
- Přehled zůstává jednou celou tabulkou, beze změny dat, online zálohy nebo formuláře. Režimy rozpisů z 1.9.25 zachovány.
- Pouze development/TEST. TEST forward migrace rak_foreman_role_shift_overview_1926: serverová verze 20261011124513, CLI soubor 20261011124442. TEST rak-admin-users v8 ACTIVE, verify_jwt=true, přesná shoda serverového zdroje ověřena. Produkce beze změny.

### Nový autorizovaný rozsah TEST 1.9.26 – Mistr
- Ověřená role foreman / Mistr: ve Více pouze Přehled směny, bez Administrace, Reportu směny, reportu dovolené a správy účtů. Role v editoru účtů vedle Správce/Zástupce; směna a zařazení mimo rozpis nadále v Pracovnících.
- Owner zůstává owner (není převeden na mistra); při směně A mimo rozpis má dashboard A a všechna práva včetně Rotace. Ostatní A/B/C bez Rotace, D zachovává dosavadní přístup pracovníků i externích účtů.
- TEST-only forward migrace rozšiřuje role constraint, signed context a device touch o Mistra a dovoluje jeho vlastní účetní zálohu Přehledu směny. Admin/owner writery a katalogy mu zůstávají zamčené. Legacy neoddělená místní data může převzít jen owner9811. Produkční účty a zařazení nebyly změněny.

- Ověření TEST 1.9.26: cílené SW/role/overview regrese, kompletní canonical dvě čisté sestavy na finálním SHA PASS. Real Chromium instalace z kanonického dist se seeded OLD static/runtime/prewarm moduly PASS: přesný nový editor/daymods/renderer, nový toolbar, místní draft i nesouvisející cache zachovány. Testované selhání staging/cache neaktivuje neúplný update.
- Chromium 320/390/768/1366px PASS se skutečným More routerem/rendererem pro Mistra: sekce Mistr má právě jeden Přehled směny; reálný tap otevře přehled bez admin práv; 18 output počítadel, tap nefocusuje ani nehýbe navigací, +/− a součty, online účetní save/reload, náhled pouze ×, dvojklik zoom/reset, bez overflow/chyb. Owner fixture stejné kontroly PASS. Fyzický iPhone stále čeká na vlastníka.
- SQL rollback-only fixture PASS: owner/foreman vlastní list/save, izolace účtů, touch zařízení, zamítnutí admin auditu/owner directory pro Mistra, zamítnutí admin/disabled/revoked/unauth kontextu, CAS/idempotence/validace/grants/RLS. 0 fixture profilů po rollbacku, owner9811 zůstává role owner. Bez nových security advisors vůči baseline.
- StartupCore 470820 B pod nezměněným limitem 471314 B; odstraněno 1448 B opakovaných historických komentářů dashboardu bez změny chování. Předchozí CI #898 selhalo na velikosti, nebylo nasazeno. #899 attempt1 prošlo velikostí a funkčními/offline kontrolami, selhalo na kolísavém FCP P90 (660ms vs limit435ms, baseline360ms); opakováno stejné SHA bez změny kódu/limitů.

- Finální funkční SHA 7a5752272dc759277fca4ebfad1933299e771918; CI #899 / 38141084533 attempt2 SUCCESS včetně verify/release-preview na stejném SHA bez změny limitů. READY dpl_6TZo7cYwFA3SSUC53eazth5Z3w54, https://skoda-spada-emzssd2v7-martinspadrnas-projects.vercel.app. Stabilní veřejná TEST URL HTTP200, verze1.9.26, přesná byte shoda 12 dotčených assetů a TEST isolation PASS. Immutable preview chráněný Vercel Auth; autentizovaná HTTP verifikace v CI PASS.
- Dvě čisté canonical sestavy na tomto exact SHA PASS: 166 souborů, stable digest 0c77fdc70b1a17f00c64297851776e5e45817fd45c72fee2fcd0fb618fd5f310.
- Produkční pre/post beze změny: main915a75793207b4125a0489dd8e5c824696f227ab, READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, DB head20260930112049, role constraint bez foreman, Edge absence17/admin15/hradnik3/export2. Žádný produkční zápis; vlastník nebyl převeden na Mistra ani přenastaven v rosteru.

## TEST 1.9.27 – kompaktní toolbar rozpisu (2026-10-11)

- Objednávka vlastníka: tlačítka nad rozpisem ideálně vedle sebe, pokud se vejdou. Opraven zděděný globální button width:100%; scoped width:auto a flex základy 80/120/80px s 6px mezerami. Popisky se mohou zalomit uvnitř tlačítka, samotná tlačítka při nedostatku šířky do dalšího řádku. Dotykové cíle minimálně 44px, akce/data beze změny.
- TEST 1.9.27 nasazen: SHA 7b2e7ce5df98c2b9944eb5546e0693e4febe8689, CI #901 / 38143254079 SUCCESS, READY dpl_GQ53ZzKpAKYN3EVLncpfx11ixLRm. Během validace vlastník upřesnil rozsah, dokončuje se 1.9.28.

## TEST 1.9.28 – jednodušší ovládání rozpisu a reportu (2026-10-11)

- Na žádost vlastníka odstraněny Načíst měsíc i Obnovit náhled reportu z UI/obsluhy. Zachovány Načíst online, ochrana rozepsaného návrhu i automatický náhled a místní draft při input/change.
- Do 420px má Odebrat pouze ×, aria-label/title Odebrat, 44px cíl. Flex základy 76/112/44px s mezerami 6px; větší displeje plný text. Tlačítka se při nedostatku šířky zalomí. Akce, data a oprávnění beze změny.
- Oba změněné report moduly přidány ke stávajícímu ověřenému SW stagingu pro stejné runtime URL. Žádné mazání uživatelských dat.
- Implementace/nasazení/automatické ověření 100 %; fyzická přejímka aktuálního mobilního toolbaru na iPhone čeká na vlastníka. Chromium není Safari důkaz.
- Chromium 320/384/390/768/1366px PASS: tři tlačítka v jednom řádku, mobilní × a přístupný název, minimálně 44px, výlučnost režimů, explicitní dovolená, odebrání se stávajícími draft input/change bez focusu, bez overflow/chyb; skutečný Report směny bez Obnovit náhled, aktualizace při psaní a místní draft zachovány. Šest SW regresí PASS včetně seeded OLD pěti modulů ve static/runtime/prewarm, zachování nesouvisející cache a fail-closed stagingu.
- Dvě čisté canonical sestavy na exact SHA PASS, 166 souborů, digest 7f86208761f1d33f7d3d72e52156c63024a766a5624a1ee2f2ff41fd6a829ea9. StartupCore 470891B <=471314B. CI #902 / 38153649170 attempt1 selhalo pouze proměnlivým FCP P90 468ms vs447ms; attempt2 na stejném SHA bez změny kódu/limitů SUCCESS včetně verify/release-preview. FCP P90 344ms, baseline344ms, limit419ms.
- Funkční SHA c1ca6a6ed8d117b0f2489d525b861cc551da239c; READY dpl_DUddE9kpfij6q8octskPc7vbd7D8, https://skoda-spada-3b8j1cy64-martinspadrnas-projects.vercel.app. Veřejný stabilní TEST HTTP200, verze1.9.28, index epochso28, přesná byte shoda devíti assetů a TEST isolation PASS; immutable/stable HTTP release proof v CI PASS. Rollback TEST dpl_GQ53ZzKpAKYN3EVLncpfx11ixLRm.
- Produkční pre/post beze změny: main915a75793207b4125a0489dd8e5c824696f227ab, READY dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, DB head20260930112049, Edge absence17/admin15/hradnik3/export2. Žádné DB/Edge ani produkční zápisy.


## 2026-10-11 — RaK v2.0.0 TEST release preparation

- Request: glass Kantýna/Jídelna, strong current/next times, Neschopenka (N), new-device secured-login verification, v2 everywhere and short About summary; prepare TEST for a later main transfer only.
- Runtime/PWA/package/module-cache identity `2.0.0`, build `v2.0.0-release1`, update epoch `v200`. About leads with compact RaK 2 summary; historical release entries stay intact.
- Food actual CSS owner fixed including the final old override: overlay rgba(.22)/blur28, modal rgba(.14)/blur38; current green and next amber with dark text.
- Secured intro login now waits for menu sign-in function AND sync bridge AND SDK. No new startup bucket, no local role/password fallback.
- UI/client offer N instead of LEK. Narrow forward-only TEST migration `rak_unplanned_sick_leave_v200` applied, remote head `20261011170805`; CLI file `20261011164201_rak_unplanned_sick_leave_v200.sql`. Legacy LEK remains server-compatible; no existing records rewritten.
- New tests: readiness race both orders/SDK delay, timeout+retry, identities/N catalog/CAS preservation. Browser: real gate/unlock/auth bridge functions with fictional credentials/mock SDK; empty storage, wrong password, account mismatch denied, correct foreman session/context/device flow passed. Food actual CSS+qr at Prague timezone 320/390/768px both locations/current+next/close/no horizontal overflow passed. Actual Safari/iPhone new-device password login not yet physically confirmed.
- `supabase/ops/VERIFY_TEST_200.sql` transaction/ROLLBACK passed: new session context/device, N and legacy LEK writes, idempotent retry, stale P0001, selected-day scope, revoked-device denial, anonymous denial. No fixture/session/audit/schedule writes persisted. Anonymous login lookup v4 returns server requiresAdminAuth correctly for existing account directory, independent of local storage.
- Supabase security advisors unchanged: RLS-no-policy23, anonymous-definer13, authenticated-definer50, leaked-password warning1.
- Production rollout preparation: `supabase/ops/PRODUCTION_ROLLOUT_200.md`; required overview/Mistr/N migrations and JWT=true account-management function, production-config conversion, preflight/acceptance/rollback. No production mutations authorized or made. Current production function inventory differs from older expected documentation; reconcile before later approval.
- Funkční TEST SHA `fb12479eacbf4e2a2bee60827cf9d9f0825a804a`; větev `release/v2.0.0-test-candidate` připnutá na stejný commit. Jde o TEST kandidáta, stále s TEST configem; není to production-target PR a nesmí se přímo mergovat do main bez přípravy produkčního configu a databáze.
- CI #904 / `38158904390`, attempt1: SUCCESS. Dvě čistá exact-SHA sestavení i CI: 166 souborů, digest `18b9fe90becc70601232f45fa9d2aa9e593cce94553dac9b8e9a33a7d17ad0bd`. Všechny regresní, mobilní Chromium/offline/update, PWA budgety, parity proti 1.7.69, quality a HTTP kontroly PASS bez změny limitů. StartupCore469179B /471314B; index57177B /57414B; rootJS/CSS4742787B /4796255B.
- READY TEST `dpl_6zjUuNKkHQPuoDbE3BQhy4mLFeAC`; immutable `https://skoda-spada-q5hucgqay-martinspadrnas-projects.vercel.app`; veřejný stabilní TEST `https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/`. Veřejný HTTP200, přesná byte shoda 11 assetů (index/metadata/SW/core/access/CSS/wizard/About/bridge/config/manifest), v2 identity a TEST isolation PASS. Rollback TEST `dpl_DUddE9kpfij6q8octskPc7vbd7D8`.
- Produkční postcheck: main `915a75793207b4125a0489dd8e5c824696f227ab`, READY `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`, DB head `20260930112049`, Edge absence17/admin15/hradnik3/export2 beze změny. TEST fixture postcheck: 0 trvalých rotation/device záznamů; anon nemá EXECUTE unplanned RPC, authenticated ano s původní serverovou role/session kontrolou.
- Implementace, nasazení TESTu, automatické ověření a příprava rollout postupu dokončené. Fyzické přihlášení na novém Safari/iPhone, glass vzhled a provozní přejímka v2 čekají na vlastníka; Chromium/mock credentials nejsou fyzický důkaz. Main ani produkční DB/Edge/alias nebyly měněny.


## 2026-10-11 — TEST v2.0.1 mobile panels and local overview draft

- Authorized scope: food-day panels in pairs (Kantýna Po–So/Ne; Jídelna Po/Út–Pá and So/Ne), roster toolbar 8px inset, remove Kalírna from unplanned-vacation picker only, About without Mistr mention and documented publication dates.
- Overview now has Vymazat přehled at top. Every input/change, arithmetic blur, multiplier, undo and counter synchronously persists a separate account-scoped draft including its editor CAS revision. Reopening restores the last draft/date/shift; online refresh cannot overwrite it. No autosave to cloud: Uložit explicitly queues the existing durable online save. Previously submitted offline outbox retries are preserved. Clear stores an empty authoritative draft and does not delete saved local/cloud records. Načíst explicitly restores saved data.
- Actual Chromium fixtures passed raw expression/reload, arithmetic/counters, clear/reload preserving remote, explicit load, second device, offline queue/reconnect, CAS conflict choices, loading/edit race, account isolation and summary; 320/390/768/1366px no overflow. Food paired panels/current highlight and toolbar one-row inset/44px passed 320/390/768px. Six mandatory VM draft regressions and complete npm check passed. Physical Safari acceptance pending.
- About publication dates: 1.9 production 3 October 2026 verified audited release workflow 37143900470 completed 18:23:08Z; v2 TEST 11 October 2026 from exact release proof. Earlier grouped milestones have no reliably retrievable publication timestamp, so no guessed dates are shown.
- Only TEST frontend; no new DB/Edge writes. Production precheck main915a75793207b4125a0489dd8e5c824696f227ab, READYdpl_FgKhWdcrPPfPBva3gynH9A2SuhsF, DBhead20260930112049, edges17/15/3/2 unchanged. Final release proof below.

### Final v2.0.1 proof

- Functional source SHA `35614b0297db739e4b39508eda9f29002fb18c73`; TEST candidate branch `release/v2.0.1-test-candidate` pinned to it. Still TEST config, no production-target PR or direct merge into main authorized. Prior v2 production rollout runbook remains a starting point; adapt it to the current exact candidate/config before seeking production approval.
- CI #909 / `38163063129`, attempt2 SUCCESS including verify/release-preview. Attempt1 failed only FCP P90 664ms vs403ms allowance (baseline328ms); same SHA retried without code or limit changes. Attempt2 FCP median204ms vs196ms baseline (allow216ms), P90 228ms vs212ms (allow287ms). All runtime/security/privacy/offline/update/budget/parity/quality/HTTP gates passed.
- Two clean exact-SHA canonical builds passed: 166 files; stable digest `f9d2fc8a4019ca4da25811893dad6af7416c5f2bf2cf3b049df85bebb6cf7e77`. Mandatory six VM draft regressions passed; real Chromium fixtures also cover pending-save/reload/reconnect and clear while an older save is in flight. Disconnected editor completion cannot replace the cleared draft; pending mutation id and CAS revision are preserved. Background reads cannot falsely label unsubmitted draft changes as backed up online.
- TEST READY `dpl_iJcWhdzGzQtpitE2X6K6nn5FWT1k`; immutable `https://skoda-spada-8n0ge45uo-martinspadrnas-projects.vercel.app`; stable `https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/`. Public HTTP200, exact byte match of 12 touched assets and v2.0.1/TEST isolation passed. Rollback TEST `dpl_6zjUuNKkHQPuoDbE3BQhy4mLFeAC`.
- Production postcheck unchanged: main `915a75793207b4125a0489dd8e5c824696f227ab`, READY `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`, DB head `20260930112049`, edges absence17/admin15/hradnik3/export2 and JWT flags unchanged. No DB, Edge or production writes.
- Implementation/TEST deployment/automatic verification complete. Physical Safari/iPhone acceptance remains pending; Chromium is not physical Safari proof.

## 2026-10-11 — TEST v2.0.2 labels and version dates

Remove (N) from the Neschopenka picker display label and About prose only; stored reason code N and server semantics stay unchanged. About dates: 1.0 beginnings/1.1/1.2 = 5/26 (month only; upload does not establish a production release day), 1.5 = 7 September, 1.6 = 11 September, 1.7 = 15 September, 1.8 = 29 September 2026. Keep 1.9 = 3 October and 2 TEST = 11 October. GitHub verified commit metadata: 0ad8b3f (Release RaK 1.5), 1d841014 (1.6 release metadata), def12642 (1.7 promotion to main), 24a35d90 (open 1.8); first uploaded 1.1 source cfadd467 on 13 May and 1.2 source 96a70131 on 31 May. Earliest repository upload 1876ac80 on 4 May. User explicitly accepts GitHub history and requests month/year when day is not certain. Exact build/CI/TEST deployment verification passed; main and production frozen.

### Final v2.0.2 proof

- Functional source `05029ee224f96ac021726ed8dfebfe6b2392c2b0`; candidate `release/v2.0.2-test-candidate` pinned to it (TEST config only). Production transfer still requires explicit authorization and exact target preparation.
- CI #911 / `38165217440` attempt1 SUCCESS verify/release-preview. All inherited runtime/security/privacy/browser/offline/update/budget/parity/quality gates passed unchanged. FCP median328ms vs baseline320ms (allow360ms), P90352ms vs baseline376ms (allow451ms).
- Two clean exact-SHA canonical passes: 166 files, digest `c65d8d1ce1fe81406297e0df6c20b79ca27fcfc83286af0868649a0394ed7db1`; source unchanged. Direct About render verified all nine dates and no (N) in current visible prose. Four absence choices/underlying N client-server compatibility tests passed.
- READY TEST `dpl_94zskQZjN9H9B8jPfab9rdpQXfgq`, source matches exact functional SHA. Public HTTP200 and exact bytes for 12 assets, visible2.0.2 and TEST-only Supabase verified. Rollback TEST `dpl_iJcWhdzGzQtpitE2X6K6nn5FWT1k`.
- Production postcheck unchanged: main915a75793207b4125a0489dd8e5c824696f227ab; deployment dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF READY exactsameSHA; migrationhead20260930112049; Edge versions/JWT unchanged (absence17 true, admin-users15 true, hradnik3 false, restore-export2 false; known discrepancy stays documented).
- Physical iPhone acceptance remains owner-only; no claim of physical Safari testing. This follow-up changes text/version identity only.

## 2026-10-11 — v2.0.2 main readiness audit

Audit complete; **performance PASS against current main, production transfer not yet main-ready**. Updated `supabase/ops/PRODUCTION_ROLLOUT_200.md` to exact2.0.2 source and explicit remaining work. Do not mistake TEST candidate for a production-config branch.

- Live prechecks development6d807856a24feee9ffda312cc16536fec033cce9, main915a75793207b4125a0489dd8e5c824696f227ab; exact TEST READY05029ee2/dpl_94zskQZjN9H9B8jPfab9rdpQXfgq. Functional #911 and subsequent documentation CI38165751929 both SUCCESS. Main was independently rebuilt twice with production target (no test bypasses), 165files/digest c945fe2d09cbc559c334975c3d35fe5756656208eb6aa0dead5f6ac932f6fb5c.
- Direct mobile Chromium comparison,20counterbalanced fresh-process cold/warm pairs per version. Cold startup median/P90 main541/636ms, TEST538/598ms; warm402/450 vs392/417ms. Cold paint272/304 vs248/308ms; warm128/148 vs128/136ms. Navigation-bound cold68/94 vs67/101ms, warm38/41 vs38/42ms. No repeatable slowdown; physical Safari/CDN/real backend excluded. Earlier shared-browser cold-FCP tail discrepancy and final wall diagnostics explicitly retained in runbook; fresh-process confirmation resolves it without changing thresholds. New overview module stays lazy; startup app.js gzip only+10bytes.
- Read-only DB/Edge audit confirms three required production migrations are absent; prerequisites and identical private session/role helpers verified. Owner9811 enabled owner. Production function source needs foreman support; TEST exact function matches repo and owner protection remains. Production advisors unchanged baseline22/14/48/1. Targeted16role/login/draft tests PASS.
- Production candidate must preserve main manual release workflow and contract, main PR/full exact-SHA validation and target-aware security tests, Vercel main:false, original applied migration20260512071249/hash. Development currently carries TEST-only config/workflow/replay settings. Candidate and green production-target validation are missing; physical Safari/new-device/operational acceptance remains owner-only. Known production restore-export discrepancy remains outside v2 target and must be reconciled before approval. No production writes authorized or performed.


## 2026-10-12 — authorized v2.0.2 production rollout in progress

Martin explicitly authorized main and production after successful checks on 11 October. Exact development source 7ed0b588c5f8d0d3843ca6c76b5c2cd711597bca, functional candidate05029ee2. Production-bound release restores original main config, immutable applied SQL/hash, manual audited release and target-aware tests. Full candidate CI and database postchecks required before merge. One-time main coordinator dispatches full exact-main validation and existing audited production release; no automatic Vercel Git publish. Physical Safari acceptance remains unverified; automatic clean-storage readiness and wrong-credential/role denial evidence are available. Known TEST export function in production reviewed: GitHub OIDC-gated service-role export is inappropriate in production; disable its handler before rollout, preserve other unrelated functions. Baseline frontend rollback dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF. No production writes at this checkpoint.
