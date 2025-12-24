import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Button,
  Label,
  toast,
  Spinner,
  User,
  Key,
  Shield,
  Clock,
  Check,
} from '@repo/ui';
import { useAuth, IDP_URL } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

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

  // Sync displayUser with user from context when user changes
  useEffect(() => {
    setDisplayUser(user);
  }, [user]);

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
          role: result.user.role || displayUser?.role || 'user',
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
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/25">
          {displayUser?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and security</p>
        </div>
        <Badge variant="secondary" className="hidden sm:flex">
          <Check className="size-3 mr-1" />
          Verified
        </Badge>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="size-5 text-blue-600 dark:text-blue-400" />
              Profile Information
            </CardTitle>
            {!isEditing && (
              <Button onClick={handleEditClick} variant="outline" size="sm">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                <p className="font-medium">{displayUser?.name || '-'}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                <p className="font-medium">{displayUser?.email || '-'}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">User ID</p>
                <p className="font-mono text-sm break-all">{displayUser?.sub || '-'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Change Password</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      disabled={isSaving}
                      placeholder="Required to change password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      disabled={isSaving}
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Spinner className="mr-2 size-4" />
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Password for OAuth Users */}
      {hasLocalPassword === false && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="size-5 text-amber-500" />
              Set Local Password
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You signed up with Google. Set a password to also use local login.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPasswordOAuth">New Password</Label>
                <Input
                  id="newPasswordOAuth"
                  type="password"
                  value={newPasswordForOAuth}
                  onChange={(e) => setNewPasswordForOAuth(e.target.value)}
                  disabled={isSettingPassword}
                  placeholder="Min 10 chars, mixed case, number"
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
            </div>

            <Button
              onClick={handleSetPassword}
              disabled={isSettingPassword || !newPasswordForOAuth || !confirmPasswordForOAuth}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isSettingPassword ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Setting Password...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session & Tokens */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="size-5 text-emerald-500" />
            Session & Tokens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tokens.accessToken ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted'}`}>
              <div className={`size-2 rounded-full shrink-0 ${tokens.accessToken ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium truncate">Access Token</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tokens.idToken ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-muted'}`}>
              <div className={`size-2 rounded-full shrink-0 ${tokens.idToken ? 'bg-blue-500' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium truncate">ID Token</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tokens.refreshToken ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-muted'}`}>
              <div className={`size-2 rounded-full shrink-0 ${tokens.refreshToken ? 'bg-cyan-500' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium truncate">Refresh Token</span>
            </div>
          </div>

          {/* Token Expiry */}
          {accessTokenExpiry && (
            <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-3">
              <Clock className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Token Expires</p>
                <p className="font-medium">{accessTokenExpiry.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* ID Token Claims */}
          {decodedTokens.idToken && (
            <div>
              <p className="text-sm font-medium mb-2">ID Token Claims</p>
              <pre className="bg-muted p-4 rounded-xl text-xs overflow-auto max-h-48 font-mono">
                {JSON.stringify(decodedTokens.idToken.payload, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
