"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Campaign {
  id: string
  name: string
}

interface EditCampaignButtonProps {
  adId: string
  currentCampaignId: string
  onUpdate?: () => void // Callback function to run after campaign is updated
  campaigns?: Campaign[]
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function EditCampaignButton({
  adId,
  currentCampaignId,
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

  const handleUpdateCampaign = async () => {
    if (!selectedCampaignId || selectedCampaignId === currentCampaignId) {
      setIsOpen(false)
      return
    }

    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from("ads")
        .update({ campaign_id: selectedCampaignId })
        .eq("id", adId)
      
      if (error) throw error
      
      toast({
        title: "Campaign Updated",
        description: "Ad has been moved to the selected campaign.",
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
          <DialogTitle>Move Ad to Different Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
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
              onClick={handleUpdateCampaign}
              disabled={isLoading || !selectedCampaignId || selectedCampaignId === currentCampaignId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Campaign'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}