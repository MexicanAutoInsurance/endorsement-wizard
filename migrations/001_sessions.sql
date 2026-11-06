create table if not exists endorsement_sessions (
  id text primary key,
  client_token text not null unique,
  status text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_link_sent_at timestamptz,
  client_submitted_at timestamptz
);

create index if not exists endorsement_sessions_updated_at_idx
  on endorsement_sessions (updated_at desc);

create index if not exists endorsement_sessions_client_token_idx
  on endorsement_sessions (client_token);
