import { inject, Service } from '@angular/core';
import { AdminReportsApi } from './admin/admin-reports.api';
import { AdminDoctorsApi } from './admin/admin-doctors.api';
import { AdminCatalogApi } from './admin/admin-catalog.api';
import { AdminHrApi } from './admin/admin-hr.api';
import { AdminFinanceApi } from './admin/admin-finance.api';
import { AdminOpsApi } from './admin/admin-ops.api';

@Service()
export class AdminApi {
  private readonly reports = inject(AdminReportsApi);
  private readonly doctors = inject(AdminDoctorsApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly hr = inject(AdminHrApi);
  private readonly finance = inject(AdminFinanceApi);
  private readonly ops = inject(AdminOpsApi);

  getReports(...args: Parameters<AdminReportsApi['getReports']>) {
    return this.reports.getReports(...(args as Parameters<AdminReportsApi['getReports']>));
  }
  getAuditLogs(...args: Parameters<AdminReportsApi['getAuditLogs']>) {
    return this.reports.getAuditLogs(...(args as Parameters<AdminReportsApi['getAuditLogs']>));
  }
  getAdherenceRisk(...args: Parameters<AdminReportsApi['getAdherenceRisk']>) {
    return this.reports.getAdherenceRisk(...(args as Parameters<AdminReportsApi['getAdherenceRisk']>));
  }
  getAnalyticsFunnels(...args: Parameters<AdminReportsApi['getAnalyticsFunnels']>) {
    return this.reports.getAnalyticsFunnels(...(args as Parameters<AdminReportsApi['getAnalyticsFunnels']>));
  }
  getPayments(...args: Parameters<AdminReportsApi['getPayments']>) {
    return this.reports.getPayments(...(args as Parameters<AdminReportsApi['getPayments']>));
  }
  exportPaymentsCsv(...args: Parameters<AdminReportsApi['exportPaymentsCsv']>) {
    return this.reports.exportPaymentsCsv(...(args as Parameters<AdminReportsApi['exportPaymentsCsv']>));
  }
  exportAuditCsv(...args: Parameters<AdminReportsApi['exportAuditCsv']>) {
    return this.reports.exportAuditCsv(...(args as Parameters<AdminReportsApi['exportAuditCsv']>));
  }
  getDoctors(...args: Parameters<AdminDoctorsApi['getDoctors']>) {
    return this.doctors.getDoctors(...(args as Parameters<AdminDoctorsApi['getDoctors']>));
  }
  getPendingDoctors(...args: Parameters<AdminDoctorsApi['getPendingDoctors']>) {
    return this.doctors.getPendingDoctors(...(args as Parameters<AdminDoctorsApi['getPendingDoctors']>));
  }
  getDoctorsPaged(...args: Parameters<AdminDoctorsApi['getDoctorsPaged']>) {
    return this.doctors.getDoctorsPaged(...(args as Parameters<AdminDoctorsApi['getDoctorsPaged']>));
  }
  getPendingDoctorsPaged(...args: Parameters<AdminDoctorsApi['getPendingDoctorsPaged']>) {
    return this.doctors.getPendingDoctorsPaged(...(args as Parameters<AdminDoctorsApi['getPendingDoctorsPaged']>));
  }
  approveDoctor(...args: Parameters<AdminDoctorsApi['approveDoctor']>) {
    return this.doctors.approveDoctor(...(args as Parameters<AdminDoctorsApi['approveDoctor']>));
  }
  rejectDoctor(...args: Parameters<AdminDoctorsApi['rejectDoctor']>) {
    return this.doctors.rejectDoctor(...(args as Parameters<AdminDoctorsApi['rejectDoctor']>));
  }
  setDoctorStatus(...args: Parameters<AdminDoctorsApi['setDoctorStatus']>) {
    return this.doctors.setDoctorStatus(...(args as Parameters<AdminDoctorsApi['setDoctorStatus']>));
  }
  updateDoctor(...args: Parameters<AdminDoctorsApi['updateDoctor']>) {
    return this.doctors.updateDoctor(...(args as Parameters<AdminDoctorsApi['updateDoctor']>));
  }
  createDoctor(...args: Parameters<AdminDoctorsApi['createDoctor']>) {
    return this.doctors.createDoctor(...(args as Parameters<AdminDoctorsApi['createDoctor']>));
  }
  getConsultations(...args: Parameters<AdminCatalogApi['getConsultations']>) {
    return this.catalog.getConsultations(...(args as Parameters<AdminCatalogApi['getConsultations']>));
  }
  getConsumersPaged(...args: Parameters<AdminCatalogApi['getConsumersPaged']>) {
    return this.catalog.getConsumersPaged(...(args as Parameters<AdminCatalogApi['getConsumersPaged']>));
  }
  getConsumerDetail(...args: Parameters<AdminCatalogApi['getConsumerDetail']>) {
    return this.catalog.getConsumerDetail(...(args as Parameters<AdminCatalogApi['getConsumerDetail']>));
  }
  getConsumerSupport(...args: Parameters<AdminCatalogApi['getConsumerSupport']>) {
    return this.catalog.getConsumerSupport(...(args as Parameters<AdminCatalogApi['getConsumerSupport']>));
  }
  addConsumerSupportNote(...args: Parameters<AdminCatalogApi['addConsumerSupportNote']>) {
    return this.catalog.addConsumerSupportNote(...(args as Parameters<AdminCatalogApi['addConsumerSupportNote']>));
  }
  assignDoctor(...args: Parameters<AdminCatalogApi['assignDoctor']>) {
    return this.catalog.assignDoctor(...(args as Parameters<AdminCatalogApi['assignDoctor']>));
  }
  getActiveDoctors(...args: Parameters<AdminCatalogApi['getActiveDoctors']>) {
    return this.catalog.getActiveDoctors(...(args as Parameters<AdminCatalogApi['getActiveDoctors']>));
  }
  getDiseases(...args: Parameters<AdminCatalogApi['getDiseases']>) {
    return this.catalog.getDiseases(...(args as Parameters<AdminCatalogApi['getDiseases']>));
  }
  createDisease(...args: Parameters<AdminCatalogApi['createDisease']>) {
    return this.catalog.createDisease(...(args as Parameters<AdminCatalogApi['createDisease']>));
  }
  updateDisease(...args: Parameters<AdminCatalogApi['updateDisease']>) {
    return this.catalog.updateDisease(...(args as Parameters<AdminCatalogApi['updateDisease']>));
  }
  getHrDoctors(...args: Parameters<AdminHrApi['getHrDoctors']>) {
    return this.hr.getHrDoctors(...(args as Parameters<AdminHrApi['getHrDoctors']>));
  }
  getHrDoctor(...args: Parameters<AdminHrApi['getHrDoctor']>) {
    return this.hr.getHrDoctor(...(args as Parameters<AdminHrApi['getHrDoctor']>));
  }
  updateHrDoctor(...args: Parameters<AdminHrApi['updateHrDoctor']>) {
    return this.hr.updateHrDoctor(...(args as Parameters<AdminHrApi['updateHrDoctor']>));
  }
  generateDoctorLetter(...args: Parameters<AdminHrApi['generateDoctorLetter']>) {
    return this.hr.generateDoctorLetter(...(args as Parameters<AdminHrApi['generateDoctorLetter']>));
  }
  createHrUser(...args: Parameters<AdminHrApi['createHrUser']>) {
    return this.hr.createHrUser(...(args as Parameters<AdminHrApi['createHrUser']>));
  }
  getHrUsers(...args: Parameters<AdminHrApi['getHrUsers']>) {
    return this.hr.getHrUsers(...(args as Parameters<AdminHrApi['getHrUsers']>));
  }
  setHrUserStatus(...args: Parameters<AdminHrApi['setHrUserStatus']>) {
    return this.hr.setHrUserStatus(...(args as Parameters<AdminHrApi['setHrUserStatus']>));
  }
  getDoctorLetter(...args: Parameters<AdminHrApi['getDoctorLetter']>) {
    return this.hr.getDoctorLetter(...(args as Parameters<AdminHrApi['getDoctorLetter']>));
  }
  getHrUserStores(...args: Parameters<AdminHrApi['getHrUserStores']>) {
    return this.hr.getHrUserStores(...(args as Parameters<AdminHrApi['getHrUserStores']>));
  }
  grantHrStoreAccess(...args: Parameters<AdminHrApi['grantHrStoreAccess']>) {
    return this.hr.grantHrStoreAccess(...(args as Parameters<AdminHrApi['grantHrStoreAccess']>));
  }
  revokeHrStoreAccess(...args: Parameters<AdminHrApi['revokeHrStoreAccess']>) {
    return this.hr.revokeHrStoreAccess(...(args as Parameters<AdminHrApi['revokeHrStoreAccess']>));
  }
  grantAllStores(...args: Parameters<AdminHrApi['grantAllStores']>) {
    return this.hr.grantAllStores(...(args as Parameters<AdminHrApi['grantAllStores']>));
  }
  getHrEmployees(...args: Parameters<AdminHrApi['getHrEmployees']>) {
    return this.hr.getHrEmployees(...(args as Parameters<AdminHrApi['getHrEmployees']>));
  }
  updateHrStoreStaff(...args: Parameters<AdminHrApi['updateHrStoreStaff']>) {
    return this.hr.updateHrStoreStaff(...(args as Parameters<AdminHrApi['updateHrStoreStaff']>));
  }
  generateStoreStaffLetter(...args: Parameters<AdminHrApi['generateStoreStaffLetter']>) {
    return this.hr.generateStoreStaffLetter(...(args as Parameters<AdminHrApi['generateStoreStaffLetter']>));
  }
  getStoreStaffLetter(...args: Parameters<AdminHrApi['getStoreStaffLetter']>) {
    return this.hr.getStoreStaffLetter(...(args as Parameters<AdminHrApi['getStoreStaffLetter']>));
  }
  setDoctorAssignment(...args: Parameters<AdminHrApi['setDoctorAssignment']>) {
    return this.hr.setDoctorAssignment(...(args as Parameters<AdminHrApi['setDoctorAssignment']>));
  }
  getAdminLeaves(...args: Parameters<AdminHrApi['getAdminLeaves']>) {
    return this.hr.getAdminLeaves(...(args as Parameters<AdminHrApi['getAdminLeaves']>));
  }
  createAdminLeave(...args: Parameters<AdminHrApi['createAdminLeave']>) {
    return this.hr.createAdminLeave(...(args as Parameters<AdminHrApi['createAdminLeave']>));
  }
  updateAdminLeave(...args: Parameters<AdminHrApi['updateAdminLeave']>) {
    return this.hr.updateAdminLeave(...(args as Parameters<AdminHrApi['updateAdminLeave']>));
  }
  getAdminStores(...args: Parameters<AdminHrApi['getAdminStores']>) {
    return this.hr.getAdminStores(...(args as Parameters<AdminHrApi['getAdminStores']>));
  }
  createAdminStore(...args: Parameters<AdminHrApi['createAdminStore']>) {
    return this.hr.createAdminStore(...(args as Parameters<AdminHrApi['createAdminStore']>));
  }
  createAdminManager(...args: Parameters<AdminHrApi['createAdminManager']>) {
    return this.hr.createAdminManager(...(args as Parameters<AdminHrApi['createAdminManager']>));
  }
  createAdminStoreStaff(...args: Parameters<AdminHrApi['createAdminStoreStaff']>) {
    return this.hr.createAdminStoreStaff(...(args as Parameters<AdminHrApi['createAdminStoreStaff']>));
  }
  setAdminStoreStaffStatus(...args: Parameters<AdminHrApi['setAdminStoreStaffStatus']>) {
    return this.hr.setAdminStoreStaffStatus(...(args as Parameters<AdminHrApi['setAdminStoreStaffStatus']>));
  }
  getAdminConsultations(...args: Parameters<AdminHrApi['getAdminConsultations']>) {
    return this.hr.getAdminConsultations(...(args as Parameters<AdminHrApi['getAdminConsultations']>));
  }
  assignConsultationDoctor(...args: Parameters<AdminHrApi['assignConsultationDoctor']>) {
    return this.hr.assignConsultationDoctor(...(args as Parameters<AdminHrApi['assignConsultationDoctor']>));
  }
  getPayroll(...args: Parameters<AdminHrApi['getPayroll']>) {
    return this.hr.getPayroll(...(args as Parameters<AdminHrApi['getPayroll']>));
  }
  getFinanceSummary(...args: Parameters<AdminFinanceApi['getFinanceSummary']>) {
    return this.finance.getFinanceSummary(...(args as Parameters<AdminFinanceApi['getFinanceSummary']>));
  }
  getRevenueTrend(...args: Parameters<AdminFinanceApi['getRevenueTrend']>) {
    return this.finance.getRevenueTrend(...(args as Parameters<AdminFinanceApi['getRevenueTrend']>));
  }
  getRevenueByDoctor(...args: Parameters<AdminFinanceApi['getRevenueByDoctor']>) {
    return this.finance.getRevenueByDoctor(...(args as Parameters<AdminFinanceApi['getRevenueByDoctor']>));
  }
  getRevenueByDisease(...args: Parameters<AdminFinanceApi['getRevenueByDisease']>) {
    return this.finance.getRevenueByDisease(...(args as Parameters<AdminFinanceApi['getRevenueByDisease']>));
  }
  getOutstandingPayments(...args: Parameters<AdminFinanceApi['getOutstandingPayments']>) {
    return this.finance.getOutstandingPayments(...(args as Parameters<AdminFinanceApi['getOutstandingPayments']>));
  }
  getMedicineRevenue(...args: Parameters<AdminFinanceApi['getMedicineRevenue']>) {
    return this.finance.getMedicineRevenue(...(args as Parameters<AdminFinanceApi['getMedicineRevenue']>));
  }
  getPayslip(...args: Parameters<AdminFinanceApi['getPayslip']>) {
    return this.finance.getPayslip(...(args as Parameters<AdminFinanceApi['getPayslip']>));
  }
  getExpenses(...args: Parameters<AdminFinanceApi['getExpenses']>) {
    return this.finance.getExpenses(...(args as Parameters<AdminFinanceApi['getExpenses']>));
  }
  getExpenseSummary(...args: Parameters<AdminFinanceApi['getExpenseSummary']>) {
    return this.finance.getExpenseSummary(...(args as Parameters<AdminFinanceApi['getExpenseSummary']>));
  }
  createExpense(...args: Parameters<AdminFinanceApi['createExpense']>) {
    return this.finance.createExpense(...(args as Parameters<AdminFinanceApi['createExpense']>));
  }
  updateExpense(...args: Parameters<AdminFinanceApi['updateExpense']>) {
    return this.finance.updateExpense(...(args as Parameters<AdminFinanceApi['updateExpense']>));
  }
  deleteExpense(...args: Parameters<AdminFinanceApi['deleteExpense']>) {
    return this.finance.deleteExpense(...(args as Parameters<AdminFinanceApi['deleteExpense']>));
  }
  getBranchPnl(...args: Parameters<AdminFinanceApi['getBranchPnl']>) {
    return this.finance.getBranchPnl(...(args as Parameters<AdminFinanceApi['getBranchPnl']>));
  }
  exportAccountantBundle(...args: Parameters<AdminFinanceApi['exportAccountantBundle']>) {
    return this.finance.exportAccountantBundle(...(args as Parameters<AdminFinanceApi['exportAccountantBundle']>));
  }
  searchPatients(...args: Parameters<AdminOpsApi['searchPatients']>) {
    return this.ops.searchPatients(...(args as Parameters<AdminOpsApi['searchPatients']>));
  }
  registerPatient(...args: Parameters<AdminOpsApi['registerPatient']>) {
    return this.ops.registerPatient(...(args as Parameters<AdminOpsApi['registerPatient']>));
  }
  getPurchaseOrders(...args: Parameters<AdminOpsApi['getPurchaseOrders']>) {
    return this.ops.getPurchaseOrders(...(args as Parameters<AdminOpsApi['getPurchaseOrders']>));
  }
  getPurchaseOrder(...args: Parameters<AdminOpsApi['getPurchaseOrder']>) {
    return this.ops.getPurchaseOrder(...(args as Parameters<AdminOpsApi['getPurchaseOrder']>));
  }
  createPurchaseOrder(...args: Parameters<AdminOpsApi['createPurchaseOrder']>) {
    return this.ops.createPurchaseOrder(...(args as Parameters<AdminOpsApi['createPurchaseOrder']>));
  }
  getSuppliers(...args: Parameters<AdminOpsApi['getSuppliers']>) {
    return this.ops.getSuppliers(...(args as Parameters<AdminOpsApi['getSuppliers']>));
  }
  searchMedicines(...args: Parameters<AdminOpsApi['searchMedicines']>) {
    return this.ops.searchMedicines(...(args as Parameters<AdminOpsApi['searchMedicines']>));
  }
  listMedicines(...args: Parameters<AdminOpsApi['listMedicines']>) {
    return this.ops.listMedicines(...(args as Parameters<AdminOpsApi['listMedicines']>));
  }
  createMedicine(...args: Parameters<AdminOpsApi['createMedicine']>) {
    return this.ops.createMedicine(...(args as Parameters<AdminOpsApi['createMedicine']>));
  }
  updateMedicine(...args: Parameters<AdminOpsApi['updateMedicine']>) {
    return this.ops.updateMedicine(...(args as Parameters<AdminOpsApi['updateMedicine']>));
  }
  listSuppliers(...args: Parameters<AdminOpsApi['listSuppliers']>) {
    return this.ops.listSuppliers(...(args as Parameters<AdminOpsApi['listSuppliers']>));
  }
  createSupplier(...args: Parameters<AdminOpsApi['createSupplier']>) {
    return this.ops.createSupplier(...(args as Parameters<AdminOpsApi['createSupplier']>));
  }
  updateSupplier(...args: Parameters<AdminOpsApi['updateSupplier']>) {
    return this.ops.updateSupplier(...(args as Parameters<AdminOpsApi['updateSupplier']>));
  }
  getAdmins(...args: Parameters<AdminOpsApi['getAdmins']>) {
    return this.ops.getAdmins(...(args as Parameters<AdminOpsApi['getAdmins']>));
  }
  createAdmin(...args: Parameters<AdminOpsApi['createAdmin']>) {
    return this.ops.createAdmin(...(args as Parameters<AdminOpsApi['createAdmin']>));
  }
  setAdminStatus(...args: Parameters<AdminOpsApi['setAdminStatus']>) {
    return this.ops.setAdminStatus(...(args as Parameters<AdminOpsApi['setAdminStatus']>));
  }
  updateConsultationStatus(...args: Parameters<AdminOpsApi['updateConsultationStatus']>) {
    return this.ops.updateConsultationStatus(...(args as Parameters<AdminOpsApi['updateConsultationStatus']>));
  }
  getInventoryOverview(...args: Parameters<AdminOpsApi['getInventoryOverview']>) {
    return this.ops.getInventoryOverview(...(args as Parameters<AdminOpsApi['getInventoryOverview']>));
  }
  getStoreStock(...args: Parameters<AdminOpsApi['getStoreStock']>) {
    return this.ops.getStoreStock(...(args as Parameters<AdminOpsApi['getStoreStock']>));
  }
  getNotificationTemplates(...args: Parameters<AdminOpsApi['getNotificationTemplates']>) {
    return this.ops.getNotificationTemplates(...(args as Parameters<AdminOpsApi['getNotificationTemplates']>));
  }
  createNotificationTemplate(...args: Parameters<AdminOpsApi['createNotificationTemplate']>) {
    return this.ops.createNotificationTemplate(...(args as Parameters<AdminOpsApi['createNotificationTemplate']>));
  }
  updateNotificationTemplate(...args: Parameters<AdminOpsApi['updateNotificationTemplate']>) {
    return this.ops.updateNotificationTemplate(...(args as Parameters<AdminOpsApi['updateNotificationTemplate']>));
  }
  getNotificationBroadcasts(...args: Parameters<AdminOpsApi['getNotificationBroadcasts']>) {
    return this.ops.getNotificationBroadcasts(...(args as Parameters<AdminOpsApi['getNotificationBroadcasts']>));
  }
  sendNotificationBroadcast(...args: Parameters<AdminOpsApi['sendNotificationBroadcast']>) {
    return this.ops.sendNotificationBroadcast(...(args as Parameters<AdminOpsApi['sendNotificationBroadcast']>));
  }
  getEcosystemUsersMeta(...args: Parameters<AdminOpsApi['getEcosystemUsersMeta']>) {
    return this.ops.getEcosystemUsersMeta(...(args as Parameters<AdminOpsApi['getEcosystemUsersMeta']>));
  }
  getEcosystemUsers(...args: Parameters<AdminOpsApi['getEcosystemUsers']>) {
    return this.ops.getEcosystemUsers(...(args as Parameters<AdminOpsApi['getEcosystemUsers']>));
  }
  createEcosystemUser(...args: Parameters<AdminOpsApi['createEcosystemUser']>) {
    return this.ops.createEcosystemUser(...(args as Parameters<AdminOpsApi['createEcosystemUser']>));
  }
  updateEcosystemUser(...args: Parameters<AdminOpsApi['updateEcosystemUser']>) {
    return this.ops.updateEcosystemUser(...(args as Parameters<AdminOpsApi['updateEcosystemUser']>));
  }
  setEcosystemUserStatus(...args: Parameters<AdminOpsApi['setEcosystemUserStatus']>) {
    return this.ops.setEcosystemUserStatus(...(args as Parameters<AdminOpsApi['setEcosystemUserStatus']>));
  }
  getEcosystemCorporates(...args: Parameters<AdminOpsApi['getEcosystemCorporates']>) {
    return this.ops.getEcosystemCorporates(...(args as Parameters<AdminOpsApi['getEcosystemCorporates']>));
  }
  createEcosystemCorporate(...args: Parameters<AdminOpsApi['createEcosystemCorporate']>) {
    return this.ops.createEcosystemCorporate(...(args as Parameters<AdminOpsApi['createEcosystemCorporate']>));
  }
  enrollCorporatePatient(...args: Parameters<AdminOpsApi['enrollCorporatePatient']>) {
    return this.ops.enrollCorporatePatient(...(args as Parameters<AdminOpsApi['enrollCorporatePatient']>));
  }
  getCorporateEnrollments(...args: Parameters<AdminOpsApi['getCorporateEnrollments']>) {
    return this.ops.getCorporateEnrollments(...(args as Parameters<AdminOpsApi['getCorporateEnrollments']>));
  }
  removeCorporateEnrollment(...args: Parameters<AdminOpsApi['removeCorporateEnrollment']>) {
    return this.ops.removeCorporateEnrollment(...(args as Parameters<AdminOpsApi['removeCorporateEnrollment']>));
  }
  getInsuranceClaimsAdmin(...args: Parameters<AdminOpsApi['getInsuranceClaimsAdmin']>) {
    return this.ops.getInsuranceClaimsAdmin(...(args as Parameters<AdminOpsApi['getInsuranceClaimsAdmin']>));
  }
  getPortalUsersMeta(...args: Parameters<AdminOpsApi['getPortalUsersMeta']>) {
    return this.ops.getPortalUsersMeta(...(args as Parameters<AdminOpsApi['getPortalUsersMeta']>));
  }
  getPortalUsers(...args: Parameters<AdminOpsApi['getPortalUsers']>) {
    return this.ops.getPortalUsers(...(args as Parameters<AdminOpsApi['getPortalUsers']>));
  }
  createPortalUser(...args: Parameters<AdminOpsApi['createPortalUser']>) {
    return this.ops.createPortalUser(...(args as Parameters<AdminOpsApi['createPortalUser']>));
  }
  updatePortalUser(...args: Parameters<AdminOpsApi['updatePortalUser']>) {
    return this.ops.updatePortalUser(...(args as Parameters<AdminOpsApi['updatePortalUser']>));
  }
  setPortalUserStatus(...args: Parameters<AdminOpsApi['setPortalUserStatus']>) {
    return this.ops.setPortalUserStatus(...(args as Parameters<AdminOpsApi['setPortalUserStatus']>));
  }
  getAuditRetentionStats(...args: Parameters<AdminReportsApi['getAuditRetentionStats']>) {
    return this.reports.getAuditRetentionStats(...(args as Parameters<AdminReportsApi['getAuditRetentionStats']>));
  }
  purgeAuditLogs(...args: Parameters<AdminReportsApi['purgeAuditLogs']>) {
    return this.reports.purgeAuditLogs(...(args as Parameters<AdminReportsApi['purgeAuditLogs']>));
  }
  getRbacMatrix(...args: Parameters<AdminReportsApi['getRbacMatrix']>) {
    return this.reports.getRbacMatrix(...(args as Parameters<AdminReportsApi['getRbacMatrix']>));
  }
  getAdminStore(...args: Parameters<AdminHrApi['getAdminStore']>) {
    return this.hr.getAdminStore(...(args as Parameters<AdminHrApi['getAdminStore']>));
  }
  updateAdminStore(...args: Parameters<AdminHrApi['updateAdminStore']>) {
    return this.hr.updateAdminStore(...(args as Parameters<AdminHrApi['updateAdminStore']>));
  }
}
