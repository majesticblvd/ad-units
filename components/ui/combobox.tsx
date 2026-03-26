"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
	value: string;
	label: string;
	subLabel?: string;
}

interface ComboboxProps {
	options: ComboboxOption[];
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	className?: string;
	disabled?: boolean;
}

export function Combobox({
	options,
	value,
	onValueChange,
	placeholder = "Select...",
	searchPlaceholder = "Search...",
	emptyMessage = "No results found.",
	className,
	disabled = false,
}: ComboboxProps) {
	const [open, setOpen] = useState(false);

	const selectedLabel = options.find((opt) => opt.value === value)?.label;

	return (
		<Popover open={disabled ? false : open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-full min-w-0 justify-between font-normal",
						!value && "text-muted-foreground",
						className,
					)}
				>
					<span className="truncate">
						{selectedLabel || placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
					className="p-0"
					align="start"
					style={{ width: "var(--radix-popover-trigger-width)" }}
				>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList style={{ maxHeight: "24rem" }}>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.value}
									value={option.label}
									onSelect={() => {
										onValueChange(option.value);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === option.value
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									{option.label}
									{option.subLabel && (
										<span className="ml-1 text-muted-foreground">
											({option.subLabel})
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
