# User Profile Guide

This guide explains how to load and manage user profiles in the Sales Tracker application.

## Overview

User profiles are stored in the `user_profiles` table in Supabase and contain:
- `id` - User ID (references `auth.users.id`)
- `username` - Display username
- `groups` - Array of group names (e.g., `['admin']`)
- `created_at` - Profile creation timestamp
- `updated_at` - Last update timestamp

## Automatic Loading

User profiles are automatically loaded when a user logs in. The `App.tsx` component calls `loadUserMetadata()` which:

1. Fetches the user profile from `user_profiles` table
2. Extracts username and groups
3. Stores them in the auth state
4. Falls back to defaults if no profile exists

## Manual Loading

### Option 1: Using Supabase Service

```typescript
import { supabaseService } from './services/supabase';

// Load a user profile
const profile = await supabaseService.getUserProfile(userId);

if (profile) {
  console.log('Username:', profile.username);
  console.log('Groups:', profile.groups);
} else {
  console.log('No profile found');
}
```

### Option 2: Direct Supabase Query

```typescript
import { supabase } from './services/supabase';

const { data: profile, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (profile) {
  console.log('Username:', profile.username);
  console.log('Groups:', profile.groups);
}
```

## Creating/Updating User Profiles

### Create a New Profile

```typescript
import { supabaseService } from './services/supabase';

// Create or update a user profile
const profile = await supabaseService.createOrUpdateUserProfile(
  userId,
  'johndoe',  // username (optional)
  ['admin']   // groups (optional)
);
```

### Update User Groups (e.g., Make Admin)

```typescript
import { supabaseService } from './services/supabase';

// Update user groups
const profile = await supabaseService.updateUserGroups(
  userId,
  ['admin', 'manager']  // new groups array
);
```

### Using SQL Directly (Supabase Dashboard)

```sql
-- Create a user profile
INSERT INTO user_profiles (id, username, groups)
VALUES ('user-uuid-here', 'johndoe', ARRAY['admin'])
ON CONFLICT (id) DO UPDATE 
SET username = EXCLUDED.username, 
    groups = EXCLUDED.groups;

-- Make a user an admin
UPDATE user_profiles
SET groups = ARRAY['admin']
WHERE id = 'user-uuid-here';
```

## Common Use Cases

### 1. Make a User an Admin

**Via SQL (Supabase Dashboard):**
```sql
-- First, ensure the user profile exists
INSERT INTO user_profiles (id, username, groups)
VALUES ('user-uuid-here', 'admin', ARRAY['admin'])
ON CONFLICT (id) DO UPDATE SET groups = ARRAY['admin'];
```

**Via Code:**
```typescript
await supabaseService.createOrUpdateUserProfile(
  userId,
  'admin',
  ['admin']
);
```

### 2. Check if User is Admin

```typescript
import { supabaseService } from './services/supabase';

const profile = await supabaseService.getUserProfile(userId);
const isAdmin = profile?.groups?.includes('admin') || false;
```

### 3. Load Profile After User Creation

```typescript
// After creating a user in Supabase Auth
const { data: { user }, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

if (user) {
  // Create profile
  await supabaseService.createOrUpdateUserProfile(
    user.id,
    'username',
    []  // no groups initially
  );
}
```

## Profile Structure

```typescript
interface UserProfile {
  id: string;              // UUID matching auth.users.id
  username?: string;       // Display name (optional)
  groups: string[];        // Array of group names (e.g., ['admin'])
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

## Troubleshooting

### Profile Not Found

If `getUserProfile()` returns `null`:
1. Check that the `user_profiles` table exists (run migration)
2. Verify the user ID is correct
3. Create the profile using `createOrUpdateUserProfile()`

### Groups Not Working

If groups aren't being recognized:
1. Check that groups are stored as an array: `['admin']` not `'admin'`
2. Verify the group name matches exactly (case-sensitive)
3. Check that `loadUserMetadata()` is being called after login

### RLS Policy Issues

If you get permission errors:
1. Ensure RLS policies allow users to read their own profile
2. For admin operations, use service role key or backend API
3. Check Supabase Dashboard → Authentication → Policies

## Example: Complete User Setup

```typescript
import { supabase } from './services/supabase';
import { supabaseService } from './services/supabase';

async function setupNewUser(email: string, password: string, username: string, isAdmin: boolean = false) {
  // 1. Create user in Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(`Auth error: ${authError.message}`);
  }

  if (!user) {
    throw new Error('User creation failed');
  }

  // 2. Create user profile
  const groups = isAdmin ? ['admin'] : [];
  const profile = await supabaseService.createOrUpdateUserProfile(
    user.id,
    username,
    groups
  );

  console.log('User created:', {
    id: user.id,
    email: user.email,
    username: profile.username,
    groups: profile.groups,
  });

  return { user, profile };
}

// Usage
await setupNewUser('admin@example.com', 'password123', 'admin', true);
```

## Integration with App.tsx

The `App.tsx` component automatically loads user profiles on login. The `loadUserMetadata()` function:

1. Queries `user_profiles` table
2. Extracts `username` and `groups`
3. Stores in `authState` for use throughout the app
4. Falls back to email-based username if no profile exists

You can access the profile data via:
```typescript
// In any component that receives authState
const { username, groups, email, userId } = authState;
const isAdmin = groups.includes('admin');
```

## Next Steps

- See `SUPABASE_MIGRATION_GUIDE.md` for setting up the database
- Check `src/App.tsx` for the automatic loading implementation
- Review `src/services/supabase.ts` for all available profile methods
