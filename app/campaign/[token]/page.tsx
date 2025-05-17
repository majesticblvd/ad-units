"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AdPreview } from "@/components/ad-preview"
import { Card } from "@/components/ui/card"
import { RefreshCcw, MessageSquare, X, ArrowLeft } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import MasonryGrid from "@/components/ui/masonry-grid"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"

interface CampaignAd {
  id: string
  ad_size: string
  files: string[]
  title: string
  position?: number
}

interface CampaignData {
  name: string
  ads: CampaignAd[]
}

interface Comment {
  id: string
  text: string
  author: string
  createdAt: Date
  adId?: string // Optional adId to identify if this is an ad-specific comment
}

export default function CampaignSharePage({ params }: { params: { token: string } }) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [availableSizes, setAvailableSizes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replayCounters, setReplayCounters] = useState<{ [key: string]: number }>({})
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  
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
              files,
              title,
              position
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

    const loadComments = () => {
      // Mock comments - some for campaign, some for specific ads
      const mockComments: Comment[] = [
        {
          id: "1",
          text: "I like the design, but can we make the CTA button more prominent?",
          author: "Jane Smith",
          createdAt: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          id: "2",
          text: "The animation looks great! Let's proceed with this version.",
          author: "John Doe",
          createdAt: new Date(Date.now() - 172800000) // 2 days ago
        },
        {
          id: "3",
          text: "This ad needs a stronger headline.",
          author: "Alice Johnson",
          createdAt: new Date(Date.now() - 50000000),
          adId: "ad1" // This is a mock ID that needs to match one of your actual ad IDs
        },
        {
          id: "4",
          text: "The colors on this ad look great!",
          author: "Bob Wilson",
          createdAt: new Date(Date.now() - 60000000),
          adId: "ad2" // Another mock ID
        },
        {
          id: "5",
          text: "Can we adjust the logo size?",
          author: "Chris Martin",
          createdAt: new Date(Date.now() - 70000000),
          adId: "ad1" // Same ad as comment 3
        }
      ]
      setComments(mockComments)
    }

    fetchCampaign()
    loadComments()
  }, [params.token])

  const submitComment = () => {
    if (!newComment.trim()) return
    
    setIsSubmittingComment(true)
    
    setTimeout(() => {
      const newCommentObj: Comment = {
        id: `comment-${Date.now()}`,
        text: newComment,
        author: "You",
        createdAt: new Date(),
        adId: selectedAdId // Include the selected ad ID if we're commenting on a specific ad
      }
      
      setComments(prevComments => [newCommentObj, ...prevComments])
      setNewComment("")
      setIsSubmittingComment(false)
    }, 500)
  }

  // Function to filter comments based on selected ad
  const getFilteredComments = () => {
    if (!selectedAdId) {
      // If no ad is selected, show only campaign-level comments (those without adId)
      return comments.filter(comment => !comment.adId);
    } else {
      // If an ad is selected, show comments for that specific ad
      return comments.filter(comment => comment.adId === selectedAdId);
    }
  }

  // Function to count comments for a specific ad
  const getCommentCountForAd = (adId: string) => {
    return comments.filter(comment => comment.adId === adId).length;
  }

  // Function to open sidebar with ad-specific comments
  const openAdComments = (adId: string) => {
    setSelectedAdId(adId)
    setIsCommentSidebarOpen(true)
  }

  // Function to show general campaign comments
  const showCampaignComments = () => {
    setSelectedAdId(null)
    setIsCommentSidebarOpen(true)
  }

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

  const toggleCommentSidebar = () => {
    if (isCommentSidebarOpen) {
      setIsCommentSidebarOpen(false)
      // Optional: Reset to campaign comments when closing
      // setSelectedAdId(null)
    } else {
      setIsCommentSidebarOpen(true)
    }
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

  // filter ads by size and sort by position
  const filteredAds = campaign.ads
    .filter(ad => selectedSizes.has(ad.ad_size))
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  // For better test visualization, assign mock comment IDs to real ads
  // This maps our mock comment adIds to actual adIds from the campaign
  const adIdMap: Record<string, string> = {}
  if (campaign && campaign.ads.length > 0) {
    adIdMap["ad1"] = campaign.ads[0].id
    if (campaign.ads.length > 1) {
      adIdMap["ad2"] = campaign.ads[1].id
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

  const sidebarVariants = {
    open: { 
      x: 0,
      width: "300px",
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    closed: { 
      x: 20,
      width: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  }

  const buttonVariants = {
    open: { x: 0 },
    closed: { x: 0 }
  }

  return (
    <main className="container w-full max-w-none relative">
      <div className="grid bg-gray-50 grid-cols-1 md:grid-cols-4 p-4 gap-6">
        <div className="flex gap-4 flex-col">
          {/* Left sidebar */}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Campaign Ads</h2>
            <Button 
              variant="outline"
              size="sm"
              onClick={showCampaignComments}
              className="flex items-center gap-1"
            >
              <MessageSquare size={18} />
              Campaign Comments
            </Button>
          </div>

          <MasonryGrid items={filteredAds} gutter={16}>
            {filteredAds.map((ad) => {
              // Find comments for this ad, handling the mock -> real ID mapping
              const commentCount = getCommentCountForAd(ad.id) + 
                getCommentCountForAd(Object.entries(adIdMap).find(([mockId, realId]) => realId === ad.id)?.[0] || "");
              
              return (
                <motion.div
                  key={ad.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="border border-gray-400 rounded-lg overflow-hidden flex flex-col bg-white shadow-md"
                >
                  <div className="px-4 pt-4">
                    <motion.h3 
                      className="text-lg font-semibold mb-4"
                      layout="position"
                    >
                      {ad.title || campaign.name}
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
                    <div className="flex items-center gap-2">
                      <p className="rounded-full px-3 py-1 text-sm bg-[#0dab5439] text-[#0A8B43] border-[#0DAB53] border">
                        {ad.ad_size}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openAdComments(ad.id)}
                        className="text-xs flex items-center gap-1"
                      >
                        <MessageSquare size={14} />
                        {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Add comment'}
                      </Button>
                    </div>
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
              )
            })}
          </MasonryGrid>
        </div>
      </div>

      {/* Comments Sidebar */}
      <AnimatePresence>
        {isCommentSidebarOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg z-50 overflow-hidden"
          >
            <div className="p-4 h-full flex flex-col">
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold">
                    {selectedAdId ? 'Ad Comments' : 'Campaign Comments'}
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleCommentSidebar} className="rounded-full p-1 h-8 w-8">
                  <X size={18} />
                </Button>
              </div>
              
              <div className="flex-grow overflow-y-auto mb-4">
                {getFilteredComments().length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {selectedAdId ? 'No comments yet for this ad.' : 'No comments yet for this campaign.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {getFilteredComments().map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between mb-1">
                          <p className="font-medium text-sm">{comment.author}</p>
                          <p className="text-gray-500 text-xs">
                            {format(comment.createdAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border-t pt-3">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  submitComment();
                }} className="flex flex-col gap-2">
                  <Textarea 
                    placeholder={selectedAdId ? "Comment on this ad..." : "Comment on this campaign..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="resize-none min-h-[80px]"
                    disabled={isSubmittingComment}
                  />
                  <Button 
                    type="submit" 
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="self-end"
                  >
                    {isSubmittingComment ? 'Sending...' : 'Comment'}
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}