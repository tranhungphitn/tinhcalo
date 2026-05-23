import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Meal, DailyGoal, Recipe, CustomFood } from "./types";
import { DEFAULT_GOAL, getSeededMeals } from "./utils/dummyData";
import MealLogger from "./components/MealLogger";
import MetricCircle from "./components/MetricCircle";

const AnalyticsCharts = React.lazy(() => import("./components/AnalyticsCharts"));
const CustomFoodsManager = React.lazy(() => import("./components/CustomFoodsManager"));

const TabLoadingPlaceholder = () => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs font-medium text-slate-400">Đang tải...</p>
  </div>
);
import {
  Sparkles,
  Settings2,
  ListFilter,
  Trash2,
  Plus,
  Flame,
  ChefHat,
  Apple,
  TrendingUp,
  Info,
  RotateCcw,
  Search,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Utensils,
  Download,
  FileSpreadsheet,
  LogIn,
  Smartphone,
  Share,
  MoreVertical,
  User,
  Lock
} from "lucide-react";

export default function App() {
  // --- Auth States ---
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; role: string } | null>(() => {
    const saved = localStorage.getItem("macro_tracker_user") || sessionStorage.getItem("macro_tracker_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loginUsername, setLoginUsername] = useState(() => {
    return localStorage.getItem("macro_tracker_remembered_username") || "";
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem("macro_tracker_remembered_password") || "";
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("macro_tracker_remember_me") === "true";
  });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- States ---
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(DEFAULT_GOAL);
  
  // Navigation tabs: Dinh dưỡng hôm nay, Nhật ký Ăn Uống, Dữ liệu Thức Ăn
  const [activeMainTab, setActiveMainTab] = useState<"nutrition" | "history" | "customFoods">("nutrition");
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);

  // Deletion Confirmation state (fixes browser confirm() blocking issue inside iframes)
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);

  // Goal Editor states
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalEditingCal, setGoalEditingCal] = useState(DEFAULT_GOAL.calories);
  const [goalEditingProt, setGoalEditingProt] = useState(DEFAULT_GOAL.protein);
  const [goalEditingCarb, setGoalEditingCarb] = useState(DEFAULT_GOAL.carb);
  const [goalEditingFat, setGoalEditingFat] = useState(DEFAULT_GOAL.fat);

  // Search/Filter Meals states
  const [mealSearchQuery, setMealSearchQuery] = useState("");
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  // Active section view tabs (all on standard single screen, just filtering logs)
  const [activeDateFilter, setActiveDateFilter] = useState<"all" | "today" | "past">("all");

  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const MEALS_PER_PAGE = 5;

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice outcome for install: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  // Load from backend database on mount/user change
  useEffect(() => {
    if (!currentUser) return;

    const fetchMeals = async () => {
      try {
        const res = await fetch("/api/meals", {
          cache: "no-store",
          headers: { "x-username": currentUser.username }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMeals(data);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải lịch sử ăn uống:", err);
      }
    };
    fetchMeals();

    const fetchCustomFoods = async () => {
      try {
        const res = await fetch("/api/custom-foods", {
          cache: "no-store",
          headers: { "x-username": currentUser.username }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCustomFoods(data);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách thực phẩm cá nhân:", err);
      }
    };
    fetchCustomFoods();

    // Specific user goal storage from backend database
    const fetchUserGoal = async () => {
      try {
        const res = await fetch("/api/goal", {
          cache: "no-store",
          headers: { "x-username": currentUser.username }
        });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed && typeof parsed.calories === "number") {
            setDailyGoal(parsed);
            setGoalEditingCal(parsed.calories);
            setGoalEditingProt(parsed.protein);
            setGoalEditingCarb(parsed.carb);
            setGoalEditingFat(parsed.fat);
          }
        }
      } catch (e) {
        console.error("Không thể tải mục tiêu dinh dưỡng từ backend:", e);
      }
    };
    fetchUserGoal();
  }, [currentUser]);



  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const userObj = {
          username: data.username,
          name: data.name,
          role: data.role
        };
        if (rememberMe) {
          localStorage.setItem("macro_tracker_user", JSON.stringify(userObj));
          localStorage.setItem("macro_tracker_remember_me", "true");
          localStorage.setItem("macro_tracker_remembered_username", loginUsername);
          localStorage.setItem("macro_tracker_remembered_password", loginPassword);
        } else {
          sessionStorage.setItem("macro_tracker_user", JSON.stringify(userObj));
          localStorage.setItem("macro_tracker_remember_me", "false");
          localStorage.removeItem("macro_tracker_user");
          localStorage.removeItem("macro_tracker_remembered_username");
          localStorage.removeItem("macro_tracker_remembered_password");
        }
        setCurrentUser(userObj);
      } else {
        setLoginError(data.error || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      setLoginError("Không thể kết nối đến máy chủ. Vui lòng thử lại!");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("macro_tracker_user");
    sessionStorage.removeItem("macro_tracker_user");
    setCurrentUser(null);
    setMeals([]);
    setCustomFoods([]);
    setDailyGoal(DEFAULT_GOAL);
    if (!rememberMe) {
      setLoginUsername("");
      setLoginPassword("");
    }
    setLoginError("");
  };

  // Reset page pagination on search/filter changes
  useEffect(() => {
    setHistoryPage(1);
  }, [mealSearchQuery, activeDateFilter]);

  // Sync to database
  const saveMealsToStorage = async (updatedMeals: Meal[]) => {
    setMeals(updatedMeals);
    if (!currentUser) return;
    
    try {
      await fetch("/api/meals", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-username": currentUser.username
        },
        body: JSON.stringify({ meals: updatedMeals })
      });
    } catch (err) {
      console.error("Lỗi khi đồng bộ dữ liệu ăn uống với server:", err);
    }
  };

  const saveGoalToStorage = async (updatedGoal: DailyGoal) => {
    setDailyGoal(updatedGoal);
    if (!currentUser) return;

    try {
      await fetch("/api/goal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-username": currentUser.username
        },
        body: JSON.stringify({ goal: updatedGoal })
      });
    } catch (err) {
      console.error("Lỗi khi đồng bộ dữ liệu mục tiêu với server:", err);
    }
  };

  const handleUpdateCustomFoods = async (updatedFoods: CustomFood[]) => {
    setCustomFoods(updatedFoods);
    if (!currentUser) return;

    try {
      await fetch("/api/custom-foods", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-username": currentUser.username
        },
        body: JSON.stringify({ customFoods: updatedFoods })
      });
    } catch (err) {
      console.error("Lỗi khi đồng bộ thực phẩm cá nhân với server:", err);
      throw err;
    }
  };

  // --- Handlers ---
  const handleAddMeal = (newMealData: Omit<Meal, "id">) => {
    const freshMeal: Meal = {
      ...newMealData,
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    const updated = [freshMeal, ...meals];
    saveMealsToStorage(updated);
  };

  const handleDeleteMeal = (id: string) => {
    const mealFound = meals.find((m) => m.id === id);
    if (mealFound) {
      setMealToDelete(mealFound);
    }
  };

  const confirmDeleteMeal = () => {
    if (mealToDelete) {
      const filtered = meals.filter((m) => m.id !== mealToDelete.id);
      saveMealsToStorage(filtered);
      setMealToDelete(null);
    }
  };

  const handleExportToExcel = () => {
    if (meals.length === 0) {
      alert("Không có dữ liệu lịch sử dinh dưỡng để xuất file.");
      return;
    }

    // Prepare food item rows
    const dataRows: any[] = [];
    
    // Sort meals from oldest to newest or newest to oldest. Let's do newest first
    const sortedMeals = [...meals].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedMeals.forEach((meal) => {
      const dateLocal = new Date(meal.timestamp);
      const formattedDate = dateLocal.toLocaleDateString("vi-VN");
      const formattedTime = dateLocal.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

      if (meal.items && meal.items.length > 0) {
        meal.items.forEach((item, index) => {
          dataRows.push({
            "Ngày ăn": formattedDate,
            "Giờ ăn": formattedTime,
            "Tên bữa ăn": index === 0 ? meal.mealName : "", // Group by empty cells for cleaner layout
            "Thực phẩm biệt lập / Món ăn": item.foodName,
            "Lượng dùng": item.quantity,
            "Kcal": item.calories,
            "Đạm / Protein (g)": item.protein,
            "Tinh bột / Carb (g)": item.carb,
            "Chất béo / Fat (g)": item.fat,
            "Tổng Calo bữa ăn (kcal)": index === 0 ? meal.total.calories : ""
          });
        });
      } else {
        dataRows.push({
          "Ngày ăn": formattedDate,
          "Giờ ăn": formattedTime,
          "Tên bữa ăn": meal.mealName,
          "Thực phẩm biệt lập / Món ăn": "-",
          "Lượng dùng": "-",
          "Kcal": 0,
          "Đạm / Protein (g)": 0,
          "Tinh bột / Carb (g)": 0,
          "Chất béo / Fat (g)": 0,
          "Tổng Calo bữa ăn (kcal)": meal.total.calories
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch sử dinh dưỡng");

    // Auto-fit column widths
    const max_row_lengths = dataRows.reduce((acc, row) => {
      Object.keys(row).forEach((key, idx) => {
        const valStr = String(row[key] !== null && row[key] !== undefined ? row[key] : "");
        const keyLen = key.length;
        const valLen = valStr.length;
        const maxLen = Math.max(keyLen, valLen);
        if (!acc[idx] || maxLen > acc[idx]) {
          acc[idx] = maxLen;
        }
      });
      return acc;
    }, [] as number[]);

    worksheet["!cols"] = max_row_lengths.map((len) => ({ wch: len + 3 }));

    const todayDateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Lich_su_dinh_duong_${todayDateStr}.xlsx`);
  };



  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: DailyGoal = {
      calories: Number(goalEditingCal) || 1200,
      protein: Number(goalEditingProt) || 50,
      carb: Number(goalEditingCarb) || 100,
      fat: Number(goalEditingFat) || 30,
    };
    saveGoalToStorage(updated);
    setIsEditingGoal(false);
  };

  // --- Calculations for Today's Total Intake ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayMeals = meals.filter((meal) => {
    const mealDate = new Date(meal.timestamp);
    return mealDate >= todayStart;
  });

  const todayTotals = todayMeals.reduce(
    (acc, m) => {
      acc.calories += m.total?.calories || 0;
      acc.protein += m.total?.protein || 0;
      acc.carb += m.total?.carb || 0;
      acc.fat += m.total?.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carb: 0, fat: 0 }
  );

  // --- Date Grouping & Filtering for UI List ---
  const getFilteredMeals = () => {
    let list = [...meals];

    // Search query match
    if (mealSearchQuery.trim()) {
      const query = mealSearchQuery.toLowerCase();
      list = list.filter((m) => {
        const matchName = m.mealName.toLowerCase().includes(query);
        const matchItem = m.items.some((i) => i.foodName.toLowerCase().includes(query));
        return matchName || matchItem;
      });
    }

    // Tab filter
    if (activeDateFilter === "today") {
      list = list.filter((m) => new Date(m.timestamp) >= todayStart);
    } else if (activeDateFilter === "past") {
      list = list.filter((m) => new Date(m.timestamp) < todayStart);
    }

    return list;
  };

  const filteredMealsWithFilters = getFilteredMeals();
  const totalMealsCount = filteredMealsWithFilters.length;
  const totalPages = Math.ceil(totalMealsCount / MEALS_PER_PAGE) || 1;
  const currentPage = Math.min(historyPage, totalPages);
  const startIndex = (currentPage - 1) * MEALS_PER_PAGE;
  const paginatedMealsList = filteredMealsWithFilters.slice(startIndex, startIndex + MEALS_PER_PAGE);

  // Group meals of the current page by local calendar date string
  const groupedMeals: { [key: string]: Meal[] } = {};
  paginatedMealsList.forEach((meal) => {
    const d = new Date(meal.timestamp);
    const dateStr = d.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (!groupedMeals[dateStr]) {
      groupedMeals[dateStr] = [];
    }
    groupedMeals[dateStr].push(meal);
  });

  const toggleExpandMeal = (id: string) => {
    setExpandedMealId(expandedMealId === id ? null : id);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[url('/login_background.png')] bg-cover bg-center flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Soft overlay to make text highly readable */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[4px] z-0"></div>
        
        {/* Decorative bright lights */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-400/25 rounded-full blur-3xl z-0 pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-400/25 rounded-full blur-3xl z-0 pointer-events-none animate-pulse"></div>
        
        <div className="bg-white/85 backdrop-blur-2xl rounded-3xl p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-white/50 w-full max-w-md relative z-10 animate-fade-in text-slate-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 transform hover:rotate-6 transition-transform">
              <ChefHat className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">Nhật Ký Dinh Dưỡng</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-wider">Health & Fitness Tracker</p>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 flex items-start gap-3 text-xs text-rose-600 font-semibold leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 block mb-1.5 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập (ví dụ: phi)"
                  className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden font-bold transition-all duration-200 lowercase"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 block mb-1.5 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Nhập mật khẩu (ví dụ: 123)"
                  className="w-full bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden font-bold transition-all duration-200"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-start py-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer accent-emerald-500"
                />
                <span className="text-[11px] font-bold text-slate-500">Ghi nhớ mật khẩu & tự động đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <span>Đang kết nối...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Xác nhận Đăng Nhập</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      
      {/* HEADER SECTION */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md relative overflow-hidden" id="main_header">
        {/* Abstract backdrop glow pattern */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute -left-10 bottom-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 shadow-inner shrink-0">
                <ChefHat className="w-5.5 h-5.5 sm:w-8 sm:h-8 text-emerald-100 animate-bounce" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-2xl font-extrabold tracking-tight text-white truncate leading-tight">
                  Nhật ký Ăn Uống
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10 transition-all cursor-pointer shadow-xs flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold"
                  title="Cài đặt ứng dụng trên điện thoại/máy tính"
                >
                  <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
                  <span className="hidden sm:inline">Cài đặt App</span>
                  <span className="sm:hidden">Cài App</span>
                </button>
              )}
              <div className="flex items-center gap-2 bg-black/15 backdrop-blur-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/5 select-none shrink-0">
                <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full bg-emerald-300 text-emerald-950 font-black flex items-center justify-center text-[10px] sm:text-xs shadow-inner border border-emerald-200 shrink-0 uppercase">
                  {currentUser?.username?.substring(0, 2) || "US"}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5 leading-none">
                    <p className="text-[9px] font-extrabold text-emerald-200 uppercase tracking-widest">
                      {currentUser?.role === "admin" ? "ADMIN" : "USER"}
                    </p>
                  </div>
                  <p className="text-xs font-extrabold text-white truncate max-w-[120px] mt-0.5">
                    {currentUser?.name || "Người dùng"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-rose-500/80 hover:bg-rose-600 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-xl border border-rose-400/20 transition-all cursor-pointer shadow-3xs uppercase tracking-wider shrink-0"
                title="Đăng xuất tài khoản"
              >
                <span className="hidden sm:inline">Đăng xuất</span>
                <span className="sm:hidden">Thoát</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-8" id="application_body">
        
        {/* MAIN TABS BAR */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 bg-white p-1 rounded-2xl shadow-xs" id="navigation_tabs_wrapper">
          <button
            onClick={() => setActiveMainTab("nutrition")}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeMainTab === "nutrition"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Apple className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Hôm nay</span>
          </button>
          <button
            onClick={() => setActiveMainTab("history")}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeMainTab === "history"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Nhật ký Ăn Uống</span>
          </button>
          {currentUser && currentUser.username !== "tuyen" && (
            <button
              onClick={() => setActiveMainTab("customFoods")}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeMainTab === "customFoods"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dữ liệu Thức Ăn</span>
            </button>
          )}
        </div>

        {activeMainTab === "nutrition" && (
          <>
            {/* TODAY'S METRICS SECTION */}
            <section className="mb-8" id="today_nutrition_gauges">
          <div className="flex items-center justify-between mb-5.5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                Dinh dưỡng hôm nay
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Các chỉ số đã nạp tính từ 0h:00 Hôm nay so với hạn mức bạn cài đặt
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingGoal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                title="Thay đổi mục tiêu Calories & Macros"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Cài đặt mục tiêu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCircle
              label="💥 Calories"
              current={todayTotals.calories}
              target={dailyGoal.calories}
              unit=" kcal"
              colorClass="text-amber-500"
              bgStrokeClass="stroke-slate-100"
              strokeColor="#f59e0b"
              size={135}
            />
            <MetricCircle
              label="🥩 Đạm (Protein)"
              current={todayTotals.protein}
              target={dailyGoal.protein}
              unit="g"
              colorClass="text-emerald-500"
              bgStrokeClass="stroke-slate-100"
              strokeColor="#10b981"
              size={135}
            />
            <MetricCircle
              label="🍚 Tinh bột (Carbs)"
              current={todayTotals.carb}
              target={dailyGoal.carb}
              unit="g"
              colorClass="text-sky-500"
              bgStrokeClass="stroke-slate-100"
              strokeColor="#0284c7"
              size={135}
            />
            <MetricCircle
              label="🧈 Chất béo (Fat)"
              current={todayTotals.fat}
              target={dailyGoal.fat}
              unit="g"
              colorClass="text-rose-500"
              bgStrokeClass="stroke-slate-100"
              strokeColor="#f43f5e"
              size={135}
            />
          </div>
        </section>

        {/* SIDE-BY-SIDE FUNCTIONAL AREA & TODAY'S RECORDED FOODS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-8">
          {/* MEAL LOGGER CONTAINER */}
          <div id="meal_logger_wrapper" className="h-full">
            <MealLogger onSaveMeal={handleAddMeal} meals={meals} customFoods={customFoods} />
          </div>

          {/* LIST OF TODAY'S RECORDED FOODS */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col" id="today_meals_timeline">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Utensils className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                  Bữa ăn hôm nay
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Tổng cộng: {todayMeals.length} bữa ăn
              </span>
            </div>

            {todayMeals.length === 0 ? (
              <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex-1 flex flex-col items-center justify-center">
                <Apple className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Chưa ăn món gì hôm nay</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Bữa ăn mới nhất sẽ được liệt kê ở đây khi bạn thêm bằng AI hoặc thêm thủ công phía trên.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin flex-1">
                {todayMeals.map((meal) => {
                  const isExpanded = expandedMealId === meal.id;
                  const mealTime = new Date(meal.timestamp).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div
                      key={meal.id}
                      className={`bg-white border rounded-2xl transition-all duration-350 overflow-hidden ${
                        isExpanded ? "border-emerald-300 shadow-sm" : "border-slate-150 hover:border-slate-250"
                      }`}
                    >
                      {/* Header preview */}
                      <div
                        onClick={() => toggleExpandMeal(meal.id)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/30 transition-all font-medium"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-slate-400 shrink-0 uppercase tracking-wider">
                              ⏰ {mealTime}
                            </span>
                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate pr-2">
                              {meal.mealName}
                            </h4>
                          </div>
                          {/* Nutrition pill summaries */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400">
                            <span className="text-amber-500 font-bold">🔥 {meal.total.calories} kcal</span>
                            <span>🥩 {meal.total.protein}g đạm</span>
                            <span>🍚 {meal.total.carb}g carb</span>
                            <span>🧈 {meal.total.fat}g béo</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMeal(meal.id);
                            }}
                            className="p-1.5 hover:text-rose-600 hover:bg-rose-50 text-slate-300 rounded-lg transition-all animate-fade-in"
                            title="Xóa bữa ăn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="text-slate-400 hover:text-slate-600 p-0.5 rounded-sm">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Breakdown table */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 p-4 border-t border-slate-100 transition-all text-xs">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2.5">
                            Chi tiết thành phần bữa ăn:
                          </span>
                          <div className="bg-white rounded-xl border border-slate-150 overflow-x-auto shadow-2xs">
                            <table className="w-full text-left min-w-[500px]">
                              <thead>
                                <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold border-b border-slate-200">
                                  <th className="py-2 px-3">Tên thực phẩm</th>
                                  <th className="py-2 px-2 text-center">Khối lượng</th>
                                  <th className="py-2 px-2 text-center text-amber-600">Calo</th>
                                  <th className="py-2 px-2 text-center text-emerald-600">🥩 Đạm</th>
                                  <th className="py-2 px-2 text-center text-sky-600">🍚 Carb</th>
                                  <th className="py-2 px-2 text-center text-rose-500">🧈 Béo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                                {meal.items.map((item, keyIdx) => (
                                  <tr key={keyIdx}>
                                    <td className="py-2 px-3 font-semibold text-slate-700">{item.foodName}</td>
                                    <td className="py-2 px-2 text-center font-medium text-slate-500">{item.quantity}</td>
                                    <td className="py-2 px-2 text-center font-bold text-amber-600">{item.calories}</td>
                                    <td className="py-2 px-2 text-center font-semibold text-emerald-600">{item.protein}g</td>
                                    <td className="py-2 px-2 text-center font-semibold text-sky-600">{item.carb}g</td>
                                    <td className="py-2 px-2 text-center font-semibold text-rose-500">{item.fat}g</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    )}

    {activeMainTab === "history" && (
      <div className="space-y-8 w-full animate-fade-in" id="history_tab_content">
        {/* ANALYTICS CHARTS COMPONENT - FULL WIDTH */}
        <div className="w-full" id="analytics_charts_wrapper">
          <React.Suspense fallback={<TabLoadingPlaceholder />}>
            <AnalyticsCharts meals={meals} dailyGoal={dailyGoal} />
          </React.Suspense>
        </div>

        {/* FULL WIDTH HISTORY PORTLET */}
        <div className="w-full" id="history_section">
          {/* INTERACTIVE HISTORY LOGGER LIST */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100" id="meals_history_timeline">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Nhật ký Ăn Uống
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quản lý danh sách các món ăn đã nạp gần đây
                  </p>
                </div>

                {/* Sub Filter tabs & Excel Export button */}
                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                  <div className="inline-flex rounded-lg bg-slate-100 p-1">
                    <button
                      onClick={() => setActiveDateFilter("all")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeDateFilter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      onClick={() => setActiveDateFilter("today")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeDateFilter === "today" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      Hôm nay
                    </button>
                    <button
                      onClick={() => setActiveDateFilter("past")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeDateFilter === "past" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-800"
                      }`}
                    >
                      Cũ hơn
                    </button>
                  </div>

                  <button
                    onClick={handleExportToExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100/60 transition-all cursor-pointer shadow-3xs select-none ml-1 sm:ml-0"
                    title="Xuất lịch sử ăn uống ra file Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                </div>
              </div>

              {/* Meal Search input field */}
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-700 placeholder-slate-400 transition-all font-medium"
                  placeholder="Tìm kiếm nhanh món ăn trong lịch sử..."
                  value={mealSearchQuery}
                  onChange={(e) => setMealSearchQuery(e.target.value)}
                />
              </div>

              {/* Listed history grouped with details */}
              {Object.keys(groupedMeals).length === 0 ? (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Apple className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Không tìm thấy dữ liệu bữa ăn
                  </p>
                  <p className="text-xs text-slate-400/80 mt-1 max-w-sm mx-auto">
                    Hãy bắt đầu ghi lại bữa ăn của bạn bằng tính năng phân tích văn bản AI ở cột bên trái!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(groupedMeals).map((groupDate, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-sm">
                          {groupDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          ({groupedMeals[groupDate].length} bữa ăn)
                        </span>
                        <div className="flex-1 h-px bg-slate-100"></div>
                      </div>

                      <div className="space-y-3 pl-1">
                        {groupedMeals[groupDate].map((meal) => {
                          const isExpanded = expandedMealId === meal.id;
                          const mealTime = new Date(meal.timestamp).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit"
                          });

                          return (
                            <div
                              key={meal.id}
                              className={`bg-white border rounded-2xl transition-all duration-300 overflow-hidden ${
                                isExpanded
                                  ? "border-emerald-300 shadow-sm"
                                  : "border-slate-150 hover:border-slate-300"
                              }`}
                            >
                              {/* Header item preview */}
                              <div
                                onClick={() => toggleExpandMeal(meal.id)}
                                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/20 transition-all"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                      ⏰ {mealTime}
                                    </span>
                                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate pr-2">
                                      {meal.mealName}
                                    </h4>
                                  </div>
                                  
                                  {/* Short nutritional tags summary */}
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400">
                                    <span className="text-amber-500 font-bold">🔥 {meal.total.calories} kcal</span>
                                    <span>🥩 {meal.total.protein}g đạm</span>
                                    <span>🍚 {meal.total.carb}g carb</span>
                                    <span>🧈 {meal.total.fat}g béo</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMeal(meal.id);
                                    }}
                                    className="p-1.5 hover:text-rose-600 hover:bg-rose-50 text-slate-300 rounded-lg transition-all"
                                    title="Xóa bữa ăn"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <div className="text-slate-400 hover:text-slate-600 p-0.5 rounded-sm">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Ingredients breakdown */}
                              {isExpanded && (
                                <div className="bg-slate-50/50 p-4 border-t border-slate-100 transition-all text-xs">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2.5">
                                    Chi tiết thành phần nguyên liệu:
                                  </span>
                                  <div className="bg-white rounded-xl border border-slate-150 overflow-x-auto shadow-2xs">
                                    <table className="w-full text-left min-w-[500px]">
                                      <thead>
                                        <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold border-b border-slate-200">
                                          <th className="py-2.5 px-3">Tên thực phẩm</th>
                                          <th className="py-2.5 px-2 text-center">Khối lượng</th>
                                          <th className="py-2.5 px-2 text-center text-amber-600">Calo</th>
                                          <th className="py-2.5 px-2 text-center text-emerald-600">🥩 Đạm</th>
                                          <th className="py-2.5 px-2 text-center text-sky-600">🍚 Carb</th>
                                          <th className="py-2.5 px-2 text-center text-rose-500">🧈 Béo</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                                        {meal.items.map((item, keyIdx) => (
                                          <tr key={keyIdx}>
                                            <td className="py-2 px-3 font-semibold text-slate-700">{item.foodName}</td>
                                            <td className="py-2 px-2 text-center font-medium text-slate-500">{item.quantity}</td>
                                            <td className="py-2 px-2 text-center font-bold text-amber-600">{item.calories}</td>
                                            <td className="py-2 px-2 text-center font-semibold text-emerald-600">{item.protein}g</td>
                                            <td className="py-2 px-2 text-center font-semibold text-sky-600">{item.carb}g</td>
                                            <td className="py-2 px-2 text-center font-semibold text-rose-500">{item.fat}g</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="mt-3 flex items-center justify-end text-[10px] text-slate-400 font-medium">
                                    <span>ID: {meal.id}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-5">
                      <button
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                      >
                        ← Trang trước
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-40 disabled:hover:bg-slate-100 cursor-pointer"
                      >
                        Trang sau →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {activeMainTab === "customFoods" && currentUser?.username !== "tuyen" && (
          <React.Suspense fallback={<TabLoadingPlaceholder />}>
            <CustomFoodsManager 
              customFoods={customFoods} 
              onUpdateCustomFoods={handleUpdateCustomFoods} 
              isAdmin={true} 
              username={currentUser?.username || "default"}
            />
          </React.Suspense>
        )}
      </main>

        {/* GOAL EDITING POPUP MODAL */}
        {isEditingGoal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 w-full max-w-md relative animate-zoom-in">
              {/* Close button top right */}
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer col-span-1 border-none"
              >
                <span className="sr-only">Đóng</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Title */}
              <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Settings2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Cài đặt mục tiêu Cá nhân</h3>
                  <p className="text-[11px] text-slate-400">Thiết lập mục tiêu năng lượng & đa lượng hàng ngày</p>
                </div>
              </div>

              {/* Modal Body with Form */}
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Mục tiêu hiện tại:</span>
                    <span className="font-bold text-slate-700">
                      {dailyGoal.calories} kcal • {dailyGoal.protein}g đạm • {dailyGoal.carb}g carb • {dailyGoal.fat}g béo
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mục tiêu Calo (kcal)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 transition-all font-sans"
                      value={goalEditingCal}
                      onChange={(e) => setGoalEditingCal(Number(e.target.value))}
                      min="500"
                      max="8000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1.5">Mục tiêu Đạm (g)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-emerald-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 transition-all font-sans"
                      value={goalEditingProt}
                      onChange={(e) => setGoalEditingProt(Number(e.target.value))}
                      min="10"
                      max="500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block mb-1.5">Mục tiêu Carb (g)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-sky-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 transition-all font-sans"
                      value={goalEditingCarb}
                      onChange={(e) => setGoalEditingCarb(Number(e.target.value))}
                      min="10"
                      max="800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1.5">Mục tiêu Béo (g)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-rose-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 transition-all font-sans"
                      value={goalEditingFat}
                      onChange={(e) => setGoalEditingFat(Number(e.target.value))}
                      min="5"
                      max="300"
                    />
                  </div>
                </div>

                {/* Modal footer buttons */}
                <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Lưu cài đặt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MEAL CONFIRMATION DIALOG MODAL */}
        {mealToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="delete_meal_modal">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 w-full max-w-sm relative animate-zoom-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">Xác nhận xóa bữa ăn?</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Bạn có chắc chắn muốn xóa bữa ăn <strong className="text-slate-700">"{mealToDelete.mealName}"</strong> khỏi lịch sử dinh dưỡng? Hành động này không thể hoàn tác.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setMealToDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition-all cursor-pointer border-none"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMeal}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer border-none"
                  >
                    Xóa ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA INSTALLATION MODAL */}
        {showInstallModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in animate-duration-200" id="pwa_install_modal">
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 w-full max-w-md relative animate-zoom-in animate-duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Cài đặt ứng dụng</h3>
                    <p className="text-[11px] text-slate-400">Trải nghiệm mượt mà hơn trên màn hình chính</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer font-bold text-sm font-sans"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 my-4">
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-700">Để cài đặt ứng dụng trên iPhone/iPad (Safari):</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Nhấn vào nút <strong>Chia sẻ</strong> <Share className="inline w-3.5 h-3.5 text-emerald-600 mx-1 mb-0.5 animate-pulse" /> ở thanh menu phía dưới của Safari.</span>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Cuộn xuống dưới và chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).</span>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Nhấn nút <strong>"Thêm"</strong> (Add) ở góc trên bên phải để hoàn tất.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-700">Để cài đặt ứng dụng trên trình duyệt của bạn:</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Nhấn vào biểu tượng <strong>Tùy chọn</strong> <MoreVertical className="inline w-3.5 h-3.5 text-slate-500 mx-1 mb-0.5" /> (3 chấm) ở góc trên bên phải trình duyệt.</span>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Tìm và chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.</span>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Xác nhận cài đặt khi trình duyệt hiển thị hộp thoại.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer border-none text-center shadow-xs"
                >
                  Tôi đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}



      {/* FOOTER METADATA INFOPANEL */}
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-400 mt-16 text-center text-xs">
        <div className="w-[90%] mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-slate-400 font-medium">
            <span>Phiên bản v1.1.0</span>
            <span>•</span>
            <span>Bảo mật thiết bị ngoại tuyến</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
