import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";

interface BookingCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date) => void;
  bookedDates?: Date[];
  minDate?: Date;
  maxDate?: Date;
}

export function BookingCalendar({
  selectedDate,
  onDateSelect,
  bookedDates = [],
  minDate = new Date(),
  maxDate = addMonths(new Date(), 3)
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Check if the date is in the past (before today)
  const isPastDate = (date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  // Check if the date is booked
  const isBooked = (date: Date) => {
    return bookedDates.some(bookedDate => isSameDay(date, bookedDate));
  };

  // Disable dates that are booked, in the past, or outside the min/max range
  const isDisabled = (date: Date) => {
    return (
      isPastDate(date) ||
      isBooked(date) ||
      isBefore(date, minDate) ||
      isAfter(date, maxDate)
    );
  };

  return (
    <div className="booking-calendar-container bg-[#080d17] rounded-lg border border-gold-dark/30 p-4">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          disabled={isBefore(subMonths(currentMonth, 1), subMonths(new Date(), 1))}
          className="text-offwhite hover:text-gold hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h4 className="font-montserrat text-offwhite text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="text-offwhite hover:text-gold hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <CalendarComponent
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        disabled={isDisabled}
        modifiers={{
          booked: bookedDates
        }}
        modifiersStyles={{
          booked: { 
            color: "var(--gold-dark)",
            textDecoration: "line-through" 
          }
        }}
        className="rounded-md border-gold-dark/30"
      />

      <div className="mt-4 flex items-center justify-end space-x-4 text-sm">
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-gold mr-2"></div>
          <span className="text-offwhite/70">Selected</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-muted-foreground/30 mr-2"></div>
          <span className="text-offwhite/70">Unavailable</span>
        </div>
      </div>
    </div>
  );
}

export default BookingCalendar;
