---
title: Switch AI pricing recommendations to Grok with grounded, market-aware pricing
---
# Task: Switch AI Pricing Engine to Grok with Grounded Recommendations

## Objective
Replace OpenAI with Grok (xAI) in the pricing and recommendation engines, and fix the prompts so that price recommendations are grounded in current service prices and the Southern Utah regional market — eliminating the wild price jumps seen today.

## Files to Change
- `server/ai/pricing-engine.ts`
- `server/ai/recommendation-engine.ts`

## Steps

### 1. Add XAI_API_KEY secret
Request `XAI_API_KEY` from the user if not already set. Use the environment-secrets skill to add it.

### 2. Switch both engines from OpenAI to Grok
The xAI API is compatible with the OpenAI SDK. Change the client instantiation in both files:
```typescript
import OpenAI from "openai";
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});
```
Use model `"grok-3"` in API calls.

### 3. Fix pricing-engine.ts
- Remove all `Math.random()` calls (utilization, avgTime, repeatRate). Replace with either real DB queries or omit the data point entirely from the prompt.
- Add explicit market context to the system prompt: Apollo DroneWorks operates in the St. George / Southern Utah region (Washington County), a growing market but smaller than major metros.
- Add a hard constraint in the prompt: recommended price MUST be within 40% of the current price. Any recommendation outside that range should default back to current price.
- Pass current price prominently: "CURRENT PRICE: $X. Your recommendation must be between $Y and $Z."

### 4. Fix recommendation-engine.ts
- Add same market context (St. George / Southern Utah).
- Add instruction: pricing recommendations must reference and stay close to current prices — provide the full service list with current prices as context.
- Ensure the prompt explicitly states prices are in hundreds of dollars (not thousands or tens of thousands).

### 5. Test
- Trigger a recommendation generation from the analytics page.
- Verify returned prices are in the expected range (e.g., $200–$600 for a $299 service).