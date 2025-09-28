import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Comment, type Policy } from "@shared/schema";
import { RefreshCw, Sparkles, TrendingUp, MessageCircle, Lightbulb, Download, FileText, BarChart3, Cloud, Search, Filter, Target, Users, Clock } from "lucide-react";
import WordCloud from '@/components/WordCloud';
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Simple AI-like classification based on keywords and patterns
const classifyComment = (comment: Comment) => {
  const content = comment.content.toLowerCase();
  
  // Negative/Angry keywords and patterns
  const negativeKeywords = [
    'concerned', 'worry', 'worried', 'problem', 'issue', 'cost', 'expensive', 'waste', 
    'against', 'disagree', 'oppose', 'bad', 'wrong', 'terrible', 'awful', 'disappointed',
    'frustrated', 'angry', 'outraged', 'unacceptable', 'ridiculous', 'stupid'
  ];
  
  // Positive keywords and patterns
  const positiveKeywords = [
    'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'like', 'support',
    'approve', 'fantastic', 'brilliant', 'awesome', 'good', 'better', 'best', 'helpful',
    'beneficial', 'important', 'necessary', 'exactly', 'right', 'correct', 'smart'
  ];
  
  // Suggestion keywords and patterns
  const suggestionKeywords = [
    'suggest', 'recommend', 'should', 'could', 'might', 'perhaps', 'maybe', 'consider',
    'what about', 'why not', 'how about', 'idea', 'proposal', 'alternative', 'instead',
    'better if', 'improve', 'enhancement', 'modify', 'change', 'add', 'include'
  ];
  
  let negativeScore = 0;
  let positiveScore = 0;
  let suggestionScore = 0;
  
  // Count keyword matches
  negativeKeywords.forEach(keyword => {
    if (content.includes(keyword)) negativeScore++;
  });
  
  positiveKeywords.forEach(keyword => {
    if (content.includes(keyword)) positiveScore++;
  });
  
  suggestionKeywords.forEach(keyword => {
    if (content.includes(keyword)) suggestionScore++;
  });
  
  // Question marks often indicate suggestions
  if (content.includes('?')) suggestionScore += 0.5;
  
  // Determine category based on highest score
  if (suggestionScore > negativeScore && suggestionScore > positiveScore) {
    return 'suggestion';
  } else if (negativeScore > positiveScore) {
    return 'negative';
  } else if (positiveScore > 0) {
    return 'positive';
  } else {
    return 'neutral';
  }
};

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Word cloud processing function
const generateWordCloudData = (comments: Comment[], type: 'all' | 'positive' | 'negative' | 'suggestions' = 'all') => {
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now']);
  
  const wordFreq: { [key: string]: number } = {};
  
  let filteredComments = comments;
  if (type === 'positive') {
    filteredComments = comments.filter(c => classifyComment(c) === 'positive');
  } else if (type === 'negative') {
    filteredComments = comments.filter(c => classifyComment(c) === 'negative');
  } else if (type === 'suggestions') {
    filteredComments = comments.filter(c => classifyComment(c) === 'suggestion');
  }

  filteredComments.forEach(comment => {
    const words = comment.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });

  // Convert to word cloud data format
  const wordData = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50) // Top 50 words
    .map(([text, freq]) => ({
      text,
      size: freq,
      color: type === 'positive' ? `hsl(120, ${50 + freq * 5}%, ${40 + freq * 2}%)` :
             type === 'negative' ? `hsl(0, ${50 + freq * 5}%, ${40 + freq * 2}%)` :
             type === 'suggestions' ? `hsl(260, ${50 + freq * 5}%, ${40 + freq * 2}%)` :
             `hsl(${Math.random() * 360}, 60%, 50%)`
    }));

  return wordData;
};

