import { ReactNode } from "react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string, props: any) => [ReactNode, ReactNode] | ReactNode;
  labelFormatter?: (label: string) => ReactNode;
}

export const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  formatter, 
  labelFormatter 
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-background/90 border border-border p-2 rounded-md shadow-md text-sm">
        <p className="font-medium mb-1">
          {labelFormatter ? labelFormatter(label!) : label}
        </p>
        <div>
          {payload.map((entry, index) => {
            const displayValue = formatter 
              ? formatter(entry.value, entry.name, entry) 
              : entry.value;
              
            return (
              <div 
                key={`item-${index}`} 
                className="flex items-center gap-2"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }} 
                />
                <span>{entry.name}: </span>
                <span className="font-medium">{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};