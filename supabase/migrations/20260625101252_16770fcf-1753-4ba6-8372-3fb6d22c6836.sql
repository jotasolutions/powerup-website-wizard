
DROP POLICY IF EXISTS "Cualquiera puede crear un alta" ON public.altas;
DROP POLICY IF EXISTS "Cualquiera puede actualizar un alta por id" ON public.altas;
REVOKE INSERT, UPDATE, SELECT ON public.altas FROM anon;
REVOKE INSERT, UPDATE, SELECT ON public.altas FROM authenticated;
-- Solo service_role (usado por server functions con supabaseAdmin) puede tocar la tabla.
