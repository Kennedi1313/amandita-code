export const getStoreInitials = (name?: string | null) => {
  const words = String(name || "Loja").trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || "L").charAt(0).toUpperCase();
  return words.map((word) => word[0]).join("").toUpperCase();
};
