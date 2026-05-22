import React, { useState } from "react";
import { CustomFood } from "../types";
import { Plus, Trash2, Edit2, Check, Search, Info, Sparkles, FileText, Utensils } from "lucide-react";

interface CustomFoodsManagerProps {
  customFoods: CustomFood[];
  onUpdateCustomFoods: (updated: CustomFood[]) => Promise<void>;
  isAdmin?: boolean;
  username?: string;
}

export default function CustomFoodsManager({ customFoods, onUpdateCustomFoods, isAdmin = true, username = "default" }: CustomFoodsManagerProps) {
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("100g");
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carb, setCarb] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // States for editing inline fields
  const [editName, setEditName] = useState("");
  const [editServingSize, setEditServingSize] = useState("");
  const [editCalories, setEditCalories] = useState<number | "">("");
  const [editProtein, setEditProtein] = useState<number | "">("");
  const [editCarb, setEditCarb] = useState<number | "">("");
  const [editFat, setEditFat] = useState<number | "">("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [foodToDelete, setFoodToDelete] = useState<CustomFood | null>(null);

  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleAutoFillMacros = async () => {
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập Tên thực phẩm trước khi tra cứu AI.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAutoFilling(true);

    try {
      const descriptionQuery = servingSize.trim() 
        ? `${servingSize.trim()} ${name.trim()}` 
        : name.trim();

      const response = await fetch("/api/macros/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": username
        },
        body: JSON.stringify({ description: descriptionQuery })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể lấy dữ liệu macro từ AI.");
      }

      const data = await response.json();
      if (data.total) {
        setCalories(data.total.calories || 0);
        setProtein(data.total.protein || 0);
        setCarb(data.total.carb || 0);
        setFat(data.total.fat || 0);
        setSuccessMsg(`Đã tự động điền dinh dưỡng cho "${name.trim()}"!`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gặp sự cố khi kết nối với AI.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên thực phẩm.");
      return;
    }
    if (!servingSize.trim()) {
      setErrorMsg("Vui lòng nhập khẩu phần (ví dụ: 100g, 1 bát, 1 quả).");
      return;
    }

    const nCal = calories === "" ? 0 : Number(calories);
    const nProt = protein === "" ? 0 : Number(protein);
    const nCarb = carb === "" ? 0 : Number(carb);
    const nFat = fat === "" ? 0 : Number(fat);

    if (nCal < 0 || nProt < 0 || nCarb < 0 || nFat < 0) {
      setErrorMsg("Các chỉ số dinh dưỡng không thể là số âm.");
      return;
    }

    const newItem: CustomFood = {
      id: `cf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      servingSize: servingSize.trim(),
      calories: nCal,
      protein: nProt,
      carb: nCarb,
      fat: nFat
    };

    const updated = [...customFoods, newItem];
    try {
      await onUpdateCustomFoods(updated);
      setSuccessMsg(`Đã tạo thành công thực phẩm: "${newItem.name}"!`);
      // Reset form
      setName("");
      setServingSize("100g");
      setCalories("");
      setProtein("");
      setCarb("");
      setFat("");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg("Gặp sự cố khi đồng bộ thực phẩm với server.");
    }
  };

  const handleDeleteFood = (id: string, foodName: string) => {
    const foodFound = customFoods.find(f => f.id === id);
    if (foodFound) {
      setFoodToDelete(foodFound);
    }
  };

  const confirmDeleteFood = async () => {
    if (!foodToDelete) return;
    setErrorMsg(null);
    const filtered = customFoods.filter(f => f.id !== foodToDelete.id);
    try {
      await onUpdateCustomFoods(filtered);
      setSuccessMsg(`Đã xóa thực phẩm: "${foodToDelete.name}".`);
      setFoodToDelete(null);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setErrorMsg("Không thể lưu thay đổi trên server.");
      setFoodToDelete(null);
    }
  };

  const handleStartEdit = (food: CustomFood) => {
    setEditingId(food.id);
    setEditName(food.name);
    setEditServingSize(food.servingSize);
    setEditCalories(food.calories);
    setEditProtein(food.protein);
    setEditCarb(food.carb);
    setEditFat(food.fat);
  };

  const handleSaveEdit = async (id: string) => {
    setErrorMsg(null);
    if (!editName.trim()) {
      setErrorMsg("Tên thực phẩm sửa đổi không được để trống.");
      return;
    }

    const updated = customFoods.map(f => {
      if (f.id === id) {
        return {
          ...f,
          name: editName.trim(),
          servingSize: editServingSize.trim() || "100g",
          calories: editCalories === "" ? 0 : Number(editCalories),
          protein: editProtein === "" ? 0 : Number(editProtein),
          carb: editCarb === "" ? 0 : Number(editCarb),
          fat: editFat === "" ? 0 : Number(editFat)
        };
      }
      return f;
    });

    try {
      await onUpdateCustomFoods(updated);
      setEditingId(null);
      setSuccessMsg("Đã cập nhật thực phẩm thành công!");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setErrorMsg("Lỗi khi đồng bộ chỉnh sửa với máy chủ.");
    }
  };



  const filteredFoods = customFoods.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.servingSize.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full" id="custom_foods_manager_root">
      
      {/* LEFT COLUMN: ADD FOOD FORM */}
      <div className="col-span-1 lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-fit">
        <form onSubmit={handleAddFood} className="space-y-4">
          <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Utensils className="w-5 h-5 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Thêm vào Dữ liệu Thức Ăn</h2>
                <p className="text-[11px] text-slate-400">Các món ăn chế biến riêng hoặc sản phẩm yêu thích của bạn</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-3.5 text-xs font-semibold flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-3.5 text-xs font-semibold flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Tên thực phẩm *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bún bò huế thăn heo, Sữa chua..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-medium transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAutoFillMacros}
                  disabled={isAutoFilling}
                  className="w-full bg-amber-50/70 hover:bg-amber-100/80 border border-dashed border-amber-300 hover:border-amber-400 text-amber-800 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 text-[11px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isAutoFilling ? "animate-pulse" : ""}`} />
                  <span>{isAutoFilling ? "Đang tra cứu AI & internet..." : "Tra cứu & Điền nhanh dinh dưỡng bằng AI"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Khẩu phần *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 100g, 1 bát"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-medium transition-all"
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-600 block mb-1 uppercase tracking-wider">🔥 Calo (kcal)</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 130"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-bold text-amber-600 transition-all"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 block mb-1 uppercase tracking-wider">🥩 Đạm (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 12.5"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-bold text-emerald-600 transition-all"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-sky-600 block mb-1 uppercase tracking-wider">🍚 Carb (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 45"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-bold text-sky-600 transition-all"
                    value={carb}
                    onChange={(e) => setCarb(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-rose-500 block mb-1 uppercase tracking-wider">🧈 Béo (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ví dụ: 3.2"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400/20 font-bold text-rose-500 transition-all"
                    value={fat}
                    onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Lưu thực phẩm mới
              </button>
            </div>
          </form>

        {/* Informative Tip */}
        <div className="mt-6 bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 flex gap-3 text-slate-600 text-xs leading-relaxed">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">Bí quyết sử dụng</span>
            Khi bạn nhập các món ăn này vào ô tư vấn <strong className="text-emerald-700">"Bạn hôm nay ăn gì?"</strong>, hệ thống tự động đối chiếu calo/macro cực kỳ chính xác bạn đã khai báo ở đây!
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: SEARCHABLE GRID TABLE */}
      <div className="col-span-1 lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between overflow-hidden h-fit">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Cơ sở dữ liệu Thức Ăn ({customFoods.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Danh sách các món ăn có độ ưu tiên cao nhất của bạn</p>
            </div>
          </div>

          {/* Table Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-700 placeholder-slate-400 transition-all font-medium"
              placeholder="Tìm nhanh theo tên thực phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredFoods.length === 0 ? (
            <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Chưa có thực phẩm nào khớp
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Nhập các món ăn bạn thường tự chuẩn bị ở cột trái để tạo cơ sở dữ liệu dinh dưỡng cốt lõi!
              </p>
            </div>
          ) : (
            <>
              {/* Desktop view: Table layout */}
              <div className="hidden md:block border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-[10px] text-slate-500 font-bold border-b border-slate-200 leading-none">
                      <th className="py-3 px-4">Tên thực phẩm (Khẩu phần)</th>
                      <th className="py-3 px-2 text-center text-amber-600">Calo</th>
                      <th className="py-3 px-2 text-center text-emerald-600">🥩 Đạm</th>
                      <th className="py-3 px-2 text-center text-sky-600">🍚 Carb</th>
                      <th className="py-3 px-2 text-center text-rose-500">🧈 Béo</th>
                      <th className="py-3 px-4 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600 font-medium">
                    {filteredFoods.map((food) => {
                      const isEditing = editingId === food.id;
                      return (
                        <tr key={food.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="space-y-1.5 py-1">
                                <input
                                  type="text"
                                  className="bg-white border border-slate-300 focus:border-emerald-500 focus:outline-hidden p-1 px-2 rounded-lg text-xs font-semibold w-full"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="bg-white border border-slate-300 focus:border-emerald-500 focus:outline-hidden p-1 px-2 rounded-lg text-[10px] text-slate-500 w-full"
                                  value={editServingSize}
                                  onChange={(e) => setEditServingSize(e.target.value)}
                                />
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-700 block text-xs leading-tight">{food.name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">Hạn mức: {food.servingSize}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                className="bg-white border border-slate-300 p-1 rounded-md text-center max-w-[60px] font-bold text-amber-600 focus:outline-hidden text-xs"
                                value={editCalories}
                                onChange={(e) => setEditCalories(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            ) : (
                              <span className="font-extrabold text-amber-600 text-xs">{food.calories}</span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white border border-slate-300 p-1 rounded-md text-center max-w-[50px] font-bold text-emerald-600 focus:outline-hidden text-xs"
                                value={editProtein}
                                onChange={(e) => setEditProtein(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">{food.protein}g</span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white border border-slate-300 p-1 rounded-md text-center max-w-[50px] font-bold text-sky-600 focus:outline-hidden text-xs"
                                value={editCarb}
                                onChange={(e) => setEditCarb(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            ) : (
                              <span className="font-bold text-sky-600">{food.carb}g</span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.1"
                                className="bg-white border border-slate-300 p-1 rounded-md text-center max-w-[50px] font-bold text-rose-500 focus:outline-hidden text-xs"
                                value={editFat}
                                onChange={(e) => setEditFat(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            ) : (
                              <span className="font-bold text-rose-500">{food.fat}g</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(food.id)}
                                    className="p-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-all cursor-pointer flex items-center"
                                    title="Lưu sửa"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-lg transition-all cursor-pointer text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(food)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                    title="Chỉnh sửa sản phẩm"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFood(food.id, food.name)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Xóa sản phẩm"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile view: Cards list layout */}
              <div className="md:hidden space-y-3.5">
                {filteredFoods.map((food) => {
                  const isEditing = editingId === food.id;
                  return (
                    <div
                      key={food.id}
                      className="bg-slate-50/60 border border-slate-150 rounded-2xl p-4.5 space-y-3.5 hover:bg-slate-50 transition-colors shadow-3xs"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Tên thực phẩm</label>
                            <input
                              type="text"
                              className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:outline-hidden p-2 rounded-xl text-xs font-semibold"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Khẩu phần</label>
                            <input
                              type="text"
                              className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:outline-hidden p-2 rounded-xl text-xs font-semibold"
                              value={editServingSize}
                              onChange={(e) => setEditServingSize(e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-amber-600 block mb-1 uppercase tracking-wider">🔥 Calo (kcal)</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-amber-600 focus:outline-hidden text-xs"
                                value={editCalories}
                                onChange={(e) => setEditCalories(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-emerald-600 block mb-1 uppercase tracking-wider">🥩 Đạm (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-emerald-600 focus:outline-hidden text-xs"
                                value={editProtein}
                                onChange={(e) => setEditProtein(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-sky-600 block mb-1 uppercase tracking-wider">🍚 Carb (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-sky-600 focus:outline-hidden text-xs"
                                value={editCarb}
                                onChange={(e) => setEditCarb(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-rose-500 block mb-1 uppercase tracking-wider">🧈 Béo (g)</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full bg-white border border-slate-300 p-2 rounded-xl font-bold text-rose-500 focus:outline-hidden text-xs"
                                value={editFat}
                                onChange={(e) => setEditFat(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2.5 pt-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(food.id)}
                              className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                              <Check className="w-4 h-4" />
                              Lưu thay đổi
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-sm leading-snug break-words">{food.name}</h4>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Khẩu phần: {food.servingSize}</span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(food)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                                title="Chỉnh sửa sản phẩm"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFood(food.id, food.name)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Xóa sản phẩm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-3xs">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Calo</span>
                              <span className="font-extrabold text-amber-600 text-xs">{food.calories}</span>
                            </div>
                            <div className="flex flex-col items-center border-l border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">🥩 Đạm</span>
                              <span className="font-bold text-emerald-600 text-xs">{food.protein}g</span>
                            </div>
                            <div className="flex flex-col items-center border-l border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">🍚 Carb</span>
                              <span className="font-bold text-sky-600 text-xs">{food.carb}g</span>
                            </div>
                            <div className="flex flex-col items-center border-l border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">🧈 Béo</span>
                              <span className="font-bold text-rose-500 text-xs">{food.fat}g</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* DELETE FOOD CONFIRMATION MODAL */}
      {foodToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="delete_food_modal">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-150 w-full max-w-sm relative animate-zoom-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Dữ liệu thức ăn</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Bạn có chắc chắn muốn xóa <strong className="text-slate-700">"{foodToDelete.name}"</strong> khỏi dữ liệu thức ăn?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setFoodToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition-all cursor-pointer border-none"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteFood}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer border-none"
                >
                  Xóa thực phẩm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
