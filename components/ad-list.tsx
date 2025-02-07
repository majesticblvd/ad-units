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
import { RefreshCcw, Share } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ShareDialogButton } from "./share-button"
import { motion, AnimatePresence } from "motion/react";

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
      // Fetch campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name")
      
      if (campaignError) throw campaignError
      setCampaigns(campaignData || [])

      // Fetch ads with campaign information
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

      // Transform the data to include campaign_name
      const transformedAds = adData?.map((ad) => ({
        ...ad,
        campaign_name: Array.isArray(ad.campaigns)
          ? ad.campaigns[0]?.name  // <-- take the first item
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

  const extractFilePath = (fileUrl: string): string => {
    try {
      const parts = fileUrl.split("/ad-files/")
      if (parts.length > 1) {
        return parts[1]
      }
    } catch (error) {
      console.error("Error extracting file path:", error)
    }
    return ""
  }

  const handleDelete = async (ad: Ad) => {
    try {
      // Remove files from storage
      for (const fileUrl of ad.files) {
        const filePath = extractFilePath(fileUrl)
        if (filePath) {
          const { error: storageError } = await supabase
            .storage
            .from("ad-files")
            .remove([filePath])
          
          if (storageError) {
            console.error("Storage delete error:", storageError)
          }
        }
      }

      // Remove ad from database
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

  console.log('ads', ads)

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger>
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
        <ShareDialogButton className="ml-auto" campaigns={campaigns} />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex gap-4 flex-wrap"
      >
        <AnimatePresence mode="popLayout">
          {filteredAds.map((ad) => (
            <motion.div
              key={ad.id}
              variants={itemVariants}
              layout
              exit="exit"
              className="border rounded-lg flex-grow h-fit p-4 overflow-hidden flex flex-col"
            >
              <motion.h3 
                className="text-lg font-semibold"
                layout="position"
              >
                {ad.campaign_name}
              </motion.h3>

              <motion.div 
                className="mt-4 w-full flex justify-center items-center overflow-hidden"
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
                className="mt-4 flex w-full justify-between items-center"
                layout="position"
              >
                <p className="rounded-full px-2 py-0 w-fit bg-[#0dab5439] border-[#0DAB53] border">
                  Size: {ad.ad_size}
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleReplay(ad.id)}>
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
        </AnimatePresence>
      </motion.div>
    </div>
  )
}