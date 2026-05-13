#!/bin/bash
set -euo pipefail

# setup-swiftly.sh
# Installs Swiftly (Swift toolchain manager), Swift 6.0, and ensures PATH is configured.
# Run: chmod +x setup-swiftly.sh && ./setup-swiftly.sh

SWIFTLY_BIN="${HOME}/.swiftly/bin"
SHELL_PROFILE=""

# Detect shell profile
detect_shell_profile() {
    case "${SHELL:-}" in
        */zsh)
            SHELL_PROFILE="${HOME}/.zshrc"
            ;;
        */bash)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                SHELL_PROFILE="${HOME}/.bash_profile"
            else
                SHELL_PROFILE="${HOME}/.bashrc"
            fi
            ;;
        *)
            SHELL_PROFILE="${HOME}/.profile"
            ;;
    esac
}

# Install swiftly if not present
install_swiftly() {
    if command -v swiftly &> /dev/null; then
        echo "✅ swiftly already installed: $(swiftly --version)"
        return 0
    fi

    echo "📥 Installing swiftly..."
    curl -L https://swift.org/install/install.sh | bash

    # Source the swiftly env for this session
    if [[ -f "${HOME}/.swiftly/env.sh" ]]; then
        # shellcheck source=/dev/null
        source "${HOME}/.swiftly/env.sh"
    fi
}

# Initialize swiftly
init_swiftly() {
    if [[ -d "${HOME}/.swiftly" ]]; then
        echo "✅ swiftly already initialized"
        return 0
    fi

    echo "🔧 Running swiftly init..."
    swiftly init
}

# Install Swift 6.0
install_swift() {
    echo "📦 Installing Swift 6.0..."
    swiftly install 6.0
}

# Activate Swift 6.0
activate_swift() {
    echo "🔄 Activating Swift 6.0..."
    swiftly use 6.0
}

# Verify installation
verify_swift() {
    echo "🔍 Verifying Swift installation..."
    if ! command -v swift &> /dev/null; then
        echo "❌ swift command not found in PATH after installation"
        echo "   Attempting to source swiftly environment..."
        if [[ -f "${HOME}/.swiftly/env.sh" ]]; then
            # shellcheck source=/dev/null
            source "${HOME}/.swiftly/env.sh"
        fi
    fi

    local swift_version
    swift_version=$(swift --version 2>&1 || true)
    if [[ -z "$swift_version" ]]; then
        echo "❌ swift --version failed"
        exit 1
    fi

    echo "✅ Swift version:"
    echo "$swift_version"
}

# Ensure ~/.swiftly/bin is in PATH
ensure_path() {
    detect_shell_profile

    if [[ ! -f "$SHELL_PROFILE" ]]; then
        touch "$SHELL_PROFILE"
    fi

    if grep -q "\.swiftly/bin" "$SHELL_PROFILE" 2>/dev/null; then
        echo "✅ ~/.swiftly/bin already in PATH (${SHELL_PROFILE})"
        return 0
    fi

    echo "📝 Adding ~/.swiftly/bin to PATH in ${SHELL_PROFILE}..."
    cat >> "$SHELL_PROFILE" << 'EOF'

# Swiftly (Swift toolchain manager)
export PATH="${HOME}/.swiftly/bin:${PATH}"
if [[ -f "${HOME}/.swiftly/env.sh" ]]; then
    source "${HOME}/.swiftly/env.sh"
fi
EOF

    echo "✅ PATH updated. Run: source ${SHELL_PROFILE}"
}

# Main
main() {
    echo "=== RoleVault Swift Toolchain Setup ==="
    install_swiftly
    init_swiftly
    install_swift
    activate_swift
    verify_swift
    ensure_path
    echo ""
    echo "🎉 Setup complete. Swift 6.0 is ready."
}

main "$@"
