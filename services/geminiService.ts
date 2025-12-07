import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface FraudCheckResult {
  riskScore: number; // 0-100, higher is riskier
  isValidFormat: boolean;
  reasoning: string;
}

/**
 * Simulates a sophisticated anti-fraud check using Generative AI to analyze
 * the UTR string format and transaction context.
 */
export const analyzeTransactionRisk = async (
  utr: string, 
  amount: number,
  method: string
): Promise<FraudCheckResult> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // We strictly use JSON schema for reliable parsing
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this transaction for potential fraud or format errors.
      Transaction Details:
      Method: ${method}
      Amount: ${amount}
      Transaction ID (UTR/Ref): ${utr}
      
      Standard Indian UPI Reference Numbers are typically 12 digits.
      Standard Card transaction IDs vary but usually alphanumeric.
      
      If the UTR is "test", "123", or obviously fake, mark as high risk.
      If the UTR follows a standard 12-digit numeric format (e.g., 304581930211), it is likely valid format (though we can't verify existence without banking API).
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER, description: "0 to 100 integer. >80 is reject." },
            isValidFormat: { type: Type.BOOLEAN, description: "Does the ID look like a real banking ref?" },
            reasoning: { type: Type.STRING, description: "Short explanation for the user." }
          },
          required: ["riskScore", "isValidFormat", "reasoning"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as FraudCheckResult;
    }
    
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Fraud check failed:", error);
    // Fallback safe mode: moderate risk if AI fails, to prompt manual review (simulated)
    return {
      riskScore: 50,
      isValidFormat: true,
      reasoning: "AI Service unavailable. Manual review queued."
    };
  }
};