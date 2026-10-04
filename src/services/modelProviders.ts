/**
 * ─── Multi-LLM ModelProvider Framework (OOP Class Hierarchy) ──────────────────
 * Modular, extensible provider architecture using Template Method & Strategy patterns.
 * Eliminates duplicate code across providers while supporting:
 *   • Dynamic Model Discovery: Live fetching from provider APIs (/models, /tags)
 *   • Custom Model ID Registration: Enter newly released or fine-tuned models
 *   • Unified JSON Validation & Telemetry Tracking
 *   • Automatic Graceful Fallbacks to Zero-Token Heuristic Scribe
 */

import type { HomeopathicCaseRecord, UserProfile } from "../types";
import { CLINIC, DOCTOR, STORAGE_KEYS } from "../config";
import { extractHomeopathicCaseRecord } from "./voiceStudio";
import { formatDateISO } from "../utils/format";

export type LLMProviderId =
  | "gemini"
  | "groq"
  | "openai"
  | "anthropic"
  | "ollama"
  | "builtin";

export interface ModelOption {
  id: string;
  name: string;
  isDefault?: boolean;
  contextWindow?: string;
  speedRating?: string;
  costTier?: string;
  badge?: string;
  isCustom?: boolean;
  discoveredAt?: string;
}

export interface LLMProviderConfig {
  id: LLMProviderId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  badge: string;
  models: ModelOption[];
  requiresApiKey: boolean;
  apiKeyStorageKey: string;
  envApiKeyName: string;
  apiHelpUrl: string;
  defaultEndpoint?: string;
}

export interface LLMGenerationResult {
  providerId: LLMProviderId;
  providerName: string;
  modelUsed: string;
  structuredCase: HomeopathicCaseRecord;
  latencyMs: number;
  source: "live-llm" | "fallback-engine";
  status: "success" | "fallback" | "error";
  rawResponseText?: string;
  errorMessage?: string;
}

// ─── Classical Homeopathy Universal System Instruction ─────────────────────────
export const CLASSICAL_HOMEOPATHY_SYSTEM_PROMPT = `You are an expert AI medical scribe specializing in Classical Homeopathy with decades of clinical experience.
Your task is to process a raw speech-to-text transcript of a doctor-patient interaction and structure it into a precise, valid JSON format.
The input transcript might contain speech errors, natural conversational tangents, or overlapping dialogue.
Transcripts may originate from Indian or international languages (e.g. Telugu, Tamil, Kannada, Hindi, French, English) that were transcribed by VoiceStudio.
Clean up these nuances while preserving all clinically relevant facts.
Always output the final JSON values in English.

Map the transcript data strictly to the following JSON structure:
{
  "metadata": {
    "visiting_date": "YYYY-MM-DD",
    "visiting_time": "HH:MM",
    "speech_language": {
      "original": "Original Language if known, else English",
      "processed": "English"
    }
  },
  "doctor_details": {
    "doctor_id": "DOC-BK-001",
    "name": "${DOCTOR.TITLE}",
    "clinic_name": "${CLINIC.FULL_NAME}"
  },
  "patient_details": {
    "name": "",
    "age": null,
    "gender": "",
    "place_of_birth": null,
    "is_existing_patient": true
  },
  "patient_medical_history": {
    "past_illnesses": [
      { "condition": "", "onset_year": null, "status": "" }
    ],
    "family_history": [
      { "relation": "", "condition": "" }
    ],
    "drug_history": {
      "allopathic_medications": [
        { "drug_name": "", "dosage": "", "frequency": "", "purpose": "" }
      ],
      "previous_homeopathic_remedies": [
        { "remedy": "", "potency": "", "outcome": "" }
      ],
      "drug_allergies": []
    }
  },
  "homeopathic_case_analysis": {
    "chief_complaints": [
      {
        "location": "",
        "sensation": "",
        "modalities": {
          "aggravation": "",
          "amelioration": ""
        },
        "concomitants": ""
      }
    ],
    "generals_and_constitution": {
      "thermal_state": "Chilly" or "Hot" or "Ambothermal",
      "thirst": "",
      "cravings_aversions": {
        "cravings": [],
        "aversions": []
      },
      "sleep_and_dreams": "",
      "mental_emotional_state": ""
    }
  },
  "clinical_summary": {
    "conversation_summary": "",
    "miasmatic_predominance": "Psoric" or "Sycotic" or "Syphilitic" or "Tubercular" or "Acute"
  },
  "treatment_plan": {
    "medicines_suggested": [
      {
        "remedy_name": "",
        "potency": "",
        "dosage_form": "Globules (Size 30 cane sugar pills) or Dilution or Trituration",
        "frequency": "",
        "instructions": ""
      }
    ],
    "next_visit": {
      "recommended_date": "YYYY-MM-DD",
      "time_frame": ""
    }
  }
}

OUTPUT RULES:
1. Output ONLY the raw JSON object. Do not include markdown code block backticks (like \`\`\`json).
2. Fill all fields based on evidence in the transcript.
3. If a field is not mentioned, use sensible homeopathic clinical defaults or null.`;

