import React, { useMemo, useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import AdminPage from './components/AdminPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  GlobalSignOutCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Use public folder for AWS Amplify compatibility
const logo = '/galantfoodco.avif';

interface AuthState {
  username: string;
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  groups: string[];
  issuedAt: number;
}

const AUTH_STORAGE_KEY = 'sales-tracker-cognito-auth';

function App() {
  const awsRegion = (process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || '').trim();
  const awsAccessKeyId = (process.env.REACT_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
  const awsSecretAccessKey = (process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const cognitoUserPoolId = (process.env.REACT_APP_COGNITO_USER_POOL_ID || '').trim();
  const cognitoClientId = (process.env.REACT_APP_COGNITO_CLIENT_ID || '').trim();
  const adminGroupName = (process.env.REACT_APP_COGNITO_ADMIN_GROUP || 'admin').trim() || 'admin';

  const cognitoClient = useMemo(() => {
    if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey) return null;
    return new CognitoIdentityProviderClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }, [awsRegion, awsAccessKeyId, awsSecretAccessKey]);

  const [authState, setAuthState] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthState;
      if (!parsed?.idToken || !parsed?.accessToken || !parsed?.username) return null;
      return parsed;
    } catch (_e) {
      return null;
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [sessionForPasswordChange, setSessionForPasswordChange] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'admin'>('dashboard');

  const decodeGroups = (idToken: string): string[] => {
    try {
      const payload = idToken.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('[decodeGroups] Full JWT payload:', decoded);
      const groups = decoded['cognito:groups'] || decoded['groups'] || [];
      console.log('[decodeGroups] Found groups:', groups);
      return Array.isArray(groups) ? groups : [];
    } catch (e) {
      console.error('[decodeGroups] Error decoding groups:', e);
      return [];
    }
  };

  const isAuthenticated = !!authState?.accessToken && !!authState?.idToken;
  const isAdminSession = isAuthenticated && authState?.groups?.includes(adminGroupName);
  const displayName = authState?.username || 'User';
  
  // Debug logging
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[App] Auth state:', {
        username: authState?.username,
        groups: authState?.groups,
        adminGroupName,
        isAdminSession,
      });
    }
  }, [isAuthenticated, authState, adminGroupName, isAdminSession]);
  const isCognitoConfigured =
    !!cognitoClient && !!awsRegion && !!cognitoUserPoolId && !!cognitoClientId;
  const configError =
    !awsRegion || !awsAccessKeyId || !awsSecretAccessKey || !cognitoUserPoolId || !cognitoClientId
      ? 'AWS Cognito is not fully configured. Missing environment variables. If this is a hosted deployment, configure environment variables in your hosting platform (see DEPLOYMENT_GUIDE.md). Required: REACT_APP_AWS_REGION, REACT_APP_AWS_ACCESS_KEY_ID, REACT_APP_AWS_SECRET_ACCESS_KEY, REACT_APP_COGNITO_USER_POOL_ID, REACT_APP_COGNITO_CLIENT_ID'
      : '';

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!isCognitoConfigured) {
      setError(configError || 'AWS Cognito is not configured.');
      return;
    }

    const performLogin = async () => {
      try {
        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
          setError('Enter a username and password.');
          return;
        }

        if (!cognitoClient) {
          setError('Cognito client unavailable.');
          return;
        }

        const command = new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: cognitoClientId,
          AuthParameters: {
            USERNAME: trimmedUsername,
            PASSWORD: password,
          },
        });

        const response = await cognitoClient.send(command);
        
        // Check if password change is required
        if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
          setPasswordChangeRequired(true);
          setSessionForPasswordChange(response.Session || null);
          setError('Password change required. Please set a new password.');
          return;
        }

        const tokens = response.AuthenticationResult;
        if (!tokens?.AccessToken || !tokens?.IdToken) {
          setError('Login failed: missing tokens.');
          return;
        }

        const groups = decodeGroups(tokens.IdToken);
        console.log('[Login] Decoded groups from JWT:', groups);
        console.log('[Login] Admin group name:', adminGroupName);
        console.log('[Login] Is admin?', groups.includes(adminGroupName));
        const nextState: AuthState = {
          username: trimmedUsername,
          accessToken: tokens.AccessToken,
          idToken: tokens.IdToken,
          refreshToken: tokens.RefreshToken,
          groups,
          issuedAt: Date.now(),
        };

        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
        } catch (_err) {
          // Ignore storage issues; keep in-memory session
        }

        setAuthState(nextState);
        setPassword('');
        setPasswordChangeRequired(false);
        setSessionForPasswordChange(null);
      } catch (err: any) {
        const name = err?.name || 'Error';
        let message = err?.message || err?.toString?.() || 'Login failed.';
        
        // Provide helpful error messages
        if (name === 'NotAuthorizedException') {
          message = 'Incorrect username or password. If you need to reset your password, contact an administrator.';
        } else if (name === 'InvalidParameterException' && message.includes('USER_PASSWORD_AUTH')) {
          message = 'USER_PASSWORD_AUTH flow is not enabled for this app client. Enable it in Cognito console under App client settings > Authentication flows.';
        } else if (name === 'UserNotFoundException') {
          message = 'User not found. Check the username and try again.';
        } else if (name === 'UserNotConfirmedException') {
          message = 'User account is not confirmed. Please confirm your account or contact an administrator.';
        }
        
        const details = [name, message].filter(Boolean).join(': ');
        console.error('Cognito login failed', {
          name,
          message,
          status: err?.$metadata?.httpStatusCode,
          code: err?.code,
        });
        setError(details);
      }
    };

    void performLogin();
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!cognitoClient || !sessionForPasswordChange) {
      setError('Session expired. Please try logging in again.');
      return;
    }

    try {
      const trimmedUsername = username.trim();
      const command = new RespondToAuthChallengeCommand({
        ClientId: cognitoClientId,
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        Session: sessionForPasswordChange,
        ChallengeResponses: {
          USERNAME: trimmedUsername,
          NEW_PASSWORD: newPassword,
        },
      });

      const response = await cognitoClient.send(command);
      const tokens = response.AuthenticationResult;
      
      if (!tokens?.AccessToken || !tokens?.IdToken) {
        setError('Password change failed: missing tokens.');
        return;
      }

      const groups = decodeGroups(tokens.IdToken);
      const nextState: AuthState = {
        username: trimmedUsername,
        accessToken: tokens.AccessToken,
        idToken: tokens.IdToken,
        refreshToken: tokens.RefreshToken,
        groups,
        issuedAt: Date.now(),
      };

      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
      } catch (_err) {
        // Ignore storage issues; keep in-memory session
      }

      setAuthState(nextState);
      setPassword('');
      setNewPassword('');
      setPasswordChangeRequired(false);
      setSessionForPasswordChange(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to change password. Please try again.';
      setError(`Password change failed: ${message}`);
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      if (authState?.accessToken && cognitoClient) {
        try {
          await cognitoClient.send(
            new GlobalSignOutCommand({
              AccessToken: authState.accessToken,
            })
          );
        } catch (_err) {
          // Best-effort sign out
        }
      }

      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (_e) {
        // Ignore storage errors
      }
      setAuthState(null);
      setUsername('');
      setPassword('');
      setNewPassword('');
      setPasswordChangeRequired(false);
      setSessionForPasswordChange(null);
    };

    void performLogout();
  };

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
              <CardTitle className="text-slate-900">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!passwordChangeRequired ? (
                <form className="space-y-4 text-left" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="username">
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  {!error && configError && (
                    <p className="text-sm text-red-600" role="alert">
                      {configError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!username || !password || !isCognitoConfigured}
                  >
                    Sign in
                  </Button>
                </form>
              ) : (
                <form className="space-y-4 text-left" onSubmit={handlePasswordChange}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="new-password-login">
                      New Password
                    </label>
                    <input
                      id="new-password-login"
                      name="new-password-login"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500">Password must be at least 8 characters long.</p>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPasswordChangeRequired(false);
                        setSessionForPasswordChange(null);
                        setNewPassword('');
                        setError('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!newPassword || newPassword.length < 8}
                    >
                      Set New Password
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
            <p className="text-xs text-slate-500">Signed in as {displayName}</p>
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
          cognitoClient={cognitoClient}
          cognitoUserPoolId={cognitoUserPoolId}
          onBack={() => setCurrentPage('dashboard')}
        />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

export default App;
