export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  balance: number;
  bonusBalance: number;
  currency: string;
  referralCode: string;
  emailVerified: boolean;
  image?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  paymentMethod: string;
  accountNumber: string;
  amount: number;
  currency: string;
  transactionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  paymentMethod: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  isRead: boolean;
  link?: string;
  createdAt: string;
}
