export const ADMIN_LOGIN_AS_CHANNEL_PREFIX = "admin-login-as";
export const ADMIN_BACKUP_SESSION_KEY = "admin_backup_session";
export const ADMIN_LOGIN_AS_MAX_AGE_MS = 60 * 1000;

export type LoginAsTransferUser = {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  balance?: number;
  bonusBalance?: number;
  currency?: string;
  referralCode?: string;
  emailVerified?: boolean;
  image?: string | null;
};

export type LoginAsTransferPayload = {
  token?: string;
  createdAt?: number;
  user?: LoginAsTransferUser;
  adminBackup?: {
    token?: string;
    user?: LoginAsTransferUser;
  };
};
