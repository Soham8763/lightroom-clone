const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { auth, checkStorage } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// Ensure upload directories exist
const ensureDirectories = async () => {
  const dirs = ['../uploads', '../uploads/thumbnails', '../uploads/previews', '../uploads/exports'];
  for (const dir of dirs) {
    try {
      await fs.access(path.join(__dirname, dir));
    } catch {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }
  }
};

ensureDirectories();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/webp'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, TIFF, and WebP files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  }
});

// Helper function to extract metadata
const extractMetadata = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      orientation: metadata.orientation,
      // Additional metadata from EXIF if available
      exif: metadata.exif ? {
        // Parse EXIF data here if needed
        // For now, we'll store the raw buffer and parse client-side if needed
      } : null
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
};

// Helper function to generate thumbnails and previews
const generateImageVariants = async (originalPath, filename) => {
  const baseFilename = path.parse(filename).name;
  const ext = '.jpg'; // Always use JPEG for thumbnails and previews
  
  const thumbnailPath = path.join(__dirname, '../uploads/thumbnails', `${baseFilename}${ext}`);
  const previewPath = path.join(__dirname, '../uploads/previews', `${baseFilename}${ext}`);
  
  try {
    // Generate thumbnail (300x300 max, maintain aspect ratio)
    await sharp(originalPath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);
    
    // Generate preview (1200x1200 max, maintain aspect ratio)
    await sharp(originalPath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toFile(previewPath);
    
    return {
      thumbnailPath: `thumbnails/${baseFilename}${ext}`,
      previewPath: `previews/${baseFilename}${ext}`
    };
  } catch (error) {
    console.error('Error generating image variants:', error);
    return { thumbnailPath: null, previewPath: null };
  }
};

// @route   POST /api/upload
// @desc    Upload image and create new project
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { title, description, tags } = req.body;
    const userId = req.user._id;
    
    // Check storage limit
    const user = await User.findById(userId);
    if (user.storageUsed + req.file.size > user.storageLimit) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(413).json({ 
        error: 'Storage limit exceeded. Please upgrade your plan or delete some files.',
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      });
    }
    
    // Extract image metadata
    const metadata = await extractMetadata(req.file.path);
    
    if (!metadata) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Could not process image file' });
    }
    
    // Generate thumbnails and previews
    const variants = await generateImageVariants(req.file.path, req.file.filename);
    
    // Create new project
    const project = new Project({
      title: title || path.parse(req.file.originalname).name,
      description: description || '',
      user: userId,
      image: {
        originalFilename: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        thumbnailPath: variants.thumbnailPath,
        previewPath: variants.previewPath,
        metadata: {
          colorSpace: metadata.space,
          orientation: metadata.orientation
        }
      },
      tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag) : []
    });
    
    // Add initial history entry
    project.addHistory('upload', {
      filename: req.file.originalname,
      size: req.file.size,
      dimensions: metadata
    });
    
    await project.save();
    
    // Update user storage usage
    await User.findByIdAndUpdate(userId, {
      $inc: { storageUsed: req.file.size }
    });
    
    res.status(201).json({
      message: 'Image uploaded successfully',
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        image: {
          url: project.image.url,
          thumbnailUrl: project.image.thumbnailUrl,
          previewUrl: project.image.previewUrl,
          originalFilename: project.image.originalFilename,
          dimensions: project.image.dimensions,
          size: project.image.size
        },
        adjustments: project.adjustments,
        crop: project.crop,
        tags: project.tags,
        createdAt: project.createdAt,
        lastEdited: project.lastEdited,
        version: project.version
      }
    });
    
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    console.error('Upload error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field.' });
      }
    }
    
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// @route   POST /api/upload/batch
// @desc    Upload multiple images at once
// @access  Private
router.post('/batch', auth, upload.array('images', 10), async (req, res) => {
  const uploadedFiles = [];
  const createdProjects = [];
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }
    
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Calculate total size
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    
    if (user.storageUsed + totalSize > user.storageLimit) {
      // Clean up uploaded files
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      return res.status(413).json({ 
        error: 'Storage limit exceeded for batch upload.',
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        requiredSpace: totalSize
      });
    }
    
    // Process each file
    for (const file of req.files) {
      uploadedFiles.push(file);
      
      try {
        // Extract metadata
        const metadata = await extractMetadata(file.path);
        if (!metadata) continue;
        
        // Generate variants
        const variants = await generateImageVariants(file.path, file.filename);
        
        // Create project
        const project = new Project({
          title: path.parse(file.originalname).name,
          description: '',
          user: userId,
          image: {
            originalFilename: file.originalname,
            filename: file.filename,
            path: file.path,
            mimeType: file.mimetype,
            size: file.size,
            dimensions: {
              width: metadata.width,
              height: metadata.height
            },
            thumbnailPath: variants.thumbnailPath,
            previewPath: variants.previewPath,
            metadata: {
              colorSpace: metadata.space,
              orientation: metadata.orientation
            }
          }
        });
        
        project.addHistory('upload', {
          filename: file.originalname,
          size: file.size,
          dimensions: metadata
        });
        
        await project.save();
        createdProjects.push(project);
        
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }
    
    if (createdProjects.length === 0) {
      return res.status(400).json({ error: 'No images could be processed' });
    }
    
    // Update user storage
    await User.findByIdAndUpdate(userId, {
      $inc: { storageUsed: totalSize }
    });
    
    res.status(201).json({
      message: `Successfully uploaded ${createdProjects.length} images`,
      projects: createdProjects.map(project => ({
        id: project._id,
        title: project.title,
        image: {
          url: project.image.url,
          thumbnailUrl: project.image.thumbnailUrl,
          originalFilename: project.image.originalFilename,
          dimensions: project.image.dimensions,
          size: project.image.size
        },
        createdAt: project.createdAt
      }))
    });
    
  } catch (error) {
    // Clean up all uploaded files on error
    for (const file of uploadedFiles) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    console.error('Batch upload error:', error);
    res.status(500).json({ error: 'Server error during batch upload' });
  }
});

// @route   GET /api/upload/storage
// @desc    Get user's storage usage statistics
// @access  Private
router.get('/storage', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const usage = await Project.getUserStorageUsage(userId);
    
    res.json({
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      projectCount: usage.projectCount,
      percentageUsed: Math.round((user.storageUsed / user.storageLimit) * 100),
      remainingSpace: user.storageLimit - user.storageUsed
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({ error: 'Server error retrieving storage statistics' });
  }
});

module.exports = router;
