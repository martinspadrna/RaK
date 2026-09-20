# RaK 1.7.63 – kontrola souběžných revizí, omezení a rollback-only důkaz

## Zjištění a změna klienta

Dosavadní `trySaveRotationStateViaRpc` při neznámé `state.rotationRevision` načetl aktuální číslo ze serveru těsně před zápisem. To neprokazuje, že upravovaný obsah editoru vychází z této revize, a mohlo umožnit přepsání novějšího obsahu. Nově klient neznámou, necelou nebo zápornou revizi odmítá chybou `RAK_ROTATION_REVISION_UNVERIFIED` **před RPC zápisem i před náhradním čtením aktuální revize**. Známá revize pochází z předchozího úspěšného online načtení odpovídajícího rozpisu.

Existující serverový `rak_admin_save_rotation_v2` pro již známou revizi používá `SELECT ... FOR UPDATE`, vyžaduje rovnost s `p_expected_revision`, zálohuje starý payload před přepsáním a vrací SQLSTATE `40001` při nesouladu. RPC i rollback backupu kontrolují autorizaci přes `private.rak_require_admin(false)`. Nenahrazovat jej klientským read-then-write.

`upsertRotationMonthEntriesDirect` již nemá nezabezpečený alternativní přímý `rotation_months` upsert a `rotation_entries` DELETE/INSERT, pokud chybí ověřený admin kontext. Zachován existující admin RPC `rak_admin_save_rotation_month_entries_v2`, sjednocen tvar výsledku `{months:1,entries}` včetně nuly. **Tento měsíční RPC zatím nemá CAS a souběžné editace tedy nejsou kompletně chráněné.**

## Čtecí diagnostika

Jen po ručním potvrzení a při lokálně odemčeném adminovi se přes síť zavolá `auth.getUser()`, ověří serverový `rak_admin_context` pro owner/admin a shoda účtu a případného user ID. Teprve pak se načte z `rotation_state` pouze sloupec `revision`. Do výsledku se nedostanou ID účtu, token, jména ani payload. Shoda čísla revize **není důkazem totožnosti obsahu** a nezpřístupňuje replay; všechny výstupy nastavují `eligibleForReplay:false`, `atomicWritePerformed:false`, `serverContentCompared:false`. Při offline, zamítnuté identitě, rozbité frontě nebo selhaném čtení žádné přepsání ani automatické řešení konfliktu.

## Provedený shadow test na TEST DB

Pouze `cgshssdjgzzuprlwnabl` a transakce s dočasnou tabulkou, žádná trvalá změna. Spuštěný SQL scénář:

```sql
BEGIN;
CREATE TEMP TABLE rak_cas_shadow_17063
  (key text PRIMARY KEY, revision bigint NOT NULL, payload jsonb NOT NULL)
  ON COMMIT DROP;
INSERT INTO rak_cas_shadow_17063
  VALUES ('main',7,'{"source":"initial"}');
DO $rak$
DECLARE first_count integer; second_count integer;
        current_rev bigint; current_payload jsonb;
BEGIN
  UPDATE rak_cas_shadow_17063
    SET revision=revision+1,payload='{"source":"first"}'
    WHERE key='main' AND revision=7;
  GET DIAGNOSTICS first_count=ROW_COUNT;
  UPDATE rak_cas_shadow_17063
    SET revision=revision+1,payload='{"source":"stale"}'
    WHERE key='main' AND revision=7;
  GET DIAGNOSTICS second_count=ROW_COUNT;
  SELECT revision,payload INTO current_rev,current_payload
    FROM rak_cas_shadow_17063 WHERE key='main';
  IF first_count<>1 OR second_count<>0 OR current_rev<>8
     OR current_payload<>'{"source":"first"}'::jsonb THEN
    RAISE EXCEPTION 'Shadow CAS regression failed';
  END IF;
END $rak$;
ROLLBACK;
```

Provedeno bez výjimky. Jde o shadow regresi podmíněného zápisu, nikoli důkaz skutečných dvou rolových JWT relací, game-session CAS nebo plné obnovy záloh. Na TEST DB byly při inventuře nalezeny 0 záznamů `game_sessions` a aktuální herní RPC odpovídající starým názvům nebyly nalezeny. Před jakoukoli herní migrací nejprve ověřit skutečný provoz a autorizaci při OS-only přihlášení; nezavádět naslepo veřejný privilegovaný zápis.
