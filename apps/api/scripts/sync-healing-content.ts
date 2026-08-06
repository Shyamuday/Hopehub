import 'dotenv/config';
import {
  LifestyleTipDifficulty,
  LifestyleTipStatus,
  LifestyleTipType,
  PracticeDifficulty,
  PracticeStatus,
  PracticeType
} from '@prisma/client';
import { prisma } from '../src/db.js';

type Article = {
  id: string;
  title: string;
  description: string;
  category: string[];
  readingTime: string;
  author: string;
  publishedDate: Date;
  introduction: string;
  sections: Array<{ heading: string; content: string; type?: string; items?: string[] }>;
  keyTakeaways: string[];
  conclusion: string;
  sources?: string[];
  isFeatured?: boolean;
};

type Exercise = {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string[];
  difficulty: string;
  duration: string;
  benefits: string[];
  steps: Array<Record<string, unknown>>;
  tips: string[];
  whenToUse: string[];
  contraindications?: string[];
  videoUrl?: string;
  audioUrl?: string;
  tags: string[];
};

type LifestyleTip = {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string[];
  difficulty: string;
  timeToImplement: string;
  benefits: string[];
  steps: Array<Record<string, unknown>>;
  tips: string[];
  scientificBasis?: string;
  commonMistakes?: string[];
  progressTracking?: string[];
  relatedTips?: string[];
  tags: string[];
};

type Recommendation = {
  assessmentType: string;
  scoreRange: { min: number; max: number };
  priority: number;
  recommendedExercises?: string[];
  recommendedTips?: string[];
};

type ContentModule = {
  ALL_ARTICLES?: Article[];
  ALL_EXERCISES?: Exercise[];
  ALL_LIFESTYLE_TIPS?: LifestyleTip[];
  EXERCISE_RECOMMENDATIONS?: Recommendation[];
  LIFESTYLE_TIP_RECOMMENDATIONS?: Recommendation[];
};

const SYNC_NOTE = 'Synced from Healing Web legacy content.';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function enumValue<T extends Record<string, string>>(
  source: T,
  value: string,
  fallback: T[keyof T]
) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return (Object.values(source).find((item) => item === normalized) ?? fallback) as T[keyof T];
}

