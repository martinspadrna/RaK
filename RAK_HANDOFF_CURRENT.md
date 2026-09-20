# RaK – předávací dokument pro nové vlákno

**Stav sestaven k 20. 9. 2026.** Toto je předávací souhrn, nikoli důkaz, že rozpracovaná verze prošla testy. Nejdříve vždy znovu ověř živé GitHub refs, Actions a Vercel: dokument může zastarat. Pro detailní 13bodový plán čti `RAK_PLAN_13.md` a nejnovější `RAK_PLAN_17066_STATUS.md` / `RAK_PLAN_17067_STATUS.md`; starší části plánu mohou zmiňovat již odstraněné hry a zastaralou verzi. Při rozporu má přednost ověřený aktuální stav a výslovná poslední instrukce Martina.

## 1. Nejdůležitější pravdivý stav a první krok

- Repo: `martinspadrna/RaK`; vyvíjet **výlučně ve větvi `development`**.
- Poslední **úspěšně ověřená online/testovací verze je RaK 1.7.66**. Její commit: `0814420912d0d90e43b4b17f471207ef87ba5512`, úspěšné Actions: https://github.com/martinspadrna/RaK/actions/runs/35516414138; preview Vercel bylo pro tuto verzi READY. Martin výslovně potvrdil, že 1.7.66 je poslední online verze.
- **1.7.67 je rozpracovaný NEOVĚŘENÝ kandidát v `development`, ne vydaná online verze.** Při vytváření tohoto dokumentu před dokumentačním commitem byl `development` na `5113f07404b7909ffa8a18b463cd620437cd8799`. Poslední prověřený Actions běh tohoto kandidáta `35520008085` selhal v kroku `Build 1 + check`: https://github.com/martinspadrna/RaK/actions/runs/35520008085. Příčina nejnovějšího selhání **není spolehlivě potvrzena**; nelze tvrdit, že samotná úprava historických testů vše vyřešila. Dokumentační commit může posunout HEAD, ale nezmění stav WIP ani neprokáže funkčnost buildu.
- `main`: před vytvořením tohoto dokumentu `ceca9f9644da3dc41059c5d232661d27bc6dba18`. **Neměnit bez výslovného Martinova souhlasu.** Stejně tak nesahat na produkční databázi či deployment.
- Pokud už v developmentu existuje WIP 1.7.67, **neprovádět slepý reset nebo force-push**. Vycházet z 1.7.66 jako posledního funkčního základu, prozkoumat rozdíl a opravit nebo bezpečně převzít změny z rozpracované větve; zachovat data a dřívější úpravy.
- První praktický úkol po otevření nového chatu: zjistit konkrétní příčinu posledního červeného `Build 1 + check`, opravit aktuální WIP a ověřit celý release gate; teprve potom označit 1.7.67 za dodanou. Neopakovat neurčitá sdělení „CI je červené“ bez konkrétního pokusu o diagnostiku a opravu.

## 2. Pravidla spolupráce od Martina

1. Pokud Martin výslovně nenapíše **„použij safepoint verzi“**, navazovat na **poslední skutečně odeslanou/ověřenou funkční verzi**, nyní 1.7.66. Odlišovat ji od posledního commitu developmentu a posledního kandidáta. Rozpracovaný kód nezahazovat bez auditu.
2. Krátké **„ok“ = pokračovat hned** v jasně rozpracovaném dalším kroku; zbytečně nežádat opakovaně o souhlas s běžnými změnami v developmentu. Souhlas je nutný pro zásah do main/produkce nebo pro nové náklady/destruktivní operace.
3. Dělat **větší, tematicky ucelené balíky**, ne desítky malých verzí kvůli jednomu pomocnému commitu. Šetřit počet nasazení na Vercel. Každou vydanou verzi přeznačit na vyšší viditelné testovací číslo; technické číslo v `package.json` ponechat `1.7.0`.
4. **Nikdy nahlásit nasazení, GREEN CI, Vercel READY ani „hotovo“, pokud nebyly ověřeny pro přesný aktuální SHA.** Úspěšné jednotlivé nové testy nestačí, když historický build selhal. Ověřit také, že `main` je nedotčen.
5. Po verzi vypsat konkrétní opravy, exact development SHA, GitHub Actions link a výsledek, Vercel stav/SHA, stav všech 13 bodů a **jen relevantní iPhone kontrolu**. Neměřené fyzické chování iPhonu nikdy nevydávat za ověřené na základě Chromia.
6. Neúspěšné uložení, konflikt ani změna měsíce nesmí tiše zahodit rozpracovaný rozpis, automaticky přepsat vzdálený stav nebo zaměnit cache za potvrzená online data. Při pochybnosti odmítnout zápis, uchovat lokální návrh a uživateli říct pravý stav.
7. **Hry byly z RaK odstraněny již v 1.7.21. Nevytvářet žádné hry, herní účty ani nové game-CAS úkoly.** Pouze při čištění případných historických dat/front zachovat existující data a zabránit jejich ztrátě.
8. Historická veřejná rotace s identifikovatelnými jmény/absencemi je **výslovně přijaté riziko vlastníka, nikoli technicky zabezpečená soukromá data**. Neměnit tento provozní model na vlastní pěst; citlivé důvody absencí do veřejného obsahu nepatří.

