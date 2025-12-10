#!/bin/bash

# Secure Santa - Setup Script
# Installs dependencies for both backend and frontend

echo "Installing Secure Santa..."
echo ""

# Backend setup
echo "Setting up backend..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "Backend dependencies installed"
else
    echo "Backend installation failed"
    exit 1
fi
cd ..

echo ""

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo "Frontend dependencies installed"
else
    echo "Frontend installation failed"
    exit 1
fi
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend"
echo "  npm run dev"
