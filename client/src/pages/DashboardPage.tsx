import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Fab,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PhotoLibrary,
  Add,
  Edit,
  Star,
  StarBorder,
  Delete,
  AccountCircle,
  ExitToApp,
  CloudUpload,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, uploadAPI } from '../utils/api';
import { Project, FileUpload } from '../types';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const MainContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  minHeight: 'calc(100vh - 64px)',
}));

const UploadArea = styled(Box)<{ isDragActive: boolean }>(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  transition: theme.transitions.create(['border-color', 'background-color']),
  backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const ProjectCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: theme.transitions.create(['transform', 'box-shadow']),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

const ProjectImage = styled(CardMedia)({
  height: 200,
  objectFit: 'cover',
});

const UploadFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
}));

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getProjects({
        sort: 'lastEdited',
        order: 'desc',
        limit: 50,
      });
      setProjects(response.projects);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    // Create upload entries
    const newUploads = files.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'pending' as const,
    }));
    
    setUploads(prev => [...prev, ...newUploads]);

    // Upload files one by one
    for (const upload of newUploads) {
      try {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'uploading' as const }
            : u
        ));

        const project = await uploadAPI.uploadImage(
          upload.file,
          undefined, // Let server generate title from filename
          undefined, // No description
          undefined, // No tags
          (progress) => {
            setUploads(prev => prev.map(u => 
              u.id === upload.id 
                ? { 
                    ...u, 
                    progress: { 
                      loaded: progress * upload.file.size / 100,
                      total: upload.file.size,
                      percentage: progress 
                    }
                  }
                : u
            ));
          }
        );

        // Mark upload as successful
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'success' as const, project }
            : u
        ));

        // Add project to grid
        setProjects(prev => [project, ...prev]);

      } catch (err: any) {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error' as const, error: err.message }
            : u
        ));
      }
    }

    // Remove completed uploads after delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status === 'uploading'));
    }, 3000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.webp']
    },
    multiple: true,
    onDrop: handleFileUpload,
  });

  const handleProjectClick = (project: Project) => {
    navigate(`/editor/${project.id}`);
  };

  const handleStarToggle = async (project: Project) => {
    try {
      const updatedProject = await projectsAPI.updateProject(project.id, {
        starred: !project.starred,
      });
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, starred: updatedProject.starred }
          : p
      ));
    } catch (err: any) {
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.title}"?`)) return;
    
    try {
      await projectsAPI.deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (err: any) {
      console.error('Error deleting project:', err);
    }
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      <StyledAppBar position="static" elevation={0}>
        <Toolbar>
          <PhotoLibrary sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lightroom Clone
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton onClick={handleUserMenuClick}>
              {user?.avatar ? (
                <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </StyledAppBar>

      <MainContainer maxWidth="xl">
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Upload Area */}
        {projects.length === 0 && (
          <UploadArea {...getRootProps()} isDragActive={isDragActive}>
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {isDragActive ? 'Drop images here' : 'Upload your first images'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Drag & drop images here, or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Supports: JPEG, PNG, TIFF, WebP
            </Typography>
          </UploadArea>
        )}

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Uploading Images
            </Typography>
            {uploads.map((upload) => (
              <Box key={upload.id} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 200 }}>
                    {upload.file.name}
                  </Typography>
                  {upload.status === 'uploading' && (
                    <CircularProgress 
                      variant="determinate" 
                      value={upload.progress.percentage} 
                      size={20} 
                    />
                  )}
                  {upload.status === 'success' && (
                    <Chip label="Success" color="success" size="small" />
                  )}
                  {upload.status === 'error' && (
                    <Chip label={upload.error || 'Error'} color="error" size="small" />
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Projects Grid */}
        {projects.length > 0 && (
          <>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
              Your Projects ({projects.length})
            </Typography>
            
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 3,
              }}
            >
              {projects.map((project) => (
                <ProjectCard key={project.id}>
                  <ProjectImage
                    image={project.image.thumbnailUrl || project.image.url}
                    title={project.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {project.title}
                    </Typography>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {project.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {new Date(project.lastEdited).toLocaleDateString()}
                    </Typography>
                    {project.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {project.tags.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleProjectClick(project)}>
                      <Edit sx={{ mr: 0.5 }} />
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarToggle(project);
                      }}
                    >
                      {project.starred ? <Star color="primary" /> : <StarBorder />}
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </ProjectCard>
              ))}
            </Box>
          </>
        )}

        {/* Floating Upload Button */}
        {projects.length > 0 && (
          <UploadFab color="primary" {...getRootProps()}>
            <input {...getInputProps()} />
            <Add />
          </UploadFab>
        )}
      </MainContainer>
    </>
  );
};

export default DashboardPage;
