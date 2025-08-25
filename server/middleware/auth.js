const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database to ensure they still exist
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ error: 'Token is not valid. User not found.' });
      }
      
      if (user.isLocked) {
        return res.status(423).json({ error: 'Account is locked due to too many failed login attempts.' });
      }
      
      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired.' });
      }
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token.' });
      }
      throw tokenError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

// Middleware to verify user owns the resource
const ownerAuth = (resourceIdParam = 'id', userField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      // For this middleware to work, the route should have already fetched the resource
      // and attached it to req.resource, or we need to fetch it here
      if (!req.resource) {
        return res.status(500).json({ error: 'Resource not found for ownership verification.' });
      }
      
      const resourceUserId = req.resource[userField];
      
      if (!resourceUserId || resourceUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You do not own this resource.' });
      }
      
      next();
    } catch (error) {
      console.error('Owner auth middleware error:', error);
      res.status(500).json({ error: 'Server error during ownership verification.' });
    }
  };
};

// Middleware to check if user has enough storage space
const checkStorage = (requiredSpace = 0) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (user.storageUsed + requiredSpace > user.storageLimit) {
        return res.status(413).json({ 
          error: 'Storage limit exceeded. Please upgrade your plan or delete some files.',
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          requiredSpace
        });
      }
      
      next();
    } catch (error) {
      console.error('Storage check middleware error:', error);
      res.status(500).json({ error: 'Server error during storage check.' });
    }
  };
};

// Optional auth - allows both authenticated and unauthenticated requests
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next(); // No token provided, continue without user
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next(); // No valid token format, continue without user
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && !user.isLocked) {
        req.user = user;
      }
    } catch (tokenError) {
      // Token verification failed, but we continue without user
      console.log('Optional auth token verification failed:', tokenError.message);
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // In optional auth, we don't fail the request on errors
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d', // Token expires in 7 days
      issuer: 'lightroom-clone',
      audience: 'lightroom-clone-users'
    }
  );
};

// Verify token without middleware (for utility purposes)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  auth,
  ownerAuth,
  checkStorage,
  optionalAuth,
  generateToken,
  verifyToken
};
