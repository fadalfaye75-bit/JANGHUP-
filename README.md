
# 🏛️ JangHup - Système de Gestion Universitaire ESP

## 🛠️ Configuration de la Base de Données (Supabase)

Exécutez ce script dans l'éditeur SQL de Supabase. Il contient les tables, les fonctions RPC et le **Trigger** crucial pour la connexion.

### Script SQL Master (Version 1.2)

```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES DE BASE
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

-- 3. TRIGGER : CREATION AUTOMATIQUE DE PROFIL (VITAL)
-- Ce trigger s'exécute chaque fois qu'un utilisateur s'inscrit via Supabase Auth
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

-- Supprimer si existe déjà pour éviter les doublons lors des tests
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. AUTRES TABLES
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  email text,
  student_count integer DEFAULT 0,
  color text DEFAULT '#0ea5e9'
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  author text,
  priority text DEFAULT 'normal',
  classname text DEFAULT 'Général',
  links jsonb DEFAULT '[]',
  share_count integer DEFAULT 0,
  date timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  subject text NOT NULL,
  date timestamptz NOT NULL,
  duration text,
  room text,
  notes text,
  share_count integer DEFAULT 0,
  classname text DEFAULT 'Général'
);

CREATE TABLE IF NOT EXISTS public.meet_links (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  time text NOT NULL,
  classname text DEFAULT 'Général',
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces_Lecture_Global" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Annonces" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Examens" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Meet" ON public.meet_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Classes" ON public.classes FOR SELECT TO authenticated USING (true);
```

### 💡 Pourquoi ça ne marchait pas ?
1.  **Le Trigger** : Sans la fonction `handle_new_user` dans Supabase, vous pouviez vous "inscrire" (Auth), mais la table `profiles` restait vide. Du coup, quand vous tentiez de vous connecter, l'application disait que l'utilisateur n'existait pas (car elle ne trouvait pas de nom ou de rôle associé à l'ID).
2.  **Email confirmation** : Par défaut, Supabase demande une confirmation par email. Si vous voulez tester tout de suite, désactivez **"Confirm email"** dans `Authentication > Settings` sur votre dashboard Supabase.