// ─── Base Class: BaseModelProvider (Template Method & Common Logic) ───────────
export abstract class BaseModelProvider implements LLMProviderConfig {
  public readonly id: LLMProviderId;
  public readonly name: string;
  public readonly shortName: string;
  public readonly description: string;
  public readonly icon: string;
  public readonly badge: string;
  public readonly requiresApiKey: boolean;
  public readonly apiKeyStorageKey: string;
  public readonly envApiKeyName: string;
  public readonly apiHelpUrl: string;
  public defaultEndpoint?: string;

  public get models(): ModelOption[] {
    return this.getAllModels();
  }

  protected defaultModels: ModelOption[];
  protected dynamicModels: ModelOption[] = [];
  protected customModels: ModelOption[] = [];

  constructor(config: LLMProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.shortName = config.shortName;
    this.description = config.description;
    this.icon = config.icon;
    this.badge = config.badge;
    this.requiresApiKey = config.requiresApiKey;
    this.apiKeyStorageKey = config.apiKeyStorageKey;
    this.envApiKeyName = config.envApiKeyName;
    this.apiHelpUrl = config.apiHelpUrl;
    this.defaultEndpoint = config.defaultEndpoint;
    this.defaultModels = config.models;

    this.loadPersistedModels();
  }

  // ── Abstract Methods implemented by specific provider adapters ───────────────
  protected abstract executeRaw(
    transcript: string,
    model: string,
    apiKey: string,
    customEndpoint?: string
  ): Promise<string>;

  public abstract testConnection(
    apiKey: string,
    customEndpoint?: string
  ): Promise<{ ok: boolean; latencyMs: number; message: string }>;

  public abstract fetchLiveModels(
    apiKey: string,
    customEndpoint?: string
  ): Promise<ModelOption[]>;

