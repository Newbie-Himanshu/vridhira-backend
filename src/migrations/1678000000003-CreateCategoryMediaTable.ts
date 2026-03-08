import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm"

export class CreateCategoryMediaTable1678000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("category_media")

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: "category_media",
          columns: [
            { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
            { name: "category_id", type: "uuid", isNullable: false },
            { name: "media_type", type: "varchar", isNullable: false },
            { name: "url", type: "text", isNullable: false },
            { name: "alt_text", type: "text", isNullable: true },
            { name: "mime_type", type: "varchar", isNullable: true },
            { name: "file_size", type: "int", isNullable: true },
            { name: "width", type: "int", isNullable: true },
            { name: "height", type: "int", isNullable: true },
            { name: "is_primary", type: "boolean", default: false },
            { name: "sort_order", type: "int", default: 0 },
            { name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
            { name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP" },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: "FK_category_media_category",
              columnNames: ["category_id"],
              referencedTableName: "product_category",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            }),
          ],
          indices: [
            new TableIndex({
              name: "IDX_category_media_category_id",
              columnNames: ["category_id"],
            }),
            new TableIndex({
              name: "IDX_category_media_type",
              columnNames: ["media_type"],
            }),
            new TableIndex({
              name: "IDX_category_media_primary",
              columnNames: ["is_primary"],
            }),
          ],
        })
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("category_media", true)
  }
}
