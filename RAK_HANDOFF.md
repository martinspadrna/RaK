## 21. 10. 2026 — produkční kandidát RaK 2.0.31 (příprava, ne MAIN)

Pouze větev `release/rak-2.0.31-prep` vytvořená z MAIN `dd90d3078bf3c7d38877c430fa8329635623132a`. Do větve jsou selektivně přeneseny jen moduly týdenního Úklidu včetně statistik, administrace, vazby generátoru, aktualizace PWA, instalační iOS stránky a lokalizované knihovny Supabase, příslušné testy a synchronizované verzování. Produkční konfigurace Supabase, releasovací workflow, role/RPC ani generátorová pravidla nebyla upravena. Automatický preview deploy větve je vypnut. MAIN/produkce se NESMĚJÍ změnit před explicitním potvrzením vlastníka a všemi kontrolami. Případné testování UI kandidáta jen na izolované testovací databázi, nikdy neprovádět zápisy přes produkční preview. Kontrola ikon: na MAIN i TEST existovaly 404 pro generované icon-any-192/512 a apple-touch-icon.png, je nutné vyřešit před převodem. Rollback produkce: dosavadní deployment `dpl_EYxcV96PAVnC9M6gd1VA5o544yL2` / verze 2.0.27.

# RaK – kanonický handoff

Toto je jediný živý řídicí dokument projektu RaK.

## 19. 10. 2026 — schválený převod TEST 2.0.27 na MAIN/PROD

Vlastník schválil převod aktuálního TEST 2.0.27 na MAIN, se shodným funkčním generátorem včetně Úpravy tohoto měsíce, průhledných PWA ikon, při zachování produkční Supabase, produkčního bezpečnostního auditu, produkční SQL migration lock, izolace testovací DB, všech původních rolí a správného zobrazení O aplikaci bez TEST, bez data publikace. TEST development SHA 8606effab4a5150be1b542bded4613bc12c0861d, původní MAIN c28c524f3a3dda0bcb69cb7e4ac1b6c6e4a2210f. Před převodem vytvořeny backup/main-2.0.19-before-2.0.27-20261019 a backup/development-2.0.27-before-main-20261019. Release coordinator nastavena na schválený dev SHA a 2.0.27 a má před publikací spustit exact-SHA CI, post-CI audited production release, immutable HTTP a teprve pak alias s automatickým rollbackem. Neschvalovat jakékoliv migrace/změny backendu; pouze frontend produkce.


## 14. 10. 2026 — RaK 2.0.16 převeden na main a produkci (100 % automatické ověření a nasazení)

Vlastník výslovně schválil „Ok dej test na main a produkci“ a upřesnil O aplikaci bez TEST i bez dnešního data, stačí popis verze2. Převod dokončen. Main funkční SHA 5fbf51b00bf407fe1744d0a3b17405fe63a3d090 má celý ověřený runtime/CSS TESTu2.0.16 (devfunctional526f0a977ac808743ec57af07f45d7c111c21878, schválený devHEAD1378a659266ccdd55f8fd9c9e9ef4d316bc9e9f1). Runtime rozdíl protiTESTu pouze app-menu-pages.js (neutrální O aplikaci) a supabase-config.js (produkční projektbkqamcbkiwumsvelahxr). V sekci RaK2 publishedprázdné, žádné TEST ani nové datum, původní krátký popis zachován. Runtime/cache/build2.0.16/release1/epochv216 stejně jakoTEST. Produkční environment guardy/auditované workflow obnoveny z původního main; produkční migrační SQL/lock zachovány. Žádná změna DB, Edge, dat ani funkcí.

LocalRAK_BUILD_TARGETproduction npmcheck/targetedAbout a2čistébuildy PASS. Exact-main validation 38510217127 attempt1 SUCCESS, coordinator38510202895 SUCCESS, auditovaný produkční release38510659676 SUCCESS. Dvě canonical exact-SHA sestavy166souborů, stable digest278c6f8fbf25dbda83bedfc8e143844289641e98d2b3e96581d0f28f8d312dff, sourceunchanged. Původní role/privacy/security/CAS/ZIPCRC/offline/update/network/budget/parity a Chromium mobile gates PASS, novéoverview205 aMO/TO260–350px/Androidtouch oběma směry PASS. StartupCore470102B vs471314B pevnýlimit (prahynezměněné). Auditovaný release ověřil zelenéexactSHA proof, projekt/team, produkčníenv a izolaci, READY kandidáta aimmutableHTTP před přesunemaliasu; publicHTTP poté PASS, rollbackpři postaliasfailure zachován.

PROD READY dpl_9ao7ZSa67YqBKViatD649G5vqyhw, targetproduction, exactSHA5fbf51b00bf407fe1744d0a3b17405fe63a3d090; immutable https://skoda-spada-lchgnj10i-martinspadrnas-projects.vercel.app; veřejná https://skoda-spada.vercel.app/ . Nezávisle HTTP200/exact-byte13klíčovýchsouborů PASS: index/metadata/SW/app/core/About/overview/config/manifest/admineditor/3CSS. Verze2.0.16, O aplikaci bezTEST/publisheddate aconfigvýhradněPRODbkqam ověřeny. TEST READYdpl_BUQ5h66SemhL1p2oFvH9yiKD3QZH/functional526f0a97 beze změny. Produkční migrationhead20261012021355 a všechnyEdge17/16/3/3 JWTtrue/true/false/true pre/postread shodné. BezDB/Edgezápisů.

Frontendrollback: původní PROD2.0.3 READYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN, source61b04d7394746f28623b453be9cb710655c16c77, immutablehttps://skoda-spada-7zlixkwmw-martinspadrnas-projects.vercel.app . Vrátit jenalias aověřitmetadata/config/HTTP; žádná obnovadat čiDB. Main předpřevodemdda626a2c0838af1fffde039b8bbea2eedd6b54d. Gitautodeploymain/development vypnutý, coordinator reaguje pouze změnou svéhoYAML, další produkční změna vyžaduje nový výslovný požadavek vlastníka. Další práce opětTEST/development. Automatické dokončení100 %, fyzické spuštění aktualizovanéprodukce vlastníkem nevyhlašujeme za ověřené.

## 13. 10. 2026 — TEST 2.0.16 mírně širší jména (100 % automatické ověření a nasazení)

Vlastník žádá jména trochu širší, méně než původně. Maximum col48/input46 → col50/input48px, původní col52/input50 se nevrací. Obě MO/TO tabulky tablemax324px pro5strojů (předtím314px), při užším obalu pružně menší. Datum col74/input72px a Android svislé scroll chaining zachovány. Výpočty/data/role/uložení nezměněny. Změněny skutečné render výrazy, nikoli další CSS override. Runtime/cache2.0.16/buildrelease1/epochv216. Pouze TEST, main/PROD/backend bez zápisu.

Source SHA 526f0a977ac808743ec57af07f45d7c111c21878; CI 38453608898 attempt1 SUCCESS verify + release-preview. npm check a kritické/runtime/role/CAS původní gates PASS. Dvě čisté exact-SHA canonical sestavy166souborů: stable digest bac1370640de3d19c5fe511e409ed218a22c6f039aa4e421b6e7dd395a261939; source unchanged. Chromium MO=TO, všech5strojů bez horizontálního scrollu pro obaly260/280/300/320/350px, celý datum/N8 suffix při16px PASS. Přímé Android-emulované touchStart/touchMove/touchEnd přes jména posouvají rodičovské menu nahoru i dolů v MO/TO PASS. Offline/update recovery, ZIP/CRC a výkon/parita PASS; FCPp50current320/baseline316ms, P90current336/baseline344ms. StartupCore471312/limit471314B, prahy nezměněny; další přidávání startupCSS vyžaduje zmenšení/odložení (poznámka2.0.15 dál platí). Fyzický telefon vlastníka/kolegy čeká na přejímku.

