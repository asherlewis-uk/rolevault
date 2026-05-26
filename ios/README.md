# RoleVault iOS

## Quick Start

1. **Generate the Xcode project**
   ```bash
   cd ios
   xcodegen generate
   ```

2. **Build locally**
   ```bash
   ./build.sh
   ```

3. **Open in Xcode**
   ```bash
   open RoleVault.xcodeproj
   ```

4. **Upload to TestFlight**
   ```bash
   bundle install
   bundle exec fastlane beta
   ```

## Prerequisites

- macOS with Xcode 15+
- Apple Developer account (paid)
- App Store Connect API Key for Fastlane uploads
- Running RoleVault API backend through the managed RoleVault service

## Project Structure

See `ARCHITECTURE.md` for full design rationale, schema diagrams, and API mapping.

## Configuration

Service endpoints are hardcoded in the app runtime and are not user-configurable.

## Tech Stack

- SwiftUI (iOS 17+)
- SwiftData (local persistence)
- Keychain (JWT storage)
- URLSession + async/await (networking)
- XcodeGen (project generation)
- Fastlane (TestFlight distribution)
