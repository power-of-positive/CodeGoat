#!/bin/bash

# Script to install all dependencies for the main project and UI folder
# This script should be run from the root directory of the project

echo "🚀 Installing dependencies for all projects..."

# Check if we're in the root directory
if [ ! -f "package.json" ] || [ ! -d "ui" ]; then
    echo "❌ Error: This script must be run from the root directory of the project"
    echo "   Make sure you're in the directory containing package.json and the ui/ folder"
    exit 1
fi

# Function to install dependencies with error handling
install_deps() {
    local dir_name="$1"
    local package_path="$2"
    
    echo ""
    echo "📦 Installing dependencies for $dir_name..."
    echo "   Directory: $package_path"
    
    if [ ! -f "$package_path" ]; then
        echo "   ⚠️  Warning: $package_path not found, skipping..."
        return 0
    fi
    
    # Install dependencies
    if npm install --prefix "$package_path"; then
        echo "   ✅ Dependencies installed successfully for $dir_name"
    else
        echo "   ❌ Failed to install dependencies for $dir_name"
        return 1
    fi
}

# Install main project dependencies
if ! install_deps "main project" "."; then
    echo ""
    echo "❌ Failed to install main project dependencies"
    exit 1
fi

# Install UI project dependencies
if ! install_deps "UI project" "ui"; then
    echo ""
    echo "❌ Failed to install UI project dependencies"
    exit 1
fi

echo ""
echo "🎉 All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "  • Run './scripts/dev.sh' to start both projects"
echo "  • Run 'npm run dev' to start the main project only"
echo "  • Run 'cd ui && npm run dev' to start the UI only"