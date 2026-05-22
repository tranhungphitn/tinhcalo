import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const isVercel = process.env.VERCEL === "1";
const dataDir = isVercel ? "/tmp" : process.cwd();

const app = express();
const PORT = Number(process.env.PORT) || 4122;


app.use(express.json());

// Helper for lazy loading Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm key trong Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// Path to store custom foods JSON file
const CUSTOM_FOODS_FILE_PATH = path.join(dataDir, "thuc_pham_thuong_an.json");

// Helper function to seed initial custom foods if file doesn't exist
function getInitialSeededCustomFoods(): any[] {
  return [];
}

// Read custom foods from JSON file specific to a user
function readCustomFoodsFromFile(username: string): any[] {
  try {
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `thuc_pham_thuong_an_${safeUsername}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileData);
    } else {
      // Seed dynamically: if global default file exists, copy it, otherwise seed from helper
      let defaultFoods: any[] = [];
      if (fs.existsSync(CUSTOM_FOODS_FILE_PATH)) {
        try {
          const globalData = fs.readFileSync(CUSTOM_FOODS_FILE_PATH, "utf-8");
          defaultFoods = JSON.parse(globalData);
        } catch (e) {
          defaultFoods = getInitialSeededCustomFoods();
        }
      } else {
        defaultFoods = getInitialSeededCustomFoods();
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultFoods, null, 2), "utf-8");
      return defaultFoods;
    }
  } catch (err) {
    console.error(`Lỗi khi đọc file thuc_pham_thuong_an_${username}.json:`, err);
    return getInitialSeededCustomFoods();
  }
}

// 1. Endpoint: Trích xuất thông tin dinh dưỡng từ mô tả đồ ăn (có ưu tiên Dữ liệu Thức Ăn cá nhân trước, rồi cá biệt hóa internet sau)
app.post("/api/macros/extract", async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== "string" || description.trim() === "") {
      return res.status(400).json({ error: "Vui lòng nhập mô tả món ăn." });
    }

    const username = (req.headers["x-username"] as string) || "default";
    const customFoods = readCustomFoodsFromFile(username);
    const ai = getGeminiClient();

    let customFoodsPromptPart = "";
    if (customFoods && customFoods.length > 0) {
      customFoodsPromptPart = `
DƯỚI ĐÂY LÀ DANH SÁCH THỰC PHẨM CÁ NHÂN CỦA NGƯỜI DÙNG (CƠ SỞ DỮ LIỆU NỘI BỘ DỮ LIỆU THỨC ĂN KHÁCH HÀNG THƯỜNG ĂN):
${customFoods.map((f: any) => `- ${f.name} (${f.servingSize}): ${f.calories} kcal, ${f.protein}g đạm, ${f.carb}g carb, ${f.fat}g béo`).join("\n")}

Nhiệm vụ đặc biệt quan trọng (ƯU TIÊN TUYỆT ĐỐI SỐ 1 - TRONG CƠ SỞ DỮ LIỆU CÁ NHÂN):
1. Đối chiếu kỹ các từ khóa về tên thực phẩm và món ăn trong mô tả của người dùng ("${description}") với danh sách thực phẩm cá nhân nội bộ ở trên. 
2. Nếu trùng khớp hoặc tương đương (Ví dụ: "ức gà áp chảo", "trứng luộc", "cơm", hay viết tắt tương tự), bạn BẮT BUỘC PHẢI KHAI THÁC các giá trị calo và chất dinh dưỡng của thực phẩm đó từ danh sách này theo tỉ lệ khẩu phần nhân lên hay chia nhỏ tương ứng (Scale tỉ lệ thuận: ví dụ người dùng ăn 200g ức gà áp chảo mà khẩu phần mẫu của họ là 100g, hãy lấy giá trị nhân đôi).
3. Chỉ khi các thực phẩm người dùng nhập KHÔNG có thông tin trùng khớp hay liên quan tới cơ sở dữ liệu cá nhân ở trên, bạn mới được phép tra cứu mạng internet hay ước tính chung từ hệ thống dinh dưỡng chung.
4. Ưu tiên tìm trong cơ sở dữ liệu trước, nếu ko có thì mới kiếm trên internet. Vui lòng ghi nhận nguồn dinh dưỡng thật tương ứng từ các thực phẩm trên.
`;
    }

    const prompt = `Phân tích định lượng dinh dưỡng (calo, protein, carb, fat) của các loại thực phẩm / món ăn được nhập vào sau đây (bằng tiếng Việt hoặc tiếng Anh).
    ${customFoodsPromptPart}
    
    Hãy tham khảo và tuân thủ các quy tắc ưu tiên trên đối với mô tả đồ ăn sau:
    Mô tả đồ ăn từ người dùng: "${description}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Bạn là một chuyên gia dinh dưỡng giàu kinh nghiệm tại Việt Nam. Bạn có nhiệm vụ chuyển đổi mô tả tự nhiên của bữa ăn thành bảng thành phần dinh dưỡng chi tiết (calo trong đơn vị kcal, protein/carb/fat trong đơn vị g). Hãy ưu tiên tìm dinh dưỡng từ cơ sở dữ liệu thực phẩm nội bộ cá nhân được cung cấp trước, rồi mới sử dụng kiến thức khoa học dinh dưỡng và internet để tìm kiếm/tính chính xác cho các thực phẩm tự do khác.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meal: { type: Type.STRING, description: "Tên tóm tắt bữa ăn này (ví dụ: Cơm với ức gà và trứng luộc)" },
            items: {
              type: Type.ARRAY,
              description: "Danh sách từng thực phẩm có trong mô tả kèm thông tin dinh dưỡng chi tiết",
              items: {
                type: Type.OBJECT,
                properties: {
                  foodName: { type: Type.STRING, description: "Tên tiếng Việt thực phẩm hoặc món ăn (ví dụ: Cơm trắng, Trứng luộc, Ức gà áp chảo)" },
                  quantity: { type: Type.STRING, description: "Lượng thực phẩm hoặc khối lượng thực tế/ước lượng (ví dụ: 100g, 1 quả trung bình, 1 bát)" },
                  calories: { type: Type.NUMBER, description: "Calo ước tính của lượng thực phẩm này (kcal)" },
                  protein: { type: Type.NUMBER, description: "Lượng Protein (g)" },
                  carb: { type: Type.NUMBER, description: "Lượng Carbohydrate (g)" },
                  fat: { type: Type.NUMBER, description: "Lượng Chất béo (Fat) (g)" }
                },
                required: ["foodName", "quantity", "calories", "protein", "carb", "fat"]
              }
            },
            total: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER, description: "Tổng Calo của toàn bộ các thực phẩm trong bữa ăn này (kcal)" },
                protein: { type: Type.NUMBER, description: "Tổng Protein (g)" },
                carb: { type: Type.NUMBER, description: "Tổng Carbohydrate (g)" },
                fat: { type: Type.NUMBER, description: "Tổng Chất béo (g)" }
              },
              required: ["calories", "protein", "carb", "fat"]
            }
          },
          required: ["meal", "items", "total"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Không nhận được dữ liệu phản hồi từ Gemini.");
    }

    const data = JSON.parse(text.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Error in /api/macros/extract:", error);
    return res.status(500).json({ error: error.message || "Đã xảy ra lỗi khi phân tích dinh dưỡng." });
  }
});

