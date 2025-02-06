"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Campaign {
  id: string
  name: string
}

interface ShareDialogButtonProps {
  campaigns: Campaign[]
  className?: string
}

export function ShareDialogButton({ campaigns, className = '' }: ShareDialogButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleShare = async () => {
    if (!selectedCampaignId) {
      toast({
        title: "Select a campaign",
        description: "Please select a campaign to share.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Fetch the campaign's share token
      const { data, error } = await supabase
        .from("campaigns")
        .select("share_token")
        .eq("id", selectedCampaignId)
        .single()
      
      if (error) throw error
      
      // If no share token exists, create one
      if (!data.share_token) {
        const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        
        const { error: updateError } = await supabase
          .from("campaigns")
          .update({ share_token: shareToken })
          .eq("id", selectedCampaignId)
        
        if (updateError) throw updateError
        data.share_token = shareToken
      }
      
      // Generate the share URL
      const shareUrl = `${window.location.origin}/campaign/${data.share_token}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      
      toast({
        title: "Share link copied!",
        description: "You can now share this link with your client.",
      })
      
      setIsDialogOpen(false)
      setSelectedCampaignId("")
    } catch (error) {
      console.error("Error sharing campaign:", error)
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Share className="h-4 w-4" />
          <span className="ml-2">Share Campaign</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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
          </div>
          <Button 
            onClick={handleShare}
            disabled={isLoading || !selectedCampaignId}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Link...
              </>
            ) : (
              <>
                <Share className="mr-2 h-4 w-4" />
                Get Share Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}