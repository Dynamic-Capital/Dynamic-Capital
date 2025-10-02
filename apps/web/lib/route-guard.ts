import { createHash, timingSafeEqual } from "node:crypto";

export const ROUTE_GUARD_COOKIE_NAME = "dc_protected_route";
export const ROUTE_GUARD_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const digest = (value: string) => createHash("sha256").update(value).digest();

export const cookieToken = (secret: string) =>
  createHash("sha256").update(secret).digest("base64url");

const safeEqual = (a: Buffer, b: Buffer) => {
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
};

export const passwordsMatch = (candidate: string, secret: string) => {
  const candidateDigest = digest(candidate);
  const secretDigest = digest(secret);

  return safeEqual(candidateDigest, secretDigest);
};

export const tokenMatchesSecret = (token: string, secret: string) => {
  const expectedToken = cookieToken(secret);
  const tokenBuffer = Buffer.from(token, "utf8");
  const expectedBuffer = Buffer.from(expectedToken, "utf8");

  return safeEqual(tokenBuffer, expectedBuffer);
};

export const buildRouteGuardCookie = (value: string) => {
  const segments = [
    `${ROUTE_GUARD_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${ROUTE_GUARD_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    segments.push("Secure");
  }

  return segments.join("; ");
};
