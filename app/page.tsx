'use client';

import { useState } from "react"
import { AdUploadForm } from "@/components/ad-upload-form"
import { AdList } from "@/components/ad-list"



export default function Home() {

  // When an ad is successfully uploaded, we increment this signal.
  const [refreshSignal, setRefreshSignal] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshSignal((prev) => prev + 1)
  }
  return (
    <main className="container w-full max-w-none ">
      <h1 className="text-3xl font-semibold   border-b-2 text-white bg-black p-6 ">Google Ad Gallery</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 m-4 gap-6">
        <div className="bg-gray-200 max-h-fit sticky top-4 px-4 py-4 rounded-lg col-span-1">
          <h2 className="text-2xl font-semibold mb-4">Upload New Ad</h2>
          <AdUploadForm onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="col-span-3">
          <h2 className="text-2xl font-semibold  mb-4">Ad List</h2>
          <AdList refreshSignal={refreshSignal} />
        </div>
      </div>
    </main>
  )
} 

