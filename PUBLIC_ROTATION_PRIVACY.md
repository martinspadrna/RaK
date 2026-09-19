# RaK: veřejný rozpis při přihlášení pouze OS číslem

Stav 19. 9. 2026, testovací `development`. Zaměstnanci se přihlašují **jen OS číslem**. Nevytvářet zaměstnanecké Auth účty ani vyžadovat heslo/e-mail. OS číslo není bezpečný důkaz totožnosti.

## Ověřené hranice soukromí

- `public.rotation_state` je anonymně čitelná. Obsahuje rozpis, jména, kódy absencí, stručné poznámky a denní úpravy. Zadání OS čísla přístup k těmto datům kryptograficky ani serverově neomezuje. Neoznačovat rozpis za soukromý.
- Seznam aplikačních účtů, úplná OS čísla, nastavení pracovníků, administrátorské protokoly a zálohy nejsou anonymně čitelné; při každé změně zachovat jejich kontrolu oprávnění.
- Migrace `20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql` přidává databázový CHECK proti explicitním vnořeným polím typu e-mail, telefon, heslo, přístupový token, adresa nebo zdravotní informace. Běžná struktura rozpisu projde. Funkce je v neveřejném schématu a `anon` ani `authenticated` nemají přímé EXECUTE.
- CHECK **nepozná citlivou informaci ve volném textu** a neschová existující jména, kódy absence ani poznámky. Před používáním takového textu posoudit obsah a nezapisovat do něj zdravotní, kontaktní nebo osobní detaily. Technickou kontrolu nenazývat anonymizací či úplnou ochranou osobních údajů.

## Regresní postup

Spustit `tools/security-rotation-public-field-matrix.sql` a `tools/security-employee-os-only-matrix.sql` výhradně v testovací Supabase; testovací transakce končí `ROLLBACK`. Ověřit zamítnutí vnořených nepovolených polí, povolení běžného rozpisu, anonymní načtení rotací a přihlášení OS číslem. Na iPhonu ověřit číslo verze, přihlášení OS číslem a vykreslení rozpisu; běžné zápisy rozpisu ověřit při příští skutečné administrátorské úpravě.

Větší zmenšení veřejného datového obsahu vyžaduje samostatnou analýzu závislostí klienta (rozpis, poznámky, absence, offline cache) a následné testování. Nevypínat anonymní SELECT automaticky a nepřecházet na zaměstnanecké Auth proti zadání. Produkční `main` ani produkční DB neměnit bez souhlasu.
