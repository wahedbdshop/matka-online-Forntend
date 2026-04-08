import Cookies from "js-cookie";

export const ACCESS_TOKEN_COOKIE_NAMES = ["accessToken", "auth_token"] as const;
export const REFRESH_TOKEN_COOKIE_NAMES = ["refreshToken", "refresh_token"] as const;
export const SESSION_COOKIE_NAMES = ["betterAuthSession", "token"] as const;
export const AUTH_COOKIE_NAMES = [
  ...ACCESS_TOKEN_COOKIE_NAMES,
  ...REFRESH_TOKEN_COOKIE_NAMES,
  ...SESSION_COOKIE_NAMES,
] as const;

const baseCookieOptions = {
  sameSite: "lax" as const,
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
}

export function hasClientAuthCookie() {
  if (typeof document === "undefined") return false;

  if (document.cookie.includes("auth_flag=1")) return true;

  return AUTH_COOKIE_NAMES.some((name) => document.cookie.includes(`${name}=`));
}
