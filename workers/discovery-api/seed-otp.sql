-- Tabla para OTP codes (correr en Supabase SQL Editor)

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

create index idx_otp_email on otp_codes(email, code);

alter table otp_codes enable row level security;
