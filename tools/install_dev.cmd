@echo off
setlocal
rem ==========================================================================
rem  YexoFX : installation DEV de l'extension CEP (aucun droit admin requis)
rem  1. Autorise les extensions non signées dans les apps Adobe (PlayerDebugMode,
rem     réglage utilisateur HKCU, CEP 9 à 13). Nécessaire tant que l'extension
rem     n'est pas signée en .zxp.
rem  2. Crée un LIEN (jonction) entre le dossier cep\ du projet et le dossier des
rem     extensions Adobe : chaque nouveau build est pris en compte sans copie.
rem  Pour annuler : tools\uninstall_dev.cmd
rem ==========================================================================
for %%v in (9 10 11 12 13) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

set "SRC=%~dp0..\cep"
set "EXT=%APPDATA%\Adobe\CEP\extensions"
set "DST=%EXT%\com.yexo.yexofx"
if not exist "%EXT%" mkdir "%EXT%"
if exist "%DST%" rmdir "%DST%"
mklink /J "%DST%" "%SRC%" >nul
if errorlevel 1 (
  echo ECHEC : impossible de creer le lien "%DST%".
  pause
  exit /b 1
)
echo.
echo OK : YexoFX est installe en mode dev.
echo  - Ferme After Effects s'il est ouvert, puis relance-le.
echo  - Menu Window ^> Extensions ^> YexoFX
echo.
pause
