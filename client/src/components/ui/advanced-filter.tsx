import { useState } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Check } from "lucide-react";

export interface FilterOption {
  type: 'select' | 'checkbox' | 'range' | 'search' | 'date' | 'number';
  field: string;
  label: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  multi?: boolean;
  defaultValue?: any;
}

export interface FilterState {
  [key: string]: any;
}

interface AdvancedFilterProps {
  options: FilterOption[];
  onFilterChange: (filters: FilterState) => void;
  className?: string;
  activeFiltersCount?: number;
}

export function AdvancedFilter({ 
  options, 
  onFilterChange, 
  className = "",
  activeFiltersCount = 0 
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(() => {
    // Initialize filter state with default values
    const initialState: FilterState = {};
    options.forEach(option => {
      if (option.defaultValue !== undefined) {
        initialState[option.field] = option.defaultValue;
      } else {
        switch (option.type) {
          case 'select':
            initialState[option.field] = option.multi ? [] : 'all';
            break;
          case 'checkbox':
            initialState[option.field] = false;
            break;
          case 'range':
            initialState[option.field] = {
              min: option.min || 0,
              max: option.max || 100
            };
            break;
          case 'search':
          case 'date':
            initialState[option.field] = '';
            break;
          case 'number':
            initialState[option.field] = null;
            break;
        }
      }
    });
    return initialState;
  });

  const handleFilterChange = (field: string, value: any) => {
    setFilterState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilters = () => {
    onFilterChange(filterState);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const resetState: FilterState = {};
    options.forEach(option => {
      switch (option.type) {
        case 'select':
          resetState[option.field] = option.multi ? [] : 'all';
          break;
        case 'checkbox':
          resetState[option.field] = false;
          break;
        case 'range':
          resetState[option.field] = {
            min: option.min || 0,
            max: option.max || 100
          };
          break;
        case 'search':
        case 'date':
          resetState[option.field] = '';
          break;
        case 'number':
          resetState[option.field] = null;
          break;
      }
    });
    setFilterState(resetState);
    onFilterChange(resetState);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    Object.entries(filterState).forEach(([field, value]) => {
      const option = options.find(opt => opt.field === field);
      if (option) {
        switch (option.type) {
          case 'select':
            if (option.multi) {
              if (Array.isArray(value) && value.length > 0) count++;
            } else {
              if (value) count++;
            }
            break;
          case 'checkbox':
            if (value === true) count++;
            break;
          case 'range':
            if (
              value.min !== (option.min || 0) ||
              value.max !== (option.max || 100)
            ) {
              count++;
            }
            break;
          case 'search':
          case 'date':
            if (value && value.trim() !== '') count++;
            break;
          case 'number':
            if (value !== null) count++;
            break;
        }
      }
    });
    return count;
  };

  const actualFilterCount = activeFiltersCount || getActiveFiltersCount();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {actualFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-medium text-primary-foreground">
              {actualFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Advanced Filters</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetFilters}
                className="h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                Reset all
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
            {options.map((option, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={option.field}>{option.label}</Label>
                
                {option.type === 'select' && (
                  <Select
                    value={filterState[option.field] as string}
                    onValueChange={(value) => 
                      handleFilterChange(option.field, value)
                    }
                  >
                    <SelectTrigger id={option.field}>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {option.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {option.type === 'checkbox' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={option.field}
                      checked={filterState[option.field] as boolean}
                      onCheckedChange={(checked) => 
                        handleFilterChange(option.field, !!checked)
                      }
                    />
                    <label
                      htmlFor={option.field}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                )}
                
                {option.type === 'range' && (
                  <div className="space-y-4">
                    <Slider
                      id={option.field}
                      min={option.min || 0}
                      max={option.max || 100}
                      step={option.step || 1}
                      value={[
                        (filterState[option.field] as {min: number, max: number}).min,
                        (filterState[option.field] as {min: number, max: number}).max
                      ]}
                      onValueChange={([min, max]) => 
                        handleFilterChange(option.field, { min, max })
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{(filterState[option.field] as {min: number, max: number}).min}</span>
                      <span>{(filterState[option.field] as {min: number, max: number}).max}</span>
                    </div>
                  </div>
                )}
                
                {option.type === 'search' && (
                  <Input
                    id={option.field}
                    type="text"
                    placeholder={`Search ${option.label.toLowerCase()}`}
                    value={filterState[option.field] as string}
                    onChange={(e) => 
                      handleFilterChange(option.field, e.target.value)
                    }
                  />
                )}
                
                {option.type === 'date' && (
                  <Input
                    id={option.field}
                    type="date"
                    value={filterState[option.field] as string}
                    onChange={(e) => 
                      handleFilterChange(option.field, e.target.value)
                    }
                  />
                )}
                
                {option.type === 'number' && (
                  <Input
                    id={option.field}
                    type="number"
                    placeholder="0"
                    min={option.min}
                    max={option.max}
                    step={option.step || 1}
                    value={filterState[option.field] !== null ? String(filterState[option.field]) : ''}
                    onChange={(e) => 
                      handleFilterChange(
                        option.field, 
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleApplyFilters}
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}