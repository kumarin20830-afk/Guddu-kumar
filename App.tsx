import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, CreditCard, RotateCw, User, LogOut, ShieldCheck, 
  MessageCircle, History, AlertTriangle, Gift, CheckCircle2, 
  Lock, Smartphone, ArrowRight, Wallet, Users, XCircle, Search,
  Filter, Calendar, RefreshCw, Star
} from 'lucide-react';
import SpinWheel from './components/SpinWheel';
import { PromoBanner } from './components/PromoBanner';
import { UserProfile, Transaction, TransactionType, TransactionStatus, Notification, WheelSegment } from './types';
import { analyzeTransactionRisk } from './services/geminiService';
import { audioService } from './services/audioService';
import { dbService } from './services/dbService';

// --- Constants ---
const MAX_DAILY_SPINS = 10;
const SPIN_COST = 10; // Cost in coins for paid spins
const ADMIN_UPI_ID = "gk7@ptaxis";
const ADMIN_EMAIL = "gudduicici7@gmail.com";
const ADMIN_PASS = "123456789";

const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 1, label: '₹10', value: 10, color: '#3b82f6', textColor: 'white', probability: 0.3 },
  { id: 2, label: 'Try Again', value: 0, color: '#ef4444', textColor: 'white', probability: 0.2 },
  { id: 3, label: '₹50', value: 50, color: '#8b5cf6', textColor: 'white', probability: 0.15 },
  { id: 4, label: 'Bonus', value: 5, color: '#10b981', textColor: 'white', probability: 0.2 },
  { id: 5, label: '₹100', value: 100, color: '#f59e0b', textColor: 'black', probability: 0.09 },
  { id: 6, label: 'JACKPOT', value: 500, color: '#ec4899', textColor: 'white', probability: 0.01, isJackpot: true },
  { id: 7, label: '₹20', value: 20, color: '#06b6d4', textColor: 'white', probability: 0.2 },
  { id: 8, label: 'Zero', value: 0, color: '#64748b', textColor: 'white', probability: 0.2 },
];

// --- Views Enum ---
enum View {
  // Auth
  AUTH_SELECTION = 'AUTH_SELECTION',
  USER_LOGIN = 'USER_LOGIN',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  REFERRAL_ONBOARDING = 'REFERRAL_ONBOARDING',
  
  // User App
  DASHBOARD = 'DASHBOARD',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  HISTORY = 'HISTORY',
  TERMS = 'TERMS',

