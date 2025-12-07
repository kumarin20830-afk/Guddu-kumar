import { UserProfile, Transaction, TransactionType, TransactionStatus } from '../types';

// Keys for LocalStorage to act as our Database
const DB_USERS_KEY = 'spinApp_db_users';
const DB_TRANSACTIONS_KEY = 'spinApp_db_transactions';

class DBService {
  // --- Helpers ---
  private getUsersMap(): Record<string, UserProfile> {
    const data = localStorage.getItem(DB_USERS_KEY);
    return data ? JSON.parse(data) : {};
  }

  private saveUsersMap(map: Record<string, UserProfile>) {
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(map));
  }

  private getTransactionsList(): Transaction[] {
    const data = localStorage.getItem(DB_TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveTransactionsList(list: Transaction[]) {
    localStorage.setItem(DB_TRANSACTIONS_KEY, JSON.stringify(list));
  }

  // --- User Methods ---
  
  // Login or Register a user by phone
  loginUser(phone: string): UserProfile {
    const map = this.getUsersMap();
    
    if (map[phone]) {
      return map[phone];
    }

    // Create new user
    // UID generation: Timestamp + Random to ensure enough length
    const uid = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    const referralCode = uid.slice(-6); // Last 6 chars

    const newUser: UserProfile = {
      uid,
      phone,
      balance: 0,
      spinsLeft: 10,
      lastResetDate: new Date().toDateString(),
      referralCode,
      referredBy: undefined,
      referralSkipped: false,
      totalReferrals: 0,
      isVip: false,
      createdAt: new Date().toISOString()
    };

    map[phone] = newUser;
    this.saveUsersMap(map);
    return newUser;
  }

  getUser(phone: string): UserProfile | null {
    const map = this.getUsersMap();
    return map[phone] || null;
  }

  getAllUsers(): UserProfile[] {
    return Object.values(this.getUsersMap());
  }

  updateUser(phone: string, updates: Partial<UserProfile>): UserProfile {
    const map = this.getUsersMap();
    if (!map[phone]) throw new Error("User not found");
    
    map[phone] = { ...map[phone], ...updates };
    this.saveUsersMap(map);
    return map[phone];
  }

  updateUserBalance(phone: string, amount: number, type: TransactionType, details: string): UserProfile {
    const map = this.getUsersMap();
    const user = map[phone];
    if (!user) throw new Error("User not found");

    const newBalance = user.balance + amount;
    
    // Create Transaction Record
    const tx: Transaction = {
      id: Date.now().toString(),
      userId: user.uid,
      userPhone: user.phone,
      type,
      amount: Math.abs(amount),
      status: TransactionStatus.SUCCESS,
      date: new Date().toISOString(),
      details
    };

    // Update User
    map[phone] = { ...user, balance: newBalance };
    this.saveUsersMap(map);
    
    // Save Transaction
    const txs = this.getTransactionsList();
    txs.unshift(tx);
    this.saveTransactionsList(txs);

    return map[phone];
  }

  // --- Referral Logic ---

  applyReferralCode(currentUserPhone: string, code: string): { success: boolean, message: string } {
    const map = this.getUsersMap();
    const currentUser = map[currentUserPhone];
    
    if (!currentUser) return { success: false, message: "Current user not found" };
    if (currentUser.referredBy || currentUser.referralSkipped) {
      return { success: false, message: "Referral already processed" };
    }
    if (code === currentUser.referralCode) {
      return { success: false, message: "You cannot refer yourself" };
    }

    // Find inviter
    const inviter = Object.values(map).find(u => u.referralCode === code);
    if (!inviter) {
      return { success: false, message: "Invalid Referral Code" };
    }

    // Apply Rewards
    const BONUS_AMOUNT = 200;

    // 1. Update Inviter
    inviter.balance += BONUS_AMOUNT;
    inviter.totalReferrals = (inviter.totalReferrals || 0) + 1;
    
    // Inviter Transaction Log
    const inviterTx: Transaction = {
      id: Date.now().toString() + '_ref_inv',
      userId: inviter.uid,
      userPhone: inviter.phone,
      type: TransactionType.REFERRAL_BONUS,
      amount: BONUS_AMOUNT,
      status: TransactionStatus.SUCCESS,
      date: new Date().toISOString(),
      details: `Referral Bonus (Invited: ${currentUser.phone})`
    };

    // 2. Update Current User
    currentUser.balance += BONUS_AMOUNT;
    currentUser.referredBy = code;
    
    // User Transaction Log
    const userTx: Transaction = {
      id: Date.now().toString() + '_ref_user',
      userId: currentUser.uid,
      userPhone: currentUser.phone,
      type: TransactionType.REFERRAL_BONUS,
      amount: BONUS_AMOUNT,
      status: TransactionStatus.SUCCESS,
      date: new Date().toISOString(),
      details: `Referral Bonus (Inviter: ${inviter.referralCode})`
    };

    // Save Users
    map[inviter.phone] = inviter;
    map[currentUser.phone] = currentUser;
    this.saveUsersMap(map);

    // Save Transactions
    const txs = this.getTransactionsList();
    txs.unshift(inviterTx, userTx);
    this.saveTransactionsList(txs);

    return { success: true, message: "Referral bonus applied successfully 🎉" };
  }

  skipReferral(phone: string) {
    const map = this.getUsersMap();
    if (map[phone]) {
      map[phone].referralSkipped = true;
      this.saveUsersMap(map);
    }
  }

  // --- Transaction Methods ---

  addTransaction(tx: Transaction) {
    const list = this.getTransactionsList();
    list.unshift(tx);
    this.saveTransactionsList(list);
  }

  getTransactions(filter?: { phone?: string, type?: TransactionType, status?: TransactionStatus }): Transaction[] {
    let list = this.getTransactionsList();
    if (filter) {
      if (filter.phone) list = list.filter(t => t.userPhone === filter.phone);
      if (filter.type) list = list.filter(t => t.type === filter.type);
      if (filter.status) list = list.filter(t => t.status === filter.status);
    }
    return list;
  }

  updateTransactionStatus(txId: string, status: TransactionStatus, adminNote?: string): Transaction | null {
    const list = this.getTransactionsList();
    const index = list.findIndex(t => t.id === txId);
    
    if (index === -1) return null;

    const tx = list[index];
    tx.status = status;
    if (adminNote) tx.details = (tx.details || '') + ` [Admin: ${adminNote}]`;
    
    const map = this.getUsersMap();
    const user = map[tx.userPhone];

    if (user) {
      if (tx.type === TransactionType.DEPOSIT && status === TransactionStatus.SUCCESS) {
        user.balance += tx.amount;
        user.spinsLeft += Math.floor(tx.amount / 100);
      } else if (tx.type === TransactionType.WITHDRAWAL && status === TransactionStatus.REJECTED) {
        user.balance += tx.amount; // Refund
      }
      this.saveUsersMap(map);
    }

    this.saveTransactionsList(list);
    return tx;
  }
}

export const dbService = new DBService();