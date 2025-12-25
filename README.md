# 🏛️ JangHup - Système de Gestion Universitaire ESP

## 🛠️ Configuration de la Base de Données (Supabase)

Exécutez ce script dans l'éditeur SQL de Supabase. Il configure les emails de diffusion pour le partage et les outils de suivi.

### Script SQL Master (Version 1.1 - Complet)

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

-- 3. CLASSES ET EMAILS DE DIFFUSION (Pour le partage par mail)
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  email text, -- Email de la liste de diffusion (ex: diti2@esp.sn)
  student_count integer DEFAULT 0,
  color text DEFAULT '#0ea5e9'
);

-- 4. CONTENU ACADÉMIQUE AVEC COMPTEURS DE PARTAGE
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

-- 5. SONDAGES ET VOTES
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  question text NOT NULL,
  classname text DEFAULT 'Général',
  is_active boolean DEFAULT true,
  share_count integer DEFAULT 0,
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

-- 6. SUPPORT ET AUDIT
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL, -- 'announcement' ou 'schedule'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  target text NOT NULL,
  type text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- 7. FONCTIONS SPÉCIALES (RPC)

-- Fonction pour incrémenter les partages (WhatsApp/Mail)
CREATE OR REPLACE FUNCTION increment_share_count(target_table text, target_id uuid)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE public.%I SET share_count = share_count + 1 WHERE id = %L', target_table, target_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de vote atomique
CREATE OR REPLACE FUNCTION cast_poll_vote(p_poll_id uuid, p_option_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.poll_votes WHERE poll_id = p_poll_id AND user_id = auth.uid();
  INSERT INTO public.poll_votes (poll_id, option_id, user_id) VALUES (p_poll_id, p_option_id, auth.uid());
  UPDATE public.poll_options SET votes = (SELECT count(*) FROM public.poll_votes WHERE option_id = public.poll_options.id) WHERE poll_id = p_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. POLITIQUES DE SÉCURITÉ (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces_Lecture_Global" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Annonces" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Examens" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Meet" ON public.meet_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acces_Lecture_Polls" ON public.polls FOR SELECT TO authenticated USING (true);
```

### 💡 Pourquoi ce script ?
1.  **Email de classe** : La table `classes` possède désormais un champ `email`. Remplissez-le (ex: `diti-l2-2024@esp.sn`) pour que le bouton "Partager par Email" sache à qui envoyer l'annonce.
2.  **Statistiques** : Le champ `share_count` permet de suivre l'engagement sur les annonces et examens.
3.  **Temps réel** : Les tables incluent les index nécessaires pour les abonnements temps réel de Supabase.
