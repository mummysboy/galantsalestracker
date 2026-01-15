-- ============================================
-- User Profile Management SQL Scripts
-- Run these in Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE A USER PROFILE
-- ============================================
-- Replace 'user-uuid-here' with the actual user ID from auth.users
-- Replace 'username' with the desired username
-- Replace ARRAY['admin'] with desired groups (or ARRAY[] for no groups)

INSERT INTO user_profiles (id, username, groups)
VALUES (
  'user-uuid-here',           -- Replace with actual user ID
  'johndoe',                  -- Replace with desired username
  ARRAY['admin']              -- Replace with groups: ARRAY['admin'], ARRAY[], etc.
)
ON CONFLICT (id) DO UPDATE 
SET 
  username = EXCLUDED.username,
  groups = EXCLUDED.groups,
  updated_at = NOW();

-- ============================================
-- 2. MAKE A USER AN ADMIN
-- ============================================
-- Replace 'user-uuid-here' with the actual user ID

UPDATE user_profiles
SET 
  groups = ARRAY['admin'],
  updated_at = NOW()
WHERE id = 'user-uuid-here';

-- If the profile doesn't exist, create it:
INSERT INTO user_profiles (id, username, groups)
VALUES (
  'user-uuid-here',
  'admin',                    -- Replace with username or email prefix
  ARRAY['admin']
)
ON CONFLICT (id) DO UPDATE 
SET groups = ARRAY['admin'], updated_at = NOW();

-- ============================================
-- 3. VIEW ALL USER PROFILES
-- ============================================

SELECT 
  up.id,
  up.username,
  up.groups,
  au.email,
  au.created_at as user_created_at,
  up.created_at as profile_created_at,
  up.updated_at as profile_updated_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- ============================================
-- 4. VIEW USERS WITHOUT PROFILES
-- ============================================

SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- ============================================
-- 5. CREATE PROFILES FOR ALL USERS WITHOUT ONE
-- ============================================
-- This will create profiles for all users who don't have one yet
-- Username will be derived from email (part before @)

INSERT INTO user_profiles (id, username, groups)
SELECT 
  au.id,
  SPLIT_PART(au.email, '@', 1) as username,  -- Extract username from email
  ARRAY[]::TEXT[] as groups                   -- Empty groups array
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. UPDATE USERNAME FOR A SPECIFIC USER
-- ============================================

UPDATE user_profiles
SET 
  username = 'newname',
  updated_at = NOW()
WHERE id = 'user-uuid-here';

-- ============================================
-- 7. ADD A GROUP TO A USER (without removing existing groups)
-- ============================================

UPDATE user_profiles
SET 
  groups = array_append(groups, 'manager'),  -- Add 'manager' to groups
  updated_at = NOW()
WHERE id = 'user-uuid-here'
  AND NOT ('manager' = ANY(groups));         -- Only if not already in groups

-- ============================================
-- 8. REMOVE A GROUP FROM A USER
-- ============================================

UPDATE user_profiles
SET 
  groups = array_remove(groups, 'manager'),  -- Remove 'manager' from groups
  updated_at = NOW()
WHERE id = 'user-uuid-here';

-- ============================================
-- 9. FIND USER BY EMAIL AND CREATE/UPDATE PROFILE
-- ============================================
-- Replace 'user@example.com' with the actual email

INSERT INTO user_profiles (id, username, groups)
SELECT 
  au.id,
  SPLIT_PART(au.email, '@', 1) as username,
  ARRAY['admin'] as groups
FROM auth.users au
WHERE au.email = 'user@example.com'
ON CONFLICT (id) DO UPDATE 
SET 
  groups = ARRAY['admin'],
  updated_at = NOW();

-- ============================================
-- 10. BULK UPDATE: MAKE ALL EXISTING USERS ADMINS
-- ============================================
-- ⚠️ WARNING: This makes ALL users admins. Use with caution!

UPDATE user_profiles
SET 
  groups = ARRAY['admin'],
  updated_at = NOW();

-- ============================================
-- QUICK REFERENCE: Common Operations
-- ============================================

-- Find a user's ID by email:
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Create admin profile for user by email:
INSERT INTO user_profiles (id, username, groups)
SELECT id, SPLIT_PART(email, '@', 1), ARRAY['admin']
FROM auth.users WHERE email = 'user@example.com'
ON CONFLICT (id) DO UPDATE SET groups = ARRAY['admin'], updated_at = NOW();

-- Check if a user is admin:
SELECT id, username, 'admin' = ANY(groups) as is_admin
FROM user_profiles WHERE id = 'user-uuid-here';

-- List all admins:
SELECT up.id, up.username, au.email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE 'admin' = ANY(up.groups);
