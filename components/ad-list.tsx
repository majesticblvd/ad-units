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
import { RefreshCcw, ChevronUp, ChevronDown, FolderSymlink } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ShareDialogButton } from "./share-button"
import { EditCampaignButton } from "./edit-campaign-button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"


interface Ad {
  id: string
  campaign_id: string
  campaign_name: string
  title?: string
  description?: string
  ad_size: string
  files: string[]
  position?: number
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
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [campaignToReorder, setCampaignToReorder] = useState<string | null>(null);
  const [reorderingAds, setReorderingAds] = useState<Ad[]>([]);
  const [adToSwap, setAdToSwap] = useState<string | null>(null);

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
          position,
          campaigns:campaigns (
            name
          )
        `)
        .order("position")
      
      if (adError) throw adError

      const transformedAds = adData?.map((ad) => ({
        ...ad,
        campaign_name: Array.isArray(ad.campaigns)
          ? ad.campaigns[0]?.name
          : (ad.campaigns as { name: string })?.name
      })) || []

      setAds(transformedAds)
      console.log('Fetched ads:', transformedAds)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch ads and campaigns.",
        variant: "destructive",
      })
    }
  }

  // Initialize ad positions for all campaigns on first load just to start
  const initializePositions = async () => {
    try {
      // Get all campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from("campaigns")
        .select("id")
      
      if (campaignError) throw campaignError
      
      // For each campaign, update its ads with sequential positions
      for (const campaign of campaigns) {
        // Get ads for this campaign
        const { data: campaignAds, error: adsError } = await supabase
          .from("ads")
          .select("id")
          .eq("campaign_id", campaign.id)
        
        if (adsError) throw adsError
        
        // Update each ad with a position
        for (let i = 0; i < campaignAds.length; i++) {
          const { error: updateError } = await supabase
            .from("ads")
            .update({ position: i + 1 })
            .eq("id", campaignAds[i].id)
          
          if (updateError) throw updateError
        }
      }
      
      console.log("Position initialization complete")
    } catch (error) {
      console.error("Error initializing positions:", error)
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

  const openReorderModal = (campaignId: string) => {
    const campaignAds = ads
      .filter(ad => ad.campaign_id === campaignId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    setReorderingAds(campaignAds);
    setCampaignToReorder(campaignId);
    setIsReorderModalOpen(true);
  };

  const updateAdPosition = (adId: string, newPosition: number) => {
    setReorderingAds(prev => {
      const updatedAds = [...prev];
      const adIndex = updatedAds.findIndex(ad => ad.id === adId);
      if (adIndex === -1) return prev;
      
      // Create a copy of the ad with updated position
      const updatedAd = { ...updatedAds[adIndex], position: newPosition };
      
      // Remove the ad and reinsert at the correct position based on new position
      updatedAds.splice(adIndex, 1);
      
      // Find the correct insertion index
      let insertIndex = 0;
      while (
        insertIndex < updatedAds.length && 
        (updatedAds[insertIndex].position || 0) < newPosition
      ) {
        insertIndex++;
      }
      
      // Insert the updated ad
      updatedAds.splice(insertIndex, 0, updatedAd);
      
      // Update all positions to be sequential
      return updatedAds.map((ad, index) => ({
        ...ad,
        position: index + 1
      }));
    });
  };

  // Function to swap two ads
  const swapAds = (adId1: string, adId2: string) => {
    setReorderingAds(prev => {
      const updatedAds = [...prev];
      const adIndex1 = updatedAds.findIndex(ad => ad.id === adId1);
      const adIndex2 = updatedAds.findIndex(ad => ad.id === adId2);
      
      if (adIndex1 === -1 || adIndex2 === -1) return prev;
      
      // Swap the positions
      const tempPosition = updatedAds[adIndex1].position;
      updatedAds[adIndex1] = { ...updatedAds[adIndex1], position: updatedAds[adIndex2].position };
      updatedAds[adIndex2] = { ...updatedAds[adIndex2], position: tempPosition };
      
      // Sort the array by position
      return updatedAds.sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    
    setAdToSwap(null); // Reset the swap selection
  };

  // Function to save the new order to the database
  const saveNewOrder = async () => {
    try {
      // Create updates for all ads with their new positions
      const updates = reorderingAds.map(ad => ({
        id: ad.id,
        position: ad.position
      }));
      
      // Update in Supabase
      const { error } = await supabase
        .from("ads")
        .upsert(updates, { onConflict: 'id' });
      
      if (error) throw error;
      
      // Update the main ads state
      setAds(prevAds => {
        const otherAds = prevAds.filter(ad => !reorderingAds.some(ra => ra.id === ad.id));
        return [...otherAds, ...reorderingAds];
      });
      
      toast({
        title: "Order Updated",
        description: "The ad order has been saved.",
      });
      
      setIsReorderModalOpen(false);
    } catch (error) {
      console.error("Error saving ad order:", error);
      toast({
        title: "Error",
        description: "Failed to save the new order.",
        variant: "destructive",
      });
    }
  };

  // Render an individual ad card
  const renderAdCard = (ad: Ad) => (
    <div 
      key={ad.id}
      className="border border-gray-200 rounded-lg h-fit overflow-hidden flex flex-col bg-white shadow-sm"
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
        <div className="flex items-center gap-2">
          <p className="rounded-full px-2 py-1 text-xs bg-[#0dab5439] text-[#0A8B43] border-[#0DAB53] border">
            {ad.ad_size}
          </p>
          {/* <div className="text-xs text-gray-500 flex items-center">
            <FolderSymlink className="h-3 w-3 mr-1" />
            {ad.campaign_name}
          </div> */}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleReplay(ad.id)}
            className="hover:bg-gray-100 p-1 h-8"
          >
            <RefreshCcw size={14} />
          </Button>
          <EditCampaignButton 
            adId={ad.id}
            currentCampaignId={ad.campaign_id}
            campaigns={campaigns}
            onUpdate={fetchData}
            size="sm"
          />
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
                <div className="border-b border-gray-300 pb-2 flex justify-between items-center">
                  <h2 className="text-xl font-bold">
                    {campaign.name}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({ads.length} {ads.length === 1 ? 'ad' : 'ads'})
                    </span>
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openReorderModal(campaign.id)}
                  >
                    Reorder Ads
                  </Button>
              </div>
              
              {/* Grid of ads for this campaign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
      
      {/* Reorder Modal */}
      <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Reorder Ads in {campaigns.find(c => c.id === campaignToReorder)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              {adToSwap ? (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-700 mb-2">
                    Select another ad to swap positions with:
                    <span className="font-medium ml-1">
                      {reorderingAds.find(ad => ad.id === adToSwap)?.title || "Selected Ad"}
                    </span>
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAdToSwap(null)}
                  >
                    Cancel Selection
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-2">
                  Choose an ad to swap positions or directly edit position numbers.
                </p>
              )}
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {reorderingAds.map((ad) => (
                <div 
                  key={ad.id} 
                  className={`
                    flex items-center p-3 rounded-lg border
                    ${adToSwap === ad.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${adToSwap && adToSwap !== ad.id ? 'cursor-pointer hover:bg-gray-50' : ''}
                  `}
                  onClick={() => {
                    if (adToSwap && adToSwap !== ad.id) {
                      swapAds(adToSwap, ad.id);
                    } else if (!adToSwap) {
                      setAdToSwap(ad.id);
                    }
                  }}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full mr-3">
                    {ad.position}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="font-medium">
                      {ad.title || `Ad #${ad.position}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ad.ad_size}
                    </div>
                  </div>
                  
                  <div className="ml-4 w-32">
                    <Select
                      value={ad.position?.toString() || ""}
                      onValueChange={(val) => updateAdPosition(ad.id, parseInt(val))}
                    >
                      <SelectTrigger onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        {reorderingAds.map((_, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            Position {index + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReorderModalOpen(false);
                setAdToSwap(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveNewOrder}>
              Save Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}