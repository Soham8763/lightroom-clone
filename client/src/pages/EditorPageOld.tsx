import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  FitScreen,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { projectsAPI } from '../utils/api';
import { Project } from '../types';

const EditorContainer = styled(Box)({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
});

const EditorAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const EditorContent = styled(Box)({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
});

const ImageViewport = styled(Box)(({ theme }) => ({
  flex: 1,
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
}));

const ControlPanel = styled(Box)(({ theme }) => ({
  width: 400,
  backgroundColor: theme.palette.background.paper,
  borderLeft: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
}));

const ImageDisplay = styled('img')({
  maxWidth: '90%',
  maxHeight: '90%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
});

const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
});

const EditorPage: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    } else {
      setError('No project ID provided');
      setLoading(false);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      setLoading(true);
      const projectData = await projectsAPI.getProject(id);
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSave = async () => {
    if (!project) return;
    
    try {
      setSaving(true);
      // In a full implementation, this would save current adjustments
      console.log('Saving project:', project.id);
    } catch (err: any) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleFitScreen = () => {
    setZoom(1);
  };

  if (loading) {
    return (
      <EditorContainer>
        <LoadingContainer>
          <CircularProgress size={60} />
        </LoadingContainer>
      </EditorContainer>
    );
  }

  if (error) {
    return (
      <EditorContainer>
        <Box p={3}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={handleBack} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </Box>
      </EditorContainer>
    );
  }

  if (!project) {
    return (
      <EditorContainer>
        <Box p={3}>
          <Alert severity="warning">Project not found</Alert>
          <Button onClick={handleBack} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </Box>
      </EditorContainer>
    );
  }

  return (
    <EditorContainer>
      {/* Top Toolbar */}
      <EditorAppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {project.title}
          </Typography>

          {/* Zoom Controls */}
          <IconButton onClick={handleZoomOut}>
            <ZoomOut />
          </IconButton>
          <Typography variant="body2" sx={{ mx: 1, minWidth: 50, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton onClick={handleZoomIn}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={handleFitScreen} sx={{ mr: 2 }}>
            <FitScreen />
          </IconButton>

          {/* Action Buttons */}
          <IconButton sx={{ mr: 1 }}>
            <Undo />
          </IconButton>
          <IconButton sx={{ mr: 2 }}>
            <Redo />
          </IconButton>
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Toolbar>
      </EditorAppBar>

      {/* Main Editor Content */}
      <EditorContent>
        {/* Image Viewport */}
        <ImageViewport>
          <ImageDisplay
            src={project.image.previewUrl || project.image.url}
            alt={project.title}
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </ImageViewport>

        {/* Control Panel */}
        <ControlPanel>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Editing Tools
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced editing controls will be implemented here, including:
              <br />• Crop & Straighten
              <br />• Exposure & Contrast
              <br />• Color Grading
              <br />• Effects & Filters
            </Typography>
          </Box>
        </ControlPanel>
      </EditorContent>
    </EditorContainer>
  );
};

export default EditorPage;