  // ── Template Method: Reusable execution pipeline for all providers ───────────
  public async execute(
    transcript: string,
    model: string,
    apiKey: string,
    originalLanguage: string = "Telugu",
    patient?: UserProfile | null,
    customEndpoint?: string
  ): Promise<LLMGenerationResult> {
    const startTime = performance.now();

    try {
      const rawText = await this.executeRaw(transcript, model, apiKey, customEndpoint);
      const latencyMs = Math.round(performance.now() - startTime);

      // Clean markdown code blocks from response
      const cleanJson = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      const structuredCase = this.sanitizeAndEnforceSchema(parsed, originalLanguage, patient);

      return {
        providerId: this.id,
        providerName: this.name,
        modelUsed: model,
        structuredCase,
        latencyMs,
        source: "live-llm",
        status: "success",
        rawResponseText: rawText,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      console.warn(`[${this.name}] Execution error:`, err);

      // Graceful fallback to deterministic engine
      const fallbackCase = extractHomeopathicCaseRecord(transcript, originalLanguage, patient);
      return {
        providerId: this.id,
        providerName: this.name,
        modelUsed: model,
        structuredCase: fallbackCase,
        latencyMs,
        source: "fallback-engine",
        status: "fallback",
        errorMessage: `${this.name} error (${err?.message || "Execution failed"}). Heuristic fallback applied.`,
      };
    }
  }

  // ── Dynamic & Custom Model Management ────────────────────────────────────────
  public getAllModels(): ModelOption[] {
    const map = new Map<string, ModelOption>();

    // 1. Defaults
    for (const m of this.defaultModels) map.set(m.id, m);

    // 2. Dynamically discovered live models
    for (const m of this.dynamicModels) map.set(m.id, m);

    // 3. User custom models
    for (const m of this.customModels) map.set(m.id, m);

    return Array.from(map.values());
  }

  public addCustomModel(modelId: string, modelName?: string): ModelOption {
    const cleanId = modelId.trim();
    const existing = this.getAllModels().find((m) => m.id === cleanId);
    if (existing) return existing;

    const newModel: ModelOption = {
      id: cleanId,
      name: modelName?.trim() || cleanId,
      isCustom: true,
      costTier: "User Added",
      speedRating: "Custom Model",
      badge: "User Model",
    };

    this.customModels.push(newModel);
    this.persistCustomModels();
    return newModel;
  }

  public setDynamicModels(models: ModelOption[]): void {
    this.dynamicModels = models;
    this.persistDynamicModels();
  }

  private loadPersistedModels(): void {
    try {
      const customRaw = localStorage.getItem(`${STORAGE_KEYS.CUSTOM_MODELS_PREFIX}${this.id}`);
      if (customRaw) this.customModels = JSON.parse(customRaw);

      const dynamicRaw = localStorage.getItem(`${STORAGE_KEYS.DYNAMIC_MODELS_PREFIX}${this.id}`);
      if (dynamicRaw) this.dynamicModels = JSON.parse(dynamicRaw);
    } catch (_e) {}
  }

  private persistCustomModels(): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.CUSTOM_MODELS_PREFIX}${this.id}`, JSON.stringify(this.customModels));
    } catch (_e) {}
  }

  private persistDynamicModels(): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.DYNAMIC_MODELS_PREFIX}${this.id}`, JSON.stringify(this.dynamicModels));
    } catch (_e) {}
  }

  // ── Reusable Schema Validation Helper ────────────────────────────────────────
  protected sanitizeAndEnforceSchema(
    parsed: any,
    originalLanguage: string,
    patient?: UserProfile | null
  ): HomeopathicCaseRecord {
    const today = formatDateISO();
    const time = new Date().toTimeString().slice(0, 5);

    return {
      metadata: {
        interaction_id: parsed?.metadata?.interaction_id || `INT-VS-${Date.now()}`,
        visiting_date: parsed?.metadata?.visiting_date || today,
        visiting_time: parsed?.metadata?.visiting_time || time,
        speech_language: {
          original: parsed?.metadata?.speech_language?.original || originalLanguage || "Telugu",
          processed: "English",
        },
      },
      doctor_details: {
        doctor_id: parsed?.doctor_details?.doctor_id || "DOC-BK-001",
        name: parsed?.doctor_details?.name || CLINIC.DOCTOR_TITLE,
        clinic_name: parsed?.doctor_details?.clinic_name || CLINIC.FULL_NAME,
      },
      patient_details: {
        name: parsed?.patient_details?.name || patient?.name || "Patient",
        age: parsed?.patient_details?.age ?? (patient?.role === "patient" ? 34 : null),
        gender: parsed?.patient_details?.gender || "Not specified",
        place_of_birth: parsed?.patient_details?.place_of_birth || null,
        is_existing_patient: parsed?.patient_details?.is_existing_patient ?? true,
      },
      patient_medical_history: {
        past_illnesses: Array.isArray(parsed?.patient_medical_history?.past_illnesses)
          ? parsed.patient_medical_history.past_illnesses
          : [],
        family_history: Array.isArray(parsed?.patient_medical_history?.family_history)
          ? parsed.patient_medical_history.family_history
          : [],
        drug_history: {
          allopathic_medications: Array.isArray(parsed?.patient_medical_history?.drug_history?.allopathic_medications)
            ? parsed.patient_medical_history.drug_history.allopathic_medications
            : [],
          previous_homeopathic_remedies: Array.isArray(parsed?.patient_medical_history?.drug_history?.previous_homeopathic_remedies)
            ? parsed.patient_medical_history.drug_history.previous_homeopathic_remedies
            : [],
          drug_allergies: Array.isArray(parsed?.patient_medical_history?.drug_history?.drug_allergies)
            ? parsed.patient_medical_history.drug_history.drug_allergies
            : patient?.knownAllergies || [],
        },
      },
      homeopathic_case_analysis: {
        chief_complaints: Array.isArray(parsed?.homeopathic_case_analysis?.chief_complaints) &&
          parsed.homeopathic_case_analysis.chief_complaints.length > 0
          ? parsed.homeopathic_case_analysis.chief_complaints.map((cc: any) => ({
              location: cc.location || "General",
              sensation: cc.sensation || "Discomfort",
              modalities: {
                aggravation: cc?.modalities?.aggravation || "Mental fatigue and cold exposure",
                amelioration: cc?.modalities?.amelioration || "Rest and warm applications",
              },
              concomitants: cc.concomitants || "",
            }))
          : [
              {
                location: "Gastrointestinal and head",
                sensation: "Heaviness and throbbing soreness",
                modalities: {
                  aggravation: "Mental fatigue and cold air",
                  amelioration: "Rest and warm drinks",
                },
                concomitants: "Nausea on rising",
              },
            ],
        generals_and_constitution: {
          thermal_state: parsed?.homeopathic_case_analysis?.generals_and_constitution?.thermal_state || "Chilly",
          thirst: parsed?.homeopathic_case_analysis?.generals_and_constitution?.thirst || "Moderate thirst for warm water",
          cravings_aversions: {
            cravings: Array.isArray(parsed?.homeopathic_case_analysis?.generals_and_constitution?.cravings_aversions?.cravings)
              ? parsed.homeopathic_case_analysis.generals_and_constitution.cravings_aversions.cravings
              : ["Warm drinks", "Sweets"],
            aversions: Array.isArray(parsed?.homeopathic_case_analysis?.generals_and_constitution?.cravings_aversions?.aversions)
              ? parsed.homeopathic_case_analysis.generals_and_constitution.cravings_aversions.aversions
              : ["Cold milk"],
          },
          sleep_and_dreams: parsed?.homeopathic_case_analysis?.generals_and_constitution?.sleep_and_dreams || "Wakes around 3:00 AM",
          mental_emotional_state: parsed?.homeopathic_case_analysis?.generals_and_constitution?.mental_emotional_state || "Conscientious, fastidious, health anxiety",
        },
      },
      clinical_summary: {
        conversation_summary: parsed?.clinical_summary?.conversation_summary || "Doctor-patient Classical Homeopathy consultation processed and structured.",
        miasmatic_predominance: parsed?.clinical_summary?.miasmatic_predominance || "Psoric",
      },
      treatment_plan: {
        medicines_suggested: Array.isArray(parsed?.treatment_plan?.medicines_suggested) &&
          parsed.treatment_plan.medicines_suggested.length > 0
          ? parsed.treatment_plan.medicines_suggested.map((m: any) => ({
              remedy_name: m.remedy_name || "Nux Vomica",
              potency: m.potency || "200C",
              dosage_form: m.dosage_form || "Globules (Size 30 cane sugar pills)",
              frequency: m.frequency || "Twice daily",
              instructions: m.instructions || "Take 4 globules on clean tongue at bedtime.",
            }))
          : [
              {
                remedy_name: "Nux Vomica",
                potency: "200C",
                dosage_form: "Globules (Size 30 cane sugar pills)",
                frequency: "Twice daily",
                instructions: "Take 4 globules on clean tongue at bedtime. Avoid coffee 30 mins before.",
              },
            ],
        next_visit: {
          recommended_date: parsed?.treatment_plan?.next_visit?.recommended_date || formatDateISO(new Date(Date.now() + 14 * 86400000)),
          time_frame: parsed?.treatment_plan?.next_visit?.time_frame || "In 14 days",
        },
      },
      patient_visibility_permissions: {
        share_remedies: true,
        share_modalities: true,
        share_lifestyle: true,
        share_mental_state: false,
        share_miasm: false,
        share_conversation_summary: false,
      },
    };
  }
}

