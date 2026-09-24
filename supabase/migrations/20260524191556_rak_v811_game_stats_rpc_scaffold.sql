-- RaK v1.5(811) / Faze 2E-A: non-breaking RPC scaffold for game stat writes.
-- Existing SELECT/INSERT/UPDATE policies stay unchanged in this migration.
-- This adds a constrained RPC path that the client can prefer before direct writes.

create or replace function public.rak_record_game_stat_delta(
  p_account_number text,
  p_game_type text,
  p_games_played_delta integer default 1,
  p_wins_delta integer default 0,
  p_losses_delta integer default 0,
  p_draws_delta integer default 0,
  p_points_delta integer default 0
)
returns public.game_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.game_stats;
  v_allowed text[] := array[
    'ttt','gomoku','ships','memory','memory_4x4','memory_6x6','memory_8x8',
    'sudoku','sudoku_easy','sudoku_medium','sudoku_hard','snake','tetris',
    'shooter','bomber','pampuch','doodle','flap','brick','bubble','aim',
    'mines','reaction','2048','daily'
  ];
begin
  if p_account_number is null or length(trim(p_account_number)) < 2 or length(trim(p_account_number)) > 32 then
    raise exception 'invalid account_number';
  end if;
  if p_game_type is null or not (trim(p_game_type) = any(v_allowed)) then
    raise exception 'invalid game_type';
  end if;
  if coalesce(p_games_played_delta,0) < 0 or coalesce(p_games_played_delta,0) > 5 then
    raise exception 'invalid games_played_delta';
  end if;
  if coalesce(p_wins_delta,0) < 0 or coalesce(p_wins_delta,0) > 5 then
    raise exception 'invalid wins_delta';
  end if;
  if coalesce(p_losses_delta,0) < 0 or coalesce(p_losses_delta,0) > 5 then
    raise exception 'invalid losses_delta';
  end if;
  if coalesce(p_draws_delta,0) < 0 or coalesce(p_draws_delta,0) > 5 then
    raise exception 'invalid draws_delta';
  end if;
  if coalesce(p_points_delta,0) < 0 or coalesce(p_points_delta,0) > 5000 then
    raise exception 'invalid points_delta';
  end if;

  update public.game_stats
  set
    games_played = games_played + coalesce(p_games_played_delta,0),
    wins = wins + coalesce(p_wins_delta,0),
    losses = losses + coalesce(p_losses_delta,0),
    draws = draws + coalesce(p_draws_delta,0),
    points = points + coalesce(p_points_delta,0),
    last_played_at = now(),
    updated_at = now()
  where account_number = trim(p_account_number)
    and game_type = trim(p_game_type)
  returning * into v_row;

  if v_row.id is null then
    insert into public.game_stats(
      account_number, game_type, games_played, wins, losses, draws, points, last_played_at, updated_at
    ) values (
      trim(p_account_number), trim(p_game_type),
      coalesce(p_games_played_delta,0), coalesce(p_wins_delta,0), coalesce(p_losses_delta,0),
      coalesce(p_draws_delta,0), coalesce(p_points_delta,0), now(), now()
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.rak_record_game_stat_delta(text, text, integer, integer, integer, integer, integer) to anon, authenticated;

comment on function public.rak_record_game_stat_delta(text, text, integer, integer, integer, integer, integer) is 'RaK v811: constrained RPC scaffold for game_stats writes. Direct INSERT/UPDATE policies stay temporarily for compatibility.';;
