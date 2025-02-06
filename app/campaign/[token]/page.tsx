// app/campaign/[token]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdPreview } from "@/components/ad-preview"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface CampaignAd {
  id: string
  ad_size: string
  files: string[]
}

interface CampaignData {
  name: string
  ads: CampaignAd[]
}

export default function CampaignSharePage({ params }: { params: { token: string } }) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [availableSizes, setAvailableSizes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        // Fetch campaign using the share token
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .select(`
            id,
            name,
            ads (
              id,
              ad_size,
              files
            )
          `)
          .eq("share_token", params.token)
          .single()

        if (campaignError) throw campaignError
        if (!campaignData) throw new Error("Campaign not found")

        // Extract unique ad sizes and sort them
        const sizes = Array.from(new Set(campaignData.ads.map(ad => ad.ad_size))).sort()
        setAvailableSizes(sizes)
        setSelectedSize(sizes[0] || "")
        setCampaign({
          name: campaignData.name,
          ads: campaignData.ads
        })
      } catch (err) {
        setError("Campaign not found or access denied")
        console.error("Error fetching campaign:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaign()
  }, [params.token])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Unable to load campaign"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredAds = campaign.ads.filter(ad => ad.ad_size === selectedSize)

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{campaign.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select Ad Size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 place-items-center">
        {filteredAds.map((ad) => (
          <div key={ad.id} className="w-full flex justify-center">
            {ad.files[1] && (
              <AdPreview
                adFile={ad.files[1]}
                adSize={ad.ad_size}
                className="shadow-lg"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}