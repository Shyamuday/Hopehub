import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { diseaseCategoryList } from '../constants';
import { AppOverlayService } from '../overlay.service';
import { openPublicAuthOverlay } from './open-public-auth-overlay';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-treatments',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Treatments" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Treatments</p>
          <h1>Focused care programs for chronic, recurring, and lifestyle-linked concerns.</h1>
          <p>
            Vitalis Care and Research Centre starts with focused online consultations and gradually builds treatment
            plans around follow-up, symptom tracking, and doctor-led guidance.
          </p>
        </section>

        <section class="panel">
          <p class="eyebrow">Select by body part</p>
          <div class="category-pills">
            @for (category of categories; track category.id) {
              <button
                type="button"
                class="category-pill"
                [class.active]="selectedCategoryId() === category.id"
                (click)="selectCategory(category.id)">
                {{ category.label }}
              </button>
            }
          </div>
        </section>

        @if (selectedCategory; as category) {
          <section class="panel">
            <p class="eyebrow">Sub section</p>
            <div class="category-pills">
              @for (subSection of category.subSections; track subSection.id) {
                <button
                  type="button"
                  class="category-pill"
                  [class.active]="selectedSubSectionId() === subSection.id"
                  (click)="selectSubSection(subSection.id)">
                  {{ subSection.label }}
                </button>
              }
            </div>
          </section>
        }

        <section class="panel">
          @if (selectedSubSection; as subSection) {
            <p class="eyebrow">Select issue</p>
            <h2>Choose your issue in {{ subSection.label }}</h2>
            <div class="issue-grid">
              @for (diseaseName of subSection.diseaseNames; track diseaseName) {
                <button
                  type="button"
                  class="issue-card"
                  [class.active]="selectedIssueName() === diseaseName"
                  (click)="selectIssue(diseaseName)">
                  <span>{{ diseaseName }}</span>
                </button>
              }
            </div>

            @if (selectedIssueName()) {
              <section class="issue-selection panel">
                <p class="eyebrow">Selected issue</p>
                <h3>{{ selectedIssueName() }}</h3>
                <p>Continue to consultation and share symptoms for this issue with our doctor panel.</p>
                <a class="primary home-action" href="/login" (click)="openAuth($event)">Start consultation</a>
              </section>
            }
          } @else {
            <article class="panel">
              <h2>No diseases listed yet</h2>
              <p>We will add conditions for this body-part category soon.</p>
            </article>
          }
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class TreatmentsComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
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

  openAuth(event: Event) {
    openPublicAuthOverlay(this.overlayService, event);
  }
}
