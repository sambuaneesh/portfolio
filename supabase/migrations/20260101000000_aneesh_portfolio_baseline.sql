-- ============================================================================
-- Aneesh Sambu - Portfolio: baseline schema
--
-- This project shares a Supabase instance with other apps, so EVERY table
-- is prefixed with `aneesh_` to avoid any collision. Nothing outside the
-- `aneesh_` namespace is created, read, or dropped by this migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger function (namespaced like everything else).
-- ----------------------------------------------------------------------------
create or replace function public.aneesh_update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- personal_info (single row)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_personal_info (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  bio text not null default '',
  location text,
  email text,
  phone text,
  website text,
  linkedin text,
  github text,
  medium text,
  codeforces text,
  instagram text,
  youtube text,
  twitter text,
  avatar_url text,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_personal_info enable row level security;

create policy "Aneesh personal info viewable by everyone"
  on public.aneesh_personal_info for select using (true);

create trigger aneesh_personal_info_updated_at
  before update on public.aneesh_personal_info
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_personal_info (
  name, title, bio, location, email, phone, website, linkedin, github, avatar_url, highlights
) values (
  'Aneesh Sambu',
  'Software Developer & Undergraduate Researcher',
  'I''m a B.Tech + MS by Research student in Computer Science at IIIT Hyderabad and an undergraduate researcher at SERC (Software Engineering Research Center). I love understanding how things work under the hood — I''ve built my own programming language, a Unix shell in C, a network file system, and a Google File System clone. Currently interning at Wells Fargo and publishing research on software architecture and LLMs.',
  'Hyderabad, India',
  'sambu.aneesh@research.iiit.ac.in',
  '+91 9030304583',
  'https://theboringblog.netlify.app',
  'https://www.linkedin.com/in/aneesh-sambu/',
  'https://github.com/sambuaneesh',
  'https://avatars.githubusercontent.com/u/75294086?v=4',
  '[
    {"icon": "Cpu", "title": "Systems Programming", "description": "Built interpreters, shells, network file systems and a Google File System clone from scratch to understand what happens under the hood."},
    {"icon": "GitBranch", "title": "SE Research", "description": "Undergraduate researcher at SERC, IIITH — presenting at IEEE ICSA 2026 (A-tier) on software architecture and LLMs."},
    {"icon": "Code2", "title": "Full-Stack Development", "description": "Building web applications with React, Node.js, Svelte, FastAPI and friends — from frontend polish to backend plumbing."},
    {"icon": "Network", "title": "Distributed Systems", "description": "Exploring distributed file systems, gRPC-based collaboration tools, and fault-tolerant architectures."}
  ]'::jsonb
);