// Endpoint: Lấy danh sách Dữ liệu Thức Ăn cá nhân
app.get("/api/custom-foods", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const list = readCustomFoodsFromFile(username);
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Không thể đọc danh sách thực phẩm cá nhân." });
  }
});

// Endpoint: Cập nhật danh sách Dữ liệu Thức Ăn cá nhân
app.post("/api/custom-foods", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const { customFoods } = req.body;
    if (!Array.isArray(customFoods)) {
      return res.status(400).json({ error: "Dữ liệu gửi lên phải là một danh sách dữ liệu thức ăn." });
    }
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `thuc_pham_thuong_an_${safeUsername}.json`);
    fs.writeFileSync(filePath, JSON.stringify(customFoods, null, 2), "utf-8");
    return res.json({ success: true, count: customFoods.length });
  } catch (error: any) {
    console.error(`Lỗi khi ghi file thuc_pham_thuong_an_${username}.json:`, error);
    return res.status(500).json({ error: error.message || "Không thể lưu danh sách dữ liệu thức ăn." });
  }
});

// Endpoint: Đăng nhập
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." });
    }

    const u = String(username).toLowerCase().trim();
    const p = String(password).trim();

    if ((u === "phi" || u === "tuyen") && p === "123") {
      return res.json({
        success: true,
        username: u,
        name: u === "phi" ? "Quản trị viên Phi" : "Người dùng Tuyên",
        role: u === "phi" ? "admin" : "user"
      });
    }

    return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Lỗi máy chủ khi đăng nhập." });
  }
});