// ─── Subclass 1: OpenAILikeProvider (Reused by Groq, OpenAI, Together, DeepSeek)
export class OpenAILikeProvider extends BaseModelProvider {
  protected defaultBaseUrl: string;

  constructor(config: LLMProviderConfig, defaultBaseUrl: string) {
    super(config);
    this.defaultBaseUrl = defaultBaseUrl;
  }

  protected getBaseUrl(customEndpoint?: string): string {
    return (customEndpoint || this.defaultEndpoint || this.defaultBaseUrl).replace(/\/$/, "");
  }

  protected async executeRaw(
    transcript: string,
    model: string,
    apiKey: string,
    customEndpoint?: string
  ): Promise<string> {
    const url = `${this.getBaseUrl(customEndpoint)}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: CLASSICAL_HOMEOPATHY_SYSTEM_PROMPT },
          { role: "user", content: `Clinical transcript to structure:\n\n${transcript}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "{}";
  }

  public async testConnection(
    apiKey: string,
    customEndpoint?: string
  ): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const model = this.getAllModels()[0]?.id || "default";
      await this.executeRaw("Patient with headache and sour stomach.", model, apiKey, customEndpoint);
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: true, latencyMs, message: `Connected to ${this.name} (${model}) in ${latencyMs}ms.` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, latencyMs, message: err?.message || "Connection failed." };
    }
  }

  public async fetchLiveModels(
    apiKey: string,
    customEndpoint?: string
  ): Promise<ModelOption[]> {
    if (!apiKey) return this.getAllModels();

    try {
      const url = `${this.getBaseUrl(customEndpoint)}/models`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) return this.getAllModels();

      const data = await response.json();
      if (!Array.isArray(data.data)) return this.getAllModels();

      // Filter and map to ModelOption
      const liveList: ModelOption[] = data.data
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          speedRating: "Live API Model",
          costTier: "Active",
          discoveredAt: new Date().toLocaleTimeString(),
        }))
        .slice(0, 20); // Keep top 20 models

      this.setDynamicModels(liveList);
      return this.getAllModels();
    } catch (_e) {
      return this.getAllModels();
    }
  }
}

