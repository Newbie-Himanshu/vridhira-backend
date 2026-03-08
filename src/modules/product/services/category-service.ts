import { MedusaService } from "@medusajs/framework/utils";
import { ProductCategory } from "../models/category";
import { DataSource } from "typeorm";

interface CategoryTree {
  id: string;
  name: string;
  handle: string;
  level: number;
  children?: CategoryTree[];
}

interface CategoryBreadcrumb {
  id: string;
  name: string;
  handle: string;
  level: number;
}

export class CategoryService extends MedusaService(ProductCategory) {
  private dataSource: DataSource;

  constructor(container: any) {
    super(container);
    this.dataSource = container.resolve("database");
  }

  /**
   * Get all root categories (level 0)
   */
  async getRootCategories(): Promise<ProductCategory[]> {
    return this.list({
      filters: { parent_category_id: null },
      order: { sort_order: "ASC", name: "ASC" },
    });
  }

  /**
   * Get category with all its descendants (recursive)
   * Supports up to 6 levels deep
   */
  async getCategoryTree(
    categoryId: string,
    maxDepth: number = 6
  ): Promise<CategoryTree> {
    const category = await this.retrieve(categoryId);

    const tree: CategoryTree = {
      id: category.id,
      name: category.name,
      handle: category.handle,
      level: category.level,
    };

    if (category.level < maxDepth) {
      const children = await this.list({
        filters: { parent_category_id: categoryId },
        order: { sort_order: "ASC", name: "ASC" },
      });

      if (children.length > 0) {
        tree.children = await Promise.all(
          children.map((child) =>
            this.getCategoryTree(child.id, maxDepth).then((childTree) => ({
              ...childTree,
              children: childTree.children,
            }))
          )
        );
      }
    }

    return tree;
  }

  /**
   * Get full category tree from root with all descendants
   */
  async getFullCategoryTree(maxDepth: number = 6): Promise<CategoryTree[]> {
    const rootCategories = await this.getRootCategories();
    return Promise.all(
      rootCategories.map((cat) => this.getCategoryTree(cat.id, maxDepth))
    );
  }

  /**
   * Get all children at a specific level below a category
   */
  async getChildrenAtLevel(
    parentId: string,
    childLevel: number
  ): Promise<ProductCategory[]> {
    return this.list({
      filters: { parent_category_id: parentId, level: childLevel },
      order: { sort_order: "ASC", name: "ASC" },
    });
  }

  /**
   * Get direct children of a category
   */
  async getDirectChildren(parentId: string): Promise<ProductCategory[]> {
    return this.list({
      filters: { parent_category_id: parentId },
      order: { sort_order: "ASC", name: "ASC" },
    });
  }

  /**
   * Get all descendants of a category (flat list)
   */
  async getAllDescendants(categoryId: string): Promise<ProductCategory[]> {
    const category = await this.retrieve(categoryId);
    const descendants: ProductCategory[] = [];

    const traverse = async (parentId: string) => {
      const children = await this.getDirectChildren(parentId);
      descendants.push(...children);

      for (const child of children) {
        await traverse(child.id);
      }
    };

    await traverse(categoryId);
    return descendants;
  }

  /**
   * Get breadcrumb path for a category
   */
  async getCategoryBreadcrumb(categoryId: string): Promise<CategoryBreadcrumb[]> {
    const breadcrumb: CategoryBreadcrumb[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.retrieve(currentId);
      breadcrumb.unshift({
        id: category.id,
        name: category.name,
        handle: category.handle,
        level: category.level,
      });
      currentId = category.parent_category_id;
    }

    return breadcrumb;
  }

  /**
   * Get breadcrumb as string (e.g., "Electronics > Computers > Laptops")
   */
  async getCategoryBreadcrumbString(categoryId: string): Promise<string> {
    const breadcrumb = await this.getCategoryBreadcrumb(categoryId);
    return breadcrumb.map((b) => b.name).join(" > ");
  }

