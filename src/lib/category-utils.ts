/**
 * Category Utility Functions
 * Helper functions for common category operations
 */

export interface CategoryNode {
  id: string
  name: string
  handle: string
  level: number
  children?: CategoryNode[]
}

/**
 * Find category in tree by ID
 */
export function findCategoryInTree(
  tree: CategoryNode[],
  categoryId: string
): CategoryNode | null {
  for (const category of tree) {
    if (category.id === categoryId) {
      return category
    }
    if (category.children && category.children.length > 0) {
      const found = findCategoryInTree(category.children, categoryId)
      if (found) return found
    }
  }
  return null
}

/**
 * Flatten category tree to array
 */
export function flattenCategoryTree(
  tree: CategoryNode[],
  parent?: string
): Array<CategoryNode & { parent_id?: string }> {
  const result: Array<CategoryNode & { parent_id?: string }> = []

  const traverse = (categories: CategoryNode[], parentId?: string) => {
    for (const category of categories) {
      result.push({ ...category, parent_id: parentId })
      if (category.children && category.children.length > 0) {
        traverse(category.children, category.id)
      }
    }
  }

  traverse(tree, parent)
  return result
}

/**
 * Build breadcrumb string
 */
export function buildBreadcrumb(
  categories: Array<{ name: string }>,
  separator: string = " > "
): string {
  return categories.map((c) => c.name).join(separator)
}

/**
 * Generate category URL slug
 */
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .slice(0, 50) // Limit length
}

/**
 * Get category depth (0 = root, 1 = child, etc.)
 */
export function getCategoryDepth(category: CategoryNode): number {
  return category.level || 0
}

/**
 * Check if category is leaf (has no children)
 */
export function isLeafCategory(category: CategoryNode): boolean {
  return !category.children || category.children.length === 0
}

/**
 * Check if category is root (no parent)
 */
export function isRootCategory(category: { level: number }): boolean {
  return category.level === 0
}

/**
 * Get all sibling categories
 */
export function getSiblings(
  tree: CategoryNode[],
  categoryId: string,
  parentId?: string
): CategoryNode[] {
  if (!parentId) {
    // Root level siblings
    return tree.filter((c) => c.id !== categoryId)
  }

  const parent = findCategoryInTree(tree, parentId)
  if (parent && parent.children) {
    return parent.children.filter((c) => c.id !== categoryId)
  }

  return []
}

/**
 * Get parent category
 */
export function getParentCategory(
  tree: CategoryNode[],
  categoryId: string
): CategoryNode | null {
  const traverse = (categories: CategoryNode[]): CategoryNode | null => {
    for (const category of categories) {
      if (category.children) {
        if (category.children.some((c) => c.id === categoryId)) {
          return category
        }
        const found = traverse(category.children)
        if (found) return found
      }
    }
    return null
  }

  return traverse(tree)
}

/**
 * Filter categories by level
 */
export function filterByLevel(
  categories: CategoryNode[],
  level: number
): CategoryNode[] {
  const flattened = flattenCategoryTree(categories)
  return flattened.filter((c) => c.level === level) as CategoryNode[]
}

/**
 * Filter categories by name
 */
export function filterByName(
  categories: CategoryNode[],
  searchTerm: string
): CategoryNode[] {
  const flattened = flattenCategoryTree(categories)
  const term = searchTerm.toLowerCase()
  return flattened.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.handle.toLowerCase().includes(term)
  ) as CategoryNode[]
}

/**
 * Count total categories in tree
 */
export function countCategoriesInTree(tree: CategoryNode[]): number {
  let count = 0
  const traverse = (categories: CategoryNode[]) => {
    count += categories.length
    for (const category of categories) {
      if (category.children) {
        traverse(category.children)
      }
    }
  }
  traverse(tree)
  return count
}

/**
 * Count children at specific level
 */
export function countChildrenAtLevel(
  category: CategoryNode,
  targetLevel: number
): number {
  if (!category.children || category.children.length === 0) {
    return 0
  }

  let count = 0
  const traverse = (categories: CategoryNode[]) => {
    for (const cat of categories) {
      if (cat.level === targetLevel) {
        count += 1
      }
      if (cat.children) {
        traverse(cat.children)
      }
    }
  }

  traverse(category.children)
  return count
}

/**
 * Validate category hierarchy
 */
