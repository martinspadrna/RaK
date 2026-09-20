# RaK – další dokončovací balík P1.4 + P2.1 po 1.7.67

Datum: 20. 9. 2026. **Žádné nové číslo aplikační verze:** viditelně 1.7.67, technicky 1.7.0 po sestavení. Pouze větev `development`; `main`, produkční alias, obě databáze a uživatelské rozpisy se tímto balíkem nemění. Každý SHA vyžaduje vlastní zelený Actions běh a shodný Vercel READY.

## Co skutečně přibylo

- `tools/preview-rollback-preflight-17068.mjs`: **pouze čtecí a offline** validátor dvou Vercel deployment metadat a snímku GitHub refs. Vyžaduje izolovaný project ID, stav READY, preview target null, obě správné branch/repo/owner/SHA, očekávaný nezměněný main a pevně ověřenou 1.7.66 jako fallback. Záměna větve, projektu, SHA, produkční cíl, chyba aliasu i zaměnitelná URL vedou k odmítnutí. Neověřuje živé přiřazení aliasu, přihlášený obsah preview ani kompatibilitu schématu. **Nikdy nepřepíná alias.** Testy ověřují pozitivní i negativní případy.
- `tools/pwa-start-bench-17068.mjs`: ve CI spustí třikrát izolovaný Chromium, každé kolo měří studený start, offline restart a online zotavení. Každé měření vychází z původního skutečného `browser-offline-17052.mjs` a žádné HTTPS volání na databázi nepovoluje. Kontroluje úplnost měření, p50/p95 a fixní prahy: cold ≤15 s, offline ≤12 s, recovery ≤15 s; překročení, chybějící měření nebo jediný neúspěšný běh zastaví CI. Do GitHub Step Summary patří jen časy, nikoli obsah rozpisu, tokeny nebo identifikátory zaměstnanců. Tři běhy lze považovat za CI baseline, nikoli za důkaz výkonu Safari.
- `.github/workflows/rak-development-validation.yml`: nové skripty, negativní jednotkové testy a trojité reálné měření jsou **povinné** až po dvou původních sestaveních a původních release gates; historické a bezpečnostní testy zůstávají aktivní.
- `SECURITY_DEPLOYMENT_17068_ADDENDUM.md`: přesný bezpečnostní postup, oddělení metadatové přípravy od skutečného rollbacku a podmínky zastavení.

## Aktuální bilance 13 bodů

**2/13 uzavřeno, 11/13 otevřeno nebo částečně.** P0.2 uzavřen výslovným přijetím rizika veřejné rotace; P1.3 technicky uzavřen jako dev CI proces. Nové testy jsou další práce na P1.4 a P2.1, **nikoli důkaz jejich úplného uzavření**. Ostatní body zůstávají podle `RAK_PLAN_17067_STATUS.md`.

- **P1.4 – částečně:** read-only preflight a dvě již doložená immutable READY preview. Stále chybí nezávislá kontrola aktivního aliasu a testovacího schématu, povolené a zaznamenané skutečné přeřazení pouze izolovaného preview aliasu zpět a dopředu, test autentizovaného obsahu a potvrzení bez ztráty lokálního návrhu. Produkční rollback se nesmí zkoušet bez výslovného souhlasu.
- **P2.1 – částečně:** trojí CI benchmark reálného Chromia s pevnými prahy; po zeleném běhu budou dostupná naměřená čísla v Actions. Stále chybí fyzické Safari/PWA časy na iPhonu, nejlépe 3× studený start a 3× offline otevření s názvem zařízení a verzí iOS, bez osobních dat. Prahy pro fyzické Safari stanovit až z měření, nikoli odhadem.

Nezačínej nové uživatelské změny ani body neoznačuj za hotové, pokud aktuální SHA nemá SUCCESS, READY a u bodů závislých na iPhonu reálné potvrzení. Hry jsou odstraněny, nevytvářej novou herní logiku.
