-- RaK v1.5(821) / Faze 2E-E: RPC scaffold for profile UI settings stored in game_stats as __profile_ui.
-- Existing INSERT/UPDATE policies stay unchanged for compatibility.

create or replace function public.rak_save_game_ui_settings(
  p_account_number text,
  p_theme_index integer,
  p_background_index integer,
  p_points integer default null
)
returns public.game_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account text;
  v_theme integer;
  v_background integer;
  v_points integer;
  v_row public.game_stats;
begin
  v_account := trim(coalesce(p_account_number, ''));
  v_theme := coalesce(p_theme_index, 0);
  v_background := coalesce(p_background_index, 0);
  v_points := coalesce(p_points, (v_theme * 1000) + v_background);

  if length(v_account) < 2 or length(v_account) > 32 then
    raise exception 'invalid account_number';
  end if;
  if v_theme < 0 or v_theme > 999 then
    raise exception 'invalid theme_index';
  end if;
  if v_background < 0 or v_background > 999 then
    raise exception 'invalid background_index';
  end if;
  if v_points < 0 or v_points > 999999 then
    raise exception 'invalid points';
  end if;

  update public.game_stats
  set
    games_played = 0,
    wins = v_theme,
    losses = v_background,
    draws = 0,
    points = v_points,
    last_played_at = now(),
    updated_at = now()
  where account_number = v_account
    and game_type = '__profile_ui'
  returning * into v_row;

  if v_row.id is null then
    insert into public.game_stats(
      account_number, game_type, games_played, wins, losses, draws, points, last_played_at, updated_at
    ) values (
      v_account, '__profile_ui', 0, v_theme, v_background, 0, v_points, now(), now()
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.rak_save_game_ui_settings(text, integer, integer, integer) to anon, authenticated;

comment on function public.rak_save_game_ui_settings(text, integer, integer, integer) is 'RaK v821: constrained RPC scaffold for __profile_ui settings stored in game_stats. Direct INSERT/UPDATE kept temporarily for compatibility.';
comment on table public.game_stats is 'RaK v821: __profile_ui records can use rak_save_game_ui_settings RPC; direct INSERT/UPDATE temporarily kept until mobile/profile smoke is confirmed.';;
