export const API_PATHS = {
  DISEASES: '/diseases',
  RECEPTION: {
    ME: '/call-center/me',
    QUEUE: '/call-center/queue',
    PATIENTS_SEARCH: '/call-center/patients/search',
    DOCTORS: '/call-center/doctors',
    WALK_IN: '/call-center/walk-in',
    CONSULTATIONS: '/call-center/consultations',
    COLLECT_CASH: (id: string) => `/call-center/consultations/${id}/collect-cash`,
    ASSIGN: (id: string) => `/call-center/consultations/${id}/assign`
  }
} as const;
