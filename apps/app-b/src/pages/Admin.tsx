import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Skeleton,
  toast,
  Users,
  Trash2,
  Shield,
  FileText,
  ChevronRight,
  Menu,
  X,
  cn,
} from '@repo/ui';
import { useAuth, IDP_URL } from '../context/AuthContext';
import { createApiClient, type AdminUser, type AdminDocument } from '@repo/auth-client';

const apiClient = createApiClient(IDP_URL);

// Skeleton for users list in sidebar
function UsersSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-muted/50">
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for documents
function DocumentsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="size-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function Admin() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarAnimatingOut, setSidebarAnimatingOut] = useState(false);
  const [sidebarShouldRender, setSidebarShouldRender] = useState(false);

  // Handle mobile sidebar open/close with animation
  useEffect(() => {
    if (sidebarOpen) {
      setSidebarShouldRender(true);
      setSidebarAnimatingOut(false);
    } else if (sidebarShouldRender) {
      setSidebarAnimatingOut(true);
      const timer = setTimeout(() => {
        setSidebarShouldRender(false);
        setSidebarAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen, sidebarShouldRender]);

  const handleSidebarClose = () => {
    setSidebarAnimatingOut(true);
    setTimeout(() => {
      setSidebarOpen(false);
    }, 300);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      handleSidebarClose();
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
      fetchDocuments();
    }
  }, [isAuthenticated, isAdmin]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const fetchedUsers = await apiClient.getAdminUsers();
      setUsers(fetchedUsers);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const fetchedDocs = await apiClient.getAdminDocuments();
      setDocuments(fetchedDocs);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingDocId(documentId);
    try {
      await apiClient.adminDeleteDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  // Loading state
  if (isLoading) {
    return null;
  }

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
  const userDocuments = selectedUserId ? documents.filter(d => d.owner.id === selectedUserId) : [];

  // Sidebar content component to avoid duplication
  const SidebarContent = ({ onUserSelect }: { onUserSelect: (id: string) => void }) => (
    <>
      {/* Stats */}
      <div className="p-4 border-b border-border">
        {isLoadingUsers || isLoadingDocuments ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{users.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-auto p-2">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          All Users
        </p>
        {isLoadingUsers ? (
          <UsersSkeleton />
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
        ) : (
          <div className="space-y-1">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  selectedUserId === user.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-muted'
                }`}
              >
                <div className={`size-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  selectedUserId === user.id
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className={`text-xs truncate ${
                    selectedUserId === user.id ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {user.email}
                  </p>
                </div>
                {user.role === 'admin' && (
                  <Badge variant={selectedUserId === user.id ? 'secondary' : 'default'} className="text-[10px] px-1.5">
                    Admin
                  </Badge>
                )}
                <ChevronRight className={`size-4 ${
                  selectedUserId === user.id ? 'text-white/50' : 'text-muted-foreground/50'
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 border-r border-border bg-muted/30 flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin</h1>
              <p className="text-xs text-muted-foreground">Manage users & docs</p>
            </div>
          </div>
        </div>
        <SidebarContent onUserSelect={setSelectedUserId} />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarShouldRender && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
              sidebarAnimatingOut ? "opacity-0" : "opacity-100"
            )}
            onClick={handleSidebarClose}
            aria-hidden="true"
          />
          {/* Sidebar Sheet */}
          <aside
            className={cn(
              "fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50 md:hidden",
              "transition-transform duration-300 ease-out",
              sidebarAnimatingOut ? "-translate-x-full" : "translate-x-0"
            )}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Shield className="size-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Admin</h1>
                  <p className="text-xs text-muted-foreground">Manage users & docs</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSidebarClose}
                className="size-8"
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarContent onUserSelect={handleUserSelect} />
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="size-9"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="size-4 text-white" />
            </div>
            <span className="font-semibold">Admin</span>
          </div>
          {selectedUser && (
            <Badge variant="secondary" className="ml-auto">
              {selectedUser.name}
            </Badge>
          )}
        </div>

        {!selectedUser ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-1">Select a User</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a user from the sidebar to view their details and documents
              </p>
              <Button
                variant="outline"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
              >
                <Users className="size-4 mr-2" />
                View Users
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-3xl">
            {/* User Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{selectedUser.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* User's Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Documents
                    <Badge variant="secondary" className="font-normal">
                      {userDocuments.length}
                    </Badge>
                  </CardTitle>
                  {isLoadingDocuments && <Spinner />}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments && userDocuments.length === 0 ? (
                  <DocumentsSkeleton />
                ) : userDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileText className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No documents for this user yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-all group ${
                          deletingDocId === doc.id ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileText className="size-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                        >
                          {deletingDocId === doc.id ? (
                            <Spinner className="size-4" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
