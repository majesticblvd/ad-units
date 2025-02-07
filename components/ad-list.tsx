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
import { supabase } from "@/lib/supabase"
import { AdPreview } from "./ad-preview"
import { RefreshCcw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ShareDialogButton } from "./share-button"
import { motion } from "framer-motion"
import MasonryGrid from "./ui/masonry-grid"

interface Ad {
  id: string
  campaign_id: string
  campaign_name: string
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

  const filteredAds = selectedCampaignId === "all"
    ? ads
    : ads.filter((ad) => ad.campaign_id === selectedCampaignId)

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

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  }

  // Calculate dimensions for container based on ad size
  const getContainerStyle = (adSize: string) => {
    const [width] = adSize.split('x').map(Number);
    return {
      width: (isNaN(width) ? 300 : width + 32) + 'px', // Match MasonryGrid padding
    };
  };

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

      <MasonryGrid items={filteredAds} gutter={16}>
        {filteredAds.map((ad) => (
          <motion.div
            key={ad.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="border border-gray-400 rounded-lg overflow-hidden flex flex-col bg-white shadow-sm"
            style={getContainerStyle(ad.ad_size)}
          >
            <div className="px-4 pt-4">
              <motion.h3 
                className="text-lg font-semibold mb-4"
                layout="position"
              >
                {ad.campaign_name}
              </motion.h3>
            </div>

            <motion.div 
              className="w-full flex justify-center items-center overflow-hidden"
              layout
            >
              {ad.files[1] && (
                <AdPreview
                  key={`${ad.id}-${replayCounters[ad.id] || 0}`}
                  adFile={ad.files[1]}
                  adSize={ad.ad_size}
                />
              )}
            </motion.div>

            <motion.div 
              className="px-4 py-4 flex w-full justify-between items-center mt-4  border-black"
              layout="position"
            >
              <p className="rounded-full px-3 py-1 text-sm bg-[#0dab5439] text-[#0A8B43] border-[#0DAB53] border">
                {ad.ad_size}
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleReplay(ad.id)}
                  className="hover:bg-gray-100"
                >
                  <RefreshCcw size={16} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
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
            </motion.div>
          </motion.div>
        ))}
      </MasonryGrid>
    </div>
  )
}