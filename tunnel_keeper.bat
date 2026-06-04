@echo off
:: 터미널 인코딩 UTF-8 고정
chcp 65001 > nul
title QR Tunnel Auto Runner

:loop
cls
echo 🚀 [도커 연동] Localtunnel 고정 주소 모드를 가동합니다.
echo 🔗 고정 목적지 주소: https://splendid-earwig-31.loca.lt
echo -------------------------------------------------------------
echo 💡 팁: index.js를 수정하여 도커가 재시작되더라도,
echo      이 창은 끊김을 감지하고 2초 뒤 동일한 주소로 자동 복구됩니다.
echo -------------------------------------------------------------

:: 💡 대문자/특수문자를 배제한 순수 소문자+숫자+하이픈 조합으로 subdomain 지정
npx localtunnel --port 3000 --subdomain splendid-earwig-31

:: 💡 Node.js 재시작으로 인해 터널이 죽으면 이 아래 라인으로 내려옵니다.
echo.
echo ⚠️ [경고] 도커 서버 재시작 또는 네트워크 단절로 터널이 일시 끊겼습니다.
echo 🔄 2초 후 동일한 주소(dev-qr-same-2026)로 터널을 즉시 재건합니다...
timeout /t 2 > nul
goto loop