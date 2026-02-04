import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const requireCommonAuth = async (req, res, next) => {
  try {
    const userId = req.query.user_id;

    const {data: userData, error} = await supabase
      .from("member")
      .select("role, organization_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !userData) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // console.log("User Data:", userData, req.query.organization_id);

    if(userData.organization_id !== req.query.organization_id){
      return res.status(403).json({ error: "Organization mismatch" });
    }

    req.user ={
      id: userData.user_id,
      role: userData.role,
      organizationId: userData.organization_id
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

