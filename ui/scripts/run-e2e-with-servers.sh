#!/bin/bash

# Script to run E2E tests with proper server management
set -e

echo "🔧 Building backend..."
cd ..
npm run build

echo "🚀 Starting backend server..."
npm start &
BACKEND_PID=$!

echo "⏳ Waiting for backend server to start on port 3001..."
for i in {1..60}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend server started successfully"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Backend server failed to start within 60 seconds"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo "🎨 Starting frontend server..."
cd ui
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend server to start..."
FRONTEND_PORT=""
for i in {1..60}; do
    # Check the log for the actual port Vite is using
    if [ -f frontend.log ]; then
        FRONTEND_PORT=$(grep -o "http://localhost:[0-9]*" frontend.log | head -1 | grep -o "[0-9]*$" || echo "")
        if [ ! -z "$FRONTEND_PORT" ] && curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            echo "✅ Frontend server started successfully on port $FRONTEND_PORT"
            export UI_BASE_URL="http://localhost:$FRONTEND_PORT"
            break
        fi
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Frontend server failed to start within 60 seconds"
        echo "Frontend log contents:"
        cat frontend.log 2>/dev/null || echo "No frontend log found"
        kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo "🧪 Running E2E tests..."
SKIP_WEB_SERVER=true npx playwright test
E2E_EXIT_CODE=$?

echo "🛑 Stopping servers..."
kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true

# Clean up log file
rm -f frontend.log 2>/dev/null || true

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests passed!"
else
    echo "❌ E2E tests failed!"
fi

exit $E2E_EXIT_CODE