## 3. Prostředí, architektura a verifikace

- GitHub `martinspadrna/RaK`, pracovní `development`, produkční `main` izolovat. TEST Supabase project ref `cgshssdjgzzuprlwnabl`; produkční Supabase `bkqamcbkiwumsvelahxr` **read/write bez explicitní autorizace neprovádět**.
- Vercel projekt `prj_Pv7eNEt5qGg2GX9l365fJnc0YUMF`, tým `team_wZkLmDlJZ9WUtm7IUU3i3tg4`; ověřit výhradně development preview, přesný `githubCommitSha`, `githubCommitRef=development`, READY a odpovídající alias. Preview může být za Vercel SSO: přesměrování 302 nelze vydávat za nezávisle načtenou HTTP 200 stránku.
- Repo používá **postupné build-time transformační skripty**. `tools/development-version-17048.mjs` navazuje další skripty 17049…17067 včetně historických bran; samotné syrové `supabase-bridge.js` a další soubory z GitHubu nemusí obsahovat výsledný runtime. Čti celý řetězec a skutečný výstup `npm run vercel-build`, nikoliv izolovaný patch jako důkaz výsledku.
- CI: dva úplné buildy `npm run vercel-build`, `npm run check` a critical runtime smoke, historické i nové release gates, ZIP s CRC, skutečný mobilní Chromium start/offline/recovery, test geometrie, TEST anon HTTP. Pro novou verzi musí být nový run **success na stejném commitu jako Vercel READY**. Nesmí se „opravit“ test oslabením požadovaného chování jen kvůli zelené fajfce.
- Neprovádět force-push, výmaz dat, migraci produkce, automatické přepsání konfliktu, čistění PWA úložiště nebo manipulaci s tajnými klíči. TEST DB experimenty pokud nutné rollback-only; plná izolovaná obnova Supabase na dalším projektu jen po souhlasu s náklady.

## 4. Čerstvá historie a aktuální chyba na iPhonu

