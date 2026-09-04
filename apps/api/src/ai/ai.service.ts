/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Service (Gemini)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reduces host onboarding friction: turns a host's rough bullet-point notes
 * into a usable listing description, and answers guest FAQ questions about
 * a specific property.
 *
 * Uses Google's Gemini API rather than Claude — Gemini has a genuine free
 * tier, which matters for a project whose only real running cost is meant
 * to be a domain name. Without GEMINI_API_KEY configured, both methods
 * degrade to a clear "not configured" error rather than crashing — the
 * same pattern PhonePeService/EmailService/UploadService already use.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: GoogleGenerativeAI | null;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    if (!this.client) {
      this.logger.warn(
        'Gemini not configured — AI description generation and FAQ chatbot are disabled. ' +
          'Set GEMINI_API_KEY in .env to enable (free tier at aistudio.google.com/apikey).',
      );
    }
  }

  private requireClient(): GoogleGenerativeAI {
    if (!this.client) {
      throw new ServiceUnavailableException({
        code: 'AI_NOT_CONFIGURED',
        message: 'AI features are not configured on this server.',
      });
    }
    return this.client;
  }

  /**
   * Turn a host's rough notes into a polished, guest-facing listing
   * description.
   */
  async generateDescription(params: {
    notes: string;
    propertyName?: string;
    city?: string;
  }): Promise<string> {
    const client = this.requireClient();
    const model = client.getGenerativeModel({ model: this.modelName });

    const prompt = [
      'You write short, warm, guest-facing listing descriptions for independent homestays and hotels in India.',
      'Turn the host\'s rough notes below into a single polished paragraph (60-100 words).',
      'Use the details given — do not invent amenities, room counts, or facts not in the notes.',
      'No headings, no markdown, no quotation marks around the output — plain prose only.',
      '',
      params.propertyName ? `Property name: ${params.propertyName}` : '',
      params.city ? `City: ${params.city}` : '',
      `Host's notes: ${params.notes}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      this.logger.error(
        `Gemini description generation failed: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException({
        code: 'AI_GENERATION_FAILED',
        message: 'Failed to generate a description. Please try again or write one manually.',
      });
    }
  }

  /**
   * Answer a guest's question about a specific property, grounded only in
   * that property's actual details.
   */
  async answerFaq(params: {
    question: string;
    propertyContext: string;
  }): Promise<string> {
    const client = this.requireClient();
    const model = client.getGenerativeModel({ model: this.modelName });

    const prompt = [
      'You are a helpful assistant answering a prospective guest\'s question about a specific homestay/hotel listing.',
      'Answer ONLY using the property details below. If the answer isn\'t in these details, say you\'re not sure and suggest the guest contact the host directly — do not guess or invent information.',
      'Keep the answer to 1-3 short sentences.',
      '',
      'Property details:',
      params.propertyContext,
      '',
      `Guest question: ${params.question}`,
    ].join('\n');

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return text;
    } catch (error) {
      this.logger.error(`Gemini FAQ answer failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'AI_GENERATION_FAILED',
        message: 'Failed to answer that question right now. Please try again.',
      });
    }
  }
}