TEST READY dpl_BUQ5h66SemhL1p2oFvH9yiKD3QZH; immutable https://skoda-spada-flby9l9un-martinspadrnas-projects.vercel.app; veřejný stabilní TEST https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/ . Nezávislé HTTP200 a exact-byte13klíčovýchsouborů PASS včetně editoru a3CSS. Rollback2.0.15/dpl_AQZUv3Yo571BsLUEPgKcQ9fnSKXz kompatibilní. Main stáledda626a2c0838af1fffde039b8bbea2eedd6b54d, PROD2.0.3/source61b04d7394746f28623b453be9cb710655c16c77/READYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN.

## 13. 10. 2026 — TEST 2.0.15 úzký mobil MO/TO a Android scroll (100 % automatické ověření a nasazení)

Pouze TEST. Screenshot kolegy skutečně přečten: editor Tvrdota v menu měl oříznutý poslední stroj. Měkota i Tvrdota nyní mají datum col74/input72px a pružné jmenné sloupce max48/input46px, celá tabulka pro pět strojů max314px a podle obalu se zúží. Skutečný počet strojů je v CSS proměnné. Datum se zobrazuje např. 19.10.N8 bez mezery, 16px písmo a menší vnitřní odsazení; normalizátor při čtení zachová standardní datum i R/N/R8/N8. Jména/data/funkce nezměněny. Legacy vlastnický blok RAK_17067 změněn a dvě stará nth-of-type pravidla v styles-admin-polish.css vyloučí skutečné RotationTable, aby nevnucovala 324px/min a width:auto. Absence dál drží opravu 2.0.14.

Android posun přes jména: vlastní table wrapper již nezastavuje svislé scroll chaining (X contain, Y auto v styles-admin-rotation-editor.css). Nativní editace zachována. Skutečný Chromium ověřil MO=TO, všech pět sloupců při šířkách obalu 260/280/300/320/350px bez bočního scrollu, celý N8 suffix při 16px. CDP emulace Android touchStart/touchMove/touchEnd přes editovatelná jména ověřila posun rodičovského menu dolů i nahoru pro oba rozpisy. Fyzický Android kolegy a fyzický Safari čekají na uživatelské potvrzení; automatické ověření za ně nevydáváme.

Funkční source SHA 2f91947364145214c30d9db14de66576820b8d6c. CI 38451363434 attempt2 SUCCESS: verify + release-preview. Oba čisté buildy přesného SHA: 166 souborů, stable digest dc4a4c320ed661e45c91ce61eae4de7fc7cc6bac81b24ac32314c4e6fae88fca. npm check, kritické/runtime/role/CAS testy, ZIP/CRC, všechny reálné Chromium/PWA testy, výkon/parita PASS. TEST READY dpl_AQZUv3Yo571BsLUEPgKcQ9fnSKXz, https://skoda-spada-c6z6up61e-martinspadrnas-projects.vercel.app; stabilní TEST alias ověřen HTTP200 a shodou 13 klíčových souborů bajt po bajtu včetně všech tří dotčených CSS. Runtime/cache 2.0.15 / buildrelease1 / epochv215. CI attempt1 přesného finálního SHA neprošel přechodnou offline-update obnovou (prázdná release hodnota), attempt2 bez změny kódu PASS; neúspěšný důkaz zachován. Dřívější kandidáti zachytili starý width kontrakt, úzké datum N8, min-width konflikt a nefunkční zjednodušené syntetické gesto, následně opravené; žádný z nich nebyl nasazen. Kandidát 34096892 měl startupCore o109B nad limitem; CSS zápis/komentář zkrácen bez změny chování. Finální startupCore471312B vs pevný limit471314B (ponechán beze změny), další přidávání startup CSS bude vyžadovat zmenšení či odložení CSS. FCP parita PASS p50 316/316ms, P90 360/344ms. Backend/main/produkce bez zápisu. Main dda626a2c0838af1fffde039b8bbea2eedd6b54d; PROD stále2.0.3/source61b04d7394746f28623b453be9cb710655c16c77/READYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN. TEST rollback2.0.14/dpl_6wcfGrPh8GWa58F735qCvnHnZNk2 kompatibilní.

## 13. 10. 2026 — TEST 2.0.14 čitelné kódy absence (100 % automatické ověření a nasazení)

Pouze TEST. Administrace/Rozpisy/Absence kódy při prvním zobrazení nečitelné, po focus/blur dle vlastníka čitelné. Autoritativní legacy CSS s vyšší specificitou drželo code input28px a col32px, přebilo editorové min54px; zvětšen právě tento blok, ne další překrývající záplata. Code col84px/input82px,16px font,4px padding, prostor pro nativní datalist arrow. Table min256px místo204px; datum/jméno šířky zachované a tabulka může scrollovat ve wrapperu. Colgroup editoru sjednocen code84px. Původní picker/manual entry/normalizace/role/uložení nezměněné. Existující Chromium absence fixture nyní používá všechny app stylesheets a měří čitelnost NV/Lázně předfocus a pofocus/blur včetně rezervy na arrow a overlap. Runtime/cache2.0.14/buildrelease1/epochv214. Backend/main/produkce bez změn. TESTrollback2.0.13 dpl_BkMN4kJih5qdXeZx3dCBqo2LzkKm kompatibilní. Automatické ověření/nasazení dokončeno; fyzická přejímka vlastníkem čeká.

### TEST 2.0.14 — dokončený důkaz

