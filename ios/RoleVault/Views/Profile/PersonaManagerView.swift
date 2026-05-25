import SwiftUI
import SwiftData

struct PersonaManagerView: View {
    @State private var personas: [Persona] = []
    @State private var showCreateSheet = false

    var body: some View {
        ZStack {
            AuroraBackground()

            if personas.isEmpty {
                ContentUnavailableView(
                    "No Personas Yet",
                    systemImage: "person.2.slash",
                    description: Text("Create a persona to chat as a specific identity.")
                )
            } else {
                List {
                    ForEach(personas) { persona in
                        PersonaRow(persona: persona)
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            SwiftDataContainer.shared.context.delete(personas[index])
                        }
                        try? SwiftDataContainer.shared.context.save()
                        loadPersonas()
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Personas")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showCreateSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreatePersonaSheet(onSave: loadPersonas)
        }
        .task(id: AuthService.shared.currentUser?.id) {
            loadPersonas()
        }
        .onAppear {
            loadPersonas()
        }
    }

    @MainActor
    private func loadPersonas() {
        guard let userId = AuthService.shared.currentUser?.id else {
            personas = []
            return
        }
        let descriptor = FetchDescriptor<Persona>(
            predicate: #Predicate { $0.userId == userId },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        personas = (try? SwiftDataContainer.shared.context.fetch(descriptor)) ?? []
    }
}

struct PersonaRow: View {
    let persona: Persona

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(.thinMaterial)
                    .frame(width: 50, height: 50)
                if let data = persona.avatarData, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 50, height: 50)
                        .clipShape(Circle())
                } else {
                    Text(String(persona.name.prefix(1)))
                        .font(.title3.weight(.semibold))
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(persona.name)
                    .font(.headline)
                Text(persona.gender)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if persona.isActive {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(SpectralAccent.emerald)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

struct CreatePersonaSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var gender: String = ""
    @State private var backstory: String = ""
    @State private var showError = false
    var onSave: (() -> Void)?

    var body: some View {
        NavigationStack {
            Form {
                Section("Identity") {
                    TextField("Name", text: $name)
                    TextField("Gender", text: $gender)
                }
                Section("Backstory") {
                    TextEditor(text: $backstory)
                        .frame(minHeight: 120)
                }
            }
            .navigationTitle("New Persona")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .alert("Save Failed", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("You must be signed in to create a persona.")
            }
        }
    }

    private func save() {
        guard let userId = AuthService.shared.currentUser?.id else {
            HapticEngine.notification(.error)
            showError = true
            return
        }
        let persona = Persona(
            name: name,
            gender: gender,
            backstory: backstory,
            isActive: false,
            userId: userId
        )
        SwiftDataContainer.shared.context.insert(persona)
        do {
            try SwiftDataContainer.shared.context.save()
            HapticEngine.notification(.success)
            onSave?()
            dismiss()
        } catch {
            HapticEngine.notification(.error)
            showError = true
        }
    }
}
