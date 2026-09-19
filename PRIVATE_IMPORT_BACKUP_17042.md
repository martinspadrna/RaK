# RaK 1.7.42 – ochrana soukromých metadat při úplné záloze

Pouze `development`, testovací Supabase `cgshssdjgzzuprlwnabl`. Přihlášení běžných uživatelů **jen OS číslem** zůstává stejné. Nezřizují se zaměstnanecké e-maily, hesla ani Supabase Auth účty; OS číslo samo o sobě neověřuje identitu.

## Problém a změna

- Veřejný rozpis již neobsahuje `months.*.importMeta`: databázový trigger jej archivuje do `private.rak_rotation_import_metadata_v1`, kde je na testu 12 záznamů. Původní owner-only RPC pro úplnou zálohu však exportovalo jen data z `public` (plus sanitizované Auth a Storage). Schéma soukromé tabulky v záloze bylo, její **data nikoli**.
- Migrační patch zachovává stávající funkci `rak_owner_complete_backup_v1()` i kontrolu `private.rak_require_admin(true)` a její oprávnění. Do `data.private` přidává jen `rak_rotation_import_metadata_v1` s deterministickým pořadím řádků. Neexportuje `rak_login_lookup_salt`, limity vyhledávání ani žádné přihlašovací tajemství.
- ZIP export před komprimací kontroluje přesně jeden očekávaný soukromý klíč a strukturu záznamů. Bez migrovaného backendu nebo při nečekaných soukromých datech záloha **selže, místo aby tiše vytvořila neúplný nebo nebezpečný archiv**. Do ZIP přidává `supabase/data/private/rak_rotation_import_metadata_v1.json`, manifest uvádí počet záznamů a README pořadí obnovy až po migracích. Úplný snapshot obsahuje tentýž archiv. Potvrzovací dialog upozorňuje na citlivost ZIPu.
- Aktualizace je jen v owner-only úplné záloze. Nemění rotace, statistiky, absenci, offline cache, rozpisy ani běžné přihlášení. Stávající role a JSON políčka nejsou přepisována.

## Ověření a omezení

SQL regresní test na testovací databázi: anon nemá EXECUTE backup RPC ani SELECT soukromé tabulky, běžné authenticated nemá SELECT soukromé tabulky; owner gate je zachován; JSON serializace vrací všechny archivované řádky a sloupce. Test běží v transakci zakončené `ROLLBACK`. Ověřit počty a revizi před/po, oba build průchody, verzi/PWA a kompatibilitu OS loginu. Na iPhonu zkontrolovat dostupnost Úplné zálohy jen vlastníkovi a vytvoření ZIPu včetně privátního JSON a manifestu; u běžného uživatele se její tlačítko nesmí zobrazit.

**Bezpečnostní hranice:** Záloha obsahuje osobní data, uchovávat pouze bezpečně. Veřejně čitelná jména, absence, poznámky a 24 měsíců historie v `rotation_state` stále nejsou chráněná; OS číslo neumožňuje bezpečné soukromé individuální autorizace. Záloha neobsahuje aktivní relace/hesla/salt ani kompletní platformní Auth dump. Celkový bod P0.2 ani P1.5 není uzavřen bez skutečné obnovy do oddělené DB a testu konfliktů. Žádná produkční změna.
