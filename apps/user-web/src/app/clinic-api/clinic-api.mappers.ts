import { Consultation, Disease, DiseaseFaqItem, DiseaseInfo, DoseEvent, Payment, Prescription } from '../models';

function mapPublicPageFromApi(row: Record<string, unknown>): DiseaseInfo | null {
  const page = row['publicPage'] as Record<string, unknown> | null | undefined;
  if (!page) return null;
  return {
    name: (page['name'] as string) || (row['name'] as string),
    shortName: (page['shortName'] as string) || (page['name'] as string) || (row['name'] as string),
    slug: (page['slug'] as string) || (row['slug'] as string) || '',
    imageUrl: (page['imageUrl'] as string) || (row['publicImageUrl'] as string) || '',
    imageAlt: (page['imageAlt'] as string) || (page['name'] as string) || (row['name'] as string),
    category: page['category'] as string | undefined,
    diseaseType: page['diseaseType'] as string | undefined,
    icdCode: page['icdCode'] as string | undefined,
    summary: (page['summary'] as string) || (row['publicDescription'] as string) || '',
    about: (page['about'] as string) || (page['summary'] as string) || '',
    ourApproach: page['ourApproach'] as DiseaseInfo['ourApproach'],
    symptoms: (page['symptoms'] as string[]) || [],
    causes: page['causes'] as string[] | undefined,
    riskFactors: page['riskFactors'] as string[] | undefined,
    diagnosis: page['diagnosis'] as string | undefined,
    tests: page['tests'] as string[] | undefined,
    treatmentOptions: page['treatmentOptions'] as DiseaseInfo['treatmentOptions'],
    medications: page['medications'] as string[] | undefined,
    homeCare: page['homeCare'] as string[] | undefined,
    prevention: page['prevention'] as string[] | undefined,
    severityLevel: page['severityLevel'] as string | undefined,
    whenToSeeDoctor: page['whenToSeeDoctor'] as string | undefined,
    emergencySigns: page['emergencySigns'] as string[] | undefined,
    duration: page['duration'] as string | undefined,
    stages: page['stages'] as string[] | undefined,
    commonIn: page['commonIn'] as DiseaseInfo['commonIn'],
    faq: (page['faq'] as DiseaseFaqItem[]) || [],
    reviewedBy: page['reviewedBy'] as string | undefined,
    lastUpdated: page['lastUpdated'] as string | undefined,
    references: page['references'] as string[] | undefined,
    careApproach: (page['careApproach'] as string[]) || [],
    details: (page['details'] as string[]) || [],
    warning: page['warning'] as string | undefined,
    seo: page['seo'] as DiseaseInfo['seo']
  };
}

export function mapDiseaseFromApi(row: Record<string, unknown>): Disease {
    const publicFaq = row['publicFaq'];
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      slug: (row['slug'] as string | null | undefined) ?? null,
      description: row['description'] as string,
      publicDescription: (row['publicDescription'] as string | null | undefined) ?? null,
      publicImageUrl: (row['publicImageUrl'] as string | null | undefined) ?? null,
      seoTitle: (row['seoTitle'] as string | null | undefined) ?? null,
      seoDescription: (row['seoDescription'] as string | null | undefined) ?? null,
      publicFaq: Array.isArray(publicFaq) ? (publicFaq as DiseaseFaqItem[]) : [],
      publicPage: mapPublicPageFromApi(row),
      feeInPaise: row['feeInPaise'] as number,
      intakeQuestions: (row['intakeQuestions'] as string[]) || [],
      publicCategory: (row['publicCategory'] as string | null | undefined) ?? null
    };
  }

