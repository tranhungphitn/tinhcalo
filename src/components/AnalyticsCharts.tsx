import React, { useState } from "react";
import { Meal, DailyGoal } from "../types";
import { Calendar, BarChart3, TrendingUp, Sparkles, HelpCircle } from "lucide-react";

interface AnalyticsChartsProps {
  meals: Meal[];
  dailyGoal: DailyGoal;
}

export default function AnalyticsCharts({ meals, dailyGoal }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [hoveredBar, setHoveredBar] = useState<any | null>(null);

  // Helper: Format date into weekday name
  const getWeekdayName = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    if (day === 0) return "Chủ Nhật";
    return `T.${day + 1}`;
  };

  // Helper: Get past 7 dates including today
  const getPast7Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push(d.toDateString());
    }
    return list;
  };

  // 1. WEEKLY AGGREGATION
  const past7Dates = getPast7Days();
  const weeklyData = past7Dates.map((dateStr) => {
    const d = new Date(dateStr);
    const label = getWeekdayName(dateStr);
    const dateFormatted = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

    // Filter meals on this day
    const dayMeals = meals.filter((meal) => {
      const mDate = new Date(meal.timestamp);
      return mDate.toDateString() === dateStr;
    });

    const totalCal = dayMeals.reduce((acc, m) => acc + (m.total?.calories || 0), 0);
    const totalProt = dayMeals.reduce((acc, m) => acc + (m.total?.protein || 0), 0);
    const totalCarb = dayMeals.reduce((acc, m) => acc + (m.total?.carb || 0), 0);
    const totalFat = dayMeals.reduce((acc, m) => acc + (m.total?.fat || 0), 0);

    return {
      label,
      subLabel: dateFormatted,
      calories: totalCal,
      protein: totalProt,
      carb: totalCarb,
      fat: totalFat
    };
  });

  // 2. MONTHLY AGGREGATION (Group by 5-day intervals)
  const getIntervals = () => {
    const today = new Date();
    const intervals = [
      { start: 1, end: 5, label: "Ngày 1-5" },
      { start: 6, end: 10, label: "Ngày 6-10" },
      { start: 11, end: 15, label: "Ngày 11-15" },
      { start: 16, end: 20, label: "Ngày 16-20" },
      { start: 21, end: 25, label: "Ngày 21-25" },
      { start: 26, end: 31, label: "Ngày 26+" }
    ];

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return intervals.map((interval) => {
      // Find meals in this month & in this date range
      const intervalMeals = meals.filter((meal) => {
        const mDate = new Date(meal.timestamp);
        const day = mDate.getDate();
        return (
          mDate.getMonth() === currentMonth &&
          mDate.getFullYear() === currentYear &&
          day >= interval.start &&
          day <= interval.end
        );
      });

      // Calculate total, then get standard daily average inside this interval (divided by days)
      const countDays = Math.min((interval.end - interval.start + 1), today.getDate() - interval.start + 1);
      const denominator = Math.max(1, countDays);

      const totalCal = intervalMeals.reduce((acc, m) => acc + (m.total?.calories || 0), 0);
      const totalProt = intervalMeals.reduce((acc, m) => acc + (m.total?.protein || 0), 0);
      const totalCarb = intervalMeals.reduce((acc, m) => acc + (m.total?.carb || 0), 0);
      const totalFat = intervalMeals.reduce((acc, m) => acc + (m.total?.fat || 0), 0);

      const avgCal = totalCal; // we can show total or average, let's show total in this window, but let's label it correctly or sum it.
      return {
        label: interval.label,
        subLabel: `Tháng ${currentMonth + 1}`,
        calories: totalCal,
        protein: totalProt,
        carb: totalCarb,
        fat: totalFat,
        mealsCount: intervalMeals.length
      };
    });
  };

  const monthlyData = getIntervals();
  const currentData = timeRange === "week" ? weeklyData : monthlyData;

  // Find max calories to scale the SVG chart proportionally
  const maxCalInput = Math.max(...currentData.map((d) => d.calories), dailyGoal.calories);
  const chartHeight = 240;
  const paddingY = 30;
  const graphMax = maxCalInput * 1.15; // padding space at top of chart

  // Calculate stats
  const activeDays = currentData.filter((d) => d.calories > 0).length;
  const avgCalories = activeDays > 0 ? currentData.reduce((acc, d) => acc + d.calories, 0) / activeDays : 0;
  const goalAchievementRate = avgCalories > 0 ? (avgCalories / dailyGoal.calories) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col justify-between overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500 animate-pulse" />
            Báo Cáo & Thống Kê Dinh Dưỡng
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tổng hợp và phân tích calo nạp vào hàng ngày, hàng tuần hoặc hàng tháng
          </p>
        </div>

        {/* Tab triggers */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => { setTimeRange("week"); setHoveredBar(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeRange === "week"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Theo Tuần
          </button>
          <button
            onClick={() => { setTimeRange("month"); setHoveredBar(null); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              timeRange === "month"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Theo Tháng (Tháng này)
          </button>
        </div>
      </div>

      {/* Mini Insight banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Calo trung bình nạp</div>
            <div className="text-lg font-bold text-slate-800">{Math.round(avgCalories)} kcal / ngày</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-x border-slate-200 pt-3 md:pt-0 md:px-4">
          <div className="p-2.5 bg-sky-100 text-sky-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Số ngày đã ghi chép</div>
            <div className="text-lg font-bold text-slate-800">{activeDays} ngày</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Tỷ lệ đạt mục tiêu calo</div>
            <div className="text-lg font-bold text-slate-800">
              {avgCalories > 0 ? `${Math.round(goalAchievementRate)}%` : "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* Actual Chart Area */}
      <div className="relative">
        {/* Goal line helper label */}
        <div className="absolute left-2 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm font-semibold border border-emerald-100 transition-all shadow-xs"
             style={{
               bottom: `${((dailyGoal.calories / graphMax) * (chartHeight - paddingY * 2) + paddingY) - 10}px`
             }}
        >
          Hạn mức: {dailyGoal.calories} kcal
        </div>

        <div className="w-full overflow-x-auto">
          <svg className="w-full min-w-[500px]" height={chartHeight}>
            {/* Custom Grid lines */}
            <line
              x1="5%"
              y1={paddingY}
              x2="95%"
              y2={paddingY}
              stroke="#F1F5F9"
              strokeWidth="1.5"
            />
            <line
              x1="5%"
              y1={chartHeight / 2}
              x2="95%"
              y2={chartHeight / 2}
              stroke="#F1F5F9"
              strokeWidth="1.5"
            />
            <line
              x1="5%"
              y1={chartHeight - paddingY}
              x2="95%"
              y2={chartHeight - paddingY}
              stroke="#E2E8F0"
              strokeWidth="2"
            />

            {/* Target Limit Dotted Red/Emerald Line */}
            <line
              x1="5%"
              y1={chartHeight - paddingY - (dailyGoal.calories / graphMax) * (chartHeight - paddingY * 2)}
              x2="95%"
              y2={chartHeight - paddingY - (dailyGoal.calories / graphMax) * (chartHeight - paddingY * 2)}
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Columns render */}
            {currentData.map((d, idx) => {
              const colWidth = 45;
              const graphWidthPercent = 90; // occupy 90% of layout width
              const leftOffsetPercent = 5 + (idx * (graphWidthPercent / (currentData.length - 1 || 1)));

              // Calculate bar height based on ingested calories
              const barHeight = (d.calories / graphMax) * (chartHeight - paddingY * 2);
              const barY = chartHeight - paddingY - barHeight;
              const isOverTarget = d.calories > dailyGoal.calories;

              return (
                <g key={idx} className="cursor-pointer group">
                  {/* Invisible broad column cover for easy hovering */}
                  <rect
                    x={`${leftOffsetPercent}%`}
                    y={paddingY}
                    width={`${colWidth}px`}
                    height={chartHeight - paddingY * 2}
                    fill="transparent"
                    className="transform -translate-x-1/2"
                    onMouseEnter={() => setHoveredBar({ ...d, x: leftOffsetPercent })}
                    onMouseLeave={() => setHoveredBar(null)}
                  />

                  {/* Empty light column backing */}
                  <rect
                    x={`${leftOffsetPercent}%`}
                    y={paddingY}
                    width="18"
                    height={chartHeight - paddingY * 2}
                    rx="9"
                    fill="#F8FAFC"
                    className="transform -translate-x-1/2 group-hover:fill-slate-100 transition-all"
                  />

                  {/* Active Ingested Nutrition Bar */}
                  {d.calories > 0 && (
                    <rect
                      x={`${leftOffsetPercent}%`}
                      y={barY}
                      width="18"
                      height={Math.max(4, barHeight)}
                      rx="9"
                      fill={isOverTarget ? "#F43F5E" : "#10B981"}
                      className="transform -translate-x-1/2 transition-all duration-500 ease-out fill-emerald-500 group-hover:opacity-90"
                      style={{
                        fill: isOverTarget ? "url(#overGradient)" : "url(#emeraldGradient)"
                      }}
                    />
                  )}

                  {/* Text label underneath */}
                  <text
                    x={`${leftOffsetPercent}%`}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-500"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="overGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredBar && (
          <div
            className="absolute z-30 bg-slate-900/95 text-white p-4 rounded-xl shadow-xl border border-slate-700/50 pointer-events-none transition-all duration-150 transform -translate-x-1/2"
            style={{
              left: `${hoveredBar.x}%`,
              bottom: "75px"
            }}
          >
            <div className="text-center border-b border-slate-700/50 pb-1.5 mb-2">
              <span className="text-[10px] tracking-wider text-slate-400 font-bold uppercase block">
                {hoveredBar.subLabel}
              </span>
              <span className="text-xs font-bold text-slate-100">{hoveredBar.label}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-8">
                <span className="text-amber-400 font-medium">✨ Calo:</span>
                <span className="font-bold">{Math.round(hoveredBar.calories)} kcal</span>
              </div>
              <div className="flex justify-between gap-8 border-t border-slate-700/30 pt-1 mt-1 text-[11px] text-slate-300">
                <span>🥩 Đạm (Protein):</span>
                <span>{Math.round(hoveredBar.protein)}g</span>
              </div>
              <div className="flex justify-between gap-8 text-[11px] text-slate-300">
                <span>🍚 Tinh bột (Carb):</span>
                <span>{Math.round(hoveredBar.carb)}g</span>
              </div>
              <div className="flex justify-between gap-8 text-[11px] text-slate-300">
                <span>🧈 Chất béo (Fat):</span>
                <span>{Math.round(hoveredBar.fat)}g</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Nạp calo dưới hoặc đạt mức</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          <span>Nạp calo vượt mức mục tiêu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-emerald-500 border-dashed inline-block h-1"></span>
          <span>Đường giới hạn mục tiêu</span>
        </div>
      </div>
    </div>
  );
}
