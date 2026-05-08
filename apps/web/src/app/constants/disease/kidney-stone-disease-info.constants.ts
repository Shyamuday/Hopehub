import { type DiseaseInfo } from '../../interfaces';

export const kidneyStoneDiseaseInfo: DiseaseInfo = {
    slug: 'kidney-stone',
    name: 'Kidney Stone (Renal Calculi)',
    shortName: 'Kidney Stone',
    imageUrl:
        'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Kidney stone consultation and care',
    category: 'Urological / Renal',
    diseaseType: 'Acute episodic with chronic recurrence tendency',
    icdCode: 'N20.0',

    summary:
        'Kidney stones are hard mineral and salt deposits that form inside the kidneys. They cause severe pain during passage and have a high recurrence rate without proper dietary and lifestyle correction.',

    about:
        'Kidney stones (renal calculi) form when urine becomes concentrated and minerals crystallize. They range from sand-like particles to stones several centimetres in size. Most stones pass on their own with hydration and pain management, but larger stones or recurrent cases need structured medical care. Homeopathy has a well-documented role in supporting stone passage, reducing pain, and preventing recurrence through constitutional and acute prescribing.',

    ourApproach: {
        title: 'Homeopathy-led kidney stone care — passage support, pain relief, and recurrence prevention',
        intro:
            'Our approach combines acute symptom management with long-term constitutional care. We do not just treat the pain episode — we work on the underlying tendency to form stones, which is where homeopathy offers its strongest value.',
        points: [
            'Assess stone size, location, type, and symptom severity before recommending a care path',
            'Use acute homeopathic remedies to support stone passage and reduce renal colic pain',
            'Identify the stone type (calcium oxalate, uric acid, struvite, cystine) to guide dietary and constitutional treatment',
            'Prescribe constitutional remedies to reduce the recurrence tendency over time',
            'Coordinate with urology when stone size or obstruction requires intervention',
            'Provide detailed dietary and hydration guidance specific to the stone type',
            'Track follow-up through urine analysis, ultrasound reports, and symptom review'
        ]
    },

    symptoms: [
        'Sudden, severe flank or lower back pain (renal colic) — often described as the worst pain experienced',
        'Pain radiating from the back to the lower abdomen and groin',
        'Pain that comes in waves and fluctuates in intensity',
        'Burning or pain during urination',
        'Pink, red, or brown urine (hematuria)',
        'Cloudy or foul-smelling urine',
        'Nausea and vomiting during pain episodes',
        'Persistent urge to urinate or urinating more frequently than usual',
        'Urinating in small amounts',
        'Fever and chills if infection is present (urgent sign)',
        'Groin or testicular pain in men',
        'Small stone particles visible in urine'
    ],

    causes: [
        'Inadequate fluid intake leading to concentrated urine',
        'High dietary oxalate intake (spinach, nuts, chocolate, tea)',
        'Excess dietary sodium increasing calcium in urine',
        'High animal protein diet raising uric acid levels',
        'Low dietary calcium paradoxically increasing oxalate absorption',
        'Hyperparathyroidism causing elevated blood calcium',
        'Recurrent urinary tract infections (struvite stones)',
        'Gout or high uric acid levels (uric acid stones)',
        'Rare metabolic disorders such as cystinuria',
        'Inflammatory bowel disease or intestinal surgery affecting oxalate absorption',
        'Certain medications — diuretics, calcium-based antacids, topiramate',
        'Family history of kidney stones',
        'Sedentary lifestyle and obesity'
    ],

    riskFactors: [
        'Personal or family history of kidney stones',
        'Dehydration or low daily fluid intake',
        'High-protein, high-sodium, or high-oxalate diet',
        'Obesity or metabolic syndrome',
        'Gout or hyperuricemia',
        'Hyperparathyroidism',
        'Recurrent urinary tract infections',
        'Inflammatory bowel disease',
        'Living in hot climates with high sweat loss',
        'Sedentary occupation with low physical activity',
        'Male gender (men are 2–3x more likely)',
        'Age 30–60 years (peak incidence)',
        'Certain medications — loop diuretics, calcium supplements, vitamin C excess'
    ],

    diagnosis:
        'Diagnosis is based on symptom history, urine analysis, and imaging. A non-contrast CT scan of the abdomen and pelvis is the gold standard for detecting stones. Ultrasound is used for initial screening and follow-up. Urine analysis checks for blood, crystals, and infection. Blood tests assess kidney function, calcium, uric acid, and electrolytes. Stone composition analysis after passage guides long-term prevention.',

    tests: [
        'Non-contrast CT abdomen and pelvis (gold standard for stone detection)',
        'Kidney, ureter, bladder (KUB) X-ray for radio-opaque stones',
        'Renal ultrasound (initial screening and follow-up)',
        'Urine routine and microscopy (blood, crystals, infection)',
        'Urine culture if infection is suspected',
        '24-hour urine collection for calcium, oxalate, uric acid, citrate, and volume',
        'Serum creatinine and eGFR (kidney function)',
        'Serum calcium, phosphorus, and parathyroid hormone (PTH)',
        'Serum uric acid',
        'Serum electrolytes',
        'Stone composition analysis if stone is passed or retrieved'
    ],

    treatmentOptions: {
        allopathy:
            'Pain management with NSAIDs or opioids for acute colic. Alpha-blockers (tamsulosin) to facilitate stone passage. Lithotripsy (ESWL), ureteroscopy, or percutaneous nephrolithotomy for stones that do not pass. Preventive medications based on stone type — thiazide diuretics for calcium stones, allopurinol for uric acid stones, potassium citrate for oxalate and uric acid stones.',
        ayurveda:
            'Punarnava, Gokshura, Varuna, and Pashanabheda are traditionally used for urinary calculi. Cystone and similar formulations are commonly used as supportive care. Dietary and lifestyle guidance aligns with Ayurvedic principles of reducing pitta and ama.',
        homeopathy:
            'Homeopathy has a strong clinical track record in kidney stone management. Berberis vulgaris is the most commonly indicated remedy for left-sided renal colic with radiating pain. Lycopodium for right-sided stones with urinary symptoms. Cantharis for intense burning urination. Sarsaparilla for pain at the end of urination and small sandy deposits. Ocimum canum for right-sided colic with nausea. Colocynthis for cramping, colicky pain relieved by pressure. Constitutional prescribing reduces recurrence tendency significantly.',
        lifestyle:
            'Increase fluid intake to produce at least 2–2.5 litres of urine daily. Reduce sodium, animal protein, and oxalate-rich foods based on stone type. Maintain healthy body weight. Regular moderate physical activity. Avoid vitamin C megadosing. Lemon juice (citrate source) may help prevent calcium oxalate stones.'
    },

    medications: [
        'Acute pain: NSAIDs (diclofenac, ketorolac) or opioids under medical supervision',
        'Stone passage: Tamsulosin (alpha-blocker) to relax ureter and aid passage',
        'Calcium oxalate prevention: Potassium citrate, thiazide diuretics',
        'Uric acid stones: Allopurinol, potassium citrate to alkalinize urine',
        'Struvite stones: Antibiotics to treat underlying infection',
        'Homeopathic acute: Berberis vulgaris, Lycopodium, Cantharis, Sarsaparilla, Ocimum canum',
        'Homeopathic constitutional: Based on individual case assessment by doctor'
    ],

    homeCare: [
        'Drink 2.5–3 litres of water daily — urine should be pale yellow, not dark',
        'Add fresh lemon juice to water daily — citrate helps prevent stone formation',
        'Reduce table salt and processed food intake significantly',
        'Limit animal protein (meat, fish, eggs) to moderate portions',
        'Avoid oxalate-rich foods if you have calcium oxalate stones — spinach, beets, nuts, chocolate, strong tea',
        'Do not restrict dietary calcium — low calcium diet increases oxalate absorption',
        'Avoid vitamin C supplements above 500 mg/day',
        'Stay active — sedentary lifestyle increases stone risk',
        'Strain urine during a stone episode to collect the stone for analysis',
        'Apply warm compress to the flank for mild pain relief',
        'Track fluid intake and urine output during an acute episode'
    ],

    prevention: [
        'Maintain daily urine output above 2 litres through consistent hydration',
        'Reduce sodium intake to less than 2,300 mg/day',
        'Moderate animal protein consumption',
        'Eat adequate dietary calcium (dairy or plant-based) — do not avoid it',
        'Limit high-oxalate foods if prone to calcium oxalate stones',
        'Maintain healthy body weight',
        'Treat gout and hyperuricemia proactively',
        'Treat recurrent UTIs promptly to prevent struvite stones',
        'Follow up with 24-hour urine testing after first stone to identify metabolic risk',
        'Constitutional homeopathic treatment to reduce recurrence tendency',
        'Annual renal ultrasound for those with recurrent stone history'
    ],

    severityLevel:
        'Small stones (under 5 mm) often pass spontaneously and are suitable for online consultation with monitoring. Stones 5–10 mm may need urological input. Stones above 10 mm, complete obstruction, or stones with fever/infection require urgent offline care.',

    whenToSeeDoctor:
        'Consult if you have flank or groin pain, blood in urine, burning urination, nausea with back pain, or a history of previous stones. Seek urgent care if pain is uncontrollable, fever is present, or urine output drops significantly.',

    emergencySigns: [
        'Fever above 38.5°C with flank pain — suggests infected obstructed kidney (urological emergency)',
        'Complete absence of urine output',
        'Uncontrollable vomiting preventing oral intake',
        'Severe pain not responding to any medication',
        'Known single kidney with obstruction',
        'Signs of sepsis — high fever, chills, rapid heart rate, confusion'
    ],

    duration:
        'Small stones (under 4 mm) typically pass within 1–2 weeks with hydration. Stones 4–6 mm may take 2–4 weeks. Larger stones often require intervention. Constitutional homeopathic treatment for recurrence prevention is tracked over 3–6 months.',

    stages: [
        'Acute episode — pain management, hydration, stone passage support',
        'Stone analysis — identify type to guide prevention',
        'Metabolic workup — 24-hour urine, blood tests to find root cause',
        'Dietary correction — specific to stone type',
        'Constitutional homeopathic treatment — reduce recurrence tendency',
        'Follow-up imaging — confirm stone clearance and monitor for new formation'
    ],

    commonIn: {
        ageGroup: '30–60 years (peak incidence; can occur at any age)',
        gender: 'Men 2–3x more commonly affected; post-menopausal women have increased risk'
    },

    faq: [
        {
            question: 'Can homeopathy dissolve kidney stones?',
            answer:
                'Homeopathy does not chemically dissolve stones, but it has a strong clinical role in supporting stone passage, reducing renal colic pain, and significantly lowering recurrence. Remedies like Berberis vulgaris, Lycopodium, and Sarsaparilla are well-established in acute kidney stone management. Constitutional treatment addresses the underlying tendency to form stones.'
        },
        {
            question: 'How much water should I drink to prevent kidney stones?',
            answer:
                'You should aim to produce at least 2–2.5 litres of urine per day. This typically requires drinking 2.5–3 litres of fluid daily, more in hot weather or if you exercise. Pale yellow urine is the target. Adding fresh lemon juice provides citrate, which actively inhibits calcium oxalate stone formation.'
        },
        {
            question: 'What foods should I avoid if I have kidney stones?',
            answer:
                'It depends on your stone type. For calcium oxalate stones (most common): reduce spinach, beets, nuts, chocolate, and strong tea. For uric acid stones: reduce red meat, organ meats, shellfish, and alcohol. For all types: reduce salt and animal protein. Do not avoid dairy — adequate dietary calcium actually reduces oxalate absorption.'
        },
        {
            question: 'Will my stone pass on its own?',
            answer:
                'Stones under 4 mm pass spontaneously in about 80% of cases. Stones 4–6 mm pass in about 60% of cases, often with the help of alpha-blockers. Stones above 6 mm are less likely to pass without intervention. Your doctor will assess stone size and location from your imaging report to guide the decision.'
        },
        {
            question: 'Why do kidney stones keep coming back?',
            answer:
                'Recurrence is common — about 50% of people have a second stone within 5–10 years without preventive measures. Recurrence is driven by metabolic factors (high uric acid, hyperparathyroidism, low citrate), dietary habits, dehydration, and genetic tendency. A 24-hour urine test after the first stone identifies your specific risk factors. Constitutional homeopathic treatment alongside dietary correction significantly reduces recurrence.'
        },
        {
            question: 'When does a kidney stone need surgery?',
            answer:
                'Surgical intervention is needed when the stone is too large to pass (typically above 10 mm), causes complete obstruction, is associated with infection (infected hydronephrosis), or does not pass after 4–6 weeks of conservative management. Options include ESWL (shock wave lithotripsy), ureteroscopy with laser fragmentation, or percutaneous nephrolithotomy for large stones.'
        },
        {
            question: 'Is kidney stone pain the worst pain a person can feel?',
            answer:
                'Renal colic is consistently ranked among the most severe pain experiences, often compared to childbirth. The pain is caused by the stone stretching and obstructing the ureter, triggering intense smooth muscle spasm. It typically comes in waves and can be accompanied by nausea, vomiting, and sweating. Effective pain management is a priority in acute care.'
        },
        {
            question: 'Can I consult online for kidney stone treatment?',
            answer:
                'Yes. Online consultation is appropriate for acute stone episodes where imaging is already available, for follow-up after a stone episode, for dietary and lifestyle guidance, and for constitutional homeopathic treatment to prevent recurrence. If you have fever, very severe uncontrolled pain, or no urine output, seek emergency care immediately.'
        },
        {
            question: 'Why should I choose homeopathy for kidney stones?',
            answer:
                'Most conventional treatments address the stone itself — breaking it, removing it, or managing the pain. They do not address why your body keeps forming stones in the first place. Homeopathy works at a deeper level by correcting the metabolic and constitutional tendency that drives stone formation. Remedies like Berberis vulgaris, Lycopodium, Sarsaparilla, and Cantharis are not just pain relievers — they support the kidneys, improve urine flow, reduce crystal deposition tendency, and work on the underlying pattern that makes your body prone to forming stones. For acute episodes, homeopathy can significantly reduce renal colic pain and support stone passage without the side effects of strong painkillers. For long-term care, constitutional prescribing addresses the root — whether it is a uric acid tendency, oxalate metabolism issue, or a deeper constitutional predisposition. This is why homeopathy is not just an alternative for kidney stones — it is often the most complete approach available.'
        },
        {
            question: 'I already had surgery or lithotripsy for my stone. Do I still need treatment?',
            answer:
                'Yes — and this is one of the most important points most patients miss. Surgery, laser fragmentation, or shock wave lithotripsy removes the stone. It does not remove the reason your body formed it. Without addressing the root cause, the recurrence rate is about 50% within 5 years and up to 80% within 10 years. The stone will come back — often multiple times — unless the underlying tendency is corrected. This is exactly where homeopathy delivers its strongest value. After your stone has been cleared, constitutional homeopathic treatment works on the metabolic and physiological pattern that caused the stone to form — whether that is a uric acid tendency, calcium oxalate crystallization, low urinary citrate, or a deeper constitutional predisposition. Combined with dietary correction specific to your stone type, this approach can dramatically reduce or completely stop recurrence. If you have already been through the pain of a stone episode or a procedure, the most important next step is not waiting for the next stone — it is treating the core so there is no next stone.'
        }
    ],

    careApproach: [
        'Review imaging reports, urine analysis, and symptom history before consultation',
        'Prescribe acute homeopathic remedies for pain and stone passage support',
        'Identify stone type and guide specific dietary correction',
        'Recommend metabolic workup (24-hour urine, blood tests) to find root cause',
        'Prescribe constitutional homeopathic treatment to reduce recurrence tendency',
        'Coordinate urology referral when stone size or obstruction warrants intervention',
        'Follow up on stone clearance through repeat imaging and symptom review'
    ],

    details: [
        'Kidney stones are one of the most painful and recurrent urological conditions, affecting 1 in 10 people at some point in their life.',
        'The most common type is calcium oxalate (about 80% of cases), followed by uric acid stones (10–15%), struvite stones (5–10%), and cystine stones (rare).',
        'Homeopathy has a well-established acute and constitutional role in kidney stone management, with Berberis vulgaris being the most widely used remedy for renal colic.',
        'Stone recurrence is preventable — identifying your stone type and metabolic risk through proper testing is the most important step after the first episode.',
        'Dietary changes specific to your stone type, combined with adequate hydration, can reduce recurrence risk by over 50%.'
    ],

    warning:
        'Kidney stone with fever is a urological emergency. An infected obstructed kidney (pyonephrosis) can progress to sepsis rapidly. If you have flank pain with fever, chills, or very low urine output, go to an emergency department immediately.',

    reviewedBy: 'Vitalis Care and Research Centre care team',
    lastUpdated: '2026-05-02',
    references: [
        'European Association of Urology (EAU) Guidelines on Urolithiasis',
        'American Urological Association (AUA) Medical Management of Kidney Stones Guidelines',
        'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)',
        'Boericke W. — Pocket Manual of Homoeopathic Materia Medica',
        'Clarke J.H. — A Dictionary of Practical Materia Medica',
        'Clinical review by Vitalis Care and Research Centre consultation doctors'
    ],

    seo: {
        metaTitle: 'Kidney Stone Treatment | Vitalis Care and Research Centre',
        metaDescription:
            'Doctor-led kidney stone care at Vitalis Care and Research Centre. Homeopathy for renal colic, stone passage support, and recurrence prevention. Online consultation available.',
        keywords: [
            'kidney stone treatment',
            'renal calculi homeopathy',
            'kidney stone homeopathy',
            'Berberis vulgaris kidney stone',
            'renal colic treatment',
            'kidney stone recurrence prevention',
            'kidney stone diet',
            'online kidney stone consultation',
            'stone passage support',
            'calcium oxalate stone',
            'uric acid kidney stone',
            'Vitalis Care and Research Centre',
            'homeopathy for kidney stone',
            'kidney stone pain relief',
            'urological care online'
        ],
        ogTitle: 'Kidney Stone Care | Vitalis Care and Research Centre',
        ogDescription:
            'Structured homeopathy-led care for kidney stones — acute pain relief, stone passage support, and long-term recurrence prevention. Consult online.',
        canonicalPath: '/treatments/kidney-stone'
    }
};
