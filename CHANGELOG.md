## RaK 1.7.93 (development)

- Nativní směnový kalendář má nově světlý vzhled inspirovaný přehledností původního Google kalendáře, ale stále používá bezpečný RaK public-ICS renderer bez Google iframe, cookies nebo přihlášení.
- Měsíční mřížka zůstává stručná. Klepnutí na datum se směnou otevře světlé vyskakovací okno s datem, názvem směny a celým intervalem `od–do`; volitelné místo a popis se zobrazí až v detailu.
- Popup lze zavřít křížkem nebo klepnutím mimo kartu. Přechod na jiný měsíc, tlačítko Dnes nebo změna kalendáře detail bezpečně zavře; prázdný den žádný prázdný popup neudržuje.
- Supabase ani produkce se nemění.

## RaK 1.7.92 (development)

- Denní přehled po kliknutí na datum v nativním kalendáři nově zobrazuje celý časový interval události, např. `06:00–18:00`, `18:00–06:00` nebo `22:00–06:00`, místo samotného začátku.
- Měsíční mřížka zůstává stručná a dál ukazuje pouze začátek + název směny.
- Celodenní události se dál zobrazují jako `celý den`; změna nezasahuje do Supabase ani produkce.

## RaK 1.7.91 (development)

- Ve veřejném směnovém kalendáři může Google při omezeném sdílení skrýt název události jako `Busy`; RaK u takové položky nově odvodí české označení ze začátku směny: 06:00 → `Ranní`, 18:00 nebo 22:00 → `Noční`.
- Vlastní názvy z ICS se nepřepisují. Směna D si proto dál zachová názvy jako `Ranní 12h`, `Noční 12h` nebo `Ranní 8h`.
- Změna je pouze v nativním kalendáři a release metadatech; Supabase ani produkce se nemění.

## RaK 1.7.90 (development)

- Dashboard kalendář už nepoužívá vložený Google Calendar iframe, který iOS/PWA blokoval kvůli third-party cookies. Veřejný Google Calendar ICS se načítá přes úzký RaK endpoint a vykresluje přímo v aplikaci.
- Nový endpoint přijímá pouze ID Google kalendáře a sám sestaví cestu `calendar.google.com/.../public/basic.ics`; nepřijímá libovolnou URL, soukromé private ICS nepodporuje a omezuje velikost odpovědi.
- Nativní kalendář má měsíční mřížku, předchozí/další měsíc, návrat na dnešek, výběr dne a denní seznam událostí. Parser podporuje běžné RRULE opakování, EXDATE a RECURRENCE-ID výjimky.
- A/B/C/D mapování účtu z 1.7.89 zůstává zachované; řešení nevyžaduje novou Supabase migraci ani mazání lokálních dat.
- Verze aplikace, technická verze, modulová cache a package verze jsou sjednocené na 1.7.90; SW cache je v1.7.90.

## RaK 1.7.89 (development)

- Opraveno mapování kalendáře podle účtu: běžný klient už nemusí číst soukromý seznam pracovníků; verzovaný login RPC vrací pouze směnu právě nalezeného účtu a profil ji ukládá i pro další/offline start.
- Starý lokální profil bez směny se po prvním online startu bezpečně doplní, takže není nutné ručně mazat data aplikace.
- Kalendářový modal používá celý dostupný prostor: obsah je skutečný flex sloupec a Google iframe vyplní zbývající výšku místo malého výchozího proužku.
- Zavírací × v kalendáři je centrované přes flex layout a mobilní modal má menší okraje.
- Verze aplikace, technická verze, modulová cache a package verze jsou sjednocené na 1.7.89; SW cache je v1.7.89.

## RaK 1.7.88 (development)

- Opraven administrátorský guard stránky Kalendáře: režim `calendars` je nově explicitně povolen, takže Přidat, Odebrat, Načíst i Uložit už nevrací uživatele do hlavního menu Více.
- Editor směnových kalendářů má kompaktnější mobilní rozložení: × a + Přidat kalendář jsou vedle sebe; mezi směnami je větší rozestup.
- Přidání nového kalendáře vloží nový řádek hned pod aktuální; odebrání posledního řádku jej jen vyčistí, takže tlačítko Přidat zůstane vždy dostupné.
- Verze aplikace, technická verze, modulová cache a package verze jsou sjednocené na 1.7.88; SW cache je v1.7.88.

## RaK 1.7.87 (development)

- Kalendáře směn nově přijímají i veřejné Google Calendar ICS odkazy ve tvaru `.../public/basic.ics`.
- Veřejný ICS se před uložením automaticky převede na standardní Google Calendar embed URL, takže Dashboard používá stejný zobrazovací mechanismus jako dosud.
- Soukromé `private-.../basic.ics` odkazy zůstávají blokované, protože obsahují neveřejný přístupový token.
- Verze aplikace, technická verze, modulová cache a package verze jsou sjednocené na 1.7.87; SW cache je v1.7.87.

## RaK 1.7.86 (development)

- Administrace → Informace pro zaměstnance má novou samostatnou sekci Kalendáře; obecné Odkazy už kalendář nenastavují.
- Každé směně A/B/C/D lze přiřadit jeden nebo více Google kalendářů. Dashboard používá výhradně kalendáře směny přihlášeného účtu; více kalendářů nabídne jako přepínatelný výběr.
- Pracovníci v Rozpisu používají směnu D, účty mimo Rozpis používají explicitní směnu A/B/C/D z Administrace → Pracovníci. Stávající kalendář se do prvního uložení zachová jako fallback směny D.
- Kalendářová konfigurace přijímá jen HTTPS Google Calendar embed URL s parametrem src; soukromé ICS odkazy s privátním tokenem se neukládají.
- Upozornění v kalendáři se přesunulo z Nastavení strojů do nové sekce Kalendáře.
- Verze aplikace, technická verze, modulová cache a package verze jsou sjednocené na 1.7.86; SW cache je v1.7.86.

## RaK 1.7.85 (development)

- Všechna aktuální čísla verze jsou sjednocená na 1.7.85: viditelná verze, technická verze, module cache i package verze; SW cache je v1.7.85.
- Oprava doručování PWA aktualizace na iOS: každá verze nově mění přímo zdroj service workeru a jeho vlastní release marker.
- Service worker importuje release metadata přes verzovanou URL a registrace používá updateViaCache: none, takže kontrola aktualizace nemá použít starou HTTP cache.
- Zachovává local-first start, oddělení účtů a account-scoped CAS synchronizaci vzhledu z 1.7.84.

## RaK 1.7.84 (development)

- Start na dříve použitém zařízení obnovuje ověřený lokální rozpis před spuštěním Supabase synchronizace, takže Dashboard může zobrazit dnešní nebo další směnu bez čekání na síť.
- Diagnostika nově měří první použitelný render Dashboardu s dostupným rozpisem.
- Přepnutí účtu před aplikací nového profilu odstraní aktivní identitu předchozího účtu; per-account cache vzhledu zůstává oddělená.
- Synchronizace vzhledu už nepoužívá zrušené herní statistiky. Nové úložiště používá revize a compare-and-swap, je oddělené podle účtu a při konfliktu neblokuje globální synchronizaci.
- Přesun účtu mezi směnami/rozpisem zůstává pouze provozním nastavením a nemění jeho autentizační ani owner/admin identitu.

## RaK 1.7.83 (development)

- Stránka O aplikaci nově stručně vysvětluje, k čemu RaK slouží.
- Přehled verze 1.7 doplňuje doložené změny zabezpečení, offline Rotace, reportů a bezpečného ZIP exportu.
- Otevřené konfliktní scénáře synchronizace nejsou vydávány za dokončené.
- Viditelná verze je 1.7.83; technická verze zůstává 1.7.0.

## RaK 1.7.78 (development)

- ZIP export aplikace se při nedostupném čistém `index.html` bezpečně zastaví a nevytvoří archiv z právě zobrazené stránky.
- Export už nikdy nekopíruje živý DOM, takže do zdrojového ZIPu nemůže omylem převzít otevřený administrátorský nebo osobní obsah.
- CI negativně ověřuje, že při chybě nevznikne ZIP ani stažení, a živá TEST HTTP kontrola rekurzivně odmítá osobní pole ve veřejných nastaveních.
- Viditelná verze je 1.7.78; technická verze zůstává 1.7.0.

## RaK 1.7.75 (development)

- PNG report skládá MO a TO do dvou sousedních sloupců, pokud se všechny jejich popisky vejdou bez zalomení.
- Stejné adaptivní rozložení používají TBKR01 a TBKR07; delší obsah se bezpečně vykreslí pod sebou přes celou šířku.
- Oba způsoby uložení a sdílení PNG používají totožný plán rozložení a stejně vysoké karty v každé dvojici.
- Textový náhled a kopírovaný report zůstávají beze změny. Technická verze zůstává 1.7.0.

## RaK 1.7.74 (development)

- Service worker při nedostatku místa na iOS ponechá povinné soubory v bezpečné prewarm cache a nikdy ji nesmaže, dokud z ní mohou být obslouženy offline požadavky.
- Dashboardové a navigační ikony jsou součástí povinné offline sady; instalace nové verze bez nich se neaktivuje.
- Online aplikace umí opravit chybějící offline soubory přes skutečně obsloužený REPAIR_PRECACHE protokol a hlásí ověřený počet chybějících položek.
- Mobilní Chromium regrese kontroluje po úplném offline restartu Rotaci, synchronizační runtime i načtení všech ikon.
- Technická verze zůstává 1.7.0.

## RaK 1.7.73 (development)

- Online synchronizace ukládá rozpis do jediné autoritativní offline kopie a při upgradu bezpečně převede novější starý snapshot; tím odstraňuje rozdílný květnový obsah po restartu i riziko dvojitého zaplnění úložiště na iOS.
- Service worker aktivuje novou verzi jen tehdy, když skutečně stáhl všechny soubory nutné pro offline spuštění Rotace a synchronizace.
- Starý automatický local-seed konflikt se po připojení znovu ověří pouze čtením a odstraní, pokud online rozpis existuje; skutečné administrátorské změny zůstávají chráněné.
- Regrese simuluje rozdílnou starou a novou cache při limitu úložiště, již konfliktní automatickou úlohu a úplný offline restart v mobilním Chromium.
- Technická verze zůstává 1.7.0.

## RaK 1.7.72 (development)

- Report směny sjednocuje MO, TO i brusy do pořadí „počet kusů + index“ bez opakovaného „ks“ na výrobních řádcích.
- Souhrn více výrobních řádků je vždy pouze „Celkově X ks“; neopakuje rozpis indexů, který je už vidět nad ním.
- Náhled, kopírovaný text i oba PNG generátory používají stejnou logiku a CI je ověřuje na hodnotách z uživatelského reportu.
- Technická verze zůstává 1.7.0.

## RaK 1.7.71 (development)

- Offline Rotace: service worker předem ukládá všech pět modulů Rotace i oba synchronizační moduly, takže čistý restart bez sítě otevře uložený rozpis místo pouhého obalu aplikace.
- Synchronizace: stejné místní a online nastavení vzhledu se porovnává podle hodnot, ne jen podle času; shodná položka se bezpečně potvrdí bez falešného konfliktu.
- Offline start už při automatickém doplnění profilu nevytváří vzdálený zápis. Po návratu online se nejprve načte serverová hodnota.
- Historická automatická úloha `rotation_state` se zdrojem `local-seed` se odstraní pouze tehdy, když server potvrdí existující hlavní rozpis; skutečné administrátorské změny zůstávají zadržené k ruční kontrole.
- CI nově testuje skutečný Chromium restart s uloženou Rotací, načtení odložených modulů výhradně z cache a návrat online bez nového konfliktu. Technická verze zůstává `1.7.0`.

## RaK 1.5

- Hotfix `1.5.1`: první pozdrav použije jméno okamžitě z lokálně uloženého profilu; sjednocené čtení profilu odstranilo závod mezi startem dashboardu a obnovením přihlášení.
- PWA cache a loader modulů zvýšeny na `v1.5.1` / `1.5.1`, aby se oprava spolehlivě načetla i v nainstalované aplikaci.
- Přihlášení a profily: trvalé přihlášení osobním číslem, bezpečnější role správců, účty i mimo pracovní rotace a vzhled uložený zvlášť ke každému účtu.
- Rotace a rozpisy: rychlé zobrazení posledních uložených dat, synchronizace na pozadí, úkoly podle stroje a přísnější kontrola generátoru včetně návaznosti mezi měsíci.
- Reporty a provoz: dokončený report směny, nový report dovolených z Google kalendáře, sdílení přes kopírování/systém/WhatsApp a nastavení korekcí FHB.
- Mobilní aplikace: nové výrazné vzhledy s výchozím Nočním laserem, osobní přehled směny, nové logo a animované přihlášení, lepší rozložení a ručně zapínaný Láďův režim.
- Release metadata sjednocena na `RaK 1.5`, technicka verze `1.5.1`, cache `v1.5.1`; loader modulu ma cache znacku `1.5.1`.

## RaK 1.2 (1.338)

- Administrace: opravené ukládání nastavení po bezpečnostní migraci, přidána změna hesla hlavního admina a mazání online záloh nastavení.
- Rozpisy: před prvním chráněným zápisem se načte aktuální revize, takže lze uložit i rozpis 10/26; vzdálenost měsíce není omezená.
- Odkazy a O aplikaci: nastavení odkazu Kalendář je popsané přímo v administraci a poslední souhrn historie je zkrácený.
- Release metadata sjednocena na `RaK 1.2 (1.338)`, technicka verze `1.2.338`, cache `v1.2-1.338`; loader modulu ma cache znacku `1.2.338`.

## RaK 1.2 (1.337)

- Administrace: připravena bezpečná trvalá relace přes Supabase Auth, role hlavního a nižšího správce a vzdálené odhlášení zařízení.
- Rozpisy a nastavení: zápisy mají revize, automatickou zálohu a ochranu rozepsaných změn před přepsáním synchronizací.
- Bezpečnost: soukromý kalendář se přesouvá do serverového nastavení, hlášení a servisní data dostávají úzké RPC rozhraní a citlivé tabulky přestanou být veřejně zapisovatelné.
- Stabilita: service worker respektuje privátní odpovědi a parametry URL, Excel import má bezpečné limity a externí knihovny jsou připnuté s kontrolou integrity.
- Release metadata sjednocena na `RaK 1.2 (1.337)`, technicka verze `1.2.337`, cache `v1.2-1.337`; loader modulu ma cache znacku `1.2.337`.

## RaK 1.2 (1.336)

- Generátor / živý srpen 2026: pozdější přesuny mezi tvrdotou a měkotou už nemohou po prvním vyrovnání znovu rozhodit TNKS01/TPKW01; před závěrečnou validací proběhne ještě jedno dorovnání.
- Generátor / trojice: kontrola nad aktuálním online červencem a srpnovými absencemi potvrzuje `Střížek 5.8. TNKS01`, `Synek 6.8. TNKS01`, vynechaný krok 10.8. a nový blok `Třasák 11.8. TPKW01`.
- Průvodce / chyba: neúspěšné generování už v náhledu neukáže starý uložený měsíc jako nový návrh; zobrazí pouze chybovou zprávu.
- Release metadata sjednocena na `RaK 1.2 (1.336)`, technicka verze `1.2.336`, cache `v1.2-1.336`; loader modulu ma cache znacku `1.2.336`.

## RaK 1.2 (1.335)

- Generátor / editor: pracovní návrh je oddělený od synchronizovaného stavu aplikace, takže ho online načtení už nemůže nahradit starým uloženým měsícem.
- Generátor / otevření rozpisu: tlačítko `Otevřít rozpis` obnoví editor přímo z posledního výsledku generování; starý srpnový rozpis se ukáže až tehdy, když nový návrh skutečně neexistuje.
- Browser smoke nově simuluje ztrátu pomocného stavu mezi vygenerováním a otevřením editoru a hlídá obnovení správného návrhu.
- Release metadata sjednocena na `RaK 1.2 (1.335)`, technicka verze `1.2.335`, cache `v1.2-1.335`; loader modulu ma cache znacku `1.2.335`.

## RaK 1.2 (1.334)

- Generátor / editor: rozpisový editor nyní vždy upřednostní čekající vygenerovaný návrh před starou online verzí stejného měsíce.
- Generátor / synchronizace: návrh zůstane v editoru viditelný i po návratu jinou cestou nebo po mezilehlém načtení online dat; Supabase se pořád změní až po kliknutí na `Uložit rozpis`.
- Kontrola nad kompletními online daty potvrdila srpnový sled `Střížek 5.8. TNKS01`, `Synek 6.8. TNKS01`, přeskočený Třasák 10.8. a nový blok TPKW01 od 11.8.
- Release metadata sjednocena na `RaK 1.2 (1.334)`, technicka verze `1.2.334`, cache `v1.2-1.334`; loader modulu ma cache znacku `1.2.334`.

## RaK 1.2 (1.333)

- Aktualizace aplikace: JavaScript a CSS se na serveru znovu ověřují místo roční neměnné cache; `app.js` má navíc verzi přímo v URL, takže telefon po vydání nespustí starý generátor.
- Generátor / skutečná návaznost: regresní scénář kopíruje uložený konec července 2026 a hlídá, že srpnový blok trojice začne během Třasákovy dovolené a nečeká na jeho návrat.
- Generátor / TNKS01: Synek, Třasák a Střížek zůstávají vyřazení z obecného měsíčního dorovnání; jejich pořadí určuje pouze vlastní cyklus a dostupnost.
- Release metadata sjednocena na `RaK 1.2 (1.333)`, technicka verze `1.2.333`, cache `v1.2-1.333`; loader modulu ma cache znacku `1.2.333`.

## RaK 1.2 (1.332)

- Generátor / Dovolená v trojici: když rozdělaný blok nemůže dokončit chybějící Synek, Třasák nebo Střížek ani po prohození pořadí, jeho krok se bere jako neobsazený a následující pracovní den začne trojice další stroj.
- Generátor / Návaznost: přeskočený krok se nezapočítá jako odpracovaná tvrdota, ale uložené absence umožní stejné rozhodnutí správně dopočítat i při generování dalšího měsíce.
- Browser smoke: scénář Třasákovy dovolené 5., 6. a 10. srpna ověřuje přeskočení starého TPKW02 bloku a nový TNKS01 blok Střížek 6.8. → Synek 10.8. → Třasák 11.8.
- Release metadata sjednocena na `RaK 1.2 (1.332)`, technicka verze `1.2.332`, cache `v1.2-1.332`; loader modulu ma cache znacku `1.2.332`.

## RaK 1.2 (1.331)

- Generátor / Priorita trojice: Synek, Třasák a Střížek se na TNKS01, TPKW01 a TPKW02 přesouvají výhradně blokovým cyklem; měsíční dorovnání TNKS01, opravy prázdných míst ani další následné úpravy už nemohou vytvořit osamocené zařazení mimo blok.
- Generátor / Kontrola návaznosti: návrh se odmítne, pokud trojice přejde na další stroj dřív, než se na aktuálním vystřídají všichni tři, nebo pokud se někdo ve stejném bloku zopakuje.
- Generátor / Vyrovnání TNKS01: trojice má vlastní počítání a není součástí obecného měsíčního dorovnání nýtovačky; administrace tuto prioritu nově výslovně uvádí.
- Release metadata sjednocena na `RaK 1.2 (1.331)`, technicka verze `1.2.331`, cache `v1.2-1.331`; loader modulu ma cache znacku `1.2.331`.

## RaK 1.2 (1.330)

- Generátor / Trojice z měkoty: Synek, Třasák a Střížek mají na tvrdotě pevně povolené jen TNKS01, TPKW01 a TPKW02; TBKR07/TBKR01 už jim nevezme ani nouzové doplnění.
- Generátor / Doplnění děr: když po absencích zůstane prázdné tvrdotní místo a dostupný zbytek neumí daný tvrdotní stroj, generátor prohodí vhodného člověka z měkoty na tvrdotu a zbytek vrátí na jeho měkotní základ, např. Třasák na MSKC01.
- Generátor / Kontrola návrhu: dostupný člověk, který v daný den úplně vypadne z rozpisu, je nově chyba návrhu.
- Administrace / Export import: ZIP export cele aplikace presunuty z rozpisoveho Export/import do Kontrola a servis; Export/import zustava jen pro XLSX rozpisy.
- Generator / Trojice z mekoty: rozdelany blok z predchoziho mesice se bere v potaz; kdyz chybejici clovek z bloku porad neni dostupny ani po prohozeni poradi trojice, generator udela mezeru, aby se zbyli dva netocili porad dokola na Tvrdote.
- Generator / Trojice z mekoty: novy mesic drzi navazny stroj i rozdelany blok z predchozi historie; po dokonceni bloku dalsi smena pokracuje dalsim strojem.
- Generator / Trojice z mekoty: mezera po bloku se pouzije jen jako zarovnani konce mesice, aby se nerozjela neuplna trojice, ne jako automaticka pauza uprostred mesice kvuli prubeznym poctum.
- Browser smoke: pridana realna kontrola pregenerovani srpna 8/26, ktera hlida bloky Synek/Trasak/Strizek po trech lidech a zbytecne mezery mezi bloky.
- Generator / Pravidla generatoru: pri skladani dne se uz vyrazne penalizuje dalsi prirazeni na stejny typ mekoty, pokud by clovek od nastavene hranice zustal jen na frezkach nebo jen na soustruhach.
- Administrace / Zálohy nastavení: tabulka záloh rozšířena ještě o 5 % z 325 px na 341 px.
- Administrace / Zálohy rozpisů: tabulka záloh rozšířena o 15 % z 300 px na 345 px.
- Administrace / Zálohy rozpisů: efektivní sloupec `Akce` rozšířen z 18 % na 36 %, sloupec `Záloha` upraven na 64 %, aby se tlačítko obnovy nemačkalo do úzkého prostoru.
- Administrace / Zálohy nastavení: konkrétní šířka tabulky zvětšena o 25 % z 260 px na 325 px, takže oba sloupce dostaly víc místa bez změny jejich poměru.
- Generátor / Pravidla generátoru: přidaná hranice `mix od 3 směn`, aby člověk s více směnami na měkotě nezůstal jen na frézkách nebo jen na soustruhách, pokud existuje platný prohoz.
- Generátor po pozdějších opravách rozpisu spouští finální dorovnání poměru soustruhy/frézky ještě jednou.
- Generátor / Pravidla generátoru: vyrovnání `soustruhy / frézky` se nově dá počítat přes celou měkotu, takže neřeší jen lidi z tvrdoty; má zabránit stavům typu 9× soustruh a 0× frézka proti lidem opakovaně samotným na frézách.
- Administrace / Pravidla generátoru: přidané jemné nastavitelné volby pro režim `2 soustruhy + 1 fréza` (výchozí: Starý spíš mimo soustruhy) a pro vyrovnání samostatných frézek (výchozí: zapnuto, rozdíl max 1).
- Administrace / Pravidla generátoru: doplněné nastavitelné vyrovnání počtu směn na měkotě pro skupinu Blažek/Starý/Kříž/Pech.
- Administrace / Pravidla generátoru: doplněné nastavitelné vyrovnání soustruhy/frézky u lidí z tvrdoty, včetně povoleného maximálního rozdílu.
- Generátor při dorovnání soustruhy/frézky už nečeká jen na jiného člověka z tvrdoty přetíženého na soustruhu; člověka z tvrdoty přetíženého na frézách umí prohodit i s vhodným člověkem z měkoty, přednostně ve dnech se 3 obsazenými soustruhy.
- Generátor při 2 soustruzích + 1 fréze bere vypsaná jména jako měkkou preferenci mimo soustruhy, ne jako zákaz; když není lepší varianta, pořád může člověka použít.
- Release metadata sjednocena na `RaK 1.2 (1.330)`, technicka verze `1.2.330`, cache `v1.2-1.330`; loader modulu ma cache znacku `1.2.330`.

## RaK 1.2 (1.318)

- Rotace / Rozpisy / stáhnout obrázek: opravené šířky sloupců v bloku Absence, aby sloupec `Důvod` nezabral celou tabulku a jména absencí byla v obrázku čitelná.
- Release metadata sjednocena na `RaK 1.2 (1.318)`, technicka verze `1.2.318`, cache `v1.2-1.318`; loader modulu ma cache znacku `1.2.318`.

## RaK 1.2 (1.317)

- Administrace / Rozpisy: kopirovani dovolene pro WhatsApp pise duvod jako `(dovolená)` misto `(dovolené)`.
- Release metadata sjednocena na `RaK 1.2 (1.317)`, technicka verze `1.2.317`, cache `v1.2-1.317`; loader modulu ma cache znacku `1.2.317`.

## RaK 1.2 (1.316)

