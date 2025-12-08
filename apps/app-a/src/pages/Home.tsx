import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  GoogleLogo,
} from '@repo/ui';
import { useAuth, IDP_URL, OTHER_APP_URL } from '../context/AuthContext';
import { createApiClient, type Task } from '@repo/auth-client';

const apiClient = createApiClient(IDP_URL);

export function Home() {
  const { user, isAuthenticated, isLoading, login, loginWithGoogle, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  // Fetch tasks on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
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
    try {
      const updatedTask = await apiClient.toggleTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiClient.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  // Auth loading is now handled by AuthOverlay at App level
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-4">
            <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mx-auto">
              T
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to TaskFlow</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Choose your sign-in method
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={login}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              aria-label="Sign in with Custom SSO"
            >
              Custom SSO
            </Button>
            <Button
              onClick={loginWithGoogle}
              className="w-full"
              variant="outline"
              aria-label="Sign in with Google"
            >
              <GoogleLogo className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Watch the debug panel to see the OAuth 2.0 + PKCE flow
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/settings" className={buttonVariants({ variant: 'ghost' })} aria-label="Go to settings">
            Settings
          </Link>
          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut} aria-label="Sign out">
            {isLoggingOut && <Spinner />}
            {isLoggingOut ? 'Signing out' : 'Sign out'}
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✨</div>
            <div className="flex-1 space-y-2">
              <p className="font-medium">
                Successfully authenticated
              </p>
              <p className="text-sm text-muted-foreground">
                Check the debug panel to see your tokens and API calls.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="default">Access Token</Badge>
                <Badge variant="secondary">ID Token</Badge>
                <Badge variant="outline">Refresh Token</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Tasks</CardTitle>
            {isLoadingTasks && <Spinner />}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Add Task Form */}
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Add a new task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              disabled={isCreatingTask}
              className="flex-1"
            />
            <Button type="submit" disabled={isCreatingTask || !newTaskText.trim()} size="sm" aria-label="Add new task">
              {isCreatingTask && <Spinner />}
              {isCreatingTask ? 'Adding...' : 'Add'}
            </Button>
          </form>

          {/* Tasks List */}
          {isLoadingTasks && tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Spinner className="mx-auto mb-2" />
              <p className="text-sm">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No tasks yet. Add your first task above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 border border-border hover:bg-muted/50 transition-colors group"
                >
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => handleToggleTask(task.id)}
                  />
                  <Label
                    htmlFor={`task-${task.id}`}
                    className={`flex-1 cursor-pointer ${
                      task.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {task.text}
                  </Label>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete task: ${task.text}`}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SSO Demo */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Try Single Sign-On</p>
              <p className="text-sm text-muted-foreground">
                Visit DocVault - you'll be logged in automatically!
              </p>
            </div>
            <a
              href={OTHER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
              aria-label="Open DocVault application in new tab"
            >
              Open DocVault →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
