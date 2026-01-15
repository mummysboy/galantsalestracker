import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Trash2, RefreshCw, Search, Eye, EyeOff, UserPlus } from 'lucide-react';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { supabaseService } from '../services/supabase';

interface AdminPageProps {
  supabase: SupabaseClient | null;
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({
  supabase,
  onBack,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [userFeedback, setUserFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  
  // User list state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Report visibility management
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState<Record<string, boolean>>({});
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, { username?: string }>>({});
  
  const distributors = ['ALPINE', 'PETES', 'KEHE', 'VISTAR', 'TONYS', 'TROIA', 'MHD', 'DOT'] as const;

  // Get username identifier for a user (matches App.tsx logic exactly)
  const getUserIdentifier = async (userId: string, email: string | null): Promise<string> => {
    console.log('[AdminPage] Getting user identifier:', { userId, email, hasCachedProfile: !!userProfiles[userId]?.username });
    
    // First try to get from cached profile
    if (userProfiles[userId]?.username) {
      const username = userProfiles[userId].username!;
      console.log('[AdminPage] Using cached profile username:', username);
      return username;
    }
    
    // Try to load profile from database (matches App.tsx: profile?.username)
    try {
      const profile = await supabaseService.getUserProfile(userId);
      if (profile?.username) {
        setUserProfiles(prev => ({ ...prev, [userId]: { username: profile.username } }));
        console.log('[AdminPage] Using profile username:', profile.username);
        return profile.username;
      }
      console.log('[AdminPage] No username in profile for user:', userId);
    } catch (err) {
      console.warn(`[AdminPage] Failed to load profile for ${userId}:`, err);
    }
    
    // Fallback to email prefix (matches App.tsx: user.email?.split('@')[0])
    if (email) {
      const emailPrefix = email.split('@')[0];
      console.log('[AdminPage] Using email prefix as username:', emailPrefix);
      return emailPrefix;
    }
    
    // Last resort: use user ID (matches App.tsx: user.id)
    console.log('[AdminPage] Using user ID as username:', userId);
    return userId;
  };

  // Try to get admin client if service role key is available
  const getAdminClient = (): SupabaseClient | null => {
    const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    
    if (serviceRoleKey && supabaseUrl) {
      try {
        return createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
      } catch (err) {
        console.warn('[AdminPage] Failed to create admin client:', err);
        return null;
      }
    }
    return null;
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);
    setIsCreatingUser(true);

    if (!supabase) {
      setUserFeedback({ type: 'error', message: 'Supabase is not configured for user creation.' });
      setIsCreatingUser(false);
      return;
    }

    const trimmedEmail = newEmail.trim();
    const trimmedPassword = createUserPassword.trim();
    const trimmedUsername = newUsername.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setUserFeedback({ type: 'error', message: 'Email and password are required.' });
      setIsCreatingUser(false);
      return;
    }

    if (trimmedPassword.length < 8) {
      setUserFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      setIsCreatingUser(false);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setUserFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      setIsCreatingUser(false);
      return;
    }

    try {
      // Try to use admin API first if service role key is available
      const adminClient = getAdminClient();
      let userId: string | null = null;

      if (adminClient) {
        // Use admin API to create user without email confirmation
        try {
          const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
            email: trimmedEmail,
            password: trimmedPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              username: trimmedUsername || trimmedEmail.split('@')[0],
            },
          });

          if (adminError) {
            throw adminError;
          }

          if (adminData?.user) {
            userId = adminData.user.id;
            
            // Create user profile if user was created successfully
            if (userId) {
              try {
                const groups = makeAdmin ? ['admin'] : [];
                await supabaseService.createOrUpdateUserProfile(
                  userId,
                  trimmedUsername || trimmedEmail.split('@')[0],
                  groups
                );
              } catch (profileError) {
                console.warn('[AdminPage] Failed to create user profile:', profileError);
                // Don't fail the whole operation if profile creation fails
              }
            }

            setNewEmail('');
            setCreateUserPassword('');
            setNewUsername('');
            setMakeAdmin(false);
            setUserFeedback({ 
              type: 'success', 
              message: `User "${trimmedEmail}" created successfully and can log in immediately.` 
            });
            // Wait a moment for the user to be fully saved, then refresh
            setTimeout(() => {
              loadUsers(false).catch(err => {
                console.warn('[AdminPage] Failed to refresh user list:', err);
                // Don't overwrite success message
              });
            }, 500);
            setIsCreatingUser(false);
            return;
          }
        } catch (adminErr: any) {
          console.warn('[AdminPage] Admin API failed, falling back to signUp:', adminErr);
          // Fall through to regular signUp
        }
      }

