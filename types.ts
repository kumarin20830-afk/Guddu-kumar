export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  GAME_WIN = 'GAME_WIN',
  BONUS = 'BONUS',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  SPIN_COST = 'SPIN_COST'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED'
}

export interface Transaction {
  id: string;
  userId: string; // Phone number serves as ID
  userPhone: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  details?: string; // UTR or game result
}

export interface UserProfile {
  uid: string;
  phone: string;
  balance: number;
  spinsLeft: number;
  lastResetDate: string;
  referralCode: string;
  referredBy?: string;
  referralSkipped?: boolean;
  totalReferrals: number;
  isVip: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface WheelSegment {
  id: number;
  label: string;
  value: number;
  color: string;
  textColor: string;
  probability: number;
  isJackpot?: boolean;
}