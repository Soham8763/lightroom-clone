import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Slider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Alert
} from '@mui/material';
import Grid from "@mui/material/Grid";
import {
  GetApp,
  ExpandMore,
  PhotoSizeSelectActual,
  Palette,
  Settings,
  CloudDownload
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Project } from '../types';

interface ExportPanelProps {
  projects: Project[];
  selectedProjects: string[];
  onExport: (settings: ExportSettings) => Promise<Blob>;
}

interface ExportSettings {
  format: 'jpeg' | 'png' | 'tiff' | 'webp';
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  colorSpace: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB';
  includMetadata: boolean;
  watermark?: {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    fontSize: number;
  };
  filename: {
    pattern: string;
    sequence: number;
  };
}

const EXPORT_FORMATS = [
  { value: 'jpeg', label: 'JPEG', extension: '.jpg', maxQuality: 100 },
  { value: 'png', label: 'PNG', extension: '.png', maxQuality: 100 },
  { value: 'tiff', label: 'TIFF', extension: '.tiff', maxQuality: 100 },
  { value: 'webp', label: 'WebP', extension: '.webp', maxQuality: 100 }
];

const COLOR_SPACES = [
  { value: 'sRGB', label: 'sRGB (Standard)' },
  { value: 'AdobeRGB', label: 'Adobe RGB (1998)' },
  { value: 'ProPhotoRGB', label: 'ProPhoto RGB' }
];

const WATERMARK_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' }
];

const FILENAME_PATTERNS = [
  { value: '{name}', label: 'Original Name' },
  { value: '{name}_{sequence}', label: 'Name + Sequence' },
  { value: '{date}_{name}', label: 'Date + Name' },
  { value: '{name}_{width}x{height}', label: 'Name + Dimensions' },
  { value: 'IMG_{sequence:0000}', label: 'IMG_0001, IMG_0002...' },
  { value: '{name}_edited', label: 'Name + "edited"' }
];