      // Fallback to regular signUp
      // Note: Email confirmation can be disabled in Supabase Dashboard:
      // Settings → Authentication → Email Auth → Confirm email: OFF
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: trimmedUsername || trimmedEmail.split('@')[0],
          },
        },
      });

      if (error) {
        setUserFeedback({ 
          type: 'error', 
          message: `Failed to create user: ${error.message}. Note: To create users without email confirmation, add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to your .env file, or disable email confirmation in Supabase Dashboard → Authentication → Email Auth.` 
        });
        setIsCreatingUser(false);
        return;
      }

      // If user was created, try to create profile
      if (data?.user?.id) {
        userId = data.user.id;
        try {
          const groups = makeAdmin ? ['admin'] : [];
          await supabaseService.createOrUpdateUserProfile(
            userId,
            trimmedUsername || trimmedEmail.split('@')[0],
            groups
          );
        } catch (profileError) {
          console.warn('[AdminPage] Failed to create user profile:', profileError);
        }
      }

      setNewEmail('');
      setCreateUserPassword('');
      setNewUsername('');
      setMakeAdmin(false);
      
      // Check if email confirmation is required based on user's email_confirmed_at
      const emailConfirmed = data?.user?.email_confirmed_at !== null;
      setUserFeedback({ 
        type: 'success', 
        message: emailConfirmed 
          ? `User "${trimmedEmail}" created successfully and can log in immediately.`
          : `User "${trimmedEmail}" created. ${emailConfirmed ? 'They can log in immediately.' : 'If email confirmation is enabled in Supabase, they will need to confirm their email. To disable this, go to Supabase Dashboard → Authentication → Email Auth → Confirm email: OFF'}`
      });
      // Wait a moment for the user to be fully saved, then refresh
      setTimeout(() => {
        loadUsers(false).catch(err => {
          console.warn('[AdminPage] Failed to refresh user list:', err);
          // Don't overwrite success message
        });
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user.';
      setUserFeedback({ type: 'error', message });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);

    if (!supabase) {
      setUserFeedback({ type: 'error', message: 'Supabase is not configured for password reset.' });
      return;
    }

    const trimmedEmail = resetEmail.trim();
    const trimmedPassword = resetPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setUserFeedback({ type: 'error', message: 'Email and new password are required.' });
      return;
    }

    if (trimmedPassword.length < 8) {
      setUserFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      // Note: Admin password reset requires service role key or backend API
      // For now, we'll trigger a password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setUserFeedback({ type: 'error', message: `Failed to send reset email: ${error.message}` });
        return;
      }

      setResetEmail('');
      setResetPassword('');
      setUserFeedback({ 
        type: 'success', 
        message: `Password reset email sent to "${trimmedEmail}". They can use the link to set a new password.` 
      });
    } catch (err: any) {
      const message = err?.message || 'Failed to reset password.';
      setUserFeedback({ type: 'error', message });
    }
  };

  const loadUsers = async (showError: boolean = true) => {
    if (!supabase) return;

    setIsLoadingUsers(true);
    try {
      // Try to use admin client first if service role key is available
      const adminClient = getAdminClient();
      
      if (adminClient) {
        // Use admin API to list users
        try {
          const { data: { users: userList }, error } = await adminClient.auth.admin.listUsers();

          if (error) {
            throw error;
          }

          setUsers(userList || []);
          setIsLoadingUsers(false);
          return;
        } catch (adminErr: any) {
          console.warn('[AdminPage] Admin API failed for listUsers:', adminErr);
          // Fall through to try alternative method
        }
      }

      // Fallback: Try to get users from user_profiles table
      // This won't show all auth users, but will show users with profiles
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!profileError && profiles) {
          // Convert profiles to user-like format
          const userList = profiles.map(profile => ({
            id: profile.id,
            email: null, // We don't have email in profiles
            created_at: profile.created_at,
            user_metadata: {
              username: profile.username,
            },
          }));
          setUsers(userList);
          setIsLoadingUsers(false);
          return;
        }
      } catch (profileErr) {
        console.warn('[AdminPage] Failed to load from user_profiles:', profileErr);
      }

      // If admin API is not available, show a message only if requested
      if (showError) {
        setUserFeedback({ 
          type: 'error', 
          message: 'User listing requires admin API access. Add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to your .env file, or use Supabase Dashboard → Authentication → Users to manage users.' 
        });
      }
      setUsers([]);
    } catch (err: any) {
      console.error('[AdminPage] Error loading users:', err);
      if (showError) {
        setUserFeedback({ 
          type: 'error', 
          message: `Failed to load users: ${err?.message || 'Unknown error'}. Add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to enable user listing.` 
        });
      }
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // User deletion requires admin API access
      const adminClient = getAdminClient();
      
      if (!adminClient) {
        setUserFeedback({ 
          type: 'error', 
          message: 'User deletion requires admin API access. Add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to your .env file to enable user deletion.' 
        });
        return;
      }

      // Use admin API to delete user
      const { error } = await adminClient.auth.admin.deleteUser(userId);

      if (error) {
        setUserFeedback({ type: 'error', message: `Failed to delete user: ${error.message}` });
        return;
      }

      // Also try to delete user profile if it exists
      try {
        await supabaseService.getUserProfile(userId).then(async (profile) => {
          if (profile) {
            // Profile deletion would need to be done via admin client or SQL
            // For now, just log it
            console.log('[AdminPage] User profile exists, but profile deletion requires admin access');
          }
        });
      } catch (profileErr) {
        // Ignore profile deletion errors
        console.warn('[AdminPage] Could not check/delete user profile:', profileErr);
      }

      setUserFeedback({ type: 'success', message: 'User deleted successfully.' });
      loadUsers(); // Refresh user list
    } catch (err: any) {
      setUserFeedback({ 
        type: 'error', 
        message: 'User deletion requires admin access. Use Supabase Dashboard → Authentication → Users to delete users.' 
      });
    }
  };

  // Load user permissions - uses username identifier (matches Dashboard logic)
  const loadUserPermissions = async (userId: string, email: string | null) => {
    try {
      setLoadingPermissions(prev => ({ ...prev, [userId]: true }));
      
      // Get the username identifier (matches App.tsx/Dashboard logic)
      const username = await getUserIdentifier(userId, email);
      const normalizedUsername = username.trim(); // Dashboard uses .trim() - must match exactly
      const key = `userPermissions:${normalizedUsername}`;
      
      console.log('[AdminPage] Loading permissions:', { 
        userId, 
        email, 
        username, 
        normalizedUsername,
        normalizedUsernameLength: normalizedUsername.length,
        key 
      });
      
      const appState = await supabaseService.getAppState(key);
      
      // Also check all permissions for debugging
      const allStates = await supabaseService.getAllAppStates();
      const permissionStates = allStates.filter(state => state.key.startsWith('userPermissions:'));
      console.log('[AdminPage] All permissions in DB:', permissionStates.map(s => ({
        key: s.key,
        username: s.key.replace('userPermissions:', ''),
        value: s.value
      })));
      
      if (appState && appState.value) {
        const perms = Array.isArray(appState.value) ? appState.value : [];
        setUserPermissions(prev => ({ ...prev, [userId]: perms }));
        console.log('[AdminPage] Loaded permissions:', { userId, username, key, permissions: perms });
      } else {
        // Default: no permissions (empty array means user can't see any reports)
        setUserPermissions(prev => ({ ...prev, [userId]: [] }));
        console.log('[AdminPage] No permissions found:', { userId, username, key, 'triedKey': key });
      }
    } catch (error) {
      console.error(`Error loading permissions for ${userId}:`, error);
      setUserPermissions(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingPermissions(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Save user permissions - uses username identifier (matches Dashboard logic)
  const saveUserPermissions = async (userId: string, email: string | null, allowedDistributors: string[]) => {
    try {
      // Get the username identifier (matches App.tsx/Dashboard logic)
      const username = await getUserIdentifier(userId, email);
      const normalizedUsername = username.trim(); // Dashboard uses .trim() - must match exactly
      const key = `userPermissions:${normalizedUsername}`;
      
      // Also calculate what Dashboard would use (email prefix) to warn if there's a mismatch
      const emailPrefix = email ? email.split('@')[0].trim() : null;
      const dashboardKey = emailPrefix ? `userPermissions:${emailPrefix}` : null;
      const keysMatch = dashboardKey === key;
      
      console.log('[AdminPage] Saving permissions:', { 
        userId, 
        email, 
        username, 
        normalizedUsername, 
        normalizedUsernameLength: normalizedUsername.length,
        key, 
        emailPrefix,
        dashboardKey,
        keysMatch: keysMatch ? '✅ MATCH' : '⚠️ MISMATCH - Dashboard may not find these permissions!',
        allowedDistributors,
        allowedDistributorsLength: allowedDistributors.length,
        allowedDistributorsString: JSON.stringify(allowedDistributors)
      });
      
      if (!keysMatch && emailPrefix) {
        console.warn('[AdminPage] ⚠️ WARNING: Identifier mismatch detected!', {
          adminPageWillSaveAs: key,
          dashboardWillLookFor: dashboardKey,
          suggestion: 'Dashboard uses email prefix, but AdminPage is using profile username. Consider saving permissions under both keys, or ensure profile username matches email prefix.'
        });
      }
      
      await supabaseService.saveAppState(key, allowedDistributors);
      
      // Also save under email prefix key if different (to ensure Dashboard can find it)
      // Dashboard primarily uses email prefix, so we save there too
      if (!keysMatch && emailPrefix && emailPrefix !== normalizedUsername) {
        const emailKey = `userPermissions:${emailPrefix}`;
        console.log('[AdminPage] Also saving permissions under email prefix key:', emailKey);
        await supabaseService.saveAppState(emailKey, allowedDistributors);
      }
      
      // Verify it was saved (may fail with 406 due to RLS, but save should still work)
      try {
        const verify = await supabaseService.getAppState(key);
        console.log('[AdminPage] Verified saved permissions:', {
          key,
          found: !!verify,
          value: verify?.value,
          valueType: typeof verify?.value,
          valueIsArray: Array.isArray(verify?.value)
        });
      } catch (verifyErr: any) {
        // 406 errors are expected due to RLS, but the save should still work
        if (verifyErr?.message?.includes('406') || verifyErr?.code === 'PGRST301') {
          console.log('[AdminPage] Verification returned 406 (RLS issue), but permissions should still be saved:', key);
        } else {
          console.warn('[AdminPage] Verification error:', verifyErr);
        }
      }
      
      // Also verify email prefix key if we saved it
      if (!keysMatch && emailPrefix && emailPrefix !== normalizedUsername) {
        const emailKey = `userPermissions:${emailPrefix}`;
        try {
          const verifyEmail = await supabaseService.getAppState(emailKey);
          console.log('[AdminPage] Verified email prefix key permissions:', {
            key: emailKey,
            found: !!verifyEmail,
            value: verifyEmail?.value
          });
        } catch (verifyErr: any) {
          if (verifyErr?.message?.includes('406') || verifyErr?.code === 'PGRST301') {
            console.log('[AdminPage] Email prefix key verification returned 406, but permissions should still be saved:', emailKey);
          }
        }
      }
      
      // Also log all possible identifiers for this user to help with debugging
      try {
        const { data: { user: currentUser } } = await supabase?.auth.getUser() || { data: { user: null } };
        const profile = await supabaseService.getUserProfile(userId).catch(() => null);
        console.log('[AdminPage] User identifier info for debugging:', {
          userId,
          email,
          usernameUsed: normalizedUsername,
          profileUsername: profile?.username || 'none',
          emailPrefix: email ? email.split('@')[0] : 'none',
          savedKey: key,
          currentUserId: currentUser?.id || 'none',
          note: 'Dashboard will try to find permissions using: normalized username, original username, email prefix, user ID, and profile username'
        });
      } catch (debugErr) {
        console.warn('[AdminPage] Could not get debug info:', debugErr);
      }
      
      setUserPermissions(prev => ({ ...prev, [userId]: allowedDistributors }));
      setUserFeedback({ 
        type: 'success', 
        message: `Report visibility updated for "${email || username}". Permissions saved with identifier "${normalizedUsername}". Permissions: ${allowedDistributors.join(', ') || 'None'}. User should refresh their dashboard to see changes.` 
      });
    } catch (error) {
      console.error(`Error saving permissions for ${userId}:`, error);
      setUserFeedback({ 
        type: 'error', 
        message: `Failed to save permissions: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  // Toggle distributor permission for a user
  const toggleDistributorPermission = async (userId: string, email: string | null, distributor: string) => {
    const currentPermissions = userPermissions[userId] || [];
    const newPermissions = currentPermissions.includes(distributor)
      ? currentPermissions.filter(d => d !== distributor)
      : [...currentPermissions, distributor];
    await saveUserPermissions(userId, email, newPermissions);
  };

  useEffect(() => {
    // Try to load users, but don't fail if admin API is not available
    loadUsers().catch(() => {
      // Silently fail - admin features require backend support
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload user profiles when users are loaded
  useEffect(() => {
    const loadProfiles = async () => {
      for (const user of users) {
        if (!userProfiles[user.id]) {
          try {
            const profile = await supabaseService.getUserProfile(user.id);
            if (profile) {
              setUserProfiles(prev => ({ ...prev, [user.id]: { username: profile.username } }));
            }
          } catch (err) {
            // Ignore errors - profile might not exist
          }
        }
      }
    };
    
    if (users.length > 0) {
      loadProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  // Load permissions when a user is selected
  useEffect(() => {
    if (selectedUserForPermissions) {
      // Find the user object to get both ID and email
      const user = users.find(u => u.id === selectedUserForPermissions);
      if (user) {
        loadUserPermissions(user.id, user.email || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserForPermissions, users]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!userSearchTerm.trim()) return true;
    const search = userSearchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const id = user.id?.toLowerCase() || '';
    return email.includes(search) || id.includes(search);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <Button onClick={onBack} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          {/* Admin API Notice */}
          <Card className="shadow-sm border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Some admin features require Supabase Admin API access, which should be done through a backend service or Supabase Edge Functions for security. 
                For user management, you can also use the <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a> → Authentication → Users.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create New User
              </CardTitle>
              <CardDescription>
                Create new users for the system. If admin API is configured, users can log in immediately. Otherwise, they'll receive a confirmation email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="new-email">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-email"
                      name="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      disabled={isCreatingUser}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="new-password">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-password"
                      name="new-password"
                      type="password"
                      value={createUserPassword}
                      onChange={(e) => setCreateUserPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      disabled={isCreatingUser}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="new-username">
                      Username (Optional)
                    </label>
                    <input
                      id="new-username"
                      name="new-username"
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Leave empty to use email prefix"
                      disabled={isCreatingUser}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="make-admin">
                      Permissions
                    </label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="make-admin"
                          name="make-admin"
                          type="checkbox"
                          checked={makeAdmin}
                          onChange={(e) => setMakeAdmin(e.target.checked)}
                          disabled={isCreatingUser}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-slate-700">Make this user an admin</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isCreatingUser}
                    className="min-w-[120px]"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </div>
              </form>
              {userFeedback && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    userFeedback.type === 'error' 
                      ? 'bg-red-50 text-red-800 border border-red-200' 
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                  role="alert"
                >
                  {userFeedback.message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-slate-900 text-lg">Reset User Password</CardTitle>
              <CardDescription>Send a password reset email to a user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="reset-email">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="reset-password">
                    New Password (Optional)
                  </label>
                  <input
                    id="reset-password"
                    name="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Leave empty to send reset email"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">Note: Direct password setting requires admin API access.</p>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" variant="outline">
                    Send Reset Email
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 text-lg">All Users ({filteredUsers.length})</CardTitle>
                  <CardDescription>View and manage users. Search by email or user ID.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadUsers()}
                  disabled={isLoadingUsers}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by email or user ID..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isLoadingUsers && users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found.</p>
                  <p className="text-sm mt-2">
                    {getAdminClient() ? (
                      <>Users you create will appear here. If you just created a user, try clicking the Refresh button.</>
                    ) : (
                      <>
                        User listing requires admin API access. Add <code className="bg-gray-100 px-1 rounded">REACT_APP_SUPABASE_SERVICE_ROLE_KEY</code> to your .env file to enable user listing.
                        <br />
                        Or use <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a> → Authentication → Users to manage users.
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">User ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map((user) => {
                        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
                        
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{user.email || '-'}</td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{user.id}</td>
                            <td className="px-4 py-3 text-gray-600">{createdDate}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={!supabase}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Visibility Management */}
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-slate-900 text-lg">Report Visibility Management</CardTitle>
              <CardDescription>Control which reports each user can see. Only admins can upload/delete reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found. Load users first to manage report visibility.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => {
                    const userKey = user.id; // Use user ID as the key for state
                    const userPerms = userPermissions[userKey] || [];
                    const isExpanded = selectedUserForPermissions === userKey;
                    
                    return (
                      <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{user.email || user.id}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {userPerms.length === 0 
                                ? 'No reports visible' 
                                : `${userPerms.length} report${userPerms.length === 1 ? '' : 's'} visible`}
                            </div>
                            {isExpanded && (
                              <div className="text-xs text-gray-500 mt-1 font-mono">
                                Identifier: {userProfiles[user.id]?.username || (user.email ? user.email.split('@')[0] : user.id)}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (isExpanded) {
                                setSelectedUserForPermissions(null);
                              } else {
                                setSelectedUserForPermissions(userKey);
                                if (!userPermissions[userKey]) {
                                  loadUserPermissions(user.id, user.email || null);
                                }
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {isExpanded ? 'Hide' : 'Manage'}
                          </Button>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {loadingPermissions[userKey] ? (
                              <div className="text-sm text-gray-500">Loading permissions...</div>
                            ) : (
                              <div className="space-y-3">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Select reports this user can view:
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {distributors.map((distributor) => {
                                    const isAllowed = userPerms.includes(distributor);
                                    const distributorLabels: Record<string, string> = {
                                      'ALPINE': 'Alpine',
                                      'PETES': "Pete's Coffee",
                                      'KEHE': 'KeHe',
                                      'VISTAR': 'Vistar',
                                      'TONYS': "Tony's Fine Foods",
                                      'TROIA': 'Troia Foods',
                                      'MHD': 'Mike Hudson',
                                      'DOT': 'DOT',
                                    };
                                    
                                    return (
                                      <button
                                        key={distributor}
                                        onClick={() => toggleDistributorPermission(user.id, user.email || null, distributor)}
                                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                          isAllowed
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        {distributorLabels[distributor] || distributor}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  Note: Users can only view reports. Only admins can upload or delete data.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
