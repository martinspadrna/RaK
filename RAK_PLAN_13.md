# RaK – závazný plán 13 oblastí, kontrolní úkoly a průběžný postup

**Výchozí audit: 21. 9. 2026.** Repo `martinspadrna/RaK`, výchozí `development` SHA `ae0ed9d5cacffbabe38486b171a8793ee281d6a4`, poslední ověřená funkční testovací verze `1.7.69` na commitu `1693c8631c13d6e381e44a96810a55140ad6aa62`; technická verze musí zůstat `1.7.0`. Tento dokument je změna plánu, **nikoli dokončená oprava aplikace nebo nový release**. `main` a produkční Supabase beze změn. Podrobné provedení stabilizace: [RAK_STABILIZATION_PLAN.md](RAK_STABILIZATION_PLAN.md); historický stav a důkazy: [RAK_PLAN_17068_STATUS.md](RAK_PLAN_17068_STATUS.md) a předchozí stavové soubory. Stabilizační milníky S1–S6 jsou podúkoly níže uvedených oblastí, **ne čtrnáctý bod**.

## 0. Jak budeme počítat a aktualizovat procenta

- Každá položka `[x]` je **doložená splněná akceptační podmínka**, `[ ]` je nesplněná nebo nedostatečně doložená. Všechny podmínky v jednom bodě mají stejnou váhu; `% = zaškrtnuté / celkem × 100`, zaokrouhleno na celé procento. Neodhadovat podle počtu commitů, napsaného kódu nebo toho, že CI jednou zezelenalo.
- Jakmile regresní chyba zpochybní dříve splněnou podmínku, okamžitě ji odškrtnout a procento snížit. Splnění se váže ke konkrétnímu důkazu a prostředí, ne k tvrzení v changelogu. Budeme průběžně zapisovat datum, SHA, CI run, Vercel stav a výsledek relevantního testu. Nedoložené = nesplněné.
- **100 % znamená všechny podmínky opravdu splněné**, u oblastí s provozem i fyzický Safari / skutečný test, kde to bod vyžaduje. Jediná výjimka P0.2: **100 % je dokončení a zdokumentování rozhodnutí přijmout riziko; není to 100% zabezpečení veřejných dat.** Technická bilance se počítá odděleně.
- Nic nemažeme z plánu jen proto, že to nejde ověřit bez uživatelské akce, autentizovaných tokenů, zařízení nebo nákladů; označíme blokátor a zachováme položku otevřenou. Přijaté riziko lze uzavřít pouze výslovným rozhodnutím vlastníka s popisem dopadu.
- Pro každý realizační balík aktualizovat v tomto **jednom kanonickém dokumentu** checkboxy, procenta, důkazy, nově odhalené regrese a nejbližší kroky. Historické soubory jsou archiv, nesmí řídit současný stav. Průběžný report: hotovo / nově ověřeno / zbývá / celkové body / přesný SHA / CI / Vercel / konkrétní iPhone test.

## Přehled k výchozímu auditu

| Bod | Výsledek | Procento | Povaha stavu |
|---|---|---:|---|
| P0.1 | Účty a data pracovníků | **40 % (2/5)** | Otevřeno, OS-only omezení trvá |
| P0.2 | Soukromí sdílené rotace | **100 % (5/5)** | Uzavřeno **pouze rozhodnutím o přijatém riziku** |
| P0.3 | API, exporty a historické klienty | **40 % (2/5)** | Otevřeno |
| P0.4 | Role vlastníka a administrátorů | **40 % (2/5)** | Otevřeno |
| P1.1 | Databázová oprávnění, RLS a RPC | **40 % (2/5)** | Otevřeno |
| P1.2 | Administrátorské heslo, relace a zařízení | **40 % (2/5)** | Otevřeno |
| P1.3 | Reprodukovatelný build, testy a verze | **50 % (3/6)** | Otevřeno; S2 dokončeno, S3 pokračuje |
| P1.4 | CI před nasazením, rollout a rollback | **67 % (4/6)** | Otevřeno; preview rollback a CI-before-deploy brána ověřeny |
| P1.5 | Úplné zálohy a prokazatelná obnova | **43 % (3/7)** | Otevřeno; shadow restore není úplná obnova |
| P2.1 | Výkon startu PWA | **20 % (1/5)** | Otevřeno |
| P2.2 | Rozložení, DOM, CSS a interakce | **40 % (2/5)** | Otevřeno |
| P2.3 | Offline, fronta, verze a konflikty | **25 % (2/8)** | **Otevřeno; konflikt na iPhonu trvá** |
| P2.4 | Bezpečná diagnostika a průběžná kvalita | **33 % (2/6)** | Otevřeno |

