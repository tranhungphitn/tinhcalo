import React from "react";

interface MetricCircleProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  colorClass: string; // Tailwind color e.g., "text-emerald-500"
  bgStrokeClass: string; // e.g. "stroke-emerald-100"
  strokeColor: string; // hex, e.g. "#10b981"
  size?: number;
}

export default function MetricCircle({
  label,
  current,
  target,
  unit,
  colorClass,
  bgStrokeClass,
  strokeColor,
  size = 120,
}: MetricCircleProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isOver = current > target;
  const remaining = Math.max(0, target - current);

  return (
    <div className="flex flex-col items-center bg-white rounded-2xl p-5 shadow-xs border border-slate-100 transition-all hover:shadow-md hover:translate-y-[-2px]">
      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">
        {label}
      </span>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background track */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${bgStrokeClass} fill-transparent`}
            strokeWidth={strokeWidth}
          />
          {/* Active progress track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Text indicators */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-xl font-bold tracking-tight text-slate-800 leading-none">
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase">
            {unit}
          </span>
        </div>
      </div>

      {/* Target status string */}
      <div className="mt-4 text-center">
        <div className="text-[11px] font-medium text-slate-500">
          Mục tiêu: <span className="font-semibold text-slate-700">{target}{unit}</span>
        </div>
        <div className="mt-0.5">
          {isOver ? (
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-sm">
              Vượt {Math.round(current - target)}{unit}
            </span>
          ) : remaining === 0 ? (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
              Đạt mục tiêu
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              Còn {Math.round(remaining)}{unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
