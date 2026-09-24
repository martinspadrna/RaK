alter table public.gomoku_wins
  add column if not exists ruleset_version text;

update public.gomoku_wins
set ruleset_version = coalesce(ruleset_version, 'gomoku-ai-rules-v1')
where ruleset_version is null;

create index if not exists gomoku_wins_ruleset_created_idx
on public.gomoku_wins (ruleset_version, created_at desc);

notify pgrst, 'reload schema';;
