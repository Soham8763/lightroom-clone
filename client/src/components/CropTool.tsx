import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, Image as FabricImage, Rect } from 'fabric';
import { Box, IconButton, Select, MenuItem, FormControl, InputLabel, Typography, Divider } from '@mui/material';
import { Crop, RotateLeft, RotateRight, Flip, FlipCameraAndroid } from '@mui/icons-material';
import { CropSettings } from '../types';

interface CropToolProps {
  imageUrl: string;
  imageData: {
    width: number;
    height: number;
  };
  cropSettings: CropSettings;
  onCropChange: (crop: CropSettings) => void;
  onApplyCrop: () => void;
}

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:2', value: 3/2 },
  { label: '16:9', value: 16/9 },
  { label: '2:1', value: 2/1 },
  { label: '5:4', value: 5/4 },
  { label: '8.5:11', value: 8.5/11 },
];

export const CropTool: React.FC<CropToolProps> = ({
  imageUrl,
  imageData,
  cropSettings,
  onCropChange,
  onApplyCrop
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const imageObjectRef = useRef<FabricImage | null>(null);
  
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#2a2a2a',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load image
    FabricImage.fromURL(imageUrl).then((img) => {
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      
      // Scale image to fit canvas
      const scale = Math.min(
        canvasWidth * 0.8 / img.width!,
        canvasHeight * 0.8 / img.height!
      );
      
      img.scale(scale);
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      
      imageObjectRef.current = img;
      canvas.add(img);
      
      // Create crop rectangle
      createCropRect(canvas, img);
      canvas.renderAll();
    });

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  const createCropRect = useCallback((canvas: Canvas, img: FabricImage) => {
    if (cropRectRef.current) {
      canvas.remove(cropRectRef.current);
    }

    const imgBounds = img.getBoundingRect();
    const rectWidth = imgBounds.width * 0.8;
    const rectHeight = imgBounds.height * 0.8;

    const cropRect = new Rect({
      left: imgBounds.left + (imgBounds.width - rectWidth) / 2,
      top: imgBounds.top + (imgBounds.height - rectHeight) / 2,
      width: rectWidth,
      height: rectHeight,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: '#ffffff',
      cornerStrokeColor: '#ffffff',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false,
    });

    // Constrain movement within image bounds
    cropRect.on('moving', () => {
      const rect = cropRect.getBoundingRect();
      const imgRect = img.getBoundingRect();
      
      if (rect.left < imgRect.left) {
        cropRect.set({ left: imgRect.left });
      }
      if (rect.top < imgRect.top) {
        cropRect.set({ top: imgRect.top });
      }
      if (rect.left + rect.width > imgRect.left + imgRect.width) {
        cropRect.set({ left: imgRect.left + imgRect.width - rect.width });
      }
      if (rect.top + rect.height > imgRect.top + imgRect.height) {
        cropRect.set({ top: imgRect.top + imgRect.height - rect.height });
      }
    });

    // Handle scaling with aspect ratio
    cropRect.on('scaling', () => {
      if (aspectRatio) {
        const newWidth = cropRect.width! * cropRect.scaleX!;
        const newHeight = newWidth / aspectRatio;
        
        cropRect.set({
          height: newHeight / cropRect.scaleY!,
        });
      }
      
      updateCropSettings(cropRect, img);
    });

    cropRect.on('modified', () => {
      updateCropSettings(cropRect, img);
    });

    cropRectRef.current = cropRect;
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
  }, [aspectRatio]);

  const updateCropSettings = useCallback((cropRect: Rect, img: FabricImage) => {
    const rectBounds = cropRect.getBoundingRect();
    const imgBounds = img.getBoundingRect();
    const scale = img.scaleX!;
    
    // Convert canvas coordinates to original image coordinates
    const cropData: CropSettings = {
      x: Math.round((rectBounds.left - imgBounds.left) / scale),
      y: Math.round((rectBounds.top - imgBounds.top) / scale),
      width: Math.round(rectBounds.width / scale),
      height: Math.round(rectBounds.height / scale),
      rotation,
      flipX,
      flipY,
    };
    
    onCropChange(cropData);
  }, [onCropChange, rotation, flipX, flipY]);

  const handleAspectRatioChange = (ratio: number | null) => {
    setAspectRatio(ratio);
    
    if (cropRectRef.current && ratio) {
      const rect = cropRectRef.current;
      const currentWidth = rect.width! * rect.scaleX!;
      const newHeight = currentWidth / ratio;
      
      rect.set({
        height: newHeight / rect.scaleY!,
      });
      
      fabricCanvasRef.current?.renderAll();
    }
  };

  const handleRotate = (degrees: number) => {
    const newRotation = (rotation + degrees) % 360;
    setRotation(newRotation);
    
    if (imageObjectRef.current) {
      imageObjectRef.current.rotate(newRotation);
      fabricCanvasRef.current?.renderAll();
    }
  };

  const handleFlip = (axis: 'x' | 'y') => {
    if (axis === 'x') {
      setFlipX(!flipX);
      if (imageObjectRef.current) {
        imageObjectRef.current.set({ flipX: !flipX });
      }
    } else {
      setFlipY(!flipY);
      if (imageObjectRef.current) {
        imageObjectRef.current.set({ flipY: !flipY });
      }
    }
    fabricCanvasRef.current?.renderAll();
  };

  const resetCrop = () => {
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setAspectRatio(null);
    
    if (fabricCanvasRef.current && imageObjectRef.current) {
      imageObjectRef.current.set({
        angle: 0,
        flipX: false,
        flipY: false,
      });
      createCropRect(fabricCanvasRef.current, imageObjectRef.current);
      fabricCanvasRef.current.renderAll();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Crop Controls */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          <Crop sx={{ mr: 1, verticalAlign: 'middle' }} />
          Crop & Straighten
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Aspect Ratio</InputLabel>
            <Select
              value={aspectRatio || 'free'}
              label="Aspect Ratio"
              onChange={(e) => handleAspectRatioChange(
                e.target.value === 'free' ? null : Number(e.target.value)
              )}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <MenuItem key={ratio.label} value={ratio.value || 'free'}>
                  {ratio.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem />

          <IconButton 
            onClick={() => handleRotate(-90)}
            title="Rotate Left"
            size="small"
          >
            <RotateLeft />
          </IconButton>

          <IconButton 
            onClick={() => handleRotate(90)}
            title="Rotate Right"
            size="small"
          >
            <RotateRight />
          </IconButton>

          <IconButton 
            onClick={() => handleFlip('x')}
            title="Flip Horizontal"
            size="small"
            color={flipX ? 'primary' : 'default'}
          >
            <Flip />
          </IconButton>

          <IconButton 
            onClick={() => handleFlip('y')}
            title="Flip Vertical"
            size="small"
            color={flipY ? 'primary' : 'default'}
          >
            <FlipCameraAndroid />
          </IconButton>

          <Divider orientation="vertical" flexItem />

          <IconButton 
            onClick={resetCrop}
            size="small"
            sx={{ ml: 'auto' }}
          >
            Reset
          </IconButton>
        </Box>
      </Box>

      {/* Canvas */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        <canvas ref={canvasRef} style={{ border: '1px solid #555' }} />
      </Box>

      {/* Crop Info */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          Selection: {cropSettings.width} × {cropSettings.height} px
          {rotation !== 0 && ` • Rotated: ${rotation}°`}
          {(flipX || flipY) && ` • Flipped: ${flipX ? 'H' : ''}${flipY ? 'V' : ''}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default CropTool;
