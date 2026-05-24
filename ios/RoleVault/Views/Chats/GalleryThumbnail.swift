import SwiftUI

struct GalleryThumbnail: View {
    let moment: GalleryMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let data = moment.imageData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                RoundedRectangle(cornerRadius: 10)
                    .fill(.quaternary)
                    .frame(height: 100)
                    .overlay {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.title2)
                            .foregroundStyle(.secondary)
                    }
            }

            Text(moment.caption)
                .font(.caption.weight(.medium))
                .lineLimit(1)

            Text(moment.textExcerpt)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
