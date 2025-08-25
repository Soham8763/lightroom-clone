const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
  exposure: { type: Number, default: 0, min: -5, max: 5 },
  contrast: { type: Number, default: 0, min: -100, max: 100 },
  highlights: { type: Number, default: 0, min: -100, max: 100 },
  shadows: { type: Number, default: 0, min: -100, max: 100 },
  whites: { type: Number, default: 0, min: -100, max: 100 },
  blacks: { type: Number, default: 0, min: -100, max: 100 },
  temperature: { type: Number, default: 0, min: -100, max: 100 },
  tint: { type: Number, default: 0, min: -100, max: 100 },
  vibrance: { type: Number, default: 0, min: -100, max: 100 },
  saturation: { type: Number, default: 0, min: -100, max: 100 },
  texture: { type: Number, default: 0, min: -100, max: 100 },
  clarity: { type: Number, default: 0, min: -100, max: 100 },
  dehaze: { type: Number, default: 0, min: -100, max: 100 },
  vignette: { type: Number, default: 0, min: -100, max: 100 },
  grain: {
    amount: { type: Number, default: 0, min: 0, max: 100 },
    size: { type: Number, default: 50, min: 0, max: 100 },
    roughness: { type: Number, default: 50, min: 0, max: 100 }
  },
  curves: {
    type: [{
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    }],
    default: [
      { x: 0, y: 0 },
      { x: 255, y: 255 }
    ]
  }
}, { _id: false });

const cropSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  rotation: { type: Number, default: 0, min: -180, max: 180 },
  flipHorizontal: { type: Boolean, default: false },
  flipVertical: { type: Boolean, default: false },
  aspectRatio: { type: String, default: 'free' } // 'free', '1:1', '16:9', '4:3', etc.
}, { _id: false });

const imageSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: [true, 'Original filename is required']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/raw']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  dimensions: {
    width: {
      type: Number,
      required: [true, 'Image width is required'],
      min: [1, 'Image width must be positive']
    },
    height: {
      type: Number,
      required: [true, 'Image height is required'],
      min: [1, 'Image height must be positive']
    }
  },
  thumbnailPath: String,
  previewPath: String,
  metadata: {
    camera: String,
    lens: String,
    focalLength: Number,
    aperture: Number,
    shutterSpeed: String,
    iso: Number,
    dateTaken: Date,
    gps: {
      latitude: Number,
      longitude: Number
    },
    colorSpace: String,
    orientation: Number
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Project title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  image: {
    type: imageSchema,
    required: [true, 'Image is required']
  },
  adjustments: {
    type: adjustmentSchema,
    default: () => ({})
  },
  crop: {
    type: cropSchema,
    default: null
  },
  history: [{
    action: {
      type: String,
      required: true,
      enum: ['upload', 'adjust', 'crop', 'export', 'reset']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  starred: {
    type: Boolean,
    default: false
  },
  lastEdited: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be positive']
  },
  exports: [{
    filename: String,
    path: String,
    format: {
      type: String,
      enum: ['jpeg', 'png', 'tiff', 'webp']
    },
    quality: Number,
    size: Number,
    exportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
projectSchema.index({ user: 1, createdAt: -1 });
projectSchema.index({ user: 1, title: 'text', tags: 'text' });
projectSchema.index({ user: 1, starred: 1 });
projectSchema.index({ user: 1, isPublic: 1 });
projectSchema.index({ lastEdited: -1 });

// Virtual for full image URL
projectSchema.virtual('image.url').get(function() {
  if (this.image && this.image.filename) {
    return `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${this.image.filename}`;
  }
  return null;
});

// Virtual for thumbnail URL
projectSchema.virtual('image.thumbnailUrl').get(function() {
  if (this.image && this.image.thumbnailPath) {
    return `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${this.image.thumbnailPath}`;
  }
  return this.image.url; // Fallback to original image
});

// Virtual for preview URL
projectSchema.virtual('image.previewUrl').get(function() {
  if (this.image && this.image.previewPath) {
    return `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${this.image.previewPath}`;
  }
  return this.image.url; // Fallback to original image
});

// Method to add history entry
projectSchema.methods.addHistory = function(action, changes) {
  this.history.push({
    action,
    changes: changes || {},
    timestamp: new Date()
  });
  
  // Keep only last 50 history entries
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }
  
  this.lastEdited = new Date();
  this.version += 1;
};

// Method to apply adjustments
projectSchema.methods.applyAdjustments = function(newAdjustments) {
  const oldAdjustments = { ...this.adjustments.toObject() };
  
  // Update adjustments
  Object.assign(this.adjustments, newAdjustments);
  
  // Add to history
  this.addHistory('adjust', {
    old: oldAdjustments,
    new: newAdjustments
  });
};

// Method to apply crop
projectSchema.methods.applyCrop = function(cropData) {
  const oldCrop = this.crop ? { ...this.crop.toObject() } : null;
  
  this.crop = cropData;
  
  this.addHistory('crop', {
    old: oldCrop,
    new: cropData
  });
};

// Method to reset all edits
projectSchema.methods.resetEdits = function() {
  const oldState = {
    adjustments: { ...this.adjustments.toObject() },
    crop: this.crop ? { ...this.crop.toObject() } : null
  };
  
  // Reset adjustments to defaults
  this.adjustments = {};
  this.crop = null;
  
  this.addHistory('reset', { old: oldState });
};

// Static method to get user's storage usage
projectSchema.statics.getUserStorageUsage = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { 
      $group: { 
        _id: null, 
        totalSize: { $sum: '$image.size' },
        projectCount: { $sum: 1 }
      } 
    }
  ]);
  
  return result[0] || { totalSize: 0, projectCount: 0 };
};

module.exports = mongoose.model('Project', projectSchema);
