# RaK – plán bezpečnostních, stabilizačních a výkonnostních oprav

**Schválený pracovní plán:** 18. 9. 2026. **Výchozí testovací verze:** RaK 1.7.25, `development` na `632075e9eacb66bf6dc6d4fe60db91a3e292dacd` v době sestavení plánu. **Postup:** vždy pokračovat z nejnovější potvrzené verze na `development`; safepoint použít jen na výslovnou žádost. `main` a produkční Supabase neměnit bez výslovného souhlasu Martina. Technickou verzi při pouhém ukládání plánu neměnit.

> Stav: **0/13 realizovaných bodů**. Předchozí audit a kontrola dat nejsou implementace. Uvedené nálezy jsou předběžné vstupy pro bezpečně provedené opravy. Tento soubor je ve veřejném repozitáři: nikdy do něj nevkládat hesla, tokeny, identifikátory relací, privátní odkazy, osobní data zaměstnanců ani exploitační postupy.

## Řízení práce a evidence

- Před každým balíkem ověřit HEAD `development`, deployment Vercel a cílové Supabase; nezahazovat cizí změny. Zálohovat relevantní data, ověřit možnost návratu.
- Provádět tematické balíky, minimalizovat počet buildů. Změny klienta, oprávnění a databáze pořadím sladit, aby přihlášení a rotace nezůstaly nefunkční. DB migrace pouze v testovacím projektu a s verifikací; produkční změny samostatně až po souhlasu.
- Status úkolu změnit na `[x]` pouze po implementaci, příslušných testech a ověření výsledku. Do záznamu balíku uvést Git SHA, testy, Vercel deployment, výsledky, zbývající rizika a přesné iPhone kontroly.
- Nefunkční či nedostupné interaktivní testy výslovně označit jako neprovedené; buildové smoke testy nejsou náhradou živého iPhone/browser testu.

## P0 – bezpečnost (0/4)

### P0.1 [ ] Omezit veřejné čtení osobních čísel a jmen při zachování vyhledávání účtů
- Zmapovat závislosti loginu, profilu, volby účtu, pozdravů a hlášení chyb na veřejném adresáři.
- Navrhnout minimální serverové vyhledávání a vhodnou autentizaci zaměstnanců; samotné krátké číslo účtu není bezpečný důkaz identity.
- Přizpůsobit frontend ještě před omezením přístupů; změnit RLS/granty a následně ověřit anonymní přístup.
- Otestovat první/opakované přihlášení, změnu účtu, role, offline kompatibilitu a absenci úniku celého adresáře.
- **Hotovo, když:** bez oprávnění nelze získat kompletní osobní adresář a legitimní login nadále funguje.

### P0.2 [ ] Prověřit a omezit veřejné čtení provozních údajů a rotací
- Zmapovat skutečné požadavky rolí na `rotation_state`, související tabulky a všechny používané datové cesty.
- Oddělit nutné zaměstnanecké čtení od administrátorského čtení a zápisu; zajistit minimální data a vhodné serverové/RLS kontroly.
- Otestovat směny A/B/C/D, zobrazení, synchronizaci, generátor, ukládání a zálohování.
- **Hotovo, když:** anonymní čtení nezpřístupní neautorizovaný dataset a povolené scénáře fungují.

### P0.3 [ ] Zabezpečit veřejná RPC, historická API a citlivé exporty
- Keepalive: zavést velikostní a frekvenční limity, omezit počet nezávislých zařízení a dobu uchování.
- Hlášení chyb: nezakládat anti-spam pouze na klientem tvrzené identitě; otestovat limity; stará RPC/API vyřadit až po ověření nepoužívání aktuálním klientem.
- Kalendář: odstranit privátní odkaz ze zdrojového kódu / fallbacku, používat chráněnou konfiguraci; prověřit historii a v případě zveřejnění privátní URL obnovit.
- Kompletní zdrojový ZIP: ověřit skutečnou dostupnost, obsah a oprávnění; zálohu poskytnout pouze ověřenému vlastníkovi nebo přes privátní úložiště.
- Prověřit veřejně volatelné privilegované funkce a minimalizovat `EXECUTE` po ověření závislostí.
- **Hotovo, když:** nadbytečné endpointy jsou uzavřené, současné hlášení funguje a žádný privátní soubor není anonymně dostupný.

