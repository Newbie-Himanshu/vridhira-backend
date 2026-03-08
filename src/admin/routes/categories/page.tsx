import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
  FocusModal,
  TextArea,
  Badge,
  IconButton,
  Tooltip,
  Tabs,
  Badge as StatusBadge,
  DropdownMenu,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  Plus,
  Search,
  Copy,
  Eye,
} from "lucide-react"

interface Category {
  id: string
  name: string
  handle: string
  description?: string
  level: number
  parent_category_id?: string
  sort_order: number
  children?: Category[]
  breadcrumb?: Array<{ id: string; name: string; level: number }>
  breadcrumb_string?: string
  direct_children_count?: number
  all_descendants_count?: number
}

interface CategoryTree {
  id: string
  name: string
  handle: string
  level: number
  children?: CategoryTree[]
}

const CategoryManagementPage = () => {
  const qc = useQueryClient()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [parentCategoryForCreate, setParentCategoryForCreate] = useState<
    Category | null
  >(null)
  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    description: "",
    parent_category_id: "",
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Fetch full category tree
  const { data: treeData, isLoading: isTreeLoading } = useQuery<{
    categories: CategoryTree[]
  }>({
    queryKey: ["category-tree"],
    queryFn: () => sdk.client.fetch("/admin/categories?tree=true"),
  })

  // Fetch searched categories
  const { data: searchData } = useQuery<{ categories: Category[] }>(
    {
      queryKey: ["categories-search", searchQuery],
      queryFn: () =>
        sdk.client.fetch(`/admin/categories?search=${encodeURIComponent(searchQuery)}`),
    },
    { enabled: !!searchQuery }
  )

  // Create category mutation
  const { mutate: createCategory, isPending: isCreating } = useMutation({
    mutationFn: (data: Partial<Category>) =>
      sdk.client.fetch("/admin/categories", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-tree"] })
      toast.success("Category created successfully")
      resetForm()
      setShowModal(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create category")
    },
  })

  // Update category mutation
  const { mutate: updateCategory, isPending: isUpdating } = useMutation({
    mutationFn: (data: { id: string; updates: Partial<Category> }) =>
      sdk.client.fetch(`/admin/categories/${data.id}`, {
        method: "PUT",
        body: data.updates,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-tree"] })
      toast.success("Category updated successfully")
      resetForm()
      setShowModal(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update category")
    },
  })

  // Delete category mutation
  const { mutate: deleteCategory, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-tree"] })
      toast.success("Category deleted successfully")
      setShowDeleteConfirm(false)
      setDeleteTargetId(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete category")
    },
  })

  const resetForm = () => {
    setFormData({ name: "", handle: "", description: "", parent_category_id: "" })
    setSelectedCategory(null)
    setParentCategoryForCreate(null)
  }

  const handleCreateNew = () => {
    modalMode === "create" && resetForm()
    setModalMode("create")
    setShowModal(true)
  }

  const handleCreateChild = (parent: Category) => {
    setModalMode("create")
    setParentCategoryForCreate(parent)
    setFormData({
      name: "",
      handle: "",
      description: "",
      parent_category_id: parent.id,
    })
    setShowModal(true)
  }

  const handleEdit = (category: Category) => {
    setModalMode("edit")
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      handle: category.handle,
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
    })
    setShowModal(true)
  }

  const handleDeleteClick = (categoryId: string) => {
    setDeleteTargetId(categoryId)
    setShowDeleteConfirm(true)
  }

  const handleSubmitForm = () => {
    if (!formData.name || !formData.handle) {
      toast.error("Name and handle are required")
      return
    }

    if (modalMode === "create") {
      createCategory({
        name: formData.name,
        handle: formData.handle,
        description: formData.description,
        parent_category_id: formData.parent_category_id || undefined,
      })
    } else if (selectedCategory) {
      updateCategory({
        id: selectedCategory.id,
        updates: {
          name: formData.name,
          handle: formData.handle,
          description: formData.description,
          parent_category_id: formData.parent_category_id || undefined,
        },
      })
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const renderCategoryTree = (
    categories: CategoryTree[],
    level: number = 0
  ): JSX.Element => {
    if (!categories || categories.length === 0) {
      return <p className="text-ui-fg-subtle text-sm py-2">No categories</p>
    }

    return (
      <div className="space-y-1">
        {categories.map((category) => (
          <div key={category.id} className={`ml-${level * 4}`}>
            <div className="flex items-center gap-1 py-2 px-2 hover:bg-ui-bg-base-pressed rounded group">
              {category.children && category.children.length > 0 ? (
                <button
                  onClick={() => toggleExpanded(category.id)}
                  className="text-ui-fg-muted hover:text-ui-fg-base transition"
                >
                  {expandedIds.has(category.id) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}

              <div className="flex-1 min-w-0">
                <Text weight="medium" size="small">
                  {category.name}
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {category.handle}
                </Text>
              </div>

              <Badge variant="neutral" size="small">
                Level {category.level}
              </Badge>

              <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                <Tooltip content="View details">
                  <IconButton
                    variant="transparent"
                    size="small"
                    onClick={() => handleEdit(category as Category)}
                  >
                    <Eye size={14} />
                  </IconButton>
                </Tooltip>

                <Tooltip content="Add subcategory">
                  <IconButton
                    variant="transparent"
                    size="small"
                    disabled={category.level >= 6}
                    onClick={() => handleCreateChild(category as Category)}
                  >
                    <Plus size={14} />
                  </IconButton>
                </Tooltip>

                <Tooltip content="Edit">
                  <IconButton
                    variant="transparent"
                    size="small"
                    onClick={() => handleEdit(category as Category)}
                  >
                    <Edit2 size={14} />
                  </IconButton>
                </Tooltip>

                <Tooltip content="Delete">
                  <IconButton
                    variant="transparent"
                    size="small"
                    onClick={() => handleDeleteClick(category.id)}
                  >
                    <Trash2 size={14} className="text-ui-fg-error" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            {expandedIds.has(category.id) &&
              category.children &&
              category.children.length > 0 && (
                <div className="ml-2">
                  {renderCategoryTree(category.children, level + 1)}
                </div>
              )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Category Management</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your product categories (up to 6 levels deep)
          </Text>
        </div>
        <Button onClick={handleCreateNew} variant="primary">
          <Plus size={16} /> Add Root Category
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search categories by name or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
      </div>

      {/* Category Tree */}
      <div className="bg-ui-bg-base rounded border border-ui-border-base p-4">
        {isTreeLoading ? (
          <Text className="text-ui-fg-subtle">Loading categories...</Text>
        ) : searchQuery && searchData?.categories ? (
          <div className="space-y-2">
            <Text size="small" weight="medium" className="text-ui-fg-subtle">
              Search results ({searchData.categories.length})
            </Text>
            {searchData.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 p-2 hover:bg-ui-bg-base-pressed rounded group"
              >
                <div>
                  <Text size="small" weight="medium">
                    {cat.name}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {cat.breadcrumb_string}
                  </Text>
                </div>
                <div className="flex gap-1">
                  <IconButton
                    variant="transparent"
                    size="small"
                    onClick={() => handleEdit(cat)}
                  >
                    <Edit2 size={14} />
                  </IconButton>
                  <IconButton
                    variant="transparent"
                    size="small"
                    onClick={() => handleDeleteClick(cat.id)}
                  >
                    <Trash2 size={14} className="text-ui-fg-error" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        ) : treeData?.categories && treeData.categories.length > 0 ? (
          renderCategoryTree(treeData.categories)
        ) : (
          <Text className="text-ui-fg-subtle text-center py-8">
            No categories yet. Create one to get started!
          </Text>
        )}
      </div>

      {/* Create/Edit Modal */}
      <FocusModal open={showModal} onOpenChange={setShowModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>
              {modalMode === "create"
                ? parentCategoryForCreate
                  ? `Add Subcategory to "${parentCategoryForCreate.name}"`
                  : "Add Root Category"
                : `Edit "${selectedCategory?.name}"`}
            </FocusModal.Title>
          </FocusModal.Header>

          <FocusModal.Body className="space-y-4">
            <div>
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g., Electronics"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Handle (URL slug) *</Label>
              <Input
                placeholder="e.g., electronics"
                value={formData.handle}
                onChange={(e) =>
                  setFormData({ ...formData, handle: e.target.value })
                }
              />
              <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                Used in URLs, keep lowercase with hyphens
              </Text>
            </div>

            <div>
              <Label>Description</Label>
              <TextArea
                placeholder="Add a description for this category..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {modalMode === "edit" && selectedCategory?.level && (
              <div>
                <Badge variant="neutral">
                  Level {selectedCategory.level} of 6
                </Badge>
                {selectedCategory.breadcrumb_string && (
                  <Text size="xsmall" className="text-ui-fg-subtle mt-2">
                    Path: {selectedCategory.breadcrumb_string}
                  </Text>
                )}
              </div>
            )}
          </FocusModal.Body>

          <FocusModal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              isLoading={isCreating || isUpdating}
            >
              {modalMode === "create" ? "Create Category" : "Update Category"}
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

      {/* Delete Confirmation Modal */}
      <FocusModal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Delete Category</FocusModal.Title>
          </FocusModal.Header>

          <FocusModal.Body>
            <div className="space-y-2">
              <Text>
                Are you sure you want to delete this category? This action
                cannot be undone.
              </Text>
              <div className="bg-ui-bg-danger-light p-4 rounded border border-ui-border-danger">
                <Text weight="medium" size="small">
                  ⚠️ Warning
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  All subcategories and their descendants will also be deleted
                  (cascade delete).
                </Text>
              </div>
            </div>
          </FocusModal.Body>

          <FocusModal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteTargetId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteTargetId && deleteCategory(deleteTargetId)}
              isLoading={isDeleting}
            >
              Delete Category
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Categories",
  icon: "folder-open",
})

export default CategoryManagementPage
