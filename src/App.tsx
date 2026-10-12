import { AutoImposer } from "./components/AutoImposer";
import { FormatStandardizer } from "./components/FormatStandardizer";
import { TtsCorrection } from "./components/TtsCorrection";
import { ClientIntake } from "./components/ClientIntake";
import { AgentWatcher } from "./components/AgentWatcher";
import { ClientDirectory } from "./components/ClientDirectory";
import { SettingsView } from "./components/SettingsView";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import {
  LayoutDashboard,
  LayoutGrid,
  FileText,
  Mic,
  QrCode,
  Activity,
  FolderOpen,
  Settings,
  CheckCircle,
  Search,
  ArrowRight,
  Coffee,
  ShoppingCart,
  Wallet,
  Car,
  Tv,
  MoreHorizontal,
  Lock,
  Eye,
  Moon,
  Sun,
  Check,
  IdCard
} from "lucide-react";

type NavItemValue =
  | "dashboard"
  | "imposer"
  | "standardizer"
  | "tts"
  | "intake"
  | "watcher"
  | "directory"
  | "settings";

export default function App() {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<NavItemValue>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [imposerFile, setImposerFile] = useState<File | null>(null);
  const [standardizerFile, setStandardizerFile] = useState<File | null>(null);
  
  // Firebase Auth states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Firestore transaction states
  const [transactions, setTransactions] = useState<any[]>([]);

  // Transaction form states
  const [showAddTx, setShowAddTx] = useState<boolean>(false);
  const [newTxTitle, setNewTxTitle] = useState<string>("");
  const [newTxAmount, setNewTxAmount] = useState<string>("");
  const [newTxCategory, setNewTxCategory] = useState<string>("Standard");
  const [newTxType, setNewTxType] = useState<"income" | "expense">("expense");

  const [welcomeMessage, setWelcomeMessage] = useState<string>("");

  useEffect(() => {
    const welcomeTemplates = [
      "Welcome back, {name}",
      "Great to see you, {name}",
      "Ready to print, {name}?",
      "System online. Hello, {name}",
      "Good day, {name}",
      "Have a productive session, {name}",
      "Everything is ready for you, {name}",
      "Let's get some work done, {name}",
      "Welcome to PrintDesk, {name}"
    ];
    const name = user?.displayName?.split(" ")[0] || "User";
    const randomMsg = welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)].replace("{name}", name);
    setWelcomeMessage(randomMsg);
  }, [user]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as "light" | "dark";
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  // Auth changed listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Profile dropdown outside click listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Listen to Firestore Transactions in real-time
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const txColRef = collection(db, "users", user.uid, "transactions");
    const q = query(txColRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default transactions to Firestore
        const defaultTx = [
          { id: "tx1", title: "Blue Bottle Coffee", category: "Food & Drink", amount: 6.50, type: "expense" },
          { id: "tx2", title: "Whole Foods Market", category: "Groceries", amount: 142.30, type: "expense" },
          { id: "tx3", title: "Stripe Payout", category: "Income", amount: 4200.00, type: "income" },
          { id: "tx4", title: "Uber Technologies", category: "Transport", amount: 24.10, type: "expense" },
          { id: "tx5", title: "Netflix Subscription", category: "Entertainment", amount: 19.99, type: "expense" },
        ];
        
        try {
          for (const tx of defaultTx) {
            await setDoc(doc(db, "users", user.uid, "transactions", tx.id), {
              ...tx,
              timestamp: serverTimestamp(),
            });
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/transactions`);
          } catch (err) {
            console.warn("Firestore default transactions seed error:", err);
          }
        }
      } else {
        const txs: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          txs.push({
            id: doc.id,
            title: data.title,
            category: data.category,
            amount: data.amount,
            type: data.type,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });
        setTransactions(txs);
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/transactions`);
      } catch (err) {
        console.warn("Firestore transactions sync warning:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Default sample print logs (maximum 5 entries showing date & time for previous prints)
  const defaultPrintLogs = [
    `${new Date(Date.now() - 1000 * 60 * 25).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(Date.now() - 1000 * 60 * 25).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Auto-Imposer printed 12 photos (A3)`,
    `${new Date(Date.now() - 1000 * 60 * 120).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(Date.now() - 1000 * 60 * 120).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Printed Passport 35x45mm layout`,
    `${new Date(Date.now() - 1000 * 60 * 1440).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(Date.now() - 1000 * 60 * 1440).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Format-Standardizer printed doc_v2.pdf`,
    `${new Date(Date.now() - 1000 * 60 * 2880).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(Date.now() - 1000 * 60 * 2880).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Auto-Imposer printed 24 photos (A4)`,
    `${new Date(Date.now() - 1000 * 60 * 4320).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(Date.now() - 1000 * 60 * 4320).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Printed Custom Grid 2x2 in layout`,
  ];

  // Listen to Firestore Activity Logs in real-time (Only print logs, max 5)
  useEffect(() => {
    if (!user) {
      setMessages(defaultPrintLogs.slice(0, 5));
      return;
    }

    const logsColRef = collection(db, "users", user.uid, "activity_logs");
    const q = query(logsColRef, orderBy("timestamp", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.message && (data.isPrintLog || data.message.toLowerCase().includes("print"))) {
          logs.push(data.message);
        }
      });
      if (logs.length === 0) {
        setMessages(defaultPrintLogs.slice(0, 5));
      } else {
        setMessages(logs.slice(0, 5));
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/activity_logs`);
      } catch (err) {
        console.warn("Firestore activity logs sync warning:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const addPrintLog = async (logText: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const formattedLog = `${dateStr} ${timeStr} - ${logText}`;

    if (user) {
      const id = doc(collection(db, "users", user.uid, "activity_logs")).id;
      try {
        await setDoc(doc(db, "users", user.uid, "activity_logs", id), {
          id,
          message: formattedLog,
          isPrintLog: true,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/activity_logs/${id}`);
        } catch (err) {
          console.warn("Firestore addPrintLog write error:", err);
        }
      }
    } else {
      setMessages(prev => [formattedLog, ...prev.filter(m => m !== formattedLog)].slice(0, 5));
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const handleDragEnd = () => setDraggedCardId(null);
    const handleDrop = () => setDraggedCardId(null);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragleave", (e) => {
      if (!e.clientX && !e.clientY) setDraggedCardId(null);
    });
    return () => {
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  const triggerNotify = (name: string) => {
    // Silent notification bypassed per user request to remove toast UI
    console.log(`Triggered action: ${name}`);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      triggerNotify("Signed in with Google");
    } catch (err) {
      console.error(err);
      triggerNotify("Sign in failed");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      triggerNotify("Signed out");
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareID = async () => {
    triggerNotify("Share Workspace ID");
    const shareId = user?.uid ? user.uid.substring(0, 10).toUpperCase() : "PRINTDESK-8842-WS";
    try {
      await navigator.clipboard.writeText(shareId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
    // CRITICAL REQUIREMENT: Do NOT save or display anything in the Activity Log when Share ID is clicked!
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxTitle.trim() || !newTxAmount || !user) return;
    
    const amountVal = parseFloat(newTxAmount);
    if (isNaN(amountVal)) return;

    const txId = doc(collection(db, "users", user.uid, "transactions")).id;
    try {
      await setDoc(doc(db, "users", user.uid, "transactions", txId), {
        id: txId,
        title: newTxTitle.trim(),
        category: newTxCategory.trim(),
        amount: amountVal,
        type: newTxType,
        timestamp: serverTimestamp(),
      });
      
      // Reset form
      setNewTxTitle("");
      setNewTxAmount("");
      setShowAddTx(false);
      triggerNotify("Transaction saved to Firestore");
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/transactions/${txId}`);
      } catch (err) {
        console.warn("Firestore transaction write error:", err);
      }
    }
  };

  const handleNavClick = (item: NavItemValue, displayName: string) => {
    setActiveItem(item);
    triggerNotify(displayName);
  };

  return (
    <div className="bg-background h-screen max-h-screen flex flex-col overflow-hidden font-sans select-none antialiased text-foreground">

      {/* TOP SINGLE PARENT HEADER BAR (TOGGLES ON LEFT ALIGNED WITH NAV, STATUS & PROFILE ON RIGHT) */}
      <header className="flex justify-between items-center w-full px-5 py-2.5 bg-card/60 backdrop-blur-md shrink-0 z-30" id="top-header-section">
        
        {/* TOP LEFT: 3 TOGGLES (SIDEBAR, SCAN ID, THEME) */}
        <div className="flex items-center gap-2 shrink-0" id="top-left-toggles">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 bg-card hover:bg-accent border border-border rounded-xl flex items-center justify-center text-foreground transition-all duration-200 active:scale-95 shadow-2xs outline-none cursor-pointer"
            aria-label="Toggle Sidebar"
            title={isSidebarOpen ? "Collapse Sidebar" : "Open Workspace Sidebar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="4" ry="4"/>
              <path d="M9 3v18"/>
              {isSidebarOpen && <path d="m15 15-3-3 3-3"/>}
            </svg>
          </button>

          <button 
            onClick={() => triggerNotify("Scan ID")}
            className="w-9 h-9 bg-card hover:bg-accent border border-border rounded-xl flex items-center justify-center text-foreground transition-all duration-200 active:scale-95 shadow-2xs outline-none cursor-pointer"
            aria-label="Scan ID"
            title="Scan ID"
          >
            <IdCard className="w-4 h-4" />
          </button>

          <button 
            onClick={toggleTheme}
            className="w-9 h-9 bg-card hover:bg-accent border border-border rounded-xl flex items-center justify-center text-foreground transition-all duration-200 active:scale-95 shadow-2xs outline-none cursor-pointer"
            aria-label="Toggle Theme"
            title="Toggle Dark/Light Mode"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        {/* TOP RIGHT SLEEK STATUS BAR & PROFILE */}
        <div className="flex items-center gap-3 shrink-0" id="top-bar-and-profile">
          <div className="bg-card border border-border backdrop-blur-md rounded-[16px] px-5 py-1.5 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] select-none h-[38px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground" id="header-system-status">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-muted-foreground font-medium">System:</span>
              <span className="text-foreground">Online</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1" id="header-queue-status">
              <span className="text-muted-foreground font-medium">Queue:</span>
              <span className="text-foreground">0 pending</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1" id="header-today-prints">
              <span className="text-muted-foreground font-medium">Today:</span>
              <span className="text-foreground">42 Prints</span>
            </div>
          </div>

          {/* PROFILE CIRCLE WITH OUTSIDE FLOATING WHITE RING */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <div 
                className="relative cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group" 
                id="header-profile-avatar"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {/* Floating outer white ring */}
                <div className="absolute -inset-1 rounded-full border-2 border-border shadow-[0_2px_10px_rgba(0,0,0,0.06)] bg-transparent z-10 pointer-events-none ring-1 ring-border/40"></div>
                
                {/* Profile Image container */}
                <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-muted flex items-center justify-center relative">
                  <img 
                    src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256"} 
                    alt="Staff Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Online indicator dot */}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-20"></span>
              </div>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                  <div className="px-2 py-1.5 border-b border-border mb-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{user.displayName || "User"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email || ""}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }} 
                    className="w-full text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1.5 rounded-lg transition-colors outline-none cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-card text-foreground hover:bg-accent border border-border text-xs font-semibold py-1.5 px-4 rounded-full flex items-center gap-2.5 transition-all shadow-xs hover:shadow-sm active:scale-95 outline-none cursor-pointer h-[38px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span className="font-semibold text-foreground">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA BELOW HEADER (SIDEBAR + CORE DISPLAY STAGE) */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">

        {/* SIDEBAR PANEL */}
        <div className={`flex flex-col items-stretch h-full shrink-0 w-[280px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSidebarOpen ? "ml-0 px-5 py-4 opacity-100" : "-ml-[280px] px-5 py-4 opacity-0 pointer-events-none"}`}>
          
          {/* VERTICAL CONTAINER - CENTERED NAVIGATION */}
          <div className="flex flex-col gap-3 h-full overflow-hidden justify-center">

            {/* COMBINED SIDEBAR NAV */}
            <nav className="sidebar-nav border border-border flex flex-col gap-2 w-full min-h-0 custom-scrollbar overflow-y-auto shrink-0" id="sidebar-navigation">
              
              {/* NAVIGATION SECTION */}
              <div className="flex flex-col w-full px-1 mb-1 mt-1">
                <p className="nav-section text-left font-bold tracking-widest uppercase text-[10px] text-muted-foreground mb-2 mt-1 ml-2">Overview</p>
              
              <button
                id="nav-dashboard"
                className={`nav-item ${activeItem === "dashboard" ? "active" : ""}`}
                onClick={() => handleNavClick("dashboard", "Dashboard")}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Dashboard
              </button>
              
              <button
                id="nav-imposer"
                className={`nav-item ${activeItem === "imposer" ? "active" : ""}`}
                onClick={() => handleNavClick("imposer", "Auto-Imposer")}
              >
                <LayoutGrid className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Auto-Imposer
              </button>
              
              <button
                id="nav-standardizer"
                className={`nav-item ${activeItem === "standardizer" ? "active" : ""}`}
                onClick={() => handleNavClick("standardizer", "Standardizer")}
              >
                <FileText className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Standardizer
              </button>
              
              <button
                id="nav-tts"
                className={`nav-item ${activeItem === "tts" ? "active" : ""}`}
                onClick={() => handleNavClick("tts", "TTS Correction")}
              >
                <Mic className="w-4 h-4 shrink-0 transition-transform duration-200" />
                TTS Correction
              </button>
              
              <button
                id="nav-intake"
                className={`nav-item ${activeItem === "intake" ? "active" : ""}`}
                onClick={() => handleNavClick("intake", "Client Intake")}
              >
                <QrCode className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Client Intake
              </button>

              <div className="w-full h-px bg-border my-3 mx-1"></div>
              <p className="nav-section text-left font-bold tracking-widest uppercase text-[10px] text-muted-foreground mb-2 ml-2">System</p>
              
              <button
                id="nav-watcher"
                className={`nav-item ${activeItem === "watcher" ? "active" : ""}`}
                onClick={() => handleNavClick("watcher", "Agent Information")}
              >
                <Activity className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Agent Information
              </button>
              
              <button
                id="nav-directory"
                className={`nav-item ${activeItem === "directory" ? "active" : ""}`}
                onClick={() => handleNavClick("directory", "Client History")}
              >
                <FolderOpen className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Client History
              </button>
              
              <button
                id="nav-settings"
                className={`nav-item ${activeItem === "settings" ? "active" : ""}`}
                onClick={() => handleNavClick("settings", "Settings")}
              >
                <Settings className="w-4 h-4 shrink-0 transition-transform duration-200" />
                Settings
              </button>
              </div>
            </nav>

          </div>
        </div>

        {/* CORE DISPLAY STAGE */}
        <div 
          id="core-display-stage" 
          className="flex-1 flex flex-col p-3 sm:p-4 min-w-0 h-full max-h-full overflow-hidden"
        >

          {/* CONDITIONALLY RENDER CONTENT BASED ON ACTIVE NAV */}
          {activeItem === "dashboard" && (
            <div 
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full"
            >
              {/* THE MAIN HERO SHOWCASE (CENTERS BOTH SEARCH BAR & BENTO CARD GRIDS) */}
              <div className={`flex flex-col justify-center items-center w-full max-w-7xl mx-auto py-4 transition-all duration-300 ease-in-out px-4 ${scrollTop > 60 ? "opacity-0 scale-95 -translate-y-8 pointer-events-none select-none" : "opacity-100 scale-100 translate-y-0 pointer-events-auto"}`}>
            
            {/* GEMINI-STYLE DYNAMIC GREETING */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-32 mb-8 text-center"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-sans">
                {welcomeMessage}
              </h1>
            </motion.div>

            {/* SHADCN-STYLE SEARCH BAR */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex justify-center mb-10 w-full"
            >
              <div 
                id="top-search-bar" 
                className="bg-card px-4 py-2 rounded-[24px] border border-border shadow-[0_4px_24px_rgb(0,0,0,0.02)] flex items-center gap-3 w-full max-w-[480px] hover:border-accent focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/20 transition-all duration-200 h-[52px]"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                <input
                  type="text"
                  id="top-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search for files..."
                  className="bg-transparent text-xs sm:text-sm text-foreground placeholder-muted-foreground outline-none w-full border-0 p-0 focus:ring-none"
                />
                  <button
                    id="search-send-btn"
                    type="button"
                    className="group h-[36px] w-[36px] hover:w-[84px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-[18px] flex items-center justify-center transition-all duration-300 shrink-0 translate-x-1 overflow-hidden"
                    onClick={() => triggerNotify(`Searching for "${searchQuery}"`)}
                    title="Search"
                  >
                    <div className="flex items-center justify-center whitespace-nowrap">
                      <span className="text-[11px] font-medium max-w-0 opacity-0 group-hover:max-w-[40px] group-hover:opacity-100 group-hover:mr-1.5 transition-all duration-300 ease-out select-none leading-none">
                        Send
                      </span>
                      <ArrowRight className="w-4 h-4 text-primary-foreground shrink-0" />
                    </div>
                  </button>
              </div>
            </motion.div>
            
            {/* THE BENTO MASTER GRID - Live filter matching the search bar query */}
            {(() => {
              const cards = [
                {
                  id: "card-auto-imposer",
                  title: "Auto-Imposer",
                  icon: <LayoutGrid className="w-6 h-6 text-foreground" />,
                  desc: "Scale & tile passport / photos to standard sheet sizes.",
                  btnText: "Configure Imposition",
                  notifyName: "Auto-Imposer",
                  keywords: ["imposer", "passport", "photos", "scale", "tile", "sheet"]
                },
                {
                  id: "card-format-standardizer",
                  title: "Format-Standardizer",
                  icon: <FileText className="w-6 h-6 text-foreground" />,
                  desc: "PDF/A conversion pipeline & DPI normalization.",
                   btnText: "Access Pipeline",
                  notifyName: "Format-Standardizer",
                  keywords: ["standardizer", "pdf", "dpi", "normalization", "pipeline"]
                },
                {
                  id: "card-tts-correction",
                  title: "Ai Transcription",
                  icon: <Mic className="w-6 h-6 text-foreground" />,
                  desc: "Voice-to-text transcription with OCR & perspective correction for dirty docs.",
                  btnText: "Correct Transcript",
                  notifyName: "TTS Correction",
                  keywords: ["tts", "voice", "transcription", "ocr", "perspective", "correction", "transcript", "audio", "mic"]
                },
                {
                  id: "card-client-intake",
                  title: "Client Intake",
                  icon: <QrCode className="w-6 h-6 text-foreground" />,
                  desc: "apply clients info into the document",
                  btnText: "Show QR Code",
                  notifyName: "Client Intake",
                  keywords: ["client", "intake", "qr", "latex", "pdf", "template", "checkout"]
                }
              ];

              const q = searchQuery.toLowerCase().trim();
              const filtered = cards.filter(c => {
                if (!q) return true;
                return (
                  c.title.toLowerCase().includes(q) ||
                  c.desc.toLowerCase().includes(q) ||
                  c.keywords.some(k => k.includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-20 px-4 bg-card rounded-3xl border border-border shadow-xs max-w-md mx-auto fade-in">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">No tools matched</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      Try searching for <span className="font-medium text-foreground">"pdf"</span>, <span className="font-medium text-foreground">"qr"</span>, <span className="font-medium text-foreground">"voice"</span>, or <span className="font-medium text-foreground">"photos"</span>.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full" id="landing-bento-grid">
                  {filtered.map((card, index) => (
                    <motion.div 
                      key={card.id} 
                      initial={{ opacity: 0, scale: 0.95, y: 16 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ 
                        duration: 0.35, 
                        ease: "easeOut",
                        delay: index * 0.05 
                      }}
                      className="module-card font-sans relative transition-all duration-300 ease-in-out" 
                      id={card.id}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDraggedCardId(card.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (draggedCardId === card.id) {
                          setDraggedCardId(null);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        if (draggedCardId !== card.id) {
                          setDraggedCardId(card.id);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDraggedCardId(null);
                        let droppedFile: File | null = null;
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          droppedFile = e.dataTransfer.files[0];
                        }
                        if (card.id === "card-auto-imposer") {
                          setActiveItem("imposer");
                          if (droppedFile) setImposerFile(droppedFile);
                        } else if (card.id === "card-format-standardizer") {
                          setActiveItem("standardizer");
                          if (droppedFile) setStandardizerFile(droppedFile);
                        } else if (card.id === "card-tts-correction") {
                          setActiveItem("tts");
                        } else if (card.id === "card-client-intake") {
                          setActiveItem("intake");
                        } else {
                          triggerNotify(`Drop on ${card.notifyName}`);
                        }
                      }}
                    >
                      <div className="icon-wrap">
                        {card.icon}
                      </div>
                      <h3 className="font-semibold text-foreground">{card.title}</h3>
                      <p className="card-desc">{card.desc}</p>
                      
                      {draggedCardId === card.id ? (
                        <div className="drop-zone-active">
                          <span>Drop file here</span>
                        </div>
                      ) : (
                        <button 
                          className="btn-cfg"
                          onClick={() => {
                            if (card.id === "card-auto-imposer") {
                              setActiveItem("imposer");
                            } else if (card.id === "card-format-standardizer") {
                              setActiveItem("standardizer");
                            } else if (card.id === "card-tts-correction") {
                              setActiveItem("tts");
                            } else if (card.id === "card-client-intake") {
                              setActiveItem("intake");
                            } else {
                              triggerNotify(card.notifyName);
                            }
                          }}
                        >
                          {card.btnText}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              );
            })()}

          </div>  {/* PRIVATE FINANCIAL RECORDS (SCROLL-TO-REVEAL) */}
          <div className="relative mt-8 mb-[14vh] pb-6 w-full max-w-4xl mx-auto min-h-[400px]">
            {/* The actual underlying financial overview content */}
            <div 
              className={`bg-card rounded-3xl border border-border shadow-[0_4px_24px_rgb(0,0,0,0.02)] flex flex-col lg:flex-row overflow-hidden w-full transition-all duration-300 ease-in-out ${
                scrollTop > 80 
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 scale-95 translate-y-4 pointer-events-none select-none"
              }`}
            >
              {/* RECENT TRANSACTIONS TABLE - LEFT SIDE COL-SPAN-2 */}
              <div className="p-6 flex flex-col justify-between h-full w-full lg:w-2/3 border-b lg:border-b-0 lg:border-r border-border" id="transactions-section">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-foreground text-base tracking-tight">Recent Transactions</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {user ? "Real-time activity from Firestore." : "Sign in to sync your transaction activity."}
                      </p>
                    </div>
                    {user && (
                      <button 
                        onClick={() => setShowAddTx(!showAddTx)}
                        className="rounded-full border border-border px-3.5 py-1 text-xs text-foreground font-semibold hover:bg-accent active:bg-muted transition-colors cursor-pointer outline-none"
                      >
                        {showAddTx ? "Cancel" : "Add Transaction"}
                      </button>
                    )}
                  </div>

                  {/* Add transaction form */}
                  {showAddTx && user && (
                    <form onSubmit={handleAddTransaction} className="bg-muted p-4 rounded-2xl border border-border mb-6 space-y-3 fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Title</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Starbucks Coffee"
                            value={newTxTitle}
                            onChange={(e) => setNewTxTitle(e.target.value)}
                            className="w-full bg-card border border-border text-xs rounded-xl p-2.5 outline-none focus:border-primary text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Amount ($)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            required
                            placeholder="e.g. 15.50"
                            value={newTxAmount}
                            onChange={(e) => setNewTxAmount(e.target.value)}
                            className="w-full bg-card border border-border text-xs rounded-xl p-2.5 outline-none focus:border-primary text-foreground"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Category</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Food & Drink"
                            value={newTxCategory}
                            onChange={(e) => setNewTxCategory(e.target.value)}
                            className="w-full bg-card border border-border text-xs rounded-xl p-2.5 outline-none focus:border-primary text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Type</label>
                          <select 
                            value={newTxType}
                            onChange={(e) => setNewTxType(e.target.value as "income" | "expense")}
                            className="w-full bg-card border border-border text-xs rounded-xl p-2.5 outline-none focus:border-primary text-foreground"
                          >
                            <option value="expense">Expense (-)</option>
                            <option value="income">Income (+)</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-neutral-900 dark:bg-white dark:text-black hover:opacity-90 font-semibold py-2 rounded-xl text-xs transition-all outline-none cursor-pointer"
                      >
                        Save to Firestore
                      </button>
                    </form>
                  )}

                  {/* Transaction list items */}
                  <div className="divide-y divide-border max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {user ? (
                      transactions.length === 0 ? (
                        <div className="text-center py-12 text-xs text-muted-foreground">
                          No transactions found. Seeding default templates...
                        </div>
                      ) : (
                        transactions.map((tx) => {
                          const isExpense = tx.type === "expense";
                          return (
                            <div key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0">
                                  {tx.category.toLowerCase().includes("coffee") || tx.category.toLowerCase().includes("drink") ? (
                                    <Coffee className="w-4 h-4 text-foreground" />
                                  ) : tx.category.toLowerCase().includes("groc") || tx.category.toLowerCase().includes("shop") ? (
                                    <ShoppingCart className="w-4 h-4 text-foreground" />
                                  ) : tx.category.toLowerCase().includes("income") || tx.category.toLowerCase().includes("salary") || tx.category.toLowerCase().includes("payout") ? (
                                    <Wallet className="w-4 h-4 text-foreground" />
                                  ) : tx.category.toLowerCase().includes("transport") || tx.category.toLowerCase().includes("ride") || tx.category.toLowerCase().includes("uber") ? (
                                    <Car className="w-4 h-4 text-foreground" />
                                  ) : (
                                    <Tv className="w-4 h-4 text-foreground" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold text-foreground text-xs sm:text-sm">{tx.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{tx.category}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3.5">
                                <div className="text-right">
                                  <p className={`font-bold text-xs sm:text-sm ${isExpense ? "text-foreground" : "text-emerald-600"}`}>
                                    {isExpense ? "-" : "+"}${tx.amount.toFixed(2)}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                    {new Date(tx.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      // Fallback when signed out: Render mock list with clear prompt overlay
                      <div className="relative">
                        <div className="absolute inset-0 bg-card/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-center z-10 px-4">
                          <Lock className="w-6 h-6 text-muted-foreground mb-2" />
                          <p className="text-xs font-semibold text-foreground">Transactions Locked</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Sign in with Google to initialize secure sync.</p>
                          <button 
                            onClick={loginWithGoogle}
                            className="mt-3 bg-card text-foreground hover:bg-accent border border-border text-[11px] font-semibold py-1.5 px-4 rounded-full flex items-center gap-2 transition-all shadow-xs hover:shadow-sm active:scale-95 outline-none cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </svg>
                            <span>Sign in with Google</span>
                          </button>
                        </div>
                        <div className="divide-y divide-border select-none pointer-events-none opacity-40">
                          {/* Item 1 */}
                          <div className="flex items-center justify-between py-3.5 first:pt-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0">
                                <Coffee className="w-4 h-4 text-foreground" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground text-xs sm:text-sm">Blue Bottle Coffee</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Food & Drink</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground text-xs sm:text-sm">-$6.50</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Today</p>
                            </div>
                          </div>
                          {/* Item 2 */}
                          <div className="flex items-center justify-between py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0">
                                <ShoppingCart className="w-4 h-4 text-foreground" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground text-xs sm:text-sm">Whole Foods Market</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Groceries</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground text-xs sm:text-sm">-$142.30</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Yesterday</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SAVINGS CIRCLE DOUGHNUT TARGET CARD - RIGHT SIDE COL-SPAN-1 */}
              <div className="p-6 flex flex-col justify-between h-full w-full lg:w-1/3">
                {/* Circular doughnut indicator */}
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      {/* background guide gray track */}
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="11"
                        className="text-muted"
                      />
                      {/* elegant 80% active progress indicator */}
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="11"
                        strokeDasharray="289.02"
                        strokeDashoffset="57.80"
                        strokeLinecap="round"
                        className="text-foreground transition-all duration-1000 ease-out"
              />
                    </svg>
                    {/* Absolute internal center figures */}
                    <div className="absolute text-center flex flex-col items-center justify-center">
                      <span className="font-extrabold text-foreground text-2xl tracking-tight">$24,000</span>
                      <span className="text-[10.5px] sm:text-[11px] text-muted-foreground font-semibold mt-1 tracking-tight">80% of $30,000</span>
                    </div>
                  </div>
                </div>

                {/* Projected summary details rows */}
                <div className="space-y-3.5 border-t border-border pt-5 mt-auto">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">Projected Finish</span>
                    <span className="font-bold text-foreground">October 2024</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="font-medium">Monthly Average</span>
                    <span className="font-bold text-foreground">$1,250</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span className="font-medium">Top Contributor</span>
                    <span className="font-bold text-foreground">Auto-Transfer</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
          </div>
          )}

          {activeItem === "imposer" && (
            <AutoImposer initialFile={imposerFile} onLogPrint={addPrintLog} />
          )}

          {activeItem === "standardizer" && (
            <FormatStandardizer initialFile={standardizerFile} onLogPrint={addPrintLog} />
          )}

          {activeItem === "tts" && (
            <TtsCorrection onLogPrint={addPrintLog} />
          )}

          {activeItem === "intake" && (
            <ClientIntake onLogPrint={addPrintLog} />
          )}

          {activeItem === "watcher" && (
            <AgentWatcher />
          )}

          {activeItem === "directory" && (
            <ClientDirectory onLogPrint={addPrintLog} />
          )}

          {activeItem === "settings" && (
            <SettingsView theme={theme} onToggleTheme={toggleTheme} userId={user?.uid} />
          )}

      </div>

    </div>

  </div>
  );
}
