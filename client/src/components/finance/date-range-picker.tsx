import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange as ReactDayPickerDateRange } from "react-day-picker";
import { DateRange } from "@/types/date-range";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export default function DateRangePicker({
  dateRange,
  onChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>(dateRange);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Update component state when prop changes
  useEffect(() => {
    setDate(dateRange);
  }, [dateRange]);

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (preset) {
      case "today":
        from = today;
        break;
      case "yesterday":
        from = new Date(today);
        from.setDate(from.getDate() - 1);
        to = new Date(from);
        break;
      case "this-week":
        from = new Date(today);
        from.setDate(from.getDate() - from.getDay());
        break;
      case "last-week":
        from = new Date(today);
        from.setDate(from.getDate() - from.getDay() - 7);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        break;
      case "this-month":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "last-month":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this-quarter":
        const currentQuarter = Math.floor(today.getMonth() / 3);
        from = new Date(today.getFullYear(), currentQuarter * 3, 1);
        to = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "last-quarter":
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const quarter = lastQuarter < 0 ? 3 : lastQuarter;
        from = new Date(year, quarter * 3, 1);
        to = new Date(year, (quarter + 1) * 3, 0);
        break;
      case "this-year":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      case "last-year":
        from = new Date(today.getFullYear() - 1, 0, 1);
        to = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case "last-30-days":
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        break;
      case "last-60-days":
        from = new Date(today);
        from.setDate(from.getDate() - 60);
        break;
      case "last-90-days":
        from = new Date(today);
        from.setDate(from.getDate() - 90);
        break;
      case "all-time":
        // Use a date far in the past for "all time"
        from = new Date(2000, 0, 1);
        break;
      default:
        // Custom range, no change
        return;
    }

    // For ranges that end today, set 'to' to today
    if (preset !== "yesterday" && preset !== "last-week" && preset !== "last-month" && preset !== "last-quarter" && preset !== "last-year") {
      to = today;
    }

    const newRange = { from, to };
    setDate(newRange);
    onChange(newRange);
    setIsCalendarOpen(false);
  };

  // Format the displayed date range
  const formatDisplayRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return "Select date range";
    }

    if (!range.to) {
      return format(range.from, "MMM dd, yyyy");
    }

    // If dates are in the same month and year
    if (
      range.from.getMonth() === range.to.getMonth() &&
      range.from.getFullYear() === range.to.getFullYear()
    ) {
      return `${format(range.from, "MMM d")} - ${format(range.to, "d, yyyy")}`;
    }

    // If dates are in the same year
    if (range.from.getFullYear() === range.to.getFullYear()) {
      return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;
    }

    // Different years
    return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
  };

  // Handle calendar selection
  const handleCalendarSelect = (selectedRange: ReactDayPickerDateRange | undefined) => {
    if (selectedRange && selectedRange.from && selectedRange.to) {
      const validRange: DateRange = {
        from: selectedRange.from,
        to: selectedRange.to
      };
      setDate(validRange);
      onChange(validRange);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDisplayRange(date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              showOutsideDays={false}
            />
          </PopoverContent>
        </Popover>

        <Select onValueChange={handlePresetChange}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Date Range</SelectLabel>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Rolling Periods</SelectLabel>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="last-60-days">Last 60 Days</SelectItem>
              <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}