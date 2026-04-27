@echo off
echo.
echo ====================================
echo   WHMedia Streaming Server
echo ====================================
echo.

echo Starting server...
echo.
echo Access WHMedia from this computer:
echo   http://localhost:3001
echo.
echo Access WHMedia from other devices:
echo   http://YOUR_IP_ADDRESS:3001
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js
pause