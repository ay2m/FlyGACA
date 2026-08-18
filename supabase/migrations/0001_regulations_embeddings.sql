-- Regulatory corpus vector store for the Captain Adel RAG service.
--
-- The docs-parser GitHub Action chunks each regulatory Markdown Part by section, embeds each chunk
-- with OpenAI text-embedding-3-small (1536 dims), and upserts the rows below. The RAG service reads
-- them via the match_regulations() RPC for grounded, citeable retrieval.
--
-- Apply with the Supabase CLI:  supabase db push   (or paste into the SQL editor).

create extension if not exists vector;

create table if not exists public.regulation_chunks (
  id           text primary key,                 -- stable: "<slug>::<section-ordinal>"
  slug         text not null,                     -- e.g. "part-91"
  part_num     integer not null,                  -- e.g. 91
  section      text not null,                     -- heading/section label for the chunk
  content      text not null,                     -- the chunk text that was embedded
  content_hash text not null,                     -- sha256 of content; lets the upserter skip no-ops
  embedding    vector(1536) not null,
  metadata     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create index if not exists regulation_chunks_slug_idx on public.regulation_chunks (slug);

-- Approximate nearest-neighbour index for cosine similarity. Tune `lists` to ~sqrt(rows) as the
-- corpus grows; run `analyze public.regulation_chunks;` after large upserts.
create index if not exists regulation_chunks_embedding_idx
  on public.regulation_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Similarity search RPC. Returns the closest chunks (cosine distance → similarity) above a floor.
create or replace function public.match_regulations(
  query_embedding vector(1536),
  match_count int default 8,
  similarity_threshold float default 0.0
)
returns table (
  id text,
  slug text,
  part_num integer,
  section text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.slug,
    c.part_num,
    c.section,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.regulation_chunks c
  where 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