// ─── Subclass 2: Google Gemini Provider ───────────────────────────────────────
export class GeminiProvider extends BaseModelProvider {
  protected async executeRaw(
    transcript: string,
    model: string,
    apiKey: string
  ): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `Clinical transcript to structure:\n\n${transcript}` }],
          },
        ],
        systemInstruction: {
          parts: [{ text: CLASSICAL_HOMEOPATHY_SYSTEM_PROMPT }],
        },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  }

  public async testConnection(
    apiKey: string
  ): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const model = this.getAllModels()[0]?.id || "gemini-2.5-flash";
      await this.executeRaw("Patient with dyspepsia. Prescribe Nux.", model, apiKey);
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: true, latencyMs, message: `Connected to Gemini (${model}) in ${latencyMs}ms.` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, latencyMs, message: err?.message || "Gemini connection failed." };
    }
  }

  public async fetchLiveModels(apiKey: string): Promise<ModelOption[]> {
    if (!apiKey) return this.getAllModels();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return this.getAllModels();

      const data = await response.json();
      if (!Array.isArray(data.models)) return this.getAllModels();

      const liveList: ModelOption[] = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => {
          const cleanId = m.name?.replace("models/", "") || m.name;
          return {
            id: cleanId,
            name: m.displayName || cleanId,
            speedRating: "Live API Model",
            costTier: "Google GenAI",
            discoveredAt: new Date().toLocaleTimeString(),
          };
        });

      this.setDynamicModels(liveList);
      return this.getAllModels();
    } catch (_e) {
      return this.getAllModels();
    }
  }
}

// ─── Subclass 3: Anthropic Claude Provider (Native Messages API) ─────────────
export class AnthropicProvider extends BaseModelProvider {
  protected defaultBaseUrl: string = "https://api.anthropic.com/v1";

  protected getBaseUrl(customEndpoint?: string): string {
    return (customEndpoint || this.defaultEndpoint || this.defaultBaseUrl).replace(/\/$/, "");
  }

  protected async executeRaw(
    transcript: string,
    model: string,
    apiKey: string,
    customEndpoint?: string
  ): Promise<string> {
    const url = `${this.getBaseUrl(customEndpoint)}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system: CLASSICAL_HOMEOPATHY_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Clinical transcript to structure:\n\n${transcript}` },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "{}";
  }

  public async testConnection(
    apiKey: string,
    customEndpoint?: string
  ): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const model = this.getAllModels()[0]?.id || "claude-3-5-haiku-20241022";
      await this.executeRaw("Patient with sour stomach.", model, apiKey, customEndpoint);
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: true, latencyMs, message: `Connected to Claude (${model}) in ${latencyMs}ms.` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, latencyMs, message: err?.message || "Anthropic connection failed." };
    }
  }

  public async fetchLiveModels(
    apiKey: string,
    customEndpoint?: string
  ): Promise<ModelOption[]> {
    if (!apiKey) return this.getAllModels();
    try {
      const url = `${this.getBaseUrl(customEndpoint)}/models`;
      const response = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!response.ok) return this.getAllModels();
      const data = await response.json();
      if (!Array.isArray(data.data)) return this.getAllModels();
      const liveList: ModelOption[] = data.data
        .map((m: any) => ({
          id: m.id,
          name: m.display_name || m.id,
          speedRating: "Live Claude Model",
          costTier: "Active",
          discoveredAt: new Date().toLocaleTimeString(),
        }))
        .slice(0, 15);
      this.setDynamicModels(liveList);
      return this.getAllModels();
    } catch (_e) {
      return this.getAllModels();
    }
  }
}

// ─── Subclass 4: Local Ollama Provider (On-Premises / ABDM / HIPAA) ───────────
export class OllamaProvider extends BaseModelProvider {
  protected getEndpoint(customEndpoint?: string): string {
    return (customEndpoint || this.defaultEndpoint || "http://127.0.0.1:11434").replace(/\/$/, "");
  }

