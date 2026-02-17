// middleware/auth.js (Alternative for custom auth)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const authenticate = async (req, res, next) => {
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

        const { data: userData, error: userError } = await supabase
            .from("user")
            .select("email, name")
            .eq("id", data.user_id)
            .maybeSingle();

        if (userError || !userData) {
            return res.status(403).json({
                error: "User not found"
            });
        }

        const { data: member, error: memberError } = await supabase
            .from("member")
            .select("organization_id, user_id, role")
            .eq("user_id", data.user_id)
            .maybeSingle();

        if (memberError || !member) {
            return res.status(403).json({ error: "User not found" });
        }

        req.user = {
            id: data.user_id,
            email: userData.email,
            name: userData.name,
            organizationId: member.organization_id,
            role: member.role
        }

        next();
    } catch (err) {
        next(err);
    }
};
