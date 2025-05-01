#!/bin/bash

# Function to check if service is running on a port
check_port() {
  local port=$1
  (echo > /dev/tcp/localhost/$port) >/dev/null 2>&1
  return $?
}

# Function to kill processes by port
kill_port() {
  local port=$1
  echo "Killing process on port $port if it exists..."
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
  fi
}

# Kill any processes on ports 8080 and 3000 if they exist
kill_port 8080
kill_port 3000

# Check if Fabric network is running
if [ $(docker ps -q -f "name=peer0.org1.example.com" | wc -l) -eq 0 ]; then
  echo "Fabric network is not running. Starting it now..."
  ./fixed_start.sh
else
  echo "Fabric network is already running."
fi

# Start the backend in a new terminal
echo "Starting backend server..."
cd backend
npm install
node server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
max_attempts=10
attempt=1
while ! check_port 8080; do
  if [ $attempt -ge $max_attempts ]; then
    echo "ERROR: Backend server did not start after $max_attempts attempts."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  echo "Waiting for backend to start (attempt $attempt/$max_attempts)..."
  sleep 2
  ((attempt++))
done

echo "Backend server started. Testing connection..."
response=$(curl -s http://localhost:8080/api/health)
if [[ $response == *"ok"* ]]; then
  echo "Backend health check passed!"
else
  echo "WARNING: Backend health check failed. Response: $response"
fi

# Start the frontend in a new terminal
echo "Starting frontend application..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "Waiting for frontend to start..."
max_attempts=20
attempt=1
while ! check_port 3000; do
  if [ $attempt -ge $max_attempts ]; then
    echo "ERROR: Frontend server did not start after $max_attempts attempts."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
  fi
  echo "Waiting for frontend to start (attempt $attempt/$max_attempts)..."
  sleep 2
  ((attempt++))
done

echo "All components started!"
echo "Backend running at http://localhost:8080 with PID: $BACKEND_PID"
echo "Frontend running at http://localhost:3000 with PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop all components"

# Wait for Ctrl+C
function cleanup {
  echo "Stopping components..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup INT
wait 