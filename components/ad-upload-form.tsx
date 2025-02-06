"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Campaign {
  id: string
  name: string
}

interface AdUploadFormProps {
  onUploadSuccess?: () => void
}

export function AdUploadForm({ onUploadSuccess }: AdUploadFormProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  const [newCampaignName, setNewCampaignName] = useState("")
  const [adSize, setAdSize] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [isNewCampaignDialogOpen, setIsNewCampaignDialogOpen] = useState(false)

  // Fetch existing campaigns on component mount
  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name")
      
      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      toast({
        title: "Error",
        description: "Failed to fetch campaigns.",
        variant: "destructive",
      })
    }
  }

  const handleCreateCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{ name: newCampaignName }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Campaign created successfully.",
      })

      // Add the new campaign to the list and select it
      setCampaigns([...campaigns, data])
      setSelectedCampaignId(data.id)
      setIsNewCampaignDialogOpen(false)
      setNewCampaignName("")
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast({
        title: "Error",
        description: "Failed to create campaign.",
        variant: "destructive",
      })
    }
  }

  // In your AdUploadForm component, modify the handleSubmit function:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!selectedCampaignId || !adSize || !files || files.length === 0) {
    toast({
      title: "Error",
      description: "Please fill in all fields and select files to upload.",
      variant: "destructive",
    })
    return
  }

  try {
    // Get the campaign name for the file path
    const campaign = campaigns.find(c => c.id === selectedCampaignId)
    if (!campaign) throw new Error("Campaign not found")

    const fileUrls: string[] = []
    // Generate a unique identifier for this ad upload
    const timestamp = Date.now()
    const uniqueId = Math.random().toString(36).substring(2, 15)
    const adFolder = `${timestamp}-${uniqueId}`

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Create a unique path for each file using the timestamp and uniqueId
      const filePath = `${campaign.name}/${adFolder}/${file.name}`
      
      const { error: uploadError } = await supabase
        .storage
        .from("ad-files")
        .upload(filePath, file)  // Removed upsert: true since we're using unique paths

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase
        .storage
        .from("ad-files")
        .getPublicUrl(filePath)

      fileUrls.push(publicUrlData.publicUrl)
    }

    const { error: dbError } = await supabase
      .from("ads")
      .insert([{
        campaign_id: selectedCampaignId,
        ad_size: adSize,
        files: fileUrls
      }])

    if (dbError) throw dbError

    toast({
      title: "Success",
      description: "Ad uploaded successfully.",
    })

    // Clear form
    setSelectedCampaignId("")
    setAdSize("")
    setFiles(null)

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
        <Label htmlFor="campaign">Campaign</Label>
        <div className="flex gap-2">
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="bg-transparent border-gray-300 shadow-none">
              <SelectValue placeholder="Select Campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isNewCampaignDialogOpen} onOpenChange={setIsNewCampaignDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="newCampaignName">Campaign Name</Label>
                  <Input
                    id="newCampaignName"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="bg-transparent border-gray-300 shadow-none"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName}
                >
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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