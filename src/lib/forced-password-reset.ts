export interface ForcedPasswordResetSession {
  userId: string;
  email: string;
}

export const FORCED_PASSWORD_RESET_SESSION_KEY =
  "forced-password-reset-session";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function setForcedPasswordResetSession(
  session: ForcedPasswordResetSession,
) {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.setItem(
    FORCED_PASSWORD_RESET_SESSION_KEY,
    JSON.stringify(session),
  );
}

export function getForcedPasswordResetSession() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = sessionStorage.getItem(FORCED_PASSWORD_RESET_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ForcedPasswordResetSession>;

    if (
      typeof parsed.userId !== "string" ||
      parsed.userId.length === 0 ||
      typeof parsed.email !== "string" ||
      parsed.email.length === 0
    ) {
      sessionStorage.removeItem(FORCED_PASSWORD_RESET_SESSION_KEY);
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
    };
  } catch {
    sessionStorage.removeItem(FORCED_PASSWORD_RESET_SESSION_KEY);
    return null;
  }
}

export function clearForcedPasswordResetSession() {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.removeItem(FORCED_PASSWORD_RESET_SESSION_KEY);
}
