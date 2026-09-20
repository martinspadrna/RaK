# RaK 1.7.64 – cílené uzavírání 13 bodů (20. 9. 2026)

Výhradně `development`, testovací Supabase `cgshssdjgzzuprlwnabl`; žádné změny produkčního `main`, dat ani produkčního aliasu. Viditelná testovací verze 1.7.64; technická verze zůstává 1.7.0. Tato tabulka je stav kandidáta, nikoli tvrzení o dokončeném deploymentu. Nasazení ověřit SHA + dva buildy + Actions + Vercel READY. Bez fyzického iPhonu a skutečných podepsaných relací nesmíme fingovat převzetí úkolů.

| Bod | Stav | Prokázáno / konkrétní zbývající krok |
|---|---|---|
| P0.1 Pracovní účty | ČÁSTEČNĚ | Omezený OS lookup, anon adresář zavřen; stará PWA, exporty, podepsaná JWT rolí. |
| P0.2 Veřejná rotace | UZAVŘENO ROZHODNUTÍM | Jména a 24měsíční rozpis anonymně přístupné při OS-only režimu. Riziko přijato, ne odstraněno. |
| P0.3 API/exporty | ČÁSTEČNĚ | Anon/invalid token HTTP, ZIP a CRC automaticky; nutné testovat owner/admin/deputy, chráněné preview, iPhone ZIP. |
| P0.4 Role vlastníka | ČÁSTEČNĚ | Ochranné RPC a revokace; reálná owner/admin/deputy relace chybí. |
| P1.1 Oprávnění/RLS | ČÁSTEČNĚ | SQL matice a anon HTTP; chybí skutečně podepsaná JWT a admin RPC matice. |
| P1.2 Hesla/relace | ČÁSTEČNĚ | Oddělená Auth a odvolání; praktický test starého/nového zařízení chybí. |
| P1.3 Build/testy | UZAVŘENO TECHNICKY PRO DEVELOPMENT | 2× build/check, regresní gates, ZIP/CRC, Chromium offline a reálné anon HTTP; ověřit každý SHA. |
| P1.4 Nasazení/rollback | ČÁSTEČNĚ | Nasazení SHA/READY a postup zdokumentovány; skutečný izolovaný preview rollback ještě neodzkoušen. |
| P1.5 Zálohy/obnova | ČÁSTEČNĚ | Owner/source ZIP, shadow DB restore, ruční lokální záloha fronty a nově měsíčního návrhu; stále chybí nezávislá plná obnova. |
| P2.1 Výkon PWA | ČÁSTEČNĚ | Chromium start/offline; skutečný iPhone a opakovaný změřený start/prahy. |
| P2.2 CSS/DOM | ČÁSTEČNĚ | Absence a pole data testována v Chromiu; fyzické Safari potvrzení všech dotčených oblastí. |
| P2.3 Offline/konflikty | ČÁSTEČNĚ – 1.7.64 | Atomický serverový CAS aktivní pro hlavní rozpis; neznámá revize fail-closed. Při pokusu o uložení admin měsíce před odesláním uložit samostatnou soukromou kopii, ověřit bajty, při selhání nikdy nesmazat a ukázat ruční export. Neaktivní historické herní položky fronty uchovat pouze pro ochranu starých dat; hry nejsou funkce RaK. Starší PWA, fyzický iPhone a bezpečné vypořádání konfliktu zbývají. Samostatný starý měsícový RPC nemá CAS, není prokázáno aktivní používání. |
| P2.4 Diagnostika | ČÁSTEČNĚ | Ruční status, třídy chyb, revize bez payloadu; iPhone, JWT a měření + soukromí telemetrie k dokončení. |

**2/13 uzavřeno, 11/13 částečně/otevřeno.** Nezměnit skóre jen proto, že přibyla testovací verze. Kontrola TEST DB před 1.7.64 potvrdila, že samostatné tabulky `rotation_months` a `rotation_entries` jsou prázdné, hlavní aktivní `rotation_state` obsahuje záznam. Žádný další vývoj herních účtů, herních CAS ani herních funkcí.

## Jak skutečně rychle uzavřít další body

1. **Jeden cílený průchod fyzickým iPhonem:** ověřit číslo build verze, čitelnost MO/TO data a absencí, opakovaný start PWA online/offline, sync badge a po cíleném testu chybového scénáře nabídku exportu neuloženého návrhu. Nemaž cache ani místní data. Výsledek od uživatele je důkaz, nikoli výsledek Chromium. Může rozhodnout P2.1, P2.2 a P2.4, až budou splněna i měření a ochrana telemetrie.
2. **Owner/admin/deputy:** legitimní přihlášení na TEST v oddělených relacích, spustit již existující čtecí diagnostiku a doručit pouze sanitizovaný výsledek bez tokenu, hesla či OS. Nutné pro P0.1/P0.3/P0.4/P1.1/P1.2.
3. **Zkušební rollback pouze preview a izolovaná plná obnova** vyžadují vhodné oddělené prostředí a explicitní potvrzení případné ceny. Bez toho zůstávají P1.4/P1.5 částečné.

Na iPhonu pro verzi 1.7.64 není potřeba záměrně vytvářet konflikt ve skutečných rozpisových datech. Pouze běžně uložit testovací změnu a ověřit, že v případě chyby se zobrazí nabídka místní zálohy. Exportovaný JSON obsahuje skutečná jména; nikam jej veřejně neposílat.
