# RaK – jediný kanonický předávací dokument, plán a aktuální stav

> **Toto je jediný řídicí dokument projektu RaK.** Stálý odkaz je
> https://github.com/martinspadrna/RaK/blob/development/RAK_HANDOFF.md
>
> Po každém větším balíku se aktualizuje právě tento soubor: provozní pravidla, aktuální stav, celý 13bodový plán, checkboxy, procenta, důkazy, backlog, pořadí práce i otevřené blokátory. Starší stavové a plánovací soubory jsou pouze historie a nesmějí řídit další práci. `RAK_PLAN_13.md` je kvůli kompatibilitě pouze bajtově totožné zrcadlo stejného Git blobu. Nesmí se upravovat samostatně; každý budoucí zápis musí obě cesty nasměrovat na jeden nový totožný blob.

## Nejkratší prompt pro nový chat

> Pokračuj v projektu RaK podle `RAK_HANDOFF.md` na aktuálním HEAD větve `development`.

Nový chat musí z tohoto jediného souboru získat vše potřebné. Odkazované technické dokumenty a strojové artefakty se čtou jen tehdy, když jsou potřeba pro konkrétní krok nebo ověření.

## Povinný začátek každého pokračování

1. Online zjistit živý SHA větve `development`; SHA uložené v konverzaci nebo v tomto dokumentu je pouze kontrolní bod.
2. Z přesného SHA načíst celý `RAK_HANDOFF.md` a řídit se jím.
3. Ověřit, že `main`, produkční Vercel a produkční Supabase zůstaly beze změny, pokud vlastník výslovně neschválil konkrétní produkční krok.
4. Před **každým zápisem** znovu ověřit SHA `development`. Commit musí mít právě tento SHA jako rodiče, bez force a bez přepsání souběžných změn.
5. Nikdy nepoužívat ani neprohlížet místní kopii RaK. Zdroj, commity, testy, GitHub Actions, Vercel a Supabase řešit online.
6. Rozpor mezi tímto dokumentem a strojovým release důkazem řešit fail-closed: nic neprohlásit za splněné, rozpor doložit a opravit dokumentaci.

## Závazné hranice

- Běžná práce probíhá pouze na aktuálním `development`.
- `main`, produkční Vercel deployment/alias a produkční Supabase se nesmí měnit bez nového výslovného souhlasu vlastníka pro konkrétní krok.
- Produkční Supabase je `bkqamcbkiwumsvelahxr`; vývojové ověřování používá výhradně TEST `cgshssdjgzzuprlwnabl`.
- Vlastník povolil pouze bezplatná řešení. Nový nebo placený Supabase projekt, placená větev, PITR či add-on vyžaduje předchozí souhlas.
- Nevypisovat JWT, hesla, API klíče, osobní odpovědi ani tajný parametr Vercel shareable odkazu. Shareable odkaz nerotovat ani nerušit bez souhlasu.
- Nemazat Safari/PWA, localStorage, CacheStorage, service worker, synchronizační frontu ani uživatelská data jako univerzální opravu.
- Neobcházet ani neoslabovat testy; opravovat skutečnou příčinu.
- Od releasu 1.7.85 jsou aktuální čísla verze sjednocená: viditelná, technická, modulová cache a `package.json` používají stejné číslo; SW cache používá stejné číslo s prefixem `v`. Každý nový funkční release zvýší všechny tyto hodnoty právě jednou.
- Současný ověřený development runtime je `1.7.92`. Dokumentační nebo čistě testovací následník bez změny runtime číslo verze nezvyšuje.
- Dokumentační nebo čistě testovací změna bez změny aplikace verzi nezvyšuje a nevytváří Vercel deployment.
- Dělat velké tematické balíky, minimum commitů a jediný deployment až po úplně zeleném CI přesného SHA.
- Po každém větším balíku reportovat všech 13 oblastí a jejich procenta.

## Aktuální ověřený provozní stav k 24. 9. 2026

