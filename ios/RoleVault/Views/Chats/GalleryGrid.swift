import SwiftUI
import SwiftData

struct GalleryGrid: View {
    @Query(sort: \GalleryMoment.createdAt, order: .reverse) private var moments: [GalleryMoment]
    let columns = [GridItem(.adaptive(minimum: 110))]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(moments) { moment in
                    GalleryThumbnail(moment: moment)
                }
            }
            .padding()
        }
    }
}
