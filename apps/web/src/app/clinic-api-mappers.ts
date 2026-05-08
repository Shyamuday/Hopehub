import type {
  Consultation,
  ConsultationAttachment,
  ConsultationAttachmentKind,
  Disease,
  Doctor,
  DoseEvent,
  Payment,
  Prescription
} from './models';

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
    method: (row['methodOption'] as { label?: string } | undefined)?.label || null,
    diagnosedDisease: (row['diagnosedDiseaseOption'] as { label?: string } | undefined)?.label || null,
    items: ((row['items'] as Record<string, unknown>[]) || []).map((item) => ({
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
  const pi = row['prescriptionItem'] as Record<string, unknown> | undefined;
  return {
    id: row['id'] as string,
    scheduledFor: row['scheduledFor'] as string,
    status: row['status'] as DoseEvent['status'],
    note: row['note'] as string | undefined,
    takenAt: row['takenAt'] as string | undefined,
    skippedAt: row['skippedAt'] as string | undefined,
    prescriptionItem: {
      id: (pi?.['id'] as string) || '',
      medicineName: (pi?.['medicineName'] as string) || 'Medicine',
      strength: pi?.['strength'] as string | undefined,
      dose: pi?.['dose'] as string | undefined,
      frequency: pi?.['frequency'] as string | undefined,
      duration: pi?.['duration'] as string | undefined,
      instructions: pi?.['instructions'] as string | undefined
    }
  };
}

export function mapDiseaseFromSupabaseRow(row: Record<string, unknown>): Disease {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: row['description'] as string,
    feeInPaise: row['fee_in_paise'] as number,
    intakeQuestions: (row['intake_questions'] as string[]) || []
  };
}

export function mapUserFromSupabaseProfile(row: Record<string, unknown> | null): Doctor {
  return {
    id: (row?.['id'] as string) || '',
    name: (row?.['name'] as string) || 'Unknown',
    mobile: (row?.['mobile'] as string | null) || null,
    role: (row?.['role'] as Doctor['role']) || 'PATIENT',
    isActive: (row?.['is_active'] as boolean) ?? true
  };
}

export function mapConsultationFromSupabaseRow(row: Record<string, unknown>): Consultation {
  const payment = row['payment'] as Record<string, unknown> | undefined;
  const prescription = row['prescription'] as Record<string, unknown> | undefined;
  return {
    id: row['id'] as string,
    status: row['status'] as Consultation['status'],
    intakeAnswers: (row['intake_answers'] as Record<string, string>) || {},
    createdAt: row['created_at'] as string,
    patient: mapUserFromSupabaseProfile(row['patient'] as Record<string, unknown> | null),
    assignedDoctor: row['assigned_doctor']
      ? mapUserFromSupabaseProfile(row['assigned_doctor'] as Record<string, unknown>)
      : null,
    disease: mapDiseaseFromSupabaseRow(row['disease'] as Record<string, unknown>),
    billingPlanCode: (row['billing_plan_code'] as string) || null,
    pricingSnapshot: (row['pricing_snapshot'] as Record<string, unknown> | null) ?? null,
    payment: payment
      ? {
          id: payment['id'] as string,
          amountInPaise: payment['amount_in_paise'] as number,
          status: payment['status'] as Payment['status'],
          billingPlanCode: (payment['billing_plan_code'] as string) || null,
          lineItems: (payment['line_items'] as Record<string, unknown> | null) ?? null,
          providerOrderId: payment['provider_order_id'] as string | undefined
        }
      : null,
    messages: ((row['messages'] as Record<string, unknown>[]) || [])
      .map((message) => ({
        id: message['id'] as string,
        body: message['body'] as string,
        createdAt: message['created_at'] as string,
        sender: mapUserFromSupabaseProfile(message['sender'] as Record<string, unknown> | null)
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    prescription: prescription
      ? {
          id: prescription['id'] as string,
          notes: prescription['notes'] as string,
          fileUrl: prescription['file_url'] as string,
          createdAt: prescription['created_at'] as string
        }
      : null
  };
}

export function mapPrescriptionFromApi(row: Record<string, unknown>): Prescription {
  return {
    id: row['id'] as string,
    version: row['version'] as number,
    diagnosis: row['diagnosis'] as string,
    advice: (row['advice'] as string | null) ?? null,
    notes: (row['notes'] as string) ?? '',
    fileUrl: (row['fileUrl'] as string | null) ?? null,
    status: row['status'] as Prescription['status'],
    followUpDate: (row['followUpDate'] as string | null) ?? null,
    method: (row['methodOption'] as { label?: string } | undefined)?.label ?? null,
    diagnosedDisease: (row['diagnosedDiseaseOption'] as { label?: string } | undefined)?.label ?? null,
    items: ((row['items'] as Record<string, unknown>[]) || []).map((item) => ({
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

export function pickConsultationPrescriptionSnapshot(
  prescriptions: Record<string, unknown>[]
): Prescription | null {
  if (!prescriptions.length) return null;
  const published = prescriptions.find((p) => p['status'] === 'PUBLISHED');
  const chosen = published ?? prescriptions[0];
  return mapPrescriptionFromApi(chosen);
}

export function mapConsultationAttachmentFromApi(row: Record<string, unknown>): ConsultationAttachment {
  return {
    id: row['id'] as string,
    kind: row['kind'] as ConsultationAttachmentKind,
    fileName: (row['fileName'] as string | null) ?? null,
    mimeType: (row['mimeType'] as string | null) ?? null,
    caption: (row['caption'] as string | null) ?? null,
    fileUrl: (row['fileUrl'] as string) || '',
    createdAt: row['createdAt'] as string,
    uploadedBy: row['uploadedBy'] as ConsultationAttachment['uploadedBy']
  };
}

export function mapConsultationFromApi(row: Record<string, unknown>): Consultation {
  const prescriptions = (row['prescriptions'] as Record<string, unknown>[]) || [];
  const attachments = ((row['attachments'] as Record<string, unknown>[]) || []).map(
    mapConsultationAttachmentFromApi
  );
  const payment = row['payment'] as Record<string, unknown> | undefined;

  return {
    id: row['id'] as string,
    status: row['status'] as Consultation['status'],
    intakeAnswers: (row['intakeAnswers'] as Record<string, string>) || {},
    createdAt: row['createdAt'] as string,
    patient: row['patient'] as Consultation['patient'],
    assignedDoctor: (row['assignedDoctor'] as Consultation['assignedDoctor']) || null,
    disease: row['disease'] as Consultation['disease'],
    billingPlanCode: (row['billingPlanCode'] as string) || null,
    pricingSnapshot: (row['pricingSnapshot'] as Record<string, unknown> | null) ?? null,
    payment: payment
      ? {
          id: payment['id'] as string,
          amountInPaise: payment['amountInPaise'] as number,
          status: payment['status'] as Payment['status'],
          billingPlanCode: (payment['billingPlanCode'] as string) || null,
          lineItems: (payment['lineItems'] as Record<string, unknown> | null) ?? null,
          providerOrderId: (payment['providerOrderId'] as string) || null
        }
      : null,
    messages: (row['messages'] as Consultation['messages']) || [],
    prescription: pickConsultationPrescriptionSnapshot(prescriptions),
    prescriptions: prescriptions.map((prescription) => mapPrescriptionFromApi(prescription)),
    attachments
  };
}
