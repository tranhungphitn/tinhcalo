import React, { useState } from "react";
import { FoodItem, Meal, CustomFood } from "../types";
import { Calendar, Plus, Trash2, Check, Clock, ChevronDown, BookOpen } from "lucide-react";

interface MealLoggerProps {
  onSaveMeal: (meal: Omit<Meal, "id">) => void;
  meals: Meal[];
  customFoods?: CustomFood[];
}

function extractNumberAndUnit(text: string): { value: number; unit: string } {
  if (!text) return { value: 100, unit: "g" };
  const regex = /(\d+(?:\.\d+)?)\s*([a-zA-Záàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]*)/i;
  const match = text.match(regex);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2] ? match[2].trim().toLowerCase() : "";
    return { value: val, unit: unit };
  }
  return { value: 1, unit: "" };
}

function calculateScaledMacros(
  newQtyStr: string,
  baseQtyStr: string | undefined,
  baseCal: number,
  baseProtein: number,
  baseCarb: number,
  baseFat: number
) {
  if (!baseQtyStr) {
    return { calories: baseCal, protein: baseProtein, carb: baseCarb, fat: baseFat };
  }

  const baseParsed = extractNumberAndUnit(baseQtyStr);
  const newParsed = extractNumberAndUnit(newQtyStr);

  if (baseParsed.value <= 0 || newParsed.value <= 0) {
    return { calories: baseCal, protein: baseProtein, carb: baseCarb, fat: baseFat };
  }

  const ratio = newParsed.value / baseParsed.value;

  return {
    calories: Math.round(baseCal * ratio),
    protein: Math.round((baseProtein * ratio) * 10) / 10,
    carb: Math.round((baseCarb * ratio) * 10) / 10,
    fat: Math.round((baseFat * ratio) * 10) / 10
  };
}

