
# 🏛️ JangHup - Système de Gestion Universitaire ESP

## 🛠️ Installation & Réparation de la Base de Données (Supabase)

Si l'application rencontre des erreurs RLS, des problèmes de vote bloqués à 0% ou des profils manquants, exécutez le script SQL suivant dans l'éditeur SQL de votre interface Supabase.

### Master Fix SQL Script

```sql
-- 1. Autoriser les extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Configuration des Votes (Correction Bug 0%)
CREATE OR REPLACE FUNCTION cast_poll_vote(p_poll_id uuid, p_option_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.poll_votes WHERE poll_id = p_poll_id AND user_id = auth.uid();
  INSERT INTO public.poll_votes (poll_id, option_id, user_id) VALUES (p_poll_id, p_option_id, auth.uid());
  UPDATE public.poll_options 
  SET votes = (SELECT count(*) FROM public.poll_votes WHERE option_id = public.poll_options.id)
  WHERE poll_id = p_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger d'auto-profiling (Évite l'écran blanc après login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, classname)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email, 'STUDENT', 'Général');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Sécurité RLS Globale
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select" ON public.profiles;
CREATE POLICY "Public select" ON public.profiles FOR SELECT TO authenticated USING (true);
```

## 🔒 Règles de Sécurité
- Seuls les **ADMINS** et **DÉLÉGUÉS** peuvent publier des annonces ou créer des sondages.
- Les **ÉTUDIANTS** peuvent voter, voir les notes et les plannings.
- Personne ne peut modifier les données d'un autre utilisateur (sauf ADMIN).

## 🚀 Performance SRE
- Toutes les mutations passent par des fonctions **SECURITY DEFINER** pour garantir l'intégrité atomique des données.
- Utilisation de `supabase.auth.getUser()` dans le frontend pour une vérification JWT côté serveur.
