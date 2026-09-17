-- Repair: storage upload policies must not query profiles inline.
--
-- Symptom: uploading a product image or video from the admin form fails with
-- "new row violates row-level security policy", even for a genuine admin.
--
-- Cause: the product-images policies (20260812000000_product_store.sql) and the
-- product-videos policies (20260918000000_product_media.sql) both gated on
--
--     exists (select 1 from public.profiles p
--             where p.id = auth.uid() and p.role = 'admin')
--
-- A subquery inside a policy is itself subject to the target table's RLS. Once
-- 20260611010000_rls_tighten.sql restricted public.profiles, that subquery
-- became dependent on the profiles policies resolving for the calling user, and
-- when it returns no rows the upload is denied with no useful error.
--
-- That same migration added public.is_admin() (SECURITY DEFINER, stable) for
-- exactly this reason, and said so: "A profiles SELECT policy that queried
-- profiles inline would recurse infinitely under RLS; is_admin() runs as the
-- function owner and bypasses that." The storage policies predate that rule and
-- never adopted it. This brings all six into line, for both buckets, so images
-- and videos cannot drift apart again.
--
-- Both buckets are public, so anonymous SELECT comes from the bucket itself and
-- needs no policy here -- only writes are gated.
--
-- If any statement fails with an ownership error on storage.objects, create the
-- same policies through Dashboard -> Storage -> Policies instead.

-- ---------------------------------------------------------------- images
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------- videos
drop policy if exists "Admins can upload product videos" on storage.objects;
create policy "Admins can upload product videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-videos' and public.is_admin());

drop policy if exists "Admins can update product videos" on storage.objects;
create policy "Admins can update product videos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-videos' and public.is_admin());

drop policy if exists "Admins can delete product videos" on storage.objects;
create policy "Admins can delete product videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-videos' and public.is_admin());