  protected async executeRaw(
    transcript: string,
    model: string,
    _apiKey: string,
    customEndpoint?: string
  ): Promise<string> {
    const url = `${this.getEndpoint(customEndpoint)}/api/chat`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: CLASSICAL_HOMEOPATHY_SYSTEM_PROMPT },
          { role: "user", content: `Clinical transcript to structure:\n\n${transcript}` },
        ],
        format: "json",
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || "{}";
  }

  public async testConnection(
    _apiKey: string,
    customEndpoint?: string
  ): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const url = `${this.getEndpoint(customEndpoint)}/api/tags`;
      const res = await fetch(url);
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        return { ok: true, latencyMs, message: `Local Ollama is online (${latencyMs}ms).` };
      }
      return { ok: false, latencyMs, message: `Ollama returned HTTP ${res.status}` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, latencyMs, message: `Could not reach Ollama at ${this.getEndpoint(customEndpoint)}.` };
    }
  }

  public async fetchLiveModels(
    _apiKey: string,
    customEndpoint?: string
  ): Promise<ModelOption[]> {
    try {
      const url = `${this.getEndpoint(customEndpoint)}/api/tags`;
      const response = await fetch(url);
      if (!response.ok) return this.getAllModels();

      const data = await response.json();
      if (!Array.isArray(data.models)) return this.getAllModels();

      const liveList: ModelOption[] = data.models.map((m: any) => ({
        id: m.name,
        name: `${m.name} (${Math.round((m.size || 0) / (1024 * 1024 * 1024))}GB)`,
        speedRating: "Installed Locally",
        costTier: "Local GPU",
        discoveredAt: new Date().toLocaleTimeString(),
      }));

      this.setDynamicModels(liveList);
      return this.getAllModels();
    } catch (_e) {
      return this.getAllModels();
    }
  }
}

// ─── Subclass 4: Built-in Clinical Fallback (Zero-Token / Offline) ─────────────
export class BuiltinClinicalProvider extends BaseModelProvider {
  protected async executeRaw(transcript: string, _m: string, _k: string): Promise<string> {
    const record = extractHomeopathicCaseRecord(transcript, "English");
    return JSON.stringify(record);
  }

  public async testConnection(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    return { ok: true, latencyMs: 1, message: "Built-in clinical heuristic engine online." };
  }

  public async fetchLiveModels(): Promise<ModelOption[]> {
    return this.getAllModels();
  }
}

// ─── Factory: Provider Registry Initializer ───────────────────────────────────
export const PROVIDER_INSTANCES: Record<LLMProviderId, BaseModelProvider> = {
  gemini: new GeminiProvider({
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    description: "Native JSON schema mode with ultra-low latency & generous free tier",
    icon: "✨",
    badge: "Recommended Free Tier",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", isDefault: true, speedRating: "⚡ Ultra-Fast (~350ms)", costTier: "Free Tier Available", badge: "Optimal Scribe" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", speedRating: "⚡ Fast", costTier: "Free Tier" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", speedRating: "Deep Reasoning", costTier: "Standard" },
    ],
    requiresApiKey: true,
    apiKeyStorageKey: STORAGE_KEYS.LLM_KEY_GEMINI,
    envApiKeyName: "VITE_GEMINI_API_KEY",
    apiHelpUrl: "https://aistudio.google.com/app/apikey",
  }),

  groq: new OpenAILikeProvider(
    {
      id: "groq",
      name: "Groq Cloud (LPU)",
      shortName: "Groq",
      description: "Industry-leading 500+ tok/s LPUs with open LLaMA 3.3 models & Whisper",
      icon: "⚡",
      badge: "Ultra-Low Latency",
      models: [
        { id: "llama-3.3-70b-versatile", name: "LLaMA 3.3 70B Versatile", isDefault: true, speedRating: "⚡ Instant (~220ms)", costTier: "Free Tier (High RPS)", badge: "Fastest Scribe" },
        { id: "llama-3.1-8b-instant", name: "LLaMA 3.1 8B Instant", speedRating: "⚡ Microsecond (~120ms)", costTier: "Free Tier" },
        { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B MoE", speedRating: "⚡ Fast", costTier: "Free Tier" },
      ],
      requiresApiKey: true,
      apiKeyStorageKey: STORAGE_KEYS.LLM_KEY_GROQ,
      envApiKeyName: "VITE_GROQ_API_KEY",
      apiHelpUrl: "https://console.groq.com/keys",
    },
    "https://api.groq.com/openai/v1"
  ),

  openai: new OpenAILikeProvider(
    {
      id: "openai",
      name: "OpenAI GPT",
      shortName: "OpenAI",
      description: "Enterprise clinical entity extraction with GPT-4o JSON mode",
      icon: "🟢",
      badge: "Enterprise Standard",
      models: [
        { id: "gpt-4o-mini", name: "GPT-4o Mini", isDefault: true, speedRating: "Fast (~450ms)", costTier: "Low Cost", badge: "Balanced" },
        { id: "gpt-4o", name: "GPT-4o Omni", speedRating: "Advanced Reasoning", costTier: "Premium" },
      ],
      requiresApiKey: true,
      apiKeyStorageKey: STORAGE_KEYS.LLM_KEY_OPENAI,
      envApiKeyName: "VITE_OPENAI_API_KEY",
      apiHelpUrl: "https://platform.openai.com/api-keys",
    },
    "https://api.openai.com/v1"
  ),

  anthropic: new AnthropicProvider({
    id: "anthropic",
    name: "Anthropic Claude",
    shortName: "Claude",
    description: "Nuanced medical reasoning with Claude 3.5 Sonnet & Haiku",
    icon: "🧠",
    badge: "Deep Reasoning",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", isDefault: true, speedRating: "Comprehensive", costTier: "Standard" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", speedRating: "Fast (~320ms)", costTier: "Low Cost" },
    ],
    requiresApiKey: true,
    apiKeyStorageKey: STORAGE_KEYS.LLM_KEY_ANTHROPIC,
    envApiKeyName: "VITE_ANTHROPIC_API_KEY",
    apiHelpUrl: "https://console.anthropic.com/settings/keys",
  }),

  ollama: new OllamaProvider({
    id: "ollama",
    name: "Local Ollama / On-Premise",
    shortName: "Ollama",
    description: "100% On-premises HIPAA / ABDM privacy. Zero data leaves clinic network",
    icon: "🏠",
    badge: "100% Private / HIPAA",
    models: [
      { id: "llama3.3", name: "Llama 3.3 (Local)", isDefault: true, speedRating: "Local GPU", costTier: "100% Free" },
      { id: "meditron", name: "Meditron (Clinical)", speedRating: "Local Engine", costTier: "Free" },
    ],
    requiresApiKey: false,
    apiKeyStorageKey: STORAGE_KEYS.LLM_ENDPOINT_OLLAMA,
    envApiKeyName: "VITE_OLLAMA_ENDPOINT",
    apiHelpUrl: "https://ollama.com",
    defaultEndpoint: "http://127.0.0.1:11434",
  }),

  builtin: new BuiltinClinicalProvider({
    id: "builtin",
    name: "Built-in Clinical Heuristic",
    shortName: "Built-in",
    description: "Deterministic in-browser classical homeopathic parsing engine (Zero tokens)",
    icon: "🛡️",
    badge: "Zero Setup / Offline",
    models: [
      { id: "deterministic-homeo-v1", name: "Deterministic Homeo Engine v1", isDefault: true, speedRating: "⚡ Instant (<10ms)", costTier: "0 Tokens" },
    ],
    requiresApiKey: false,
    apiKeyStorageKey: "",
    envApiKeyName: "",
    apiHelpUrl: "",
  }),
};

