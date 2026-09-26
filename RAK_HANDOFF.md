# RaK – jediný kanonický předávací dokument, plán a aktuální stav

> **Toto je jediný řídicí dokument projektu RaK.** Stálý odkaz je
> https://github.com/martinspadrna/RaK/blob/development/RAK_HANDOFF.md
>
> Po každém větším balíku se aktualizuje právě tento soubor: provozní pravidla, aktuální stav, celý 13bodový plán, checkboxy, procenta, důkazy, backlog, pořadí práce i otevřené blokátory. Starší stavové a plánovací soubory jsou pouze historie a nesmějí řídit další práci. Od release 1.7.106 je tento soubor jediným živým plánem; dřívější `RAK_PLAN_13.md` bylo odstraněno po migraci kontrol a backup manifestu.

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
- Současný ověřený development runtime je `1.7.124`. Dokumentační nebo čistě testovací následník bez změny runtime číslo verze nezvyšuje.
- Dokumentační nebo čistě testovací změna bez změny aplikace verzi nezvyšuje a nevytváří Vercel deployment.
- Dělat velké tematické balíky, minimum commitů a jediný deployment až po úplně zeleném CI přesného SHA.
- Po každém větším balíku reportovat všech 13 oblastí a jejich procenta.
- **Komunikační pravidlo vlastníka od 26. 9. 2026:** když po testu aktuálního úkolu napíše pouze **„ok“**, znamená to **fyzický PASS a uzavření právě testovaného úkolu**. Neptat se znovu, zda tím myslel potvrzení.
- Po každém takto potvrzeném úkolu: (1) zapsat PASS do `RAK_HANDOFF.md`; (2) v odpovědi uvést **orientační odhad zaplnění aktuálního chatu v %** – výslovně jako odhad, protože přesný systémový ukazatel není k dispozici; (3) navrhnout **jeden konkrétní další úkol**; (4) říct, zda podle odhadu zbývající kapacita chatu na jeho bezpečné dokončení stačí.
- Pokud podle odhadu kapacita na další úkol **nestačí**, nepouštět se do něj v tomto chatu. Rovnou doporučit nový chat a dodat **krátký copy/paste prompt** ve stylu: „Pokračuj v projektu RaK podle aktuálního `RAK_HANDOFF.md` na HEAD větve `development`. Všechno důležité je zapsané v tomto souboru. Teď udělej úkol: <konkrétní úkol>.“

## Aktuální ověřený provozní stav k 26. 9. 2026

