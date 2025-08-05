@echo off
echo 启动DeepSeek翻译API服务器...
echo.
echo 请确保已安装所需依赖：
echo pip install flask flask-cors openai python-dotenv
echo.
echo 按任意键继续...
pause > nul

cd /d "%~dp0"
python translation_server.py
pause