import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { findProtocolById, protocolsForDisease, type BanerjiProtocol, type ProtocolApproachData } from '@hopehub/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

function emptyProtocol(): ProtocolApproachData {
  return {
    protocolId: '',
    protocolName: '',
    personalizationNotes: '',
    primaryRemedy: '',
    companionRemedy: ''
  };
}

@Component({
  selector: 'app-protocol-select-panel',
  imports: [FormField],
  templateUrl: './protocol-select-panel.html',
  styleUrl: './protocol-select-panel.scss'
})
export class ProtocolSelectPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input() diseaseName = '';
  @Input() initial: ProtocolApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<ProtocolApproachData>();
  readonly autoSaveRequested = output<ProtocolApproachData>();
  readonly useInPrescription = output<ProtocolApproachData>();

  readonly protocols = signal<BanerjiProtocol[]>([]);
  readonly model = signal(emptyProtocol());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    this.protocols.set(protocolsForDisease(this.diseaseName));
    const next = { ...emptyProtocol(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  selectProtocol(protocolId: string) {
    const protocol = findProtocolById(protocolId);
    if (!protocol) return;
    const next = {
      ...emptyProtocol(),
      ...(this.initial || {}),
      protocolId: protocol.id,
      protocolName: protocol.name,
      primaryRemedy: protocol.primaryRemedy,
      companionRemedy: protocol.companionRemedy || '',
      personalizationNotes: this.model().personalizationNotes || protocol.notes
    };
    this.model.set(next);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }

  prescribeFromProtocol() {
    this.useInPrescription.emit(this.model());
  }
}
