export enum UserRole {
   Root = 1,
   User = 2,
   Admin = 3,
   Agent = 4
}
export enum OAuthProviders {
   Google = "google",
   Facebook = "facebook"
}
export enum SocialProvider {
   Pinterest = "pinterest"
}
export type PeopleSyncStatus = "PENDING" | "SUCCESS" | string; // string is for error