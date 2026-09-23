# RaK – kanonický předávací dokument pro nový chat

Tento soubor je povinný vstupní bod pro každé nové pokračování projektu `martinspadrna/RaK`. Obsahuje současný provozní stav, závazná omezení, pořadí práce a odkazy na úplné důkazy. Nový chat nemá vycházet z paměti, starého promptu ani místní kopie projektu.

## Nejkratší prompt pro nový chat

> Pokračuj v projektu RaK podle `RAK_HANDOFF.md` na aktuálním HEAD větve `development`.

Po této větě musí agent sám online zjistit aktuální SHA `development`, načíst tento soubor a níže uvedené kanonické dokumenty přesně z tohoto SHA a pokračovat podle nich.

## Povinný začátek každého pokračování

1. Online načíst živý SHA větve `development`; SHA uložené v konverzaci nebo starém předání je pouze orientační.
2. Ověřit, že `main` zůstal beze změny, pokud vlastník výslovně neschválil opak.
3. Z přesného aktuálního SHA přečíst:
   - `RAK_HANDOFF.md` – provozní vstup a poslední stav,
   - `RAK_PLAN_13.md` – jediný kanonický plán, checkboxy, procenta a důkazy,
   - `SECURITY_DEPLOYMENT.md` – bezpečnostní a release postupy,
   - `rak-release-metadata.js` – skutečná viditelná a technická verze.
4. Před každým zápisem znovu ověřit SHA `development`. Commit musí mít tento SHA jako rodiče; bez force a bez přepsání souběžných změn.
5. Nikdy nepoužívat ani neprohlížet místní kopii RaK. Zdroj, commity, testy, Actions, Vercel a Supabase řešit online.
6. Pokud si dokumenty odporují, aktuální `RAK_PLAN_13.md` a strojový release artefakt mají přednost; rozpor opravit dokumentačním commitem a nevydávat domněnku za fakt.

## Závazné hranice

- Pracovat pouze na aktuálním `development`.
- `main`, produkční Vercel deployment/alias a produkční Supabase se nesmí měnit bez nového výslovného souhlasu vlastníka.
- Produkční Supabase: `bkqamcbkiwumsvelahxr` – nikdy ji nepoužívat pro vývojové ověření.
- TEST Supabase: `cgshssdjgzzuprlwnabl` – jediné povolené databázové prostředí pro vývojové testy.
- Vlastník povolil pouze bezplatná řešení. Nový/placený Supabase projekt, placená větev, PITR nebo add-on vyžaduje předchozí souhlas.
- Nevypisovat JWT, hesla, API klíče, osobní odpovědi ani tajný parametr Vercel shareable odkazu. Existující shareable odkaz nerotovat ani nerušit bez souhlasu.
- Nemazat Safari/PWA, localStorage, CacheStorage, service worker, synchronizační frontu ani uživatelská data jako univerzální „opravu“.
- Neoslabovat ani neobcházet testy. Opravovat skutečnou příčinu.
- Technická/package verze zůstává `1.7.0`.
- Současná viditelná verze je `1.7.82`; příští skutečný funkční release je `1.7.83`. Opravné commity před jeho deploymentem číslo znovu nezvyšují.
- Dokumentační nebo čistě testovací změna bez změny aplikace nezvyšuje verzi a nevytváří Vercel deployment.
- Větší tematické balíky, minimum commitů a jediný preview deployment až po úplně zeleném CI přesného SHA.

## Aktuální ověřený runtime

