import Cookies from "js-cookie";

export const ACCESS_TOKEN_COOKIE_NAMES = ["accessToken", "auth_token"] as const;
export const REFRESH_TOKEN_COOKIE_NAMES = ["refreshToken", "refresh_token"] as const;
export const SESSION_COOKIE_NAMES = ["betterAuthSession", "token"] as const;
export const AUTH_FLAG_COOKIE_NAME = "auth_flag" as const;
export const AUTH_COOKIE_NAMES = [
  ...ACCESS_TOKEN_COOKIE_NAMES,
  ...REFRESH_TOKEN_COOKIE_NAMES,
  ...SESSION_COOKIE_NAMES,
] as const;

const baseCookieOptions = {
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
    | "none"
    | "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setClientAuthCookies(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
}) {
  if (tokens.accessToken) {
    ACCESS_TOKEN_COOKIE_NAMES.forEach((name) => {
      Cookies.set(name, tokens.accessToken!, baseCookieOptions);
    });
  }

  if (tokens.refreshToken) {
    REFRESH_TOKEN_COOKIE_NAMES.forEach((name) => {
      Cookies.set(name, tokens.refreshToken!, baseCookieOptions);
    });
  }

  if (tokens.sessionToken) {
    SESSION_COOKIE_NAMES.forEach((name) => {
      Cookies.set(name, tokens.sessionToken!, baseCookieOptions);
    });
  }
}

export function clearClientAuthCookies() {
  AUTH_COOKIE_NAMES.forEach((name) => {
    Cookies.remove(name, { path: "/" });
  });
  Cookies.remove(AUTH_FLAG_COOKIE_NAME, { path: "/" });
}

export function hasClientAuthCookie() {
  if (typeof document === "undefined") return false;

  if (document.cookie.includes(`${AUTH_FLAG_COOKIE_NAME}=1`)) return true;

  return AUTH_COOKIE_NAMES.some((name) => document.cookie.includes(`${name}=`));
}

export function getClientAccessTokenCookie() {
  for (const name of ACCESS_TOKEN_COOKIE_NAMES) {
    const value = Cookies.get(name);
    if (value) return value;
  }

  return null;
}