- Generator rozpisu po konecnem vyvazovani doplni prazdny stroj Tvrdoty dostupnym clovekem, pokud tim neporusi absence, znalost stroje ani navaznost TNKS01/TPKW01. Tim se opravuje pripad 8/26, kdy TBKR07 zustala 19.8. a 29.8. volna, i kdyz chybel jen omezeny pocet lidi a byl dostupny Novotny.
- Browser smoke pridal kontrolu pro 8/26 se dvema absencemi, aby TBKR07 pri stejne situaci uz nezustala prazdna.
- Release metadata sjednocena na `RaK 1.2 (1.316)`, technicka verze `1.2.316`, cache `v1.2-1.316`; loader modulu ma cache znacku `1.2.316`.

## RaK 1.2 (1.315)

- Administrace / Rozpisy: přidané tlačítko `Kopírovat dovolené`, které z aktuálního měsíce zkopíruje absence do schránky ve formátu pro WhatsApp, seskupené podle jmen a důvodů.
- Kopírovaný text bere i rozepsané, zatím neuložené změny v editoru rozpisu a sjednocuje jména bez diakritiky na oficiální podobu.
- Release metadata sjednocena na `RaK 1.2 (1.315)`, technicka verze `1.2.315`, cache `v1.2-1.315`; loader modulu ma cache znacku `1.2.315`.

## RaK 1.2 (1.314)

- Dashboard / Dovolená: po skončení aktuálního nastaveného období (např. CZD) se odpočet automaticky přepne na nejbližší další nastavenou událost, typicky Vánoce.
- Release metadata sjednocena na `RaK 1.2 (1.314)`, technicka verze `1.2.314`, cache `v1.2-1.314`; loader modulu ma cache znacku `1.2.314`.

## RaK 1.2 (1.313)

- Dashboard / Dovolená: odpočet `směn do CZD/dovolené` nově drží aktuálně probíhající směnu D započítanou až do jejího konce. Po startu noční v 18:00 tedy v 18:01 nespadne na `0 směn`, když je směna D ještě v práci.
- Release metadata sjednocena na `RaK 1.2 (1.313)`, technicka verze `1.2.313`, cache `v1.2-1.313`; loader modulu ma cache znacku `1.2.313`.

## RaK 1.2 (1.312)

- Administrace / Rozpisy / Generátor: v kroku Absence přibylo tlačítko `Načíst dovolené z kalendáře`, které z Google ICS doplní známé absence podle jména a kódu (`D`, `NV`, `L`, `N`, `§` atd.) a ignoruje běžné směnové události.
- Přidaný Vercel API endpoint `/api/rotation-absence-calendar`, aby se Google kalendář načítal přes stejnou doménu aplikace a nenarážel v prohlížeči na CORS.
- Import absencí z kalendáře zachová ručně rozepsané řádky, deduplikuje stejnou osobu se stejným důvodem a all-day události bere podle data směny, tedy noční z 17.7. patří k řádku začínajícímu 17.7.
- Release metadata sjednocena na `RaK 1.2 (1.312)`, technicka verze `1.2.312`, cache `v1.2-1.312`; loader modulu ma cache znacku `1.2.312`.

## RaK 1.2 (1.311)

- Generátor rozpisu: jména v rozpisu i absencích se při uložení kanonizují přes seznam pracovníků bez ohledu na diakritiku, takže `Strizek/Strižek` se uloží jako `Střížek` a `Kriz/Křiž` jako `Kříž`.
- Generátor rozpisu: dorovnání TNKS01/TPKW01 nově bere měsíční vyrovnání jako hlavní pravidlo pro všechny oprávněné pracovníky; roční statistika slouží až jako jemný tie-break, když je měsíc už přibližně srovnaný.
- Rozpisy: před uložením běží společná kontrola kritických pravidel (duplicita člověka v jednom dni, absence proti nasazení, oprávnění stroje a TNKS01/TPKW01 po sobě). Špatný rozpis se nemá uložit online potichu.
- Release metadata sjednocena na `RaK 1.2 (1.311)`, technicka verze `1.2.311`, cache `v1.2-1.311`; loader modulu ma cache znacku `1.2.311`.

## RaK 1.2 (1.310)

- O aplikaci: doplněn aktuální souhrn 1.297–1.310 o opravy ukládání Historie změn, automatických záloh rozpisů, výkonového režimu a dotažení admin tabulek.
- Administrace / Historie změn: prázdný stav už nevypadá jako chyba; vysvětluje, že starší záznamy před opravou ukládání nejde zpětně dopočítat a nové se začnou plnit až při dalším uložení dovolené, přesčasů nebo rozpisu.
- Zálohy rozpisů a Zálohy nastavení: sloupce Záloha/Akce mají kromě zúženého `colgroup` i konkrétní fixed layout pod danou admin obrazovkou a vlastní kompaktní buňky akcí, takže šířky konečně nepřebije obecný styl tabulek ani obsah tlačítek.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový text v O aplikaci i konkrétní tabulkové selektory záloh.
- Release metadata sjednocena na `RaK 1.2 (1.310)`, technicka verze `1.2.310`, cache `v1.2-1.310`; loader modulu ma cache znacku `1.2.310`.

## RaK 1.2 (1.309)

- Kompletní audit a otestování celé aplikace: syntaxe všech 62 JS souborů, oba spustitelné smoke testy, konzistence manifestů (loader v app.js vs. sw.js cache vs. index.html vs. export vs. disk), čistý start s prázdnou cache (59/59 modulů načteno za ~1,1 s, 0 chyb v konzoli, vestavěný self-test 0 selhání), průchod všemi stránkami (Rozpisy vč. osobního rozpisu a měsíců, všechny Kalkulačky vč. reálného výpočtu brusky, Hry vč. otevření a zavření hry, Nastavení/Kontakt/O aplikaci/Pošli mi chybu), modály Kalendář/Kantýna/Jídelna, vykreslení všech 25 administračních obrazovek bez chyby a kontrola odezvy hlavního vlákna (bez zaseknutí).
- Oprava: modul `admin-daymods.js` chyběl v kontrole `npm run check` (build ho nikdy nekontroloval) a spolu se `styles-daymods.css` chyběl i v exportním manifestu zdrojů – ZIP export aplikace byl neúplný. Obojí doplněno, manifesty jsou teď plně konzistentní.
- Release metadata sjednocena na `RaK 1.2 (1.309)`, technicka verze `1.2.309`, cache `v1.2-1.309`; loader modulu ma cache znacku `1.2.309`.

## RaK 1.2 (1.308)

- Láďův režim: velké odlehčení pro slabé telefony. (1) Překreslení Home se v refresh dávce spouští jen 1× + jedno pozdější potvrzení místo až 7 běhů; (2) startovací sekvence vynechává nadbytečné opakované plné refreshe (hlídač nevykreslené Home zůstává); (3) při online refreshi se stránky Rozpisy/Statistiky nepřestavují, když nejsou zobrazené – plně se vykreslí při otevření nebo při reálné změně dat; (4) herní realtime události (když si kdokoli jiný hraje hru) už nespouští refresh celé aplikace, pokud nejsou otevřené Hry, a ostatní realtime události se dávkují po 3,5 s (12 s na pozadí) místo 0,75 s. Vše ověřeno živě: Home po startu vykreslená, navigace Rozpisy↔Home funguje, měřeno 1 běh/dávka v Láďově režimu vs. 4+ v normálu.
- Oprava: diagnostický release kontrakt v export.js držel zastaralou cache verzi `v1.2-1.297` (drift od buildu 297) – srovnáno na aktuální verzi.
- Release metadata sjednocena na `RaK 1.2 (1.308)`, technicka verze `1.2.308`, cache `v1.2-1.308`; loader modulu ma cache znacku `1.2.308`.

## RaK 1.2 (1.307)

- Oprava: stejná "invalid category" chyba jako u Pracovníků z buildu 1.306 postihovala i Historii změn (`admin_change_log`) a automatické Zálohy rozpisů (`rotation_save_backup`) – obě kategorie chyběly v seznamu speciálních administrativních nastavení v supabase-bridge.js, takže se jejich ukládání vždy tiše nezdařilo (chyba se polykala v try/catch). Historie změn tak byla odjakživa prázdná a automatická záloha rozpisu se nikdy skutečně neuložila na produkci. Doplněno do seznamu, ověřeno end-to-end mockovaným uložením.
- Oprava: v Administraci → Nastavení strojů se po předchozí opravě (1.306) nově objevovaly falešné řádky "APP" / "Pracovníci" a "APP" / "Upozornění v kalendáři" mezi skutečnými frézkami – jde o vedlejší efekt maskování kategorie při ukládání (worker_roster_settings/calendar_notes_settings se posílají na server jako `frezka`). Filtr `adminMachineIsEditableMachineRow` v admin-rotation.js teď tyhle řádky správně vyřazuje ze seznamu strojů, stejně jako to už dělá pro ostatní administrativní nastavení.
- Další zúžení sloupců o 50 % (živě ověřeno bez oříznutí obsahu a tlačítek): Zálohy rozpisů Záloha/Akce (34→17px, 35→18px), Zálohy nastavení Záloha nastavení/Akce (21→11px, 17→9px).
- Release metadata sjednocena na `RaK 1.2 (1.307)`, technicka verze `1.2.307`, cache `v1.2-1.307`; loader modulu ma cache znacku `1.2.307`.

## RaK 1.2 (1.306)

- Oprava: ukládání Pracovníků (přihlašovací čísla, dovednosti strojů) v Administraci hlásilo "invalid category" a uložení selhalo. Kategorie `worker_roster_settings` (a `calendar_notes_settings` pro Upozornění v kalendáři) chyběla v seznamu speciálních administrativních nastavení v supabase-bridge.js, takže se před odesláním na server neskryla na povolenou hodnotu – server ji odmítal. Doplněno podle stejného vzoru jako u ostatních administrativních nastavení (výplata, kontakt, zálohy...), ověřeno end-to-end mockovaným uložením (kategorie se teď správně přepíše, reálná hodnota zůstává dohledatelná).
- Oprava: hlášení `gamesEnsureScoreResetV912 failed ReferenceError: TTT_HARD_WIN_KEY is not defined` v konzoli při každém načtení aplikace – jednorázová úklidová migrace v games-profile.js se odkazovala na konstanty definované až v games-gomoku.js, který se načítá později, takže migrace nikdy neproběhla celá. Nahrazeno přímými hodnotami klíčů, migrace teď proběhne a označí se jako hotová.
- Release metadata sjednocena na `RaK 1.2 (1.306)`, technicka verze `1.2.306`, cache `v1.2-1.306`; loader modulu ma cache znacku `1.2.306`.

## RaK 1.2 (1.305)

- Když admin v Pracovnících uloží nového pracovníka s přihlašovacím číslem, jeho herní profil (výchozí téma/pozadí) se rovnou vytvoří na Supabase – nemusí se nejdřív sám přihlásit a odehrát hru, aby se objevil online. Existující profily se nepřepisují (kontroluje se, jestli číslo už má záznam, než se něco pošle). Stav uložení ukáže počet nově vytvořených profilů.
- Release metadata sjednocena na `RaK 1.2 (1.305)`, technicka verze `1.2.305`, cache `v1.2-1.305`; loader modulu ma cache znacku `1.2.305`.

## RaK 1.2 (1.304)

- Oprava: přihlašovací chyba her/profilu se kvůli chybné znakové sadě zobrazovala jako "PĹ™ihlĂˇĹˇenĂ­ se nepovedlo" místo "Přihlášení se nepovedlo".
- Administrace → Pracovníci: místo prostého seznamu jmen je teď tabulka s přihlašovacím číslem (poslední 4 číslice os. č.) a zaškrtávacím seznamem strojů, které daný pracovník umí (MSK, MFK, TNK, TBK, TPKW01, TPKW02). Nový pracovník jde přidat i s číslem rovnou v jednom kroku.
- Přihlašovací číslo nastavené v Pracovnících teď funguje i pro přihlášení do her/profilu – nový pracovník, kterému admin číslo přidělí, se jím může rovnou přihlásit a uvidí své jméno (dřív hlásilo "Uživatel nenalezen", pokud číslo nikdo předtím nepoužil).
- Generátor rozpisu teď respektuje, které stroje pracovník umí – nabízí ho jen na zaškrtnuté skupiny strojů. Pracovník bez zaškrtnutého stroje zůstává bez omezení (zpětná kompatibilita se stávajícími rozpisy). Ověřeno end-to-end vygenerováním měsíce s omezenými dovednostmi, 0 porušení napříč 150 obsazenými buňkami.
- Release metadata sjednocena na `RaK 1.2 (1.304)`, technicka verze `1.2.304`, cache `v1.2-1.304`; loader modulu ma cache znacku `1.2.304`.

## RaK 1.2 (1.303)

- Upozornění v kalendáři (Pondělí spálení / Roznýtování): přesunuto z osobního Nastavení do Administrace → Nastavení strojů – teď je to globální přepínač uložený přes Supabase, platí pro všechny uživatele stejně, ne jen pro jedno zařízení.
- Dashboard: text "kdo chybí" ve vrchním panelu zvětšen o cca 30 % (živě ověřeno bez oříznutí i s delším seznamem jmen).
- Ověřeno: Historie změn v Administraci → Rozpisy se reálně zapisuje při uložení rozpisu a zobrazuje se správně (end-to-end test).
- Ověřeno: úprava Kontaktu aplikace a správa účtů dalších adminů je funkčně omezená jen na hlavního (owner) admina – nižší admin je zablokovaný i na úrovni funkce, ne jen v UI.
- Další zúžení sloupců (živě ověřeno bez oříznutí obsahu a bez překryvu): Zálohy rozpisů Záloha/Akce o dalších 50 % (67→34px, 70→35px), Výplata Měsíc/Datum o 25 % a Poznámka o 60 % (85→64px, 75→56px, 160→64px), Zálohy nastavení Záloha/Akce o 50 % (41→21px, 34→17px).
- Láďův režim (výkon pro slabší telefony): opravena skulinka ve specificitě CSS pravidla, kvůli které mohly vícetřídní selektory dál spouštět animace/přechody i při zapnutém Láďově/lightweight/reduceMotion režimu. Nové finální pravidlo garantovaně vypne `animation` i `transition` na všech prvcích bez ohledu na specificitu původního pravidla (živě ověřeno).
- Release metadata sjednocena na `RaK 1.2 (1.303)`, technicka verze `1.2.303`, cache `v1.2-1.303`; loader modulu ma cache znacku `1.2.303`.

## RaK 1.2 (1.302)

- Oprava: generátor rozpisu na nový měsíc hlásil "Návrh se nepodařilo vygenerovat: generatorRules is not defined" – funkce `adminRotationGeneratorCreateCounters` v admin-rotation.js používala `generatorRules.hardCycle`, aniž by si (na rozdíl od všech ostatních generátorových funkcí) proměnnou lokálně načetla. Doplněno, generátor teď reálně naplní rozpis (ověřeno end-to-end).
- Oprava: v sekci Pracovníci → Historie změn (a na obrazovce Pracovníci) tlačítko Zpět a další akce místo návratu na Administraci hodily uživatele do "Více" – seznam `appMenuAdminModeSet()` v app-menu.js chyběl o 'workers' a 'change-log', takže guard admin akcí je bral jako neplatné.
- Nové nastavení v Nastavení aplikace: "Upozornění v kalendáři" – jde vypnout zvlášť upozornění "Pondělí – Brusy: spálení" a "První ranní v měsíci – Roznýtování laborka", která se zobrazují v kalendáři na Home.
- Přehled připojení: profily/zařízení jsou teď sbalené podle měsíce poslední aktivity (nejnovější měsíc rozbalený), stejně jako už fungují Zálohy rozpisů.
- Zúžení sloupců podle živě ověřené bezpečné šířky (bez oříznutí obsahu, bez překryvu): Dovolená/odstávky Od/Do o 50 % (195→98px), Mimořádné volné dny Datum o 20 % (130→104px), Zálohy rozpisů Záloha o 70 % a Akce o 50 % (224→67px, 140→70px), Výplata Měsíc/Datum/Poznámka o 50 % (170→85px, 150→75px, 320→160px), Zálohy nastavení Akce o 70 % (112→34px).
- Release metadata sjednocena na `RaK 1.2 (1.302)`, technicka verze `1.2.302`, cache `v1.2-1.302`; loader modulu ma cache znacku `1.2.302`.

## RaK 1.2 (1.301)

- Theme / barvy aplikace a Pozadí: zredukováno na kurátorovanou pevnou sadu 6 témat (Zelená, Světlá, Modrá, Grafitová, Oranžová, Fialová) a 6 pozadí (Tmavé sklo, Škoda zelená, Modré sklo, Teplé sklo, Světlé, AMOLED mřížka) - odstraněny duplicitní a skoro identické varianty (mj. dřívější duplicitní id `storm-signal` ve dvou různých pozadích).
- Odstraněn celý systém odemykání vzhledu (rank/achievementy/počet her) i systém, který za běhu tiše přepisoval popisky a barvy pozadí na jiný patternový vzhled, než měl zdrojový kód - výběr tématu i pozadí je teď vždy okamžitě dostupný a klikatelný, bez zámků a bez odznaků "odemčeno za...".
- Po přihlášení / obnově zálohy se uložené téma a pozadí použijí přesně tak, jak přišly, bez kontroly odemčení, která je dřív mohla tiše přepsat zpět na výchozí.
- Smoke testy (`app-usage-smoke-v963.js`) přepsány na nová pravidla - kontrola přesně 6+6 položek, žádné duplicitní id, žádná zamykací pole (`unlockText`/`minPlays`/`minAchievements`/`minRank`), žádné pozůstatky starého odemykacího/patternového systému.
- Release metadata sjednocena na `RaK 1.2 (1.301)`, technicka verze `1.2.301`, cache `v1.2-1.301`; loader modulu ma cache znacku `1.2.301`.

## RaK 1.2 (1.300)

- Oprava: sloupce Měsíc/Datum výplaty u ručních výjimek se od minulé úpravy (1.299, 107px) na mobilu vzájemně překrývaly – natvrdo zúžené inputy `type="month"`/`type="date"` mají v prohlížeči nesmrštitelné minimum (~137/120 px), pod které je CSS `width` nedostane. Sloupce teď mají bezpečnou šířku nad tímto minimem (Měsíc 170px, Datum 150px, Poznámka 320px), tabulka se vrátila k běžnému chování (žádný `width:auto` override).
- Dovolená / odstávky: sloupec Název zúžen (~50 %), sloupce Od/Do zúženy na bezpečné minimum pro `datetime-local` (~195px) – čistých 30 % nešlo dodržet, protože natvrdo zúžené pole by se stejně jako u Výplaty překrývalo.
- Mimořádné volné dny: sloupec Datum zúžen na bezpečné minimum pro `type="date"` (~130px, blízko 50 %), sloupec Typ zúžen o 50 %, sloupec Název o 30 %.
- Kontakt aplikace: sloupce Položka a Hodnota zúženy o 50 % každý (bez rizika překryvu, žádné datum/čas pole).
- Zálohy nastavení: sloupec "Záloha nastavení" zúžen o 60 % (ze současných ~373px na ~150px); box "Bezpečnost obnovy" odstraněn; "Stav záloh nastavení" je teď sbalitelný (sbalený ve výchozím stavu).
- Živě ověřeno v prohlížeči na mobilní i širší šířce obrazovky: žádné pole se nepřekrývá, žádné inputy nejsou oříznuté pod svým nativním minimem.
- Release metadata sjednocena na `RaK 1.2 (1.300)`, technicka verze `1.2.300`, cache `v1.2-1.300`; loader modulu ma cache znacku `1.2.300`.

## RaK 1.2 (1.299)

- Dovolená / odstávky a Mimořádné volné dny: odstraněny boxy "Veřejná kontrola" u obou sekcí; "Stav" u obou je teď sbalitelný (sbalený ve výchozím stavu).
- Rozpisy: odstraněna "Veřejná kontrola rozpisu"; "Kontrola před uložením" je teď sbalitelná (sbalená ve výchozím stavu).
- Zálohy rozpisů: "Stav záloh" je sbalitelný, "Bezpečnost obnovy" odstraněna; online zálohy jsou teď sbalitelné podle měsíce vzniku (nejnovější měsíc rozbalený); sloupec "Záloha" zúžen o 20 %, sloupec "Akce" o 50 %.
- Export/Import: odstraněny "Bezpečnost importu" a "Stav exportu/importu"; tlačítko "Export ZIP" přejmenováno na "Export ZIP (stáhnout app)".
- Oznámení Dashboard, Odkazy, Kontakt, Výplata: odstraněny boxy "Stav" a "Veřejná kontrola" ze všech čtyř obrazovek (živý náhled oznámení na Dashboardu zůstává beze změny).
- Výplata: sloupce Měsíc, Datum výplaty a Poznámka u ručních výjimek zúženy o 50 %.
- Přehled připojení: odstraněn box "Stav připojení" (metriky připojení a seznam zařízení zůstávají beze změny).
- Zálohy nastavení: přibylo tlačítko "Vytvořit zálohu (jen online)" (uloží jen do Supabase, bez stažení JSON); tlačítko "Nahrát zálohu" nahrazeno tlačítkem "Obnovit ze souboru (telefon)", které soubor rovnou nahraje i obnoví - vedle stávající obnovy online ze Supabase (výběr řádku v seznamu) jde teď o dvě jasně oddělené cesty obnovy.
- Drobná oprava: dva `window.*` exporty (`buildAdminAnnouncementStatusHtml`, `buildAdminPayrollStatusHtml`, `buildAdminUsageStatusHtml`) odkazovaly na právě odstraněné funkce a tiše by shodily zbytek `try` bloku i exporty za nimi - opraveno spolu s úklidem.
- Release metadata sjednocena na `RaK 1.2 (1.299)`, technicka verze `1.2.299`, cache `v1.2-1.299`; loader modulu ma cache znacku `1.2.299`.

## RaK 1.2 (1.298)

- Nastavení strojů: odstraněny boxy "Stav nastavení strojů" a "Kontrola dopadu strojů" - byly jen informativní a zabíraly místo.
- Kantýna / jídelna: odstraněny boxy "Stav kantyny/jidelny" a "Verejna kontrola provozu"; sekce už není rozbalovací (skládací), protože v ní po odstranění boxů není co skrývat.
- Přesčasy: "Stav přesčasů" a "Filtrovat podle směny" jsou teď rozbalovací (sbalené ve výchozím stavu; filtr se sám rozbalí, když je aktivní jiná směna než Vše).
- Přesčasy: datum přidávané přes numerickou klávesnici (např. `10052027` nebo `1052027`) se po opuštění pole samo přeformátuje na `D.M.RRRR` (např. `10.5.2027`).
- Release metadata sjednocena na `RaK 1.2 (1.298)`, technicka verze `1.2.298`, cache `v1.2-1.298`; loader modulu ma cache znacku `1.2.298`.

## RaK 1.2 (1.297) — KRITICKÁ OPRAVA

- Oprava: `getFoodSpecialDateSet()` (qr.js, zavedeno v 1.295) a `getRotationOvertimeDefaultDateList()` (core.js) se navzájem volaly v nekonečné rekurzi vždy, když ještě neexistuje uložený řádek `ROTATION_OVERTIME_SETTINGS` - tedy prakticky pro každého uživatele. Appka se kvůli tomu při každém vykreslení dashboardu zasekla na `RangeError: Maximum call stack size exceeded`, což se navenek projevilo jako "dlouho se načítá", "Offline cache" a nereagující kliknutí (dashboard se opakovaně pokoušel dopočítat a pokaždé spadl).
- `getFoodSpecialDateSet()` teď čte uložené termíny z Přesčasů přímo (`getRotationOvertimeSettingsRow`), ne přes `getRotationOvertimeDateSet()`/`getRotationOvertimeSettings()`, které umí spustit seed-větev volající zpátky do kantýny.
- Ověřeno živě: dashboard po opravě ukazuje `🟢 Online synchronizováno`, klikání funguje a "bude chybět" správně ukazuje reálné jméno/a místo "Nikdo".
- Release metadata sjednocena na `RaK 1.2 (1.297)`, technicka verze `1.2.297`, cache `v1.2-1.297`; loader modulu ma cache znacku `1.2.297`.

## RaK 1.2 (1.296)

- Oprava: pomalé nebo nedostupné Supabase spojení mohlo při startu appky vést k tomu, že se automaticky spustil blokující nativní dialog na admin heslo, i když ho uživatel vůbec nechtěl otevírat - appka pak vypadala jako zaseknutá ("dlouho se načítá", nešlo nic kliknout).
- `rakAdminLoadSettingsThenCheck` teď automatický dialog na heslo spustí jen když je Supabase v pořádku (ne offline/error stav); tichá obnova uložené admin relace funguje beze změny.
- Odstraněno agresivní mazání uložené admin relace na základě neúplných/starých dat (např. při výpadku sítě) - relace se teď maže jen výslovným odhlášením zařízení ve Správcích.
- O aplikaci: doplněn souhrn verzí 1.290-1.296.
- Release metadata sjednocena na `RaK 1.2 (1.296)`, technicka verze `1.2.296`, cache `v1.2-1.296`; loader modulu ma cache znacku `1.2.296`.

