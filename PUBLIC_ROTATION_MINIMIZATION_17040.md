# RaK 1.7.40 – veřejný rozpis: bezpečné oddělení importních metadat

Pouze větev `development` a testovací Supabase `cgshssdjgzzuprlwnabl`.
Zaměstnanec se nadále přihlašuje pouze OS číslem, bez hesla, e-mailu či Supabase Auth účtu. **OS číslo není důkaz totožnosti.**

## Potvrzené závislosti a hranice

- Jediný synchronizovaný řádek `public.rotation_state` obsahoval 24 měsíců, 346 záznamů poznámek a 26 denních změn. `hard`, `soft`, `notes` a `dayMods` se ponechávají beze změny; historické údaje využívají statistiky, přehledy a offline režim.
- `stats.js` vyhodnocuje kódy i text absencí, `rak-vacation-report.js` prochází historické měsíce. `core.js` ukládá celý `app.rotation` do localStorage a `supabase-bridge.js` také uchovává offline snapshot. Starší offline kopie nejsou databázovou migrací automaticky smazány.
- Service worker cachuje lokální statické soubory a navigaci; cizí Supabase API odpovědi neodchytává. To **neznamená**, že lokální úložiště neobsahuje rozpis.
- `importMeta` je výhradně metadata Excel importu (`source`, `sheetName`, `hardRows`, `softRows`, `absenceRows`, měsíc a rok). Před migrací bylo toto pole u 12 měsíců; aplikace ho vytváří při importu a kopíruje při normalizaci, ale statistiky ani zobrazení rozpisu je nečtou.

## Realizace

1. Migrační trigger archivuje `months.*.importMeta` do soukromé tabulky `private.rak_rotation_import_metadata_v1` a z veřejného payloadu jej odstraňuje při původním i budoucím uložení. Soukromá tabulka má RLS a žádná práva pro anonymní či běžné autentizované role; obsah se při opakovaném importu aktualizuje, pokud se změní.
2. Databázový CHECK zakazuje návrat `importMeta` do veřejného JSON i vyplnění doposud prázdného veřejného sloupce `current_employee_name`.
3. Klient při synchronizaci žádá explicitně pouze `id,key,payload,meta,revision,updated_at` místo `*`. To omezuje stahovaná pole, **samo o sobě to ale neodstraňuje jejich veřejné databázové oprávnění**.
4. SQL regresní test v transakci kontroluje archivaci při příštím zápisu, zachování celého zbytku JSON včetně poznámek, revize a metadat, odmítnutí veřejného jména a anonymní SELECT. Končí `ROLLBACK`.

## Co zatím chráněné není

Jména, absence, poznámky a historie nadále leží v anonymně čitelném `public.rotation_state`. Archivace importních metadat není anonymizace a **neřeší hlavní riziko soukromí**. Omezení anonymního SELECT nebo odstranění historických měsíců by bez náhradní autorizační/datové cesty rozbilo zaměstnanecký přístup, statistiky či offline režim. Nebyl zaveden žádný nový přihlašovací krok. Případné skutečně neveřejné údaje je nutné oddělit na základě ověřeného přístupu, nikoli pouze OS čísla.

## Kontrola

Na testovací databázi ověřit migraci a `tools/security-rotation-minimization-17040.sql`; zkontrolovat počty měsíců, poznámek, denních změn, revizi, soukromé zálohy i anonymní oprávnění. Po buildu ověřit verzi 1.7.40, technickou 1.7.0, testovací Supabase a novou PWA cache. Na iPhonu stačí rozpis, absence/poznámky, statistiky za minulý měsíc a offline otevření historického měsíce. Produkční `main` a produkční databázi neměnit.
