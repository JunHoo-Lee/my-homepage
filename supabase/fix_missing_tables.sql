-- Create Notes Table
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text,
  folder text,
  tags text[],
  linked_notes uuid[], -- references notes(id)
  linked_papers uuid[], -- references papers(id)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic RLS for Notes
alter table notes enable row level security;
create policy "Allow all access to notes" on notes for all using (true) with check (true);

-- Create Journal Table (if missing)
create table if not exists journal (
  id uuid default uuid_generate_v4() primary key,
  content text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic RLS for Journal
alter table journal enable row level security;
create policy "Allow all access to journal" on journal for all using (true) with check (true);
