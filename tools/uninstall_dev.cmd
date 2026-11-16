@echo off
setlocal
rem YexoFX : retire le lien de l'extension (tes fichiers du projet ne sont pas touchés).
set "DST=%APPDATA%\Adobe\CEP\extensions\com.yexo.yexofx"
if exist "%DST%" rmdir "%DST%"
echo Lien YexoFX retire. Les reglages et la licence restent dans %APPDATA%\YexoFX.
echo (PlayerDebugMode reste actif : d'autres extensions non signees peuvent en avoir besoin.)
pause
