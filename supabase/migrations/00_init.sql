-- Create Users table (extends auth.users from Supabase)
CREATE TYPE user_role AS ENUM ('student', 'alumni', 'admin');

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'student',
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Profiles table
CREATE TABLE public.profiles (
  user_id UUID REFERENCES public.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  company TEXT,
  role TEXT,
  industry TEXT,
  tech_skills TEXT[] DEFAULT '{}',
  linkedin_url TEXT
);

-- Create Requests table
CREATE TYPE request_type AS ENUM ('mentorship', 'resume', 'referral');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'completed', 'declined', 'reviewing', 'referred', 'rejected');

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) NOT NULL,
  alumni_id UUID REFERENCES public.users(id) NOT NULL,
  type request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  message TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Policies for public.users
CREATE POLICY "Users can view their own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own record" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles can view any user role" ON public.users FOR SELECT USING (true);

-- Policies for public.profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Policies for public.requests
CREATE POLICY "Students can view their requests" ON public.requests FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Alumni can view requests sent to them" ON public.requests FOR SELECT USING (auth.uid() = alumni_id);
CREATE POLICY "Students can create requests" ON public.requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Alumni can update request status" ON public.requests FOR UPDATE USING (auth.uid() = alumni_id);

-- Create trigger to automatically create a public.user when an auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'student'); -- Default to student, can be updated during onboarding
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
