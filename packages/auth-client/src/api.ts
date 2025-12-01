// API client for making authenticated requests

import { getStoredTokens } from './tokens.js';

export interface Task {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken } = getStoredTokens();

    if (!accessToken) {
      throw new Error('No access token available');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Only set Content-Type for requests with body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    Object.assign(headers, options.headers);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'unknown_error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.message || 'API request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  }

  async getTasks(): Promise<Task[]> {
    const response = await this.request<{ tasks: Task[] }>('/api/tasks');
    return response.tasks;
  }

  async createTask(text: string): Promise<Task> {
    const response = await this.request<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return response.task;
  }

  async toggleTask(taskId: string): Promise<Task> {
    const response = await this.request<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
    });
    return response.task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request<void>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async getDocuments(): Promise<Document[]> {
    const response = await this.request<{ documents: Document[] }>('/api/documents');
    return response.documents;
  }

  async createDocument(document: { name: string; size: number; mimeType: string }): Promise<Document> {
    const response = await this.request<{ document: Document }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    });
    return response.document;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.request<void>(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  }
}

export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl);
}
