// User types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark';
    autoSave: boolean;
    quality: 'low' | 'medium' | 'high' | 'ultra';
  };
  storageUsed: number;
  storageLimit: number;
  isEmailVerified?: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Image and Project types
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetadata {
  colorSpace?: string;
  orientation?: number;
  camera?: string;
  lens?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  dateTaken?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
}

export interface ProjectImage {
  url: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalFilename: string;
  dimensions: ImageDimensions;
  size: number;
  metadata?: ImageMetadata;
}

export interface GrainSettings {
  amount: number;
  size: number;
  roughness: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ImageAdjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  texture?: number;
  clarity?: number;
  dehaze?: number;
  structure?: number;
  
  // HSL Adjustments
  hslAdjustments?: {
    red?: { hue?: number; saturation?: number; lightness?: number };
    green?: { hue?: number; saturation?: number; lightness?: number };
    blue?: { hue?: number; saturation?: number; lightness?: number };
  };
  
  // Curves
  curves?: Array<{ input: number; output: number }>;
  
  // Vignette
  vignette?: {
    enabled?: boolean;
    amount?: number;
    midpoint?: number;
    roundness?: number;
    feather?: number;
    style?: 'round' | 'square' | 'custom';
  };
  
  // Grain
  grain?: {
    enabled?: boolean;
    amount?: number;
    size?: number;
    roughness?: number;
  };
  
  // Sharpening
  sharpening?: {
    amount?: number;
    radius?: number;
    detail?: number;
  };
  
  // Noise Reduction
  noiseReduction?: {
    luminance?: number;
    color?: number;
    detail?: number;
  };
  
  // Blending
  blendMode?: string;
  opacity?: number;
}

// Keep legacy interface for compatibility
export interface Adjustments extends Omit<ImageAdjustments, 'vignette' | 'grain' | 'curves'> {
  vignette: number; // Legacy single vignette value
  grain: GrainSettings; // Legacy grain settings
  curves: CurvePoint[]; // Legacy curve points
}

export interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface HistoryEntry {
  _id: string;
  action: 'upload' | 'adjust' | 'crop' | 'export' | 'reset';
  timestamp: string;
  changes: any;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  image: ProjectImage;
  adjustments: Adjustments;
  crop?: CropSettings;
  tags: string[];
  starred: boolean;
  isPublic: boolean;
  createdAt: string;
  lastEdited: string;
  version: number;
  history?: HistoryEntry[];
}

export interface ProjectsResponse {
  projects: Project[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

// Editor types
export type EditorTab = 'crop' | 'edit';
export type EditSubTab = 'light' | 'color' | 'effects';

export interface EditorState {
  currentTab: EditorTab;
  currentSubTab: EditSubTab;
  zoom: number;
  pan: { x: number; y: number };
  selectedProject: Project | null;
  isProcessing: boolean;
  unsavedChanges: boolean;
}

// Export types
export interface ExportSettings {
  format: 'jpeg' | 'png' | 'tiff' | 'webp';
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
  details?: any[];
}

export interface StorageStats {
  storageUsed: number;
  storageLimit: number;
  projectCount: number;
  percentageUsed: number;
  remainingSpace: number;
}

// Component prop types
export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  unit?: string;
  className?: string;
}

export interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// Error types
export interface ApiError extends Error {
  status?: number;
  response?: any;
}

// Upload types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUpload {
  file: File;
  id: string;
  progress: UploadProgress;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  project?: Project;
}

// Theme types
export interface Theme {
  palette: {
    mode: 'light' | 'dark';
    primary: {
      main: string;
      light: string;
      dark: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
    };
    background: {
      default: string;
      paper: string;
      editor: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    divider: string;
    action: {
      hover: string;
      selected: string;
      disabled: string;
    };
  };
  typography: {
    fontFamily: string;
    h1: any;
    h2: any;
    h3: any;
    h4: any;
    h5: any;
    h6: any;
    body1: any;
    body2: any;
    button: any;
    caption: any;
  };
  spacing: (factor: number) => number;
  shape: {
    borderRadius: number;
  };
  shadows: string[];
  transitions: {
    easing: {
      easeInOut: string;
      easeOut: string;
      easeIn: string;
      sharp: string;
    };
    duration: {
      shortest: number;
      shorter: number;
      short: number;
      standard: number;
      complex: number;
      enteringScreen: number;
      leavingScreen: number;
    };
  };
}
