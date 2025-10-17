const { z } = require('zod');

/**
 * WHAT THIS DOES: Defines validation rules using Zod library
 * WHY IMPORTANT: Blocks invalid data BEFORE it reaches database
 * LEARNING: Zod provides type-safe validation with clear error messages
 */

// ========================================
// AUTHENTICATION VALIDATORS
// ========================================

/**
 * Registration Validation
 * REQUIREMENTS:
 * - Email must be valid format
 * - Password minimum 8 characters
 * - Name required
 */
const registerSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    // LEARNING: Regex ensures strong password
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
});

/**
 * Login Validation
 * REQUIREMENTS:
 * - Email must be valid
 * - Password must be provided
 */
const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(1, 'Password is required'),
});

// ========================================
// WORKSPACE VALIDATORS
// ========================================

/**
 * Create Workspace Validation
 */
const createWorkspaceSchema = z.object({
  name: z
    .string({
      required_error: 'Workspace name is required',
    })
    .min(1, 'Workspace name cannot be empty')
    .max(50, 'Workspace name too long')
    .trim(),
  
  description: z
    .string()
    .max(200, 'Description too long')
    .optional(),
  
  theme: z
    .object({
      primaryColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    })
    .optional(),
});

/**
 * Update Layout Validation
 * LEARNING: Zod can validate complex nested structures
 */
const updateLayoutSchema = z.object({
  layout: z.array(
    z.object({
      widgetId: z.string(),
      x: z.number().min(0),
      y: z.number().min(0),
      w: z.number().min(1).max(12),
      h: z.number().min(1).max(12),
      z: z.number().optional(),
    })
  ),
});

// ========================================
// WIDGET VALIDATORS
// ========================================

/**
 * Create Widget Validation
 */
const createWidgetSchema = z.object({
  workspaceId: z
    .string({
      required_error: 'Workspace ID is required',
    })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format'),
  
  widgetType: z.enum(['clock', 'sticky-note', 'calendar'], {
    errorMap: () => ({ message: 'Invalid widget type' }),
  }),
  
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(1).max(12),
    h: z.number().min(1).max(12),
  }),
  
  props: z.record(z.any()).optional(),  // WHY: Widget-specific data (flexible)
});

// ========================================
// HELPER FUNCTION: Validate Request
// ========================================

/**
 * WHAT THIS DOES: Validates request body against schema
 * RETURNS: { success, data, errors }
 * 
 * EXAMPLE USAGE:
 * const validation = validateRequest(registerSchema, req.body);
 * if (!validation.success) {
 *   return res.status(400).json({ errors: validation.errors });
 * }
 */
const validateRequest = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: null,
    };
  } catch (error) {
    // LEARNING: Zod errors are detailed and user-friendly
    return {
      success: false,
      data: null,
      errors: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  createWorkspaceSchema,
  updateLayoutSchema,
  createWidgetSchema,
  validateRequest,
};
