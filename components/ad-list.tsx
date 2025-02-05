"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { AdPreview } from "./ad-preview"

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
            className="border rounded p-4 overflow-hidden flex flex-col items-center"
          >
            <h3 className="font-semibold">{ad.campaign_name}</h3>
            <p>Size: {ad.ad_size}</p>
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
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => handleReplay(ad.id)}>
                Replay
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
