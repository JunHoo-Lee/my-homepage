-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Tags Table (Pool)
create table tags (
  name text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tasks Table
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  memo text,
  is_new boolean default true,
  priority text check (priority in ('High', 'Medium', 'Low')),
  due_date timestamp with time zone,
  tags text[] default '{}',
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Papers Table
create table papers (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  authors text,
  link text,
  status text check (status in ('unread', 'reading', 'read')),
  memo text,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Simple: Allow anon to read/write because we protect the UI with Middleware)
-- In a real production app with multiple users, we would use Supabase Auth.
-- Here we trust the client (which is protected by our app's auth).

alter table tags enable row level security;
alter table tasks enable row level security;
alter table papers enable row level security;

create policy "Allow all access to tags" on tags for all using (true) with check (true);
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to papers" on papers for all using (true) with check (true);

-- Insert some initial tags
insert into tags (name) values ('AI'), ('Diffusion'), ('LLM'), ('Theory'), ('Personal') on conflict do nothing;
