-- Enable pgvector extension and add FAQ embeddings table
create extension if not exists vector;

create table if not exists faq_embeddings (
  id bigserial primary key,
  question text not null,
  answer text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists faq_embeddings_embedding_idx on faq_embeddings
  using ivfflat (embedding vector_l2_ops) with (lists = 100);

create or replace function match_faq(
  query_embedding vector(1536),
  match_count int default 1
) returns table(id bigint, question text, answer text, distance float)
language sql stable as $$
  select id, question, answer, embedding <=> query_embedding as distance
  from faq_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;
