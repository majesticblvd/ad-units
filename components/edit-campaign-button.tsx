"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Campaign {
  id: string
  name: string
}

interface EditCampaignButtonProps {
  adId: string
  currentCampaignId: string
  currentTitle?: string
  currentDescription?: string
  onUpdate?: () => void // Callback function to run after campaign is updated
  campaigns?: Campaign[]
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function EditCampaignButton({
  adId,
  currentCampaignId,
  currentTitle,
  currentDescription,
  onUpdate,
  campaigns: initialCampaigns,
  className = '',
  size = "sm"
}: EditCampaignButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns || [])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(currentCampaignId)
  const [isFetchingCampaigns, setIsFetchingCampaigns] = useState(!initialCampaigns)
  const [title, setTitle] = useState<string>(currentTitle || "")
  const [description, setDescription] = useState<string>(currentDescription || "")

  useEffect(() => {
    if (isOpen) {
      setSelectedCampaignId(currentCampaignId)
      setTitle(currentTitle || "")
      setDescription(currentDescription || "")
    }
  }, [isOpen, currentCampaignId, currentTitle, currentDescription])

  // Fetch campaigns if not provided as props
  useEffect(() => {
    if (!initialCampaigns) {
      fetchCampaigns()
    }
  }, [initialCampaigns])

  const fetchCampaigns = async () => {
    try {
      setIsFetchingCampaigns(true)
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
    } finally {
      setIsFetchingCampaigns(false)
    }
  }

  const handleSave = async () => {
    const normalizedTitle = title.trim()
    const normalizedDescription = description.trim()

    const nextTitle = normalizedTitle.length > 0 ? normalizedTitle : null
    const nextDescription = normalizedDescription.length > 0 ? normalizedDescription : null

    const didMoveCampaign = selectedCampaignId && selectedCampaignId !== currentCampaignId
    const didChangeTitle = (currentTitle || null) !== nextTitle
    const didChangeDescription = (currentDescription || null) !== nextDescription

    if (!didMoveCampaign && !didChangeTitle && !didChangeDescription) {
      setIsOpen(false)
      return
    }
  
    try {
      setIsLoading(true)

      const updatePayload: {
        campaign_id?: string
        position?: number
        title?: string | null
        description?: string | null
      } = {
        title: nextTitle,
        description: nextDescription,
      }

      if (didMoveCampaign) {
        // Get the highest position in the target campaign
        const { data: highestPositionData, error: positionError } = await supabase
          .from("ads")
          .select("position")
          .eq("campaign_id", selectedCampaignId)
          .order("position", { ascending: false })
          .limit(1)

        if (positionError) throw positionError

        const newPosition = (highestPositionData && highestPositionData.length > 0 &&
          highestPositionData[0]?.position)
          ? (highestPositionData[0].position + 1)
          : 1

        updatePayload.campaign_id = selectedCampaignId
        updatePayload.position = newPosition
      }

      const { error } = await supabase
        .from("ads")
        .update(updatePayload)
        .eq("id", adId)

      if (error) throw error
      
      toast({
        title: "Ad Updated",
        description: didMoveCampaign
          ? "Ad updated and moved to the selected campaign."
          : "Ad updated successfully.",
      })
      
      setIsOpen(false)
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating ad campaign:", error)
      toast({
        title: "Error",
        description: "Failed to update ad campaign.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={`hover:bg-gray-100 ${className}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Ad</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`ad-title-${adId}`}>Title</Label>
            <Input
              id={`ad-title-${adId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ad title"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`ad-description-${adId}`}>Description</Label>
            <Textarea
              id={`ad-description-${adId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ad description"
              disabled={isLoading}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Campaign</Label>
            {isFetchingCampaigns ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select 
                value={selectedCampaignId} 
                onValueChange={setSelectedCampaignId}
                disabled={isLoading}
              >
                <SelectTrigger>
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
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isLoading ||
                !selectedCampaignId ||
                ((selectedCampaignId === currentCampaignId) &&
                  (title.trim() === (currentTitle || "").trim()) &&
                  (description.trim() === (currentDescription || "").trim()))
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