## RaK 1.2 (1.295)

- Oprava: home karty Kantýna/Jídelna teď poznají přesčasovou neděli i z termínů zadaných v Provoz / Přesčasy, ne jen ze starého (od 1.294 needitovatelného) seznamu v nastavení kantýny. Bez týhle opravy by nový přesčasový termín přidaný jen v Přesčasech neukázal správné hodiny kantýny na home.
- `getFoodSpecialDateSet()` (qr.js) teď sjednocuje starý zamrzlý seznam kantýny s živým seznamem z Přesčasů, takže se nic neztratí a nové termíny fungují bez zásahu do kódu.
- Release metadata sjednocena na `RaK 1.2 (1.295)`, technicka verze `1.2.295`, cache `v1.2-1.295`; loader modulu ma cache znacku `1.2.295`.

## RaK 1.2 (1.294)

- Správci: poslední zmínka o "předání" v bezpečnostním souhrnu přejmenována na Hesla (jen hash, nikam se nestahují).
- Admin menu: sekce přejmenované na "1. Provoz", "2. Rozpisy", "3. Pro zaměstnance" (bylo "Provoz před rozpisem" / "Rozpisy a předání").
- Kantýna / jídelna: odstraněn vlastní editovatelný seznam přesčasových nedělí – které neděle jsou přesčasové se teď nastavuje jen v Provoz / Přesčasy. Dřívější uložené termíny se při uložení kantýny zachovají beze změny (jen se tu už needitují).
- Dovolená / odstávky a Mimořádné volné dny: obě sekce mají teď stejné rozbalovací řazení podle roku jako Přesčasy – nový rok se objeví automaticky po prvním uložení záznamu s jeho datem, bez zásahu do kódu.
- Pravidla generátoru: sloupec Jméno u "Základní soustruhy měkoty" zúžen na 84px (byl poloviční jako Stroj, teď je Stroj širší).
- Zálohy nastavení: sloupce tabulky přeskládány v poměru cca 2:1 (Záloha nastavení : Akce) místo původního 1:1.
- Release metadata sjednocena na `RaK 1.2 (1.294)`, technicka verze `1.2.294`, cache `v1.2-1.294`; loader modulu ma cache znacku `1.2.294`.

## RaK 1.2 (1.293)

- Zálohy: každé uložení rozpisu teď samo vytvoří automatickou zálohu stavu před změnou (drží se posledních 8), vedle stávajících ručních záloh. Obnova jde přímo ze sekce Zálohy rozpisů.
- Statistiky: v administraci Rozpisů je nový přehled `Statistické odchylky`, který porovná roční počet odpracovaných dní jednotlivých lidí proti mediánu a označí výrazné výkyvy.
- Historie změn: nová admin sekce zaznamenává, kdo a kdy uložil dovolenou, přesčasy nebo rozpis (posledních 200 změn, bez hesel a bez detailu obsahu).
- TNKS01/TPKW01: pravidlo "nikdy dvakrát po sobě" a vyrovnávání nýtovačky zůstávají natvrdo v generátoru - jde o bezpečnostní pojistku hluboko v algoritmu, jejíž změna bez možnosti ověření na reálných datech by riskovala špatně vygenerovaný rozpis.
- Release metadata sjednocena na `RaK 1.2 (1.293)`, technicka verze `1.2.293`, cache `v1.2-1.293`; loader modulu ma cache znacku `1.2.293`.

## RaK 1.2 (1.292)

- Oprava dat: řádek nastavení Kantýny/jídelny (`FOOD_SCHEDULE_SETTINGS`) měl v databázi poškozenou kategorii `frezka` místo `food_schedule`, takže se zobrazoval jako fantomový stroj v Nastavení strojů / Frezky a pračka. Kategorie opravena, časy kantýny/jídelny i přesčasové neděle zůstaly beze změny.
- Nastavení strojů: `adminMachineIsEditableMachineRow` teď kromě kategorie kontroluje i `machine_key`, takže kantýnu (nebo jiný settings řádek se špatně nastavenou kategorií) už nejde omylem zobrazit ani uložit jako stroj.
- Nastavení strojů: čtení tabulky z formuláře (`readAdminMachineSettingsFromDom`) přeskakuje řádky se strojovým kódem `FOOD`, aby uložení nemohlo znovu přepsat kategorii kantýny na `frezka`.
- Release metadata sjednocena na `RaK 1.2 (1.292)`, technicka verze `1.2.292`, cache `v1.2-1.292`; loader modulu ma cache znacku `1.2.292`.

## RaK 1.2 (1.291)

- Admin úvod: zjednodušen na přehledné menu bez průvodce – odstraněny bloky Připravenost předání, Úkoly před předáním, Kontrola po uložení, Doporučené kroky, Předávací podklady, Legenda tlačítek, Stav oprávnění a Pravidla přístupu.
- Admin menu: ze sekce Rozpisy a předání zmizely odkazy na Měsíční postup, Předání správy, Příručku správce a Kde co upravit; podkladové obrazovky zůstávají v kódu, jen už nejsou v menu.
- O aplikaci: doplněn chybějící souhrn verzí 1.234–1.289 (průvodce předáním, zálohy nastavení, admin zařízení, kontrolní panely).
- Kontakt aplikace: jméno, telefon a e-mail může měnit už jen hlavní admin (9811); nižší admin sekci nevidí v menu a při přímém pokusu o uložení je zablokován.
- Smoke test: odstraněny zastaralé kontroly odstraněných bloků průvodce, přidané kontroly zůstávají beze změny.
- Release metadata sjednocena na `RaK 1.2 (1.291)`, technicka verze `1.2.291`, cache `v1.2-1.291`; loader modulu ma cache znacku `1.2.291`.

## RaK 1.2 (1.290)

- Pracovníci: nová admin sekce `Pracovníci` umožňuje přidávat a odebírat lidi, kteří se počítají v rozpisu, generátoru a statistikách (dřív jen natvrdo `KNOWN_STAT_NAMES` v core.js).
- Pracovníci: seznam se ukládá online přes `machine_settings` (kategorie `worker_roster_settings`), vestavěná jména zůstávají výchozí, dokud je hlavní nebo nižší admin poprvé neuloží.
- Správci: hesla nižších adminů se už neukládají jako čistý text – ukládá se jen salted SHA-256 hash, formulář heslo při načtení nezobrazuje (prázdné pole = beze změny).
- Správci: řádek správce jde nově vyprázdnit tlačítkem × přímo v tabulce, ne jen mazáním pole ručně.
- Bezpečnost: úplná záloha nastavení a online tabulka správců už neobsahují plaintext hesla nižších adminů. Heslo hlavního admina zůstává jako sdílený PIN pro zápisy do Supabase (nejde zahashovat bez přepsání celého ověřování na serveru), proto ho dál nikam nepiš mimo appku.
- Release metadata sjednocena na `RaK 1.2 (1.290)`, technicka verze `1.2.290`, cache `v1.2-1.290`; loader modulu ma cache znacku `1.2.290`.

## RaK 1.2 (1.289)

- Předání správy: stroje a kalkulačky mají samostatný stav v připravenosti, kontrole předání a textovém stavu.
- Předání správy: souhrn strojů ukazuje frezky/pračku, brusy, FHB středy a případné neúplné nebo duplicitní řádky.
- Mapa nastavení: přibyla samostatná oblast `Stroje a kalkulačky` s rychlým otevřením Nastavení strojů.
- Předání správy: technické řádky úplných záloh nastavení se už nepočítají jako běžné stroje.
- Smoke guard: `app-usage-smoke-v963.js` hlídá snapshot strojů, předávací řádky, filtr záloh a mapu nastavení.
- Release metadata sjednocena na `RaK 1.2 (1.289)`, technicka verze `1.2.289`, cache `v1.2-1.289`; loader modulu ma cache znacku `1.2.289`.

## RaK 1.2 (1.288)

- Předání správy: stav veřejného oznámení na Dashboardu je vidět v připravenosti, kontrole předání a textovém stavu předání.
- Předání správy: aktivní oznámení se označí ke kontrole, aby nový správce nepřebíral veřejný text bez vědomí.
- Mapa nastavení: oblast pro veřejné texty teď výslovně obsahuje Oznámení a vede rovnou do admin sekce oznámení.
- Smoke guard: `app-usage-smoke-v963.js` hlídá snapshot oznámení, řádky v předávacích textech i rychlou akci v mapě nastavení.
- Release metadata sjednocena na `RaK 1.2 (1.288)`, technicka verze `1.2.288`, cache `v1.2-1.288`; loader modulu ma cache znacku `1.2.288`.

## RaK 1.2 (1.287)

- Předání správy: stažené admin podklady mají jednotnou hlavičku s verzí, časem vytvoření, admin účtem, rolí a stavem odemčení.
- Předání správy: úkoly, připravenost, stav, balíček, měsíční postup, mapa nastavení i příručka používají stejný zdroj metadat.
- Předání správy: podklady dál nestahují hesla, jen zapisují, pod jakým admin účtem export vznikl.
- Smoke guard: `app-usage-smoke-v963.js` hlídá společnou exportní hlavičku a její použití ve všech předávacích textech.
- Release metadata sjednocena na `RaK 1.2 (1.287)`, technicka verze `1.2.287`, cache `v1.2-1.287`; loader modulu ma cache znacku `1.2.287`.

## RaK 1.2 (1.286)

- Kontakt: verejne menu Kontakt pouziva z admin nastaveni klikaci `tel:` odkaz pro telefon a `mailto:` odkaz pro e-mail.
- Kontakt: neplatny telefon nebo e-mail zustane jen textem, aby se nevytvarel rozbity klik.
- Verejna cast: vzhled kontaktu zustava stejny, jen platne hodnoty jdou rovnou zavolat nebo otevrit v e-mailu.
- Smoke guard: `app-usage-smoke-v963.js` hlida helpery `getRakAppContactPhoneHref`, `getRakAppContactEmailHref` i klikaci radek verejneho kontaktu.
- Release metadata sjednocena na `RaK 1.2 (1.286)`, technicka verze `1.2.286`, cache `v1.2-1.286`; loader modulu ma cache znacku `1.2.286`.

## RaK 1.2 (1.285)

- Odkazy: dashboard po prekresleni propisuje admin nastavene URL i do skutecnych `href` atributu karet.
- Odkazy: Jidelni listek, Eportal i Vyplata maji `href` pres bezpecny `setSafeExternalAnchor`, takze i dlouhy stisk / otevreni odkazu bere admin nastaveni.
- Verejna cast: vzhled karet se nemeni, jen se odstranuje riziko stareho fallback odkazu z HTML.
- Smoke guard: `app-usage-smoke-v963.js` hlida synchronizaci `href` pro tri dashboard odkazy a volani synchronizace po prekresleni dashboardu.
- Release metadata sjednocena na `RaK 1.2 (1.285)`, technicka verze `1.2.285`, cache `v1.2-1.285`; loader modulu ma cache znacku `1.2.285`.

## RaK 1.2 (1.284)

- Predani spravy: prirucka a pruvodce ted hlavniho admina vedou i ke kontrole prihlasenych admin zarizeni.
- Mapa nastaveni: pribyla owner-only oblast `Admin zarizeni`, ktera ukazuje, kde zkontrolovat trvale prihlasena zarizeni a odhlasit nepotrebna.
- Zalohy: prirucka v casti zaloh vede nejen na zalohy rozpisu, ale i na uplne zalohy nastaveni.
- Smoke guard: `app-usage-smoke-v963.js` hlida mapu admin zarizeni, pripomenuti odhlaseni zarizeni a odkaz na uplne zalohy nastaveni.
- Release metadata sjednocena na `RaK 1.2 (1.284)`, technicka verze `1.2.284`, cache `v1.2-1.284`; loader modulu ma cache znacku `1.2.284`.

## RaK 1.2 (1.283)

- Administrace: tlacitko Administrace se admin uctu zobrazi i pred dokoncenym obnovenim ulozene session.
- Admin session: menu umi poznat aktivni ucet `9811`, znamy admin ucet nebo ulozenou admin session a pri kliknuti teprve overi/obnovi pristup.
- Bezny uzivatel: bez admin uctu se vstup do administrace dal nezobrazuje.
- Smoke guard: `app-usage-smoke-v963.js` hlida helper `appMenuShouldShowAdminEntry`, ulozenou admin session i napojeni tlacitka Administrace.
- Release metadata sjednocena na `RaK 1.2 (1.283)`, technicka verze `1.2.283`, cache `v1.2-1.283`; loader modulu ma cache znacku `1.2.283`.

## RaK 1.2 (1.282)

- Administrace: klik na Administraci si pred otevrenim sam obnovi ulozene admin prihlaseni nebo vyzada heslo, aby tlacitko nezustalo bez odezvy.
- Zalohy nastaveni: vytvoreni uplne zalohy ted udela dvojite jisteni - ulozi bod obnovy do Supabase a hned stahne JSON soubor.
- Zalohy nastaveni: hlavni admin muze nahrat stazenou JSON zalohu zpet do online seznamu zaloh.
- Import zalohy: soubor se overi podle typu `rak-full-settings-backup-export`, ulozi se jako nova importovana zaloha a v seznamu se oznaci jako `importovana`.
- Smoke guard: `app-usage-smoke-v963.js` hlida obnoveni admin session pri kliknuti, import JSON zalohy i automaticke stazeni po vytvoreni zalohy.
- Release metadata sjednocena na `RaK 1.2 (1.282)`, technicka verze `1.2.282`, cache `v1.2-1.282`; loader modulu ma cache znacku `1.2.282`.

## RaK 1.2 (1.281)

- Zalohy nastaveni: hlavni admin muze stahnout konkretni uplnou zalohu jako JSON soubor pro offline archiv.
- Zalohy nastaveni: v seznamu je u kazde zalohy vedle obnovy i tlacitko Stahnout, ktere nic nemeni online.
- Export zalohy: soubor ma typ `rak-full-settings-backup-export` a jasny nazev `RaK_zaloha_nastaveni_...json`.
- Smoke guard: `app-usage-smoke-v963.js` hlida tlacitko, handler i JSON export uplne zalohy nastaveni.
- Release metadata sjednocena na `RaK 1.2 (1.281)`, technicka verze `1.2.281`, cache `v1.2-1.281`.

## RaK 1.2 (1.280)

- Zalohy nastaveni: seznam ted rozlisuje rucni body obnovy a automaticke body vytvorene pred obnovou.
- Zalohy nastaveni: stavovy souhrn ukazuje pocet rucnich a automatickych zaloh, aby hlavni admin poznal skutecny vychozi bod.
- Obnova nastaveni: radek automaticke zalohy ukazuje vazbu na obnovu, pred kterou vznikl.
- Smoke guard: `app-usage-smoke-v963.js` hlida popisky rucni/automaticke zalohy i jejich pocty ve stavovem souhrnu.
- Release metadata sjednocena na `RaK 1.2 (1.280)`, technicka verze `1.2.280`, cache `v1.2-1.280`.

## RaK 1.2 (1.279)

- Zalohy nastaveni: pred obnovou uplne zalohy se aktualni stav automaticky ulozi jako novy bod navratu.
- Obnova nastaveni: automaticka zaloha pred obnovou ma zdroj `before-restore` a vazbu na obnovovanou zalohu.
- Administrace: bezpecnostni panel u Zaloh nastaveni vysvetluje, ze se aktualni stav pred obnovou ulozi bokem.
- Smoke guard: `app-usage-smoke-v963.js` hlida automatickou zalohu pred obnovou a jeji popis v admin UI.
- Release metadata sjednocena na `RaK 1.2 (1.279)`, technicka verze `1.2.279`, cache `v1.2-1.279`.

## RaK 1.2 (1.278)

- Predani spravy: pripravenost a kontrola predani ted hlida, jestli existuje uplna zaloha nastaveni pro hlavniho admina.
- Ukoly pred predanim: pokud uplna zaloha nastaveni chybi, objevi se mezi vecmi k vyreseni a tlacitko vede primo do owner-only sekce Zalohy nastaveni.
- Predavaci exporty: stav predani i pristupova pravidla obsahuji informaci o uplnych zalohach nastaveni.
- Smoke guard: `app-usage-smoke-v963.js` hlida snapshot uplnych zaloh, smerovani tlacitka a textove podklady predani.
- Release metadata sjednocena na `RaK 1.2 (1.278)`, technicka verze `1.2.278`, cache `v1.2-1.278`.

## RaK 1.2 (1.277)

- Zalohy nastaveni: obnova uplne zalohy uz umi skryt i radky, ktere vznikly az po zaloze, aby rollback opravdu vratil stav k vybranemu bodu.
- Supabase: pridana specialni kategorie `admin_settings_deleted`, ktera funguje jako bezpecny tombstone bez nutnosti primazavani z tabulky.
- Nacitani nastaveni: online i lokalni cache ignoruji skryte deleted radky, takze se po obnove nevraceji do aplikace.
- Administrace stroju: skryte rollback radky se nezobrazuji mezi beznymi stroji.
- Smoke guard: `app-usage-smoke-v963.js` hlida deleted radky, filtr nacitani a editor stroju.
- Release metadata sjednocena na `RaK 1.2 (1.277)`, technicka verze `1.2.277`, cache `v1.2-1.277`.

## RaK 1.2 (1.276)

- Administrace: hlavni admin ma novou owner-only sekci Zalohy nastaveni pro uplnou online zalohu vsech nastaveni aplikace.
- Zalohy nastaveni: vytvoreni, nacteni i obnova jsou blokovane pro nizsi adminy; primo je muze pouzit jen ucet 9811.
- Obnova nastaveni: snapshot vraci stroje, provozni nastaveni, prescasy, dovolene, odkazy, kontakt, vyplatu i spravce z vybrane zalohy.
- Supabase: specialni kategorie `admin_full_settings_backup` je povolena pro RPC ulozeni a neskryva se mezi beznymi stroji.
- Smoke guard: `app-usage-smoke-v963.js` hlida owner-only pristup k uplnym zaloham nastaveni.
- Release metadata sjednocena na `RaK 1.2 (1.276)`, technicka verze `1.2.276`, cache `v1.2-1.276`.

## RaK 1.2 (1.275)

- Administrace: popisy roli sjednocuji nizsiho admina jako spravce pracovnich casti aplikace bez pristupu k heslum a dalsim adminum.
- Spravci: prehled roli a readonly hlaska ted rikaji, ze nizsi admin muze spravovat provoz, rozpisy, absence, zalohy, exporty a nastaveni aplikace.
- Predani spravy: textova pravidla pristupu uz neomezuji nizsiho admina jen na provoz a rozpisy.
- Smoke guard: `app-usage-smoke-v963.js` hlida sjednocene popisy nizsiho admina.
- Release metadata sjednocena na `RaK 1.2 (1.275)`, technicka verze `1.2.275`, cache `v1.2-1.275`.

## RaK 1.2 (1.274)

- Administrace: nizsi admin je v prehledu opravneni pojmenovany jako nizsi admin a ma jasne uvedeno, ze nemeni hesla ani dalsi adminy.
- Kde co upravit: tlacitko Spravci se v mape nastaveni zobrazuje jen hlavnimu adminovi.
- Admin menu: sekce Kontrola a servis nizsimu adminovi vysvetluje, ze hesla a dalsi adminy spravuje jen hlavni admin.
- Smoke guard: `app-usage-smoke-v963.js` hlida rozliseni hlavniho a nizsiho admina v menu i mape nastaveni.
- Release metadata sjednocená na `RaK 1.2 (1.274)`, technická verze `1.2.274`, cache `v1.2-1.274`.

## RaK 1.2 (1.273)

- Predani spravy: pripravenost predani ted kontroluje i nastaveni vyplaty a nejblizsi termin.
- Kontrola predani: Vyplata ma vlastni stav a rychlou akci do administrace vyplaty.
- Predavaci exporty: stav predani a pravidla pristupu obsahuji vyplatu pred predanim.
- Smoke guard: `app-usage-smoke-v963.js` hlida vyplatu v predani, textovych podkladech i smerovani do admin vyplaty.
- Release metadata sjednocená na `RaK 1.2 (1.273)`, technická verze `1.2.273`, cache `v1.2-1.273`.

## RaK 1.2 (1.272)

- Predani spravy: pripravenost predani ted kontroluje i verejne odkazy aplikace.
- Kontrola predani: odkazy maji vlastni stav a rychlou akci do administrace odkazu.
- Predavaci exporty: stav predani a pravidla pristupu obsahuji verejne odkazy pred predanim.
- Smoke guard: `app-usage-smoke-v963.js` hlida odkazy v predani, textovych podkladech i smerovani do admin odkazu.
- Release metadata sjednocená na `RaK 1.2 (1.272)`, technická verze `1.2.272`, cache `v1.2-1.272`.

## RaK 1.2 (1.271)

- Predani spravy: pripravenost predani ted kontroluje i verejny kontakt aplikace.
- Kontrola predani: kontakt aplikace ma vlastni stav a rychlou akci do administrace kontaktu.
- Predavaci exporty: stav predani a pravidla pristupu obsahuji kontakt aplikace pred predanim.
- Smoke guard: `app-usage-smoke-v963.js` hlida kontakt v predani, textovych podkladech i smerovani do admin kontaktu.
- Release metadata sjednocená na `RaK 1.2 (1.271)`, technická verze `1.2.271`, cache `v1.2-1.271`.

## RaK 1.2 (1.270)

- Predani spravy: ukol Reporty chyb v seznamu pred predanim ted otevre primo panel reportu.
- Kde co upravit: kontrola a servis ma rychlou akci Reporty, aby novy spravce nasel hlasene chyby bez hledani.
- Smoke guard: `app-usage-smoke-v963.js` hlida smerovani reportu z predani i mapy nastaveni.
- Release metadata sjednocená na `RaK 1.2 (1.270)`, technická verze `1.2.270`, cache `v1.2-1.270`.

## RaK 1.2 (1.269)

- Predani spravy: pripravenost a kontrola predani ted ukazuji i stav reportu chyb pred predanim.
- Predavaci exporty: stav predani a pravidla pristupu obsahuji reporty chyb, aby novy spravce neprebiral skryte problemy.
- Smoke guard: `app-usage-smoke-v963.js` hlida souhrn reportu chyb v predani spravy i textovych podkladech.
- Release metadata sjednocená na `RaK 1.2 (1.269)`, technická verze `1.2.269`, cache `v1.2-1.269`.

## RaK 1.2 (1.268)

- Spravci: aktualni admin zarizeni uz neni jen oznacene jako aktivni, ale jde ho z panelu primo odhlasit.
- Admin relace: po odhlaseni aktualniho zarizeni se administrace na nem hned zamkne a aplikace se vrati do bezneho menu.
- Smoke guard: `app-usage-smoke-v963.js` hlida odhlaseni aktualniho zarizeni i navrat mimo admin menu.
- Release metadata sjednocená na `RaK 1.2 (1.268)`, technická verze `1.2.268`, cache `v1.2-1.268`.

## RaK 1.2 (1.267)

- Predani spravy: pripravenost a kontrola predani ted ukazuji i pocet prihlasenych admin zarizeni.
- Predavaci exporty: stav predani a pravidla pristupu obsahuji admin zarizeni, aby novy spravce vedel, kde muze zustat odemcena administrace.
- Smoke guard: `app-usage-smoke-v963.js` hlida souhrn admin zarizeni v predani spravy i textovych podkladech.
- Release metadata sjednocená na `RaK 1.2 (1.267)`, technická verze `1.2.267`, cache `v1.2-1.267`.

## RaK 1.2 (1.266)

- Admin prihlaseni: po overeni heslem zustane admin ucet odemceny na danem zarizeni i po znovuotevreni aplikace.
- Spravci: hlavni admin vidi prihlasena admin zarizeni a muze jejich ulozenou relaci odhlasit bez mazani uctu nebo hesla.
- Smoke guard: `app-usage-smoke-v963.js` hlida ulozenou admin relaci, seznam zarizeni a odhlaseni relace ze sekce Spravci.
- Release metadata sjednocená na `RaK 1.2 (1.266)`, technická verze `1.2.266`, cache `v1.2-1.266`.

## RaK 1.2 (1.265)

