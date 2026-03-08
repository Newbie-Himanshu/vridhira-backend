import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateProductCategoryHierarchy1678000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable("product_category");

    if (!tableExists) {
      // Create new table with hierarchy support
      await queryRunner.createTable(
        new Table({
          name: "product_category",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              default: "uuid_generate_v4()",
            },
            {
              name: "name",
              type: "varchar",
              isNullable: false,
            },
            {
              name: "description",
              type: "text",
              isNullable: true,
            },
            {
              name: "handle",
              type: "varchar",
              isNullable: true,
              isUnique: true,
            },
            {
              name: "parent_category_id",
              type: "uuid",
              isNullable: true,
            },
            {
              name: "level",
              type: "smallint",
              default: 0,
            },
            {
              name: "sort_order",
              type: "int",
              isNullable: true,
              default: 0,
            },
            {
              name: "path",
              type: "text",
              isNullable: true,
            },
            {
              name: "created_at",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
            {
              name: "updated_at",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: "FK_product_category_parent",
              columnNames: ["parent_category_id"],
              referencedTableName: "product_category",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
              onUpdate: "CASCADE",
            }),
          ],
          indices: [
            new TableIndex({
              name: "IDX_product_category_parent_id",
              columnNames: ["parent_category_id"],
            }),
            new TableIndex({
              name: "IDX_product_category_handle",
              columnNames: ["handle"],
            }),
            new TableIndex({
              name: "IDX_product_category_level",
              columnNames: ["level"],
            }),
            new TableIndex({
              name: "IDX_product_category_path",
              columnNames: ["path"],
            }),
          ],
        })
      );
    } else {
      // Add columns if they don't exist (for existing tables)
      const table = await queryRunner.getTable("product_category");

      if (!table.findColumnByName("parent_category_id")) {
        await queryRunner.addColumn(
          "product_category",
          new TableColumn({
            name: "parent_category_id",
            type: "uuid",
            isNullable: true,
          })
        );

        await queryRunner.createForeignKey(
          "product_category",
          new TableForeignKey({
            name: "FK_product_category_parent",
            columnNames: ["parent_category_id"],
            referencedTableName: "product_category",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
          })
        );
      }

      if (!table.findColumnByName("level")) {
        await queryRunner.addColumn(
          "product_category",
          new TableColumn({
            name: "level",
            type: "smallint",
            default: 0,
          })
        );
      }

      if (!table.findColumnByName("sort_order")) {
        await queryRunner.addColumn(
          "product_category",
          new TableColumn({
            name: "sort_order",
            type: "int",
            isNullable: true,
            default: 0,
          })
        );
      }

      if (!table.findColumnByName("path")) {
        await queryRunner.addColumn(
          "product_category",
          new TableColumn({
            name: "path",
            type: "text",
            isNullable: true,
          })
        );
      }

      // Create indices
      const indices = table.indices.map((i) => i.name);
      if (!indices.includes("IDX_product_category_parent_id")) {
        await queryRunner.createIndex(
          "product_category",
          new TableIndex({
            name: "IDX_product_category_parent_id",
            columnNames: ["parent_category_id"],
          })
        );
      }

      if (!indices.includes("IDX_product_category_path")) {
        await queryRunner.createIndex(
          "product_category",
          new TableIndex({
            name: "IDX_product_category_path",
            columnNames: ["path"],
          })
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("product_category");

    if (table) {
      // Drop foreign key
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.name === "FK_product_category_parent"
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey("product_category", foreignKey);
      }

      // Drop columns
      if (table.findColumnByName("parent_category_id")) {
        await queryRunner.dropColumn("product_category", "parent_category_id");
      }
      if (table.findColumnByName("level")) {
        await queryRunner.dropColumn("product_category", "level");
      }
      if (table.findColumnByName("sort_order")) {
        await queryRunner.dropColumn("product_category", "sort_order");
      }
      if (table.findColumnByName("path")) {
        await queryRunner.dropColumn("product_category", "path");
      }
    }
  }
}