// Backwards-compatible MODEL_PROVIDERS config dictionary
export const MODEL_PROVIDERS: Record<LLMProviderId, LLMProviderConfig> = {
  gemini: PROVIDER_INSTANCES.gemini,
  groq: PROVIDER_INSTANCES.groq,
  openai: PROVIDER_INSTANCES.openai,
  anthropic: PROVIDER_INSTANCES.anthropic,
  ollama: PROVIDER_INSTANCES.ollama,
  builtin: PROVIDER_INSTANCES.builtin,
};

// ─── Model Provider Manager (Singleton Controller) ────────────────────────────
class ModelProviderManager {
  private activeProviderId: LLMProviderId = "gemini";
  private activeModelByProvider: Record<LLMProviderId, string> = {
    gemini: "gemini-2.5-flash",
    groq: "llama-3.3-70b-versatile",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet-20241022",
    ollama: "llama3.3",
    builtin: "deterministic-homeo-v1",
  };

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      const savedProvider = localStorage.getItem(STORAGE_KEYS.ACTIVE_LLM_PROVIDER) as LLMProviderId;
      if (savedProvider && PROVIDER_INSTANCES[savedProvider]) {
        this.activeProviderId = savedProvider;
      }
      const savedModels = localStorage.getItem(STORAGE_KEYS.ACTIVE_LLM_MODELS);
      if (savedModels) {
        this.activeModelByProvider = {
          ...this.activeModelByProvider,
          ...JSON.parse(savedModels),
        };
      }
    } catch (_e) {}
  }

  private persistState(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LLM_PROVIDER, this.activeProviderId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LLM_MODELS, JSON.stringify(this.activeModelByProvider));
    } catch (_e) {}
  }

  public getProvider(id: LLMProviderId = this.activeProviderId): BaseModelProvider {
    return PROVIDER_INSTANCES[id] || PROVIDER_INSTANCES.gemini;
  }

  public getActiveProviderId(): LLMProviderId {
    return this.activeProviderId;
  }

  public getActiveModelId(providerId: LLMProviderId = this.activeProviderId): string {
    const prov = this.getProvider(providerId);
    const existing = this.activeModelByProvider[providerId];
    if (existing && prov.getAllModels().some((m) => m.id === existing)) {
      return existing;
    }
    return prov.getAllModels()[0]?.id || "default";
  }

  public setActiveProvider(providerId: LLMProviderId, modelId?: string): void {
    if (PROVIDER_INSTANCES[providerId]) {
      this.activeProviderId = providerId;
      if (modelId) {
        this.activeModelByProvider[providerId] = modelId;
      }
      this.persistState();
    }
  }

  public setActiveModel(providerId: LLMProviderId, modelId: string): void {
    this.activeModelByProvider[providerId] = modelId;
    this.persistState();
  }

  public getApiKey(providerId: LLMProviderId): string {
    const provider = this.getProvider(providerId);
    if (!provider.requiresApiKey) return "";

    try {
      const local = localStorage.getItem(provider.apiKeyStorageKey);
      if (local && local.trim()) return local.trim();
    } catch (_e) {}

    const envKey = (import.meta.env as any)?.[provider.envApiKeyName];
    if (envKey && typeof envKey === "string" && envKey.trim()) {
      return envKey.trim();
    }

    return "";
  }

  public setApiKey(providerId: LLMProviderId, key: string): void {
    const provider = this.getProvider(providerId);
    if (provider && provider.apiKeyStorageKey) {
      try {
        localStorage.setItem(provider.apiKeyStorageKey, key.trim());
      } catch (_e) {}
    }
  }

  public getCustomEndpoint(providerId: LLMProviderId): string {
    if (providerId === "ollama") {
      try {
        return (
          localStorage.getItem(PROVIDER_INSTANCES.ollama.apiKeyStorageKey) ||
          (import.meta.env as any)?.VITE_OLLAMA_ENDPOINT ||
          "http://127.0.0.1:11434"
        );
      } catch (_e) {
        return "http://127.0.0.1:11434";
      }
    }
    return "";
  }

  public setCustomEndpoint(providerId: LLMProviderId, endpoint: string): void {
    if (providerId === "ollama") {
      try {
        localStorage.setItem(PROVIDER_INSTANCES.ollama.apiKeyStorageKey, endpoint.trim());
      } catch (_e) {}
    }
  }

  public async fetchLiveModelsForProvider(providerId: LLMProviderId): Promise<ModelOption[]> {
    const provider = this.getProvider(providerId);
    const apiKey = this.getApiKey(providerId);
    const endpoint = this.getCustomEndpoint(providerId);
    return await provider.fetchLiveModels(apiKey, endpoint);
  }

  public addCustomModelToProvider(providerId: LLMProviderId, modelId: string): ModelOption {
    const provider = this.getProvider(providerId);
    const added = provider.addCustomModel(modelId);
    this.setActiveModel(providerId, added.id);
    return added;
  }

  public async testProviderConnection(providerId: LLMProviderId): Promise<{
    ok: boolean;
    latencyMs: number;
    message: string;
  }> {
    const provider = this.getProvider(providerId);
    const apiKey = this.getApiKey(providerId);
    const endpoint = this.getCustomEndpoint(providerId);

    if (provider.requiresApiKey && !apiKey) {
      return {
        ok: false,
        latencyMs: 0,
        message: `API Key missing for ${provider.name}. Please enter your key in settings.`,
      };
    }

    return await provider.testConnection(apiKey, endpoint);
  }

  public async structureConsultation(
    transcript: string,
    originalLanguage: string = "Telugu",
    patient?: UserProfile | null
  ): Promise<LLMGenerationResult> {
    const provider = this.getProvider();
    const model = this.getActiveModelId();
    const apiKey = this.getApiKey(this.activeProviderId);
    const endpoint = this.getCustomEndpoint(this.activeProviderId);

    if (provider.requiresApiKey && !apiKey) {
      const fallbackCase = extractHomeopathicCaseRecord(transcript, originalLanguage, patient);
      return {
        providerId: "builtin",
        providerName: PROVIDER_INSTANCES.builtin.name,
        modelUsed: "deterministic-homeo-v1",
        structuredCase: fallbackCase,
        latencyMs: 5,
        source: "fallback-engine",
        status: "fallback",
        errorMessage: `No API key for ${provider.name}. Switched automatically to Built-in Heuristic Scribe.`,
      };
    }

    return await provider.execute(transcript, model, apiKey, originalLanguage, patient, endpoint);
  }
}

export const modelProviderManager = new ModelProviderManager();
