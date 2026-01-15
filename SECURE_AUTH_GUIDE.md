# Secure Authentication Guide

This guide explains the secure authentication implementation using Supabase Auth.

## Features

✅ **Email-based authentication** - Secure login with email and password  
✅ **Username lookup** - Login with username (looks up email from user_profiles)  
✅ **Password reset** - Forgot password flow with email reset links  
✅ **Session management** - Automatic token refresh and session persistence  
✅ **Email confirmation** - Support for email verification  
✅ **Security best practices** - Proper error handling and secure token storage  

## How It Works

### Login Flow

1. User enters email/username and password
2. If username is entered, system looks up email from `user_profiles` table
3. Supabase authenticates with email and password
4. On success, user metadata (profile, groups) is loaded
5. Session is stored securely and persisted

### Password Reset Flow

1. User clicks "Forgot password?"
2. Enters email address
3. Supabase sends password reset email
4. User clicks link in email (redirects to app with reset token)
5. User enters new password
6. Password is updated and user is signed in

### Session Management

- Sessions are automatically refreshed by Supabase
- Tokens are stored securely (not in localStorage for sensitive data)
- Session state is synced across browser tabs
- Automatic logout on token expiration

## Configuration

### Supabase Settings

In your Supabase Dashboard → Authentication → Settings:

1. **Enable Email Auth**: ✅ Enabled by default
2. **Email Confirmation**: 
   - **Required**: Users must confirm email before login
   - **Optional**: Users can login without confirmation (less secure)
3. **Password Reset**: ✅ Enabled by default
4. **Redirect URLs**: Add your app URL:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

### Environment Variables

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## User Management

### Creating Users

**Option 1: Via Supabase Dashboard**
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. User receives confirmation email (if enabled)

**Option 2: Via Sign Up Flow** (if you add it)
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
});
```

**Option 3: Via Admin Page** (requires backend)
- Use the AdminPage component (limited functionality)
- Or create a backend API with service role key

### Making Users Admin

Run this SQL in Supabase Dashboard:

```sql
-- Create admin profile for user by email
INSERT INTO user_profiles (id, username, groups)
SELECT id, SPLIT_PART(email, '@', 1), ARRAY['admin']
FROM auth.users WHERE email = 'admin@example.com'
ON CONFLICT (id) DO UPDATE SET groups = ARRAY['admin'], updated_at = NOW();
```

## Security Features

### ✅ Implemented

- Email validation
- Password strength requirements (min 8 chars)
- Secure password reset flow
- Session token refresh
- Protected routes (requires authentication)
- Admin role checking

### 🔒 Best Practices

1. **Never expose service role key** - Only use anon key in frontend
2. **Use RLS policies** - Row Level Security protects your data
3. **Validate on backend** - Always validate sensitive operations server-side
4. **Use HTTPS** - Always use HTTPS in production
5. **Rate limiting** - Supabase handles rate limiting automatically

## Troubleshooting

### "Email not confirmed" Error

**Solution**: 
1. Check email inbox (including spam)
2. Click confirmation link
3. Or disable email confirmation in Supabase Dashboard → Authentication → Settings

### "Invalid login credentials"

**Check**:
- Email address is correct
- Password is correct
- User exists in Supabase
- Email is confirmed (if required)

### Username Login Not Working

**Note**: Username lookup requires:
1. User profile exists in `user_profiles` table
2. RLS policy allows reading `user_profiles`
3. Username matches exactly (case-insensitive)

**Fallback**: Use email address directly for login

### Password Reset Email Not Received

**Check**:
1. Email is in spam folder
2. Email address is correct
3. Redirect URL is configured in Supabase
4. Check Supabase logs for email delivery errors

### Session Not Persisting

**Check**:
1. Browser allows localStorage
2. Cookies are enabled
3. No browser extensions blocking storage
4. Check Supabase session settings

## Advanced: Username Lookup

Currently, username lookup is limited because we can't use admin API from the client. To enable full username login:

### Option 1: Supabase Edge Function (Recommended)

Create an Edge Function to lookup email by username:

```typescript
// supabase/functions/get-email-by-username/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { username } = await req.json()
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .single()
  
  if (!data) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
  }
  
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.id)
  
  return new Response(JSON.stringify({ email: user?.user?.email }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Option 2: Store Email in user_profiles

Add email column to `user_profiles` table:

```sql
ALTER TABLE user_profiles ADD COLUMN email TEXT;

-- Populate from auth.users
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id;
```

Then lookup directly:

```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('email')
  .eq('username', username)
  .single();
```

## Testing

### Test Login

1. Create a test user in Supabase Dashboard
2. Login with email and password
3. Verify session persists on refresh
4. Test logout

### Test Password Reset

1. Click "Forgot password?"
2. Enter email
3. Check email for reset link
4. Click link and set new password
5. Login with new password

### Test Admin Access

1. Create user profile with admin group
2. Login as that user
3. Verify "Admin" button appears
4. Test admin features

## Next Steps

- Add sign-up flow for new users
- Add email change functionality
- Add two-factor authentication (2FA)
- Add social login (Google, GitHub, etc.)
- Add account deletion
