import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VoteStats {
  stats: {
    happy: number;
    angry: number;
    neutral: number;
    suggestion: number;
  };
  total: number;
  percentages: {
    happy: number;
    angry: number;
    neutral: number;
    suggestion: number;
  };
}

interface LiveResultsProps {
  voteStats: VoteStats;
}

const voteConfig = [
  { type: "happy", emoji: "😀", label: "Happy", color: "bg-primary" },
  { type: "angry", emoji: "😡", label: "Angry", color: "bg-red-500" },
  { type: "neutral", emoji: "😐", label: "Neutral", color: "bg-gray-500" },
  { type: "suggestion", emoji: "💡", label: "Suggestions", color: "bg-yellow-500" },
];

export function LiveResults({ voteStats }: LiveResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Live Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {voteConfig.map((config) => (
          <div key={config.type} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{config.emoji}</span>
              <span className="font-medium text-foreground">{config.label}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-32 bg-muted rounded-full h-2">
                <div 
                  className={`${config.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${voteStats.percentages[config.type as keyof typeof voteStats.percentages]}%` }}
                  data-testid={`progress-bar-${config.type}`}
                />
              </div>
              <span 
                className="text-sm font-medium text-foreground min-w-[3rem]"
                data-testid={`vote-count-${config.type}`}
              >
                {voteStats.stats[config.type as keyof typeof voteStats.stats]}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Total votes: <span className="font-medium text-foreground" data-testid="total-votes">{voteStats.total}</span>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Note: Vote results show user clicks. Emotion map shows AI-analyzed sentiment from comment text.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
