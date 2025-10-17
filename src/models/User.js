const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * WHAT THIS DOES: Defines User data structure and authentication methods
 * WHY IMPORTANT: Every user account follows this exact structure
 * LEARNING: Schema = blueprint, Model = factory that creates documents
 */

const userSchema = new mongoose.Schema(
  {
    // LEARNING: Each field defines data type, requirements, and constraints
    
    email: {
      type: String,
      required: [true, 'Email is required'],  // WHY: Can't create account without email
      unique: true,  // WHY: No duplicate emails allowed (prevents multiple accounts)
      lowercase: true,  // WHY: john@GMAIL.com becomes john@gmail.com (consistency)
      trim: true,  // WHY: Removes accidental spaces
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ],  // WHY: Basic email format validation
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,  // WHY: NEVER return password in queries (security!)
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    role: {
      type: String,
      enum: ['user', 'pro', 'admin'],  // WHY: Only these 3 roles allowed
      default: 'user',  // WHY: New users start as free tier
    },

    isEmailVerified: {
      type: Boolean,
      default: false,  // WHY: Must verify email before full access
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    // LEARNING: Array of objects for tracking login devices
    devices: [
      {
        deviceId: String,
        deviceName: String,
        lastActive: Date,
      }
    ],

    // LEARNING: Soft delete (mark as deleted without removing data)
    isActive: {
      type: Boolean,
      default: true,
    },

  },
  {
    // LEARNING: Automatically adds createdAt and updatedAt timestamps
    timestamps: true,
    
    // LEARNING: Don't include __v (version key) in responses
    versionKey: false,
  }
);

// ========================================
// MIDDLEWARE: Runs before saving user
// ========================================

/**
 * WHAT THIS DOES: Automatically hashes password before saving to database
 * WHEN IT RUNS: Before user.save() or User.create()
 * WHY IMPORTANT: NEVER store plain text passwords (security!)
 */
userSchema.pre('save', async function (next) {
  // LEARNING: 'this' refers to the user document being saved
  
  // Only hash if password is new or modified
  if (!this.isModified('password')) {
    return next();  // Skip hashing if password unchanged
  }

  try {
    // LEARNING: Generate salt (random data added to password)
    // 12 rounds = 2^12 iterations (more = slower but more secure)
    const salt = await bcrypt.genSalt(12);
    
    // LEARNING: Hash password with salt
    // Input: "myPassword123" → Output: "$2a$12$KJ9aL4..." (irreversible)
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

// ========================================
// CUSTOM METHODS: Attached to user documents
// ========================================

/**
 * WHAT THIS DOES: Compares login password with hashed password in database
 * WHEN USED: During login authentication
 * WHY IMPORTANT: Securely verify password without exposing hash
 * 
 * EXAMPLE USAGE:
 * const user = await User.findOne({ email });
 * const isMatch = await user.comparePassword('userTypedPassword');
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // LEARNING: bcrypt.compare() hashes candidatePassword and compares
    // Returns true if match, false if not
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * WHAT THIS DOES: Returns safe user object (without password)
 * WHEN USED: Before sending user data to frontend
 * WHY IMPORTANT: Never expose sensitive fields
 */
userSchema.methods.toSafeObject = function () {
  const userObject = this.toObject();
  
  // LEARNING: Delete sensitive fields before sending to frontend
  delete userObject.password;
  delete userObject.devices;
  
  return userObject;
};

// LEARNING: Create and export the User model
// Model name 'User' → MongoDB collection name 'users' (auto-pluralized)
const User = mongoose.model('User', userSchema);

module.exports = User;
