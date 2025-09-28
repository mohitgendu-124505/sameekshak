import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { type Policy } from "@shared/schema";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  FileText, 
  MessageCircle, 
  ThumbsUp, 
  Heart,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle,
  Info,
  HelpCircle,
  Brain
} from "lucide-react";
import { PolicyHeader } from '@/components/policy/policy-header';
import { VoteSection } from '@/components/voting/vote-section';
import { CommentSection } from '@/components/comments/comment-section';
import { AIBenefits } from '@/components/policy/ai-benefits';
import { AIEligibility } from '@/components/policy/ai-eligibility';
import { AIFAQs } from '@/components/policy/ai-faqs';

export default function PolicyDetail() {
  const { id } = useParams() as { id: string };

  // Fetch policy details
  const { data: policy, isLoading: isLoadingPolicy } = useQuery<Policy>({
    queryKey: ["/api/policies", id],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${id}`);
      if (!response.ok) throw new Error("Failed to fetch policy");
      return response.json();
    },
    enabled: !!id
  });

  // Fetch vote stats for this policy
  const { data: voteStats } = useQuery({
    queryKey: ["/api/policies", id, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${id}/stats`);
      if (!response.ok) throw new Error("Failed to fetch vote stats");
      return response.json();
    },
    enabled: !!id
  });

  // Fetch comments for this policy
  const { data: comments } = useQuery({
    queryKey: ["/api/policies", id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/policies/${id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "draft":
        return "Draft";
      case "under_review":
        return "Under Review";
      case "archived":
        return "Archived";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Parse policy details if available
  const parseDetails = (details: string | null) => {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  const policyDetails = parseDetails(policy?.details || null);
  const stats = voteStats?.stats || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
  const totalVotes = stats.happy + stats.angry + stats.neutral + stats.suggestion;

  // Mock AI-generated content (in a real app, this would come from the API)
  const mockBenefits = [
    "Improved access to sustainable agricultural practices",
    "Enhanced food security through better farming techniques", 
    "Economic benefits for farmers through increased yields",
    "Environmental protection through reduced chemical usage",
    "Support for small and medium-scale farmers"
  ];

  const mockEligibility = [
    "All registered farmers with valid agricultural license",
    "Minimum 2 acres of agricultural land",
    "Participation in government agricultural programs", 
    "Compliance with environmental standards",
    "Age between 18-65 years"
  ];

  const mockFAQs = [
    {
      question: "How long does the application process take?",
      answer: "The application process typically takes 30-45 days from submission to approval."
    },
    {
      question: "What documents are required?",
      answer: "You will need your agricultural license, land ownership documents, and identity proof."
    },
    {
      question: "Is there any application fee?",
      answer: "No, the application process is completely free of charge for all eligible farmers."
    }
  ];

  if (isLoadingPolicy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded-lg w-1/3"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-semibold text-foreground mb-4">Policy Not Found</h1>
            <p className="text-muted-foreground mb-6">The policy you're looking for doesn't exist or has been removed.</p>
            <Link href="/policies">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Policies
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link href="/policies">
            <Button variant="ghost" className="pl-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Policies
            </Button>
          </Link>
        </motion.div>

        {/* Policy Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <Badge className={`text-sm px-4 py-2 ${getStatusColor(policy.status)}`}>
                      {getStatusLabel(policy.status)}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(policy.createdAt ? (typeof policy.createdAt === 'string' ? policy.createdAt : policy.createdAt.toISOString()) : '')}
                    </div>
                  </div>
                  
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{policy.title}</h1>
                  <p className="text-xl text-gray-600 leading-relaxed">{policy.description}</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl mb-2">😀</div>
                  <div className="text-2xl font-bold text-green-600">{stats.happy}</div>
                  <div className="text-sm text-muted-foreground">Happy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">😡</div>
                  <div className="text-2xl font-bold text-red-600">{stats.angry}</div>
                  <div className="text-sm text-muted-foreground">Angry</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">😐</div>
                  <div className="text-2xl font-bold text-gray-600">{stats.neutral}</div>
                  <div className="text-sm text-muted-foreground">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">💡</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.suggestion}</div>
                  <div className="text-sm text-muted-foreground">Suggestions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-purple-600">{totalVotes}</div>
                  <div className="text-sm text-muted-foreground">Total Votes</div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="flex space-x-4">
                <Link href={`/voting?policy=${policy.id}`}>
                  <Button size="lg" className="px-8">
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Cast Your Vote
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  View Comments ({comments?.length || 0})
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabbed Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-border rounded-lg p-1">
              <TabsTrigger value="overview" className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="benefits" className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Benefits
              </TabsTrigger>
              <TabsTrigger value="eligibility" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Eligibility
              </TabsTrigger>
              <TabsTrigger value="faqs" className="flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="vote-comment" className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Vote & Comment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-6 w-6 mr-2" />
                    Policy Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="text-lg leading-relaxed mb-6">{policy.description}</p>
                    
                    {policy.details && (
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-4">Additional Details</h3>
                        <p className="text-gray-700">{policy.details}</p>
                      </div>
                    )}

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Policy Status</h4>
                        <p className="text-green-700">{getStatusLabel(policy.status)}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">Created Date</h4>
                        <p className="text-purple-700">{formatDate(policy.createdAt ? (typeof policy.createdAt === 'string' ? policy.createdAt : policy.createdAt.toISOString()) : '')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="benefits" className="mt-8">
              <AIBenefits policyId={policy.id} policyTitle={policy.title} />
            </TabsContent>

            <TabsContent value="eligibility" className="mt-8">
              <AIEligibility policyId={policy.id} policyTitle={policy.title} />
            </TabsContent>

            <TabsContent value="faqs" className="mt-8">
              <AIFAQs policyId={policy.id} policyTitle={policy.title} />
            </TabsContent>

            <TabsContent value="vote-comment" className="mt-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-6 w-6 mr-2 text-orange-600" />
                    Vote & Comment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 mx-auto text-orange-600 mb-4" />
                    <h3 className="text-xl font-semibold mb-4">Cast Your Vote & Share Your Thoughts</h3>
                    <p className="text-muted-foreground mb-6">
                      Your opinion matters! Vote on this policy and share your feedback with the community.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Link href={`/voting?policy=${policy.id}`}>
                        <Button size="lg">
                          <ThumbsUp className="h-5 w-5 mr-2" />
                          Vote Now
                        </Button>
                      </Link>
                      <Button variant="outline" size="lg">
                        <MessageCircle className="h-5 w-5 mr-2" />
                        View All Comments
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}