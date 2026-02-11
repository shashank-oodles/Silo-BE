import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const requireCommonAuth = async (req, res, next) => {
  try {
    const userId = req.query.user_id;

    const {data: member, error} = await supabase
      .from("member")
      .select("role, organization_id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !member) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // console.log("User Data:", member, req.query.organization_id);

    if(member.organization_id !== req.query.organization_id){
      return res.status(403).json({ error: "Organization mismatch" });
    }

    const { data: userData, error: userError } = await supabase
            .from("user")
            .select("email")
            .eq("id", userId)
            .maybeSingle();

        if (userError || !userData) {
            return res.status(403).json({
                error: "User not found"
            });
        }

    req.user ={
      id: member.user_id,
      role: member.role,
      organizationId: member.organization_id,
      email: userData?.email
    }

    next();
  } catch (error) {
    console.log("Auth Middleware Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