**Bilance: 1/13 uzavřen rozhodnutím o riziku, 0/12 ostatních plně technicky dokončeno, 12/13 otevřených.** Dřívější historické `2/13` počítalo P1.3 jako hotový kvůli existenci CI; tento závěr byl odvolán po regresích historických VM testů. Procenta nejsou obecnou známkou bezpečnosti ani příslibem bezchybnosti.

---

## P0 · Bezpečnost a soukromí

### P0.1 – Účty a data pracovníků · **40 % (2/5)**

Cíl: omezit zbytečné zveřejňování osobních údajů bez změny vlastníkem schváleného přihlášení zaměstnanců.

- [x] Zabránit anonymnímu čtení celého adresáře zaměstnanců; ověřeno dosavadními API a anonymními HTTP kontrolami.
- [x] Omezit vyhledání účtu přes lookup v2 a zachovat běžné přihlášení výhradně OS číslem.
- [ ] Projít staré exporty, předchozí PWA/service worker a zálohy z hlediska dostupnosti adresáře, kontaktů a citlivých metadat; zdokumentovat, co nelze vzít zpět z Git historie či už stažených kopií.
- [ ] Ověřit povolené a zakázané datové cesty se skutečnými podepsanými owner/admin/deputy JWT i anonymní relací; nikdy nevystavovat token v logu.
- [ ] Přidat dlouhodobé regresní kontroly rozsahu osobních polí v odpovědích a exportech, včetně negativních případů.

**Dokončení:** všechny soukromé údaje mimo výslovně přijatý rozsah veřejné rotace chráněné a prověřené napříč novým i historickým klientem. **Omezení:** zaměstnancům nepřidávat hesla, e-maily, OTP ani vlastní Supabase Auth účty.

### P0.2 – Sdílená rotace a soukromí · **100 % (5/5; rozhodnutí, ne technická ochrana)**

Cíl: explicitně uzavřít konflikt mezi OS-only přístupem, společným/offline rozpisem a důvěrností dat; nepředstírat zabezpečení, které neexistuje.

- [x] Potvrzené rozhodnutí: běžní zaměstnanci se přihlašují pouze OS číslem, bez hesla/e-mailu/OTP/Auth registrace.
- [x] Zdokumentováno, že společný rozpis/offline režim vyžaduje v současném modelu veřejné čtení.
- [x] Soukromá `importMeta`, kontakty a autorství administrátora odděleny od veřejného rozpisu.
- [x] Zbytkové riziko výslovně pojmenováno: anonymně dostupná jména, běžné absence a zhruba 24 měsíců historie; OS číslo samo neověřuje identitu.
- [x] Stanoveno pravidlo: citlivé důvody absencí se do veřejné tabulky neukládají; případné jiné řešení vyžaduje novou domluvu s vlastníkem.

**Dokončení:** rozhodnutí uzavřeno, **ne** tvrzení, že jména a absence jsou soukromé. Nový nález širšího úniku patří zpět do P0.1/P0.3/P1.1 a může vyžadovat nové rozhodnutí.

### P0.3 – API, exporty a staré klienty · **40 % (2/5)**

