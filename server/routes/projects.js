const express = require('express');
const { body, validationResult, query } = require('express-validator');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { auth, ownerAuth } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects for the authenticated user
// @access  Private
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sort').optional().isIn(['createdAt', 'lastEdited', 'title']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('starred').optional().isBoolean().withMessage('Starred must be a boolean'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search query too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'lastEdited';
    const order = req.query.order === 'asc' ? 1 : -1;
    const starred = req.query.starred;
    const search = req.query.search;

    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user._id };
    
    if (starred !== undefined) {
      query.starred = starred === 'true';
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const projects = await Project.find(query)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit)
      .select('-history -__v')
      .lean();

    // Get total count for pagination
    const total = await Project.countDocuments(query);

    res.json({
      projects: projects.map(project => ({
        id: project._id,
        title: project.title,
        description: project.description,
        image: {
          url: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.filename}`,
          thumbnailUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.thumbnailPath}`,
          previewUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.previewPath}`,
          originalFilename: project.image.originalFilename,
          dimensions: project.image.dimensions,
          size: project.image.size
        },
        adjustments: project.adjustments,
        crop: project.crop,
        tags: project.tags,
        starred: project.starred,
        isPublic: project.isPublic,
        createdAt: project.createdAt,
        lastEdited: project.lastEdited,
        version: project.version
      })),
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error retrieving projects' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a specific project
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        image: {
          url: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.filename}`,
          thumbnailUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.thumbnailPath}`,
          previewUrl: `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${project.image.previewPath}`,
          originalFilename: project.image.originalFilename,
          dimensions: project.image.dimensions,
          size: project.image.size,
          metadata: project.image.metadata
        },
        adjustments: project.adjustments,
        crop: project.crop,
        tags: project.tags,
        starred: project.starred,
        isPublic: project.isPublic,
        createdAt: project.createdAt,
        lastEdited: project.lastEdited,
        version: project.version,
        history: project.history
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error retrieving project' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project metadata (title, description, tags, etc.)
// @access  Private
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('starred')
    .optional()
    .isBoolean()
    .withMessage('Starred must be a boolean'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, description, tags, starred, isPublic } = req.body;

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (starred !== undefined) project.starred = starred;
    if (isPublic !== undefined) project.isPublic = isPublic;
    
    if (tags !== undefined) {
      project.tags = tags
        .map(tag => tag.toString().trim().toLowerCase())
        .filter(tag => tag && tag.length <= 30);
    }

    await project.save();

    res.json({
      message: 'Project updated successfully',
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        tags: project.tags,
        starred: project.starred,
        isPublic: project.isPublic,
        lastEdited: project.lastEdited,
        version: project.version
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
});

// @route   PUT /api/projects/:id/adjustments
// @desc    Update project adjustments (exposure, contrast, etc.)
// @access  Private
router.put('/:id/adjustments', [
  auth,
  body('adjustments').isObject().withMessage('Adjustments must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { adjustments } = req.body;
    
    // Validate adjustment values
    const validAdjustments = {};
    const allowedFields = [
      'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
      'temperature', 'tint', 'vibrance', 'saturation', 'texture', 'clarity',
      'dehaze', 'vignette'
    ];

    for (const [key, value] of Object.entries(adjustments)) {
      if (allowedFields.includes(key) && typeof value === 'number') {
        // Apply appropriate ranges for each adjustment
        let min = -100, max = 100;
        if (key === 'exposure') {
          min = -5; max = 5;
        } else if (key === 'grain') {
          // Handle grain object separately
          continue;
        }
        
        validAdjustments[key] = Math.min(Math.max(value, min), max);
      }
    }

    // Handle grain adjustments separately
    if (adjustments.grain && typeof adjustments.grain === 'object') {
      const grainAdjustments = {};
      if (typeof adjustments.grain.amount === 'number') {
        grainAdjustments.amount = Math.min(Math.max(adjustments.grain.amount, 0), 100);
      }
      if (typeof adjustments.grain.size === 'number') {
        grainAdjustments.size = Math.min(Math.max(adjustments.grain.size, 0), 100);
      }
      if (typeof adjustments.grain.roughness === 'number') {
        grainAdjustments.roughness = Math.min(Math.max(adjustments.grain.roughness, 0), 100);
      }
      if (Object.keys(grainAdjustments).length > 0) {
        validAdjustments.grain = { ...project.adjustments.grain.toObject(), ...grainAdjustments };
      }
    }

    // Handle curves adjustments
    if (adjustments.curves && Array.isArray(adjustments.curves)) {
      const validCurves = adjustments.curves.filter(point => 
        point && 
        typeof point.x === 'number' && 
        typeof point.y === 'number' &&
        point.x >= 0 && point.x <= 255 &&
        point.y >= 0 && point.y <= 255
      );
      
      if (validCurves.length >= 2) {
        validAdjustments.curves = validCurves;
      }
    }

    // Apply adjustments
    project.applyAdjustments(validAdjustments);
    await project.save();

    res.json({
      message: 'Adjustments applied successfully',
      adjustments: project.adjustments,
      lastEdited: project.lastEdited,
      version: project.version
    });
  } catch (error) {
    console.error('Update adjustments error:', error);
    res.status(500).json({ error: 'Server error updating adjustments' });
  }
});

// @route   PUT /api/projects/:id/crop
// @desc    Update project crop settings
// @access  Private
router.put('/:id/crop', [
  auth,
  body('crop').isObject().withMessage('Crop must be an object'),
  body('crop.x').isNumeric().withMessage('Crop x must be a number'),
  body('crop.y').isNumeric().withMessage('Crop y must be a number'),
  body('crop.width').isInt({ min: 1 }).withMessage('Crop width must be a positive integer'),
  body('crop.height').isInt({ min: 1 }).withMessage('Crop height must be a positive integer'),
  body('crop.rotation').optional().isFloat({ min: -180, max: 180 }).withMessage('Rotation must be between -180 and 180'),
  body('crop.flipHorizontal').optional().isBoolean().withMessage('flipHorizontal must be boolean'),
  body('crop.flipVertical').optional().isBoolean().withMessage('flipVertical must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { crop } = req.body;

    // Validate crop bounds against image dimensions
    const imageDimensions = project.image.dimensions;
    if (crop.x < 0 || crop.y < 0 || 
        crop.x + crop.width > imageDimensions.width || 
        crop.y + crop.height > imageDimensions.height) {
      return res.status(400).json({ error: 'Crop bounds exceed image dimensions' });
    }

    project.applyCrop({
      x: parseFloat(crop.x),
      y: parseFloat(crop.y),
      width: parseInt(crop.width),
      height: parseInt(crop.height),
      rotation: parseFloat(crop.rotation) || 0,
      flipHorizontal: crop.flipHorizontal || false,
      flipVertical: crop.flipVertical || false,
      aspectRatio: crop.aspectRatio || 'free'
    });

    await project.save();

    res.json({
      message: 'Crop applied successfully',
      crop: project.crop,
      lastEdited: project.lastEdited,
      version: project.version
    });
  } catch (error) {
    console.error('Update crop error:', error);
    res.status(500).json({ error: 'Server error updating crop' });
  }
});

// @route   POST /api/projects/:id/reset
// @desc    Reset all project edits to original
// @access  Private
router.post('/:id/reset', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.resetEdits();
    await project.save();

    res.json({
      message: 'Project reset to original successfully',
      adjustments: project.adjustments,
      crop: project.crop,
      lastEdited: project.lastEdited,
      version: project.version
    });
  } catch (error) {
    console.error('Reset project error:', error);
    res.status(500).json({ error: 'Server error resetting project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project and its files
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete image files
    const filesToDelete = [
      path.join(__dirname, '../uploads', project.image.filename)
    ];

    if (project.image.thumbnailPath) {
      filesToDelete.push(path.join(__dirname, '../uploads', project.image.thumbnailPath));
    }
    if (project.image.previewPath) {
      filesToDelete.push(path.join(__dirname, '../uploads', project.image.previewPath));
    }

    // Delete export files
    for (const exportFile of project.exports) {
      if (exportFile.path) {
        filesToDelete.push(path.join(__dirname, exportFile.path));
      }
    }

    // Delete files from filesystem
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error(`Error deleting file ${filePath}:`, fileError);
      }
    }

    // Update user storage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: -project.image.size }
    });

    // Delete project from database
    await Project.findByIdAndDelete(project._id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
});

// @route   GET /api/projects/:id/history
// @desc    Get project edit history
// @access  Private
router.get('/:id/history', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('history').lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      history: project.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error retrieving project history' });
  }
});

module.exports = router;