export function mapPatientPrescriptionFromApi(row: Record<string, unknown>): Prescription {
    return {
      id: row['id'] as string,
      version: row['version'] as number,
      diagnosis: row['diagnosis'] as string,
      advice: row['advice'] as string | undefined,
      notes: (row['notes'] as string) || '',
      fileUrl: row['fileUrl'] as string | undefined,
      status: row['status'] as Prescription['status'],
      followUpDate: row['followUpDate'] as string | undefined,
      method: (row['methodOption'] as Record<string, unknown> | null)?.['label'] as string | null ?? null,
      diagnosedDisease: (row['diagnosedDiseaseOption'] as Record<string, unknown> | null)?.['label'] as string | null ?? null,
      items: ((row['items'] as Array<Record<string, unknown>>) || []).map((item) => ({
        id: item['id'] as string,
        medicineName: item['medicineName'] as string,
        strength: item['strength'] as string | undefined,
        dose: item['dose'] as string | undefined,
        frequency: item['frequency'] as string | undefined,
        duration: item['duration'] as string | undefined,
        instructions: item['instructions'] as string | undefined
      })),
      createdAt: row['createdAt'] as string
    };
  }

export function mapDoseEventFromApi(row: Record<string, unknown>): DoseEvent {
    const item = row['prescriptionItem'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      scheduledFor: row['scheduledFor'] as string,
      status: row['status'] as DoseEvent['status'],
      note: row['note'] as string | undefined,
      takenAt: row['takenAt'] as string | undefined,
      skippedAt: row['skippedAt'] as string | undefined,
      prescriptionItem: {
        id: item?.['id'] as string || '',
        medicineName: item?.['medicineName'] as string || 'Medicine',
        strength: item?.['strength'] as string | undefined,
        dose: item?.['dose'] as string | undefined,
        frequency: item?.['frequency'] as string | undefined,
        duration: item?.['duration'] as string | undefined,
        instructions: item?.['instructions'] as string | undefined
      }
    };
  }

export function mapConsultationFromApi(row: Record<string, unknown>): Consultation {
    const prescriptions = (row['prescriptions'] as Array<Record<string, unknown>>) || [];
    const latestPrescription = prescriptions[0] || null;

    return {
      id: row['id'] as string,
      status: row['status'] as Consultation['status'],
      intakeAnswers: (row['intakeAnswers'] as Record<string, string>) || {},
      createdAt: row['createdAt'] as string,
      patient: row['patient'] as Consultation['patient'],
      assignedDoctor: (row['assignedDoctor'] as Consultation['assignedDoctor']) || null,
      disease: row['disease'] as Consultation['disease'],
      consultationMode: (row['consultationMode'] as Consultation['consultationMode']) || 'CLINIC_QUEUE',
      billingPlanCode: (row['billingPlanCode'] as string | null) || null,
      pricingSnapshot: (row['pricingSnapshot'] as Record<string, unknown> | null) || null,
      payment: row['payment']
        ? {
            id: (row['payment'] as Record<string, unknown>)['id'] as string,
            amountInPaise: (row['payment'] as Record<string, unknown>)['amountInPaise'] as number,
            status: (row['payment'] as Record<string, unknown>)['status'] as Payment['status'],
            billingPlanCode: ((row['payment'] as Record<string, unknown>)['billingPlanCode'] as string | null) || null,
            lineItems: ((row['payment'] as Record<string, unknown>)['lineItems'] as Record<string, unknown> | null) || null,
            providerOrderId: ((row['payment'] as Record<string, unknown>)['providerOrderId'] as string | null) || null
          }
        : null,
      messages: (row['messages'] as Consultation['messages']) || [],
      prescription: latestPrescription
        ? {
            id: latestPrescription['id'] as string,
            notes: latestPrescription['notes'] as string,
            fileUrl: latestPrescription['fileUrl'] as string | undefined,
            createdAt: latestPrescription['createdAt'] as string
          }
        : null,
      prescriptions: prescriptions.map((p) => ({
        id: p['id'] as string,
        version: p['version'] as number,
        diagnosis: p['diagnosis'] as string,
        notes: p['notes'] as string,
        fileUrl: p['fileUrl'] as string | undefined,
        createdAt: p['createdAt'] as string
      }))
    };
  }
