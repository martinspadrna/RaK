# RaK – průběžný plán 13 úkolů

Stav k 19. 9. 2026; výchozí větev `development`, verze 1.7.39. Tento soubor popisuje průběh, **není potvrzením hotového auditu**. „Hotovo“ se smí použít až po nezávislém testu a ověření provozu. Zaměstnanci používají pouze OS číslo, bez hesla, e-mailu a zaměstnaneckých Supabase Auth účtů. Na `main` a produkční Supabase bez výslovného souhlasu nesahat.

| Bod | Oblast | Stav | Doložený výsledek / zbývá |
|---|---|---|---|
| P0.1 | Účty a data pracovníků | ČÁSTEČNĚ | Adresář a kompletní OS čísla bez anonymního SELECT; ověřit všechny cesty exportu, úniky přes RPC a reálný HTTP/JWT test. OS číslo není důkaz identity. |
| P0.2 | Rotace a soukromí | ČÁSTEČNĚ | Kontroly zakázaných polí, vzorů v textu a odstranění `savedBy`; **jména, absence, poznámky a 24 měsíců historie jsou veřejné**. Zmapovat statistiky a offline režim před změnou datového modelu. |
| P0.3 | API a exporty | ČÁSTEČNĚ | Omezen veřejný RPC povrch; zbývá browser/HTTP test a úplný audit exportů na reálné aplikaci. |
| P0.4 | Role vlastníka | ČÁSTEČNĚ | Serverové podmínky a SQL matice existují; zbývá kompletní test skutečné relace, oprávnění dalších administrátorů a obnovy přístupu. |
| P1.1 | Oprávnění a RLS | OTEVŘENO | Důkladně projít všechny role, policy a SECURITY DEFINER funkce; žádné plošné přidávání veřejných práv. |
| P1.2 | Hesla administrátorů a relace | OTEVŘENO | Audit administrátorských hesel, ochrany uniklých hesel a rušení relací; neplatí pro zaměstnance. |
| P1.3 | Build, testy a verze | ČÁSTEČNĚ | RaK 1.7.39 přidává společnou verifikační bránu pro release/PWA/Supabase a její jednotkové testy; zbývá reprodukovatelné sestavení a nezávislý mobilní smoke. |
| P1.4 | Nasazování a rollback | OTEVŘENO | Jedna tematická změna = jeden commit na development + jeden finální preview build. Produkční alias stále ukazuje na historický omylem vytvořený deployment; GitHub main je na původním SHA, rollback aliasu zbývá. |
| P1.5 | Integrita dat a zálohy | OTEVŘENO | Zálohy/audity a revize testovací rotace zachovány; zbývá ověřit kompletní restore a scénáře konfliktů. |
| P2.1 | Výkon startu PWA | OTEVŘENO | Změřit cold/warm start na reálném iPhonu. |
| P2.2 | Načítání, CSS a DOM | OTEVŘENO | Změřit a cíleně zmenšit náklady na přepnutí obrazovek bez vizuálních regresí. |
| P2.3 | Offline cache a aktualizace | OTEVŘENO | Ověřit aktualizace iOS PWA, staré snapshoty a návrat online; netvrdit, že změna DB maže stará offline data. |
| P2.4 | Diagnostika a výkonnostní testy | OTEVŘENO | Doplnit reálná měření, logy a prahy regresí. |

**Bilance:** 0/13 celých bodů uzavřeno, P0.1–P0.4 a P1.3 částečně rozpracované. Starší dokumentační „100 %“ due-diligence report není stavem tohoto 13bodového implementačního plánu.

**Následující větší balíky:** (1) P0.2 + P1.5: inventura 24 měsíců, offline závislostí, záloh a bezpečná datová projekce; (2) P0.3 + P0.4 + P1.1: end-to-end oprávnění, API a exporty; (3) P1.2–P1.4: provozní zabezpečení a rollback; (4) P2.1–P2.4: výkon měřený na zařízení. Balíky spojovat tematicky, ale nepřeskočit bezpečnostní ověření.
