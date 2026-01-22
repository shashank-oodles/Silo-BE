import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const requireOwner = async (req, res, next) => {
  try {
    const userId = req.supabaseUserId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabaseAdmin
            .from("member")
            .select("*")
            .eq("user_id", userId)
            .single();

    // console.log(data)

    if (error || !data?.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = data.role;

    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};
