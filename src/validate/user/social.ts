import joi from "joi";
import { SocialProvider } from "../../constants.js";
const socialProviderOptionalSchema = joi.string().valid(...Object.values(SocialProvider));
const socialProviderSchema = socialProviderOptionalSchema.required();
export interface UserSocialUrlDto {
   provider: SocialProvider;
}
export const userSocialUrlSchema = joi.object<UserSocialUrlDto>({
   provider: socialProviderSchema
});
export interface UserSocialCallbackDto {
   code: string;
   email: string;
   provider: SocialProvider;
}
export const userSocialCallbackSchema = joi.object<UserSocialCallbackDto>({
   code: joi.string().required(),
   email: joi.string().email().required(),
   provider: socialProviderSchema
});
export interface UserSocialRefreshDto {
   email: string;
   provider: SocialProvider;
}
export const userSocialRefreshSchema = joi.object<UserSocialRefreshDto>({
   email: joi.string().email().required(),
   provider: socialProviderSchema
});
export interface UserSocialUnlinkDto {
   email: string;
   provider: SocialProvider;
}
export const userSocialUnlinkSchema = joi.object<UserSocialUnlinkDto>({
   email: joi.string().email().required(),
   provider: socialProviderSchema
});
export interface UserSocialGetTokensDto {
   email: string;
   provider?: SocialProvider;
}
export const userSocialGetTokensSchema = joi.object<UserSocialGetTokensDto>({
   email: joi.string().email().required(),
   provider: socialProviderOptionalSchema
});