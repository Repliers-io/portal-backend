import { container } from "tsyringe";
import type { AppConfig } from "../../src/config.js";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
export const generateAuthToken = (payload: JwtPayload) => {
   const config = container.resolve<AppConfig>('config');
   const keys: {
      private: Buffer;
   } = container.resolve('middleware.jwt.config.keys');
   const signInOptions: SignOptions = {
      // RS256 uses a public/private key pair. The API provides the private key
      // to generate the JWT. The client gets a public key to validate the
      // signature
      algorithm: "RS256",
      expiresIn: '1 hour',
      issuer: config.auth.jwt.issuer,
      jwtid: crypto.randomUUID()
   };
   return jwt.sign(payload, keys.private, signInOptions);
};