import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PolicyCard } from "@/components/policy/policy-card";
import { type Policy } from "@shared/schema";
import { Link } from "wouter";
import { motion } from "framer-motion";
import WordCloud from "react-d3-cloud";
import { scaleOrdinal } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import { Heart, Target, Users, Lightbulb, ArrowRight, TrendingUp, Clock, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const { data: currentPolicy, isLoading: isLoadingPolicy } = useQuery<Policy>({
    queryKey: ["/api/current-policy"],
    queryFn: async () => {
      const response = await fetch("/api/current-policy");
      if (!response.ok) throw new Error("Failed to fetch current policy");
      return response.json();
    }
  });

  const { data: policies, isLoading: isLoadingPolicies } = useQuery<Policy[]>({
    queryKey: ["/api/policies"],
    queryFn: async () => {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return data.policies || data; // Handle both old and new response formats
    }
  });

  // Fetch trending policies for the strip
  const { data: trendingPolicies } = useQuery<Policy[]>({
    queryKey: ["/api/policies", "trending"],
    queryFn: async () => {
      const response = await fetch("/api/policies?sort=trending&limit=5");
      if (!response.ok) throw new Error("Failed to fetch trending policies");
      const data = await response.json();
      return data.policies || [];
    }
  });

  // Fetch latest policies for the strip
  const { data: latestPolicies } = useQuery<Policy[]>({
    queryKey: ["/api/policies", "latest"],
    queryFn: async () => {
      const response = await fetch("/api/policies?sort=latest&limit=5");
      if (!response.ok) throw new Error("Failed to fetch latest policies");
      const data = await response.json();
      return data.policies || [];
    }
  });

  const { data: voteStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/policies", currentPolicy?.id, "stats"],
    enabled: !!currentPolicy?.id,
    queryFn: async () => {
      if (!currentPolicy?.id) throw new Error("No policy ID");
      const response = await fetch(`/api/policies/${currentPolicy.id}/stats`);
      if (!response.ok) throw new Error("Failed to fetch vote stats");
      return response.json();
    }
  });

  const { data: comments } = useQuery({
    queryKey: ["/api/policies", currentPolicy?.id, "comments"],
    enabled: !!currentPolicy?.id,
    queryFn: async () => {
      if (!currentPolicy?.id) throw new Error("No policy ID");
      const response = await fetch(`/api/policies/${currentPolicy.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    }
  });

  // Generate word cloud data from comments and votes
  const generateWordCloudData = () => {
    const words: { text: string; value: number; category?: string }[] = [];
    
    // Add policy-related keywords
    if (currentPolicy && currentPolicy.title) {
      const policyWords = currentPolicy.title.split(" ");
      policyWords.forEach((word: string) => {
        if (word.length > 3) {
          words.push({ text: word, value: Math.random() * 30 + 20, category: "governance" });
        }
      });
    }
    
    // Add emotion-based words based on vote stats
    if (voteStats?.stats) {
      const stats = voteStats.stats;
      if (stats.happy > 0) {
        words.push(
          { text: "Progress", value: stats.happy * 2, category: "positive" },
          { text: "Support", value: stats.happy * 1.5, category: "positive" },
          { text: "Positive", value: stats.happy * 1.8, category: "positive" }
        );
      }
      if (stats.angry > 0) {
        words.push(
          { text: "Concerns", value: stats.angry * 2, category: "concern" },
          { text: "Issues", value: stats.angry * 1.5, category: "concern" },
          { text: "Reform", value: stats.angry * 1.8, category: "concern" }
        );
      }
      if (stats.suggestion > 0) {
        words.push(
          { text: "Innovation", value: stats.suggestion * 2, category: "suggestion" },
          { text: "Solutions", value: stats.suggestion * 1.5, category: "suggestion" },
          { text: "Ideas", value: stats.suggestion * 1.8, category: "suggestion" }
        );
      }
    }
    
    // Add diverse sample words with color categories for prototype demonstration
    const sampleWords = [
      { text: "Citizens", value: 45, category: "governance" },
      { text: "Democracy", value: 40, category: "governance" },
      { text: "Governance", value: 35, category: "governance" },
      { text: "Policy", value: 50, category: "governance" },
      { text: "Feedback", value: 38, category: "engagement" },
      { text: "Transparency", value: 30, category: "governance" },
      { text: "Participation", value: 42, category: "engagement" },
      { text: "Community", value: 36, category: "social" },
      { text: "Voice", value: 28, category: "engagement" },
      { text: "Change", value: 44, category: "progress" },
      { text: "Innovation", value: 33, category: "progress" },
      { text: "Progress", value: 39, category: "progress" },
      { text: "Reform", value: 31, category: "progress" },
      { text: "Accountability", value: 26, category: "governance" },
      { text: "Justice", value: 34, category: "social" },
      { text: "Rights", value: 29, category: "social" },
      { text: "Development", value: 37, category: "progress" },
      { text: "Sustainability", value: 25, category: "services" },
      { text: "Education", value: 41, category: "services" },
      { text: "Healthcare", value: 43, category: "services" },
      { text: "Infrastructure", value: 27, category: "services" },
      { text: "Employment", value: 32, category: "services" },
      { text: "Safety", value: 35, category: "services" },
      { text: "Environment", value: 38, category: "services" },
      { text: "Technology", value: 30, category: "progress" },
      { text: "Future", value: 40, category: "progress" },
      { text: "Society", value: 33, category: "social" },
      { text: "Equality", value: 29, category: "social" },
      { text: "Inclusion", value: 24, category: "social" },
      { text: "Empowerment", value: 31, category: "social" }
    ];
    
    return [...words, ...sampleWords].slice(0, 25);
  };

  const otherPolicies = policies?.filter((p: any) => p.id !== currentPolicy?.id) || [];

  const voteConfig = [
    { type: "happy", emoji: "😀", label: "Happy" },
    { type: "angry", emoji: "😡", label: "Angry" },
    { type: "neutral", emoji: "😐", label: "Neutral" },
    { type: "suggestion", emoji: "💡", label: "Suggestions" },
  ];

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details || "{}");
    } catch {
      return {};
    }
  };

  if (isLoadingPolicy) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-96 bg-muted rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-48 bg-muted rounded-xl"></div>
            <div className="h-48 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPolicy) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <h1 className="text-2xl font-semibold text-foreground mb-4">No Active Policy</h1>
              <p className="text-muted-foreground mb-6">There are currently no active policies to display.</p>
              <Link href="/manage">
                <Button data-testid="button-manage-policies">Manage Policies</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const wordCloudData = generateWordCloudData();
  
  // Debug: Log word cloud data (remove after testing)
  // console.log('Word Cloud Data Length:', wordCloudData.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section with Word Cloud */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-primary">e.Sameekshak</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Empowering citizens to shape policy through transparent feedback and democratic participation
          </p>
        </motion.div>

        {/* Trending/Latest Policy Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trending Policies */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold">Trending Policies</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Most Active
                  </Badge>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {trendingPolicies && trendingPolicies.length > 0 ? (
                    trendingPolicies.map((policy: Policy, index: number) => (
                      <motion.div
                        key={policy.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                        onClick={() => {
                          // TODO: Navigate to policy detail
                          console.log("Navigate to trending policy:", policy.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {policy.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {policy.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No trending policies available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Latest Policies */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold">Latest Policies</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Recently Added
                  </Badge>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {latestPolicies && latestPolicies.length > 0 ? (
                    latestPolicies.map((policy: Policy, index: number) => (
                      <motion.div
                        key={policy.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                        onClick={() => {
                          // TODO: Navigate to policy detail
                          console.log("Navigate to latest policy:", policy.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {policy.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {policy.description}
                            </p>
                            <div className="text-xs text-muted-foreground mt-2">
                              {new Date(policy.createdAt || '').toLocaleDateString()}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-2" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent policies available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Word Cloud Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-20"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-center mb-8">Public Sentiment Cloud</h2>
              <div className="h-96 flex items-center justify-center bg-white rounded-lg overflow-hidden">
                {wordCloudData.length > 0 ? (
                  <div className="w-full h-full p-8 flex flex-wrap items-center justify-center gap-2">
                    {wordCloudData.map((word, index) => {
                      const colorMap: { [key: string]: string } = {
                        governance: "text-blue-600",
                        engagement: "text-green-600",
                        social: "text-orange-500",
                        progress: "text-purple-600",
                        services: "text-red-500",
                        positive: "text-emerald-600",
                        concern: "text-red-700",
                        suggestion: "text-violet-600"
                      };
                      const baseSize = Math.min(Math.max(Math.log2(word.value) * 0.8 + 0.9, 0.75), 2.5);
                      const rotation = word.value % 3 === 0 ? 'rotate-12' : word.value % 3 === 1 ? '-rotate-12' : 'rotate-0';
                      
                      return (
                        <motion.span
                          key={`${word.text}-${index}`}
                          className={`
                            inline-block font-semibold cursor-pointer transition-all duration-200 hover:scale-110
                            ${colorMap[word.category || 'default'] || 'text-gray-600'}
                            ${rotation}
                          `}
                          style={{
                            fontSize: `${baseSize}rem`,
                            lineHeight: 1.2
                          }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => console.log(`clicked: ${word.text}`)}
                        >
                          {word.text}
                        </motion.span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center">
                    <p>No data available for word cloud</p>
                    <p className="text-sm mt-2">Data points: {wordCloudData.length}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Policy Section */}
        {currentPolicy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-20"
          >
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900" data-testid="current-policy-title">
                    {currentPolicy.title}
                  </h2>
                  <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm">
                    Active Policy
                  </Badge>
                </div>
                <p className="text-lg text-gray-600 mb-8" data-testid="current-policy-description">
                  {currentPolicy.description}
                </p>

                {/* Voting Summary */}
                {!isLoadingStats && voteStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {voteConfig.map((config, index) => (
                      <motion.div
                        key={config.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                        className="text-center p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <div className="text-4xl mb-2">{config.emoji}</div>
                        <div 
                          className="text-2xl font-bold text-gray-900 mb-1"
                          data-testid={`dashboard-vote-count-${config.type}`}
                        >
                          {voteStats?.stats?.[config.type as keyof typeof voteStats.stats] || 0}
                        </div>
                        <div className="text-sm text-gray-500">{config.label}</div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                >
                  <Link href="/voting">
                    <Button 
                      size="lg"
                      className="w-full md:w-auto px-8 py-4 text-lg bg-primary hover:bg-primary/90 transition-all duration-300 group"
                      data-testid="button-cast-vote"
                    >
                      Cast Your Vote
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Team Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mb-20"
        >
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Team code@karma</h2>
                <p className="text-xl opacity-90">Building bridges between citizens and governance</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl"
                >
                  <Heart className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Empathy-Driven</h3>
                  <p className="text-sm opacity-80">Understanding every citizen's voice and perspective</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl"
                >
                  <Target className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Purpose-Built</h3>
                  <p className="text-sm opacity-80">Focused on meaningful democratic participation</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl"
                >
                  <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Innovation</h3>
                  <p className="text-sm opacity-80">Pioneering new ways to engage in governance</p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Creating a transparent, inclusive platform where every citizen's voice matters in shaping the policies that govern our society.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Users className="h-6 w-6 mr-2 text-primary" />
                    Democratic Participation
                  </h3>
                  <p className="text-gray-600">
                    Enabling real-time feedback on government policies through an intuitive, emoji-based voting system that captures nuanced public sentiment.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Target className="h-6 w-6 mr-2 text-primary" />
                    Data-Driven Insights
                  </h3>
                  <p className="text-gray-600">
                    Leveraging AI-powered analytics to provide policymakers with actionable insights derived from citizen feedback and engagement patterns.
                  </p>
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/voting">
                    <Button variant="outline" size="lg" className="px-6">
                      Start Voting
                    </Button>
                  </Link>
                  <Link href="/emotion-map">
                    <Button variant="outline" size="lg" className="px-6">
                      Explore Map
                    </Button>
                  </Link>
                  <Link href="/summary">
                    <Button variant="outline" size="lg" className="px-6">
                      View Insights
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