- Administrace / Export / import: doplněno potvrzení před načtením Excelu do rozpisů, aby se import nedal spustit omylem.
- Excel import: potvrzení ukazuje rozsah importu, počet měsíců a upozornění, že akce změní rozpisy; při zrušení zůstanou rozpisy beze změny.
- Smoke guard: `app-usage-smoke-v963.js` hlídá potvrzení importu, varovný text a bezpečné zrušení bez zápisu.
- Release metadata sjednocená na `RaK 1.2 (1.265)`, technická verze `1.2.265`, cache `v1.2-1.265`.

## RaK 1.2 (1.264)

- Administrace: rozšířena `Legenda tlačítek` o rizikové akce `Import` a `Obnovit`, aby nový správce hned viděl, že nejde o běžné načtení.
- Předání správy: `Import` je označen jako přepis rozpisů z Excelu a `Obnovit` jako přepsání aktuálního rozpisu zálohou.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nové položky legendy a jejich varovné zvýraznění.
- Release metadata sjednocená na `RaK 1.2 (1.264)`, technická verze `1.2.264`, cache `v1.2-1.264`.

## RaK 1.2 (1.263)

- Administrace / Zálohy rozpisů: doplněna admin-only `Bezpečnost obnovy`, aby správce před obnovou viděl, že záloha přepíše aktuální rozpis.
- Zálohy: kontrola připomíná ověření data a měsíce zálohy, uložení současného stavu bokem a kontrolu rozpisů/exportu po obnově.
- Smoke guard: `app-usage-smoke-v963.js` hlídá bezpečnostní panel obnovy, text o přepsání aktuálního rozpisu a responzivní admin styl.
- Release metadata sjednocená na `RaK 1.2 (1.263)`, technická verze `1.2.263`, cache `v1.2-1.263`.

## RaK 1.2 (1.262)

- Administrace / Export / import: doplněna admin-only `Bezpečnost importu`, aby správce jasně viděl rozdíl mezi exportem, který jen stahuje data, a importem, který přepisuje rozpisy.
- Import: kontrola připomíná ověření rozsahu měsíc/rok, zálohu před větším importem a kontrolu rozpisů/exportu po načtení Excelu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá bezpečnostní panel importu, text o přepisování dat a responzivní admin styl.
- Release metadata sjednocená na `RaK 1.2 (1.262)`, technická verze `1.2.262`, cache `v1.2-1.262`.

## RaK 1.2 (1.261)

- Administrace / Nastavení strojů: doplněna admin-only `Kontrola dopadu strojů`, aby správce po uložení ověřil kalkulačky, návazné rozpisové kontroly a online stav.
- Stroje: kontrola připomíná, že změna časů, rychlostí nebo orovnání se nemá ověřovat jen v tabulce, ale i v běžné části aplikace.
- Smoke guard: `app-usage-smoke-v963.js` hlídá kontrolu dopadu strojů, vložení do admin obrazovky a responzivní styl.
- Release metadata sjednocená na `RaK 1.2 (1.261)`, technická verze `1.2.261`, cache `v1.2-1.261`.

## RaK 1.2 (1.260)

- Administrace / Pravidla generátoru: doplněn admin-only panel `Dopad pravidel`, aby správce viděl, že změna pravidel sama nepřepíše hotové měsíce.
- Generátor: kontrola připomíná, že nová pravidla se projeví až při dalším návrhu a že před uložením je nutné ověřit výjimky, absence, TNKS01/TPKW01 a souhrn počtů.
- Smoke guard: `app-usage-smoke-v963.js` hlídá dopad pravidel generátoru, text o nezasahování do hotového rozpisu a responzivní admin styl.
- Release metadata sjednocená na `RaK 1.2 (1.260)`, technická verze `1.2.260`, cache `v1.2-1.260`.

## RaK 1.2 (1.259)

- Administrace / Rozpisy: doplněna admin-only `Veřejná kontrola rozpisu`, aby správce po uložení ověřil Rotace / Rozpisy, výjimky, absence a exporty.
- Rozpisy: kontrola připomíná žluté výjimky, detail výjimky po kliknutí, stabilní sloupce absencí a Excel/obrázkový export.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu rozpisu, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.259)`, technická verze `1.2.259`, cache `v1.2-1.259`.

## RaK 1.2 (1.258)

- Administrace / Mimořádné volné dny: doplněna admin-only `Veřejná kontrola volných dnů`, aby správce po uložení ověřil dopad jednorázového volného dne.
- Volné dny: kontrola připomíná přesné datum, důvod, dopad na rozpis/výpočty a rozdíl proti delším obdobím v Dovolená / odstávky.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu volných dnů, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.258)`, technická verze `1.2.258`, cache `v1.2-1.258`.

## RaK 1.2 (1.257)

- Administrace / Dovolená a odstávky: doplněna admin-only `Veřejná kontrola dovolené`, aby správce po uložení ověřil home kartu Dovolená.
- Dovolená: kontrola připomíná název období, počet dní, pravou část se směnou D, přesné Od/Do a ověření odpočtu podle skutečného rozpisu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu dovolené, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.257)`, technická verze `1.2.257`, cache `v1.2-1.257`.

## RaK 1.2 (1.256)

- Administrace / Kantýna a jídelna: doplněna admin-only `Veřejná kontrola provozu`, aby správce po uložení ověřil home karty Kantýna/Jídelna.
- Provoz: kontrola připomíná stav otevřeno/zavřeno, čas `Do`, řádek `Další`, běžné časy a budoucí přesčasové neděle.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu provozu, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.256)`, technická verze `1.2.256`, cache `v1.2-1.256`.

## RaK 1.2 (1.255)

- Administrace / Výplata: doplněna admin-only `Veřejná kontrola výplaty`, aby správce po uložení ověřil home kartu Výplata a text odpočtu.
- Výplata: kontrola připomíná pravidlo pracovního dne, ruční měsíční výjimky a zelenou synchronizaci po uložení.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu výplaty, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.255)`, technická verze `1.2.255`, cache `v1.2-1.255`.

## RaK 1.2 (1.254)

- Administrace / Kontakt aplikace: doplněna admin-only `Veřejná kontrola kontaktu`, aby správce po uložení ověřil jméno, telefon a e-mail v běžném menu Kontakt.
- Kontakt: kontrola připomíná čitelnost v menu, volatelný telefon a klikací e-mail bez překlepů.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu kontaktu, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.254)`, technická verze `1.2.254`, cache `v1.2-1.254`.

## RaK 1.2 (1.253)

- Administrace / Odkazy: doplněna admin-only `Veřejná kontrola odkazů`, aby správce po změně ověřil Jídelní lístek, Eportal, Výplatu a Kalendář z běžné aplikace.
- Odkazy: kontrola připomíná bezpečný formát URL, test vloženého kalendáře a veřejný dopad na home/menu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu odkazů, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.253)`, technická verze `1.2.253`, cache `v1.2-1.253`.

## RaK 1.2 (1.252)

- Administrace / Oznámení Dashboard: doplněna admin-only `Veřejná kontrola oznámení`, aby správce před veřejnou změnou viděl, kde se projeví a co ověřit po uložení nebo vypnutí.
- Oznámení: kontrola připomíná ověření home/Dashboardu, zmizení baru po vypnutí a pořadí časů Od/Do.
- Smoke guard: `app-usage-smoke-v963.js` hlídá veřejnou kontrolu oznámení, vložení do admin obrazovky a responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.252)`, technická verze `1.2.252`, cache `v1.2-1.252`.

## RaK 1.2 (1.251)

- Administrace / Kde co upravit: kazda oblast mapy ma novy radek `Po ulozeni over`, aby novy spravce vedel, kde zkontrolovat vysledek zmeny.
- Mapa nastaveni: horni souhrn pocita, jestli maji vsechny oblasti vyplnenou kontrolu po ulozeni.
- Predavaci export mapy: textovy soubor `RaK_kde_co_upravit_...` obsahuje kontrolu po ulozeni u kazde oblasti.
- Smoke guard: `app-usage-smoke-v963.js` hlida pokryti kontrol, textovy export i vlastni styl mapy.
- Release metadata sjednocená na `RaK 1.2 (1.251)`, technická verze `1.2.251`, cache `v1.2-1.251`.

## RaK 1.2 (1.250)

- Administrace / Predavaci podklady: textovy stav i souhrnny balicek obsahuji samostatny blok `Pristup a hesla`.
- Predani spravy: v podkladech je jasne napsane, ze exporty nestahuji admin hesla a ze hesla se nastavujou jen v administraci / Spravci.
- Smoke guard: `app-usage-smoke-v963.js` hlida pristupova pravidla v predavacich textech a pravidlo bez exportu hesel.
- Release metadata sjednocená na `RaK 1.2 (1.250)`, technická verze `1.2.250`, cache `v1.2-1.250`.

## RaK 1.2 (1.249)

- Administrace / Spravci: obrazovka spravcu ma novy admin-only souhrn `Bezpecnost pristupu` s owner uctem, poctem dalsich spravcu a pravidlem, ze predavaci exporty nestahuji hesla.
- Predani spravy: u spravcu je jasne videt, ze bezni uzivatele nemeni provozni data a dalsi admini maji vlastni ucet i heslo.
- Smoke guard: `app-usage-smoke-v963.js` hlida bezpecnostni souhrn spravcu, text o nestahovani hesel a jeho vlastni layout.
- Release metadata sjednocená na `RaK 1.2 (1.249)`, technická verze `1.2.249`, cache `v1.2-1.249`.

## RaK 1.2 (1.248)

- Administrace / Predavaci podklady: rychle exporty na admin uvodu maji na desktopu vyrovnanou mrizku 3 + 3 tlacitka.
- Predani spravy: podklady `Balicek`, `Stav`, `Ukoly`, `Prirucka`, `Postup`, `Mapa` se lepe ctou a mobil zustava po dvou tlacitkach.
- Smoke guard: `app-usage-smoke-v963.js` hlida desktopovou mrizku rychlych predavacich exportu.
- Release metadata sjednocená na `RaK 1.2 (1.248)`, technická verze `1.2.248`, cache `v1.2-1.248`.

## RaK 1.2 (1.247)

- Administrace / Predavaci podklady: rychle exporty na admin uvodu nově obsahuji i samostatny `Stav`, nejen balicek, ukoly, prirucku, postup a mapu.
- Predani spravy: novy spravce si muze stahnout aktualni stav predani rovnou z uvodniho admin rozcestniku.
- Smoke guard: `app-usage-smoke-v963.js` hlida, ze rychle predavaci podklady obsahuji akci `download-handover-status`.
- Release metadata sjednocená na `RaK 1.2 (1.247)`, technická verze `1.2.247`, cache `v1.2-1.247`.

## RaK 1.2 (1.246)

- Administrace / Predani spravy: seznam `Co jeste vyresit pred predanim` jde nově stahnout samostatne jako textovy soubor `RaK_ukoly_pred_predanim_...`.
- Predavaci podklady: rychle exporty na admin uvodu obsahují i samostatne `Ukoly`, aby novy spravce nemusel stahovat cely balicek jen kvuli nejblizsim krokum.
- Smoke guard: `app-usage-smoke-v963.js` hlida tlacitko, handler a nazev souboru samostatneho exportu ukolu pred predanim.
- Release metadata sjednocená na `RaK 1.2 (1.246)`, technická verze `1.2.246`, cache `v1.2-1.246`.

## RaK 1.2 (1.245)

- Administrace / Predani spravy: pridany seznam `Co jeste vyresit pred predanim`, ktery bere varovani z pripravenosti predani a vede spravce do spravne admin sekce.
- Predani spravy: stejny seznam ukolu je soucasti textoveho stavu i predavaciho balicku, aby novy spravce videl nejblizsi kroky i mimo aplikaci.
- Smoke guard: `app-usage-smoke-v963.js` hlida UI seznam ukolu, textovy export, mapovani akci i responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.245)`, technická verze `1.2.245`, cache `v1.2-1.245`.

## RaK 1.2 (1.244)

- Administrace / Predani spravy: souhrn `Pripravenost predani` nově kontroluje i stav synchronizace a offline frontu Supabase.
- Oprava: pocet aktivnich spravcu v pripravenosti predani uz znovu nepada do rekurzivniho volani helperu.
- Smoke guard: `app-usage-smoke-v963.js` hlida sync snapshot, cteni `getSupabaseSyncStatus` a zakazuje navrat rekurze v poctu spravcu.
- Release metadata sjednocená na `RaK 1.2 (1.244)`, technická verze `1.2.244`, cache `v1.2-1.244`.

## RaK 1.2 (1.243)

- Administrace: na admin uvod a Predani spravy pridany souhrn `Pripravenost predani`, ktery ukaze celkovy stav, pocet OK bodu, varovani a informacni body.
- Predani spravy: stejny souhrn pripravenosti je soucasti textoveho stavu i souhrnneho predavaciho balicku.
- Smoke guard: `app-usage-smoke-v963.js` hlida snapshot pripravenosti, vlozeni do admin-only obrazovek, textovy export i responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.243)`, technická verze `1.2.243`, cache `v1.2-1.243`.

## RaK 1.2 (1.242)

- Administrace: na admin uvod a Predani spravy pridany panel `Kontrola po ulozeni` se ctyrmi kroky: synchronizace, verejny dopad, reporty a export.
- Predani spravy: kontrola po ulozeni je soucasti textoveho predavaciho balicku, aby novy spravce vedel, co overit po kazde zmene.
- Smoke guard: `app-usage-smoke-v963.js` hlida spolecny zdroj kontroly po ulozeni, vlozeni do admin-only obrazovek a kompaktni responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.242)`, technická verze `1.2.242`, cache `v1.2-1.242`.

## RaK 1.2 (1.241)

- Administrace: na admin uvod a Predani spravy pridany prehled `Kdo smi co menit` pro hlavniho admina, dalsi spravce a bezny ucet.
- Predani spravy: textovy stav predani nově obsahuje pravidla, ze hlavni admin smi menit spravce, dalsi spravce jen provoz a rozpisy a bezny ucet nesmi menit online data.
- Smoke guard: `app-usage-smoke-v963.js` hlida vlozeni prehledu roli do admin-only obrazovek i jeho responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.241)`, technická verze `1.2.241`, cache `v1.2-1.241`.

## RaK 1.2 (1.240)

- Administrace / Kde co upravit: pridany admin-only prehled `Verejny dopad zmen`, ktery deli oblasti na viditelne pro bezne lidi a ciste spravcovske.
- Predani spravy: spravce hned vidi, co ma po ulozeni zkontrolovat v bezne aplikaci nebo exportu, a co zustava jen uvnitr administrace.
- Smoke guard: `app-usage-smoke-v963.js` hlida sdilenou detekci verejneho dopadu, vlozeni prehledu do mapy nastaveni i jeho responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.240)`, technická verze `1.2.240`, cache `v1.2-1.240`.

## RaK 1.2 (1.239)

- Administrace: na uvod pridana admin-only `Legenda tlacitek`, ktera vysvetluje rozdil mezi `Ulozit`, `Nacist`, `Stahnout` a `Zpet`.
- Predani spravy: novy spravce hned vidi, ktera tlacitka meni online data a ktera jen nacitaji, stahuji soubor nebo se vraci zpet.
- Smoke guard: `app-usage-smoke-v963.js` hlida vlozeni legendy na admin uvod a jeji styl vcetne odliseni ukladacich akci.
- Release metadata sjednocená na `RaK 1.2 (1.239)`, technická verze `1.2.239`, cache `v1.2-1.239`.

## RaK 1.2 (1.238)

- Administrace / Predavaci podklady: blok na admin uvodu nově ukazuje vybrany mesic, zdroj `aktualni stav` a potvrzeni, ze export nic neuklada.
- Predani spravy: spravce pred stazenim vidi, k jakemu mesici a stavu se podklady skladaji, takze nehrozi zameneni se starsim exportem.
- Smoke guard: `app-usage-smoke-v963.js` hlida stavovy radek predavacich podkladu a jeho responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.238)`, technická verze `1.2.238`, cache `v1.2-1.238`.

## RaK 1.2 (1.237)

- Administrace: na uvod pridany admin-only blok `Predavaci podklady` s rychlym stazenim balicku predani, prirucky, mesicniho postupu a mapy nastaveni.
- Predani spravy: exporty jsou dostupne hned z hlavniho admin rozcestniku a porad jen vytvari textove soubory, nic samy neukladaji.
- Smoke guard: `app-usage-smoke-v963.js` hlida vlozeni bloku na admin uvod a jeho responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.237)`, technická verze `1.2.237`, cache `v1.2-1.237`.

## RaK 1.2 (1.236)

- Administrace / Predani spravy: pridane tlacitko `Stahnout balicek`, ktere vytvori jeden textovy soubor se stavem predani, mesicnim postupem, priruckou spravce a mapou nastaveni.
- Predani: balicek sklada existujici textove exporty, takze nic sam neuklada ani nemeni a novy spravce dostane vsechny podklady najednou.
- Smoke guard: `app-usage-smoke-v963.js` hlida funkce balicku, tlacitko, handler a nazev souboru `RaK_balicek_predani_`.
- Release metadata sjednocená na `RaK 1.2 (1.236)`, technická verze `1.2.236`, cache `v1.2-1.236`.

## RaK 1.2 (1.235)

- Administrace / Kde co upravit: pridane tlacitko `Stahnout mapu`, ktere vytvori textovy soubor s prehledem, kde se co v aplikaci upravuje.
- Predani spravy: mapa nastaveni ma spolecny zdroj pro UI i textovy export, aby se novemu spravci nestahla jina pravidla nez vidi v aplikaci.
- Smoke guard: `app-usage-smoke-v963.js` hlida export mapy, tlacitko, handler a nazev souboru `RaK_kde_co_upravit_`.
- Release metadata sjednocená na `RaK 1.2 (1.235)`, technická verze `1.2.235`, cache `v1.2-1.235`.

## RaK 1.2 (1.234)

- Administrace: na uvod pridan kratky admin-only blok `Co ted zkontrolovat`, ktery z mesicniho postupu vybere nejblizsi kroky podle aktualniho stavu.
- Rozcestnik: doporucene kroky pouze oteviraji existujici chranene admin sekce a nic samy neukladaji, aby byl uvod prehlednejsi pro budouciho spravce.
- Smoke guard: `app-usage-smoke-v963.js` hlida novy blok, jeho vlozeni na admin uvod a vlastni responsive styl.
- Release metadata sjednocená na `RaK 1.2 (1.234)`, technická verze `1.2.234`, cache `v1.2-1.234`.

## RaK 1.2 (1.233)

- O aplikaci: doplnene nove horni bloky historie pro verze `1.179-1.199` a `1.200-1.233`, aby bylo pri predani jasne, co se v poslednich admin upravach zmenilo.
- Historie: nove bloky shrnuji presun nastaveni do administrace, dovolene/odstavky, mimoradne volne dny, predani spravy a kontrolni admin souhrny.
- Smoke guard: `app-usage-smoke-v963.js` hlida nove milniky v `O aplikaci`, aby se pri dalsich upravach neztratily.
- Release metadata sjednocená na `RaK 1.2 (1.233)`, technická verze `1.2.233`, cache `v1.2-1.233`.

## RaK 1.2 (1.232)

- Administrace / Kde co upravit: pridany admin-only souhrn `Stav mapy nastaveni`, ktery ukazuje pocet oblasti, rychlych akci, verejny dopad a stav spravcovskych opravneni.
- Mapa nastaveni: souhrn jasne rika, ze tlacitka jen oteviraji admin sekce a sama nic neukladaji, aby byla bezpecnejsi pro predani spravy.
- Smoke guard: `app-usage-smoke-v963.js` hlida novy souhrn mapy nastaveni a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.232)`, technická verze `1.2.232`, cache `v1.2-1.232`.

## RaK 1.2 (1.231)

- Administrace / Kantyna a jidelna: pridany admin-only souhrn `Stav kantyny / jidelny`, ktery ukazuje vyplnenost beznych casu, prescasovych casu, budoucich nedeli a kontrolu datumu.
- Kantyna a jidelna: souhrn se prepocitava hned pri uprave casu nebo prescasove nedele, vcetne automatickeho prevodu datumu po opusteni pole.
- Smoke guard: `app-usage-smoke-v963.js` hlida novy stav kantyny/jidelny, zive prepocitani a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.231)`, technická verze `1.2.231`, cache `v1.2-1.231`.

## RaK 1.2 (1.230)

- Administrace / Pravidla generatoru: pridany admin-only souhrn `Stav pravidel generatoru`, ktery ukazuje zdroj pravidel, pocet lidi, kontrolu stroju a problemy k oprave.
- Pravidla generatoru: souhrn se prepocitava hned pri uprave seznamu lidi, cyklu stroju, delky bloku nebo zakladnich soustruhu, jeste pred ulozenim.
- Smoke guard: `app-usage-smoke-v963.js` hlida novy stav pravidel generatoru, zive prepocitani a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.230)`, technická verze `1.2.230`, cache `v1.2-1.230`.

## RaK 1.2 (1.229)

- Administrace / Spravci: pridany admin-only souhrn `Stav spravcu`, ktery ukazuje opravneni aktualniho uctu, pocet aktivnich spravcu, stav hesel a kontrolu rozepsanych radku.
- Spravci: souhrn se prepocitava hned pri uprave uctu, popisu, hesla nebo prepinace aktivni, takze pred ulozenim upozorni na nedokoncene, duplicitni nebo owner radky.
- Smoke guard: `app-usage-smoke-v963.js` hlida novy stav spravcu, zive prepocitani a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.229)`, technická verze `1.2.229`, cache `v1.2-1.229`.


## RaK 1.2 (1.228)

- Administrace / Přehled připojení: přidaný admin-only souhrn `Stav připojení`, který ukazuje načtení dat, aktivitu za 24 hodin, profily/zařízení a poslední připojení.
- Přehled připojení: souhrn se zobrazuje nad detailními metrikami a seznamem zařízení, aby správce hned viděl provozní stav bez rozklikávání profilů.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav připojení, jeho vložení nad metriky a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.228)`, technická verze `1.2.228`, cache `v1.2-1.228`.

## RaK 1.2 (1.227)

- Administrace / Servis synchronizace: přidaný admin-only souhrn `Stav servisu`, který ukazuje načtení online stavu, synchronizaci, položky k řešení a provoz/PWA update.
- Servis: souhrn se zobrazuje nad detailními metrikami, aby správce před ruční synchronizací nebo úklidem hned viděl, co vyžaduje pozornost.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav servisu, jeho vložení nad metriky a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.227)`, technická verze `1.2.227`, cache `v1.2-1.227`.

## RaK 1.2 (1.226)

- Administrace / Reporty chyb: přidaný admin-only souhrn `Stav reportů`, který ukazuje celkový počet, otevřené reporty, uzavřené reporty a zdroj online/lokální.
- Reporty chyb: souhrn se zobrazuje nad seznamem, takže správce hned vidí, jestli je něco k řešení, bez rozklikávání jednotlivých reportů.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav reportů, jeho vložení nad seznam a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.226)`, technická verze `1.2.226`, cache `v1.2-1.226`.

## RaK 1.2 (1.225)

- Administrace / Oznámení Dashboard: přidaný admin-only souhrn `Stav oznámení`, který ukazuje, jestli je oznámení aktivní, naplánované, skončené nebo bez textu.
- Oznámení: stav i náhled se přepočítávají podle rozepsaných polí ještě před uložením, včetně časového okna a volby běžícího textu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav oznámení, živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.225)`, technická verze `1.2.225`, cache `v1.2-1.225`.

## RaK 1.2 (1.224)

- Administrace / Výplata: přidaný admin-only souhrn `Stav výplaty`, který ukazuje pravidlo, počet ručních výjimek, nejbližší termín a kontrolu rozepsaných řádků.
- Výplata: souhrn se přepočítává ještě před uložením a používá stejný výpočet termínu jako karta na home, včetně volných dnů a ručních výjimek.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav výplaty, živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.224)`, technická verze `1.2.224`, cache `v1.2-1.224`.

## RaK 1.2 (1.223)

- Administrace / Kontakt aplikace: přidaný admin-only souhrn `Stav kontaktu`, který ukazuje vyplněnost jména, telefonu a e-mailu.
- Kontakt aplikace: souhrn se přepočítává podle rozepsaných řádků ještě před uložením a upozorní na prázdné údaje nebo podezřelý formát e-mailu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav kontaktu, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.223)`, technická verze `1.2.223`, cache `v1.2-1.223`.

## RaK 1.2 (1.222)

- Administrace / Odkazy: přidaný admin-only souhrn `Stav odkazů`, který ukazuje vyplněné URL, názvy, URL kontrolu a texty karet.
- Odkazy: souhrn se přepočítává podle rozepsaných řádků ještě před uložením a upozorní na chybějící názvy, prázdné URL nebo neplatné http/https adresy.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav odkazů, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.222)`, technická verze `1.2.222`, cache `v1.2-1.222`.

## RaK 1.2 (1.221)

