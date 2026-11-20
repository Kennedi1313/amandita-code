export const getCategoryPathLabel = (category, categories) => {
  if (!category) return "";

  const categoriesById = new Map(
    categories.map((item) => [String(item.id), item]),
  );
  const names = [];
  const visited = new Set();
  let current = category;

  while (current && !visited.has(String(current.id))) {
    visited.add(String(current.id));
    names.unshift(current.name);
    current = current.parentId
      ? categoriesById.get(String(current.parentId))
      : null;
  }

  return names.join(" › ");
};

export const flattenCategoryTree = (categories) => {
  const categoriesById = new Map(
    categories.map((category) => [String(category.id), category]),
  );
  const childrenByParent = new Map();

  categories.forEach((category) => {
    const parentKey = category.parentId
      && categoriesById.has(String(category.parentId))
      ? String(category.parentId)
      : "root";
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(category);
    childrenByParent.set(parentKey, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  });

  const rows = [];
  const visited = new Set();
  const addBranch = (category, depth) => {
    const key = String(category.id);
    if (visited.has(key)) return;
    visited.add(key);
    rows.push({ category, depth });

    (childrenByParent.get(key) || []).forEach((child) => {
      addBranch(child, depth + 1);
    });
  };

  (childrenByParent.get("root") || []).forEach((category) => {
    addBranch(category, 0);
  });

  // Keep malformed or legacy orphaned entries visible and editable.
  categories.forEach((category) => {
    addBranch(category, 0);
  });

  return rows;
};

export const getCategoryDescendantIds = (categoryId, categories) => {
  const descendants = new Set();
  let changed = true;

  while (changed) {
    changed = false;
    categories.forEach((category) => {
      const parentId = String(category.parentId ?? "");
      if (
        parentId
        && (parentId === String(categoryId) || descendants.has(parentId))
        && !descendants.has(String(category.id))
      ) {
        descendants.add(String(category.id));
        changed = true;
      }
    });
  }

  return descendants;
};
