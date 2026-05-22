<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c98dcf42-00a7-44f0-92fb-d5bf496a7376

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Cấu hình Firebase (Lưu trữ dữ liệu bền vững trên Vercel)

Mặc định ứng dụng sẽ tự động ghi dữ liệu vào các tệp JSON ở local. Khi triển khai lên Vercel, các tệp này bị xoá sau mỗi lần server restart hoặc container spin-down. Để lưu trữ dữ liệu vĩnh viễn, bạn hãy cấu hình kết nối **Firebase Firestore** theo các bước sau:

### Bước 1: Tạo Firebase Project & Lấy Service Account JSON
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo một Project mới.
2. Tại menu bên trái, nhấn vào **Project settings** (biểu tượng bánh răng) -> Chọn tab **Service accounts**.
3. Chọn tùy chọn **Node.js** và nhấn nút **Generate new private key**. Một file `.json` chứa thông tin xác thực của Service Account sẽ được tải xuống máy tính của bạn.

### Bước 2: Cấu hình Biến môi trường
Cấu hình biến môi trường `FIREBASE_SERVICE_ACCOUNT` trên môi trường chạy của bạn:
- **Chạy local (`.env.local`):** Sao chép toàn bộ nội dung của file `.json` vừa tải xuống, dán vào giá trị của biến `FIREBASE_SERVICE_ACCOUNT`. Ví dụ:
  ```env
  FIREBASE_SERVICE_ACCOUNT="{"type": "service_account", "project_id": "...", ...}"
  ```
  *(Hoặc bạn có thể mã hóa chuỗi JSON này sang dạng Base64 và điền vào để tránh lỗi xuống dòng trên các hệ thống khác)*.
- **Chạy trên Vercel:** Vào Dashboard của Vercel -> Settings -> Environment Variables -> Thêm biến mới với key là `FIREBASE_SERVICE_ACCOUNT` và value là nội dung file `.json` trên.

*Lưu ý: Nếu không cấu hình `FIREBASE_SERVICE_ACCOUNT`, ứng dụng vẫn tự động hoạt động bình thường ở chế độ ghi file JSON cục bộ (Graceful Fallback).*