- [x] Omezené login/legacy admin API, allowlist reportů a testovací HTTP sondy anonymního a neplatného JWT (dosavadní sada 18 kontrol).
- [x] Kontroly formátu ZIP, manifestu, kontrolních součtů/CRC a povolených typů souborů existují.
- [ ] Reálně vyzkoušet owner/admin/deputy JWT, odmítnutí cizího účtu a přístup k privilegovaným exportům/API.
- [ ] Ověřit soukromé stažení a otevření zálohy na skutečném iPhonu, bez úniku do veřejných umístění.
- [ ] Prověřit staré PWA/cache, chování chráněné Vercel preview URL a API/exporty ze starších buildů; regresní testy nesmějí obejít autorizaci.

**Dokončení:** každý export/API má zdokumentovaný datový rozsah a pozitivní i negativní test ve skutečném prostředí.

### P0.4 – Role vlastníka a administrátorů · **40 % (2/5)**

- [x] Existuje logika odvolávání autentizovaných relací a přístupové diagnostiky bez zveřejňování tokenů.
- [x] Existuje testovací SQL matice oprávnění v rollback transakci / syntetických rolích.
- [ ] Otestovat skutečné přihlášení owner, admin a deputy s platnými podepsanými relacemi.
- [ ] Ověřit hranice rolí: cizí účet, běžný zaměstnanec, anonymní přístup a odvolaná relace nesmějí získat privilegované operace.
- [ ] Zopakovat přihlášení, správu a odvolání zařízení na skutečném iPhonu v Safari/PWA.

**Dokončení:** pro každou roli doložené povolené i zakázané akce, bez změny OS-only režimu zaměstnanců.

## P1 · Architektura, spolehlivost a obnova

### P1.1 – Databázová oprávnění, RLS a RPC · **40 % (2/5)**

- [x] Základní RLS a omezení veřejného přístupu nad současným souborem přibližně 20 tabulek; dosavadní testovací anonymní sondy.
- [x] Syntetická SQL role matrix a kontrola privátních nastavení bez trvalých testovacích zápisů.
- [ ] Provést autorizované pozitivní/negativní kontroly se skutečnými JWT všech privilegovaných rolí.
- [ ] Zinventarizovat všechny privilegované RPC (včetně `SECURITY DEFINER`), `GRANT`, RLS a všechny veřejné cesty zapisující do provozních tabulek; vyhodnotit křížový přístup účtů.
- [ ] Každou nutnou úpravu politik nasadit nejprve do TEST s migrací, testem i reverzním postupem; ověřit, že nepoškodila běžný provoz.

**Dokončení:** bezpečnost stojí na serverových pravidlech, nikoli jen na skrytých tlačítkách; přijatá výjimka veřejného čtení rozpisu je jasně oddělená. Produkční DB bez výslovného schválení neměnit.

### P1.2 – Administrátorské heslo, relace a zařízení · **40 % (2/5)**

- [x] Oddělené administrátorské Auth relace navázané na uživatele, session a zařízení; omezený bootstrap.
- [x] Obnovení již odvolané relace je blokováno.
- [ ] Ověřit podpisy a expiraci na skutečných owner/admin/deputy relacích v TEST.
- [ ] Ověřit odvolání na druhém zařízení a přesně rozlišit „odvolaná relace“ versus „nové přihlášení se stále platným heslem“.
- [ ] Reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.

**Dokončení:** konzistentní serverová ochrana i po restartu a odvolání, nikoli pouze klientský příznak `adminUnlocked`.

### P1.3 – Reprodukovatelný build, testy a jednotná verze · **50 % (3/6)**

**Systémový problém:** řetězec `tools/development-version-17048.mjs` přepisuje soubory po verzích; historické VM testy vyřezávají úseky podle textových komentářů. Nová funkce mezi značkami už opakovaně rozbila staré testy. Úspěšný build 1.7.69 neznamená vyřešenou architekturu.