function durationInMinutes(label: string) {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function toArticleContent(article: Article) {
  const sections = article.sections
    .map((section) => {
      const items = section.items?.length
        ? `\n${section.items.map((item) => `- ${item}`).join('\n')}`
        : '';
      return `## ${section.heading}\n\n${section.content}${items}`;
    })
    .join('\n\n');
  const takeaways = article.keyTakeaways.length
    ? `\n\n## Key takeaways\n\n${article.keyTakeaways.map((item) => `- ${item}`).join('\n')}`
    : '';
  const sources = article.sources?.length
    ? `\n\n## Sources\n\n${article.sources.map((item) => `- ${item}`).join('\n')}`
    : '';
  return `${article.introduction}\n\n${sections}${takeaways}\n\n## Conclusion\n\n${article.conclusion}${sources}`;
}

async function loadSourceData() {
  const [articlesModule, exercisesModule, tipsModule, exerciseRulesModule, tipRulesModule] =
    await Promise.all([
      import('../../healing-web/src/app/core/data/article-configs'),
      import('../../healing-web/src/app/core/data/exercise-configs'),
      import('../../healing-web/src/app/core/data/lifestyle-tip-configs'),
      import('../../healing-web/src/app/core/data/exercise-recommendations'),
      import('../../healing-web/src/app/core/data/lifestyle-tip-recommendations')
    ]);

  const articles = (articlesModule as ContentModule).ALL_ARTICLES ?? [];
  const exercises = (exercisesModule as ContentModule).ALL_EXERCISES ?? [];
  const tips = (tipsModule as ContentModule).ALL_LIFESTYLE_TIPS ?? [];
  const exerciseRules = (exerciseRulesModule as ContentModule).EXERCISE_RECOMMENDATIONS ?? [];
  const tipRules = (tipRulesModule as ContentModule).LIFESTYLE_TIP_RECOMMENDATIONS ?? [];

  if (!articles.length || !exercises.length || !tips.length) {
    throw new Error('Healing Web content source is incomplete; nothing was changed.');
  }
  return { articles, exercises, tips, exerciseRules, tipRules };
}

async function syncArticles(articles: Article[]) {
  for (const [index, article] of articles.entries()) {
    await prisma.blogPost.upsert({
      where: { slug: article.id },
      create: {
        slug: article.id,
        title: article.title,
        excerpt: article.description,
        content: toArticleContent(article),
        category: article.category[0] || 'General Well-being',
        readTime: article.readingTime,
        authorName: article.author,
        isPublished: true,
        isFeatured: Boolean(article.isFeatured),
        publishedAt: article.publishedDate,
        sortOrder: index * 10
      },
      update: {
        title: article.title,
        excerpt: article.description,
        content: toArticleContent(article),
        category: article.category[0] || 'General Well-being',
        readTime: article.readingTime,
        authorName: article.author,
        isPublished: true,
        isFeatured: Boolean(article.isFeatured),
        publishedAt: article.publishedDate,
        sortOrder: index * 10
      }
    });
  }
}

async function syncPractices(exercises: Exercise[], recommendations: Recommendation[]) {
  const practices = await Promise.all(
    exercises.map((exercise, index) =>
      prisma.practice.upsert({
        where: { slug: exercise.id },
        create: {
          slug: exercise.id,
          title: exercise.title,
          shortDescription: exercise.description.slice(0, 260),
          description: exercise.description,
          type: enumValue(PracticeType, exercise.type, PracticeType.MINDFULNESS),
          difficulty: enumValue(
            PracticeDifficulty,
            exercise.difficulty,
            PracticeDifficulty.BEGINNER
          ),
          durationMinutes: durationInMinutes(exercise.duration),
          durationLabel: exercise.duration,
          concernSlugs: exercise.category.map(slugify),
          categories: exercise.category,
          benefits: exercise.benefits,
          steps: exercise.steps,
          tips: exercise.tips,
          whenToUse: exercise.whenToUse,
          contraindications: exercise.contraindications ?? [],
          avoidIf: [],
          tags: exercise.tags,
          audioUrl: exercise.audioUrl ?? null,
          videoUrl: exercise.videoUrl ?? null,
          sourceSystem: 'healing-web-static-sync',
          status: PracticeStatus.PUBLISHED,
          sortOrder: index * 10
        },
        update: {
          title: exercise.title,
          shortDescription: exercise.description.slice(0, 260),
          description: exercise.description,
          type: enumValue(PracticeType, exercise.type, PracticeType.MINDFULNESS),
          difficulty: enumValue(
            PracticeDifficulty,
            exercise.difficulty,
            PracticeDifficulty.BEGINNER
          ),
          durationMinutes: durationInMinutes(exercise.duration),
          durationLabel: exercise.duration,
          concernSlugs: exercise.category.map(slugify),
          categories: exercise.category,
          benefits: exercise.benefits,
          steps: exercise.steps,
          tips: exercise.tips,
          whenToUse: exercise.whenToUse,
          contraindications: exercise.contraindications ?? [],
          tags: exercise.tags,
          audioUrl: exercise.audioUrl ?? null,
          videoUrl: exercise.videoUrl ?? null,
          sourceSystem: 'healing-web-static-sync',
          status: PracticeStatus.PUBLISHED,
          sortOrder: index * 10
        }
      })
    )
  );
  const practiceIds = practices.map((practice) => practice.id);
  const idBySlug = new Map(practices.map((practice) => [practice.slug, practice.id]));

  await prisma.practiceRecommendationRule.deleteMany({
    where: { practiceId: { in: practiceIds }, notes: SYNC_NOTE }
  });
  const rules = recommendations.flatMap((recommendation) =>
    (recommendation.recommendedExercises ?? []).flatMap((slug, index) => {
      const practiceId = idBySlug.get(slug);
      return practiceId
        ? [
            {
              practiceId,
              assessmentType: recommendation.assessmentType,
              minScore: recommendation.scoreRange.min,
              maxScore: recommendation.scoreRange.max,
              priority: Math.min(10, recommendation.priority + index),
              notes: SYNC_NOTE
            }
          ]
        : [];
    })
  );
  if (rules.length) await prisma.practiceRecommendationRule.createMany({ data: rules });
  return rules.length;
}

async function syncLifestyleTips(tips: LifestyleTip[], recommendations: Recommendation[]) {
  const records = await Promise.all(
    tips.map((tip, index) =>
      prisma.lifestyleTip.upsert({
        where: { slug: tip.id },
        create: {
          slug: tip.id,
          title: tip.title,
          shortDescription: tip.description.slice(0, 260),
          description: tip.description,
          type: enumValue(LifestyleTipType, tip.type, LifestyleTipType.SELF_CARE),
          difficulty: enumValue(
            LifestyleTipDifficulty,
            tip.difficulty,
            LifestyleTipDifficulty.EASY
          ),
          timeToImplement: tip.timeToImplement,
          concernSlugs: tip.category.map(slugify),
          categories: tip.category,
          benefits: tip.benefits,
          steps: tip.steps,
          tips: tip.tips,
          scientificBasis: tip.scientificBasis ?? null,
          commonMistakes: tip.commonMistakes ?? [],
          progressTracking: tip.progressTracking ?? [],
          relatedTipSlugs: tip.relatedTips ?? [],
          contraindications: [],
          avoidIf: [],
          tags: tip.tags,
          status: LifestyleTipStatus.PUBLISHED,
          sortOrder: index * 10
        },
        update: {
          title: tip.title,
          shortDescription: tip.description.slice(0, 260),
          description: tip.description,
          type: enumValue(LifestyleTipType, tip.type, LifestyleTipType.SELF_CARE),
          difficulty: enumValue(
            LifestyleTipDifficulty,
            tip.difficulty,
            LifestyleTipDifficulty.EASY
          ),
          timeToImplement: tip.timeToImplement,
          concernSlugs: tip.category.map(slugify),
          categories: tip.category,
          benefits: tip.benefits,
          steps: tip.steps,
          tips: tip.tips,
          scientificBasis: tip.scientificBasis ?? null,
          commonMistakes: tip.commonMistakes ?? [],
          progressTracking: tip.progressTracking ?? [],
          relatedTipSlugs: tip.relatedTips ?? [],
          tags: tip.tags,
          status: LifestyleTipStatus.PUBLISHED,
          sortOrder: index * 10
        }
      })
    )
  );
  const tipIds = records.map((tip) => tip.id);
  const idBySlug = new Map(records.map((tip) => [tip.slug, tip.id]));

  await prisma.lifestyleTipRecommendationRule.deleteMany({
    where: { lifestyleTipId: { in: tipIds }, notes: SYNC_NOTE }
  });
  const rules = recommendations.flatMap((recommendation) =>
    (recommendation.recommendedTips ?? []).flatMap((slug, index) => {
      const lifestyleTipId = idBySlug.get(slug);
      return lifestyleTipId
        ? [
            {
              lifestyleTipId,
              assessmentType: recommendation.assessmentType,
              minScore: recommendation.scoreRange.min,
              maxScore: recommendation.scoreRange.max,
              priority: Math.min(10, recommendation.priority + index),
              notes: SYNC_NOTE
            }
          ]
        : [];
    })
  );
  if (rules.length) await prisma.lifestyleTipRecommendationRule.createMany({ data: rules });
  return rules.length;
}

async function main() {
  const { articles, exercises, tips, exerciseRules, tipRules } = await loadSourceData();
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log(
      `Found ${articles.length} articles, ${exercises.length} practices, and ${tips.length} lifestyle tips.`
    );
    console.log(
      `Will create or update ${exerciseRules.flatMap((item) => item.recommendedExercises ?? []).length} practice rules and ${tipRules.flatMap((item) => item.recommendedTips ?? []).length} lifestyle-tip rules.`
    );
    return;
  }

  await syncArticles(articles);
  const practiceRuleCount = await syncPractices(exercises, exerciseRules);
  const tipRuleCount = await syncLifestyleTips(tips, tipRules);
  console.log(
    `Synced ${articles.length} articles, ${exercises.length} practices, ${tips.length} lifestyle tips, ${practiceRuleCount} practice rules, and ${tipRuleCount} lifestyle-tip rules.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
