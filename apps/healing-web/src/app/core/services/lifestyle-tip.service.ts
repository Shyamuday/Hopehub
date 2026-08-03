import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LifestyleTip,
  LifestyleTipCategory,
  LifestyleTipDifficulty,
  LifestyleTipStep,
  LifestyleTipType,
} from '../models/lifestyle-tip.model';

export type BackendLifestyleTip = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  type: string;
  difficulty: string;
  timeToImplement: string;
  concernSlugs?: string[];
  categories?: string[];
  benefits?: string[];
  steps?: LifestyleTipStep[];
  tips?: string[];
  scientificBasis?: string | null;
  commonMistakes?: string[];
  progressTracking?: string[];
  relatedTipSlugs?: string[];
  contraindications?: string[];
  avoidIf?: string[];
  tags?: string[];
};

export type LifestyleTipPageData = {
  tips: LifestyleTip[];
  recommendations: LifestyleTip[];
};

@Injectable({ providedIn: 'root' })
export class LifestyleTipService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly pageDataCache = new Map<string, Observable<LifestyleTipPageData>>();

  list(
    params: { q?: string; type?: string; concern?: string; category?: string } = {},
  ): Observable<LifestyleTip[]> {
    return this.http
      .get<{ tips: BackendLifestyleTip[] }>(`${this.apiUrl}/lifestyle-tips`, {
        params: {
          q: params.q ?? '',
          type: params.type ?? '',
          concern: params.concern ?? '',
          category: params.category ?? '',
          pageSize: '100',
        },
      })
      .pipe(map((response) => (response.tips || []).map((tip) => this.toLifestyleTip(tip))));
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
  ): Observable<LifestyleTipPageData> {
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
        tips: BackendLifestyleTip[];
        recommendations: Array<{ tip: BackendLifestyleTip }>;
      }>(`${this.apiUrl}/lifestyle-tips/page-data`, {
        params: { ...normalizedParams, pageSize: '100' },
      })
      .pipe(
        map((response) => ({
          tips: (response.tips || []).map((tip) => this.toLifestyleTip(tip)),
          recommendations: (response.recommendations || []).map((item) =>
            this.toLifestyleTip(item.tip),
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
  }): Observable<LifestyleTip[]> {
    return this.http
      .get<{ recommendations: Array<{ tip: BackendLifestyleTip }> }>(
        `${this.apiUrl}/lifestyle-tips/recommendations`,
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
          (response.recommendations || []).map((item) => this.toLifestyleTip(item.tip)),
        ),
      );
  }

  recordSession(
    lifestyleTipId: string,
    payload: {
      helpfulRating?: number;
      notes?: string;
      source?: string;
    },
  ) {
    return this.http.post(`${this.apiUrl}/lifestyle-tips/${lifestyleTipId}/sessions`, payload);
  }

  private toLifestyleTip(tip: BackendLifestyleTip): LifestyleTip {
    return {
      id: tip.id,
      sourceSlug: tip.slug,
      title: tip.title,
      description: tip.description || tip.shortDescription,
      type: this.mapType(tip.type),
      category: this.mapCategories(tip.categories, tip.concernSlugs),
      difficulty: this.mapDifficulty(tip.difficulty),
      timeToImplement: tip.timeToImplement,
      benefits: tip.benefits || [],
      steps: tip.steps || [],
      tips: tip.tips || [],
      scientificBasis: tip.scientificBasis || undefined,
      commonMistakes: tip.commonMistakes || [],
      progressTracking: tip.progressTracking || [],
      relatedTips: tip.relatedTipSlugs || [],
      tags: tip.tags || tip.concernSlugs || [],
    };
  }

  private mapType(type: string): LifestyleTipType {
    const normalized = type.toUpperCase();
    const direct = Object.values(LifestyleTipType).find(
      (value) => value.toUpperCase().replace(/[-\s]/g, '_') === normalized,
    );
    if (direct) return direct;
    if (normalized === 'DIGITAL_BOUNDARIES') return LifestyleTipType.HABITS;
    if (normalized === 'AYURVEDA_LIFESTYLE') return LifestyleTipType.SELF_CARE;
    return LifestyleTipType.SELF_CARE;
  }

  private mapDifficulty(difficulty: string): LifestyleTipDifficulty {
    return (
      Object.values(LifestyleTipDifficulty).find(
        (value) => value.toUpperCase() === difficulty.toUpperCase(),
      ) || LifestyleTipDifficulty.EASY
    );
  }

  private mapCategories(
    categories: string[] = [],
    concerns: string[] = [],
  ): LifestyleTipCategory[] {
    const values = [...categories, ...concerns].map((value) => value.toLowerCase());
    const mapped = Object.values(LifestyleTipCategory).filter((category) =>
      values.some(
        (value) => category.toLowerCase().includes(value) || value.includes(category.toLowerCase()),
      ),
    );
    return mapped.length ? mapped : [LifestyleTipCategory.GENERAL_WELLBEING];
  }
}
