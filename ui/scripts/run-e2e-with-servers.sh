#!/bin/bash

# Script to run E2E tests with proper server management
set -e

echo "🔧 Building backend..."
cd ..
npm run build

echo "🚀 Starting backend server..."
npm start &
BACKEND_PID=$!

echo "⏳ Waiting for backend server to start on port 3000..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
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
npm run dev &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend server to start on port 5174..."
for i in {1..60}; do
    if curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo "✅ Frontend server started successfully"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Frontend server failed to start within 60 seconds"
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

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests passed!"
else
    echo "❌ E2E tests failed!"
fi

exit $E2E_EXIT_CODE