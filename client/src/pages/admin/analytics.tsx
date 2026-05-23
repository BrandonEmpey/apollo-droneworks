import * as React from "react";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Target,
  Lightbulb,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";

// AI Recommendation Engine Component
interface RecommendationData {
  serviceOptimization: Array<{
    title: string;
    description: string;
    impact: string;
  }>;
  growthOpportunities: Array<{
    title: string;
    description: string;
    potential: string;
  }>;
  pricingRecommendations: Array<{
    service: string;
    recommendedPrice: string;
    reasoning: string;
  }>;
}

function AIRecommendationEngine() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);

  const generateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            AI Project Recommendations
          </h3>
          <p className="text-muted-foreground mt-1">
            Get intelligent insights and recommendations based on your project data
          </p>
        </div>
        <Button 
          onClick={generateRecommendations} 
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="h-4 w-4" />
          )}
          {isGenerating ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {recommendations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Service Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.serviceOptimization?.map((rec: any, index: number) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Impact: {rec.impact}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.growthOpportunities?.map((opp: any, index: number) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">{opp.title}</p>
                    <p className="text-sm text-muted-foreground">{opp.description}</p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      Potential: {opp.potential}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Pricing Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.pricingRecommendations?.map((pricing: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-semibold">{pricing.service}</h4>
                    <p className="text-2xl font-bold text-primary">{pricing.recommendedPrice}</p>
                    <p className="text-sm text-muted-foreground">{pricing.reasoning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for AI Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate Insights" to analyze your project data and receive personalized recommendations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Analytics Overview Component
function AnalyticsOverview() {
  const { data: analytics = {} } = useQuery({
    queryKey: ['/api/analytics/overview'],
  });

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Project Analytics Overview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{(analytics as any)?.totalProjects || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Profit Margin</p>
                <p className="text-2xl font-bold">{(analytics as any)?.avgProfitMargin || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flight Hours</p>
                <p className="text-2xl font-bold">{(analytics as any)?.totalFlightHours || 0}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Satisfaction</p>
                <p className="text-2xl font-bold">{(analytics as any)?.avgQualityScore || 0}/5</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Business Intelligence - Apollo DroneWorks</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Control Center
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Business Intelligence
          </h1>
          <p className="text-muted-foreground">
            Analytics, reports, and AI-powered insights for your drone services business
          </p>
        </div>

        <Tabs defaultValue="ai-recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai-recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="project-analytics">Project Analytics</TabsTrigger>
            <TabsTrigger value="financial-reports">Financial Reports</TabsTrigger>
            <TabsTrigger value="performance-metrics">Performance Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-recommendations">
            <AIRecommendationEngine />
          </TabsContent>

          <TabsContent value="project-analytics">
            <AnalyticsOverview />
          </TabsContent>

          <TabsContent value="financial-reports">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Comprehensive financial analysis and reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Financial reporting interface will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance-metrics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators and business metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Performance metrics dashboard will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}