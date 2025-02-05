"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface Ad {
  id: string
  campaign_name: string
  ad_size: string
  files: string[]
}

export function AdList() {
  const [ads, setAds] = useState<Ad[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")

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

  const filteredAds = selectedCampaign === "all" ? ads : ads.filter((ad) => ad.campaign_name === selectedCampaign)

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAds.map((ad) => (
          <div key={ad.id} className="border rounded p-4">
            <h3 className="font-semibold">{ad.campaign_name}</h3>
            <p>Size: {ad.ad_size}</p>
            <div className="mt-2">
              {ad.files.map((file, index) => (
                <Button key={index} variant="outline" className="mr-2 mb-2" asChild>
                  <a href={file} target="_blank" rel="noopener noreferrer">
                    View File {index + 1}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

