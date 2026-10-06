import nock from "nock";
import config from "../../../src/config.js";
import _ from "lodash";
type UserMock = {
   email: string;
   clientId?: number;
   preferences?: {
      email?: boolean;
      unsubscribe?: boolean;
   };
};
export const mockUserCreate = (user: UserMock) => nock(config.repliers.base_url).post(
// user create
"/clients", _.matches({
   email: user.email
})).reply(200, {
   clientId: user.clientId,
   agentId: config.repliers.clients.defaultAgentId,
   email: user.email,
   preferences: {
      ...user.preferences
   }
});
export const mockUserCreateConflict = (user: UserMock) => nock(config.repliers.base_url).post(
// user create conflict
"/clients", _.matches({
   email: user.email
})).reply(409, [{
   param: "email",
   msg: `${user.email} is already in use by another client`
}]);
export const mockUserPatch = (user: UserMock) => nock(config.repliers.base_url).patch(
// user update
`/clients/${user.clientId}`, _.matches({
   clientId: user.clientId
})).reply(200, {
   agentId: config.repliers.clients.defaultAgentId,
   ...user
});
export const mockEnsureMailingAllowed = (clientId: number) => nock(config.repliers.base_url).patch(
// user update
`/clients/${clientId}`, _.matches({
   preferences: {
      email: true,
      unsubscribe: false
   }
})).reply(200);
export const mockFailedEnsureMailingAllowed = (clientId: number) => nock(config.repliers.base_url).patch(
// user update
`/clients/${clientId}`, _.matches({
   preferences: {
      email: true,
      unsubscribe: false
   }
})).reply(400);
export const mockUserFind = (user: UserMock) => nock(config.repliers.base_url).get("/clients") // lookup for user tosend otp
.query({
   email: user.email,
   operator: "OR"
}).reply(200, {
   page: 1,
   numPages: 1,
   pageSize: 10,
   count: 1,
   clients: [{
      ...user
   }]
});
export const mockUserFindSimple = (user: UserMock) => nock(config.repliers.base_url).get("/clients") // lookup for user tosend otp
.query({
   email: user.email
}).reply(200, {
   page: 1,
   numPages: 1,
   pageSize: 10,
   count: 1,
   clients: [{
      ...user
   }]
});
export const mockUserNotFound = (user: UserMock) => nock(config.repliers.base_url).get("/clients") // lookup for user tosend otp
.query({
   email: user.email,
   operator: "OR"
}).reply(404);
export const mockUserGetById = (user: UserMock) => nock(config.repliers.base_url).get(`/clients/${user.clientId}`).reply(200, {
   clientId: user.clientId,
   email: user.email
});