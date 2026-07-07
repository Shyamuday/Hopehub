import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { DetailRowsComponent } from '@vitalis/platform-ui';
import type { DetailRow } from '@vitalis/platform-ui';
import { SUPPORT_NOTE_CATEGORIES, SUPPORT_NOTE_CATEGORY_STYLES, type SupportNoteCategory } from '../../constants/support-note.constants';
import type { ConsumerDetail, SupportContext, SupportNote } from '../../models/consumers.models';

@Component({
  selector: 'app-consumer-support-panel',
  imports: [CommonModule, FormField, DetailRowsComponent],
  templateUrl: './consumer-support-panel.html',
  styleUrl: './consumer-support-panel.scss'
})
export class ConsumerSupportPanelComponent {
  @Input({ required: true }) noteForm!: any;
  @Input() supportLoading = false;
  @Input() supportError = '';
  @Input() supportContext: SupportContext | null = null;
  @Input() supportNotes: SupportNote[] = [];
  @Input() consultations: ConsumerDetail['consultations'] = [];
  @Input() savingNote = false;
  @Input() noteError = '';
  @Input() supportAccountRows: DetailRow[] = [];
  @Input() reminderPreferenceRows: DetailRow[] = [];

  @Output() retryLoad = new EventEmitter<void>();
  @Output() submitNote = new EventEmitter<void>();

  readonly supportCategories = SUPPORT_NOTE_CATEGORIES;
  private readonly categoryStyles = SUPPORT_NOTE_CATEGORY_STYLES;

  categoryStyle(category: SupportNoteCategory) {
    return this.categoryStyles[category] ?? this.categoryStyles.GENERAL;
  }
}
