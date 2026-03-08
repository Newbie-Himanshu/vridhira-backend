import { MedusaService } from "@medusajs/framework/utils"
import { Product } from "../models/product"

export class ProductService extends MedusaService(Product) {
  /**
   * Get all products
   */
  async getAllProducts(): Promise<Product[]> {
    return this.list({
      filters: { is_active: true },
      order: { created_at: "DESC" },
    })
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.list({
      filters: { category_id: categoryId, is_active: true },
      order: { created_at: "DESC" },
    })
  }

  /**
   * Get products by category with pagination
   */
  async getProductsByCategoryPaginated(
    categoryId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit

    const products = await this.list({
      filters: { category_id: categoryId, is_active: true },
      order: { created_at: "DESC" },
      skip,
      take: limit,
    })

    const total = await this.count({ category_id: categoryId, is_active: true })

    return { products, total }
  }

  /**
   * Get featured products (limited number)
   */
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return this.list({
      filters: { is_active: true },
      order: { created_at: "DESC" },
      take: limit,
    })
  }

  /**
   * Get featured products by category
   */
  async getFeaturedProductsByCategory(
    categoryId: string,
    limit: number = 6
  ): Promise<Product[]> {
    return this.list({
      filters: { category_id: categoryId, is_active: true },
      order: { created_at: "DESC" },
      take: limit,
    })
  }

  /**
   * Search products
   */
  async searchProducts(query: string): Promise<Product[]> {
    const qb = this.query().where((qb) =>
      qb
        .where(`name ILIKE :query`, { query: `%${query}%` })
        .orWhere(`description ILIKE :query`, { query: `%${query}%` })
        .orWhere(`handle ILIKE :query`, { query: `%${query}%` })
    )

    return qb.load()
  }

  /**
   * Get product with category info
   */
  async getProductWithCategory(productId: string): Promise<any> {
    const product = await this.retrieve(productId)

    if (product.category_id) {
      // You can load category here when category service is available
    }

    return product
  }

  /**
   * Create product with category
   */
  async createProduct(data: {
    name: string
    handle: string
    description?: string
    price?: number
    sku?: string
    category_id?: string
    stock_quantity?: number
    image_url?: string
  }): Promise<Product> {
    return this.create({
      name: data.name,
      handle: data.handle,
      description: data.description,
      price: data.price,
      sku: data.sku,
      category_id: data.category_id,
      stock_quantity: data.stock_quantity || 0,
      image_url: data.image_url,
      is_active: true,
    })
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    data: Partial<Product>
  ): Promise<Product> {
    await this.update(productId, data)
    return this.retrieve(productId)
  }

  /**
   * Soft delete product (set is_active to false)
   */
  async softDeleteProduct(productId: string): Promise<void> {
    await this.update(productId, { is_active: false })
  }

  /**
   * Get products with in-stock filter
   */
  async getProductsInStock(): Promise<Product[]> {
    return this.list({
      filters: { is_active: true },
      order: { created_at: "DESC" },
    })
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold: number = 5): Promise<Product[]> {
    const qb = this.query()
      .where(`stock_quantity <= :threshold`, { threshold })
      .andWhere(`is_active = :active`, { active: true })

    return qb.load()
  }

  /**
   * Filter products by multiple criteria
   */
  async filterProducts(filters: {
    categoryId?: string
    minPrice?: number
    maxPrice?: number
    search?: string
    inStock?: boolean
    page?: number
    limit?: number
  }): Promise<{ products: Product[]; total: number }> {
    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const queryFilters: any = { is_active: true }

    if (filters.categoryId) {
      queryFilters.category_id = filters.categoryId
    }

    const products = await this.list({
      filters: queryFilters,
      order: { created_at: "DESC" },
      skip,
      take: limit,
    })

    // Additional filtering for price range
    let filtered = products
    if (filters.minPrice) {
      filtered = filtered.filter((p) => p.price >= filters.minPrice)
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((p) => p.price <= filters.maxPrice)
    }

    const total = await this.count({ is_active: true })

    return { products: filtered, total }
  }
}
