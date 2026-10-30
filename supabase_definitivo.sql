-- =====================================================================================
--  SUPABASE DEFINITIVO  ·  Un solo script para dejar una base de datos lista desde cero
-- =====================================================================================
--  CÓMO SE USA
--    1) Creá un proyecto nuevo en Supabase (uno por cliente).
--    2) Entrá a "SQL Editor" -> "New query", pegá TODO este archivo y apretá "Run".
--    3) Copiá la URL del proyecto y la clave "anon / publishable" en api.js (API_CREDENTIALS).
--
--  ATENCIÓN: este script BORRA las tablas products, settings y orders (con todos sus datos)
--  y las vuelve a crear. Usalo para empezar de cero o para reiniciar una base de pruebas.
--  Se puede ejecutar más de una vez.
--
--  SEGURIDAD: las políticas del final están ABIERTAS (modo demostración): cualquiera con la
--  clave pública puede leer y escribir. Antes de entregarle la tienda a un cliente, esa
--  sección se reemplaza por políticas cerradas junto con el login con Google del admin.
-- =====================================================================================

drop table if exists public.orders   cascade;
drop table if exists public.products cascade;
drop table if exists public.settings cascade;

-- -------------------------------------------------------------------------------------
-- 1) CONFIGURACIÓN DE LA TIENDA (una sola fila, con id = 1)
-- -------------------------------------------------------------------------------------
create table public.settings (
  id bigint primary key default 1 check (id = 1),
  "wizardCompleted" boolean,
  "selectedIndustryId" text,
  "variantPlaceholder" text,
  "storeName" text,
  "slogan" text,
  "announcement" text,
  "whatsapp" text,
  "currency" text,
  "primaryColor" text,
  "logoUrl" text,
  "bannerUrl" text,
  "shippingCost" numeric,
  "freeShippingThreshold" numeric,
  "transferDiscountPercent" numeric,
  "mpEnabled" boolean,
  "mpAliasOrLink" text,
  "couponCode" text,
  "couponPercent" numeric,
  "benefit1Title" text,
  "benefit1Desc" text,
  "benefit2Title" text,
  "benefit2Desc" text,
  "benefit3Title" text,
  "benefit3Desc" text,
  "storeStatusOpen" boolean,
  "businessHours" text,
  "businessAddress" text,
  "aboutUsText" text,
  "instagramUrl" text,
  "facebookUrl" text,
  "categories" jsonb,
  "payCashEnabled" boolean,
  "payTransferEnabled" boolean,
  "transferDetails" text,
  "pickupEnabled" boolean,
  "deliveryEnabled" boolean,
  "shippingZones" jsonb,
  "coordinateMode" boolean,
  "couponStart" text,
  "couponEnd" text,
  "couponMinPurchase" numeric,
  "discountStart" text,
  "discountEnd" text,
  "fontStyle" text,
  "cartIcon" text,
  "sellerLegalName" text,
  "sellerTaxId" text,
  "sellerEmail" text,
  "termsText" text,
  "variantsEnabled" boolean
);

-- La fila vacía: los valores que faltan los completa la tienda con sus valores por defecto
insert into public.settings (id) values (1);

-- -------------------------------------------------------------------------------------
-- 2) PRODUCTOS
--    stock         -> stock total (si hay talles/colores, es la suma de todos)
--    variants      -> nombres de las opciones, ej: ["M / Negro", "L / Negro"]
--    variantStock  -> stock de cada opción, ej: [{"label":"M / Negro","size":"M","color":"Negro","stock":3}]
-- -------------------------------------------------------------------------------------
create table public.products (
  id             bigint primary key,
  title          text        not null default '',
  category       text,
  price          numeric     not null default 0,
  "comparePrice" numeric              default 0,
  stock          numeric     not null default 0,
  active         boolean     not null default true,
  variants       jsonb       not null default '[]'::jsonb,
  "variantStock" jsonb       not null default '[]'::jsonb,
  description    text,
  image          text,
  "createdAt"    timestamptz not null default now()
);

-- -------------------------------------------------------------------------------------
-- 3) PEDIDOS
--    status          -> Pendiente, En preparación, Despachado, Entregado o Cancelado
--    stockDiscounted -> true cuando el stock del pedido ya se descontó (evita descontarlo dos veces)
-- -------------------------------------------------------------------------------------
create table public.orders (
  id                bigint primary key,
  date              text,
  "createdAt"       timestamptz not null default now(),
  status            text        not null default 'Pendiente',
  customer          text,
  phone             text,
  delivery          text,
  payment           text,
  total             numeric     not null default 0,
  items             jsonb       not null default '[]'::jsonb,
  "stockDiscounted" boolean     not null default false
);

create index orders_created_at_idx on public.orders ("createdAt" desc);

-- -------------------------------------------------------------------------------------
-- 4) POLÍTICAS DE ACCESO  (MODO DEMOSTRACIÓN: abiertas)
-- -------------------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;

create policy "demo_acceso_total_settings" on public.settings
  for all to anon, authenticated using (true) with check (true);

create policy "demo_acceso_total_products" on public.products
  for all to anon, authenticated using (true) with check (true);

create policy "demo_acceso_total_orders" on public.orders
  for all to anon, authenticated using (true) with check (true);

-- -------------------------------------------------------------------------------------
-- 5) OPCIONAL: DOS PRODUCTOS DE MUESTRA (borrá este bloque si querés empezar sin productos)
-- -------------------------------------------------------------------------------------
insert into public.products (id, title, category, price, "comparePrice", stock, active, variants, "variantStock", description, image) values
  (401, 'Producto Destacado de Muestra', 'Destacados', 28000, 35000, 12, true,
   '["Opción 1","Opción 2"]'::jsonb, '[]'::jsonb,
   'Podés editar este producto desde el panel Admin.',
   'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=80'),
  (402, 'Artículo en Oferta Especial', 'Ofertas', 19500, 24000, 5, true,
   '[]'::jsonb, '[]'::jsonb,
   'Incluye cálculo automático de porcentaje de descuento y control de stock.',
   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=80');

-- -------------------------------------------------------------------------------------
-- 6) Que Supabase reconozca las tablas y columnas nuevas enseguida
-- -------------------------------------------------------------------------------------
notify pgrst, 'reload schema';
