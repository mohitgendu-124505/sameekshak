import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  CheckCircle, 
  Users, 
  HelpCircle, 
  Loader2, 
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface Benefit {
  title: string;
  description: string;
}

interface Eligibility {
  criteria: string;
  details: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface AIExtractionData {
  benefits: Benefit[];
  eligibility: Eligibility[];
  faqs: FAQ[];
  cached?: boolean;
  error?: string;
}

interface AIExtractionProps {
  policyId: string;
  policyTitle: string;
}

export function AIExtraction({ policyId, policyTitle }: AIExtractionProps) {
  const [data, setData] = useState<AIExtractionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPolicyInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/extract-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract policy information');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Auto-extract on component mount
  useEffect(() => {
    extractPolicyInfo();
  }, [policyId]);

  if (loading && !data) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is analyzing policy content...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={extractPolicyInfo} 
            className="mt-4 w-full"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Policy Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Structured information extracted from policy text
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {data.cached && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
              <Button 
                onClick={extractPolicyInfo} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {data.error && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            {data.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Benefits Section */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Benefits</h4>
                <p className="text-sm text-muted-foreground">What you'll gain</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.benefits.length > 0 ? (
              data.benefits.map((benefit, index) => (
                <div key={index} className="border-l-4 border-green-400 pl-4 py-2">
                  <h5 className="font-medium text-gray-900 mb-1">{benefit.title}</h5>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No specific benefits identified</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligibility Section */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Eligibility</h4>
                <p className="text-sm text-muted-foreground">Who can participate</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.eligibility.length > 0 ? (
              data.eligibility.map((item, index) => (
                <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                  <h5 className="font-medium text-gray-900 mb-1">{item.criteria}</h5>
                  <p className="text-sm text-gray-600">{item.details}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No specific eligibility criteria identified</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQs Section */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HelpCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">FAQs</h4>
                <p className="text-sm text-muted-foreground">Common questions</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.faqs.length > 0 ? (
              data.faqs.map((faq, index) => (
                <div key={index} className="border-l-4 border-purple-400 pl-4 py-2">
                  <h5 className="font-medium text-gray-900 mb-1">{faq.question}</h5>
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No FAQs identified</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}