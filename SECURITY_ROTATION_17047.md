# RaK 1.7.47 · testovací balík ochrany dat a záloh

## Co se skutečně mění

- V testovací Supabase se rozšířil nezveřejněný validátor `private.rak_rotation_has_restricted_public_key`. Vnořené klíče osobních čísel, ID účtů, autentizačních údajů, celých jmen a seznamů lidí se nově nepodaří uložit do veřejného JSONu rotace. Standardní `person`, `code` a `text` zůstávají zachované; jejich obsah však **zůstává veřejný**.
- Trigger `private.rak_machine_settings_no_public_leak_v1` odmítá budoucí ukládání osobních/identifikačních klíčů a rozpoznatelných kontaktů do veřejných řádků `machine_settings`. Výjimky platí jen pro stávající RLS-skryté kategorie záloh, auditů, admin účtů a seznamu pracovníků; prověřuje se odděleně `category`, `type`, `stored_category` i prefix soukromého klíče. Neotevírá nová SELECT/EXECUTE práva.
- Omezení pro `rak_rotation_backups_v2` se rozšířilo o neprázdné `months`, objekty `hard` a `soft`, pole `notes`, typ `dayMods` a pět povinných textových položek záznamu absence (`date`, `person`, `code`, `text`, `shift`). Soukromé archivy historických importů nejsou přepisované.

## Co se nemění a co stále není vyřešeno

- Zaměstnanci zadávají pouze osobní číslo; administrátor nadále heslo. Žádná změna obsahu rotace, generátoru, statistiky, offline snapshotu, produktové databáze ani produkčního aliasu.
- Rozpis v `public.rotation_state` s jmény, kódy absencí, poznámkami a 24 měsíci historie je stále anonymně čitelný. Pravidla pro statistiky a generátor vyžadují přístup k těmto datům, takže se přístup neuzavírá bez kompatibilního návrhu. OS číslo samo o sobě není silná autentizace.
- Regresní test je transakční: zkušební INSERT poškozené zálohy a UPDATE veřejného nastavení s `accountNumber` a e-mailem musí selhat. Běžné nastavení a chráněný seznam se nadále aktualizují. Celý test končí ROLLBACK. Reálné stažení owner ZIPu a nezávislá obnova ještě neproběhly.

## Stav testovací databáze po migraci

Revize rotace 50, 11 původních záloh (11/11 validních), 12 soukromých záznamů importu a 50 strojních nastavení. Žádný provozní záznam se neanonymizoval ani nesmazal. Pozor, starší owner-only zálohy obsahují historickou importní provenienci a nesmí se zveřejňovat.

## Konkrétní mobilní kontrola

Ověřit pouze nový štítek 1.7.47, OS-only login, výpis rotací/absencí, vstup do statistik a vlastníka do seznamu záloh. Není nutné zkoušet části kalkulaček, které se neměnily; u nastavení strojů je vhodná jediná nedestruktivní kontrola zobrazení. Neotevírat plný ZIP mimo soukromé úložiště.
