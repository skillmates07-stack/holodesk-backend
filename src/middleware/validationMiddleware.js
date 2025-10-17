const { validateRequest } = require('../utils/validators');

/**
 * WHAT THIS DOES: Middleware factory that validates request data against Zod schemas
 * HOW IT WORKS: Takes a validation schema, returns middleware that checks req.body
 * 
 * LEARNING: This is a "middleware factory" - a function that returns middleware
 * 
 * WHY IMPORTANT:
 * - Prevents invalid data from reaching database
 * - Provides clear error messages to frontend
 * - Blocks SQL/NoSQL injection attempts
 * - Ensures data types are correct
 * 
 * USAGE EXAMPLE:
 * const { registerSchema } = require('../utils/validators');
 * router.post('/register', validate(registerSchema), registerController);
 */

// ========================================
// MAIN VALIDATION MIDDLEWARE FACTORY
// ========================================

/**
 * WHAT THIS RETURNS: Middleware function that validates req.body
 * 
 * @param {ZodSchema} schema - Zod validation schema
 * @param {string} source - Where to find data: 'body', 'query', 'params'
 * @returns {Function} Express middleware
 * 
 * EXAMPLE:
 * // Validate request body
 * validate(registerSchema, 'body')
 * 
 * // Validate URL query params
 * validate(searchSchema, 'query')
 * 
 * // Validate URL params
 * validate(idSchema, 'params')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // STEP 1: Get data from correct source
      let dataToValidate;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      // STEP 2: Validate data using the provided schema
      const validation = validateRequest(schema, dataToValidate);

      // STEP 3: If validation failed, return error response
      if (!validation.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validation.errors,
          // LEARNING: Show which fields failed validation
          fields: validation.errors.map(err => err.field)
        });
      }

      // STEP 4: Replace original data with validated/sanitized data
      // WHY: Zod can transform data (trim strings, lowercase emails, etc.)
      switch (source) {
        case 'body':
          req.body = validation.data;
          break;
        case 'query':
          req.query = validation.data;
          break;
        case 'params':
          req.params = validation.data;
          break;
      }

      // STEP 5: Validation passed, continue to next middleware
      next();

    } catch (error) {
      console.error('❌ Validation middleware error:', error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Validation error occurred',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// ========================================
// SANITIZE INPUT MIDDLEWARE
// ========================================

/**
 * WHAT THIS DOES: Removes dangerous characters from all string inputs
 * WHY IMPORTANT: Prevents XSS (Cross-Site Scripting) attacks
 * 
 * LEARNING: Runs BEFORE validation to clean up data
 * 
 * DANGEROUS CHARACTERS:
 * - <script> tags
 * - HTML entities
 * - JavaScript code
 * - SQL commands
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    next(); // Continue even if sanitization fails
  }
};

/**
 * HELPER: Recursively sanitize all strings in an object
 * 
 * LEARNING: This handles nested objects and arrays
 * 
 * EXAMPLE:
 * Input:  { name: "<script>alert('xss')</script>John" }
 * Output: { name: "John" }
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * HELPER: Sanitize a single string
 * 
 * REMOVES:
 * - HTML tags
 * - Script tags
 * - Event handlers (onclick, onerror, etc.)
 * - JavaScript protocols (javascript:)
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Remove HTML tags
  let cleaned = str.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  cleaned = cleaned.replace(/javascript:/gi, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
};

// ========================================
// FILE UPLOAD VALIDATION
// ========================================

/**
 * WHAT THIS DOES: Validates uploaded files (images, documents)
 * WHY IMPORTANT: Prevents malicious file uploads
 * 
 * OPTIONS:
 * - maxSize: Maximum file size in bytes
 * - allowedTypes: Array of allowed MIME types
 * - maxFiles: Maximum number of files
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // Default: 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles = 1
  } = options;

  return (req, res, next) => {
    try {
      // Check if files exist
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No files uploaded',
          code: 'NO_FILES'
        });
      }

      // Get files (could be single file or array)
      const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];

      // Check number of files
      if (files.length > maxFiles) {
        return res.status(400).json({
          status: 'error',
          message: `Too many files. Maximum allowed: ${maxFiles}`,
          code: 'TOO_MANY_FILES'
        });
      }

      // Validate each file
      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            status: 'error',
            message: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
            fileName: file.name,
            code: 'FILE_TOO_LARGE'
          });
        }

        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
            fileName: file.name,
            fileType: file.mimetype,
            code: 'INVALID_FILE_TYPE'
          });
        }
      }

      // All files valid, continue
      next();

    } catch (error) {
      console.error('❌ File validation error:', error);
      
      return res.status(500).json({
        status: 'error',
        message: 'File validation failed',
        code: 'FILE_VALIDATION_ERROR'
      });
    }
  };
};

// ========================================
// PAGINATION VALIDATION
// ========================================

/**
 * WHAT THIS DOES: Validates and sets defaults for pagination parameters
 * WHY USEFUL: Ensures page/limit are valid numbers
 * 
 * USAGE:
 * router.get('/workspaces', authMiddleware, validatePagination, getWorkspaces);
 * 
 * QUERY PARAMS:
 * ?page=1&limit=10
 * 
 * RESULT:
 * req.pagination = { page: 1, limit: 10, skip: 0 }
 */
const validatePagination = (req, res, next) => {
  try {
    // Get page and limit from query params
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    // Validate page
    if (page < 1) page = 1;
    if (page > 1000) page = 1000; // Prevent excessive pagination

    // Validate limit
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Prevent fetching too many items

    // Calculate skip for MongoDB
    const skip = (page - 1) * limit;

    // Attach to request
    req.pagination = {
      page,
      limit,
      skip
    };

    next();
  } catch (error) {
    console.error('❌ Pagination validation error:', error);
    
    // Set defaults and continue
    req.pagination = {
      page: 1,
      limit: 10,
      skip: 0
    };
    
    next();
  }
};

// ========================================
// MONGODB ID VALIDATION
// ========================================

/**
 * WHAT THIS DOES: Validates MongoDB ObjectID format
 * WHY IMPORTANT: Prevents invalid ID errors in database queries
 * 
 * USAGE:
 * router.get('/users/:id', validateMongoId('id'), getUserById);
 * 
 * VALID FORMAT: 507f1f77bcf86cd799439011 (24 hex characters)
 */
const validateMongoId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    // MongoDB ObjectID regex: 24 hex characters
    const mongoIdPattern = /^[0-9a-fA-F]{24}$/;

    if (!id || !mongoIdPattern.test(id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid ${paramName} format`,
        code: 'INVALID_ID',
        hint: 'ID must be a valid MongoDB ObjectID (24 hex characters)'
      });
    }

    next();
  };
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  validate,
  sanitizeInput,
  validateFileUpload,
  validatePagination,
  validateMongoId
};
