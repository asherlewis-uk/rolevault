import SwiftUI
import SwiftData
import PhotosUI

struct CreateCharacterView: View {
    @State private var viewModel = CreateCharacterViewModel()
    @State private var showValidationAlert = false
    @State private var showConfetti = false
    @State private var confettiOrigin = CGPoint(x: 0, y: 0)



    var body: some View {
        ZStack {
            AuroraBackground()

            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    avatarSection
                    identitySection
                    personalitySection
                    memorySection
                    appearanceSection
                    modeSection
                    journalSection
                    livePreviewSection

                    Button(action: save) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Create Character")
                                .font(.headline)
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(
                                    LinearGradient(
                                        colors: [RoleVaultColor.gradientPrimaryStart, RoleVaultColor.gradientPrimaryEnd],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                        )
                        .shadow(color: RoleVaultColor.glowPrimary, radius: 16, x: 0, y: 8)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 16)
                }
                .padding(.top)
            }
            .scrollIndicators(.hidden)

            if showConfetti {
                ConfettiBurst(origin: confettiOrigin)
                    .allowsHitTesting(false)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                            showConfetti = false
                        }
                    }
            }
        }
        .navigationTitle("Create")
        .alert("Missing Fields", isPresented: $showValidationAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Name and Backstory are required.")
        }
    }

    // MARK: - Sections

    private var headerSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Text("New Character")
                    .font(.title2.weight(.bold))

                Picker("Category", selection: $viewModel.category) {
                    ForEach(CharacterCategory.allCases, id: \.self) { cat in
                        Text(cat.rawValue).tag(cat)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .padding(.horizontal)
    }

    private var avatarSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(spacing: 12) {
                PhotosPicker(selection: $viewModel.avatarItem, matching: .images) {
                    ZStack {
                        Circle()
                            .fill(.thinMaterial)
                            .frame(width: 80, height: 80)

                        if let data = viewModel.avatarData, let uiImage = UIImage(data: data) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 80, height: 80)
                                .clipShape(Circle())
                        } else {
                            Image(systemName: "camera.fill")
                                .font(.title2)
                                .foregroundStyle(.secondary)
                        }

                        Circle()
                            .stroke(.white.opacity(0.2), lineWidth: 2)
                            .frame(width: 80, height: 80)
                    }
                }
                .buttonStyle(.plain)
                .onChange(of: viewModel.avatarItem) { _, newValue in
                    Task {
                        if let data = try? await newValue?.loadTransferable(type: Data.self) {
                            viewModel.avatarData = data
                        }
                    }
                }

                Text("Tap to choose avatar")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
    }

    private var identitySection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Identity", systemImage: "person.fill")
                    .font(.headline)

                TextField("Name", text: $viewModel.name)
                    .textFieldStyle(.roundedBorder)

                TextField("Subtitle / Tagline", text: $viewModel.subtitle)
                    .textFieldStyle(.roundedBorder)

                CounterTextEditor(text: $viewModel.greetingMessage, placeholder: "Greeting Message (750 chars max)", maxLength: 750)
            }
        }
        .padding(.horizontal)
    }

    private var personalitySection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Personality", systemImage: "brain.head.profile")
                    .font(.headline)

                CounterTextEditor(text: $viewModel.backstory, placeholder: "Backstory (2500 chars max)", maxLength: 2500)

                CounterTextEditor(text: $viewModel.responseDirective, placeholder: "Response Directive (150 chars max)", maxLength: 150)

                CounterTextEditor(text: $viewModel.exampleMessage, placeholder: "Example Message (750 chars max)", maxLength: 750)
            }
        }
        .padding(.horizontal)
    }

    private var memorySection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Memory", systemImage: "memorychip")
                    .font(.headline)

                CounterTextEditor(text: $viewModel.keyMemories, placeholder: "Key Memories (1000 chars max)", maxLength: 1000)
            }
        }
        .padding(.horizontal)
    }

    private var appearanceSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Appearance", systemImage: "face.smiling")
                    .font(.headline)

                CounterTextEditor(text: $viewModel.avatarDescription, placeholder: "Avatar Description (800 chars max)", maxLength: 800)

                CounterTextEditor(text: $viewModel.faceDetail, placeholder: "Face Detail (200 chars max)", maxLength: 200)
            }
        }
        .padding(.horizontal)
    }

    private var modeSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Label("Behavior", systemImage: "dial.high")
                    .font(.headline)

                modelFlairPicker

                Picker("Interaction Mode", selection: $viewModel.interactionMode) {
                    ForEach(InteractionMode.allCases, id: \.self) { mode in
                        HStack {
                            Image(systemName: mode.icon)
                            Text(mode.rawValue)
                        }.tag(mode)
                    }
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Dynamism")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Text(String(format: "%.1f", viewModel.dynamism))
                            .font(.subheadline.monospacedDigit())
                    }

                    GradientSlider(value: $viewModel.dynamism, range: 0...2)
                        .frame(height: 32)
                }
            }
        }
        .padding(.horizontal)
    }

    private var modelFlairPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(InteractionMode.allCases, id: \.self) { mode in
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            viewModel.interactionMode = mode
                        }
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: mode.icon)
                                .font(.title2)
                            Text(mode.rawValue)
                                .font(.caption.weight(.semibold))
                            Text(mode.description)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        .frame(width: 100, height: 120)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(viewModel.interactionMode == mode ? AnyShapeStyle(RoleVaultColor.primary.opacity(0.3)) : AnyShapeStyle(.ultraThinMaterial))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(viewModel.interactionMode == mode ? RoleVaultColor.primary.opacity(0.5) : .white.opacity(0.15), lineWidth: 1.5)
                                )
                        )
                        .scaleEffect(viewModel.interactionMode == mode ? 1.05 : 1)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private var journalSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Journal", systemImage: "book.closed")
                    .font(.headline)

                CounterTextEditor(text: $viewModel.journalText, placeholder: "Journal trigger + memory (500 chars max)", maxLength: 500)

                Button("Add Journal Entry") {
                    HapticEngine.impact(.light)
                    viewModel.addJournalEntry()
                }
                .buttonStyle(.borderedProminent)
                .tint(RoleVaultColor.primary)
                .disabled(viewModel.journalText.isEmpty)

                if !viewModel.journalEntries.isEmpty {
                    ForEach(viewModel.journalEntries) { entry in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(entry.triggerKeyphrase)
                                    .font(.caption.weight(.semibold))
                                Text(entry.memory)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button {
                                viewModel.removeJournalEntry(entry)
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(8)
                        .background(.thinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    private var livePreviewSection: some View {
        LiquidGlassPanel(cornerRadius: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Live Preview", systemImage: "eye.fill")
                    .font(.headline)

                if !viewModel.greetingMessage.isEmpty {
                    HStack(alignment: .bottom, spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(.thinMaterial)
                                .frame(width: 32, height: 32)
                            if let data = viewModel.avatarData, let uiImage = UIImage(data: data) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 32, height: 32)
                                    .clipShape(Circle())
                            } else {
                                Text(String(viewModel.name.prefix(1)))
                                    .font(.caption.weight(.semibold))
                            }
                        }

                        Text(viewModel.greetingMessage)
                            .font(.body)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(RoleVaultColor.bubbleAIBg)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                                            .stroke(RoleVaultColor.bubbleAIBorder, lineWidth: 1)
                                    )
                            )
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(.ultraThinMaterial)
                            )

                        Spacer()
                    }
                } else {
                    Text("Type a greeting to see the preview")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 16)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Actions

    private func save() {
        let errors = viewModel.validate()
        guard errors.isEmpty else {
            showValidationAlert = true
            return
        }

        if let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first?.windows
            .first {
            confettiOrigin = CGPoint(x: window.bounds.midX, y: window.bounds.midY)
        }
        showConfetti = true
        HapticEngine.notification(.success)
        Task {
            await viewModel.save()
        }
    }
}

