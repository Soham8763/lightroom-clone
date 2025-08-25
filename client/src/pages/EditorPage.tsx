import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Dialog
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  Crop,
  Edit,
  Tune,
  ColorLens,
  FilterVintage,
  GetApp
} from '@mui/icons-material';
import { Project, EditorTab, EditSubTab, ImageAdjustments, Adjustments, CropSettings } from '../types';
import { projectsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CropTool from '../components/CropTool';
import LightControls from '../components/LightControls';
import ColorControls from '../components/ColorControls';
import EffectsControls from '../components/EffectsControls';
import ExportPanel from '../components/ExportPanel';

const EditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Editor state
  const [currentTab, setCurrentTab] = useState<EditorTab>('edit');
  const [currentSubTab, setCurrentSubTab] = useState<EditSubTab>('light');
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageData, setImageData] = useState<ImageData | undefined>();

  // Load project data
  useEffect(() => {
    if (!projectId || !user) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await projectsAPI.getProject(projectId);
        setProject(projectData);
      } catch (err: any) {
        console.error('Error loading project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, user]);

  // Image rendering with adjustments
  useEffect(() => {
    if (!project || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = imageRef.current;

    if (!ctx) return;

    // Set canvas size
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const containerHeight = canvas.parentElement?.clientHeight || 600;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Calculate image scaling and position
    const scale = (zoom / 100) * Math.min(
      containerWidth / project.image.dimensions.width,
      containerHeight / project.image.dimensions.height
    );

    const imageWidth = project.image.dimensions.width * scale;
    const imageHeight = project.image.dimensions.height * scale;

    const x = (containerWidth - imageWidth) / 2 + pan.x;
    const y = (containerHeight - imageHeight) / 2 + pan.y;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image with adjustments
    const drawWithAdjustments = () => {
      // Apply adjustments via CSS filters for real-time preview
      const filters = buildCSSFilters(project.adjustments);
      ctx.filter = filters;
      ctx.drawImage(image, x, y, imageWidth, imageHeight);
      ctx.filter = 'none';

      // Extract image data for histogram
      try {
        const imgData = ctx.getImageData(x, y, imageWidth, imageHeight);
        setImageData(imgData);
      } catch (e) {
        // Handle CORS issues with external images
        console.warn('Could not extract image data for histogram');
      }
    };

    if (image.complete) {
      drawWithAdjustments();
    } else {
      image.onload = drawWithAdjustments;
    }

  }, [project, zoom, pan]);

  // Build CSS filters from adjustments
  const buildCSSFilters = (adjustments: any): string => {
    const filters = [];

    if (adjustments.exposure !== 0) {
      filters.push(`brightness(${100 + adjustments.exposure * 20}%)`);
    }
    if (adjustments.contrast !== 0) {
      filters.push(`contrast(${100 + adjustments.contrast}%)`);
    }
    if (adjustments.saturation !== 0) {
      filters.push(`saturate(${100 + adjustments.saturation}%)`);
    }
    if (adjustments.temperature !== 0) {
      // Approximate temperature with hue-rotate
      filters.push(`hue-rotate(${adjustments.temperature * 0.1}deg)`);
    }

    return filters.join(' ') || 'none';
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: EditorTab) => {
    setCurrentTab(newValue);
  };

  const handleSubTabChange = (event: React.SyntheticEvent, newValue: EditSubTab) => {
    setCurrentSubTab(newValue);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 500));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleZoomFit = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  const handleAdjustmentsChange = (newAdjustments: Partial<ImageAdjustments>) => {
    if (!project) return;

    setProject(prev => {
      if (!prev) return prev;

      // Create a deep copy of previous adjustments to avoid mutation
      const updatedAdjustments = { ...prev.adjustments };

      // Update only the numeric values, ignoring complex objects
      Object.keys(newAdjustments).forEach(key => {
        const value = newAdjustments[key as keyof ImageAdjustments];
        if (typeof value === 'number') {
          (updatedAdjustments as any)[key] = value;
        }
      });

      return {
        ...prev,
        adjustments: updatedAdjustments
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleCropChange = (newCrop: CropSettings) => {
    if (!project) return;

    setProject(prev => ({
      ...prev!,
      crop: newCrop
    }));
    setHasUnsavedChanges(true);
  };

  const handleApplyCrop = async () => {
    if (!project?.crop) return;

    try {
      setSaving(true);
      // This would normally send crop data to server
      console.log('Applying crop:', project.crop);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error applying crop:', err);
      setError('Failed to apply crop');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!project || !hasUnsavedChanges) return;

    try {
      setSaving(true);
      // This would normally save to server
      console.log('Saving project:', {
        id: project.id,
        adjustments: project.adjustments,
        crop: project.crop
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (settings: any): Promise<Blob> => {
    // This would normally process the image on the server with all adjustments
    // For now, we'll return the original image blob
    const response = await fetch(project!.image.url);
    return response.blob();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/dashboard')} variant="contained">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Project not found
        </Alert>
        <Button onClick={() => navigate('/dashboard')} variant="contained">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {project.title}
          </Typography>

          <IconButton disabled>
            <Undo />
          </IconButton>
          <IconButton disabled>
            <Redo />
          </IconButton>

          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            sx={{ ml: 2, mr: 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            onClick={() => setShowExportDialog(true)}
            startIcon={<GetApp />}
            variant="outlined"
          >
            Export
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editing area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Image viewport */}
          {currentTab === 'crop' ? (
            <CropTool
              imageUrl={project.image.previewUrl || project.image.url}
              imageData={project.image.dimensions}
              cropSettings={project.crop || { x: 0, y: 0, width: 100, height: 100, rotation: 0, flipX: false, flipY: false }}
              onCropChange={handleCropChange}
              onApplyCrop={handleApplyCrop}
            />
          ) : (
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: '#1a1a1a' }}>
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  cursor: 'move',
                  width: '100%',
                  height: '100%'
                }}
              />

              {/* Hidden image for loading */}
              <img
                ref={imageRef}
                src={project.image.previewUrl || project.image.url}
                alt={project.title}
                style={{ display: 'none' }}
                crossOrigin="anonymous"
              />

              {/* Zoom controls */}
              <Paper
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(0,0,0,0.8)'
                }}
              >
                <IconButton onClick={handleZoomOut} disabled={zoom <= 25}>
                  <ZoomOut />
                </IconButton>
                <Typography sx={{ px: 2, minWidth: 60, textAlign: 'center', color: 'white' }}>
                  {zoom}%
                </Typography>
                <IconButton onClick={handleZoomIn} disabled={zoom >= 500}>
                  <ZoomIn />
                </IconButton>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
                <IconButton onClick={handleZoomFit}>
                  <ZoomOutMap />
                </IconButton>
              </Paper>
            </Box>
          )}
        </Box>

        {/* Right panel - Controls */}
        <Paper sx={{ width: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab selector */}
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab
              label="Crop"
              value="crop"
              icon={<Crop />}
              iconPosition="start"
            />
            <Tab
              label="Edit"
              value="edit"
              icon={<Edit />}
              iconPosition="start"
            />
          </Tabs>

          {/* Sub-tabs for Edit mode */}
          {currentTab === 'edit' && (
            <Tabs
              value={currentSubTab}
              onChange={handleSubTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab
                label="Light"
                value="light"
                icon={<Tune />}
                iconPosition="start"
              />
              <Tab
                label="Color"
                value="color"
                icon={<ColorLens />}
                iconPosition="start"
              />
              <Tab
                label="Effects"
                value="effects"
                icon={<FilterVintage />}
                iconPosition="start"
              />
            </Tabs>
          )}

          {/* Control panels */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {currentTab === 'edit' && currentSubTab === 'light' && (
              <LightControls
                adjustments={project.adjustments as unknown as ImageAdjustments}
                onAdjustmentsChange={handleAdjustmentsChange}
                imageData={imageData}
              />
            )}

            {currentTab === 'edit' && currentSubTab === 'color' && (
              <ColorControls
                adjustments={project.adjustments as unknown as ImageAdjustments}
                onAdjustmentsChange={handleAdjustmentsChange}
              />
            )}

            {currentTab === 'edit' && currentSubTab === 'effects' && (
              <EffectsControls
                adjustments={project.adjustments as unknown as ImageAdjustments}
                onAdjustmentsChange={handleAdjustmentsChange}
              />
            )}
          </Box>
        </Paper>
      </Box>

      {/* Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <ExportPanel
          projects={[project]}
          selectedProjects={[project.id]}
          onExport={handleExport}
        />
      </Dialog>
    </Box>
  );
};

export default EditorPage;