  // Admin App
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

const App: React.FC = () => {
  // --- Global State ---
  const [currentView, setCurrentView] = useState<View>(View.AUTH_SELECTION);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Login Form State ---
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // --- Referral State ---
  const [referralInput, setReferralInput] = useState('');

  // --- User App State ---
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResultIndex, setSpinResultIndex] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositUTR, setDepositUTR] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUPI, setWithdrawUPI] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- Admin App State ---
  const [adminTab, setAdminTab] = useState<'USERS' | 'DEPOSITS' | 'WITHDRAWALS'>('USERS');
  const [adminUserList, setAdminUserList] = useState<UserProfile[]>([]);
  const [adminTxList, setAdminTxList] = useState<Transaction[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // To force re-fetches

  // Admin Filters
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // --- Effects ---

  // Initial Load - Check if already logged in
  useEffect(() => {
    const savedPhone = localStorage.getItem('spinApp_lastUserPhone');
    if (savedPhone) {
      // Auto-login logic could go here, but for now we stick to the flow requested
    }
  }, []);

  // Sync User Data
  useEffect(() => {
    if (currentUser && !isAdmin) {
      const freshData = dbService.getUser(currentUser.phone);
      if (freshData && JSON.stringify(freshData) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshData);
      }
    }
  }, [currentUser, isAdmin, refreshTrigger, isSpinning]);

  // Daily Reset & Ref Check (Only when User Logged In)
  useEffect(() => {
    if (currentUser && !isAdmin) {
      // 1. URL based Referral Check (Legacy, kept for deep links)
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) setReferralInput(refCode);

      // 2. Daily Reset
      const today = new Date().toDateString();
      if (currentUser.lastResetDate !== today) {
        dbService.updateUser(currentUser.phone, { 
          spinsLeft: MAX_DAILY_SPINS, 
          lastResetDate: today 
        });
        addNotification("Daily Reset: 10 Free Spins added!", "info");
        setRefreshTrigger(p => p + 1);
      }
    }
  }, [currentUser?.phone]); 

  // Admin Data Fetcher
  useEffect(() => {
    if (isAdmin) {
      setAdminUserList(dbService.getAllUsers());
      setAdminTxList(dbService.getTransactions());
    }
  }, [isAdmin, refreshTrigger, adminTab]);

  // Reset filters when changing tabs
  useEffect(() => {
    setFilterStatus('ALL');
    setFilterDateStart('');
    setFilterDateEnd('');
  }, [adminTab]);

  // --- Notifications Helper ---
  const addNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  // --- Auth Handlers ---

  const handleUserLogin = () => {
    if (isOtpSent) {
      // Verify OTP
      if (otpInput === '123456' || otpInput.length === 6) { // Simulate check
        const user = dbService.loginUser(phoneInput);
        setCurrentUser(user);
        setIsAdmin(false);
        localStorage.setItem('spinApp_lastUserPhone', phoneInput);
        
        // Referral Onboarding Check
        if (!user.referredBy && !user.referralSkipped) {
          setCurrentView(View.REFERRAL_ONBOARDING);
        } else {
          setCurrentView(View.DASHBOARD);
          addNotification(`Welcome back, ${phoneInput}!`, "success");
        }
      } else {
        addNotification("Invalid OTP. Try 123456", "error");
      }
    } else {
      // Send OTP
      if (phoneInput.length < 10) {
        addNotification("Enter a valid phone number", "error");
        return;
      }
      setIsOtpSent(true);
      addNotification("OTP Sent: 123456", "info");
    }
  };

  const handleApplyReferral = () => {
    if (!currentUser || !referralInput) return;
    
    const result = dbService.applyReferralCode(currentUser.phone, referralInput.trim().toUpperCase());
    
    if (result.success) {
      addNotification(result.message, "success");
      setRefreshTrigger(p => p + 1);
      setCurrentView(View.DASHBOARD);
    } else {
      addNotification(result.message, "error");
    }
  };

  const handleSkipReferral = () => {
    if (!currentUser) return;
    dbService.skipReferral(currentUser.phone);
    setRefreshTrigger(p => p + 1);
    setCurrentView(View.DASHBOARD);
  };

  const handleAdminLogin = () => {
    if (adminEmail === ADMIN_EMAIL && adminPass === ADMIN_PASS) {
      setIsAdmin(true);
      setCurrentUser(null);
      setCurrentView(View.ADMIN_DASHBOARD);
      addNotification("Admin Panel Access Granted", "success");
    } else {
      addNotification("Invalid Admin Credentials", "error");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setIsOtpSent(false);
    setPhoneInput('');
    setOtpInput('');
    setAdminEmail('');
    setAdminPass('');
    setReferralInput('');
    setCurrentView(View.AUTH_SELECTION);
    localStorage.removeItem('spinApp_lastUserPhone');
  };

  // --- User Game Logic ---

  const handleSpin = () => {
    if (!currentUser) return;
    if (isSpinning) return;

    // Determine if Free or Paid Spin
    if (currentUser.spinsLeft > 0) {
      // Free Spin
      dbService.updateUser(currentUser.phone, { spinsLeft: currentUser.spinsLeft - 1 });
    } else {
      // Paid Spin
      if (currentUser.balance < SPIN_COST) {
        addNotification(`Insufficient balance! Spin costs ₹${SPIN_COST}`, "error");
        audioService.playError();
        return;
      }
      // Deduct Cost
      dbService.updateUserBalance(currentUser.phone, -SPIN_COST, TransactionType.SPIN_COST, "Spin Fee");
    }

    setIsSpinning(true);
    setRefreshTrigger(p => p + 1); 

    // Weighted Probability
    let random = Math.random();
    const totalWeight = WHEEL_SEGMENTS.reduce((acc, seg) => acc + seg.probability, 0);
    random = random * totalWeight;
    let accumulatedWeight = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      accumulatedWeight += WHEEL_SEGMENTS[i].probability;
      if (random <= accumulatedWeight) {
        selectedIndex = i;
        break;
      }
    }
    setSpinResultIndex(selectedIndex);
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    if (spinResultIndex !== null && currentUser) {
      const result = WHEEL_SEGMENTS[spinResultIndex];
      if (result.value > 0) {
        // Play success sound
        audioService.playWin();
        
        dbService.updateUserBalance(
          currentUser.phone, 
          result.value, 
          TransactionType.GAME_WIN, 
          `Won on ${result.label}`
        );
        addNotification(`You won ${result.label}!`, "success");
      } else {
        addNotification("Better luck next time!", "info");
      }
      setSpinResultIndex(null);
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleDeposit = async () => {
    if (!currentUser) return;
    if (!depositAmount || !depositUTR) {
      addNotification("Fill all fields", "error");
      return;
    }

    setIsProcessing(true);
    addNotification("Verifying UTR...", "info");

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mimic network
      const amount = parseFloat(depositAmount);
      
      const analysis = await analyzeTransactionRisk(depositUTR, amount, "UPI");
      
      if (analysis.riskScore > 80 || !analysis.isValidFormat) {
        addNotification(`Security Alert: ${analysis.reasoning}`, "error");
        audioService.playError();
      } else {
        const tx: Transaction = {
          id: Date.now().toString(),
          userId: currentUser.uid,
          userPhone: currentUser.phone,
          type: TransactionType.DEPOSIT,
          amount: amount,
          status: TransactionStatus.PENDING,
          date: new Date().toISOString(),
          details: `UTR: ${depositUTR}`
        };
        
        dbService.addTransaction(tx);
        addNotification("Deposit Request Submitted. Wait for Admin Approval.", "success");
        setDepositAmount('');
        setDepositUTR('');
        setCurrentView(View.HISTORY);
      }
    } catch (e) {
      addNotification("Error processing request", "error");
    } finally {
      setIsProcessing(false);
      setRefreshTrigger(p => p + 1);
    }
  };

  const handleWithdraw = () => {
    if (!currentUser) return;
    const amount = parseFloat(withdrawAmount);
    
    // Validate UPI
    const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/;
    if (!upiRegex.test(withdrawUPI)) {
      addNotification("Invalid UPI Format", "error");
      return;
    }
    if (amount > currentUser.balance) {
      addNotification("Insufficient Balance", "error");
      return;
    }
    if (amount < 100) {
      addNotification("Minimum ₹100", "warning");
      return;
    }

    // Deduct immediately, refund if rejected
    dbService.updateUser(currentUser.phone, { balance: currentUser.balance - amount });
    
    const tx: Transaction = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      userPhone: currentUser.phone,
      type: TransactionType.WITHDRAWAL,
      amount: amount,
      status: TransactionStatus.PENDING,
      date: new Date().toISOString(),
      details: `To: ${withdrawUPI}`
    };
    dbService.addTransaction(tx);
    
    addNotification("Withdrawal Requested", "success");
    setWithdrawAmount('');
    setWithdrawUPI('');
    setRefreshTrigger(p => p + 1);
    setCurrentView(View.HISTORY);
  };

  // --- Admin Logic ---

  const adminActionTx = (txId: string, action: 'APPROVE' | 'REJECT') => {
    const status = action === 'APPROVE' ? TransactionStatus.SUCCESS : TransactionStatus.REJECTED;
    dbService.updateTransactionStatus(txId, status);
    setRefreshTrigger(p => p + 1);
    addNotification(`Transaction ${action}D`, "success");
  };

  const adminAdjustBalance = (phone: string, amount: number) => {
    try {
      dbService.updateUserBalance(phone, amount, TransactionType.ADMIN_ADJUSTMENT, "Manual Adjustment");
      setRefreshTrigger(p => p + 1);
      addNotification("Balance Updated", "success");
    } catch (e) {
      addNotification("User not found", "error");
    }
  };

  // --- Renders: Auth ---

  const renderAuthSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 p-4">
      {/* Promotional Banner */}
      <PromoBanner className="w-full max-w-sm rounded-2xl shadow-2xl mb-4 border border-slate-700 hover:shadow-indigo-500/20 transition-shadow bg-slate-900" />

      <div className="text-center mb-4">
        <h1 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">SpinPro</h1>
        <p className="text-slate-400">Win Real Rewards Daily</p>
      </div>

      <button 
        onClick={() => setCurrentView(View.USER_LOGIN)}
        className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl flex items-center justify-between hover:scale-105 transition-transform shadow-lg shadow-blue-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-full"><Smartphone className="text-white" /></div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-white">Login as User</h3>
            <p className="text-blue-200 text-sm">Play, Win & Withdraw</p>
          </div>
        </div>
        <ArrowRight className="text-white" />
      </button>

      <button 
        onClick={() => setCurrentView(View.ADMIN_LOGIN)}
        className="w-full max-w-sm bg-slate-800 border border-slate-700 p-6 rounded-2xl flex items-center justify-between hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-700 rounded-full"><Lock className="text-slate-400" /></div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-slate-300">Login as Admin</h3>
            <p className="text-slate-500 text-sm">Manage Users & Payments</p>
          </div>
        </div>
        <ArrowRight className="text-slate-500" />
      </button>
    </div>
  );

  const renderUserLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center">User Login</h2>
        {!isOtpSent ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">Phone Number</label>
              <input 
                type="tel" 
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="Enter 10 digit number"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button onClick={handleUserLogin} className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500">Send OTP</button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-blue-500/10 p-3 rounded text-blue-300 text-sm text-center">
                OTP sent to {phoneInput}
             </div>
             <div>
              <label className="text-sm text-slate-400">Enter OTP</label>
              <input 
                type="text" 
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white text-center tracking-widest text-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button onClick={handleUserLogin} className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-500">Verify & Login</button>
            <button onClick={() => setIsOtpSent(false)} className="w-full text-slate-500 text-sm">Change Number</button>
          </div>
        )}
        <button onClick={() => setCurrentView(View.AUTH_SELECTION)} className="w-full mt-6 text-slate-400 text-sm">Back</button>
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
        <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
           <ShieldCheck className="text-red-500" /> Admin Panel
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400">Email ID</label>
            <input 
              type="email" 
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Password</label>
            <input 
              type="password" 
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <button onClick={handleAdminLogin} className="w-full bg-red-600 py-3 rounded-lg font-bold hover:bg-red-500 shadow-lg shadow-red-500/20">Access Panel</button>
        </div>
        <button onClick={() => setCurrentView(View.AUTH_SELECTION)} className="w-full mt-6 text-slate-400 text-sm">Back</button>
      </div>
    </div>
  );

  const renderReferralOnboarding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
       <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center">
         <Gift className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
         <h2 className="text-2xl font-bold text-white mb-2">Have a Referral Code?</h2>
         <p className="text-slate-400 text-sm mb-6">Enter code to get <span className="text-yellow-400 font-bold">200 Coins</span> bonus!</p>
         
         <input 
           type="text" 
           value={referralInput}
           onChange={e => setReferralInput(e.target.value)}
           placeholder="Ex: 8X2A9Z"
           className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-center text-xl tracking-widest text-white uppercase mb-4 focus:ring-2 focus:ring-yellow-400 outline-none"
         />
         
         <div className="grid grid-cols-2 gap-4">
           <button onClick={handleSkipReferral} className="py-3 rounded-lg text-slate-400 hover:bg-slate-700 font-medium">Skip</button>
           <button onClick={handleApplyReferral} className="bg-yellow-500 py-3 rounded-lg text-black font-bold hover:bg-yellow-400">Apply Code</button>
         </div>
       </div>
    </div>
  );

  // --- Renders: User App ---

  const renderDashboard = () => (
    <div className="p-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.phone}`} 
            alt="Avatar" 
            className="w-12 h-12 rounded-full bg-slate-700 border-2 border-slate-600"
          />
          <div>
            <div className="text-xs text-slate-400 font-medium">Balance</div>
            <div className="text-2xl font-black text-yellow-400 flex items-center gap-1">
              ₹ {currentUser?.balance.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-medium mb-1">
            {currentUser && currentUser.spinsLeft > 0 ? "Free Spins" : "Spin Cost"}
          </div>
          <div className={`px-3 py-1 rounded-full font-bold text-sm inline-flex items-center gap-1 ${
             currentUser && currentUser.spinsLeft > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {currentUser && currentUser.spinsLeft > 0 
               ? <>{currentUser.spinsLeft} Left</> 
               : <>{SPIN_COST} Coins</>
            }
          </div>
        </div>
      </div>

      {/* Referral Banner */}
      <div className="mb-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-4 flex items-center justify-between border border-purple-500/30 cursor-pointer hover:opacity-90 transition-opacity"
           onClick={() => {
             const link = `${window.location.origin}?ref=${currentUser?.referralCode}`;
             navigator.clipboard.writeText(link);
             addNotification("Link copied to clipboard!", "success");
           }}>
        <div className="flex items-center gap-3">
           <Gift className="text-yellow-400 w-8 h-8 animate-bounce" />
           <div>
             <h3 className="font-bold text-white text-sm">Refer & Earn</h3>
             <p className="text-xs text-purple-200">Get 200 coins per friend</p>
           </div>
        </div>
        <div className="bg-white/10 p-2 rounded-lg">
           <p className="text-xs font-mono text-purple-200">{currentUser?.referralCode}</p>
        </div>
      </div>

      {/* Wheel */}
      <div className="relative mb-8 mt-4">
        <SpinWheel 
          segments={WHEEL_SEGMENTS} 
          isSpinning={isSpinning} 
          onSpinComplete={handleSpinComplete}
          targetIndex={spinResultIndex}
        />
        
        {/* Spin Button */}
        <div className="flex justify-center mt-6">
          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={`
              w-full max-w-xs py-4 rounded-full font-black text-xl shadow-lg transform transition-all 
              ${isSpinning 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed scale-95' 
                : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 hover:scale-105 active:scale-95 text-white shadow-pink-500/30'
              }
            `}
          >
            {isSpinning ? 'Spinning...' : currentUser && currentUser.spinsLeft > 0 ? 'SPIN NOW' : `SPIN (₹${SPIN_COST})`}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setCurrentView(View.DEPOSIT)}
          className="bg-green-600/10 border border-green-600/30 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-green-600/20 transition-colors"
        >
          <div className="bg-green-500 rounded-full p-2"><CreditCard className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-green-400">Deposit</span>
        </button>
        <button 
           onClick={() => setCurrentView(View.WITHDRAW)}
           className="bg-blue-600/10 border border-blue-600/30 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-600/20 transition-colors"
        >
          <div className="bg-blue-500 rounded-full p-2"><Wallet className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-blue-400">Withdraw</span>
        </button>
      </div>
    </div>
  );

  const renderDeposit = () => (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-1 hover:bg-slate-800 rounded-full"><ArrowRight className="rotate-180" /></button>
        Add Funds
      </h2>

      <div className="bg-slate-800 rounded-xl p-6 mb-6 text-center border border-slate-700">
        <p className="text-slate-400 text-sm mb-2">Send UPI Payment to</p>
        <div className="text-2xl font-mono font-bold text-yellow-400 bg-slate-900 py-3 rounded-lg select-all mb-2">
          {ADMIN_UPI_ID}
        </div>
        <p className="text-xs text-slate-500">Copy this ID and pay via PhonePe/GPay/Paytm</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400">Amount Paid (₹)</label>
          <input 
            type="number" 
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="e.g. 500"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">UTR / Transaction Ref No.</label>
          <input 
            type="text" 
            value={depositUTR}
            onChange={e => setDepositUTR(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="e.g. 321456987456"
          />
        </div>
        <button 
          onClick={handleDeposit}
          disabled={isProcessing}
          className="w-full bg-green-600 py-4 rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
        >
          {isProcessing ? <RotateCw className="animate-spin" /> : <CheckCircle2 />}
          {isProcessing ? 'Verifying...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );

  const renderWithdraw = () => (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-1 hover:bg-slate-800 rounded-full"><ArrowRight className="rotate-180" /></button>
        Withdraw Winnings
      </h2>

      <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700 flex justify-between items-center">
        <span className="text-slate-400">Available Balance</span>
        <span className="text-xl font-bold text-green-400">₹ {currentUser?.balance.toFixed(2)}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400">Withdraw Amount (Min ₹100)</label>
          <input 
            type="number" 
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. 200"
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">Your UPI ID</label>
          <input 
            type="text" 
            value={withdrawUPI}
            onChange={e => setWithdrawUPI(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. mobile@upi"
          />
        </div>
        <button 
          onClick={handleWithdraw}
          className="w-full bg-blue-600 py-4 rounded-xl font-bold hover:bg-blue-500 mt-4"
        >
          Request Withdrawal
        </button>
      </div>
    </div>
  );

  const renderHistory = () => {
    // Show only current user transactions
    const txs = dbService.getTransactions({ phone: currentUser?.phone });
    
    return (
      <div className="p-4 max-w-lg mx-auto pb-20">
         <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <button onClick={() => setCurrentView(View.DASHBOARD)} className="p-1 hover:bg-slate-800 rounded-full"><ArrowRight className="rotate-180" /></button>
          Transactions
        </h2>
        
        <div className="space-y-3">
          {txs.length === 0 && <div className="text-center text-slate-500 py-10">No history yet</div>}
          {txs.map(tx => (
            <div key={tx.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${
                    tx.type === TransactionType.DEPOSIT ? 'text-green-400' : 
                    tx.type === TransactionType.WITHDRAWAL ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {tx.type.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.status === TransactionStatus.SUCCESS ? 'bg-green-500/20 text-green-300' :
                    tx.status === TransactionStatus.PENDING ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{new Date(tx.date).toLocaleString()}</div>
                <div className="text-xs text-slate-600 mt-0.5 max-w-[200px] truncate">{tx.details}</div>
              </div>
              <div className={`font-bold text-lg ${
                [TransactionType.DEPOSIT, TransactionType.GAME_WIN, TransactionType.BONUS, TransactionType.REFERRAL_BONUS].includes(tx.type) 
                ? 'text-green-400' 
                : 'text-red-400'
              }`}>
                {[TransactionType.DEPOSIT, TransactionType.GAME_WIN, TransactionType.BONUS, TransactionType.REFERRAL_BONUS].includes(tx.type) ? '+' : '-'}
                ₹{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Renders: Admin App ---

  const renderAdminDashboard = () => {
    // Filter Lists Logic
    const filteredTx = adminTxList.filter(tx => {
      // 1. Filter by Tab
      if (adminTab === 'DEPOSITS' && tx.type !== TransactionType.DEPOSIT) return false;
      if (adminTab === 'WITHDRAWALS' && tx.type !== TransactionType.WITHDRAWAL) return false;
      if (adminTab === 'USERS') return false; // Handled separately

      // 2. Filter by Status
      if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;

      // 3. Filter by Date
      if (filterDateStart) {
        if (new Date(tx.date) < new Date(filterDateStart)) return false;
      }
      if (filterDateEnd) {
        const nextDay = new Date(filterDateEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        if (new Date(tx.date) >= nextDay) return false;
      }
      return true;
    });

    return (
      <div className="p-4 max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-red-500" /> Admin Panel
          </h1>
          <button onClick={handleLogout} className="text-sm text-red-400 font-bold border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-900/20">
            Logout
          </button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['USERS', 'DEPOSITS', 'WITHDRAWALS'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setAdminTab(tab as any)}
               className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                 adminTab === tab ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
               }`}
             >
               {tab}
             </button>
          ))}
        </div>

        {/* Filter Toolbar (Only for transactions) */}
        {adminTab !== 'USERS' && (
          <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700 flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[150px]">
               <label className="text-xs text-slate-400 mb-1 block">Status</label>
               <select 
                 value={filterStatus}
                 onChange={e => setFilterStatus(e.target.value as any)}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
               >
                 <option value="ALL">All Status</option>
                 <option value={TransactionStatus.PENDING}>Pending</option>
                 <option value={TransactionStatus.SUCCESS}>Success</option>
                 <option value={TransactionStatus.REJECTED}>Rejected</option>
               </select>
             </div>
             <div className="flex-1 min-w-[150px]">
               <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
               <input 
                 type="date"
                 value={filterDateStart}
                 onChange={e => setFilterDateStart(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
               />
             </div>
             <div className="flex-1 min-w-[150px]">
               <label className="text-xs text-slate-400 mb-1 block">End Date</label>
               <input 
                 type="date"
                 value={filterDateEnd}
                 onChange={e => setFilterDateEnd(e.target.value)}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
               />
             </div>
             <button 
               onClick={() => { setFilterStatus('ALL'); setFilterDateStart(''); setFilterDateEnd(''); }}
               className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-300"
               title="Clear Filters"
             >
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          {adminTab === 'USERS' ? (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-800 text-slate-400 uppercase">
                   <tr>
                     <th className="p-4">User</th>
                     <th className="p-4">Phone</th>
                     <th className="p-4">Balance</th>
                     <th className="p-4">Refs</th>
                     <th className="p-4">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {adminUserList.map(u => (
                     <tr key={u.uid} className="hover:bg-slate-800/50">
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.phone}`} className="w-8 h-8 rounded-full bg-slate-700" alt="" />
                           <span className="font-mono text-xs text-slate-500">{u.uid.slice(0,5)}</span>
                         </div>
                       </td>
                       <td className="p-4">{u.phone}</td>
                       <td className="p-4 font-bold text-green-400">₹{u.balance}</td>
                       <td className="p-4">{u.totalReferrals || 0}</td>
                       <td className="p-4 flex gap-2">
                         <button onClick={() => adminAdjustBalance(u.phone, 100)} className="bg-green-600/20 text-green-500 px-2 py-1 rounded text-xs hover:bg-green-600/30">+100</button>
                         <button onClick={() => adminAdjustBalance(u.phone, -100)} className="bg-red-600/20 text-red-500 px-2 py-1 rounded text-xs hover:bg-red-600/30">-100</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-800 text-slate-400 uppercase">
                   <tr>
                     <th className="p-4">Date</th>
                     <th className="p-4">User</th>
                     <th className="p-4">Details</th>
                     <th className="p-4">Amount</th>
                     <th className="p-4">Status</th>
                     <th className="p-4">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {filteredTx.length === 0 && (
                     <tr><td colSpan={6} className="p-8 text-center text-slate-500">No records found</td></tr>
                   )}
                   {filteredTx.map(tx => (
                     <tr key={tx.id} className="hover:bg-slate-800/50">
                       <td className="p-4 text-slate-500 text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                       <td className="p-4">{tx.userPhone}</td>
                       <td className="p-4 text-xs text-slate-400 max-w-[150px] truncate" title={tx.details}>{tx.details}</td>
                       <td className="p-4 font-bold text-white">₹{tx.amount}</td>
                       <td className="p-4">
                         <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === TransactionStatus.SUCCESS ? 'bg-green-500/20 text-green-300' :
                            tx.status === TransactionStatus.PENDING ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {tx.status}
                          </span>
                       </td>
                       <td className="p-4">
                         {tx.status === TransactionStatus.PENDING && (
                           <div className="flex gap-2">
                             <button onClick={() => adminActionTx(tx.id, 'APPROVE')} className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"><CheckCircle2 className="w-4 h-4" /></button>
                             <button onClick={() => adminActionTx(tx.id, 'REJECT')} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"><XCircle className="w-4 h-4" /></button>
                           </div>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render Switch ---

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-purple-500/30">
      
      {/* Top Bar (for non-auth screens) */}
      {[View.AUTH_SELECTION, View.USER_LOGIN, View.ADMIN_LOGIN, View.REFERRAL_ONBOARDING].indexOf(currentView) === -1 && !isAdmin && (
        <nav className="fixed top-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              SpinPro
            </h1>
            <div className="flex items-center gap-4">
              <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" className="p-2 text-green-400 hover:bg-white/5 rounded-full transition-colors">
                <MessageCircle size={20} />
              </a>
              <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className={`
        ${[View.AUTH_SELECTION, View.USER_LOGIN, View.ADMIN_LOGIN, View.REFERRAL_ONBOARDING].indexOf(currentView) === -1 && !isAdmin ? 'pt-20' : ''}
      `}>
        {currentView === View.AUTH_SELECTION && renderAuthSelection()}
        {currentView === View.USER_LOGIN && renderUserLogin()}
        {currentView === View.ADMIN_LOGIN && renderAdminLogin()}
        {currentView === View.REFERRAL_ONBOARDING && renderReferralOnboarding()}
        
        {currentView === View.DASHBOARD && renderDashboard()}
        {currentView === View.DEPOSIT && renderDeposit()}
        {currentView === View.WITHDRAW && renderWithdraw()}
        {currentView === View.HISTORY && renderHistory()}
        
        {currentView === View.ADMIN_DASHBOARD && renderAdminDashboard()}
      </main>

      {/* User Bottom Navigation */}
      {[View.AUTH_SELECTION, View.USER_LOGIN, View.ADMIN_LOGIN, View.REFERRAL_ONBOARDING, View.ADMIN_DASHBOARD].indexOf(currentView) === -1 && (
        <div className="fixed bottom-0 w-full bg-[#0f172a] border-t border-white/5 pb-safe">
          <div className="max-w-lg mx-auto flex justify-around p-2">
            <button 
              onClick={() => setCurrentView(View.DASHBOARD)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.DASHBOARD ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <RotateCw size={24} />
              <span className="text-[10px] font-medium">Spin</span>
            </button>
            <button 
              onClick={() => setCurrentView(View.HISTORY)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${currentView === View.HISTORY ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <History size={24} />
              <span className="text-[10px] font-medium">History</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={24} />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications Toast */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`
            pointer-events-auto p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300
            ${n.type === 'success' ? 'bg-green-600 text-white' : 
              n.type === 'error' ? 'bg-red-600 text-white' : 
              n.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white border border-slate-700'}
          `}>
            {n.type === 'success' ? <CheckCircle2 size={20} /> :
             n.type === 'error' ? <XCircle size={20} /> :
             n.type === 'warning' ? <AlertTriangle size={20} /> : <Bell size={20} />}
            <span className="font-medium text-sm">{n.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default App;