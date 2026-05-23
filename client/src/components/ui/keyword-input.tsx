import { useState, useEffect } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
  maxKeywords?: number;
  className?: string;
}

export function KeywordInput({
  keywords = [],
  onChange,
  placeholder = "Add keywords or keyphrases...",
  maxKeywords = 20,
  className = "",
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [localKeywords, setLocalKeywords] = useState<string[]>(keywords);

  // Update local keywords when prop changes
  useEffect(() => {
    setLocalKeywords(keywords);
  }, [keywords]);

  const addKeyword = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    
    // Don't add duplicates
    if (localKeywords.includes(trimmedInput)) {
      setInputValue("");
      return;
    }
    
    // Check max keywords limit
    if (localKeywords.length >= maxKeywords) return;
    
    const newKeywords = [...localKeywords, trimmedInput];
    setLocalKeywords(newKeywords);
    onChange(newKeywords);
    setInputValue("");
  };

  const removeKeyword = (indexToRemove: number) => {
    const newKeywords = localKeywords.filter((_, index) => index !== indexToRemove);
    setLocalKeywords(newKeywords);
    onChange(newKeywords);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    } else if (e.key === ",") {
      // Allow comma as keyword separator
      if (inputValue.trim()) {
        e.preventDefault();
        addKeyword();
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            <Tag size={16} />
          </div>
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-8"
            maxLength={50}
          />
        </div>
        <Button 
          type="button"
          size="sm"
          onClick={addKeyword}
          disabled={!inputValue.trim() || localKeywords.length >= maxKeywords}
          variant="outline"
        >
          <Plus size={16} className="mr-1" />
          Add
        </Button>
      </div>
      
      {localKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {localKeywords.map((keyword, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(index)}
                className="bg-primary/10 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {localKeywords.length >= maxKeywords && (
        <p className="text-xs text-muted-foreground mt-1">
          Maximum {maxKeywords} keywords allowed
        </p>
      )}
    </div>
  );
}