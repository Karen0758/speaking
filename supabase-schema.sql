-- momo 的练习记录表。在 Supabase 后台 SQL Editor 里整段跑一次。
--
-- 只存元数据，不存转写正文，也不存 AI 复盘正文。
-- 用户自己上传的题目，只记 id 不记标题（标题是用户写的，算他的内容）。

create table if not exists public.practices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  local_id     text not null,              -- 浏览器本地那条记录的 id，用来两边去重
  card_id      text not null,
  card_title   text,                       -- 只对内置题填；自己上传的题留空
  is_custom    boolean default false,
  relation     text,
  act          text,
  domain       text,
  difficulty   text,
  secs         integer not null,
  chars        integer not null,
  fillers      jsonb default '{}'::jsonb,  -- {"然后":3,"就是":5}
  scores       jsonb,                      -- {"结构":7,...}，没接 AI 时为 null
  has_ai       boolean default false,
  practiced_at timestamptz not null,
  created_at   timestamptz default now(),
  unique (user_id, local_id)
);

alter table public.practices enable row level security;

-- 每个人只能读写自己的行。前端用的 anon key 是公开的，
-- 数据隔离完全靠这条策略，不要删。
drop policy if exists "只能碰自己的记录" on public.practices;
create policy "只能碰自己的记录" on public.practices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists practices_user_time_idx
  on public.practices (user_id, practiced_at desc);


-- ── 下面是给你自己看数据用的，前端不会调 ──────────────────

-- 哪些题被练得最多、平均讲多久、平均分多少
create or replace view public.stat_cards as
select card_id,
       max(card_title)                         as title,
       max(relation)                           as relation,
       max(difficulty)                         as difficulty,
       count(*)                                as 练习次数,
       count(distinct user_id)                 as 练过的人数,
       round(avg(secs))                        as 平均秒数,
       round(avg(chars))                       as 平均字数,
       round(avg((scores->>'内容')::numeric),1) as 内容均分
from public.practices
where is_custom = false
group by card_id
order by 练习次数 desc;

-- 每个人练了多少、跨了多少天
create or replace view public.stat_users as
select user_id,
       count(*)                             as 练习次数,
       count(distinct date(practiced_at))   as 练习天数,
       min(practiced_at)                    as 第一次,
       max(practiced_at)                    as 最近一次,
       round(avg(secs))                     as 平均秒数
from public.practices
group by user_id
order by 练习次数 desc;

-- 口癖有没有随练习次数下降：每个人第 n 次练习的口癖密度
create or replace view public.stat_fillers as
select user_id,
       row_number() over (partition by user_id order by practiced_at) as 第几次,
       secs,
       (select coalesce(sum((value)::int), 0) from jsonb_each_text(fillers)) as 口癖总数,
       round((select coalesce(sum((value)::int), 0) from jsonb_each_text(fillers))
             / greatest(secs, 1)::numeric * 60, 1) as 每分钟口癖
from public.practices;
