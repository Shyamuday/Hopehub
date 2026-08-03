import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Exercise,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseStep,
  ExerciseType,
} from '../models/exercise.model';

export type BackendPractice = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  type: string;
  difficulty: string;
  durationMinutes?: number | null;
  durationLabel?: string | null;
  concernSlugs?: string[];
  categories?: string[];
  benefits?: string[];
  steps?: ExerciseStep[];
  tips?: string[];
  whenToUse?: string[];
  contraindications?: string[];
  tags?: string[];
  audioUrl?: string | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
};

export type PracticePageData = {
  exercises: Exercise[];
  recommendations: Exercise[];
};

@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly pageDataCache = new Map<string, Observable<PracticePageData>>();

  list(
    params: { q?: string; type?: string; concern?: string; category?: string } = {},
  ): Observable<Exercise[]> {
    return this.http
      .get<{ practices: BackendPractice[] }>(`${this.apiUrl}/practices`, {
        params: {
          q: params.q ?? '',
          type: params.type ?? '',
          concern: params.concern ?? '',
          category: params.category ?? '',
          pageSize: '100',
        },
      })
      .pipe(
        map((response) => (response.practices || []).map((practice) => this.toExercise(practice))),
      );
  }

  pageData(
    params: {
      q?: string;
      type?: string;
      concern?: string;
      category?: string;
      assessmentType?: string;
      score?: number | string;
    } = {},
  ): Observable<PracticePageData> {
    const normalizedParams = {
      q: params.q ?? '',
      type: params.type ?? '',
      concern: params.concern ?? '',
      category: params.category ?? '',
      assessmentType: params.assessmentType ?? '',
      score: params.score == null ? '' : String(params.score),
    };
    const cacheKey = JSON.stringify(normalizedParams);
    const cached = this.pageDataCache.get(cacheKey);
    if (cached) return cached;

    const request = this.http
      .get<{
        practices: BackendPractice[];
        recommendations: Array<{ practice: BackendPractice }>;
      }>(`${this.apiUrl}/practices/page-data`, {
        params: { ...normalizedParams, pageSize: '100' },
      })
      .pipe(
        map((response) => ({
          exercises: (response.practices || []).map((practice) => this.toExercise(practice)),
          recommendations: (response.recommendations || []).map((item) =>
            this.toExercise(item.practice),
          ),
        })),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.pageDataCache.set(cacheKey, request);
    return request;
  }

  recommendations(params: {
    assessmentType?: string;
    concern?: string;
    score?: number | string;
  }): Observable<Exercise[]> {
    return this.http
      .get<{ recommendations: Array<{ practice: BackendPractice }> }>(
        `${this.apiUrl}/practices/recommendations`,
        {
          params: {
            assessmentType: params.assessmentType ?? '',
            concern: params.concern ?? '',
            score: params.score == null ? '' : String(params.score),
          },
        },
      )
      .pipe(
        map((response) =>
          (response.recommendations || []).map((item) => this.toExercise(item.practice)),
        ),
      );
  }

  recordSession(
    practiceId: string,
    payload: {
      durationMinutes?: number;
      helpfulRating?: number;
      moodBefore?: string;
      moodAfter?: string;
      notes?: string;
      source?: string;
    },
  ) {
    return this.http.post(`${this.apiUrl}/practices/${practiceId}/sessions`, payload);
  }

  private toExercise(practice: BackendPractice): Exercise {
    return {
      id: practice.id,
      sourceSlug: practice.slug,
      title: practice.title,
      description: practice.description || practice.shortDescription,
      type: this.mapType(practice.type),
      category: this.mapCategories(practice.categories, practice.concernSlugs),
      difficulty: this.mapDifficulty(practice.difficulty),
      duration: practice.durationLabel || `${practice.durationMinutes || 10} minutes`,
      benefits: practice.benefits || [],
      steps: practice.steps || [],
      tips: practice.tips || [],
      whenToUse: practice.whenToUse || [],
      contraindications: practice.contraindications || [],
      videoUrl: practice.videoUrl || practice.youtubeUrl || undefined,
      audioUrl: practice.audioUrl || undefined,
      tags: practice.tags || practice.concernSlugs || [],
    };
  }

  private mapType(type: string): ExerciseType {
    const normalized = type.toUpperCase();
    if (normalized === 'BREATHING' || normalized === 'PRANAYAMA') return ExerciseType.BREATHING;
    if (normalized === 'YOGA' || normalized === 'MOBILITY' || normalized === 'SOMATIC') {
      return ExerciseType.PHYSICAL;
    }
    if (normalized === 'MEDITATION') return ExerciseType.MINDFULNESS;
    if (normalized === 'AYURVEDA_LIFESTYLE') return ExerciseType.RELAXATION;
    return (Object.values(ExerciseType).find((value) => value.toUpperCase() === normalized) ||
      ExerciseType.MINDFULNESS) as ExerciseType;
  }

  private mapDifficulty(difficulty: string): ExerciseDifficulty {
    return (
      Object.values(ExerciseDifficulty).find(
        (value) => value.toUpperCase() === difficulty.toUpperCase(),
      ) || ExerciseDifficulty.BEGINNER
    );
  }

  private mapCategories(categories: string[] = [], concerns: string[] = []): ExerciseCategory[] {
    const values = [...categories, ...concerns].map((value) => value.toLowerCase());
    const mapped = Object.values(ExerciseCategory).filter((category) =>
      values.some(
        (value) => category.toLowerCase().includes(value) || value.includes(category.toLowerCase()),
      ),
    );
    return mapped.length ? mapped : [ExerciseCategory.GENERAL_WELLBEING];
  }
}
