import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm"

export class CreateCategorySEOTable1678000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("category_seo")

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: "category_seo",
          columns: [
            { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
            { name: "category_id", type: "uuid", isNullable: false },
            { name: "meta_title", type: "text", isNullable: true },
            { name: "meta_description", type: "text", isNullable: true },
            { name: "meta_keywords", type: "text", isNullable: true },
            { name: "og_title", type: "text", isNullable: true },
            { name: "og_description", type: "text", isNullable: true },
            { name: "og_image", type: "text", isNullable: true },
            { name: "canonical_url", type: "text", isNullable: true },
            { name: "robots", type: "text", isNullable: true },
            { name: "schema_markup", type: "text", isNullable: true },
            { name: "is_published", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
            { name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: "FK_category_seo_category",
              columnNames: ["category_id"],
              referencedTableName: "product_category",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            }),
          ],
          indices: [
            new TableIndex({
              name: "IDX_category_seo_category_id",
              columnNames: ["category_id"],
              isUnique: true,
            }),
          ],
        })
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("category_seo", true)
  }
}
