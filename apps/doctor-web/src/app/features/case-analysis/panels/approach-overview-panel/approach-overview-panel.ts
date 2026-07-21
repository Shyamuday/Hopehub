import { Component, HostListener, Input, OnChanges, computed, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  resolveApproachByMethodOption,
  type ApproachDefinition,
} from '@hopehub/homeopathy-approaches';

type MethodOption = { id: string; label: string; normalizedLabel?: string };

type ApproachGroupKey =
  'core' | 'constitutional' | 'acuteClinical' | 'miasmatic' | 'protocolSupport' | 'followUp';

type ApproachGroup = {
  key: ApproachGroupKey;
  label: string;
  methods: MethodOption[];
};

const APPROACH_GROUP_LABELS: Record<ApproachGroupKey, string> = {
  core: 'Core classical',
  constitutional: 'Constitutional',
  acuteClinical: 'Acute & clinical',
  miasmatic: 'Miasmatic & intercurrent',
  protocolSupport: 'Protocol & supportive',
  followUp: 'Follow-up & monitoring',
};

const APPROACH_GROUP_BY_SLUG: Record<string, ApproachGroupKey> = {
  'classical-homeopathy': 'core',
  'eight-box-case-structure': 'core',
  'organon-lm': 'core',
  'kentian-method': 'core',
  'boenninghausen-method': 'core',
  'boger-method': 'core',
  'keynote-totality': 'core',
  'sensation-method': 'constitutional',
  'constitutional-approach': 'constitutional',
  'temperament-based-constitutional': 'constitutional',
  'pediatric-constitutional': 'constitutional',
  'scholten-method': 'constitutional',
  'vithoulkas-essences': 'constitutional',
  'eizayaga-layers': 'constitutional',
  'clinical-homeopathy': 'acuteClinical',
  'acute-fast-track': 'acuteClinical',
  'pathological-prescribing': 'acuteClinical',
  'predictive-homeopathy': 'acuteClinical',
  'miasmatic-approach': 'miasmatic',
  'nosode-sarcode-approach': 'miasmatic',
  'intercurrent-remedy-approach': 'miasmatic',
  'tautopathy-isopathy': 'miasmatic',
  'banerji-protocols': 'protocolSupport',
  'protocol-based-prescribing': 'protocolSupport',
  'combination-remedy-mode': 'protocolSupport',
  'mother-tincture-organopathic': 'protocolSupport',
  'bach-flower-emotional-support': 'protocolSupport',
  'drainage-organ-support': 'protocolSupport',
  'integrated-hybrid-approach': 'followUp',
  'integrative-follow-up': 'followUp',
  'hering-law-tracker': 'followUp',
  'fibonacci-potency-method': 'followUp',
};

const SEARCH_ALIASES_BY_SLUG: Record<string, string[]> = {
  'temperament-based-constitutional': [
    'tempraz',
    'temperament quotient',
    'choleric',
    'sanguine',
    'melancholic',
    'nervous',
    'phlegmatic',
  ],
  'scholten-method': ['element theory', 'periodic table', 'mineral', 'series', 'stage'],
  'sehgal-method': ['seigal', 'ssrh', 'emotional core', 'mind rubrics'],
  'clinical-homeopathy': ['acute expert', 'clinical acute', 'opd'],
  'acute-fast-track': ['acute expert', 'acute prescriber', 'fast acute'],
  'kentian-method': ['kent expert', 'kent hierarchy', 'mind first'],
  'boenninghausen-method': [
    'boenninghausen expert',
    'lsm',
    'location sensation modality',
    'concomitant',
  ],
  'boger-method': ['boger expert', 'pathological totality', 'time modalities'],
  'predictive-homeopathy': ['vijayakar', 'predictive pathology'],
  'bach-flower-emotional-support': [
    'bach flower',
    'flower remedy',
    'rescue remedy',
    'emotional support',
  ],
  'nosode-sarcode-approach': ['nosode', 'sarcode', 'tuberculinum', 'medorrhinum', 'thyroidinum'],
  'mother-tincture-organopathic': ['mother tincture', 'organopathic', 'organ support', 'q potency'],
  'intercurrent-remedy-approach': ['intercurrent', 'blocked case', 'miasmatic block'],
  'pediatric-constitutional': ['pediatric', 'paediatric', 'child', 'children', 'milestones'],
};

@Component({
  selector: 'app-approach-overview-panel',
  imports: [FormField],
  templateUrl: './approach-overview-panel.html',
  styleUrl: './approach-overview-panel.scss',
})
export class ApproachOverviewPanelComponent implements OnChanges {
  @Input({ required: true }) methods: MethodOption[] = [];
  @Input({ required: true }) selectedMethodOptionId = '';
  @Input() methodRationale = '';
  @Input() approach: ApproachDefinition | null = null;
  @Input() saving = false;
  @Input() savingRationale = false;

  readonly approachChanged = output<string>();
  readonly rationaleChanged = output<string>();

  readonly pickerOpen = signal(false);
  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly selectedMethodLabel = computed(() => {
    const selected = this.methods.find((item) => item.id === this.selectedMethodOptionId);
    return selected?.label || this.approach?.title || 'Select approach';
  });

  readonly filteredMethods = computed(() => {
    const query = this.searchModel().query.trim().toLowerCase();
    if (!query) return this.methods;
    return this.methods.filter((method) => this.searchTextForMethod(method).includes(query));
  });

  readonly groupedFilteredMethods = computed<ApproachGroup[]>(() => {
    const groups = new Map<ApproachGroupKey, MethodOption[]>();
    for (const method of this.filteredMethods()) {
      const key = this.groupKeyForMethod(method);
      groups.set(key, [...(groups.get(key) || []), method]);
    }
    return (Object.keys(APPROACH_GROUP_LABELS) as ApproachGroupKey[])
      .map((key) => ({
        key,
        label: APPROACH_GROUP_LABELS[key],
        methods: groups.get(key) || [],
      }))
      .filter((group) => group.methods.length);
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.approach-picker-root')) {
      this.closePicker();
    }
  }

  ngOnChanges() {
    if (
      this.selectedMethodOptionId &&
      !this.filteredMethods().some((item) => item.id === this.selectedMethodOptionId)
    ) {
      this.searchModel.set({ query: '' });
    }
  }

  togglePicker() {
    if (this.saving) return;
    if (this.pickerOpen()) {
      this.closePicker();
      return;
    }
    this.pickerOpen.set(true);
  }

  closePicker() {
    if (!this.pickerOpen()) return;
    this.pickerOpen.set(false);
    this.searchModel.set({ query: '' });
  }

  selectMethod(methodOptionId: string) {
    if (this.saving) return;
    this.closePicker();
    if (methodOptionId === this.selectedMethodOptionId) return;
    this.approachChanged.emit(methodOptionId);
  }

  onRationaleInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.rationaleChanged.emit(value);
  }

  private approachForMethod(method: MethodOption): ApproachDefinition {
    return resolveApproachByMethodOption(method);
  }

  private groupKeyForMethod(method: MethodOption): ApproachGroupKey {
    const approach = this.approachForMethod(method);
    return APPROACH_GROUP_BY_SLUG[approach.slug] || 'core';
  }

  private searchTextForMethod(method: MethodOption): string {
    const approach = this.approachForMethod(method);
    return [
      method.label,
      method.normalizedLabel,
      approach.title,
      approach.methodNormalizedLabel,
      approach.shortDescription,
      approach.focus,
      approach.developedBy,
      approach.workflowKind,
      ...(SEARCH_ALIASES_BY_SLUG[approach.slug] || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }
}
