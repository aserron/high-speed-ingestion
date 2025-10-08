@echo off
REM Test runner script for message processor unit tests
REM This script runs both Python and Node.js tests for the message processors

echo Running Message Processor Unit Tests...
echo =======================================

REM Run Python tests
echo.
echo Running Python Message Processor Tests...
echo -----------------------------------------
cd apps\python-ingestion
where pytest >nul 2>nul
if %errorlevel% == 0 (
    python -m pytest ..\..\tests\python\test_message_processor.py -v --tb=short
) else (
    echo pytest not found, skipping Python tests
)
cd ..\..

REM Run Node.js tests
echo.
echo Running Node.js Message Processor Tests...
echo ------------------------------------------
cd apps\node-ingestion
where npm >nul 2>nul
if %errorlevel% == 0 (
    npm test -- --testPathPattern=message-processor
) else (
    echo npm not found, skipping Node.js tests
)
cd ..\..

echo.
echo Test execution completed!
echo ========================
pause