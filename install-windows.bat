@echo off
setlocal
title SequenceKeeper Installer
set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\SequenceKeeper"

echo.
echo SequenceKeeper Installer for Windows
echo ====================================
echo.

if not defined APPDATA (
  echo INSTALLATION STOPPED
  echo APPDATA is not defined for this Windows account.
  exit /b 1
)

if not exist "%SOURCE_DIR%CSXS\manifest.xml" (
  echo INSTALLATION STOPPED
  echo Installer files are incomplete. Extract the ZIP and run this file from its SequenceKeeper folder.
  exit /b 1
)

for %%A in ("%SOURCE_DIR%.") do set "SOURCE_FULL=%%~fA"
for %%A in ("%TARGET_DIR%") do set "TARGET_FULL=%%~fA"
if /I "%SOURCE_FULL%"=="%TARGET_FULL%" (
  echo INSTALLATION STOPPED
  echo This installer is inside the installed SequenceKeeper folder.
  echo Extract a fresh release ZIP and run the installer from there.
  exit /b 1
)

echo This installs or updates SequenceKeeper for your Windows account.
echo Quit Premiere Pro before continuing, then restart it after installation.
echo No administrator access is needed.
echo.
echo Install location:
echo %TARGET_DIR%
echo.
pause

echo.
echo [1/3] Preparing the install folder...
if not exist "%TARGET_DIR%" (
  mkdir "%TARGET_DIR%"
  if errorlevel 1 goto :folder_failed
)

echo.
echo [2/3] Copying SequenceKeeper files...
set "COPY_LOG=%TEMP%\SequenceKeeper-install-copy.log"
xcopy "%SOURCE_DIR%*" "%TARGET_DIR%\" /E /Y /I /H /R > "%COPY_LOG%" 2>&1
set "COPY_EXIT=%ERRORLEVEL%"
if not "%COPY_EXIT%"=="0" goto :copy_failed

echo.
echo [3/3] Enabling CEP extensions...
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
if errorlevel 1 goto :registry_failed

echo.
echo INSTALLATION COMPLETE
echo Start or restart Premiere Pro.
echo Open Window ^> Extensions (Legacy) ^> SequenceKeeper.
exit /b 0

:folder_failed
echo.
echo INSTALLATION STOPPED
echo SequenceKeeper could not create the installation folder:
echo %TARGET_DIR%
echo Check that this Windows account can write to its AppData folder.
exit /b 1

:copy_failed
echo.
echo INSTALLATION STOPPED
echo SequenceKeeper files could not be copied. Xcopy exit code: %COPY_EXIT%
echo Copy log: %COPY_LOG%
echo Open the log to see which file or permission caused the problem.
exit /b %COPY_EXIT%

:registry_failed
echo.
echo INSTALLATION PARTLY COMPLETE
echo SequenceKeeper files were copied, but CEP could not be enabled automatically.
echo Enable PlayerDebugMode for CSXS.11 and restart Premiere Pro.
exit /b 1