export function validateHierarchy(tree: CategoryNode[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  const traverse = (categories: CategoryNode[], expectedLevel: number) => {
    for (const category of categories) {
      if (category.level !== expectedLevel) {
        errors.push(
          `Category "${category.name}" has level ${category.level}, expected ${expectedLevel}`
        )
      }

      if (expectedLevel > 6) {
        errors.push(
          `Category "${category.name}" exceeds maximum depth of 6 levels`
        )
      }

      if (category.children && category.children.length > 0) {
        traverse(category.children, expectedLevel + 1)
      }
    }
  }

  traverse(tree, 0)

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get path to category
 */
export function getPathToCategory(
  tree: CategoryNode[],
  categoryId: string
): CategoryNode[] {
  const path: CategoryNode[] = []

  const traverse = (categories: CategoryNode[]): boolean => {
    for (const category of categories) {
      if (category.id === categoryId) {
        path.push(category)
        return true
      }

      if (category.children && category.children.length > 0) {
        if (traverse(category.children)) {
          path.unshift(category)
          return true
        }
      }
    }

    return false
  }

  traverse(tree)
  return path
}

/**
 * Export category tree as JSON
 */
export function exportCategoryTree(tree: CategoryNode[]): string {
  return JSON.stringify(tree, null, 2)
}

/**
 * Import category tree from JSON
 */
export function importCategoryTree(json: string): CategoryNode[] {
  try {
    return JSON.parse(json)
  } catch (error) {
    throw new Error("Invalid JSON format for category import")
  }
}

/**
 * Generate category breadcrumb from path
 */
export function generateBreadcrumbFromPath(path: CategoryNode[]): string {
  return path.map((c) => c.name).join(" > ")
}

/**
 * Format category for display
 */
export function formatCategoryForDisplay(category: CategoryNode): string {
  const indent = "  ".repeat(category.level)
  const childrenCount = category.children ? category.children.length : 0
  return `${indent}📁 ${category.name} (${childrenCount} children)`
}

/**
 * Print category tree as text (for debugging)
 */
export function printCategoryTree(tree: CategoryNode[]): string {
  const lines: string[] = []

  const traverse = (categories: CategoryNode[]) => {
    for (const category of categories) {
      lines.push(formatCategoryForDisplay(category))
      if (category.children && category.children.length > 0) {
        traverse(category.children)
      }
    }
  }

  traverse(tree)
  return lines.join("\n")
}

/**
 * Get category statistics
 */
export function getCategoryTreeStats(tree: CategoryNode[]): {
  total_categories: number
  max_depth: number
  leaf_categories: number
  root_categories: number
} {
  let maxDepth = 0
  let leafCount = 0
  let rootCount = 0

  const traverse = (categories: CategoryNode[], depth: number) => {
    maxDepth = Math.max(maxDepth, depth)

    for (const category of categories) {
      if (depth === 0) rootCount += 1
      if (!category.children || category.children.length === 0) leafCount += 1

      if (category.children && category.children.length > 0) {
        traverse(category.children, depth + 1)
      }
    }
  }

  traverse(tree, 0)

  return {
    total_categories: countCategoriesInTree(tree),
    max_depth: maxDepth,
    leaf_categories: leafCount,
    root_categories: rootCount,
  }
}

/**
 * Merge category trees
 */
export function mergeCategories(
  tree1: CategoryNode[],
  tree2: CategoryNode[]
): CategoryNode[] {
  // Create a map of categories from tree1 by ID
  const map = new Map<string, CategoryNode>()

  const collectToMap = (categories: CategoryNode[]) => {
    for (const category of categories) {
      map.set(category.id, { ...category })
      if (category.children) {
        collectToMap(category.children)
      }
    }
  }

  collectToMap(tree1)
  collectToMap(tree2)

  // Rebuild tree from map
  const result: CategoryNode[] = []
  for (const [_, category] of map) {
    if (category.level === 0) {
      result.push(category)
    }
  }

  return result
}

/**
 * Duplicate category hierarchy
 */
export function duplicateCategory(
  category: CategoryNode,
  newIdGenerator: () => string
): CategoryNode {
  const newCategory: CategoryNode = {
    ...category,
    id: newIdGenerator(),
  }

  if (category.children && category.children.length > 0) {
    newCategory.children = category.children.map((child) =>
      duplicateCategory(child, newIdGenerator)
    )
  }

  return newCategory
}
