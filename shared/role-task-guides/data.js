
const doctorBase = (variantKey, roleTitle, tagline, extras) => ({
  appKey: 'doctor-web',
  variantKey,
  roleTitle,
  tagline,
  responsibilities: [
    'Review assigned and in-progress cases on your worklist every day.',
    'Conduct consultations with accurate notes, prescriptions, and follow-up dates.',
    'Use case analysis when you need repertory support before choosing a remedy.',
    'Keep your availability, profile, and leave requests up to date.',
    ...(extras.responsibilities ?? [])
  ],
  dailyTasks: [
    {
      title: 'Open Worklist',
      detail: 'Start here. Check assigned cases, in-progress consults, and follow-ups due today.',
      when: 'Start of shift'
    },
    {
      title: 'Open the consultation',
      detail: 'From worklist, open the appointment to document history, vitals, and prescription.',
      when: 'Per patient'
    },
    {
      title: 'Run case analysis when needed',
      detail: 'Add rubrics, repertorize, and select a remedy before finalizing the prescription.',
      when: 'Complex or new cases'
    },
    {
      title: 'Publish prescription & set follow-up',
      detail: 'Confirm medicines, dosage, and next review date before closing the case.',
      when: 'End of consult'
    },
    {
      title: 'Scan patient QR when dispensing',
      detail: 'Use patient scan at the store counter to verify identity and adherence.',
      when: 'In-clinic pickup'
    },
    ...(extras.dailyTasks ?? [])
  ],
  boundaries: [
    'Do not share login credentials or prescribe under another doctor\'s account.',
    'Do not close a consultation without a clear plan or follow-up when clinically required.',
    ...(extras.boundaries ?? [])
  ]
});