- Poslední ověřený **funkční** development release: `8b76c5efab1fdca3d3f907845d63f5b19e9b9a4d` (`1.7.92`). Živý HEAD se vždy zjišťuje online; případný následný dokumentační commit nesmí být zaměněn za nový runtime release.
- `main`: `de443b771bb7e7dd5fefa498883fdd220a78f07d`.
- Produkční validace: [Actions #261](https://github.com/martinspadrna/RaK/actions/runs/35957793587), SUCCESS.
- Produkční release: [Actions #1](https://github.com/martinspadrna/RaK/actions/runs/35958452867), SUCCESS.
- Produkční Vercel: `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, READY, přesně na main SHA; produkční alias na něj ukazuje.
- Produkční metadata zůstávají historicky `1.7.83` / technická `1.7.0` / cache `v1.7.83` / build `v1.7.83-about-release1`; sjednocení verzí od 1.7.85 se týká nových development release a do produkce nebylo bez souhlasu přeneseno.
- Produkční Supabase zůstává `bkqamcbkiwumsvelahxr`. Fáze A i schválená atomická fáze B jsou aplikované; fáze B je migrace `20260924104723_rak_production_phase_b_17083`.
- Produkční Edge Function `rak-admin-users`: ACTIVE, verze 8, `verify_jwt=true`, platformní SHA-256 `95b4e0b95f4d8d2e8a1109557c62377bb552aac68425c00f299fe86c50b98ffc`.
- Produkční důkaz: artefakt `rak-production-release-evidence-de443b771bb7e7dd5fefa498883fdd220a78f07d`, ID `10791158417`, SHA-256 `15311dc153d8c3d01ae7b68cec76269ca0971e4ff345f79f8d349aac0dfbc6f6`.
- Nedestruktivní produkční rollback: READY `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`.
- Stabilní development alias nyní ukazuje na `dpl_Cfmv48V3bSgdPSFXMQo88BrvSrcQ`, READY / SHA `8b76c5efab1fdca3d3f907845d63f5b19e9b9a4d`. Přesný SHA prošel [Actions #295](https://github.com/martinspadrna/RaK/actions/runs/36036804085) SUCCESS; release job přesunul alias až po celé fail-closed bráně. Ověřený rollback cíl je READY `dpl_8nw6WHHdocmYY78weqf2iD4oSviV` / předchozí development 1.7.91.
- Release 1.7.92 prošel dvěma kanonickými buildy, celým `npm run check`, zděděnými i novými gate testy, rollback/ZIP důkazy, reálným Chromium online→offline→online testem, třemi PWA benchmarky a živou anonymní TEST HTTP kontrolou. Release evidence `rak-release-evidence-8b76c5efab1fdca3d3f907845d63f5b19e9b9a4d` má artefakt ID `10825007749`, SHA-256 `accfe4e7d91a05a16898ee93401576feb6496166aac6982ead490c89ff60bebf`.
- Development metadata: viditelná `1.7.92`, technická `1.7.92`, modulová cache `1.7.92`, `package.json` `1.7.92`, SW cache `v1.7.92`, build `v1.7.92-calendar-time-range1`. Nativní veřejný ICS kalendář a mapování `Busy` → `Ranní`/`Noční` zůstává zachované. Denní přehled po kliknutí na datum nově přenáší i `DTEND` a ukazuje celý interval, např. `06:00–18:00`, `18:00–06:00` nebo `22:00–06:00`; měsíční mřížka zůstává stručná a celodenní události zůstávají `celý den`. Žádná nová Supabase migrace nebyla potřeba.
- Předchozí schválený úklid produkčního Gomoku zůstává doložen [Actions #269](https://github.com/martinspadrna/RaK/actions/runs/35989913390) na SHA `8956893f160c05805b2cad7eb7467bed8e42f3e8`; tato historie se novým TEST releasem nemění.
- Přípravná kontrola produkční fáze B: development commit `9b6780b05c1d0f2e6149e7839ff3bc91b9a2488c`, [Actions #266](https://github.com/martinspadrna/RaK/actions/runs/35984992508), SUCCESS. Po zeleném CI vznikl jediný preview `dpl_E7fCLqBf6t26i6RzagVCNyMxGwqt`, READY na přesném SHA; HTTP důkaz potvrdil metadata `1.7.83` / `1.7.0`, TEST Supabase a nepřítomnost produkčního ID. Artefakt `rak-release-evidence-9b6780b05c1d0f2e6149e7839ff3bc91b9a2488c`, ID `10801851415`, SHA-256 `072fdd82c2747d79a39e092444ebd222da7f02b8043ab7c0ef77b64807510293`. Aplikační runtime se funkčně nezměnil; deployment vznikl kvůli konzervativní klasifikaci SQL migrace a pravidlo nebylo oslabeno.
- `main`, produkční alias a produkční Supabase se po dokončeném předání dále nemění bez nového souhlasu.

## Stav fyzické přejímky a fáze B

RaK 1.7.82 prošla 23. 9. 2026 fyzickým iPhone testem bez mazání dat: online přihlášení a TEST fungovaly, cold offline start načetl Dashboard, Rotaci i rozpis, návrat online fungoval bez restartu a falešný konflikt se nevrátil. Tuto závadu znovu neotvírat bez nové reprodukovatelné regrese.

**RaK 1.7.92 – úplná fyzická přejímka aktuálního developmentu ještě čeká.** Automatické Chromium/CI důkazy se za iPhone nevydávají. Release 1.7.85 opravil doručování PWA aktualizací a vlastník následně potvrdil, že se development skutečně aktualizoval na 1.7.85; tím je doložena update cesta, nikoli celý fyzický checklist local-first/account syncu.

Na stabilním development aliasu 1.7.92 je potřeba potvrdit zejména: (1) online návrat do instalované PWA zobrazí „kam jdu“ bez čekání na Supabase; (2) úplné zavření a start v režimu Letadlo zobrazí stejný lokální rozpis; (3) účet A → odhlásit → účet B ani krátce neukáže jméno nebo vzhled A; (4) stejný účet na dvou zařízeních převezme serverový vzhled a offline změna se po reconnectu deterministicky vyřeší bez globálního konfliktu; (5) přesun owner účtu mimo rozpis a zpět nezmění Auth/owner oprávnění; (6) Kalendáře: účet nastavený na A už fyzicky otevřel nativní veřejný kalendář a zobrazil události, takže dřívější blokace Google iframe/public ICS pro A je odstraněná. Po 1.7.92 je ještě potřeba na iPhonu potvrdit nové popisky anonymních směn: 06:00 `Ranní`, 18:00/22:00 `Noční`, a po kliknutí na datum také celý interval směny `od–do`; pojmenované události směny D se nesmějí změnit. B/C nebyly při tomto kroku výslovně ověřeny. Do úplného potvrzení se žádný širší iPhone-dependent checkbox nezavírá.

Dne 24. 9. 2026 vlastník výslovně potvrdil celý fyzický iPhone checklist verze 1.7.83: běžné přihlášení, owner/admin přihlášení a zařízení, Dashboard, Rotaci, „O aplikaci“ i restart instalované PWA bez mazání dat. Chromium výsledek se za tento fyzický test nevydává.

Po druhém výslovném souhlasu byla na zdravou produkční Supabase `bkqamcbkiwumsvelahxr` aplikována jediná atomická migrace `20260924104723_rak_production_phase_b_17083`, složená z 25 manifestem ověřených souborů development SHA `87a16c3433b371241991a59e756b2a10ea42b372`. Po změně zůstalo 101 řádků `gomoku_wins`, 11 účtů, 52 nastavení, 14 oznámení, 106 rotačních záloh, 153 keepalive zařízení, dva admin profily a jedna aktivní rotace; 12 `importMeta` záznamů se přesunulo do soukromé tabulky. Veřejné čtení legacy month/entry tabulek, adresáře účtů a Gomoku historie je uzavřené, veřejná společná `rotation_state` zůstává úmyslně dostupná podle přijatého OS-only rozhodnutí P0.2. Browser smoke načetl produkční HTML, manifest, `sw.js`, metadata `1.7.83` / `1.7.0` / `v1.7.83-about-release1`, produkční Supabase a bezpečnou odpověď „Účet nebyl nalezen“ pro neexistující číslo; konzole neměla chybu. Vercel deployment `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, produkční alias, `main` a Edge Functions se nezměnily.

Supabase security advisor po fázi B hlásí očekávaně 19 INFO tabulek s RLS bez politiky namísto 13, protože šest nově/nově uzavřených tabulek nemá žádnou klientskou cestu; anonymních `SECURITY DEFINER` funkcí zůstává šest a authenticated počet se zvýšil z 30 na 31 pouze o záměrný ověřený rotační reader. Varování ochrany uniklých hesel zůstává otevřené. Vlastník následně výslovně povolil smazání 101 historických výsledků již odstraněného Gomoku. Připravená migrace `20260924110000_rak_delete_retired_gomoku_history.sql` prošla [Actions #269](https://github.com/martinspadrna/RaK/actions/runs/35989913390) na přesném SHA `8956893f160c05805b2cad7eb7467bed8e42f3e8` a byla aplikována jako produkční migrace `20260924105811_rak_delete_retired_gomoku_history_17083`. Postkontrola potvrzuje nula řádků `gomoku_wins`, zachovaných 11 `game_accounts`, uzavřený SELECT/zápis pro anon i authenticated a nulové klientské RLS policy; tabulka zůstala zachována.

## Povinná release brána

Před každým funkčním preview musí na přesném SHA projít minimálně syntaktické kontroly, `npm run check`, relevantní unit a integrační testy, critical runtime smoke, security a offline regrese, dva čisté kanonické buildy, ZIP/manifest/CRC, skutečný Chromium smoke, TEST HTTP, jednotná metadata a GitHub Actions SUCCESS. Až poté smí vzniknout jeden Vercel preview.

Po deploymentu ověřit READY, stejné SHA, viditelnou a technickou verzi, TEST Supabase, nepřítomnost produkčního ID, dostupnost HTML, `sw.js`, metadat a vendor assetu, stabilní development alias, nezměněný `main` a nezměněnou produkci. Uchovat strojový release artefakt a konkrétní rollback cíl. Chromium nikdy nevydávat za fyzický iPhone test.

## Povinná údržba a report

- Po každém větším balíku aktualizovat v tomto souboru runtime SHA, verze, build/cache, Actions, Vercel, alias, artefakt, rollback, TEST/produkční izolaci, checkboxy, procenta, fyzické testy, blokátory, backlog a pořadí další práce.
- Nevytvářet nový číslovaný plán ani další paralelní kanonický dokument. Pokud by se struktura měnila, zachovat cestu `RAK_HANDOFF.md`.
- V češtině uvést: co bylo dokončeno, změněné checkboxy, přesné SHA, Actions číslo a odkaz, Vercel ID/stav nebo výslovný dokumentační skip, viditelnou a technickou verzi, otevřené/neověřené položky, jen relevantní fyzické iPhone kroky a přehled všech 13 procent.

---

## Úplný 13bodový plán, backlog, důkazy a historie

**Výchozí audit: 21. 9. 2026.** Repo `martinspadrna/RaK`, výchozí `development` SHA `ae0ed9d5cacffbabe38486b171a8793ee281d6a4`, poslední ověřená funkční testovací verze `1.7.69` na commitu `1693c8631c13d6e381e44a96810a55140ad6aa62`; technická verze musí zůstat `1.7.0`. Při založení šlo o změnu plánu, nikoli dokončenou opravu aplikace; aktuální produkční stav je vždy uveden v následujícím odstavci a v nejnovějším záznamu aktualizací. Podrobné provedení stabilizace: [RAK_STABILIZATION_PLAN.md](RAK_STABILIZATION_PLAN.md); historický stav a důkazy: [RAK_PLAN_17068_STATUS.md](RAK_PLAN_17068_STATUS.md) a předchozí stavové soubory. Stabilizační milníky S1–S6 jsou podúkoly níže uvedených oblastí, **ne čtrnáctý bod**.

**Aktuální online stav k 24. 9. 2026:** produkční předání 1.7.83 včetně schválené bezpečnostní fáze B je dokončeno a produkce zůstává beze změny. Nejnovější TEST runtime je 1.7.92 na funkčním SHA `8b76c5efab1fdca3d3f907845d63f5b19e9b9a4d`, [Actions #295](https://github.com/martinspadrna/RaK/actions/runs/36036804085) SUCCESS a Vercel `dpl_Cfmv48V3bSgdPSFXMQo88BrvSrcQ` READY; stabilní development alias na něj ukazuje. Metadata developmentu jsou jednotně `1.7.92`, SW cache `v1.7.92`, build `v1.7.92-calendar-time-range1`; release evidence má artefakt ID `10825007749` a rollback míří na READY `dpl_8nw6WHHdocmYY78weqf2iD4oSviV`. TEST Supabase zůstává `cgshssdjgzzuprlwnabl` s poslední migrací login-shift v3 z 1.7.89; 1.7.92 databázi nemění. `main` je `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` a produkční Supabase `bkqamcbkiwumsvelahxr`. Vlastník fyzicky potvrdil, že po zveřejnění kalendáře účet směny A nativní kalendář načítá; 1.7.92 navíc v detailu vybraného dne ukazuje celý časový interval směny. Nový text `Ranní/Noční` a interval `od–do` ještě čekají na fyzický iPhone retest. Vývojové práce pokračují pouze na `development`; další funkční změny nejprve do TEST `cgshssdjgzzuprlwnabl`.

## 0. Jak budeme počítat a aktualizovat procenta

- Každá položka `[x]` je **doložená splněná akceptační podmínka**, `[ ]` je nesplněná nebo nedostatečně doložená. Všechny podmínky v jednom bodě mají stejnou váhu; `% = zaškrtnuté / celkem × 100`, zaokrouhleno na celé procento. Neodhadovat podle počtu commitů, napsaného kódu nebo toho, že CI jednou zezelenalo.
- Jakmile regresní chyba zpochybní dříve splněnou podmínku, okamžitě ji odškrtnout a procento snížit. Splnění se váže ke konkrétnímu důkazu a prostředí, ne k tvrzení v changelogu. Budeme průběžně zapisovat datum, SHA, CI run, Vercel stav a výsledek relevantního testu. Nedoložené = nesplněné.
- **100 % znamená všechny podmínky opravdu splněné**, u oblastí s provozem i fyzický Safari / skutečný test, kde to bod vyžaduje. Jediná výjimka P0.2: **100 % je dokončení a zdokumentování rozhodnutí přijmout riziko; není to 100% zabezpečení veřejných dat.** Technická bilance se počítá odděleně.
- Nic nemažeme z plánu jen proto, že to nejde ověřit bez uživatelské akce, autentizovaných tokenů, zařízení nebo nákladů; označíme blokátor a zachováme položku otevřenou. Přijaté riziko lze uzavřít pouze výslovným rozhodnutím vlastníka s popisem dopadu.
- Pro každý realizační balík aktualizovat v tomto **jednom kanonickém dokumentu** checkboxy, procenta, důkazy, nově odhalené regrese a nejbližší kroky. Historické soubory jsou archiv, nesmí řídit současný stav. Průběžný report: hotovo / nově ověřeno / zbývá / celkové body / přesný SHA / CI / Vercel / konkrétní iPhone test.

## Přehled k výchozímu auditu

| Bod | Výsledek | Procento | Povaha stavu |
|---|---|---:|---|
| P0.1 | Účty a data pracovníků | **100 % (5/5)** | Uzavřeno; dlouhodobé privacy/export regrese doložené na vydaném runtime |
| P0.2 | Soukromí sdílené rotace | **100 % (5/5)** | Uzavřeno **pouze rozhodnutím o přijatém riziku** |
| P0.3 | API, exporty a historické klienty | **80 % (4/5)** | Otevřeno |
| P0.4 | Role vlastníka a administrátorů | **80 % (4/5)** | Otevřeno |
| P1.1 | Databázová oprávnění, RLS a RPC | **100 % (5/5)** | Uzavřeno; fáze B nasazena atomicky po TEST, CI, fyzické přejímce a dvojím souhlasu |
| P1.2 | Administrátorské heslo, relace a zařízení | **80 % (4/5)** | Otevřeno |
| P1.3 | Reprodukovatelný build, testy a verze | **100 % (6/6)** | Uzavřeno; kanonický build, stabilní testy, jednotná metadata a regresní parita |
| P1.4 | CI před nasazením, rollout a rollback | **100 % (6/6)** | Uzavřeno; automatický auditní řetězec konkrétního releasu je doložen |
| P1.5 | Úplné zálohy a prokazatelná obnova | **43 % (3/7)** | Otevřeno; shadow restore není úplná obnova |
| P2.1 | Výkon startu PWA | **20 % (1/5)** | Otevřeno |
| P2.2 | Rozložení, DOM, CSS a interakce | **40 % (2/5)** | Otevřeno |
| P2.3 | Offline, fronta, verze a konflikty | **63 % (5/8)** | **Otevřeno; fyzický iPhone acceptance na 1.7.82 prošel, zbývá konfliktní workflow a serverový CAS** |
| P2.4 | Bezpečná diagnostika a průběžná kvalita | **33 % (2/6)** | Otevřeno |

**Bilance: 5/13 uzavřeno (P0.1, P1.1, P1.3 a P1.4 technicky; P0.2 rozhodnutím o riziku), 8/13 otevřených.** Procenta nejsou obecnou známkou bezpečnosti ani příslibem bezchybnosti.

---

## P0 · Bezpečnost a soukromí

### P0.1 – Účty a data pracovníků · **100 % (5/5)**

Cíl: omezit zbytečné zveřejňování osobních údajů bez změny vlastníkem schváleného přihlášení zaměstnanců.

- [x] Zabránit anonymnímu čtení celého adresáře zaměstnanců; ověřeno dosavadními API a anonymními HTTP kontrolami.
- [x] Omezit vyhledání účtu přes lookup v2 a zachovat běžné přihlášení výhradně OS číslem.
- [x] Projít staré exporty, předchozí PWA/service worker a zálohy z hlediska dostupnosti adresáře, kontaktů a citlivých metadat; zdokumentovat, co nelze vzít zpět z Git historie či už stažených kopií.
- [x] Ověřit povolené a zakázané datové cesty se skutečnými podepsanými owner/admin/deputy JWT i anonymní relací; nikdy nevystavovat token v logu.
- [x] Přidat dlouhodobé regresní kontroly rozsahu osobních polí v odpovědích a exportech, včetně negativních případů.

**Dokončení:** všechny soukromé údaje mimo výslovně přijatý rozsah veřejné rotace chráněné a prověřené napříč novým i historickým klientem. **Omezení:** zaměstnancům nepřidávat hesla, e-maily, OTP ani vlastní Supabase Auth účty.

**Důkaz uzavření P0.1 – vydaný runtime 1.7.82:** funkční změna od SHA `62ced2d549b76f190748b6bbc1c9f77106b71ad0` odstranila z běžného ZIP exportu fallback klonující živý DOM; při nedostupném čistém `index.html` se export zastaví ještě před vytvořením ZIPu. `runtime-vm-fixture.test.mjs` ověřuje záporný scénář včetně nulového vytvoření ZIPu a stažení, `security-current-smoke-1630.mjs` zakazuje návrat DOM fallbacku a `http-anon-audit-17050.mjs` rekurzivně odmítá vyjmenovaná osobní pole ve veřejných nastaveních a neplatných login odpovědích. Tyto kontroly prošly v povinném `npm run check` i živé TEST HTTP bráně releasu 1.7.82 na SHA `1c6dc4e12eb4b1519e910a3b00bc64a1f5895767`, Actions run #243 (`35889947003`). Strojový release artefakt je PASS, Vercel `dpl_6m3mDvWpRAXNRKhR1LaceaJnx7jd` je READY na témže SHA, alias i immutable HTTP mají TEST `cgshssdjgzzuprlwnabl`, produkční ID chybí a produkční deployment i `main` zůstaly beze změny. Tím je poslední checkbox P0.1 dlouhodobě a na konkrétním releasu doložen; P0.1 se zvyšuje na 100 % (5/5). Přijatý veřejný rozsah společné rotace z P0.2 se tím nemění.

### P0.2 – Sdílená rotace a soukromí · **100 % (5/5; rozhodnutí, ne technická ochrana)**

Cíl: explicitně uzavřít konflikt mezi OS-only přístupem, společným/offline rozpisem a důvěrností dat; nepředstírat zabezpečení, které neexistuje.

- [x] Potvrzené rozhodnutí: běžní zaměstnanci se přihlašují pouze OS číslem, bez hesla/e-mailu/OTP/Auth registrace.
- [x] Zdokumentováno, že společný rozpis/offline režim vyžaduje v současném modelu veřejné čtení.
- [x] Soukromá `importMeta`, kontakty a autorství administrátora odděleny od veřejného rozpisu.
- [x] Zbytkové riziko výslovně pojmenováno: anonymně dostupná jména, běžné absence a zhruba 24 měsíců historie; OS číslo samo neověřuje identitu.
- [x] Stanoveno pravidlo: citlivé důvody absencí se do veřejné tabulky neukládají; případné jiné řešení vyžaduje novou domluvu s vlastníkem.

**Dokončení:** rozhodnutí uzavřeno, **ne** tvrzení, že jména a absence jsou soukromé. Nový nález širšího úniku patří zpět do P0.1/P0.3/P1.1 a může vyžadovat nové rozhodnutí.

### P0.3 – API, exporty a staré klienty · **80 % (4/5)**

- [x] Omezené login/legacy admin API, allowlist reportů a testovací HTTP sondy anonymního a neplatného JWT (dosavadní sada 18 kontrol).
- [x] Kontroly formátu ZIP, manifestu, kontrolních součtů/CRC a povolených typů souborů existují.
- [x] Reálně vyzkoušet owner/admin/deputy JWT, odmítnutí cizího účtu a přístup k privilegovaným exportům/API.
- [ ] Ověřit soukromé stažení a otevření zálohy na skutečném iPhonu, bez úniku do veřejných umístění.
- [x] Prověřit staré PWA/cache, chování chráněné Vercel preview URL a API/exporty ze starších buildů; regresní testy nesmějí obejít autorizaci.


**Kompletní audit zachovaných development preview, exportů a PWA 23. 9. 2026:** Vercel eviduje 34 deploymentů; z 18 development pokusů je 13 READY, čtyři ERROR a jeden CANCELED. Všech 13 READY buildů (`3c040643`, `cd6e8b89`, `630c1d0e`, `23b14e6b`, `2e710506`, `e0ea3d0a`, `445f6d18`, `173d57fd`, `b828a5e6`, `9eced072`, `50795a7c`, `7698b442`, `f2e064f8`) bylo prověřeno přes autentizovaný Vercel CLI bez shareable parametru: hlavní HTML, `sw.js`, manifest a `export.js` vracely HTTP 200; oba vyřazené endpointy `/api/admin-users` a `/api/rotation-absence-calendar` HTTP 410; konfigurace obsahovala pouze TEST `cgshssdjgzzuprlwnabl` a nikoli produkční `bkqamcbkiwumsvelahxr`. Přímý anonymní vstup na každý preview origin skončil HTTP 302 na `vercel.com/sso-api`; query parametry nebyly logovány. Starý i současný zdroj service workeru ignoruje cizí origin a `/api/`, necachuje odpovědi `no-store`/`private` a neobsahuje produkční ID ani Supabase runtime cache. Historické Vercel API před vyřazením ověřovalo bearer token přes `/auth/v1/user`, databázovou roli a owner gate. Běžný ZIP export balí zdroj aplikace a aktuální rotaci; od 1.7.78 při selhání načtení čistého `index.html` bezpečně skončí před vytvořením ZIPu a nikdy nepoužije klon živého DOM. Úspěšně vytvořený ZIP s aktuální rotací je i nadále soukromý soubor. Owner disaster-recovery ZIP záměrně obsahuje provozní osobní data a sanitizované Auth údaje, je chráněn owner-only RPC a po stažení jej nelze vzdáleně odvolat. Stejně nelze přepsat Git historii ani prohlásit za smazané dříve stažené ZIPy či PWA cache na cizích zařízeních; žádné mazání historie nebo uživatelských dat neproběhlo. Tím jsou historické podmínky P0.1 a P0.3 doložené a oba body se zvyšují na 80 % (4/5). Dlouhodobá regrese rozsahu osobních polí je následně doložena vydaným runtime 1.7.82; otevřené zůstává pouze fyzické soukromé otevření backup ZIPu na iPhonu v P0.3.
**Dokončení:** každý export/API má zdokumentovaný datový rozsah a pozitivní i negativní test ve skutečném prostředí.

### P0.4 – Role vlastníka a administrátorů · **80 % (4/5)**

- [x] Existuje logika odvolávání autentizovaných relací a přístupové diagnostiky bez zveřejňování tokenů.
- [x] Existuje testovací SQL matice oprávnění v rollback transakci / syntetických rolích.
- [x] Otestovat skutečné přihlášení owner, admin a deputy s platnými podepsanými relacemi.
- [x] Ověřit hranice rolí: cizí účet, běžný zaměstnanec, anonymní přístup a odvolaná relace nesmějí získat privilegované operace.
- [ ] Zopakovat přihlášení, správu a odvolání zařízení na skutečném iPhonu v Safari/PWA.

**Dokončení:** pro každou roli doložené povolené i zakázané akce, bez změny OS-only režimu zaměstnanců.

## P1 · Architektura, spolehlivost a obnova

### P1.1 – Databázová oprávnění, RLS a RPC · **100 % (5/5)**

- [x] Základní RLS a omezení veřejného přístupu nad současným souborem přibližně 20 tabulek; dosavadní testovací anonymní sondy.
- [x] Syntetická SQL role matrix a kontrola privátních nastavení bez trvalých testovacích zápisů.
- [x] Provést autorizované pozitivní/negativní kontroly se skutečnými JWT všech privilegovaných rolí.
- [x] Zinventarizovat všechny privilegované RPC (včetně `SECURITY DEFINER`), `GRANT`, RLS a všechny veřejné cesty zapisující do provozních tabulek; vyhodnotit křížový přístup účtů.
- [x] Každou nutnou úpravu politik nasadit nejprve do TEST s migrací, testem i reverzním postupem; fáze B byla po zeleném CI, fyzické přejímce a dvojím souhlasu atomicky přenesena do produkce a ověřena SQL i browser smokem.

**Dokončení:** bezpečnost stojí na serverových pravidlech, nikoli jen na skrytých tlačítkách; přijatá výjimka veřejného čtení rozpisu je jasně oddělená. Produkční DB bez výslovného schválení neměnit.

### P1.2 – Administrátorské heslo, relace a zařízení · **80 % (4/5)**

- [x] Oddělené administrátorské Auth relace navázané na uživatele, session a zařízení; omezený bootstrap.
- [x] Obnovení již odvolané relace je blokováno.
- [x] Ověřit podpisy a expiraci na skutečných owner/admin/deputy relacích v TEST.
- [x] Ověřit odvolání na druhém zařízení a přesně rozlišit „odvolaná relace“ versus „nové přihlášení se stále platným heslem“.
- [ ] Reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.

**Dokončení:** konzistentní serverová ochrana i po restartu a odvolání, nikoli pouze klientský příznak `adminUnlocked`.


**Společný bezpečnostní audit 23. 9. 2026:** proti přesnému SHA `b52745fe6c84a58b3187bc0f5fdd39593c9df59f` a výhradně TEST `cgshssdjgzzuprlwnabl` proběhla čtecí inventura 20 tabulek, 24 RPC vystavených typovým API, 48 migračních souborů a čtyř RaK Edge Functions. Actions run #202 na témže SHA doložil 18 anonymních/neplatných-JWT HTTP sond bez zápisu; navíc ruční sondy odmítly anonymní i záměrně neplatný JWT na `rak-admin-users` a `rak-absence-calendar` HTTP 401. Navazující živý katalogový audit na development HEAD `a9486dc5f38e06a2957d8a6d09c14b17eb346655` ověřil přímo v TEST `pg_catalog`, `pg_policies` a tabulková GRANT oprávnění: všech 20 veřejných tabulek má RLS zapnuté; `anon` ani `authenticated` nemají na veřejných tabulkách přímý `INSERT`/`UPDATE`/`DELETE`; anonymní RPC allowlist tvoří přesně šest funkcí. Pět z nich je záměrně veřejných `SECURITY DEFINER` endpointů (`rak_admin_account_requires_auth`, `rak_app_keepalive`, login V1/V2 a `rak_submit_bug_report_v2`), šestá `rak_admin_auth_capabilities` není SECURITY DEFINER. Drift testu byl opraven přidáním záměrně veřejného, rate-limitovaného `rak_lookup_account_for_login_v2`; opravená rollback-only matice byla před commitem spuštěna přímo proti TEST a prošla: anonymní i unsigned-authenticated kontext neviděl maskovaná admin nastavení, ověřená owner session se syntetickými request claims je viděla a transakce byla vrácena. Supabase security advisor tyto veřejné SECURITY DEFINER funkce správně hlásí jako body k vědomému posouzení; současný provozní model je používá jako omezené veřejné API a bez důkazu se jejich EXECUTE grant neruší. Skutečně podepsaná end-to-end role matrix owner/admin/deputy/cizí/odvolaná relace stále chybí, proto P0.1, P0.3, P0.4, P1.1 a P1.2 zůstávají procentně beze změny. Žádný platný JWT, service-role klíč ani osobní obsah nebyl zapsán do logu nebo repozitáře.

**Doplnění bezpečnostního balíku 23. 9. 2026:** živé regresní matice odhalily skutečnou defense-in-depth mezeru: RLS už skryla vnořené `loginNumber`, ale zápisový guard veřejných `machine_settings` tento klíč ještě neodmítal. Kandidát byl nejprve ověřen v transakci s `ROLLBACK` a poté nasazen pouze do TEST migrací `20260923045532_rak_block_login_number_in_public_machine_settings`. Po změně je všech osm testovaných rekurzivních identit (`appAccounts`, `applicationAccounts`, `workers`, `loginNumber`, `accountNumber`, `roster`, `employees`, `staff`) odmítnuto už při zápisu do veřejné kategorie; soukromý `WORKER_ROSTER_SETTINGS` zůstává oddělený. Současně byly matice opraveny tak, aby neobcházely přísnější serverovou ochranu, veřejný RPC allowlist počítal šest záměrných funkcí a test už neobsahoval natvrdo konkrétní owner OS číslo. `security-recursive-worker-matrix.sql`, `security-public-data-matrix.sql`, `security-public-surface-matrix.sql` a upravená privacy matice prošly proti TEST; všechny testovací zápisy byly rollback-only. Procenta zůstávají beze změny, protože stále chybí skutečně podepsaná end-to-end role matrix.

**Podepsaná TEST role matrix 23. 9. 2026:** na přesném development SHA `72d1fd7870a917728967a1f1487c757e2b6684bc` vznikly pouze po dobu testu náhodné Auth účty owner/admin/deputy/cizí účet a skutečné Supabase relace. Dvacet kontrol potvrdilo role v `rak_admin_context`, odmítnutí anonymního a cizího účtu, owner-only seznam profilů a kompletní owner zálohu, povolení `rak-admin-users` jen owner/admin a odmítnutí deputy/cizího účtu. Owner odvolal dočasné deputy zařízení; původní podepsaný token i jeho opětovná registrace byly odmítnuty. Doplňková zkouška po explicitním ověření existence session potvrdila, že nové přihlášení stejným stále platným heslem vytvoří novou povolenou relaci, zatímco starý token zůstane blokovaný. První rychlý doplňkový pokus narazil před viditelností session na HTTP 401, bezpečně uklidil oba účty a nebyl vydán za úspěch; jediný řízený opakovaný pokus prošel. Po každé zkoušce se Auth uživatelé i admin profily vrátili z 3 na 3. Klíče, hesla, JWT ani osobní odpovědi nebyly logovány. Běžný zaměstnanec zůstává OS-only bez Auth tokenu, takže pro privilegované RPC odpovídá již ověřenému anonymnímu kontextu. Tím se P0.1 a P0.3 zvyšují na 60 % a P0.4, P1.1 a P1.2 na 80 %; fyzický Safari/PWA test zůstává otevřený.

### P1.3 – Reprodukovatelný build, testy a jednotná verze · **100 % (6/6)**

**Systémový problém:** řetězec `tools/development-version-17048.mjs` přepisuje soubory po verzích; historické VM testy vyřezávají úseky podle textových komentářů. Nová funkce mezi značkami už opakovaně rozbila staré testy. Úspěšný build 1.7.69 neznamená vyřešenou architekturu.

- [x] Základní úplné CI: dvě sestavení, `npm run check`, kritické a historické testy, CRC, Chromium/offline, TEST HTTP a opakované benchmarky; úspěšný referenční běh pro commit `1693c863`.
- [x] Přidána dočasná pojistka proti růstu verzovaných přepisovacích skriptů nad 1.7.69 a preflight kontrola politiky sestavení.
- [x] **S2 – jeden neměnný zdrojový strom:** převést transformovaný stav do normálních zdrojových modulů; build píše pouze do odděleného výstupu a nemění zdrojové soubory ani Git pracovní strom. Neztratit verzi 1.7.69 jako referenci.
- [x] **S3 – stabilní testy:** křehké soukromé VM a výřezy mezi komentáři v gate testech 1.7.57–1.7.69 byly nahrazeny sdílenou runtime fixture, pojmenovanými deklaracemi, syntakticky vymezenými podmínkami a skutečnými browser testy; bezpečnostní a provozní scénáře zůstaly zachovány.
- [x] Jediný zdroj metadat verze/build ID; HTML, aplikace, SW, build manifest, cache, technická/modulová verze a `package.json` čtou společný metadatový modul. Od 1.7.85 jsou aktuální čísla verze sjednocená; dva čisté buildy stejného SHA porovnává kanonický build a CI dovoluje jen výslovně deklarovaný proměnný ZIP.
- [x] Prokázána regresní parita před/po migraci pro data, rotaci, exporty, offline, oprávnění, rollback a rychlost. Strojově čitelný manifest mapuje referenční 1.7.69 na současné důkazy a CI kontroluje jejich skutečné zapojení po dvou čistých kanonických buildech bez dalšího verzovaného přepisovacího skriptu.

**Dokončení:** další funkční úpravy už nevyžadují nový `development-version-17xxx.mjs` ani přepis historických gate testů při každé verzi. Do migrace nový řetězec neprodlužovat a nezkracovat testy kvůli zelenému CI.

### P1.4 – Ověření před nasazením, deployment a rollback · **100 % (6/6)**

- [x] Je doložen proces kontroly přesného Git SHA, Actions SUCCESS, Vercel READY a HTTP/testovací konfigurace na referenčním release 1.7.69.
- [x] Existuje nedestruktivní rollback preflight a kontrola politiky přeskočení nerelease/test-only změn.
- [x] **S4 – brána před releasem:** automatické Vercel Git deploymenty pro `development` jsou v `vercel.json` vypnuté a CI změnu hlídá samostatným kontraktem. SHA `50795a7cd13c0733523b0cb5decabeed00b838bf` nevytvořil před CI žádný deployment; teprve po Actions runu `35606650384` SUCCESS byl přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, READY se stejným SHA, platným development aliasem a HTTP 200. `main` zůstal beze změny.
- [x] Fail-closed pravidla dovolují přeskočit Vercel build pouze přesně vyjmenovaným dokumentačním souborům; změna workflow, spustitelného testu, nástroje, konfigurace, runtime nebo neznámé cesty vždy vyžádá build.
- [x] Bezpečně proveden skutečný PREVIEW rollback přes izolovaný dočasný alias: před, během i po návratu aplikace odpověděla HTTP 200; rollback mířil na READY deployment SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c`, návrat na READY SHA `7698b442e8826cff94127611db62e459f70199fc`; dočasný alias byl odstraněn a development/main/produkční aliasy zůstaly beze změny.
- [x] Automatický fail-closed řetězec je doložen na konkrétním release SHA `630c1d0e3a85d16498af4e4e622198cdb55066f0`: Actions [run #201](https://github.com/martinspadrna/RaK/actions/runs/35809836817) SUCCESS spojil povinné kontroly a dva čisté kanonické buildy s preview `dpl_E6wuKEDamizLudSyqoT1VRn6u6Jo`, READY na témže SHA. Neměnný deployment i stabilní development alias prošly HTTP kontrolou HTML, `sw.js`, release metadat `1.7.77`/`1.7.0`/`v1.7.77-pwa-durable-rotation1` a TEST Supabase `cgshssdjgzzuprlwnabl`; produkční ID `bkqamcbkiwumsvelahxr` ve výstupu chybí. Artefakt `rak-release-evidence-630c1d0e3a85d16498af4e4e622198cdb55066f0` je uchován 90 dní. Konkrétní nedestruktivní rollback cíl je READY `dpl_C8CgASwYwFpBLyLcNkdQwfa5v6TW` na SHA `23b14e6b70460819df2508f1710cf697dd907046`; postup ověří cíl, přepne pouze stabilní development alias a znovu zkontroluje HTML, SW, metadata a TEST izolaci. `main` ani produkční deployment se nezměnily.

**Dokončení:** vadný commit se nesmí automaticky nasadit před úspěšným CI; rollback je prakticky vyzkoušen, ne jen popsán.


**Produkční důkaz 1.7.83 – 24. 9. 2026:** main SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d` prošel [Actions #261](https://github.com/martinspadrna/RaK/actions/runs/35957793587) včetně dvou čistých kanonických buildů, `npm run check`, ZIP/CRC, Chromium offline/online, tří měřených startů a 18 živých TEST HTTP sond. Ruční [produkční release #1](https://github.com/martinspadrna/RaK/actions/runs/35958452867) vytvořil až poté jediný kandidát `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, ověřil READY, přesné SHA, produkční metadata a konfiguraci bez TEST ID a následně přesunul pouze produkční alias. Artefakt `rak-production-release-evidence-de443b771bb7e7dd5fefa498883fdd220a78f07d` (ID `10791158417`, SHA-256 `15311dc153d8c3d01ae7b68cec76269ca0971e4ff345f79f8d349aac0dfbc6f6`) je uložen 90 dní. Nedestruktivní rollback cíl je READY `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`; fáze A záměrně zachovává jeho legacy čtení. Stabilní development alias zůstal na `dpl_5h3ivfYu3U8C9iHEYxLPyavacL5i` / SHA `7d6684d8027d0a08b8d8596d35fe73f3b0d1fbec`.

### P1.5 – Úplné zálohy a ověřitelná obnova · **43 % (3/7)**

- [x] Záloha zdrojů a owner ZIP mají inventář, manifest a CRC; zahrnuta kontrola zdrojových Git blobů.
- [x] Zpracován inventář databázového schématu, Auth, Storage a rozdělení TEST/produkce.
- [x] Ověřen nedestruktivní shadow/rollback-only pokus a kontrakt; **není to nezávislá plná obnova**.
- [ ] Bezpečně obnovit všechna potřebná TEST data a schéma do odděleného projektu po výslovném schválení případných nákladů; žádné mazání originálu.
- [ ] Ověřit obnovu Auth, Storage, rolí/RLS, pořadí migrací a relevantních revizí dat; zdokumentovat omezení zálohování přihlašovacích údajů.
- [ ] Fyzicky stáhnout a soukromě otevřít ZIP na iPhonu a ověřit integritu.
- [ ] Provedený restore porovnat kontrolními počty, hashi a funkčními testy; mít zkušební návrat a postup při selhání.


**Čtecí kontrola záloh TEST 23. 9. 2026:** `supabase backups list --project-ref cgshssdjgzzuprlwnabl` vrátil `backups=[]`, `pitr_enabled=false`, `walg_enabled=true`, region `eu-central-1`. Zapnutá interní WAL-G schopnost bez uvedené obnovitelné zálohy ani PITR není důkaz obnovy. Nebyl vytvořen nový projekt, nic nebylo obnoveno ani smazáno; P1.5 proto zůstává 43 %.

**Připravenost oddělené obnovy 23. 9. 2026:** čtecí příkaz `supabase branches list --project-ref cgshssdjgzzuprlwnabl` vrátil `null`, tedy TEST nemá žádnou preview větev. Preview větev není náhradou plné obnovy: podle [Supabase Branching](https://supabase.com/docs/guides/deployment/branching) je ve výchozím stavu bez produkčních dat a bez Storage objektů a její provoz může být zpoplatněn. [Databázové zálohy](https://supabase.com/docs/guides/platform/backups) neobsahují samotné Storage objekty ani obnovitelné přihlašovací údaje vlastních rolí. [Obnova do nového projektu](https://supabase.com/docs/guides/platform/clone-project) je beta a vyžaduje samostatně obnovit Storage objekty, Edge Functions, Auth nastavení/API klíče, Realtime a další konfiguraci. Proto je předem připravená schvalovací brána: po výslovném souhlasu vytvořit nový oddělený recovery projekt, zachovat originální TEST beze změny, obnovit a porovnat DB/Auth/Storage/role; větev lze použít nanejvýš k doplňkovému testu schématu. Bez skutečného výsledku se checkboxy ani 43 % nemění.

**Rozhodnutí o nákladech 23. 9. 2026:** vlastník povolil pouze bezplatnou variantu. Dva vlastní aktivní Free projekty už obsazují oba bezplatné sloty; další dva viditelné projekty patří jinému účtu a nejsou recovery cílem RaK. Žádný nový projekt, placená větev, PITR ani add-on proto nevznikl a žádný existující projekt nebude kvůli testu pozastaven. P1.5 zůstává 43 %.

**Nový provozní nález k úplné záloze:** vlastník na produkční aplikaci obdržel chybu `canceling statement due to statement timeout`. Dokud nebude proti TEST bezpečně reprodukováno, zda timeout vzniká v owner RPC, sestavení archivu nebo přenosu, nesmí být záloha vydána za funkční. Oprava má upřednostnit stránkování/dávkování nebo bezpečné rozdělení exportu, zachovat owner-only kontrolu a datový allowlist a nesmí slepě vypnout časové limity. Následně je nutný test integrity ZIPu a soukromé stažení/otevření na iPhonu; procento P1.5 se zatím nemění.

**Dokončení:** lze doložit, že jsme obnovili použitelnou oddělenou instanci, ne pouze vygenerovali ZIP nebo spustili transakci ROLLBACK.

## P2 · Mobil, offline a provozní kvalita

### P2.1 – Výkon a start PWA · **20 % (1/5)**

- [x] Automatizovaný Chromium start a tři nezávislá měření v CI.
- [ ] Opakovaně změřit skutečný iPhone Safari/PWA na studeném a teplém startu.
- [ ] Stanovit a vynucovat smysluplné časové/velikostní rozpočty se záznamem baseline a odchylek.
- [ ] Změřit offline start, návrat online, aktualizaci SW a chování při pomalé síti.
- [ ] Po stabilizaci architektury potvrdit, že výkon a první vykreslení po migraci nemají regresi vůči 1.7.69.

**Důkaz 1.7.84 bez změny procenta:** start nyní umí ještě před Supabase obnovit nejnovější ověřenou lokální Rotaci, vykreslit Dashboard a zaznamenat `firstUsableRenderMs` / zdroj prvního použitelného renderu. Actions #274 prošel reálným Chromium restartem online/offline i třemi benchmarky. Otevřené podmínky ale vyžadují opakované měření skutečného iPhonu, rozpočty/prahy a širší scénáře pomalé sítě/SW, proto P2.1 poctivě zůstává **20 % (1/5)**.

**Dokončení:** opakovatelné měření a nepřekročené prahy na reálném telefonu i CI.

### P2.2 – Rozložení, CSS, DOM a interakce · **40 % (2/5)**

- [x] Chromium ověřuje Home, navigaci, mobilní viewport a offline návrat.
- [x] Existují regresní kontroly geometrie TO/MO, absence a přetečení pro emulované rozměry.
- [ ] Reálné iPhone screenshoty světlého/tmavého režimu, safe-area, klávesnice, spodní navigace, editace tabulek a exportu.
- [ ] Proklik rolí owner/admin/deputy/běžný uživatel; ověřit DOM události a skutečné interakce, ne jen přítomnost textu v HTML.
- [ ] Porovnat před/po migraci kritické obrazovky a přidat stabilní regresní testy bez křehkých textových výřezů.

**Dokončení:** žádné kritické překryvy, uříznutá tlačítka či nefunkční akce na fyzickém iPhonu.

### P2.3 – Offline, lokální fronta, aktualizace a konflikty · **63 % (5/8)**

**Fyzický iPhone acceptance 23. 9. 2026 – PASS:** RaK 1.7.82 na stabilním development aliasu úspěšně zvládl celý cílový scénář bez mazání dat: online přihlášení a Supabase fungují, aktuální Rotace je po úplném zavření dostupná v režimu Letadlo, Dashboard správně zobrazí „kam jdu“, Rotace se vykreslí bez ručního otevření seznamu offline rozpisů a po opětovném zapnutí internetu se stejný běh aplikace srovná bez restartu. Falešný konflikt se nevrátil. Skutečná příčina byla kombinace více vrstev: Vercel preview ochrana blokovala development assety, Supabase SDK nebylo původně spolehlivou offline součástí, nesouvisející cache zápisy mohly zkreslit čerstvost Rotace a cold start nečekal na skutečné propsání persisted snapshotu do runtime/UI. Release 1.7.82 uzavírá tuto mobilní offline/reconnect část; zbývající položky P2.3 se týkají explicitního konfliktního workflow a serverového CAS, ne této fyzicky reprodukované chyby.

- [x] Pravdivé online/cache stavy, retry a ochrana historických/neznámých úloh v místní frontě před tichou ztrátou.
- [x] Ochrana editovaných návrhů před opožděnou síťovou odpovědí a jednotkové testy selektivního lokálního mazání.
- [x] **S5 – zjistit skutečnou příčinu iPhonu:** dokončeno přes sanitizovanou diagnostiku a fyzický test; potvrzena kombinace asset protection/offline dependency/freshness/runtime rehydrate, bez zveřejnění osobních údajů.
- [ ] Před případným vyřazením **jediné konkrétní** konfliktní položky poskytnout privátní export původních bajtů, read-only kontrolu serveru, jasný důsledek a potvrzení; zachovat ostatní frontu a data.
- [ ] Zpracovat konflikty podle typu (rozpis / stroj / ostatní), bez automatického přepisu novějších online dat a bez falešného zeleného stavu.
- [ ] Zavést a otestovat serverově atomický CAS / revizi pro relevantní zápisy, včetně konkurence dvou zařízení; samotná shoda čísla revize bez obsahu nedovoluje přepsání.
- [x] Ověřit staré PWA/service worker, aktualizace a offline→online bez reprodukce starého konfliktu či ztráty dat; fyzický iPhone PASS na 1.7.82.
- [x] Na fyzickém iPhonu potvrdit: offline Rotace i Dashboard jsou aktuální, návrat online funguje bez restartu a falešný konflikt se nevrací; PASS 23. 9. 2026 na 1.7.82.

**Důkaz balíku 1.7.71:** regresní brána `release-gate-17071.test.mjs` rozlišuje shodný a skutečně odlišný profil, zachovává pravé administrátorské konflikty a bezpečně uklízí pouze historický automatický `local-seed`. Skutečný mobilní Chromium test ukládá značkovací Rotaci, restartuje aplikaci offline, načte Rotaci i sync moduly z cache a po návratu online požaduje nulový počet konfliktů. Fyzický test iPhonu na 1.7.77 neprošel ani přes stabilní sdílený development odkaz; nejde tedy o potvrzenou opravu a procento se nezvyšuje.

**Stav po fyzickém PASS:** mobilní offline/reconnect závada je odstraněna bez plošného mazání Safari/PWA a bez neověřených serverových zápisů. P2.3 zůstává otevřený kvůli zbývajícím třem položkám: bezpečné vyřazení konkrétní konfliktové položky, typové zpracování konfliktů a serverově atomický CAS/revize.

**Důkaz 1.7.84 bez změny procenta:** vzhled účtu už nepoužívá starý tunel přes `game_stats`; TEST má samostatné account-scoped úložiště s revizí a compare-and-swap RPC. Rollback-only SQL prokázal odmítnutí stale zápisu, následný zápis na správné revizi i readback; fronta vzhledu při novější serverové revizi nevytváří globální konflikt. Jde ale jen o vzhled účtu, nikoli o obecný CAS všech relevantních zápisů, a fyzický scénář dvou zařízení ještě čeká. Široká akceptační položka CAS proto zůstává nezaškrtnutá a P2.3 zůstává **63 % (5/8)**.

### P2.4 – Diagnostika, soukromí telemetrie a nepřetržitá kvalita · **33 % (2/6)**

- [x] Existuje čtecí diagnostika Auth, typů/počtů fronty a základní kategorizace chyb bez potřeby vystavovat syrové payloady.
- [x] Chromium/offline kontroly a měření výkonu dávají opakovatelné základní provozní signály.
- [ ] Zviditelnit konkrétní sanitizovanou příčinu konfliktní hlášky na problematickém iPhonu; rozlišit stav aplikace, fronty a chybu úložiště.
- [ ] Auditovat, že logy, reporty, telemetrie, screenshoty a exporty neobsahují tokeny, OS čísla, jména nebo obsah rozpisů mimo určený soukromý kontext.
- [ ] Zajistit verifikaci skutečných rolových JWT a konkrétní diagnostiku odmítnutých operací bez prozrazení přihlašovacích údajů.
- [ ] Zavést měřitelné výkonnostní/konfliktní prahy, periodické regresní testy a jednoznačné výsledky PASS/FAIL; pouhé upozornění nesmí být hlášeno jako úspěch.

**Dokončení:** příčinu provozní chyby lze najít bez prohlížení nebo mazání cizích dat; testy skutečně blokují nebezpečný release.

---

## Funkční backlog přijatý 24. 9. 2026 – seskupení do stávajících bodů

Následující požadavky jsou otevřený realizační backlog uvnitř stávajících 13 oblastí. Nejsou novými čtrnáctými a dalšími body a samy o sobě nemění bezpečnostní akceptační zlomky ani procenta, dokud není tematický balík implementován, vydán a doložen příslušnými testy. Každý funkční release zvyšuje viditelnou verzi právě jednou; další práce probíhá nejprve na TEST a produkce se bez nového souhlasu nemění.

### A. Lokální start a dostupnost aplikace · P2.1 / P2.3

**Stav v aktuálním 1.7.88 (základ implementován v 1.7.84):** runtime část je implementovaná a vydaná do TEST preview: ověřená lokální Rotace se načítá před vzdáleným syncem, Dashboard může vykreslit směnu okamžitě a měří se první použitelný render. Automatické Chromium důkazy jsou PASS. Zbývá cílený fyzický iPhone test studeného, teplého a offline startu; do něj se P2.1 procento nemění.


- Dashboard má hned po startu zobrazit „kam jdu dnes / příští směnu“ z ověřené lokální Rotace a po dokončení online synchronizace údaj bezpečně aktualizovat.
- Navigace a běžné lokální funkce nesmějí být několik sekund zablokované jen proto, že se čeká na stav online; oprava nesmí znovu zavést falešný konflikt ani ztrátu fronty.
- Přidat měření prvního použitelného vykreslení a cílený fyzický iPhone test studeného, teplého a offline startu.

### B. Kalendáře podle směny · P2.2 / P0.3

**Stav 1.7.90:** implementováno a vydáno do TEST. Screenshoty z fyzického iPhone testu 1.7.89 potvrdily opravu mapování účtu na směnu A, plnou výšku modalu i centrované ×, ale Google iframe na iOS/PWA vyžadoval third-party cookies/přihlášení. 1.7.90 proto iframe kořenově odstraňuje: z uloženého Google calendar ID načte pouze veřejné `public/basic.ics` přes bounded same-origin endpoint a vykreslí vlastní měsíční kalendář, navigaci měsíců, dnešek, výběr dne a agendu; parser pokrývá běžné RRULE, EXDATE a RECURRENCE-ID. Bezpečnostní smoke hlídá, že endpoint není obecná proxy a neumí private ICS. Živá kontrola po deploymentu prokázala HTTP 200 a VCALENDAR na kontrolním veřejném kalendáři i směně D. A/B/C vracejí upstream nedostupnost, což izoluje zbývající problém na jejich Google public-ICS konfiguraci, nikoli RaK endpoint. Fyzický iPhone retest nativního UI čeká po zpřístupnění testovaného směnového kalendáře. Procenta P2.2/P0.3 se zatím nemění, protože jejich otevřené checkboxy jsou širší než tento funkční balík.

- V Administraci → Informace pro zaměstnance vytvořit samostatné nastavení kalendářů, nikoli položku schovanou mezi obecnými odkazy.
- U každé směny umožnit přiřadit jeden nebo více Google kalendářů. Dashboard po klepnutí na kalendář otevře jen kalendář či výběr kalendářů určený pro směnu přihlášeného člověka.
- Pracovníci vedení v rozpisu dědí směnu z rozpisu; účty mimo rozpis dostanou explicitně nastavitelnou směnu. Výchozí provozní pravidlo pro skupinu pracovníků se musí nastavit v administraci, ne natvrdo podle osobních identifikátorů.
- Odkazy musí mít validační allowlist a nesmějí se objevit v soukromých logách, exportech nebo cache mimo určený veřejný konfigurační rozsah.

### C. Rotace, rozpisy a absence · P2.2 / P2.3

- Odstranit nápovědu „3× klepni na kartu člověka…“.
- Z Administrace → Rozpisy odstranit UI „Místní neuložené návrhy rozpisů“, bez plošného mazání existujících dat nebo fronty.
- Přehled jmen a skupin strojů ponechat ve výchozím stavu rozbalený a zúžit sloupce pro mobil; v tomto přehledu používat kompaktní popisky `tnkso1 → tnk`, `tpkw01 → w01`, `tpkw02 → w02`, aniž se změní uložené klíče strojů.
- Kliknutí na obsazené jméno má nabídnout stabilní a zřetelnou akci odebrání. Kliknutí na prázdné místo má nabídnout jen osoby, které daný den nejsou ani v rozpisu, ani v absenci; nabídka nesmí odskakovat mimo cílovou buňku.
- U absence má datum přednostně nabízet dny s chybějícím člověkem bez záznamu absence a jméno osoby chybějící ve zvoleném dni. Datum i jméno musí zůstat ručně editovatelné a serverová validace musí odmítnout nekonzistentní zápis.

### D. Účty, pracovníci, správci a relace · P0.1 / P0.4 / P1.2 / P2.2

**Stav v aktuálním 1.7.89 (základ implementován v 1.7.84):** první tři provozní rizika tohoto bloku mají nový systémový základ: při přepnutí účtu se nejdřív odstraní stará runtime identita bez plošného mazání storage, vzhled je account-scoped a synchronizovaný přes serverovou revizi/CAS a syntetická regrese dokazuje, že změna směny/rosteru nemění owner/Auth identitu. Od 1.7.89 profil navíc nese explicitní směnu A/B/C/D získanou single-account login cestou, takže běžný klient nemusí číst privátní roster; starý profil bez směny se online doplní bez mazání dat. Fyzický A→B test, skutečný dvouzařízení sync/offline konflikt a obecné úpravy UI Pracovníci/Správci zůstávají otevřené.


- Po odhlášení a přihlášení jiného účtu nesmí Nastavení ani první vykreslení krátce ukazovat jméno předchozího účtu; cache a stav účtu musí být jmenně oddělené a vyčištěné bez mazání nesouvisejících dat.
- Vzhled z Více → Nastavení → Vzhled aplikace ukládat online ke konkrétnímu přihlášenému účtu a synchronizovat mezi jeho zařízeními. Lokální cache zůstane pouze pro okamžitý a offline start; po připojení se porovná serverová revize/čas změny s lokální revizí, novější serverová změna z jiného zařízení se použije a zapíše do lokální cache, zatímco novější lokální změna se bezpečně odešle jen pod stejným účtem. Stav musí být jmenně oddělený, nesmí přenést vzhled předchozího účtu ani udělovat oprávnění; konflikt se řeší deterministickou revizí/CAS a musí mít test dvou zařízení, offline změny a přepnutí účtu.
- V Administraci → Pracovníci odstranit blok „Stav pracovníků“, zúžit sloupec jméno/číslo přibližně o 30 % a u účtů mimo rozpis zobrazovat jen existující řádky plus vždy jeden prázdný řádek; po jeho vyplnění se automaticky připraví další jediný prázdný řádek.
- Needitovatelný seznam účtů pod formulářem zkompaktnit: sloupec jména přibližně o 40 % a osobního čísla přibližně o 80 %, s ověřením čitelnosti na mobilu.
- V Administraci → Správci použít stejný vzor „existující + právě jeden prázdný řádek“ a celou stránku vizuálně sjednotit.
- Regresně ověřit, že přesun vlastního účtu mimo rozpis nijak nemění jeho Supabase Auth identitu, owner profil ani owner oprávnění. Konkrétní osobní číslo se do veřejných testů ani logů nezapisuje.

### E. Přehlednost administrace a kalkulaček · P2.2

- Pravidla generátoru, Nastavení strojů, Kantýnu/Jídelnu a Správce sjednotit do přehledných mobilních karet se stejnou hierarchií ovládacích prvků.
- „Upozornění v kalendáři“ přesunout z Nastavení strojů ke kalendářům a odstranit funkci „pondělí – brus(y) – spálení“ včetně nepoužívané konfigurace a regresí, teprve po ověření, že ji nic dalšího nečte.
- V Kalkulačkách → Korekce brusů přidat přepínač `+` / `−` stejně jako u frézek a soustruhů; stejný vzor použít v administraci korekcí pro frézky i brusy a otestovat znaménko, desetinné vstupy a klávesnici iPhonu.

### F. Hlášení chyb se screenshotem · P2.4 / P0.3

- „Pošli mi chybu“ může volitelně připojit jeden obrázek; bez obrázku musí fungovat stejně jako dnes.
- Před implementací stanovit podporované typy, maximální rozměry/velikost, zmenšení na klientu, owner/admin přístup, retenční a mazací pravidla a oddělené soukromé Storage umístění. Obrázek, token ani osobní obsah se nesmí objevit v CI/logu nebo veřejném exportu.
- Negativní testy musí odmítnout anonymní čtení, neplatný JWT, nepovolený typ a nadlimitní soubor; žádný produkční bucket ani migraci nevytvářet bez samostatného schválení.

### G. Obsah a drobné mobilní UX · P2.2

- Z „O aplikaci“ odstranit úvodní větu „RaK spojuje…“ a historii verzí, hlavně řadu 1.7, výrazně zkompaktnit bez tvrzení nedoložených výsledků.
- Opravit skloňování odpočtu na „do Vánoc“.
- Vynucený portrétní režim má při otočení telefonu zobrazit animovaného raka z přihlašovací obrazovky místo současné statické výzvy; respektovat omezení pohybu a nezvětšit kritický start.
- V Reportu směny opravit pravý okraj rámečku pole data, který zasahuje do nastavení směny, a přidat vizuální regresi pro mobilní šířku.

### H. Úplná záloha RaK · P1.5 / P0.3

- Reprodukovat timeout úplné owner zálohy bezpečně proti TEST, změřit, která část dotazu/exportu limit překračuje, a opravit skutečnou příčinu dávkováním nebo optimalizací.
- Zachovat owner-only autorizaci, současný privacy allowlist, kontrolu manifestu/CRC a fail-closed chování; timeout nesmí vést k neúplnému ZIPu vydávanému za úspěch.
- Po opravě ověřit malý i plný dataset, stažení/otevření na iPhonu a nedestruktivní rollback; placený recovery projekt zůstává mimo rozsah bez nového souhlasu.

## Pořadí práce – žádné další vrstvení záplat

1. **P1.4 dokončeno:** automatický důkazní řetězec releasu je povinnou fail-closed bránou každého dalšího funkčního releasu.
2. **P0.1/P0.3/P0.4/P1.1/P1.2:** společný bezpečnostní balík v TEST: inventář privilegovaných RPC, `SECURITY DEFINER`, `GRANT`, RLS a veřejných zápisových cest; negativní anonymní/neplatné JWT, rozsah osobních údajů, staré klienty/exporty/cache a skutečná role matrix owner/admin/deputy/běžný uživatel/cizí účet/odvolaná relace. Podepsané JWT nikdy nelogovat.
3. **P1.5:** pokračovat přípravou obnovy a kontrolami záloh; placený nebo nový oddělený projekt až po předchozím souhlasu vlastníka.
4. **P2.3 znovu aktivováno pokynem vlastníka 23. 9. 2026:** opravit persistence/arbitráž jako jednu klientskou vrstvu, nemazat frontu ani uživatelská data a nevydávat stav za opravený bez fyzického iPhone testu.
5. **P2.1/P2.2/P2.4:** měřené Safari, vizuální a provozní regrese a bezpečná diagnostika po prioritním bezpečnostním balíku.
6. **Nejdřív produkční přejímka fáze A:** fyzický iPhone online login běžného účtu, owner/admin login a zařízení, Rotace, Dashboard, „O aplikaci“ a restart PWA bez mazání dat. Fázi B neprovádět bez dalšího souhlasu.
7. **První nový TEST balík – základ implementován v 1.7.84 a nesen aktuálním 1.7.90, fyzická přejímka čeká:** local-first Dashboard/start, oddělení stavu účtů, account-scoped sync vzhledu s revizí/CAS a syntetický owner invariant jsou automaticky regresně ověřené. Před uzavřením potvrdit iPhone A→B / offline / dva přístroje / owner checklist; Chromium za něj nepovažovat.
8. **Druhý TEST balík – implementován v 1.7.86, public-ICS opraven v 1.7.87, admin interakce/UI v 1.7.88, mapování účtu + modal v 1.7.89 a nativní cookie-independent kalendář v 1.7.90, čeká fyzická přejímka:** preview `dpl_CVHENG3ePY24ZdbS8Z2remGgbp1z`, Actions #291 PASS. Screenshoty už potvrzují směnu A, výšku modalu a centrované ×. Před uzavřením zpřístupnit testovaný A/B/C Google kalendář přes skutečný public ICS a na iPhonu potvrdit nativní mřížku, navigaci měsíců, dnešek, výběr dne/událostí a že administrátorské Přidat/Uložit neopouští editor.
9. **Třetí TEST balík:** Rozpisy/absence, Pracovníci/Správci a sjednocení administrace; změny dodat společně s reálným mobilním browser testem.
10. **Čtvrtý TEST balík:** kalkulačky, „O aplikaci“, Vánoce, landscape overlay a Report směny.
11. **Samostatné bezpečnostní balíky:** volitelný screenshot u chyb a timeout úplné zálohy; oba vyžadují privacy, oprávnění a rollback důkaz před releasem.

**Pravidlo dodávky:** tematické balíky a minimum commitů/deploymentů. Před releasem syntax + relevantní unit/integrace + dvě čisté sestavy + legacy/security/offline/browser testy + ZIP/CRC + TEST HTTP; po releasu přesný SHA, Actions SUCCESS, Vercel READY se stejným SHA, HTTP a zaměřený iPhone checklist. Nikdy nezaměňovat „test prošel v Chromiu“ s „ověřeno na iPhonu“. Produkční `main` ani produkční Supabase neupravovat bez výslovného souhlasu. Žádná destruktivní akce bez předchozí zálohy, ověřeného cíle a vědomého potvrzení.

## Záznam aktualizací

- **24. 9. 2026 – release 1.7.92 doplňuje v detailu kalendáře čas od–do:** po kliknutí na datum se u časované události zobrazuje celý interval z `DTSTART`/`DTEND`, např. `06:00–18:00`, `18:00–06:00` nebo `22:00–06:00`; měsíční mřížka zůstává krátká a celodenní události zůstávají `celý den`. Funkční SHA `8b76c5efab1fdca3d3f907845d63f5b19e9b9a4d` prošel [Actions #295](https://github.com/martinspadrna/RaK/actions/runs/36036804085) SUCCESS včetně release gate 1.7.92, dvou kanonických buildů, celého `npm run check`, Chromium offline/online testu, benchmarků a TEST HTTP. Vercel `dpl_Cfmv48V3bSgdPSFXMQo88BrvSrcQ` je READY na přesném SHA a stabilní development alias na něj ukazuje; rollback je 1.7.91 `dpl_8nw6WHHdocmYY78weqf2iD4oSviV`. Release evidence má ID `10825007749` a SHA-256 `accfe4e7d91a05a16898ee93401576feb6496166aac6982ead490c89ff60bebf`. Procenta 13 oblastí se nemění; `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.91 opravuje anonymní názvy směn ve veřejném kalendáři:** Google public ICS může místo názvu směny vracet `Busy` / `Zaneprázdněn`. RaK takovou událost nově označí podle začátku 06:00 jako `Ranní` a 18:00 nebo 22:00 jako `Noční`; jiné názvy se zachovají, takže směna D dál používá vlastní `Ranní 12h`, `Noční 12h`, `Ranní 8h` atd. Funkční SHA `01575bc779924e74aa141c46394d08dc88f3df37` prošel [Actions #293](https://github.com/martinspadrna/RaK/actions/runs/36035802452) SUCCESS včetně dvou kanonických buildů, celého `npm run check`, release gate 1.7.91, rollback/ZIP kontrol, reálného Chromium online→offline→online testu, tří PWA benchmarků a TEST HTTP. Vercel `dpl_8nw6WHHdocmYY78weqf2iD4oSviV` je READY na přesném SHA a stabilní development alias na něj ukazuje; rollback je předchozí READY 1.7.90 `dpl_CVHENG3ePY24ZdbS8Z2remGgbp1z`. Release evidence `rak-release-evidence-01575bc779924e74aa141c46394d08dc88f3df37` má ID `10825261349` a SHA-256 `8077b1827212076c1b3517e9b69288ab120eacebe00ecb195f99973eacb1720e`. Vlastník už před releasem potvrdil, že po nastavení kalendáře jako veřejného se směna A v nativním kalendáři načítá; zbývá fyzicky ověřit nový text `Ranní/Noční`. Procenta 13 oblastí se nemění. `main`, produkční Vercel a produkční Supabase zůstaly beze změny.
- **24. 9. 2026 – TEST release 1.7.90: nativní směnový kalendář bez Google iframe/cookies:** fyzické screenshoty 1.7.89 potvrdily správnou směnu A, velikost modalu a centrované ×, ale Google iframe na iOS/PWA zobrazil požadavek na přihlášení/povolení nezbytných cookies. Release 1.7.90 proto iframe odstranila a přidala vlastní měsíční vykreslení z veřejného ICS přes nový `/api/public-calendar`. Endpoint je omezený jen na Google calendar ID a konstrukci `calendar.google.com/.../public/basic.ics`, nepřijímá libovolnou URL ani private tokeny, je read-only a má limit 2 MB + timeout. Původní SHA `c6776114...` a security-review `99cd8418...` spadly v novém release gate kvůli chybě validátoru ID a cross-realm testu; bez dalšího bumpu, protože release ještě nebyl zelený/nasazený, je opravil SHA `404637600413067219a7242e1a26ecdc6fc68167`. [Actions #291](https://github.com/martinspadrna/RaK/actions/runs/36033861154) SUCCESS, Vercel `dpl_CVHENG3ePY24ZdbS8Z2remGgbp1z` READY, rollback `dpl_F8L2xx9ZzYF3hFtvfVyniouWard3`, release evidence ID `10822664323`; `main` a produkce zůstaly beze změny. Extra živý endpoint test prokázal 200/VCALENDAR na známém veřejném Google kalendáři i směně D, zatímco A/B/C vrací Google upstream nedostupnost. To znamená, že pro fyzický retest A/B/C je nejprve nutné opravit jejich veřejné sdílení v Google; RaK není obecnou ani private-ICS proxy. Procenta 13 oblastí se nemění.
- **24. 9. 2026 – TEST release 1.7.89: směna účtu + plný kalendářový modal + centrované ×:** fyzický iPhone test 1.7.88 ukázal, že účet nastavený na směnu A stále otevíral „Kalendář · směna D“, Google Calendar byl jen malý proužek a zavírací × nebylo uprostřed kruhu. Databázová konfigurace A i uložený public ICS byly přitom správné. Kořen mapování byl v tom, že `getRakActiveAccountShiftInfo()` hledal explicitní směnu v privátním worker rosteru, který běžný klient záměrně kvůli privacy RLS nečte, a proto padal na D. TEST migrace `20260924164526_rak_login_shift_team_v3_17089` přidala `rak_lookup_account_for_login_v3`: navazuje na již omezený v2 lookup a vrací pouze A/B/C/D pro právě nalezený účet, nikoli roster. Anonymní TEST volání bylo ověřeno se správnou směnou; advisor nadále hlásí očekávaná varování pro záměrně anonymně volatelné SECURITY DEFINER login RPC, nejde o nově zpřístupněnou tabulku. Profil směnu ukládá lokálně a starý profil bez ní se při prvním online startu sám doplní bez mazání storage. Modal dostal flex rodiče pro `calendarModalFrameWrap`, takže iframe vyplní zbývající výšku, a `.calendarModalClose` používá explicitní flex centrování. SHA `a18c8e1be127702513f5fab40e43ad97f282a74f`, [Actions #287](https://github.com/martinspadrna/RaK/actions/runs/36030461175) SUCCESS, Vercel `dpl_F8L2xx9ZzYF3hFtvfVyniouWard3` READY, rollback `dpl_J5XfjRw3oShK9NtFQL2ZDA3vhx34`, release evidence ID `10822310131`; `main` a produkce zůstaly beze změny. Procenta 13 oblastí se nemění do fyzického iPhone retestu.
- **24. 9. 2026 – TEST release 1.7.88: oprava administrace Kalendářů a mobilního layoutu:** fyzický iPhone test 1.7.87 odhalil, že tlačítka Přidat a Uložit okamžitě vracela stránku do „Více“ a kalendář se neuložil. Příčina nebyla v ICS odkazu, ale v `appMenuAdminModeSet()`: nový režim `calendars` chyběl v allowlistu administrátorských pohledů, takže bezpečnostní guard akci zastavil ještě před handlerem. SHA `1c686ec4a5f6a5c6c0faabc06d3af885b7fd8c33` přidal `calendars` do povolených režimů a nový release gate tuto podmínku regresně testuje. Editor zároveň skládá × a + Přidat vedle sebe, nový řádek přidává přímo pod aktuální, poslední řádek se při odebrání jen vyčistí a mezi směnami je větší mezera. Public-ICS normalizace z 1.7.87 zůstává zachovaná. [Actions #285](https://github.com/martinspadrna/RaK/actions/runs/36027186627) SUCCESS prošel dvěma buildy, gate testy, offline Chromium, 3× benchmarkem, TEST HTTP a release proof. Vercel `dpl_J5XfjRw3oShK9NtFQL2ZDA3vhx34` je READY, stabilní development alias na něj ukazuje, rollback je `dpl_5zqBT2g5jDAZmJ9fNyxgdygznPn6`, release evidence ID `10820885390`; `main` a produkce zůstaly beze změny. Procenta 13 oblastí se nemění do fyzického iPhone retestu.
- **24. 9. 2026 – TEST release 1.7.87: veřejné Google Calendar ICS:** na základě fyzického testu 1.7.86, kde nešel uložit veřejný odkaz `.../public/basic.ics`, byl přidán normalizátor Google Calendar URL. Veřejný ICS je nyní povolen a před uložením se z jeho calendar ID automaticky vytvoří `https://calendar.google.com/calendar/embed?src=...`; standardní embed zůstává podporovaný. `private-.../basic.ics` a cizí hosty validace dál odmítá. Funkční commit `50cc2aa26d92e70b0ec808eb0f4bbf2f75c2ff1a` zvedl runtime na 1.7.87; Actions #282 selhalo jen proto, že zděděný 1.7.86 test nenačetl novou pomocnou funkci do VM, přesto nové public/private ICS testy už byly PASS. Test-only commit `2443abfcf6e13e01e0f26aef1e5f3e5d15b85c2d` fixture opravil bez dalšího bumpu. [Actions #283](https://github.com/martinspadrna/RaK/actions/runs/36025325916) SUCCESS prošel dvěma buildy, všemi gate testy, offline Chromium, 3× benchmarkem, TEST HTTP a release proof. Vercel `dpl_5zqBT2g5jDAZmJ9fNyxgdygznPn6` je READY, stabilní development alias na něj ukazuje, rollback je `dpl_HBdcUbvP34mxj6mH1hJmdj5BfLoa`, release evidence ID `10818973416`; `main` a produkce zůstaly beze změny. Procenta 13 oblastí se nemění, dokud nebude dokončen fyzický iPhone checklist.
- **24. 9. 2026 – TEST release 1.7.86: směnové kalendáře + dokončení jednotného verzování:** funkční SHA `0eeaf9841ebf375f590451420a9182dafd43033c` přidal samostatnou Administraci → Informace pro zaměstnance → Kalendáře, mapování A/B/C/D přes existující směnu účtu, více kalendářů na směnu a výběr v Dashboard modalu. Stávající kalendář se zachová jako D fallback do prvního uložení. Konfigurace přijímá jen `https://calendar.google.com/calendar/embed?...` se `src`; privátní ICS URL se záměrně neukládají do veřejně čteného `machine_settings`. Nový typ nastavení používá existující autentizovaný RPC `rak_admin_save_machine_settings_v2`, bez nové DB migrace. „Upozornění v kalendáři“ bylo přesunuto z Nastavení strojů ke kalendářům. Verze je jednotně `1.7.86` pro display/technical/module/package, SW cache `v1.7.86`, build `v1.7.86-shift-calendars1`. [Actions #280](https://github.com/martinspadrna/RaK/actions/runs/36017186984) SUCCESS prošel dvěma buildy, všemi gate testy, offline Chromium, 3× benchmarkem, TEST HTTP a release proof. Vercel `dpl_HBdcUbvP34mxj6mH1hJmdj5BfLoa` je READY, stabilní development alias na něj ukazuje, rollback je `dpl_8QFJuAL4bwpfsVF6UkrHrxuPzX3c`, release evidence ID `10815820131`; `main` a produkce zůstaly beze změny. Fyzický iPhone test směnových kalendářů i dřívějšího local-first/account balíku zůstává otevřený, proto se procenta 13 oblastí nemění.
- **24. 9. 2026 – TEST release 1.7.85: jednotné verze a spolehlivější PWA update:** po zjištění, že vývojová PWA na iPhonu zůstávala na starším runtime, byly display/technical/module/package verze sjednoceny na `1.7.85`, SW cache na `v1.7.85`; `sw.js` začal měnit vlastní release marker a verzovaně importovat metadata a registrace používá `updateViaCache: 'none'`. SHA `7a2b75c537905fec7fdfd738a33df0d86dcdbeee` prošel Actions #279 SUCCESS a Vercel `dpl_8QFJuAL4bwpfsVF6UkrHrxuPzX3c`; vlastník následně potvrdil, že development skutečně běží na 1.7.85.

- **24. 9. 2026 – TEST release 1.7.84: local-first start, oddělení účtů, CAS vzhledu a owner invariant:** funkční commit `ecc2bb48c4814c87a87de15679720c8ebee1c271` převedl návrat do PWA na lokální-first čtení ověřené Rotace před Supabase, přidal metriku prvního použitelného Dashboard renderu, čistí starou runtime identitu před přihlášením jiného účtu a přesunul synchronizaci vzhledu ze zaniklého `game_stats` mechanismu do samostatného account-scoped úložiště s revizí/CAS. TEST migrace `rak_account_ui_preferences_cas_17084` je aplikovaná pouze v `cgshssdjgzzuprlwnabl`; přímá klientská tabulková oprávnění jsou odebraná, bounded RPC jsou záměrně dostupná současnému OS-only klientovi a advisor je proto hlásí jako očekávané SECURITY DEFINER warningy, nikoli jako čistý audit bez varování. Rollback-only CAS, anon RPC cesta a úplná backup-coverage sonda prošly. Následné test-only commity `3d89aeee5bbf6beb3e0bf07cfb8f7698fb656793`, `496fc70323bc55127b42bc4207f35cd4772f446d` a `29e07d975722b08a185589dfd37cce640436c558` pouze narovnaly zděděné release fixtures na nový kontrakt; runtime verze zůstala jediným bumpem `1.7.84` / technická `1.7.0`. Přesný SHA `29e07d975722b08a185589dfd37cce640436c558` prošel [Actions #274](https://github.com/martinspadrna/RaK/actions/runs/36007757382) SUCCESS včetně dvou buildů, všech gate testů, rollback/ZIP důkazu, reálného Chromium online→offline→online testu, 3× benchmarku a živého anonymního TEST HTTP. Release job vytvořil jediný READY preview `dpl_9tk5pjCu698W3rRqGKdVYXENwCeS`, ověřil metadata `1.7.84` / `1.7.0`, TEST izolaci a přesunul jen stabilní development alias; release evidence má artefakt ID `10810743243`. `main`, produkční Vercel i produkční Supabase zůstaly beze změny. Žádný z 13 procentních bodů se nezvyšuje, protože nové automatické důkazy ještě nenahrazují výslovně požadovaný fyzický iPhone/dvouzařízení test ani široký CAS všech relevantních zápisů.

- **24. 9. 2026 – produkční bezpečnostní fáze B dokončena, P1.1 uzavřeno; připraven schválený úklid Gomoku:** vlastník potvrdil celý fyzický iPhone checklist 1.7.83 a následně výslovně schválil produkční migraci. Přes development SHA `87a16c3433b371241991a59e756b2a10ea42b372` byla atomicky aplikována migrace `20260924104723_rak_production_phase_b_17083` z 25 ověřených souborů. Počty provozních dat zůstaly zachované; 12 importních metadat se přesunulo do soukromé tabulky. SQL postkontroly potvrdily uzavření legacy čtení a browser smoke produkční runtime 1.7.83 / 1.7.0 i bezpečný login lookup. Produkční Vercel `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, alias, `main` a Edge Functions se nezměnily. P1.1 se zvyšuje z 80 % (4/5) na 100 % (5/5); ostatní body se nemění. Vlastník navíc schválil smazání přesně 101 historických řádků odstraněného Gomoku. Fail-closed migrace `20260924110000_rak_delete_retired_gomoku_history.sql` (SHA-256 `57e1f5e42d04112a8e4df575f5cc8c1865edf366c49539ec751f044e9139461d`) prošla Actions #269 a byla aplikována pod produkční verzí `20260924105811`. Smazala 101 řádků, nezměnila 11 `game_accounts`, tabulku nesmazala a zachovala nulová klientská oprávnění.


- **24. 9. 2026 – produkční fáze B: preflight opraven bez mazání historie; nový backlog vzhledu účtu:** vlastník výslovně požádal pokračovat Plánem B a potvrdil, že 101 řádků `gomoku_wins` je historie již odstraněných Her. Čtecí produkční kontrola nic nezměnila a odhalila, že původní migrace správně fail-closed očekávala prázdnou tabulku. Development commit `9b6780b05c1d0f2e6149e7839ff3bc91b9a2488c` proto mění pouze guard: historické řádky zachová, před uzavřením veřejného čtení ověří nepřístupnost legacy zápisů a po změně kontroluje skutečné odebrání SELECT/policy. SHA-256 manifest byl aktualizován a regresní test zakazuje `DELETE`/`TRUNCATE`/`UPDATE` této tabulky. [Actions #266](https://github.com/martinspadrna/RaK/actions/runs/35984992508) je SUCCESS. Viditelná verze zůstala `1.7.83` a technická `1.7.0`. Po zeleném CI byl vytvořen jeden READY preview `dpl_E7fCLqBf6t26i6RzagVCNyMxGwqt` a stabilní development alias byl přesunut na tento přesný SHA; produkční Vercel `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, `main` i produkční Supabase zůstaly beze změny. Produkční zápis čeká na výslovné potvrzení celého fyzického iPhone checklistu 1.7.83. Do prvního nového TEST balíku byl přidán účetní sync vzhledu mezi zařízeními s lokálním offline startem, serverovou revizí/CAS a izolací různých účtů. Jde o otevřený požadavek, proto se checkboxy ani procenta 13 oblastí nemění. Následná kanonická aktualizace plánu na commitu `f8cd8fca0633aba81f084fb6b75365391b860365` prošla [Actions #267](https://github.com/martinspadrna/RaK/actions/runs/35985430722) SUCCESS a jako dokumentační změna nevytvořila další deployment.


- **24. 9. 2026 – jediným kanonickým dokumentem se stává RAK_HANDOFF.md:** celý 13bodový plán, checklisty, procenta, důkazy, seskupený backlog, provozní pravidla a předávací stav byly sloučeny pod stálý odkaz, který má vlastník uložený. `RAK_PLAN_13.md` zůstává pouze bajtově totožné kompatibilní zrcadlo stejného Git blobu; testy i staré odkazy tak čtou tentýž obsah a zdroj se nikdy nesmí upravovat odděleně. První konsolidační commit `6b64e1a49821e8f9d9640abd2be53392e894c40b` správně selhal v Actions #263, protože roadmap kontrakt ještě četl starou cestu; roadmap kontrakt byl napojen přes kompatibilní cestu. Následný Actions #264 potvrdil roadmap i všechny hlavní kontroly, ale správně odmítl symlink při rehearsal úplné obnovy, protože zdrojový ZIP speciální soubory zakazuje. Bezpečnostní pravidlo zůstalo beze změny; kompatibilní cesta byla proto převedena na bajtově totožné zrcadlo stejného Git blobu. Jde výhradně o dokumentační změnu bez zvýšení verze a bez Vercel deploymentu. Vyjádření vlastníka, že produkční převod vypadá v pořádku, není samo o sobě úplným fyzickým acceptance checklistem 1.7.83 ani souhlasem s produkční fází B; procenta se proto nemění.


- **24. 9. 2026 – produkční předání 1.7.83 fáze A dokončeno a nový funkční backlog zařazen:** main SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d` prošel Actions #261 / run `35957793587` SUCCESS a ručním produkčním releasem #1 / run `35958452867` SUCCESS. Vercel `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` je READY na přesném SHA, produkční alias je přepnutý až po HTTP důkazu a strojový artefakt `rak-production-release-evidence-de443b771bb7e7dd5fefa498883fdd220a78f07d` je uložen. Produkční Supabase `bkqamcbkiwumsvelahxr` obdržela jen kompatibilní fázi A; `rak-admin-users` je ACTIVE v8, anonymní i neplatný JWT vrací 401 a fáze B zůstává mimo souhlas. Nové požadavky vlastníka jsou seskupeny do P0.1/P0.3/P0.4/P1.2/P1.5/P2.1–P2.4; jde o otevřený backlog, proto se procenta 13 oblastí zatím nemění. Tato následná aktualizace plánu je dokumentační změna na `development` a nevytváří nový deployment ani verzi.

- **24. 9. 2026 – připraven dvoufázový produkční release bundle 1.7.83, bez produkčního zápisu:** `SECURITY_DEPLOYMENT.md` nyní obsahuje přesné vstupní SHA, SHA-256 všech použitelných migrací, kompatibilní fázi A zachovávající staré čtení, fázi B až po fyzické přejímce a druhém potvrzení, produkční CI/Vercel pořadí, fail-closed preflight, rollback na `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` a zachycený zdroj aktivní produkční Edge Function verze 7. Dokumentační merge připojuje dosavadní `main` jako druhého rodiče a tím zachovává jeho pět commitů bez přepsání development stromu. `main`, produkční Supabase i produkční Vercel zůstaly beze změny; verze a procenta všech 13 bodů se nemění.


- **23. 9. 2026 – produkční readiness audit po TEST releasu 1.7.83:** pouze čtecí kontrola potvrdila, že okamžité sloučení není bezpečné. `development` a `main` jsou divergovány (401/5 commitů), produkční Vercel stále běží na `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`, zatímco `main` je `ceca9f9644da3dc41059c5d232661d27bc6dba18`. Main auto-deploy není vypnutý. Produkční Supabase nemá pozdější TEST bezpečnostní migrace, v katalogu jí chybí aktuálním klientem používaná `rak_admin_list_application_accounts_v1` a její `rak-admin-users` Edge Function se liší od TEST varianty. Před vydáním je nutná kompatibilní produkční migrační/reverzní sada, sjednocení Edge Function, bezpečný Git strom a CI-before-production-deploy brána. Audit nic v `main`, produkčním Vercelu ani produkční Supabase nezměnil; procenta plánu se nemění.


- **23. 9. 2026 – TEST release 1.7.83 doplňuje „O aplikaci“ a připravuje podklad pro rozhodnutí o produkčním vydání:** stránka nově vysvětluje účel RaK a shrnuje pouze doložené výsledky řady 1.7 včetně bezpečnosti, offline Rotace, reportů a bezpečného ZIP exportu. Release SHA `7d6684d8027d0a08b8d8596d35fe73f3b0d1fbec` prošel Actions [runem #254](https://github.com/martinspadrna/RaK/actions/runs/35917440681) SUCCESS se dvěma čistými kanonickými buildy, povinnými testy, ZIP/CRC, Chromium, offline a TEST HTTP kontrolami. Vercel preview `dpl_5h3ivfYu3U8C9iHEYxLPyavacL5i` je READY na stejném SHA; stabilní development alias ukazuje na tento deployment. Metadata jsou `1.7.83` / `1.7.0` / `v1.7.83-about-release1`, runtime obsahuje TEST `cgshssdjgzzuprlwnabl` a neobsahuje produkční ID. Artefakt `rak-release-evidence-7d6684d8027d0a08b8d8596d35fe73f3b0d1fbec` (ID `10775104700`) je PASS a rollback cíl je READY `dpl_4tYmv9R4sNHV6yq9LxQ7Y8zP9jPe`. `main`, produkční Vercel a produkční Supabase zůstaly beze změny. Procenta všech 13 bodů se nemění; 1.7.83 dosud nemá fyzický iPhone acceptance a ten se nesmí zaměnit s PASS z 1.7.82.


- **23. 9. 2026 – P0.1 uzavřeno na vydaném runtime 1.7.82:** povinné regrese nyní pokrývají rekurzivní osobní pole ve veřejných/neplatných HTTP odpovědích i záporný exportní scénář bez živého DOM fallbacku. Důkaz: SHA `1c6dc4e12eb4b1519e910a3b00bc64a1f5895767`, Actions #243 / run `35889947003` SUCCESS, Vercel `dpl_6m3mDvWpRAXNRKhR1LaceaJnx7jd` READY, TEST-only konfigurace. P0.1 se zvyšuje z 80 % (4/5) na 100 % (5/5); P0.3 zůstává 80 % kvůli fyzickému iPhone testu soukromé zálohy.

- **23. 9. 2026 – fyzický iPhone PASS pro RaK 1.7.82:** bez mazání dat prošel online stav, cold-offline Dashboard „kam jdu“, offline Rotace i návrat online bez restartu. Falešný konflikt se nevrátil. P2.3 se posouvá z 25 % (2/8) na 63 % (5/8); zbývají už jen explicitní konfliktové/CAS položky, ne reprodukovaná mobilní offline chyba.

- **23. 9. 2026 – 1.7.82 odstraňuje skrytou závislost Rotace na Brusech:** zpřísněný cold-offline Chromium test při okamžité rehydrataci odhalil `ReferenceError: buildNameIndex is not defined`. `rotace.js`, statistiky a Dashboard tento index používají, ale historicky byl definovaný až v `brusy.js`, tedy v jiné lazy skupině kalkulaček. Nový `rotation-name-index.js` je proto skutečná shared dependency Rotace i kalkulaček a je povinně v `WARM_START`/`OFFLINE_REQUIRED`; Rotace už nesmí být označena READY bez tohoto helperu. P2.3 zůstává 25 % do fyzického iPhone PASS.

- **23. 9. 2026 – připraven release 1.7.82 pro rehydrataci Rotace a Dashboardu:** fyzický iPhone na 1.7.81 potvrdil, že offline snapshoty existují a lze rozkliknout všechny rozpisy, ale cold start je nepromítne do hlavní Rotace ani dashboardového „kam jdu“; po návratu online se stav srovná až restartem. Kořen je v lazy dependency graphu: `sync` mohl běžet před `rotation`, zatímco Dashboard používá výpočtové helpery z `rotace.js`. 1.7.82 proto dává `sync` explicitní dependency na `rotation`, po readiness rotation okamžitě přerenderuje Rotaci/Home a každá aplikace cached/remote snapshotu refreshuje Dashboard i announcement. Browser test přestává před offline assertion ručně načítat/synchronizovat rotation a vyžaduje, aby cold boot vše připravil sám. P2.3 zůstává 25 % do fyzického iPhone PASS; `main` a produkční Supabase beze změn.

- **23. 9. 2026 – release 1.7.81 opravuje poslední 404 development runtime:** alias-specific Vercel protection override v 1.7.80 fungoval a anonymně zpřístupnil HTML, `app.js` i `supabase-config.js`, ale veřejná kontrola správně odhalila 404 pouze pro `vendor/supabase-2.110.7.js`. SDK se proto přesouvá do kořene statického výstupu jako `supabase-vendor-2.110.7.js`. Canonical build dál ověřuje přesně pinovanou verzi 2.110.7 a SHA-384; nový release gate vyžaduje stejnou root cestu v HTML, runtime loaderu a service workeru. Release pipeline po `vercel build` fail-closed kontroluje fyzickou existenci souboru v `.vercel/output/static` a po aliasování jeho anonymní HTTP 200. Viditelná verze se zvyšuje na 1.7.81, aby iOS/PWA spolehlivě rozpoznala nový build. P2.3 zůstává 25 % do fyzického iPhone PASS.

- **23. 9. 2026 – fyzický iPhone odhalil Vercel Deployment Protection jako blokátor developmentu:** i přes READY preview a zelené autentizované CI vracel stabilní development alias anonymním požadavkům na `app.js`, `supabase-config.js`, release metadata a self-hosted Supabase vendor HTTP 302 na Vercel SSO s `Cache-Control: no-store`. Na iPhonu se proto otevřelo HTML, ale online runtime nebyl kompletní: Supabase hlásila odpojení, aktualizace se nespustila a přihlášení nemohlo vyhledat osobní číslo. Release pipeline nově vytváří `alias-protection-override` pouze pro stabilní development alias; projektová ochrana a produkční alias zůstávají beze změny. Následný release se smí považovat za úspěšný jen pokud anonymní HTTP bez Vercel tokenu vrátí 200 pro HTML, SW, metadata, TEST Supabase config, `app.js` a Supabase vendor. P2.3 zůstává 25 % do opakovaného fyzického iPhone testu.

- **23. 9. 2026 – 1.7.80 převedena na self-hosted Supabase SDK:** zpřísněný browser test už prokázal cold-offline obnovu Rotace bez běžné HTTP cache, ale reconnect odhalil zbylou externí startovací závislost na jsDelivr. Místo povolení CDN v testu se Supabase JS 2.110.7 nyní při canonical buildu bere z přesně pinované npm dependency, ověřuje se SHA-384 proti dosavadnímu SRI a publikuje do `vendor/supabase-2.110.7.js`. Vendor je povinný v public outputu, `WARM_START` i `OFFLINE_REQUIRED`; `index.html` už pro Supabase nepoužívá externí CDN. Tím cold-offline start ani reconnect nejsou závislé na třetí straně. P2.3 zůstává 25 % do fyzického iPhone PASS.

- **23. 9. 2026 – připraven release 1.7.80 pro skutečný cold-offline boot a reconnect bez reloadu:** fyzický iPhone potvrdil, že 1.7.79 odstranil falešný konflikt po návratu online, ale offline Rotace stále nebyla dostupná a Supabase po zapnutí internetu zůstávala odpojená do restartu aplikace. Příčina reconnectu je externí Supabase SDK z CDN, jehož neúspěšný offline `<script>` se sám neopakoval; offline Rotace navíc nesmí čekat na background warmup sync vrstvy. 1.7.80 proto čeká na aplikaci persisted Rotace při offline bootu a po `online` události znovu načte Supabase SDK + sync bez reloadu. Browser test před offline reloadem maže HTTP cache, takže už nemůže uspět jen díky předem nacachovanému CDN skriptu. P2.3 zůstává 25 % do fyzického iPhone PASS; `main` a produkční Supabase beze změn.

- **23. 9. 2026 – release 1.7.79, systémová oprava offline persistence Rotace:** online snapshot se ukládá přes jediný ověřovaný kontrakt do localStorage i samostatné CacheStorage, obě kopie nesou porovnatelné `revision`/`savedAt`/fingerprint metadata a po zápisu se skutečně zpětně čtou. Offline start vybírá nejnovější důvěryhodný kandidát místo pevného localStorage-first pořadí a případnou starší druhou kopii bezpečně opraví bez zápisu do synchronizační fronty. Sanitizovaná diagnostika zpřístupňuje pouze existenci, zdroj, revizi, stáří, počet kopií a agregovaný stav fronty. Browser test záměrně vytváří stale localStorage proti novější durable kopii a vyžaduje opravu. P2.3 zůstává 25 % do fyzického iPhone potvrzení; `main` a produkční Supabase beze změn.

- **23. 9. 2026 – P1.4 dokončeno automatickým auditním řetězcem konkrétního releasu:** release SHA `630c1d0e3a85d16498af4e4e622198cdb55066f0` prošel Actions [runem #201](https://github.com/martinspadrna/RaK/actions/runs/35809836817) SUCCESS. Povinné syntax/check/unit/integrace, security a offline regrese, ZIP/manifest/CRC, skutečný Chromium smoke, TEST HTTP a dva čisté kanonické buildy proběhly před finálním preview deploymentem. Deployment `dpl_E6wuKEDamizLudSyqoT1VRn6u6Jo` je READY se stejným SHA; stabilní development alias ukazuje na tento deployment. HTTP ověřilo `1.7.77`, technickou `1.7.0`, build `v1.7.77-pwa-durable-rotation1`, TEST Supabase `cgshssdjgzzuprlwnabl` a nepřítomnost produkčního ID `bkqamcbkiwumsvelahxr`. Strojový artefakt `rak-release-evidence-630c1d0e3a85d16498af4e4e622198cdb55066f0` (ID `10729621310`) je uložen do 22. 12. 2026 a obsahuje návrat na READY `dpl_C8CgASwYwFpBLyLcNkdQwfa5v6TW` / SHA `23b14e6b70460819df2508f1710cf697dd907046`. `main` zůstal `ceca9f9644da3dc41059c5d232661d27bc6dba18`; produkční alias zůstal na `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`. P1.4 stoupá na 100 % (6/6). Současně je zaznamenán neúspěšný fyzický iPhone test 1.7.77: studený start instalované PWA v režimu letadlo Rotaci nenačetl a po návratu online vznikl konflikt; P2.3 zůstává 25 % a je rozhodnutím vlastníka odloženo. Tato následná změna plánu je pouze dokumentační, verzi nezvyšuje a nový Vercel deployment nevytváří.
- **22. 9. 2026 – release 1.7.77 pro skutečný offline start PWA a fail-closed deploy policy ověřen a nasazen:** online načtená Rotace se vedle kanonického `localStorage` zrcadlí do samostatné trvalé CacheStorage, která není verzovanou SW cache; studený offline start umí z této kopie obnovit lokální stav. Offline nebo chybné čtení vzhledu účtu je výslovně označeno jako nedostupné a nesmí založit automatický zápis. Starší nekritická položka vzhledu se po ověření novějšího serverového stavu ukončí bez globálního konfliktu. Chromium test už nemaže problém ručním vložením do `localStorage`: ukládá přes aplikační API, lokální kopii odstraní a vyžaduje obnovu z CacheStorage. Vercel skip policy nyní dovoluje přeskočit build jen přesně vyjmenovaným dokumentům; workflow, testy, nástroje a neznámé cesty vždy build spustí, takže P1.4 stoupá na 83 % (5/6). Fyzický iPhone zůstává povinným neuzavřeným důkazem; `main` a produkční Supabase beze změn. Runtime SHA `445f6d180efaae8e02d6a3dc8fa8c8195663f5a5` prošel Actions runem `35784911598` (#192) SUCCESS. Preview `dpl_Erg2nVhGsQtdgpRk81wBz7A9tPcy` je READY, `aliasError` je prázdný a odpovídá témuž SHA; autentizovaný HTTP průchod ověřil metadata `1.7.77` / `1.7.0` / `v1.7.77-pwa-durable-rotation1` a TEST Supabase. Neautentizovaný development alias zůstává chráněn přihlášením Vercel.
- **22. 9. 2026 – P1.3 dokončeno regresní paritou:** strojově čitelný manifest `tools/regression-parity.json` váže referenční release 1.7.69 na sedm povinných oblastí: data, rotaci, exporty, offline, oprávnění, rollback a rychlost. `tools/regression-parity-contract.test.mjs` ověřuje existenci původních důkazů, zachování současných scénářů a jejich skutečné spuštění v `npm run check` nebo povinném CI. Současně hlídá dva čisté kanonické buildy, čistý Git strom a zákaz `development-version-17070.mjs`. Referenční Actions run `35750687960` pro SHA `173d57fdf2c0e6dc8af5abcf9928240c383e5649` prošel všemi build, runtime, offline Chromium, benchmark, ZIP/CRC a TEST HTTP kroky; odpovídající preview `dpl_FKtZmysaTpjWibxTAzRyVP1shzkw` je READY a development alias vrací HTTP 200 s verzí 1.7.76. P1.3 je 100 % (6/6). Jde o testovací a dokumentační uzavření již nasazeného releasu 1.7.76, proto se verze znovu nezvyšuje a nevytváří další deployment. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – jednotná metadata releasu 1.7.76:** nový `rak-release-metadata.js` je jediným spustitelným zdrojem viditelné verze, technické verze, cache verze a build ID. Načítá se před prvním rozhodnutím v HTML, používá jej aplikace, Supabase konfigurace, service worker i kanonický build a je součástí offline jádra. Historické release gate testy 1.7.71–1.7.75 používají společný metadatový kontrakt místo ručních seznamů následníků; nová brána 1.7.76 zakazuje kopie aktuální identity v runtime/build souborech. P1.3 se zvyšuje na 83 % (5/6); zbývá úplná regresní parita před/po migraci včetně fyzického iPhonu. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – S3 dokončeno pro historické runtime gate testy:** zbývající testy 1.7.57–1.7.66 přešly na společnou `runtime-vm-fixture.mjs`; používají pojmenované deklarace a syntakticky vymezené podmínkové bloky. Geometrii absence a MO/TO nadále ověřují skutečné Chromium testy, zatímco jednotkové kontrakty už nespouštějí jednotlivé řádky vyříznuté podle komentářů. CI kontrakt nyní hlídá celý rozsah 1.7.57–1.7.69 proti návratu soukromého `node:vm`, `runInNewContext` a lokálních source-slicerů. P1.3 se zvyšuje na 67 % (4/6); sjednocení metadat verze a úplná regresní parita zůstávají otevřené. Jde pouze o testovací infrastrukturu, proto viditelná aplikace zůstává 1.7.75 a nový Vercel deployment se nevytváří. `main` a produkční Supabase beze změn.


- **22. 9. 2026 – S3, první stabilní testovací fixture:** testy 1.7.67–1.7.69 používají společnou browser/VM fixture, explicitně pojmenované deklarace a syntakticky vymezené podmínkové bloky místo výřezů mezi komentářovými značkami. Fixture má vlastní negativní testy a CI kontrakt zakazuje návrat soukromých VM/excerpt implementací v migrovaných gate testech. Historické scénáře zůstaly zachované; S3 zůstává otevřené, dokud stejným způsobem nepřejdou starší gate testy 1.7.57–1.7.66. P1.3 proto zůstává 50 % (3/6). Viditelná verze zůstává 1.7.70, protože balík nemění runtime aplikace ani nevytváří nový deployment. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – S2, kanonické zdroje a izolovaný výstup:** ověřený artefakt funkčního stavu 1.7.69 z běhu na SHA `5d14e396c4d0ff2dc249e4fff2dbb9418e182898` byl po kontrole manifestu a SHA-256 převeden do kanonických zdrojů a pro nový preview release přímo označen jako 1.7.70 (`v1.7.70-canonical-source1`). Veřejný build nyní pracuje v `.rak-canonical-build/work`, publikuje do `.rak-dist`, hlídá čistý Git strom a porovnává dva průchody; ZIP je jediný výslovně deklarovaný proměnný artefakt. Historický přepisovací řetězec zůstal zmrazený jako kompatibilní překladač, nevznikl žádný 1.7.70 patch. P1.3 se zvyšuje na 50 % (3/6); S3 a sjednocení metadat zůstávají otevřené. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – skutečná CI-before-deploy brána:** commit `50795a7cd13c0733523b0cb5decabeed00b838bf` vypnul automatické Vercel Git deploymenty pouze pro `development` a přidal kontrakt brány do povinného CI preflightu. Push nevytvořil žádný Vercel deployment; po Actions runu `35606650384` SUCCESS (run #135) byl ručně přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, který je READY na témže SHA, development alias má `aliasError: null` a odpovídá HTTP 200 (`text/html`, 53 265 B). P1.4 se zvyšuje na 67 % (4/6). Obecná branch/ruleset ochrana, odolnost proti změně workflow a automatické ukládání úplného důkazního řetězce budoucích releasů zůstávají otevřené. Produkční deployment zůstává READY na main SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`; produkční Supabase beze změn.
- **21. 9. 2026 – stabilní opakovaný build a ověřený preview rollback:** development SHA `7698b442e8826cff94127611db62e459f70199fc`, Actions run `35601348892` SUCCESS; tři shodné build průchody doložily digest `3dd1b5351a3e695523e2cf07d050da624cf7bdcd77c8b995bf17f2f052b1fac1`. Vercel development deployment `dpl_CDWKvYAjTnA9kM4xe9SJweD3gQuW` je READY na stejném SHA. Izolovaný preview alias byl ověřen před rollbackem, během přepnutí na READY SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c` i po návratu (vždy HTTP 200, `text/html`, 53 102 B) a následně odstraněn. P1.4 se zvyšuje na 50 % (3/6); striktní CI-before-deploy brána zůstává otevřená. `main` a produkční Supabase beze změn.
- **21. 9. 2026 – nový měřitelný plán:** zachováno všech 13 oblastí; P1.3 zůstává otevřený; přidána kontrolovatelná podkritéria a procenta, S1–S6 mapovány dovnitř plánu. Nejedná se o dodání nové funkcionality ani o potvrzení opravy konfliktu. Další aktualizace zapisovat do tohoto souboru, s evidence pro změny `[x]` i procent.
