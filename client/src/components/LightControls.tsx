import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Grid from "@mui/material/Grid";
import { Brightness6, TonalityOutlined } from '@mui/icons-material';
import Slider from 'rc-slider';
import * as d3 from 'd3';
import { ImageAdjustments } from '../types';
import 'rc-slider/assets/index.css';

interface LightControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: Partial<ImageAdjustments>) => void;
  imageData?: ImageData;
}

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

const LightControls: React.FC<LightControlsProps> = ({
  adjustments,
  onAdjustmentsChange,
  imageData
}) => {
  const histogramRef = useRef<SVGSVGElement>(null);
  const curvesRef = useRef<SVGSVGElement>(null);
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [curvePoints, setCurvePoints] = useState<[number, number][]>([
    [0, 0], [64, 64], [128, 128], [192, 192], [255, 255]
  ]);

  // Calculate histogram from image data
  useEffect(() => {
    if (!imageData) return;

    const red = new Array(256).fill(0);
    const green = new Array(256).fill(0);
    const blue = new Array(256).fill(0);
    const luminance = new Array(256).fill(0);

    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      red[r]++;
      green[g]++;
      blue[b]++;

      // Calculate luminance (0.299*R + 0.587*G + 0.114*B)
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      luminance[lum]++;
    }

    setHistogramData({ red, green, blue, luminance });
  }, [imageData]);

  // Draw histogram
  useEffect(() => {
    if (!histogramData || !histogramRef.current) return;

    const svg = d3.select(histogramRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 150;
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(
      ...histogramData.red,
      ...histogramData.green,
      ...histogramData.blue,
      ...histogramData.luminance
    );

    const xScale = d3.scaleLinear()
      .domain([0, 255])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create line generators
    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Draw histogram lines
    const channels = [
      { data: histogramData.red, color: '#ff6b6b', opacity: 0.7 },
      { data: histogramData.green, color: '#51cf66', opacity: 0.7 },
      { data: histogramData.blue, color: '#339af0', opacity: 0.7 },
      { data: histogramData.luminance, color: '#ffffff', opacity: 1 }
    ];

    channels.forEach(({ data, color, opacity }) => {
      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', opacity)
        .attr('d', line);
    });

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3));

  }, [histogramData]);

  // Draw curves
  useEffect(() => {
    if (!curvesRef.current) return;

    const svg = d3.select(curvesRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 300;
    const margin = { top: 10, right: 10, bottom: 30, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain([0, 255])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 255])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw grid
    const ticks = [0, 64, 128, 192, 255];
    ticks.forEach(tick => {
      g.append('line')
        .attr('x1', xScale(tick))
        .attr('x2', xScale(tick))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#444')
        .attr('stroke-width', tick === 0 || tick === 255 ? 1 : 0.5);

      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', '#444')
        .attr('stroke-width', tick === 0 || tick === 255 ? 1 : 0.5);
    });

    // Draw diagonal reference line
    g.append('line')
      .attr('x1', 0)
      .attr('y1', innerHeight)
      .attr('x2', innerWidth)
      .attr('y2', 0)
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Create curve line
    const line = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveCatmullRom);

    // Draw curve
    g.append('path')
      .datum(curvePoints)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Draw control points
    const circles = g.selectAll('.control-point')
      .data(curvePoints)
      .enter().append('circle')
      .attr('class', 'control-point')
      .attr('cx', d => xScale(d[0]))
      .attr('cy', d => yScale(d[1]))
      .attr('r', 4)
      .attr('fill', '#ffffff')
      .attr('stroke', '#000')
      .attr('cursor', 'pointer');

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, [number, number]>()
      .on('drag', function(event, d) {
        const [x, y] = d3.pointer(event, g.node());
        const newX = Math.max(0, Math.min(255, xScale.invert(x)));
        const newY = Math.max(0, Math.min(255, yScale.invert(y)));

        const index = curvePoints.indexOf(d);
        const newPoints = [...curvePoints];
        newPoints[index] = [newX, newY];

        setCurvePoints(newPoints);

        // Update adjustments with curve data
        onAdjustmentsChange({
          curves: newPoints.map(([x, y]) => ({ input: x, output: y }))
        });
      });

    circles.call(drag);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5));

    // Add labels
    svg.append('text')
      .attr('transform', `translate(${width / 2},${height - 5})`)
      .style('text-anchor', 'middle')
      .style('fill', '#ccc')
      .style('font-size', '12px')
      .text('Input');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 15)
      .attr('x', -(height / 2))
      .style('text-anchor', 'middle')
      .style('fill', '#ccc')
      .style('font-size', '12px')
      .text('Output');

  }, [curvePoints, onAdjustmentsChange]);

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onAdjustmentsChange({ [key]: value });
  };

  const resetCurves = () => {
    const defaultPoints: [number, number][] = [
      [0, 0], [64, 64], [128, 128], [192, 192], [255, 255]
    ];
    setCurvePoints(defaultPoints);
    onAdjustmentsChange({
      curves: defaultPoints.map(([x, y]) => ({ input: x, output: y }))
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <Brightness6 sx={{ mr: 1, verticalAlign: 'middle' }} />
        Light
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Adjustments */}
        <Grid container spacing={3}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              Basic
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Exposure: {adjustments.exposure.toFixed(2)}
              </Typography>
              <Slider
                value={adjustments.exposure}
                min={-5}
                max={5}
                step={0.01}
                onChange={(value) => handleSliderChange('exposure', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Contrast: {adjustments.contrast.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.contrast}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('contrast', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Highlights: {adjustments.highlights.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.highlights}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('highlights', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Shadows: {adjustments.shadows.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.shadows}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('shadows', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Whites: {adjustments.whites.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.whites}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('whites', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Blacks: {adjustments.blacks.toFixed(0)}
              </Typography>
              <Slider
                value={adjustments.blacks}
                min={-100}
                max={100}
                onChange={(value) => handleSliderChange('blacks', value as number)}
                trackStyle={{ backgroundColor: '#1976d2' }}
                handleStyle={{ borderColor: '#1976d2' }}
                railStyle={{ backgroundColor: '#555' }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Histogram & Curves */}
        <Grid container spacing={3}>
          {/* Histogram */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              Histogram
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <svg
                ref={histogramRef}
                width={300}
                height={150}
                style={{ background: '#1a1a1a', borderRadius: '4px' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.75rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 2, bgcolor: '#ff6b6b' }} />
                Red
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 2, bgcolor: '#51cf66' }} />
                Green
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 2, bgcolor: '#339af0' }} />
                Blue
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 2, bgcolor: '#ffffff' }} />
                Luminance
              </Box>
            </Box>
          </Paper>

          {/* Tone Curve */}
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">
                <TonalityOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
                Tone Curve
              </Typography>
              <Typography
                variant="body2"
                sx={{ cursor: 'pointer', color: 'primary.main' }}
                onClick={resetCurves}
              >
                Reset
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <svg
                ref={curvesRef}
                width={300}
                height={300}
                style={{ background: '#1a1a1a', borderRadius: '4px' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Drag control points to adjust the tone curve
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LightControls;
