import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm"

export class CreateProductTable1678000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("product")

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: "product",
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
              name: "price",
              type: "decimal",
              precision: 10,
              scale: 2,
              isNullable: true,
            },
            {
              name: "sku",
              type: "varchar",
              isNullable: true,
            },
            {
              name: "category_id",
              type: "uuid",
              isNullable: true,
            },
            {
              name: "is_active",
              type: "boolean",
              default: true,
            },
            {
              name: "stock_quantity",
              type: "int",
              default: 0,
            },
            {
              name: "image_url",
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
              name: "FK_product_category",
              columnNames: ["category_id"],
              referencedTableName: "product_category",
              referencedColumnNames: ["id"],
              onDelete: "SET NULL",
              onUpdate: "CASCADE",
            }),
          ],
          indices: [
            new TableIndex({
              name: "IDX_product_category_id",
              columnNames: ["category_id"],
            }),
            new TableIndex({
              name: "IDX_product_handle",
              columnNames: ["handle"],
            }),
            new TableIndex({
              name: "IDX_product_is_active",
              columnNames: ["is_active"],
            }),
          ],
        })
      )
    } else {
      // Add category_id column if it doesn't exist
      const table = await queryRunner.getTable("product")

      if (!table.findColumnByName("category_id")) {
        await queryRunner.addColumn(
          "product",
          new TableColumn({
            name: "category_id",
            type: "uuid",
            isNullable: true,
          })
        )

        await queryRunner.createForeignKey(
          "product",
          new TableForeignKey({
            name: "FK_product_category",
            columnNames: ["category_id"],
            referencedTableName: "product_category",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
          })
        )
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("product")

    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.name === "FK_product_category"
      )
      if (foreignKey) {
        await queryRunner.dropForeignKey("product", foreignKey)
      }

      if (table.findColumnByName("category_id")) {
        await queryRunner.dropColumn("product", "category_id")
      }
    }
  }
}
