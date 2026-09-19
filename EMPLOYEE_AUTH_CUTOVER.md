# RaK – běžní zaměstnanci: pouze OS číslo (development)

**Závazné rozhodnutí 19. 9. 2026 · OS_ONLY_POLICY_20260919.** Běžní zaměstnanci používají jen dosavadní přihlášení OS číslem. **Nevytvářet jim Supabase Auth účty, nevyžadovat heslo, e-mail, OTP ani pozvánky.** Nejde o migraci 0/9 → 9/9. Administrace a role vlastníka zůstávají na samostatném skutečném ověření a kontrole oprávnění. Produkční `main` ani produkční Supabase se bez výslovného souhlasu nemění.

## Jak systém funguje

1. OS číslo je **identifikátor pro volbu profilu, nikoli autentizační faktor**. Kdo OS číslo zná nebo uhodne, může napodobit běžného zaměstnance. Nikde netvrdit, že vstup OS číslem zabezpečuje soukromý profil nebo omezuje čtení na zaměstnance. Funkce dostupné pouze přes OS číslo nesmějí zveřejňovat adresář zaměstnanců, kompletní OS čísla, soukromé kontakty, zálohy, administrátorské informace či jiná citlivá data.
2. Zachovat veřejně dostupné čtení stávajícího rozpisu `rotation_state` a funkci `rak_lookup_account_for_login_v1(text)`, aby aplikace dál fungovala bez hesel a e-mailů. Rozpis je technicky veřejně čitelný i mimo obrazovku aplikace: před přidáním nových osobních údajů ověřit minimální potřebný obsah a přiměřenost zveřejnění. Pokud bude požadována skutečně neveřejná rotace podle identity, samotné OS číslo to nemůže zajistit a je nutné zvolit jiný přístupový model po samostatné domluvě, nikoliv zaměstnancům tiše přidat hesla.
3. Výhradně skutečně ověřená administrátorská relace smí číst seznam pracovníků, historii změn a osobní nastavení, měnit stroje či rozpisy a pracovat se zálohami. Kontroly provádět na serveru a v RLS/RPC, nikoli podle lokálního příznaku `adminUnlocked`, zadaného OS čísla nebo pozměnitelných `user_metadata`.
4. Běžný zaměstnanec nesmí získat administrátorská práva ani přepisovat sdílené rozpisy pouhou změnou OS čísla. Zapisovací API a případné veřejné reporty dál jednotlivě auditovat: vstupy omezit, nezveřejňovat soukromá data a neodvozovat oprávnění od OS čísla.

## Starší příprava Auth – NEPOUŽÍVAT jako plán

Migrace `20260919055938_rak_employee_rotation_cutover_readiness_and_disabled_worker_guard` a `20260919062619_rak_worker_verified_email_recovery_staging`, tabulka `private.rak_employee_auth_links`, čtečka `rak_read_rotation_v1` a pomocná kontrola `private.rak_employee_rotation_cutover_readiness()` vznikly ještě podle **nyní zrušeného zadání**. Ponecháváme již aplikovanou databázovou historii, nesmažeme tabulky, účty ani funkce naslepo. V aktuální aplikaci se zaměstnanecká Auth čtečka nepoužívá. Její případné `database_ready=true` **není cíl ani svolení odebrat veřejný SELECT**. Také historický příznak `requires_recovery_delivery_smoke=true` není úkol: žádné doručování e-mailů ani obnova zaměstnaneckého hesla se neplánují. Stav 0/9 je správný, nikoli nedokončená migrace. Nikdo nesmí hromadně zakládat zaměstnanecké Auth účty ani přepínat klienta na tuto čtečku podle starých pokynů.

## Povinné testy změn souvisejících s přihlášením

- Spustit `tools/security-employee-os-only-matrix.sql` na **testovací Supabase**, transakce musí končit `ROLLBACK`. Ověří funkci přihlášení OS číslem, čitelnost živé rotace, nulové zaměstnanecké Auth vazby a skrytí administrátorského seznamu pracovníků. Navazující testy osobních údajů, rolí a API se neruší.
- V testovací PWA na iPhonu ověřit vstup pouze OS číslem, načtení rozpisu, odhlášení/přepnutí profilu, návrat po offline stavu a zamítnutí administrace bez skutečné administrátorské relace. Nezobrazovat zaměstnancům pole e-mail, heslo ani OTP.
- Před změnou RLS pro rotace znovu ověřit anonymní SELECT; automatický zákaz veřejného čtení při `database_ready=true` je zakázaný. `main` a produkční data nepřenášet bez výslovného souhlasu.

**Aktuální stav:** 12 aplikačních účtů (3 administrátorské a 9 běžných), zaměstnanecké Auth 0/9, veřejné čtení rotací ponecháno. Starý název tohoto dokumentu `EMPLOYEE_AUTH_CUTOVER.md` zůstává kvůli existujícím odkazům, ale samotný plán Auth přechodu je zrušen.
