"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { supabase } from "@/lib/supabase"
import { AdPreview } from "./ad-preview"
import { RefreshCcw, ChevronUp, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ShareDialogButton } from "./share-button"

interface Ad {
  id: string
  campaign_id: string
  campaign_name: string
  title?: string
  description?: string
  ad_size: string
  files: string[]
}

interface Campaign {
  id: string
  name: string
}

interface AdListProps {
  refreshSignal?: number
}

export function AdList({ refreshSignal }: AdListProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all")
  const [replayCounters, setReplayCounters] = useState<{ [key: string]: number }>({})
  const [openDescriptions, setOpenDescriptions] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [refreshSignal])

  const fetchData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name")
      
      if (campaignError) throw campaignError
      setCampaigns(campaignData || [])

      const { data: adData, error: adError } = await supabase
        .from("ads")
        .select(`
          id,
          campaign_id,
          title,
          description,
          ad_size,
          files,
          campaigns:campaigns (
            name
          )
        `)
      
      if (adError) throw adError

      const transformedAds = adData?.map((ad) => ({
        ...ad,
        campaign_name: Array.isArray(ad.campaigns)
          ? ad.campaigns[0]?.name
          : (ad.campaigns as { name: string })?.name
      })) || []

      setAds(transformedAds)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch ads and campaigns.",
        variant: "destructive",
      })
    }
  }

  // Filter ads based on selected campaign
  const filteredAds = selectedCampaignId === "all"
    ? ads
    : ads.filter((ad) => ad.campaign_id === selectedCampaignId)

  // Group ads by campaign
  const groupedAdsByCampaign = () => {
    if (selectedCampaignId !== "all") {
      // If a specific campaign is selected, just return those ads
      const campaign = campaigns.find(c => c.id === selectedCampaignId)
      return campaign 
        ? [{ campaign, ads: filteredAds }] 
        : []
    }

    // Group all ads by campaign
    return campaigns
      .map(campaign => ({
        campaign,
        ads: ads.filter(ad => ad.campaign_id === campaign.id)
      }))
      .filter(group => group.ads.length > 0)
  }

  const handleReplay = (adId: string) => {
    setReplayCounters((prev) => ({
      ...prev,
      [adId]: (prev[adId] || 0) + 1,
    }))
  }

  const handleDelete = async (ad: Ad) => {
    try {
      for (const fileUrl of ad.files) {
        const filePath = fileUrl.split("/ad-files/")[1]
        if (filePath) {
          await supabase.storage.from("ad-files").remove([filePath])
        }
      }

      const { error: dbError } = await supabase
        .from("ads")
        .delete()
        .eq("id", ad.id)

      if (dbError) throw dbError

      toast({
        title: "Ad Deleted",
        description: "The ad was deleted successfully.",
      })

      setAds((prevAds) => prevAds.filter((a) => a.id !== ad.id))
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete the ad.",
        variant: "destructive",
      })
    }
  }

  // Toggle description visibility
  const toggleDescription = (adId: string) => {
    setOpenDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(adId)) {
        newSet.delete(adId)
      } else {
        newSet.add(adId)
      }
      return newSet
    })
  }

  // Render an individual ad card
  const renderAdCard = (ad: Ad) => (
    <div 
      key={ad.id}
      className="border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white shadow-sm"
    >
      <div className="w-full flex justify-center items-center overflow-hidden p-2">
        {ad.files && ad.files.length > 0 ? (
          <AdPreview
            key={`${ad.id}-${replayCounters[ad.id] || 0}`}
            adFile={ad.files.find(file => file.toLowerCase().endsWith('.html')) || ad.files[0]}
            adSize={ad.ad_size}
          />
        ) : (
          <div className="flex items-center justify-center h-32 w-full bg-gray-100 text-gray-400 text-sm">
            No preview available
          </div>
        )}
      </div>

      {ad.title && (
        <div className="px-4 pt-2">
          <h4 className="text-base font-semibold text-gray-900">{ad.title}</h4>
        </div>
      )}

      {ad.description && (
        <Collapsible
          open={openDescriptions.has(ad.id)}
          onOpenChange={() => toggleDescription(ad.id)}
          className="px-4"
        >
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                <span className="text-xs text-gray-500 hover:text-gray-700">
                  {openDescriptions.has(ad.id) ? 'Hide Details' : 'AD Details'}
                </span>
                {openDescriptions.has(ad.id) ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="pt-2">
            <p className="text-xs text-gray-600 whitespace-pre-wrap">
              {ad.description}
            </p>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="px-4 py-3 mt-auto flex w-full justify-between items-center">
        <p className="rounded-full px-2 py-1 text-xs bg-[#0dab5439] text-[#0A8B43] border-[#0DAB53] border">
          {ad.ad_size}
        </p>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleReplay(ad.id)}
            className="hover:bg-gray-100 p-1 h-8"
          >
            <RefreshCcw size={14} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8 text-xs px-2">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your ad and its files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(ad)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )

  const groupedCampaignAds = groupedAdsByCampaign()

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ShareDialogButton className="ml-auto py-4" campaigns={campaigns} />
      </div>

      {groupedCampaignAds.length > 0 ? (
        <div className="space-y-10">
          {groupedCampaignAds.map(({ campaign, ads }) => (
            <div key={campaign.id} className="space-y-4">
              {/* Campaign header with count of ads */}
              <div className="border-b border-gray-300 pb-2">
                <h2 className="text-xl font-bold">
                  {campaign.name}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({ads.length} {ads.length === 1 ? 'ad' : 'ads'})
                  </span>
                </h2>
              </div>
              
              {/* Grid of ads for this campaign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ads.map(ad => renderAdCard(ad))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          No ads found. Try uploading some ads first.
        </div>
      )}
    </div>
  )
}