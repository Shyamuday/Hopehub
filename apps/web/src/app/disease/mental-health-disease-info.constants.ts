import { DiseaseInfo } from '../models';

export const mentalHealthDiseaseInfo: DiseaseInfo = {
  slug: 'mental-health',
  name: 'Mental Health Conditions',
  shortName: 'Mental Health Care',
  imageUrl:
    'https://images.unsplash.com/photo-1493836512294-502baa1986e2?auto=format&fit=crop&w=1200&q=80',
  imageAlt: 'Mental health consultation',
  category: 'Psychological and behavioral health',
  diseaseType: 'Chronic / recurrent mental health conditions',
  icdCode: 'F00-F99 group',
  about: 'Supportive care for common mental health concerns such as anxiety, stress-related disorders, and depression.',
  summary:
    'Mental health concerns are increasingly common and can significantly affect sleep, work, relationships, and chronic disease outcomes when untreated.',
  symptoms: ['Persistent anxiety', 'Low mood', 'Sleep disturbance', 'Irritability', 'Poor concentration', 'Loss of interest'],
  causes: ['Psychosocial stress', 'Biological vulnerability', 'Trauma history', 'Chronic illness burden'],
  riskFactors: ['Family history', 'Work and financial stress', 'Substance use', 'Social isolation', 'Poor sleep'],
  diagnosis:
    'Diagnosis is based on structured symptom assessment, duration, functional impact, and risk screening by a qualified clinician.',
  tests: ['Usually clinical assessment', 'Targeted lab tests when medical causes are suspected'],
  treatmentOptions: {
    allopathy: 'Psychiatric medication may be considered when clinically indicated.',
    homeopathy: 'May be considered as supportive individualized care in selected chronic cases.',
    lifestyle: 'Counseling, routine stabilization, sleep hygiene, and stress management are essential.'
  },
  homeCare: ['Maintain sleep routine', 'Reduce social isolation', 'Practice daily stress-regulation strategies'],
  prevention: ['Early screening', 'Timely counseling', 'Substance-risk reduction', 'Balanced work-life routine'],
  severityLevel: 'Mild to moderate conditions can often be managed with planned follow-up; severe risk states need urgent in-person intervention.',
  whenToSeeDoctor: 'Consult if symptoms persist beyond 2-3 weeks, worsen functioning, or affect personal safety.',
  emergencySigns: ['Suicidal thoughts', 'Self-harm risk', 'Severe confusion', 'Acute behavioral disturbance'],
  careApproach: [
    'Assess symptom severity and safety risk',
    'Understand stressors, support systems, and medical context',
    'Create a personalized treatment and follow-up plan',
    'Escalate promptly if emergency red flags appear'
  ],
  details: [
    'Mental health is a core part of chronic disease outcomes and quality of life.',
    'Stigma often delays care; confidential, timely consultation improves recovery.',
    'Combined psychological and medical support usually gives best long-term outcomes.'
  ],
  warning:
    'If there is any self-harm risk, suicidal ideation, or severe behavioral emergency, seek immediate emergency and crisis support.'
};
