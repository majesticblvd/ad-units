"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Campaign {
	id: string;
	name: string;
}

interface CampaignContextValue {
	campaigns: Campaign[];
	isLoading: boolean;
	refetch: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
	const [campaigns, setCampaigns] = useState<Campaign[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchCampaigns = useCallback(async () => {
		try {
			setIsLoading(true);
			const { data, error } = await supabase
				.from("campaigns")
				.select("id, name")
				.order("name");

			if (error) throw error;
			setCampaigns(data || []);
		} catch (error) {
			console.error("Error fetching campaigns:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCampaigns();
	}, [fetchCampaigns]);

	return (
		<CampaignContext.Provider value={{ campaigns, isLoading, refetch: fetchCampaigns }}>
			{children}
		</CampaignContext.Provider>
	);
}

export function useCampaigns() {
	const context = useContext(CampaignContext);
	if (!context) {
		throw new Error("useCampaigns must be used within a CampaignProvider");
	}
	return context;
}
