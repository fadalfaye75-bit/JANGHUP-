# 🏛️ JangHup - Système de Gestion Universitaire ESP

## 🛠️ Configuration de la Base de Données (Supabase)

Exécutez ce script dans l'éditeur SQL de Supabase pour initialiser ou réparer votre instance. Ce script est optimisé pour la version sans messagerie ni relevés de notes.

### Script SQL Master (Noyau Académique)

```sql
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES PRINCIPALES
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

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  author text,
  priority text DEFAULT 'normal',
  classname text DEFAULT 'Général',
  links jsonb DEFAULT '[]',
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
  classname text DEFAULT 'Général'
);

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  question text NOT NULL,
  classname text DEFAULT 'Général',
  is_active boolean DEFAULT true,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  votes integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  email text,
  student_count integer DEFAULT 0,
  color text DEFAULT '#0ea5e9'
);

CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  classname text NOT NULL,
  day integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  subject text NOT NULL,
  teacher text,
  room text,
  color text
);

-- 3. FONCTION DE VOTE (CORE LOGIC)
CREATE OR REPLACE FUNCTION cast_poll_vote(p_poll_id uuid, p_option_id uuid)
RETURNS void AS $$
BEGIN
  -- Supprimer le vote précédent de l'utilisateur pour ce sondage
  DELETE FROM public.poll_votes WHERE poll_id = p_poll_id AND user_id = auth.uid();
  -- Insérer le nouveau vote
  INSERT INTO public.poll_votes (poll_id, option_id, user_id) VALUES (p_poll_id, p_option_id, auth.uid());
  -- Recalculer les totaux pour toutes les options du sondage
  UPDATE public.poll_options 
  SET votes = (SELECT count(*) FROM public.poll_votes WHERE option_id = public.poll_options.id)
  WHERE poll_id = p_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. AUTOMATISATION DES PROFILS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, classname)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Étudiant ESP'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'STUDENT'), 
    COALESCE(new.raw_user_meta_data->>'className', 'Général')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SÉCURITÉ RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture publique annonces" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture publique examens" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture publique sondages" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture publique options" ON public.poll_options FOR SELECT TO authenticated USING (true);
```

## 🔒 Règles Métier
- **Annonces & Examens** : Création réservée aux `ADMIN` et `DELEGATE`.
- **Sondages** : Tout étudiant peut voter (1 vote unique par personne géré par la base).
- **Planning** : Édition limitée aux délégués de leur propre section.

## 🚀 Performance
- Toutes les requêtes de vote sont **atomiques** via RPC pour éviter les désynchronisations de compteurs.
- Les profils sont injectés immédiatement après validation de l'email.