- Poslední funkční runtime SHA: `1c6dc4e12eb4b1519e910a3b00bc64a1f5895767`
- Viditelná verze: `1.7.82`
- Technická verze: `1.7.0`
- Cache: `v1.7.82`
- Build ID: `v1.7.82-rotation-ui-rehydrate1`
- GitHub Actions: run #243, ID `35889947003`, SUCCESS
- Actions URL: https://github.com/martinspadrna/RaK/actions/runs/35889947003
- Poslední funkční release deployment: `dpl_6m3mDvWpRAXNRKhR1LaceaJnx7jd`, READY
- Aktuální stabilní alias míří na jednorázově povolený dokumentační preview `dpl_4tYmv9R4sNHV6yq9LxQ7Y8zP9jPe`, READY, commit `1baa9cdec9d5391bb91c4cb45bf4785c995757fa`; aplikační runtime a metadata zůstávají 1.7.82.
- Deployment SHA odpovídá přesně runtime SHA.
- Stabilní development alias: `skoda-spada-git-development-martinspadrnas-projects.vercel.app`
- Strojový artefakt: `rak-release-evidence-1c6dc4e12eb4b1519e910a3b00bc64a1f5895767`, výsledek PASS.
- Immutable i stabilní HTTP ověřily HTML, `sw.js`, metadata a TEST konfiguraci; produkční Supabase ID ve výstupu není.
- `main` při releasu zůstal `ceca9f9644da3dc41059c5d232661d27bc6dba18`.
- Produkční deployment zůstal při releasu beze změny.
- Konkrétní nedestruktivní rollback cíl je uložen ve strojovém release artefaktu; před použitím se musí znovu ověřit READY stav a projektová identita.

Dokumentační commity nad tímto runtime standardně nemají vlastní nový Vercel deployment. Při prvním přidání tohoto dosud neznámého souboru fail-closed politika výjimečně vytvořila preview `dpl_4tYmv9R4sNHV6yq9LxQ7Y8zP9jPe`; vlastník tento jediný deployment výslovně povolil. Commit `15a78a85afec80170440f6ff1dc36b87a8451cb4` přidal `RAK_HANDOFF.md` do přesného dokumentačního allowlistu a kontraktního testu. Ruční Actions #250 / run `35914753211` na témže SHA prošel bez release jobu. Další samostatná změna `RAK_HANDOFF.md` proto musí skončit dokumentačním skipem. Živý `development` HEAD se vždy zjišťuje online a může být novější než runtime SHA.

## Důležitý stav fyzického iPhonu

RaK 1.7.82 prošla 23. 9. 2026 fyzickým acceptance testem bez mazání dat:

- online přihlášení a TEST Supabase fungovaly,
- cold offline start fungoval,
- Dashboard „Kam jdu“ i Rotace byly aktuální offline,
- aktuální rozpis byl dostupný offline,
- návrat online fungoval bez restartu,
- falešný konflikt se nevrátil.

Tato konkrétní mobilní offline/reconnect závada je vyřešená. Neotvírat ji znovu bez nové reprodukovatelné regrese. Zachovat dvojitou persistence Rotace, arbitráž `revision/savedAt/fingerprint`, quota-safe migraci, self-hosted pinovaný Supabase SDK, root vendor asset, offline name index, runtime hydration a přísné offline testy.

P2.3 zůstává otevřené pouze kvůli třem jiným položkám: bezpečné vyřazení jediné konfliktní úlohy, typové zpracování konfliktů a serverově atomický CAS/revize pro souběh zařízení.

## Stav 13bodového plánu

