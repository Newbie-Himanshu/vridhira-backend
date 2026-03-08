import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260308011147 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipping_config" ("id" text not null, "surcharge_percent" real not null default 0, "handling_fee" integer not null default 0, "fallback_rate" integer not null default 99, "free_shipping_threshold" integer not null default 0, "express_surcharge_percent" real not null default 0, "express_handling_fee" integer not null default 0, "express_fallback_rate" integer not null default 149, "express_free_shipping_threshold" integer not null default 0, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipping_config_deleted_at" ON "shipping_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_config" cascade;`);
  }

}
