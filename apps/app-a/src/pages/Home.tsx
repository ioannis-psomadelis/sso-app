import { useState, useEffect, useRef } from 'react';
import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Badge,
  Spinner,
  Input,
  toast,
  Skeleton,
  Check,
} from '@repo/ui';
import { useAuth, IDP_URL, OTHER_APP_URL } from '../context/AuthContext';
import { createApiClient, type Task } from '@repo/auth-client';
import { Landing, useAppTheme, getOtherAppTheme } from '@repo/shared-app';

const apiClient = createApiClient(IDP_URL);

// Skeleton for task list
function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// Skeleton for stats
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border">
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function Home() {
  const { user, isAuthenticated, isLoading, login, loginWithGoogle } = useAuth();
  const { theme } = useAppTheme();
  const otherTheme = getOtherAppTheme(theme);

  // All hooks must be before any early return
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true); // Start true to show skeleton
  const [newTaskText, setNewTaskText] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    } else {
      setIsLoadingTasks(false);
    }
  }, [isAuthenticated]);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const fetchedTasks = await apiClient.getTasks();
      setTasks(fetchedTasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    setIsCreatingTask(true);
    try {
      const task = await apiClient.createTask(newTaskText.trim());
      setTasks(prev => [...prev, task]);
      setNewTaskText('');
      toast.success('Task created');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    setTogglingTaskId(taskId);
    try {
      const updatedTask = await apiClient.toggleTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch {
      toast.error('Failed to update task');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await apiClient.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Wait for auth state to be determined (prevents flash)
  if (isLoading) {
    return null;
  }

  // Show fancy landing page for unauthenticated users
  if (!isAuthenticated) {
    return <Landing onLogin={login} onLoginWithGoogle={loginWithGoogle} />;
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start gap-4">
        <div className={`size-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg ${theme.shadow}`}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <Badge variant="secondary" className="hidden sm:flex">
          <Check className="size-3 mr-1" />
          Authenticated
        </Badge>
      </div>

      {/* Stats */}
      {isLoadingTasks ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-xl ${theme.accentBgLight} border ${theme.accentBorder}`}>
            <p className={`text-2xl font-bold ${theme.accentTextDark} dark:${theme.accentText}`}>{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      )}

      {/* Tasks Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Your Tasks
              {isLoadingTasks && <Spinner className="size-4" />}
            </CardTitle>
            {tasks.length > 0 && !isLoadingTasks && (
              <Badge variant="secondary" className="font-normal">
                {completedCount}/{tasks.length} done
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Task Form */}
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="What needs to be done?"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              disabled={isCreatingTask}
              className="flex-1"
            />
            <Button type="submit" disabled={isCreatingTask || !newTaskText.trim()} aria-label="Add new task">
              {isCreatingTask ? <Spinner className="size-4" /> : 'Add Task'}
            </Button>
          </form>

          {/* Tasks List */}
          {isLoadingTasks ? (
            <TasksSkeleton />
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Check className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first task above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-all group ${
                    togglingTaskId === task.id || deletingTaskId === task.id ? 'opacity-60' : ''
                  }`}
                >
                  {togglingTaskId === task.id ? (
                    <Spinner className="size-5" />
                  ) : (
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task.id)}
                      disabled={!!togglingTaskId || !!deletingTaskId}
                      className="size-5"
                    />
                  )}
                  <Label
                    htmlFor={`task-${task.id}`}
                    className={`flex-1 cursor-pointer text-base ${
                      task.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {task.text}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={deletingTaskId === task.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete task: ${task.text}`}
                  >
                    {deletingTaskId === task.id ? <Spinner className="size-4" /> : 'Delete'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSO Demo Card */}
      <Card className={`${otherTheme.cardBorder} ${otherTheme.cardBg}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`size-12 rounded-xl bg-gradient-to-br ${otherTheme.gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg ${otherTheme.shadow}`}>
              {otherTheme.shortName}
            </div>
            <div className="flex-1">
              <p className="font-semibold">Try Single Sign-On</p>
              <p className="text-sm text-muted-foreground">
                Visit {otherTheme.name} - you're already logged in!
              </p>
            </div>
            <a
              href={OTHER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'default' })}
              aria-label={`Open ${otherTheme.name} application in new tab`}
            >
              Open {otherTheme.name}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
