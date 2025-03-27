"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share, Loader2, Copy, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"

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
  const [shareUrl, setShareUrl] = useState<string>("")
  const [isCopied, setIsCopied] = useState(false)
  const [isChrome, setIsChrome] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Check if browser is Chrome on component mount
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    setIsChrome(userAgent.includes('chrome') && !userAgent.includes('safari/'))
  }, [])

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
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("share_token")
        .eq("id", selectedCampaignId)
        .single()
      
      if (error) throw error
      
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
      
      const url = `${window.location.origin}/campaign/${data.share_token}`
      setShareUrl(url)
      
      // Only try automatic copy in Chrome
      if (isChrome) {
        copyToClipboard(url)
      }
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

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        toast({
          title: "Share link copied!",
          description: "You can now share this link with your client.",
        })
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (error) {
      console.error("Clipboard error:", error)
    }
  }

  const handleCopy = () => {
    if (shareUrl) {
      copyToClipboard(shareUrl)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setShareUrl("")
      setSelectedCampaignId("")
      setIsCopied(false)
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Share className="h-4 w-4" />
          <span className="ml-2">Campaign Share Link</span>
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
          
          {!shareUrl ? (
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
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  ref={urlInputRef}
                  value={shareUrl}
                  readOnly
                  className="bg-muted"
                />
                <Button 
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {isChrome ? 
                  "Link copied to clipboard! Share it with your client." :
                  "Click the copy button to copy the share link."
                }
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}