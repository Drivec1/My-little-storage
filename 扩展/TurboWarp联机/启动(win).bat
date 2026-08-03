@echo off
chcp 65001 >nul
title TurboWarp 云服务器

:: 检查 node 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 再运行本脚本。
    echo 下载地址：https://nodejs.org
    pause
    exit /b
)

:: 切换到脚本所在目录
cd /d "%~dp0"

echo 🚀 正在启动 TurboWarp 云服务器...
echo.

:: 启动服务器（默认 3000 端口，如需其他端口可修改下面的数字）
node server.js

:: 如果闪退，执行暂停
pause