"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AdPreview } from "@/components/ad-preview"
import { Card } from "@/components/ui/card"
import { RefreshCcw } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import MasonryGrid from "@/components/ui/masonry-grid"

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
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [availableSizes, setAvailableSizes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replayCounters, setReplayCounters] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
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

        const sizes = Array.from(new Set(campaignData.ads.map(ad => ad.ad_size))).sort()
        setAvailableSizes(sizes)
        setSelectedSizes(new Set(sizes))
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

  const handleReplay = (adId: string) => {
    setReplayCounters((prev) => ({
      ...prev,
      [adId]: (prev[adId] || 0) + 1,
    }))
  }

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => {
      const newSizes = new Set(prev)
      if (newSizes.has(size)) {
        newSizes.delete(size)
      } else {
        newSizes.add(size)
      }
      return newSizes
    })
  }

  const handleSelectAll = () => {
    setSelectedSizes(new Set(availableSizes))
  }

  const handleClearAll = () => {
    setSelectedSizes(new Set())
  }

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
        <Card className="w-full max-w-md p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p>{error || "Unable to load campaign"}</p>
        </Card>
      </div>
    )
  }

  const filteredAds = campaign.ads.filter(ad => selectedSizes.has(ad.ad_size))

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

  return (
    <main className="container w-full max-w-none">
      {/* <div className="header items-center m-1 rounded-lg bg-black flex justify-between p-6">
        <div className="flex items-end gap-2">
          <img className="w-28 h-auto" src="/svgs/pxl-logo-light.svg" alt="" />
        </div>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-4 m-4 gap-6">
        <div className="flex gap-4 flex-col">
          <div className="bg-black text-white min-h-fit max-h-fit h-fit sticky top-4 px-4 py-4 rounded-lg col-span-1">
            <h2 className="text-4xl font-semibold mb-6">{campaign.name}</h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-200 font-medium">Filter by Size</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleSelectAll} className="text-xs">
                  Select All
                </Button>
                {/* <Button variant="outline" size="sm" onClick={handleClearAll} className="text-xs">
                  Clear All
                </Button> */}
              </div>
              <div className="flex flex-col gap-2">
                {availableSizes.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size}`}
                      checked={selectedSizes.has(size)}
                      onCheckedChange={() => handleSizeToggle(size)}
                    />
                    <Label htmlFor={`size-${size}`} className="text-sm">
                      {size}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <h2 className="text-2xl font-semibold mb-4">Campaign Ads</h2>
          <MasonryGrid items={filteredAds} gutter={16}>
            {filteredAds.map((ad) => (
              <motion.div
                key={ad.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="border border-gray-400 rounded-lg overflow-hidden flex flex-col bg-white shadow-sm"
              >
                <div className="px-4 pt-4">
                  <motion.h3 
                    className="text-lg font-semibold mb-4"
                    layout="position"
                  >
                    {campaign.name}
                  </motion.h3>
                </div>

                <motion.div 
                  className="w-full px-4 flex justify-center items-center overflow-hidden"
                  layout
                >
                  {ad.files.length > 0 && (
                    <AdPreview
                      key={`${ad.id}-${replayCounters[ad.id] || 0}`}
                      adFile={ad.files.find(file => file.toLowerCase().endsWith('.html')) || ad.files[0]}
                      adSize={ad.ad_size}
                    />
                  )}
                </motion.div>

                <motion.div 
                  className="px-4 py-4 flex w-full justify-between items-center mt-4"
                  layout="position"
                >
                  <p className="rounded-full px-3 py-1 text-sm bg-[#0dab5439] text-[#0A8B43] border-[#0DAB53] border">
                    {ad.ad_size}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleReplay(ad.id)}
                    className="hover:bg-gray-100"
                  >
                    <RefreshCcw size={16} />
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </MasonryGrid>
        </div>
      </div>
    </main>
  )
}