export type MethodIntakeSubField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  placeholder?: string;
  helper?: string;
};

export type MethodIntakeField =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'select' | 'checkbox';
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
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  placeholder?: string;
  /** Section heading (e.g. parent group or “Scientific add-ons”). */
  section?: string;
  helper?: string;
};

function isStructuredGroup(f: MethodIntakeField): f is Extract<MethodIntakeField, { type: 'structured_group' }> {
  return f.type === 'structured_group';
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
        rows.push({
          storageKey,
          label: sf.label,
          type:
            sf.type === 'select'
              ? 'select'
              : sf.type === 'textarea'
                ? 'textarea'
                : sf.type === 'checkbox'
                  ? 'checkbox'
                  : 'text',
          options: sf.options,
          placeholder: sf.placeholder,
          section,
          helper: sf.helper
        });
      }
    } else {
      rows.push({
        storageKey: f.key,
        label: f.label,
        type:
          f.type === 'select'
            ? 'select'
            : f.type === 'textarea'
              ? 'textarea'
              : f.type === 'checkbox'
                ? 'checkbox'
                : 'text',
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
  if (!profile) {
    return [];
  }
  const fromProfile = flattenMethodIntakeFields(profile.fields).map((r) => r.storageKey);
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
