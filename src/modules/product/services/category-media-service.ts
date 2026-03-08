import { MedusaService } from "@medusajs/framework/utils"
import { CategoryMedia } from "../models/category-media"

export class CategoryMediaService extends MedusaService(CategoryMedia) {
  /**
   * Upload media for category
   */
  async uploadMedia(data: {
    category_id: string
    media_type: "image" | "icon" | "banner" | "thumbnail"
    url: string
    alt_text?: string
    mime_type?: string
    file_size?: number
    width?: number
    height?: number
    is_primary?: boolean
  }): Promise<CategoryMedia> {
    // If this is primary and is_primary is true, unset others
    if (data.is_primary) {
      await this.update(data.category_id, { is_primary: false })
    }

    return this.create({
      ...data,
      is_primary: data.is_primary || false,
      sort_order: 0,
    })
  }

  /**
   * Get media by category
   */
  async getMediaByCategory(categoryId: string): Promise<CategoryMedia[]> {
    return this.list({
      filters: { category_id: categoryId },
      order: { sort_order: "ASC", created_at: "DESC" },
    })
  }

  /**
   * Get primary image for category
   */
  async getPrimaryImage(categoryId: string): Promise<CategoryMedia | null> {
    const media = await this.list({
      filters: { category_id: categoryId, media_type: "image", is_primary: true },
    })

    return media.length > 0 ? media[0] : null
  }

  /**
   * Get icon for category
   */
  async getIcon(categoryId: string): Promise<CategoryMedia | null> {
    const icons = await this.list({
      filters: { category_id: categoryId, media_type: "icon", is_primary: true },
    })

    return icons.length > 0 ? icons[0] : null
  }

  /**
   * Get banner for category
   */
  async getBanner(categoryId: string): Promise<CategoryMedia | null> {
    const banners = await this.list({
      filters: { category_id: categoryId, media_type: "banner" },
    })

    return banners.length > 0 ? banners[0] : null
  }

  /**
   * Set primary media
   */
  async setPrimaryMedia(mediaId: string, categoryId: string): Promise<void> {
    // Unset all other primary media for this category
    const allMedia = await this.list({
      filters: { category_id: categoryId, is_primary: true },
    })

    for (const media of allMedia) {
      await this.update(media.id, { is_primary: false })
    }

    // Set this as primary
    await this.update(mediaId, { is_primary: true })
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await this.delete(mediaId)
  }

  /**
   * Reorder media
   */
  async reorderMedia(
    mediaUpdates: Array<{ id: string; sort_order: number }>
  ): Promise<void> {
    for (const { id, sort_order } of mediaUpdates) {
      await this.update(id, { sort_order })
    }
  }

  /**
   * Get responsive image variants (for different sizes)
   */
  async getResponsiveImages(categoryId: string): Promise<{
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
    original?: string
  }> {
    const image = await this.getPrimaryImage(categoryId)

    if (!image) {
      return {}
    }

    // This would integrate with your image processing service
    // For now, returning the base URL
    return {
      original: image.url,
      thumbnail: `${image.url}?size=thumbnail`,
      small: `${image.url}?size=small`,
      medium: `${image.url}?size=medium`,
      large: `${image.url}?size=large`,
    }
  }

  /**
   * Validate image
   */
  validateImage(
    mimeType?: string,
    fileSize?: number,
    maxSizeInMB: number = 5
  ): { valid: boolean; error?: string } {
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ]

    if (mimeType && !validMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type. Accepted: ${validMimeTypes.join(", ")}`,
      }
    }

    if (fileSize) {
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024
      if (fileSize > maxSizeInBytes) {
        return {
          valid: false,
          error: `File size exceeds ${maxSizeInMB}MB limit`,
        }
      }
    }

    return { valid: true }
  }
}
