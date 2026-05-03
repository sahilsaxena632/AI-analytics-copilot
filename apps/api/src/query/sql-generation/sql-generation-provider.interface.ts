export type SqlGenerationProviderId = "gemini" | "groq";

export interface SqlGenerationProviderRequest {
  /** High-level system instructions (dialect rules, JSON shape). */
  systemPrompt: string;
  /** User/task payload (question + schema JSON). */
  userPrompt: string;
  timeoutMs: number;
}

export interface SqlGenerationProviderResult {
  rawText: string;
  durationMs: number;
}

/**
 * Pluggable LLM backend for NL→SQL. Controllers depend on {@link SqlGenerationService}, not on this.
 */
export interface SqlGenerationProvider {
  readonly id: SqlGenerationProviderId;

  isConfigured(): boolean;

  complete(request: SqlGenerationProviderRequest): Promise<SqlGenerationProviderResult>;
}