### P0.4 [ ] Bezpečně odstranit testovací automatické přidělování role vlastníka
- Nejdříve potvrdit funkčního stávajícího vlastníka a připravit obnovu přístupu/zálohu.
- Odstranit klientský bootstrap, související databázový trigger a privilegovanou funkci pouze na testu.
- Otestovat nový běžný účet (bez povýšení), stávající owner login, správu rolí a stav po případném resetu účtu.
- Produkční konfiguraci pouze porovnat; do produkce nezasahovat bez schválení.
- **Hotovo, když:** registrace nemůže automaticky přidělit owner a existující owner neztratí přístup.

## P1 – stabilita a ochrana (0/5)

### P1.1 [ ] Zavést testovací matici všech oprávnění
- Role: anonymní, zaměstnanec, zástupce, admin, vlastník. Operace: čtení povolených rozpisů, reporty, změny rotací a strojů, správa rolí, zálohy.
- Otestovat přímé RPC/API, podvržené údaje klienta, chybějící/expirovanou relaci, odhlášení a revokované zařízení.
- Oprávnění musejí vynucovat server a databáze, nikoli jen viditelnost tlačítek.
- **Hotovo, když:** negativní i pozitivní scénáře mají automatické a ověřené výsledky.

### P1.2 [ ] Ochrana hesel, relací a CSP
- Zpřísnit nově nastavovaná administrátorská hesla a zapnout dostupnou ochranu proti známým uniklým heslům; otestovat změnu a obnovu hesla.
- Opravit nejednoznačné `authenticated` v admin kontextu při neplatné identitě a prověřit kontrolu role a platné relace ve všech privilegovaných operacích.
- Zmapovat a postupně odstranit závislosti CSP na inline skriptech, zpřísnit hlavičky; prověřit omezení zoomu a přístupnost.
- **Hotovo, když:** neplatné relace nemají privilegia a přísnější politika neničí UI.

### P1.3 [ ] Verze, Node.js a závislosti
- Jeden zdroj pravdy pro technickou i zobrazovanou verzi, PWA build, SW cache a exporty.
- Připnout podporovanou hlavní verzi Node.js a správce balíčků; commitnout lockfile, reprodukovatelná instalace a kontrola závislostí.
- Ověřit čistý build v prostředí odpovídajícím Vercelu.
- **Hotovo, když:** stejný SHA vytvoří reprodukovatelný build se správnou verzí.

### P1.4 [ ] Zabezpečit main a proces nasazování
- Nastavit ochranu `main` před nechtěnými přímými/force změnami a povinné ověření testů dle dostupných GitHub oprávnění.
- Prověřit oddělení test/prod Supabase, environment proměnné, přesný deployment SHA, monitoring a rollback.
- Připravit postup pro bezpečné produkční migrace se zálohou; žádné změny `main` ani produkčních dat bez souhlasu.
- **Hotovo, když:** testovací commit nemůže nechtěně upravit produkci a produkční nasazení má kontrolní bránu.

### P1.5 [ ] Souběžné ukládání, obnovení zálohy a offline/PWA
- Simulovat dva editory na stejné revizi: zastaralý zápis se nesmí tiše prosadit.
- Vyzkoušet obnovu *kopie* zálohy v izolovaném testu a porovnat obsah, revize a návrat na původní stav; nepřepisovat aktivní testovací rotace bez zvláštního plánu.
- Otestovat výpadky během startu a ukládání, neúplné přednačtení, aktualizaci za běhu, offline opětovné otevření a znovupřipojení.
- **Hotovo, když:** nevzniká tichá ztráta dat ani smíchání verzí.

## P2 – výkon a údržba (0/4)

### P2.1 [ ] Změřit skutečný výkon na iPhonu
- Změřit studený/opakovaný start, první start po aktualizaci, dashboard, rotace, administraci, PNG/export a pomalou/offline síť.
- Zachytit dobu do použitelného stavu, počet požadavků, objem dat a porovnat před/po, se stejným zařízením a metodikou.
- **Hotovo, když:** jsou uložené reprodukovatelné hodnoty, ne jen dojem.

### P2.2 [ ] Zrychlit start a optimalizovat obrázky
- Rozdělit kritické a odložené soubory, zmenšit SW prewarm, optimalizovat velikost a rozměry obrázků.
- Správně verzovat cache; náročné knihovny načítat až při potřebě.
- Otestovat vizuál, offline a PNG/Excel exporty po optimalizaci.
- **Hotovo, když:** naměřené zrychlení nemá funkční regresi.