export const ROLE_TASK_GUIDES = [
  doctorBase(undefined, 'Homeopathic Doctor', 'Your clinical command centre for consultations and case work.', {
    dailyTasks: [
      { title: 'Manage slots', detail: 'Keep your appointment slots accurate so patients can book correctly.', when: 'Weekly' },
      { title: 'Check earnings', detail: 'Review paid consultations and revenue share on the dashboard.', when: 'End of week' }
    ]
  }),
  doctorBase('VISITING_DOCTOR', 'Visiting Doctor', 'Part-time clinical access — consult and prescribe; slots and earnings are managed by the clinic.', {
    boundaries: ['Do not change clinic-wide slot templates — coordinate with clinic admin.', 'Your access is limited to consultation workflows assigned to you.']
  }),
  doctorBase('MEDICAL_INTERN', 'Medical Intern', 'Supervised training role — document cases and run analysis; prescriptions require consultant approval.', {
    responsibilities: ['Work under your supervising consultant for all prescribing decisions.', 'Document cases thoroughly for training review.'],
    dailyTasks: [
      { title: 'Assist on assigned cases', detail: 'Open worklist cases you are assigned to and document under supervision.', when: 'Daily' },
      { title: 'Practice case analysis', detail: 'Use repertory tools to learn remedy selection — share results with your supervisor.', when: 'Training' }
    ],
    boundaries: [
      'Do not publish prescriptions independently — intern accounts cannot prescribe in the system.',
      'Do not see patients without supervisor assignment or clinic approval.'
    ]
  }),

  {
    appKey: 'admin-web',
    roleTitle: 'Platform Administrator',
    tagline: 'You own clinic configuration, oversight, and compliance across Vitalis.',
    responsibilities: [
      'Maintain doctor accounts, types, specialties, and HR records.',
      'Monitor consultations, payments, adherence risk, and audit logs.',
      'Configure diseases, billing plans, stores, and purchase orders.',
      'Approve payroll and finance entries with supporting documentation.'
    ],
    dailyTasks: [
      { title: 'Review dashboard', detail: 'Check revenue, active doctors, and recent audit activity.', when: 'Start of day' },
      { title: 'Triage adherence alerts', detail: 'Open Adherence Risk for patients missing doses or follow-ups.', when: 'Daily' },
      { title: 'Verify payments', detail: 'Filter failed or pending payments and reconcile with finance.', when: 'Daily' },
      { title: 'Onboard doctors & staff', detail: 'Create accounts, set doctor type, and confirm HR joining letters.', when: 'As needed' },
      { title: 'Audit trail review', detail: 'Spot unusual admin actions or prescription changes.', when: 'Weekly' }
    ],
    boundaries: [
      'Do not alter clinical prescriptions without doctor involvement except per clinic policy.',
      'Do not share admin credentials or bypass audit logging.',
      'Do not delete financial records — use corrections and notes instead.'
    ]
  },

  {
    appKey: 'hr-web',
    roleTitle: 'HR Manager',
    tagline: 'You manage people operations — hiring, records, leave, and payroll for the clinic.',
    responsibilities: [
      'Maintain accurate employee and doctor HR profiles.',
      'Process leave requests and keep attendance records current.',
      'Generate joining letters and employment documentation.',
      'Coordinate with admin on payroll and store staff assignments.'
    ],
    dailyTasks: [
      { title: 'Check dashboard counts', detail: 'Review pending leaves, recent joins, and active headcount.', when: 'Start of day' },
      { title: 'Process pending leaves', detail: 'Approve or reject with reason; update employee status.', when: 'Daily' },
      { title: 'Update doctor HR profiles', detail: 'Confirm designation, doctor type, salary visibility, and joining date.', when: 'On hire/change' },
      { title: 'Issue joining letters', detail: 'Generate and verify letter content before sharing with the employee.', when: 'On joining' },
      { title: 'Payroll preparation', detail: 'Validate payroll inputs before admin finalizes payment.', when: 'Pay cycle' }
    ],
    boundaries: [
      'Do not share salary or personal data outside authorized channels.',
      'Do not mark employees active without completed onboarding checks.',
      'Do not edit clinical credentials — coordinate with admin for doctor accounts.'
    ]
  },

  {
    appKey: 'receptionist-web',
    roleTitle: 'Receptionist',
    tagline: 'Front desk — first point of contact for patients and walk-ins.',
    responsibilities: [
      'Register and assist patients at the front desk.',
      'Help patients book or reschedule consultations.',
      'Direct patients to the right doctor or store counter.',
      'Flag urgent cases to clinic manager or duty doctor.'
    ],
    dailyTasks: [
      { title: 'Review today\'s schedule', detail: 'Know which doctors are available and expected walk-in volume.', when: 'Start of shift' },
      { title: 'Register walk-ins', detail: 'Capture patient details and create or link consultations.', when: 'Per visitor' },
      { title: 'Confirm payments', detail: 'Ensure consultation fees are collected or payment link sent before consult.', when: 'Before doctor handoff' },
      { title: 'Coordinate with store', detail: 'Send patients to medicine pickup after prescription is ready.', when: 'After consult' }
    ],
    boundaries: [
      'Do not give medical advice or change prescriptions.',
      'Do not share other patients\' information.',
      'Do not override doctor availability without clinic manager approval.'
    ]
  },

  {
    appKey: 'clinic-manager-web',
    roleTitle: 'Clinic Manager',
    tagline: 'Day-to-day clinic operations — flow, staff coordination, and patient experience.',
    responsibilities: [
      'Oversee reception, walk-ins, and consultation flow.',
      'Coordinate doctors, store, and diagnostic partners.',
      'Resolve operational issues and escalations same day.',
      'Monitor clinic KPIs on the dashboard.'
    ],
    dailyTasks: [
      { title: 'Morning ops check', detail: 'Staff attendance, doctor availability, store stock alerts.', when: 'Start of day' },
      { title: 'Walk-in queue', detail: 'Balance patient wait times across doctors.', when: 'Throughout day' },
      { title: 'Escalations', detail: 'Handle complaints, payment issues, and no-shows.', when: 'As they arise' },
      { title: 'End-of-day handoff', detail: 'Note pending follow-ups and stock issues for tomorrow.', when: 'End of shift' }
    ],
    boundaries: [
      'Do not modify clinical records — route to the treating doctor.',
      'Do not approve payroll or HR changes — use HR portal.',
      'Do not bypass payment requirements for consultations.'
    ]
  },

  {
    appKey: 'accountant-web',
    roleTitle: 'Accountant',
    tagline: 'Financial control — expenses, walk-in sales, stores, and reporting.',
    responsibilities: [
      'Record and categorize clinic and store expenses.',
      'Reconcile walk-in and consultation payments.',
      'Maintain store-wise financial visibility.',
      'Support payroll with verified figures.'
    ],
    dailyTasks: [
      { title: 'Review transactions', detail: 'Check new payments and walk-in entries for the day.', when: 'Daily' },
      { title: 'Log expenses', detail: 'Enter bills with correct category and store attribution.', when: 'As received' },
      { title: 'Store reconciliation', detail: 'Match store reports with platform payment data.', when: 'Weekly' },
      { title: 'Payroll support', detail: 'Export or verify payroll inputs before disbursement.', when: 'Pay cycle' }
    ],
    boundaries: [
      'Do not alter clinical or HR master data.',
      'Do not delete posted transactions — use reversal entries.',
      'Do not share financial exports outside approved recipients.'
    ]
  },

  {
    appKey: 'supplier-web',
    roleTitle: 'Supplier Partner',
    tagline: 'Fulfill purchase orders and keep medicine supply moving to the clinic.',
    responsibilities: [
      'Acknowledge and fulfill clinic purchase orders on time.',
      'Update dispatch and delivery status accurately.',
      'Communicate stock shortages or substitutions promptly.',
      'Maintain correct product and batch information.'
    ],
    dailyTasks: [
      { title: 'Check open orders', detail: 'Review new and in-progress purchase orders.', when: 'Start of day' },
      { title: 'Confirm dispatch', detail: 'Mark orders shipped with tracking when applicable.', when: 'Per order' },
      { title: 'Flag delays', detail: 'Notify clinic if lead time exceeds agreed SLA.', when: 'Immediately' }
    ],
    boundaries: [
      'Do not ship unapproved substitutes without clinic confirmation.',
      'Do not share pricing agreements outside the platform.',
      'Do not mark delivered until goods are received by the clinic.'
    ]
  },

  {
    appKey: 'warehouse-web',
    roleTitle: 'Warehouse Manager',
    tagline: 'Central inventory hub — receive, store, and transfer stock to clinic stores.',
    responsibilities: [
      'Receive supplier deliveries and verify quantities.',
      'Maintain warehouse stock accuracy.',
      'Process transfer requests to clinic stores.',
      'Report damage, expiry, and shrinkage.'
    ],
    dailyTasks: [
      { title: 'Inbound check', detail: 'Receive and GRN supplier deliveries against POs.', when: 'On arrival' },
      { title: 'Process transfers', detail: 'Pick, pack, and dispatch stock to stores.', when: 'Daily' },
      { title: 'Cycle count', detail: 'Reconcile high-value or fast-moving SKUs.', when: 'Weekly' }
    ],
    boundaries: [
      'Do not issue stock without an approved transfer or order.',
      'Do not adjust inventory without documented reason.',
      'Do not bypass batch/expiry tracking for medicines.'
    ]
  },

  {
    appKey: 'delivery-web',
    roleTitle: 'Delivery Executive',
    tagline: 'Last-mile medicine delivery to patients.',
    responsibilities: [
      'Pick up medicines from the assigned store or hub.',
      'Deliver to patients on time with proof of delivery.',
      'Report failed deliveries and reschedule promptly.',
      'Handle medicines with care per clinic guidelines.'
    ],
    dailyTasks: [
      { title: 'Review delivery queue', detail: 'See assigned runs and addresses for today.', when: 'Start of shift' },
      { title: 'Confirm pickup', detail: 'Verify patient name, prescription ID, and items at store.', when: 'Per run' },
      { title: 'Complete delivery', detail: 'Mark delivered or failed with clear reason.', when: 'At doorstep' }
    ],
    boundaries: [
      'Do not hand medicines to anyone other than the patient or authorized recipient.',
      'Do not mark delivered without actual handover.',
      'Do not carry prescriptions or patient data outside the app.'
    ]
  },

  {
    appKey: 'diagnostic-web',
    roleTitle: 'Diagnostic Lab Partner',
    tagline: 'Process lab referrals and return results to the clinic platform.',
    responsibilities: [
      'Accept lab referrals from the clinic.',
      'Update sample collection and processing status.',
      'Upload accurate results within agreed TAT.',
      'Flag critical values immediately.'
    ],
    dailyTasks: [
      { title: 'New referrals', detail: 'Acknowledge incoming lab orders.', when: 'Start of day' },
      { title: 'Sample workflow', detail: 'Update collected → processing → completed stages.', when: 'Per sample' },
      { title: 'Publish results', detail: 'Upload reports so doctors and patients can view them.', when: 'On completion' }
    ],
    boundaries: [
      'Do not delay critical results — call clinic per protocol.',
      'Do not alter doctor orders without written approval.',
      'Do not share patient reports outside the platform.'
    ]
  },

  {
    appKey: 'store-manager-web',
    roleTitle: 'Store Manager',
    tagline: 'Run the medicine store — stock, staff, dispensing, and expenses.',
    responsibilities: [
      'Maintain store inventory and rack organization.',
      'Supervise store staff and dispensing accuracy.',
      'Process stock in/out and reconcile with warehouse.',
      'Log store expenses and daily sales.'
    ],
    dailyTasks: [
      { title: 'Stock check', detail: 'Review low-stock alerts and expiry dates.', when: 'Start of day' },
      { title: 'Dispensing oversight', detail: 'Ensure staff scan patient QR before handover.', when: 'Continuous' },
      { title: 'Stock movements', detail: 'Record stock-in from warehouse and stock-out to patients.', when: 'Per transaction' },
      { title: 'Staff HR', detail: 'Approve leave and attendance for store team.', when: 'As needed' }
    ],
    boundaries: [
      'Do not dispense without a valid prescription in the system.',
      'Do not override pharmacist verification steps.',
      'Do not adjust stock without a documented movement.'
    ]
  },

  {
    appKey: 'store',
    roleTitle: 'Store Staff',
    tagline: 'Dispense medicines safely using your staff ID at the counter.',
    responsibilities: [
      'Scan patient QR or ID before every dispense.',
      'Match prescription items, quantity, and batch.',
      'Record stock-out accurately in the system.',
      'Escalate unclear prescriptions to the store manager.'
    ],
    dailyTasks: [
      { title: 'Log in with Staff ID', detail: 'Use your staff code and PIN at the start of shift.', when: 'Start of shift' },
      { title: 'Scan patient', detail: 'Verify patient identity before preparing medicines.', when: 'Every dispense' },
      { title: 'Complete stock-out', detail: 'Confirm items handed over match the prescription.', when: 'Per sale' },
      { title: 'Report issues', detail: 'Tell manager about stock gaps, damages, or patient queries.', when: 'Immediately' }
    ],
    boundaries: [
      'Do not dispense without manager approval if prescription is unclear.',
      'Do not share your Staff ID or PIN.',
      'Do not give medical advice — refer to the doctor.'
    ]
  },

  {
    appKey: 'user-web',
    roleTitle: 'Patient',
    tagline: 'Your health journey — book consults, take medicines, and stay on follow-up.',
    responsibilities: [
      'Book consultations for the condition you need help with.',
      'Complete payment before or as directed for your consult.',
      'Take medicines as prescribed and log doses in the app.',
      'Attend follow-ups on the dates your doctor sets.'
    ],
    dailyTasks: [
      { title: 'Today\'s medicines', detail: 'Mark doses taken or skipped with a reason.', when: 'Morning & evening' },
      { title: 'Active consultation', detail: 'Open your consult to message the doctor or view prescription.', when: 'As needed' },
      { title: 'Pay & confirm', detail: 'Complete payment when booking or when prompted.', when: 'Before consult' },
      { title: 'Pick up or receive delivery', detail: 'Collect medicines from store or track home delivery.', when: 'After prescription' },
      { title: 'Lab results', detail: 'Check uploaded reports and discuss with your doctor.', when: 'When available' }
    ],
    boundaries: [
      'Do not share your login — your health data is private to you.',
      'Do not change medicine doses without consulting your doctor.',
      'Do not use another person\'s account for your treatment.'
    ]
  },

  {
    appKey: 'branch-owner-web',
    roleTitle: 'Branch Owner',
    tagline: 'Franchise P&L and branch operations for your clinic location.',
    responsibilities: [
      'Monitor branch revenue, payroll, and net estimate monthly.',
      'Review today\'s consultation and medicine sales KPIs.',
      'Escalate operational issues to clinic manager or platform admin.'
    ],
    dailyTasks: [
      { title: 'Open branch dashboard', detail: 'Check month P&L and today\'s operations snapshot.', when: 'Start of week' },
      { title: 'Review queue health', detail: 'Ensure payment-pending and awaiting-doctor counts are manageable.', when: 'Daily' },
      { title: 'Month-end review', detail: 'Compare consultation vs medicine revenue and payroll costs.', when: 'Month end' }
    ],
    boundaries: [
      'Do not alter clinical prescriptions or patient records.',
      'Do not create platform admin or HR accounts — contact admin.',
      'Financial exports are for your branch only — do not share externally without policy approval.'
    ]
  },

  {
    appKey: 'coordinator-web',
    roleTitle: 'Patient Coordinator',
    tagline: 'Follow up with patients on medicine adherence for your branch.',
    responsibilities: [
      'Review high-risk adherence cohorts for your home-clinic patients.',
      'Prioritize outreach to patients with dropping adherence.',
      'Coordinate with doctors on patients who need intervention.'
    ],
    dailyTasks: [
      { title: 'Check high-risk cohort', detail: 'Open follow-ups and review patients below adherence threshold.', when: 'Daily' },
      { title: 'Work alerts tab', detail: 'Address unexplained missed doses and adherence drops.', when: 'Daily' },
      { title: 'Call or message patients', detail: 'Use patient mobile/code from the list for outreach.', when: 'Per alert' }
    ],
    boundaries: [
      'Do not change prescriptions — escalate to the treating doctor.',
      'Do not access patients outside your assigned branch cohort.',
      'Do not share patient health data outside authorized channels.'
    ]
  },

  {
    appKey: 'callcenter-web',
    roleTitle: 'Call Center Agent',
    tagline: 'Phone support — find patients and see recent consultation context.',
    responsibilities: [
      'Search patients by name, mobile, email, or patient code.',
      'Review recent consultations to answer patient calls accurately.',
      'Escalate clinical questions to doctors or coordinators.'
    ],
    dailyTasks: [
      { title: 'Patient lookup', detail: 'Search before every call to confirm identity and home clinic.', when: 'Per call' },
      { title: 'Recent consults', detail: 'Check latest consultation status when patient asks about their case.', when: 'As needed' },
      { title: 'Escalate', detail: 'Transfer medical or payment disputes to reception or clinic manager.', when: 'When required' }
    ],
    boundaries: [
      'Do not give medical advice or dosing instructions.',
      'Do not modify patient records or prescriptions.',
      'Do not share one patient\'s data with another caller.'
    ]
  },

  {
    appKey: 'marketing-web',
    roleTitle: 'Marketing Manager',
    tagline: 'Read-only product funnel analytics for growth decisions.',
    responsibilities: [
      'Track patient journey conversion across booking, payment, Rx, and doses.',
      'Report funnel drop-offs to admin and leadership.',
      'Use data to inform campaigns — no direct patient messaging from this portal.'
    ],
    dailyTasks: [
      { title: 'Review funnel table', detail: 'Compare step conversion for the selected time window.', when: 'Weekly' },
      { title: 'Check summary KPIs', detail: 'Logins, bookings, payments, prescriptions published.', when: 'Weekly' },
      { title: 'Share insights', detail: 'Document trends for admin product analytics review.', when: 'Monthly' }
    ],
    boundaries: [
      'Read-only access — cannot change patient or clinical data.',
      'Do not export patient-identifiable data for external ad platforms without compliance approval.',
      'Coordinate broadcast campaigns through admin notifications.'
    ]
  },

  {
    appKey: 'corporate-wellness-web',
    roleTitle: 'Corporate Wellness Partner',
    tagline: 'Manage employee wellness enrollments for your organization.',
    responsibilities: [
      'View corporate account and enrolled employees.',
      'Verify enrollment status for HR wellness programs.',
      'Coordinate with Vitalis admin for new corporate accounts.'
    ],
    dailyTasks: [
      { title: 'Accounts list', detail: 'Open your corporate account and review enrollment count.', when: 'Weekly' },
      { title: 'Enrollment detail', detail: 'View enrolled employees and their patient codes.', when: 'As needed' },
      { title: 'HR coordination', detail: 'Align new hires with wellness enrollment process.', when: 'On hire' }
    ],
    boundaries: [
      'Do not access clinical records beyond enrollment visibility.',
      'Do not share employee health data outside your organization\'s policy.',
      'Enrollment changes for new accounts go through platform admin.'
    ]
  },

  {
    appKey: 'operations-web',
    roleTitle: 'Operations Staff',
    tagline: 'One portal for clinic operations — your menu adapts to your role after login.',
    responsibilities: [
      'Use only the screens your role is authorized for (HR, reception, branch, call center, partners, store, etc.).',
      'Complete daily tasks shown in the role guide at the top of each page.',
      'Escalate issues outside your permissions to clinic manager or platform admin.'
    ],
    dailyTasks: [
      { title: 'Sign in', detail: 'Use staff email and password — the app routes you to your default workspace.', when: 'Start of shift' },
      { title: 'Check your nav', detail: 'Sidebar shows only what your role can access.', when: 'After login' },
      { title: 'Platform admin', detail: 'Admins open Admin console from the nav for full platform configuration.', when: 'Admin only' }
    ],
    boundaries: [
      'Do not share staff credentials.',
      'Do not use screens that are not in your navigation — access is blocked by capability checks.',
      'Clinical changes belong to doctors; financial approvals may require admin or accountant roles.'
    ]
  },

  {
    appKey: 'operations-web',
    variantKey: 'store-counter',
    roleTitle: 'Store Counter Staff',
    tagline: 'Dispense medicines safely at the branch counter.',
    responsibilities: [
      'Scan patient QR or ID before every dispense.',
      'Match prescription items, quantity, and batch.',
      'Record stock-out accurately in the system.',
      'Escalate unclear prescriptions to the store manager.'
    ],
    dailyTasks: [
      { title: 'Sign in', detail: 'Use your store email and password at the operations portal.', when: 'Start of shift' },
      { title: 'Scan patient', detail: 'Verify patient identity before preparing medicines.', when: 'Every dispense' },
      { title: 'Complete stock-out', detail: 'Confirm items handed over match the prescription.', when: 'Per sale' }
    ],
    boundaries: [
      'Do not dispense without manager approval if prescription is unclear.',
      'Do not share your login credentials.',
      'Do not give medical advice — refer to the doctor.'
    ]
  },

  {
    appKey: 'operations-web',
    variantKey: 'store-manager',
    roleTitle: 'Store Manager',
    tagline: 'Run the medicine store — stock, staff, dispensing, and expenses.',
    responsibilities: [
      'Maintain store inventory and rack organization.',
      'Supervise store staff and dispensing accuracy.',
      'Process stock in/out, POs, transfers, and home deliveries.',
      'Log store expenses and daily sales.'
    ],
    dailyTasks: [
      { title: 'Stock check', detail: 'Review low-stock alerts and expiry dates.', when: 'Start of day' },
      { title: 'Dispensing oversight', detail: 'Ensure staff scan patient QR before handover.', when: 'Continuous' },
      { title: 'Incoming POs & transfers', detail: 'Post GRN and receive warehouse transfers.', when: 'As they arrive' }
    ],
    boundaries: [
      'Do not dispense without a valid prescription in the system.',
      'Do not override pharmacist verification steps.',
      'Do not adjust stock without a documented movement.'
    ]
  },

  {
    appKey: 'operations-web',
    variantKey: 'partner',
    roleTitle: 'External Partner',
    tagline: 'Suppliers, logistics, diagnostics, corporate wellness, and insurance partners.',
    responsibilities: [
      'Fulfill your organization\'s obligations on the platform.',
      'Keep status updates accurate and timely.',
      'Use only partner screens assigned to your account type.'
    ],
    dailyTasks: [
      { title: 'Open your default view', detail: 'Login routes you to orders, warehouse, deliveries, lab referrals, accounts, or claims.', when: 'Start of day' },
      { title: 'Process queue', detail: 'Work through pending items in your primary screen.', when: 'Daily' },
      { title: 'Update statuses', detail: 'Mark progress at each workflow step so clinics see live status.', when: 'Per item' }
    ],
    boundaries: [
      'Do not access other partners\' data.',
      'Do not share patient-identifiable information outside approved channels.',
      'Account or contract changes require Vitalis platform admin.'
    ]
  },

  {
    appKey: 'partners-web',
    roleTitle: 'External Partner',
    tagline: 'One portal for suppliers, logistics, diagnostics, corporate wellness, and insurance partners.',
    responsibilities: [
      'Fulfill your organization\'s obligations on the platform (orders, deliveries, claims, enrollments).',
      'Keep status updates accurate and timely.',
      'Use only partner screens assigned to your account type.'
    ],
    dailyTasks: [
      { title: 'Open your default view', detail: 'Login routes you to orders, warehouse, deliveries, lab referrals, accounts, or claims.', when: 'Start of day' },
      { title: 'Process queue', detail: 'Work through pending items in your primary screen.', when: 'Daily' },
      { title: 'Update statuses', detail: 'Mark progress at each workflow step so clinics see live status.', when: 'Per item' }
    ],
    boundaries: [
      'Do not access other partners\' data.',
      'Do not share patient-identifiable information outside approved channels.',
      'Account or contract changes require Vitalis platform admin.'
    ]
  },

  {
    appKey: 'insurance-web',
    roleTitle: 'Insurance Partner',
    tagline: 'Submit and track reimbursement claims for covered patients.',
    responsibilities: [
      'Review submitted claims and their status.',
      'Create new claims with patient ID and amount.',
      'Follow up on under-review and rejected claims.'
    ],
    dailyTasks: [
      { title: 'Claims inbox', detail: 'Check new and pending claims at start of day.', when: 'Daily' },
      { title: 'Submit claim', detail: 'Use patient ID from Vitalis records and accurate amount in rupees.', when: 'Per claim' },
      { title: 'Status follow-up', detail: 'Track SUBMITTED and UNDER_REVIEW claims.', when: 'Weekly' }
    ],
    boundaries: [
      'Only submit claims for valid covered patients.',
      'Do not alter claim amounts after submission without process approval.',
      'Patient clinical details are confidential — use only for claim adjudication.'
    ]
  }
];

export function getRoleTaskGuide(appKey, variantKey) {
  if (variantKey) {
    const variant = ROLE_TASK_GUIDES.find((g) => g.appKey === appKey && g.variantKey === variantKey);
    if (variant) return variant;
  }
  return ROLE_TASK_GUIDES.find((g) => g.appKey === appKey && !g.variantKey) ?? null;
}

export function listRoleTaskGuides(appKey) {
  if (!appKey) return ROLE_TASK_GUIDES;
  return ROLE_TASK_GUIDES.filter((g) => g.appKey === appKey);
}

