import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, MapPin, Target, Zap } from "lucide-react";

interface ServiceMetrics {
  serviceId: number;
  serviceName: string;
  totalRevenue: number;
  bookingCount: number;
  avgRating: number;
  bundleFrequency: number;
  seasonalTrend: "up" | "down" | "stable";
  popularRegions: string[];
  conversionRate: number;
  clientRetention: number;
}

interface BundleImpact {
  primaryService: string;
  bundledServices: string[];
  totalValue: number;
  discountApplied: number;
  frequency: number;
}

interface ClientJourney {
  step: string;
  serviceType: string;
  conversionRate: number;
  dropoffRate: number;
  avgTimeBetween: number;
}

export default function ServiceAnalytics() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "quarter" | "year">("month");
  const [selectedView, setSelectedView] = useState<"overview" | "bundles" | "journey" | "geographic">("overview");

  // Mock data - in real implementation, this would come from your analytics API
  const serviceMetrics: ServiceMetrics[] = [
    {
      serviceId: 3,
      serviceName: "Roof Inspection",
      totalRevenue: 15400,
      bookingCount: 44,
      avgRating: 4.8,
      bundleFrequency: 0.68,
      seasonalTrend: "up",
      popularRegions: ["Downtown", "Suburbs", "Industrial"],
      conversionRate: 0.72,
      clientRetention: 0.84
    },
    {
      serviceId: 12,
      serviceName: "Aerial Photography Package",
      totalRevenue: 28900,
      bookingCount: 67,
      avgRating: 4.9,
      bundleFrequency: 0.45,
      seasonalTrend: "stable",
      popularRegions: ["Residential", "Commercial", "Real Estate"],
      conversionRate: 0.68,
      clientRetention: 0.91
    },
    {
      serviceId: 1,
      serviceName: "Real Estate Photography",
      totalRevenue: 22100,
      bookingCount: 74,
      avgRating: 4.7,
      bundleFrequency: 0.52,
      seasonalTrend: "up",
      popularRegions: ["Uptown", "Waterfront", "Historic District"],
      conversionRate: 0.75,
      clientRetention: 0.88
    }
  ];

  const bundleImpacts: BundleImpact[] = [
    {
      primaryService: "Aerial Photography Package",
      bundledServices: ["Roof Inspection", "Real Estate Photography"],
      totalValue: 1247,
      discountApplied: 312,
      frequency: 23
    },
    {
      primaryService: "Real Estate Photography",
      bundledServices: ["Aerial Photography Package"],
      totalValue: 892,
      discountApplied: 178,
      frequency: 18
    }
  ];

  const clientJourney: ClientJourney[] = [
    { step: "Initial Interest", serviceType: "Real Estate Photography", conversionRate: 0.45, dropoffRate: 0.55, avgTimeBetween: 0 },
    { step: "Service Booking", serviceType: "Real Estate Photography", conversionRate: 0.72, dropoffRate: 0.28, avgTimeBetween: 3.2 },
    { step: "Add-on Consideration", serviceType: "Bundle Options", conversionRate: 0.38, dropoffRate: 0.62, avgTimeBetween: 1.1 },
    { step: "Repeat Customer", serviceType: "Various Services", conversionRate: 0.84, dropoffRate: 0.16, avgTimeBetween: 45.3 }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <div className="h-4 w-4 rounded-full bg-yellow-400" />;
  };

  const renderOverviewDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-offwhite">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold">
              {formatCurrency(serviceMetrics.reduce((sum, service) => sum + service.totalRevenue, 0))}
            </div>
            <p className="text-xs text-offwhite/60 mt-1">
              +12.3% from last {selectedTimeframe}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-offwhite">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {serviceMetrics.reduce((sum, service) => sum + service.bookingCount, 0)}
            </div>
            <p className="text-xs text-offwhite/60 mt-1">
              +8.7% from last {selectedTimeframe}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-offwhite">Avg Bundle Rate</CardTitle>
            <Target className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatPercentage(serviceMetrics.reduce((sum, service) => sum + service.bundleFrequency, 0) / serviceMetrics.length)}
            </div>
            <p className="text-xs text-offwhite/60 mt-1">
              Bundle pricing working well
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-offwhite">Client Retention</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {formatPercentage(serviceMetrics.reduce((sum, service) => sum + service.clientRetention, 0) / serviceMetrics.length)}
            </div>
            <p className="text-xs text-offwhite/60 mt-1">
              Excellent customer loyalty
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader>
            <CardTitle className="text-gold">Service Performance Heatmap</CardTitle>
            <CardDescription className="text-offwhite/60">
              Visual representation of service popularity and revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceMetrics.map((service) => (
              <div key={service.serviceId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-offwhite font-medium">{service.serviceName}</span>
                    {getTrendIcon(service.seasonalTrend)}
                  </div>
                  <span className="text-gold font-bold">{formatCurrency(service.totalRevenue)}</span>
                </div>
                <div className="w-full bg-[#080d17] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold to-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(service.totalRevenue / Math.max(...serviceMetrics.map(s => s.totalRevenue))) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-offwhite/60">
                  <span>{service.bookingCount} bookings</span>
                  <span>★ {service.avgRating}</span>
                  <span>{formatPercentage(service.bundleFrequency)} bundle rate</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#132642] border-gold-dark/30">
          <CardHeader>
            <CardTitle className="text-gold">Regional Impact</CardTitle>
            <CardDescription className="text-offwhite/60">
              Service popularity by geographic area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceMetrics.map((service) => (
              <div key={service.serviceId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-offwhite font-medium">{service.serviceName}</span>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {service.popularRegions.length} regions
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {service.popularRegions.map((region, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-900/20 text-blue-300">
                      <MapPin className="h-3 w-3 mr-1" />
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBundleAnalysis = () => (
    <div className="space-y-6">
      <Card className="bg-[#132642] border-gold-dark/30">
        <CardHeader>
          <CardTitle className="text-gold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Bundle Impact Analysis
          </CardTitle>
          <CardDescription className="text-offwhite/60">
            How your bundle pricing strategy is performing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {bundleImpacts.map((bundle, index) => (
            <div key={index} className="bg-[#080d17] p-4 rounded-lg border border-orange-600/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-orange-400 font-semibold">{bundle.primaryService}</h3>
                <Badge className="bg-orange-900/20 text-orange-300">
                  {bundle.frequency} times this {selectedTimeframe}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-offwhite/60 text-sm">Bundled with:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {bundle.bundledServices.map((service, idx) => (
                      <Badge key={idx} variant="outline" className="text-cyan-400 border-cyan-400">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-green-400 font-bold text-lg">{formatCurrency(bundle.totalValue)}</div>
                    <div className="text-xs text-offwhite/60">Total Value</div>
                  </div>
                  <div>
                    <div className="text-red-400 font-bold text-lg">-{formatCurrency(bundle.discountApplied)}</div>
                    <div className="text-xs text-offwhite/60">Bundle Discount</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-bold text-lg">{formatCurrency(bundle.totalValue - bundle.discountApplied)}</div>
                    <div className="text-xs text-offwhite/60">Net Revenue</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderClientJourney = () => (
    <div className="space-y-6">
      <Card className="bg-[#132642] border-gold-dark/30">
        <CardHeader>
          <CardTitle className="text-gold">Client Journey Visualization</CardTitle>
          <CardDescription className="text-offwhite/60">
            Track how clients move through your service ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientJourney.map((step, index) => (
              <div key={index} className="relative">
                {index < clientJourney.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gold/30" />
                )}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center">
                    <span className="text-gold font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-offwhite font-semibold">{step.step}</h3>
                      <Badge variant="outline" className="text-purple-400 border-purple-400">
                        {step.serviceType}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-green-400 font-medium">{formatPercentage(step.conversionRate)}</span>
                        <span className="text-offwhite/60 ml-1">conversion</span>
                      </div>
                      <div>
                        <span className="text-red-400 font-medium">{formatPercentage(step.dropoffRate)}</span>
                        <span className="text-offwhite/60 ml-1">drop-off</span>
                      </div>
                      <div>
                        <span className="text-blue-400 font-medium">{step.avgTimeBetween}</span>
                        <span className="text-offwhite/60 ml-1">days avg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b111f] text-offwhite p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold">Service Impact Visualization</h1>
            <p className="text-offwhite/60 mt-2">
              Interactive analytics and insights for your Apollo DroneWorks services
            </p>
          </div>
          
          {/* Time Frame Selector */}
          <div className="flex gap-2">
            {(["week", "month", "quarter", "year"] as const).map((timeframe) => (
              <Button
                key={timeframe}
                variant={selectedTimeframe === timeframe ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(timeframe)}
                className={selectedTimeframe === timeframe 
                  ? "bg-gold text-[#080d17] hover:bg-gold/90" 
                  : "border-gold-dark/30 text-gold hover:bg-gold/10"
                }
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* View Selector */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "overview", label: "Overview", icon: TrendingUp },
            { key: "bundles", label: "Bundle Analysis", icon: Zap },
            { key: "journey", label: "Client Journey", icon: Users },
            { key: "geographic", label: "Geographic", icon: MapPin }
          ] as const).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={selectedView === key ? "default" : "outline"}
              onClick={() => setSelectedView(key)}
              className={selectedView === key 
                ? "bg-gold text-[#080d17] hover:bg-gold/90" 
                : "border-gold-dark/30 text-gold hover:bg-gold/10"
              }
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {/* Dynamic Content */}
        {selectedView === "overview" && renderOverviewDashboard()}
        {selectedView === "bundles" && renderBundleAnalysis()}
        {selectedView === "journey" && renderClientJourney()}
        {selectedView === "geographic" && (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 text-gold/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gold mb-2">Geographic Analysis</h3>
            <p className="text-offwhite/60">Advanced geographic visualization coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}