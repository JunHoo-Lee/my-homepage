-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Tags Table (Pool)
drop table if exists tags cascade;
create table tags (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  usage_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tasks Table
drop table if exists tasks cascade;
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  memo text,
  is_new boolean default true,
  priority text, -- AI auto-determines: 'High', 'Medium', 'Low'
  due_date date, -- Display only
  tags text[], -- Array of tag names or UUIDs? User said "tags[]", usually text array is easier for display, but UUID array is better for ref integrity. The prompt implies "tags: AI suggests from existing pool", "tags[]: AI auto-generates".
               -- Usage in Schema request: "tags TEXT[]". So we stick to text array of names for simplicity as per request.
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Papers Table
drop table if exists papers cascade;
create table papers (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  authors text,
  link text,
  status text default 'unread' check (status in ('unread', 'reading', 'read')),
  memo text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Notes Table
drop table if exists notes cascade;
create table notes (
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

-- 5. Journal Table
drop table if exists journal cascade;
create table journal (
  id uuid default uuid_generate_v4() primary key,
  content text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table tags enable row level security;
alter table tasks enable row level security;
alter table papers enable row level security;
alter table notes enable row level security;
alter table journal enable row level security;

-- Simple wide-open policies (protected by middleware/API auth)
create policy "Allow all access to tags" on tags for all using (true) with check (true);
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to papers" on papers for all using (true) with check (true);
create policy "Allow all access to notes" on notes for all using (true) with check (true);
create policy "Allow all access to journal" on journal for all using (true) with check (true);

-- Initial Tags
insert into tags (name, usage_count) values 
('AI', 0), ('Diffusion', 0), ('LLM', 0), ('Theory', 0), ('Personal', 0)
on conflict (name) do nothing;