- [x] Základní úplné CI: dvě sestavení, `npm run check`, kritické a historické testy, CRC, Chromium/offline, TEST HTTP a opakované benchmarky; úspěšný referenční běh pro commit `1693c863`.
- [x] Přidána dočasná pojistka proti růstu verzovaných přepisovacích skriptů nad 1.7.69 a preflight kontrola politiky sestavení.
- [x] **S2 – jeden neměnný zdrojový strom:** převést transformovaný stav do normálních zdrojových modulů; build píše pouze do odděleného výstupu a nemění zdrojové soubory ani Git pracovní strom. Neztratit verzi 1.7.69 jako referenci.
- [ ] **S3 – stabilní testy:** nahradit křehké výřezy mezi komentáři explicitními exporty/fixtures nebo testem celého modulu; jednotné browser globals; zachovat všechny důležité bezpečnostní a provozní scénáře.
- [ ] Jediný zdroj metadat verze/build ID; validovat soulad HTML, aplikace, SW, exportu, cache a technické verze `1.7.0`. Dva čisté buildy stejného SHA musí mít porovnatelné hashe (odlišnosti jen výslovně deklarované).
- [ ] Prokázat regresní paritu před/po migraci: data, rotace, exporty, offline, oprávnění, rollback, rychlost; CI reprodukovatelné bez sériových oprav starých testů.

**Dokončení:** další funkční úpravy už nevyžadují nový `development-version-17xxx.mjs` ani přepis historických gate testů při každé verzi. Do migrace nový řetězec neprodlužovat a nezkracovat testy kvůli zelenému CI.

### P1.4 – Ověření před nasazením, deployment a rollback · **67 % (4/6)**

