# RaK – zaměstnanecké Auth: bezpečný přechod (pouze development)

**Stav 19. 9. 2026:** 12 aplikačních účtů, z toho 3 administrátorské profily a 9 běžných zaměstnanců. Zatím 0 platných zaměstnaneckých Auth propojení. `rotation_state` zůstává anonymně čitelná záměrně, jinak by se současným uživatelům přestal načítat rozpis. Tento dokument není souhlas k nasazení na `main`.

## Co je již připravené

- Oddělená neveřejná `private.rak_employee_auth_links` s vazbou na `auth.users` a `game_accounts`.
- `public.rak_read_rotation_v1()` jen pro `authenticated`, ověřuje skutečnou existující relaci i vlastní identitu.
- Zaměstnanec potřebuje povolené propojení, správné *app_metadata*, odpovídající e-mail, potvrzený účet a nesmí být smazaný, zablokovaný ani administrátor. Práva nelze odvozovat z uživatelsky měnitelných `user_metadata`.
- Neveřejná databázová kontrola `SELECT private.rak_employee_rotation_cutover_readiness();` spuštěná správcem databáze vrací pouze souhrnné počty, nikoli jména nebo přihlašovací údaje. `database_ready=false` blokuje rozhodnutí o odstřižení starého přístupu. Tento výsledek **sám o sobě není potvrzením připravenosti klienta**.
- SQL testy `tools/security-employee-rotation-matrix.sql`, `tools/security-announcement-live-matrix.sql` a `tools/security-public-data-matrix.sql` používají transakci a `ROLLBACK`.

## Před vypnutím veřejných rotací

1. Připravit přihlašovací obrazovku a obnovu relace zaměstnance přes Supabase Auth, bez sdíleného PINu či univerzálního hesla. Nejprve ověřit přechod z dosavadního přihlášení, iPhone/PWA start, výpadek sítě a odhlášení.
2. Zřizovat účty výhradně podporovaným administrátorským Auth API na serveru, nikoli přímým zápisem do `auth.users` ani zveřejněním service-role klíče. Počáteční přístup každému předat bezpečnou individuální cestou. `@worker.rak.local` je interní identifikátor, ne doručitelný e-mail pro obnovu hesla; před použitím musí být vyřešen skutečný způsob obnovy účtu.
3. Pro všech 9 zaměstnanců vytvořit a povolit jednoznačné vazby, ověřit app_metadata a potvrzení; administrátory mezi zaměstnance nepřevádět. Kontrola musí hlásit 9/9 validních propojení, bez dalších vazeb a `database_ready=true`.
4. Ověřit živé HTTP přihlášení a čtení `rak_read_rotation_v1` na iPhonu pro reálného zaměstnance, vlastníka, administrátora a zástupce; zamítnutí neznámého účtu, podvrženého JWT, cizí relace, zablokovaného účtu a odvolaného propojení.
5. Změnit všechny klientské dotazy, aktualizace a realtime cesty používající `rotation_state` na ověřené čtení. Ověřit načtení rozpisu, absence, cache a přepnutí offline/online na dvou zařízeních; rozpis nesmí záviset na anonymním SQL SELECT ani skrytém fallbacku.
6. Teprve po úspěchu všech bodů a samostatném odsouhlasení bezpečně odebrat anonymní SELECT/politiku. Připravit a nacvičit návrat s přesným zachováním dat a revizí. `main` a produkční Supabase se nemění bez výslovného souhlasu.

**Bezpečnostní poznámka:** SQL matice simuluje nároky v databázi, nevytváří ani nepodepisuje skutečné JWT. `READY` na Vercelu není živým testem Auth. Nemažte stávající data a nevypínejte veřejné čtení, dokud není prokazatelně hotový klientský přechod.
