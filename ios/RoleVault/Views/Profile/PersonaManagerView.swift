import SwiftUI
import SwiftData

struct PersonaManagerView: View {
    @Query(sort: \Persona.updatedAt, order: .reverse) private var personas: [Persona]
    @State private var showCreateSheet = false

    var body: some View {
        ZStack {
            AuroraBackground()

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
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
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
            CreatePersonaSheet()
        }
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
                    .foregroundStyle(.green)
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
        }
    }

    private func save() {
        let persona = Persona(
            name: name,
            gender: gender,
            backstory: backstory,
            isActive: false
        )
        SwiftDataContainer.shared.context.insert(persona)
        try? SwiftDataContainer.shared.context.save()
        HapticEngine.notification(.success)
        dismiss()
    }
}
