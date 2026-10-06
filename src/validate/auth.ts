import joi from "joi";
import { emailSchema, phoneSchema } from "./common.js";
export const userOtpSchema = joi.object<UserOtpDto>().keys({
   code: joi.string().length(6).required()
}).required().label("otp");
export const userLoginSchema = joi.object<UserLoginDto>().keys({
   email: emailSchema,
   phone: phoneSchema
}).or('email', 'phone').required().label("credentials");
export interface UserLoginDto {
   email?: string;
   phone?: string;
}
export interface UserOtpDto {
   code: string;
}
export const userSignupSchema = joi.object<UserSignupDto>().keys({
   fname: joi.string().required(),
   lname: joi.string().required(),
   email: emailSchema.required(),
   phone: phoneSchema,
   referer: joi.string()
});
export interface UserSignupDto {
   email: string;
   fname: string;
   lname: string;
   // password: string;
   phone?: string;
   referer: string;
}
export const authRepliersTokenSchema = joi.object<AuthRepliersTokenDto>().keys({
   token: joi.string().uuid().required()
});
export interface AuthRepliersTokenDto {
   token: string;
}
export const authEmbedSchema = joi.object<AuthEmbedDto>().keys({
   context: joi.string().required(),
   signature: joi.string().required()
});
export interface AuthEmbedDto {
   context: string;
   signature: string;
}
export const providerUrlSchema = joi.object<ProviderUrlDto>().keys({
   redirect_uri: joi.string().uri().optional()
});
export interface ProviderUrlDto {
   redirect_uri?: string;
}
export interface ProviderCallbackDto {
   code: string;
   redirect_uri?: string;
}
export const providerCallbackSchema = joi.object<ProviderCallbackDto>().keys({
   code: joi.string().required(),
   redirect_uri: joi.string().uri().optional()
});