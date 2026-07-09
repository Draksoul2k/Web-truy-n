@echo off
title Manga Premium Server Debug
echo ==================================================
echo   DANG KHOI CHAY SERVER DE TRANH LOI AN DANH
echo ==================================================
echo.

:: Tắt các tiến trình kẹt cũ
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM pythonw.exe >nul 2>&1

:: Mở trình duyệt trước
echo [*] Dang mo trinh duyet...
start http://localhost:3000

:: Chạy server ở chế độ hiện hình (Visible) để bắt lỗi trực tiếp nếu có
echo [*] Dang chay may chu tai cong 3000...
"C:\Users\Admin\AppData\Local\Python\pythoncore-3.14-64\python.exe" "%~dp0server.py"

echo.
echo ==================================================
echo [CANH BAO] Server da bi dung dot ngot!
echo Xem dong chu bao loi phia tren va chup anh gui cho minh.
echo ==================================================
pause
