alter table public.gomoku_wins
add column if not exists elapsed_ms integer,
add column if not exists elapsed_text text,
add column if not exists x_moves integer,
add column if not exists o_moves integer;;
