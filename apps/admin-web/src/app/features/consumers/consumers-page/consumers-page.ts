import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';

type Consumer = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  consultations: number;
};

@Component({
  selector: 'app-consumers-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './consumers-page.html',
  styleUrl: './consumers-page.scss'
})
export class ConsumersPage {
  consumers: Consumer[] = [];
  searchTerm = '';
  sortBy: 'name' | 'consultations' = 'consultations';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 8;
  page = 1;
  totalPagesCount = 1;
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const response = await this.api.getConsumersPaged({
        page: this.page,
        pageSize: this.pageSize,
        q: this.searchTerm,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
      });
      this.consumers = response.consumers || [];
      this.totalPagesCount = Math.max(1, Number(response.pagination?.totalPages || 1));
    } catch {
      this.error = 'Could not load consumers.';
    }
  }

  async setPage(page: number) {
    this.page = page;
    await this.load();
  }

  visibleConsumers() {
    return this.consumers;
  }

  totalPages() {
    return this.totalPagesCount;
  }

  pages() {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  }

}
