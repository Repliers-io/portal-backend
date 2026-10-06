import { container, injectable } from "tsyringe";
import { SocialRepository } from "../../repository/social.js";
import { SocialProvider } from "../../constants.js";
import SocialProviderInterface from "./social/base.js";
import PinterestSocialProvider from "./social/pinterest.js";
import { UserSocialCallbackDto, UserSocialGetTokensDto, UserSocialRefreshDto, UserSocialUnlinkDto } from "../../validate/user/social.js";
import { ApiError } from "../../lib/errors.js";
@injectable()
export default class SocialService {
   private socialProviders: Record<SocialProvider, SocialProviderInterface> = {
      [SocialProvider.Pinterest]: container.resolve(PinterestSocialProvider)
   };
   constructor(private socialRepository: SocialRepository) {}
   async getUrl(provider: SocialProvider) {
      const providerInstance = this.socialProviders[provider];
      return providerInstance.getUrl();
   }
   async callback(params: UserSocialCallbackDto) {
      const providerInstance = this.socialProviders[params.provider];
      const tokens = await providerInstance.callback({
         code: params.code
      });
      await this.socialRepository.createTokens(params.email, params.provider, tokens);
      return tokens;
   }
   async refresh(params: UserSocialRefreshDto) {
      const tokenInfo = await this.socialRepository.getUserTokens(params.email, params.provider);
      if (!tokenInfo) {
         throw new ApiError("No stored tokens for this user/provder", 400);
      }
      const providerInstance = this.socialProviders[params.provider];
      const newAccessToken = await providerInstance.refresh(tokenInfo.tokens);
      if (!("access_token" in newAccessToken)) {
         throw new ApiError("No access token in response", 400);
      }
      return this.socialRepository.updateAccessToken(params.email, params.provider, newAccessToken["access_token"]);
   }
   async getTokens(params: UserSocialGetTokensDto) {
      if ('provider' in params) {
         return this.socialRepository.getUserTokens(params.email, params.provider);
      }
      return this.socialRepository.getUserTokens(params.email);
   }
   async unlinkAccount(params: UserSocialUnlinkDto) {
      return this.socialRepository.deleteTokens(params.email, params.provider);
   }
}