@echo off
setlocal
set OUTFILE=
set INFILE=

:loop
if "%~1"=="" goto done
if "%~1"=="-out" (
    set OUTFILE=%~2
    shift
    shift
    goto loop
)
if "%~1"=="-emit-binary" (
    shift
    goto loop
)
if "%~1"=="-O" (
    shift
    goto loop
)
if "%~1"=="-output-source-map" (
    shift
    goto loop
)
echo %1 | findstr /C:"-" >nul
if errorlevel 1 (
    set INFILE=%~1
)
shift
goto loop

:done
if not "%INFILE%"=="" (
    if not "%OUTFILE%"=="" (
        copy /Y "%INFILE%" "%OUTFILE%" >nul
        echo {"version":3,"file":"index.android.bundle","sources":[],"names":[],"mappings":""} > "%OUTFILE%.map"
    )
)
