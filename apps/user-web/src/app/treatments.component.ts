import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { diseaseCategoryList } from './disease/disease-category-list.constants';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-treatments',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './treatments.component.html',
})
export class TreatmentsComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly categories = diseaseCategoryList;
  readonly selectedCategoryId = signal(this.categories[0]?.id || '');
  readonly selectedSubSectionId = signal(this.categories[0]?.subSections[0]?.id || '');
  readonly selectedIssueName = signal('');

  constructor(private readonly overlayService: AppOverlayService) {}

  get selectedCategory() {
    return this.categories.find((item) => item.id === this.selectedCategoryId()) || null;
  }

  get selectedSubSection() {
    const category = this.selectedCategory;
    if (!category) {
      return null;
    }
    return category.subSections.find((item) => item.id === this.selectedSubSectionId()) || null;
  }

  selectCategory(categoryId: string) {
    this.selectedCategoryId.set(categoryId);
    const category = this.categories.find((item) => item.id === categoryId);
    this.selectedSubSectionId.set(category?.subSections[0]?.id || '');
    this.selectedIssueName.set('');
  }

  selectSubSection(subSectionId: string) {
    this.selectedSubSectionId.set(subSectionId);
    this.selectedIssueName.set('');
  }

  selectIssue(diseaseName: string) {
    this.selectedIssueName.set(diseaseName);
  }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
