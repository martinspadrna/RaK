# RaK 1.7.38 – autor rozpisu není veřejný údaj

Testovací development, 19. 9. 2026. Přihlášení běžných zaměstnanců zůstává pouze OS číslem, bez hesel, e-mailů a nových Auth účtů. OS číslo neověřuje identitu; rozpis proto zůstává veřejně čitelný i mimo PWA.

Nově odstraněno: `rotation_state.meta.savedBy` pro stávající veřejný záznam. Serverový BEFORE INSERT/UPDATE trigger jej odebírá i při další administrátorské úpravě a validovaný CHECK brání jeho návratu. Aplikační revize 50 ani časové razítko se při migraci nepřepisovaly. Samotný administrátorský zápis nadále vyžaduje skutečnou ověřenou relaci; autorství se eviduje v neveřejném `rak_admin_audit_log`, soukromé zálohy `rak_rotation_backups_v2` zůstávají zachovány.

Rollback-only regresní test: `tools/security-rotation-public-actor-matrix.sql`. Při podepsané relaci vlastníka zkusí uložit reálný rozpis beze změny obsahu, zkontroluje zvýšení revize, privátní audit i zálohu, anonymní čtení a absenci `savedBy`; celá transakce se vrátí zpět.

NEVYŘEŠENO: veřejný rozpis stále obsahuje 24 měsíců historie, jména, absence, poznámky a denní úpravy. Jejich odstranění může změnit statistiky, generátor, rozpis a offline režim, proto je bez testu nemažeme. Staré lokální offline snapshoty či privátní historické zálohy mohou stále uchovávat dřívější hodnotu metadat. Žádné nové přihlášení zaměstnanců se nezavádí. Produkční `main` a produkční Supabase se bez souhlasu nemění.
