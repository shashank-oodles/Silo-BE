// middleware/authenticate.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Missing or invalid authorization header. Please provide a valid Bearer token." 
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ 1. Validate token in session table
    const { data: sessionData, error: sessionError } = await supabase
      .from("session")
      .select("user_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (sessionError) {
      console.error('Session lookup error:', sessionError);
      return res.status(500).json({ error: "Authentication service error" });
    }

    if (!sessionData) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // ✅ 2. Check token expiration
    if (sessionData.expires_at && new Date(sessionData.expires_at) < new Date()) {
      return res.status(401).json({ error: "Token has expired" });
    }

    // ✅ 3. Fetch user details
    const { data: userData, error: userError } = await supabase
      .from("user")
      .select("id, email, name, created_at")
      .eq("id", sessionData.user_id)
      .maybeSingle();

    if (userError) {
      console.error('User lookup error:', userError);
      return res.status(500).json({ error: "User lookup failed" });
    }

    if (!userData) {
      return res.status(401).json({ error: "User not found" });
    }

    // ✅ 4. Fetch organization membership
    const { data: memberData, error: memberError } = await supabase
      .from("member")
      .select("role, organization_id, created_at")
      .eq("user_id", sessionData.user_id)
      .maybeSingle();

    if (memberError) {
      console.error('Member lookup error:', memberError);
      return res.status(500).json({ error: "Organization membership lookup failed" });
    }

    if (!memberData) {
      return res.status(403).json({ 
        error: "User is not a member of any organization" 
      });
    }

    // ✅ 5. Attach user context to request
    req.user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: memberData.role,
      organizationId: memberData.organization_id,
      createdAt: userData.created_at,
      memberSince: memberData.created_at
    };

    // ✅ 6. Optional: Update last activity (uncomment if needed)
    // await supabase
    //   .from("session")
    //   .update({ last_activity: new Date().toISOString() })
    //   .eq("token", token);

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: "Internal authentication error" 
    });
  }
};

// ✅ Optional: Role-based middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.user.role?.toLowerCase();
    const allowed = allowedRoles.map(role => role.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// ✅ Optional: Organization-specific middleware
export const requireOrganization = (req, res, next) => {
  if (!req.user?.organizationId) {
    return res.status(403).json({ 
      error: "Organization membership required" 
    });
  }
  next();
};