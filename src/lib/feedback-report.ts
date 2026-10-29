import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import {
  calculateFeedbackCategoryMetrics,
  classifyQualityTrend,
  FEEDBACK_CATEGORIES,
  FeedbackCategory,
  FeedbackMetricRecord,
} from "./feedback-analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

function isFeedbackCategory(value: string): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.includes(value as FeedbackCategory);
}

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function getFeedbackReport() {
  const now = new Date();
  const feedbackRows = await prisma.questionFeedback.findMany({
    include: {
      promptUses: {
        select: {
          usedAt: true,
          implementedAt: true,
          generatedQuestionIds: true,
        },
      },
      question: { select: { stem: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const feedback: FeedbackMetricRecord[] = feedbackRows.flatMap((row) =>
    isFeedbackCategory(row.category)
      ? [
          {
            id: row.id,
            category: row.category,
            difficulty: row.difficulty,
            domain: row.domain,
            topic: row.topic,
            createdAt: row.createdAt,
            promptUses: row.promptUses,
            resolvedAt: row.resolvedAt,
          },
        ]
      : []
  );

  const generatedQuestionIds = [
    ...new Set(feedback.flatMap((item) => item.promptUses.flatMap((use) => use.generatedQuestionIds))),
  ];
  const generatedQuestions = generatedQuestionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: generatedQuestionIds } },
        select: {
          id: true,
          answers: {
            select: { attempt: { select: { finishedAt: true } } },
          },
        },
      })
    : [];
  const exposureDates = new Map(
    generatedQuestions.map((question) => [
      question.id,
      question.answers.flatMap((answer) => (answer.attempt.finishedAt ? [answer.attempt.finishedAt] : [])),
    ])
  );

  const recurrentFeedbackIds = new Set<string>();
  const resolvedFeedbackIds = new Set<string>();
  for (const item of feedback) {
    const latestImplementation = item.promptUses
      .map((use) => use.implementedAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (!latestImplementation) continue;

    const laterFeedback = feedback.some(
      (other) =>
        other.id !== item.id &&
        other.category === item.category &&
        other.domain === item.domain &&
        other.topic === item.topic &&
        other.createdAt > latestImplementation
    );
    if (laterFeedback) recurrentFeedbackIds.add(item.id);

    const exposedCount = new Set(
      item.promptUses
        .filter((use) => use.implementedAt !== null)
        .flatMap((use) => use.generatedQuestionIds)
        .filter((questionId) =>
          (exposureDates.get(questionId) ?? []).some((date) => date > latestImplementation)
        )
    ).size;
    if (!laterFeedback && exposedCount >= 5) resolvedFeedbackIds.add(item.id);
  }

  const resolutionUpdates = feedback.map((item) =>
    prisma.questionFeedback.updateMany({
      where: {
        id: item.id,
        ...(resolvedFeedbackIds.has(item.id)
          ? { resolvedAt: null }
          : { resolvedAt: { not: null } }),
      },
      data: { resolvedAt: resolvedFeedbackIds.has(item.id) ? now : null },
    })
  );
  if (resolutionUpdates.length > 0) await prisma.$transaction(resolutionUpdates);
  feedback.forEach((item) => {
    item.resolvedAt = resolvedFeedbackIds.has(item.id) ? now : null;
  });

  const categories = calculateFeedbackCategoryMetrics(feedback, recurrentFeedbackIds);
  const totals = categories.reduce(
    (result, category) => ({
      received: result.received + category.received,
      appliedInGeneration: result.appliedInGeneration + category.appliedInGeneration,
      pending: result.pending + category.pending,
      correctionsImplemented: result.correctionsImplemented + category.correctionsImplemented,
      resolvedWithEvidence: result.resolvedWithEvidence + category.resolvedWithEvidence,
    }),
    {
      received: 0,
      appliedInGeneration: 0,
      pending: 0,
      correctionsImplemented: 0,
      resolvedWithEvidence: 0,
    }
  );

  const currentStart = new Date(now.getTime() - 30 * DAY_MS);
  const previousStart = new Date(now.getTime() - 60 * DAY_MS);
  const [currentExposures, previousExposures] = await Promise.all([
    prisma.examAnswer.count({ where: { attempt: { finishedAt: { gte: currentStart } } } }),
    prisma.examAnswer.count({
      where: { attempt: { finishedAt: { gte: previousStart, lt: currentStart } } },
    }),
  ]);
  const currentIssues = feedback.filter((item) => item.createdAt >= currentStart).length;
  const previousIssues = feedback.filter(
    (item) => item.createdAt >= previousStart && item.createdAt < currentStart
  ).length;
  const currentRate =
    currentExposures > 0 ? Math.round((currentIssues / currentExposures) * 1000) / 10 : null;
  const previousRate =
    previousExposures > 0 ? Math.round((previousIssues / previousExposures) * 1000) / 10 : null;
  const enoughTrendData =
    currentExposures >= 25 &&
    previousExposures >= 25 &&
    currentIssues + previousIssues >= 5;

  const breakdowns = new Map<
    string,
    { category: FeedbackCategory; difficulty: string; domain: string; topic: string; received: number; applied: number }
  >();
  for (const item of feedback) {
    const key = [item.category, item.difficulty, item.domain, item.topic].join("|");
    const current = breakdowns.get(key) ?? {
      category: item.category,
      difficulty: item.difficulty,
      domain: item.domain,
      topic: item.topic,
      received: 0,
      applied: 0,
    };
    current.received++;
    if (item.promptUses.length > 0) current.applied++;
    breakdowns.set(key, current);
  }

  const report = {
    generatedAt: now.toISOString(),
    totals,
    categories,
    breakdowns: [...breakdowns.values()].sort((a, b) => b.received - a.received),
    trend: {
      current30DayRate: currentRate,
      previous30DayRate: previousRate,
      classification: classifyQualityTrend(
        enoughTrendData ? currentRate : null,
        enoughTrendData ? previousRate : null
      ),
      currentFeedbackCount: currentIssues,
      previousFeedbackCount: previousIssues,
      currentExposureCount: currentExposures,
      previousExposureCount: previousExposures,
      enoughData: enoughTrendData,
    },
    examples: feedbackRows
      .filter((row) => isFeedbackCategory(row.category))
      .slice(0, 6)
      .map((row) => ({
        category: row.category,
        topic: row.topic,
        domain: row.domain,
        difficulty: row.difficulty,
        questionExcerpt: row.question.stem.slice(0, 220),
        usedInGeneration: row.promptUses.length > 0,
        correctionImplemented: row.promptUses.some((use) => use.implementedAt !== null),
        resolvedWithEvidence: resolvedFeedbackIds.has(row.id),
      })),
  };

  const date = utcDay(now);
  const snapshotMetrics = JSON.parse(JSON.stringify(report)) as Prisma.InputJsonValue;
  await prisma.feedbackMetricSnapshot.upsert({
    where: { date },
    create: { date, metrics: snapshotMetrics },
    update: { metrics: snapshotMetrics },
  });
  const history = await prisma.feedbackMetricSnapshot.findMany({
    orderBy: { date: "desc" },
    take: 30,
    select: { date: true, metrics: true },
  });

  return {
    ...report,
    history: history.reverse().map((snapshot) => ({
      date: snapshot.date.toISOString(),
      metrics: snapshot.metrics,
    })),
  };
}