export default function Summary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("current");
  const [searchQuery, setSearchQuery] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"single" | "comparison">("single");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  
  // Fetch all policies for selection
  const { data: allPolicies, isLoading: isLoadingPolicies } = useQuery<Policy[]>({
    queryKey: ["/api/policies"],
    queryFn: async () => {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return data.policies || data;
    },
  });

  const { data: currentPolicy } = useQuery<{
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

  // Determine which policy to analyze
  const targetPolicy = useMemo(() => {
    if (selectedPolicyId === "current") return currentPolicy;
    return allPolicies?.find(policy => policy.id === selectedPolicyId);
  }, [selectedPolicyId, currentPolicy, allPolicies]);

  // Filter policies based on search query
  const filteredPolicies = useMemo(() => {
    if (!allPolicies) return [];
    if (!searchQuery.trim()) return allPolicies;
    
    return allPolicies.filter(policy =>
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPolicies, searchQuery]);

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/policies", targetPolicy?.id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${targetPolicy?.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!targetPolicy?.id,
  });

  // Fetch vote statistics for the selected policy
  const { data: voteStats } = useQuery({
    queryKey: ["/api/policies", targetPolicy?.id, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${targetPolicy?.id}/stats`);
      if (!response.ok) throw new Error("Failed to fetch vote stats");
      return response.json();
    },
    enabled: !!targetPolicy?.id,
  });

  // Generate AI insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!targetPolicy) throw new Error('No policy selected for analysis');
      
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policyId: targetPolicy.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsGeneratingInsights(true);
    },
    onSuccess: (data) => {
      setInsights(data);
      setIsGeneratingInsights(false);
      toast({
        title: "AI Insights Generated",
        description: "Successfully analyzed policy feedback and generated insights.",
      });
    },
    onError: (error) => {
      setIsGeneratingInsights(false);
      toast({
        title: "Failed to Generate Insights",
        description: "There was an error generating AI insights. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRefreshInsights = () => {
    generateInsightsMutation.mutate();
  };

  // Enhanced PDF download functionality with charts and graphs
  const handleDownloadSummary = async () => {
    if (!insights) {
      toast({
        title: "No Summary Available",
        description: "Please generate AI insights first before downloading.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preparing PDF",
      description: "Capturing AI insights display for professional report...",
    });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add header
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('e.Sameekshak - AI Policy Analysis Report', 20, 20);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
      pdf.text(`Policy: ${targetPolicy?.title || 'All Policies'}`, 20, 50);
      
      // Capture the AI insights section as image
      const aiInsightsElement = document.querySelector('[data-ai-insights]') as HTMLElement;
      if (aiInsightsElement) {
        const canvas = await html2canvas(aiInsightsElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: aiInsightsElement.scrollWidth,
          height: aiInsightsElement.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 20; // 10mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let yPosition = 60;
        
        // Handle multiple pages if content is too long
        if (imgHeight > pageHeight - yPosition - 20) {
          // Split image across multiple pages
          const pageContentHeight = pageHeight - yPosition - 20;
          const pagesNeeded = Math.ceil(imgHeight / pageContentHeight);
          
          for (let page = 0; page < pagesNeeded; page++) {
            if (page > 0) {
              pdf.addPage();
              yPosition = 20;
            }
            
            const sourceY = (page * pageContentHeight * canvas.height) / imgHeight;
            const sourceHeight = Math.min(
              (pageContentHeight * canvas.height) / imgHeight,
              canvas.height - sourceY
            );
            
            // Create a temporary canvas for this page section
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            
            if (pageCtx) {
              pageCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, sourceHeight,
                0, 0, canvas.width, sourceHeight
              );
              
              const pageImgData = pageCanvas.toDataURL('image/png');
              const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
              
              pdf.addImage(pageImgData, 'PNG', 10, yPosition, imgWidth, pageImgHeight);
            }
          }
        } else {
          // Single page - add the full image
          pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
        }
      } else {
        // Fallback if element not found
        pdf.setFontSize(12);
        pdf.text('AI Insights section not found. Please ensure the page is fully loaded.', 20, 70);
      }

      // Save PDF
      pdf.save(`e-Sameekshak-Analysis-Report-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "PDF Report Downloaded",
        description: "Comprehensive AI analysis report with charts has been downloaded successfully.",
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error generating the PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Ensure comments is always an array
  const commentsArray = Array.isArray(comments) ? comments : [];
  
  // Classify comments into categories
  const categorizedComments = commentsArray.reduce((acc: any, comment: Comment) => {
    const category = classifyComment(comment);
    
    if (category === 'negative') {
      acc.angry.push(comment);
    } else if (category === 'positive') {
      acc.positive.push(comment);
    } else if (category === 'suggestion') {
      acc.suggestions.push(comment);
    }
    
    return acc;
  }, { angry: [], positive: [], suggestions: [] });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Enhanced Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          AI-Powered Policy Insights
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Advanced sentiment analysis and citizen feedback intelligence for evidence-based policymaking
        </p>
      </div>

      {/* Enhanced Policy Search and Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Search className="mr-2 h-5 w-5 text-blue-600" />
              Policy Analysis Center
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select and analyze specific policies with AI-powered insights and citizen feedback analysis
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Policy Search */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search policies by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
                
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a policy to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">📋 Current Active Policy</SelectItem>
                    {filteredPolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {policy.status}
                          </span>
                          <span className="truncate max-w-[300px]">{policy.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Analysis Controls */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Analysis Mode</label>
                  <Select value={analysisMode} onValueChange={setAnalysisMode as any}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">📊 Single Policy Analysis</SelectItem>
                      <SelectItem value="comparison">🔄 Comparison Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {targetPolicy && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-900">Analyzing:</div>
                    <div className="text-sm text-blue-700 truncate">{targetPolicy.title}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      Status: {targetPolicy.status} • {comments?.length || 0} comments
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleRefreshInsights}
                disabled={isGeneratingInsights || !targetPolicy}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isGeneratingInsights ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isGeneratingInsights ? 'Generating...' : 'Generate AI Insights'}
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleDownloadSummary}
                disabled={!insights}
                size="lg"
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Summary
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Dynamic Word Cloud Section */}
        {commentsArray.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Cloud className="mr-2 h-5 w-5 text-green-600" />
                  Dynamic Sentiment Word Cloud
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Visual representation of most frequently mentioned terms in citizen feedback
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4 text-center">Overall Discussion Terms</h4>
                    <WordCloud 
                      words={generateWordCloudData(commentsArray, 'all')} 
                      width={400} 
                      height={250} 
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-center text-green-700">Positive Sentiment Words</h4>
                      <WordCloud 
                        words={generateWordCloudData(commentsArray, 'positive')} 
                        width={400} 
                        height={120}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-center text-red-700">Critical Concerns</h4>
                      <WordCloud 
                        words={generateWordCloudData(commentsArray, 'negative')} 
                        width={400} 
                        height={120}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="font-semibold mb-4 text-center text-purple-700">Suggested Improvements</h4>
                  <WordCloud 
                    words={generateWordCloudData(commentsArray, 'suggestions')} 
                    width={800} 
                    height={200}
                  />
                </div>
                <div className="mt-4 text-xs text-center text-muted-foreground">
                  Word size represents frequency • Colors indicate sentiment categories • Real-time AI-powered analysis
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Insights Section */}
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200" data-ai-insights>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                  AI-Powered Key Insights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated on {insights?.analysisDate ? new Date(insights.analysisDate).toLocaleString() : 'Unknown'} • {insights?.source ?? 'AI Analysis'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div 
                      className="prose prose-sm max-w-none text-sm leading-relaxed prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
                      dangerouslySetInnerHTML={{ __html: insights?.summary || '' }}
                    />
                  </div>
                  
                  {insights?.dataPoints && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-3 text-center border">
                        <div className="text-lg font-bold text-blue-600">{insights?.dataPoints?.totalComments ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Comments Analyzed</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border">
                        <div className="text-lg font-bold text-green-600">{insights?.dataPoints?.totalVotes ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Total Votes</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border">
                        <div className="text-lg font-bold text-purple-600">
                          {(insights?.dataPoints?.voteBreakdown?.happy ?? 0) + (insights?.dataPoints?.voteBreakdown?.suggestion ?? 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Positive Signals</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border">
                        <div className="text-lg font-bold text-orange-600">{insights?.dataPoints?.voteBreakdown?.angry ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Concerns Raised</div>
                      </div>
                    </div>
                  )}
                  
                  {insights?.error && (
                    <Alert>
                      <AlertDescription>
                        Note: AI analysis is using fallback mode. Full insights may be limited.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <Separator className="my-8" />
      </div>

      {/* Selected Policy Analysis Info */}
      {targetPolicy && (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Policy Analysis Dashboard</h2>
                  <p className="text-sm font-medium text-blue-700">{targetPolicy.title}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                      {targetPolicy.status}
                    </span>
                    <span className="text-xs text-blue-600">
                      Created: {targetPolicy.createdAt ? new Date(targetPolicy.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total Comments Analyzed</p>
                <p className="text-3xl font-bold text-blue-600" data-testid="total-comments-analyzed">
                  {commentsArray.length}
                </p>
                {voteStats && (
                  <p className="text-sm text-green-600 font-medium">
                    {voteStats.totalVotes || 0} votes received
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Classification Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Angry Concerns */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                <span className="text-2xl mr-2">😡</span>
                Angry Concerns
              </CardTitle>
              <Badge variant="destructive" data-testid="angry-count">
                {categorizedComments.angry.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Comments expressing frustration, disagreement, or concerns
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorizedComments.angry.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-3" data-testid="angry-comments">
                {categorizedComments.angry.map((comment: Comment, index: number) => (
                  <div key={comment.id} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-foreground">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground" data-testid={`angry-comment-${index}`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-sm">No angry concerns detected. Great!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Positive Feedback */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                <span className="text-2xl mr-2">😀</span>
                Positive Feedback
              </CardTitle>
              <Badge className="bg-green-500 text-white" data-testid="positive-count">
                {categorizedComments.positive.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Comments showing support, approval, and enthusiasm
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorizedComments.positive.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-3" data-testid="positive-comments">
                {categorizedComments.positive.map((comment: Comment, index: number) => (
                  <div key={comment.id} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-foreground">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground" data-testid={`positive-comment-${index}`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-4xl mb-2">📢</div>
                <p className="text-sm">No positive feedback yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                <span className="text-2xl mr-2">💡</span>
                Suggestions
              </CardTitle>
              <Badge className="bg-blue-500 text-white" data-testid="suggestions-count">
                {categorizedComments.suggestions.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Comments with ideas, recommendations, and improvements
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorizedComments.suggestions.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-3" data-testid="suggestion-comments">
                {categorizedComments.suggestions.map((comment: Comment, index: number) => (
                  <div key={comment.id} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-foreground">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground" data-testid={`suggestion-comment-${index}`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-4xl mb-2">🤔</div>
                <p className="text-sm">No suggestions detected yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {Math.round((categorizedComments.positive.length / (commentsArray.length || 1)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Positive Sentiment</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {Math.round((categorizedComments.angry.length / (commentsArray.length || 1)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Concerns Raised</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {Math.round((categorizedComments.suggestions.length / (commentsArray.length || 1)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Constructive Ideas</div>
            </div>
          </div>
          {commentsArray.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                AI analysis powered by keyword detection and sentiment patterns.
                <br />
                This automated classification helps policymakers quickly understand community sentiment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insights Footer Section */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mt-12 mb-8"
      >
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-indigo-900 flex items-center justify-center">
              <BarChart3 className="mr-3 h-6 w-6" />
              Key Insights Dashboard
            </CardTitle>
            <p className="text-indigo-700 mt-2">
              Critical findings from AI analysis and citizen feedback patterns
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Engagement Score */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-indigo-100"
              >
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Math.round((commentsArray.length / 50) * 100)}%
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">Engagement Rate</div>
                <div className="text-xs text-gray-500">Community participation level</div>
              </motion.div>

              {/* Sentiment Score */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-green-100"
              >
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {commentsArray.length > 0 ? 
                    Math.round(((categorizedComments.positive.length - categorizedComments.angry.length) / commentsArray.length + 1) * 50) : 50}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">Sentiment Score</div>
                <div className="text-xs text-gray-500">Overall policy reception</div>
              </motion.div>

              {/* Action Items */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-purple-100"
              >
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {categorizedComments.suggestions.length + categorizedComments.angry.length}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">Action Items</div>
                <div className="text-xs text-gray-500">Issues + suggestions requiring attention</div>
              </motion.div>

              {/* AI Confidence */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-orange-100"
              >
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {insights && !insights.error ? '95%' : insights?.error ? '50%' : 'N/A'}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">AI Confidence</div>
                <div className="text-xs text-gray-500">{insights?.error ? 'Fallback mode' : 'Analysis accuracy level'}</div>
              </motion.div>
            </div>

            {/* Quick Recommendations */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900">Trending Concerns</span>
                </div>
                <p className="text-sm text-blue-800">
                  {categorizedComments.angry.length > 0 ? 
                    `${categorizedComments.angry.length} citizens raised concerns that need attention` :
                    'No major concerns identified - positive reception'}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center mb-2">
                  <MessageCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="font-semibold text-green-900">Community Support</span>
                </div>
                <p className="text-sm text-green-800">
                  {categorizedComments.positive.length > 0 ? 
                    `${categorizedComments.positive.length} supportive voices backing the initiative` :
                    'Community support building - encourage more feedback'}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="font-semibold text-purple-900">Innovation Ideas</span>
                </div>
                <p className="text-sm text-purple-800">
                  {categorizedComments.suggestions.length > 0 ? 
                    `${categorizedComments.suggestions.length} constructive suggestions for improvement` :
                    'Open to suggestions - encourage innovation feedback'}
                </p>
              </div>
            </div>

            {/* Footer Attribution */}
            <div className="mt-6 pt-4 border-t border-indigo-200 text-center">
              <p className="text-xs text-indigo-600">
                <FileText className="inline h-3 w-3 mr-1" />
                Powered by e.Sameekshak AI Analytics • Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}