- [x] Je doložen proces kontroly přesného Git SHA, Actions SUCCESS, Vercel READY a HTTP/testovací konfigurace na referenčním release 1.7.69.
- [x] Existuje nedestruktivní rollback preflight a kontrola politiky přeskočení nerelease/test-only změn.
- [x] **S4 – brána před releasem:** automatické Vercel Git deploymenty pro `development` jsou v `vercel.json` vypnuté a CI změnu hlídá samostatným kontraktem. SHA `50795a7cd13c0733523b0cb5decabeed00b838bf` nevytvořil před CI žádný deployment; teprve po Actions runu `35606650384` SUCCESS byl přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, READY se stejným SHA, platným development aliasem a HTTP 200. `main` zůstal beze změny.
- [ ] Nastavit fail-closed pravidla přeskočení Vercel buildu pouze pro ověřeně nefunkční změny; žádný skrytý bypass změnou názvu souboru nebo workflow.
- [x] Bezpečně proveden skutečný PREVIEW rollback přes izolovaný dočasný alias: před, během i po návratu aplikace odpověděla HTTP 200; rollback mířil na READY deployment SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c`, návrat na READY SHA `7698b442e8826cff94127611db62e459f70199fc`; dočasný alias byl odstraněn a development/main/produkční aliasy zůstaly beze změny.
- [ ] Při každém budoucím funkčním releasu automaticky spojit SHA → CI → deployment → HTTP/konfiguraci → návratový plán a uchovat důkazy; nikdy nepřepisovat `main` bez výslovného souhlasu.

**Dokončení:** vadný commit se nesmí automaticky nasadit před úspěšným CI; rollback je prakticky vyzkoušen, ne jen popsán.

### P1.5 – Úplné zálohy a ověřitelná obnova · **43 % (3/7)**

- [x] Záloha zdrojů a owner ZIP mají inventář, manifest a CRC; zahrnuta kontrola zdrojových Git blobů.
- [x] Zpracován inventář databázového schématu, Auth, Storage a rozdělení TEST/produkce.
- [x] Ověřen nedestruktivní shadow/rollback-only pokus a kontrakt; **není to nezávislá plná obnova**.
- [ ] Bezpečně obnovit všechna potřebná TEST data a schéma do odděleného projektu po výslovném schválení případných nákladů; žádné mazání originálu.
- [ ] Ověřit obnovu Auth, Storage, rolí/RLS, pořadí migrací a relevantních revizí dat; zdokumentovat omezení zálohování přihlašovacích údajů.
- [ ] Fyzicky stáhnout a soukromě otevřít ZIP na iPhonu a ověřit integritu.
- [ ] Provedený restore porovnat kontrolními počty, hashi a funkčními testy; mít zkušební návrat a postup při selhání.

**Dokončení:** lze doložit, že jsme obnovili použitelnou oddělenou instanci, ne pouze vygenerovali ZIP nebo spustili transakci ROLLBACK.

## P2 · Mobil, offline a provozní kvalita

### P2.1 – Výkon a start PWA · **20 % (1/5)**

- [x] Automatizovaný Chromium start a tři nezávislá měření v CI.
- [ ] Opakovaně změřit skutečný iPhone Safari/PWA na studeném a teplém startu.
- [ ] Stanovit a vynucovat smysluplné časové/velikostní rozpočty se záznamem baseline a odchylek.
- [ ] Změřit offline start, návrat online, aktualizaci SW a chování při pomalé síti.
- [ ] Po stabilizaci architektury potvrdit, že výkon a první vykreslení po migraci nemají regresi vůči 1.7.69.

**Dokončení:** opakovatelné měření a nepřekročené prahy na reálném telefonu i CI.

### P2.2 – Rozložení, CSS, DOM a interakce · **40 % (2/5)**

- [x] Chromium ověřuje Home, navigaci, mobilní viewport a offline návrat.
- [x] Existují regresní kontroly geometrie TO/MO, absence a přetečení pro emulované rozměry.
- [ ] Reálné iPhone screenshoty světlého/tmavého režimu, safe-area, klávesnice, spodní navigace, editace tabulek a exportu.
- [ ] Proklik rolí owner/admin/deputy/běžný uživatel; ověřit DOM události a skutečné interakce, ne jen přítomnost textu v HTML.
- [ ] Porovnat před/po migraci kritické obrazovky a přidat stabilní regresní testy bez křehkých textových výřezů.

**Dokončení:** žádné kritické překryvy, uříznutá tlačítka či nefunkční akce na fyzickém iPhonu.

### P2.3 – Offline, lokální fronta, aktualizace a konflikty · **25 % (2/8)**

**Aktuální uživatelská závada:** na jediném iPhonu, kde vznikly neodeslané návrhy, přetrvává „Konflikt synchronizace“ i po jejich smazání. Verze 1.7.69 maže jen návrhy a typy fronty `rotation_state` / `rotation_month_entries`; ostatní konflikty úmyslně zachovává. Příčina na konkrétním telefonu **není potvrzená**. Neoznačovat opravu za hotovou podle zeleného CI.

- [x] Pravdivé online/cache stavy, retry a ochrana historických/neznámých úloh v místní frontě před tichou ztrátou.
- [x] Ochrana editovaných návrhů před opožděnou síťovou odpovědí a jednotkové testy selektivního lokálního mazání.
- [ ] **S5 – zjistit skutečnou příčinu iPhonu:** bezpečně rozlišit jiné zadržené úlohy, zbývající rozpisovou položku, opakované založení konfliktu, `storageIssue` a neaktuální UI stav; jen počty a sanitizované typy, bez osobních údajů.
- [ ] Před případným vyřazením **jediné konkrétní** konfliktní položky poskytnout privátní export původních bajtů, read-only kontrolu serveru, jasný důsledek a potvrzení; zachovat ostatní frontu a data.
- [ ] Zpracovat konflikty podle typu (rozpis / stroj / ostatní), bez automatického přepisu novějších online dat a bez falešného zeleného stavu.
- [ ] Zavést a otestovat serverově atomický CAS / revizi pro relevantní zápisy, včetně konkurence dvou zařízení; samotná shoda čísla revize bez obsahu nedovoluje přepsání.
- [ ] Ověřit staré PWA/service worker, dvojí instanci, aktualizace a offline→online bez reprodukce starého konfliktu či ztráty dat.
- [ ] Na fyzickém iPhonu potvrdit: po legitimním vyřešení konflikt zmizí a nevrátí se po restartu; online rozpis, jiná fronta a neodeslané údaje zůstanou konzistentní.

**Dokončení:** popsaná závada reprodukována a odstraněna bez plošného mazání Safari/PWA a bez neověřených serverových zápisů. Dokud trvá, P2.3 nesmí být uzavřen.

### P2.4 – Diagnostika, soukromí telemetrie a nepřetržitá kvalita · **33 % (2/6)**

- [x] Existuje čtecí diagnostika Auth, typů/počtů fronty a základní kategorizace chyb bez potřeby vystavovat syrové payloady.
- [x] Chromium/offline kontroly a měření výkonu dávají opakovatelné základní provozní signály.
- [ ] Zviditelnit konkrétní sanitizovanou příčinu konfliktní hlášky na problematickém iPhonu; rozlišit stav aplikace, fronty a chybu úložiště.
- [ ] Auditovat, že logy, reporty, telemetrie, screenshoty a exporty neobsahují tokeny, OS čísla, jména nebo obsah rozpisů mimo určený soukromý kontext.
- [ ] Zajistit verifikaci skutečných rolových JWT a konkrétní diagnostiku odmítnutých operací bez prozrazení přihlašovacích údajů.
- [ ] Zavést měřitelné výkonnostní/konfliktní prahy, periodické regresní testy a jednoznačné výsledky PASS/FAIL; pouhé upozornění nesmí být hlášeno jako úspěch.

**Dokončení:** příčinu provozní chyby lze najít bez prohlížení nebo mazání cizích dat; testy skutečně blokují nebezpečný release.

---

## Pořadí práce – žádné další vrstvení záplat

1. **Ochrana existujících dat + P2.3/P2.4 (read-only):** u postiženého iPhonu zjistit pouze typ a počet zadržených položek; nevymazat Safari, nepřeinstalovat PWA, znovu neposílat neověřený rozpis. Stávající funkční 1.7.69 je referenční bod.
2. **P1.3 / S2:** zaznamenat referenční soubory/hash, zmrazit přepisovací řetězec, převést poslední transformovaný stav na kanonické zdrojové moduly, sestavovat mimo zdroje. **Žádný nový `development-version-17070.mjs`** jako další textový patch.
3. **P1.3 / S3:** vytvořit stabilní sdílené testovací fixture a explicitní moduly, odstranit závislost testů na úsecích vyříznutých mezi komentáři. Historické bezpečnostní scénáře nahradit rovnocenným či silnějším ověřením, nikdy je nevypnout jen proto, že padají.
4. **P1.4 / S4:** vynutit testování před nasazením, zkušební rollback a vazbu na shodný SHA. Do té doby PR preflight omezuje chyby, ale není to striktní CI-before-deploy; nezaměňovat tyto dva stavy.
5. **P2.3 / S5:** implementovat bezpečnou rekonciliaci jednotlivých konfliktů a server CAS; testovat opakovaně na skutečném iPhonu a dvou zařízeních.
6. **P0.1/P0.3/P0.4/P1.1/P1.2:** uzavřít oprávnění a soukromí skutečnými podpisy JWT; zaměstnanecké OS-only přihlášení se nemění.
7. **P1.5/P2.1/P2.2/P2.4:** nezávislá kompletní obnova jen po schválení případných nákladů, měřené Safari, vizuální a provozní regrese, bezpečná diagnostika.

**Pravidlo dodávky:** tematické balíky a minimum commitů/deploymentů. Před releasem syntax + relevantní unit/integrace + dvě čisté sestavy + legacy/security/offline/browser testy + ZIP/CRC + TEST HTTP; po releasu přesný SHA, Actions SUCCESS, Vercel READY se stejným SHA, HTTP a zaměřený iPhone checklist. Nikdy nezaměňovat „test prošel v Chromiu“ s „ověřeno na iPhonu“. Produkční `main` ani produkční Supabase neupravovat bez výslovného souhlasu. Žádná destruktivní akce bez předchozí zálohy, ověřeného cíle a vědomého potvrzení.

## Záznam aktualizací

- **22. 9. 2026 – S3, první stabilní testovací fixture:** testy 1.7.67–1.7.69 používají společnou browser/VM fixture, explicitně pojmenované deklarace a syntakticky vymezené podmínkové bloky místo výřezů mezi komentářovými značkami. Fixture má vlastní negativní testy a CI kontrakt zakazuje návrat soukromých VM/excerpt implementací v migrovaných gate testech. Historické scénáře zůstaly zachované; S3 zůstává otevřené, dokud stejným způsobem nepřejdou starší gate testy 1.7.57–1.7.66. P1.3 proto zůstává 50 % (3/6). Viditelná verze zůstává 1.7.70, protože balík nemění runtime aplikace ani nevytváří nový deployment. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – S2, kanonické zdroje a izolovaný výstup:** ověřený artefakt funkčního stavu 1.7.69 z běhu na SHA `5d14e396c4d0ff2dc249e4fff2dbb9418e182898` byl po kontrole manifestu a SHA-256 převeden do kanonických zdrojů a pro nový preview release přímo označen jako 1.7.70 (`v1.7.70-canonical-source1`). Veřejný build nyní pracuje v `.rak-canonical-build/work`, publikuje do `.rak-dist`, hlídá čistý Git strom a porovnává dva průchody; ZIP je jediný výslovně deklarovaný proměnný artefakt. Historický přepisovací řetězec zůstal zmrazený jako kompatibilní překladač, nevznikl žádný 1.7.70 patch. P1.3 se zvyšuje na 50 % (3/6); S3 a sjednocení metadat zůstávají otevřené. `main` a produkční Supabase beze změn.

- **21. 9. 2026 – skutečná CI-before-deploy brána:** commit `50795a7cd13c0733523b0cb5decabeed00b838bf` vypnul automatické Vercel Git deploymenty pouze pro `development` a přidal kontrakt brány do povinného CI preflightu. Push nevytvořil žádný Vercel deployment; po Actions runu `35606650384` SUCCESS (run #135) byl ručně přes Vercel API založen preview `dpl_BY2VDD2WuiVkbpEDGToX2oLZZFWn`, který je READY na témže SHA, development alias má `aliasError: null` a odpovídá HTTP 200 (`text/html`, 53 265 B). P1.4 se zvyšuje na 67 % (4/6). Obecná branch/ruleset ochrana, odolnost proti změně workflow a automatické ukládání úplného důkazního řetězce budoucích releasů zůstávají otevřené. Produkční deployment zůstává READY na main SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`; produkční Supabase beze změn.
- **21. 9. 2026 – stabilní opakovaný build a ověřený preview rollback:** development SHA `7698b442e8826cff94127611db62e459f70199fc`, Actions run `35601348892` SUCCESS; tři shodné build průchody doložily digest `3dd1b5351a3e695523e2cf07d050da624cf7bdcd77c8b995bf17f2f052b1fac1`. Vercel development deployment `dpl_CDWKvYAjTnA9kM4xe9SJweD3gQuW` je READY na stejném SHA. Izolovaný preview alias byl ověřen před rollbackem, během přepnutí na READY SHA `7c78d37936c4b66248213c835f4e7d6873c2b22c` i po návratu (vždy HTTP 200, `text/html`, 53 102 B) a následně odstraněn. P1.4 se zvyšuje na 50 % (3/6); striktní CI-before-deploy brána zůstává otevřená. `main` a produkční Supabase beze změn.
- **21. 9. 2026 – nový měřitelný plán:** zachováno všech 13 oblastí; P1.3 zůstává otevřený; přidána kontrolovatelná podkritéria a procenta, S1–S6 mapovány dovnitř plánu. Nejedná se o dodání nové funkcionality ani o potvrzení opravy konfliktu. Další aktualizace zapisovat do tohoto souboru, s evidence pro změny `[x]` i procent.
