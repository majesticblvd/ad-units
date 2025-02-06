"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface Campaign {
  id: string
  name: string
}

interface AdUploadFormProps {
  onUploadSuccess?: () => void
}

// Standard Google Ad sizes
const AD_SIZES = [
  { value: "300x250", label: "Medium Rectangle (300x250)" },
  { value: "336x280", label: "Large Rectangle (336x280)" },
  { value: "728x90", label: "Leaderboard (728x90)" },
  { value: "300x600", label: "Half Page (300x600)" },
  { value: "320x100", label: "Large Mobile Banner (320x100)" },
  { value: "320x50", label: "Mobile Banner (320x50)" },
  { value: "468x60", label: "Banner (468x60)" },
  { value: "970x90", label: "Large Leaderboard (970x90)" },
  { value: "160x600", label: "Wide Skyscraper (160x600)" },
  { value: "custom", label: "Custom Size" }
]

export function AdUploadForm({ onUploadSuccess }: AdUploadFormProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  const [newCampaignName, setNewCampaignName] = useState("")
  const [adSize, setAdSize] = useState("")
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [isNewCampaignDialogOpen, setIsNewCampaignDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  // Generate a unique share token for the new campaign
  const generateShareToken = () => {
    // Generate a random 32-character string
    return Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const handleCreateCampaign = async () => {
    try {
      const shareToken = generateShareToken()
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{ 
          name: newCampaignName,
          share_token: shareToken
         }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Success",
        description: "Campaign created successfully.",
      })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const finalAdSize = adSize === "custom" ? `${customWidth}x${customHeight}` : adSize
    if (!selectedCampaignId || !finalAdSize || !files || files.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select files to upload.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const campaign = campaigns.find(c => c.id === selectedCampaignId)
      if (!campaign) throw new Error("Campaign not found")

      const fileUrls: string[] = []
      const timestamp = Date.now()
      const uniqueId = Math.random().toString(36).substring(2, 15)
      const adFolder = `${timestamp}-${uniqueId}`

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const filePath = `${campaign.name}/${adFolder}/${file.name}`
        
        const { error: uploadError } = await supabase
          .storage
          .from("ad-files")
          .upload(filePath, file)

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
          ad_size: finalAdSize,
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
      setCustomWidth("")
      setCustomHeight("")
      setFiles(null)
      if (e.target instanceof HTMLFormElement) {
        e.target.reset()
      }

      if (onUploadSuccess) onUploadSuccess()
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: "Failed to upload ad. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
        <Select value={adSize} onValueChange={setAdSize}>
          <SelectTrigger className="bg-transparent border-gray-300 shadow-none">
            <SelectValue placeholder="Select Ad Size" />
          </SelectTrigger>
          <SelectContent>
            {AD_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {adSize === "custom" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="customWidth">Width (px)</Label>
              <Input
                id="customWidth"
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="bg-transparent border-gray-300 shadow-none"
                required
              />
            </div>
            <div>
              <Label htmlFor="customHeight">Height (px)</Label>
              <Input
                id="customHeight"
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className="bg-transparent border-gray-300 shadow-none"
                required
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="files">Ad Files</Label>
        <Input
          id="files"
          type="file"
          onChange={(e) => setFiles(e.target.files)}
          multiple
          required
          className="bg-transparent border-gray-300 shadow-none"
        />
      </div>

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          'Upload Ad'
        )}
      </Button>
    </form>
  )
}