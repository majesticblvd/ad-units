"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export function AdUploadForm() {
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
      const fileUrls = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { data, error } = await supabase.storage.from("ad-files").upload(`${campaignName}/${file.name}`, file)

        if (error) {
          console.error("File upload error:", error)
          throw error
        }

        const { data: publicUrl } = supabase.storage.from("ad-files").getPublicUrl(`${campaignName}/${file.name}`)

        fileUrls.push(publicUrl.publicUrl)
      }

      const { data, error } = await supabase
        .from("ads")
        .insert([{ campaign_name: campaignName, ad_size: adSize, files: fileUrls }])

      if (error) {
        console.error("Database insert error:", error)
        throw error
      }

      toast({
        title: "Success",
        description: "Ad uploaded successfully.",
      })
      setCampaignName("")
      setAdSize("")
      setFiles(null)
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
        <Input id="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="adSize">Ad Size</Label>
        <Input
          id="adSize"
          value={adSize}
          onChange={(e) => setAdSize(e.target.value)}
          placeholder="e.g., 300x250"
          required
        />
      </div>
      <div>
        <Label htmlFor="files">Ad Files</Label>
        <Input id="files" type="file" onChange={(e) => setFiles(e.target.files)} multiple required />
      </div>
      <Button type="submit">Upload Ad</Button>
    </form>
  )
}

