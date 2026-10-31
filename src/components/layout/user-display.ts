import type { User } from "@supabase/supabase-js";

const readMetadata = (user: User, key: string): string => {
  const value: unknown = user.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
};

export const getDisplayName = (user: User): string => {
  const fullName =
    readMetadata(user, "full_name") ||
    [readMetadata(user, "firstName"), readMetadata(user, "lastName")]
      .filter(Boolean)
      .join(" ");
  return fullName || user.email || "Utilisateur";
};

export const getInitials = (user: User): string => {
  const name = getDisplayName(user).split("@")[0] ?? "";
  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : name.slice(0, 2);
  return initials.slice(0, 2).toUpperCase() || "?";
};
