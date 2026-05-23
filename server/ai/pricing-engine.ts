import OpenAI from "openai";
import { db } from "../db";
import { services, projectAnalytics, expenses } from "@shared/schema";
import { aiPricingSuggestions } from "@shared/pricing-schema";
import { eq, desc } from "drizzle-orm";

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface PricingAnalysis {
  serviceId: number;
  currentPrice: number;
  suggestedPrice: number;
  confidence: number;
  reasoning: string;
  marketFactors: {
    competition: number;
    demand: number;
    seasonality: number;
    location: string;
  };
}

export class AIPricingEngine {
  async generatePricingSuggestions(serviceId?: number): Promise<PricingAnalysis[]> {
    try {
      const servicesToAnalyze = serviceId
        ? await db.select().from(services).where(eq(services.id, serviceId))
        : await db.select().from(services);

      const suggestions: PricingAnalysis[] = [];

      for (const service of servicesToAnalyze) {
        const analysis = await this.analyzeServicePricing(service);
        suggestions.push(analysis);
        await this.storePricingSuggestion(analysis);
      }

      return suggestions;
    } catch (error) {
      console.error("Error generating pricing suggestions:", error);
      throw error;
    }
  }

  private async analyzeServicePricing(service: any): Promise<PricingAnalysis> {
    const performanceData = await this.getServicePerformanceData(service.id);
    const marketData = this.getMarketInsights();
    const avgCost = await this.getAvgCost(service.id);

    const currentPrice = parseFloat(service.price) || 0;
    const minPrice = Math.round(currentPrice * 0.6);
    const maxPrice = Math.round(currentPrice * 1.4);

    const analysisPrompt = `
You are a pricing expert for a small regional drone services business in St. George, Utah (Washington County, Southern Utah).
Apollo DroneWorks serves local real estate agents, construction companies, event organizers, and property owners in a growing but smaller regional market — NOT a major metropolitan area.

ALL prices for this business are in the range of $200–$800 per service. This is NOT an enterprise or high-end luxury market.

STRICT RULE: Your suggestedPrice MUST be a whole number between $${minPrice} and $${maxPrice}.
If your analysis would suggest a price outside that range, return the current price ($${currentPrice}) unchanged.

Service to analyze:
- Name: ${service.name}
- Current Price: $${currentPrice}
- Description: ${service.description}

Performance Data (from actual project history):
- Total projects completed: ${performanceData.totalProjects}
- Average profit margin: ${performanceData.avgProfitMargin.toFixed(1)}%
- Average customer satisfaction: ${performanceData.avgRating.toFixed(1)}/5

Cost Data:
- Average cost per project: $${avgCost.toFixed(2)}

Market Context:
- Current season: ${marketData.season}
- Seasonal demand level: ${marketData.demand > 0.7 ? 'high (peak season)' : 'moderate (off-peak)'}
- Local competition: moderate (small regional market, 3–5 competitors)
- Location: St. George / Southern Utah region

Respond ONLY with this JSON (no extra text):
{
  "suggestedPrice": <whole number between ${minPrice} and ${maxPrice}>,
  "confidence": <0.0 to 1.0>,
  "reasoning": "<1-2 sentence explanation referencing local market and current price>",
  "marketFactors": {
    "competition": <0.0 to 1.0>,
    "demand": <0.0 to 1.0>,
    "seasonality": <0.0 to 1.0>,
    "location": "St. George / Southern Utah regional market"
  }
}
`;

    const response = await grok.chat.completions.create({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: "You are a pricing expert for a small regional drone services business. Always respond with valid JSON only. Never suggest prices outside the specified range."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" }
    });

    let aiAnalysis: any = {};
    try {
      aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      aiAnalysis = {};
    }

    // Enforce price bounds regardless of AI output
    // If AI returns a price outside the allowed range, fall back to current price
    const rawSuggested = Number(aiAnalysis.suggestedPrice);
    const suggestedPrice = (rawSuggested >= minPrice && rawSuggested <= maxPrice)
      ? rawSuggested
      : currentPrice;

    return {
      serviceId: service.id,
      currentPrice,
      suggestedPrice,
      confidence: Math.min(1, Math.max(0, Number(aiAnalysis.confidence) || 0.5)),
      reasoning: aiAnalysis.reasoning || "Analysis based on local Southern Utah market conditions.",
      marketFactors: aiAnalysis.marketFactors || {
        competition: 0.5,
        demand: marketData.demand,
        seasonality: 0.5,
        location: "St. George / Southern Utah regional market"
      }
    };
  }

  private async getServicePerformanceData(serviceId: number) {
    try {
      const projects = await db.select().from(projectAnalytics);
      const serviceProjects = projects.filter(p => p.service === serviceId.toString());
      const totalProjects = serviceProjects.length;
      const avgProfitMargin = serviceProjects.length > 0
        ? serviceProjects.reduce((sum, p) => sum + (parseFloat(p.profitMargin || "0")), 0) / serviceProjects.length
        : 0;
      const avgRating = serviceProjects.length > 0
        ? serviceProjects.reduce((sum, p) => sum + (parseFloat(p.qualityScore || "4")), 0) / serviceProjects.length
        : 4;

      return { totalProjects, avgProfitMargin, avgRating };
    } catch {
      return { totalProjects: 0, avgProfitMargin: 0, avgRating: 4 };
    }
  }

  private async getAvgCost(serviceId: number): Promise<number> {
    try {
      const costs = await db.select().from(expenses);
      const serviceCosts = costs.filter(c => c.projectId && c.category?.includes(serviceId.toString()));
      if (serviceCosts.length === 0) return 80;
      return serviceCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0) / serviceCosts.length;
    } catch {
      return 80;
    }
  }

  private getMarketInsights() {
    const currentMonth = new Date().getMonth();
    const seasons = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "fall", "fall", "fall", "winter"];
    return {
      season: seasons[currentMonth],
      demand: currentMonth >= 3 && currentMonth <= 8 ? 0.8 : 0.6
    };
  }

  private async storePricingSuggestion(analysis: PricingAnalysis) {
    try {
      await db.insert(aiPricingSuggestions).values({
        serviceId: analysis.serviceId,
        suggestedPrice: analysis.suggestedPrice.toString(),
        currentPrice: analysis.currentPrice.toString(),
        confidence: analysis.confidence.toString(),
        reasoning: analysis.reasoning,
        marketFactors: analysis.marketFactors,
        isApplied: false
      });
    } catch (error) {
      console.error("Error storing pricing suggestion:", error);
    }
  }

  async getPricingSuggestions(serviceId?: number) {
    try {
      const query = serviceId
        ? db.select().from(aiPricingSuggestions)
            .where(eq(aiPricingSuggestions.serviceId, serviceId))
            .orderBy(desc(aiPricingSuggestions.createdAt))
        : db.select().from(aiPricingSuggestions)
            .orderBy(desc(aiPricingSuggestions.createdAt));

      return await query;
    } catch (error) {
      console.error("Error fetching pricing suggestions:", error);
      return [];
    }
  }

  async markSuggestionApplied(suggestionId: number) {
    try {
      await db.update(aiPricingSuggestions)
        .set({ isApplied: true, updatedAt: new Date() })
        .where(eq(aiPricingSuggestions.id, suggestionId));
    } catch (error) {
      console.error("Error marking suggestion as applied:", error);
    }
  }
}