- Administrace / Nastavení strojů: přidaný admin-only souhrn `Stav nastavení strojů`, který ukazuje počty frezky/pračka, brusů, FHB středů a stav kontroly hodnot.
- Nastavení strojů: souhrn se přepočítává podle rozepsaných řádků ještě před uložením a upozorní na duplicitní klíče nebo neúplné/nenumerické parametry.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav strojů, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.221)`, technická verze `1.2.221`, cache `v1.2-1.221`.

## RaK 1.2 (1.220)

- Administrace / Mimořádné volné dny: přidaný admin-only souhrn `Stav mimořádných dnů`, který ukazuje počet zadaných dnů, budoucí dny, nejbližší datum a rozpad odstávka/volno.
- Mimořádné volné dny: souhrn se přepočítává podle rozepsaných řádků ještě před uložením a upozorní na duplicitní datumy.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav mimořádných dnů, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.220)`, technická verze `1.2.220`, cache `v1.2-1.220`.

## RaK 1.2 (1.219)

- Administrace / Dovolená / odstávky: přidaný admin-only souhrn `Stav dovolené / odstávek`, který ukazuje počet období, aktivní nebo nejbližší období, délku a odpočet směn D.
- Dovolená / odstávky: souhrn se přepočítává podle rozepsaných řádků ještě před uložením a upozorní na chybné pořadí od-do.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav dovolené/odstávek, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.219)`, technická verze `1.2.219`, cache `v1.2-1.219`.

## RaK 1.2 (1.218)

- Administrace / Přesčasy: přidaný admin-only souhrn `Stav přesčasů`, který ukazuje celkový počet termínů, budoucí termíny, nejbližší přesčas a připomínku ručního uložení.
- Přesčasy: souhrn se přepočítává podle rozepsaných řádků ještě před uložením, včetně změny data, poznámky a přepínače TO.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav přesčasů, jeho živé přepočítání a responsive admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.218)`, technická verze `1.2.218`, cache `v1.2-1.218`.

## RaK 1.2 (1.217)

- Administrace / Export import: přidaný admin-only souhrn `Stav exportu / importu`, který ukazuje ZIP export, vybraný měsíc pro XLSX, načtený Excel a aktuální rozsah importu.
- Import Excelu: po výběru souboru nebo změně rozsahu importu se nový souhrn přepočítá stejně jako seznam načtených měsíců.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový export/import souhrn, živé překreslení a admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.217)`, technická verze `1.2.217`, cache `v1.2-1.217`.

## RaK 1.2 (1.216)

- Administrace / Zálohy rozpisů: přidaný admin-only souhrn `Stav záloh`, který ukazuje stav načtení, počet záloh, nejnovější zálohu a připomínku, že obnova přepíše rozpis.
- Předání správy: nový správce má před obnovou jasnou kontrolu, jestli jsou online zálohy opravdu načtené a co se bude obnovovat.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový souhrn záloh a jeho admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.216)`, technická verze `1.2.216`, cache `v1.2-1.216`.

## RaK 1.2 (1.215)

- Administrace / Rozpisy: přidaná živá kontrola `Kontrola před uložením`, která ukazuje vybraný měsíc, počet dnů, vyplněnost polí, počet absencí, stav záloh a připomínku, že online změna proběhne až ručním uložením.
- Předání správy: nový správce má přímo nad editorem rozpisu rychlý stav, jestli měsíc vypadá připravený k uložení nebo je potřeba ještě ověřit prázdná pole a zálohy.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový předuložovací panel, živé přepočítání a admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.215)`, technická verze `1.2.215`, cache `v1.2-1.215`.

## RaK 1.2 (1.214)

- Administrace / Pravidla generátoru: přidaný admin-only přehled `Podmínky generování`, který ukazuje přípravu měsíce, pravidlo ručního uložení, tvrdotový cyklus, trojici z měkoty, zákaz TNKS01/TPKW01 po sobě a vyrovnání nýtovačky.
- Předání správy: nový správce vidí podmínky přímo v aplikaci před spuštěním návrhu rozpisu, bez nutnosti hledat pravidla v historii změn.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový přehled pravidel generátoru a jeho admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.214)`, technická verze `1.2.214`, cache `v1.2-1.214`.

## RaK 1.2 (1.213)

- Administrace / Správci: přidaný přehled rolí, který přímo v admin-only sekci ukazuje hlavní admin účet `9811`, počet aktivních dalších správců a pravidlo přihlášení účet + heslo.
- Bezpečnost: běžný admin při přímém otevření panelu Správci vidí jasné vysvětlení, že další správce a jejich hesla může měnit jen hlavní admin.
- Smoke guard: `app-usage-smoke-v963.js` hlídá přehled rolí správců, readonly hlášku a admin-only styl.
- Release metadata sjednocená na `RaK 1.2 (1.213)`, technická verze `1.2.213`, cache `v1.2-1.213`.

## RaK 1.2 (1.212)

- Administrace: přidaný admin-only panel `Oprávnění správce`, který ukáže aktivní účet, roli a jestli je administrace opravdu odemčená.
- Předání správy: textový export stavu nově obsahuje aktivní admin účet, roli administrace a stav odemčení.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový stav oprávnění, jeho vložení do admin-only obrazovek a samostatný styl.
- Release metadata sjednocená na `RaK 1.2 (1.212)`, technická verze `1.2.212`, cache `v1.2-1.212`.

## RaK 1.2 (1.211)

- Administrace: přidaná centrální pojistka pro všechny admin klikací akce (`data-admin-action`, admin výběry měsíce/roku a starší `admin-*` menu akce).
- Bezpečnost: veřejné menu po opuštění administrace maže starý admin view mód, takže běžná obrazovka nemůže omylem zdědit admin kontext.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový guard admin akcí, nulování veřejného módu a to, že prázdný mód není brán jako admin home.
- Release metadata sjednocená na `RaK 1.2 (1.211)`, technická verze `1.2.211`, cache `v1.2-1.211`.

## RaK 1.2 (1.210)

- Administrace / Měsíční postup: přidané tlačítko `Stáhnout postup`, které vytvoří jednoduchý textový soubor s pořadím měsíční práce a aktuálním stavem kroků.
- Předání správy: tlačítko `Stáhnout postup` je dostupné i přímo v panelu předání, vedle stažení stavu.
- Smoke guard: `app-usage-smoke-v963.js` hlídá textový export měsíčního postupu, handler, tlačítko a název souboru `RaK_mesicni_postup_`.
- Release metadata sjednocená na `RaK 1.2 (1.210)`, technická verze `1.2.210`, cache `v1.2-1.210`.

## RaK 1.2 (1.209)

- Administrace: přidaný chráněný panel `Měsíční postup`, který novému správci ukáže pořadí práce pro běžný měsíc: načíst online data, zkontrolovat provoz, doplnit volno a absence, připravit rozpis, uložit až po ruční kontrole a ověřit zálohy/export.
- Předání správy: měsíční postup je vložený i do panelu `Předání správy`, aby byl vidět spolu s kontrolou předání.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový admin-only panel, chráněný view, handler, položku v menu a vlastní styly.
- Release metadata sjednocená na `RaK 1.2 (1.209)`, technická verze `1.2.209`, cache `v1.2-1.209`.

## RaK 1.2 (1.208)

- Administrace: odstraněná poslední stará stopa skrytého admin vstupu z karty Kontakt; kontakt už není označený jako tajný admin trigger.
- Admin přihlášení: interní inicializace je pojmenovaná podle přihlášeného účtu, ne podle starého secret odemykání.
- Smoke guard: `app-usage-smoke-v963.js` hlídá, že se nevrátí `data-admin-secret`, `bindAdminSecretUnlock` ani starý `adminSecretBound`.
- Release metadata sjednocená na `RaK 1.2 (1.208)`, technická verze `1.2.208`, cache `v1.2-1.208`.

## RaK 1.2 (1.207)

- Administrace: přidaná chráněná mapa `Kde co upravit`, která novému správci ukáže, ve které admin sekci měnit rozpis, dovolené, volné dny, přesčasy, kantýnu, odkazy, výplatu, správce a servis.
- Mapa nastavení: položky pouze otevírají existující admin sekce a vysvětlují, kde se změna projeví; nic samy neukládají.
- Smoke guard: `app-usage-smoke-v963.js` hlídá novou admin-only mapu nastavení, chráněný pohled, handler a styly.
- Release metadata sjednocená na `RaK 1.2 (1.207)`, technická verze `1.2.207`, cache `v1.2-1.207`.

## RaK 1.2 (1.206)

- Administrace / Předání správy: přidané tlačítko `Stáhnout stav`, které vytvoří textový souhrn aktuálního nastavení, správců, provozu, volna, rozpisu a záloh.
- Export stavu: soubor se skládá lokálně v prohlížeči, nic neukládá do Supabase a slouží jen jako předávací kontrola pro admina.
- Smoke guard: `app-usage-smoke-v963.js` hlídá textový export stavu předání, tlačítko a admin handler.
- Release metadata sjednocená na `RaK 1.2 (1.206)`, technická verze `1.2.206`, cache `v1.2-1.206`.

## RaK 1.2 (1.205)

- Administrace / Příručka správce: přidané tlačítko `Stáhnout příručku`, které vytvoří jednoduchý textový soubor pro předání dalšímu správci.
- Export příručky: soubor se skládá lokálně v prohlížeči, nic nezapisuje do Supabase a běžná část aplikace se nemění.
- Smoke guard: `app-usage-smoke-v963.js` hlídá textový export příručky, tlačítko a admin handler.
- Release metadata sjednocená na `RaK 1.2 (1.205)`, technická verze `1.2.205`, cache `v1.2-1.205`.

## RaK 1.2 (1.204)

- Administrace: přidaná chráněná Příručka správce s krátkými postupy pro nový měsíc, dovolené/volno, přesčasy, odkazy, zálohy a předání dalšímu správci.
- Příručka: všechny položky pouze otevírají existující admin sekce; nic se neukládá bez tlačítka Uložit v konkrétní sekci.
- Smoke guard: `app-usage-smoke-v963.js` hlídá novou admin-only příručku, její chráněný pohled a styly.
- Release metadata sjednocená na `RaK 1.2 (1.204)`, technická verze `1.2.204`, cache `v1.2-1.204`.

## RaK 1.2 (1.203)

- Administrace / Předání správy: přidaná rychlá Kontrola předání se stavem online nastavení, správců, provozu, dovolené/volna, rozpisu a záloh.
- Předání: kontrola jen čte existující admin data a vede do správných admin sekcí; nic sama neukládá a běžná část aplikace se nemění.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nové stavové položky předání a jejich admin-only styly.
- Release metadata sjednocená na `RaK 1.2 (1.203)`, technická verze `1.2.203`, cache `v1.2-1.203`.

## RaK 1.2 (1.202)

- Administrace: přidaný panel Předání správy s krátkým postupem pro provoz, rozpis, veřejnou část a závěrečnou kontrolu.
- Předání: panel používá jen existující admin akce a odkazy, takže běžná aplikace se odsud nemění bez uložení v konkrétní sekci.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový admin-only panel Předání správy a jeho styly.
- Release metadata sjednocená na `RaK 1.2 (1.202)`, technická verze `1.2.202`, cache `v1.2-1.202`.

## RaK 1.2 (1.201)

- Administrace: úvodní rozcestník je nově rozdělený do zabalitelných sekcí Provoz před rozpisem, Rozpisy a předání, Aplikace pro lidi a Kontrola a servis.
- Správa aplikace: jednotlivé admin akce se skládají přes společný helper, aby šlo menu dál rozšiřovat bez ručního přepisování dlouhého seznamu tlačítek.
- Smoke guard: `app-usage-smoke-v963.js` hlídá nový admin-only rozcestník, jeho akce a styly.
- Release metadata sjednocená na `RaK 1.2 (1.201)`, technická verze `1.2.201`, cache `v1.2-1.201`.

## RaK 1.2 (1.200)

- Administrace: přidaná sekce Mimořádné volné dny pro jednorázové svátky, odstávky a další dny bez práce.
- Směny / Výplata / Dashboard: `getSpecialWorkInfo` bere v potaz uložené admin volné dny navíc k vestavěným českým svátkům a dovoleným.
- Supabase: mimořádné volné dny se ukládají jako speciální admin nastavení přes `machine_settings` a zachovávají se při ukládání strojů.
- Release metadata sjednocená na `RaK 1.2 (1.200)`, technická verze `1.2.200`, cache `v1.2-1.200`.

## RaK 1.2 (1.199)

- Administrace / Odkazy: do správy odkazů přidaný Kalendář, včetně Google embed odkazu pro modal v aplikaci.
- Kalendář: iframe už neobsahuje pevně zapsané URL v HTML; při otevření bere uložený admin odkaz a bezpečně ho omezuje na povolené hosty.
- Supabase: kalendářový odkaz se ukládá v existujícím `external_links_settings`, bez změny databázového schématu.
- Release metadata sjednocená na `RaK 1.2 (1.199)`, technická verze `1.2.199`, cache `v1.2-1.199`.

## RaK 1.2 (1.198)

- Administrace: přidaná sekce Výplata pro nastavení výchozího pořadí pracovního dne v měsíci a ručních měsíčních výjimek.
- Home / Výplata: datum další výplaty se počítá z uloženého admin pravidla; bez uložené změny zůstává původní 4. pracovní den.
- Supabase: nastavení výplaty se ukládá jako speciální admin nastavení přes `machine_settings` a zachovává se při ukládání strojů.
- Release metadata sjednocená na `RaK 1.2 (1.198)`, technická verze `1.2.198`, cache `v1.2-1.198`.

## RaK 1.2 (1.197)

- Administrace: přidaná sekce Kontakt aplikace pro správu jména, telefonu a e-mailu zobrazovaných v menu Kontakt.
- Kontakt: veřejná karta Kontakt čte uložené admin nastavení; bez uložené změny zůstávají původní údaje.
- Supabase: kontakt aplikace se ukládá jako speciální admin nastavení přes `machine_settings` a zachovává se při ukládání strojů.
- Release metadata sjednocená na `RaK 1.2 (1.197)`, technická verze `1.2.197`, cache `v1.2-1.197`.

## RaK 1.2 (1.196)

- Administrace: přidaná sekce Odkazy pro správu jídelního lístku, Eportalu a výplatního portálu bez zásahu do souborů aplikace.
- Home: karty Jídelní lístek, Eportal a Výplata používají uložené admin nastavení; bez uložené změny zůstávají původní odkazy a texty.
- Supabase: externí odkazy se ukládají jako speciální admin nastavení přes `machine_settings` a zachovávají se při ukládání strojů.
- Release metadata sjednocená na `RaK 1.2 (1.196)`, technická verze `1.2.196`, cache `v1.2-1.196`.

## RaK 1.2 (1.195)

- Administrace / Rozpisy: přidaná sekce Pravidla generátoru pro úpravu základních lidí, tvrdotového cyklu, TNKS/TPKW cyklu měkké trojice a jejich základních soustruhů.
- Generátor rozpisu: při vytváření nového návrhu používá uložená admin pravidla; bez uložené změny zůstávají původní výchozí hodnoty.
- Supabase: speciální admin nastavení pro přesčasy a pravidla generátoru se ukládají přes kompatibilní `machine_settings`, aby nenarážela na omezené kategorie.
- Release metadata sjednocená na `RaK 1.2 (1.195)`, technická verze `1.2.195`, cache `v1.2-1.195`.

## RaK 1.2 (1.194)

- Administrace: úvodní stránka má nový průvodce správou, který ukazuje stav provozního nastavení, přesčasů, dovolených/odstávek, vybraného rozpisu, záloh a exportu.
- Administrace: položky průvodce vedou přímo do odpovídajících sekcí, aby nový správce nemusel hledat správný postup ručně.
- Release metadata sjednocená na `RaK 1.2 (1.194)`, technická verze `1.2.194`, cache `v1.2-1.194`.

## RaK 1.2 (1.193)

- Administrace / Správci: hlavní admin účet může přidat další admin účty, nastavit jim heslo a zapnout/vypnout jejich přístup.
- Přihlášení: před ověřením admin účtu se načte online seznam správců, aby nově přidaní admini fungovali i na jiném zařízení.
- Supabase: seznam správců se ukládá jako samostatné admin nastavení v `machine_settings` a neukazuje se v běžné tabulce strojů.
- Release metadata sjednocená na `RaK 1.2 (1.193)`, technická verze `1.2.193`, cache `v1.2-1.193`.

## RaK 1.2 (1.192)

- Administrace: vstup je nově navázaný na admin účet `9811`; při přihlášení tohoto účtu se vyžádá heslo a běžné účty zůstávají bez hesla.
- Administrace: staré skryté odemčení přes klikání na spodní menu je odstraněné; admin obrazovky se neotevřou bez odemčeného admin účtu.
- Administrace: hlavní menu je přeskupené na provoz před rozpisem, rozpisy, komunikaci/kontrolu a servis.
- Release metadata sjednocená na `RaK 1.2 (1.192)`, technická verze `1.2.192`, cache `v1.2-1.192`.

## RaK 1.2 (1.191)

- Kantýna / jídelna: veřejný přehled přesčasových nedělí nově ukazuje jen dnešní a budoucí termíny; starší termíny zůstávají uložené, ale v seznamu se nezobrazují.
- Administrace: Přesčasy jsou samostatná položka hlavního admin menu, ne tlačítko uvnitř Rozpisů.
- Administrace / Přesčasy: roční skupiny se tvoří podle skutečně zadaných termínů; základně je vidět aktuální rok a další rok se objeví, jakmile v něm vznikne přesčas.
- Release metadata sjednocená na `RaK 1.2 (1.191)`, technická verze `1.2.191`, cache `v1.2-1.191`.

## RaK 1.2 (1.190)

- Administrace / Kantýna / jídelna: seznam přesčasových nedělí v tabulce ukazuje jen dnešní a budoucí termíny; starší uložené termíny zůstávají zachované při uložení.
- Administrace / Přesčasy: roky jsou dál po skupinách a minulé roky se při otevření panelu zobrazují sbalené; aktuální a budoucí roky zůstávají otevřené.
- Release metadata sjednocená na `RaK 1.2 (1.190)`, technická verze `1.2.190`, cache `v1.2-1.190`.

## RaK 1.2 (1.189)

- Směny / svátky: Velký pátek a Velikonoční pondělí se nově dopočítávají podle Velikonoc pro daný rok, takže odpočet směn i blokování startu směny funguje i po roce 2026.
- Pevné svátky zůstávají podle dne a měsíce; pohyblivé velikonoční svátky už nejsou napevno navázané na datum `3.4.` a `6.4.`.
- Release metadata sjednocená na `RaK 1.2 (1.189)`, technická verze `1.2.189`, cache `v1.2-1.189`.

## RaK 1.2 (1.188)

- Home / Dovolená: počet zbývajících směn D do CZD/Vánoc bere u vytvořených měsíců skutečné řádky rozpisu, takže ručně zrušená směna nebo odstávka v rozpisu sníží počet.
- Pro měsíce bez vytvořeného rozpisu zůstává záloha podle pevného rotačního cyklu směn a svátků.
- Release metadata sjednocená na `RaK 1.2 (1.188)`, technická verze `1.2.188`, cache `v1.2-1.188`.

## RaK 1.2 (1.187)

- Rotace / Rozpisy a Administrace / Rozpisy: absence používají zkratky důvodů, užší sloupec důvodu a stabilní sloupce podle nejdelší souvislé absence.
- Administrace / Rozpisy: u absence stačí zadat datum; směna se při uložení dopočítá z rozpisu a absence se řadí podle data.
- Release metadata sjednocená na `RaK 1.2 (1.187)`, technická verze `1.2.187`, cache `v1.2-1.187`.

## RaK 1.2 (1.186)

- Home / Dovolená: popisek `směna D` nově používá stejný metatextový styl jako `k CZD`, takže sedí velikost, barva, řádkování i mezera pod hodnotou.
- Release metadata sjednocená na `RaK 1.2 (1.186)`, technická verze `1.2.186`, cache `v1.2-1.186`.

## RaK 1.2 (1.185)

- Home / Dovolená: počet směn D má stejnou velikost, váhu a barvu jako počet dní do CZD a obě poloviny mají větší mezeru mezi hodnotou a popiskem.
- Release metadata sjednocená na `RaK 1.2 (1.185)`, technická verze `1.2.185`, cache `v1.2-1.185`.

## RaK 1.2 (1.184)

- Home / Dovolená: počet směn D má stejnou zelenou barvu jako počet dní do CZD a spodní hodnoty jsou posazené výš, aby seděly s ostatními panely.
- Release metadata sjednocená na `RaK 1.2 (1.184)`, technická verze `1.2.184`, cache `v1.2-1.184`.

## RaK 1.2 (1.183)

- Home / Dovolená: karta odpočtu má znovu stejné rozložení jako ostatní panely; nadpis je vedle ikonky nahoře a spodní část je rozdělená na dny vlevo a směny D vpravo.
- Release metadata sjednocená na `RaK 1.2 (1.183)`, technická verze `1.2.183`, cache `v1.2-1.183`.

## RaK 1.2 (1.182)

- Home / Dovolená: opravený výpočet směn D do CZD/Vánoc; po započtení směny se kontrola posouvá až za její konec, takže se nezastaví na první aktivní směně.
- Release metadata sjednocená na `RaK 1.2 (1.182)`, technická verze `1.2.182`, cache `v1.2-1.182`.

## RaK 1.2 (1.181)

- Home / Dovolená: odpočet je rozdělený svislým předělem přibližně na půlku panelu; vlevo zůstává odpočet do CZD/Vánoc a vpravo je počet směn pro směnu D.
- Release metadata sjednocená na `RaK 1.2 (1.181)`, technická verze `1.2.181`, cache `v1.2-1.181`.

## RaK 1.2 (1.180)

- Home / Dovolená: karta odpočtu do CZD/Vánoc/odstávky nově pod hlavním odpočtem ukazuje i počet zbývajících směn pro směnu D, např. `3 směny, směna D`.
- Home / Dovolená: druhý řádek je oddělený jemnou linkou, aby bylo jasné, že jde o samostatný údaj.
- Release metadata sjednocená na `RaK 1.2 (1.180)`, technická verze `1.2.180`, cache `v1.2-1.180`.

## RaK 1.2 (1.179)

- Administrace / Dovolená odstávky: speciální řádky se už neukládají přímým zápisem do `machine_settings`, ale přes kompatibilní RPC payload, aby nepadaly na `permission denied for table machine_settings`.
- O aplikaci: historie verzí má nahoře doplněné krátké souhrny po zhruba 50 verzích včetně aktuálních změn rozpisů, výjimek, záloh a CZD/dovolených.
- Release metadata sjednocená na `RaK 1.2 (1.179)`, technická verze `1.2.179`, cache `v1.2-1.179`.

## RaK 1.2 (1.178)

- Administrace / Dovolená odstávky: uložení už neposílá speciální řádek `VACATION_COUNTDOWN_SETTINGS` do starší RPC funkce pro stroje, takže nepadá na `invalid category`.
- Release metadata sjednocená na `RaK 1.2 (1.178)`, technická verze `1.2.178`, cache `v1.2-1.178`.

## RaK 1.2 (1.177)

- Administrace: přibyl samostatný panel `Dovolená / odstávky` s pojmenovanými obdobími od-do včetně hodin.
- Home / Dovolená: odpočet bere nejbližší nadcházející uložené období; během aktivního období se směna bere jako pracovní volno.
- Online uložení: samostatné admin nastavení dovolené/odstávek se ukládá do `machine_settings` i při starší serverové funkci s omezenými kategoriemi.
- Release metadata sjednocená na `RaK 1.2 (1.177)`, technická verze `1.2.177`, cache `v1.2-1.177`.

## RaK 1.2 (1.176)

- Generátor rozpisu: výběr měsíce teď nabízí aktuální měsíc pro případné přegenerování a zároveň rozsah až po další navazující měsíc za hotovými rozpisy.
- Příklad: v červenci 2026 se nabízí `7/26` a `8/26`; pokud jsou `7/26` i `8/26` hotové, přibude i `9/26`.
- Release metadata sjednocená na `RaK 1.2 (1.176)`, technická verze `1.2.176`, cache `v1.2-1.176`.

## RaK 1.2 (1.175)

- Home / aktuální směna: když na právě běžící směně nikdo nechybí, horní přehled píše `Nikdo nechybí.` místo `chybí: nikdo`.
- Administrace / Export import: XLSX export rozpisu má znovu výběr ze všech měsíců; omezení na navazující měsíc zůstává jen v generátoru rozpisu.
- Release metadata sjednocená na `RaK 1.2 (1.175)`, technická verze `1.2.175`, cache `v1.2-1.175`.

