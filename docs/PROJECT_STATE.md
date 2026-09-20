# RaK – centrální stav a předání do čistého projektu ChatGPT

Datum sestavení: 20. 9. 2026 (Europe/Prague). **Tento dokument je rozcestník, nikoli důkaz úspěšného buildu ani automaticky aktualizovaný stav.** Označení „RaK 2“ znamená pouze nový projekt v ChatGPT, **nikoli novou verzi aplikace, GitHub repozitář, Supabase nebo Vercel projekt**.

## Jediné zdroje pravdy a pořadí při rozporu

1. Aktuální GitHub refs, skutečný obsah `development`, odpovídající GitHub Actions a Vercel deployment se stejným SHA; skutečná uživatelem potvrzená online verze. Vždy znovu ověřit.
2. [RAK_HANDOFF_CURRENT.md](../RAK_HANDOFF_CURRENT.md) – podrobná historie, architektura, pravidla, rizika a další krok.
3. [RAK_PLAN_17067_STATUS.md](../RAK_PLAN_17067_STATUS.md) – nejnovější známý položkový stav 13bodového plánu; při novější verzi používat novější status soubor.
4. [RAK_PLAN_13.md](../RAK_PLAN_13.md) – podrobná definice 13 bodů a kritéria, **jeho záhlaví s verzí 1.7.59 je historické**, nikoli současný stav. Starý herní CAS už není požadavek: hry byly odstraněny v 1.7.21.
5. Relevantní zdrojové soubory, kumulativní build-time transformační skripty, testy a changelog. Poslední výslovné zadání vlastníka má přednost před zastaralým souhrnem, ale ne před objektivním výsledkem testu.

**Neukládat do veřejného repozitáře:** hesla, API klíče, JWT, OS čísla konkrétních zaměstnanců, osobní exporty, soukromé zálohy ani obsah rozpisů. Repozitář je veřejný.

## Snapshot ověřený při předání, 20. 9. 2026

