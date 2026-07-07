import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import type { Consumer } from '../../models/consumers.models';

@Component({
  selector: 'app-consumers-list-panel',
  imports: [CommonModule, FormField],
  templateUrl: './consumers-list-panel.html',
  styleUrl: './consumers-list-panel.scss'
})
export class ConsumersListPanelComponent {
  @Input({ required: true }) registerForm!: any;
  @Input({ required: true }) patientSearchForm!: any;
  @Input({ required: true }) listFilterForm!: any;

  @Input() showRegister = false;
  @Input() registerSaving = false;
  @Input() registerError = '';
  @Input() registerMessage = '';
  @Input() stores: Array<{ id: string; name: string; code: string }> = [];
  @Input() patientSearchLoading = false;
  @Input() patientSearchResults: Array<{ id: string; name: string; patientCode?: string; mobile?: string }> = [];
  @Input() listLoading = false;
  @Input() listError = '';
  @Input() consumers: Consumer[] = [];
  @Input() page = 1;
  @Input() pages: number[] = [];
  @Input() detailLoading = false;

  @Output() registerToggle = new EventEmitter<void>();
  @Output() registerPatient = new EventEmitter<void>();
  @Output() searchPatientsGlobal = new EventEmitter<void>();
  @Output() selectSearchedPatient = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() selectConsumer = new EventEmitter<string>();
  @Output() retryLoad = new EventEmitter<void>();
}
