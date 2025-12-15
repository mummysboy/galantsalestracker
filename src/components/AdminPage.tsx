import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Trash2, RefreshCw, Search } from 'lucide-react';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

interface AdminPageProps {
  cognitoClient: CognitoIdentityProviderClient | null;
  cognitoUserPoolId: string;
  adminGroupName: string;
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({
  cognitoClient,
  cognitoUserPoolId,
  adminGroupName,
  onBack,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [groupUsername, setGroupUsername] = useState('');
  const [groupName, setGroupName] = useState(adminGroupName);
  const [userFeedback, setUserFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  
  // User list state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [paginationToken, setPaginationToken] = useState<string | undefined>(undefined);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);

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

  const handleAddUserToGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);

    if (!cognitoClient || !cognitoUserPoolId) {
      setUserFeedback({ type: 'error', message: 'Cognito is not configured for group management.' });
      return;
    }

    const trimmedUsername = groupUsername.trim();
    const trimmedGroupName = groupName.trim();

    if (!trimmedUsername || !trimmedGroupName) {
      setUserFeedback({ type: 'error', message: 'Username and group name are required.' });
      return;
    }

    try {
      await cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
          GroupName: trimmedGroupName,
        })
      );

      setGroupUsername('');
      setUserFeedback({ type: 'success', message: `User "${trimmedUsername}" added to group "${trimmedGroupName}".` });
    } catch (err: any) {
      if (err?.name === 'UserNotFoundException') {
        setUserFeedback({ type: 'error', message: `User "${trimmedUsername}" not found.` });
      } else if (err?.name === 'ResourceNotFoundException' && err?.message?.includes('group')) {
        setUserFeedback({ type: 'error', message: `Group "${trimmedGroupName}" not found. Create it in Cognito Console first.` });
      } else {
        const message = err instanceof Error ? err.message : 'Failed to add user to group. Check AWS permissions.';
        setUserFeedback({ type: 'error', message });
      }
    }
  };

  const handleRemoveUserFromGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFeedback(null);

    if (!cognitoClient || !cognitoUserPoolId) {
      setUserFeedback({ type: 'error', message: 'Cognito is not configured for group management.' });
      return;
    }

    const trimmedUsername = groupUsername.trim();
    const trimmedGroupName = groupName.trim();

    if (!trimmedUsername || !trimmedGroupName) {
      setUserFeedback({ type: 'error', message: 'Username and group name are required.' });
      return;
    }

    try {
      await cognitoClient.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: cognitoUserPoolId,
          Username: trimmedUsername,
          GroupName: trimmedGroupName,
        })
      );

      setGroupUsername('');
      setUserFeedback({ type: 'success', message: `User "${trimmedUsername}" removed from group "${trimmedGroupName}".` });
      loadUsers(); // Refresh user list
    } catch (err: any) {
      if (err?.name === 'UserNotFoundException') {
        setUserFeedback({ type: 'error', message: `User "${trimmedUsername}" not found.` });
      } else if (err?.name === 'ResourceNotFoundException' && err?.message?.includes('group')) {
        setUserFeedback({ type: 'error', message: `Group "${trimmedGroupName}" not found.` });
      } else {
        const message = err instanceof Error ? err.message : 'Failed to remove user from group. Check AWS permissions.';
        setUserFeedback({ type: 'error', message });
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

  useEffect(() => {
    loadUsers();
  }, []);

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
              <CardTitle className="text-slate-900 text-lg">Group management</CardTitle>
              <CardDescription>Add or remove users from Cognito groups (e.g., admin group).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={handleAddUserToGroup}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="group-username">
                    Username
                  </label>
                  <input
                    id="group-username"
                    name="group-username"
                    type="text"
                    value={groupUsername}
                    onChange={(e) => setGroupUsername(e.target.value)}
                    placeholder="e.g. admin or josh@galantfoodco.com"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="group-name">
                    Group name
                  </label>
                  <input
                    id="group-name"
                    name="group-name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="admin"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    Add to group
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!groupUsername.trim() || !groupName.trim()) {
                        setUserFeedback({ type: 'error', message: 'Username and group name are required.' });
                        return;
                      }
                      const fakeEvent = {
                        preventDefault: () => {},
                      } as React.FormEvent<HTMLFormElement>;
                      await handleRemoveUserFromGroup(fakeEvent);
                    }}
                  >
                    Remove from group
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
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

