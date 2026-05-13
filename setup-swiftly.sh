#!/bin/bash
set -euo pipefail

# setup-swiftly.sh
# Installs Swiftly (Swift toolchain manager), Swift 6.0, and ensures PATH is configured.
# Run: chmod +x setup-swiftly.sh && ./setup-swiftly.sh
#
# macOS: downloads the official .pkg installer from Swift.org
# Linux: downloads the tarball from Swift.org

SWIFTLY_HOME="${SWIFTLY_HOME_DIR:-${HOME}/.swiftly}"
SWIFTLY_BIN="${SWIFTLY_HOME}/bin"
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

    if [[ "$OSTYPE" == "darwin"* ]]; then
        install_swiftly_macos
    else
        install_swiftly_linux
    fi

    # Source the swiftly env for this session
    if [[ -f "${SWIFTLY_HOME}/env.sh" ]]; then
        # shellcheck source=/dev/null
        source "${SWIFTLY_HOME}/env.sh"
    fi
}

install_swiftly_macos() {
    local pkg="swiftly.pkg"
    echo "🍎 Detected macOS. Downloading swiftly.pkg..."
    curl -fsSL -O "https://download.swift.org/swiftly/darwin/${pkg}"

    echo "📦 Installing swiftly.pkg to user home..."
    installer -pkg "${pkg}" -target CurrentUserHomeDirectory

    rm -f "${pkg}"

    echo "🔧 Running swiftly init..."
    "${SWIFTLY_BIN}/swiftly" init --quiet-shell-followup
}

install_swiftly_linux() {
    local arch
    arch=$(uname -m)
    local tarball="swiftly-${arch}.tar.gz"

    echo "🐧 Detected Linux (${arch}). Downloading swiftly tarball..."
    curl -fsSL -O "https://download.swift.org/swiftly/linux/${tarball}"

    echo "📦 Extracting swiftly..."
    tar zxf "${tarball}"
    rm -f "${tarball}"

    echo "🔧 Running swiftly init..."
    ./swiftly init --quiet-shell-followup
    rm -f ./swiftly
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
        if [[ -f "${SWIFTLY_HOME}/env.sh" ]]; then
            # shellcheck source=/dev/null
            source "${SWIFTLY_HOME}/env.sh"
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

# Ensure swiftly is in PATH
ensure_path() {
    detect_shell_profile

    if [[ ! -f "$SHELL_PROFILE" ]]; then
        touch "$SHELL_PROFILE"
    fi

    if grep -q "swiftly/env.sh" "$SHELL_PROFILE" 2>/dev/null; then
        echo "✅ swiftly environment already sourced in ${SHELL_PROFILE}"
        return 0
    fi

    echo "📝 Adding swiftly environment to ${SHELL_PROFILE}..."
    cat >> "$SHELL_PROFILE" << 'EOF'

# Swiftly (Swift toolchain manager)
if [[ -f "${HOME}/.swiftly/env.sh" ]]; then
    source "${HOME}/.swiftly/env.sh"
fi
EOF

    echo "✅ Shell profile updated. Run: source ${SHELL_PROFILE}"
}

# Main
main() {
    echo "=== RoleVault Swift Toolchain Setup ==="
    install_swiftly
    install_swift
    activate_swift
    verify_swift
    ensure_path
    echo ""
    echo "🎉 Setup complete. Swift 6.0 is ready."
}

main "$@"
