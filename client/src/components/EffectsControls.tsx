import React, { useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import Grid from "@mui/material/Grid";
import {
  FilterVintage,
  BlurOn,
  Gradient,
  Texture,
  ExpandMore,
  Brightness4,
  Grain
} from '@mui/icons-material';
import Slider from 'rc-slider';
import { ImageAdjustments } from '../types';
import 'rc-slider/assets/index.css';

interface EffectsControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: Partial<ImageAdjustments>) => void;
}

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
  'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion'
];

const VIGNETTE_STYLES = [
  { label: 'Round', value: 'round' },
  { label: 'Square', value: 'square' },
  { label: 'Custom', value: 'custom' }
];

const EffectsControls: React.FC<EffectsControlsProps> = ({
  adjustments,
  onAdjustmentsChange
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('clarity');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onAdjustmentsChange({ [key]: value });
  };

  const handleEffectChange = (effectType: string, property: string, value: any) => {
    const currentEffect = adjustments[effectType as keyof ImageAdjustments];
    const updatedEffect = typeof currentEffect === 'object' && currentEffect !== null
      ? { ...currentEffect, [property]: value }
      : { [property]: value };

    onAdjustmentsChange({
      [effectType]: updatedEffect
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <FilterVintage sx={{ mr: 1, verticalAlign: 'middle' }} />
        Effects
      </Typography>

      {/* Clarity & Texture */}
      <Accordion
        expanded={expandedPanel === 'clarity'}
        onChange={handleAccordionChange('clarity')}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Texture sx={{ mr: 1, verticalAlign: 'middle' }} />
            Clarity & Texture
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Texture: {(adjustments.texture || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.texture || 0}
                  min={-100}
                  max={100}
                  onChange={(value) => handleSliderChange('texture', value as number)}
                  trackStyle={{ backgroundColor: '#9c27b0' }}
                  handleStyle={{ borderColor: '#9c27b0' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Enhances fine details without affecting edges
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Clarity: {(adjustments.clarity || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.clarity || 0}
                  min={-100}
                  max={100}
                  onChange={(value) => handleSliderChange('clarity', value as number)}
                  trackStyle={{ backgroundColor: '#673ab7' }}
                  handleStyle={{ borderColor: '#673ab7' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Mid-tone contrast adjustment
                </Typography>
              </Box>
            </Grid>

            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Dehaze: {(adjustments.dehaze || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.dehaze || 0}
                  min={-100}
                  max={100}
                  onChange={(value) => handleSliderChange('dehaze', value as number)}
                  trackStyle={{ backgroundColor: '#607d8b' }}
                  handleStyle={{ borderColor: '#607d8b' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Removes or adds atmospheric haze
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Structure: {(adjustments.structure || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.structure || 0}
                  min={-100}
                  max={100}
                  onChange={(value) => handleSliderChange('structure', value as number)}
                  trackStyle={{ backgroundColor: '#795548' }}
                  handleStyle={{ borderColor: '#795548' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Enhances edge definition and local contrast
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Vignette */}
      <Accordion
        expanded={expandedPanel === 'vignette'}
        onChange={handleAccordionChange('vignette')}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Gradient sx={{ mr: 1, verticalAlign: 'middle' }} />
            Vignette
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Amount: {(adjustments.vignette?.amount || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.vignette?.amount || 0}
                  min={-100}
                  max={100}
                  onChange={(value) => handleEffectChange('vignette', 'amount', value)}
                  trackStyle={{ backgroundColor: '#424242' }}
                  handleStyle={{ borderColor: '#424242' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Midpoint: {(adjustments.vignette?.midpoint || 50).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.vignette?.midpoint || 50}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('vignette', 'midpoint', value)}
                  trackStyle={{ backgroundColor: '#616161' }}
                  handleStyle={{ borderColor: '#616161' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Roundness: {(adjustments.vignette?.roundness || 50).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.vignette?.roundness || 50}
                  min={-100}
                  max={100}
                  onChange={(value) => handleEffectChange('vignette', 'roundness', value)}
                  trackStyle={{ backgroundColor: '#757575' }}
                  handleStyle={{ borderColor: '#757575' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>
            </Grid>

            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Feather: {(adjustments.vignette?.feather || 50).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.vignette?.feather || 50}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('vignette', 'feather', value)}
                  trackStyle={{ backgroundColor: '#9e9e9e' }}
                  handleStyle={{ borderColor: '#9e9e9e' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={adjustments.vignette?.style || 'round'}
                    label="Style"
                    onChange={(e) => handleEffectChange('vignette', 'style', e.target.value)}
                  >
                    {VIGNETTE_STYLES.map((style) => (
                      <MenuItem key={style.value} value={style.value}>
                        {style.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={adjustments.vignette?.enabled || false}
                    onChange={(e) => handleEffectChange('vignette', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Vignette"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Film Grain */}
      <Accordion
        expanded={expandedPanel === 'grain'}
        onChange={handleAccordionChange('grain')}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Grain sx={{ mr: 1, verticalAlign: 'middle' }} />
            Film Grain
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Amount: {(adjustments.grain?.amount || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.grain?.amount || 0}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('grain', 'amount', value)}
                  trackStyle={{ backgroundColor: '#8d6e63' }}
                  handleStyle={{ borderColor: '#8d6e63' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Size: {(adjustments.grain?.size || 25).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.grain?.size || 25}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('grain', 'size', value)}
                  trackStyle={{ backgroundColor: '#a1887f' }}
                  handleStyle={{ borderColor: '#a1887f' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>
            </Grid>

            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Roughness: {(adjustments.grain?.roughness || 50).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.grain?.roughness || 50}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('grain', 'roughness', value)}
                  trackStyle={{ backgroundColor: '#bcaaa4' }}
                  handleStyle={{ borderColor: '#bcaaa4' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={adjustments.grain?.enabled || false}
                    onChange={(e) => handleEffectChange('grain', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Grain"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Blur & Sharpening */}
      <Accordion
        expanded={expandedPanel === 'blur'}
        onChange={handleAccordionChange('blur')}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <BlurOn sx={{ mr: 1, verticalAlign: 'middle' }} />
            Blur & Sharpening
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid container spacing={3}>
              <Typography variant="subtitle1" gutterBottom>Sharpening</Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Amount: {(adjustments.sharpening?.amount || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.sharpening?.amount || 0}
                  min={0}
                  max={150}
                  onChange={(value) => handleEffectChange('sharpening', 'amount', value)}
                  trackStyle={{ backgroundColor: '#03a9f4' }}
                  handleStyle={{ borderColor: '#03a9f4' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Radius: {(adjustments.sharpening?.radius || 1).toFixed(1)}
                </Typography>
                <Slider
                  value={adjustments.sharpening?.radius || 1}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onChange={(value) => handleEffectChange('sharpening', 'radius', value)}
                  trackStyle={{ backgroundColor: '#29b6f6' }}
                  handleStyle={{ borderColor: '#29b6f6' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Detail: {(adjustments.sharpening?.detail || 25).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.sharpening?.detail || 25}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('sharpening', 'detail', value)}
                  trackStyle={{ backgroundColor: '#4fc3f7' }}
                  handleStyle={{ borderColor: '#4fc3f7' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>
            </Grid>

            <Grid container spacing={3}>
              <Typography variant="subtitle1" gutterBottom>Noise Reduction</Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Luminance: {(adjustments.noiseReduction?.luminance || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.noiseReduction?.luminance || 0}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('noiseReduction', 'luminance', value)}
                  trackStyle={{ backgroundColor: '#81c784' }}
                  handleStyle={{ borderColor: '#81c784' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Color: {(adjustments.noiseReduction?.color || 0).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.noiseReduction?.color || 0}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('noiseReduction', 'color', value)}
                  trackStyle={{ backgroundColor: '#a5d6a7' }}
                  handleStyle={{ borderColor: '#a5d6a7' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Detail: {(adjustments.noiseReduction?.detail || 50).toFixed(0)}
                </Typography>
                <Slider
                  value={adjustments.noiseReduction?.detail || 50}
                  min={0}
                  max={100}
                  onChange={(value) => handleEffectChange('noiseReduction', 'detail', value)}
                  trackStyle={{ backgroundColor: '#c8e6c9' }}
                  handleStyle={{ borderColor: '#c8e6c9' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Layer Blending */}
      <Accordion
        expanded={expandedPanel === 'blending'}
        onChange={handleAccordionChange('blending')}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            <Brightness4 sx={{ mr: 1, verticalAlign: 'middle' }} />
            Layer Blending
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid container spacing={3}>
              <Box sx={{ mb: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Blend Mode</InputLabel>
                  <Select
                    value={adjustments.blendMode || 'normal'}
                    label="Blend Mode"
                    onChange={(e) => handleSliderChange('blendMode', e.target.value as any)}
                  >
                    {BLEND_MODES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Opacity: {(adjustments.opacity || 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={adjustments.opacity || 100}
                  min={0}
                  max={100}
                  onChange={(value) => handleSliderChange('opacity', value as number)}
                  trackStyle={{ backgroundColor: '#ff9800' }}
                  handleStyle={{ borderColor: '#ff9800' }}
                  railStyle={{ backgroundColor: '#555' }}
                />
              </Box>
            </Grid>

            <Grid container spacing={3}>
              <Typography variant="body2" gutterBottom>
                Preset Effects
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { name: 'Dramatic', clarity: 50, texture: 30, dehaze: 20 },
                  { name: 'Vintage', grain: { amount: 40, size: 30 }, vignette: { amount: -30 } },
                  { name: 'Portrait', texture: -20, clarity: 20, sharpening: { amount: 60 } },
                  { name: 'Landscape', clarity: 40, texture: 20, dehaze: 30 },
                  { name: 'Black & White', saturation: -100, contrast: 20, clarity: 30 }
                ].map((preset) => (
                  <Box
                    key={preset.name}
                    sx={{
                      p: 1.5,
                      border: '1px solid #555',
                      borderRadius: 1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => onAdjustmentsChange(preset)}
                  >
                    <Typography variant="body2">{preset.name}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default EffectsControls;
