import { PrismaClient, RepertorySourceCode } from '@prisma/client';
import { normalizeRepertoryText } from '../../src/services/repertorization.js';

type RemedySeed = {
  name: string;
  abbreviation: string;
};

type RubricSeed = {
  chapter: string;
  subchapter?: string;
  text: string;
  parentPath?: string;
  remedies: Array<{ abbreviation: string; grade: number }>;
};

const REMEDIES: RemedySeed[] = [
  { name: 'Sulphur', abbreviation: 'Sulph.' },
  { name: 'Natrum muriaticum', abbreviation: 'Nat-m.' },
  { name: 'Arsenicum album', abbreviation: 'Ars.' },
  { name: 'Pulsatilla', abbreviation: 'Puls.' },
  { name: 'Lycopodium', abbreviation: 'Lyc.' },
  { name: 'Nux vomica', abbreviation: 'Nux-v.' },
  { name: 'Phosphorus', abbreviation: 'Phos.' },
  { name: 'Sepia', abbreviation: 'Sep.' }
];

const RUBRICS: RubricSeed[] = [
  {
    chapter: 'Mind',
    text: 'Anxiety, anticipation, from',
    remedies: [
      { abbreviation: 'Ars.', grade: 3 },
      { abbreviation: 'Gels.', grade: 2 },
      { abbreviation: 'Lyc.', grade: 2 },
      { abbreviation: 'Phos.', grade: 2 }
    ]
  },
  {
    chapter: 'Mind',
    text: 'Fear, death, of',
    remedies: [
      { abbreviation: 'Ars.', grade: 3 },
      { abbreviation: 'Acon.', grade: 2 },
      { abbreviation: 'Phos.', grade: 2 }
    ]
  },
  {
    chapter: 'Mind',
    text: 'Irritability, morning, on waking',
    remedies: [
      { abbreviation: 'Nux-v.', grade: 3 },
      { abbreviation: 'Bry.', grade: 2 },
      { abbreviation: 'Sulph.', grade: 2 }
    ]
  },
  {
    chapter: 'Mind',
    text: 'Grief, ailments from, suppressed',
    remedies: [
      { abbreviation: 'Nat-m.', grade: 4 },
      { abbreviation: 'Ign.', grade: 3 },
      { abbreviation: 'Ph-ac.', grade: 2 }
    ]
  },
  {
    chapter: 'Head',
    text: 'Pain, morning, on waking',
    remedies: [
      { abbreviation: 'Nat-m.', grade: 3 },
      { abbreviation: 'Nux-v.', grade: 3 },
      { abbreviation: 'Lyc.', grade: 2 },
      { abbreviation: 'Puls.', grade: 2 }
    ]
  },
  {
    chapter: 'Head',
    text: 'Pain, sun, from exposure to',
    remedies: [
      { abbreviation: 'Glono.', grade: 3 },
      { abbreviation: 'Nat-m.', grade: 2 },
      { abbreviation: 'Lach.', grade: 2 }
    ]
  },
  {
    chapter: 'Stomach',
    text: 'Nausea, morning',
    remedies: [
      { abbreviation: 'Sep.', grade: 3 },
      { abbreviation: 'Nux-v.', grade: 3 },
      { abbreviation: 'Puls.', grade: 2 },
      { abbreviation: 'Sulph.', grade: 2 }
    ]
  },
  {
    chapter: 'Stomach',
    text: 'Desires, sweets',
    remedies: [
      { abbreviation: 'Arg-n.', grade: 3 },
      { abbreviation: 'Lyc.', grade: 2 },
      { abbreviation: 'Sulph.', grade: 2 }
    ]
  },
  {
    chapter: 'Generals',
    text: 'Warmth, amelioration from',
    remedies: [
      { abbreviation: 'Ars.', grade: 3 },
      { abbreviation: 'Mag-m.', grade: 2 },
      { abbreviation: 'Nux-m.', grade: 2 }
    ]
  },
  {
    chapter: 'Generals',
    text: 'Cold, aggravation from',
    remedies: [
      { abbreviation: 'Ars.', grade: 3 },
      { abbreviation: 'Nat-m.', grade: 2 },
      { abbreviation: 'Sep.', grade: 2 },
      { abbreviation: 'Phos.', grade: 2 }
    ]
  }
];

const EXTRA_REMEDIES: RemedySeed[] = [
  { name: 'Gelsemium', abbreviation: 'Gels.' },
  { name: 'Aconitum napellus', abbreviation: 'Acon.' },
  { name: 'Bryonia', abbreviation: 'Bry.' },
  { name: 'Ignatia', abbreviation: 'Ign.' },
  { name: 'Phosphoric acid', abbreviation: 'Ph-ac.' },
  { name: 'Glonoine', abbreviation: 'Glono.' },
  { name: 'Lachesis', abbreviation: 'Lach.' },
  { name: 'Argentum nitricum', abbreviation: 'Arg-n.' },
  { name: 'Magnesia muriatica', abbreviation: 'Mag-m.' },
  { name: 'Nux moschata', abbreviation: 'Nux-m.' }
];

const MATERIA_MEDICA_SAMPLES: Record<
  string,
  Array<{ heading: string | null; content: string; depth?: number }>
