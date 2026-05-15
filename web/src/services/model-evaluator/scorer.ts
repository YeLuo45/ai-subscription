// AI self-scoring for evaluation outputs
import { routeAndCall } from '../../../../shared/lib/ai/llm-router';

const SCORING_PROMPT = `Task: {taskType}
Output: {output}

Rate the output quality on a scale of 1-5:
1 = Poor (missing key information, incorrect)
2 = Fair (some key info, but incomplete)
3 = Good (most key info present)
4 = Very Good (complete and accurate)
5 = Excellent (exceeds expectations)

Respond with just the number.`;

export async function scoreOutput(taskType: string, output: string): Promise<number> {
  if (!output || output.startsWith('Error:')) return 1;
  
  try {
    const result = await routeAndCall({
      taskType: 'chat', // Use chat model for scoring
      messages: [
        { 
          role: 'user', 
          content: SCORING_PROMPT.replace('{taskType}', taskType).replace('{output}', output.slice(0, 1000))
        }
      ],
      modelId: 'gemini-2.0-flash', // Cheap model for scoring
      providerId: 'google',
      maxTokens: 5,
      temperature: 0,
    });

    const text = result.text.trim();
    const match = text.match(/^[1-5]$/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return 3; // Default to 3 if parsing fails
  } catch {
    return 3; // Default on error
  }
}
