import { DataSource } from "typeorm"

/**
 * Category Analytics Service
 * Tracks and provides metrics for category performance
 */
export class CategoryAnalyticsService {
  private dataSource: DataSource

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource
  }

  /**
   * Get total products in category (including descendants)
   */
  async getTotalProductsInCategory(categoryId: string): Promise<number> {
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE category_tree AS (
        SELECT id FROM product_category WHERE id = $1
        UNION ALL
        SELECT pc.id FROM product_category pc
        INNER JOIN category_tree ct ON pc.parent_category_id = ct.id
      )
      SELECT COUNT(*) as count FROM product
      WHERE category_id IN (SELECT id FROM category_tree)
      AND is_active = true
      `,
      [categoryId]
    )

    return parseInt(result[0]?.count || 0)
  }

  /**
   * Get direct products in category (not including descendants)
   */
  async getDirectProductsInCategory(categoryId: string): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*) as count FROM product
      WHERE category_id = $1 AND is_active = true
      `,
      [categoryId]
    )

    return parseInt(result[0]?.count || 0)
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(categoryId: string): Promise<{
    total_products: number
    direct_products: number
    direct_children: number
    all_descendants: number
    in_stock_count: number
    out_of_stock_count: number
    total_value: number
  }> {
    const stats = await this.dataSource.query(
      `
      WITH RECURSIVE category_tree AS (
        SELECT id, level FROM product_category WHERE id = $1
        UNION ALL
        SELECT pc.id, pc.level FROM product_category pc
        INNER JOIN category_tree ct ON pc.parent_category_id = ct.id
      ),
      category_products AS (
        SELECT p.* FROM product p
        INNER JOIN category_tree ct ON p.category_id = ct.id
        WHERE p.is_active = true
      )
      SELECT
        COUNT(DISTINCT cp.id) as total_products,
        SUM(CASE WHEN cp.stock_quantity > 0 THEN 1 ELSE 0 END) as in_stock_count,
        SUM(CASE WHEN cp.stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        COALESCE(SUM(cp.price * cp.stock_quantity), 0) as total_value
      FROM category_products cp
      `,
      [categoryId]
    )

    const directProducts = await this.getDirectProductsInCategory(categoryId)
    const categoryInfo = await this.dataSource.query(
      `
      SELECT
        (SELECT COUNT(*) FROM product_category WHERE parent_category_id = $1) as direct_children,
        (
          WITH RECURSIVE tree AS (
            SELECT id FROM product_category WHERE parent_category_id = $1
            UNION ALL
            SELECT pc.id FROM product_category pc
            INNER JOIN tree t ON pc.parent_category_id = t.id
          )
          SELECT COUNT(*) FROM tree
        ) as all_descendants
      `,
      [categoryId]
    )

    return {
      total_products: parseInt(stats[0]?.total_products || 0),
      direct_products: directProducts,
      direct_children: parseInt(categoryInfo[0]?.direct_children || 0),
      all_descendants: parseInt(categoryInfo[0]?.all_descendants || 0),
      in_stock_count: parseInt(stats[0]?.in_stock_count || 0),
      out_of_stock_count: parseInt(stats[0]?.out_of_stock_count || 0),
      total_value: parseFloat(stats[0]?.total_value || 0),
    }
  }

  /**
   * Get all categories with their product counts
   */
  async getCategoriesWithStats(): Promise<
    Array<{
      id: string
      name: string
      handle: string
      level: number
      product_count: number
      in_stock_count: number
    }>
  > {
    return this.dataSource.query(
      `
      SELECT
        pc.id,
        pc.name,
        pc.handle,
        pc.level,
        COUNT(p.id) as product_count,
        SUM(CASE WHEN p.stock_quantity > 0 THEN 1 ELSE 0 END) as in_stock_count
      FROM product_category pc
      LEFT JOIN product p ON pc.id = p.category_id AND p.is_active = true
      GROUP BY pc.id, pc.name, pc.handle, pc.level
      ORDER BY pc.level, pc.sort_order, pc.name
      `
    )
  }

  /**
   * Get top categories by product count
   */
  async getTopCategoriesByProductCount(
    limit: number = 10
  ): Promise<
    Array<{
      id: string
      name: string
      product_count: number
    }>
  > {
    return this.dataSource.query(
      `
      SELECT
        pc.id,
        pc.name,
        COUNT(p.id) as product_count
      FROM product_category pc
      LEFT JOIN product p ON pc.id = p.category_id AND p.is_active = true
      GROUP BY pc.id, pc.name
      ORDER BY product_count DESC
      LIMIT $1
      `,
      [limit]
    )
  }

  /**
   * Get empty categories (with no products)
   */
  async getEmptyCategories(): Promise<
    Array<{
      id: string
      name: string
      handle: string
      level: number
      parent_category_id: string | null
    }>
  > {
    return this.dataSource.query(
      `
      SELECT pc.id, pc.name, pc.handle, pc.level, pc.parent_category_id
      FROM product_category pc
      WHERE NOT EXISTS (
        SELECT 1 FROM product p
        WHERE p.category_id = pc.id AND p.is_active = true
      )
      ORDER BY pc.level, pc.name
      `
    )
  }

  /**
   * Get category hierarchy with product counts
   */
  async getCategoryHierarchyWithCounts(
    categoryId?: string
  ): Promise<
    Array<{
      id: string
      name: string
      handle: string
      level: number
      product_count: number
      children_count: number
    }>
  > {
    const whereClause = categoryId
      ? `WHERE pc.id = $1 OR pc.parent_category_id = $1`
      : ""
    const params = categoryId ? [categoryId] : []

    return this.dataSource.query(
      `
      SELECT
        pc.id,
        pc.name,
        pc.handle,
        pc.level,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT child.id) as children_count
      FROM product_category pc
      LEFT JOIN product p ON pc.id = p.category_id AND p.is_active = true
      LEFT JOIN product_category child ON pc.id = child.parent_category_id
      ${whereClause}
      GROUP BY pc.id, pc.name, pc.handle, pc.level
      ORDER BY pc.level, pc.sort_order, pc.name
      `,
      params
    )
  }

  /**
   * Get categories needing attention (empty at leaf level)
   */
  async getCategoriesNeedingAttention(): Promise<
    Array<{
      id: string
      name: string
      level: number
      breadcrumb: string
    }>
  > {
    return this.dataSource.query(
      `
      WITH RECURSIVE category_tree AS (
        SELECT id, name, level, parent_category_id, ARRAY[name] as breadcrumb
        FROM product_category WHERE parent_category_id IS NULL

        UNION ALL

        SELECT pc.id, pc.name, pc.level, pc.parent_category_id, ct.breadcrumb || pc.name
        FROM product_category pc
        INNER JOIN category_tree ct ON pc.parent_category_id = ct.id
      )
      SELECT
        ct.id,
        ct.name,
        ct.level,
        array_to_string(ct.breadcrumb, ' > ') as breadcrumb
      FROM category_tree ct
      WHERE NOT EXISTS (
        SELECT 1 FROM product p
        WHERE p.category_id = ct.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM product_category child
        WHERE child.parent_category_id = ct.id
      )
      ORDER BY ct.level DESC, ct.name
      `
    )
  }

  /**
   * Get popular product price ranges by category
   */
  async getProductPriceRangeByCategory(categoryId: string): Promise<{
    min_price: number
    max_price: number
    avg_price: number
    median_price: number
  }> {
    const result = await this.dataSource.query(
      `
      SELECT
        MIN(price) as min_price,
        MAX(price) as max_price,
        ROUND(AVG(price)::numeric, 2) as avg_price,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
      FROM product
      WHERE category_id = $1 AND is_active = true AND price > 0
      `,
      [categoryId]
    )

    return {
      min_price: parseFloat(result[0]?.min_price || 0),
      max_price: parseFloat(result[0]?.max_price || 0),
      avg_price: parseFloat(result[0]?.avg_price || 0),
      median_price: parseFloat(result[0]?.median_price || 0),
    }
  }
}
