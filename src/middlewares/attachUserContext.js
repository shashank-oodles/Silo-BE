import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// middlewares/attachUserContext.js
export const attachUserContext = async (req, res, next) => {
  try {

    const {user_id} = req.body;

    if (!user_id) {
      return next();
    }

    const { data: member, error } = await supabase
      .from("member")
      .select("role, organization_id", "user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error || !member) {
      return res.status(403).json({
        error: "User does not belong to any organization"
      });
    }

    req.user = req.user || {};
    req.user.id = user_id;
    req.user.role = member?.role;                 // admin | legal | member
    req.user.organizationId = member?.organization_id;

    next();
  } catch (err) {
    next(err);
  }
};
