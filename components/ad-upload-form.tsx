"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface AdUploadFormProps {
  onUploadSuccess?: () => void
}

export function AdUploadForm({ onUploadSuccess }: AdUploadFormProps) {
  const [campaignName, setCampaignName] = useState("")
  const [adSize, setAdSize] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignName || !adSize || !files || files.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select files to upload.",
        variant: "destructive",
      })
      return
    }

    try {
      const fileUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { error: uploadError } = await supabase
          .storage
          .from("ad-files")
          .upload(`${campaignName}/${file.name}`, file)

        if (uploadError) {
          console.error("File upload error:", uploadError)
          throw uploadError
        }

        // Get public URL for the uploaded file.
        const { data: publicUrlData } = supabase
          .storage
          .from("ad-files")
          .getPublicUrl(`${campaignName}/${file.name}`)

        fileUrls.push(publicUrlData.publicUrl)
      }

      const { error: dbError } = await supabase
        .from("ads")
        .insert([{ campaign_name: campaignName, ad_size: adSize, files: fileUrls }])

      if (dbError) {
        console.error("Database insert error:", dbError)
        throw dbError
      }

      toast({
        title: "Success",
        description: "Ad uploaded successfully.",
      })

      // Clear the form fields.
      setCampaignName("")
      setAdSize("")
      setFiles(null)

      // Trigger a refresh in the ads list.
      if (onUploadSuccess) onUploadSuccess()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: "Failed to upload ad. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="campaignName">Campaign Name</Label>
        <Input
          className="bg-transparent border-gray-300 shadow-none"
          id="campaignName"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="adSize">Ad Size</Label>
        <Input
          className="bg-transparent border-gray-300 shadow-none"
          id="adSize"
          value={adSize}
          onChange={(e) => setAdSize(e.target.value)}
          placeholder="e.g., 300x250"
          required
        />
      </div>
      <div>
        <Label htmlFor="files">Ad Files</Label>
        <Input
          className="bg-transparent border-gray-300 shadow-none mb-4"
          id="files"
          type="file"
          onChange={(e) => setFiles(e.target.files)}
          multiple
          required
        />
      </div>
      <Button className="w-full" type="submit">
        Upload Ad
      </Button>
    </form>
  )
}
