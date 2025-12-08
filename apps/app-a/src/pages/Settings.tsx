import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, buttonVariants, Input, Button, Label, toast, Spinner } from '@repo/ui';
import { useAuth, IDP_URL } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export function Settings() {
  const { user, tokens, decodedTokens, accessTokenExpiry, isAuthenticated, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayUser, setDisplayUser] = useState(user);
  const [hasLocalPassword, setHasLocalPassword] = useState<boolean | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPasswordForOAuth, setNewPasswordForOAuth] = useState('');
  const [confirmPasswordForOAuth, setConfirmPasswordForOAuth] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });

  // Fetch profile to check if user has local password
  useEffect(() => {
    if (tokens.accessToken) {
      fetch(`${IDP_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setHasLocalPassword(data.user.hasLocalPassword);
          }
        })
        .catch(() => {
          // Ignore errors, assume local password exists
          setHasLocalPassword(true);
        });
    }
  }, [tokens.accessToken]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" />;

  // Sync displayUser with user from context when user changes
  React.useEffect(() => {
    setDisplayUser(user);
  }, [user]);

  const handleEditClick = () => {
    setFormData({
      name: displayUser?.name || '',
      email: displayUser?.email || '',
      currentPassword: '',
      newPassword: '',
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      email: '',
      currentPassword: '',
      newPassword: '',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const payload: Record<string, string> = {};

      if (formData.name !== displayUser?.name) {
        payload.name = formData.name;
      }

      if (formData.email !== displayUser?.email) {
        payload.email = formData.email;
      }

      if (formData.newPassword) {
        if (!formData.currentPassword) {
          toast.error('Please enter your current password to change your password');
          setIsSaving(false);
          return;
        }
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.error('No changes to save');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${IDP_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const result = await response.json();

      // Update the displayed user state immediately with the API response
      if (result.user) {
        setDisplayUser({
          sub: result.user.id,
          email: result.user.email,
          name: result.user.name,
        });
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
      setFormData({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
      });
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPasswordForOAuth !== confirmPasswordForOAuth) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPasswordForOAuth.length < 10) {
      toast.error('Password must be at least 10 characters');
      return;
    }

    setIsSettingPassword(true);

    try {
      const response = await fetch(`${IDP_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ newPassword: newPasswordForOAuth }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set password');
      }

      toast.success('Password set successfully! You can now use local login.');
      setHasLocalPassword(true);
      setNewPasswordForOAuth('');
      setConfirmPasswordForOAuth('');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Your account information</p>
        </div>
        <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Home
        </Link>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account details from the IdP</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={handleEditClick} variant="outline" size="sm">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{displayUser?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{displayUser?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID (sub)</p>
                <p className="font-mono text-sm">{displayUser?.sub || '-'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password (required to change password)</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  disabled={isSaving}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password (optional)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  disabled={isSaving}
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">User ID (sub)</p>
                <p className="font-mono text-sm">{displayUser?.sub || '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Password for OAuth Users */}
      {hasLocalPassword === false && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set Local Password</CardTitle>
            <CardDescription>
              You signed up with Google. Set a password to also use local login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPasswordOAuth">New Password</Label>
              <Input
                id="newPasswordOAuth"
                type="password"
                value={newPasswordForOAuth}
                onChange={(e) => setNewPasswordForOAuth(e.target.value)}
                disabled={isSettingPassword}
                placeholder="At least 10 characters, mixed case, with number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPasswordOAuth">Confirm Password</Label>
              <Input
                id="confirmPasswordOAuth"
                type="password"
                value={confirmPasswordForOAuth}
                onChange={(e) => setConfirmPasswordForOAuth(e.target.value)}
                disabled={isSettingPassword}
                placeholder="Confirm your password"
              />
            </div>

            <Button
              onClick={handleSetPassword}
              disabled={isSettingPassword || !newPasswordForOAuth || !confirmPasswordForOAuth}
            >
              {isSettingPassword ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Setting Password...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Token Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Current authentication tokens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={tokens.accessToken ? 'default' : 'secondary'}>
              Access Token {tokens.accessToken ? '✓' : '✗'}
            </Badge>
            <Badge variant={tokens.idToken ? 'default' : 'secondary'}>
              ID Token {tokens.idToken ? '✓' : '✗'}
            </Badge>
            <Badge variant={tokens.refreshToken ? 'default' : 'secondary'}>
              Refresh Token {tokens.refreshToken ? '✓' : '✗'}
            </Badge>
          </div>

          {accessTokenExpiry && (
            <div>
              <p className="text-sm text-muted-foreground">Token Expires</p>
              <p className="font-medium">{accessTokenExpiry.toLocaleString()}</p>
            </div>
          )}

          {decodedTokens.idToken && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">ID Token Claims</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(decodedTokens.idToken.payload, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