- SourceSHA `b27a54a6f66eb6e625ae2ebf5e84b50d8eb1f444`, runtime/cache2.0.14/buildrelease1/epochv214. CI [38441058158](https://github.com/martinspadrna/RaK/actions/runs/38441058158) attempt2 SUCCESS verify/release-preview.
- Attempt1 blokován pouze FCP P90 896ms nad447ms/baseline372ms; žádné nasazení. Opakovaný exact-SHA běh PASS bez změny kódu/limitů. Kolísání first paint gate zůstává diagnosticky zaznamenané; netvrdit plošně stabilní všechny CI pokusy.
- Dvě čisté exact-SHA canonical sestavy166souborů, digest `b6fef523774205d489c423f79c440384c02430f5c97209347f4916e68b06a192`, source unchanged; celé npm check a původní gates PASS.
- Chromium absence fixture se všemi app CSS a native datalist PASS: code input82px,16px font, NV a Lázně se vejdou od prvního zobrazení s20px rezervou pro arrow. Geometry/font předfocus a pofocus/blur stejné, bez překryvu sousedních buněk či document overflow; původní datum/jméno/public/admin summary guards PASS. Původní screenshot bez lokálního souboru, požadavek a následné focus/blur upřesnění textem vlastníka; nedodávat tvrzení fyzického iPhone testu.
- Změněno vlastnické legacy pravidlo28px/col32 na82px/col84, žádná nová překrývající CSS záplata. Colgroup editoru code84. Picker/manuální zadání/normalizace/role/store beze změny.
- READY `dpl_6wcfGrPh8GWa58F735qCvnHnZNk2`, exactSHA, immutable <https://skoda-spada-ktqbi4dmn-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte11assetů index/metadata/SW/app/core/About/overview/config/manifest + styles-inline-legacy/admin-rotation-editor PASS; metadata2.0.14, config pouzeTESTcgshssdjgzzuprlwnabl.
- Main pre/postdda626a2c0838af1fffde039b8bbea2eedd6b54d, produkčníaliasREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Žádné main/produkční/DB/Edge zápisy. TESTrollback2.0.13 dpl_BkMN4kJih5qdXeZx3dCBqo2LzkKm kompatibilní. Automatické ověření/nasazení100 %, fyzická přejímka čitelnosti hned po otevření vlastníkem čeká.

## 13. 10. 2026 — TEST 2.0.13 oddělení MO/TO (100 % automatické ověření a nasazení)

Pouze TEST. Screenshot vlastníka18:56 požaduje viditelné rozdělení závěru MO/TO. Scoped pseudo-element na druhé fieldGroup:3px světlá svislá čára v10px mezeře, TO align-self stretch přes celou výšku MO a align-content start pro zachování pozic polí. Nezmenšuje šířku vstupů, MO vlevo/TO vpravo. Jen CSS; datové keys/souhrny/počty/role beze změny. Aktualizovaný Chromium fixture kontroluje plnou výšku oddělovače i zarovnání vstupů. Runtime/cache2.0.13/buildrelease1/epochv213. Backend/main/produkce bez změn. TESTrollback2.0.12 dpl_3dmRMnw7E9J7ryRB7tSvRZFWfMBq kompatibilní. Automatické ověření/nasazení dokončeno; fyzická přejímka vlastníkem čeká.

### TEST 2.0.13 — dokončený důkaz

- SourceSHA `7be4dfee8b6d42033e6e70c1b278275501fac978`, runtime/cache2.0.13/buildrelease1/epochv213. CI [38435208341](https://github.com/martinspadrna/RaK/actions/runs/38435208341) attempt1 SUCCESS verify/release-preview.
- Dvě čisté exact-SHA canonical sestavy166souborů, digest `977af7951f1ef962af095315eaf90332744356084d83772a5ee90acb12cd7eaf`, source unchanged; všechny původní gates a npm check PASS bez změny limitů. Místní první build kolidoval s předčasně spuštěným druhým (cwd odstraněn v izolovaném workdir); následně dva čisté sekvenční PASS, raw source nedotčený. Nespoléhat na souběžné canonical builds.
- Chromium320/390/768/1366px PASS: TO group roztažená na výšku MO, scoped3px pseudo divider v mezeře, MO/TO vstupy stále přesně srovnané; celý původní route/draft/summary/current-clear/role/overflow fixture PASS.
- READY `dpl_BkMN4kJih5qdXeZx3dCBqo2LzkKm`, exactSHA, immutable <https://skoda-spada-dz2seiiil-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS; metadata2.0.13, config pouzeTESTcgshssdjgzzuprlwnabl.
- Main pre/postdda626a2c0838af1fffde039b8bbea2eedd6b54d, produkčníaliasREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Žádné main/produkční/DB/Edge zápisy. TESTrollback2.0.12 dpl_3dmRMnw7E9J7ryRB7tSvRZFWfMBq kompatibilní. Automatické ověření/nasazení100 %, vlastníkův vizuální test na iPhonu čeká.

## 13. 10. 2026 — TEST 2.0.12 prázdné počítadlo a aktuální směna (100 % automatické ověření a nasazení)

Pouze TEST. Fyzický screenshot16:38 po clear/restart: staráA:noční12.10. Kořen: batchCounter zobrazuje0 pro hodnotu prázdno, readDom dříve materializoval0, draftHasContent je považoval za vstupy a přebil aktuální kontext. readDom ponechá prázdné nedotčené počítadlo prázdné; draftHasContent ignoruje0 pouze u batch inputs.rows.*.ald1/2, umožní nápravu starých draftů. Ostatní explicitní0, poznámky, hidden fields, vypnuté jednotky/pending save zůstávají skutečný obsah. Clear lokálního editoru nyní vybere currentShiftContext ihned, cloud/saved záznamy nemění. Regrese musí projít skutečným clear/persist/reopen DOM cyklem a legacy all-zero draftem, nestačí syntetický prázdný objekt. Runtime/cache2.0.12/buildrelease1/epochv212. Backend/main/produkce bez změn. TESTrollback2.0.11 dpl_2U135GmGkuFB7r72XX6NNkxf8Hvb kompatibilní. Automatické ověření/nasazení dokončeno; fyzická přejímka vlastníkem čeká.

### TEST 2.0.12 — dokončený důkaz

- SourceSHA `1333e2f3b4cb156d7c16289adca633af7783b5bd`, runtime/cache2.0.12/buildrelease1/epochv212. CI [38415873267](https://github.com/martinspadrna/RaK/actions/runs/38415873267) attempt2 SUCCESS verify/release-preview.
- Attempt1 blokován pouze FCP P90 900ms nad427ms/baseline352ms; žádné nasazení. Startovací app/init/home/navigation/themeJS/styles beze změny proti2.0.11. Opakovaný exact-SHA běh PASS bez změny kódu/limitů. Netvrdit odstranění veškerého kolísání CI.
- Dvě exact-SHA canonical sestavy166souborů, digest `a7e7c0b8148fb63651bd21b87e47f1d3d26367f9a588cc8cd3c401e82cb4a8a5`, source unchanged. Cílené44VMoverview/draft a celé npm check PASS; původní gates PASS.
- Chromium320/390/768/1366px PASS, včetně skutečného clear→persist všech viditelných0counterů→reopen: po clear aktuálníB:ranní13.10. ihned, při reopen stále aktuální. Nedotčené0počítadlo serializováno jako prázdno. LegacyA:noční12.10.draft se všemi0counters přejde na aktuální ranní. VM kontroluje pozitivníbatch a explicitní0v jiném vstupu jako skutečný obsah.
- Clear přepíná currentShiftContext/date okamžitě dle výslovné pojistky vlastníka. Historické uložené/cloud záznamy nevymazány; pending/filled draft scope zachovaný.
- READY `dpl_3dmRMnw7E9J7ryRB7tSvRZFWfMBq`, exactSHA, immutable <https://skoda-spada-ku14irmi2-martinspadrnas-projects.vercel.app>; veřejnýTEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS; metadata2.0.12, config pouzeTESTcgshssdjgzzuprlwnabl.
- Main pre/postdda626a2c0838af1fffde039b8bbea2eedd6b54d, produkčníaliasREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Žádné main/produkční/DB/Edge zápisy. TESTrollback2.0.11 dpl_2U135GmGkuFB7r72XX6NNkxf8Hvb kompatibilní. Automatické ověření/nasazení100 %, fyzická iPhone přejímka vlastníkem čeká.

## 13. 10. 2026 — TEST 2.0.11 svislé datum Safari (100 % automatické ověření a nasazení)

Pouze TEST. Screenshot vlastníka05:08 na iPhonu ukazuje datum vodorovně uprostřed, svisle nahoře. Výška ovladače44px necentrovala vnitřní Safari date-and-time-value. Cílená line-height40px a WebKit value flex center/min-height40px; calendar indicator top50% s transform. Native date zůstává viditelný a editovatelný, role/picker/draft a data beze změny. Runtime/cache2.0.11/buildrelease1/epochv211. Backend/main/produkce bez změn. TEST rollback2.0.10 dpl_H2UPi77A3f514TivdtM5Fm3uaXTa kompatibilní. Automatické ověření a nasazení dokončeno; fyzická iPhone přejímka po opravě vlastníkem čeká.

### TEST 2.0.11 — dokončený důkaz

- Funkční sourceSHA `0aab552b3cf6dfaf38ad7cde0292380a610e18ba`, runtime/cache2.0.11/buildrelease1/epochv211. CI [38340763565](https://github.com/martinspadrna/RaK/actions/runs/38340763565) attempt2 SUCCESS verify/release-preview.
- Attempt1 blokován pouze FCP P90 860ms nad411ms/baseline336ms; žádné nasazení. Startovací app/init/home/navigation/themeJS/styles byte-identical s2.0.10; overview lazy modul změnil jediný CSS řádek. Opakovaný exact-SHA běh prošel bez změny limitů/kódu. Netvrdit odstranění veškerého kolísání ani shodu celé hydratace.
- Dvě canonical exact-SHA sestavy166souborů, digest `41da76b80a589b6d6792ce983584d8b420fac9c5ae7f0a6522069a8f5cbf2786`, source unchanged. Původní gates a celé npm check PASS. Chromium320/390/768/1366px PASS: computed date text-align center/line-height40px, visible44px native input, picker hook, ručnídatum/přenos/reopen a celé původní funkce/souhrny/role/overflow. WebKit vnitřní date-and-time-value má40px a flex center; fyzický Safari/iPhone musí potvrdit vlastník.
- READY `dpl_2U135GmGkuFB7r72XX6NNkxf8Hvb`, exactSHA, immutable <https://skoda-spada-qfb4srjev-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS; metadata2.0.11 a config pouzeTESTcgshssdjgzzuprlwnabl.
- Main pre/postdda626a2c0838af1fffde039b8bbea2eedd6b54d, produkčníaliasREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Žádné main/produkční/DB/Edge zápisy. TESTrollback2.0.10 dpl_H2UPi77A3f514TivdtM5Fm3uaXTa kompatibilní, draft/data zachovat. Automatické ověření/nasazení100 %, vlastníkův fyzický test svislého data čeká.

## 13. 10. 2026 — TEST 2.0.10 kompaktní výsledky a datum (100 % automatické ověření a nasazení)

Pouze TEST. Datum zůstává viditelný native date input, text-align center plus WebKit value/edit centering a calendar indicator mimo tok vpravo. Obrábění/Do skladu nově Závěr; existující data keys MOFree/MOPress/TO zachované. Souhrn vpravo dole: brusy mají jen aktivní indexy podle nenulového vyhodnoceného počtu Free/Press, neaktivní stroje i prázdné/0 řádky vynechány. Za nimi Obrábění · závěr s MO Volné, MO Pod lisem a TO, rovněž jen nenulové indexy. Původní inventurní tabulka/součty beze změny; filtrování je pouze prezentace, data se nemažou. Dynamické pozice/výška, poznámky pod oběma tabulkami bez překryvu. Runtime/cache2.0.10/buildrelease1/epochv210. Backend/main/produkce bez změn. TEST rollback2.0.9 dpl_8WXPSgnNpQLFvaxyy4CuBnhXcryo kompatibilní. První CI38337548661/SHA11f78e12 blokováno chybným očekáváním browser fixture: v okamžiku prvního souhrnu vyplněn pouzeAF, očekávánoAG+AF. Produkční filtr správně vynechalAG. Opraven pouze test: nejdříveAF, po pozdějším vyplněníAG musíAG+AF. Runtime beze změny; nasazení prvního kandidáta správně skipped. Následný fixture opraven i pro vynechání neaktivního brusu; finální automatické ověření a nasazení dokončeno.

### TEST 2.0.10 — dokončený důkaz

- Finální sourceSHA `975c7ab50fc77991075060d347b008ef38d05f95`, runtime/cache2.0.10/buildrelease1/epochv210. CI [38337748984](https://github.com/martinspadrna/RaK/actions/runs/38337748984) attempt1 SUCCESS verify/release-preview. Původní kandidát blokován chybně očekávaným fixture AG/AF a oba brusy před zadáním výsledku; runtime filtr správný. Dva navazující testové commity upravily očekávání dle skutečných vstupů, runtime beze změny. Prahy/gates neoslabeny.
- Dvě exact-SHA canonical sestavy166souborů, digest `fdcf6bd1ae8cf37aa8bdee85957da42821b39b00ee9dff1e901eb3cb1e40dbe0`, source unchanged; celé původní gates PASS. Cílené43VMoverview/draft testy a npm check PASS.
- Chromium320/390/768/1366px PASS včetně computed text-align center, native date edit/picker/ruční data/reopen, idle machine a empty index omission, a následného přidání druhého brusového indexu do souhrnu. Všechny starší unit/draft/role/overflow kontroly PASS.
- Přehled brusy i závěr pouze nenulové indexy; výrazy vyhodnoceny, explicitní0/prázdné vynechány, data zachována. MO Volné/MO Pod lisem/TO v závěru pod brusy. Inventurní tabulka/součty nezměněné, VM kontroluje oddělení a nemutaci zdroje. SharpPNG vizuální kontrola: čitelné aktivní řádky, závěr pod brusy, poznámky bez překryvu.
- READY `dpl_H2UPi77A3f514TivdtM5Fm3uaXTa`, exact sourceSHA, immutable <https://skoda-spada-94bzr8t5k-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS; metadata2.0.10, config pouze TESTcgshssdjgzzuprlwnabl.
- Main pre/post dda626a2c0838af1fffde039b8bbea2eedd6b54d, produkceREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Žádné main/produkční/DB/Edge zápisy. TEST rollback2.0.9 dpl_8WXPSgnNpQLFvaxyy4CuBnhXcryo kompatibilní, uchovat původnídata/drafty. Automatické ověření/nasazení100 %, fyzická iPhone přejímka čeká na vlastníka.

## 13. 10. 2026 — TEST 2.0.9 MO Volné/Pod lisem (100 % automatické ověření a nasazení)

Pouze TEST. Další požadavek vlastníka za běhu CI2.0.8: Obrábění/Do skladu MO vlevo s Volné/Pod lisem nezávisle pro3indexy, TO vpravo. Nové oam.rows[index].producedMOFree/producedMOPress; staré nerozdělené producedMO v JSON zachovat, neodhadovat rozdělení. Původní inventurní součty zachovat: vyrobené do skladu nejsou inventura stejných dílů v toku. Na další žádost vlastníka doplněna vpravo dole SVG tabulka TBKR01/07 × index × Volné/Pod lisem, součty za každý brus; nemíchat do inventurních součtů. Poznámky posunuty pod tabulku bez překryvu, dynamická výška SVG. Původní summary Volné10+20/30/120 mají samostatná pole op1020/op30/op120, Lis11+21/31/121 samostatné op1121/op31/op121. Brusy01/07 již mají Free/Press. Všechna párová zadání a hodnoty zachovat. MO je levá skupina dvou polí, TO pravá skupina. Obsahuje i opravu prázdného draftu a viditelného ručního data z2.0.8. Runtime/cache2.0.9/buildrelease1/epochv209. Backend/main/produkce bez změn. Automatické ověření a nasazení dokončeno; fyzická přejímka vlastníkem čeká.

### TEST 2.0.9 — dokončený důkaz

- Funkční SHA `067bbcae6b5079c5e7dafb71f352b0d9c10ae32b`, runtime/cache2.0.9/buildrelease1/epochv209. CI [38336317521](https://github.com/martinspadrna/RaK/actions/runs/38336317521) attempt1 SUCCESS verify i release-preview. Zahrnuje předchozí2.0.8 opravy prázdného draftu/ručního data/MO-vlevo.
- Dvě čisté exact-SHA canonical sestavy166souborů, digest `f360d312d86f5add0fab50e5504f970a4711c82d8fc71096a8956dadb57bd52e`, source unchanged. Všechny původní gates PASS bez oslabení. Cílené42VMoverview/draft testy PASS, celé npm check PASS.
- Chromium320/390/768/1366px PASS: MOFree/Press nezávisle, MO vlevo/TO vpravo, přenos přes změnu směny/data a reopen, datum viditelné/interaktivní44px, date picker click hook, ruční13.10. persist/reopen s údaji. Prázdný starý ranní draft přejde na current noční12.10.; explicitníVM04:05dne13.10. očekáváD:nocni12/startdate12.10. Vyplněná nula/skrytá pole/vypnuté jednotky/pending save obnovena beze změn.
- SVG tabulka Nabroušeno · brusy vpravo dole: TBKR01/07 × AG/AE,AF/AD,AH × Volné/Pod lisem + součty každého brusu. VM kontrola výpočtů a separace původní inventury PASS. Vykresleno Sharp doPNG se syntetickými údaji, vizuálně zkontrolovány pozice, čitelnost a žádný překryv poznámek. Nejde o fyzickou Safari přejímku.
- READY `dpl_8WXPSgnNpQLFvaxyy4CuBnhXcryo`, exact sourceSHA, immutable <https://skoda-spada-1fxl0b4le-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS, metadata2.0.9 a výhradně TESTcgshssdjgzzuprlwnabl.
- Main pre/post dda626a2c0838af1fffde039b8bbea2eedd6b54d, produkční READYaliasdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. ReadonlyDBhead20261012021355, Edge absence17/admin16/hradnik3/retiredexport3 původní JWTflags. Žádné backend/main/produkční zápisy.
- TEST rollback2.0.8 dpl_gDX53cjvNsN8FxZfMSPgup5c9B5R kompatibilní, nové splitMO a grinders JSON zachovat. Staré producedMO nerozdělovat odhadem. Funkční automatické ověření/nasazení100 %, fyzická iPhone přejímka čeká na vlastníka.

## 13. 10. 2026 — TEST 2.0.8 aktuální prázdný přehled a datum (CI/nasazení dokončeno, dále rozšířeno2.0.9)

Pouze TEST. Vlastník ve04:05dne13.10. viděl prázdný draft12.10.ranní; readDraft bez rozlišení obsahu přebil aktuální noční kontext. Při otevření prázdného draftu z jiného kontextu vybrat aktuální směnu/startdate a zachovat prázdno (nenačíst místo něj staré uložené hodnoty). Vyplněné údaje včetně nuly, skrytých polí, vypnutých jednotek a calculation history i pending mutation zachovat. Datum nahrazeno viditelným nativním date inputem s44px plochou a klikem showPicker/focus fallback; původní neviditelný opacity0 overlay odstraněn. Změna data stejně jako směny zachová vstupy a přepne cílovou CAS revision/mutation scope. Ruční výběr se za otevření nepřepisuje automaticky. Do skladu MO vlevo, TO vpravo pouze pořadím sloupců, hodnoty/key zachované. Runtime/cache2.0.8/buildrelease1/epochv208. Backend/main/produkce bez změn. TEST rollback2.0.7 dpl_5J4ydJukRe67cZT2huKoAB1mJYX2 kompatibilní. CI38335718966 attempt1 SUCCESS verify/release-preview, SHA96ef57ae86b091d877a98ae8bb96c5237db497a0. READYdpl_gDX53cjvNsN8FxZfMSPgup5c9B5R, immutablehttps://skoda-spada-39koig5c1-martinspadrnas-projects.vercel.app. Za běhu přidány další požadavky vlastníka, dokončení souhrnně ve2.0.9.

## 12. 10. 2026 — TEST 2.0.7 poslední vsázky a viditelné ST/BK (100 % automatické ověření a nasazení)

Pouze TEST. ALD3 lastBatch editovatelné v obou směnách. Všechny ST1–5 a BK1–10 v ALD1/2 zpočátku aktivní u nového záznamu; uložená vypnutí se zachovají. Celý čtverec zelený nebo šedý. Oprava specificity vůči globálnímu glass theme, izolovaná ID rootem; skutečný Chromium fixture nyní načítá všechny app stylesheets a kontroluje computed backgroundColor/backgroundImage. Výsledný SVG zachovává součty a tabulku, explicitně ji označuje Čísla posledních vsázek s ALD1/2/3 hodnotami. Runtime/cache 2.0.7/buildrelease1/epochv207. Backend, main/produkce bez změn. TEST rollback 2.0.6 dpl_9EYMe9oiZyH7g3tQpeHwstdJrRbj, data kompatibilní. Automatické ověření a nasazení dokončeno; fyzická iPhone přejímka čeká na vlastníka.

### TEST 2.0.7 — dokončený důkaz

- Funkční SHA `e58ef03b7f975cbd63439e0928d4318c6783373d`, runtime/cache2.0.7/buildrelease1/epochv207. CI [38297934753](https://github.com/martinspadrna/RaK/actions/runs/38297934753) attempt1 SUCCESS verify i release-preview.
- Dvě exact-SHA canonical sestavy166souborů, digest `51681216aaa88f9e087aab749e1a5d45bc973e48679b24a3f3de2bd45b4d4175`, source unchanged. Původní gates PASS bez oslabení. Cílené39overview/draft VM testy PASS a celé npm check PASS.
- Chromium320/390/768/1366px PASS se všemi app stylesheets: všech25ST/BK zpočátku aktivních, přesné vypnutí/reopen/přepnutí, skutečná neprůhledná zelená rgb22/122/53 a šedá rgb102/107/115, bez backgroundImage, čtverce44px. ALD3 číslo poslední vsázky editovatelné obě směny a zachované při přepnutí. SVG obsahuje jasný přehled všech3posledních čísel, původní součty zachované.
- READY `dpl_5J4ydJukRe67cZT2huKoAB1mJYX2`, exact sourceSHA, immutable <https://skoda-spada-duek7nhjo-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200/exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS. Config pouze TESTcgshssdjgzzuprlwnabl.
- Main pre/post dda626a2c0838af1fffde039b8bbea2eedd6b54d a produkční alias READYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN nezměněné. Readonly DBhead20261012021355, Edge absence17/admin16/hradnik3/retiredexport3 s původními JWTflags. Žádné backend/main/produkční zápisy. TEST rollback2.0.6 kompatibilní; uchovat drafty/masky a všechna čísla.

## 12. 10. 2026 — TEST 2.0.6 přehled: popisky a ST/BK (100 % automatické ověření a nasazení)

Pouze TEST. Jednosloupcové indexy bez opakovaných popisků Sklad/Montáž/145/212; nadpis Po broušení (op212). Vícesloupcové odlišující popisky ponechány. ST1–5 v ALD3 a BK1–10 v ALD1/2: skutečné čtverce44px s číslem, výchozí vše aktivní, klepnutí vypne (šedé) nebo zapne (zelené), aria-pressed a přístupné názvy. Masky přesných vypnutých identit v ald[i].inactiveUnits; legacy running zůstává archivně zachované, neodhadovat identity z počtu. Synchronous draft a původní account JSON/CAS/outbox ukládání. Brusy TBKR01 i TBKR07 mají Volné/Lis oddělené pro všechny3indexy: nové groundTBKR01Free/Press a groundTBKR07Free/Press. Staré nerozdělené groundTBKR01/07 zachované ve zdrojovém JSON; bez hádání jejich typu/přesunu. ALD1/2 lastBatch opět editovatelné v ranní i noční. Původní SVG/součty, role, auto směna a zbytek pořadí zachovány. Backend ani main/produkce se nemění. Jednotná runtime/cache2.0.6/buildrelease1/epochv206. VM a aktualizovaný Chromium fixture ověřují default25aktivních čísel, přesné vypnutí/reopen/změnu směny,44px čtverce, oddělené Volné/Lis, lastBatch obou směn a ostatní původní gates. Canonical/CI/nasazení dokončené; důkaz níže. TEST rollback2.0.5 dpl_2cQ6LDHwHL1brUedAZw1KMWZmXSW, nové masky i rozdělená pole starší normalizátor zachová, nemažeme data.

### TEST 2.0.6 — dokončený důkaz

- Funkční SHA `b487ac7c375f742db81eeb69072bffa3f25320f4`, runtime/module/SW2.0.6/buildv2.0.6-release1/epochv206. CI [#929/38295837020](https://github.com/martinspadrna/RaK/actions/runs/38295837020) attempt1 SUCCESS, verify i release-preview.
- Dvě čisté exact-SHA canonical sestavy166souborů, digest `044f51c1618f29ee2b8da612b69d33748b67be236d3141591f50bce53a849455`, source unchanged. Původní security/privacy/role/CAS/offline/update/network/size/performance/quality/source-backup/HTTP gates PASS bez změny limitů. Cílené45overview/draft/login VM kontroly PASS.
- Aktualizovaný skutečný Chromium fixture PASS pro kontejnery320/390/768/1366px: všech25ST/BK zpočátku zapnutých, přesné vypnutí a přenos přes změnu směny/reopen,44×44px čtverce, nové oddělené Volné/Lis, lastBatch1/2 v obou směnách a původní výpočty/počítadla/násobení/draft/souhrn/role/overflow.
- READY `dpl_9EYMe9oiZyH7g3tQpeHwstdJrRbj`, source exactSHA, immutable <https://skoda-spada-hdht3psw7-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200 a exactbyte9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS. Config pouze TESTcgshssdjgzzuprlwnabl. Původní SVG souhrn beze změny. Staré nerozdělené brusové hodnoty se nedomýšlejí do nových polí, zůstávají zachované ve záznamu.
- Pre/post main dda626a2c0838af1fffde039b8bbea2eedd6b54d, produkceREADYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN/source61b04d7394746f28623b453be9cb710655c16c77, DBhead20261012021355, Edge absence17/admin16/hradnik3/retiredexport3 s původními JWTflags beze změny. Žádné main/produkční/DB/Edge zápisy. Jen frontend TEST.
- TEST rollback dpl_2cQ6LDHwHL1brUedAZw1KMWZmXSW (2.0.5); uchovat masky inactiveUnits i nové split fields/drafty. Implementace/nasazení/automatické ověření100 %, fyzická iPhone přejímka čeká na vlastníka.

## 12. 10. 2026 — TEST 2.0.5 ranní/noční přehled (100 % automatické ověření a nasazení)

Autorizováno pouze TEST. Předlohy vlastníka Ranní.xlsx/Noční.xlsx z12.10.2026 jsou pořadí sčítání a viditelných polí. Ranní: Sklad → ALD3 (poslední, celkem před, ST, závady) → Dusík → Obrábění (Do skladu TO/MO; Brusy TBKR01/TBKR07; závady) → ALD2 (BK,závady,vsázky) → ALD1. Noční: Sklad → Montáž → ALD3 (celkem před,ST,závady; bez poslední) → Sklad před kalením → Sklad po kalení → Po broušení → Po145 → Před145 → Měkké obrábění → Obrábění → ALD2 → ALD1. Celkové poznámky a původní SVG souhrn zůstávají na konci.

ST/BK jsou stávající ald[0–2].running. Nové počty do skladu TO/MO a brusy mají samostatné oam.rows[index].producedTO/producedMO/groundTBKR01/groundTBKR07, nekolidují se stavem skladu ani starými AAR záznamy; ukládá je existující JSON/RPC/outbox beze změny backendu. Nezahrnovat je do původního souhrnu. Pole skrytá na jiné směně se při readDom/save zachovávají z plného záznamu. Ruční změna směny snapshotuje pole, přerenderuje pouze formulář, ponechá datum/poznámky/souhrn, synchronně uloží draft a přepne CAS revision/mutation scope podle cílové směny. Automatická volba activecycle A–D, 8/12h a nočního startdate beze změny. Nevybraná směna ponechá kompletní editor do ruční volby. Staré drafty/data nemažeme.

CI #926/38289817842 na803d4a9b: tři pokusy fail pouze FCP P90; nový Chromium formulář PASS ve všech čtyřech šířkách. Nasazení správně skipped, veřejný TEST stále2.0.4. Porovnání startovacích JS/CSS/index s ověřeným2.0.4 kromě identity byte-identical. Kandidát doplněn o potvrzení skutečného FCP přes Paint Timing (kde podporováno), místo pouhé příležitosti dvojitým RAF. Lokální nejvýše250ms pojistka; nepodporované/hidden prostředí drží původní fallback. VM test ověřuje oba callbacky bez paintu stále pozastavené, skutečné FCP i timeout uvolní běh. Výkonnostní prahy/reference beze změny; Doplněný kandidát následně prošel celé CI napoprvé; jde o opravu pořadí hydratace, ne tvrzení odstranění veškerého kolísání runneru.

Cílené38VMoverview/draft kontroly PASS, včetně pořadí, nulových duplicit, obou přepnutí se skrytými hodnotami/historií a beze změny summarySvg. Původní summarySvg funkce byte-identical. Nový skutečný Chromium fixture čtyř šířek ověřuje formulář/přepnutí/výpočty/multipliers/počítadla/draft/reopen/role/overflow; přidán k původním CI gates. Celé canonical/CI i veřejný TEST release dokončené; důkaz níže. Jednotná runtime/cache2.0.5, buildv2.0.5-release1, epochv205. Fyzická iPhone přejímka po nasazení vlastníkem.

Precheck main dda626a2c0838af1fffde039b8bbea2eedd6b54d, produkceREADY dpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN/source61b04d7394746f28623b453be9cb710655c16c77, DBhead20261012021355, Edge absence17/admin16/hradnik3/retiredexport3 s původními JWT flags. Produkce/main/backend beze zápisů. TEST rollback dpl_8JLP89df58aqXZF4y2QSmtD7Mn8e (2.0.4), nová JSON pole původní normalizátor uchová, předlohy nemění partsAssignment2.

### Dokončený TEST 2.0.5 — důkaz

- Funkční SHA `57573b625906803cc3495df210d334247d0fb9e5`, jednotná runtime/module/cache2.0.5, buildv2.0.5-release1, epochv205. CI [#927/38291917513](https://github.com/martinspadrna/RaK/actions/runs/38291917513) attempt1 SUCCESS, verify i release-preview. Předchozí #926 tři pokusy blokované FCP, nebyly nasazeny.
- Dvě čisté exact-SHA canonical sestavy166souborů, digest `8b626c7cb2c6381acea158b85f4bca2c59c7277c4ec09db948b7be2455dfc4a0`, source unchanged. Všechny původní security/privacy/role/CAS/offline/update/network/quality/size/HTTP/source-backup gates PASS, prahy nebyly oslabeny.
- Skutečný Chromium fixture PASS: šířky kontejneru320/390/768/1366px, pořadí obou směn, manuální přepnutí tam/zpět, skryté hodnoty, výpočty, násobení, počítadla, synchronní draft/reopen, souhrn, role gate a overflow. Nejde o fyzický Safari důkaz. Cílené44overview/draft/login, 31startup a 13first-paint VM kontroly PASS.
- FCP20párů: median336ms vs324ms (limit356), P90376ms vs344ms (limit419), P95392ms vs356ms. Jeden outlier892ms zůstal zaznamenán. Kompletní startupReady884ms vs410ms a wallReady1279ms vs829ms jsou diagnostika; netvrdit nulové rozdíly úplné hydratace.
- READY `dpl_2cQ6LDHwHL1brUedAZw1KMWZmXSW`, source exactSHA, immutable <https://skoda-spada-9tn1ffoxw-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200 a přesné bajty9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS; výhradně TEST cgshssdjgzzuprlwnabl, žádný produkční config. Počítací editor a původní summarySvg potvrzeny proti zdroji.
- Produkční pre/post main dda626a2c0838af1fffde039b8bbea2eedd6b54d, READYdpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN/source61b04d7394746f28623b453be9cb710655c16c77, DBhead20261012021355, Edge absence17/admin16/hradnik3/retiredexport3 a JWTflags nezměněné. Žádné DB/Edge, main ani produkční zápisy. Backendové JSON ukládání zůstává původní.
- TEST rollback dpl_8JLP89df58aqXZF4y2QSmtD7Mn8e (2.0.4); nezahazovat nová oam-row pole ani drafty. Vlastník má po aktualizaci ověřit ranní/noční pořadí a ruční přepnutí na iPhonu. Automatické ověření a nasazení100 %, fyzická přejímka čeká.

## 12. 10. 2026 — TEST 2.0.4 dokončen (100 % automatické ověření a nasazení)

TEST nyní obsahuje shodné prohození ALD1/ALD2 jako produkce 2.0.3: ALD1 Awa/Awi/TW1/TW2/TW3; ALD2 SR1–SR7/FR3/FR5/FR7/ZSB-RLR/SRRG/AAR. Původní hodnoty/výpočty se převádějí právě jednou, ALD3/poslední vsázka a původní uložené zdroje zachovány. Prohození na veřejném TESTu dokončeno; předchozí stav „CI teprve běží“ níže je historický.

CI #923/38199264188 původního2.0.3 attempt1 i attempt2 selhalo pouze na FCP P90 (652ms proti399ms, 628ms proti403ms), release-preview se správně nespustil a TEST zůstal2.0.2. TEST2.0.4 opravuje první paint yield: jediný requestAnimationFrame obnovoval Promise před paintem; dvojitý callback ponechá první snímek bez následné těžké hydratace. VM regrese ověřuje pozastavení po prvním callbacku a pokračování po druhém. Výkonnostní limity, role/data/backend beze změny. Jde o opravu pořadí; rozdílná rychlost runneru neumožňuje připsat celý rozdíl naměřených časů této jediné změně.

- Funkční SHA `751b5b450f2531966e76940126f3de2a12e64290`, jednotná runtime/module/SW2.0.4, build `v2.0.4-release1`, update epochv204.
- CI [#924/38230869600](https://github.com/martinspadrna/RaK/actions/runs/38230869600) attempt1 SUCCESS včetně verify a release-preview. Dvě čisté exact-SHA canonical sestavy166souborů, digest `99841909033c3702e077ca2f7fb90bd9dda6c74fe5c064ff3f43ed9e046814c9`, source unchanged. Všechny security/privacy/role/CAS/browser/offline/update/network/size/quality/HTTP/source-backup gates PASS bez oslabení.
- FCP20counterbalanced párů: medián216ms proti208ms (limit229ms), P90284ms proti236ms (limit311ms), P95492ms proti244ms pouze diagnostika. Úplné startupReady median534ms vs308ms, wallReady785ms vs571ms diagnostika; není to důkaz stejné rychlosti celé hydratace ani fyzického Safari.
- READY `dpl_8JLP89df58aqXZF4y2QSmtD7Mn8e`, source exactSHA výše, immutable <https://skoda-spada-d5wpckspw-martinspadrnas-projects.vercel.app>; veřejný TEST <https://skoda-spada-git-development-martinspadrnas-projects.vercel.app/>.
- Nezávislé HTTP200 a přesné bajty9assetů index/metadata/SW/app/core/About/overview/config/manifest PASS. TEST config výhradně `cgshssdjgzzuprlwnabl`, označení TEST zachováno. Přehledový modul má přesné stejné bajty jako živá produkce2.0.3. Samostatné lokální42overview/draft/login a12first-paint regrese PASS; dvě čisté místní sestavy PASS.
- Produkční pre/post: main `dda626a2c0838af1fffde039b8bbea2eedd6b54d`, READY `dpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN`/source `61b04d7394746f28623b453be9cb710655c16c77`, DBhead20261012021355, Edge absence17/JWTtrue, admin16/JWTtrue, hradnik3/JWTfalse, retiredexport3/JWTtrue beze změny. Žádné DB/Edge ani main/produkční zápisy.
- TEST rollback `dpl_9wbdkCm2dw7XCNreNKqhDWDH5yFA` (2.0.2): starý editor neumí nový partsAssignment2 payload; před rollbackem vyřešit reverzní kompatibilitu, nesmazat data.
- Fyzická přejímka ALD a Safari/iPhone/new-device login zůstává otevřená; automatické ověření a TEST nasazení100 %. Další práce podle otevřeného stabilizačního backlogu pouze TEST; produkce2.0.3.

## 12. 10. 2026 — ALD1/ALD2 prohozené, produkce2.0.3 dokončena

Vlastník výslovně požádal prohození dílů a přímé nasazení na produkci. ALD1 Awa/Awi/TW1/TW2/TW3; ALD2 SR1–SR7/FR3/FR5/FR7/ZSB-RLR/SRRG/AAR. Starší payloady normalizátor převede s hodnotami a historií výpočtů právě jednou pomocí inputs.partsAssignment2; ALD3, poslední vsázka a ostatní data beze změny. Původní uložené zdroje nevymazávat. Jednotná runtime/cache/module verze2.0.3; nové idempotence/quantity/history/sum regression PASS. Dokončeno produkce: SHA `61b04d7394746f28623b453be9cb710655c16c77`, verze2.0.3/buildv2.0.3-release1. Exact-main CI #922/38198753666 SUCCESS; coordinator #5/38198740861 SUCCESS; auditovaný release #7/38199065471 SUCCESS. Dvě canonical sestavy166souborů, digest `7314203ceaf763aef23d63ea4a09066d1a9efbd8d109f520bc3b9be1a6929f9f`. Všechny bezpečnostní, browser, offline/update, výkonové a source-integrity gates PASS. Produkční READY `dpl_Ze5qSSBVDguR5WUWfru7LdGjtzEN`, immutable <https://skoda-spada-7zlixkwmw-martinspadrnas-projects.vercel.app>, stable <https://skoda-spada.vercel.app>. Nezávislé HTTP200, přesné bytes overview/metadata, správné nové ALD1/ALD2 a verze2.0.3 PASS. Backend žádné zápisy. Připravená shodná funkční oprava pro development s původním TEST configem a TEST označením; lokální úplné npm check PASS. Fyzická iPhone přejímka nového přiřazení čeká na vlastníka.

Development nyní obsahuje shodnou opravu a verzi2.0.3, zachovává výhradně TEST config a svoje označení TEST v About. CI/TEST preview po tomto commitu teprve běží; produkční nasazení nezávisle dokončeno a ověřeno. Další produkční změny vyžadují souhlas. Bezprostřední rollbackfrontend dpl_8DMbApYiWjdDpUi1MjhwLEm9BSpV; starší frontend neumí nový partsAssignment2 payload správně editovat, proto při rollbacku nejprve řešit reverzní kompatibilitu, nesmazat data.

## 12. 10. 2026 — dokončený produkční hotfix O aplikaci

Vlastník screenshotem doložil chybné označení „11. 10. 2026 · TEST“ na main a požádal jeho odstranění. Produkční O aplikaci nyní uvádí skutečné datum12.10.2026 bez TEST; historická vysvětlení používají neutrální text. TEST větev si ponechává své11.10.2026/TEST. Při budoucím převodu na main zachovat produkční označení/datum.

Dokončeno: produkční hotfix SHA `70d9cf00c51a19addfe468bd2e8c7c674fa52e79`, build `v2.0.2-release2`, viditelná verze2.0.2. Exact-main CI #920/38196525212 SUCCESS, coordinator #4/38196514641 SUCCESS, auditovaný release #6/38196882304 SUCCESS. Dvě canonical sestavy166souborů, digest `bbe8e01e8c18db455936526b04a0c9b4ff007eab26c87567d847ca1a8a60dc81`; všechny původní quality/security/browser/performance gates PASS. Produkční READY `dpl_8DMbApYiWjdDpUi1MjhwLEm9BSpV`, immutable <https://skoda-spada-mras2jdtr-martinspadrnas-projects.vercel.app>; stabilní <https://skoda-spada.vercel.app>. Nezávislý HTTP200 a byte-match About/metadata/SW PASS; About history bez TEST, datum12.10.2026. Bez DB/Edge změn. Bezprostřední frontend rollback `dpl_3TPggR9PktdRPraxYQJJAq62nhP5` (původnírelease2.0.2/build1). Fyzická aktualizace iPhone čeká na vlastníka.


## Aktuální produkční důkaz — 12. 10. 2026

**RaK 2.0.2 je dokončeně nasazený na main i produkci.** Martin výslovně povolil rollout po úspěšných kontrolách. Tento stav nahrazuje starší zmrazenou baseline 1.9.0 a níže uvedené přípravné záznamy; další vývoj opět pouze TEST, další produkční změna vyžaduje vlastníkův souhlas.

- Produkční release SHA `941b9b8f132f16b957645ed60c70a4fc4ff76fb7`; PR [#12](https://github.com/martinspadrna/RaK/pull/12) merged, PR11 superseded/closed. Funkční TEST zdroj `05029ee224f96ac021726ed8dfebfe6b2392c2b0`, development během rollout nezměněn: `7ed0b588c5f8d0d3843ca6c76b5c2cd711597bca`. Následné dokumentační commity nemění runtime verzi ani nasazené zdrojové SHA.
- PR CI #915 attempt2 PASS; exact-main [CI #917](https://github.com/martinspadrna/RaK/actions/runs/38195261443) PASS, coordinator #2/38195153593 PASS, [auditovaný release #5](https://github.com/martinspadrna/RaK/actions/runs/38195580086) PASS. Předchozí exact-main #916 selhal pouze FCP P90 368ms proti limitu367ms; následné měření bez uvolnění limitů PASS: median324 vs316ms (limit348), P90376 vs336ms (limit411). Dvě čisté canonical sestavy166souborů, stabilní digest `ec47265e88ae4f211d320f63792f0e717d88f7cf5e960df55126d2341c6900a0`. Runtime/security/privacy, role, draft, CAS, offline/update/network/budget/parity i source-backup/CRC gates PASS.
- READY `dpl_3TPggR9PktdRPraxYQJJAq62nhP5`; immutable <https://skoda-spada-3hpuyqo31-martinspadrnas-projects.vercel.app>; produkce <https://skoda-spada.vercel.app>. Auditovaný release ověřil exactSHA, neměnnou kandidátní HTTP odpověď a veřejnou adresu před/po změně aliasu. Samostatný HTTP200 a byte-match index/SW/metadata/config/app/overview ověřen; config výhradně produkční projekt. Jednotná runtime/cache2.0.2, build `v2.0.2-release1`. Git automatické nasazení main/development zůstává vypnuté; jednorázový coordinator se spustí pouze změnou vlastního YAML na main.
- Produkční Supabase `bkqamcbkiwumsvelahxr`: nové remote migrace `20261012021353` overview (repo20261011105146), `20261012021354` foreman (repo20261011124442), `20261012021355` sick-leave N (repo20261011164201). Původní aplikované SQL/hash zachovány. Additive změny; starý kód LEK nadále přijímán, existující záznamy nepřepisovány.
- Edge inventář: absence-calendar17/JWTtrue a hradnik-sync3/JWTfalse beze změny; přesný kandidátní rak-admin-users16/JWTtrue nasazen a byte-match ověřen. Známý TEST export v produkci vyřešen: rak-p15-restore-export3/JWTtrue obsahuje pouze retirement handler HTTP410 `test_only_function_retired`, bez databáze, tajných hodnot a exportu. Plnou TEST implementaci nikdy znovu nenasazovat do produkce; TEST endpoint ponechán funkční.
- Před i po DB aplikaci rollbackové syntetické fixtures PASS: účetní izolace/role, stale-CAS, idempotence, selected-day N/LEK, payload/grants/RLS a anonymous denial. Žádná reálná přihlašovací session ani rozpis nepřepsány; owner9811 stále enabled owner, testovací profily0, overview řádky0 při postcheck. Anonymous overviewRPC401, adminEdge401, retiredexport410. Advisors odpovídají očekávaným kategoriím23/14/50/1; nejde o tvrzení nulových varování.
- Rollback frontend: ověřená baseline `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`, SHA `915a75793207b4125a0489dd8e5c824696f227ab`, URL <https://skoda-spada-ourw28jh8-martinspadrnas-projects.vercel.app>. Vrátit pouze stabilní alias a ověřit veřejný HTTP/runtime. Zachovat overview data, kompatibilní N/LEK RPC i CAS; nesmazat data/neobnovit staré preCAS writers. Při problému adminEdge lze vrátit zachycený v15 zdroj z původního main s JWTtrue. Export capability neobnovovat.
- Otevřené: fyzická přejímka Safari/iPhone a zabezpečené přihlášení na skutečném novém zařízení zůstávají nedoložené. Automatické clean-storage readiness, správné/nesprávné credentials v mocku a role denial nejsou fyzický důkaz ani reálný produkční login uživatele. Funkční rollout a automatické ověření jsou dokončené.


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

## Stav TESTu při přípravě 11. 10. 2026

TEST v2.0.2 je nasazený: kantýna/jídelna mají denní panely ve dvojicích, toolbar rozpisu má odstup od okraje a Kalírna je jen ve Výjimkách dne. Přehled směny průběžně ukládá oddělený místní draft, obnovuje jej po zavření a nabízí Vymazat přehled bez smazání online zálohy; Uložit výslovně zálohuje online. O aplikaci má stručný souhrn bez zmínky o Mistrovi a data všech generací (doložené release dny, nejstarší verze 5/26). Neschopenka se zobrazuje bez (N), uložený kód N zachován. Role, glass/časy, Neschopenka a zabezpečené přihlášení zachovány. Aktuální TEST kandidát připraven, fyzická iPhone přejímka čeká; produkce zmrazená.

### Historická produkční baseline RaK 1.9.0

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
