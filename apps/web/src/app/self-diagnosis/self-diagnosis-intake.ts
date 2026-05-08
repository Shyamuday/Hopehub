/** Rank 1 = strongest likelihood; stored as JSON on one storage key, e.g. `{"Plant — …": 1}`. */
export const RANKED_CHECKLIST_MAX = 10;

export type MethodIntakeSubField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'ranked_checklist';
  options?: string[];
  placeholder?: string;
  helper?: string;
};

export type MethodIntakeField =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'select' | 'checkbox' | 'ranked_checklist';
      options?: string[];
      placeholder?: string;
      helper?: string;
    }
  | {
      key: string;
      label: string;
      type: 'structured_group';
      sub_fields: MethodIntakeSubField[];
    };

export type MethodIntakeProfile = {
  id: string;
  title: string;
  match: string[];
  helper?: string;
  fields: MethodIntakeField[];
};

export type MethodIntakeConfig = {
  schemaVersion?: number;
  title?: string;
  description?: string;
  defaultProfileId: string;
  globalFields?: MethodIntakeField[];
  profiles: MethodIntakeProfile[];
};

/** Optional addon JSON (`homeopathy-*-intake.json`) with one `group` structured_group. */
export type MethodIntakeAddonFile = {
  schemaVersion?: number;
  title?: string;
  description?: string;
  group: MethodIntakeField;
};

/** @deprecated Use `MethodIntakeAddonFile` */
export type KingdomIntakeAddonFile = MethodIntakeAddonFile;

/**
 * Merge kingdom then miasm addons into base `globalFields`.
 * Order: … decision_support → kingdom_classification → miasm_classification → …
 */
export function mergeMethodIntakeGlobalFields(
  base: MethodIntakeField[] | undefined | null,
  kingdomGroup: MethodIntakeField | null | undefined,
  miasmGroup: MethodIntakeField | null | undefined
): MethodIntakeField[] {
  let list = base?.length ? [...base] : [];

  const insertAfter = (afterKey: string, field: MethodIntakeField) => {
    const i = list.findIndex((f) => f.key === afterKey);
    if (i === -1) {
      list.push(field);
    } else {
      list.splice(i + 1, 0, field);
    }
  };

  if (kingdomGroup?.type === 'structured_group' && kingdomGroup.key === 'kingdom_classification') {
    insertAfter('decision_support', kingdomGroup);
  }

  if (miasmGroup?.type === 'structured_group' && miasmGroup.key === 'miasm_classification') {
    const k = list.findIndex((f) => f.key === 'kingdom_classification');
    if (k !== -1) {
      list.splice(k + 1, 0, miasmGroup);
    } else {
      insertAfter('decision_support', miasmGroup);
    }
  }

  return list;
}

/** @deprecated Use `mergeMethodIntakeGlobalFields(base, kingdom, null)` */
export function mergeGlobalFieldsWithKingdom(
  base: MethodIntakeField[] | undefined | null,
  kingdomGroup: MethodIntakeField | null | undefined
): MethodIntakeField[] {
  return mergeMethodIntakeGlobalFields(base, kingdomGroup, null);
}
/** One row of UI + storage (flattened compound keys for `methodIntakeValues`). */
export type MethodIntakeFlatRow = {
  storageKey: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'ranked_checklist';
  options?: string[];
  placeholder?: string;
  /** Section heading (e.g. parent group or “Scientific add-ons”). */
  section?: string;
  helper?: string;
};

function isStructuredGroup(f: MethodIntakeField): f is Extract<MethodIntakeField, { type: 'structured_group' }> {
  return f.type === 'structured_group';
}

