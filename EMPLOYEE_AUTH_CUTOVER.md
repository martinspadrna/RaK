# RaK – zaměstnanecké Auth: bezpečný přechod (pouze development)

**Stav 19. 9. 2026 / RaK 1.7.34:** 12 aplikačních účtů, 3 administrátorské profily, 9 běžných zaměstnanců. Dosud 0 platných zaměstnaneckých Auth propojení. `rotation_state` je nadále anonymně čitelná záměrně: stávající přihlášení pomocí OS čísla není Supabase Auth. Dokument ani příprava není souhlas s nasazením na `main`.

## Připravené zabezpečení

- Neveřejná tabulka `private.rak_employee_auth_links` váže `auth.users.id` na jediné aplikační OS číslo; zaměstnanec musí mít `enabled=true`, vlastní administrátorem nastavené `app_metadata.rak_role='employee'` a `rak_account_id` odpovídající interní vazbě. `user_metadata` se k autorizaci nepoužívá.
- `public.rak_read_rotation_v1()` je pouze pro `authenticated`, ověřuje existující skutečnou relaci proti `auth.sessions` a správný účet. Odvolaná vazba, zablokovaný, smazaný nebo anonymní účet neprojde. Administrátoři se ověřují samostatně a nesmějí se maskovat jako zaměstnanci.
- Od RaK 1.7.34 používá `private.rak_worker_email_ready` platně formátovanou, potvrzenou individuální e-mailovou identitu. Doména `worker.rak.local` a nepotvrzený/anonymní účet jsou zamítnuty. OS číslo zůstává interní vazbou, **nikoli přihlašovacím heslem ani automaticky odvozeným e-mailem**. Samotný formát a potvrzení ale ještě nedokazují doručitelnost obnovy; ta vyžaduje samostatnou živou zkoušku.
- Neveřejná souhrnná kontrola `SELECT private.rak_employee_rotation_cutover_readiness();` je pouze pro správce DB. `database_ready=false` brání ukončení starého čtení. Příznak `requires_recovery_delivery_smoke=true` znamená, že ani budoucí `database_ready=true` nestačí bez skutečného mobilního přihlášení a doručené obnovy hesla.
- Regresní SQL testy `tools/security-employee-rotation-matrix.sql`, `tools/security-worker-email-recovery-matrix.sql`, `tools/security-announcement-live-matrix.sql`, `tools/security-public-data-matrix.sql` používají transakce s `ROLLBACK`.

## Bezpečná příprava účtů – dosud nespouštět hromadně

1. Nejprve vytvořit a ověřit klientský tok: **individuální e-mail + heslo** nebo e-mailový OTP s `shouldCreateUser:false`, obnova relace a odhlášení. Pokud uživatel vstupuje OS číslem, aplikace z něj nesmí anonymní veřejnou funkcí získat jeho soukromý e-mail; pro Auth bude potřeba doplňkové pole e-mailu či samostatný bezpečný serverový tok. Současný login necháme fungovat, dokud tento tok nebude připraven.
2. Individuální účet zřizovat výhradně přes podporované serverové Supabase Auth Admin API / Dashboard a potvrdit jeho reálnou e-mailovou adresu. Nevkládat přímo do `auth.users`, nevystavovat `service_role` nebo secret key v klientovi, neposílat hesla do GitHubu či do chatu a nepoužívat společný PIN. Pozvánku lze poslat přes `inviteUserByEmail` z důvěryhodného serveru. Výchozí e-mailová služba může mít nízké limity; doručitelnost, SMTP a bezpečné přesměrování na testovací PWA nejdříve ověřit.
3. Nejprve na jediném dobrovolném testovacím zaměstnanci ověřit pozvánku, potvrzení, uložení admin `app_metadata`, správnou privátní vazbu, přihlášení na iPhonu, čtení rotací, obnovení přístupu a odvolání vazby. Po testu neponechávat výjimky. Nikdy nezkoušet s cizím účtem bez oprávnění.
4. Teprve poté postupně propojit všechny zbývající zaměstnance, bez administrátorů. Kontrola musí vracet přesně 9/9 platných vazeb, žádné navíc a `database_ready=true`; nesmí se vypisovat jejich jména ani e-maily do diagnostických logů.
5. Samostatně otestovat skutečné podepsané HTTP/JWT pro zaměstnance, vlastníka, administrátora a zástupce, plus odmítnutí neznámého, podvrženého, cizího, zablokovaného, smazaného a odvolaného účtu. Simulace SQL s nastavenými JWT claims toto **nenahrazuje**.
6. Přesměrovat všechny klientské dotazy, realtime a obnovu cache používající `rotation_state` na ověřenou cestu; ověřit rozpisy, absence a offline/online na dvou zařízeních. Zjistit i chování přihlášení při selhání e-mailové služby a ztrátě zařízení.
7. Teprve po úspěchu těchto zkoušek, záloze a samostatném schválení připravit odebrání anonymního SELECT / politiky. Nacvičit návrat bez ztráty dat a revizí. `main` a produkční Supabase se nemění bez výslovného souhlasu.

**Aktuální očekávaný stav:** 0/9, `database_ready=false`, `legacy_anonymous_rotation_grant=true`. Nikdo nebyl automaticky přidán a není důvod, aby uživatelé nyní měnili své přihlášení.
