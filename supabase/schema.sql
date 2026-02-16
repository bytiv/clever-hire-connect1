-- =============================================================================
-- Clever Hire Connect — Full Database Schema
-- Run this in Supabase SQL Editor to set up the database from scratch.
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- Profiles (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  user_type   TEXT NOT NULL CHECK (user_type IN ('jobseeker', 'hr')),
  company     TEXT,
  position    TEXT,
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  company      TEXT NOT NULL,
  location     TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary       TEXT,
  description  TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  posted_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Applications
CREATE TABLE IF NOT EXISTS public.applications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  cover_letter        TEXT,
  ats_score           REAL,
  predicted_category  TEXT,
  confidence_score    REAL,
  ats_calculated_at   TIMESTAMPTZ,
  applied_at          TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate applications
  UNIQUE(job_id, user_id)
);

-- Resumes (metadata — actual files live in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.resumes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Saved Jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id   UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(job_id, user_id)
);

-- Profile Views (analytics)
CREATE TABLE IF NOT EXISTS public.profile_views (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at       TIMESTAMPTZ DEFAULT now()
);

-- User Skills
CREATE TABLE IF NOT EXISTS public.user_skills (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill   TEXT NOT NULL,

  UNIQUE(user_id, skill)
);

-- =============================================================================
-- 2. VIEW — HR Applications (denormalized for easy querying)
-- =============================================================================

CREATE OR REPLACE VIEW public.hr_applications_view AS
SELECT
  a.id               AS application_id,
  a.job_id,
  a.user_id,
  a.status,
  a.applied_at,
  a.cover_letter,
  a.ats_score,
  a.predicted_category,
  a.confidence_score,
  a.ats_calculated_at,
  j.title            AS job_title,
  j.company          AS job_company,
  j.location         AS job_location,
  j.type             AS job_type,
  j.salary           AS job_salary,
  j.description      AS job_description,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.company          AS applicant_company,
  p.position         AS applicant_position,
  r.file_name        AS resume_file_name,
  r.file_path        AS resume_file_path,
  r.uploaded_at       AS resume_uploaded_at
FROM public.applications a
  JOIN public.jobs     j ON j.id = a.job_id
  JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN LATERAL (
    SELECT file_name, file_path, uploaded_at
    FROM public.resumes
    WHERE user_id = a.user_id
    ORDER BY uploaded_at DESC
    LIMIT 1
  ) r ON true;

-- =============================================================================
-- 3. TRIGGER — Auto-create profile row on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, user_type, company, position, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'firstName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'lastName', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'userType', 'jobseeker'),
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'position',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills  ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- JOBS
CREATE POLICY "Anyone can view jobs"
  ON public.jobs FOR SELECT
  USING (true);

CREATE POLICY "HR users can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "HR users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "HR users can delete own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = posted_by);

-- APPLICATIONS
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT posted_by FROM public.jobs WHERE id = job_id
    )
  );

CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Application status can be updated by applicant or job poster"
  ON public.applications FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT posted_by FROM public.jobs WHERE id = job_id
    )
  );

-- RESUMES
CREATE POLICY "Users can view own resumes"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON public.resumes FOR DELETE
  USING (auth.uid() = user_id);

-- SAVED JOBS
CREATE POLICY "Users can view own saved jobs"
  ON public.saved_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON public.saved_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
  ON public.saved_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- PROFILE VIEWS
CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = viewed_user_id);

CREATE POLICY "Authenticated users can log views"
  ON public.profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_user_id);

-- USER SKILLS
CREATE POLICY "Anyone can view skills"
  ON public.user_skills FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own skills"
  ON public.user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON public.user_skills FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 5. STORAGE — Resume bucket
-- =============================================================================

-- Create the resumes storage bucket (run only once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- 6. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON public.jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