const ExportPanel: React.FC<ExportPanelProps> = ({
  projects,
  selectedProjects,
  onExport
}) => {
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'jpeg',
    quality: 95,
    maintainAspectRatio: true,
    colorSpace: 'sRGB',
    includMetadata: true,
    watermark: {
      enabled: false,
      text: '',
      position: 'bottom-right',
      opacity: 50,
      fontSize: 24
    },
    filename: {
      pattern: '{name}',
      sequence: 1
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<string>('format');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : '');
  };

  const updateSettings = (updates: Partial<ExportSettings>) => {
    setExportSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  const updateWatermark = (updates: Partial<ExportSettings['watermark']>) => {
    setExportSettings(prev => ({
      ...prev,
      watermark: {
        ...prev.watermark!,
        ...updates
      }
    }));
  };

  const updateFilename = (updates: Partial<ExportSettings['filename']>) => {
    setExportSettings(prev => ({
      ...prev,
      filename: {
        ...prev.filename,
        ...updates
      }
    }));
  };

  const getEstimatedSize = (): string => {
    const baseSize = exportSettings.width && exportSettings.height
      ? (exportSettings.width * exportSettings.height) / 1000000
      : 12; // Default estimate

    let multiplier = 1;
    switch (exportSettings.format) {
      case 'jpeg':
        multiplier = exportSettings.quality / 100 * 0.1;
        break;
      case 'png':
        multiplier = 0.3;
        break;
      case 'tiff':
        multiplier = 1.0;
        break;
      case 'webp':
        multiplier = exportSettings.quality / 100 * 0.08;
        break;
    }

    const estimatedMB = baseSize * multiplier;
    return estimatedMB < 1
      ? `${Math.round(estimatedMB * 1000)} KB`
      : `${estimatedMB.toFixed(1)} MB`;
  };

  const exportSingle = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const blob = await onExport(exportSettings);

      const format = EXPORT_FORMATS.find(f => f.value === exportSettings.format);
      const filename = `${project.title}${format?.extension || '.jpg'}`;

      saveAs(blob, filename);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  const exportBatch = async () => {
    if (selectedProjects.length === 0) {
      setExportError('No projects selected for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const zip = new JSZip();
      const format = EXPORT_FORMATS.find(f => f.value === exportSettings.format);

      for (let i = 0; i < selectedProjects.length; i++) {
        const projectId = selectedProjects[i];
        const project = projects.find(p => p.id === projectId);

        if (project) {
          try {
            const blob = await onExport(exportSettings);
            const filename = `${project.title}${format?.extension || '.jpg'}`;
            zip.file(filename, blob);

            setExportProgress(((i + 1) / selectedProjects.length) * 100);
          } catch (error) {
            console.error(`Error exporting ${project.title}:`, error);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `export_${new Date().toISOString().split('T')[0]}.zip`);

    } catch (error) {
      console.error('Batch export error:', error);
      setExportError('Failed to export images. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportAll = async () => {
    const allProjectIds = projects.map(p => p.id);
    await exportBatch();
  };

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        <GetApp sx={{ mr: 1, verticalAlign: 'middle' }} />
        Export Images
      </Typography>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {/* Format Settings */}
      <Accordion
        expanded={expandedPanel === 'format'}
        onChange={handleAccordionChange('format')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <PhotoSizeSelectActual sx={{ mr: 1, verticalAlign: 'middle' }} />
            Format & Quality
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid container spacing={3}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportSettings.format}
                  label="Export Format"
                  onChange={(e) => updateSettings({ format: e.target.value as any })}
                >
                  {EXPORT_FORMATS.map((format) => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" gutterBottom>
                Quality: {exportSettings.quality}%
              </Typography>
              <Slider
                value={exportSettings.quality}
                min={1}
                max={100}
                onChange={(_, value) => updateSettings({ quality: value as number })}
                valueLabelDisplay="auto"
                sx={{ mb: 3 }}
              />

              <FormControl fullWidth>
                <InputLabel>Color Space</InputLabel>
                <Select
                  value={exportSettings.colorSpace}
                  label="Color Space"
                  onChange={(e) => updateSettings({ colorSpace: e.target.value as any })}
                >
                  {COLOR_SPACES.map((space) => (
                    <MenuItem key={space.value} value={space.value}>
                      {space.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid container spacing={3}>
              <Typography variant="subtitle1" gutterBottom>Dimensions</Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Width"
                  type="number"
                  value={exportSettings.width || ''}
                  onChange={(e) => updateSettings({ width: parseInt(e.target.value) || undefined })}
                  size="small"
                  InputProps={{ endAdornment: 'px' }}
                />
                <TextField
                  label="Height"
                  type="number"
                  value={exportSettings.height || ''}
                  onChange={(e) => updateSettings({ height: parseInt(e.target.value) || undefined })}
                  size="small"
                  InputProps={{ endAdornment: 'px' }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportSettings.maintainAspectRatio}
                    onChange={(e) => updateSettings({ maintainAspectRatio: e.target.checked })}
                  />
                }
                label="Maintain aspect ratio"
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportSettings.includMetadata}
                    onChange={(e) => updateSettings({ includMetadata: e.target.checked })}
                  />
                }
                label="Include metadata"
              />

              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Estimated file size: {getEstimatedSize()}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Watermark Settings */}
      <Accordion
        expanded={expandedPanel === 'watermark'}
        onChange={handleAccordionChange('watermark')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
            Watermark
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Checkbox
                checked={exportSettings.watermark?.enabled || false}
                onChange={(e) => updateWatermark({ enabled: e.target.checked })}
              />
            }
            label="Enable watermark"
            sx={{ mb: 2 }}
          />

          {exportSettings.watermark?.enabled && (
            <Grid container spacing={3}>
              <Grid container spacing={3}>
                <TextField
                  fullWidth
                  label="Watermark Text"
                  value={exportSettings.watermark.text}
                  onChange={(e) => updateWatermark({ text: e.target.value })}
                  sx={{ mb: 3 }}
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Position</InputLabel>
                  <Select
                    value={exportSettings.watermark.position}
                    label="Position"
                    onChange={(e) => updateWatermark({ position: e.target.value as any })}
                  >
                    {WATERMARK_POSITIONS.map((pos) => (
                      <MenuItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid container spacing={3}>
                <Typography variant="body2" gutterBottom>
                  Opacity: {exportSettings.watermark.opacity}%
                </Typography>
                <Slider
                  value={exportSettings.watermark.opacity}
                  min={10}
                  max={100}
                  onChange={(_, value) => updateWatermark({ opacity: value as number })}
                  sx={{ mb: 3 }}
                />

                <Typography variant="body2" gutterBottom>
                  Font Size: {exportSettings.watermark.fontSize}px
                </Typography>
                <Slider
                  value={exportSettings.watermark.fontSize}
                  min={12}
                  max={72}
                  onChange={(_, value) => updateWatermark({ fontSize: value as number })}
                />
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Filename Settings */}
      <Accordion
        expanded={expandedPanel === 'filename'}
        onChange={handleAccordionChange('filename')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filename Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid container spacing={3}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Filename Pattern</InputLabel>
                <Select
                  value={exportSettings.filename.pattern}
                  label="Filename Pattern"
                  onChange={(e) => updateFilename({ pattern: e.target.value })}
                >
                  {FILENAME_PATTERNS.map((pattern) => (
                    <MenuItem key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Custom Pattern"
                value={exportSettings.filename.pattern}
                onChange={(e) => updateFilename({ pattern: e.target.value })}
                helperText="Use {name}, {date}, {sequence}, {width}, {height}"
              />
            </Grid>

            <Grid container spacing={3}>
              <TextField
                fullWidth
                label="Starting Sequence Number"
                type="number"
                value={exportSettings.filename.sequence}
                onChange={(e) => updateFilename({ sequence: parseInt(e.target.value) || 1 })}
                sx={{ mb: 2 }}
              />

              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Preview: IMG_0001.jpg, IMG_0002.jpg...
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Export Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <CloudDownload sx={{ mr: 1, verticalAlign: 'middle' }} />
          Export Actions
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button
            variant="contained"
            onClick={exportBatch}
            disabled={isExporting || selectedProjects.length === 0}
            startIcon={<GetApp />}
          >
            Export Selected ({selectedProjects.length})
          </Button>

          <Button
            variant="outlined"
            onClick={exportAll}
            disabled={isExporting || projects.length === 0}
            startIcon={<GetApp />}
          >
            Export All ({projects.length})
          </Button>
        </Box>

        {isExporting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Exporting... {Math.round(exportProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={exportProgress} />
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          Selected projects will be exported as individual files or in a ZIP archive for batch export.
          Large exports may take several minutes to complete.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExportPanel;
