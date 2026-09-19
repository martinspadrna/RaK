# RaK 1.7.43 – kompatibilita následných buildů a opravný CI gate

Výhradně větev `development`, testovací Supabase `cgshssdjgzzuprlwnabl`. Normální uživatelé se nadále přihlašují jen osobním (OS) číslem bez hesla, e-mailu a zaměstnaneckého Auth účtu. Admin relace jsou oddělené. Produkční `main`, Vercel produkční alias a produkční databáze se nemění.

Po RaK 1.7.42 proběhlo dvakrát celé `npm run vercel-build`, včetně pěti nových testů soukromé zálohy, a Vercel nasadil správný commit READY. Následný nezávislý GitHub Actions krok však chybně požadoval finální značku verze 1.7.41 v historickém testu 17041. Šlo o regresi testovací infrastruktury, ne o pád buildu aplikace.

- Historický 17041 test nyní čte aktuální build ID z HTML, trvá na verzi alespoň 1.7.41 a kontroluje shodu značek v aplikaci, konfiguraci, SW a technické verzi 1.7.0. Nadále ověřuje starší detektory opakovaného buildu a izolaci testovací databáze.
- Test 17042 je při každém ze dvou buildů proveden přesně ve své mezifázi 1.7.42. Není nesprávně opakován proti finální verzi 1.7.43. Finální CI krok obsahuje nezávislý, přesně verzovaný test 17043.
- Nový build zachovává všechny detektory 17039–17043, všechna data i soukromý archiv importů z 17042. Nová verze aktualizuje pouze testovací značky aplikace, SW cache a PWA pro jasné ověření aktualizace na iPhonu. Žádné tabulky, uživatelské účty, rozpisy ani pravidla generátoru se nemění.

Ověřit dva kompletní buildy, `npm run check`, critical runtime smoke, finální release gates 17039/17040/17041/17043, úspěch GitHub Actions, Vercel READY pro stejné SHA, testovací přihlášení jen OS číslem a owner-only ZIP. Neoznačovat úkoly P0.2/P1.5 za hotové před skutečnou obnovou a kontrolou ochrany historických absencí.