- **1.7.63:** hlavní rotation save fail-closed při neznámé základní revizi; serverové RPC `rak_admin_save_rotation_v2` se zamykáním a očekávanou revizí; ruční čtecí diagnostika pouze revize (neobsahuje porovnání obsahu ani automatický replay). Měsíční administrátorské RPC je RPC-only, ale neznamená to automaticky hotový CAS všech zápisů.
- **1.7.64:** ověřené místní návrhy před ukládáním, uchování při neúspěchu, ruční JSON export; oprava chybné interpretace neúplné synchronizační odpovědi.
- **1.7.65:** zúžení data MO/TO 86→82 px, místní návrhy dohledatelné po znovuotevření, odstraněn pozůstatek tvorby nepotřebných herních profilů při ukládání pracovníků. Hry zůstávají odstraněné.
- **1.7.66 (GREEN/ONLINE):** MO stlačeno, aby pět jmen na jednom řádku nevyžadovalo boční scroll; ochrana rozpracovaného rozpisu při přepnutí měsíce/roku, opuštění administrace a znovunačtení, potvrzení jen po ověřené lokální záloze. Uživatel skutečně vyfotil iPhone: u MO se všech pět jmen vejde, **ale MO a TO nemají stejnou šířku dat ani jmenných polí**.
- **1.7.67 (RED/WIP):** rozpracované sjednocení skutečné geometrie MO/TO: datum 84 px, buňka pro každé jméno/stroj 52 px, samotný vstup 50 px, pět polí dohromady cca 344 px. Staged status současně uvádí opravu skutečného „Načíst online“ včetně cancel/failure zachovávajících rozepsané hodnoty i dirty flag a ochrany proti předčasnému zobrazení staré cache; záměr též bezpečná obnova místní zálohy do editoru bez automatického online zápisu. **Vše pouze kandidát; ověř skutečnou implementaci a neprezentuj tyto body jako online hotové, dokud není CI GREEN + Vercel READY.** Absence se nemají vzhledově měnit.
- **Nejbližší uživatelské zadání:** „Administrace → Rozpisy: MO a TO musí mít stejně velké místo na datum a na každé jméno, žádné zbytečné mezery ani vodorovný scroll; pokračuj dalším velkým balíkem a reálně uzavírej body plánu.“ Přesnost vzhledu na skutečném iPhonu musí uživatel potvrdit po zeleném releasu. Nežádat ho o záměrný konflikt v reálných datech.

## 5. Plán 13 bodů – stav bez kosmetického navyšování

**Celkem 2/13 uzavřené, 11/13 částečných.** Z těch dvou je P0.2 uzavřený výslovně přijetím rizika, P1.3 uzavřen technicky pro development **jako proces** (neznamená to, že nynější rozpracovaná 1.7.67 prošla CI).

| Kód | Stav | Co konkrétně chybí k uzavření |
|---|---|---|
| P0.1 Účty zaměstnanců | Částečně | OS-only riziko přijato; audit starých exportů/PWA a skutečné role s podepsanými JWT. |
| P0.2 Soukromí rotace | Uzavřeno rozhodnutím, nikoli technicky | Vlastník vědomě přijímá anonymní čtení běžných dat rotace/absencí a historie; nepředstírat soukromí. |
| P0.3 API a exporty | Částečně | Reálné owner/admin/deputy JWT, preview/SSO, fyzický iPhone a export souboru, historické PWA. |
| P0.4 Role vlastníka | Částečně | Skutečná autorizovaná relace owner/admin/deputy a ověření omezení pravomocí. |
| P1.1 RLS/privilegia | Částečně | Úplná privilege RPC matice s pravými podepsanými JWT jednotlivých rolí, nikoli jen syntetické SQL/anon testy. |
| P1.2 Admin hesla/relace | Částečně | Test revokace na fyzickém zařízení a skutečných rolích včetně starých relací. |
| P1.3 Sestavení/testy | Technicky uzavřeno pro development | Každý nový kandidát musí sám projít dvěma buildy a celou pipeline; 1.7.67 aktuálně selhává. |
| P1.4 Nasazení/rollback | Částečně | **Nedestruktivní praktický zkušební rollback development preview**, doložené SHA/alias/postup obnovy, bez main a DB rollbacku; produkční postup jen připravit. |
| P1.5 Zálohy/obnova | Částečně | Ověřený export na iPhonu a úplná nezávislá obnova schématu/dat/Auth/Storage/revizí na separátní infrastruktuře po schválení nákladů. Lokální JSON ani rollback-only SQL stín nejsou plná obnova. |
| P2.1 Výkon PWA | Částečně | Opakovaná číselná měření cold/warm/offline + fyzické Safari a dohodnuté prahy. |
| P2.2 CSS/DOM | Částečně | Uniformní MO/TO po zelené verzi a skutečném potvrzení iPhonem, prohlédnout i další obrazovky a role podle kritérií plánu. |
| P2.3 Offline/sync | Částečně | Bezpečné ruční řešení konfliktu bez automatického přepsání; prověřit skutečně používané měsíční RPC/CAS, staré PWA, iPhone. **Nedoplňovat game CAS – hry již nejsou.** |
| P2.4 Diagnostika | Částečně | Skutečné role/JWT bez úniku tokenů, měření výkonu a soukromí telemetrie na iPhonu. |

