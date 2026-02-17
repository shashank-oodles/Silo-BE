import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetch active categories for org directly from DB (no HTTP call needed)
export const fetchCategoriesByOrg = async (organizationId) => {
  const { data, error } = await supabase
    .from("Category")
    .select("id, name, assignedTeamId, autoReplyEnabled, autoReplyMessage, reviewerId")
    .eq("organization_id", organizationId)
    .eq("isActive", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch categories");
  return data || [];
};

// Match user input (by number or name) to a category
export const resolveCategory = (categories, userInput) => {
  const trimmed = userInput.trim();

  // Match by number e.g. user types "2"
  const numberPick = parseInt(trimmed);
  if (!isNaN(numberPick) && numberPick >= 1 && numberPick <= categories.length) {
    return categories[numberPick - 1];
  }

  // Match by name (case insensitive)
  return categories.find(
    c => c.name.toLowerCase() === trimmed.toLowerCase()
  ) || null;
};

// Format as numbered list for display
export const formatCategoryList = (categories) => {
  return categories.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
};