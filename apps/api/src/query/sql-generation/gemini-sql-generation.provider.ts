import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SqlGenerationProvider, SqlGenerationProviderRequest, SqlGenerationProviderResult } from "./sql-generation-provider.interface";

@Injectable()
export class GeminiSqlGenerationProvider implements SqlGenerationProvider {
  readonly id = "gemini" as const;

  private readonly logger = new Logger(GeminiSqlGenerationProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("GEMINI_API_KEY")?.trim());
  }

  async complete(request: SqlGenerationProviderRequest): Promise<SqlGenerationProviderResult> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    const model = this.config.get<string>("GEMINI_MODEL")?.trim() || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const started = Date.now();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), request.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
        signal: ac.signal,
      });

      const durationMs = Date.now() - started;
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        this.logger.warn(`Gemini HTTP ${res.status}: ${errText.slice(0, 500)}`);
        throw new Error(`Gemini request failed (${res.status})`);
      }
      const body = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };
      if (body.error?.message) {
        throw new Error(body.error.message);
      }
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error("Gemini returned an empty response");
      }
      return { rawText: text, durationMs };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(`Gemini timed out after ${request.timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