**Konkrétní strategie pro viditelný progres:** místo opakování 2/13 naplánovat jeden dokončovací blok na úplná kritéria P1.4 (bezpečný preview rollback), P2.2 (až po iPhone důkazu), případně P0.3 (export a reálné role). Samotné založení dokumentu nebo přidání další dílčí zálohy neopravňuje k označení P1.5 za hotové. U každého bodu napiš, co je ověřeno, co chybí, kdo to může ověřit a proč je/není uzavřen. Kde je fyzický iPhone nebo externí autorizace nezbytná, žádej jen cílené ověření; nezaměňuj automatický browser test za telefon.

## 6. Postup nového chatu – bez ztráty času

1. Přečíst tento soubor, aktuální `RAK_PLAN_13.md`, `RAK_PLAN_17066_STATUS.md`, `RAK_PLAN_17067_STATUS.md` a relevantní release gate skripty. Nevěřit slepě SHA uloženým v dokumentu – ověřit refs.
2. GitHub: zjistit `development` HEAD, `main` HEAD, nejnovější Actions run a log konkrétního selhávajícího kroku. Vercel: ověřit poslední READY development preview a jeho commit. Rozlišit green 1.7.66 a red 1.7.67.
3. Prohlédnout staged script WIP 1.7.67 a příslušné testy včetně historických očekávání MO/TO; opravit **skutečnou příčinu** selhání, zachovat uniformní geometrie a možnost bezpečného zachování/ruční obnovy rozepsaných změn. Nejen upravit test, pokud runtime stále nesplňuje požadavek.
4. V rámci většího tematického balíku vytipovat alespoň jeden celý dokončitelný bod, primárně P1.4 preview rollback; pozor na nedestruktivnost a doložení skutečného výsledku. Pokud není možné bezpečné provedení, uvést konkrétní blokátor, nedeklarovat hotovo.
5. Vydat až po stejném SHA: Actions success (dva buildy, check/smoke, historické gates, CRC, Chromium/offline, TEST HTTP) a Vercel READY, konfigurace výhradně TEST. `main` a produkční DB beze změny. Po release pouze cílená iPhone kontrola MO/TO, online reload cancel, export/restore místního návrhu – bez záměrného konfliktu v produkčním rozpisu.
6. V závěru dát release číslo, ověřený SHA, Action link, Vercel READY + shodu SHA, změny, checklist telefonu, tabulku všech 13 bodů a **pravdivý celkový počet skutečně uzavřených bodů**.

## 7. Vlož do nového vlákna tento krátký startovací prompt

> Pokračujeme na RaK z dokumentu `RAK_HANDOFF_CURRENT.md` v GitHub repozitáři `martinspadrna/RaK`, větev `development`. Přečti dokument a příslušné statusy. Poslední potvrzená online verze je 1.7.66; 1.7.67 je rozpracovaná a její CI selhalo. Nejprve ověř aktuální SHA/CI/Vercel, oprav kandidáta a sjednoť v Administrace → Rozpisy pole MO/TO (datum i jména, bez bočního scrollu) při zachování ochrany rozpracovaných změn. Pak pokračuj větším bezpečným balíkem a uzavři celý bod 13bodového plánu, pokud splníš všechna kritéria. Pracuj pouze na development/TEST, na main/produkci nesahej. Nic nevydávej za nasazené před green CI a Vercel READY na přesném SHA. Hry do RaK nevracej. Pokud nenapíšu „použij safepoint verzi“, vycházej z poslední funkční verze; moje „ok“ znamená pokračuj. V závěru uveď SHA, testy, READY, iPhone kontrolu a stav všech 13 bodů.

**Údržba dokumentu:** Po každém úspěšném releasu aktualizovat skutečnou poslední green verzi, SHA, test run, současný WIP, známé blokátory a 13bodovou bilanci. Novou konverzaci založit až po kontrole souboru; staré chaty nejdříve archivovat, ne hromadně mazat, dokud není přenos ověřen.