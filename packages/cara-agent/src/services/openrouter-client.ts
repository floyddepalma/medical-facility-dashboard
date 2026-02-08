import axios from 'axios';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callOpenRouter(messages: Message[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.MODEL || 'openrouter/moonshotai/kimi-k2.5';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  try {
    const response = await axios.post<OpenRouterResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.DASHBOARD_URL || 'http://localhost:3000',
          'X-Title': 'CareSync Cara Agent'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('[OpenRouter] API call failed:', error.response?.data || error.message);
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
}
