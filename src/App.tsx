import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './Dashboard';
import AdminPage from './components/AdminPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { supabase } from './services/supabase';
import { supabaseService } from './services/supabase';
import { Loader2 } from 'lucide-react';

// Use public folder for AWS Amplify compatibility
const logo = '/galantfoodco.avif';

interface AuthState {
  username: string;
  email?: string;
  userId: string;
  groups: string[];
  issuedAt: number;
}

const AUTH_STORAGE_KEY = 'sales-tracker-supabase-auth';
const FORCE_LOGOUT_KEY = 'sales-tracker-force-logout';
const ADMIN_GROUP_NAME = 'admin';

function App() {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

  const [authState, setAuthState] = useState<AuthState | null>(() => {
    // Try to restore from localStorage immediately for faster initial render
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
        if (parsed?.username && parsed?.userId) {
      return parsed;
        }
      }
    } catch (_e) {
      // Ignore errors
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'admin'>('dashboard');
  const isLoggingOutRef = useRef(false);
  const isLoginAttemptRef = useRef(false);
  const [forceLogout, setForceLogout] = useState(() => {
    try {
      return !!localStorage.getItem(FORCE_LOGOUT_KEY);
    } catch (_e) {
      return false;
    }
  });

  // Check authentication status on mount
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      setAuthReady(true);
      setHasSession(false);
      return;
    }

    // Check for password reset token in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken) {
      // User clicked password reset link
      setShowPasswordReset(true);
      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname);
    }

    // The auth state change listener will handle the session
    // Set a safety timeout just in case listener doesn't fire (shouldn't happen)
    let safetyTimeout: NodeJS.Timeout | null = null;

    // Safety timeout - will be cleared when auth listener fires
    safetyTimeout = setTimeout(() => {
      console.warn('[App] Safety timeout - clearing loading (listener should have fired)');
      setIsLoading(false);
      setAuthReady(true);
    }, 1500); // 1.5 second safety net

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const handleAuthChange = async () => {
        const forceLogout = localStorage.getItem(FORCE_LOGOUT_KEY);
        if (event === 'SIGNED_IN') {
          try {
            localStorage.removeItem(FORCE_LOGOUT_KEY);
          } catch (_e) {}
          setForceLogout(false);
          isLoginAttemptRef.current = false;
        }
        if (isLoggingOutRef.current) {
          // Ignore auth state changes while we are forcing logout
          setAuthState(null);
          setHasSession(false);
          setAuthReady(true);
          setIsLoading(false);
          if (event === 'SIGNED_OUT' || !session) {
            isLoggingOutRef.current = false;
            setForceLogout(false);
            try {
              localStorage.removeItem(FORCE_LOGOUT_KEY);
            } catch (_e) {
              // Ignore storage errors
            }
          }
          return;
        }
        if (forceLogout && !(event === 'SIGNED_IN' && !localStorage.getItem(FORCE_LOGOUT_KEY))) {
          setAuthState(null);
          setHasSession(false);
          setAuthReady(true);
          setIsLoading(false);
          setForceLogout(true);
          return;
        }
        console.log('[App] Auth state changed:', event);
        
        // Clear safety timeout since listener fired
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        
        // Mark auth as ready as soon as we get any auth event
        setAuthReady(true);
        setHasSession(!!session?.user);

        // Clear loading state when we get any auth event
        setIsLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserMetadata(session.user);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // This fires on page load if there's an existing session
          await loadUserMetadata(session.user);
        } else if (event === 'SIGNED_OUT') {
          setAuthState(null);
          setHasSession(false);
          setForceLogout(false);
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(FORCE_LOGOUT_KEY);
          } catch (_e) {
            // Ignore storage errors
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Refresh user metadata when token is refreshed
          await loadUserMetadata(session.user);
        } else if (event === 'USER_UPDATED' && session?.user) {
          await loadUserMetadata(session.user);
        } else if (!session) {
          // No session - clear state
          setAuthState(null);
          setHasSession(false);
          setForceLogout(false);
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(FORCE_LOGOUT_KEY);
          } catch (_e) {
            // Ignore storage errors
          }
        }
      };

      handleAuthChange().catch((err: any) => {
        const name = err?.name || '';
        const message = err?.message || '';
        if (name === 'AbortError' || message.includes('signal is aborted')) {
          return;
        }
        console.error('[App] Auth change error:', err);
      });
    });

    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | undefined;
      if (reason?.name === 'AbortError' && reason?.message?.includes('signal is aborted')) {
        event.preventDefault();
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message || '';
      const name = (event.error as { name?: string } | undefined)?.name || '';
      if ((name === 'AbortError' || message.includes('AbortError')) && message.includes('signal is aborted')) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const initializeSession = async () => {
      if (!supabase) return;
      if (localStorage.getItem(FORCE_LOGOUT_KEY)) {
        setAuthReady(true);
        setHasSession(false);
        setIsLoading(false);
        setForceLogout(true);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (localStorage.getItem(FORCE_LOGOUT_KEY) || isLoggingOutRef.current) {
          setAuthReady(true);
          setHasSession(false);
          setIsLoading(false);
          setForceLogout(true);
          return;
        }
        if (data?.session?.user) {
          setAuthReady(true);
          setHasSession(true);
          setForceLogout(false);
          setIsLoading(false);
          await loadUserMetadata(data.session.user);
          return;
        }
        setAuthReady(true);
        setHasSession(false);
        setForceLogout(false);
        setIsLoading(false);
      } catch (_e) {
        if (cancelled) return;
        setAuthReady(true);
        setHasSession(false);
        setForceLogout(false);
        setIsLoading(false);
      }
    };

    initializeSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadUserMetadata = async (user: any) => {
    if (!supabase || !user) return;

    try {
      // Get user metadata (including groups/roles)
      // Wrap in try-catch in case table doesn't exist yet
      let profile = null;
      try {
        profile = await supabaseService.getUserProfile(user.id);
      } catch (profileError) {
        console.warn('[App] Could not load user profile (table may not exist):', profileError);
        // Continue with default values
      }

      // If user_profiles table doesn't exist or user doesn't have a profile, use default
      const groups = profile?.groups || [];
      const username = profile?.username || user.email?.split('@')[0] || user.id;

        const nextState: AuthState = {
        username,
        email: user.email,
        userId: user.id,
        groups: Array.isArray(groups) ? groups : [],
          issuedAt: Date.now(),
        };

        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
        } catch (_err) {
          // Ignore storage issues; keep in-memory session
        }

        setAuthState(nextState);
    } catch (err) {
      console.error('[App] Error loading user metadata:', err);
      // Fallback: create basic auth state from user object
      const nextState: AuthState = {
        username: user.email?.split('@')[0] || user.id,
        email: user.email,
        userId: user.id,
        groups: [],
        issuedAt: Date.now(),
      };
      setAuthState(nextState);
    }
  };

  const findUserEmailByUsername = async (username: string): Promise<string | null> => {
    if (!supabase) return null;

    try {
      // Query user_profiles to find username and get user ID
      // Note: This requires RLS policy to allow reading user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .eq('username', username.toLowerCase())
        .single();

      if (error || !data) {
        // Username not found in profiles, return null
        return null;
      }

      // Try to get user email from current session or use a function
      // Since we can't use admin API from client, we'll need to create a function
      // For now, return null and let the user use email directly
      // TODO: Create a Supabase Edge Function to lookup email by username
      console.warn('[App] Username lookup found profile but cannot get email from client. Please use email address to login.');
      return null;
    } catch (err) {
      console.error('[App] Error finding user email:', err);
      return null;
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let loginEmail = trimmedEmail;

    // If it's not an email, try to find it as a username
    if (!emailRegex.test(trimmedEmail)) {
      const foundEmail = await findUserEmailByUsername(trimmedEmail);
      if (foundEmail) {
        loginEmail = foundEmail;
      } else {
        setError('Please enter a valid email address or username.');
        return;
      }
    }

    try {
      isLoginAttemptRef.current = true;
      try {
        localStorage.removeItem(FORCE_LOGOUT_KEY);
      } catch (_e) {}
      setForceLogout(false);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) {
        isLoginAttemptRef.current = false;
        let message = signInError.message || 'Login failed.';
        
        // Provide user-friendly error messages
        if (signInError.message?.includes('Invalid login credentials')) {
          message = 'Incorrect email or password. Please try again.';
        } else if (signInError.message?.includes('Email not confirmed')) {
          message = 'Please check your email and confirm your account before logging in.';
        } else if (signInError.message?.includes('Too many requests')) {
          message = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        setError(message);
        return;
      }

      if (data?.user) {
        try {
          localStorage.removeItem(FORCE_LOGOUT_KEY);
        } catch (_e) {}
        setForceLogout(false);
        await loadUserMetadata(data.user);
        setHasSession(true);
        setAuthReady(true);
        setIsLoading(false);
        setPassword('');
        setEmail('');
        setSuccess('Successfully signed in!');
        isLoginAttemptRef.current = false;
      }
    } catch (err: any) {
      isLoginAttemptRef.current = false;
      const message = err?.message || 'Login failed. Please try again.';
      console.error('Supabase login failed', err);
      setError(message);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(`Failed to send reset email: ${resetError.message}`);
        return;
      }

      setSuccess('Password reset email sent! Please check your inbox.');
      setShowForgotPassword(false);
      setEmail('');
    } catch (err: any) {
      const message = err?.message || 'Failed to send reset email. Please try again.';
      setError(message);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(`Password reset failed: ${updateError.message}`);
        return;
      }

      setSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordReset(false);
    } catch (err: any) {
      const message = err?.message || 'Failed to reset password. Please try again.';
      setError(`Password reset failed: ${message}`);
    }
  };

  const clearSupabaseAuthStorage = () => {
    try {
      const keysToRemove: string[] = [];
      const storageKey = (supabase as any)?.auth?.storageKey as string | undefined;
      if (storageKey) {
        keysToRemove.push(storageKey);
      }

      if (!supabaseUrl) {
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return;
      }
      const host = new URL(supabaseUrl).hostname;
      const ref = host.split('.')[0];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === 'supabase.auth.token' || key === 'supabase.auth.refreshToken') {
          keysToRemove.push(key);
          continue;
        }
        if (key.startsWith(`sb-${ref}-auth-token`) || (key.includes(ref) && key.includes('auth-token'))) {
          keysToRemove.push(key);
          continue;
        }
        if (key.includes('auth-token') && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (_e) {
      // Ignore storage errors
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
    } catch (_e) {}
    setForceLogout(true);
    isLoggingOutRef.current = true;
    if (supabase) {
      try {
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          console.error('[App] Local sign out error:', localError);
        }
      } catch (_err) {
        // Best-effort sign out
      }
      try {
        const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
        if (globalError) {
          console.error('[App] Global sign out error:', globalError);
        }
      } catch (_err) {
        // Best-effort sign out
      }
    }

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_e) {
      // Ignore storage errors
    }
    clearSupabaseAuthStorage();

    // Ensure UI logs out even if auth listener doesn't fire
    setAuthState(null);
    setHasSession(false);
    setAuthReady(true);
    setIsLoading(false);
    setCurrentPage('dashboard');

    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordReset(false);
    setShowForgotPassword(false);
    isLoggingOutRef.current = false;
  };

  const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
  const isAuthenticated = authReady && hasSession && !forceLogout;
  const isAdminSession = isAuthenticated && authState?.groups?.includes(ADMIN_GROUP_NAME);
  const displayName = authState?.username || authState?.email || 'User';

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/15 overflow-hidden shadow-lg flex items-center justify-center">
              <img
                src={logo}
                alt="Galant Food Co."
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-sm text-slate-200">Galant Food Co.</p>
              <h1 className="text-3xl font-semibold tracking-tight leading-tight">
                Sales Tracker
              </h1>
            </div>
          </div>

          <Card className="backdrop-blur bg-white shadow-xl border border-slate-200/70">
            <CardHeader className="space-y-2">
              <CardTitle className="text-slate-900">
                {showPasswordReset ? 'Reset Password' : showForgotPassword ? 'Forgot Password' : 'Sign in'}
              </CardTitle>
              <CardDescription>
                {showPasswordReset 
                  ? 'Enter your new password below.'
                  : showForgotPassword 
                  ? 'Enter your email to receive a password reset link.'
                  : 'Enter your credentials to access the dashboard.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showPasswordReset ? (
                <form className="space-y-4 text-left" onSubmit={handlePasswordReset}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="new-password">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      name="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="confirm-password">
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={8}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  {success && (
                    <p className="text-sm text-green-600" role="alert">
                      {success}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!newPassword || !confirmPassword || newPassword.length < 8}
                    >
                      Reset Password
                    </Button>
                  </div>
                </form>
              ) : showForgotPassword ? (
                <form className="space-y-4 text-left" onSubmit={handleForgotPassword}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="forgot-email">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      name="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  {success && (
                    <p className="text-sm text-green-600" role="alert">
                      {success}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setEmail('');
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!email}
                    >
                      Send Reset Link
                    </Button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4 text-left" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="email">
                      Email or Username
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com or username"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  {success && (
                    <p className="text-sm text-green-600" role="alert">
                      {success}
                    </p>
                  )}
                  {!isSupabaseConfigured && (
                    <p className="text-sm text-red-600" role="alert">
                      Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                      disabled={!email || !password || !isSupabaseConfigured}
                  >
                    Sign in
                  </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      Forgot password?
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            <img
              src={logo}
              alt="Galant Food Co."
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Galant Food Co. Sales Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdminSession && (
            <Button
              variant={currentPage === 'admin' ? 'default' : 'outline'}
              onClick={() => setCurrentPage(currentPage === 'admin' ? 'dashboard' : 'admin')}
            >
              {currentPage === 'admin' ? 'Dashboard' : 'Admin'}
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
      {currentPage === 'admin' ? (
        <AdminPage
          supabase={supabase}
          onBack={() => setCurrentPage('dashboard')}
        />
      ) : (
        <Dashboard
          isAdmin={isAdminSession}
          username={authState?.username || ''}
          authReady={authReady}
          hasSession={hasSession}
        />
      )}
    </div>
  );
}

export default App;
