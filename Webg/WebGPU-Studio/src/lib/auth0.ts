import { Auth0Client } from "@auth0/nextjs-auth0/server";

const scope =
  process.env.AUTH0_SCOPE ?? "openid profile email offline_access";
const audience = process.env.AUTH0_AUDIENCE ?? undefined;
const enableAccessTokenEndpoint =
  process.env.ENABLE_ACCESS_TOKEN_ENDPOINT === "true";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope,
    ...(audience ? { audience } : {}),
  },
  enableAccessTokenEndpoint,
});
