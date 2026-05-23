import OpenAI from "openai";
import { db } from "../db";
import { projectAnalytics, services, customers } from "@shared/schema";
import { sql } from "drizzle-orm";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface ProjectData {
  serviceType: string;
  revenue: number;
  costs: number;
  profitMargin: number;
  flightHours: number;
  processingHours: number;
  qualityScore: number;
  clientType: string;
  location: string;
}

interface RecommendationResponse {
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

export class AIRecommendationEngine {
  async generateRecommendations(): Promise<RecommendationResponse> {
    try {
      const projectData = await this.getProjectAnalytics();
      const serviceData = await this.getServiceData();

      const analysisData = {
        totalProjects: projectData.length,
        avgProfitMargin: this.calculateAverage(projectData, 'profitMargin'),
        avgQualityScore: this.calculateAverage(projectData, 'qualityScore'),
        totalRevenue: projectData.reduce((sum, p) => sum + (p.revenue || 0), 0),
        serviceBreakdown: this.analyzeServiceBreakdown(projectData),
        clientTypeAnalysis: this.analyzeClientTypes(projectData),
        locationAnalysis: this.analyzeLocations(projectData),
        services: serviceData
      };

      const prompt = this.buildAnalysisPrompt(analysisData);

      const response = await grok.chat.completions.create({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: `You are an AI business analyst for Apollo DroneWorks, a small regional drone services company in St. George, Utah (Southern Utah / Washington County).

CRITICAL CONTEXT:
- This is a small regional business, NOT an enterprise or national company
- All service prices are in the range of $200–$800 (hundreds of dollars, NOT thousands)
- The market is St. George / Southern Utah — a growing but smaller regional market
- Pricing recommendations must stay within 30% of each service's current price
- Do not recommend prices in the thousands of dollars

Always respond with valid JSON only.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const recommendations = JSON.parse(response.choices[0].message.content || '{}');
      return recommendations;

    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      throw new Error('Failed to generate AI recommendations');
    }
  }

  private async getProjectAnalytics(): Promise<ProjectData[]> {
    const results = await db
      .select({
        serviceType: projectAnalytics.serviceType,
        revenue: projectAnalytics.revenue,
        costs: projectAnalytics.costs,
        profitMargin: projectAnalytics.profitMargin,
        flightHours: projectAnalytics.flightHours,
        processingHours: projectAnalytics.processingHours,
        qualityScore: projectAnalytics.qualityScore,
        clientType: projectAnalytics.clientType,
        location: projectAnalytics.location,
      })
      .from(projectAnalytics)
      .where(sql`created_at >= NOW() - INTERVAL '12 months'`);

    return results.map(row => ({
      serviceType: row.serviceType || '',
      revenue: Number(row.revenue) || 0,
      costs: Number(row.costs) || 0,
      profitMargin: Number(row.profitMargin) || 0,
      flightHours: Number(row.flightHours) || 0,
      processingHours: Number(row.processingHours) || 0,
      qualityScore: Number(row.qualityScore) || 0,
      clientType: row.clientType || '',
      location: row.location || '',
    }));
  }

  private async getServiceData() {
    const results = await db
      .select({
        name: services.name,
        description: services.description,
        price: services.price
      })
      .from(services);

    return results;
  }

  private calculateAverage(data: ProjectData[], field: keyof ProjectData): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
    return Math.round((sum / data.length) * 100) / 100;
  }

  private analyzeServiceBreakdown(data: ProjectData[]) {
    const breakdown = data.reduce((acc, project) => {
      const service = project.serviceType || 'Unknown';
      if (!acc[service]) {
        acc[service] = { count: 0, totalRevenue: 0, avgProfitMargin: 0 };
      }
      acc[service].count++;
      acc[service].totalRevenue += project.revenue;
      acc[service].avgProfitMargin += project.profitMargin;
      return acc;
    }, {} as Record<string, { count: number; totalRevenue: number; avgProfitMargin: number }>);

    Object.keys(breakdown).forEach(service => {
      breakdown[service].avgProfitMargin = breakdown[service].avgProfitMargin / breakdown[service].count;
    });

    return breakdown;
  }

  private analyzeClientTypes(data: ProjectData[]) {
    return data.reduce((acc, project) => {
      const clientType = project.clientType || 'Unknown';
      acc[clientType] = (acc[clientType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeLocations(data: ProjectData[]) {
    return data.reduce((acc, project) => {
      const location = project.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private buildAnalysisPrompt(data: any): string {
    const serviceList = data.services
      .map((s: any) => `  - ${s.name}: $${s.price}`)
      .join('\n');

    return `
Analyze this drone services business data and provide recommendations in the following JSON format.

IMPORTANT PRICING RULES:
- All current service prices are in the range of $200–$800 (this is a small regional business)
- Pricing recommendations must stay within 30% of each service's current price
- Format recommended prices as "$XXX" (e.g., "$349" not "$3,490" or "$35,000")
- Do NOT recommend prices in the thousands of dollars

{
  "serviceOptimization": [
    {
      "title": "Optimization Title",
      "description": "Detailed description of the optimization",
      "impact": "Expected impact (e.g., '+10% profit margin')"
    }
  ],
  "growthOpportunities": [
    {
      "title": "Growth Opportunity Title",
      "description": "Description of the opportunity",
      "potential": "Potential benefit (e.g., '+$2,000 monthly revenue')"
    }
  ],
  "pricingRecommendations": [
    {
      "service": "Service Name",
      "recommendedPrice": "$XXX",
      "reasoning": "Brief reasoning referencing local St. George market and current price"
    }
  ]
}

Business Context:
- Company: Apollo DroneWorks, St. George / Southern Utah regional market
- Market: Small regional (Washington County, Utah) — NOT a major metro

Current Services with Prices (ALL in hundreds of dollars):
${serviceList}

Business Performance Data:
- Total Projects (last 12 months): ${data.totalProjects}
- Average Profit Margin: ${data.avgProfitMargin}%
- Average Quality Score: ${data.avgQualityScore}/5
- Total Revenue: $${data.totalRevenue}

Service Breakdown: ${JSON.stringify(data.serviceBreakdown)}
Client Types: ${JSON.stringify(data.clientTypeAnalysis)}
Location Analysis: ${JSON.stringify(data.locationAnalysis)}

Provide 2-3 recommendations per category, focused on this specific regional business context.
Pricing recommendations should only cover 2-3 services with the most opportunity for adjustment.
Be specific and actionable.
    `;
  }
}
