import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdItem {
  id: string;
  ad_size: string;
  [key: string]: any;  // Allow for other properties
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

const MasonryGrid: React.FC<MasonryGridProps> = ({ 
  children, 
  items, 
  gutter = 10 
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState<ReactNode[][]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Calculate dimensions from ad size string (e.g., "300x250")
  const getItemDimensions = (size: string): ItemDimensions => {
    const [width, height] = size.split('x').map(Number);
    return { 
      width: isNaN(width) ? 300 : width + 32, // Add more padding (16px on each side)
      height: isNaN(height) ? 250 : height + 80 // Add more space for header and footer
    };
  };

  // Set up ResizeObserver to handle container resizing
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate columns based on container width and item dimensions
  useEffect(() => {
    if (!containerWidth || !items.length) return;

    const columnHeights: number[] = [];
    const columnItems: ReactNode[][] = [];
    let totalWidth = 0;
    let currentCol = 0;

    items.forEach((item, index) => {
      const { width } = getItemDimensions(item.ad_size);
      
      // Reset to new row if width exceeds container
      if (totalWidth + width + gutter > containerWidth) {
        totalWidth = 0;
        currentCol = 0;
      }

      // Initialize new column if needed
      if (!columnItems[currentCol]) {
        columnItems[currentCol] = [];
        columnHeights[currentCol] = 0;
      }

      // Add item to current column
      const childArray = React.Children.toArray(children);
      if (index < childArray.length) {
        columnItems[currentCol].push(childArray[index]);
      }
      
      // Update column height
      const { height } = getItemDimensions(item.ad_size);
      columnHeights[currentCol] += height + gutter;
      
      totalWidth += width + gutter;
      currentCol++;
    });

    setColumns(columnItems);
  }, [children, items, containerWidth, gutter]);

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