// ============================================================
// src/middleware/authMiddleware.js
//
// Middleware to verify Supabase JWT tokens and enforce
// role-based access control (RBAC).
// ============================================================

const { supabase } = require('../services/supabaseService');

/**
 * Global authentication middleware.
 * Verifies the Bearer token in the Authorization header.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.',
      });
    }

    // Attach user to the request object
    req.user = user;

    // Fetch user role from the user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is 'no rows found'
      console.error('❌ Error fetching user role:', roleError.message);
    }

    // Default to 'volunteer' if no role record exists yet
    req.user.role = roleData?.role || 'volunteer';

    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
};

/**
 * Authorization middleware to restrict routes to specific roles.
 *
 * @param {string|string[]} roles - allowed roles (e.g., 'coordinator')
 */
const authorize = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  authorize,
};
