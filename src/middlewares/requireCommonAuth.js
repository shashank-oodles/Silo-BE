import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const requireCommonAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabase
      .from("session")
      .select(`
        user_id,
        user:user_id (
          id,
          email,
          name
        )
      `)
      .eq("token", token)
      .single();

    if (error || !data?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach unified user context
    req.user = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name
    };

    next();
  } catch (err) {
    next(err);
  }
};