// MARK: - Reusable Components

struct CounterTextEditor: View {
    @Binding var text: String
    let placeholder: String
    let maxLength: Int

    private var ratio: Double {
        Double(text.count) / Double(maxLength)
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            TextEditorWithPlaceholder(text: $text, placeholder: placeholder, maxLength: maxLength)

            Text("\(text.count)/\(maxLength)")
                .font(.caption2.monospacedDigit())
                .foregroundStyle(ratio >= 1.0 ? .red : ratio >= 0.9 ? .orange : .secondary)
                .scaleEffect(ratio >= 1.0 ? 1.1 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: ratio >= 1.0)
        }
    }
}

struct TextEditorWithPlaceholder: View {
    @Binding var text: String
    let placeholder: String
    let maxLength: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .foregroundStyle(.secondary.opacity(0.6))
                    .padding(.top, 8)
                    .padding(.leading, 4)
            }
            TextEditor(text: $text)
                .frame(minHeight: 80)
                .scrollContentBackground(.hidden)
        }
        .padding(8)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .onChange(of: text) { old, new in
            if new.count > maxLength {
                text = String(new.prefix(maxLength))
            }
        }
    }
}

struct GradientSlider: View {
    @Binding var value: Double
    var range: ClosedRange<Double> = 0...2

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            colors: [RoleVaultColor.gradientPrimaryStart, RoleVaultColor.gradientPrimaryEnd],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 8)

                Circle()
                    .fill(.white)
                    .frame(width: 24, height: 24)
                    .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                    .offset(x: thumbOffset(in: geo.size.width))
                    .gesture(
                        DragGesture()
                            .onChanged { gesture in
                                let width = geo.size.width - 24
                                let ratio = (gesture.location.x - 12) / width
                                let newValue = range.lowerBound + ratio * (range.upperBound - range.lowerBound)
                                value = min(max(newValue, range.lowerBound), range.upperBound)
                            }
                    )
            }
        }
        .frame(height: 24)
    }

    private func thumbOffset(in width: CGFloat) -> CGFloat {
        let trackWidth = width - 24
        let ratio = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return CGFloat(ratio) * trackWidth
    }
}
