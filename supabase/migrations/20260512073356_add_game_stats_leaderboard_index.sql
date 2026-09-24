create index if not exists game_stats_leaderboard_idx on public.game_stats (game_type, points desc, updated_at desc);
create index if not exists game_stats_top_scores_idx on public.game_stats (game_type, points desc, wins desc);;
