# RaK: veřejný rozpis při přihlášení pouze OS číslem

Stav 19. 9. 2026, testovací `development`, RaK 1.7.37. Zaměstnanci se přihlašují **jen OS číslem**. Nevytvářet zaměstnanecké Auth účty ani vyžadovat heslo/e-mail. OS číslo není bezpečný důkaz totožnosti.

## Ověřené hranice soukromí

- `public.rotation_state` je anonymně čitelná. Obsahuje rozpis, jména, kódy absencí, stručné poznámky a denní úpravy. Zadání OS čísla přístup k těmto datům kryptograficky ani serverově neomezuje. Neoznačovat rozpis za soukromý.
- Seznam aplikačních účtů, úplná OS čísla, nastavení pracovníků, administrátorské protokoly a zálohy nejsou anonymně čitelné; při každé změně zachovat jejich kontrolu oprávnění.
- Migrace `20260919071456_rak_public_rotation_reject_nested_secret_fields_os_only.sql` přidala databázový CHECK proti explicitním vnořeným polím typu e-mail, telefon, heslo, přístupový token, adresa nebo zdravotní informace. Běžná struktura rozpisu projde. Funkce je v neveřejném schématu a `anon` ani `authenticated` nemají přímé EXECUTE.
- Samotná kontrola názvů polí **nepozná citlivou informaci ve volném textu**. Migrace `20260919081521_rak_public_rotation_reject_secret_text_values.sql` proto přidala omezenou kontrolu rozpoznatelných e-mailových adres, českých telefonních čísel s předvolbou a některých formátů tokenů v textových hodnotách `payload` i `meta`. Při uložení celé rotace CHECK odmítne nalezený vzor. Test pokryl 16 zakázaných zápisů a běžná data.
- Druhá pojistka **neskrývá existující jména, kódy absence, poznámky ani jiné formáty osobních údajů**. Nezaručuje, že volný text není citlivý, nejde o anonymizaci a nenahrazuje autentizaci. Nezapisovat do veřejných poznámek zdravotní, kontaktní nebo jiné soukromé detaily; pro budoucí skutečně soukromý rozpis je nutná jiná přístupová architektura.

## Regresní postup

Spustit `tools/security-rotation-public-field-matrix.sql`, `tools/security-rotation-public-text-matrix.sql` a `tools/security-employee-os-only-matrix.sql` výhradně v testovací Supabase; testovací transakce končí `ROLLBACK`. Ověřit zamítnutí nepovolených klíčů i rozpoznatelných hodnot, povolení běžného rozpisu, anonymní načtení rotací a přihlášení OS číslem. Na iPhonu ověřit číslo verze, přihlášení OS číslem a vykreslení rozpisu; běžné zápisy rozpisu ověřit při příští skutečné administrátorské úpravě.

Větší zmenšení veřejného datového obsahu vyžaduje samostatnou analýzu závislostí klienta (rozpis, poznámky, absence, offline cache). Nevypínat anonymní SELECT automaticky a nepřecházet na zaměstnanecké Auth proti zadání. Produkční `main` ani produkční DB neměnit bez souhlasu.
