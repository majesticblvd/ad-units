import { AnimatePresence, motion } from "motion/react";
import React, { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

interface AdItem {
	id: string;
	ad_size: string;
	[key: string]: any;
}

interface MasonryGridProps {
	children: ReactNode[];
	items: AdItem[];
	gutter?: number;
}

interface ItemDimensions {
	width: number;
	height: number;
}

const getItemDimensions = (size: string): ItemDimensions => {
	const [width, height] = size.split("x").map(Number);
	return {
		width: Number.isNaN(width) ? 300 : width + 32,
		height: Number.isNaN(height) ? 250 : height + 80,
	};
};

const MasonryGrid: React.FC<MasonryGridProps> = ({
	children,
	items,
	gutter = 10,
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = useState<number>(0);

	useEffect(() => {
		const resizeObserver = new ResizeObserver(
			(entries: ResizeObserverEntry[]) => {
				for (const entry of entries) {
					setContainerWidth(entry.contentRect.width);
				}
			},
		);

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => resizeObserver.disconnect();
	}, []);

	const childArray = useMemo(() => React.Children.toArray(children), [children]);

	const columns = useMemo(() => {
		if (!containerWidth || !items.length) return [];

		const columnHeights: number[] = [];
		const columnItems: ReactNode[][] = [];
		let totalWidth = 0;
		let currentCol = 0;

		items.forEach((item, index) => {
			const { width, height } = getItemDimensions(item.ad_size);

			if (totalWidth + width + gutter > containerWidth) {
				totalWidth = 0;
				currentCol = 0;
			}

			if (!columnItems[currentCol]) {
				columnItems[currentCol] = [];
				columnHeights[currentCol] = 0;
			}

			if (index < childArray.length) {
				columnItems[currentCol].push(childArray[index]);
			}

			columnHeights[currentCol] += height + gutter;
			totalWidth += width + gutter;
			currentCol++;
		});

		return columnItems;
	}, [childArray, items, containerWidth, gutter]);

	return (
		<div ref={containerRef} className="w-full min-h-[100px]">
			<AnimatePresence mode="popLayout">
				<div className="flex flex-wrap gap-4">
					{columns.map((column, i) => (
						<motion.div
							key={i}
							className="flex flex-col gap-4"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3, delay: i * 0.1 }}
						>
							{column}
						</motion.div>
					))}
				</div>
			</AnimatePresence>
		</div>
	);
};

export default MasonryGrid;
