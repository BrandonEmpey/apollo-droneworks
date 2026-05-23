import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Share2, Target, TrendingUp, Users } from "lucide-react";
import { TestimonialManager } from "@/components/admin/testimonial-manager";
import { Testimonial } from "@shared/schema";

export default function MarketingHub() {
  const { data: socialPosts } = useQuery({
    queryKey: ["/api/social-posts"],
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: marketingAnalytics } = useQuery({
    queryKey: ["/api/marketing-analytics"],
  });

  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  return (
    <>
      <Helmet>
        <title>Marketing Hub - Apollo DroneWorks Admin</title>
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
            Marketing Hub
          </h1>
          <p className="text-muted-foreground">
            Manage social media, campaigns, analytics, audience, and testimonials
          </p>
        </div>

        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Social Media
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audience" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Testimonials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Social Media Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Recent scheduled and published posts across your social accounts.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialPosts?.slice(0, 6)?.map((post: any) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{post.platform}</CardTitle>
                    <CardDescription>
                      {new Date(post.scheduledDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Status: {post.status || 'Draft'}
                    </p>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No social media posts found. Create your first post to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Campaign Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Active and recent ad campaigns across your channels.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns?.slice(0, 6)?.map((campaign: any) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription>{campaign.platform}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Budget: ${campaign.budget?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {campaign.status || 'Draft'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reach: {campaign.reach?.toLocaleString() || '0'} people
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No campaigns found. Create your first campaign to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Marketing Analytics</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Headline marketing KPIs across reach, engagement, leads, and conversion.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {marketingAnalytics?.totalReach?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{marketingAnalytics?.reachGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {marketingAnalytics?.engagementRate || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{marketingAnalytics?.engagementGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {marketingAnalytics?.leadsGenerated || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{marketingAnalytics?.leadGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {marketingAnalytics?.conversionRate || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: 3.5%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="testimonials" className="space-y-6">
            <h2 className="text-2xl font-semibold">Testimonials</h2>
            <TestimonialManager testimonials={testimonials || []} />
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Audience Insights</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Demographics, geography, interests, and best posting windows for your audience.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Demographics</CardTitle>
                  <CardDescription>Audience demographic breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Age 25-34</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Age 35-44</span>
                      <span className="text-sm font-medium">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Age 45-54</span>
                      <span className="text-sm font-medium">22%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Other</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Top locations by audience</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">California</span>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Texas</span>
                      <span className="text-sm font-medium">18%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Florida</span>
                      <span className="text-sm font-medium">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Other</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Interests</CardTitle>
                  <CardDescription>Top audience interests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Real Estate</span>
                      <span className="text-sm font-medium">42%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Construction</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Photography</span>
                      <span className="text-sm font-medium">28%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Technology</span>
                      <span className="text-sm font-medium">22%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Best Posting Times</CardTitle>
                  <CardDescription>Optimal engagement windows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Tuesday 9-11 AM</span>
                      <span className="text-sm font-medium">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Thursday 2-4 PM</span>
                      <span className="text-sm font-medium">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Saturday 10-12 PM</span>
                      <span className="text-sm font-medium">Medium</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sunday 6-8 PM</span>
                      <span className="text-sm font-medium">Medium</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}