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
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

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
            
            {/* Add the preview section */}
            <div className="mt-4 flex justify-center">
            {ad.files[1] && (
              <div className="space-y-2">
                <AdPreview adFile={ad.files[1]} adSize={ad.ad_size} />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(ad.files[1], '_blank')}
                >
                  View Full Size
                </Button>
              </div>
            )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

