# 🇻🇳 Vietnamese Text-to-Speech (TTS) Pro

Một ứng dụng chuyển đổi văn bản thành giọng nói tiếng Việt chuyên nghiệp, hiện đại và mạnh mẽ, được xây dựng bằng **Next.js 15** và **Google Cloud TTS API**.

![Project Banner](public/project_banner.png)

## ✨ Tính Năng Nổi Bật

### 🎙️ Chất Lượng Giọng Nói Tuyệt Hảo
- Tích hợp **Google Cloud Text-to-Speech API**.
- Hỗ trợ **6 giọng đọc** chất lượng cao (Neural2 & WaveNet).
- Tùy chỉnh **Tốc độ đọc (0.5x - 2x)**.
- **Voice Preview**: Nghe thử giọng đọc trước khi tạo audio.

### 🎧 Trình Phát Audio Nâng Cao
- **Waveform Visualization**: Hiển thị sóng âm chuyên nghiệp với `wavesurfer.js`.
- **Điều khiển thông minh**: Play/Pause, tua đoạn, tự động dừng khi preview.
- **Dark Mode**: Giao diện sóng âm thay đổi theo chế độ sáng/tối.

### 📂 Hỗ Trợ Đa Định Dạng File
Không chỉ nhập văn bản, bạn có thể upload trực tiếp các file tài liệu:
- **Văn bản**: `.txt`
- **Tài liệu**: `.docx` (Word), `.pdf`
- **Dữ liệu**: `.xlsx`, `.xls` (Excel), `.csv`

### ⚡ Hiệu Năng & Tiện Ích
- **Smart Caching**: Tự động lưu cache audio để tiết kiệm API và tăng tốc độ tải.
- **Lịch sử**: Lưu lại các đoạn văn bản đã đọc gần đây.
- **Phím tắt (Shortcuts)**: Điều khiển nhanh bằng bàn phím (Space, R, D, Arrow Keys...).
- **Responsive**: Giao diện tương thích hoàn hảo trên Mobile & Desktop.

---

## 🛠️ Công Nghệ Sử Dụng

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Audio Processing**:
    - `wavesurfer.js` (Audio Visualization)
- **File Parsing**:
    - `mammoth` (.docx)
    - `pdfjs-dist` (.pdf)
    - `xlsx` (Excel/CSV)
- **Deployment**: Vercel

---

## 🚀 Cài Đặt & Chạy Local

1.  **Clone dự án**:
    ```bash
    git clone https://github.com/hpnhann/vietnamese-tts.git
    cd vietnamese-tts
    ```

2.  **Cài đặt dependencies**:
    ```bash
    npm install
    ```

3.  **Cấu hình biến môi trường**:
    - Tạo file `.env.local` tại thư mục gốc.
    - Thêm API Key của Google Cloud:
      ```env
      GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
      ```
    *(Lưu ý: Cần kích hoạt **Cloud Text-to-Speech API** trong Google Cloud Console)*

4.  **Chạy server development**:
    ```bash
    npm run dev
    ```
    Truy cập [http://localhost:3000](http://localhost:3000).

---

## ⌨️ Phím Tắt (Keyboard Shortcuts)

| Phím | Chức năng |
| :--- | :--- |
| `Space` / `Enter` | Phát / Tạm dừng |
| `R` | Phát lại từ đầu (Restart) |
| `D` | Tải file Audio (.mp3) |
| `Esc` | Dừng hẳn (Stop) |
| `↑` / `↓` | Tăng / Giảm tốc độ đọc |
| `H` | Mở / Đóng Lịch sử |
| `?` | Xem danh sách phím tắt |

---

## ☁️ Deploy lên Vercel

Dự án này được tối ưu để deploy trên [Vercel](https://vercel.com).

1.  Push code lên GitHub.
2.  Import project vào Vercel.
3.  Trong phần **Environment Variables**, thêm:
    - Key: `GOOGLE_CLOUD_API_KEY`
    - Value: `[API Key của bạn]`
4.  Bấm **Deploy**.

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Built with ❤️ by [hpnhann]*
