import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { AuthResponse, User, Project, ProjectsResponse, StorageStats, Adjustments, CropSettings } from '../types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'lightroom_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common['Authorization'];
};

// Initialize token on app start
const token = getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    
    // Create a standardized error object
    const apiError = {
      status: error.response?.status || 500,
      message: (error.response?.data as any)?.error || error.message || 'An error occurred',
      details: (error.response?.data as any)?.details || [],
    };
    
    return Promise.reject(apiError);
  }
);

// Auth API functions
export const authAPI = {
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', userData);
    const authData = response.data;
    setToken(authData.token);
    return authData;
  },

  login: async (credentials: {
    login: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    const authData = response.data;
    setToken(authData.token);
    return authData;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      removeToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  updateProfile: async (profileData: {
    firstName?: string;
    lastName?: string;
    preferences?: Partial<User['preferences']>;
  }): Promise<User> => {
    const response = await api.put('/auth/profile', profileData);
    return response.data.user;
  },

  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post('/auth/change-password', passwordData);
  },
};

// Upload API functions
export const uploadAPI = {
  uploadImage: async (
    file: File,
    title?: string,
    description?: string,
    tags?: string[],
    onProgress?: (progress: number) => void
  ): Promise<Project> => {
    const formData = new FormData();
    formData.append('image', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (tags && tags.length > 0) formData.append('tags', tags.join(','));

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.project;
  },

  batchUpload: async (
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<Project[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await api.post('/upload/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.projects;
  },

  getStorageStats: async (): Promise<StorageStats> => {
    const response = await api.get('/upload/storage');
    return response.data;
  },
};

// Projects API functions
export const projectsAPI = {
  getProjects: async (params?: {
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'lastEdited' | 'title';
    order?: 'asc' | 'desc';
    starred?: boolean;
    search?: string;
  }): Promise<ProjectsResponse> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  getProject: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data.project;
  },

  updateProject: async (
    id: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      starred?: boolean;
      isPublic?: boolean;
    }
  ): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, updates);
    return response.data.project;
  },

  updateAdjustments: async (
    id: string,
    adjustments: Partial<Adjustments>
  ): Promise<{ adjustments: Adjustments; lastEdited: string; version: number }> => {
    const response = await api.put(`/projects/${id}/adjustments`, { adjustments });
    return response.data;
  },

  updateCrop: async (
    id: string,
    crop: CropSettings
  ): Promise<{ crop: CropSettings; lastEdited: string; version: number }> => {
    const response = await api.put(`/projects/${id}/crop`, { crop });
    return response.data;
  },

  resetProject: async (
    id: string
  ): Promise<{ adjustments: Adjustments; crop: CropSettings | null; lastEdited: string; version: number }> => {
    const response = await api.post(`/projects/${id}/reset`);
    return response.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  getProjectHistory: async (id: string): Promise<any[]> => {
    const response = await api.get(`/projects/${id}/history`);
    return response.data.history;
  },
};

// Export API functions
export const exportAPI = {
  exportProject: async (
    id: string,
    settings: {
      format: 'jpeg' | 'png' | 'tiff' | 'webp';
      quality: number;
      width?: number;
      height?: number;
    }
  ): Promise<Blob> => {
    const response = await api.post(
      `/projects/${id}/export`,
      settings,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  batchExport: async (
    projectIds: string[],
    settings: {
      format: 'jpeg' | 'png' | 'tiff' | 'webp';
      quality: number;
    }
  ): Promise<Blob> => {
    const response = await api.post(
      `/projects/export/batch`,
      { projectIds, settings },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
};

export default api;
