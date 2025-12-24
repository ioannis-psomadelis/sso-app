import { useState, useEffect, useRef } from 'react';
import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Input,
  toast,
  Skeleton,
  FileText,
  Check,
} from '@repo/ui';
import { useAuth, IDP_URL, OTHER_APP_URL } from '../context/AuthContext';
import { createApiClient, type Document } from '@repo/auth-client';
import { Landing, useAppTheme, getOtherAppTheme } from '@repo/shared-app';

const apiClient = createApiClient(IDP_URL);

// Helper function to get random mime type for simulated uploads
function getRandomMimeType(): string {
  const types = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'text/plain',
  ];
  return types[Math.floor(Math.random() * types.length)];
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Skeleton for document list
function DocumentsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true); // Start true to show skeleton
  const [newDocName, setNewDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch documents on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
    } else {
      setIsLoadingDocs(false);
    }
  }, [isAuthenticated]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await apiClient.getDocuments();
      setDocuments(docs);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    setIsUploading(true);
    try {
      const doc = await apiClient.createDocument({
        name: newDocName.trim(),
        size: Math.floor(Math.random() * 5000000) + 10000,
        mimeType: getRandomMimeType(),
      });
      setDocuments([doc, ...documents]);
      setNewDocName('');
      toast.success('Document uploaded');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      await apiClient.deleteDocument(docId);
      setDocuments(documents.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocId(null);
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

  const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);
  const todayCount = documents.filter(d => {
    const date = new Date(d.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length;

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
      {isLoadingDocs ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-xl ${theme.accentBgLight} border ${theme.accentBorder}`}>
            <p className={`text-2xl font-bold ${theme.accentTextDark} dark:${theme.accentText}`}>{documents.length}</p>
            <p className="text-xs text-muted-foreground">Total Docs</p>
          </div>
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{formatFileSize(totalSize)}</p>
            <p className="text-xs text-muted-foreground">Storage Used</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
        </div>
      )}

      {/* Documents Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Your Documents
              {isLoadingDocs && <Spinner className="size-4" />}
            </CardTitle>
            {documents.length > 0 && !isLoadingDocs && (
              <Badge variant="secondary" className="font-normal">
                {documents.length} files
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Form */}
          <form onSubmit={handleUpload} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Document name (e.g., Report.pdf)"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              disabled={isUploading}
              className="flex-1"
            />
            <Button type="submit" disabled={isUploading || !newDocName.trim()} aria-label="Upload document">
              {isUploading ? <Spinner className="size-4" /> : 'Upload'}
            </Button>
          </form>

          {/* Documents List */}
          {isLoadingDocs ? (
            <DocumentsSkeleton />
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No documents yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload your first document above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-all group ${
                    deletingDocId === doc.id ? 'opacity-60' : ''
                  }`}
                >
                  <div className={`size-10 rounded-lg ${theme.accentBgLight} flex items-center justify-center`}>
                    <FileText className={`size-5 ${theme.accentTextDark} dark:${theme.accentText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete document: ${doc.name}`}
                  >
                    {deletingDocId === doc.id ? <Spinner className="size-4" /> : 'Delete'}
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
