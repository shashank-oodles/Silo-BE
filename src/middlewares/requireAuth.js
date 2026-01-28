import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid token" });
        }

        const token = authHeader.replace("Bearer ", "");

        const { data, error } = await supabase
            .from("session")
            .select("*")
            .eq("token", token)
            .single();

        if (error || !data.user_id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        console.log(data)

        // Attach Supabase user to request
        req.supabaseUserId = data.user_id;

        next();
    } catch (err) {
        next(err);
    }
};