> = {
  'Ars.': [
    {
      heading: 'Mind',
      content:
        'Great anguish and restlessness. Fear of death. Thinks it useless to take medicine. Despair drives from place to place.'
    },
    {
      heading: 'Generalities',
      content:
        'Burning pains, ameliorated by heat. Great prostration. Periodicity. Complaints return at same hour.'
    }
  ],
  'Nat-m.': [
    {
      heading: 'Mind',
      content:
        'Ailments from grief, disappointed love, and suppressed emotions. Wants to be alone. Consolation aggravates.'
    },
    {
      heading: 'Head',
      content: 'Throbbing headache from sunrise to sunset. Hammering pains. Worse from mental exertion.'
    }
  ],
  'Puls.': [
    {
      heading: 'Mind',
      content: 'Mild, gentle, yielding disposition. Weeps easily. Changeable mood. Wants open air.'
    },
    {
      heading: 'Stomach',
      content: 'Thirstlessness with many complaints. Nausea worse in warm room, better in open air.'
    }
  ],
  'Nux-v.': [
    {
      heading: 'Mind',
      content: 'Irritable, oversensitive, fault-finding. Cannot bear noises, odors, or light. Driven to business.'
    },
    {
      heading: 'Stomach',
      content: 'Desire for stimulants. Nausea in morning. Worse after eating or overindulgence.'
    }
  ],
  'Sulph.': [
    {
      heading: 'Mind',
      content: 'Philosophical, lazy, selfish. Religious melancholy. Averse to bathing.'
    },
    {
      heading: 'Skin',
      content: 'Dry, scaly, unhealthy skin. Itching, burning, worse from heat of bed and washing.'
    }
  ]
};

function rubricParentPath(rubric: RubricSeed) {
  if (rubric.parentPath) return rubric.parentPath;
  const segments = rubric.text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length > 1) {
    return [rubric.chapter, ...segments.slice(0, -1)].join(' > ');
  }
  return rubric.chapter;
}

function remedyKey(name: string) {
  return normalizeRepertoryText(name);
}

export async function seedRepertory(prisma: PrismaClient) {
  const importedCount = await prisma.repertoryRubric.count({
    where: { source: { code: { in: ['OOREP_PUBLICUM', 'OOREP_KENT_DE'] } } }
  });
  if (importedCount > 1000) {
    console.log(`[seed] skipping mini repertory sample (${importedCount} OOREP rubrics already imported)`);
    return;
  }

  const source = await prisma.repertorySource.upsert({
    where: { code: RepertorySourceCode.REPERTORIUM_PUBLICUM },
    update: {
      name: 'Repertorium Publicum (MVP sample)',
      description: 'Starter Kent-style sample set for development. Replace with licensed import later.',
      isActive: true
    },
    create: {
      code: RepertorySourceCode.REPERTORIUM_PUBLICUM,
      name: 'Repertorium Publicum (MVP sample)',
      description: 'Starter Kent-style sample set for development. Replace with licensed import later.',
      isActive: true
    }
  });

  const allRemedies = [...REMEDIES, ...EXTRA_REMEDIES];
  const remedyIdByAbbrev = new Map<string, string>();

  for (const remedy of allRemedies) {
    const saved = await prisma.homeopathicRemedy.upsert({
      where: { normalizedName: remedyKey(remedy.name) },
      update: { name: remedy.name, abbreviation: remedy.abbreviation },
      create: {
        name: remedy.name,
        abbreviation: remedy.abbreviation,
        normalizedName: remedyKey(remedy.name)
      }
    });
    remedyIdByAbbrev.set(remedy.abbreviation, saved.id);
  }

  for (const rubric of RUBRICS) {
    const normalizedText = normalizeRepertoryText(`${rubric.chapter} ${rubric.text}`);
    const existing = await prisma.repertoryRubric.findFirst({
      where: { sourceId: source.id, normalizedText }
    });

    const savedRubric =
      existing ||
      (await prisma.repertoryRubric.create({
        data: {
          sourceId: source.id,
          chapter: rubric.chapter,
          subchapter: rubric.subchapter || null,
          text: rubric.text,
          normalizedText,
          parentPath: rubricParentPath(rubric)
        }
      }));

    for (const link of rubric.remedies) {
      const remedyId = remedyIdByAbbrev.get(link.abbreviation);
      if (!remedyId) continue;

      await prisma.repertoryRubricRemedy.upsert({
        where: {
          rubricId_remedyId: {
            rubricId: savedRubric.id,
            remedyId
          }
        },
        update: { grade: link.grade },
        create: {
          rubricId: savedRubric.id,
          remedyId,
          grade: link.grade
        }
      });
    }
  }

  const mmSource = await prisma.materiaMedicaSource.upsert({
    where: { code: 'BOERICKE_SAMPLE' },
    update: {
      name: 'Pocket Manual (sample)',
      author: 'William Boericke',
      year: 1906,
      license: 'Development sample excerpts',
      isActive: true
    },
    create: {
      code: 'BOERICKE_SAMPLE',
      name: 'Pocket Manual (sample)',
      author: 'William Boericke',
      year: 1906,
      license: 'Development sample excerpts',
      isActive: true
    }
  });

  for (const [abbrev, sections] of Object.entries(MATERIA_MEDICA_SAMPLES)) {
    const remedyId = remedyIdByAbbrev.get(abbrev);
    if (!remedyId) continue;

    await prisma.materiaMedicaSection.deleteMany({
      where: { sourceId: mmSource.id, remedyId }
    });

    await prisma.materiaMedicaSection.createMany({
      data: sections.map((section, index) => ({
        sourceId: mmSource.id,
        remedyId,
        depth: section.depth ?? 2,
        heading: section.heading,
        content: section.content,
        sortOrder: index + 1
      }))
    });
  }
}
