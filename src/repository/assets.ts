import type { Knex } from "knex";
import { inject, injectable } from "tsyringe";

// Update Assets Interface if you need to add another asset type
// Also, don't forget to update validators/user/assets.ts with new validators for new asset types
export const AssetTypesArray = ["image-favorites"] as const;
export type AssetType = typeof AssetTypesArray[number];

// Update AssetTypesArray if you need to add another asset type
export interface Assets {
   "image-favorites": {};
   // 'another-type': { field1: '' .. etc}
}
declare module "knex/types/tables.js" {
   export interface AssetsTable {
      id: string;
      email: string;
      type: AssetType;
      data: Assets[AssetType]; // unfortunatley this will not work like: if type === 'foo' { console.log(data.test) }
      created_at: Date;
   }
   interface Tables {
      assets: AssetsTable;
   }
}
@injectable()
export class AssetsRepository {
   constructor(@inject("db")
   private db: Knex) {}
   createAsset(id: string, email: string, type: AssetType, data: Assets[AssetType]) {
      return this.db.table("assets").insert({
         id,
         type,
         email,
         data
      }).returning("*").onConflict(['id', 'email', 'type']).ignore();
   }
   getAssets(email: string, type: AssetType) {
      return this.db.table("assets").select("*").where({
         type,
         email
      });
   }
   removeAsset(id: string, type: AssetType, email: string) {
      return this.db.table("assets").delete().where({
         id,
         type,
         email
      });
   }
}