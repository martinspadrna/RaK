# RaK – stabilizace vývoje navázaná na plán 13 bodů

Stav k 21. 9. 2026. Základ: development 1.7.69, technická verze 1.7.0. Žádná práce na main, produkční databázi ani smazání uživatelských dat. Tento dokument je realizační část P1.3, P1.4, P2.3 a P2.4, **není čtrnáctým bodem**. Historické release gates se nesmějí vypínat, pouze postupně nahrazovat ekvivalentními důkazními testy.

## Proč byl P1.3 předčasně uzavřen

Původní P1.3 doložil rozsah CI, ne stabilitu architektury. `package.json` spouští rozsáhlý transformační `vercel-build`, `tools/development-version-17048.mjs` postupně připojuje přepisovací skripty až po 1.7.69 a historické VM testy vybírají části produkčních souborů podle textových značek. V 1.7.69 se opakovaně rozbíjely staré testovací výřezy (`window is not defined`, souvislost hranic 1.7.60). CI a Vercel jsou zatím nezávislé automatické reakce na push development: samotný úspěch CI **neznamená, že Vercel počkal na CI**. Proto P1.3 znovu OTEVŘEN, P1.4 zůstává ČÁSTEČNĚ.

## Milníky a skutečné akceptační podmínky

| Milník | Vazba | Aktuální stav | Hotovo teprve když |
|---|---|---|---|
| S1 Zastavit růst záplat | P1.3 | První ochrana zavedena: CI test zamyká řetězec 1.7.69, další `development-version-17070.mjs` zakazuje. | Žádný nový release skript nepřepisuje zdroje; funkce se mění ve zdrojových modulech. |
| S2 Stabilní zdrojový build | P1.3 + P1.5 | OTEVŘENO | Jedna deklarativní sestava z neměnného zdrojového stromu, výstup mimo zdrojové soubory; dvě sestavy ze stejného SHA mají stejné soubory/hash bez dodatečných oprav; porovnání se zachovanou 1.7.69 funkční referencí. |
| S3 Izolované testy | P1.3 + P2.4 | OTEVŘENO | Žádný historický test nevykonává nechtěný kód mezi textovými značkami; sdílené prohlížečové fixture a jasný export/test seam, integrační testy skutečných modulů, všechny relevantní bezpečnostní a offline regresní scénáře zachovány. |
| S4 Ověření před nasazením | P1.3 + P1.4 | ČÁSTEČNĚ: CI nyní podporuje pull_request do development; Vercel ignoruje jiné než release větve a testovací/dokumentační commity, při neznámém diffu raději build. | Povinné status checks a zákaz přímého push na development NEBO řízený deploy až po Actions SUCCESS, ověření konkrétního SHA, následně Vercel READY a HTTP/konfigurace. Automatické nasazení přímo z push development se dosud s CI časově nepodmiňuje. |
| S5 Konflikty na iPhonu | P2.3 + P2.4 | OTEVŘENO – uživatel hlásí konflikt i po smazání rozpisových návrhů na jednom zařízení. | Diagnostika bezpečně odliší zadrženou jinou položku, zbylý rozpisový zápis, chybné storage i stale stav; žádné plošné mazání, před bezpečným vyřazením konkrétní položky privátní export a read-only online kontrola; fyzické Safari. |
| S6 Provozní dokončení původního plánu | P0.1–P2.4 | OTEVŘENO | Skutečné JWT všech oprávněných rolí, oddělená úplná obnova po odsouhlasení nákladů, fyzický iPhone, výkonové prahy, bezpečnost soukromí a zkušební rollback jsou doložené, ne jen naplánované. |

## První realizovaný balík

- Samostatná testovaná politika `tools/vercel-build-policy.mjs`: změny pouze v testech, workflow nebo výslovně uvedené dokumentaci neplýtvají Vercel buildem; produkční soubory, build nástroje, neznámé cesty a neznámý diff build vyžadují. Feature/PR větve nejsou určeny k deployi; PR do development dostává stejné úplné CI. Branch main má zachované buildování runtime změn.
- `tools/build-architecture-contract.test.mjs` hlídá, že se již neřetězí další verzované přepisovací skripty a že povinné staré kontroly zůstaly v CI. Oba nové testy se spouštějí před instalací závislostí; nejsou náhradou celých testů.
- Žádné zvýšení verze nad 1.7.69, žádná změna app runtime nebo DB. Oprava samotného sestavovacího řetězce S2, testů S3 a vynuceného deploy gate S4 je nadále nutná.

## Pořadí navazující realizace

1. Zafixovat jako referenci 1.7.69 (Git SHA, manifest a hashe výsledných souborů po druhém buildu); nedotýkat se main ani testovacích uživatelských dat.
2. Převést současný transformovaný výstup na kanonický zdroj v odděleném kontrolovaném diffu. Přepsat `vercel-build` na čistý build bez in-place mutací; zkontrolovat oba průchody a kompatibilitu záloh. Náhradu ověřit stejnojmennými regresními testy.
3. Testy, které nyní vyřezávají funkce mezi značkami, postupně přesunout na explicitní exporty/test fixture a integrační čtení sestavené aplikace. Zachovat ochranu soukromí, fronty, rolí a RLS.
4. Vynutit PR status check před merge nebo autentizovaný deploy z CI po kompletním úspěchu; současné automatické Git nasazování do té doby není striktně gated. Žádné obcházení kontrol pouhou změnou `vercel.json`.
5. Vyřešit jednotlivé položky fronty postiženého iPhonu bez ztráty jiných neodeslaných dat; následně fyzické Safari a ostatní otevřené body.

Pravidlo reportování: po každém balíku uveď přesné změněné soubory, SHA, testy, READY shodu, co bylo skutečně ověřeno a co nadále zbývá. CI SUCCESS ≠ fyzické Safari; zkušební shadow restore ≠ nezávislá plná obnova.