// Helper function to seed initial data if file doesn't exist
function getInitialSeededMeals(): any[] {
  return [];
}

// Read meals from JSON file specific to a user
function readMealsFromFile(username: string): any[] {
  try {
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `lich_su_an_uong_${safeUsername}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileData);
    } else {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
  } catch (err) {
    console.error(`Lỗi khi đọc file lich_su_an_uong_${username}.json:`, err);
    return getInitialSeededMeals();
  }
}

// 2. Endpoint: Lấy tất cả lịch sử ăn uống
app.get("/api/meals", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const meals = readMealsFromFile(username);
    return res.json(meals);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Không thể đọc dữ liệu lịch sử ăn uống." });
  }
});

// 3. Endpoint: Cập nhật toàn bộ/Lưu bữa ăn mới vào lịch sử ăn uống
app.post("/api/meals", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const { meals } = req.body;
    if (!Array.isArray(meals)) {
      return res.status(400).json({ error: "Dữ liệu gửi lên phải là một danh sách bữa ăn." });
    }
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `lich_su_an_uong_${safeUsername}.json`);
    fs.writeFileSync(filePath, JSON.stringify(meals, null, 2), "utf-8");
    return res.json({ success: true, count: meals.length });
  } catch (error: any) {
    console.error("Lỗi khi ghi file lịch sử ăn uống:", error);
    return res.status(500).json({ error: error.message || "Không thể lưu dữ liệu lịch sử ăn uống." });
  }
});

// Helper function to read user-specific dynamic goal
function readGoalFromFile(username: string): any {
  try {
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `muc_tieu_${safeUsername}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileData);
    } else {
      const defaultGoal = { calories: 1800, protein: 120, carb: 200, fat: 55 };
      fs.writeFileSync(filePath, JSON.stringify(defaultGoal, null, 2), "utf-8");
      return defaultGoal;
    }
  } catch (err) {
    console.error(`Lỗi khi đọc file muc_tieu_${username}.json:`, err);
    return { calories: 1800, protein: 120, carb: 200, fat: 55 };
  }
}

// 4. Endpoint: Lấy mục tiêu dinh dưỡng cá nhân
app.get("/api/goal", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const goal = readGoalFromFile(username);
    return res.json(goal);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Không thể đọc dữ liệu mục tiêu dinh dưỡng." });
  }
});

// 5. Endpoint: Cập nhật mục tiêu dinh dưỡng cá nhân
app.post("/api/goal", (req, res) => {
  try {
    const username = (req.headers["x-username"] as string) || "default";
    const { goal } = req.body;
    if (!goal || typeof goal.calories !== "number") {
      return res.status(400).json({ error: "Dữ liệu mục tiêu dinh dưỡng không đúng cấu trúc." });
    }
    const safeUsername = String(username || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(dataDir, `muc_tieu_${safeUsername}.json`);
    fs.writeFileSync(filePath, JSON.stringify(goal, null, 2), "utf-8");
    return res.json({ success: true, goal });
  } catch (error: any) {
    console.error("Lỗi khi ghi file mục tiêu dinh dưỡng:", error);
    return res.status(500).json({ error: error.message || "Không thể lưu mục tiêu dinh dưỡng." });
  }
});

export default app;

// Setup Vite & Static Assets routing (only when not running on Vercel)
if (!isVercel) {
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting server in development mode with Vite middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Starting server in production mode...");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server fully started on port ${PORT}`);
    });
  }

  startServer();
}
