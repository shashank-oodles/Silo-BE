// utils/teamResolver.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const fetchTeamsByOrg = async (organizationId) => {
  const { data, error } = await supabase
    .from("team")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw new Error("Failed to fetch teams");
  return data || [];
};

export const resolveTeam = (teams, userInput) => {
  const trimmed = userInput.trim();

  // Match by number e.g. user types "2"
  const numberPick = parseInt(trimmed);
  if (!isNaN(numberPick) && numberPick >= 1 && numberPick <= teams.length) {
    return teams[numberPick - 1];
  }

  // Match by name (case insensitive)
  return teams.find(
    t => t.name.toLowerCase() === trimmed.toLowerCase()
  ) || null;
};

export const formatTeamList = (teams) => {
  return teams.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
};