import { Consultation, Disease, DoseEvent, Payment, Prescription } from '../models';

export function mapDiseaseFromApi(row: Record<string, unknown>): Disease {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      description: row['description'] as string,
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