- Poslední ověřený **funkční** development release je `1.7.124` na SHA `126bad60c4add3f0f8f2d6ba7a0a9c0d7e7f462b`, build `v1.7.124-admin-password-six1`. [Actions #409](https://github.com/martinspadrna/RaK/actions/runs/36257519573) je kompletně SUCCESS (verify + release-preview) a stable TEST alias ukazuje na READY `dpl_3X1wfsuh67Sv9L414TQ9UsgF9DqD`. Minimum hesla pro owner/admin správce je sjednocené z 12 na **6 znaků** v klientovi i serverovém zdroji; maximum 128, ověření současného hesla a role zůstávají beze změny. TEST Edge Function `rak-admin-users` byla po zeleném CI nasazena jako ACTIVE v6, `verify_jwt=true`, platformní SHA-256 `a32a0628cdbf1d2e82249528ab3cbdcc8bd8ae99271f3f28075a201aed4f9a72`; její nasazený `index.ts` přesně odpovídá Git zdroji a obsahuje 2× změnu vlastního/owner hesla s minimem 6 + 1× create/update admin hesla s minimem 6, bez zbylé 12znakové kontroly.
- GitHub `main` se souběžnou změnou mimo tento balík posunul na `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c` (`fix: align Supabase migration history with production`). Produkční Vercel však zůstává na dříve schváleném runtime SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; tuto odlišnost neskrývat a před případným budoucím produkčním releasem znovu vyhodnotit.
- Produkční validace: [Actions #261](https://github.com/martinspadrna/RaK/actions/runs/35957793587), SUCCESS.
- Produkční release: [Actions #1](https://github.com/martinspadrna/RaK/actions/runs/35958452867), SUCCESS.
- Produkční Vercel: `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, READY, stále na schváleném produkčním SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční alias na něj ukazuje. Aktuální GitHub `main` je novější a není tímto produkčním deploymentem nasazen.
- Produkční metadata zůstávají historicky `1.7.83` / technická `1.7.0` / cache `v1.7.83` / build `v1.7.83-about-release1`; sjednocení verzí od 1.7.85 se týká nových development release a do produkce nebylo bez souhlasu přeneseno.
- Produkční Supabase zůstává `bkqamcbkiwumsvelahxr`. Fáze A i schválená atomická fáze B jsou aplikované; fáze B je migrace `20260924104723_rak_production_phase_b_17083`.
- Produkční Edge Function `rak-admin-users`: ACTIVE, verze 8, `verify_jwt=true`, platformní SHA-256 `95b4e0b95f4d8d2e8a1109557c62377bb552aac68425c00f299fe86c50b98ffc`.
- Produkční důkaz: artefakt `rak-production-release-evidence-de443b771bb7e7dd5fefa498883fdd220a78f07d`, ID `10791158417`, SHA-256 `15311dc153d8c3d01ae7b68cec76269ca0971e4ff345f79f8d349aac0dfbc6f6`.
- Nedestruktivní produkční rollback: READY `dpl_HhcLwjkTPvtuUCKANCF3zAsBEoR1` / SHA `e54e7e4909cb0f94b77b12aa2f60bbb4b6e64ca9`.
- Stabilní development alias nyní ukazuje na `dpl_3X1wfsuh67Sv9L414TQ9UsgF9DqD`, READY / SHA `126bad60c4add3f0f8f2d6ba7a0a9c0d7e7f462b`. [Actions #409](https://github.com/martinspadrna/RaK/actions/runs/36257519573) je SUCCESS na první pokus. Performance parity PASS: startupReady P50 `445→418 ms`, P95 `483→438 ms`; FCP P50 `300→312 ms`, P95 `360→320 ms`. PWA budgety PASS: cold mobile P50/P95 `1619/1652 ms`, offline reload `1258/1374 ms`, online recovery `619/653 ms`. Release evidence ID `10911142502`, SHA-256 `7efb7d72d09729efce4e5315ba567dec2616948b977bc77a29daec030b78c8ef`; CI proof ID `10910884275`, SHA-256 `4324ee12811f76fb1f5c8b8eef53912a9ed9389fe7f1fe2ba9234b9be6cb114e`; historický isolated-build alias 1.7.123 ID `10910949180`, SHA-256 `a926f08dd735741d8f6540c451ba1176555845a5acc014d10fa7b41a0cee92ca`. Rollback cíl PWA je předchozí READY `dpl_FpBSFZrqu6CHnc6qv1Xiffsze9JV`. TEST Supabase `cgshssdjgzzuprlwnabl` je ACTIVE_HEALTHY; jediná TEST serverová změna je Edge `rak-admin-users` v6, bez DB migrace. Produkční Supabase je ACTIVE_HEALTHY a beze změny. `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`; produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` na SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`.
- **Fyzická přejímka 1.7.123 po deploymentu: PASS 26. 9. 2026.** Vlastník potvrdil minimal-change Kalírna reflow na iPhonu slovy „je to OK“. Jde o dokumentační uzavření již nasazeného runtime; verze se nezvyšuje a nový deployment se nevytváří.
- Release 1.7.103 uzavřel konkrétní release chybu úplné zálohy: kanonický build vytvářel správný Git ZIP, ale Vercel Build Output dříve ponechal 145bajtový tracked placeholder. Pipeline od 1.7.103 kopíruje celý `.rak-dist` a fail-closed kontroluje skutečný ZIP před deployem i po HTTP.
- Fyzický iPhone retest 1.7.103 dne 25. 9. 2026 potvrdil picker Rozpisů, OS sloupec +50 %, `+/−` v kalkulačce, landscape pouze se správným login rakem a úplnou zálohu až po nabídku stažení souboru o velikosti 23,3 MB. Nepotvrdil však úplné otevření staženého ZIPu. V Nastavení korekcí zůstalo `+/−` jen u části polí a screenshot Reportu ukázal chybějící/oříznutý pravý okraj data; právě tyto dva fyzické nálezy opravuje 1.7.104.
- Release 1.7.102 prošel dvěma kanonickými buildy, celým `npm run check`, server-CAS unit testy, zděděnými/current gate testy, rollback/ZIP kontrolami, reálným Chromium online→offline→online, benchmarky a TEST HTTP. TEST Supabase má aplikované stage i cutover migrace `rak_revision_cas_stage_17102` a `rak_revision_cas_cutover_17102`. Nastavení strojů i měsíční rozpis se načítají spolu s revizí; zápis musí poslat přesně načtenou revizi, server zamkne revizní řádek a stale revizi odmítne SQLSTATE `40001`. Neověřená revize se odmítne už v klientovi před síťovým zápisem.
- Revizní registr `rak_write_revisions` je RLS-uzamčený bez přímých práv anon/auth. Staré v2 mutation RPC podpisy zůstávají kvůli kompatibilitě, ale po cutoveru fail-closed vrací upgrade-required konflikt a už neprovádějí zápis. Produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` na schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční Supabase se nezměnila. GitHub `main` je novější `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c` kvůli samostatné migration-history úpravě a není tímto produkčním deploymentem nasazen.
- Předchozí 1.7.100 na SHA `ae6719947736dbdd678a411ba7420a3d7a906693` zůstává historickým opravným releasem. Fyzický retest na 1.7.102 proběhl 25. 9. 2026: PASS byly širší jméno účtu mimo rozpis, přesný text `do Vánoc` a správná identita login raka; FAIL byly picker Rozpisů, +/− Brusů, geometrie data Reportu a úplná záloha, která správně zastavila neúplný zdrojový archiv. Vlastník navíc požádal OS sloupec o 50 % širší a landscape bez textu s rakem přes celý viewport. Tyto výsledky jsou vstupem 1.7.103; fyzický retest 1.7.103 ještě čeká.
- Předchozí schválený úklid produkčního Gomoku zůstává doložen [Actions #269](https://github.com/martinspadrna/RaK/actions/runs/35989913390) na SHA `8956893f160c05805b2cad7eb7467bed8e42f3e8`; tato historie se novým TEST releasem nemění.
- Přípravná kontrola produkční fáze B: development commit `9b6780b05c1d0f2e6149e7839ff3bc91b9a2488c`, [Actions #266](https://github.com/martinspadrna/RaK/actions/runs/35984992508), SUCCESS. Po zeleném CI vznikl jediný preview `dpl_E7fCLqBf6t26i6RzagVCNyMxGwqt`, READY na přesném SHA; HTTP důkaz potvrdil metadata `1.7.83` / `1.7.0`, TEST Supabase a nepřítomnost produkčního ID. Artefakt `rak-release-evidence-9b6780b05c1d0f2e6149e7839ff3bc91b9a2488c`, ID `10801851415`, SHA-256 `072fdd82c2747d79a39e092444ebd222da7f02b8043ab7c0ef77b64807510293`. Aplikační runtime se funkčně nezměnil; deployment vznikl kvůli konzervativní klasifikaci SQL migrace a pravidlo nebylo oslabeno.
- `main`, produkční alias a produkční Supabase se po dokončeném předání dále nemění bez nového souhlasu.

## Předání novému chatu – 25. 9. 2026

### PŘEDÁNÍ PRO DALŠÍ CHAT – 26. 9. 2026, po zeleném releasu 1.7.124

Vlastník požádal vybrat jeden zbývající úkol a dokončit jej samostatně. Vybraný úkol: **minimum hesla správce/admina 12 → 6 znaků**.

#### Stav 1.7.124

- Runtime SHA `126bad60c4add3f0f8f2d6ba7a0a9c0d7e7f462b`, build `v1.7.124-admin-password-six1`.
- [Actions #409](https://github.com/martinspadrna/RaK/actions/runs/36257519573): **SUCCESS** na první pokus; verify i release-preview zelené.
- Stable TEST Vercel: `dpl_3X1wfsuh67Sv9L414TQ9UsgF9DqD`, READY na přesném SHA. PWA rollback: `dpl_FpBSFZrqu6CHnc6qv1Xiffsze9JV`.
- TEST Supabase: ACTIVE_HEALTHY. `rak-admin-users` nasazena po zeleném CI jako **v6**, ACTIVE, `verify_jwt=true`, SHA-256 `a32a0628cdbf1d2e82249528ab3cbdcc8bd8ae99271f3f28075a201aed4f9a72`; nasazený zdroj přesně odpovídá Git souboru.
- Server: 2× změna vlastního/owner hesla a 1× heslo při create/update správce nyní odmítají jen délku pod **6** nebo nad 128. Žádná aktuální serverová kontrola `< 12` nezůstala.
- Klient: nový správce, owner password a own-admin password používají minimum 6; formuláře mají `minlength="6"` a české texty uvádějí 6 znaků.
- Zachováno: kontrola současného hesla přes `signInWithPassword`, zákaz stejného nového hesla, owner-only správa ostatních účtů, role owner/admin, JWT ochrana Edge Function.
- Regrese: `tools/admin-password-min-17124.test.mjs` + `tools/release-gate-17124.test.mjs`.
- Performance/quality PASS; release evidence ID `10911142502`, CI proof ID `10910884275`.
- Produkce beze změny: `main=056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`, Vercel `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, produkční Supabase ACTIVE_HEALTHY.

#### Fyzická PWA přejímka 1.7.124 – PASS

- **26. 9. 2026 vlastník odpověděl „ok“ a následně výslovně upřesnil, že jeho stručné „ok“ znamená, že právě testovaný aktuální úkol je v pořádku.**
- Požadavek **minimum hesla správce/admina 12 → 6 znaků** je tímto fyzicky potvrzený a uzavřený.
- Tento konkrétní podúkol znovu neotvírat bez nové konkrétní regrese.
- Širší P1.2 zůstává otevřená na 80 %, protože stále zahrnuje samostatné session/device Safari/PWA scénáře.

### PŘEDÁNÍ PRO DALŠÍ CHAT – 26. 9. 2026, po zeleném releasu 1.7.123

Od tohoto bodu dál platí přání vlastníka **dělat vždy jen jednu věc, dokončit ji a až potom přejít na další**. Aktivní okruh je stále **Neplánovaná změna (generátor)**. Release 1.7.123 řeší pouze chování důvodu **Odešel na kalírnu** tak, aby se den nepřeskupoval víc, než je skutečně nutné.

#### Přesný zelený výchozí bod

- Runtime: **RaK 1.7.123**, SHA `a4ccc7e80bb618ef7cadde16662e544c6d91d0c6`, build `v1.7.123-kalirna-minimal1`.
- [Actions #408](https://github.com/martinspadrna/RaK/actions/runs/36249941517): **SUCCESS** na první pokus finálního SHA; verify i release-preview jsou SUCCESS.
- Stable TEST Vercel: `dpl_FpBSFZrqu6CHnc6qv1Xiffsze9JV`, READY na přesném runtime SHA; rollback: `dpl_BXmAwB4WMgAfSfN2ck5DT41LUtJW`.
- Release evidence ID `10908354728`, SHA-256 `9a9d05264f78eea9c971f1227994cc48dad928bfce9b656a0a5ed226d13240c0`.
- CI proof ID `10908832679`, SHA-256 `85ffd65ea01b693214752d8b4f94c87ae3852577132597f7a0d582e55bd7fcd3`.
- Historický isolated-build alias 1.7.122 ID `10908428873`, SHA-256 `8edd48db02badb5dd2bf240b8c9d66866ac783e66593f65ef3f864f6e9866839`.
- Performance parity PASS: startupReady P50 `418→397 ms`, P95 `510→443 ms`; FCP P50 `320→340 ms`, P95 `344→364 ms`.
- PWA budgety PASS: cold mobile `1701/1951 ms`, offline reload `1180/1740 ms`, online recovery `611/615 ms` (P50/P95).
- TEST Supabase i produkční Supabase jsou ACTIVE_HEALTHY a beze změny; 1.7.123 nemá DB migraci.
- `main`, produkční Vercel a produkční Supabase se releasem 1.7.123 nezměnily.

#### Požadavek vlastníka a přesná logika 1.7.123

Vlastník na fyzickém iPhonu zjistil, že při **Blažek → Odešel na kalírnu** se vybraný den sice personálně dopočítal, ale generátor přeskládal zbytečně mnoho lidí. Požadavek je vždy zvolit **nejmenší bezpečný zásah do existujícího dne**.

- Minimal reflow se zkouší jako první pouze tehdy, když pracovník odchází z **MO** a celé původní **TO může zůstat beze změny**.
- Zbývající MO pracovníci se rozmístí jen do slotů, které odpovídají stávajícím staffing pravidlům pro nový počet dostupných lidí.
- Každá varianta musí respektovat kvalifikaci pracovníka na cílový stroj.
- Primární skóre je **nejmenší počet lidí, kteří změní svůj původní stroj**.
- Při shodném počtu přesunutých lidí je druhé kritérium **co nejméně přesunutých původních soustružníků**. Tím se preferuje řešení přes lidi z frézek.
- Teprve třetí kritérium je nejmenší počet změněných buněk.
- Typický stav 5 → 4 lidí na MO, kdy odchází člověk ze soustruhu: pracovník z **MFKF06** jde na jeho soustruh, **MFKF06 zůstane prázdná** a původní pracovník na **MFKF10 zůstane na místě a obsluhuje frézky sám**. Ostatní soustruhy a celé TO se nemění.
- Pokud odchází pracovník přímo z MFKF06, nikdo další se nemusí pohnout. Pokud odchází z MFKF10, pracovník z MFKF06 se přesune na MFKF10.
- Pokud přímý přesun z MFKF06 na uvolněný stroj neumožní kvalifikace, algoritmus může použít nejmenší nutný řetězec přesunů. Při shodně velkých řetězcích stále preferuje lidi z frézek před rozhazováním dalších soustružníků.
- Pokud neexistuje žádná platná lokální permutace, až potom se daný konkrétní den předá dosavadnímu scoped generátoru. Ostatní vybrané dny, které šly vyřešit minimálně, se znovu negenerují.
- Finální isolation/staffing validace, zákaz nedostupného člověka ve stroji, CAS/idempotence serverového zápisu i pravidla z 1.7.122 zůstávají zachované.

#### CI průběh 1.7.123

- [Actions #407](https://github.com/martinspadrna/RaK/actions/runs/36249701080) se fail-closed zastavil ještě před deploymentem. Odhalil jednak staré historické testy, které předpokládaly, že Kalírna vždy volá generátor pro celý vybraný rozsah, a jednak rovnost dvou dvoupřesunových variant, kde algoritmus ještě nerozlišoval frézky vs. další soustružník.
- Kořenová oprava nepovolila žádný bezpečnostní limit: historické testy byly převedeny na novou semantiku **absence scope + Kalírna fallback scope** a algoritmus dostal druhé skóre `movedLathePeople`.
- Finální SHA `a4ccc7e80bb618ef7cadde16662e544c6d91d0c6` prošel [Actions #408](https://github.com/martinspadrna/RaK/actions/runs/36249941517) kompletně na první pokus: dva canonical buildy, npm check, nové minimal-reflow regrese, zděděné/current gates, Chromium offline/recovery/SW update, performance budget/parita, quality thresholds, TEST HTTP, immutable preview i stable alias.

#### Fyzická iPhone přejímka 1.7.123 – PASS

- **26. 9. 2026 vlastník po fyzickém iPhone testu výslovně potvrdil „je to OK“.**
- Scénář **Blažek na MO → Odešel na kalírnu** po minimal-change reflow už nepřeskupuje den nesmyslně; řešení s minimem přesunů je uživatelsky přijaté.
- Tím je fyzická přejímka minimal-reflow z 1.7.123 uzavřená a nemá se znovu otevírat bez nové konkrétní regrese.

#### Další navazující funkční krok

Starší výslovný požadavek vlastníka zůstává otevřený: pracovníka označeného **Odešel na kalírnu** zobrazit evidenčně na **MFKF06 s označením Kalírny**, ale **nezapočítávat jej do aktivního staffing počtu MO**. Toto vizuální/evidenční chování nebylo součástí 1.7.123 a má se řešit jako samostatný další krok až po uzavřeném minimal-reflow.

U neplánované **Dovolené/NV/Paragrafu/Lékaře** zůstává pravidlo 1.7.122: pokud pracovník chybí z MO a stávající TO je stále platné, má se změna vyřešit jen uvnitř MO; cílený fyzický retest této konkrétní MO-only optimalizace je ještě vhodné dokončit.

Procenta 13 oblastí se tímto fyzickým potvrzením nemění: **5/13 uzavřených, 8/13 otevřených**.

#### Nově přidané otevřené požadavky vlastníka – 26. 9. 2026

- **P1.2 – HOTOVO pro tento konkrétní podúkol v 1.7.124:** minimum hesla pro správce/admin role je sníženo z 12 na **6 znaků** konzistentně v klientovi i TEST Edge Function; automatické testy, deployment i fyzická PWA přejímka jsou PASS. Vlastník potvrdil „ok“ 26. 9. 2026.
- **P2.1/P2.2:** zkrátit dobu po spuštění, kdy je UI viditelné, ale ještě nereaguje na kliknutí; nově měřit i čas do první použitelné interakce.
- **P1.2/P2.2:** oprávněným uživatelům zobrazit a zpřístupnit **Report a další role-gated položky ve Více** výrazně dřív; nečekat zbytečně na celý vzdálený bootstrap, ale zároveň nikdy krátce nezobrazit cizí privilegia.

Z těchto tří bodů je **heslo 6 znaků kompletně uzavřené včetně fyzického PASS**; oba výkonnostní/role-menu body zůstávají otevřený realizační backlog. Procenta 13 oblastí se tím nemění.

#### Co je už fyzicky potvrzené a neotvírat znovu

- WhatsApp text reportu: datum + slovní název směny, bez slova `směna` – **OK**.
- Zarovnání Datum/Směna v reportu – **OK**.
- Admin kalendáře `×` – **OK**.
- Popup Neplánované změny má být na iPhonu kompaktní, safe-area bounded a s viditelným vrškem; obsah smí scrollovat uvnitř.
- **Neplánovaná změna → Odešel na kalírnu, minimal-change reflow 1.7.123 – fyzický iPhone PASS 26. 9. 2026.** Vlastník potvrdil „je to OK“; tento konkrétní způsob přeskupení znovu neotvírat bez nové regrese.

### PŘEDÁNÍ PRO DALŠÍ CHAT – 26. 9. 2026, po zeleném releasu 1.7.122

Od tohoto bodu dál platí přání vlastníka **dělat vždy jen jednu věc, dokončit ji a až potom přejít na další**. Aktivní okruh je stále **Neplánovaná změna (generátor)**. Release 1.7.122 řeší pouze poslední požadavek: neplánovanou absenci pracovníka z MO vyřešit pokud možno jen uvnitř MO a zbytečně nerozhazovat TO.

#### Přesný zelený výchozí bod

- Runtime: **RaK 1.7.122**, SHA `fcd82dfbe05ab3a203ed405ec1fe233f67457aac`, build `v1.7.122-mo-only-absence1`.
- [Actions #406](https://github.com/martinspadrna/RaK/actions/runs/36247284927): finální **SUCCESS** na 4. attemptu stejného SHA; verify i release-preview jsou SUCCESS.
- Stable TEST Vercel: `dpl_BXmAwB4WMgAfSfN2ck5DT41LUtJW`, READY na přesném runtime SHA; rollback: `dpl_9HDBqbTnQxxJmSVBmpoZ8rH4DXTf`.
- Release evidence ID `10908022272`, SHA-256 `9651b1c6170d6577648f39d4669bcc2416cac6170831a9f0c473c89e59568db2`.
- CI proof ID `10907887383`, SHA-256 `e40738525bc1c3bb762dd5332dc0140adddb34ebff0e204e078ee0ba07db4a1b`.
- Historický isolated-build alias 1.7.121 ID `10907822443`, SHA-256 `9c490137462e21c4432bacfbb2c18cee61c903093a10b0bb643f1fa4bcc3d9d6`.
- Performance parity PASS: startupReady P50 `352→326 ms`, P95 `389→411 ms`; FCP P50 `248→268 ms`, P95 `264→276 ms`.
- PWA budgety PASS: cold mobile `1154/1156 ms`, offline reload `884/973 ms`, online recovery `511/546 ms` (P50/P95).
- TEST Supabase i produkční Supabase zůstávají beze změny a ACTIVE_HEALTHY; 1.7.122 nemá DB migraci.
- `main`, produkční Vercel a produkční Supabase se releasem 1.7.122 nezměnily.

#### Fyzický stav před 1.7.122

1.7.121 konečně zprovoznila scoped přepočet na skutečném iPhonu. Vlastník následně potvrdil, že výsledek Dovolené vypadá funkčně správně, ale požádal, aby se **neplánovaná absence řešila jen v MO, kdykoli je to možné**, místo zbytečného přeskupení TO.

Samostatné dřívější přání pro **Odešel na kalírnu** zůstává evidované, ale není součástí 1.7.122: pracovníka na Kalírně chce vlastník vizuálně uložit na **MFKF06 s označením Kalírny**, přičemž se nemá počítat do aktivního MO staffing počtu. Toto řešit až po dokončení fyzické přejímky MO-only absence.

#### Oprava v 1.7.122 – MO-only preference

- Týká se jen celodenních absencí **Dovolená, Náhradní volno, Paragraf, Lékař**.
- Pro každý vybraný den se nejprve zjistí, kde byl chybějící pracovník původně.
- Pokud byl na **MO**, aplikace zkusí zachovat celý původní řádek **TO beze změny**.
- TO se smí zamknout pouze pokud po nové absenci:
  - obsahuje správný cílový počet lidí,
  - nikdo z těchto lidí není nedostupný,
  - nikdo není duplicitně,
  - každý ponechaný pracovník má kvalifikaci pro svůj konkrétní TO stroj,
  - platí stávající pravidlo uzavření TPKW02 při 3 absencích.
- Pokud jsou tyto podmínky splněné, `adminRotationGeneratorBuildDay` převezme původní TO jako chráněné `preserveHardCells`, přeskočí hard-cycle/soft-core exchange/hard-fill a dopočítá jen MO z lidí, kteří po zachování TO zůstali.
- Po výpočtu `adminRotationUnplannedAssertHardPreserved` fail-closed porovná TO před/po. MO-only větev se nesmí tvářit úspěšně, pokud se změnil jediný TO slot.
- Pokud chybějící člověk byl původně na **TO**, nebo původní TO po absenci není bezpečně zachovatelné, zámek TO se nevytvoří a použije se dosavadní širší **lokální** přepočet vybraného dne.
- Izolace na vybrané dny, scoped režim 1.7.121, staffing 5 TO + 4 MO při jednom chybějícím, serverový CAS/idempotence i absence DB migrace zůstávají zachované.

#### CI průběh 1.7.122

- [Actions #405](https://github.com/martinspadrna/RaK/actions/runs/36247232145) se fail-closed zastavil na historickém 1.7.117 testu, který očekával přesně dva textové výskyty TPKW02 guardu; nový MO-only safety check přidal třetí legitimní guard. Deployment nevznikl.
- Historický test byl opraven tak, aby dál vyžadoval původní dva guardy, ale připustil další bezpečnostní kontrolu. Runtime se tímto test-only commitem neměnil.
- [Actions #406](https://github.com/martinspadrna/RaK/actions/runs/36247284927) attempt 1–3: všechny funkční/build/Chromium testy prošly, ale performance parity fail-closed zachytila proměnlivé startup vzorky; limity ani testy nebyly oslabeny a deployment nevznikl.
- Attempt 4 stejného SHA prošel celý řetězec: canonical buildy, npm check, MO-only regresní testy, inherited/current gates, Chromium offline/recovery/SW update, PWA budget, performance parita, quality thresholds, TEST HTTP, immutable preview a stable alias jsou **SUCCESS**.

#### Jediný další aktivní krok

**Fyzická iPhone přejímka 1.7.122**, bez dalších úprav:
- Vyber jednodenní **Dovolenou** člověku, který je v daný den původně na **MO**.
- Po uložení musí být **TO úplně stejné jako před změnou**.
- Přeskupit se smí jen MO a výsledné MO musí dál splnit staffing pravidla.
- Jiné dny se nesmí změnit.
- Jako doplňkovou kontrolu lze dát Dovolenou člověku z **TO**; tam je naopak širší lokální přeskupení povolené, pokud je potřeba.

Po tomto fyzickém PASS lze jako další samostatný úkol řešit dříve požadované chování **Kalírna → zobrazit pracovníka na MFKF06 s Kalírna označením, ale nepočítat ho do aktivního MO staffing počtu**.

Procenta 13 oblastí se touto úpravou nemění: **5/13 uzavřených, 8/13 otevřených**.

#### Co je už fyzicky potvrzené a neotvírat znovu

- WhatsApp text reportu: datum + slovní název směny, bez slova `směna` – **OK**.
- Zarovnání Datum/Směna v reportu – **OK**.
- Admin kalendáře `×` – **OK**.
- Popup Neplánované změny má být na iPhonu kompaktní, safe-area bounded a s viditelným vrškem; obsah smí scrollovat uvnitř. Nevracet full-height variantu z 1.7.112–1.7.118.

### NEJNOVĚJŠÍ závěrečné předání – 26. 9. 2026, release 1.7.111

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Dokumentační commit po tomto zápisu může posunout živý HEAD, ale ověřený runtime zůstává na níže uvedeném SHA.

#### Přesný online stav
- Ověřený runtime je **RaK 1.7.111** na SHA `643fc7600e56f77ac75c993dca122c7e7bb464d8`, build `v1.7.111-unplanned-diagnostics1`.
- [Actions #386](https://github.com/martinspadrna/RaK/actions/runs/36214422728) je **SUCCESS** na první pokus finálního SHA. Oba canonical buildy, npm check, zděděné/current gates, rollback/ZIP/CRC, Chromium online/offline/recovery, performance budgety/parita, quality thresholds i TEST HTTP jsou PASS.
- Immutable Vercel `dpl_6JWTputmRHCLkrsZXog4jUU5YYjf` je READY; stable development alias na něj ukazuje. Rollback je předchozí READY `dpl_HR4nW91RHFqrFk2pFPxEdi1GnnGt`.
- Performance parity PASS: `startupReady` P50 388→386 ms, P95 428→433 ms; FCP P50 312→304 ms, P95 336→344 ms. PWA budgety PASS: cold mobile P50/P95 `1493/1882 ms`, offline reload `1231/1391 ms`, online recovery `545/576 ms`.
- Release evidence ID `10896843012`, SHA-256 `5a2a1ef9090f7d08e62dd3f2d30a42aadd460e00db8a893e3576a0af6b422e4c`; CI proof ID `10896144745`, SHA-256 `d42cb89a15633c66dc90dc5f8a9e186a4229e10eef54682c98189c48d4ec783e`.
- TEST Supabase migrace `20260926030451_rak_unplanned_absence_generator_17111` je aplikovaná. Serverový rollback test pro nový RPC prokázal CAS, právě jeden první zápis, idempotentní retry bez druhého zápisu a odmítnutí reuse operation ID s jiným payloadem; transakce skončila ROLLBACK, takže test nezanechal změnu rozpisu.
- `main`, produkční Vercel i produkční Supabase se nezměnily.

#### Fyzicky uzavřeno
- WhatsApp automatický text po finální úpravě **OK**: bez slova `směna`, tedy např. `RaK – Report směny diferenciály · 26. 9. 2026 · Noční`.
- Datum/Směna i administrační `×` z předchozích releasů zůstávají fyzicky potvrzené **OK**.

#### Jediný aktivní úkol od tohoto bodu
**Neplánovaná změna (generátor)**. Přestože 1.7.111 už obsahuje implementaci i serverové TEST zabezpečení, od této chvíle se postupuje striktně po jednom úkolu: nejdřív fyzická/uživatelská přejímka a případné opravy tohoto generátoru. Až po jeho uzavření se smí přejít na další backlog. P2.4 diagnostické změny, které byly historicky zabalené do stejného 1.7.111 releasu, teď **neposouvat ani dále nerozvíjet**, dokud generátor nebude uzavřený.

### NEJNOVĚJŠÍ závěrečné předání – 26. 9. 2026, release 1.7.110

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Dokumentační commit po tomto zápisu může posunout živý HEAD, ale ověřený runtime zůstává na níže uvedeném SHA.

#### Přesný online stav
- Ověřený runtime je **RaK 1.7.110** na SHA `f47758929462d16a19807fa662916fe9819c258a`, build `v1.7.110-whatsapp-shift-label1`.
- [Actions #382](https://github.com/martinspadrna/RaK/actions/runs/36212641481) je **SUCCESS** po opakování stejného verify jobu na stejném SHA bez změny limitů. První pokus selhal pouze performance paritou o 7 ms; druhý prošel celý řetězec.
- Immutable Vercel `dpl_HR4nW91RHFqrFk2pFPxEdi1GnnGt` je READY; stable development alias `skoda-spada-git-development-martinspadrnas-projects.vercel.app` na něj ukazuje a veřejný HTTP audit je PASS.
- Release evidence ID `10895888179`, SHA-256 `10731128dd6d798bc0fce60840ccd8d00f6a9e2210259d4752ab2430bd5e75f4`; CI proof ID `10896441313`, SHA-256 `7f8e352d8957d60673dcdb0fdca712bfa66426c5611000a8bdf32c7860398f86`.
- `main`, produkční Vercel i produkční Supabase se nezměnily. Development rollback je předchozí READY `dpl_EDrD81vXqqZ7qcuq9CQ5ytSk2Wy2`.

#### Jediný funkční úkol 1.7.110
- Vlastník fyzicky potvrdil 1.7.109: dynamický WhatsApp text je **OK** a zarovnání `Datum směny` / `Směna` je **OK**.
- Předvyplněný WhatsApp text nyní překládá interní kódy směny na čitelné názvy: `R → Ranní`, `N → Noční`, `R8 → Ranní 8 h`, `N8 → Noční 8 h`.
- Překlad se provádí v pomocném i skutečně načítaném runtime; regresní smoke i release gate kontrolují obě cesty.

#### Cílená fyzická kontrola po 1.7.110
- Ověřit jediný detail: že WhatsApp před odesláním ukazuje např. `RaK – Report směny diferenciály · <datum> · směna Ranní` místo `… směna R`.

Procenta 13 oblastí se tímto textovým UX detailem nemění: **5/13 uzavřených, 8/13 otevřených**.

### NEJNOVĚJŠÍ závěrečné předání – 26. 9. 2026, release 1.7.109

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Dokumentační commit po tomto zápisu může posunout živý HEAD, ale ověřený runtime zůstává na níže uvedeném SHA.

#### Přesný online stav
- Ověřený runtime je **RaK 1.7.109** na SHA `613fdef93d242ce9ed4070c6e933d804b0f5fc42`, build `v1.7.109-whatsapp-runtime-align1`.
- [Actions #378](https://github.com/martinspadrna/RaK/actions/runs/36211872992) je **SUCCESS**. Finální SHA prošel dvojitým canonical buildem, npm check, release gates, rollback/ZIP/CRC, reálným Chromium offline/recovery, performance budgety/paritou, quality thresholds a TEST HTTP.
- Immutable Vercel `dpl_EDrD81vXqqZ7qcuq9CQ5ytSk2Wy2` je READY; stable development alias `skoda-spada-git-development-martinspadrnas-projects.vercel.app` na něj ukazuje a veřejný HTTP audit je PASS.
- Release evidence ID `10895743599`, SHA-256 `89f796c3fe06fdc8d81bbb06e3060a1ee130fb4fa0e98f9081c332acd295cd10`; CI proof ID `10895324455`, SHA-256 `ef797c93d64e75894b66adc24ed3493370b3ba314b432cef6ff6c8f82e554791`.
- `main`, produkční Vercel i produkční Supabase se nezměnily. Development rollback je předchozí READY `dpl_5vQSgCPrUrAX7NfatsQ6YSEQjeQi`.

#### Přesně dva dodané úkoly
1. **WhatsApp předvyplněná zpráva:** fyzický screenshot ukázal, že 1.7.108 stále posílala statické `RaK – Report směny diferenciály`. Kořenová příčina nebyla WhatsApp, ale starší vložená kopie helperu v živě načítaném `rak-shift-report-share.js`. 1.7.109 synchronizuje vložený helper při každém canonical buildu a smoke/release gate kontrolují přímo skutečně načítaný runtime. Web Share nyní v živé cestě používá `{ title: caption, text: caption, files: [PNG] }`, kde `caption` vzniká z aktuálního data a směny formuláře.
2. **Datum + Směna:** horní metadata reportu používají shodnou druhou grid řádku 48 px; date shell i select mají explicitní 48px výšku a select nulový margin/border-box, aby byly na iPhonu opticky v jedné rovině.

#### Cílená fyzická kontrola po 1.7.109
- Ve WhatsAppu před odesláním obrázku musí psací pole obsahovat `RaK – Report směny diferenciály · <datum> · směna <R/N/R8/N8>`, nikoli pouze statický text.
- V Reportu směny musí být ovládací prvky `Datum směny` a `Směna` nahoře i dole v jedné rovině.

Procenta 13 oblastí se tímto dvoubodovým UX releasem nemění: **5/13 uzavřených, 8/13 otevřených**.

### NEJNOVĚJŠÍ závěrečné předání – 26. 9. 2026, release 1.7.108

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Dokumentační commit po tomto zápisu může posunout živý HEAD, ale ověřený runtime zůstává na níže uvedeném SHA.

#### Přesný online stav
- Ověřený runtime je **RaK 1.7.108** na SHA `e4b71598c53e95c683011ed6bf26105cb763383a`, build `v1.7.108-whatsapp-caption1`.
- [Actions #374](https://github.com/martinspadrna/RaK/actions/runs/36210915816) je **SUCCESS**. Release prošel dvojitým canonical buildem, npm check, release gates, rollback/ZIP/CRC, reálným Chromium offline/recovery, performance budgety/paritou, quality thresholds a TEST HTTP.
- Immutable Vercel `dpl_5vQSgCPrUrAX7NfatsQ6YSEQjeQi` je READY; stable development alias `skoda-spada-git-development-martinspadrnas-projects.vercel.app` na něj ukazuje a veřejný HTTP audit je PASS.
- Release evidence ID `10895831055`, SHA-256 `1825a84cfae679be63520dccf0664d692dda598d0ae24f41da137e69b0a9a927`; CI proof ID `10896160486`, SHA-256 `8eea18bb7d983901cebbeec3eee5c46b06d0a9f9740bdc27663e67e760c4c4e3`.
- `main`, produkční Vercel i produkční Supabase se nezměnily. Development rollback je předchozí READY `dpl_FGtSwrVHYzTiYw8y24gzdgEaXFeo`.

#### Jediný funkční úkol 1.7.108
- Fyzický iPhone test 1.7.107 potvrdil administrační `×` jako **OK**.
- U WhatsApp reportu vlastník upřesnil požadavek: nejde o share-sheet `title`, ale o **textový popisek přiložený k obrázku v konverzaci WhatsApp**.
- 1.7.108 proto vytváří jeden kontextový řetězec z právě zvoleného data a směny a volá Web Share s `{ title: caption, text: caption, files: [PNG] }`. Regresní test výslovně vyžaduje `text: caption` ve stejném payloadu se souborem.
- Cílená fyzická přejímka zůstává jediná: ve WhatsAppu ověřit, že pod/při obrázku je předvyplněný text `RaK – Report směny diferenciály · <datum> · směna <R/N/R8/N8>`.

Procenta 13 oblastí se tímto jedním UX bodem nemění: **5/13 uzavřených, 8/13 otevřených**.

### NEJNOVĚJŠÍ závěrečné předání – 25. 9. 2026 večer, release 1.7.107

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Dokumentační commit po tomto zápisu může posunout živý HEAD, ale ověřený runtime zůstává na níže uvedeném SHA.

#### Přesný online stav
- Funkční runtime commit je `9b465ae159b357acc2d0adb4ff8497ca849cb277`; nejnovější funkční runtime je **RaK 1.7.107**, build `v1.7.107-calendar-whatsapp1`.
- [Actions #371](https://github.com/martinspadrna/RaK/actions/runs/36183023956) je **SUCCESS** po opakování stejného verify jobu bez změny kódu nebo tolerancí. První pokus selhal pouze na runnerovém performance rozptylu; druhý pokus prošel kompletním dvojitým buildem, npm check, inherited/current gates, rollback/ZIP/CRC, Chromium online/offline/recovery, performance budgets/parity, quality thresholds a TEST HTTP.
- Immutable Vercel deployment `dpl_FGtSwrVHYzTiYw8y24gzdgEaXFeo` je READY na přesném SHA `9b465ae159b357acc2d0adb4ff8497ca849cb277`; stable development alias `skoda-spada-git-development-martinspadrnas-projects.vercel.app` na něj ukazuje a anonymní HTTP audit je PASS.
- Release evidence: ID `10886130192`, SHA-256 `9ddf51403e039aebda645b1a72b528f27eb44f79363a84c255ceaea13e1d934c`. CI proof: ID `10885790730`, SHA-256 `f54115e780b16510fd277b7c219be3af0d10cba96d1e4987db93a59ac9dded73`.
- `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`; produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` na schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční Supabase `bkqamcbkiwumsvelahxr` se nezměnila.
- Nedestruktivní rollback pro development je předchozí READY `dpl_61pqc7RM6LvVd2wb5D3V1t99rni4`.

#### Přesně dva dodané úkoly
1. **Administrace → Kalendáře:** znak `×` má nulový padding, line-height 1 a gridové centrování v celé zachované dotykové ploše; regresní gate hlídá centrování bez změny funkce odebrání.
2. **Report směny → WhatsApp PNG:** Web Share titul se při každém sdílení skládá z právě zvoleného formuláře jako `RaK – Report směny diferenciály · <datum> · směna <R/N/R8/N8>`; statický titul je regresně zakázaný.

Automatická implementace obou bodů je hotová; fyzická iPhone přejímka zůstává cíleně otevřená. Procenta 13 oblastí se proto nemění: **5/13 uzavřených, 8/13 otevřených**.

#### Cílená fyzická kontrola po 1.7.107
- Administrace → Kalendáře: ověřit, že `×` je opravdu opticky uprostřed rámečku.
- Report směny: zvolit konkrétní datum a směnu, klepnout na WhatsApp sdílení PNG a ověřit, že sdílecí titul obsahuje právě toto datum a směnu.

### NEJNOVĚJŠÍ závěrečné předání – 25. 9. 2026 večer, release 1.7.106

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Nový chat musí znovu načíst živý `development`; pokud se od tohoto zápisu nic nezměnilo, výchozí stav je následující.

#### Přesný online stav
- `development` runtime commit je `1a06f785d7821a2f81b7e6bf8e08c1c2b39e7c59` (`feat: retire duplicate roadmap source`), přímý následník dokumentačního HEAD `8b1d7a4fbbcaa3a7a33d25444ea54050eb1078be`.
- Nejnovější funkční runtime je **RaK 1.7.106**; sjednocené metadata jsou `1.7.106`, cache `v1.7.106`, build `v1.7.106-single-handoff1`.
- [Actions #364](https://github.com/martinspadrna/RaK/actions/runs/36178194537) je **SUCCESS**. První verify pokus selhal pouze runnerovým parity šumem; opakovaný verify `108215107530` prošel, stejně jako release-preview `108215983245`.
- Immutable deployment `dpl_61pqc7RM6LvVd2wb5D3V1t99rni4` je READY a stable development alias `skoda-spada-git-development-martinspadrnas-projects.vercel.app` na něj ukazuje. Veřejný stable HTTP audit je PASS bez Vercel auth.
- Release evidence: `rak-release-evidence-1a06f785d7821a2f81b7e6bf8e08c1c2b39e7c59`, ID `10883552322`, SHA-256 `b711012718f5a67b80260be66b40bc73622da7bad8d93b5761118b82c956fc06`.
- CI proof: `rak-ci-proof-1a06f785d7821a2f81b7e6bf8e08c1c2b39e7c59`, ID `10883940105`, SHA-256 `58fb810ecd8ddfd9a93705d184175ad92bd1ba68d730e91a709b5d987000e1ce`.
- Historický isolated-build alias: `rak-170105-isolated-build-1a06f785d7821a2f81b7e6bf8e08c1c2b39e7c59`, ID `10884015100`, SHA-256 `230b94ed874325e322b34086bfab6e070c6448dabd2c87f6eba7fe03c5187754`.
- `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`. Produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` na schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční Supabase `bkqamcbkiwumsvelahxr` se nezměnila.
- Nedestruktivní rollback pro nový development runtime je předchozí READY `dpl_66DFu1zP1aJuSMjkxLckj5v59Ze8`.

#### Co bylo dotaženo – jeden živý plán
- Všechny aktivní runtime/test/backup/workflow odkazy byly převedeny na `RAK_HANDOFF.md`.
- `RAK_PLAN_13.md` byl z živé větve odstraněn; historické zmínky v handoffu/changelogu zůstávají pouze jako auditní historie a negativní release gate hlídá, že se soubor nevrátí do aktivních kontrol.
- `rak-complete-backup.js` nyní uvádí `RAK_HANDOFF.md` a neobsahuje paralelní plán.
- Přidána je release gate 1.7.106, která kontroluje jednotnou identitu release, backup manifest, workflow artefakty a absenci starého plánu v aktivních zdrojích.
- Funkční chování aplikace se proti 1.7.105 nemění; zvýšení na 1.7.106 je nutné kvůli změně backup manifestu/runtime release wiring.

#### Stav 13 bodů
- P0.1 **100 % (5/5)** – uzavřeno.
- P0.2 **100 % (5/5)** – uzavřeno rozhodnutím o přijatém riziku, ne technickou privatizací veřejné rotace.
- P0.3 **80 % (4/5)** – chybí fyzicky soukromě stáhnout a otevřít úplnou zálohu na skutečném iPhonu.
- P0.4 **80 % (4/5)** – chybí reálný iPhone Safari/PWA průchod přihlášení/správy/odvolání zařízení.
- P1.1 **100 % (5/5)** – uzavřeno.
- P1.2 **80 % (4/5)** – chybí reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.
- P1.3 **100 % (6/6)** – uzavřeno.
- P1.4 **100 % (6/6)** – uzavřeno.
- P1.5 **43 % (3/7)** – otevřeno; 23,3MB ZIP nebyl výslovně otevřen a ověřen.
- P2.1 **80 % (4/5)** – chybí opakované fyzické iPhone cold/warm měření.
- P2.2 **60 % (3/5)** – chybí kompletní fyzický screenshotový průchod a proklik rolí.
- P2.3 **63 % (5/8)** – skutečný conflict-rescue a bezpečný dvouzařízení CAS jen v přirozeném bezpečném scénáři.
- P2.4 **67 % (4/6)** – otevřené: konkrétní sanitizovaná příčina problematického konfliktu na iPhonu; skutečné rolové JWT + diagnostika odmítnutých operací bez úniku přihlašovacích údajů.

Bilance zůstává **5/13 uzavřených, 8/13 otevřených**.

#### Nejbližší bezpečný další krok
Další automatizovatelný bod P2.4 jsou skutečné rolové JWT a konkrétní diagnostika odmítnutých operací, ale pouze s bezpečně dostupnými autentizovanými TEST identitami a bez jakéhokoli vypsání tokenů. Fyzické blokátory nepředstírat automatizací: P1.5 otevření ZIPu, P2.1 iPhone cold/warm, P2.2 screenshot/role průchod a P0.4/P1.2 Safari/PWA session/device scénáře. `main`, produkční Vercel ani produkční Supabase neměnit bez nového výslovného souhlasu.

### PŘEDCHOZÍ závěrečné předání – 25. 9. 2026, release 1.7.105

Tato podsekce **přebíjí všechny starší SHA/run/deployment údaje níže**. Nový chat musí znovu načíst živý `development`; pokud se od tohoto zápisu nic nezměnilo, výchozí stav je následující.

#### Přesný online stav
- `development` před tímto dokumentačním zápisem: `7e4643214471bedcf370a062c032bbbd84398e1c` (`feat: sanitize browser runtime diagnostics`), přímý následník předchozího dokumentačního HEAD `5374f06d4dc73762b5816929d050448fbb53c731`.
- Nejnovější funkční runtime je **RaK 1.7.105**; viditelná, technická, modulová, cache, `package.json` a SW verze jsou sjednocené, build je `v1.7.105-diagnostics-privacy1`.
- [Actions #362](https://github.com/martinspadrna/RaK/actions/runs/36173580395) je **SUCCESS** na přesném SHA `7e4643214471bedcf370a062c032bbbd84398e1c`; verify trval 2m 12s, release-preview 1m 27s a celý řetězec 3m 44s.
- Stabilní development Vercel ukazuje na READY `dpl_66DFu1zP1aJuSMjkxLckj5v59Ze8` se stejným SHA. Nedestruktivní rollback je předchozí READY `dpl_3UgeBh1nhC33kQY9Nby2ZnCQkHEY`.
- Veřejná kontrola stabilního aliasu bez Vercel přihlášení vrátila HTTP 200 pro HTML, `rak-release-metadata.js`, `sw.js`, `rak-runtime-diagnostics.js?v=1.7.105` a `supabase-config.js`. Metadata potvrzují 1.7.105/build, konfigurace obsahuje TEST `cgshssdjgzzuprlwnabl` a neobsahuje produkční `bkqamcbkiwumsvelahxr`.
- Release evidence `rak-release-evidence-7e4643214471bedcf370a062c032bbbd84398e1c`: ID `10881124564`, SHA-256 `4d0db58b9fb029d30eabe24da79358a2c84815e8ab9e42a2ffd5e0b018062972`.
- Isolated build: ID `10880919288`, SHA-256 `44f1147b323c79f697803483adbd7b8c7a35174dce441434f0610974dabd29a2`. CI proof: ID `10880709537`, SHA-256 `f4d253a8032ae87ed2a69abda46642dc191fd8aa810cf6e6e7912c6c74eb4a9a`.
- Dva čisté kanonické buildy měly shodný digest `1dce03be4938a7cddba5ecd21fe09bb14c308edc45e89645b213410b3bd4586d` a 161 souborů.
- GitHub `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`. Produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` na schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; veřejná produkční metadata stále vracejí 1.7.83. Produkční Supabase se nezměnila.

#### Co bylo dotaženo – P2.4 privacy audit
P2.4 se zvyšuje na **67 % (4/6)**:
- nový `rak-runtime-diagnostics.js` se načítá hned po release metadatech, před data/vendor/aplikačním runtime a je součástí povinné offline/SW cache;
- konzolové `debug/info/log/warn/error` i globální `error`/`unhandledrejection` cesty vedou přes jediný sanitizátor; syrové `Error`, payloady, reporty, řetězce a číselné identifikátory se nevypisují;
- výstup obsahuje jen pevnou kategorii a omezená metadata typu/kódu/statusu/počtu/počtu klíčů, bez syrových hodnot;
- regresní canary v Node i skutečném Chromiu vkládá fiktivní bearer/JWT-like token, OS-like číslo, jméno a obsah rozpisu; nic z toho se v konzoli neobjevilo;
- helper nemá zapisovací/síťové API (`localStorage`, `sessionStorage`, `fetch`, XHR, beacon, FileReader ani Blob) a nemění soukromý owner complete backup ani vědomě odesílaný bug report se screenshotem;
- nový release gate 1.7.105 hlídá pořadí načtení, offline cache, jednotnou verzi, privátní kontexty a zákaz návratu syrových diagnostických hodnot. Historický 1.7.104 gate zůstává minimálním milníkem.

Souhrnný lokální důkaz: 205/205 zděděných testů + 22/22 infrastrukturních/privacy testů PASS, reálný Chromium canary PASS, canonical offline/reconnect/SW PASS. CI stejného SHA vše zopakovalo před deploymentem. P2.4 privacy checkbox je proto splněný, nikoli jen staticky odhadnutý.

#### Výkon 1.7.105
- Pětikolová parita vůči immutable 1.7.69 prošla bez změny tolerancí: `startupReady` P50 **332→314 ms**, P95 **410→437 ms**; FCP P50 **240→260 ms**, P95 **348→312 ms**. Diagnostický wall-time P50 **610→932 ms**, P95 **806→960 ms** není first-usable gate.
- Tříkolové budgety rovněž prošly: cold mobile P50/P95 **959/991 ms**, offline reload **764/800 ms**, online recovery **318/504 ms**; startup core +1,7 % a root JS/CSS surface +0,2 % proti uložené baseline.

#### Aktuální stav 13 bodů
- P0.1 **100 % (5/5)** – uzavřeno.
- P0.2 **100 % (5/5)** – uzavřeno rozhodnutím o přijatém riziku, ne technickou privatizací veřejné rotace.
- P0.3 **80 % (4/5)** – chybí fyzicky soukromě stáhnout a otevřít úplnou zálohu na skutečném iPhonu.
- P0.4 **80 % (4/5)** – chybí reálný iPhone Safari/PWA průchod přihlášení/správy/odvolání zařízení.
- P1.1 **100 % (5/5)** – uzavřeno.
- P1.2 **80 % (4/5)** – chybí reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.
- P1.3 **100 % (6/6)** – uzavřeno.
- P1.4 **100 % (6/6)** – uzavřeno.
- P1.5 **43 % (3/7)** – otevřeno; 23,3MB ZIP nebyl výslovně otevřen a ověřen.
- P2.1 **80 % (4/5)** – chybí opakované fyzické iPhone cold/warm měření.
- P2.2 **60 % (3/5)** – chybí kompletní fyzický screenshotový průchod a proklik rolí.
- P2.3 **63 % (5/8)** – skutečný conflict-rescue a bezpečný dvouzařízení CAS jen v přirozeném bezpečném scénáři.
- P2.4 **67 % (4/6)** – otevřené: konkrétní sanitizovaná příčina problematického konfliktu na iPhonu; skutečné rolové JWT + diagnostika odmítnutých operací bez úniku přihlašovacích údajů.

Bilance zůstává **5/13 uzavřených, 8/13 otevřených**.

#### Nejbližší bezpečný další krok
Další automatizovatelný bod P2.4 jsou skutečné rolové JWT a konkrétní diagnostika odmítnutých operací, ale pouze s bezpečně dostupnými autentizovanými TEST identitami a bez jakéhokoli vypsání tokenů. Fyzické blokátory nepředstírat automatizací: P1.5 otevření ZIPu, P2.1 iPhone cold/warm, P2.2 screenshot/role průchod a P0.4/P1.2 Safari/PWA session/device scénáře. `main`, produkční Vercel ani produkční Supabase neměnit bez nového výslovného souhlasu.

### PŘEDCHOZÍ závěrečné předání vlákna – 25. 9. 2026 večer

Tato podsekce **přebíjí starší SHA/run/deployment údaje níže v historické části tohoto předání**. Nový chat má vždy nejprve načíst živý `development`, ale pokud se od tohoto zápisu nic nezměnilo, výchozí stav je následující.

#### Přesný online stav při ukončení vlákna
- `development` před tímto dokumentačním zápisem: `e5a953aadafc8e66e367709e669d241638a60900` (`docs: record P2.4 fail-closed quality thresholds`).
- Nejnovější **funkční runtime zůstává 1.7.104**. Po fyzické přejímce 1.7.104 nebyla v tomto vlákně provedena další runtime změna.
- Přesný zelený a nasazený test-only runtime SHA je `13f456b89f949c5f5d39a9966b8e6c26921ff349`.
- [Actions #359](https://github.com/martinspadrna/RaK/actions/runs/36164987203) je **SUCCESS**.
- Stabilní development Vercel ukazuje na `dpl_3UgeBh1nhC33kQY9Nby2ZnCQkHEY`, READY, SHA `13f456b89f949c5f5d39a9966b8e6c26921ff349`.
- [Actions #360](https://github.com/martinspadrna/RaK/actions/runs/36166798917) je **SUCCESS** pro následný dokumentační commit `e5a953aadafc8e66e367709e669d241638a60900`; release-preview správně provedl docs-only **skip**, takže žádný nový runtime deployment nevznikl.
- GitHub `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`.
- Produkční Vercel zůstává `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj`, READY, na dříve schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`.
- TEST Supabase je `cgshssdjgzzuprlwnabl`; produkční Supabase je `bkqamcbkiwumsvelahxr`. V tomto vlákně po předchozím schváleném produkčním předání **neproběhl žádný nový produkční zápis**.
- Produkční `main` a skutečně nasazený produkční SHA jsou úmyslně rozdílné; bez nového výslovného souhlasu vlastníka je automaticky nesrovnávat.

#### Co bylo v tomto vlákně nově dotaženo – P2.1
P2.1 se posunulo na **80 % (4/5)**. Přímá performance/first-render parita proti immutable 1.7.69 je nyní skutečně reprodukovatelná:
- baseline: 1.7.69 / SHA `1693c8631c13d6e381e44a96810a55140ad6aa62`;
- historický build běží z detached Git worktree a dvakrát provede dobový `vercel-build`;
- historickému buildu se explicitně předává jeho vlastní `GITHUB_SHA` / Vercel commit identita, aby staré integritní pojistky ověřovaly správný immutable commit;
- současný build je ověřován přes kanonický `rak-release-metadata.js`, ne přes historický způsob v `supabase-config.js`;
- finální metodika používá **5 střídavých kol**, medián (P50), P95 guard a omezenou baseline-noise toleranci přes MAD; `wallReadyMs` je pouze diagnostika, nikoli hlavní pass/fail app metrika.

Finální #359 naměřil:
- `startupReady` baseline P50 **443 ms**, current **444 ms** (+0,2 %); P95 **499 → 519 ms**;
- FCP baseline P50 **312 ms**, current **332 ms** (+6,4 %); P95 **320 → 356 ms**;
- obě hlavní metriky prošly předem omezenými median/P95 guardy;
- diagnostický `wallReadyMs` je na runneru horší (P50 796 → 1350 ms), ale obsahuje režii lokálního serveru/Chromia a záměrně se nevydává za čistou aplikační metriku.

Důležité mezikroky, aby je nový chat zbytečně neopakoval:
- #352: detached historický build se rozběhl, ale staré integritní testy dostaly SHA dnešního commitu místo SHA 1.7.69.
- #353: historická 1.7.69 se už opravdu sestavila; test se zastavil jen na zastaralé kontrole dnešní verze v `supabase-config.js`.
- #354: přímá 3×3 parita byla zelená, ale jeden hlučný FCP vzorek ukázal, že „P95 ze tří“ je příliš křehké; checkbox se tehdy vědomě nezavřel.
- #355: první pokus o robustnější statistiku spadl na statickém kontraktu, který ještě čekal `wallReadyMs` mezi hlavními metrikami; nešlo o runtime/performance selhání.
- finální robustní varianta na `13f456b8…` / #359 je zelená a P2.1 checkbox parity je uzavřený.

Jediný otevřený checkbox P2.1 je nyní **opakované skutečné iPhone Safari/PWA cold/warm měření**.

#### Co bylo v tomto vlákně nově dotaženo – P2.4
P2.4 se posunulo na **50 % (3/6)** díky jednotnému fail-closed quality gate:
- `tools/quality-thresholds-17104.mjs` běží v každém development CI;
- `warningsMayPass=false` – pouhé upozornění nikdy není PASS;
- performance budget, network/SW resilience a performance parity musí být PASS na **stejném SHA**;
- falešný konflikt po čistém recovery musí být **0**;
- zápis bez ověřené baseline musí udělat **0 síťových zápisů**;
- stale machine/month CAS musí skončit konfliktem, ne tichým přijetím novější revize;
- `silentRevisionAdoptions=0`;
- legacy v2 mutation RPC reference = **0**;
- stale server revize musí používat SQLSTATE `40001` a konkrétní aplikační conflict kódy.

#359 skutečně vytvořil `rak-quality-threshold-evidence-v1` s PASS a těmito nulovými/požadovanými hodnotami.

#### NOVÝ NÁLEZ – další práce P2.4, dosud **NEIMPLEMENTOVÁNO**
Při zahájeném privacy auditu browser runtime bylo zjištěno, že řada runtime cest stále používá `console.warn(..., err)`, `console.error(..., err)` nebo loguje celý diagnostický `report`. Týká se mimo jiné bootu, navigace, reconnectu/SW, syncu, admin reportů, dashboardu, appearance syncu a health auditů. Neexistuje jeden společný `sanitizeError` / safe logger.

Tento nález **není ještě opravený a privacy checkbox P2.4 zůstává otevřený**. Poslední plán pro další chat:
1. Nezavírat checkbox pouhým statickým testem.
2. Udělat kořenovou runtime opravu jako nový funkční release **1.7.105** (pokud mezitím nevznikla jiná funkční verze).
3. Přidat jeden centrální browserový diagnostický sanitizátor/logger; první pevný štítek/kategorie může zůstat, ale syrové `Error`, payloady a celé reporty nesmějí jít přímo do console kanálu.
4. Objektové hodnoty logovat pouze jako bezpečná agregovaná metadata (např. typ/kód/status/počty/klíče), nikdy syrové hodnoty.
5. Redigovat bearer/JWT/token-like řetězce a identifikační/rozpisové canary hodnoty.
6. Přidat regresní canary test, který do diagnostiky vloží **fiktivní** token, OS-like číslo, jméno a obsah rozpisu; nic z toho se nesmí objevit ve veřejném/logovacím výstupu.
7. Soukromý owner complete backup a uživatelem vědomě odeslaný bug report se screenshotem jsou **určené soukromé kontexty** a nesmějí být tímto loggerem poškozené; audit má hlídat, že se jejich obsah nepřelévá do console/telemetrie.
8. Nový helper musí být načten před běžným runtime a zahrnut do PWA/offline cache, pokud je pro runtime start povinný.
9. Funkční release musí jednou sjednotit metadata `1.7.105` (display/technical/module/cache/package/SW). Historické release gate 1.7.104 zachovat jako minimální milník; nový 1.7.105 gate má vyžadovat aktuální identitu.
10. Performance parity nástroj při 1.7.105 aktualizovat z `current-1.7.104` na `current-1.7.105`, bez změny immutable baseline 1.7.69 a bez oslabení tolerancí.
11. Po zeleném exact-SHA CI teprve nechat pipeline nasadit development preview a znovu ověřit `main`/produkci beze změny.
12. Teprve pokud souhrnný privacy audit skutečně pokryje logy, reporty, telemetrii, screenshoty a exporty mimo výslovně soukromý kontext, zaškrtnout příslušný P2.4 checkbox a zvýšit P2.4 z 50 % na **67 % (4/6)**.

#### Aktuální stav 13 bodů při předání
- P0.1 **100 % (5/5)** – uzavřeno.
- P0.2 **100 % (5/5)** – uzavřeno rozhodnutím o přijatém riziku, ne technickou privatizací veřejné rotace.
- P0.3 **80 % (4/5)** – chybí fyzicky soukromě stáhnout a otevřít úplnou zálohu na skutečném iPhonu.
- P0.4 **80 % (4/5)** – chybí reálný iPhone Safari/PWA průchod přihlášení/správy/odvolání zařízení.
- P1.1 **100 % (5/5)** – uzavřeno.
- P1.2 **80 % (4/5)** – chybí reálný Safari/PWA test relací, znovuotevření, offline→online a UX odmítnutí.
- P1.3 **100 % (6/6)** – uzavřeno.
- P1.4 **100 % (6/6)** – uzavřeno.
- P1.5 **43 % (3/7)** – otevřeno; mimo jiné nebylo výslovně potvrzeno, že nabídnutý 23,3MB ZIP úplné zálohy byl stažen a otevřen/ověřen.
- P2.1 **80 % (4/5)** – chybí jen opakované fyzické iPhone cold/warm měření.
- P2.2 **60 % (3/5)** – chybí kompletní fyzický screenshotový průchod light/dark + safe-area/klávesnice/spodní navigace/editace/export a proklik owner/admin/deputy/user.
- P2.3 **63 % (5/8)** – skutečný conflict-rescue workflow a bezpečný dvouzařízení CAS se mají testovat jen při reálném bezpečném scénáři; nevyrábět umělý destruktivní konflikt.
- P2.4 **50 % (3/6)** – otevřené: konkrétní sanitizovaná příčina problematického konfliktu na iPhonu; úplný privacy audit logů/reportů/telemetrie/screenshotů/exportů; skutečné rolové JWT + diagnostika odmítnutých operací bez úniku přihlašovacích údajů.

Bilance zůstává **5/13 uzavřených, 8/13 otevřených**.

#### Co se v novém chatu nesmí dělat
- nepoužívat lokální kopii RaK;
- neměnit `main`, produkční Vercel ani produkční Supabase bez nového výslovného souhlasu;
- před každým zápisem znovu načíst živý SHA `development` a commitnout jen jako jeho přímý následník bez force;
- neoslabovat testy, budgety ani conflict gates jen proto, aby CI zezelenalo;
- nemazat Safari/PWA/localStorage/CacheStorage/frontu/uživatelská data jako univerzální opravu;
- nevypisovat tokeny, JWT, klíče, hesla, osobní čísla ani skutečné soukromé payloady do logu/chatu;
- nevytvářet placené Supabase/Vercel řešení bez souhlasu;
- dokumentační/test-only změna nezvyšuje runtime verzi; funkční release zvyšuje sjednocenou verzi právě jednou;
- `RAK_HANDOFF.md` je jediný živý plán. Bývalé `RAK_PLAN_13.md` se nesmí znovu vytvořit ani přidat do runtime/backup manifestu.


Vlastník ukončuje toto vlákno kvůli příliš pomalému průběhu a chce pokračovat v novém chatu. **Nový chat musí jako první krok online načíst živý `development` a tento celý dokument; nesmí pokračovat ze staré konverzační paměti nebo starého SHA.**

### Aktualizace po pokračování v novém chatu
- Fyzický retest 1.7.103 proběhl 25. 9. 2026. PASS: picker Rozpisů; OS sloupec +50 %; `+/−` v kalkulačce; landscape bez textu pouze se správným login rakem; úplná záloha došla až k nabídce stažení 23,3 MB. U zálohy nebylo výslovně potvrzeno otevření ZIPu.
- PARTIAL/FAIL na 1.7.103: v Nastavení korekcí bylo `+/−` jen u části polí Frézek/Brusů; Report měl na skutečném iPhonu stále chybějící/oříznutý pravý okraj data.
- Tyto dva nálezy opravuje zelená a nasazená **1.7.104**. Přesný zelený/nasazený SHA je `11a0fcf4fee1940e0d452205ffec918a196b2709`, Actions #337 SUCCESS, Vercel `dpl_EXHQZaxfG62MWEG3FjhP7YQkBPQL` READY.
- Fyzický iPhone retest 1.7.104 je nyní **PASS pro oba zbývající body**: kompletní `+/−` v Nastavení korekcí i celý rámeček/picker data v Reportu směny. Z iPhone-regresního balíku 1.7.103/1.7.104 už nezůstává otevřený žádný bod. Další otevřené fyzické kroky patří jiným oblastem: otevření staženého 23,3MB ZIPu úplné zálohy, případný skutečný konfliktní workflow 1.7.101 a bezpečný dvouzařízení CAS 1.7.102.

### Přesný bod předání
- aktuální ověřený runtime je **RaK 1.7.104**;
- přesný zelený a nasazený test-only SHA: `b7dc1ff5c83301d6b3964ee6af37d0ac3618b6c0`; funkční základ balíku zůstává `c3914ec9f2c5d264c7118d1bceffb8c7339c5477`;
- [Actions #349](https://github.com/martinspadrna/RaK/actions/runs/36147062616) je SUCCESS, development Vercel `dpl_4JUoxabTT2eR2uFmgy5V3v7bHfVE` je READY; P2.1 performance i network/SW evidence jsou zelené;
- metadata stabilního development aliasu jsou `1.7.104` / cache `v1.7.104` / build `v1.7.104-iphone-retest2`;
- TEST Supabase `cgshssdjgzzuprlwnabl` zůstává oddělená; produkční Supabase `bkqamcbkiwumsvelahxr` se nesmí měnit bez nového výslovného souhlasu;
- GitHub `main` je `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c`, ale produkční Vercel stále běží na dříve schváleném SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`; tuto odlišnost neskrývat ani automaticky „dorovnávat“;
- commit `e619406f104a8983f17d6a6027f2271db049212f` srovnal kanonickou historii Supabase migrací; starší neprodukční migrace jsou pod `supabase/history/non-production-migrations/`.

### Poslední fyzická iPhone zpětná vazba vlastníka
Na 1.7.99 vlastník nahlásil:
1. nabídka/picker v Rozpisech se někdy otevřel úplně jinde;
2. v Pracovnících měl být sloupec jmen účtů mimo rozpis přibližně 2× širší;
3. provozní admin bod byl OK;
4. `+/−` u Korekce brusů nebylo v kalkulačce ani v Nastavení korekcí;
5. Dashboard psal „89 do Vánocům“ místo „89 do Vánoc“; „O aplikaci“ bylo OK;
6. landscape zobrazoval jiného raka; vlastník chce přesně raka z přihlašovací obrazovky, který má v sobě ozubené kolo;
7. datum v Reportu směny bylo pořád moc široké a bez pravého okraje;
8. úplná záloha skončila chybou „can't find end of central directory: is this a zip file? ...“;
9. textové hlášení chyby bez screenshotu bylo OK;
10. kompletní screenshotový scénář hlášení chyby byl OK.

### Co už je po této zpětné vazbě implementováno
Zelená **1.7.100** na SHA `ae6719947736dbdd678a411ba7420a3d7a906693`, Actions #323 SUCCESS, obsahuje kořenové opravy bodů **1, 2, 4, 5, 6, 7 a 8**: VisualViewport ukotvení pickeru, přibližně 2× širší sloupec jmen účtů mimo rozpis, explicitní +/− u Brusů i admin korekcí, text „do Vánoc“, stejné login mascot assety s ozubeným kolem v landscape, užší datum s explicitním pravým okrajem a iPhone-safe úplný ZIP bez vnořeného JSZip reparsování.

**Fyzický retest těchto oprav na 1.7.102 už proběhl.** Potvrdil jméno účtu, `do Vánoc` a správného raka; znovu selhal picker, +/− Brusů, Report a úplná záloha. Tyto reprodukované závady a dvě nové vizuální úpravy řeší 1.7.103. Další chat je nesmí znovu implementovat podle historického FAIL seznamu; nejdřív má fyzicky retestovat aktuální 1.7.103.

### Co následovalo podle plánu
- **1.7.101:** bezpečné workflow jediné konkrétní konfliktní položky – přesný privátní export původních bajtů, read-only kontrola serveru, explicitní typ rozpis/stroj/ostatní a odstranění právě jedné lokální položky bez přepisu online dat.
- **1.7.102:** serverově atomický CAS/revize pro nastavení strojů a měsíční rozpisy. Stale zápis je odmítnut SQLSTATE `40001`, klient bez ověřené baseline vůbec nezapisuje a legacy v2 mutation RPC po TEST cutoveru pouze fail-closed odmítají starý klient.
- Automatické testy jsou zelené, ale **P2.3 zůstává 63 % (5/8)**, protože široká akceptace vyžaduje fyzický skutečný konflikt a bezpečný dvouzařízení CAS scénář.

### Doporučené pořadí pro nový chat
1. Online načíst živý SHA `development` a celý tento dokument. Pokud je HEAD novější než dokumentační bod tohoto předání, nejdřív přečíst všechny nové commity a jejich Actions.
2. Ověřit, že aktuální development runtime je stále 1.7.104 nebo zjistit novější funkční release; stabilní alias při tomto předání běží na `13f456b89f949c5f5d39a9966b8e6c26921ff349` / `dpl_3UgeBh1nhC33kQY9Nby2ZnCQkHEY`.
3. Ověřit, že `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c` a produkce `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` / `de443b771bb7e7dd5fefa498883fdd220a78f07d`, pokud vlastník mezitím neschválil konkrétní produkční krok.
4. Priorita pro čistě technickou další práci je **P2.4 privacy audit** podle nejnovější závěrečné podsekce výše. Zjištěné syrové browserové `console.warn/error(..., err/report)` cesty zatím nejsou opravené; neoznačovat privacy checkbox za splněný.
5. Pokud se privacy oprava opravdu implementuje jako runtime změna, použít další sjednocenou verzi (při tomto předání 1.7.105), jeden tematický atomický commit, stávající fail-closed CI a deployment až po exact-SHA SUCCESS.
6. Po privacy balíku lze pokračovat druhým automatizovatelným P2.4 bodem – skutečné rolové JWT a diagnostika odmítnutých operací bez úniku přihlašovacích údajů – jen pokud jsou dostupné bezpečné autentizované testovací identity; tokeny nikdy nevypisovat.
7. Fyzické blokátory nepředstírat automatizací: P1.5 otevření 23,3MB ZIPu; P2.1 iPhone cold/warm; P2.2 kompletní screenshot/role průchod; P0.4/P1.2 Safari/PWA session/device scénáře.
8. Conflict-rescue 1.7.101 a CAS 1.7.102 testovat jen při skutečném nebo bezpečném dvouzařízení scénáři. Nezakládat umělý destruktivní konflikt jen kvůli procentům.
9. Po každém větším balíku aktualizovat tento dokument, všech 13 procent, exact SHA, Actions, Vercel a potřebný iPhone test; `RAK_HANDOFF.md` je jediný kanonický plán.

## Stav fyzické přejímky a fáze B

RaK 1.7.82 prošla 23. 9. 2026 fyzickým iPhone testem bez mazání dat: online přihlášení a TEST fungovaly, cold offline start načetl Dashboard, Rotaci i rozpis, návrat online fungoval bez restartu a falešný konflikt se nevrátil. Tuto závadu znovu neotvírat bez nové reprodukovatelné regrese.

**RaK 1.7.102 – fyzický retest oprav 1.7.100 proběhl 25. 9. 2026.** PASS: Pracovníci – jméno účtu mimo rozpis je přibližně 2× širší; Dashboard přesně `do Vánoc`; landscape používá správného login raka s ozubeným kolem. FAIL: picker Rozpisů byl většinou mimo viditelnou oblast; +/− nebylo v kalkulačce ani Nastavení korekcí Brusů; datum Reportu zůstalo příliš široké/bez správného pravého okraje; úplná záloha skončila bezpečným hlášením „Zdrojový Git archiv se nestáhl celý“. Nové požadavky vlastníka: OS sloupec +50 % a landscape bez textu s rakem přes celý viewport.

**RaK 1.7.103 – fyzický retest proběhl 25. 9. 2026.** PASS: picker Rozpisů; OS sloupec +50 %; `+/−` v kalkulačce; landscape bez textu pouze se správným login rakem; úplná záloha došla k nabídce stažení 23,3 MB. PARTIAL/FAIL: v Nastavení korekcí bylo `+/−` jen u části polí Frézek a Brusů; Report směny měl na screenshotu stále chybějící/oříznutý pravý okraj data. U zálohy nebylo výslovně potvrzeno otevření staženého ZIPu, takže příslušný P1.5 checkbox zůstává otevřený.

**RaK 1.7.104 – fyzický retest PASS 25. 9. 2026.** Vlastník potvrdil oba zbývající body: **1) Nastavení korekcí OK** – kompletní `+/−` u Frézek i Brusů; **2) Report směny OK** – datum má správný celý rámeček a fungující picker. Tím je konkrétní iPhone-regresní balík 1.7.103/1.7.104 fyzicky uzavřen. Automatický Chromium důkaz na SHA `11a0fcf4fee1940e0d452205ffec918a196b2709` nadále dokládá 124px datum, 1px pravý okraj, 10px mezeru a šest admin znamének 48×44 px.

Bod 1.7.101 se testuje jen při existenci skutečného zadrženého konfliktu: soukromě exportovat jednu položku, provést read-only kontrolu, potvrdit důsledek a ověřit, že se odstranila právě jedna lokální položka, server se nepřepsal a ostatní fronta zůstala. CAS 1.7.102 ověřit při bezpečném přirozeném dvouzařízení scénáři: obě zařízení načtou stejnou baseline, první uloží změnu a stale druhé uložení musí být odmítnuté s požadavkem na nové online načtení; novější serverová data se nesmějí tiše přepsat. Bez skutečného konfliktu nebo bezpečného dvouzařízení scénáře nevytvářet umělý destruktivní stav jen kvůli checkboxu.
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

**Aktuální online stav k 25. 9. 2026:** nejnovější TEST runtime je 1.7.105; přesný zelený a nasazený SHA je `7e4643214471bedcf370a062c032bbbd84398e1c`, [Actions #362](https://github.com/martinspadrna/RaK/actions/runs/36173580395) SUCCESS a development Vercel `dpl_66DFu1zP1aJuSMjkxLckj5v59Ze8` READY. `main` zůstává `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c` a produkce `dpl_3Sn4PbVPMSAF2yrUTXKphoDEZ6tj` / SHA `de443b771bb7e7dd5fefa498883fdd220a78f07d`. P2.1 je 80 % (4/5): pětikolová parita 1.7.69→1.7.105 prošla; `startupReady` P50 332→314 ms a FCP P50 240→260 ms, P95 guardy rovněž prošly. P2.4 je 67 % (4/6): vedle jednotného fail-closed quality gate nyní skutečný Node/Chromium privacy canary dokládá centrální sanitizaci browserových diagnostik bez úniku token-like řetězců, OS-like čísla, jména či rozpisu a bez zásahu do soukromého owner backupu/bug reportu. P1.5 zůstává 43 % do pozdějšího otevření 23,3MB ZIPu, P2.3 63 % do skutečného konfliktního/dvouzařízení scénáře.

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
| P2.1 | Výkon startu PWA | **80 % (4/5)** | Otevřeno |
| P2.2 | Rozložení, DOM, CSS a interakce | **60 % (3/5)** | Otevřeno |
| P2.3 | Offline, fronta, verze a konflikty | **63 % (5/8)** | **Otevřeno; fyzický iPhone acceptance na 1.7.82 prošel, zbývá konfliktní workflow a serverový CAS** |
| P2.4 | Bezpečná diagnostika a průběžná kvalita | **67 % (4/6)** | Otevřeno |

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

**Release 1.7.124 – heslo 6 znaků:** klientské validace pro nový admin účet i změnu owner/vlastního admin hesla používají minimum 6 a maximum 128 znaků; stejné tři validační cesty jsou nasazené v TEST `rak-admin-users` v6. Současné heslo se před změnou dál serverově ověřuje přes Auth a správa jiných účtů zůstává owner-only. Automatický gate 1.7.124 je PASS a vlastník fyzicky potvrdil tento konkrétní 6znakový podúkol jako **PASS („ok“) 26. 9. 2026**. Širší P1.2 zůstává 80 %, protože stále chybí samostatný fyzický Safari/PWA session/device scénář.


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

**Aktuální provozní stav úplné zálohy:** timeout DB části byl kořenově opraven v 1.7.98 a 1.7.103 odstranila 145bajtový Vercel placeholder tím, že publikuje a před/po deployi fail-closed ověřuje skutečný buildový Git ZIP. Fyzický iPhone retest 1.7.103 potvrdil, že úplná owner záloha už dojde k nabídce stažení souboru o velikosti **23,3 MB**; původní chyba „Zdrojový Git archiv se nestáhl celý“ se nevrátila. Vlastník ale výslovně nepotvrdil, že stažený ZIP následně otevřel a ověřil jeho integritu, proto checkbox „Fyzicky stáhnout a soukromě otevřít ZIP na iPhonu“ zůstává otevřený a P1.5 zůstává **43 % (3/7)**.

**Dokončení:** lze doložit, že jsme obnovili použitelnou oddělenou instanci, ne pouze vygenerovali ZIP nebo spustili transakci ROLLBACK.

## P2 · Mobil, offline a provozní kvalita

### P2.1 – Výkon a start PWA · **80 % (4/5)**

- [x] Automatizovaný Chromium start a tři nezávislá měření v CI.
- [ ] Opakovaně změřit skutečný iPhone Safari/PWA na studeném a teplém startu.
- [x] Stanovit a vynucovat smysluplné časové/velikostní rozpočty se záznamem baseline a odchylek.
- [x] Změřit offline start, návrat online, aktualizaci SW a chování při pomalé síti.
- [x] Po stabilizaci architektury potvrdit, že výkon a první vykreslení po migraci nemají regresi vůči 1.7.69.

**Důkaz P2.1 po 1.7.104:** start z 1.7.84 dál umí před Supabase obnovit ověřenou lokální Rotaci a měřit první použitelný render. #347 zavedl fail-closed časové/velikostní budgety s baseline; #349 doložil skutečný Chromium offline start, reconnect, pomalou síť a celý service-worker waiting → potvrzení → aktivace lifecycle. Následný parity balík `3bf0ef463a9a85c024d514cbcf3f6209937387d2` → `5921ef3bcd2af7640a91db12ba26208f3d4d4fca` → `e2ec700467bf01edadb290ace918af6d5f10c67a` → `f27ceab3ab8dd3badfeb3a5e504336f92268d0b2` → `d6d07162847ccae6e5c63eddfc15917310aeb73d` → `698a6f2ac9b6e2236b3b0714aaeaf3c9d3c99488` reprodukuje immutable 1.7.69 z detached Git worktree, provede její historický dvouprůchodový build a porovnává ji na stejném runneru a 390×844 viewportu s dnešním kanonickým buildem. Finální [Actions #356](https://github.com/martinspadrna/RaK/actions/runs/36163194538) provedl pět střídavých kol každé verze. `startupReady`: baseline medián/P95 408/443 ms, current 402/411 ms (medián −1,5 %, P95 −32 ms). FCP: baseline 300/328 ms, current 312/360 ms (medián +4 %, pod 10% limitem; P95 +32 ms, pod 75ms guardem). Diagnostický full-load wall-time je horší: baseline medián/P95 790/810 ms, current 1330/1396 ms; tento údaj se neskrývá, ale není first-usable gate, protože `startupReady` i FCP jsou měřené dříve a přímo odpovídají akceptačnímu bodu prvního použitelného renderu/startu. Tím je čtvrtý checkbox doložen a P2.1 se zvyšuje na **80 % (4/5)**. Jediný otevřený bod je opakované 5× cold/warm měření skutečného iPhonu Safari/PWA.

**Dokončení:** opakovatelné měření a nepřekročené prahy na reálném telefonu i CI.

### P2.2 – Rozložení, CSS, DOM a interakce · **60 % (3/5)**

- [x] Chromium ověřuje Home, navigaci, mobilní viewport a offline návrat.
- [x] Existují regresní kontroly geometrie TO/MO, absence a přetečení pro emulované rozměry.
- [ ] Reálné iPhone screenshoty světlého/tmavého režimu, safe-area, klávesnice, spodní navigace, editace tabulek a exportu.
- [ ] Proklik rolí owner/admin/deputy/běžný uživatel; ověřit DOM události a skutečné interakce, ne jen přítomnost textu v HTML.
- [x] Porovnat před/po migraci kritické obrazovky a přidat stabilní regresní testy bez křehkých textových výřezů.

**Důkaz P2.2 po 1.7.104:** fyzický iPhone retest uzavřel konkrétní regresní balík picker/OS/landscape/kalkulačka/admin korekce/Report. Test-only následníky `5f1d97d6481ba2bfdb3518980f75f109afe69466` → `6d5c0a3b55a5e2084ddd7ea4b3f461491ed146c4` → `0d807337dac50d610fad83b80ee35697d2f1c3d6` doplnily stabilní před/po UI paritu bez screenshotových pixelů a českých textových výřezů. CI čte baseline přímo přes `git show` z immutable 1.7.69, ověřuje stejné kritické page-rooty a semantické mapování spodní navigace a následně měří současný kanonický shell přes CDP na přesných 390×844 a 430×932. Actions #342 prošel bez horizontálního overflow na všech osmi kritických rootech; tím je třetí checkbox doložen a P2.2 se zvyšuje na **60 % (3/5)**. Otevřené zůstávají pouze kompletní fyzický screenshotový průchod a role owner/admin/deputy/běžný uživatel.

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

**Stav po 1.7.102:** mobilní offline/reconnect závada zůstává fyzicky uzavřená z 1.7.82. Konfliktní workflow z 1.7.101 i serverový CAS z 1.7.102 jsou implementované a automaticky ověřené: přesný privátní export jediné položky, read-only server check, raw-splice odstranění jedné položky, explicitní typy rozpis/stroj/ostatní a revizní CAS pro nastavení strojů i měsíční rozpis. Stale serverová revize vrací `40001` a nový klient bez ověřené baseline vůbec nezapisuje; legacy v2 mutation RPC po cutoveru pouze fail-closed odmítají starý klient. Široké checkboxy ale výslovně požadují fyzický skutečný konflikt a konkurenci dvou zařízení, proto **P2.3 zůstává 63 % (5/8)** do tohoto testu.

**Důkaz 1.7.84 bez změny procenta:** vzhled účtu už nepoužívá starý tunel přes `game_stats`; TEST má samostatné account-scoped úložiště s revizí a compare-and-swap RPC. Rollback-only SQL prokázal odmítnutí stale zápisu, následný zápis na správné revizi i readback; fronta vzhledu při novější serverové revizi nevytváří globální konflikt. Jde ale jen o vzhled účtu, nikoli o obecný CAS všech relevantních zápisů, a fyzický scénář dvou zařízení ještě čeká. Široká akceptační položka CAS proto zůstává nezaškrtnutá a P2.3 zůstává **63 % (5/8)**.

### P2.4 – Diagnostika, soukromí telemetrie a nepřetržitá kvalita · **67 % (4/6)**

- [x] Existuje čtecí diagnostika Auth, typů/počtů fronty a základní kategorizace chyb bez potřeby vystavovat syrové payloady.
- [x] Chromium/offline kontroly a měření výkonu dávají opakovatelné základní provozní signály.
- [ ] Zviditelnit konkrétní sanitizovanou příčinu konfliktní hlášky na problematickém iPhonu; rozlišit stav aplikace, fronty a chybu úložiště.
- [x] Auditovat, že logy, reporty, telemetrie, screenshoty a exporty neobsahují tokeny, OS čísla, jména nebo obsah rozpisů mimo určený soukromý kontext.
- [ ] Zajistit verifikaci skutečných rolových JWT a konkrétní diagnostiku odmítnutých operací bez prozrazení přihlašovacích údajů.
- [x] Zavést měřitelné výkonnostní/konfliktní prahy, periodické regresní testy a jednoznačné výsledky PASS/FAIL; pouhé upozornění nesmí být hlášeno jako úspěch.

**Důkaz P2.4 – quality thresholds:** test-only větev 1.7.104 na SHA `13f456b89f949c5f5d39a9966b8e6c26921ff349` prošla [Actions #359](https://github.com/martinspadrna/RaK/actions/runs/36164987203) SUCCESS. Povinný gate `tools/quality-thresholds-17104.mjs` běží při každém development CI a vyžaduje na stejném SHA PASS z performance budgetu, network/SW resilience i parity 1.7.69. Konfigurace má `warningsMayPass=false` a tvrdé konfliktní limity: falešný konflikt po čistém recovery 0, zápisy bez ověřené baseline 0, silent revision adoption 0 a legacy v2 mutation RPC reference 0; stale CAS musí vrátit SQLSTATE `40001` a konkrétní aplikační conflict kódy. #359 skutečně zapsal `rak-quality-threshold-evidence-v1` s PASS: clean recovery conflict count 0, machine/month unknown-baseline network writes 0/0, stale RPC 1/1, silent revision adoptions 0, legacy v2 refs 0 a oba očekávané conflict kódy. Warning ani pouhé upozornění nemůže gate splnit. Tím je šestý checkbox doložen a P2.4 se zvyšuje na **50 % (3/6)**. Otevřené zůstávají konkrétní sanitizovaná příčina konfliktu na problematickém iPhonu, úplný privacy audit logů/reportů/screenshotů/exportů a skutečné rolové JWT s diagnostikou odmítnutých operací.

**Důkaz P2.4 – privacy audit 1.7.105:** SHA `7e4643214471bedcf370a062c032bbbd84398e1c` zavedl centrální `rak-runtime-diagnostics.js`, který je načten před aplikačním runtime a cachován pro offline start. Konzolové a globální chybové cesty převádí na omezená agregovaná metadata bez syrových řetězců, čísel, objektových hodnot, `Error` zpráv, payloadů nebo celých reportů. Regresní canary v Node i skutečném Chromiu vložil fiktivní token/JWT-like řetězec, OS-like číslo, jméno a obsah rozpisu; veřejný/logovací výstup je neobsahoval. Statický kontrakt současně dokládá, že helper nemá vlastní síťové/úložné API a nezasahuje do owner complete backupu ani uživatelem odeslaného bug reportu se screenshotem. [Actions #362](https://github.com/martinspadrna/RaK/actions/runs/36173580395) je SUCCESS na přesném SHA před jediným READY deploymentem `dpl_66DFu1zP1aJuSMjkxLckj5v59Ze8`; veřejný alias vrací helper i metadata 1.7.105 přes HTTP 200 a zůstává izolovaný na TEST Supabase. Tím je privacy checkbox doložen a P2.4 se zvyšuje na **67 % (4/6)**. Otevřené zůstávají konkrétní sanitizovaná příčina konfliktu na problematickém iPhonu a skutečné rolové JWT s diagnostikou odmítnutých operací.

**Dokončení:** příčinu provozní chyby lze najít bez prohlížení nebo mazání cizích dat; testy skutečně blokují nebezpečný release.

---

## Funkční backlog přijatý 24. 9. 2026 – seskupení do stávajících bodů

Následující požadavky jsou otevřený realizační backlog uvnitř stávajících 13 oblastí. Nejsou novými čtrnáctými a dalšími body a samy o sobě nemění bezpečnostní akceptační zlomky ani procenta, dokud není tematický balík implementován, vydán a doložen příslušnými testy. Každý funkční release zvyšuje viditelnou verzi právě jednou; další práce probíhá nejprve na TEST a produkce se bez nového souhlasu nemění.

### Kontrola doplňkového seznamu vlastníka · 25. 9. 2026

- **◐ Už implementováno, ale ještě ne úplně převzaté:** lokální Dashboard před online synchronizací (A), odstranění místních neuložených návrhů a kompaktní rozpis (C), přepnutí účtu bez dědění starého jména, account-scoped vzhled a owner invariant (D), sjednocení karet pravidel generátoru/Kantýny/Jídelny/Správců (E). U těchto bodů zůstává jen přesně uvedená fyzická mobilní, dvouzařízení nebo řízená owner akceptace; nové duplicitní úkoly se nezakládají.
- **✅ Implementace hotová a automaticky doložená:** v administraci Rozpisů se už nezobrazuje blok „Místní neuložené návrhy rozpisů“; bezpečné mazací/recovery API zůstalo zachované. Stejně tak je hotový kompaktní přehled strojů s výchozím rozbalením a popisky `tnk`, `w01`, `w02` (uložené klíče se nemění).
- **✅ Fyzicky potvrzeno 26. 9. 2026:** administrační `×`, Datum/Směna i finální WhatsApp text jsou na iPhonu **OK**. WhatsApp používá čitelný název směny a finální tvar bez slova `směna`. **✅ 1.7.118:** omyl se 4 absencemi je odstraněný. **✅ 1.7.123:** Neplánovaná změna → Odešel na kalírnu s minimal-change reflow je fyzicky přijatá na iPhonu („je to OK“). Otevřený zůstává navazující evidenční požadavek zobrazit člověka na Kalírně na MFKF06 s markerem, ale nepočítat jej do aktivního MO staffing počtu.

### A. Lokální start a dostupnost aplikace · P2.1 / P2.3

**Stav v aktuálním 1.7.88 (základ implementován v 1.7.84):** runtime část je implementovaná a vydaná do TEST preview: ověřená lokální Rotace se načítá před vzdáleným syncem, Dashboard může vykreslit směnu okamžitě a měří se první použitelný render. Automatické Chromium důkazy jsou PASS. Zbývá cílený fyzický iPhone test studeného, teplého a offline startu; do něj se P2.1 procento nemění.

**Nový fyzický nález vlastníka 26. 9. 2026:** po spuštění RaK je někdy zbytečně dlouhá doba, kdy už je aplikace vidět, ale ještě **nejde na nic smysluplně kliknout**. Nestačí tedy měřit jen první vykreslení; otevřený úkol je zkrátit a měřit také **čas do první skutečně použitelné interakce**. Běžná navigace a lokální funkce nemají čekat na vzdálený sync/role, pokud to není bezpečnostně nutné.

- Dashboard má hned po startu zobrazit „kam jdu dnes / příští směnu“ z ověřené lokální Rotace a po dokončení online synchronizace údaj bezpečně aktualizovat.
- Navigace a běžné lokální funkce nesmějí být několik sekund zablokované jen proto, že se čeká na stav online; oprava nesmí znovu zavést falešný konflikt ani ztrátu fronty.
- Přidat měření prvního použitelného vykreslení a cílený fyzický iPhone test studeného, teplého a offline startu.
- **Nově 26. 9.:** přidat měření **time-to-first-interaction** na skutečném iPhonu i v browser testu a odstranit zbytečný globální blok vstupu po startu. Akceptace: základní navigace a lokální obrazovky jsou klikatelné co nejdřív; online synchronizace může bezpečně doběhnout na pozadí.


### B. Kalendáře podle směny · P2.2 / P0.3

**Stav 1.7.107 / fyzický iPhone 26. 9.:** administrační `×` pro odebrání kalendáře je centrované v zachované 54px dotykové ploše, chráněné regresní bránou a vlastník ho fyzicky potvrdil jako **OK**. Širší P2.2/P0.3 procenta se tím samostatně nemění.

**Stav 1.7.90:** implementováno a vydáno do TEST. Screenshoty z fyzického iPhone testu 1.7.89 potvrdily opravu mapování účtu na směnu A, plnou výšku modalu i centrované ×, ale Google iframe na iOS/PWA vyžadoval third-party cookies/přihlášení. 1.7.90 proto iframe kořenově odstraňuje: z uloženého Google calendar ID načte pouze veřejné `public/basic.ics` přes bounded same-origin endpoint a vykreslí vlastní měsíční kalendář, navigaci měsíců, dnešek, výběr dne a agendu; parser pokrývá běžné RRULE, EXDATE a RECURRENCE-ID. Bezpečnostní smoke hlídá, že endpoint není obecná proxy a neumí private ICS. Živá kontrola po deploymentu prokázala HTTP 200 a VCALENDAR na kontrolním veřejném kalendáři i směně D. A/B/C vracejí upstream nedostupnost, což izoluje zbývající problém na jejich Google public-ICS konfiguraci, nikoli RaK endpoint. Fyzický iPhone retest nativního UI čeká po zpřístupnění testovaného směnového kalendáře. Procenta P2.2/P0.3 se zatím nemění, protože jejich otevřené checkboxy jsou širší než tento funkční balík.

- V Administraci → Informace pro zaměstnance vytvořit samostatné nastavení kalendářů, nikoli položku schovanou mezi obecnými odkazy.
- U každé směny umožnit přiřadit jeden nebo více Google kalendářů. Dashboard po klepnutí na kalendář otevře jen kalendář či výběr kalendářů určený pro směnu přihlášeného člověka.
- Pracovníci vedení v rozpisu dědí směnu z rozpisu; účty mimo rozpis dostanou explicitně nastavitelnou směnu. Výchozí provozní pravidlo pro skupinu pracovníků se musí nastavit v administraci, ne natvrdo podle osobních identifikátorů.
- Odkazy musí mít validační allowlist a nesmějí se objevit v soukromých logách, exportech nebo cache mimo určený veřejný konfigurační rozsah.
- V administračním editoru kalendářů vystředit znak `×` uvnitř jeho ohraničeného tlačítka pro odebrání; zachovat minimální dotykovou plochu, přístupný popisek a přidat vizuální regresi pro mobilní šířku.

### C. Rotace, rozpisy a absence · P2.2 / P2.3

**Stav 1.7.96:** implementováno v TEST a automaticky ověřeno; čeká fyzická mobilní přejímka. Datové recovery/queue mechanismy nebyly odstraněny.

- Odstranit nápovědu „3× klepni na kartu člověka…“.
- Z Administrace → Rozpisy odstranit UI „Místní neuložené návrhy rozpisů“, bez plošného mazání existujících dat nebo fronty.
- Přehled jmen a skupin strojů ponechat ve výchozím stavu rozbalený a zúžit sloupce pro mobil; v tomto přehledu používat kompaktní popisky `tnkso1 → tnk`, `tpkw01 → w01`, `tpkw02 → w02`, aniž se změní uložené klíče strojů.
- Kliknutí na obsazené jméno má nabídnout stabilní a zřetelnou akci odebrání. Kliknutí na prázdné místo má nabídnout jen osoby, které daný den nejsou ani v rozpisu, ani v absenci; nabídka nesmí odskakovat mimo cílovou buňku.
- U absence má datum přednostně nabízet dny s chybějícím člověkem bez záznamu absence a jméno osoby chybějící ve zvoleném dni. Datum i jméno musí zůstat ručně editovatelné a serverová validace musí odmítnout nekonzistentní zápis.
- **✅ Neplánovaná změna (generátor), Kalírna:** přes 1.7.119–1.7.123 byla opravena izolace dne, runtime předávání scoped options, MO-only logika i minimal-change Kalírna reflow. **Fyzický iPhone PASS 26. 9. 2026 na 1.7.123** – vlastník potvrdil výsledné přeskupení jako OK. **Otevřeno:** evidenčně zobrazit pracovníka na Kalírně na MFKF06 s označením Kalírny, ale nezapočítávat jej do aktivního MO staffing počtu; a cíleně doretestovat MO-only optimalizaci neplánované Dovolené/NV/Paragrafu/Lékaře.

### D. Účty, pracovníci, správci a relace · P0.1 / P0.4 / P1.2 / P2.2

**Stav 1.7.96 UI části:** Pracovníci/Správci a kompaktní adresář jsou implementované v TEST a automaticky ověřené; čeká fyzická mobilní přejímka. Bezpečnostní/session checkboxy níže se tím automaticky neuzavírají.

**Nové požadavky vlastníka 26. 9. 2026:** 1) administrační/správcovské heslo dnes vyžaduje minimálně **12 znaků**, vlastník chce minimum **6 znaků**; před implementací sladit klientskou i serverovou/Auth validaci a regresně ověřit změnu bez rozbití přihlášení, odvolání relací a rolí. 2) U účtů s oprávněním k **Reportu a dalším role-gated položkám ve „Více“** se nabídka někdy zobrazí až po delší době a do té doby na ni nelze kliknout. Opravit tak, aby známá lokální oprávnění/render menu byly dostupné co nejdřív a serverové ověření je následně bezpečně potvrdilo nebo odebralo; bez krátkého zobrazení cizích privilegií.

**Stav v aktuálním 1.7.89 (základ implementován v 1.7.84):** první tři provozní rizika tohoto bloku mají nový systémový základ: při přepnutí účtu se nejdřív odstraní stará runtime identita bez plošného mazání storage, vzhled je account-scoped a synchronizovaný přes serverovou revizi/CAS a syntetická regrese dokazuje, že změna směny/rosteru nemění owner/Auth identitu. Od 1.7.89 profil navíc nese explicitní směnu A/B/C/D získanou single-account login cestou, takže běžný klient nemusí číst privátní roster; starý profil bez směny se online doplní bez mazání dat. Fyzický A→B test, skutečný dvouzařízení sync/offline konflikt a obecné úpravy UI Pracovníci/Správci zůstávají otevřené.


- Po odhlášení a přihlášení jiného účtu nesmí Nastavení ani první vykreslení krátce ukazovat jméno předchozího účtu; cache a stav účtu musí být jmenně oddělené a vyčištěné bez mazání nesouvisejících dat.
- Vzhled z Více → Nastavení → Vzhled aplikace ukládat online ke konkrétnímu přihlášenému účtu a synchronizovat mezi jeho zařízeními. Lokální cache zůstane pouze pro okamžitý a offline start; po připojení se porovná serverová revize/čas změny s lokální revizí, novější serverová změna z jiného zařízení se použije a zapíše do lokální cache, zatímco novější lokální změna se bezpečně odešle jen pod stejným účtem. Stav musí být jmenně oddělený, nesmí přenést vzhled předchozího účtu ani udělovat oprávnění; konflikt se řeší deterministickou revizí/CAS a musí mít test dvou zařízení, offline změny a přepnutí účtu.
- V Administraci → Pracovníci odstranit blok „Stav pracovníků“, zúžit sloupec jméno/číslo přibližně o 30 % a u účtů mimo rozpis zobrazovat jen existující řádky plus vždy jeden prázdný řádek; po jeho vyplnění se automaticky připraví další jediný prázdný řádek.
- Needitovatelný seznam účtů pod formulářem zkompaktnit: sloupec jména přibližně o 40 % a osobního čísla přibližně o 80 %, s ověřením čitelnosti na mobilu.
- V Administraci → Správci použít stejný vzor „existující + právě jeden prázdný řádek“ a celou stránku vizuálně sjednotit.
- Regresně ověřit, že přesun vlastního účtu mimo rozpis nijak nemění jeho Supabase Auth identitu, owner profil ani owner oprávnění. Konkrétní osobní číslo se do veřejných testů ani logů nezapisuje.
- **Heslo správce/admina:** snížit minimální délku z **12 na 6 znaků** podle požadavku vlastníka; upravit všechny klientské/serverové validační body konzistentně a přidat pozitivní/negativní testy pro 5/6 znaků.
- **Role-gated nabídka ve Více:** Report a další oprávněné položky nesmějí čekat několik sekund jen na dokončení vzdáleného role/session bootstrapu. Přidat rychlý bezpečný lokální render známých oprávnění a následnou serverovou revalidaci; nikdy neukázat privilegovanou akci účtu, který na ni právo nemá.


### E. Přehlednost administrace a kalkulaček · P2.2

**Stav 1.7.97:** kalkulační část čtvrtého TEST balíku je implementovaná a automaticky ověřená: +/− je u Brusů i v admin korekcích Frézek/Brusů. Fyzický iPhone test desetinné klávesnice a ergonomie zůstává otevřený, takže P2.2 se zatím nemění.


**Stav 1.7.96:** sjednocení čtyř provozních admin karet a odstranění „Pondělí – Brusy: spálení“ je implementované v TEST; kalkulačky zůstávají do čtvrtého balíku.

- Pravidla generátoru, Nastavení strojů, Kantýnu/Jídelnu a Správce sjednotit do přehledných mobilních karet se stejnou hierarchií ovládacích prvků.
- „Upozornění v kalendáři“ přesunout z Nastavení strojů ke kalendářům a odstranit funkci „pondělí – brus(y) – spálení“ včetně nepoužívané konfigurace a regresí, teprve po ověření, že ji nic dalšího nečte.
- V Kalkulačkách → Korekce brusů přidat přepínač `+` / `−` stejně jako u frézek a soustruhů; stejný vzor použít v administraci korekcí pro frézky i brusy a otestovat znaménko, desetinné vstupy a klávesnici iPhonu.

### F. Hlášení chyb se screenshotem · P2.4 / P0.3

**Stav 1.7.99 / fyzický test 25. 9.:** implementace i automatické privacy důkazy zůstávají platné a vlastník potvrdil celý bod 10 na iPhonu jako OK; textový report bez screenshotu (bod 9) je také OK. Screenshot se tak už nepovažuje za fyzicky otevřený backlog. Širší P2.4/P0.3 procenta se tím automaticky nemění, protože jejich checklist obsahuje další diagnostické/privacy/role podmínky.


- „Pošli mi chybu“ může volitelně připojit jeden obrázek; bez obrázku musí fungovat stejně jako dnes.
- Před implementací stanovit podporované typy, maximální rozměry/velikost, zmenšení na klientu, owner/admin přístup, retenční a mazací pravidla a oddělené soukromé Storage umístění. Obrázek, token ani osobní obsah se nesmí objevit v CI/logu nebo veřejném exportu.
- Negativní testy musí odmítnout anonymní čtení, neplatný JWT, nepovolený typ a nadlimitní soubor; žádný produkční bucket ani migraci nevytvářet bez samostatného schválení.

### G. Obsah a drobné mobilní UX · P2.2

**Stav 1.7.111 / fyzický iPhone 26. 9.:** finální WhatsApp text je **OK** i po odstranění slova `směna`; výsledný tvar je `RaK – Report směny diferenciály · <datum> · <Ranní/Noční/Ranní 8 h/Noční 8 h>`. Tento konkrétní UX bod je uzavřený. P2.2 jako celek zůstává 60 %, protože jeho zbývající checklist je širší.

**Stav 1.7.97:** všechny čtyři položky jsou implementované v TEST; Report směny navíc prošel reálnou Chromium geometrií na 390 px. Fyzický iPhone test landscape animace, safe-area a reportového okraje zůstává otevřený.


- Z „O aplikaci“ odstranit úvodní větu „RaK spojuje…“ a historii verzí, hlavně řadu 1.7, výrazně zkompaktnit bez tvrzení nedoložených výsledků.
- Opravit skloňování odpočtu na „do Vánoc“.
- Vynucený portrétní režim má při otočení telefonu zobrazit animovaného raka z přihlašovací obrazovky místo současné statické výzvy; respektovat omezení pohybu a nezvětšit kritický start.
- V Reportu směny opravit pravý okraj rámečku pole data, který zasahuje do nastavení směny, a přidat vizuální regresi pro mobilní šířku.
- Při sdílení reportu směny přes WhatsApp nastavit titul obrázku na `RaK – Report směny diferenciály · <datum> · směna <R/N…>` podle právě zvoleného reportu; datum i směna musí pocházet z formuláře a mít regresní test, aby se nevracel statický titul bez kontextu.

### H. Úplná záloha RaK · P1.5 / P0.3

**Stav 1.7.98:** kořenová příčina timeoutu je diagnostikovaná a strukturálně opravená v TEST. Monolitické opakované skládání velkých `jsonb` bloků bylo nahrazeno owner-only manifestem a tabulkovými chunky; automatické testy a oprávnění jsou zelené. Zbývá fyzický owner iPhone export plného datasetu + otevření ZIPu, proto P1.5 zůstává **43 % (3/7)**.


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
8. **Druhý TEST balík – fyzicky přijat na 1.7.95 pro aktuálně testovaný kalendář:** po pokusech s nativním rendererem se hlavní UI vrátilo ke skutečnému Google Calendar iframe jako v `main`, ale zachovalo mapování A/B/C/D podle účtu, reuse iframe a přednačtení. Vlastník po nasazení 1.7.95 potvrdil na iPhonu „Je to ok.“; všechny kombinace směn A/B/C/D tím nejsou automaticky prokázané.
9. **Třetí TEST balík – implementován v 1.7.96, čeká fyzický iPhone test:** Rozpisy/absence, Pracovníci/Správci a sjednocení administrace jsou na zeleném TEST releasu; uzavřít až po kontrole skutečného mobilního UI podle checklistu výše.
10. **Čtvrtý TEST balík – implementován a automaticky ověřen v 1.7.97, čeká fyzický iPhone test:** kalkulačky, „O aplikaci“, Vánoce, landscape overlay a Report směny.
11. **Samostatné bezpečnostní/P2.3 balíky:** screenshot reportu 1.7.99 je fyzicky PASS; úplná záloha dostala po fyzickém central-directory nálezu druhou kořenovou opravu v 1.7.100 a čeká retest ZIPu. 1.7.101 dodala bezpečné workflow jediné konfliktní položky a 1.7.102 serverový CAS/revize pro stroje a měsíční rozpisy. Další krok není další slepá vrstva změn: nejdřív fyzicky retestovat sedm oprav 1.7.100 na aktuálním 1.7.102 a konfliktní/CAS scénář ověřovat jen bezpečně.

**Pravidlo dodávky:** tematické balíky a minimum commitů/deploymentů. Před releasem syntax + relevantní unit/integrace + dvě čisté sestavy + legacy/security/offline/browser testy + ZIP/CRC + TEST HTTP; po releasu přesný SHA, Actions SUCCESS, Vercel READY se stejným SHA, HTTP a zaměřený iPhone checklist. Nikdy nezaměňovat „test prošel v Chromiu“ s „ověřeno na iPhonu“. Produkční `main` ani produkční Supabase neupravovat bez výslovného souhlasu. Žádná destruktivní akce bez předchozí zálohy, ověřeného cíle a vědomého potvrzení.

## Záznam aktualizací

- **25. 9. 2026 – explicitní předání do nového chatu:** na žádost vlastníka je do kanonického handoffu zapsán přesný stav 1.7.102, poslední fyzický iPhone PASS/FAIL seznam, skutečnost, že sedm FAILů už má zelené opravy v 1.7.100, ale čeká jejich fyzický retest, a že 1.7.101/1.7.102 přidaly konfliktní workflow/CAS bez dosavadního fyzického acceptance. Nový chat má nejdřív retestovat, nikoli znovu slepě implementovat starý seznam. Přidána také poznámka o přesunu neprodukčních migrací pod `supabase/history/non-production-migrations/` a požadavek průběžně informovat vlastníka během delších kroků. Jde pouze o dokumentační předání; runtime, TEST DB a produkce se tímto commitem nemění.

- **25. 9. 2026 – release 1.7.102 dokončuje implementační část P2.3 CAS:** funkční SHA `8ed74a6f73d3ee9ffb831010f532ce22893932ce` přidal revizní registry a v3 read/write RPC pro nastavení strojů i měsíční rozpisy. TEST stage a cutover migrace jsou aplikované; staré v2 mutace zůstávají pouze jako kompatibilní fail-closed endpointy. Test-only následník `3fe8075fcdd48c7623334c4588804784857adadc` přenesl inherited gates a [Actions #328](https://github.com/martinspadrna/RaK/actions/runs/36120760698) prošel SUCCESS včetně release-preview. Vercel `dpl_By8fWqPYzDWj8qwhZWEy5jSgTa6H` je READY na přesném SHA. Release evidence ID `10858615020`, SHA-256 `b0991d555f83d3005bcc426b312a09eea05d634c1a9f7d60dc1f7590b9a6a432`. P2.3 zůstává 63 %, protože zbývá fyzický skutečný konflikt a dvouzařízení CAS acceptance. Produkční Vercel/Supabase se nezměnily; GitHub main je novější pouze samostatnou migration-history změnou a není nasazen.

- **25. 9. 2026 – release 1.7.101 zahajuje další P2.3 balík po opravách iPhonu:** funkční SHA `84e1fc8f4526032c1e395cf23ff90d72f16d2229` přidává workflow pro jedinou konkrétní konfliktní položku. Před odstraněním podporovaného konfliktu je povinný soukromý export přesných původních bajtů a read-only kontrola serveru; typy jsou rozpis/stroj/ostatní a „ostatní“ se automaticky neodstraňuje. Raw JSON splice je unit-testem doložen jako bajtově zachovávající všechny přeživší položky. První CI #324 zastavil pouze zděděný 1.7.99 gate natvrdo očekávající current gate 1.7.100; test-only SHA `d824ff6bb735afd94b26e7f6c0b83e4a91bc4743` jej zobecnil pro 1.7.10x nástupce bez oslabení behaviorálních kontrol. [Actions #325](https://github.com/martinspadrna/RaK/actions/runs/36106385612) SUCCESS; Vercel `dpl_5CqT5q1mZ73aVXNQYks7p13qyRwz` READY. Release evidence ID `10851526288`, SHA-256 `cdb16d1ea790158efacd3149401f5c70c2b92508f6884a3ba715101d3828d4bb`. P2.3 zůstává 63 % do fyzického skutečného konfliktního scénáře; další blok je server CAS/revize.
- **25. 9. 2026 – release 1.7.100 uzavírá sedm fyzicky reprodukovaných regresí z iPhone testu 1.7.99:** picker Rozpisů dostal VisualViewport reposition, sloupec jmen účtů mimo rozpis se zdvojnásobil, Brusy mají explicitní +/− v kalkulačce i adminu, Dashboard používá „do Vánoc“, landscape přesné login mascot assety s ozubeným kolem, Report užší datum s pravým okrajem a úplná záloha už nereparsuje vnořený Git ZIP přes JSZip. Přesný SHA `ae6719947736dbdd678a411ba7420a3d7a906693` prošel [Actions #323](https://github.com/martinspadrna/RaK/actions/runs/36099482820) SUCCESS. Release evidence ID `10848034988`, SHA-256 `fbc01dc270d15b1fb624fa54860985d2ada0048571264061afff1381c951eae6`. Vlastník před opravou potvrdil PASS bodů 3, 9 a 10 a FAIL bodů 1,2,4,5,6,7,8; právě těch sedm čeká retest na aktuální 1.7.101.
- **25. 9. 2026 – stav repo/produkce:** GitHub `main` se paralelní změnou mimo tento pracovní balík posunul na `056bbaeb0cd91604588b1ed6dd3a7b3e1f5e768c` kvůli srovnání historie Supabase migrací. Produkční Vercel se nepřepnul a zůstává na schváleném runtime `de443b771bb7e7dd5fefa498883fdd220a78f07d`; produkční Supabase se nezměnila. Budoucí produkční krok musí tuto odlišnost explicitně vyřešit, ne ji přepsat nebo ignorovat.

- **24. 9. 2026 – release 1.7.99 přidává volitelný privátní screenshot k hlášení chyby:** funkční SHA `ada4b936ce641ce4da3898cdad217a088b12cbf9` přidal klientské zmenšení/re-encode bez původních metadat, online-only přenos obrázku, oddělenou RLS přílohovou tabulku, omezené submit RPC v3, admin-only read RPC a mazání přílohy spolu s reportem. TEST rollback důkazy odmítly nepovolený MIME i nadlimitní payload bez vložení reportu a validní příloha prošla atomicky; anon/auth nemají přímý SELECT/INSERT na attachment tabulku a anon nemá admin-read EXECUTE. První CI #313 a druhé #314 selhaly pouze na dvou historických smoke testech natvrdo čekajících název v2 RPC; test-only commity je přenesly na konkrétní v3 RPC bez oslabení zákazu přímého přístupu. Přesný SHA `ead0ec86aa7b7499b0aeead337083e95db669d30` prošel [Actions #315](https://github.com/martinspadrna/RaK/actions/runs/36051728156) kompletně SUCCESS. Vercel `dpl_7nKULbe3Sb7seAnmJzBK1Yv6iaQt` je READY na přesném SHA; rollback je 1.7.98 `dpl_9vuFhfaCsGTLxKjSdSfniD9eJqFC`. Release evidence ID `10830229242`, SHA-256 `d9132aa176e3a241ec4c4437f4a36e40b4b2c911a40bd647d811bc57b55655ba`. Procenta 13 oblastí se do fyzického iPhone testu nemění; `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.98 opravuje timeout úplné owner zálohy:** diagnostika na TEST ukázala, že problém není v objemu řádků ani ZIPu, ale v opakovaném kopírování rostoucího `jsonb` přes `v_public_data := v_public_data || ...`; čtyři velké bloky samotné zabraly ~12,8 s, zatímco jejich samostatná serializace byla pod 0,6 s. Nová additive TEST migrace přidává owner-only manifest RPC a tabulkové RPC, klient stahuje tabulky po částech max. 2 paralelně a skládá kompatibilní `rak-complete-backup-v1` lokálně. Staré v1 RPC zůstalo nezměněné (MD5 `080411a0294357fe046dba7ca66b7f71`) jako rollback; anon EXECUTE je na v2 zakázané, owner guard zůstává a `rak_admin_secrets` je explicitně odmítnutá. SHA `1f035f25b35ad700e8fd442b7c10491d137c75f6` prošel [Actions #311](https://github.com/martinspadrna/RaK/actions/runs/36049113262) SUCCESS, Vercel `dpl_9vuFhfaCsGTLxKjSdSfniD9eJqFC` je READY; release evidence ID `10829084740`, SHA-256 `5aecdc80b698e0e2404d2a4285f0161095d6697039247df21ac3c5b2789c55ec`. P1.5 se do fyzického owner iPhone exportu a otevření ZIPu nemění. Produkce zůstala beze změny.

- **24. 9. 2026 – release 1.7.97 dodává čtvrtý TEST balík:** hlavní commit `7a0370c5f6e213047d1eaaa17c6333e399185b0f` přidal +/− ovládání Brusů a admin korekcí Frézek/Brusů, zkrátil „O aplikaci“, opravil „do Vánoc“, vložil animovaného RaK kraba do landscape overlay s reduced-motion a opravil geometrii data/směny v Reportu. CI #308 správně zastavilo příliš agresivní zkrácení historie, protože zmizel historický baseline o odstraněných Hrách; následný commit `4c380624ca318a00de76f8b8c2c1d7c7642fd6dc` tuto stručnou informaci vrátil bez návratu původní dlouhé historie. [Actions #309](https://github.com/martinspadrna/RaK/actions/runs/36047223822) prošel kompletně SUCCESS včetně nového skutečného Chromium testu mobilní geometrie. Vercel `dpl_2M5fmSCFzdo6MS8JxEmfdbdB7WBi` je READY na přesném SHA, rollback je 1.7.96 `dpl_BtxLVjLuQrKS4qSYw5KjK6J6G6Uy`; release evidence ID `10828962473`, SHA-256 `f215b7f2bc91aa4c465639ee4428bb0c82f69f58a555eb3b838bd02cc429f3bb`. Procenta 13 oblastí se do fyzického iPhone testu nemění. `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.96 dodává třetí TEST balík (Rozpisy/absence + Pracovníci/Správci + admin UI):** funkční změny vznikly v `a2433bbc3cb580a9b36623ee620e0d570bed56a2`; dva následné test-only commity opravily chyby nové release brány, aniž měnily runtime logiku. Přesný zelený SHA `080cd7b5a738be6aef46f16e9feff1667e7cc81c` prošel [Actions #306](https://github.com/martinspadrna/RaK/actions/runs/36045542631) SUCCESS včetně dvou kanonických buildů, celého `npm run check`, zděděných i nových gate testů, rollback/ZIP kontrol, reálného Chromium online→offline→online testu, tří PWA benchmarků a TEST HTTP. Vercel `dpl_BtxLVjLuQrKS4qSYw5KjK6J6G6Uy` je READY na přesném SHA, rollback je 1.7.95 `dpl_E6WgVoEdGYpgdcvZdPtTsmLar1xd`; release evidence má ID `10828570752`, SHA-256 `fb5e302d651b92f0c3370c0cf020785cebce08b6cb625348a9bdb25b0b2d5d21`. Implementace odstraňuje pouze UI místních návrhů, nikoli data/recovery; přidává ukotvené filtrované pickery Rozpisů/absencí, kompaktní přehled strojů, jediný dynamický prázdný řádek u účtů/Správců, kompaktnější adresář a sjednocené mobilní admin karty. Starý „Pondělí – Brusy: spálení“ je odstraněn, „Roznýtování – laborka“ zůstává. Procenta 13 oblastí se do fyzického iPhone testu nemění. `main`, produkční Vercel i produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.95 vrací kalendář ke skutečnému Google iframe jako v main:** vlastní nativní kalendář z 1.7.90–1.7.94 byl po fyzické zpětné vazbě nahrazen jako hlavní UI skutečným Google Calendar embedem. RaK stále vybírá správnou směnu A/B/C/D podle účtu a více veřejných kalendářů jedné směny skládá do jednoho embed URL. Iframe se po zavření modalu zachovává a na idle se přednačítá, takže opakované otevření je okamžité a první otevření má být srovnatelné s `main`. Funkční SHA `9fae48c172cc943fb4a12e2c71b645f17097c7d1` prošel [Actions #302](https://github.com/martinspadrna/RaK/actions/runs/36041708523) SUCCESS. Vercel `dpl_E6WgVoEdGYpgdcvZdPtTsmLar1xd` je READY; rollback je 1.7.94 `dpl_HMetEKoAemW1eSMj1NAy7AWtaMEY`. Release evidence má ID `10826779184` a SHA-256 `e9f55167f9032541a4ef5df2705ac86ff05eb914bc100431aec944345eaebe7b`. Po nasazení vlastník fyzicky zkontroloval kalendář na iPhonu a potvrdil „Je to ok.“; tím je aktuálně testovaný vzhled/rychlost druhého TEST balíku přijat. Procenta 13 oblastí se nemění; `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.94 zlepšuje čitelnost kalendáře podle fyzického iPhone screenshotu:** 1.7.93 na iPhonu ukázala tři reálné UI problémy: pevný šestý řádek i u října 2026, 7px text událostí a globální RaK glass vrstvu propisující se do kalendářových tlačítek. 1.7.94 proto počítá 5/6 týdnů dynamicky, izoluje kalendářová tlačítka od globálního background-image/box-shadow a zvětšuje mobilní čísla dnů, názvy dnů i text směn. Funkční SHA `e92b16fec88a9e675c348ebf7294c2eb033ec39a` prošel [Actions #300](https://github.com/martinspadrna/RaK/actions/runs/36039376685) SUCCESS včetně release gate 1.7.94, dvou kanonických buildů, celého `npm run check`, Chromium offline/online testu, benchmarků a TEST HTTP. Vercel `dpl_HMetEKoAemW1eSMj1NAy7AWtaMEY` je READY na přesném SHA a stabilní development alias na něj ukazuje; rollback je 1.7.93 `dpl_Gmg4zRDW3Z9jCEgiXDmkuwJx8x2F`. Release evidence má ID `10825527953` a SHA-256 `aae066d49369ce1d245a78fdbde7a8e8831c01d6f0935d07b1f0384cac550727`. Procenta 13 oblastí se nemění; `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

- **24. 9. 2026 – release 1.7.93 přepíná nativní směnový kalendář na světlý vzhled a popup detail:** měsíční plocha je světlá s kompaktními modrými událostmi; kliknutí na den s událostí otevře samostatnou světlou detailní kartu nad kalendářem s datem, názvem směny a intervalem `od–do`, případně místem a popisem. Detail lze zavřít křížkem nebo klepnutím mimo kartu a prázdný den popup neudržuje. Funkční SHA `84d86ad538fd14814da54bbd5bae652252df6a83` prošel [Actions #298](https://github.com/martinspadrna/RaK/actions/runs/36037571210) SUCCESS včetně release gate 1.7.93, dvou kanonických buildů, celého `npm run check`, Chromium offline/online testu, benchmarků a TEST HTTP. Vercel `dpl_Gmg4zRDW3Z9jCEgiXDmkuwJx8x2F` je READY na přesném SHA a stabilní development alias na něj ukazuje; rollback je 1.7.92 `dpl_Cfmv48V3bSgdPSFXMQo88BrvSrcQ`. Release evidence má ID `10825263808` a SHA-256 `990bfd611bc7b38938b7a994ef34e6379243e2dd11f8033dbde19f23fecf4a40`. Procenta 13 oblastí se nemění; `main`, produkční Vercel a produkční Supabase zůstaly beze změny.

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
