-- ==========================================
-- GESTIÓN ENERGÉTICA ERP - SUPABASE SCHEMA
-- ==========================================
-- Script SQL completo para configurar el cerebro del backend.
-- Ejecuta este script en el editor SQL (SQL Editor) de tu dashboard de Supabase.

-- 1. TIPOS ENUMERADOS
-- Creamos el enum de roles según la corrección del usuario (sin 'admin', solo superadmin y red comercial).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('superadmin', 'jefe_comercial', 'comercial');
    END IF;
END$$;

-- 2. TABLA DE PERFILES (profiles)
-- Se vincula directamente a auth.users de Supabase para almacenar la información extendida de cada usuario.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'comercial',
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitamos comentarios para documentar la estructura
COMMENT ON TABLE public.profiles IS 'Almacena perfiles de usuario vinculados con auth.users y su rol jerárquico de ventas';
COMMENT ON COLUMN public.profiles.manager_id IS 'Indica la relación jerárquica directa (¿quién es su jefe?)';
COMMENT ON COLUMN public.profiles.permissions IS 'JSON extensible para que superadmins puedan activar/desactivar módulos específicos';

-- 3. TABLA DE LIQUIDACIONES (liquidaciones)
-- Lleva el control financiero de comisiones internas y externas sobre la venta de energía (luz/gas).
CREATE TABLE IF NOT EXISTS public.liquidaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comercial_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    monto_interno NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_interno >= 0),
    monto_externo NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_externo >= 0),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    tipo TEXT NOT NULL CHECK (tipo IN ('luz', 'gas')),
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.liquidaciones IS 'Registro de comisiones brutas recibidas por la empresa vs a liquidar al equipo';

-- 4. FUNCIÓN PARA LLENADO AUTOMÁTICO DE UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para mantener actualizados los campos de auditoría
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_liquidaciones_updated_at ON public.liquidaciones;
CREATE TRIGGER trigger_liquidaciones_updated_at
    BEFORE UPDATE ON public.liquidaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- 5. CONFIGURACIÓN DE SEGURIDAD RLS (Row Level Security)
-- Activamos RLS en todas las tablas críticas para blindar el acceso directo desde el cliente.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;

-- Helper function: Permite obtener el rol de un usuario autenticado de forma rápida y cachada
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- =======================================================
-- POLÍTICAS CONTROL DE ACCESO (RLS): TABLA `profiles`
-- =======================================================

-- POLÍTICA 1: Superadministrador tiene control absoluto
CREATE POLICY "Superadmin tiene control total de profiles" 
ON public.profiles
FOR ALL 
TO authenticated
USING (
    (SELECT public.get_auth_role()) = 'superadmin'
)
WITH CHECK (
    (SELECT public.get_auth_role()) = 'superadmin'
);

-- POLÍTICA 2: Jefe Comercial puede leer su perfil e integrantes de su equipo
CREATE POLICY "Jefe Comercial puede leer miembros de su equipo"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR manager_id = auth.uid()
);

-- POLÍTICA 3: Jefe Comercial puede actualizar datos limitados de su equipo (p.ej.: permissions o manager_id no, pero sí verificación)
-- Opcional, pero para lectura estricta:
CREATE POLICY "Jefe Comercial puede actualizar perfiles que gestiona"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    manager_id = auth.uid()
)
WITH CHECK (
    manager_id = auth.uid()
);

-- POLÍTICA 4: Comercial solo puede leer y actualizar su propia información
CREATE POLICY "Comercial puede leer su propio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);

CREATE POLICY "Comercial solo puede actualizar su propio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
)
WITH CHECK (
    id = auth.uid()
);


-- =======================================================
-- POLÍTICAS CONTROL DE ACCESO (RLS): TABLA `liquidaciones`
-- =======================================================

-- POLÍTICA 1: Superadmin tiene control total
CREATE POLICY "Superadmin tiene control total de liquidaciones"
ON public.liquidaciones
FOR ALL
TO authenticated
USING (
    (SELECT public.get_auth_role()) = 'superadmin'
);

-- POLÍTICA 2: Jefe Comercial puede leer comisiones de su red de comerciales a cargo
CREATE POLICY "Jefe Comercial lee comisiones del equipo"
ON public.liquidaciones
FOR SELECT
TO authenticated
USING (
    (SELECT public.get_auth_role()) = 'jefe_comercial' AND 
    comercial_id IN (SELECT id FROM public.profiles WHERE manager_id = auth.uid())
);

-- POLÍTICA 3: Comercial solo lee sus comisiones asignadas
CREATE POLICY "Comercial lee sus propias liquidaciones"
ON public.liquidaciones
FOR SELECT
TO authenticated
USING (
    comercial_id = auth.uid()
);


-- =======================================================
-- AUTOMATIZACIÓN - REGISTRO DE TRÍGGER DESDE AUTH.USERS
-- =======================================================
-- Cuando un comercial se registra mediante el formulario, el trigger crea
-- automáticamente su perfil en la base de datos de negocio con rol 'comercial'
-- de manera totalmente segura y tolerante de colisiones de IDs concurrentes.

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    default_full_name TEXT;
BEGIN
    -- Obtenemos el nombre completo desde las propiedades metadatos del usuario
    -- Si no existe, usamos una conversión amigable del correo de acceso
    default_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        SPLIT_PART(new.email, '@', 1)
    );

    -- Insertamos el perfil con manejo de duplicados para evitar fallos catastróficos en reintentos
    INSERT INTO public.profiles (id, full_name, role, manager_id, permissions)
    VALUES (
        new.id,
        default_full_name,
        'comercial', -- Rol por defecto obligatorio
        NULL,
        '{"contracts_view": true, "comparator_access": true}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Captura errores imprevistos registrándolos en log para que no bloqueen la creación de la cuenta en auth
        RAISE WARNING 'Fallo en trigger handle_new_user_signup para usuario %: %', new.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Creamos el trigger sobre la base de autenticación auth.users de Supabase
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();
