import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoteOption } from "@/components/voting/vote-option";
import { LiveResults } from "@/components/voting/live-results";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/contexts/SocketContext";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";

const voteOptions = [
  { voteType: "happy", emoji: "😀", label: "Happy", description: "This makes me optimistic" },
  { voteType: "angry", emoji: "😡", label: "Angry", description: "This concerns me" },
  { voteType: "neutral", emoji: "😐", label: "Neutral", description: "I'm undecided" },
  { voteType: "suggestion", emoji: "💡", label: "Suggestion", description: "I have ideas" },
];

export default function Voting() {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  
  // Vote throttling: Track voted policies per session
  const [votedPolicies, setVotedPolicies] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem('emotionweather_voted_policies');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isConnected, joinPolicy, leavePolicy } = useSocket();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const policyParamId = searchParams.get("policy");

  // Fetch all policies for policy selection
  const { data: allPolicies, isLoading: isLoadingPolicies } = useQuery({
    queryKey: ["/api/policies"],
    queryFn: async () => {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return data.policies || data;
    },
  });

  // Fetch current policy as fallback
  const { data: currentPolicy, isLoading: isLoadingCurrentPolicy } = useQuery<{
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }>({
    queryKey: ["/api/current-policy"],
    queryFn: async () => {
      const response = await fetch("/api/current-policy");
      if (!response.ok) throw new Error("Failed to fetch current policy");
      return response.json();
    },
  });

  // Determine which policy to use
  const targetPolicyId = selectedPolicyId || policyParamId || currentPolicy?.id;
  const targetPolicy = allPolicies?.find((p: any) => p.id === targetPolicyId) || 
                      (targetPolicyId === currentPolicy?.id ? currentPolicy : null);
  
  // Check if user has already voted on current policy
  const hasVotedOnCurrentPolicy = targetPolicyId ? votedPolicies.has(targetPolicyId) : false;

  // Update selectedPolicyId when URL param changes
  useEffect(() => {
    if (policyParamId) {
      setSelectedPolicyId(policyParamId);
    } else if (currentPolicy?.id && !selectedPolicyId) {
      setSelectedPolicyId(currentPolicy.id);
    }
  }, [policyParamId, currentPolicy, selectedPolicyId]);

  // Track previous policy ID for proper socket cleanup
  const [previousPolicyId, setPreviousPolicyId] = useState<string | null>(null);

  // Join policy-specific socket room with proper cleanup
  useEffect(() => {
    // Leave previous room if switching policies
    if (previousPolicyId && previousPolicyId !== targetPolicyId) {
      leavePolicy(previousPolicyId);
      
      // Clear cache data only for the policy being exited, not current policy
      queryClient.removeQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === '/api/policies' && 
                 (key.includes('stats') || key.includes('comments')) &&
                 key.includes(previousPolicyId);
        }
      });
    }

    if (targetPolicyId) {
      // Join new policy room
      joinPolicy(targetPolicyId);
      
      // Update previous policy ID
      setPreviousPolicyId(targetPolicyId);
    }

    // Cleanup when component unmounts or policy cleared
    return () => {
      if (targetPolicyId) {
        leavePolicy(targetPolicyId);
      }
    };
  }, [targetPolicyId, joinPolicy, leavePolicy, queryClient, previousPolicyId]);

  interface VoteStatsResponse {
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

  const { data: voteStats, isLoading: isLoadingStats } = useQuery<VoteStatsResponse>({
    queryKey: ["/api/policies", targetPolicyId, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${targetPolicyId}/stats`);
      if (!response.ok) throw new Error("Failed to fetch vote stats");
      return response.json();
    },
    enabled: !!targetPolicyId,
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery<Comment[]>({
    queryKey: ["/api/policies", targetPolicyId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${targetPolicyId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!targetPolicyId,
  });

  // Join policy room for real-time updates (already handled above)
  // This effect is duplicated and should be removed

  // Listen for real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (event: CustomEvent) => {
      console.log('Real-time vote update:', event.detail);
      // Invalidate and refetch vote stats
      queryClient.invalidateQueries({ 
        queryKey: ["/api/policies", targetPolicyId, "stats"] 
      });
    };

    const handleCommentUpdate = (event: CustomEvent) => {
      console.log('Real-time comment update:', event.detail);
      // Invalidate and refetch comments
      queryClient.invalidateQueries({ 
        queryKey: ["/api/policies", targetPolicyId, "comments"] 
      });
    };

    window.addEventListener('vote-update', handleVoteUpdate as EventListener);
    window.addEventListener('comment-update', handleCommentUpdate as EventListener);

    return () => {
      window.removeEventListener('vote-update', handleVoteUpdate as EventListener);
      window.removeEventListener('comment-update', handleCommentUpdate as EventListener);
    };
  }, [targetPolicyId, queryClient]);

  const submitVoteMutation = useMutation({
    mutationFn: async (voteData: { policyId: string; mood: string }) => {
      // Check if user has already voted on this policy
      if (hasVotedOnCurrentPolicy) {
        throw new Error("You have already voted on this policy in this session");
      }
      
      const response = await apiRequest("POST", "/api/votes", voteData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Mark this policy as voted on
      const newVotedPolicies = new Set(votedPolicies);
      newVotedPolicies.add(variables.policyId);
      setVotedPolicies(newVotedPolicies);
      
      // Persist to sessionStorage
      sessionStorage.setItem('emotionweather_voted_policies', JSON.stringify(Array.from(newVotedPolicies)));
      
      queryClient.invalidateQueries({ queryKey: ["/api/policies", targetPolicyId, "stats"] });
      
      // Note: State clearing is now handled in handleSubmitVote after both vote and comment are submitted
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitCommentMutation = useMutation({
    mutationFn: async (commentData: { policyId: string; content: string; author?: string }) => {
      const response = await apiRequest("POST", "/api/comments", commentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies", targetPolicyId, "comments"] });
      toast({
        title: "Comment submitted!",
        description: "Thank you for sharing your thoughts.",
      });
      setNewComment("");
      setAuthorName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVoteSelection = (voteType: string) => {
    // Prevent vote selection if user has already voted on this policy
    if (hasVotedOnCurrentPolicy) {
      toast({
        title: "Already Voted",
        description: "You have already voted on this policy in this session.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedVote(voteType);
    setShowCommentBox(true);
  };

  const handleSubmitVote = async () => {
    // Hard block submission if no policy is selected
    if (!selectedVote || !targetPolicyId || !targetPolicy) {
      toast({
        title: "Error",
        description: "Please select a policy before voting.",
        variant: "destructive",
      });
      return;
    }

    // Capture comment value before any mutations that might clear state
    const userComment = comment.trim();

    try {
      // Submit the vote first
      await submitVoteMutation.mutateAsync({
        policyId: targetPolicyId,
        mood: selectedVote,
      });

      // If user provided a comment, submit it separately
      if (userComment) {
        await submitCommentMutation.mutateAsync({
          policyId: targetPolicyId,
          content: userComment,
          author: "Anonymous", // Can be extended for authenticated users
        });
      }

      // Show success message and clear state only after both operations succeed
      toast({
        title: "Vote submitted!",
        description: "Thank you for your feedback. You can view results but cannot vote again on this policy this session.",
      });
      
      setSelectedVote(null);
      setComment("");
      setShowCommentBox(false);
      
    } catch (error) {
      // Error handling is managed by the individual mutations
      console.error("Error during vote/comment submission:", error);
    }
  };

  const handleCancelVote = () => {
    setSelectedVote(null);
    setComment("");
    setShowCommentBox(false);
  };

  const handleSubmitComment = () => {
    // Hard block submission if no policy is selected  
    if (!newComment.trim() || !targetPolicyId || !targetPolicy) {
      toast({
        title: "Error", 
        description: "Please select a policy before commenting.",
        variant: "destructive",
      });
      return;
    }

    submitCommentMutation.mutate({
      policyId: targetPolicyId,
      content: newComment.trim(),
      author: authorName.trim() || "Anonymous",
    });
  };

  if (isLoadingCurrentPolicy || isLoadingPolicies) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="text-center">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Show no policies message when no policies are available
  if (!allPolicies?.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-4">No Policies Available</h1>
            <p className="text-muted-foreground">There are currently no policies to vote on. Please check back later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show policy selection prompt when no specific policy is selected
  if (!targetPolicy) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-4">Select a Policy</h1>
            <p className="text-muted-foreground mb-6">Please select a policy from the list above to vote and comment.</p>
            
            <div className="mt-4">
              <Select
                value=""
                onValueChange={(value) => {
                  setSelectedPolicyId(value);
                  window.history.pushState({}, '', `/voting?policy=${value}`);
                }}
              >
                <SelectTrigger className="w-full max-w-md mx-auto">
                  <SelectValue placeholder="Choose a policy to vote on" />
                </SelectTrigger>
                <SelectContent>
                  {allPolicies.map((policy: any) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{policy.title}</span>
                        <span className="text-xs text-muted-foreground">
                          ({policy.status})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Policy Selector */}
      {allPolicies && allPolicies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Choose Policy to Vote On</h2>
                {policyParamId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Clear policy selection but ensure proper cleanup
                      if (targetPolicyId) {
                        leavePolicy(targetPolicyId);
                      }
                      setSelectedPolicyId(null);
                      setSelectedVote(null);
                      setComment("");
                      setNewComment("");
                      setShowCommentBox(false);
                      // Invalidate all policy-specific queries
                      queryClient.removeQueries({ 
                        predicate: (query) => {
                          const key = query.queryKey;
                          return key[0] === '/api/policies' && 
                                 (key.includes('stats') || key.includes('comments'));
                        }
                      });
                      window.history.pushState({}, '', '/voting');
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                )}
              </div>
              
              <div className="mt-4">
                <Select
                  value={targetPolicyId || ""}
                  onValueChange={(value) => {
                    setSelectedPolicyId(value);
                    window.history.pushState({}, '', `/voting?policy=${value}`);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a policy to vote on" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPolicies.map((policy: any) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{policy.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ({policy.status})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="voting-page-title">Cast Your Vote</h1>
        <p className="text-muted-foreground">Share your emotional response to the current policy</p>
      </div>

      {/* Policy Summary Card */}
      {targetPolicy && (
        <Card className="shadow-sm mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3" data-testid="voting-policy-title">
              {targetPolicy.title}
            </h2>
            <p className="text-muted-foreground" data-testid="voting-policy-description">
              {targetPolicy.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Voting Interface */}
      {targetPolicyId && (
        <Card className="shadow-sm mb-8">
          <CardContent className="p-8">
            <h3 className="text-lg font-semibold text-foreground mb-6 text-center">
              How does this policy make you feel?
            </h3>
          
          {/* Vote throttling indicator */}
          {hasVotedOnCurrentPolicy && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-600 text-lg mr-2">✓</div>
                <div>
                  <p className="text-green-800 font-medium">Vote Recorded</p>
                  <p className="text-green-700 text-sm">You have already voted on this policy in this session. You can view results below.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {voteOptions.map((option) => (
              <VoteOption
                key={option.voteType}
                {...option}
                isSelected={selectedVote === option.voteType}
                disabled={hasVotedOnCurrentPolicy}
                onClick={handleVoteSelection}
              />
            ))}
          </div>

          {/* Comment Section */}
          {showCommentBox && (
            <div data-testid="comment-section">
              <Label className="block text-sm font-medium text-foreground mb-2">
                Share your thoughts (optional)
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={4}
                placeholder="Tell us more about your perspective..."
                data-testid="comment-textarea"
              />
              <div className="flex justify-end space-x-3 mt-4">
                <Button 
                  variant="ghost" 
                  onClick={handleCancelVote}
                  data-testid="button-cancel-vote"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitVote}
                  disabled={submitVoteMutation.isPending || hasVotedOnCurrentPolicy}
                  data-testid="button-submit-vote"
                >
                  {submitVoteMutation.isPending ? "Submitting..." : hasVotedOnCurrentPolicy ? "Already Voted" : "Submit Vote"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Live Results and Pie Chart */}
      {targetPolicyId && !isLoadingStats && voteStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LiveResults voteStats={voteStats} />
          
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80" data-testid="vote-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "😀 Happy", value: voteStats.stats.happy, color: "#3b82f6" },
                        { name: "😡 Angry", value: voteStats.stats.angry, color: "#ef4444" },
                        { name: "😐 Neutral", value: voteStats.stats.neutral, color: "#6b7280" },
                        { name: "💡 Suggestions", value: voteStats.stats.suggestion, color: "#eab308" },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : null
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: "😀 Happy", value: voteStats.stats.happy, color: "#3b82f6" },
                        { name: "😡 Angry", value: voteStats.stats.angry, color: "#ef4444" },
                        { name: "😐 Neutral", value: voteStats.stats.neutral, color: "#6b7280" },
                        { name: "💡 Suggestions", value: voteStats.stats.suggestion, color: "#eab308" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any) => [value, name]}
                      labelStyle={{ color: '#333' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {voteStats.total === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No votes yet. Be the first to cast your vote!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comments Section */}
      {targetPolicyId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Add Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Share Your Thoughts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Your Name (optional)
              </Label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                placeholder="Anonymous"
                data-testid="input-author-name"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Your Comment
              </Label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none"
                rows={4}
                placeholder="Share your detailed thoughts on this policy..."
                data-testid="textarea-new-comment"
              />
            </div>
            <Button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitCommentMutation.isPending}
              className="w-full"
              data-testid="button-submit-comment"
            >
              {submitCommentMutation.isPending ? "Submitting..." : "Submit Comment"}
            </Button>
          </CardContent>
        </Card>

        {/* Comments Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Community Comments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingComments ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : comments && (comments as any).length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto" data-testid="comments-list">
                {(comments as any).map((comment: any, index: number) => (
                  <div key={comment.id} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-foreground text-sm">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm" data-testid={`comment-content-${index}`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-sm">No comments yet. Be the first to share your thoughts!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