| Položka | Stav |
|---|---|
| GitHub | `martinspadrna/RaK`, jediná pracovní větev `development` |
| `development` před tímto dokumentačním commitem | `8f63f0491c856b9559c09df284d5456e1be55dfc`; po commitu znovu načíst HEAD |
| `main` | `ceca9f9644da3dc41059c5d232661d27bc6dba18`; beze změny, nikdy neměnit bez výslovného souhlasu |
| Poslední potvrzená online / CI-green testovací verze | **1.7.66**, SHA `0814420912d0d90e43b4b17f471207ef87ba5512`; [Actions SUCCESS](https://github.com/martinspadrna/RaK/actions/runs/35516414138); Vercel preview stejného SHA READY |
| Rozpracovaný kandidát | **1.7.67 WIP, NEOVĚŘENÝ a NEVYDANÝ**; [poslední kontrolovaný Actions run](https://github.com/martinspadrna/RaK/actions/runs/35525245906) pro HEAD `8f63f049...` skončil FAILURE; nejnovější Vercel deployment téhož SHA ERROR |
| Technická/package verze | Ponechat `1.7.0`; viditelné testovací číslování zvyšovat **až pro skutečně ověřené vydání** |
| Prostředí | TEST Supabase `cgshssdjgzzuprlwnabl`; produkční Supabase `bkqamcbkiwumsvelahxr` bez zásahu; stejný Vercel projekt, pracovat jen s preview pro development |
| 13bodový plán | **2/13 uzavřeno, 11/13 částečných**; P0.2 uzavřeno vědomým přijetím rizika veřejné rotace, nikoli šifrováním/utajením; P1.3 technicky jako proces pro development, nikoli jako zelený build kandidáta 1.7.67 |

**Pozor:** Některé mezilehlé commity 1.7.67 mají Vercel READY, ale to samo o sobě není doklad dokončení kandidáta: na aktuálním SHA neprošel celý CI gate. Dokumentační commit sám o sobě není nová verze RaK ani náprava červeného CI.

## Nezměnitelné provozní a bezpečnostní zásady

- Všechny změny pouze v `development` a izolovaném TEST prostředí. Nesahej na `main`, produkční deployment, produkční DB, autentizační tajemství ani reálná uživatelská data bez nového výslovného souhlasu.
- Martinovo „ok“ = pokračovat okamžitě na jasném dalším kroku. „Použij safepoint verzi“ je jediný požadavek na návrat ke starší verzi; jinak vycházet z poslední funkční odeslané verze a **nevymazat rozpracovaný WIP bez porovnání rozdílů**.
- Větší tematicky ucelené, ale bezpečné dávky; šetřit Vercel buildy. Dokumentační změna není automaticky důvodem vydávat vyšší testovací verzi.
- Po release doložit přesné SHA, větev, dva celé buildy, `npm run check`, critical smoke a historické/final gates, CRC ZIP, reálný Chromium PWA/offline test, TEST HTTP, GitHub Actions SUCCESS a Vercel READY **pro stejný SHA a development ref**. Fyzické Safari/iPhone ověřuje uživatel zvlášť, není ekvivalentem Chromia. Ověřit `main` beze změny.
- Repo aplikuje postupnou řadu build-time transformací `tools/development-version-17048.mjs` → další verze; syrové soubory nemusí představovat skutečný sestavený runtime. Testy neopravovat pouhým oslabením očekávání.
- Žádný force-push, slepý reset, automatický overwrite konfliktů, mazání PWA úložiště nebo migrace produkčních dat. Při neúspěšném uložení zachovat lokální návrh a nepředstírat úspěch. Úplné obnovení do samostatné placené infrastruktury až po schválení.
- Zaměstnanec se přihlašuje pouze OS číslem (riziko totožnosti vědomě přijato), admin/owner mají oddělenou autorizaci. Běžná rotace včetně jmen a absence jsou veřejně čitelné na výslovné rozhodnutí vlastníka; není to soukromé uložení a citlivé důvody absencí sem nepatří.
- Hry z RaK definitivně odebrány v 1.7.21; nevracet hry, game účty ani game-CAS úkoly. Existující historická data při úklidu nepoškodit.

## První skutečná práce v novém projektu

1. Ověř čerstvý HEAD `development`, `main`, aktuální Actions run a Vercel deployment včetně commit SHA/ref a aliasu. Nezaměň poslední commit za poslední funkční verzi.
2. Prozkoumej skutečnou příčinu selhání CI kandidáta **1.7.67** v `Build 1 + check` (nepředpokládat příčinu bez logu), oprav WIP bez ztráty předchozích změn. Neměň jen test, pokud runtime požadavek nesplňuje.
3. Akceptační cíl 1.7.67: **Administrace → Rozpisy:** stejné reálné šířky data a jednotlivých pěti polí pro MO i TO, bez zbytečných mezer/vodorovného scrollu; nezasahovat vzhled Absencí. Zachovat neuložené úpravy při zrušení nebo selhání „Načíst online“, nepřepisovat rozepsaný rozpis starou cache; bezpečná lokální záloha/ruční obnova bez automatického online zápisu. Všechno ověřit na skutečném sestaveném runtime, nikoli jen podle popisu statusu.
4. Vydat kandidáta až po úplném GREEN CI a READY pro identické SHA. Po vydání vyžádat jen relevantní cílené iPhone ověření geometrie MO/TO, bezpečného zrušení načtení a exportu/obnovy; nevyžadovat umělý konflikt v reálných online datech.
5. Následný větší blok zaměřit na **skutečné uzavření celého bodu** (nejprve P1.4 nedestruktivní rollback development preview; případně P0.3, P2.2 po fyzickém ověření). Žádný počet otevřených bodů nesnižovat bez kompletního splnění kritérií a důkazů. Další otevřené oblasti: reálné JWT role/RLS, staré PWA a relace, privátní export na Safari, úplná izolovaná obnova, číselná měření výkonu a soukromí telemetrie.
6. Po každém prokazatelně úspěšném releasu aktualizuj `RAK_HANDOFF_CURRENT.md`, nejnovější položkový status, tento index a stručné předání dalšího kroku. Zastarávající SHA v textu neopravuje realitu; vždy ověř live refs.

## Text do nastavení nového ChatGPT projektu „RaK 2“ (kopírovat celý odstavec)

Jsi vývojový asistent pro aplikaci RaK / Rotace a kalkulačky. Zdroj je veřejný GitHub `martinspadrna/RaK`, větev `development`. Na začátku nového vlákna přečti `docs/PROJECT_STATE.md`, `RAK_HANDOFF_CURRENT.md` a nejnovější `RAK_PLAN_17xxx_STATUS.md`; aktuální SHA/Actions/Vercel vždy ověř živě. Starší shrnutí nesmí přebít nové ověřené údaje. Pracuj pouze na development a TEST Supabase, main/produkci nikdy neměň bez mého výslovného souhlasu. Když napíšu „ok“, pokračuj bez zbytečného dotazování; když neřeknu „použij safepoint verzi“, navazuj na poslední funkční odeslanou verzi a rozpracované změny prověř, nezahazuj. Dělej větší bezpečné tematické balíky, šetři Vercel deploymenty, udrž package verzi `1.7.0`, viditelné testovací verze čísluj až po ověřeném vydání. Neříkej, že je něco nasazené či hotové, dokud na stejném SHA neověříš dva buildy, check/smoke, celou CI, Vercel READY a oddělenou produkci. Hry nevracej. Při všech zápisech chraň rozpracované rozpisy před ztrátou a konfliktem; neukládej tajné klíče ani osobní data do veřejných dokumentů. Po každém vydání popiš změny, přesné SHA, odkazy a výsledky Actions/Vercel, celou bilanci 13 bodů, skutečně zbývající úkoly a pouze dotčené iPhone kontroly.

## První zpráva do nového vlákna (kopírovat celý odstavec)

Pokračujeme na projektu RaK. Nezakládej novou aplikaci ani repozitář. Otevři na GitHubu `martinspadrna/RaK` ve větvi `development` soubor `docs/PROJECT_STATE.md`, na něj navazující `RAK_HANDOFF_CURRENT.md` a nejnovější status 13bodového plánu. Poslední potvrzená funkční online verze při předání byla 1.7.66 (`0814420912d0d90e43b4b17f471207ef87ba5512`), zatímco 1.7.67 byla rozpracovaná s červenou CI; aktuální situaci ověř, neber tyto hodnoty jako trvalé. Oprav konkrétní příčinu selhání 1.7.67, dokonči sjednocené datum a jmenná pole MO/TO a ochranu neuloženého rozpisu při načtení online. Neztrácej WIP a nepřepisuj online data bez bezpečného potvrzení. Potom pokračuj větším bezpečným blokem podle plánu a uzavírej pouze skutečně ověřené body. Pracuj pouze na development/TEST; main a produkci nech beze změny. Na konci dolož verzi, přesný SHA, úplný CI výsledek, Vercel READY/shodu SHA, stav všech 13 úkolů a pouze potřebné kontroly na iPhonu.

## Jak přejít bez ztráty dat a chatu

1. V ChatGPT vytvořit ručně nový projekt **RaK 2** a v jeho nastavení vybrat **Paměť pouze pro projekt**; nevkládat do něj stará vlákna, pokud cílem je čistý kontext.
2. Text z oddílu „nastavení projektu“ vložit do pokynů projektu. Text z „první zprávy“ vložit do prvního nového chatu. Na GitHub ponechat tyto soubory jako trvalý přenosný zdroj; alternativně přidat tento Markdown jako projektový soubor.
3. Původní projekt **nemazat** dřív, než je prokázáno, že nový projekt přečetl dokumenty a správně rozlišil poslední green release od WIP. Ponechat ho jako archiv; smazání projektu je nevratné a smaže jeho chaty/pokyny/soubory uložené jen v něm.
4. Samotné vytvoření projektu ChatGPT nijak nemění GitHub, Supabase, Vercel ani verzi RaK. Projekt v účtu ChatGPT musí vytvořit vlastník v rozhraní aplikace; dokumentační commit jej automaticky nevytvoří.
