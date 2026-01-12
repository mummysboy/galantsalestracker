import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Trash2, RefreshCw, Search, Eye, EyeOff } from 'lucide-react';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { dynamoDBService } from '../services/dynamodb';

interface AdminPageProps {
  cognitoClient: CognitoIdentityProviderClient | null;
  cognitoUserPoolId: string;
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({
  cognitoClient,
  cognitoUserPoolId,
  onBack,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [userFeedback, setUserFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  
  // User list state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [paginationToken, setPaginationToken] = useState<string | undefined>(undefined);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  
  // Report visibility management
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState<Record<string, boolean>>({});
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string | null>(null);
  
  const distributors = ['ALPINE', 'PETES', 'KEHE', 'VISTAR', 'TONYS', 'TROIA', 'MHD', 'DOT'] as const;

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);

    if (!cognitoClient || !cognitoUserPoolId) {
      setUserFeedback({ type: 'error', message: 'Cognito is not configured for user creation.' });
      return;
    }

    const trimmedUsername = newUsername.trim();
    const trimmedPassword = createUserPassword.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setUserFeedback({ type: 'error', message: 'Username and password are required.' });
      return;
    }

    if (trimmedPassword.length < 8) {
      setUserFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
          TemporaryPassword: trimmedPassword,
          MessageAction: 'SUPPRESS',
        })
      );

      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
          Password: trimmedPassword,
          Permanent: true,
        })
      );

      setNewUsername('');
      setCreateUserPassword('');
      setUserFeedback({ type: 'success', message: `User "${trimmedUsername}" created in Cognito with permanent password.` });
      loadUsers(); // Refresh user list
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user. Check AWS permissions.';
      setUserFeedback({ type: 'error', message });
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);

    if (!cognitoClient || !cognitoUserPoolId) {
      setUserFeedback({ type: 'error', message: 'Cognito is not configured for password reset.' });
      return;
    }

    const trimmedUsername = resetUsername.trim();
    const trimmedPassword = resetPassword.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setUserFeedback({ type: 'error', message: 'Username and new password are required.' });
      return;
    }

    if (trimmedPassword.length < 8) {
      setUserFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
        })
      );

      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
          Password: trimmedPassword,
          Permanent: true,
        })
      );

      setResetUsername('');
      setResetPassword('');
      setUserFeedback({ type: 'success', message: `Password reset for "${trimmedUsername}". They can now log in with the new password. The "Force change password" status has been removed.` });
    } catch (err: any) {
      if (err?.name === 'UserNotFoundException') {
        setUserFeedback({ type: 'error', message: `User "${trimmedUsername}" not found. Try using the email address or user ID.` });
      } else if (err?.name === 'InvalidParameterException') {
        setUserFeedback({ type: 'error', message: `Invalid password. Ensure it meets your User Pool's password policy (minimum 8 characters, may require uppercase, lowercase, numbers, or special characters).` });
      } else if (err?.name === 'AccessDeniedException' || err?.code === 'AccessDenied') {
        setUserFeedback({ type: 'error', message: `Access denied. Check that your AWS credentials have 'cognito-idp:AdminSetUserPassword' permission.` });
      } else {
        const message = err instanceof Error ? err.message : 'Failed to reset password.';
        const errorDetails = err?.name ? `${err.name}: ${message}` : message;
        setUserFeedback({ type: 'error', message: `${errorDetails} Check AWS permissions and User Pool ID.` });
      }
    }
  };

  const loadUsers = async (token?: string) => {
    if (!cognitoClient || !cognitoUserPoolId) return;

    setIsLoadingUsers(true);
    try {
      const response = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: cognitoUserPoolId,
          Limit: 60,
          PaginationToken: token,
        })
      );

      const userList = response.Users || [];
      if (token) {
        setUsers(prev => [...prev, ...userList]);
      } else {
        setUsers(userList);
      }

      setPaginationToken(response.PaginationToken);
      setHasMoreUsers(!!response.PaginationToken);
    } catch (err: any) {
      setUserFeedback({ type: 'error', message: `Failed to load users: ${err?.message || 'Unknown error'}` });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    if (!cognitoClient || !cognitoUserPoolId) {
      setUserFeedback({ type: 'error', message: 'Cognito is not configured for user deletion.' });
      return;
    }

    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: cognitoUserPoolId,
          Username: username,
        })
      );

      setUserFeedback({ type: 'success', message: `User "${username}" deleted successfully.` });
      loadUsers(); // Refresh user list
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to delete user. Check AWS permissions.';
      setUserFeedback({ type: 'error', message });
    }
  };

  // Load user permissions - uses email as identifier if available, otherwise username
  const loadUserPermissions = async (identifier: string) => {
    try {
      setLoadingPermissions(prev => ({ ...prev, [identifier]: true }));
      const key = `userPermissions:${identifier}`;
      console.log('[AdminPage] Loading permissions:', { 
        identifier, 
        identifierType: typeof identifier,
        identifierLength: identifier.length,
        key,
        keyLength: key.length
      });
      const appState = await dynamoDBService.getAppState(key);
      console.log('[AdminPage] Loaded app state:', { 
        identifier, 
        key, 
        appState: appState ? 'found' : 'null',
        value: appState?.value,
        valueType: typeof appState?.value,
        valueIsArray: Array.isArray(appState?.value),
        valueLength: appState && Array.isArray(appState.value) ? appState.value.length : 'N/A'
      });
      if (appState && appState.value) {
        setUserPermissions(prev => ({ ...prev, [identifier]: appState.value }));
        console.log('[AdminPage] Set permissions for user:', { identifier, permissions: appState.value });
      } else {
        // Default: no permissions (empty array means user can't see any reports)
        setUserPermissions(prev => ({ ...prev, [identifier]: [] }));
        console.log('[AdminPage] No permissions found for user:', { identifier, key });
      }
    } catch (error) {
      console.error(`Error loading permissions for ${identifier}:`, error);
      setUserPermissions(prev => ({ ...prev, [identifier]: [] }));
    } finally {
      setLoadingPermissions(prev => ({ ...prev, [identifier]: false }));
    }
  };

  // List all saved permissions (for debugging)
  const listAllPermissions = async () => {
    try {
      const allStates = await dynamoDBService.getAllAppStates();
      const permissionStates = allStates.filter(state => state.key.startsWith('userPermissions:'));
      console.log('[AdminPage] All saved permissions:', permissionStates.map(s => ({
        key: s.key,
        username: s.key.replace('userPermissions:', ''),
        value: s.value,
        valueType: typeof s.value,
        valueIsArray: Array.isArray(s.value),
        valueLength: Array.isArray(s.value) ? s.value.length : 'N/A'
      })));
      return permissionStates;
    } catch (error) {
      console.error('[AdminPage] Error listing permissions:', error);
      return [];
    }
  };

  // Save user permissions - uses email as identifier if available, otherwise username
  const saveUserPermissions = async (identifier: string, allowedDistributors: string[]) => {
    try {
      // Normalize identifier (trim whitespace)
      const normalizedIdentifier = identifier.trim();
      const key = `userPermissions:${normalizedIdentifier}`;
      console.log('[AdminPage] Saving permissions:', { 
        originalIdentifier: identifier,
        normalizedIdentifier,
        identifierType: typeof normalizedIdentifier,
        identifierLength: normalizedIdentifier.length,
        key,
        keyLength: key.length,
        allowedDistributors,
        allowedDistributorsType: typeof allowedDistributors,
        allowedDistributorsIsArray: Array.isArray(allowedDistributors),
        allowedDistributorsLength: allowedDistributors.length
      });
      await dynamoDBService.saveAppState(key, allowedDistributors);
      
      // Verify it was saved
      const verify = await dynamoDBService.getAppState(key);
      console.log('[AdminPage] Verified saved permissions:', { 
        normalizedIdentifier, 
        key, 
        saved: verify?.value,
        savedType: typeof verify?.value,
        savedIsArray: Array.isArray(verify?.value),
        savedLength: verify && Array.isArray(verify.value) ? verify.value.length : 'N/A'
      });
      
      // List all permissions for debugging
      await listAllPermissions();
      
      setUserPermissions(prev => ({ ...prev, [normalizedIdentifier]: allowedDistributors }));
      setUserFeedback({ type: 'success', message: `Report visibility updated for "${normalizedIdentifier}". Permissions: ${allowedDistributors.join(', ') || 'None'}` });
    } catch (error) {
      console.error(`Error saving permissions for ${identifier}:`, error);
      setUserFeedback({ type: 'error', message: `Failed to save permissions for "${identifier}": ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  // Toggle distributor permission for a user
  const toggleDistributorPermission = (identifier: string, distributor: string) => {
    const currentPermissions = userPermissions[identifier] || [];
    const newPermissions = currentPermissions.includes(distributor)
      ? currentPermissions.filter(d => d !== distributor)
      : [...currentPermissions, distributor];
    saveUserPermissions(identifier, newPermissions);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Load permissions when a user is selected
  useEffect(() => {
    if (selectedUserForPermissions) {
      loadUserPermissions(selectedUserForPermissions);
    }
  }, [selectedUserForPermissions]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!userSearchTerm.trim()) return true;
    const search = userSearchTerm.toLowerCase();
    const username = user.Username?.toLowerCase() || '';
    const email = user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value?.toLowerCase() || '';
    return username.includes(search) || email.includes(search);
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
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-slate-900 text-lg">User management</CardTitle>
              <CardDescription>Admins can create Cognito users with a permanent password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={handleCreateUser}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="new-username">
                    New username
                  </label>
                  <input
                    id="new-username"
                    name="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. ops"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="new-password">
                    New password
                  </label>
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    value={createUserPassword}
                    onChange={(e) => setCreateUserPassword(e.target.value)}
                    placeholder="Set a password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    Create user
                  </Button>
                </div>
              </form>
              {userFeedback && (
                <p
                  className={`text-sm ${
                    userFeedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'
                  }`}
                  role="alert"
                >
                  {userFeedback.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-slate-900 text-lg">Reset user password</CardTitle>
              <CardDescription>Reset a user's password and remove "Force change password" status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="reset-username">
                    Username to reset
                  </label>
                  <input
                    id="reset-username"
                    name="reset-username"
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="e.g. admin or josh@galantfoodco.com"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="reset-password">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    name="reset-password"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Set new password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" variant="outline">
                    Reset password
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
                  <CardDescription>View and manage all Cognito users. Search by username or email.</CardDescription>
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
                  placeholder="Search by username or email..."
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
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Username</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map((user) => {
                          const email = user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || '-';
                          const emailVerified = user.Attributes?.find((attr: any) => attr.Name === 'email_verified')?.Value === 'true';
                          const userStatus = user.UserStatus || 'UNKNOWN';
                          const createdDate = user.UserCreateDate ? new Date(user.UserCreateDate).toLocaleDateString() : '-';
                          
                          return (
                            <tr key={user.Username} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{user.Username}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {email}
                                {emailVerified && email !== '-' && (
                                  <span className="ml-2 text-xs text-green-600">✓ Verified</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  userStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                  userStatus === 'FORCE_CHANGE_PASSWORD' ? 'bg-yellow-100 text-yellow-700' :
                                  userStatus === 'UNCONFIRMED' ? 'bg-gray-100 text-gray-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {userStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{createdDate}</td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.Username || '')}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                  {hasMoreUsers && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => loadUsers(paginationToken)}
                        disabled={isLoadingUsers}
                      >
                        {isLoadingUsers ? 'Loading...' : 'Load More Users'}
                      </Button>
                    </div>
                  )}
                </>
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
              <div className="space-y-4">
                {filteredUsers.map((user) => {
                  const username = user.Username || '';
                  const email = user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || '-';
                  // Use email as the identifier if available, otherwise use username
                  // This ensures we match the login username which is often the email
                  const identifier = email !== '-' ? email : username;
                  const userPerms = userPermissions[identifier] || [];
                  const isExpanded = selectedUserForPermissions === identifier;
                  
                  return (
                    <div key={username} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{username}</div>
                          <div className="text-sm text-gray-500">{email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Identifier: {identifier} {identifier !== username && identifier !== email ? `(using ${identifier === email ? 'email' : 'username'})` : ''}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {userPerms.length === 0 
                              ? 'No reports visible' 
                              : `${userPerms.length} report${userPerms.length === 1 ? '' : 's'} visible`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isExpanded) {
                              setSelectedUserForPermissions(null);
                            } else {
                              setSelectedUserForPermissions(identifier);
                              if (!userPermissions[identifier]) {
                                loadUserPermissions(identifier);
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
                          {loadingPermissions[identifier] ? (
                            <div className="text-sm text-gray-500">Loading permissions...</div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Select reports this user can view:
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                Saving permissions for: {identifier}
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
                                      onClick={() => toggleDistributorPermission(identifier, distributor)}
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
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found. Create a user first to manage report visibility.</p>
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

