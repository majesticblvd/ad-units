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

interface Ad {
  id: string
  campaign_name: string
  ad_size: string
  files: string[]
}

export function AdList() {
  const [ads, setAds] = useState<Ad[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  // This object holds a replay counter for each ad.
  const [replayCounters, setReplayCounters] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    fetchAds()
  }, [])

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase.from("ads").select("*")
      if (error) throw error
      setAds(data || [])
    } catch (error) {
      console.error("Failed to fetch ads:", error)
    }
  }

  const campaigns = ["all", ...Array.from(new Set(ads.map((ad) => ad.campaign_name)))]

  const filteredAds =
    selectedCampaign === "all"
      ? ads
      : ads.filter((ad) => ad.campaign_name === selectedCampaign)

  // When replay is clicked, increment that ad’s counter.
  const handleReplay = (adId: string) => {
    setReplayCounters((prev) => ({
      ...prev,
      [adId]: (prev[adId] || 0) + 1,
    }))
  }

  // Handle ad deletion using Supabase and update local state.
  const handleDelete = async (adId: string) => {
    try {
      const { error } = await supabase.from("ads").delete().eq("id", adId)
      if (error) throw error

      toast({
        title: "Ad Deleted",
        description: "The ad was deleted successfully.",
      })
      // Remove the deleted ad from state.
      setAds((prevAds) => prevAds.filter((ad) => ad.id !== adId))
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete the ad.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
        <SelectTrigger>
          <SelectValue placeholder="Select Campaign" />
        </SelectTrigger>
        <SelectContent>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign} value={campaign}>
              {campaign === "all" ? "All Campaigns" : campaign}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Use an auto-fit grid so the layout is dynamic */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        {filteredAds.map((ad) => (
          <div
            key={ad.id}
            className="border rounded-lg w-fit p-4 overflow-hidden flex flex-col"
          >
            <h3 className="text-lg font-semibold">{ad.campaign_name}</h3>

            {/* Wrap the preview in a container that clips any overflow */}
            <div className="mt-4 w-full flex justify-center items-center overflow-hidden">
              {ad.files[1] && (
                <AdPreview
                  // Include the replay counter in the key to force a remount on replay.
                  key={`${ad.id}-${replayCounters[ad.id] || 0}`}
                  adFile={ad.files[1]}
                  adSize={ad.ad_size}
                />
              )}
            </div>

            <div className="mt-4 flex w-full justify-between items-center">
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
                        This action cannot be undone. This will permanently delete your ad.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(ad.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