export function parseRankedChecklistJson(raw: string | null | undefined): Record<string, number> {
  const t = (raw ?? '').trim();
  if (!t) {
    return {};
  }
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) {
        const r = Math.round(n);
        if (r >= 1 && r <= RANKED_CHECKLIST_MAX) {
          out[k] = r;
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function stringifyRankedChecklist(obj: Record<string, number>): string {
  const keys = Object.keys(obj);
  if (!keys.length) {
    return '';
  }
  return JSON.stringify(obj);
}

/** Migrate legacy single-select string to `{"option": 1}` when it matches an option. */
export function migrateLegacyRankedChecklistValue(raw: string | null | undefined, options: string[]): string {
  const t = (raw ?? '').trim();
  if (!t) {
    return '';
  }
  const parsed = parseRankedChecklistJson(t);
  if (Object.keys(parsed).length) {
    return t;
  }
  if (options.includes(t)) {
    return stringifyRankedChecklist({ [t]: 1 });
  }
  return t;
}

export function flattenMethodIntakeFields(
  fields: MethodIntakeField[],
  sectionPrefix: string | null = null
): MethodIntakeFlatRow[] {
  const rows: MethodIntakeFlatRow[] = [];

  for (const f of fields) {
    if (isStructuredGroup(f)) {
      const section = sectionPrefix || f.label;
      for (const sf of f.sub_fields) {
        const storageKey = `${f.key}__${sf.key}`;
        let rowType: MethodIntakeFlatRow['type'] = 'text';
        if (sf.type === 'select') {
          rowType = 'select';
        } else if (sf.type === 'textarea') {
          rowType = 'textarea';
        } else if (sf.type === 'checkbox') {
          rowType = 'checkbox';
        } else if (sf.type === 'ranked_checklist') {
          rowType = 'ranked_checklist';
        }
        rows.push({
          storageKey,
          label: sf.label,
          type: rowType,
          options: sf.options,
          placeholder: sf.placeholder,
          section,
          helper: sf.helper
        });
      }
    } else {
      let rowType: MethodIntakeFlatRow['type'] = 'text';
      if (f.type === 'select') {
        rowType = 'select';
      } else if (f.type === 'textarea') {
        rowType = 'textarea';
      } else if (f.type === 'checkbox') {
        rowType = 'checkbox';
      } else if (f.type === 'ranked_checklist') {
        rowType = 'ranked_checklist';
      }
      rows.push({
        storageKey: f.key,
        label: f.label,
        type: rowType,
        options: f.options,
        placeholder: f.placeholder,
        section: sectionPrefix || undefined,
        helper: f.helper
      });
    }
  }
  return rows;
}

export function allMethodIntakeStorageKeys(
  profile: MethodIntakeProfile | null,
  globalFields?: MethodIntakeField[] | null
): string[] {
  const fromProfile =
    profile?.fields?.length ? flattenMethodIntakeFields(profile.fields).map((r) => r.storageKey) : [];
  const fromGlobal = globalFields?.length
    ? flattenMethodIntakeFields(globalFields).map((r) => r.storageKey)
    : [];
  return [...fromProfile, ...fromGlobal];
}

export function resolveMethodIntakeProfile(
  config: MethodIntakeConfig | null,
  methodLabel: string
): MethodIntakeProfile | null {
  if (!config?.profiles?.length) {
    return null;
  }
  const n = methodLabel.trim().toLowerCase();
  for (const p of config.profiles) {
    if (p.id === config.defaultProfileId) {
      continue;
    }
    for (const kw of p.match) {
      if (kw && n.includes(kw.toLowerCase())) {
        return p;
      }
    }
  }
  const fallback = config.profiles.find((p) => p.id === config.defaultProfileId);
  return fallback ?? config.profiles[0] ?? null;
}

/** Section headers for method-intake template `@for` rows. */
export function methodIntakeRowsWithSectionHeaders(
  rows: MethodIntakeFlatRow[]
): Array<MethodIntakeFlatRow & { showSectionHeader: boolean }> {
  let prevSection: string | undefined;
  return rows.map((r) => {
    const showSectionHeader = Boolean(r.section && r.section !== prevSection);
    if (r.section) {
      prevSection = r.section;
    }
    return { ...r, showSectionHeader };
  });
}

/** Migrate legacy single-select on ranked_checklist keys; unknown strings left unchanged. */
export function migrateLegacyRankedFieldsForGroup(
  values: Record<string, string>,
  group: MethodIntakeField | null | undefined
): void {
  if (!group || group.type !== 'structured_group') {
    return;
  }
  const prefix = `${group.key}__`;
  for (const sf of group.sub_fields) {
    if (sf.type !== 'ranked_checklist' || !sf.options?.length) {
      continue;
    }
    const storageKey = `${prefix}${sf.key}`;
    const migrated = migrateLegacyRankedChecklistValue(values[storageKey], sf.options);
    if (migrated !== (values[storageKey] || '').trim()) {
      values[storageKey] = migrated;
    }
  }
}

/** Miasm: old single-select could be Unclear / Deferred on the ten-miasm key. */
export function migrateLegacyMiasmTenNonRanked(values: Record<string, string>): void {
  const hypKey = 'miasm_classification__miasm_ten_hypothesis';
  const fbKey = 'miasm_classification__miasm_ten_ranking_fallback';
  const raw = (values[hypKey] || '').trim();
  if (!raw || Object.keys(parseRankedChecklistJson(raw)).length) {
    return;
  }
  if (raw === 'Unclear' || raw === 'Deferred — totality only') {
    values[fbKey] = raw;
    values[hypKey] = '';
  }
}