## RaK 1.2 (1.174)

- Rozpisy / Absence: u více dovolených ve stejný den se další osoby zobrazují už jen jako `Jméno` a `Důvod`, bez prázdných opakovaných sloupců `Datum` a `Směna`.
- Generátor rozpisu: výběr měsíce je rozdělený na `Rok` a `Měsíc` a nabízí jen další měsíc po posledním hotovém rozpisu, aby se nepřeskakovalo v návaznosti.
- Release metadata sjednocená na `RaK 1.2 (1.174)`, technická verze `1.2.174`, cache `v1.2-1.174`.

## RaK 1.2 (1.173)

- Generátor rozpisu u hotového měsíce drží nový návrh bokem jako čekající draft a nepřepisuje skutečný rozpis hned při výpočtu.
- `Otevřít rozpis` vloží čekající návrh do editoru jako neuložený pracovní stav; online se zapíše až přes `Uložit rozpis`.
- Náhled výsledku a Excel export generátoru používají čekající návrh, ne původní hotovou rotaci.
- Release metadata sjednocená na `RaK 1.2 (1.173)`, technická verze `1.2.173`, cache `v1.2-1.173`.

## RaK 1.2 (1.172)

- Generátor rozpisu hlídá dvě směny po sobě na nýtovačce přes `TNKS01` i rotující `TPKW01`, protože při půlení jde TPKW01 zároveň na TNKS01.
- Krátká / nerotující neděle zůstává výjimka: když se TNKS01/TPKW01 nepůlí, TPKW01 se pro tohle pravidlo nepočítá jako TNKS01.
- Dorovnávací prohozy TNKS01 používají stejné pravidlo, takže vyrovnání po vygenerování nemá vytvořit zakázanou návaznost.
- Release metadata sjednocená na `RaK 1.2 (1.172)`, technická verze `1.2.172`, cache `v1.2-1.172`.

## RaK 1.2 (1.171)

- Detail žluté výjimky ve veřejném rozpisu jde zavřít křížkem, tlačítkem i kliknutím mimo okno.
- Křížek v okně výjimky je zarovnaný uprostřed svého tlačítka v horní části okna.
- Release metadata sjednocená na `RaK 1.2 (1.171)`, technická verze `1.2.171`, cache `v1.2-1.171`.

## RaK 1.2 (1.170)

- Supabase admin ukládání nastavení nově povoluje kategorii přesčasů rozpisu `rotation_overtime_settings`, takže přidání přesčasu už nekončí chybou `invalid category`.
- Administrace má novou sekci Zálohy rozpisů: umí načíst poslední online zálohy a obnovit vybranou zálohu přes admin PIN; aktuální stav se před obnovou uloží jako další záloha.
- Veřejný rozpis po kliknutí na žlutě označenou výjimku otevře detail výjimky a PNG export rozpisu zvýrazňuje stejné výjimky.
- Datumy přesčasových nedělí v Kantýna / jídelna přijmou i číselný zápis typu `24122026` a převedou ho na `24.12.2026`.
- Release metadata sjednocená na `RaK 1.2 (1.170)`, technická verze `1.2.170`, cache `v1.2-1.170`.

## RaK 1.2 (1.169)

- Admin ukládání rozpisů po uzamčení Supabase používá novou admin RPC cestu a PWA cache se přebíjí na `v1.2-1.169`.
- Denní výjimky v rozpisu po odebrání čekají na online uložení a zobrazí jasný stav uložení.
- Release metadata sjednocená na `RaK 1.2 (1.169)`, technická verze `1.2.169`, cache `v1.2-1.169`.

## RaK 1.2 (1.168)

- Nedělní noční bez přesčasu (příchod na 22 h): počítá se až druhá pauza (02:00), úvodní pauza ve 22:00 se nezapočítává → 7,5 h.
- O aplikaci: doplněn stručný blok historie pro verze 1.150–1.167 (denní výjimky a hodinová statistika).
- Release metadata sjednocená na `RaK 1.2 (1.168)`, technická verze `1.2.168`, cache `v1.2-1.168`.

## RaK 1.2 (1.167)

- Výjimky dne – přesné přestávky: počítají se pevné pauzy 10:00–10:30, 14:00–14:30, 02:00–02:30, 22:00–22:30 (každá 30 min). Do odpracovaných hodin se započítají jen pauzy, které spadají do odpracovaného úseku.
- Platí pro odchod dřív, pozdní příchod i přesun na jiný stroj. Pauza spadající do nepřítomnosti se nepočítá do dovolené ani do druhého stroje.
- Release metadata sjednocená na `RaK 1.2 (1.167)`, technická verze `1.2.167`, cache `v1.2-1.167`.

## RaK 1.2 (1.166)

- Přesun na jiný stroj se dělí poměrně podle času, takže přesun přesně v polovině směny vyjde 50/50 (např. 5,5 h + 5,5 h místo 5 + 6). Pauza se rozloží mezi oba stroje.
- Release metadata sjednocená na `RaK 1.2 (1.166)`, technická verze `1.2.166`, cache `v1.2-1.166`.

## RaK 1.2 (1.165)

- Statistika strojů: výsledky se zobrazují v celých číslech (vnitřně se drží desetiny). Výjimka jsou párové stroje TNKS01/TPKW01 (TNK/W01), kde zůstávají půlky.
- Oprava skloňování: 1 den, 2–4 dny, 5+ dní.
- Release metadata sjednocená na `RaK 1.2 (1.165)`, technická verze `1.2.165`, cache `v1.2-1.165`.

## RaK 1.2 (1.164)

- Statistika – zapojení denních výjimek: přesun na jiný stroj se rozpočítá po hodinách mezi původní a nový stroj; částečný odchod/příchod s důvodem ubere odpracovaný díl a přičte ho do absence.
- Dovolená se v detailu člověka ukazuje jako „X dní Y h" (plné dny dnem, částečné v hodinách; neděle 7,5 h, jinak 11 h).
- Kalírna ven (jméno na soustruhu) se počítá jako soustruh, kalírna k nám (prázdná buňka) se nepočítá, příchod od 22 h zůstává celá 1 na stroji – vychází to z obsazení buňky.
- Release metadata sjednocená na `RaK 1.2 (1.164)`, technická verze `1.2.164`, cache `v1.2-1.164`.

## RaK 1.2 (1.163)

- Přesčasová neděle: každý zapsaný na stroji je automaticky brán jako „na přesčasu". Přes výjimky se jen odškrtnou ti, co jdou až od 22 h (uloží se lehký záznam, jinak žádný).
- Nové tlačítko „Přehled přesčasů" v administraci rozpisu: po nedělích vypíše, kdo je na přesčasu a kdo jde od 22 h.
- Release metadata sjednocená na `RaK 1.2 (1.163)`, technická verze `1.2.163`, cache `v1.2-1.163`.

## RaK 1.2 (1.162)

- Výjimky dne – přesun na stroj: ve výběru jsou teď všechny stroje z Tvrdoty i Měkoty (s označením sekce).
- Čas se zaokrouhluje na dokončené čtvrthodiny (odchod/přesun dolů: 16:01→16:00, 15:29→15:15; pozdní příchod nahoru). Dovolená = okno od zaokrouhleného času do konce směny, odpracováno = hodnota směny − dovolená (pauza padá na odpracovanou část).
- Přesčasová neděle: zaškrtnuté „na přesčasu" = dlouhá směna 11 h; odškrtnuté = příchod na 22 h (7,5 h), počítá se od 22 h jen při odchodu.
- Release metadata sjednocená na `RaK 1.2 (1.162)`, technická verze `1.2.162`, cache `v1.2-1.162`.

## RaK 1.2 (1.161)

- Výjimky dne – neděle a přesčas: nedělní směna se počítá jako 7,5 h (i dovolená v neděli = 7,5 h).
- V okně se v neděli ukáže zaškrtávátko „Je na přesčasu"; zaškrtnuté se směna počítá jako dlouhá (11 h). Předvyplní se podle toho, jestli appka danou nedělní směnu zná jako přesčasovou.
- Release metadata sjednocená na `RaK 1.2 (1.161)`, technická verze `1.2.161`, cache `v1.2-1.161`.

## RaK 1.2 (1.160)

- Výjimky dne – výpočet hodin: směna se počítá jako čistý čas bez pauzy (12h směna = 11 h, 8h/nedělní = 7,5 h). Dovolená/zbytek = hodnota směny − odpracováno, takže pauza se do dovolené nezapočítává.
- Náhled v okně ukazuje hodnotu směny, odpracováno a zbytek (u přesunu hodiny na původním a novém stroji, součet = směna).
- Release metadata sjednocená na `RaK 1.2 (1.160)`, technická verze `1.2.160`, cache `v1.2-1.160`.

## RaK 1.2 (1.159)

- Výjimky dne: zadává se jen čas (odchodu / příchodu / přesunu) a appka sama dopočítá odpracované hodiny i čas na strojích podle směny. Ruční pole hodin a dovolené zrušena.
- Nový typ „Přišel později do práce" se zadáním času příchodu.
- V okně se rovnou ukáže náhled dopočítaných hodin.
- Když je důvodem dovolená / náhradní volno / § / lékař, automaticky se to žlutě propíše do tabulky Absence (od/do daného času).
- Kalírna: odchod na kalírnu se značí na soustruhu (počítá se jako soustruh), kalírna k nám se značí na prázdné buňce (nepočítá se).
- Release metadata sjednocená na `RaK 1.2 (1.159)`, technická verze `1.2.159`, cache `v1.2-1.159`.

## RaK 1.2 (1.158)

- Rozpisy / výjimky dne: zadávání zpřehledněno. Místo malé tužky v buňce je u názvu tabulky (Tvrdota / Měkota) větší tlačítko „Výjimky dne".
- Po zapnutí režimu výjimek stačí klepnout na celou buňku (velký cíl) a otevře se okno; mimo režim se buňky upravují jako dřív.
- Release metadata sjednocená na `RaK 1.2 (1.158)`, technická verze `1.2.158`, cache `v1.2-1.158`.

## RaK 1.2 (1.157)

- Rozpisy / administrace: nové okno na klik do buňky pro zadání výjimky dne (odchod dřív z práce, půl směny / přesun na jiný stroj, odchod na kalírnu, kalírna k nám) – čas, důvod zbytku směny, hodiny, cílový stroj.
- Buňka s výjimkou se v editoru i ve veřejném rozpisu zvýrazní žlutě jako upozornění, že pracovník nebude celou směnu. Jméno zůstává na stroji.
- Data výjimek (`dayMods`) se ukládají u měsíce, normalizace i synchronizace je zachovají. Statistický přepočet (dovolená v hodinách, kalírna, přesun po hodinách) navazuje v dalším kroku.
- Release metadata sjednocená na `RaK 1.2 (1.157)`, technická verze `1.2.157`, cache `v1.2-1.157`.

## RaK 1.2 (1.156)

- Bezpečnost: sjednocená funkce `escapeHtml` na jedinou bezpečnou verzi z `core.js` (escapuje i apostrof `'` a používá `?? ""`).
- Odstraněná slabší duplicitní `escapeHtml` z `rotace.js`, která dříve kvůli pořadí načítání globálně přepisovala bezpečnější verzi.
- Bez funkčních změn v UI ani datech; bump release metadat kvůli zneplatnění cache, aby se oprava dostala na zařízení.
- Release metadata sjednocená na `RaK 1.2 (1.156)`, technická verze `1.2.156`, cache `v1.2-1.156`.

## RaK 1.2 (1.155)

- Hry / Pexeso: opravené zobrazení a merge starých falešných časů typu 5 s.
- Pexeso teď bere za platný výherní čas jen reálný celkový čas hry: 4×4/společné Pexeso minimálně 12 s, 6×6 minimálně 30 s, 8×8 minimálně 60 s.
- Staré lokální/cache záznamy s 5 s se v tabulkách a profilu schovají a po online syncu je může nahradit skutečný čas ze Supabase.
- Při nové výhře Pexesa se posílá i `wins: 1`, aby dokončení bylo vidět i v profilu jako výhra/dokončení.
- Supabase bridge nově odmítne explicitní nereálný Pexeso čas při zápisu, takže se 5s fallback nemá znovu propsat online.
- Supabase DB/policies beze změny; kontrola dat ukázala jen jeden Pexeso záznam `memory_6x6` se score 4918, tj. cca 82 s.
- Release metadata sjednocená na `RaK 1.2 (1.155)`, technická verze `1.2.155`, cache `v1.2-1.155`.

## RaK 1.2 (1.149)

- Hry / Pexeso: opravené ukládání výherního času jako celkový čas hry od startu kola do dokončení.
- Přidaný guard proti nesmyslným časům typu pár vteřin a bezpečné ukládání časového skóre do existující Supabase `game_stats`.
- V Supabase byly smazané zjevně chybné Pexeso rekordy se score `10000` a `5000`, které v UI dělaly falešné párvteřinové časy.
- Supabase DB struktura a policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.149)`, technická verze `1.2.149`, cache `v1.2-1.149`.

## RaK 1.2 (1.148)

- Hry / Lodě online: opravené zbytečné překreslování celé 10×10 tabule při každém online pollu beze změny stavu.
- Poll Lodí je adaptivní: rychlejší během aktivní hry, pomalejší při čekání/přípravě, s blokací překrytých refreshů.
- Tah se po kliknutí vykreslí okamžitě a online save doběhne bez blokování klik handleru.
- Přidané lehčí CSS pro Lodě: contain paint/layout, vypnuté pseudo overlay vrstvy tabule a tvrdší odlehčení animací ve výkonových režimech.
- Release metadata sjednocená na `RaK 1.2 (1.148)`, technická verze `1.2.148`, cache `v1.2-1.148`.

## RaK 1.2 (1.147)

- Administrace / Rozpisy: přidaná ruční výjimka dne pro TNKS01/TPKW01 – rotuje / nerotuje / automaticky podle pravidel.
- Výchozí chování zůstává stejné: mimo běžnou neděli se TNKS01/TPKW01 půlí 0,5 + 0,5, běžná neděle se nepůlí, přesčasová TO neděle se půlí a MO výjimka se nepůlí.
- Ruční volba `Nerotuje / každý +1` má přednost ve statistikách, kontrolní tabulce stroje × jména, generátorových souhrnech i navazujících exportech používajících statistiky.
- Ukládá se do měsíce jako `pressRotationOverrides`, bez změny Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.147)`, technická verze `1.2.147`, cache `v1.2-1.147`.

## RaK 1.2 (1.146)

- Hry / Sudoku: každé spuštění nové hry teď vytvoří čerstvě namíchanou mřížku místo stále stejného pole pro danou obtížnost.
- Sudoku používá bezpečnou náhodnou transformaci šablony: promíchá řádky v blocích, bloky řádků, sloupce ve sloupcových blocích, bloky sloupců i číslice, takže řešení zůstává platné a pole se pokaždé liší.
- Lehká obtížnost Sudoku je zlehčená výrazně větším počtem základních čísel: cílově 50–54 předvyplněných polí podle náhodného rozptylu.
- Přidaný runtime/test guard `sudoku-random-puzzle-v1146`, který hlídá náhodné generování a lehčí easy obtížnost.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.146)`, technická verze `1.2.146`, cache `v1.2-1.146`.

## RaK 1.2 (1.144)

- Hry / Sudoku: opravené ukládání dokončeného Sudoku do profilu a online Top score. Po vyřešení se zapisuje společné `sudoku` i varianta obtížnosti `sudoku_easy/medium/hard`.
- Dohrané Sudoku se počítá jako dokončení/výhra (`wins: 1`) a ukládá se s časem `bestTimeMs/timeMs/elapsedMs`, aby se správně propsalo do profilu hráče i tabule.
- Supabase klient: zvýšen klientský limit `p_points_delta` pro RPC `rak_record_game_stat_delta`, protože časové low-score hry ukládají rekord jako velké zakódované body `POINT_SCALE - čas_ms`; starý limit 5000 mohl Sudoku oříznout tak, že se výsledek nezobrazil.
- Profily hráčů nově dekódují online low-score body zpět na čas, takže Sudoku/Pexeso/Reaction nezobrazují nesmyslné body nebo počet her místo času.
- Formát časů v tabulkách výher sjednocený: časové hry jsou v sekundách, nad minutu jako `min + s`, Reaction Test jediný zůstává v `ms`.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.144)`, technická verze `1.2.144`, cache `v1.2-1.144`.

## RaK 1.2 (1.141)

- Opravené sjednocení herního profilu/ranku mezi mobilem a PC: aktivní účet se nově při syncu doplňuje přímo přes `account_number`, ne jen z leaderboard/top-score limitů.
- Přidaný přímý Supabase read helper `loadGameStatsForAccount(accountNumber)`, který čte všechny statistiky aktivního účtu po reset cutoffu bez změny DB/policies.
- Uložené theme/pozadí profilu se už na novém zařízení nepřepisuje na default jen proto, že rank ještě nebyl stažený; dočasně se vizuálně použije default a po načtení statistik se uložený skin znovu aplikuje, pokud je odemčený.
- Release metadata sjednocená na `RaK 1.2 (1.141)`, technická verze `1.2.141`, cache `v1.2-1.141`.

## RaK 1.2 (1.140)
- Administrace / Export / import / XLSX rozpis pro kopírování: opravený výběr měsíce, aby se nemíchaly stejné měsíce z různých roků.
- Seznam měsíců pro Excel export je teď řazený chronologicky a skupinovaný podle roku přes `optgroup Rok`, takže 2025 a 2026 nejsou v jednom promíchaném seznamu.
- Stejné chronologické řazení používá i sdílený seznam měsíců v administraci, aby návazné výběry nepadaly na abecední/lexikální pořadí.
- Supabase DB/policies, import Excelu, ZIP export a logika rozpisů beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.140)`, technická verze `1.2.140`, cache `v1.2-1.140`.

## RaK 1.2 (1.139)
- Administrace / Export / import: přidaný stejný XLSX export rozpisu jako v generátoru, včetně výběru měsíce a tlačítka `Stáhnout Excel rozpisu`.
- Export používá sdílenou funkci `adminRotationGeneratorDownloadExcel`, takže layout zůstává Tvrdota A:F, Měkota pod ní A:F a Absence od H dál.
- Import Excelu, ZIP export, Supabase DB/policies a online ukládání rozpisu beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.139)`, technická verze `1.2.139`, cache `v1.2-1.139`.

## RaK 1.2 (1.138)

- Administrace / Rozpisy / Generátor: dolaďený XLSX export návrhu pro praktičtější kopírování do měsíční tabulky. Tvrdota zůstává v A:F, Měkota pod ní v A:F a Absence začínají od H.
- Absence v XLSX exportu mají nově jasnější hlavičky: H = datum absence, od I dál dvojice `Jméno` / `Kód`. Počet dvojic se generuje podle měsíce v bezpečném rozsahu 4–8, bez slučovaných buněk.
- Šířky sloupců XLSX exportu se nově staví podle reálné šířky exportovaných dat, takže nezůstávají zbytečné prázdné sloupce navíc a bloky se líp označují/kopírují.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.138)`, technická verze `1.2.138`, cache `v1.2-1.138`.

## RaK 1.2 (1.137)

- Administrace / Rozpisy / Generátor: po vygenerování návrhu přidané tlačítko `Stáhnout Excel`.
- Excel export návrhu vytváří list ve stejném základním rozložení jako Martinova tabulka: vlevo Tvrdota, pod ní Měkota a vpravo Absence podle pracovních dnů, aby šly bloky jednoduše kopírovat do měsíčního Excelu.
- Export využívá stávající XLSX knihovnu z aplikace; bez změny Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.137)`, technická verze `1.2.137`, cache `v1.2-1.137`.

## RaK 1.2 (1.136)

- Generátor rozpisu / návaznost cyklu Synka, Třasáka a Střížka: opravené čtení historie z celého předchozího měsíce. Extra TNKS01 po už dokončeném bloku už neresetuje cyklus zpět na TNKS01.
- Příklad z června: když byli Třasák/Synek/Střížek v závěru měsíce na TNKS01 a blok je hotový, červenec má pokračovat na TPKW01, ne začít znovu TNKS01.
- Návaznost se dál dopočítává chronologicky z předchozích měsíců; poslední den měsíce s absencí nebo Měkotou nemá rozbít pokračování rotace.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.136)`, technická verze `1.2.136`, cache `v1.2-1.136`.

## RaK 1.2 (1.135)

- Generátor rozpisu / Synek, Třasák, Střížek: tahle trojice už nevstupuje do měsíčního ani ročního dorovnání TNKS01. Drží vlastní návazný cyklus `TNKS01 → TPKW01 → TPKW02`.
- Generátor rozpisu: cyklus Synka/Třasáka/Střížka se nově dopočítává z předchozích měsíců, takže navazuje mezi měsíci stejně jako ostatní rotace.
- Generátor rozpisu: po dokončení bloku může vložit pracovní den mezery na Měkotě, když by návaznost udělala v měsíci přílišný náskok.
- Podmínka `stejný pracovník nesmí být na TNKS01 dvě pracovní směny po sobě` zůstává aktivní.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.135)`, technická verze `1.2.135`, cache `v1.2-1.135`.

## RaK 1.2 (1.134)

- Generátor rozpisu / TNKS01: Synek, Střížek a Třasák jsou vyřazení z ročního tie-break dorovnání TNKS01; měsíční vyrovnání pro ně v této verzi ještě zůstalo.
- Přidaná podmínka, že stejný pracovník nesmí být na TNKS01 dvě pracovní směny po sobě.
- Administrace / Rozpisy: odstraněné duplicitní tlačítko `Uložit rozpis` v editoru; zůstalo jedno hlavní tlačítko nahoře.
- Vzhled: odstraněný theme `AMOLED černý` / `amoled-midnight`.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.134)`, technická verze `1.2.134`, cache `v1.2-1.134`.

## RaK 1.2 (1.132)

- Nastavení vzhledu: světlé patternové pozadí z 1.131 jsou předělané tak, aby nebyly tak bílé. Zhruba polovina drží světlejší směr podobný `Světlému cikcaku`, druhá polovina je o něco tmavší a všechny mají výraznější linky/vzory, aby byly na pozadí líp vidět.
- Přidané dva AMOLED theme: `AMOLED modrý` a `AMOLED zelený`.
- Přidaná dvě AMOLED pozadí: `AMOLED mřížka` a `AMOLED pulse`.
- Administrace / Rozpisy / Generátor: když vybereš měsíc, který už má zadané pracovní dny a absence, průvodce si je teď převezme jako předvyplněný základ. Dá se tedy navázat na rozdělaný měsíc místo zadávání od nuly.
- `O aplikaci` nově začíná stručným souhrnem po větších blocích verzí; přidaný aktuální blok `v.1.2 1.30–1.49`.
- Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.132)`, technická verze `1.2.132`, cache `v1.2-1.132`.

## RaK 1.2 (1.130)

- Rozpisy / Absence: tabulka absencí v měsíčním rozpisu nově zobrazuje všechny pracovní dny/směny, i když v daný den nikdo nechybí. Prázdné dny mají v kolonkách jméno/důvod pomlčku, aby byl přehled kompletní.
- Export obrázku rozpisu: tabulka Absence nově také drží všechny pracovní dny/směny včetně dnů bez absence.
- Export obrázku rozpisu: `Roční přehled` i tabulka `Nýtování a úklid [rok]` jsou omezené podle exportovaného měsíce. Export května počítá leden–květen, export srpna leden–srpen, bez ohledu na aktuální datum exportu.
- Generátor rozpisu: dorovnání nýtovačky/TNKS01 nově při výběru bere v úvahu nejen měsíční rozložení, ale i celkové roční počty před generovaným měsícem, aby nedával další nýtovačku člověku, který už je v roce výrazně napřed.
- V Nastavení vzhledu přidaný základní odemčený světlý theme `Světlý hnědý` a základní odemčené pozadí `Světlý cikcak` s bílým podkladem a jemnými úzkými cikcak čárkami.
- Supabase DB/policies beze změny; ukládání rozpisů a přesčasů dál přes stávající mechanismy.
- Release metadata sjednocená na `RaK 1.2 (1.130)`, technická verze `1.2.130`, cache `v1.2-1.130`.

## RaK 1.2 (1.129)

- Administrace / Rozpisy / Přesčasy: doplněný výchozí seznam 12 přesčasů pro rok 2025 podle upřesnění: 12.1., 26.1., 16.2., 2.3., 16.3., 30.3., 5.10., 19.10., 9.11., 23.11., 30.11. a 14.12.2025.
- Přesčasy 2025 se chovají jako výchozí TO/tvrdota, takže TNKS01/TPKW01 se na nich standardně půlí, dokud u konkrétního data nevypneš přepínač TO.
- Přidaná seed/migrační ochrana `ROTATION_OVERTIME_DEFAULT_SEED_VERSION = 129`, aby se nově doplněné defaulty 2025 zobrazily i uživatelům se starším uloženým nastavením, ale po novém uložení se už ručně smazané defaulty nevracely.
- Supabase DB/policies beze změny; ukládání dál přes `ROTATION_OVERTIME_SETTINGS`.
- Release metadata sjednocená na `RaK 1.2 (1.129)`, technická verze `1.2.129`, cache `v1.2-1.129`.

