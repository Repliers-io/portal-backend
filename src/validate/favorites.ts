import joi from "joi";
import { RplFavoritesAddDto, RplFavoritesGetDto } from "../services/repliers/favorites.js";
import { mlsNumberSchema, rplSortBySchema, rplStatusSchema, rplLastStatusSchema, rplStandardStatusSchema } from "./common.js";
export const favoritesDeleteSchema = joi.object<FavoritesDeleteDto>().keys({
   favoriteId: joi.number().positive().required(),
   clientId: joi.number()
});
export interface FavoritesDeleteDto {
   favoriteId: number;
   clientId: number;
}
export const favoritesCreateSchema = joi.object<RplFavoritesAddDto>().keys({
   boardId: joi.number().positive(),
   clientId: joi.number().positive().required(),
   mlsNumber: mlsNumberSchema.required()
});
export const favoritesGetSchema = joi.object<RplFavoritesGetDto>().keys({
   clientId: joi.number().positive().required(),
   sortBy: rplSortBySchema,
   lat: joi.string(),
   long: joi.string(),
   status: rplStatusSchema,
   lastStatus: rplLastStatusSchema,
   standardStatus: rplStandardStatusSchema
});