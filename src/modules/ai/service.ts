import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  aiFeedback,
  aiInteraction,
  aiRedactionAudit,
  aiSession,
} from "@/infrastructure/db/schema";
import type { AssistRequest, AssistResponse, RedactionReport } from "./contracts";
import { emitDomainEvent } from "../events/service";

function redactPII(input: string): { redacted: string; report: RedactionReport } {
  const rules: Array<{ name: string; regex: RegExp }> = [
    { name: "email", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { name: "phone", regex: /\+?\d[\d -]{7,}\d/g },
    { name: "card_like", regex: /\b\d{12,19}\b/g },
  ];

  let output = input;
  let count = 0;
  const appliedRules: string[] = [];

  for (const rule of rules) {
    const matches = output.match(rule.regex);
    if (matches && matches.length > 0) {
      count += matches.length;
      appliedRules.push(rule.name);
      output = output.replace(rule.regex, "[REDACTED]");
    }
  }

  return {
    redacted: output,
    report: {
      redactionCount: count,
      appliedRules,
    },
  };
}

export async function assist(
  userId: string,
  organizationId: string | null,
  input: AssistRequest,
): Promise<AssistResponse> {
  if (input.consentToken.length < 8) {
    throw new Error("CONSENT_REQUIRED");
  }

  const startedAt = Date.now();
  const redactedPrompt = redactPII(input.prompt);

  // Stub response for v1: response generation is separated from persistence and policy.
  const generatedResponse = `Assistant summary (${input.contextScope}): ${redactedPrompt.redacted.slice(0, 600)}`;
  const redactedResponse = redactPII(generatedResponse);

  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(aiSession)
      .values({
        userId,
        organizationId,
        consentGrantedAt: new Date(),
        contextScope: input.contextScope,
      })
      .returning();

    if (!session) throw new Error("FAILED_TO_CREATE_AI_SESSION");

    const [interaction] = await tx
      .insert(aiInteraction)
      .values({
        sessionId: session.id,
        promptRedacted: redactedPrompt.redacted,
        responseRedacted: redactedResponse.redacted,
        model: "policy-safe-stub-v1",
        tokenUsageJson: {
          inputTokens: redactedPrompt.redacted.length,
          outputTokens: redactedResponse.redacted.length,
        },
        latencyMs: Date.now() - startedAt,
      })
      .returning();

    if (!interaction) throw new Error("FAILED_TO_CREATE_AI_INTERACTION");

    await tx.insert(aiRedactionAudit).values({
      interactionId: interaction.id,
      redactionReportJson: {
        prompt: redactedPrompt.report,
        response: redactedResponse.report,
      },
    });

    await emitDomainEvent({
      eventType: "ai.assist_completed",
      aggregateType: "ai_session",
      aggregateId: session.id,
      payload: { interactionId: interaction.id, userId },
      channels: ["in_app"],
    });

    return {
      sessionId: session.id,
      interactionId: interaction.id,
      response: redactedResponse.redacted,
      redactionReport: {
        redactionCount:
          redactedPrompt.report.redactionCount +
          redactedResponse.report.redactionCount,
        appliedRules: [
          ...new Set([
            ...redactedPrompt.report.appliedRules,
            ...redactedResponse.report.appliedRules,
          ]),
        ],
      },
    };
  });
}

export async function getAiSessionForUser(sessionId: string, userId: string) {
  const session = await db.query.aiSession.findFirst({
    where: and(eq(aiSession.id, sessionId), eq(aiSession.userId, userId)),
  });
  if (!session) return null;

  const interactions = await db
    .select()
    .from(aiInteraction)
    .where(eq(aiInteraction.sessionId, sessionId))
    .orderBy(aiInteraction.createdAt);

  return { session, interactions };
}

export async function createAiFeedback(
  interactionId: string,
  userId: string,
  rating: number,
  feedbackText?: string,
) {
  const [saved] = await db
    .insert(aiFeedback)
    .values({
      interactionId,
      userId,
      rating,
      feedbackText: feedbackText ?? null,
    })
    .returning();

  return saved;
}
