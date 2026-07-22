import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';

export type DiseaseCategory = {
  key: string;
  label: string;
};

export type DiseaseListItem = {
  id: string;
  name: string;
  description: string;
  publicCategory: string | null;
  feeInPaise: number;
  isActive: boolean;
  prescriptionOptionId?: string | null;
};

export type GroupedDiseaseCategory = DiseaseCategory & {
  diseases: DiseaseListItem[];
};

export type DiseaseCatalogResponse = {
  diseases: DiseaseListItem[];
  categories: GroupedDiseaseCategory[];
  uncategorized: DiseaseListItem[];
};

@Service()
export class DiseaseCatalogService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  loadCategories() {
    return firstValueFrom(
      this.http.get<{ categories: DiseaseCategory[] }>(
        `${this.apiBase}${API_PATHS.PROVIDER.DISEASE_CATEGORIES}`,
      ),
    ).then((response) => response.categories);
  }

  loadDiseases(params?: { q?: string; category?: string; grouped?: boolean }) {
    const query: Record<string, string> = {};
    if (params?.q?.trim()) query['q'] = params.q.trim();
    if (params?.category?.trim()) query['category'] = params.category.trim();
    if (params?.grouped === false) query['grouped'] = 'false';

    return firstValueFrom(
      this.http.get<DiseaseCatalogResponse>(`${this.apiBase}${API_PATHS.PROVIDER.DISEASES}`, {
        params: query,
      }),
    );
  }

  createDisease(payload: { name: string; publicCategory: string; description?: string }) {
    return firstValueFrom(
      this.http.post<{ disease: DiseaseListItem }>(
        `${this.apiBase}${API_PATHS.PROVIDER.DISEASES}`,
        payload,
      ),
    ).then((response) => response.disease);
  }

  getPublicPage(id: string) {
    return firstValueFrom(
      this.http.get<{
        publicDescription: string | null;
        publicImageUrl: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        publicFaq: Array<{ question: string; answer: string }>;
        publicPageContent: Record<string, unknown> | null;
      }>(`${this.apiBase}${API_PATHS.PROVIDER.DISEASE_PUBLIC_PAGE(id)}`),
    );
  }

  updatePublicPage(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.PROVIDER.DISEASE_PUBLIC_PAGE(id)}`, payload),
    );
  }
}
