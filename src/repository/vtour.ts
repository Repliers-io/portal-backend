import type { Knex } from "knex";
import { VtourTable } from "knex/types/tables.js";
import { inject, injectable } from "tsyringe";
import { Optional } from "../types/repliers.js";
export enum VtourLinkType {
   youtube = "youtube",
   text = "text"
}
export interface VtourLinks {
   type: VtourLinkType;
   title: string;
   url: string;
}
declare module "knex/types/tables.js" {
   export interface VtourTable {
      id: string;
      owner_id: number;
      data: VtourLinks[] | string;
      created_at: Date;
      updated_at: Date;
   }
   interface Tables {
      vtour: VtourTable;
      // Check https://knexjs.org/guide/#typescript for information about what does all of this mean
      vtour_composite: Knex.CompositeTableType<VtourTable,
      // select
      Optional<VtourTable, "created_at" | "updated_at">,
      // insert
      Partial<Omit<VtourTable, "id">> // update
      >;
   }
}
@injectable()
export class VtourRepository {
   constructor(@inject("db")
   private db: Knex) {}
   create(params: Optional<VtourTable, "created_at" | "updated_at">) {
      return this.db.table("vtour").insert({
         ...params,
         data: JSON.stringify(params.data)
      }, "*").onConflict("id").ignore();
   }
   remove(id: string) {
      return this.db.table("vtour").delete().where({
         id
      });
   }
   update(id: string, params: Partial<Omit<VtourTable, "id">>) {
      return this.db.table("vtour").update({
         ...params,
         data: JSON.stringify(params.data)
      }).where({
         id
      });
   }
   getOne(id: string) {
      return this.db.table("vtour").select("*").where({
         id
      }).first();
   }
}