## RaK 1.2 (1.128)

- Administrace / Rozpisy / Přesčasy: filtr směn přebarvený do aktuálního theme/glass stylu aplikace, aby nebyl světlý a hůř čitelný.
- U každého roku v Přesčasech přidaný přehled počtů přesčasů podle směn A/B/C/D. Přehled se přepočítává i při ruční změně data nebo vyčištění řádku.
- Logika TO/MO, statistiky TNKS01/TPKW01, generátor i Supabase DB/policies beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.128)`, technická verze `1.2.128`, cache `v1.2-1.128`.

## RaK 1.2 (1.127)

- V Administraci / Rozpisy / Přesčasy upravený filtr směn: místo `Moje D` jsou čisté volby `Vše`, `A`, `B`, `C`, `D`.
- Filtrování dál jen vizuálně skrývá řádky jiných směn, takže se při uložení nemažou.
- Logika TO/MO a ukládání přes `ROTATION_OVERTIME_SETTINGS` beze změny.
- Release metadata sjednocená na `RaK 1.2 (1.127)`, technická verze `1.2.127`, cache `v1.2-1.127`.

## RaK 1.2 (1.126)

- Administrace / Rozpisy / Přesčasy: přidaný automatický sloupec `Směna`, který z data přesčasu dopočítá směnu podle rotačního cyklu.
- Přidaný filtr přesčasů podle směny: `Vše`, `Moje D`, `A`, `B`, `C`; filtr jen vizuálně skrývá řádky, takže uložené přesčasy jiných směn se při ukládání neztratí.
- U ručně zadávaného data se badge směny přepočítá průběžně, bez ručního vyplňování směny.
- Logika `TO` zůstává stejná: zapnuto = tvrdota a půlení TNKS01/TPKW01, vypnuto = MO bez půlení.
- Release metadata sjednocená na `RaK 1.2 (1.126)`, technická verze `1.2.126`, cache `v1.2-1.126`.

## RaK 1.2 (1.125)

- Administrace / Rozpisy: přidané tlačítko `Přesčasy` pro samostatnou správu přesčasových nedělí podle roků.
- U každého přesčasu je přepínač `TO`: zapnuto = přesčas jde na tvrdotu a TNKS01/TPKW01 se půlí 0,5 + 0,5; vypnuto = přesčas nejde na tvrdotu a každý má +1 na zapsaném stroji.
- Přesčasy se ukládají přes stávající machine settings řádek `ROTATION_OVERTIME_SETTINGS`, takže není potřeba měnit Supabase DB ani policies.
- Statistiky, generátor i kontrolní přehled používají nově dynamické nastavení přesčasů; výchozí stav dál obsahuje 1.3.2026 jako `TO` vypnuto / jen MO.
- Release metadata sjednocená na `RaK 1.2 (1.125)`, technická verze `1.2.125`, cache `v1.2-1.125`.

## RaK 1.2 (1.118)

- Administrace/Rozpisy: odstraněné duplicitní tlačítko `OK, odeslat`, protože dělalo stejnou akci jako `Uložit rozpis` a mátlo to.
- Editor rozpisu i návrh z generátoru používají jako jedinou finální akci `Uložit rozpis`; v náhledu generátoru zůstává jen `Otevřít rozpis`.
- Přidaný contract `RAK_ROTATION_SAVE_BUTTON_CONTRACT_V1118` a guard v `npm run test:app-usage`, aby se duplicitní tlačítko nevrátilo.
- Release metadata sjednocená na `RaK 1.2 (1.118)`, technická verze `1.2.118`, cache `v1.2-1.118`.

## RaK 1.2 (1.117)

- Generátor rozpisů: zesílené vyrovnání nýtovačky/TNKS01 podle společného pravidla TNKS01/TPKW01 = 0,5 + 0,5, aby nevznikal stav, kdy má někdo 1,5 a někdo 0.
- Generátor rozpisů: přidané dorovnání poměru MFKF/MSKC, aby člověk nebyl jen na frézkách a jiný jen na soustruhách, pokud existuje rozumný prohoz ve stejném dni.
- Kontrolní přehled po vygenerování je otočený: jména jsou v řádcích, stroje ve sloupcích. Přidané souhrnné sloupce TO a MO.
- Přidaný contract `RAK_ROTATION_GENERATOR_RULES_V1116` a guardy v `npm run test:app-usage`.
- Release metadata sjednocená na `RaK 1.2 (1.117)`, technická verze `1.2.117`, cache `v1.2-1.117`.

## RaK 1.2 (1.115)

- Generátor rozpisu upravený víc podle reálného Martinova postupu: nejdřív návazně rozepíše lidi z Tvrdoty podle toho, kde skončili v minulých měsících, potom řeší základ Měkoty, výměny, absence a až nakonec vyrovnávání.
- Tvrdotní rotace nově používá pořadí `TBKR01 → TNKS01 → TBKR07 → TPKW01 → TPKW02` a drží návaznost přes `previousHardMachine` / `hardCycleCursor`.
- Když Synek/Třasák/Střížek z Měkoty jdou na Tvrdotu, člověk vytlačený z Tvrdoty jde ten den na Měkotu, přednostně na frézky.
- Špadrna a Novotný jsou v generátoru výslovně vedení jako vyrovnávací lidé pro Tvrdotu a zbytek dní spíš pro Měkotu/frézky.
- Přidaný contract `RAK_ROTATION_GENERATOR_RULES_V1115` a test guard pro lidský postup generátoru.
- Release metadata sjednocená na `RaK 1.2 (1.115)`, technická verze `1.2.115`, cache `v1.2-1.115`.

## RaK 1.2 (1.114)

- Generátor rozpisu: Synek/Třasák/Střížek se v 3denním bloku Měkoty na Tvrdotu nově přeskupují podle dostupnosti. Když je někdo dostupný jen první dny a potom má absenci, má jít na Tvrdotu dřív, aby se tvrdotě nevyhnul.
- Generátor rozpisu: přidané vyrovnání samostatných frézek. Samostatná obsluha se počítá jako `MFKF10` s prázdnou `MFKF06` a po vygenerování se prohazuje tak, aby někdo nebyl sám na frézkách opakovaně a jiný vůbec.
- Výsledek generátoru nově vrací `soloMillBalanceSwaps` a pravidla jsou označená jako `1.114`.
- `npm run test:app-usage` hlídá dostupnostní prioritu Měkoty na Tvrdotě i vyrovnání samostatných frézek.
- Release metadata sjednocená na `RaK 1.2 (1.114)`, technická verze `1.2.114`, cache `v1.2-1.114`.

## RaK 1.2 (1.113)

- Generátor rozpisu: kontrolní tabulka stroje × jména teď počítá TNKS01/TPKW01 podle reálného střídání jako 0,5 + 0,5 mimo běžnou neděli; běžná neděle ranní/noční zůstává jako celá směna na zapsaném stroji, přesčasová neděle se střídá.
- Generátor rozpisu: Synek, Třasák a Střížek chodí z Měkoty na Tvrdotu jen na TNKS01/TPKW01/TPKW02 po blocích 3 pracovních dnů na stejný stroj; při absenci se pořadí v bloku přeskupí, aby se tomu člověk nevyhnul.
- Generátor rozpisu: základní soustruhy Měkoty jsou Synek MSKC04, Střížek MSKC03 a Třasák MSKC01, pokud jsou dostupní a nejsou zrovna na Tvrdotě.
- Průvodce generátorem po vygenerování ukazuje náhled celého rozpisu Tvrdota/Měkota a umožňuje návrat na měsíc, dny nebo absence bez naklikání od začátku.
- Přidaný contract `RAK_ROTATION_GENERATOR_RULES_V1113` a testy pro 0,5 přehled, 3denní bloky Měkoty, základní soustruhy a náhled celého rozpisu.
- Release metadata sjednocená na `RaK 1.2 (1.113)`, technická verze `1.2.113`, cache `v1.2-1.113`.

## RaK 1.2 (1.112)

- Generátor rozpisu: výběr měsíce je teď řazený podle roku/měsíce a seskupený podle roku, aby se nepletly měsíce z 2025 a 2026.
- Generátor rozpisu: po vygenerování běží vyrovnání `TNKS01` / nýtovačky. Když někdo vyjde na TNKS01 víckrát a někdo v měsíci vůbec, generátor se pokusí prohodit člověka na TNKS01 s člověkem z tvrdoty dočasně napsaným na Měkotě.
- Přidaný contract `RAK_ROTATION_GENERATOR_MONTH_BALANCE_CONTRACT_V1112` a browser/app-usage guard pro řazení měsíců a rovnoměrnější rozdělení TNKS01.
- Release metadata sjednocená na `RaK 1.2 (1.112)`, technická verze `1.2.112`, cache `v1.2-1.112`.

## RaK 1.2 (1.111)

- Administrace / Rozpisy / generátor: opravené finální `Vygenerovat rozpis` z průvodce, které ve wizard DOMu omylem četlo prázdný editor a tím vytvořilo prázdný návrh / nulový přehled stroje × jména.
- Generátor teď čte `readAdminRotationFromDom` jen v reálném editoru `#adminRotationEditor`; v průvodci používá připravený měsíc ze stavu aplikace.
- Browser smoke nově reálně kliká na `Vygenerovat rozpis` v průvodci a hlídá, že výsledný návrh i kontrolní tabulka stroje × jména mají nenulové hodnoty.
- Release metadata sjednocená na `RaK 1.2 (1.111)`, technická verze `1.2.111`, cache `v1.2-1.111`.

## RaK 1.2 (1.109)

- Administrace / Rozpisy / Generátor: opraveno přidávání další absence ve stejný den. Kliknutí na `+ Přidat jméno` už nemaže vyplněná jména ani kódy v kroku Absence.
- Sběr absencí v průvodci teď používá pracovní dny uložené ve stavu průvodce, protože v kroku Absence už v DOMu nejsou pole z kroku Dny.
- Během editace se zachovávají i prázdné řádky absencí; ignorují se až při přípravě poznámek pro generátor.
- `npm run test:app-usage` a `npm run test:browser-smoke` nově hlídají, že přidání druhého jména ve stejný den zachová už vyplněnou absenci.
- Release metadata sjednocená na `RaK 1.2 (1.109)`, technická verze `1.2.109`, cache `v1.2-1.109`.

## RaK 1.2 (1.108)

- Administrace / Rozpisy: mini přehled Tvrdoty už nezkracuje názvy strojů o první `T`, takže `TNKS01`, `TBKR07`, `TPKW01`, `TPKW02`, `TBKR01` zůstávají celé.
- Administrace / Rozpisy / Absence: přidané tlačítko `+ Přidat další absenci`, aby šlo zadat víc lidí bez ručního boje s jedním řádkem.
- `Vygenerovat návrh` nově otevírá průvodce: volba měsíce, kontrola pracovních dnů, mazání dnů křížkem, přidání dne přes `+`, zadání absencí pro dny a až potom vygenerování návrhu.
- Po vygenerování návrhu se ukáže soukromý kontrolní přehled `stroje × jména`, kde je vidět, kolikrát kdo v daném měsíci vychází na jednotlivé stroje.
- Generátor dál ukládá jen lokální návrh; online uložení zůstává až po ručním kliknutí na `Uložit rozpis`.
- Release metadata sjednocená na `RaK 1.2 (1.108)`, technická verze `1.2.108`, cache `v1.2-1.108`.

## RaK 1.2 (1.107)

- Administrace / Rozpisy: generátor návrhu teď počítá podle pravidel Měkota/Tvrdota místo čistého historického doplnění.
- Před generováním se počítá s tím, že nejdřív doplníš absence a zkontroluješ dny měsíce; generátor čte rozepsané absence přímo z editoru před výpočtem.
- Pravidla generátoru: Střížek, Synek, Třasák, Špadrna a Novotný jsou prioritně Měkota; ostatní zpravidla Tvrdota.
- Měkota lidé se střídají na tvrdotních strojích TNKS01 / TPKW01 / TPKW02; tvrdota drží cyklus TNKS01 / TBKR07 / TPKW01 / TPKW02 / TBKR01.
- Pravidlo absencí: kdykoliv je na frézkách jen jeden člověk, MFKF06 se píše jako neobsazená a člověk na MFKF10 reálně hlídá obě frézky.
- Při dvou absencích generátor nechává MFKF06 i MSKC01 prázdné: jeden člověk na frézkách, dva lidé na soustruhách.
- Generátor umí vynechat den označený v absencích jako svátek / odstávka / bez směny.
- `npm run test:app-usage` a `npm run test:browser-smoke` hlídají pravidlový generátor v1.107 včetně prázdné MFKF06 a MSKC01 při dvou absencích.
- Release metadata sjednocená na `RaK 1.2 (1.107)`, technická verze `1.2.107`, cache `v1.2-1.107`.

## RaK 1.2 (1.106)

- Administrace / Rozpisy: přidané tlačítko `Vygenerovat návrh`, které po zvolení měsíce vytvoří první návrh rozpisu podle historicky vyplněných rotací.
- Generátor vychází z předchozích měsíců, preferuje loňský stejný měsíc jako vzor, hlídá jedno jméno nejvýš jednou v jednom dni, respektuje absence v daný den a snaží se držet historické vazby lidí na stroje.
- Návrh se uloží jen lokálně do rozepsaného rozpisu; online se odešle až po ruční kontrole a kliknutí na `Uložit rozpis`. Obsazený měsíc se před přepsáním ptá na potvrzení.
- Přidaný guard `RAK_ROTATION_GENERATOR_CONTRACT_V1106`, aby generátor zůstal v Administraci/Rozpisech, chránil existující data a neukládal online bez ručního potvrzení.
- Release metadata sjednocená na `RaK 1.2 (1.106)`, technická verze `1.2.106`, cache `v1.2-1.106`.

## RaK 1.2 (1.105)

- Rotace: prázdný stav u přehledu příští směny používá stejnou přirozenou větu jako Dashboard — `Nikdo nebude chybět.`
- Nastavení vzhledu: opravená migrace chybějícího profilového pozadí po aktualizaci. Když profil ještě nemá `uiSettings.backgroundId`, použije se uložené lokální pozadí místo okamžitého návratu na základní `ios-mesh`.
- Přidané guardy `RAK_ROTACE_EMPTY_ABSENCE_TEXT_CONTRACT_V1105` a `RAK_APPEARANCE_UPDATE_PERSISTENCE_CONTRACT_V1105`, aby se prázdný stav Rotace ani pozadí po update nevrátily zpět.
- Release metadata sjednocená na `RaK 1.2 (1.105)`, technická verze `1.2.105`, cache `v1.2-1.105`.

## RaK 1.2 (1.104)

- Přidaný reálný browser smoke test `npm run test:browser-smoke` přes lokální Chromium/CDP.
- Test spouští appku v lokálním Chromiu přes CDP; kvůli policy blokaci localhost/file v sandboxu používá inline `about:blank` načtení celé appky a projíždí mobilní viewporty iPhone 13/14 Pro Max, Samsung A15 / běžný Android a úzký mobil 360×800.
- Browser smoke ověřuje boot aplikace, verzi, spodní navigaci, Dashboard karty, Rotace export canvas, výšku voleb v Brusech proti Frézky presetům, Hry, Menu/Více a pevné pozadí.
- Browser smoke zároveň odhalil, že volné indexy Brusy v reálném layoutu zůstávaly na 48 px; doplněný pozdní selector je dorovnal na 58 px stejně jako ostatní volby a Frézky presety.
- Přidaný `RAK_BROWSER_SMOKE_CONTRACT_V1103` a `npm run test:app-usage` hlídá, že browser smoke test zůstává součástí balíčku i release kontrol.
- Release metadata sjednocená na `RaK 1.2 (1.104)`, technická verze `1.2.104`, cache `v1.2-1.104`.

## RaK 1.2 (1.102)

- Rotace / volba jmen: delší jména v klikacích políčkách se na užších displejích líp vejdou díky menšímu adaptivnímu písmu, povolenému zalomení a zrušení ořezávání textu.
- Statistiky / volba jmen: stejné fit pravidlo je přidané i pro jmenné dlaždice ve Statistikách, bez změny výpočtů nebo logiky výběru.
- Přidaný contract `RAK_NAME_CHOICE_FIT_CONTRACT_V1102` a guard v `npm run test:app-usage`, aby se jména nevrátila k ořezávání/ellipsis.
- Bez zásahu do spodní lišty, Dashboardu, výpočtů, exportu Rozpisů, her nebo Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.102)`, technická verze `1.2.102`, cache `v1.2-1.102`.

## RaK 1.2 (1.101)

- Kalkulačky / Výpočet kusů / Brusy: volby `TBKR01`, `TBKR07`, `AD`, `AE`, `AH`, `AD volné` a `AE volné` jsou dorovnané velikostí na preset tlačítka z Korekce / Frézky.
- Pozadí celé appky je pevně ukotvené vůči viewportu: při scrollování se hýbe obsah nad pozadím, ne pozadí samotné, aby glass panely a ikonky působily přirozeněji.
- Přidané contracty `RAK_BRUSY_CHOICE_SIZE_CONTRACT_V1101` a `RAK_FIXED_APP_BACKGROUND_CONTRACT_V1101`.
- `npm run test:app-usage` hlídá sjednocenou velikost voleb Brusy a pevné pozadí celé appky.
- Browser smoke test z plánovaného kroku byl odložený, protože do buildu šly konkrétní UI úpravy.
- Release metadata sjednocená na `RaK 1.2 (1.101)`, technická verze `1.2.101`, cache `v1.2-1.101`.

## RaK 1.2 (1.100)

- Stabilizační uzavření série Dashboard CSS guardů: přidaný `RAK_DASHBOARD_CSS_GUARD_SERIES_CONTRACT_V1100`, který označuje guard sérii 1.90–1.100 jako uzavřenou.
- `npm run test:app-usage` nově hlídá kompletní řetěz Dashboard CSS pojistek od legacy inventury přes active owner registry až po release metadata guard.
- `styles-dashboard-polish.css` má novou dokumentační poznámku `Dashboard CSS guard series complete v1.100`, aby bylo jasné, že další Dashboard práce už má být konkrétní funkční/vizuální požadavek, ne další cleanup-only guard.
- Bez vizuální změny a bez zásahu do Dashboardu, spodní lišty, exportu Rozpisů, her nebo Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.100)`, technická verze `1.2.100`, cache `v1.2-1.100`.

## RaK 1.2 (1.99)

- Release metadata guard: přidaný `RAK_RELEASE_METADATA_CONTRACT_V199`, který drží pohromadě display verzi, package semver, cache verzi, realtime kanál, changelog a service worker metadata.
- `npm run test:app-usage` nově hlídá, že aktivní release soubory neobsahují staré build fragmenty z předchozí verze a že `APP_VERSION`, `package.json`, `sw.js`, `supabase-bridge.js`, `export.js` a `CHANGELOG.md` ukazují na stejný build.
- Bez vizuální změny a bez zásahu do Dashboardu, spodní lišty, exportu Rozpisů, her nebo Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.99)`, technická verze `1.2.99`, cache `v1.2-1.99`.

## RaK 1.2 (1.98)

- Dashboard CSS cleanup bez vizuální změny: přidaný `Dashboard release isolation guard v1.98`, který hlídá, že Dashboard vrstvy nezačnou obsahovat export Rozpisů ani herní CSS/selektory.
- `npm run test:app-usage` nově kontroluje chráněné markery exportu Rozpisů (`ROTATION_EXPORT_GLASS_THEME_V193`, glass helpery a stažení PNG) i herních CSS vrstev (`#games .gameBoard`, 2048, Had a Flappy Car board).
- `styles-dashboard-polish.css` má doplněnou dokumentační poznámku, že export Rozpisů a herní styly nepatří do Dashboard cleanup vrstev.
- Release metadata sjednocená na `RaK 1.2 (1.98)`, technická verze `1.2.98`, cache `v1.2-1.98`.

## RaK 1.2 (1.97)

- Dashboard CSS cleanup bez vizuální změny: přidaný `Dashboard scope guard v1.97`, který hlídá, že dashboard-fit/polish vrstvy nesahají mimo Dashboard scope.
- `npm run test:app-usage` nově kontroluje, že Dashboard CSS vrstvy neupravují spodní lištu, menu, admin přehled připojení ani obecné menu polish selektory.
- `styles-dashboard-polish.css` má doplněnou dokumentační poznámku, že spodní lišta, menu a admin přehled patří do vlastních vrstev, ne do Dashboard vrstev.
- Release metadata sjednocená na `RaK 1.2 (1.97)`, technická verze `1.2.97`, cache `v1.2-1.97`.

## RaK 1.2 (1.96)

- Dashboard CSS cleanup bez vizuální změny: přidaný `Dashboard no-new-hotfix lock v1.96` pro `styles-overrides.css`.
- `npm run test:app-usage` nově hlídá počet a SHA-256 podpis Dashboard selektorů ve `styles-overrides.css`, aby se tam omylem nevracely nové vizuální Dashboard hotfixy.
- Aktivní Dashboard změny mají dál patřit jen do `styles-dashboard-fit.css` / `styles-dashboard-polish.css`; `styles-overrides.css` zůstává historická inventura starých přepisů.
- Release metadata sjednocená na `RaK 1.2 (1.96)`, technická verze `1.2.96`, cache `v1.2-1.96`.

## RaK 1.2 (1.95)

- Dashboard CSS cleanup bez vizuální změny: zpřesněný audit rozdílu mezi legacy inventurou ve `styles-overrides.css` a aktivními Dashboard vlastníky v `styles-dashboard-fit.css` / `styles-dashboard-polish.css`.
- `styles-overrides.css` má nově popsaný `Dashboard legacy-only inventory`, aby bylo jasné, že staré Dashboard hotfixy v téhle vrstvě jsou jen historická stopa.
- `styles-dashboard-polish.css` má nově `Dashboard active owner registry`, kde jsou pojmenované hlavní aktivní selektory Dashboardu.
- `npm run test:app-usage` nově hlídá, že legacy-only selektory a active owner selektory nejsou smíchané dohromady a že aktivní vlastníci zůstávají v povolených dashboard vrstvách.
- Release metadata sjednocená na `RaK 1.2 (1.95)`, technická verze `1.2.95`, cache `v1.2-1.95`.

## RaK 1.2 (1.94)

