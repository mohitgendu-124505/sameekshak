import { Button } from "@/components/ui/button";

interface VoteOptionProps {
  emoji: string;
  label: string;
  description: string;
  voteType: string;
  isSelected?: boolean;
  disabled?: boolean;
  onClick: (voteType: string) => void;
}

export function VoteOption({ emoji, label, description, voteType, isSelected = false, disabled = false, onClick }: VoteOptionProps) {
  return (
    <Button
      variant="ghost"
      disabled={disabled}
      className={`emoji-vote-btn flex flex-col items-center p-6 h-auto transition-all ${
        disabled 
          ? "bg-muted/50 border-2 border-transparent opacity-50 cursor-not-allowed" 
          : isSelected 
            ? "border-primary bg-primary/10 border-2 bg-muted hover:bg-accent" 
            : "border-transparent hover:border-primary border-2 bg-muted hover:bg-accent"
      }`}
      onClick={() => !disabled && onClick(voteType)}
      data-testid={`vote-option-${voteType}`}
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-sm text-muted-foreground mt-1 text-center">{description}</div>
    </Button>
  );
}
