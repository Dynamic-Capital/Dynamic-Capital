alter table if exists public.faq_embeddings
  add column if not exists language text not null default 'en';

create or replace function public.match_faq(
  query_embedding vector(1536),
  match_count int default 1,
  match_language text default null
) returns table(
  id bigint,
  question text,
  answer text,
  language text,
  distance float
) language sql stable as $$
  select id, question, answer, language, embedding <=> query_embedding as distance
  from public.faq_embeddings
  where match_language is null or language = match_language
  order by embedding <=> query_embedding
  limit match_count;
$$;

drop function if exists public.match_faq(vector(1536), int);

alter table if exists public.faq_embeddings
  alter column language drop default;
