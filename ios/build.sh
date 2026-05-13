#!/bin/bash
set -e

cd "$(dirname "$0")"

# Detect Xcodegen
XCODEGEN=""
if command -v xcodegen &> /dev/null; then
    XCODEGEN="xcodegen"
elif [ -x "/opt/homebrew/bin/xcodegen" ]; then
    XCODEGEN="/opt/homebrew/bin/xcodegen"
elif [ -x "/usr/local/bin/xcodegen" ]; then
    XCODEGEN="/usr/local/bin/xcodegen"
else
    echo "❌ xcodegen not found. Install via: brew install xcodegen"
    exit 1
fi

# Detect bundle
if ! command -v bundle &> /dev/null; then
    echo "❌ bundler not found. Install via: gem install bundler"
    exit 1
fi

# Detect fastlane
if ! command -v fastlane &> /dev/null; then
    echo "⚠️  fastlane not found in PATH. Attempting via bundle exec..."
    FASTLANE="bundle exec fastlane"
else
    FASTLANE="fastlane"
fi

echo "📦 Installing Ruby dependencies..."
bundle install

echo "🛠 Generating Xcode project..."
$XCODEGEN generate

echo "🔨 Building RoleVault (Debug)..."
$FASTLANE build_debug

echo "✅ Build complete. Output in ./build/"
