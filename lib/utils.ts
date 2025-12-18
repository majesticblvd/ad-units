import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return ""
  if (bytes === 0) return "0 B"

  const k = 1024
  const units = ["B", "KB", "MB", "GB", "TB"]

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const value = bytes / Math.pow(k, unitIndex)

  const decimals = unitIndex === 0 ? 0 : value >= 10 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}
