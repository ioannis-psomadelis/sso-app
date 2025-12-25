import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Badge,
  Spinner,
  Skeleton,
  toast,
  Users,
  User,
  Trash2,
  Shield,
  ChevronRight,
} from '@repo/ui';
import { useAuth, IDP_URL } from '../context/AuthContext';
import { createApiClient, type AdminUser, type AdminTask } from '@repo/auth-client';

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

// Skeleton for tasks
function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function Admin() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
      fetchTasks();
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

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const fetchedTasks = await apiClient.getAdminTasks();
      setTasks(fetchedTasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    setTogglingTaskId(taskId);
    try {
      const updatedTask = await apiClient.adminToggleTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: updatedTask.completed } : t));
    } catch {
      toast.error('Failed to update task');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await apiClient.adminDeleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
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
  const userTasks = selectedUserId ? tasks.filter(t => t.owner.id === selectedUserId) : [];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-muted/30 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin</h1>
              <p className="text-xs text-muted-foreground">Manage users & tasks</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-border">
          {isLoadingUsers || isLoadingTasks ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{users.length}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
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
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    selectedUserId === user.id
                      ? 'bg-violet-600 text-white shadow-md'
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {!selectedUser ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-1">Select a User</h2>
              <p className="text-sm text-muted-foreground">
                Choose a user from the sidebar to view their details and tasks
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-3xl">
            {/* User Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
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

            {/* User's Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Tasks
                    <Badge variant="secondary" className="font-normal">
                      {userTasks.length}
                    </Badge>
                  </CardTitle>
                  {isLoadingTasks && <Spinner />}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTasks && userTasks.length === 0 ? (
                  <TasksSkeleton />
                ) : userTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <User className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No tasks for this user yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-all group ${
                          togglingTaskId === task.id || deletingTaskId === task.id ? 'opacity-60' : ''
                        }`}
                      >
                        {togglingTaskId === task.id ? (
                          <Spinner className="size-5" />
                        ) : (
                          <Checkbox
                            id={`admin-task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => handleToggleTask(task.id)}
                            disabled={!!togglingTaskId || !!deletingTaskId}
                            className="size-5"
                          />
                        )}
                        <span
                          className={`flex-1 ${
                            task.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {task.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={deletingTaskId === task.id}
                        >
                          {deletingTaskId === task.id ? (
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