export default function MealLogger({ onSaveMeal, meals = [], customFoods = [] }: MealLoggerProps) {
  // States for the currently editing / draft meal
  const [draftMealName, setDraftMealName] = useState("Bữa ăn dinh dưỡng");
  const [draftItems, setDraftItems] = useState<FoodItem[]>([]);

  // Datepicker storing "YYYY-MM-DD" (default to current date)
  const [mealDate, setMealDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Timepicker storing "HH:MM" (default to current time)
  const [mealTime, setMealTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });

  // Quick inputs for manual food addition to the draft
  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("100g");
  const [manualCal, setManualCal] = useState<number | "">("");
  const [manualProt, setManualProt] = useState<number | "">("");
  const [manualCarb, setManualCarb] = useState<number | "">("");
  const [manualFat, setManualFat] = useState<number | "">("");

  // Track the original baseline serving values for manual addition to perform scaling
  const [manualBaseServingSize, setManualBaseServingSize] = useState<string>("");
  const [manualBaseCal, setManualBaseCal] = useState<number>(0);
  const [manualBaseProt, setManualBaseProt] = useState<number>(0);
  const [manualBaseCarb, setManualBaseCarb] = useState<number>(0);
  const [manualBaseFat, setManualBaseFat] = useState<number>(0);

  // Autocomplete support
  const [showManualSuggestions, setShowManualSuggestions] = useState(false);

  // Match custom foods for input "manualName"
  const manualFilteredFoods = React.useMemo(() => {
    if (!manualName.trim() || !customFoods) return [];
    const query = manualName.toLowerCase().trim();
    return customFoods.filter((food) =>
      food.name.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [manualName, customFoods]);

  const handleSelectCustomFoodForManual = (food: CustomFood) => {
    setManualName(food.name);
    setManualQuantity(food.servingSize || "100g");
    setManualCal(food.calories);
    setManualProt(food.protein);
    setManualCarb(food.carb);
    setManualFat(food.fat);
    
    // Save standard references
    setManualBaseServingSize(food.servingSize || "100g");
    setManualBaseCal(food.calories);
    setManualBaseProt(food.protein);
    setManualBaseCarb(food.carb);
    setManualBaseFat(food.fat);
    
    setShowManualSuggestions(false);
  };

  const handleManualQuantityChange = (val: string) => {
    setManualQuantity(val);
    if (manualBaseServingSize) {
      const scaled = calculateScaledMacros(
        val,
        manualBaseServingSize,
        manualBaseCal,
        manualBaseProt,
        manualBaseCarb,
        manualBaseFat
      );
      setManualCal(scaled.calories);
      setManualProt(scaled.protein);
      setManualCarb(scaled.carb);
      setManualFat(scaled.fat);
    }
  };

  // Sum drafted values
  const totalCalculated = React.useMemo(() => {
    return draftItems.reduce(
      (acc, item) => {
        acc.calories += Number(item.calories) || 0;
        acc.protein += Number(item.protein) || 0;
        acc.carb += Number(item.carb) || 0;
        acc.fat += Number(item.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carb: 0, fat: 0 }
    );
  }, [draftItems]);



  const handleDeleteDraftItem = (index: number) => {
    setDraftItems(draftItems.filter((_, i) => i !== index));
  };

  // Append customized item dynamically
  const handleAddManualItemToDraft = () => {
    if (!manualName.trim()) return;
    const newItem: FoodItem = {
      foodName: manualName,
      quantity: manualQuantity || "100g",
      calories: Number(manualCal) || 0,
      protein: Number(manualProt) || 0,
      carb: Number(manualCarb) || 0,
      fat: Number(manualFat) || 0,
      baseServingSize: manualBaseServingSize || manualQuantity || "100g",
      baseCalories: manualBaseCal || Number(manualCal) || 0,
      baseProtein: manualBaseProt || Number(manualProt) || 0,
      baseCarb: manualBaseCarb || Number(manualCarb) || 0,
      baseFat: manualBaseFat || Number(manualFat) || 0
    };
    setDraftItems([...draftItems, newItem]);

    // reset fields
    setManualName("");
    setManualQuantity("100g");
    setManualCal("");
    setManualProt("");
    setManualCarb("");
    setManualFat("");
    setManualBaseServingSize("");
    setManualBaseCal(0);
    setManualBaseProt(0);
    setManualBaseCarb(0);
    setManualBaseFat(0);
  };

  // Final validation and save
  const handleSaveToHistory = () => {
    if (draftItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 thực phẩm trước khi lưu.");
      return;
    }

    const calculatedTotals = totalCalculated;

    // Reconstruct ISO timestamp with selected Date, hours and minutes from state
    const now = new Date();
    if (mealDate) {
      const [year, month, day] = mealDate.split("-");
      now.setFullYear(Number(year), Number(month) - 1, Number(day));
    }
    if (mealTime) {
      const [hours, minutes] = mealTime.split(":");
      now.setHours(Number(hours || 0));
      now.setMinutes(Number(minutes || 0));
      now.setSeconds(0);
      now.setMilliseconds(0);
    }
    const finalTimestamp = now.toISOString();

    const finalMeal: Omit<Meal, "id"> = {
      mealName: draftMealName.trim() || "Bữa ăn dinh dưỡng",
      timestamp: finalTimestamp,
      items: draftItems.map(item => ({
        foodName: item.foodName || "Thức ăn",
        quantity: item.quantity || "100g",
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carb: Number(item.carb) || 0,
        fat: Number(item.fat) || 0
      })),
      total: {
        calories: Math.round(calculatedTotals.calories),
        protein: Math.round(calculatedTotals.protein * 10) / 10,
        carb: Math.round(calculatedTotals.carb * 10) / 10,
        fat: Math.round(calculatedTotals.fat * 10) / 10
      }
    };

    onSaveMeal(finalMeal);

    // reset states
    setDraftMealName("Bữa ăn dinh dưỡng");
    setDraftItems([]);
    
    // reset mealDate and mealTime to current date/time
    const resetNow = new Date();
    const year = resetNow.getFullYear();
    const month = String(resetNow.getMonth() + 1).padStart(2, "0");
    const day = String(resetNow.getDate()).padStart(2, "0");
    setMealDate(`${year}-${month}-${day}`);
    
    const hours = String(resetNow.getHours()).padStart(2, "0");
    const minutes = String(resetNow.getMinutes()).padStart(2, "0");
    setMealTime(`${hours}:${minutes}`);
  };

  // Reset the logger completely
  const handleResetForm = () => {
    if (draftItems.length > 0 && !confirm("Bạn có muốn đặt lại toàn bộ biểu mẫu ghi chép?")) {
      return;
    }
    setDraftMealName("Bữa ăn dinh dưỡng");
    setDraftItems([]);
    const resetNow = new Date();
    const year = resetNow.getFullYear();
    const month = String(resetNow.getMonth() + 1).padStart(2, "0");
    const day = String(resetNow.getDate()).padStart(2, "0");
    setMealDate(`${year}-${month}-${day}`);
    
    const hours = String(resetNow.getHours()).padStart(2, "0");
    const minutes = String(resetNow.getMinutes()).padStart(2, "0");
    setMealTime(`${hours}:${minutes}`);
    
    setManualName("");
    setManualQuantity("100g");
    setManualCal("");
    setManualProt("");
    setManualCarb("");
    setManualFat("");
    setManualBaseServingSize("");
    setManualBaseCal(0);
    setManualBaseProt(0);
    setManualBaseCarb(0);
    setManualBaseFat(0);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col justify-between">
      <div className="flex flex-col justify-between h-full flex-1">
        
        {/* Form header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                className="text-xl font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-hidden w-full bg-transparent p-0"
                value={draftMealName}
                onChange={(e) => setDraftMealName(e.target.value)}
                placeholder="Nhập tên bữa ăn... (ví dụ: Bữa trưa lành mạnh)"
              />
            </div>
          </div>
          
          {/* Interactive Date & Hour/Minute selection on the same row */}
          <div className="flex items-center gap-2.5 shrink-0 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-slate-500">Ngày:</span>
                <input
                  type="date"
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden border-none p-0 cursor-pointer w-[110px]"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                />
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-slate-500">Giờ:</span>
                <input
                  type="time"
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden border-none p-0 cursor-pointer w-[60px]"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Adding Form Section */}
        <div className="bg-slate-50/70 border border-slate-200/40 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-[5.5fr_2.5fr_1.8fr_1.3fr_1.3fr_1.3fr_1.3fr] gap-2">
            {/* Food Name Search box */}
            <div className="col-span-2 md:col-span-1 relative">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Tên thực phẩm
              </label>
              <input
                type="text"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-hidden font-medium text-slate-700"
                placeholder="ví dụ: Ức gà, Trứng"
                value={manualName}
                onChange={(e) => {
                  setManualName(e.target.value);
                  setShowManualSuggestions(true);
                }}
                onFocus={() => {
                  setShowManualSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowManualSuggestions(false);
                  }, 200);
                }}
              />
              
              {/* Autocomplete dropdown for selection */}
              {showManualSuggestions && manualFilteredFoods.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto w-64 divide-y divide-slate-100 p-1">
                  {manualFilteredFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onMouseDown={() => {
                        handleSelectCustomFoodForManual(food);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-xs flex justify-between items-center rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-700 truncate">{food.name}</div>
                        <div className="text-[10px] text-slate-400">Suất: {food.servingSize}</div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded-full text-emerald-700 font-bold shrink-0 ml-1">
                        {food.calories} kcal
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Serving Size quantity */}
            <div className="col-span-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Lượng
              </label>
              <input
                type="text"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-hidden font-medium text-slate-600"
                placeholder="ví dụ: 100g, 1 bát"
                value={manualQuantity}
                onChange={(e) => handleManualQuantityChange(e.target.value)}
              />
            </div>

            {/* Calories count */}
            <div className="col-span-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1 text-amber-500 text-center">
                Kcal
              </label>
              <div className="flex items-center justify-center h-[38px] text-xs font-bold text-amber-600 bg-slate-50 border border-slate-200/80 rounded-xl select-none">
                {manualCal || "0"}
              </div>
            </div>

            {/* Protein count */}
            <div className="col-span-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1 text-emerald-600 text-center">
                🥩 Đạm
              </label>
              <div className="flex items-center justify-center h-[38px] text-xs font-semibold text-emerald-600 bg-slate-50 border border-slate-200/80 rounded-xl select-none">
                {manualProt !== "" ? `${manualProt}g` : "0g"}
              </div>
            </div>

            {/* Carb count */}
            <div className="col-span-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1 text-sky-600 text-center">
                🍚 Carb
              </label>
              <div className="flex items-center justify-center h-[38px] text-xs font-semibold text-sky-600 bg-slate-50 border border-slate-200/80 rounded-xl select-none">
                {manualCarb !== "" ? `${manualCarb}g` : "0g"}
              </div>
            </div>

            {/* Fat count */}
            <div className="col-span-1 md:col-span-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1 text-rose-500 text-center">
                🧈 Béo
              </label>
              <div className="flex items-center justify-center h-[38px] text-xs font-semibold text-rose-500 bg-slate-50 border border-slate-200/80 rounded-xl select-none">
                {manualFat !== "" ? `${manualFat}g` : "0g"}
              </div>
            </div>

            {/* Add button aligned on the same row */}
            <div className="col-span-1 md:col-span-1 flex items-end">
              <button
                onClick={handleAddManualItemToDraft}
                disabled={!manualName.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs h-[38px]"
                title="Thêm thực phẩm"
              >
                <Plus className="w-5 h-5 text-white shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Current Foods in draft table */}
        <div className="space-y-3 mb-6 flex-1">
          <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">
            Thành phần trong bữa ăn :
          </span>

          {draftItems.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-4">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Bữa ăn này chưa có thực phẩm nào.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Vui lòng nhập tìm thực phẩm ở bảng trên để thêm vào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-3 px-3 w-[40%]">Tên thực phẩm</th>
                    <th className="py-3 px-2 w-[20%]">Lượng</th>
                    <th className="py-3 px-1 w-[10%] text-center text-amber-500">Kcal</th>
                    <th className="py-3 px-1 w-[8%] text-center text-emerald-600">🥩 Đạm</th>
                    <th className="py-3 px-1 w-[8%] text-center text-sky-600">🍚 Carb</th>
                    <th className="py-3 px-1 w-[8%] text-center text-rose-500">🧈 Béo</th>
                    <th className="py-3 pr-3 w-[6%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                      {/* Name - Read Only Label */}
                      <td className="py-2.5 px-3 font-bold text-slate-700 max-w-[200px] truncate">
                        {item.foodName}
                      </td>
                      
                      {/* Quantity - Read Only Label */}
                      <td className="py-2.5 px-2 text-slate-600 font-medium">
                        {item.quantity}
                      </td>

                      {/* Cal */}
                      <td className="py-2.5 px-1 text-center font-bold text-amber-600">
                        {item.calories}
                      </td>

                      {/* Protein */}
                      <td className="py-2.5 px-1 text-center font-semibold text-emerald-600">
                        {item.protein}g
                      </td>

                      {/* Carb */}
                      <td className="py-2.5 px-1 text-center font-semibold text-sky-600">
                        {item.carb}g
                      </td>

                      {/* Fat */}
                      <td className="py-2.5 px-1 text-center font-semibold text-rose-500">
                        {item.fat}g
                      </td>

                      {/* Row Delete button */}
                      <td className="py-2.5 pr-3 text-right">
                        <button
                          onClick={() => handleDeleteDraftItem(idx)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Xóa thực phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sum total preview panel */}
        <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 my-6">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
            📊 Tổng cộng bữa ăn tạm tính:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-700">
            <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase">CALORIES</p>
              <p className="text-base font-extrabold text-amber-500 mt-0.5">
                {Math.round(totalCalculated.calories)} kcal
              </p>
            </div>
            <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">🥩 PROTEIN</p>
              <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                {Math.round(totalCalculated.protein * 10) / 10}g
              </p>
            </div>
            <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
              <p className="text-[10px] text-sky-600 font-bold uppercase">🍚 CARB</p>
              <p className="text-base font-extrabold text-sky-600 mt-0.5">
                {Math.round(totalCalculated.carb * 10) / 10}g
              </p>
            </div>
            <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
              <p className="text-[10px] text-rose-500 font-bold uppercase">🧈 FAT</p>
              <p className="text-base font-extrabold text-rose-500 mt-0.5">
                {Math.round(totalCalculated.fat * 10) / 10}g
              </p>
            </div>
          </div>
        </div>

        {/* Action items */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSaveToHistory}
            disabled={draftItems.length === 0}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5 text-white" />
            <span>Lưu Bữa Ăn Vào Nhật Ký</span>
          </button>
          
          <button
            onClick={handleResetForm}
            className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
          >
            Đặt lại Form
          </button>
        </div>

      </div>
    </div>
  );
}
