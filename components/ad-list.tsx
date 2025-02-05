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

interface AdListProps {
  refreshSignal?: number
}

export function AdList({ refreshSignal }: AdListProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  // This object holds a replay counter for each ad.
  const [replayCounters, setReplayCounters] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    fetchAds()
  }, [refreshSignal])

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

  // Helper: Extract the file path from the public URL.
  // For example, if the file URL is:
  // https://<project-ref>.supabase.co/storage/v1/object/public/ad-files/my-campaign/my-image.png
  // then the file path is: "my-campaign/my-image.png"
  // A more flexible file path extraction function.
  const extractFilePath = (fileUrl: string): string => {
    try {
      // Split the URL on "/ad-files/" and take the portion after it.
      const parts = fileUrl.split("/ad-files/")
      if (parts.length > 1) {
        // This will return, for example, "my-campaign/my-image.png"
        return parts[1]
      } else {
        console.error("Could not extract file path from:", fileUrl)
      }
    } catch (error) {
      console.error("Error extracting file path:", error)
    }
    return ""
  }

  // Handle ad deletion using Supabase and update local state.
  // Now accepts the entire ad so we can access its files.
  const handleDelete = async (ad: Ad) => {
    try {
      // First, remove files from storage.
      for (const fileUrl of ad.files) {
        const filePath = extractFilePath(fileUrl)
        if (filePath) {
          const { error: storageError } = await supabase
            .storage
            .from("ad-files")
            .remove([filePath])
          if (storageError) {
            console.error("Storage delete error:", storageError)
            // Optionally, you could throw here to stop the deletion process.
          }
        }
      }
      // Now, remove the ad from the database.
      const { error: dbError } = await supabase.from("ads").delete().eq("id", ad.id)
      if (dbError) throw dbError

      toast({
        title: "Ad Deleted",
        description: "The ad was deleted successfully.",
      })
      // Remove the deleted ad from state.
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
        ))}
      </div>
    </div>
  )
}
