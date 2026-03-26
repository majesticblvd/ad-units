"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ArrowDown,
	ArrowUp,
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	LoaderCircle,
	RefreshCcw,
	Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn, formatBytes } from "@/lib/utils";
import { AdPreview } from "./ad-preview";
import { useCampaigns } from "./campaign-provider";
import { EditCampaignButton } from "./edit-campaign-button";

interface Ad {
	id: string;
	campaign_id: string;
	campaign_name: string;
	title?: string;
	description?: string;
	ad_size: string;
	files: string[];
	position?: number;
	created_at?: string;
	filesize?: number | null;
}

interface AdCardProps {
	ad: Ad;
	isFirst: boolean;
	isLast: boolean;
	replayCounter: number;
	isDescriptionOpen: boolean;
	onToggleDescription: (adId: string) => void;
	onMoveAd: (ad: Ad, direction: "up" | "down") => void;
	onReplay: (adId: string) => void;
	onDelete: (ad: Ad) => void;
	onUpdate: () => void;
}

const AdCard = memo(function AdCard({
	ad,
	isFirst,
	isLast,
	replayCounter,
	isDescriptionOpen,
	onToggleDescription,
	onMoveAd,
	onReplay,
	onDelete,
	onUpdate,
}: AdCardProps) {
	return (
		<div className="border border-gray-200 rounded-lg h-fit overflow-hidden flex flex-col bg-white shadow-sm">
			<div className="w-full flex justify-center items-center overflow-hidden p-2">
				{ad.files && ad.files.length > 0 ? (
					<AdPreview
						key={`${ad.id}-${replayCounter}`}
						adFile={
							ad.files.find((file) => file.toLowerCase().endsWith(".html")) ||
							ad.files[0]
						}
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
					open={isDescriptionOpen}
					onOpenChange={() => onToggleDescription(ad.id)}
					className="px-4"
				>
					<div className="flex items-center gap-1">
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="p-0 h-auto hover:bg-transparent"
							>
								<span className="text-xs text-gray-500 hover:text-gray-700">
									{isDescriptionOpen ? "Hide Details" : "AD Details"}
								</span>
								{isDescriptionOpen ? (
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
					<p className="rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800">
						{ad.ad_size}
					</p>
					{ad.created_at && (
						<p className="text-xs text-gray-500">
							{formatDistanceToNow(new Date(ad.created_at), {
								addSuffix: true,
							})}
							{typeof ad.filesize === "number" && ad.filesize > 0
								? ` • ${formatBytes(ad.filesize)}`
								: ""}
						</p>
					)}
				</div>
				<div className="flex space-x-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onMoveAd(ad, "up")}
						disabled={isFirst}
						className="hover:bg-gray-100 p-1 h-8"
					>
						<ArrowUp size={14} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onMoveAd(ad, "down")}
						disabled={isLast}
						className="hover:bg-gray-100 p-1 h-8"
					>
						<ArrowDown size={14} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onReplay(ad.id)}
						className="hover:bg-gray-100 p-1 h-8"
					>
						<RefreshCcw size={14} />
					</Button>
					<EditCampaignButton
						adId={ad.id}
						currentCampaignId={ad.campaign_id}
						currentTitle={ad.title}
						currentDescription={ad.description}
						onUpdate={onUpdate}
						size="sm"
					/>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 p-1 hover:bg-gray-100"
							>
								<Trash2 size={14} />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete
									your ad and its files.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => onDelete(ad)}>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
});

interface AdListProps {
	refreshSignal?: number;
}

export function AdList({ refreshSignal }: AdListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [ads, setAds] = useState<Ad[]>([]);
	const { campaigns, refetch: refetchCampaigns } = useCampaigns();

	const selectedCampaignId = searchParams.get("campaign") || "all";
	const setSelectedCampaignId = (value: string) => {
		if (value !== selectedCampaignId) {
			setIsCampaignSwitching(true);
		}
		const params = new URLSearchParams(searchParams.toString());
		if (value === "all") {
			params.delete("campaign");
		} else {
			params.set("campaign", value);
		}
		const query = params.toString();
		router.replace(query ? `?${query}` : window.location.pathname);
	};
	const [replayCounters, setReplayCounters] = useState<{
		[key: string]: number;
	}>({});
	const [openDescriptions, setOpenDescriptions] = useState<Set<string>>(
		new Set(),
	);
	const [isDataLoading, setIsDataLoading] = useState(true);
	const [isCampaignSwitching, setIsCampaignSwitching] = useState(false);

	const [shareUrl, setShareUrl] = useState<string>("");
	const [isShareLoading, setIsShareLoading] = useState(false);
	const [isShareCopied, setIsShareCopied] = useState(false);
	const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);

	useEffect(() => {
		fetchData();
	}, [refreshSignal]);

	const generateShareToken = () => {
		return Array.from(crypto.getRandomValues(new Uint8Array(24)))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	};

	useEffect(() => {
		const loadShareUrl = async () => {
			if (selectedCampaignId === "all") {
				setShareUrl("");
				setIsShareCopied(false);
				setIsCampaignSwitching(false);
				return;
			}

			try {
				setIsShareLoading(true);
				const { data, error } = await supabase
					.from("campaigns")
					.select("share_token")
					.eq("id", selectedCampaignId)
					.single();

				if (error) throw error;

				let shareToken = data?.share_token as string | null | undefined;
				if (!shareToken) {
					shareToken = generateShareToken();
					const { error: updateError } = await supabase
						.from("campaigns")
						.update({ share_token: shareToken })
						.eq("id", selectedCampaignId);
					if (updateError) throw updateError;
				}

				const url = `${window.location.origin}/campaign/${shareToken}`;
				setShareUrl(url);
			} catch (error) {
				console.error("Error generating share link:", error);
				setShareUrl("");
				toast({
					title: "Error",
					description: "Failed to generate share link.",
					variant: "destructive",
				});
			} finally {
				setIsShareLoading(false);
				setIsShareCopied(false);
				setIsCampaignSwitching(false);
			}
		};

		loadShareUrl();
	}, [selectedCampaignId]);

	const copyShareUrl = async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setIsShareCopied(true);
			setTimeout(() => setIsShareCopied(false), 2000);
			toast({
				title: "Share link copied",
				description: "The campaign link is in your clipboard.",
			});
		} catch (error) {
			console.error("Clipboard error:", error);
			toast({
				title: "Error",
				description: "Failed to copy share link.",
				variant: "destructive",
			});
		}
	};

	const deleteCampaign = async () => {
		if (selectedCampaignId === "all") return;

		setIsDeletingCampaign(true);
		try {
			// Delete all ads' files from storage for this campaign
			const campaignAds = ads.filter(
				(a) => a.campaign_id === selectedCampaignId,
			);
			for (const ad of campaignAds) {
				for (const fileUrl of ad.files) {
					const filePath = fileUrl.split("/ad-files/")[1];
					if (filePath) {
						await supabase.storage.from("ad-files").remove([filePath]);
					}
				}
			}

			// Delete all ads in this campaign
			const { error: adsError } = await supabase
				.from("ads")
				.delete()
				.eq("campaign_id", selectedCampaignId);
			if (adsError) throw adsError;

			// Delete the campaign itself
			const { error: campaignError } = await supabase
				.from("campaigns")
				.delete()
				.eq("id", selectedCampaignId);
			if (campaignError) throw campaignError;

			toast({
				title: "Campaign Deleted",
				description: "The campaign and all its ads were deleted.",
			});

			// Reset to "all" and refresh
			setSelectedCampaignId("all");
			await fetchData();
		} catch (error) {
			console.error("Error deleting campaign:", error);
			toast({
				title: "Error",
				description: "Failed to delete the campaign.",
				variant: "destructive",
			});
		} finally {
			setIsDeletingCampaign(false);
		}
	};

	const fetchData = async () => {
		setIsDataLoading(true);
		try {
			const [, adResult] = await Promise.all([
				refetchCampaigns(),
				supabase
					.from("ads")
					.select(`
						id,
						campaign_id,
						title,
						description,
						ad_size,
						files,
						position,
						created_at,
						filesize,
						campaigns:campaigns (
							name
						)
					`)
					.order("position")
					.limit(500),
			]);

			if (adResult.error) throw adResult.error;
			const adData = adResult.data;

			const transformedAds =
				adData?.map((ad) => ({
					...ad,
					campaign_name: Array.isArray(ad.campaigns)
						? ad.campaigns[0]?.name
						: (ad.campaigns as { name: string })?.name,
				})) || [];

			setAds(transformedAds);
		} catch (error) {
			console.error("Failed to fetch data:", error);
			toast({
				title: "Error",
				description: "Failed to fetch ads and campaigns.",
				variant: "destructive",
			});
		} finally {
			setIsDataLoading(false);
		}
	};

	// Filter ads based on selected campaign
	const filteredAds =
		selectedCampaignId === "all"
			? ads
			: ads.filter((ad) => ad.campaign_id === selectedCampaignId);

	// Group ads by campaign
	const groupedAdsByCampaign = () => {
		if (selectedCampaignId !== "all") {
			// If a specific campaign is selected, just return those ads
			const campaign = campaigns.find((c) => c.id === selectedCampaignId);
			return campaign && filteredAds.length > 0
				? [{ campaign, ads: filteredAds }]
				: [];
		}

		// Group all ads by campaign
		return campaigns
			.map((campaign) => ({
				campaign,
				ads: ads.filter((ad) => ad.campaign_id === campaign.id),
			}))
			.filter((group) => group.ads.length > 0);
	};

	const handleReplay = useCallback((adId: string) => {
		setReplayCounters((prev) => ({
			...prev,
			[adId]: (prev[adId] || 0) + 1,
		}));
	}, []);

	const handleDelete = async (ad: Ad) => {
		try {
			for (const fileUrl of ad.files) {
				const filePath = fileUrl.split("/ad-files/")[1];
				if (filePath) {
					await supabase.storage.from("ad-files").remove([filePath]);
				}
			}

			const { error: dbError } = await supabase
				.from("ads")
				.delete()
				.eq("id", ad.id);

			if (dbError) throw dbError;

			toast({
				title: "Ad Deleted",
				description: "The ad was deleted successfully.",
			});

			setAds((prevAds) => prevAds.filter((a) => a.id !== ad.id));
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Error",
				description: "Failed to delete the ad.",
				variant: "destructive",
			});
		}
	};

	const toggleDescription = useCallback((adId: string) => {
		setOpenDescriptions((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(adId)) {
				newSet.delete(adId);
			} else {
				newSet.add(adId);
			}
			return newSet;
		});
	}, []);

	const moveAd = async (ad: Ad, direction: "up" | "down") => {
		const campaignAds = ads
			.filter((a) => a.campaign_id === ad.campaign_id)
			.sort((a, b) => (a.position || 0) - (b.position || 0));

		const currentIndex = campaignAds.findIndex((a) => a.id === ad.id);
		const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (swapIndex < 0 || swapIndex >= campaignAds.length) return;

		const otherAd = campaignAds[swapIndex];
		const tempPosition = ad.position;
		const newAdPosition = otherAd.position;
		const newOtherPosition = tempPosition;

		try {
			const { error } = await supabase.from("ads").upsert(
				[
					{ id: ad.id, position: newAdPosition },
					{ id: otherAd.id, position: newOtherPosition },
				],
				{ onConflict: "id" },
			);

			if (error) throw error;

			setAds((prev) =>
				prev
					.map((a) => {
						if (a.id === ad.id) return { ...a, position: newAdPosition };
						if (a.id === otherAd.id)
							return { ...a, position: newOtherPosition };
						return a;
					})
					.sort((a, b) => (a.position || 0) - (b.position || 0)),
			);

			toast({
				title: "Ad Moved",
				description: `Ad moved ${direction}.`,
			});
		} catch (error) {
			console.error("Error moving ad:", error);
			toast({
				title: "Error",
				description: "Failed to move the ad.",
				variant: "destructive",
			});
		}
	};

	const renderAdCard = (ad: Ad, campaignAds: Ad[]) => {
		const sortedCampaignAds = [...campaignAds].sort(
			(a, b) => (a.position || 0) - (b.position || 0),
		);
		const adIndex = sortedCampaignAds.findIndex((a) => a.id === ad.id);

		return (
			<AdCard
				key={ad.id}
				ad={ad}
				isFirst={adIndex === 0}
				isLast={adIndex === sortedCampaignAds.length - 1}
				replayCounter={replayCounters[ad.id] || 0}
				isDescriptionOpen={openDescriptions.has(ad.id)}
				onToggleDescription={toggleDescription}
				onMoveAd={moveAd}
				onReplay={handleReplay}
				onDelete={handleDelete}
				onUpdate={fetchData}
			/>
		);
	};

	const groupedCampaignAds = groupedAdsByCampaign();

	const totalAdsCount = ads.length;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="w-120">
					<Combobox
						options={[
							{
								value: "all",
								label: "All Campaigns",
								subLabel: `${totalAdsCount} ads`,
							},
							...campaigns.map((c) => {
								const count = ads.filter((a) => a.campaign_id === c.id).length;
								return {
									value: c.id,
									label: c.name,
									subLabel: `${count} ${count === 1 ? "ad" : "ads"}`,
								};
							}),
						]}
						value={selectedCampaignId}
						onValueChange={setSelectedCampaignId}
						placeholder="Select Campaign"
						searchPlaceholder="Search campaigns..."
						emptyMessage="No campaigns found."
						disabled={isCampaignSwitching}
					/>
				</div>

				{selectedCampaignId !== "all" && (
					<TooltipProvider delayDuration={300}>
						<div
							className={cn(
								"flex items-center gap-3 text-sm text-muted-foreground min-h-10 transition-opacity",
								isCampaignSwitching && "opacity-50 pointer-events-none",
							)}
						>
							{isShareLoading ? (
								<LoaderCircle className="h-4 w-4 animate-spin" />
							) : shareUrl ? (
								<span className="inline-flex items-center gap-2">
									<a
										href={shareUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="break-all underline text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
									>
										{shareUrl}
									</a>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={copyShareUrl}
												className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
												aria-label="Copy share link"
											>
												{isShareCopied ? (
													<Check className="h-4 w-4" />
												) : (
													<Copy className="h-4 w-4" />
												)}
											</button>
										</TooltipTrigger>
										<TooltipContent>
											{isShareCopied ? "Copied!" : "Copy share URL"}
										</TooltipContent>
									</Tooltip>
									<AlertDialog>
										<Tooltip>
											<TooltipTrigger asChild>
												<AlertDialogTrigger asChild>
													<button
														type="button"
														className="shrink-0 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
														aria-label="Delete campaign"
														disabled={isDeletingCampaign}
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</AlertDialogTrigger>
											</TooltipTrigger>
											<TooltipContent>Delete campaign</TooltipContent>
										</Tooltip>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete campaign?</AlertDialogTitle>
												<AlertDialogDescription>
													This will permanently delete the campaign and all its
													ads. This action cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction onClick={deleteCampaign}>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</span>
							) : (
								<span>Share link unavailable</span>
							)}
						</div>
					</TooltipProvider>
				)}
			</div>

			{isDataLoading || isCampaignSwitching ? (
				<div className="flex flex-col items-center justify-center flex-1 min-h-[50vh] gap-4">
					<LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
					<p className="text-sm text-muted-foreground">
						{isDataLoading ? "Loading ads..." : "Switching campaign..."}
					</p>
				</div>
			) : groupedCampaignAds.length > 0 ? (
				<div className="space-y-10">
					{groupedCampaignAds.map(({ campaign, ads }) => (
						<div key={campaign.id} className="space-y-4">
							{/* Campaign header — only shown when viewing all campaigns */}
							{selectedCampaignId === "all" && (
								<div className="border-b border-gray-300 pb-2">
									<h2 className="text-xl font-bold">
										{campaign.name}
										<span className="ml-2 text-sm font-normal text-gray-500">
											({ads.length} {ads.length === 1 ? "ad" : "ads"})
										</span>
									</h2>
								</div>
							)}

							{/* Grid of ads for this campaign */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
								{ads.map((ad) => renderAdCard(ad, ads))}
							</div>
						</div>
					))}
				</div>
			) : selectedCampaignId !== "all" ? (
				<div className="flex items-center justify-center min-h-[40vh]">
					<p className="text-lg text-gray-400">No ads in campaign</p>
				</div>
			) : (
				<div className="text-center py-10 text-gray-500">
					No ads found. Try uploading some ads first.
				</div>
			)}
		</div>
	);
}
