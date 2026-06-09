@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Installing Flask if needed...
py -m pip install flask -q 2>nul
py -c "import flask" 2>nul || ( echo [خطأ] فشل تثبيت Flask & pause & exit /b )

echo -----------------------------
echo تشغيل خادم BAHA...
echo اضغط Ctrl+C للإيقاف
echo -----------------------------
py -m app
pause
