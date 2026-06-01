-- Adds richer persona attributes shown on persona cards (beyond the base spec schema).
alter table personas add column if not exists experience_years integer;
alter table personas add column if not exists device_preference text;
