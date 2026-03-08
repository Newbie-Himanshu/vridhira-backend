import { MedusaService } from "@medusajs/framework/utils"
import { CategorySEO } from "../models/category-seo"

export class CategorySEOService extends MedusaService(CategorySEO) {
  /**
   * Get or create SEO data for a category
   */
  async getOrCreateSEO(categoryId: string): Promise<CategorySEO> {
    try {
      return await this.retrieve(categoryId)
    } catch (error) {
      // Create default SEO
      return this.create({
        category_id: categoryId,
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        og_title: "",
        og_description: "",
        og_image: "",
        robots: "index, follow",
        is_published: true,
      })
    }
  }

  /**
   * Update SEO data for a category
   */
  async updateSEO(
    categoryId: string,
    data: Partial<CategorySEO>
  ): Promise<CategorySEO> {
    try {
      return await this.update(categoryId, data)
    } catch (error) {
      // If doesn't exist, create it
      return this.create({
        ...data,
        category_id: categoryId,
      })
    }
  }

  /**
   * Generate default SEO data from category
   */
  async generateDefaultSEO(
    categoryId: string,
    categoryName: string,
    categoryDescription?: string
  ): Promise<CategorySEO> {
    const seoData = {
      meta_title: `${categoryName} | Your Store`,
      meta_description: categoryDescription
        ? categoryDescription.substring(0, 160)
        : `Browse our ${categoryName} collection`,
      og_title: categoryName,
      og_description: categoryDescription || `Shop ${categoryName}`,
      robots: "index, follow",
      is_published: true,
    }

    return this.updateSEO(categoryId, seoData)
  }

  /**
   * Generate JSON-LD schema for category
   */
  generateCategorySchema(category: any): string {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Category",
      name: category.name,
      description: category.description,
      url: `${process.env.STORE_URL}/categories/${category.handle}`,
      ...(category.image && {
        image: category.image,
      }),
    }

    return JSON.stringify(schema)
  }

  /**
   * Get SEO data for multiple categories
   */
  async getSEOMultiple(categoryIds: string[]): Promise<CategorySEO[]> {
    return this.list({
      filters: {
        category_id: categoryIds,
      },
    })
  }

  /**
   * Validate meta content length
   */
  validateMetaContent(
    title: string,
    description: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (title.length < 30 || title.length > 60) {
      errors.push("Meta title should be between 30-60 characters")
    }

    if (description.length < 120 || description.length > 160) {
      errors.push("Meta description should be between 120-160 characters")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get SEO health score for category
   */
  async getSEOHealthScore(categoryId: string): Promise<{
    score: number
    issues: string[]
  }> {
    const seo = await this.getOrCreateSEO(categoryId)
    let score = 0
    const issues: string[] = []

    // Check meta title
    if (seo.meta_title && seo.meta_title.length >= 30 && seo.meta_title.length <= 60) {
      score += 20
    } else {
      issues.push("Meta title needs optimization (30-60 characters)")
    }

    // Check meta description
    if (
      seo.meta_description &&
      seo.meta_description.length >= 120 &&
      seo.meta_description.length <= 160
    ) {
      score += 20
    } else {
      issues.push("Meta description needs optimization (120-160 characters)")
    }

    // Check OG data
    if (seo.og_title) score += 10
    else issues.push("Missing OG title")

    if (seo.og_description) score += 10
    else issues.push("Missing OG description")

    if (seo.og_image) score += 10
    else issues.push("Missing OG image")

    // Check schema
    if (seo.schema_markup) score += 20
    else issues.push("Missing structured data (schema markup)")

    // Check canonical
    if (seo.canonical_url) score += 10
    else issues.push("Missing canonical URL")

    return { score, issues }
  }
}