### P2.3 [ ] Zjednodušit CSS a historický build
- Inventarizovat konfliktní CSS, odstraňovat duplicity po blocích s vizuálním porovnáním mobilu a PNG.
- Zmapovat skripty, které během sestavení mění zdrojáky; po částech převést konečný stav do spravovaných zdrojů a odstranit nepotřebné transformace.
- Každou část zajistit regresními testy a reprodukovatelným clean buildem.
- **Hotovo, když:** build je předvídatelnější a vzhled i funkce jsou zachovány.

### P2.4 [ ] Zavést anonymizovanou klientskou diagnostiku
- Zachytit JS/network chyby, verzi app/SW, dobu načtení, synchronizaci a výsledky PNG, schránky a sdílení.
- Vyloučit hesla, tokeny, celé rozpisy a nepotřebná osobní data; nastavit retenční limity a omezení objemu.
- Připravit administrátorský přehled podle verze a chybové oblasti.
- **Hotovo, když:** problém lze spolehlivě lokalizovat při respektování soukromí.

## Realizační balíky (A–F)

- **A – Příprava a pojistky:** ověřit HEAD/deployment/databáze, zálohy a rollback, zmapovat závislosti, připravit testovací scénáře. Preferovat bez deploymentu.
- **B – Bezpečnost P0:** vyřešit body P0.1–P0.4 koordinovaně pouze na developmentu a testovací Supabase; databázové změny až po zajištění kompatibilního klienta. Jedna či minimum tematických verzí, s izolovanou verifikací.
- **C – Oprávnění a stabilita:** P1.1, P1.2 a P1.5; včetně živých oprávnění, souběhu, záloh a offline testů.
- **D – Build a nasazovací proces:** P1.3 a P1.4. Ochrana `main` a jakékoli úpravy produkčního prostředí pouze v rozsahu výslovně schváleném vlastníkem.
- **E – Výkon a údržba:** P2.1–P2.4; napřed měřit, následně optimalizovat a porovnat.
- **F – Závěrečný audit:** opakovat bezpečnostní matici, všechny kritické testy, ověřit mobile/browser, závěrečný seznam 13/13 a připravit návrh produkčního nasazení. Žádný automatický merge do `main`.

## Povinná kontrolní brána každého dokončeného balíku

1. Výchozí a výsledný SHA, pouze `development`, bez neočekávaných dalších změn.
2. `npm run check` + příslušné automatické/regresní testy; nezaměňovat build log za nezávislé spuštění.
3. Testy autentizace, RLS, citlivých funkcí a přístupu k datům, kterých se balík týkal.
4. Stav Vercel `READY` **pro přesně stejný výsledný SHA** (nebo výslovně označit dokumentační commit se záměrně přeskočeným buildem).
5. Testovací Supabase správného projektu, zachování aktivních dat, ověřený stav/počet revizí a záloh.
6. `main` a produkční Supabase beze změn; zdokumentovaný postup obnovy.
7. Konkrétní iPhone checklist pouze pro dotčené funkce; skutečně neprovedené ruční scénáře zůstávají otevřené.
8. Zapsat dokončené checkboxy, SHA, výsledek testů a případná blokující rizika přímo do tohoto plánu.

## Stav posledního auditu při založení plánu

- Automatické buildové testy a strukturální kontrola testovacích rotací a záloh: bez zjištěné strukturální chyby.
- Potvrzená nadměrná anonymní čitelnost adresáře zaměstnanců a dat rotací: řešit P0.1–P0.2.
- Doplňkové nálezy: testovací owner bootstrap, limity veřejných funkcí, privátní kalendářní fallback, nejednoznačný auth indikátor a potenciálně veřejný kompletní ZIP: řešit příslušné P0/P1, nezaměňovat podezření za ověřenou dostupnost ZIP.
- Živý prohlížeč a přihlášení na chráněném preview ani reálné iPhone testy nebyly dokončeny; nesmí se označit jako PASS.

**Zásada:** bezpečnost a ochrana dat před kosmetickými změnami a optimalizacemi. Není dovoleno snížit zabezpečení jen kvůli odstranění chyby přihlášení nebo urychlení nasazení.
