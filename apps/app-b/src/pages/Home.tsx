import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Input,
  toast,
} from '@repo/ui';
import { useAuth } from '../context/AuthContext';
import { createApiClient, type Document } from '@repo/auth-client';

// FileText icon component
function FileText({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

const IDP_URL = 'http://localhost:3000';

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

export function Home() {
  const { user, isAuthenticated, isLoading, login, loginWithKeycloak, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const apiClient = createApiClient(IDP_URL);

  // Fetch documents on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
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

  const handleUpload = async () => {
    if (!newDocName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
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
            <div className="size-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold mx-auto">
              D
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to DocVault</CardTitle>
              <CardDescription>Choose your sign-in method</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={login}
              className="w-full"
              variant="default"
            >
              Sign in with Local IdP
            </Button>
            <Button
              onClick={loginWithKeycloak}
              className="w-full"
              variant="outline"
            >
              Sign in with Keycloak
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
          <Link to="/settings" className={buttonVariants({ variant: 'ghost' })}>
            Settings
          </Link>
          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut && <Spinner />}
            {isLoggingOut ? 'Signing out' : 'Sign out'}
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      <Card className="border-accent/20 bg-accent/5">
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

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Documents</CardTitle>
          </div>
          <CardDescription>
            Upload and manage your documents with authenticated API calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Form */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter document name (e.g., Report.pdf)"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpload()}
              disabled={isUploading}
            />
            <Button
              onClick={handleUpload}
              disabled={isUploading || !newDocName.trim()}
            >
              {isUploading && <Spinner />}
              {isUploading ? 'Uploading' : 'Upload'}
            </Button>
          </div>

          {/* Documents List */}
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
              <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No documents yet. Upload your first document above.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 border border-border hover:bg-muted/50 transition-colors">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingDocId === doc.id}
                  >
                    {deletingDocId === doc.id ? <Spinner /> : 'Delete'}
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
                Visit TaskFlow - you'll be logged in automatically!
              </p>
            </div>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
            >
              Open TaskFlow →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