  /**
   * Create category with automatic level calculation
   */
  async createCategory(data: {
    name: string;
    handle: string;
    description?: string;
    parent_category_id?: string;
    sort_order?: number;
  }): Promise<ProductCategory> {
    let level = 0;
    let path = `/`;

    if (data.parent_category_id) {
      const parent = await this.retrieve(data.parent_category_id);
      level = parent.level + 1;
      path = `${parent.path}${parent.id}/`;

      // Prevent going deeper than 6 levels
      if (level > 6) {
        throw new Error(
          "Cannot create category deeper than 6 levels. Maximum depth reached."
        );
      }
    }

    return this.create({
      name: data.name,
      handle: data.handle,
      description: data.description,
      parent_category_id: data.parent_category_id || null,
      level,
      path,
      sort_order: data.sort_order || 0,
    });
  }

  /**
   * Update category and recalculate descendants if parent changes
   */
  async updateCategory(
    categoryId: string,
    data: Partial<ProductCategory>
  ): Promise<ProductCategory> {
    const category = await this.retrieve(categoryId);

    // If parent changes, recalculate level and path for all descendants
    if (
      data.parent_category_id &&
      data.parent_category_id !== category.parent_category_id
    ) {
      const newParent = await this.retrieve(data.parent_category_id);

      if (newParent.level >= 6) {
        throw new Error("Cannot move category: parent is at maximum depth");
      }

      // Update level and path
      const newLevel = newParent.level + 1;
      const newPath = `${newParent.path}${newParent.id}/`;

      await this.update(categoryId, {
        ...data,
        level: newLevel,
        path: newPath,
      });

      // Recalculate all descendants
      await this.recalculateDescendantLevelsAndPaths(categoryId);
    } else {
      await this.update(categoryId, data);
    }

    return this.retrieve(categoryId);
  }

  /**
   * Recalculate levels and paths for all descendants
   */
  private async recalculateDescendantLevelsAndPaths(
    categoryId: string
  ): Promise<void> {
    const children = await this.getDirectChildren(categoryId);

    for (const child of children) {
      const parent = await this.retrieve(categoryId);
      const newLevel = parent.level + 1;
      const newPath = `${parent.path}${parent.id}/`;

      await this.update(child.id, {
        level: newLevel,
        path: newPath,
      });

      // Recursively update descendants
      await this.recalculateDescendantLevelsAndPaths(child.id);
    }
  }

  /**
   * Delete category and cascade delete all descendants
   */
  async deleteCategory(categoryId: string): Promise<void> {
    // Get all descendants
    const descendants = await this.getAllDescendants(categoryId);

    // Delete all descendants (cascade will handle this, but let's be explicit)
    for (const descendant of descendants) {
      await this.delete(descendant.id);
    }

    // Delete the category itself
    await this.delete(categoryId);
  }

  /**
   * Get categories by level
   */
  async getCategoriesByLevel(level: number): Promise<ProductCategory[]> {
    return this.list({
      filters: { level },
      order: { sort_order: "ASC", name: "ASC" },
    });
  }

  /**
   * Search categories by name or handle
   */
  async searchCategories(query: string): Promise<ProductCategory[]> {
    const qb = this.query().where((qb) =>
      qb
        .where(`name ILIKE :query`, { query: `%${query}%` })
        .orWhere(`handle ILIKE :query`, { query: `%${query}%` })
    );

    return qb.load();
  }

  /**
   * Get category with full path info (for response serialization)
   */
  async getCategoryWithFullPath(categoryId: string): Promise<any> {
    const category = await this.retrieve(categoryId);
    const breadcrumb = await this.getCategoryBreadcrumb(categoryId);
    const directChildren = await this.getDirectChildren(categoryId);

    return {
      ...category,
      breadcrumb,
      breadcrumb_string: breadcrumb.map((b) => b.name).join(" > "),
      direct_children_count: directChildren.length,
      all_descendants_count: (await this.getAllDescendants(categoryId)).length,
    };
  }

  /**
   * Reorder categories (update sort_order)
   */
  async reorderCategories(
    categoryUpdates: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    for (const { id, sort_order } of categoryUpdates) {
      await this.update(id, { sort_order });
    }
  }
}
