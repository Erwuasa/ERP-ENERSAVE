-- Tipo de comisionado (%) por comercial — usado en reparto marco retributivo
alter table public.erp_comerciales
  add column if not exists commission_percentage numeric(5, 2) not null default 70;

update public.erp_comerciales set commission_percentage = 100 where id = 'usr-1';
update public.erp_comerciales set commission_percentage = 85 where id = 'usr-2';
update public.erp_comerciales set commission_percentage = 60 where id = 'usr-3';
update public.erp_comerciales set commission_percentage = 70 where id = 'usr-4';
update public.erp_comerciales set commission_percentage = 65 where id = 'usr-5';
update public.erp_comerciales set commission_percentage = 0 where id = 'usr-6';
