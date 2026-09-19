# RaK – bezpečné nasazení a rollback (development 1.7.51)

Tento postup nahrazuje zastaralý návod pro starou verzi aplikace. Platí pro **development** s testovací Supabase `cgshssdjgzzuprlwnabl`. Produkční `main`, jeho alias ani produkční databázi `bkqamcbkiwumsvelahxr` neměnit bez výslovného souhlasu vlastníka. Žádné service-role klíče, hesla, tokeny, soukromé ICS adresy ani OS číslo konkrétního člověka nepatří do repozitáře.

## Před změnou

1. Zjisti přesný `development` SHA a poslední Vercel preview deployment ve stavu `READY`; poznamenej oba identifikátory mimo veřejné logy s osobními daty. Zkontroluj, že `main` má stejný SHA jako před prací.
2. Ověř stav testovací Supabase, počet záloh, aktuální revizi rotace a seznam aplikovaných migrací. Aktuální snapshot/ZIP je přístupný jen vlastníkovi s platnou Auth relací; ZIP není veřejná záloha.
3. Změny seskup do jednoho tematického commitu, výhradně na `development`. Neměň autentizaci běžných zaměstnanců: **OS číslo bez dalšího hesla**. Správci používají samostatné heslo a Auth relaci.
4. DDL aplikuj pouze v testovací databázi, migraci vždy ulož do Git repozitáře. Neprováděj destruktivní změny před izolovaným testem obnovy.

## Build, testy a zveřejnění preview

1. CI musí sestavit `npm run vercel-build` **dvakrát**; oba průchody spouští `npm run check` a critical runtime smoke. Následují závěrečné release gates a skutečný HTTP audit anonymních/nesprávných tokenů výhradně proti testovací Supabase.
2. Od verze 1.7.51 se zdrojový ZIP pro vlastníkovu zálohu vytváří pouze z povoleného seznamu Git souborů. `node tools/backup-source-integrity-17051.mjs` musí potvrdit přesný Git SHA, shodu všech souborů v ZIP s inventářem a neporušené CRC. Není to náhrada za vyzkoušení výsledného ZIP na iPhonu.
3. Na Vercelu ověř `READY`, `aliasError=null`, branch `development` a přesný SHA shodný s úspěšným CI. Přes preview alias načti `/supabase-config.js`: musí uvádět aktuální číslo verze, testovací Supabase a shodný PWA build marker. Neodvozuj úspěch pouze ze zelené značky v GitHubu.
4. Na iPhonu ověř pouze oblasti změněné daným balíkem. U změn aktualizační logiky navíc zavři/spusť PWA a zkus starou cache; fyzický test se nikdy nevydává za provedený automatickým CI.

## Soukromí, export a obnova

- Rotace včetně jmen, absencí a běžných poznámek za **24 měsíců je stále anonymně čitelná**: rozhodnutí o OS-only provozu přijímá toto riziko. Citlivé důvody absencí do veřejné rotace neukládej. Soukromé `importMeta` a audit autorství patří mimo veřejný payload.
- Vlastnická kompletní ZIP záloha obsahuje sanitizovaná Auth metadata, nikoli funkční hesla, aktivní relace, tajné klíče ani kompletní platformní Auth dump. Výraz „úplná“ označuje připravený obnovovací balík s těmito výjimkami; samotné rozbalení není důkaz plné obnovitelnosti.
- Před produkčním cutoverem vyzkoušej **obnovu ZIP do nového izolovaného projektu**: schéma a migrace, data, soukromé importy, zásadní počty/revize, Storage, nové Auth účty, kritické čtení a chráněné zápisy. Dokud to neproběhne, P1.5 zůstává otevřený.
- Dřívější veřejné commity mohou obsahovat starší návody či identifikátory. Oprava současného souboru nemaže historii GitHubu a OS číslo neposkytuje ověřenou totožnost.

## Nouzový návrat (rollback)

1. Při chybě zastav další změny a ověř stav posledního úspěšného preview deploymentu a jeho kompatibilitu se současným schématem testovací DB. Zachovej aktuální snapshot a revizi; nepřepisuj rotaci jen kvůli chybě klienta.
2. Pro rollback aplikace na `development` zvol nový reverzní commit nebo návrat ke kompatibilnímu již ověřenému artefaktu. Nepoužívej `git push --force` ani přepis `main`. Ověř znovu dvojí build, testy, Vercel `READY`, SHA a testovací konfiguraci.
3. Nevracej databázové migrace smazáním tabulek. Je-li změna schématu nekompatibilní, připrav samostatnou dopřednou opravnou migraci a ověř ji v izolovaném projektu. Obnovu dat dělej ze schváleného snapshotu a kontroluj konflikty revizí.
4. Produkční rollback ani změnu aliasu nikdy nespouštěj automaticky; vyžadují výslovné svolení vlastníka, kompletní produkční zálohu a samostatné ověření.

**Stav:** tento dokument je aktuální provozní postup pro preview; skutečný produkční rollback, fyzický iPhone a izolovaná plná obnova zůstávají samostatnými neuzavřenými testy.
