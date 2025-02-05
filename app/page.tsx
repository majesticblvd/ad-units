import { AdUploadForm } from "@/components/ad-upload-form"
import { AdList } from "@/components/ad-list"

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Ad Showcase</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Upload New Ad</h2>
          <AdUploadForm />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Ad List</h2>
          <AdList />
        </div>
      </div>
    </main>
  )
}