| Bod | Stav | Zbývá |
|---|---:|---|
| P0.1 | **100 % (5/5)** | Uzavřeno; privacy/export regrese jsou povinné a doložené na vydaném runtime. |
| P0.2 | **100 % (5/5)** | Uzavřeno rozhodnutím o přijatém riziku, nikoli technickou důvěrností veřejné rotace. |
| P0.3 | **80 % (4/5)** | Soukromé stažení a otevření owner backup ZIPu na skutečném iPhonu. |
| P0.4 | **80 % (4/5)** | Fyzický Safari/PWA test správy rolí a odvolání zařízení. |
| P1.1 | **80 % (4/5)** | Každou další nutnou politiku nasadit nejprve do TEST s migrací, testem a reverzním postupem. |
| P1.2 | **80 % (4/5)** | Fyzický Safari/PWA test relace, znovuotevření, offline→online a UX odmítnutí. |
| P1.3 | **100 % (6/6)** | Uzavřeno. |
| P1.4 | **100 % (6/6)** | Uzavřeno; fail-closed release evidence je povinné. |
| P1.5 | **43 % (3/7)** | Úplná izolovaná obnova a porovnání; bezplatné projektové sloty jsou obsazené. |
| P2.1 | **20 % (1/5)** | Měřený výkon startu a skutečné mobilní/Safari limity. |
| P2.2 | **40 % (2/5)** | Skutečné iPhone rozložení, role/interakce a stabilní vizuální regrese. |
| P2.3 | **63 % (5/8)** | Tři konfliktové/CAS položky uvedené výše. |
| P2.4 | **33 % (2/6)** | Sanitizovaná diagnostika, privacy audit logů a měřitelné PASS/FAIL prahy. |

Bilance: 4/13 oblastí uzavřeny, 9/13 otevřených. Přesné checkboxy, jejich důkazy a historie změn jsou výhradně v `RAK_PLAN_13.md`.

## Nejbližší bezpečné pokračování

1. Neopakovat už uzavřenou offline hypotézu P2.3.
2. Online lze pokračovat přípravou P2.4 a zbývajícího konfliktního workflow P2.3; serverový CAS vyžaduje návrh, TEST migraci, souběžné testy a reverzní postup, nikdy produkční migraci.
3. P0.3, P0.4 a P1.2 čekají na konkrétní fyzické iPhone/Safari scénáře. Chromium se nesmí vydávat za jejich splnění.
4. P1.5 může pokračovat kontrolou záloh a návrhem obnovy. Nový oddělený projekt nebo placená funkce není bez souhlasu povolena.
5. P2.1/P2.2 pokračují měřenými a stabilními regresními testy až po prioritních bezpečnostních úkolech.

## Povinná release brána

Před každým funkčním preview musí na přesném SHA projít minimálně syntax, `npm run check`, relevantní unit/integrace, critical runtime smoke, security/offline regrese, dva čisté kanonické buildy, ZIP/manifest/CRC, skutečný Chromium smoke, TEST HTTP, jednotná metadata a GitHub Actions SUCCESS. Až potom smí vzniknout jeden Vercel preview.

Po deploymentu ověřit READY, stejné SHA, viditelnou a technickou verzi, TEST Supabase, nepřítomnost produkčního ID, dostupnost HTML/`sw.js`/metadat/vendor assetu, stabilní development alias, nezměněný `main` a nezměněnou produkci. Uchovat strojový release artefakt a konkrétní rollback cíl.

## Povinná údržba tohoto souboru

Po každém větším balíku musí stejný pracovní tok tento soubor zkontrolovat a aktualizovat, pokud se změnil kterýkoli z těchto údajů:

- runtime SHA, verze, build ID nebo cache,
- Actions run, Vercel deployment, alias, release artefakt nebo rollback,
- stav TEST/produkční izolace,
- checkbox nebo procento plánu,
- fyzický iPhone výsledek,
- otevřený blokátor, přijaté riziko nebo pořadí další práce,
- závazné provozní omezení.

Současně aktualizovat `RAK_PLAN_13.md`, pokud se změnil checkbox, procento nebo důkaz. Handoff nesmí tvrdit víc než plán a strojové důkazy. Čistě historické podrobnosti patří do odkazovaných dokumentů, nikoli do dalšího paralelního „kanonického“ plánu.

## Report uživateli po větším balíku

V češtině uvést: co bylo dokončeno, změněné checkboxy, přesné SHA, číslo a odkaz Actions, Vercel ID/stav nebo výslovný dokumentační skip, viditelnou a technickou verzi, otevřené/neověřené položky, pouze relevantní fyzické iPhone kroky a přehled všech 13 procent.
