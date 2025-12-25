
# 🏛️ JangHup - Plateforme de Gestion ESP Dakar

## 🚀 Configuration Supabase (Vital)

Pour que l'authentification fonctionne et crée automatiquement le profil utilisateur, exécutez ce script SQL complet dans votre dashboard Supabase.

```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE PROFILES (Doit exister pour que login réussisse)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text,
  role text DEFAULT 'STUDENT',
  classname text DEFAULT 'Général',
  school_name text DEFAULT 'ESP DAKAR',
  theme_color text DEFAULT '#0ea5e9',
  created_at timestamptz DEFAULT now()
);

-- 3. FONCTION TRIGGER (S'exécute à chaque inscription)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, classname, school_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Utilisateur'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'STUDENT'),
    COALESCE(new.raw_user_meta_data->>'className', 'Général'),
    COALESCE(new.raw_user_meta_data->>'school_name', 'ESP DAKAR')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATTACHEMENT DU TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. TABLES SECONDAIRES
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  author text,
  classname text DEFAULT 'Général',
  priority text DEFAULT 'normal',
  date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  email text,
  student_count integer DEFAULT 0,
  color text DEFAULT '#0ea5e9'
);

-- 6. POLITIQUES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture_Profils" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture_Annonces" ON public.announcements FOR SELECT TO authenticated USING (true);
```
