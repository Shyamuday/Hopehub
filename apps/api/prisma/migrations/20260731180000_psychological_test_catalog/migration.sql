DO $$
BEGIN
  CREATE TYPE "PsychologicalTestCategory" AS ENUM (
    'COGNITIVE_INTELLIGENCE',
    'ACHIEVEMENT',
    'PSYCHOLOGICAL_PROCESS',
    'VISUAL_MOTOR_GRAPHOMOTOR',
    'BEHAVIOR_RATING',
    'ADAPTIVE_BEHAVIOR',
    'NEUROPSYCHOLOGICAL',
    'AUTISM_ASD',
    'PSYCHOLOGICAL_EMOTIONAL',
    'OBSERVATION_RECORD_REVIEW',
    'ADDITIONAL_SERVICE',
    'OPEN_RESEARCH_SCALE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PsychologicalTestAccessLevel" AS ENUM (
    'METADATA_ONLY',
    'LICENSED_PROFESSIONAL',
    'OPEN_RESEARCH',
    'PUBLIC_DOMAIN',
    'INTERNAL_SERVICE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PsychologicalTestSourceRepository" AS ENUM (
    'APA_PSYCTESTS',
    'ETS_TESTLINK',
    'PSYTOOLKIT',
    'IPIP',
    'OPEN_SOURCE_PSYCHOMETRICS',
    'PUBLISHER',
    'CLINICAL_SERVICE',
    'SCHOOL_RECORD',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PsychologicalTestCatalog" (
  "id" TEXT NOT NULL DEFAULT concat('psych_', md5(random()::text || clock_timestamp()::text)),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "abbreviation" TEXT,
  "edition" TEXT,
  "category" "PsychologicalTestCategory" NOT NULL,
  "sourceRepository" "PsychologicalTestSourceRepository" NOT NULL,
  "sourceUrl" TEXT,
  "accessLevel" "PsychologicalTestAccessLevel" NOT NULL DEFAULT 'METADATA_ONLY',
  "ageRange" TEXT,
  "administrationMode" TEXT,
  "domains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "purpose" TEXT NOT NULL,
  "licenseNote" TEXT NOT NULL,
  "canAdministerInApp" BOOLEAN NOT NULL DEFAULT false,
  "requiresProfessional" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PsychologicalTestCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PsychologicalTestCatalog_slug_key" ON "PsychologicalTestCatalog"("slug");
CREATE INDEX IF NOT EXISTS "PsychologicalTestCatalog_category_isActive_idx" ON "PsychologicalTestCatalog"("category", "isActive");
CREATE INDEX IF NOT EXISTS "PsychologicalTestCatalog_accessLevel_isActive_idx" ON "PsychologicalTestCatalog"("accessLevel", "isActive");
CREATE INDEX IF NOT EXISTS "PsychologicalTestCatalog_sourceRepository_idx" ON "PsychologicalTestCatalog"("sourceRepository");

INSERT INTO "PsychologicalTestCatalog" (
  "slug",
  "name",
  "abbreviation",
  "edition",
  "category",
  "sourceRepository",
  "sourceUrl",
  "accessLevel",
  "ageRange",
  "administrationMode",
  "domains",
  "purpose",
  "licenseNote",
  "canAdministerInApp",
  "requiresProfessional",
  "sortOrder",
  "metadata"
)
VALUES
('wisc-iv', 'Wechsler Intelligence Scale for Children', 'WISC-IV', 'Fourth Edition', 'COGNITIVE_INTELLIGENCE', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['intelligence','cognitive'], 'Measures child cognitive ability and intelligence profile.', 'Licensed professional instrument. Store metadata only; do not copy items, forms, norms, or scoring manuals.', false, true, 10, '{"sourceListNote":"User list mentioned Third Edition with WISC-IV abbreviation; catalog keeps WISC-IV as a licensed metadata entry."}'),
('wppsi-iv', 'Wechsler Preschool and Primary Scale of Intelligence', 'WPPSI-IV', 'Fourth Edition', 'COGNITIVE_INTELLIGENCE', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Preschool and young children', 'Clinician administered', ARRAY['intelligence','early-childhood'], 'Measures cognitive functioning in preschool and primary-age children.', 'Licensed professional instrument. Store metadata only.', false, true, 20, NULL),
('stanford-binet-v', 'Stanford-Binet Intelligence Test', 'SB-V', 'Fifth Edition', 'COGNITIVE_INTELLIGENCE', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['intelligence','cognitive'], 'Measures broad intellectual functioning.', 'Licensed professional instrument. Store metadata only.', false, true, 30, NULL),
('das-ii', 'Differential Abilities Scale', 'DAS-II', 'Second Edition', 'COGNITIVE_INTELLIGENCE', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Clinician administered', ARRAY['cognitive','abilities'], 'Measures cognitive abilities and learning strengths.', 'Licensed professional instrument. Store metadata only.', false, true, 40, NULL),
('wiat-iii', 'Wechsler Individual Achievement Test', 'WIAT-III', 'Third Edition', 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['achievement','academic'], 'Measures academic achievement across reading, writing, math, and oral language.', 'Licensed professional instrument. Store metadata only.', false, true, 100, NULL),
('ktea-ii', 'Kaufman Test of Educational Achievement', 'KTEA-II', 'Second Edition', 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['achievement','academic'], 'Measures academic skills and achievement.', 'Licensed professional instrument. Store metadata only.', false, true, 110, NULL),
('wj-achievement-iv', 'Woodcock-Johnson Tests of Achievement', 'WJ-IV ACH', 'Fourth Edition', 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['achievement','academic'], 'Measures achievement in academic domains.', 'Licensed professional instrument. Store metadata only.', false, true, 120, NULL),
('gort-5', 'Gray Oral Reading Tests', 'GORT-5', 'Fifth Edition', 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'School age', 'Clinician administered', ARRAY['reading','achievement'], 'Measures oral reading rate, accuracy, fluency, and comprehension.', 'Licensed professional instrument. Store metadata only.', false, true, 130, NULL),
('gsrt', 'Gray Silent Reading Test', 'GSRT', NULL, 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'School age', 'Clinician administered', ARRAY['reading','achievement'], 'Measures silent reading comprehension.', 'Licensed professional instrument. Store metadata only.', false, true, 140, NULL),
('sata', 'Scholastic Abilities Test for Adults', 'SATA', NULL, 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Adults', 'Clinician administered', ARRAY['achievement','adult-learning'], 'Measures scholastic abilities in adults.', 'Licensed professional instrument. Store metadata only.', false, true, 150, NULL),
('nelson-denny-reading-test', 'Nelson Denny Reading Test', NULL, 'Forms G and H', 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Adolescents and adults', 'Clinician administered', ARRAY['reading','achievement'], 'Measures reading vocabulary and comprehension.', 'Licensed professional instrument. Store metadata only.', false, true, 160, NULL),
('cmat', 'Comprehensive Mathematical Abilities Test', 'CMAT', NULL, 'ACHIEVEMENT', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'School age', 'Clinician administered', ARRAY['math','achievement'], 'Measures mathematical ability and learning needs.', 'Licensed professional instrument. Store metadata only.', false, true, 170, NULL),
('wraml-2', 'Wide Range Tests of Memory and Learning', 'WRAML-2', 'Second Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Clinician administered', ARRAY['memory','learning'], 'Measures memory and learning processes.', 'Licensed professional instrument. Store metadata only.', false, true, 200, NULL),
('wj-cognitive-iv', 'Woodcock-Johnson Tests of Cognitive Ability', 'WJ-IV COG', 'Fourth Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['cognitive','processing'], 'Measures cognitive abilities and psychological processes.', 'Licensed professional instrument. Store metadata only.', false, true, 210, NULL),
('nepsy-ii', 'NEPSY-II Developmental Neuropsychological Battery', 'NEPSY-II', 'Second Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['neuropsychology','development'], 'Assesses developmental neuropsychological domains.', 'Licensed professional instrument. Store metadata only.', false, true, 220, NULL),
('ctopp-2', 'Comprehensive Test of Phonological Processing', 'CTOPP-2', 'Second Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['phonological-processing','language'], 'Measures phonological awareness, memory, and rapid naming.', 'Licensed professional instrument. Store metadata only.', false, true, 230, NULL),
('celf-4', 'Clinical Evaluation of Language Fundamentals', 'CELF-4', 'Fourth Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Clinician administered', ARRAY['language'], 'Measures language skills and communication needs.', 'Licensed professional instrument. Store metadata only.', false, true, 240, NULL),
('casl', 'Comprehensive Assessment of Spoken Language', 'CASL', NULL, 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['language','communication'], 'Measures spoken language processing.', 'Licensed professional instrument. Store metadata only.', false, true, 250, NULL),
('d-kefs', 'Delis-Kaplan Executive Functioning System', 'D-KEFS', NULL, 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['executive-function','neuropsychology'], 'Measures executive functions and cognitive flexibility.', 'Licensed professional instrument. Store metadata only.', false, true, 260, NULL),
('tops-3', 'Test of Problem Solving', 'TOPS-3', 'Third Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['problem-solving','language'], 'Measures problem solving and reasoning skills.', 'Licensed professional instrument. Store metadata only.', false, true, 270, NULL),
('ppvt-iv', 'Peabody Picture Vocabulary Test', 'PPVT-IV', 'Fourth Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['vocabulary','language'], 'Measures receptive vocabulary.', 'Licensed professional instrument. Store metadata only.', false, true, 280, NULL),
('iva-cpt', 'Integrated Visual and Auditory Continuous Performance Test', 'IVA-CPT', NULL, 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Computer administered', ARRAY['attention','continuous-performance'], 'Measures sustained attention and response control.', 'Licensed professional instrument. Store metadata only.', false, true, 290, NULL),
('tea-ch', 'Test of Everyday Attention for Children', 'TEA-Ch', NULL, 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['attention'], 'Measures everyday attention in children.', 'Licensed professional instrument. Store metadata only.', false, true, 300, NULL),
('scan-3-c', 'SCAN-3 Test of Auditory Processing in Children', 'SCAN-3:C', 'Third Edition', 'PSYCHOLOGICAL_PROCESS', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['auditory-processing'], 'Screens auditory processing abilities in children.', 'Licensed professional instrument. Store metadata only.', false, true, 310, NULL),
('vmi', 'Developmental Test of Visual-Motor Integration', NULL, NULL, 'VISUAL_MOTOR_GRAPHOMOTOR', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['visual-motor','graphomotor'], 'Measures visual-motor integration.', 'Licensed professional instrument. Store metadata only.', false, true, 400, NULL),
('developmental-test-visual-perception', 'Developmental Test of Visual Perception', NULL, NULL, 'VISUAL_MOTOR_GRAPHOMOTOR', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['visual-perception'], 'Measures visual perception skills.', 'Licensed professional instrument. Store metadata only.', false, true, 410, NULL),
('developmental-test-motor-coordination', 'Developmental Test of Motor Coordination', NULL, NULL, 'VISUAL_MOTOR_GRAPHOMOTOR', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['motor-coordination','graphomotor'], 'Measures motor coordination skills.', 'Licensed professional instrument. Store metadata only.', false, true, 420, NULL),
('basc-2', 'Behavior Assessment System for Children', 'BASC-2', 'Second Edition', 'BEHAVIOR_RATING', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Parent, teacher, and child rating scales', ARRAY['behavior','emotional','school'], 'Assesses behavioral and emotional functioning.', 'Licensed professional instrument. Store metadata only.', false, true, 500, NULL),
('conners-3', 'Conners 3 Rating Scales', 'Conners 3', NULL, 'BEHAVIOR_RATING', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Parent and teacher rating scales', ARRAY['attention','behavior','adhd'], 'Assesses attention, behavior, and related concerns.', 'Licensed professional instrument. Store metadata only.', false, true, 510, NULL),
('brief', 'Behavior Rating Index of Executive Functions', 'BRIEF', NULL, 'BEHAVIOR_RATING', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Rating scale', ARRAY['executive-function','behavior'], 'Assesses executive function in everyday behavior.', 'Licensed professional instrument. Store metadata only.', false, true, 520, NULL),
('sib-r', 'Scales of Independent Behavior - Revised', 'SIB-R', 'Revised', 'ADAPTIVE_BEHAVIOR', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Interview or rating scale', ARRAY['adaptive-behavior'], 'Measures adaptive and independent functioning.', 'Licensed professional instrument. Store metadata only.', false, true, 600, NULL),
('vineland', 'Vineland Adaptive Behavior Scales', 'Vineland', NULL, 'ADAPTIVE_BEHAVIOR', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Interview or rating scale', ARRAY['adaptive-behavior'], 'Measures adaptive behavior across daily functioning domains.', 'Licensed professional instrument. Store metadata only.', false, true, 610, NULL),
('rcft', 'Rey Osterrieth Complex Figure', 'RCFT', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['visual-memory','neuropsychology'], 'Assesses visuospatial construction and visual memory.', 'Licensed professional instrument. Store metadata only.', false, true, 700, NULL),
('grooved-pegboard', 'Grooved Pegboard Test', NULL, NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['motor-speed','dexterity'], 'Measures fine motor speed and dexterity.', 'Licensed professional instrument. Store metadata only.', false, true, 710, NULL),
('cowat', 'Controlled Oral Word Association Test', 'COWAT', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['verbal-fluency','executive-function'], 'Measures phonemic verbal fluency.', 'Licensed professional instrument. Store metadata only.', false, true, 720, NULL),
('stroop-color-word', 'Stroop Color and Word Test', 'Stroop', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['attention','inhibition'], 'Measures attention, inhibition, and cognitive interference.', 'Licensed professional instrument. Store metadata only.', false, true, 730, NULL),
('trail-making-test', 'Trail Making Test', 'TMT', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['attention','processing-speed','executive-function'], 'Measures attention, speed, and cognitive flexibility.', 'Licensed professional instrument. Store metadata only.', false, true, 740, NULL),
('wcst', 'Wisconsin Card Sorting Test', 'WCST', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['executive-function','set-shifting'], 'Measures abstract reasoning and set shifting.', 'Licensed professional instrument. Store metadata only.', false, true, 750, NULL),
('ruff-figural-fluency', 'Ruff Figural Fluency Test', NULL, NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['figural-fluency','executive-function'], 'Measures nonverbal fluency.', 'Licensed professional instrument. Store metadata only.', false, true, 760, NULL),
('hooper-visual-orientation', 'Hooper Visual Orientation Test', NULL, NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['visual-orientation','perception'], 'Measures visual organization and perception.', 'Licensed professional instrument. Store metadata only.', false, true, 770, NULL),
('judgment-line-orientation', 'Judgment of Line Orientation', NULL, NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['visuospatial','perception'], 'Measures spatial orientation judgment.', 'Licensed professional instrument. Store metadata only.', false, true, 780, NULL),
('boston-naming-test', 'Boston Naming Test', 'BNT', NULL, 'NEUROPSYCHOLOGICAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Clinician administered', ARRAY['language','naming'], 'Measures confrontation naming ability.', 'Licensed professional instrument. Store metadata only.', false, true, 790, NULL),
('ados-2', 'Autism Diagnostic Observation Schedule', 'ADOS-2', 'Second Edition', 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Toddlers to adults', 'Clinician administered', ARRAY['autism','diagnostic-observation'], 'Standardized observational assessment for autism spectrum disorder.', 'Licensed professional instrument requiring trained administration. Store metadata only.', false, true, 800, NULL),
('adi-r', 'Autism Diagnostic Interview - Revised', 'ADI-R', 'Revised', 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Developmental history', 'Clinician interview', ARRAY['autism','caregiver-interview'], 'Structured caregiver interview for autism assessment.', 'Licensed professional instrument requiring trained administration. Store metadata only.', false, true, 810, NULL),
('autism-spectrum-rating-scale', 'Autism Spectrum Rating Scale', 'ASRS', NULL, 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Rating scale', ARRAY['autism','rating-scale'], 'Assesses behaviors associated with autism spectrum disorder.', 'Licensed professional instrument. Store metadata only.', false, true, 820, NULL),
('srs', 'Social Responsiveness Scale', 'SRS', NULL, 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children to adults', 'Rating scale', ARRAY['autism','social-communication'], 'Measures social responsiveness and autism-related traits.', 'Licensed professional instrument. Store metadata only.', false, true, 830, NULL),
('scq', 'Social Communication Questionnaire', 'SCQ', NULL, 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Caregiver questionnaire', ARRAY['autism','social-communication'], 'Screens social communication concerns related to autism.', 'Licensed professional instrument. Store metadata only.', false, true, 840, NULL),
('assq', 'High Functioning Autism Spectrum Screening Questionnaire', 'ASSQ', NULL, 'AUTISM_ASD', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Questionnaire', ARRAY['autism','screening'], 'Screens autism spectrum traits in higher-functioning children.', 'Licensed professional instrument or restricted source. Verify rights before in-app use.', false, true, 850, NULL),
('roberts-apperception-test', 'Robert''s Apperception Test', NULL, NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Clinician administered', ARRAY['projective','emotional'], 'Explores social perception and emotional themes.', 'Licensed professional instrument. Store metadata only.', false, true, 900, NULL),
('tat', 'Thematic Apperception Test', 'TAT', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Adolescents and adults', 'Clinician administered', ARRAY['projective','personality'], 'Explores personality and emotional themes.', 'Licensed professional instrument. Store metadata only.', false, true, 910, NULL),
('maci', 'Millon Adolescent Clinical Inventory', 'MACI', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Adolescents', 'Self-report inventory', ARRAY['personality','clinical'], 'Assesses adolescent personality and clinical concerns.', 'Licensed professional instrument. Store metadata only.', false, true, 920, NULL),
('m-paci', 'Millon Pre-Adolescent Clinical Inventory', 'M-PACI', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Pre-adolescents', 'Self-report inventory', ARRAY['personality','clinical'], 'Assesses pre-adolescent clinical concerns.', 'Licensed professional instrument. Store metadata only.', false, true, 930, NULL),
('mmpi-a', 'Minnesota Multiphasic Personality Inventory-Adolescent', 'MMPI-A', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Adolescents', 'Self-report inventory', ARRAY['personality','clinical'], 'Assesses adolescent personality and psychopathology.', 'Licensed professional instrument. Store metadata only.', false, true, 940, NULL),
('house-tree-person-kinetic-family', 'House-Tree-Person and Kinetic Family Projective Drawings', NULL, NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'CLINICAL_SERVICE', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Clinician administered', ARRAY['projective','emotional'], 'Projective drawing tasks used as part of broader emotional assessment.', 'Professional-use method. Store metadata and clinical notes only.', false, true, 950, NULL),
('rcmas', 'Revised Children''s Manifest Anxiety Scale', 'RCMAS', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Self-report scale', ARRAY['anxiety','emotional'], 'Assesses anxiety symptoms in children.', 'Licensed professional instrument. Store metadata only.', false, true, 960, NULL),
('childrens-depression-inventory', 'Kovacs Children''s Depression Inventory', 'CDI', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children and adolescents', 'Self-report scale', ARRAY['depression','emotional'], 'Assesses depressive symptoms in children and adolescents.', 'Licensed professional instrument. Store metadata only.', false, true, 970, NULL),
('sentence-completion-test', 'Sentence Completion Test', NULL, NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'CLINICAL_SERVICE', NULL, 'LICENSED_PROFESSIONAL', 'Varies', 'Clinician administered', ARRAY['projective','emotional'], 'Explores emotional themes as part of a clinical battery.', 'Use only with approved forms and professional oversight.', false, true, 980, NULL),
('harris-goodenough-draw-a-person', 'Harris-Goodenough Draw-A-Person Rating System', NULL, NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'PUBLISHER', NULL, 'LICENSED_PROFESSIONAL', 'Children', 'Clinician administered', ARRAY['drawing','development'], 'Rates human figure drawings for developmental or clinical context.', 'Verify copyright and current clinical appropriateness before use.', false, true, 990, NULL),
('social-anxiety-scale', 'Social Anxiety Scale', NULL, NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'CUSTOM', NULL, 'METADATA_ONLY', 'Varies', 'Self-report scale', ARRAY['social-anxiety'], 'Represents social anxiety screening measures; exact instrument must be selected by clinician/admin.', 'Generic catalog entry. Add a specific licensed or open instrument before administering.', false, true, 1000, NULL),
('juvenile-bipolar-questionnaire', 'Juvenile Bipolar Questionnaire', 'JBQ', NULL, 'PSYCHOLOGICAL_EMOTIONAL', 'CUSTOM', NULL, 'METADATA_ONLY', 'Children and adolescents', 'Caregiver questionnaire', ARRAY['mood','bipolar-screening'], 'Screens symptoms related to pediatric bipolar concerns.', 'Verify source, licensing, and clinical workflow before use.', false, true, 1010, NULL),
('behavioral-observations', 'Behavioral Observations', NULL, NULL, 'OBSERVATION_RECORD_REVIEW', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'All ages', 'Clinician observation', ARRAY['observation','clinical-context'], 'Documents observed behavior during assessment.', 'Internal clinical service entry. No copyrighted test content.', true, true, 1100, NULL),
('school-record-review', 'Review of School Records', NULL, NULL, 'OBSERVATION_RECORD_REVIEW', 'SCHOOL_RECORD', NULL, 'INTERNAL_SERVICE', 'School age', 'Document review', ARRAY['school','records'], 'Reviews school records relevant to evaluation.', 'Internal service entry. Handle records under privacy policy and consent.', true, true, 1110, NULL),
('past-evaluation-medical-record-review', 'Review of Past Evaluations and Medical Records', NULL, NULL, 'OBSERVATION_RECORD_REVIEW', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'All ages', 'Document review', ARRAY['medical-records','past-evaluations'], 'Reviews prior evaluations and medical history.', 'Internal service entry. Handle records under privacy policy and consent.', true, true, 1120, NULL),
('collateral-phone-contact', 'Telephone Contact with Teachers, Professionals, or Relevant Individuals', NULL, NULL, 'OBSERVATION_RECORD_REVIEW', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'All ages', 'Collateral contact', ARRAY['collateral','care-coordination'], 'Captures collateral information from relevant contacts.', 'Internal service entry. Consent should be recorded before contact.', true, true, 1130, NULL),
('school-observation', 'School Observation', NULL, NULL, 'ADDITIONAL_SERVICE', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'School age', 'Observation visit', ARRAY['school','observation'], 'Optional school observation service.', 'Internal service entry. Requires scheduling and consent.', true, true, 1200, NULL),
('school-results-meeting', 'Meeting with Child''s School to Discuss Evaluation Results', NULL, NULL, 'ADDITIONAL_SERVICE', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'School age', 'Meeting', ARRAY['school','feedback'], 'Optional school meeting to review findings and supports.', 'Internal service entry. Requires guardian consent.', true, true, 1210, NULL),
('extensive-emotional-testing', 'Extensive Emotional Testing', NULL, NULL, 'ADDITIONAL_SERVICE', 'CLINICAL_SERVICE', NULL, 'INTERNAL_SERVICE', 'All ages', 'Clinical add-on', ARRAY['emotional','extended-assessment'], 'Optional in-depth emotional testing service.', 'Internal service entry. Exact instruments must be selected and licensed separately.', true, true, 1220, NULL),
('ipip-public-domain-scales', 'International Personality Item Pool Public-Domain Scales', 'IPIP', NULL, 'OPEN_RESEARCH_SCALE', 'IPIP', 'https://ipip.ori.org/', 'PUBLIC_DOMAIN', 'Research and adult self-report contexts', 'Self-report questionnaire', ARRAY['personality','public-domain','research'], 'Catalog source for public-domain personality items and scales that may be reviewed for in-app use.', 'Public-domain source, but each selected scale should still receive clinical/content review before publication.', false, false, 1300, NULL),
('psytoolkit-survey-library', 'PsyToolkit Survey Library', 'PsyToolkit', NULL, 'OPEN_RESEARCH_SCALE', 'PSYTOOLKIT', 'https://psytoolkit.org/survey-library/', 'OPEN_RESEARCH', 'Research contexts', 'Online survey or experiment', ARRAY['survey','research','open-toolkit'], 'Catalog source for ready-made psychological surveys and experiments.', 'Review individual survey terms and academic/non-commercial restrictions before in-app use.', false, false, 1310, NULL),
('apa-psyctests-repository', 'APA PsycTests Repository', 'APA PsycTests', NULL, 'OPEN_RESEARCH_SCALE', 'APA_PSYCTESTS', 'https://www.apa.org/pubs/databases/psyctests', 'OPEN_RESEARCH', 'Research and teaching contexts', 'Repository reference', ARRAY['repository','research','metadata'], 'Reference repository for psychological tests, measures, and related metadata.', 'Repository access and each instrument have separate rights. Do not import full text without permission.', false, true, 1320, NULL),
('ets-testlink', 'ETS TestLink Test Collection', 'ETS TestLink', NULL, 'OPEN_RESEARCH_SCALE', 'ETS_TESTLINK', 'https://www.ets.org/test-collection.html', 'METADATA_ONLY', 'Research and professional contexts', 'Repository reference', ARRAY['repository','education','assessment'], 'Reference database for standardized tests and research instruments.', 'Repository metadata only. Individual instruments may be copyrighted or restricted.', false, true, 1330, NULL),
('open-source-psychometrics-project', 'Open Source Psychometrics Project', 'OSPP', NULL, 'OPEN_RESEARCH_SCALE', 'OPEN_SOURCE_PSYCHOMETRICS', 'https://openpsychometrics.org/', 'OPEN_RESEARCH', 'Educational and personal exploration contexts', 'Interactive online tests', ARRAY['personality','education','datasets'], 'Open educational psychometrics site and datasets that may inspire non-diagnostic experiences.', 'Review project terms and avoid presenting educational tests as clinical diagnostics.', false, false, 1340, NULL)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "abbreviation" = EXCLUDED."abbreviation",
  "edition" = EXCLUDED."edition",
  "category" = EXCLUDED."category",
  "sourceRepository" = EXCLUDED."sourceRepository",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "accessLevel" = EXCLUDED."accessLevel",
  "ageRange" = EXCLUDED."ageRange",
  "administrationMode" = EXCLUDED."administrationMode",
  "domains" = EXCLUDED."domains",
  "purpose" = EXCLUDED."purpose",
  "licenseNote" = EXCLUDED."licenseNote",
  "canAdministerInApp" = EXCLUDED."canAdministerInApp",
  "requiresProfessional" = EXCLUDED."requiresProfessional",
  "sortOrder" = EXCLUDED."sortOrder",
  "metadata" = EXCLUDED."metadata",
  "updatedAt" = CURRENT_TIMESTAMP;