- Dashboard CSS cleanup bez vizuální změny: přidaný `Dashboard CSS layer order contract v1.94`.
- `npm run test:app-usage` nově hlídá přesné pořadí lokálních CSS vrstev, aby se mezi `styles-overrides.css`, `styles-dashboard-fit.css` a finální `styles-dashboard-polish.css` omylem nevložila nová vítězná Dashboard vrstva.
- Guard zároveň kontroluje dokumentační poznámku přímo ve `styles-dashboard-polish.css`, takže je z kódu jasné, proč musí zůstat poslední lokální CSS vrstvou.
- Bez změny vzhledu Dashboardu, bez změny spodní lišty a bez zásahu do Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.94)`, technická verze `1.2.94`, cache `v1.2-1.94`.

## RaK 1.2 (1.93)

- Export PNG Rozpisů je upravený víc do iOS glass stylu: jemnější modro-bílé pozadí, měkčí stíny, průsvitné panely a lehčí tabulkové výplně.
- Panely `Tvrdota`, `Měkota` a `Absence` teď používají stejný modrý gradient hlavičky jako `Měsíční přehled`, aby export působil jednotně.
- Export dostal sdílený `ROTATION_EXPORT_GLASS_THEME_V193` contract a helpery pro glass shell/title bar, takže se vzhled drží na jednom místě a nebude se znovu rozjíždět po částech.
- `npm run test:app-usage` nově hlídá i glass export contract, sdílený title bar a to, že se do exportu nevrací staré jednobarevné tmavé headery.
- Release metadata sjednocená na `RaK 1.2 (1.93)`, technická verze `1.2.93`, cache `v1.2-1.93`.

## RaK 1.2 (1.92)

- Dashboard CSS cleanup bez vizuální změny: přidaný malý `no visual owner drift` guard pro aktivní Dashboard selektory.
- `npm run test:app-usage` nově hlídá, že poslední lokální CSS vlastník ručně laděných Dashboard pravidel zůstává jen ve `styles-dashboard-fit.css` nebo `styles-dashboard-polish.css`.
- Test zároveň potvrzuje, že `styles-dashboard-polish.css` zůstává poslední lokální CSS vrstva a že Dashboard CSS vrstvy nesahají na spodní lištu.
- Release metadata sjednocená na `RaK 1.2 (1.92)`, technická verze `1.2.92`, cache `v1.2-1.92`.

## RaK 1.2 (1.91)

- Dashboard CSS cleanup bez vizuální změny: rozšířená inventura bezpečně přebitých legacy selektorů ve `styles-overrides.css`.
- Přidaní další kandidáti s jasným pozdějším vlastníkem: ikonky Dashboard panelů, druhý řádek hero panelu, hero pill a konkrétní tečky Kantýna/Jídelna.
- `npm run test:app-usage` rozšířený o guard, že aktivní vlastníci zůstávají ve `styles-dashboard-fit.css` / `styles-dashboard-polish.css` a že cleanup zůstává bez mazání naslepo.
- Release metadata sjednocená na `RaK 1.2 (1.91)`, technická verze `1.2.91`, cache `v1.2-1.91`.

## RaK 1.2 (1.90)

- Dashboard CSS cleanup: označené první prokazatelně přebité legacy Dashboard selektory jako inventura, bez mazání a bez vizuální změny.
- Aktivní vlastníci Dashboardu zůstávají v `styles-dashboard-fit.css` a `styles-dashboard-polish.css`.
- `npm run test:app-usage` rozšířený o guard, aby se nové Dashboard hotfixy nepřidávaly zpět do staré overrides vrstvy bez ověření.
- Release metadata sjednocená na `RaK 1.2 (1.90)`, technická verze `1.2.90`, cache `v1.2-1.90`.

## RaK 1.2 (1.89)

- Appearance/theme audit: přidaný `RAK_APPEARANCE_READABILITY_CONTRACT_V189`, který hlídá čitelnost odemykaných theme a pozadí na Dashboardu, v Přehledu připojení, Nastavení vzhledu a herních žebříčcích.
- Contract drží povinné theme proměnné, tmavý background základ pro glass panely a minimální kontrast `--soft` / `--muted` proti `--bg`.
- `npm run test:app-usage` rozšířený o statickou kontrolu kontrastu theme a tmavosti `--rakBgBase` u všech pozadí.
- Release metadata sjednocená na `RaK 1.2 (1.89)`, technická verze `1.2.89`, cache `v1.2-1.89`.

## RaK 1.2 (1.88)

- Administrace → Přehled připojení: doplněný silnější avatar contract pro dvoupísmenné iniciály, aby zůstaly přesně uprostřed ikonky i na malých mobilech.
- CSS už výslovně hlídá, že avatar nesmí zdědit sloupcové řazení textového wrapperu ani obecné `summary span` pravidlo.
- `npm run test:app-usage` rozšířený o guard proti návratu obecného `#menu .adminUsageSummary span` pravidla, které dřív umělo rozhodit centrování avataru.
- Release metadata sjednocená na `RaK 1.2 (1.88)`, technická verze `1.2.88`, cache `v1.2-1.88`.

## RaK 1.2 (1.87)

- Export PNG Rozpisů: zjednodušený `Měsíční přehled` je uzamčený contractem `ROTATION_EXPORT_MONTH_SUMMARY_LABELS_V187` na 4 řádky — `Směn celkem`, `Ranní směny`, `Noční směny`, `Obsazenost`.
- Popisek prvního řádku sjednocený na `Směn celkem`, aby export zněl obecně a přirozeně.
- `npm run test:app-usage` hlídá, že měsíční přehled vzniká z contract labelů a že se nevrátí staré podrobné položky.
- Release metadata sjednocená na `RaK 1.2 (1.87)`, technická verze `1.2.87`, cache `v1.2-1.87`.

## RaK 1.2 (1.86)

- Export PNG Rozpisů: Měsíční přehled je zjednodušený jen na to hlavní — počet směn, ranní směny, noční směny a obsazenost.
- Z pravého souhrnu zmizely detailní položky a vysvětlivka, takže obrázek působí čistěji a je rychlejší na přečtení.
- `npm run test:app-usage` upravený tak, aby hlídal jednoduchý obsah Měsíčního přehledu a nevracel zpátky staré detailní položky.
- Release metadata sjednocená na `RaK 1.2 (1.86)`, technická verze `1.2.86`, cache `v1.2-1.86`.

## RaK 1.2 (1.85)

- Export PNG Rozpisů: Měsíční přehled má sdílený výpočet výšky karty, takže výška canvasu odpovídá skutečně vykreslenému souhrnu.
- Přidaná bezpečná mezera před footerem, aby se pravý sloupec s Absencemi a Měsíčním přehledem nepřiblížil k poznámce vpravo dole ani u měsíců s delším seznamem absencí.
- `npm run test:app-usage` rozšířený o guard pro výpočet výšky Měsíčního přehledu a footer safe gap.
- Release metadata sjednocená na `RaK 1.2 (1.86)`, technická verze `1.2.86`, cache `v1.2-1.86`.

## RaK 1.2 (1.84)

- Export PNG Rozpisů: Měsíční přehled dostal krátkou vysvětlivku přímo do karty, aby bylo jasné, že `Plán` je obsazení z rozpisu a `Po absencích` je plán mínus absence směn.
- Layout exportu počítá i s výškou vysvětlivky, takže se footer nepřekryje se souhrnem.
- `npm run test:app-usage` rozšířený o guard, že vysvětlivka zůstává v exportní kartě a že plán/po absencích zůstávají oddělené.
- Release metadata sjednocená na `RaK 1.2 (1.84)`, technická verze `1.2.84`, cache `v1.2-1.84`.

## RaK 1.2 (1.83)

- Export PNG Rozpisů: měsíční přehled je rozšířený o oddělenou plánovanou obsazenost a obsazenost po absencích.
- Přehled nově ukazuje plán obsazeno/volno, plán obsazenost, po absencích obsazeno/volno, obsazenost měsíce, absence záznamů a absence směn.
- Karta měsíčního přehledu má kompaktnější řádky, aby se delší souhrn vešel vedle Absencí bez zbytečného nafukování obrázku.
- `npm run test:app-usage` rozšířený o guard pro oddělení plánované a výsledné obsazenosti v exportním přehledu.
- Release metadata sjednocená na `RaK 1.2 (1.83)`, technická verze `1.2.83`, cache `v1.2-1.83`.

## RaK 1.2 (1.82)

- Administrace → Přehled připojení: opravené centrování iniciál v avatar ikonách, textová část má vlastní wrapper a dvoupísmenné iniciály sedí uprostřed ikonky.
- Export PNG Rozpisů: přidaný nový blok `Měsíční přehled` pod tabulku Absence. Ukazuje směny do práce, ranní/noční směny, dny se směnou, místa celkem, obsazená/volná místa, měsíční obsazenost a absence směn.
- `npm run test:app-usage` rozšířený o guard pro centrovaný avatar Přehledu připojení a pro nový měsíční přehled v exportu Rozpisů.
- Release metadata sjednocená na `RaK 1.2 (1.82)`, technická verze `1.2.82`, cache `v1.2-1.82`.

## RaK 1.2 (1.81)

- Appearance systém: přidaný interní reward contract pro budoucí theme a pozadí, aby nové skiny nebyly jen podobné přebarvené varianty.
- Contract drží pravidlo, že vždy dostupný je jen základní theme a základní pozadí, výrazné skiny se mají odemykat přes hry, achievementy nebo rank.
- `npm run test:app-usage` rozšířený o guard pro appearance contract, vyřazené podobné ID a postupné odemykání.
- Release metadata sjednocená na `RaK 1.2 (1.81)`, technická verze `1.2.81`, cache `v1.2-1.81`.

## RaK 1.2 (1.80)

- Dashboard: vrchní směnový panel je vyšší cca o 10 %, běžné panely a spodní lišta beze změny.
- Theme/pozadí: vyřazené nejpodobnější nové varianty, ponechané výrazné kusy jsou znovu postupně odemykané rankem nebo achievementy.
- `npm run test:app-usage` rozšířený o guard pro 1.80 hero height a appearance reward contract.
- Release metadata sjednocená na `RaK 1.2 (1.80)`, technická verze `1.2.80`, cache `v1.2-1.80`.

## 1.2 (1.79)

## RaK 1.2 (1.79)
- Dashboard CSS stabilizace bez viditelného redesignu: doplněný viewport stack contract guard pro ručně laděné rozměry 360×800, 390×844, 428×926, 430×932 a desktop základ.
- `npm run test:app-usage` rozšířený o kontrolu, že jednotlivé viewport stacky mají pořád pozdní vlastníky ve `styles-dashboard-fit.css` / `styles-dashboard-polish.css` a že 1.79 guard zůstává až za 1.77 výškovou vrstvou.
- Release metadata sjednocená na `RaK 1.2 (1.79)`, technická verze `1.2.79`, cache `v1.2-1.79`.
- Bez zásahu do Supabase DB/policies, spodní lišty, online her, exportu Rozpisů a výpočtové logiky kalkulaček.

## 1.2 (1.77)

## RaK 1.2 (1.77)

- Dashboard: běžné panely jsou opatrně zvýšené maximálně zhruba o 5 % podle viewportu, bez změny spodní lišty a bez redesignu glass stylu.
- `npm run test:app-usage` rozšířený o guard, který hlídá nové výšky panelů a poznámku k 1.77 stabilizační vrstvě.
- Bez zásahu do Supabase DB/policies, online her, exportu Rozpisů, Rotací, Statistik a Kalkulaček.
- Release metadata sjednocená na `RaK 1.2 (1.77)`, technická verze `1.2.77`, cache `v1.2-1.77`.

## 1.2 (1.76)

## RaK 1.2 (1.76)
- Dashboard CSS stabilizace: doplněný legacy inventory guard pro staré dashboard override bloky ve `styles-overrides.css`.
- `npm run test:app-usage` nově hlídá, že historické Dashboard override bloky zůstávají označené jako legacy a že vítězné selektory drží dedikované vrstvy `styles-dashboard-fit.css` / `styles-dashboard-polish.css`.
- Bez viditelného redesignu Dashboardu, bez zásahu do spodní lišty, exportu Rozpisů, herního online flow a Supabase DB/policies.
- Release metadata sjednocená na `RaK 1.2 (1.76)`, technická verze `1.2.76`, cache `v1.2-1.76`.

## 1.2 (1.75)

## RaK 1.2 (1.75)

- Administrace → Přehled připojení: avatar u profilu už nepoužívá jen jedno písmeno, ale dvoupísmenné iniciály. U jména se dvěma částmi bere první písmeno z prvních dvou částí, u jednoslovného profilu první dvě písmena.
- Iniciály jsou převáděné přes české locale, aby zůstala přirozená diakritika, a avatar je dorovnaný přes střed ikony.
- `npm run test:app-usage` rozšířený o kontrolu generování dvoupísmenných iniciál v Přehledu připojení.
- Release metadata sjednocená na `RaK 1.2 (1.75)`, technická verze `1.2.75`, cache `v1.2-1.75`.

## 1.2 (1.74)

## RaK 1.2 (1.74)

- Navázání na potvrzený build 1.73: bez viditelného redesignu, bez změny Dashboard vzhledu a bez zásahu do spodní lišty.
- Rozšířený `npm run test:app-usage` o pevnější Dashboard CSS contract guard: kontroluje poslední CSS vrstvu, jedinečné načtení klíčových polish souborů, pořadí všech dashboard-relevantních CSS vrstev a vlastnictví hlavních dashboard selektorů.
- Přidaná pojistka, že finální dashboard polish vrstva znovu nekreslí shell pseudo-elementy a nesahá do spodní navigace.
- Release metadata sjednocená na `RaK 1.2 (1.74)`, technická verze `1.2.74`, cache `v1.2-1.74`.

## 1.2 (1.73)

## RaK 1.2 (1.73)

- Technická stabilizace Dashboard CSS po dlouhém mobilním ladění: bez viditelného redesignu, bez změny spodní lišty a bez zásahu do exportu Rozpisů.
- Rozšířený `npm run test:app-usage` o statické hlídání Dashboardu, pořadí CSS vrstev a pokrytí hlavních viewportů 360×800, 390×844, 428×926 / 430×932 + desktop základ.
- Přidaná pojistka, že dashboardové CSS vrstvy nezačnou upravovat spodní navigaci.
- Release metadata sjednocená na `RaK 1.2 (1.73)`, technická verze `1.2.73`, cache `v1.2-1.73`.

## 1.2 (1.72)

## RaK 1.2 (1.72)
- Dokončen aktuální refactor/cleanup balík: poslední bezpečný CSS úklid menu/O aplikaci/diagnostiky do `styles-menu-polish.css`.
- Přesunuté jen existující vzhledové vrstvy pro O aplikaci, diagnostiku, zamčené vzhledy a admin přehled připojení; bez změny spodní lišty, Supabase DB a online her.
- Release metadata sjednocená na `RaK 1.2 (1.72)`, technická verze `1.2.72`.

- CSS cleanup: dashboard compact/viewport-fit polish oddělený ze `styles-overrides.css` do nové vrstvy `styles-dashboard-fit.css`.
- Pořadí kaskády zachováno: nový soubor se načítá hned po `styles-overrides.css`, před admin/stats/theme/release/dashboard polish vrstvami.
- Bez zásahu do Supabase DB/policies, online her, výpočtové logiky, Rotace logiky a vizuálních pravidel spodní lišty.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.72)`.

## 1.2 (1.40)
- CSS cleanup: viewport/iOS/PWA start stabilizační vrstva přesunutá ze `styles-overrides.css` do `styles-viewport-polish.css`.
- Zachováno pořadí kaskády před theme/release/dashboard polish vrstvami, bez vizuální změny spodní lišty.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.40)`.

## 1.2 (1.39)
- Dashboard: panely na Home jsou průhlednější a víc matně glass, bez zásahu do spodní lišty.
- Kantýna/jídelna: v druhém řádku už se zbytečně neopakuje „Přesčas“ před „Další“; další přesčas se píše jen jako „Další: Přesčas HH:MM–HH:MM“.
- Přidaný samostatný `styles-dashboard-polish.css` jako finální dashboard polish vrstva načtená po ostatních CSS polish souborech.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.39)`.

## 1.2 (1.38)
- Větší CSS cleanup: statistiky/obsazenost strojů oddělené ze `styles-overrides.css` do nové vrstvy `styles-stats-polish.css`.
- Pořadí CSS drží bezpečný chain: overrides → admin polish → stats polish → theme polish → release polish.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.38)`.

## 1.2 (1.37)
- Větší CSS cleanup: admin/rozpis polish oddělený ze `styles-overrides.css` do nového `styles-admin-polish.css`.
- Pořadí CSS zachované: overrides → admin polish → theme polish → release polish.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.37)`.
- Supabase DB, online flow, online hry, kalkulačky, Rotace logika a spodní lišta beze změny.

## 1.2 (1.36)
- CSS cleanup pokračuje větším krokem: finální theme/background polish je přesunutý ze `styles-overrides.css` do samostatného `styles-theme-polish.css`.
- Pořadí načítání zůstává zachované: `styles-overrides.css` → `styles-theme-polish.css` → `styles-release-polish.css`, takže se nemění vzhledová priorita posledních vrstev.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.36)`.
- Bez zásahu do Supabase DB/policies, online her, kalkulačkové logiky, Rotace logiky a spodní lišty.

## 1.2 (1.35)
- CSS cleanup: pozdní release polish pravidla přesunutá ze `styles-overrides.css` do samostatného `styles-release-polish.css`, aby historický override soubor začal postupně hubnout bez změny vizuálního pořadí.
- Nový CSS soubor doplněný do HTML, service workeru, export manifestu a release auditů.
- Verze, cache, realtime kanál, service worker, export metadata a GitHub hlavičky sjednocené na `RaK 1.2 (1.35)`.

## 1.2 (1.34)
- Větší refactor boot shellu: spodní navigace a její bezpečné metriky jsou oddělené z `app.js` do `app-bottom-nav.js`.
- Post-load audit orchestrace je oddělená do `app-postload-audits.js`, takže `app.js` zůstává víc jen loader/orchestrátor.
- Release metadata, cache, realtime kanál, service worker, export manifest a GitHub hlavičky sjednocené na `RaK 1.2 (1.34)`.

## 1.2 (1.33)
- Větší refactor startu aplikace: online synchronizace rozpisů je oddělená z `app-init.js` do nového `app-rotation-sync.js`.
- Startovací vazby voleb Rotace a Excel importu jsou oddělené z `app-init.js` do nového `app-rotation-controls.js`.
- `app-init.js` zůstává už hlavně jako krátký startovací orchestrátor; nové moduly jsou doplněné do loaderu, module readiness, export manifestu, service workeru a auditů.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty, kalkulaček, Rotace logiky a Statistik.

## 1.2 (1.32)
- Home boot sekvence oddělená z `app-init.js` do nového modulu `app-home-boot.js`.
- `app-init.js` zůstává víc pro startovací formulářové vazby, Excel import bridge a Supabase synchronizaci rozpisů.
- Nový modul je doplněný do loaderu, module readiness, export manifestu, service workeru, boot auditu, export auditu a app-usage smoke testu.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty, kalkulaček, Rotace a Statistik.

## 1.2 (1.31)
- Admin odemčení přes 3 tapnutí na „Více“ je oddělené z `app-init.js` do nového modulu `app-admin-unlock.js`.
- `app-init.js` se zmenšil a zůstává víc pro startovací vazby, Excel import bridge a online synchronizaci rozpisů.
- Nový modul je doplněný do loaderu, module readiness, export manifestu, service workeru a release kontrol.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty, kalkulaček a Rotace.

## 1.2 (1.30)
- Rotace: písmo v dlaždicích jmen je ještě lehce zmenšené, aby se vešla i delší jména.
- Výška dlaždic a průhledný glass vzhled jmen zůstaly zachované.
- Build byl záměrně malý a stabilizační kvůli následnému ručnímu testu.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty a výpočtové logiky.

## 1.2 (1.29)
- Stabilizované release/version metadata: aktivní diagnostické fallbacky, namespace bridge a release gates už nepoužívají staré `v.1.5` jako aktuální verzi.
- Release gate kontrola verze je navázaná na aktuální řadu `1.2`, aby Diagnostika nehlásila starý blok kvůli historickému řetězci.
- GitHub hlavičky, `APP_VERSION`, package semver, cache verze, service worker, realtime kanál a export metadata sjednocené na aktuální build.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty, kalkulaček a Rotace.

## 1.2 (1.23)
- Opravené a sjednocené release značení po upozornění, že GitHub může v aktivních zdrojových souborech ukazovat matoucí starý zápis 1.2 (1.14).
- Aktivní zdrojové komentáře s historickým 1.2 (1.14) byly převedené na neutrální refactor poznámky, aby nepůsobily jako aktuální verze.
- Sjednocená aktuální verze aplikace, package.json, cache, service worker, realtime kanál a exportní metadata na RaK 1.2 (1.23).

## 1.2 (1.22)
- Health/audit helpery aplikace oddělené z `app.js` do nového modulu `app-health-audits.js`.
- `app.js` zůstává víc jako boot/runtime shell; phase audity, runtime health helpery a post-stabilization kontroly jsou v samostatném modulu.
- Do Supabase DB/policies, online her ani spodní lišty se nesahalo.

## 1.2 (1.21)
- Runtime guardy aplikace oddělené z `app.js` do nového modulu `app-runtime-guards.js`.
- Přesunutá ochrana proti výběru textu, numerická klávesnice kalkulaček a lokální zachytávání chyb.
- Nový modul doplněný do loaderu, module readiness, export manifestu, service workeru a release kontrol.
- Bez zásahu do Supabase DB/policies, online her, spodní lišty a výpočtové logiky kalkulaček.

## 1.2 (1.20)
- Větší refactor aplikačních akcí: delegované klikací/change handlery jsou přesunuté z `app.js` do nového modulu `app-actions.js`.
- `app.js` se zmenšil a zůstává víc jako boot/load/runtime shell; pořadí načítání drží `app-actions.js` až po `app-menu.js`, před herním/exportním závěrem.
- Release manifesty, service worker, module readiness, boot audit, export audit, app-usage smoke test a `npm run check` počítají s novým modulem.
- Bez změny Supabase DB/policies, online flow, online her, kalkulačkové logiky, Rotace logiky a spodní lišty.

## 1.2 (1.18)
- Rotace: políčka se jmény jsou dotažená do hodně průhledného glass vzhledu bez šedé výplně.
- Rotace: doplněné silnější selektory i pro dock/portal režim a lightweight/low-end režim, aby starší vrstvy nevracely šedé pozadí za jmény.
- CSS cleanup: přidaná finální stabilizační vrstva pro jmenné dlaždice místo zásahu do citlivé logiky Rotace.
- Supabase DB, policies, online flow, online hry a spodní lišta beze změny.

## 1.2 (1.17)
- Rotace: políčka se jmény jsou dotažená do čistšího průhledného glass stylu bez barevné/zelené výplně; aktivní jméno má jen jemné theme ohraničení.
- Kalkulačky: rozbalené plochy „Kolik ještě stihnu“ a „Kdy bude hotovo“ u Brusy/Frézky mají průhlednější glass vzhled; Soustruhy dostaly stejný glass polish pro aktivní plochy a rozbalovací sekce.
- Bezpečný CSS cleanup: starý obecný 1.15 override Soustruhů byl nahrazen poznámkou, protože skutečnou opravu drží cílená třída `.soustruhChoiceBtn` z 1.16.
- Bez zásahu do Supabase DB, policies, online flow, spodní lišty a her.

## 1.2 (1.16)
- Soustruhy: volby Lis / Volné 126ks / Volné 106ks / Kombinace a související volby v kombinaci mají vlastní třídu a tvrdou výšku podle aktuálních voleb brusu/indexu, aby je nepřebíjela obecná vysoká `.bbtn` vrstva.
- Rotace: jmenný dock i samotná políčka se jmény jsou víc průhledný glass bez zelené výplně; theme zůstává jen jemně v ohraničení aktivního jména.
- Bez zásahu do Supabase DB, policies, online flow, spodní lišty a her.

## 1.2 (1.15)

- Soustruhy: všechny navolovací volby jsou sjednocené na stejnou výšku jako volba brusu/indexu v kalkulačce Brusy.
- Rotace: spodní panel jmen a dlaždice jmen jsou víc průhledný glass bez zelené výplně; theme zůstává jen jemně v ohraničení/aktivním zvýraznění.
- Pokračování bezpečného CSS cleanupu: místo mazání starých historických bloků je přidaný finální release override pro konkrétní dvě opravy.
- Bez změny Supabase DB/policies, spodní lišty, online herního flow a výpočtové logiky kalkulaček.

## 1.2 (1.14)

- Větší refactor navigačního/home shellu: spodní aktivní indikátor, swipe-back, `showPage`, home refresh, externí dashboard odkazy a dashboard modaly jsou přesunuté z `ui.js` do nového `app-navigation.js`.
- `ui.js` se zmenšil přibližně z 1864 na 1173 řádků a zůstává víc jako koordinační UI modul.
- Release manifesty, service worker, module readiness, `npm run check` a app-usage smoke test počítají s novým modulem `app-navigation.js`.
- Bez změny Supabase DB/policies, spodní lišty, Rotace, kalkulaček, herní logiky a online flow.

## 1.2 (1.13)

- Větší refactor menu: hlavní sekce Více, O aplikaci, Nastavení, Pošli mi chybu a admin menu shell přesunuty z `ui.js` do nového `app-menu.js`.
- `ui.js` se zmenšil zhruba z 3225 na 1864 řádků a zůstává víc pro navigaci, dashboard/modaly a základní koordinaci.
- Release manifesty, service worker, kontroly a app-usage smoke test počítají s novým modulem `app-menu.js`.
- Bez změny Supabase DB, spodní lišty, Rotace, herní logiky a online flow.

## 1.2 (1.11)
- Rotace: spodní panel jmen sjednocený do glass stylu appky, dlaždice jmen jsou cca o 10 % vyšší.
- Větší refactor: oddělené herní profily/leaderboardy do `games-profile.js`.
- Oddělené theme, pozadí a profilové UI nastavení do `appearance-theme.js`.
- ZIP pojmenování přechází na formát `RaK_v1.2_1.11.zip`.

- Větší refactor: Piškvorky / Gomoku oddělené z hlavního `ui.js` do samostatného `games-gomoku.js`.
- `ui.js` se zmenšil o velkou herní část a zůstává víc jako koordinátor UI.
- Rotace: panel jmen se při otevření stránky nejdřív stabilizuje skrytě a až potom se ukáže ve finální poloze, aby nebylo vidět poskočení.
- Aktualizované release manifesty, service worker, smoke test Piškvorek a kontrola načtených modulů pro nový soubor.
- Supabase DB, policies ani online flow beze změny.