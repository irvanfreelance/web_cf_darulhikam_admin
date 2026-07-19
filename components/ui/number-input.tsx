import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { formatNumber, parseNumber } from "@/lib/format"

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, prefix, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(formatNumber(value));

    // Update display value when external value changes
    React.useEffect(() => {
      const formatted = formatNumber(value);
      if (parseNumber(displayValue) !== value) {
        setDisplayValue(formatted);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = parseNumber(rawValue);
      
      // Update display with formatting
      setDisplayValue(formatNumber(numericValue));
      
      // Emit the raw number
      onChange(numericValue);
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-normal pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          {...props}
          ref={ref}
          value={displayValue === '0' && !props.placeholder ? '' : displayValue}
          onChange={handleChange}
          className={cn(
            "text-right font-normal transition-all",
            prefix && "pl-12",
            className
          )}
        />
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";
