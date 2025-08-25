import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Grid from "@mui/material/Grid";
import { ColorLens, Palette, Thermostat } from '@mui/icons-material';
import Slider from 'rc-slider';
import { SketchPicker, ColorResult } from 'react-color';
import { ImageAdjustments } from '../types';
import 'rc-slider/assets/index.css';

interface ColorControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: Partial<ImageAdjustments>) => void;
}

interface HSVColor {
  h: number;
  s: number;
  v: number;
}

const ColorControls: React.FC<ColorControlsProps> = ({
  adjustments,
  onAdjustmentsChange
}) => {
  const colorWheelRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorWheelCenter, setColorWheelCenter] = useState({ x: 150, y: 150 });
  const [colorWheelRadius, setColorWheelRadius] = useState(100);

  // Draw color wheel
  useEffect(() => {
    if (!colorWheelRef.current) return;

    const canvas = colorWheelRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    setColorWheelCenter({ x: centerX, y: centerY });
    setColorWheelRadius(radius);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;

      for (let r = 0; r < radius; r += 1) {
        const saturation = r / radius;
        const hue = angle;
        const lightness = 0.5;

        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = `hsl(${hue}, ${saturation * 100}%, ${lightness * 100}%)`;
        ctx.stroke();
      }
    }

    // Draw center circle (white point)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, []);

  const handleColorWheelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - colorWheelCenter.x;
    const dy = y - colorWheelCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= colorWheelRadius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const hue = (angle + 360) % 360;
      const saturation = Math.min(distance / colorWheelRadius, 1);

      // Update temperature and tint based on color wheel position
      const temperature = Math.cos(hue * Math.PI / 180) * saturation * 100;
      const tint = Math.sin(hue * Math.PI / 180) * saturation * 100;

      onAdjustmentsChange({
        temperature: adjustments.temperature + temperature * 0.1,
        tint: adjustments.tint + tint * 0.1
      });
    }
  };

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onAdjustmentsChange({ [key]: value });
  };

  const handleColorChange = (color: ColorResult) => {
    setSelectedColor(color.hex);

    // Apply color adjustments based on picked color
    const { h, s, v } = (color as ColorResult & { hsv: HSVColor }).hsv;

    onAdjustmentsChange({
      temperature: adjustments.temperature + (h - 180) * 0.1,
      tint: adjustments.tint + (s - 0.5) * 50,
      saturation: adjustments.saturation + (s - 0.5) * 100,
      vibrance: adjustments.vibrance + (v - 0.5) * 100
    });
  };

  const resetColorAdjustments = () => {
    onAdjustmentsChange({
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <ColorLens sx={{ mr: 1, verticalAlign: 'middle' }} />
        Color
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Color Adjustments */}
        <Grid container spacing={3}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              <Thermostat sx={{ mr: 1, verticalAlign: 'middle' }} />
              Basic
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Temperature: {adjustments.temperature.toFixed(0)}K
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Slider
                  value={adjustments.temperature}
                  min={-1000}
                  max={1000}
                  onChange={(value) => handleSliderChange('temperature', value as number)}
                  trackStyle={{
                    background: 'linear-gradient(to right, #0066cc, #ffffff, #ffaa00)',
                    height: 8
                  }}
                  handleStyle={{ borderColor: '#1976d2', height: 20, width: 20, marginTop: -6 }}
                  railStyle={{
                    background: 'linear-gradient(to right, #0066cc, #ffffff, #ffaa00)',
                    height: 8
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Tint: {adjustments.tint.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.tint}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('tint', value as number)}
                trackStyle={{
                  background: 'linear-gradient(to right, #00aa00, #ffffff, #aa00aa)',
                  height: 8
                }}
                handleStyle={{ borderColor: '#1976d2', height: 20, width: 20, marginTop: -6 }}
                railStyle={{
                  background: 'linear-gradient(to right, #00aa00, #ffffff, #aa00aa)',
                  height: 8
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Vibrance: {adjustments.vibrance.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.vibrance}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('vibrance', value as number)}
                trackStyle={{ backgroundColor: '#e91e63' }}
                handleStyle={{ borderColor: '#e91e63' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Saturation: {adjustments.saturation.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.saturation}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('saturation', value as number)}
                trackStyle={{ backgroundColor: '#ff5722' }}
                handleStyle={{ borderColor: '#ff5722' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography
                variant="body2"
                sx={{ cursor: 'pointer', color: 'primary.main' }}
                onClick={resetColorAdjustments}
              >
                Reset Color Adjustments
              </Typography>
            </Box>
          </Paper>

          {/* HSL Fine Controls */}
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              HSL Fine Tuning
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom color="error">
                Red Hue: {(adjustments.hslAdjustments?.red?.hue || 0).toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.hslAdjustments?.red?.hue || 0}
                min={-180}
                max={180}
                onChange={(value) => onAdjustmentsChange({
                  hslAdjustments: {
                    ...adjustments.hslAdjustments,
                    red: { ...adjustments.hslAdjustments?.red, hue: value as number }
                  }
                })}
                trackStyle={{ backgroundColor: '#f44336' }}
                handleStyle={{ borderColor: '#f44336' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom color="success.main">
                Green Hue: {(adjustments.hslAdjustments?.green?.hue || 0).toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.hslAdjustments?.green?.hue || 0}
                min={-180}
                max={180}
                onChange={(value) => onAdjustmentsChange({
                  hslAdjustments: {
                    ...adjustments.hslAdjustments,
                    green: { ...adjustments.hslAdjustments?.green, hue: value as number }
                  }
                })}
                trackStyle={{ backgroundColor: '#4caf50' }}
                handleStyle={{ borderColor: '#4caf50' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom color="primary">
                Blue Hue: {(adjustments.hslAdjustments?.blue?.hue || 0).toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.hslAdjustments?.blue?.hue || 0}
                min={-180}
                max={180}
                onChange={(value) => onAdjustmentsChange({
                  hslAdjustments: {
                    ...adjustments.hslAdjustments,
                    blue: { ...adjustments.hslAdjustments?.blue, hue: value as number }
                  }
                })}
                trackStyle={{ backgroundColor: '#2196f3' }}
                handleStyle={{ borderColor: '#2196f3' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Color Tools */}
        <Grid container spacing={3}>
          {/* Color Wheel */}
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
              Color Wheel
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <canvas
                ref={colorWheelRef}
                width={300}
                height={300}
                onClick={handleColorWheelClick}
                style={{
                  cursor: 'crosshair',
                  border: '1px solid #555',
                  borderRadius: '50%'
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              Click on the color wheel to adjust temperature and tint
            </Typography>
          </Paper>

          {/* Color Picker */}
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              Color Picker
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  backgroundColor: selectedColor,
                  border: '2px solid #555',
                  borderRadius: 1,
                  cursor: 'pointer'
                }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
              <Box>
                <Typography variant="body2">Selected Color</Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedColor.toUpperCase()}
                </Typography>
              </Box>
            </Box>

            {showColorPicker && (
              <Box sx={{ mb: 2 }}>
                <SketchPicker
                  color={selectedColor}
                  onChange={handleColorChange}
                  width="100%"
                  styles={{
                    default: {
                      picker: {
                        backgroundColor: '#2a2a2a',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                      }
                    }
                  }}
                />
              </Box>
            )}

            {/* Color Presets */}
            <Typography variant="subtitle2" gutterBottom>
              Quick Presets
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { name: 'Warm', temp: 200, tint: 10, color: '#ffaa00' },
                { name: 'Cool', temp: -200, tint: -10, color: '#00aaff' },
                { name: 'Sunset', temp: 400, tint: 20, color: '#ff6600' },
                { name: 'Daylight', temp: 0, tint: 0, color: '#ffffff' },
                { name: 'Tungsten', temp: -300, tint: 0, color: '#ffcc66' },
                { name: 'Fluorescent', temp: -100, tint: -50, color: '#ccffcc' }
              ].map((preset) => (
                <Box
                  key={preset.name}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => onAdjustmentsChange({
                    temperature: preset.temp,
                    tint: preset.tint
                  })}
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      backgroundColor: preset.color,
                      border: '1px solid #555',
                      borderRadius: 1,
                      mb: 0.5
                    }}
                  />
                  <Typography variant="caption">
                    {preset.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ColorControls;