-- ----------------------------------------------------------------------------
-- education
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_education (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  degree text not null,
  duration text not null,
  gpa text,
  location text,
  description text,
  coursework text[],
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_education enable row level security;

create policy "Aneesh education viewable by everyone"
  on public.aneesh_education for select using (true);

create trigger aneesh_education_updated_at
  before update on public.aneesh_education
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_education (institution, degree, duration, gpa, location, order_index) values
  ('International Institute of Information Technology, Hyderabad',
   'B.Tech + MS by Research in Computer Science and Engineering',
   '2023 — Expected May 2027', 'CGPA: 8.05', 'Hyderabad, India', 1),
  ('Neil Gogte Institute of Technology',
   'Bachelor of Engineering in Computer Science (transferred)',
   '2022 — May 2023', 'CGPA: 8.65 (3 semesters)', 'Hyderabad, India', 2);

-- ----------------------------------------------------------------------------
-- experience
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_experience (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  duration text not null,
  location text,
  description text[],
  technologies text[],
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_experience enable row level security;

create policy "Aneesh experience viewable by everyone"
  on public.aneesh_experience for select using (true);

create trigger aneesh_experience_updated_at
  before update on public.aneesh_experience
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_experience (title, company, duration, location, description, technologies, order_index) values
  ('Technology Program Intern', 'Wells Fargo', 'May 2026 — July 2026', 'Hyderabad, India',
   array['Working as a Technology Program Intern contributing to enterprise software development initiatives.'],
   array['Enterprise Software'], 1),
  ('Undergraduate Researcher', 'SERC, Software Engineering Research Center — IIITH', 'March 2024 — Present', 'IIITH, Hyderabad',
   array['Accepted to present a main track research paper at the 23rd IEEE ICSA 2026 (A-tier conference).',
         'Published a research paper at the SAGAI workshop co-located with the ICSA conference as one of the main authors.'],
   array['Software Engineering', 'LLMs', 'Research'], 2),
  ('Summer Intern', 'Smart City Living Lab — IIITH', 'May 2024 — July 2024', 'IIITH, Hyderabad',
   array['Worked on maintaining and developing features for the City IoT Operating Platform (ctOP).'],
   array['IoT', 'Full-Stack'], 3),
  ('Intern', 'VILS AI — IIITH', 'January 2024 — April 2024', 'IIITH, Hyderabad',
   array['Created a frontend interface for "HR-Buddy", an AI-powered talent management platform.'],
   array['React', 'Frontend'], 4);

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  github_url text,
  live_url text,
  image_url text,
  images text[],
  featured boolean default false,
  is_contributed boolean default false,
  stars integer,
  forks integer,
  language text,
  language_color text,
  tags text[],
  category text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_projects enable row level security;

create policy "Aneesh projects viewable by everyone"
  on public.aneesh_projects for select using (true);

create trigger aneesh_projects_updated_at
  before update on public.aneesh_projects
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_projects (title, description, github_url, live_url, language, language_color, stars, featured, order_index) values
  ('WhyPY',
   'A custom programming language built to understand the world of interpreters — implemented lexical analysis, parsing, and evaluation components from scratch to support the language''s functionality.',
   'https://github.com/sambuaneesh/why-py', 'https://why-py.vercel.app/', 'Python', '#3572A5', null, true, 1),
  ('Network File System',
   'A socket programming project that emulates a client-server relationship to enable operations on files — creating, editing, deleting, and transferring files, with automatic backups in case of server failure.',
   'https://github.com/sambuaneesh/Network-File-System', null, 'C', '#555555', null, true, 2),
  ('Custom GFS Implementation',
   'A custom implementation of the Google File System (GFS) built to understand distributed file system architectures, focusing on scalability, fault tolerance, and high aggregate performance across multiple storage servers.',
   'https://github.com/sambuaneesh/custom-gfs-implementation', null, 'Python', '#3572A5', null, true, 3),
  ('goLLab Editor',
   'A collaborative document editor utilizing a client-server architecture with gRPC for communication — multiple users can edit documents simultaneously with real-time synchronization.',
   'https://github.com/sambuaneesh/goLLab-editor', null, 'Go', '#00ADD8', null, true, 4),
  ('wyShell — Custom Shell',
   'A Unix-style shell implemented entirely from scratch in C, supporting standard shell functionality.',
   'https://github.com/sambuaneesh/wyShell', null, 'C', '#555555', null, false, 5),
  ('leetpremium',
   'Ok, let me be honest — I seriously opened LeetCode to practice DSA, but ended up building this instead.',
   'https://github.com/sambuaneesh/leetpremium', null, 'JavaScript', '#f1e05a', 21, false, 6),
  ('multi-audio-sink',
   'Human-friendly TUI for combining, routing, and managing PipeWire audio outputs on Linux.',
   'https://github.com/sambuaneesh/multi-audio-sink', null, 'Rust', '#dea584', 1, false, 7),
  ('agentic_decomposer',
   'Experiments in agentic decomposition — breaking down complex tasks for LLM-driven agents.',
   'https://github.com/sambuaneesh/agentic_decomposer', null, 'Python', '#3572A5', null, false, 8);

-- ----------------------------------------------------------------------------
-- skills
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  skill_name text not null,
  proficiency integer,
  icon_url text,
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_skills enable row level security;

create policy "Aneesh skills viewable by everyone"
  on public.aneesh_skills for select using (true);

create trigger aneesh_skills_updated_at
  before update on public.aneesh_skills
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_skills (category, skill_name, proficiency, order_index) values
  ('Languages', 'Python', 90, 1),
  ('Languages', 'C', 85, 2),
  ('Languages', 'C++', 80, 3),
  ('Languages', 'Golang', 75, 4),
  ('Languages', 'Java', 70, 5),
  ('Languages', 'JavaScript', 85, 6),
  ('Languages', 'TypeScript', 80, 7),
  ('Languages', 'SQL', 75, 8),
  ('Frameworks & Libraries', 'React', 85, 9),
  ('Frameworks & Libraries', 'Node.js', 80, 10),
  ('Frameworks & Libraries', 'Svelte', 70, 11),
  ('Frameworks & Libraries', 'FastAPI', 75, 12),
  ('Frameworks & Libraries', 'Express.js', 75, 13),
  ('Frameworks & Libraries', 'Selenium', 65, 14),
  ('Databases', 'MongoDB', 75, 15),
  ('Databases', 'PostgreSQL', 70, 16),
  ('Technologies & Tools', 'Git', 90, 17),
  ('Technologies & Tools', 'Docker', 70, 18),
  ('Technologies & Tools', 'gRPC', 75, 19),
  ('Technologies & Tools', 'Socket Programming', 80, 20),
  ('Technologies & Tools', 'REST APIs', 85, 21),
  ('Technologies & Tools', 'Distributed Systems', 75, 22);

-- ----------------------------------------------------------------------------
-- achievements
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date_achieved text,
  certificate_url text,
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_achievements enable row level security;

create policy "Aneesh achievements viewable by everyone"
  on public.aneesh_achievements for select using (true);

create trigger aneesh_achievements_updated_at
  before update on public.aneesh_achievements
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_achievements (title, description, certificate_url, order_index) values
  ('ICSA 2026 — Main Track Research Paper',
   'Accepted to present a main track research paper at the 23rd IEEE International Conference on Software Architecture (ICSA 2026), an A-tier venue.',
   'https://arxiv.org/pdf/2502.00689', 1),
  ('SAGAI Workshop Publication',
   'Published a research paper at the SAGAI workshop co-located with the ICSA conference as one of the main authors.',
   'https://arxiv.org/pdf/2502.00689', 2),
  ('2nd Place — HackIIIT',
   'Secured 2nd position in the annually held HackIIIT hackathon (regular track) at IIIT Hyderabad.',
   'https://blog.montycloud.com/blogs/montycloud-empowering-innovation-at-the-moya-hackathon', 3),
  ('Web-Admin, Clubs Council IIITH',
   'Worked as Web-Admin for the Clubs Council at IIIT Hyderabad.',
   'https://clubs.iiit.ac.in/profile/sambu.aneesh', 4),
  ('Author — The Boring Blog',
   'Author of "The Boring Blog," a personal blog.',
   'https://theboringblog.netlify.app/', 5);

-- ----------------------------------------------------------------------------
-- courses (relevant coursework only)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  institution text,
  completion_date text,
  certificate_url text,
  is_favorite boolean default false,
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_courses enable row level security;

create policy "Aneesh courses viewable by everyone"
  on public.aneesh_courses for select using (true);

create trigger aneesh_courses_updated_at
  before update on public.aneesh_courses
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_courses (name, description, institution, completion_date, is_favorite, order_index) values
  ('Design and Analysis of Software Systems', 'Grade: A', 'IIIT Hyderabad', 'Spring 2024', true, 1),
  ('Data Systems', 'Grade: A', 'IIIT Hyderabad', 'Spring 2026', true, 2),
  ('Machine Learning for Natural Sciences', 'Grade: A-', 'IIIT Hyderabad', 'Spring 2026', true, 3),
  ('Software Engineering', 'Grade: A-', 'IIIT Hyderabad', 'Spring 2025', true, 4),
  ('Algorithm Analysis & Design', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2023', false, 5),
  ('Operating Systems and Networks', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2023', false, 6),
  ('Automata Theory', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2023', false, 7),
  ('Data and Applications', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2023', false, 8),
  ('Probability and Statistics', 'Grade: C', 'IIIT Hyderabad', 'Monsoon 2023', false, 9),
  ('Data Visualisation', 'Grade: B', 'IIIT Hyderabad', 'Spring 2024', false, 10),
  ('Introduction to Information Security', 'Grade: B', 'IIIT Hyderabad', 'Spring 2024', false, 11),
  ('Computer Graphics', 'Grade: B-', 'IIIT Hyderabad', 'Spring 2024', false, 12),
  ('Machine, Data and Learning', 'Grade: C', 'IIIT Hyderabad', 'Spring 2024', false, 13),
  ('Music, Mind and Technology', 'Grade: B', 'IIIT Hyderabad', 'Spring 2024', false, 14),
  ('Distributed Systems', 'Grade: B-', 'IIIT Hyderabad', 'Monsoon 2024', false, 15),
  ('Principles of Programming Languages', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2024', false, 16),
  ('Compilers', 'Grade: B', 'IIIT Hyderabad', 'Spring 2025', false, 17),
  ('Statistical Methods in AI', 'Grade: B-', 'IIIT Hyderabad', 'Spring 2025', false, 18),
  ('Hydro Informatics', 'Grade: B-', 'IIIT Hyderabad', 'Spring 2025', false, 19),
  ('Advanced NLP', 'Grade: B', 'IIIT Hyderabad', 'Monsoon 2025', false, 20),
  ('Principles of Information Security', 'Grade: B', 'IIIT Hyderabad', 'Spring 2026', false, 21);

-- ----------------------------------------------------------------------------
-- languages
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_languages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null,
  proficiency integer not null default 50,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_languages enable row level security;

create policy "Aneesh languages viewable by everyone"
  on public.aneesh_languages for select using (true);

create trigger aneesh_languages_updated_at
  before update on public.aneesh_languages
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_languages (name, level, proficiency, order_index) values
  ('Telugu', 'Native', 100, 1),
  ('English', 'Fluent', 90, 2),
  ('Hindi', 'Conversational', 75, 3);

-- ----------------------------------------------------------------------------
-- site_settings (key/value)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.aneesh_site_settings enable row level security;

create policy "Aneesh site settings viewable by everyone"
  on public.aneesh_site_settings for select using (true);

create trigger aneesh_site_settings_updated_at
  before update on public.aneesh_site_settings
  for each row execute function public.aneesh_update_updated_at_column();

insert into public.aneesh_site_settings (key, value) values
  ('footer_text', '"Aneesh Sambu"'),
  ('footer_github_url', '"https://github.com/sambuaneesh/portfolio"'),
  ('auth_title', '"Admin Sign In"'),
  ('auth_description', '"This is Aneesh Sambu''s portfolio. Only authorized users can access admin features."'),
  ('admin_quick_links', '[]');

-- ----------------------------------------------------------------------------
-- admin_users (no RLS policies — service role only, via the Edge Function)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.aneesh_admin_users enable row level security;

-- ----------------------------------------------------------------------------
-- blog_posts / blog_likes / blog_comments
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null default '',
  excerpt text,
  external_link text,
  image_url text,
  images text[],
  tags text[],
  published boolean default false,
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_blog_posts enable row level security;

create policy "Published blog posts viewable by everyone"
  on public.aneesh_blog_posts for select
  using (published = true);

create trigger aneesh_blog_posts_updated_at
  before update on public.aneesh_blog_posts
  for each row execute function public.aneesh_update_updated_at_column();

create table if not exists public.aneesh_blog_likes (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid not null references public.aneesh_blog_posts(id) on delete cascade,
  user_id uuid,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  unique (blog_post_id, visitor_id)
);

alter table public.aneesh_blog_likes enable row level security;

create policy "Anyone can like a post"
  on public.aneesh_blog_likes for insert
  with check (visitor_id = (current_setting('request.headers', true)::json ->> 'x-visitor-id'));

create policy "Visitors can unlike their own likes"
  on public.aneesh_blog_likes for delete
  using (visitor_id = (current_setting('request.headers', true)::json ->> 'x-visitor-id'));

create table if not exists public.aneesh_blog_comments (
  id uuid primary key default gen_random_uuid(),
  blog_post_id uuid not null references public.aneesh_blog_posts(id) on delete cascade,
  parent_comment_id uuid references public.aneesh_blog_comments(id) on delete cascade,
  author_name text not null,
  author_email text,
  content text not null,
  is_approved boolean default true,
  user_id uuid,
  visitor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_blog_comments enable row level security;

create policy "Approved comments viewable by everyone"
  on public.aneesh_blog_comments for select
  using (is_approved = true);

create policy "Anyone can comment"
  on public.aneesh_blog_comments for insert
  with check (visitor_id = (current_setting('request.headers', true)::json ->> 'x-visitor-id'));

create policy "Visitors can delete their own comments"
  on public.aneesh_blog_comments for delete
  using (visitor_id = (current_setting('request.headers', true)::json ->> 'x-visitor-id'));

create trigger aneesh_blog_comments_updated_at
  before update on public.aneesh_blog_comments
  for each row execute function public.aneesh_update_updated_at_column();

-- ----------------------------------------------------------------------------
-- contact_messages (public insert, admin-only reads via Edge Function)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  status text default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_contact_messages enable row level security;

create policy "Anyone can submit a contact message"
  on public.aneesh_contact_messages for insert
  with check (true);

create trigger aneesh_contact_messages_updated_at
  before update on public.aneesh_contact_messages
  for each row execute function public.aneesh_update_updated_at_column();

-- ----------------------------------------------------------------------------
-- task_requests (public insert, admin-only reads via Edge Function)
-- ----------------------------------------------------------------------------
create table if not exists public.aneesh_task_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_email text not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text not null default 'project' check (category in ('academic', 'project', 'personal', 'work')),
  due_date date,
  due_time text,
  estimated_duration text,
  budget text,
  additional_notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aneesh_task_requests enable row level security;

create policy "Anyone can submit a task request"
  on public.aneesh_task_requests for insert
  with check (true);

create trigger aneesh_task_requests_updated_at
  before update on public.aneesh_task_requests
  for each row execute function public.aneesh_update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Storage: public bucket for admin-uploaded images/documents.
-- Uploads happen through the admin Edge Function (service role), so only a
-- public-read policy is needed here.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('aneesh-portfolio', 'aneesh-portfolio', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for aneesh portfolio" on storage.objects;
create policy "Public read access for aneesh portfolio"
  on storage.objects for select
  using (bucket_id = 'aneesh-portfolio');
