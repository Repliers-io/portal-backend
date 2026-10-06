import { TokenEndpointResponse, TokenEndpointResponseHelpers } from "openid-client";
export default interface SocialProviderBase {
   getUrl(): string;
   callback(params: {
      code: string;
   }): Promise<TokenEndpointResponse & TokenEndpointResponseHelpers>;
   refresh(params: Record<string, unknown>): Promise<TokenEndpointResponse & TokenEndpointResponseHelpers>;
}