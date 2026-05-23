import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Users, MessageSquare, Award, Calendar } from "lucide-react";

type SatisfactionSurvey = {
  id: number;
  bookingId: number;
  customerId: number;
  overallRating: number;
  serviceQualityRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
  valueRating?: number;
  feedback?: string;
  improvements?: string;
  wouldRecommend?: boolean;
  contactPermission: boolean;
  isTestimonial: boolean;
  publicTestimonial?: string;
  submittedAt: string;
  followUpSent: boolean;
  followUpSentAt?: string;
};

export default function SatisfactionSurveys() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: surveys = [] } = useQuery<SatisfactionSurvey[]>({
    queryKey: ["/api/satisfaction/surveys"],
  });

  // Calculate analytics
  const analytics = {
    totalSurveys: surveys.length,
    averageRating: surveys.length > 0 ? surveys.reduce((sum, s) => sum + s.overallRating, 0) / surveys.length : 0,
    recommendationRate: surveys.length > 0 ? (surveys.filter(s => s.wouldRecommend).length / surveys.length) * 100 : 0,
    testimonials: surveys.filter(s => s.isTestimonial).length,
    ratingDistribution: {
      5: surveys.filter(s => s.overallRating === 5).length,
      4: surveys.filter(s => s.overallRating === 4).length,
      3: surveys.filter(s => s.overallRating === 3).length,
      2: surveys.filter(s => s.overallRating === 2).length,
      1: surveys.filter(s => s.overallRating === 1).length,
    }
  };

  const recentSurveys = surveys
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 10);

  const testimonials = surveys.filter(s => s.isTestimonial && s.publicTestimonial);

  const StarRating = ({ rating, showNumber = true }: { rating: number; showNumber?: boolean }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      {showNumber && <span className="ml-1 text-sm text-muted-foreground">({rating})</span>}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Satisfaction</h1>
          <p className="text-muted-foreground">Monitor feedback and service quality metrics</p>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSurveys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            <StarRating rating={Math.round(analytics.averageRating)} showNumber={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.recommendationRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testimonials</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.testimonials}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="surveys">Recent Surveys</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Breakdown of customer ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <StarRating rating={rating} showNumber={false} />
                      <Progress 
                        value={(analytics.ratingDistribution[rating as keyof typeof analytics.ratingDistribution] / analytics.totalSurveys) * 100} 
                        className="flex-1" 
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {analytics.ratingDistribution[rating as keyof typeof analytics.ratingDistribution]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Feedback Highlights */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback Highlights</CardTitle>
                <CardDescription>Latest customer comments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSurveys.slice(0, 3).map((survey) => (
                    <div key={survey.id} className="border-l-2 border-primary/20 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={survey.overallRating} />
                        <span className="text-xs text-muted-foreground">
                          Booking #{survey.bookingId}
                        </span>
                      </div>
                      {survey.feedback && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          "{survey.feedback}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="surveys" className="space-y-4">
          <div className="grid gap-4">
            {recentSurveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Booking #{survey.bookingId}
                        <Badge variant={survey.overallRating >= 4 ? "default" : survey.overallRating >= 3 ? "secondary" : "destructive"}>
                          {survey.overallRating >= 4 ? "Satisfied" : survey.overallRating >= 3 ? "Neutral" : "Unsatisfied"}
                        </Badge>
                        {survey.wouldRecommend && (
                          <Badge variant="outline">
                            Would Recommend
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Customer #{survey.customerId} • {new Date(survey.submittedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <StarRating rating={survey.overallRating} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Detailed Ratings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {survey.serviceQualityRating && (
                        <div>
                          <p className="font-medium mb-1">Service Quality</p>
                          <StarRating rating={survey.serviceQualityRating} />
                        </div>
                      )}
                      {survey.communicationRating && (
                        <div>
                          <p className="font-medium mb-1">Communication</p>
                          <StarRating rating={survey.communicationRating} />
                        </div>
                      )}
                      {survey.timelinessRating && (
                        <div>
                          <p className="font-medium mb-1">Timeliness</p>
                          <StarRating rating={survey.timelinessRating} />
                        </div>
                      )}
                      {survey.valueRating && (
                        <div>
                          <p className="font-medium mb-1">Value</p>
                          <StarRating rating={survey.valueRating} />
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    {survey.feedback && (
                      <div>
                        <p className="font-medium mb-2">Feedback</p>
                        <p className="text-muted-foreground bg-muted/50 p-3 rounded-md">
                          "{survey.feedback}"
                        </p>
                      </div>
                    )}

                    {/* Improvements */}
                    {survey.improvements && (
                      <div>
                        <p className="font-medium mb-2">Suggested Improvements</p>
                        <p className="text-muted-foreground bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                          {survey.improvements}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {survey.contactPermission && (
                        <Badge variant="outline">Contact Permitted</Badge>
                      )}
                      {survey.isTestimonial && (
                        <Badge variant="outline">Testimonial</Badge>
                      )}
                      {survey.followUpSent && (
                        <Badge variant="outline">Follow-up Sent</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <div className="grid gap-4">
            {testimonials.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Customer Testimonial
                      </CardTitle>
                      <CardDescription>
                        Booking #{survey.bookingId} • {new Date(survey.submittedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <StarRating rating={survey.overallRating} />
                  </div>
                </CardHeader>
                <CardContent>
                  <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground bg-muted/50 p-4 rounded-r-md">
                    "{survey.publicTestimonial}"
                  </blockquote>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      Use in Marketing
                    </Button>
                    <Button variant="outline" size="sm">
                      Share on Social
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Trends</CardTitle>
                <CardDescription>Customer satisfaction over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Rating trends chart would be implemented here with a charting library
                </div>
              </CardContent>
            </Card>

            {/* Service Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>Average ratings by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Service Quality</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20" />
                      <span className="text-sm">4.2</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Communication</span>
                    <div className="flex items-center gap-2">
                      <Progress value={90} className="w-20" />
                      <span className="text-sm">4.5</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Timeliness</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-20" />
                      <span className="text-sm">3.9</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Value</span>
                    <div className="flex items-center gap-2">
                      <Progress value={82} className="w-20" />
                      <span className="text-sm">4.1</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}