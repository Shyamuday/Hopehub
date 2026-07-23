import { inject, Service } from '@angular/core';
import { AdminReportsApi } from './admin/admin-reports.api';
import { AdminDoctorsApi } from './admin/admin-doctors.api';
import { AdminCatalogApi } from './admin/admin-catalog.api';
import { AdminHrApi } from './admin/admin-hr.api';
import { AdminFinanceApi } from './admin/admin-finance.api';
import { AdminOpsApi } from './admin/admin-ops.api';
import { AdminRewardsApi } from './admin/admin-rewards.api';
import { AdminClinicalApi } from './admin/admin-clinical.api';

@Service()
export class AdminApi {
  private readonly reports = inject(AdminReportsApi);
  private readonly doctors = inject(AdminDoctorsApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly hr = inject(AdminHrApi);
  private readonly finance = inject(AdminFinanceApi);
  private readonly ops = inject(AdminOpsApi);
  private readonly rewards = inject(AdminRewardsApi);
  private readonly clinical = inject(AdminClinicalApi);

  getReports(...args: Parameters<AdminReportsApi['getReports']>) {
    return this.reports.getReports(...(args as Parameters<AdminReportsApi['getReports']>));
  }
  getAuditLogs(...args: Parameters<AdminReportsApi['getAuditLogs']>) {
    return this.reports.getAuditLogs(...(args as Parameters<AdminReportsApi['getAuditLogs']>));
  }
  getAdherenceRisk(...args: Parameters<AdminReportsApi['getAdherenceRisk']>) {
    return this.reports.getAdherenceRisk(
      ...(args as Parameters<AdminReportsApi['getAdherenceRisk']>),
    );
  }
  getAnalyticsFunnels(...args: Parameters<AdminReportsApi['getAnalyticsFunnels']>) {
    return this.reports.getAnalyticsFunnels(
      ...(args as Parameters<AdminReportsApi['getAnalyticsFunnels']>),
    );
  }
  getPayments(...args: Parameters<AdminReportsApi['getPayments']>) {
    return this.reports.getPayments(...(args as Parameters<AdminReportsApi['getPayments']>));
  }
  exportPaymentsCsv(...args: Parameters<AdminReportsApi['exportPaymentsCsv']>) {
    return this.reports.exportPaymentsCsv(
      ...(args as Parameters<AdminReportsApi['exportPaymentsCsv']>),
    );
  }
  exportAuditCsv(...args: Parameters<AdminReportsApi['exportAuditCsv']>) {
    return this.reports.exportAuditCsv(...(args as Parameters<AdminReportsApi['exportAuditCsv']>));
  }
  getDoctors(...args: Parameters<AdminDoctorsApi['getDoctors']>) {
    return this.doctors.getDoctors(...(args as Parameters<AdminDoctorsApi['getDoctors']>));
  }
  getPendingDoctors(...args: Parameters<AdminDoctorsApi['getPendingDoctors']>) {
    return this.doctors.getPendingDoctors(
      ...(args as Parameters<AdminDoctorsApi['getPendingDoctors']>),
    );
  }
  getDoctorsPaged(...args: Parameters<AdminDoctorsApi['getDoctorsPaged']>) {
    return this.doctors.getDoctorsPaged(
      ...(args as Parameters<AdminDoctorsApi['getDoctorsPaged']>),
    );
  }
  getPendingDoctorsPaged(...args: Parameters<AdminDoctorsApi['getPendingDoctorsPaged']>) {
    return this.doctors.getPendingDoctorsPaged(
      ...(args as Parameters<AdminDoctorsApi['getPendingDoctorsPaged']>),
    );
  }
  approveDoctor(...args: Parameters<AdminDoctorsApi['approveDoctor']>) {
    return this.doctors.approveDoctor(...(args as Parameters<AdminDoctorsApi['approveDoctor']>));
  }
  rejectDoctor(...args: Parameters<AdminDoctorsApi['rejectDoctor']>) {
    return this.doctors.rejectDoctor(...(args as Parameters<AdminDoctorsApi['rejectDoctor']>));
  }
  setDoctorStatus(...args: Parameters<AdminDoctorsApi['setDoctorStatus']>) {
    return this.doctors.setDoctorStatus(
      ...(args as Parameters<AdminDoctorsApi['setDoctorStatus']>),
    );
  }
  updateDoctor(...args: Parameters<AdminDoctorsApi['updateDoctor']>) {
    return this.doctors.updateDoctor(...(args as Parameters<AdminDoctorsApi['updateDoctor']>));
  }
  createDoctor(...args: Parameters<AdminDoctorsApi['createDoctor']>) {
    return this.doctors.createDoctor(...(args as Parameters<AdminDoctorsApi['createDoctor']>));
  }
  setDoctorWebsiteOrder(...args: Parameters<AdminDoctorsApi['setDoctorWebsiteOrder']>) {
    return this.doctors.setDoctorWebsiteOrder(
      ...(args as Parameters<AdminDoctorsApi['setDoctorWebsiteOrder']>),
    );
  }
  getSiteConfig(...args: Parameters<AdminDoctorsApi['getSiteConfig']>) {
    return this.doctors.getSiteConfig(...(args as Parameters<AdminDoctorsApi['getSiteConfig']>));
  }
  setSiteConfig(...args: Parameters<AdminDoctorsApi['setSiteConfig']>) {
    return this.doctors.setSiteConfig(...(args as Parameters<AdminDoctorsApi['setSiteConfig']>));
  }
  listTestimonials() {
    return this.doctors.listTestimonials();
  }
  createTestimonial(...args: Parameters<AdminDoctorsApi['createTestimonial']>) {
    return this.doctors.createTestimonial(...args);
  }
  updateTestimonial(...args: Parameters<AdminDoctorsApi['updateTestimonial']>) {
    return this.doctors.updateTestimonial(...args);
  }
  deleteTestimonial(...args: Parameters<AdminDoctorsApi['deleteTestimonial']>) {
    return this.doctors.deleteTestimonial(...args);
  }
  listFaq() {
    return this.doctors.listFaq();
  }
  createFaqEntry(...args: Parameters<AdminDoctorsApi['createFaqEntry']>) {
    return this.doctors.createFaqEntry(...args);
  }
  updateFaqEntry(...args: Parameters<AdminDoctorsApi['updateFaqEntry']>) {
    return this.doctors.updateFaqEntry(...args);
  }
  deleteFaqEntry(...args: Parameters<AdminDoctorsApi['deleteFaqEntry']>) {
    return this.doctors.deleteFaqEntry(...args);
  }
  listBlogPosts() {
    return this.doctors.listBlogPosts();
  }
  getBlogStats() {
    return this.doctors.getBlogStats();
  }
  createBlogPost(...args: Parameters<AdminDoctorsApi['createBlogPost']>) {
    return this.doctors.createBlogPost(...args);
  }
  updateBlogPost(...args: Parameters<AdminDoctorsApi['updateBlogPost']>) {
    return this.doctors.updateBlogPost(...args);
  }
  deleteBlogPost(...args: Parameters<AdminDoctorsApi['deleteBlogPost']>) {
    return this.doctors.deleteBlogPost(...args);
  }
  listBlogComments(...args: Parameters<AdminDoctorsApi['listBlogComments']>) {
    return this.doctors.listBlogComments(...args);
  }
  moderateBlogComment(...args: Parameters<AdminDoctorsApi['moderateBlogComment']>) {
    return this.doctors.moderateBlogComment(...args);
  }
  deleteBlogComment(...args: Parameters<AdminDoctorsApi['deleteBlogComment']>) {
    return this.doctors.deleteBlogComment(...args);
  }
  getOnlineDoctorStats() {
    return this.doctors.getOnlineDoctorStats();
  }
  listOnlineDoctors() {
    return this.doctors.listOnlineDoctors();
  }
  listChatSessions(...args: Parameters<AdminDoctorsApi['listChatSessions']>) {
    return this.doctors.listChatSessions(...args);
  }
  getChatSessionStats(...args: Parameters<AdminDoctorsApi['getChatSessionStats']>) {
    return this.doctors.getChatSessionStats(...args);
  }
  getChatSession(...args: Parameters<AdminDoctorsApi['getChatSession']>) {
    return this.doctors.getChatSession(...args);
  }
  resolveChatSession(...args: Parameters<AdminDoctorsApi['resolveChatSession']>) {
    return this.doctors.resolveChatSession(...args);
  }
  sendChatOperatorMessage(...args: Parameters<AdminDoctorsApi['sendChatOperatorMessage']>) {
    return this.doctors.sendChatOperatorMessage(...args);
  }
  getVisitorLeadStats(...args: Parameters<AdminDoctorsApi['getVisitorLeadStats']>) {
    return this.doctors.getVisitorLeadStats(...args);
  }
  listVisitorLeads(...args: Parameters<AdminDoctorsApi['listVisitorLeads']>) {
    return this.doctors.listVisitorLeads(...args);
  }
  exportVisitorLeadsCsv(...args: Parameters<AdminDoctorsApi['exportVisitorLeadsCsv']>) {
    return this.doctors.exportVisitorLeadsCsv(...args);
  }
  getVisitorLead(...args: Parameters<AdminDoctorsApi['getVisitorLead']>) {
    return this.doctors.getVisitorLead(...args);
  }
  updateVisitorLeadFollowUp(...args: Parameters<AdminDoctorsApi['updateVisitorLeadFollowUp']>) {
    return this.doctors.updateVisitorLeadFollowUp(...args);
  }
  bookVisitorLeadConsultation(...args: Parameters<AdminDoctorsApi['bookVisitorLeadConsultation']>) {
    return this.doctors.bookVisitorLeadConsultation(...args);
  }
  getLeadFunnelReport(...args: Parameters<AdminDoctorsApi['getLeadFunnelReport']>) {
    return this.doctors.getLeadFunnelReport(...args);
  }
  getConsultations(...args: Parameters<AdminCatalogApi['getConsultations']>) {
    return this.catalog.getConsultations(
      ...(args as Parameters<AdminCatalogApi['getConsultations']>),
    );
  }
  getConsumersPaged(...args: Parameters<AdminCatalogApi['getConsumersPaged']>) {
    return this.catalog.getConsumersPaged(
      ...(args as Parameters<AdminCatalogApi['getConsumersPaged']>),
    );
  }
  getConsumerDetail(...args: Parameters<AdminCatalogApi['getConsumerDetail']>) {
    return this.catalog.getConsumerDetail(
      ...(args as Parameters<AdminCatalogApi['getConsumerDetail']>),
    );
  }
  getConsumerSupport(...args: Parameters<AdminCatalogApi['getConsumerSupport']>) {
    return this.catalog.getConsumerSupport(
      ...(args as Parameters<AdminCatalogApi['getConsumerSupport']>),
    );
  }
  addConsumerSupportNote(...args: Parameters<AdminCatalogApi['addConsumerSupportNote']>) {
    return this.catalog.addConsumerSupportNote(
      ...(args as Parameters<AdminCatalogApi['addConsumerSupportNote']>),
    );
  }
  assignDoctor(...args: Parameters<AdminCatalogApi['assignDoctor']>) {
    return this.catalog.assignDoctor(...(args as Parameters<AdminCatalogApi['assignDoctor']>));
  }
  getActiveDoctors(...args: Parameters<AdminCatalogApi['getActiveDoctors']>) {
    return this.catalog.getActiveDoctors(
      ...(args as Parameters<AdminCatalogApi['getActiveDoctors']>),
    );
  }
  getDiseases(...args: Parameters<AdminCatalogApi['getDiseases']>) {
    return this.catalog.getDiseases(...(args as Parameters<AdminCatalogApi['getDiseases']>));
  }
  getDiseaseCategories(...args: Parameters<AdminCatalogApi['getDiseaseCategories']>) {
    return this.catalog.getDiseaseCategories(
      ...(args as Parameters<AdminCatalogApi['getDiseaseCategories']>),
    );
  }
  syncDiseaseCatalog(...args: Parameters<AdminCatalogApi['syncDiseaseCatalog']>) {
    return this.catalog.syncDiseaseCatalog(
      ...(args as Parameters<AdminCatalogApi['syncDiseaseCatalog']>),
    );
  }
  reconcileDiseaseOptions(...args: Parameters<AdminCatalogApi['reconcileDiseaseOptions']>) {
    return this.catalog.reconcileDiseaseOptions(
      ...(args as Parameters<AdminCatalogApi['reconcileDiseaseOptions']>),
    );
  }
  getDiseasePublicPage(...args: Parameters<AdminCatalogApi['getDiseasePublicPage']>) {
    return this.catalog.getDiseasePublicPage(
      ...(args as Parameters<AdminCatalogApi['getDiseasePublicPage']>),
    );
  }
  updateDiseasePublicPage(...args: Parameters<AdminCatalogApi['updateDiseasePublicPage']>) {
    return this.catalog.updateDiseasePublicPage(
      ...(args as Parameters<AdminCatalogApi['updateDiseasePublicPage']>),
    );
  }
  createDisease(...args: Parameters<AdminCatalogApi['createDisease']>) {
    return this.catalog.createDisease(...(args as Parameters<AdminCatalogApi['createDisease']>));
  }
  updateDisease(...args: Parameters<AdminCatalogApi['updateDisease']>) {
    return this.catalog.updateDisease(...(args as Parameters<AdminCatalogApi['updateDisease']>));
  }
  getLocationFees(...args: Parameters<AdminCatalogApi['getLocationFees']>) {
    return this.catalog.getLocationFees(
      ...(args as Parameters<AdminCatalogApi['getLocationFees']>),
    );
  }
  saveLocationFee(...args: Parameters<AdminCatalogApi['saveLocationFee']>) {
    return this.catalog.saveLocationFee(
      ...(args as Parameters<AdminCatalogApi['saveLocationFee']>),
    );
  }
  deleteLocationFee(...args: Parameters<AdminCatalogApi['deleteLocationFee']>) {
    return this.catalog.deleteLocationFee(
      ...(args as Parameters<AdminCatalogApi['deleteLocationFee']>),
    );
  }
  getBillingPlansAdmin(...args: Parameters<AdminCatalogApi['getBillingPlansAdmin']>) {
    return this.catalog.getBillingPlansAdmin(
      ...(args as Parameters<AdminCatalogApi['getBillingPlansAdmin']>),
    );
  }
  updateBillingPlan(...args: Parameters<AdminCatalogApi['updateBillingPlan']>) {
    return this.catalog.updateBillingPlan(
      ...(args as Parameters<AdminCatalogApi['updateBillingPlan']>),
    );
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
    return this.hr.generateDoctorLetter(
      ...(args as Parameters<AdminHrApi['generateDoctorLetter']>),
    );
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
    return this.hr.generateStoreStaffLetter(
      ...(args as Parameters<AdminHrApi['generateStoreStaffLetter']>),
    );
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
    return this.hr.createAdminStoreStaff(
      ...(args as Parameters<AdminHrApi['createAdminStoreStaff']>),
    );
  }
  setAdminStoreStaffStatus(...args: Parameters<AdminHrApi['setAdminStoreStaffStatus']>) {
    return this.hr.setAdminStoreStaffStatus(
      ...(args as Parameters<AdminHrApi['setAdminStoreStaffStatus']>),
    );
  }
  getAdminConsultations(...args: Parameters<AdminHrApi['getAdminConsultations']>) {
    return this.hr.getAdminConsultations(
      ...(args as Parameters<AdminHrApi['getAdminConsultations']>),
    );
  }
  assignConsultationDoctor(...args: Parameters<AdminHrApi['assignConsultationDoctor']>) {
    return this.hr.assignConsultationDoctor(
      ...(args as Parameters<AdminHrApi['assignConsultationDoctor']>),
    );
  }
  getPayroll(...args: Parameters<AdminHrApi['getPayroll']>) {
    return this.hr.getPayroll(...(args as Parameters<AdminHrApi['getPayroll']>));
  }
  getSalaryEmployees(...args: Parameters<AdminHrApi['getSalaryEmployees']>) {
    return this.hr.getSalaryEmployees(...(args as Parameters<AdminHrApi['getSalaryEmployees']>));
  }
  getEmployeeSalary(...args: Parameters<AdminHrApi['getEmployeeSalary']>) {
    return this.hr.getEmployeeSalary(...(args as Parameters<AdminHrApi['getEmployeeSalary']>));
  }
  saveEmployeeSalary(...args: Parameters<AdminHrApi['saveEmployeeSalary']>) {
    return this.hr.saveEmployeeSalary(...(args as Parameters<AdminHrApi['saveEmployeeSalary']>));
  }
  getFinanceSummary(...args: Parameters<AdminFinanceApi['getFinanceSummary']>) {
    return this.finance.getFinanceSummary(
      ...(args as Parameters<AdminFinanceApi['getFinanceSummary']>),
    );
  }
  getRevenueTrend(...args: Parameters<AdminFinanceApi['getRevenueTrend']>) {
    return this.finance.getRevenueTrend(
      ...(args as Parameters<AdminFinanceApi['getRevenueTrend']>),
    );
  }
  getRevenueByDoctor(...args: Parameters<AdminFinanceApi['getRevenueByDoctor']>) {
    return this.finance.getRevenueByDoctor(
      ...(args as Parameters<AdminFinanceApi['getRevenueByDoctor']>),
    );
  }
  getRevenueByDisease(...args: Parameters<AdminFinanceApi['getRevenueByDisease']>) {
    return this.finance.getRevenueByDisease(
      ...(args as Parameters<AdminFinanceApi['getRevenueByDisease']>),
    );
  }
  getOutstandingPayments(...args: Parameters<AdminFinanceApi['getOutstandingPayments']>) {
    return this.finance.getOutstandingPayments(
      ...(args as Parameters<AdminFinanceApi['getOutstandingPayments']>),
    );
  }
  getMedicineRevenue(...args: Parameters<AdminFinanceApi['getMedicineRevenue']>) {
    return this.finance.getMedicineRevenue(
      ...(args as Parameters<AdminFinanceApi['getMedicineRevenue']>),
    );
  }
  getPayslip(...args: Parameters<AdminFinanceApi['getPayslip']>) {
    return this.finance.getPayslip(...(args as Parameters<AdminFinanceApi['getPayslip']>));
  }
  getExpenses(...args: Parameters<AdminFinanceApi['getExpenses']>) {
    return this.finance.getExpenses(...(args as Parameters<AdminFinanceApi['getExpenses']>));
  }
  getExpenseSummary(...args: Parameters<AdminFinanceApi['getExpenseSummary']>) {
    return this.finance.getExpenseSummary(
      ...(args as Parameters<AdminFinanceApi['getExpenseSummary']>),
    );
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
  getPeriodReport(...args: Parameters<AdminFinanceApi['getPeriodReport']>) {
    return this.finance.getPeriodReport(
      ...(args as Parameters<AdminFinanceApi['getPeriodReport']>),
    );
  }
  exportAccountantBundle(...args: Parameters<AdminFinanceApi['exportAccountantBundle']>) {
    return this.finance.exportAccountantBundle(
      ...(args as Parameters<AdminFinanceApi['exportAccountantBundle']>),
    );
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
    return this.ops.createPurchaseOrder(
      ...(args as Parameters<AdminOpsApi['createPurchaseOrder']>),
    );
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
    return this.ops.updateConsultationStatus(
      ...(args as Parameters<AdminOpsApi['updateConsultationStatus']>),
    );
  }
  getInventoryOverview(...args: Parameters<AdminOpsApi['getInventoryOverview']>) {
    return this.ops.getInventoryOverview(
      ...(args as Parameters<AdminOpsApi['getInventoryOverview']>),
    );
  }
  getStoreStock(...args: Parameters<AdminOpsApi['getStoreStock']>) {
    return this.ops.getStoreStock(...(args as Parameters<AdminOpsApi['getStoreStock']>));
  }
  getNotificationTemplates(...args: Parameters<AdminOpsApi['getNotificationTemplates']>) {
    return this.ops.getNotificationTemplates(
      ...(args as Parameters<AdminOpsApi['getNotificationTemplates']>),
    );
  }
  createNotificationTemplate(...args: Parameters<AdminOpsApi['createNotificationTemplate']>) {
    return this.ops.createNotificationTemplate(
      ...(args as Parameters<AdminOpsApi['createNotificationTemplate']>),
    );
  }
  updateNotificationTemplate(...args: Parameters<AdminOpsApi['updateNotificationTemplate']>) {
    return this.ops.updateNotificationTemplate(
      ...(args as Parameters<AdminOpsApi['updateNotificationTemplate']>),
    );
  }
  getNotificationBroadcasts(...args: Parameters<AdminOpsApi['getNotificationBroadcasts']>) {
    return this.ops.getNotificationBroadcasts(
      ...(args as Parameters<AdminOpsApi['getNotificationBroadcasts']>),
    );
  }
  sendNotificationBroadcast(...args: Parameters<AdminOpsApi['sendNotificationBroadcast']>) {
    return this.ops.sendNotificationBroadcast(
      ...(args as Parameters<AdminOpsApi['sendNotificationBroadcast']>),
    );
  }
  getEcosystemUsersMeta(...args: Parameters<AdminOpsApi['getEcosystemUsersMeta']>) {
    return this.ops.getEcosystemUsersMeta(
      ...(args as Parameters<AdminOpsApi['getEcosystemUsersMeta']>),
    );
  }
  getEcosystemUsers(...args: Parameters<AdminOpsApi['getEcosystemUsers']>) {
    return this.ops.getEcosystemUsers(...(args as Parameters<AdminOpsApi['getEcosystemUsers']>));
  }
  createEcosystemUser(...args: Parameters<AdminOpsApi['createEcosystemUser']>) {
    return this.ops.createEcosystemUser(
      ...(args as Parameters<AdminOpsApi['createEcosystemUser']>),
    );
  }
  updateEcosystemUser(...args: Parameters<AdminOpsApi['updateEcosystemUser']>) {
    return this.ops.updateEcosystemUser(
      ...(args as Parameters<AdminOpsApi['updateEcosystemUser']>),
    );
  }
  setEcosystemUserStatus(...args: Parameters<AdminOpsApi['setEcosystemUserStatus']>) {
    return this.ops.setEcosystemUserStatus(
      ...(args as Parameters<AdminOpsApi['setEcosystemUserStatus']>),
    );
  }
  getEcosystemCorporates(...args: Parameters<AdminOpsApi['getEcosystemCorporates']>) {
    return this.ops.getEcosystemCorporates(
      ...(args as Parameters<AdminOpsApi['getEcosystemCorporates']>),
    );
  }
  createEcosystemCorporate(...args: Parameters<AdminOpsApi['createEcosystemCorporate']>) {
    return this.ops.createEcosystemCorporate(
      ...(args as Parameters<AdminOpsApi['createEcosystemCorporate']>),
    );
  }
  enrollCorporatePatient(...args: Parameters<AdminOpsApi['enrollCorporatePatient']>) {
    return this.ops.enrollCorporatePatient(
      ...(args as Parameters<AdminOpsApi['enrollCorporatePatient']>),
    );
  }
  getCorporateEnrollments(...args: Parameters<AdminOpsApi['getCorporateEnrollments']>) {
    return this.ops.getCorporateEnrollments(
      ...(args as Parameters<AdminOpsApi['getCorporateEnrollments']>),
    );
  }
  removeCorporateEnrollment(...args: Parameters<AdminOpsApi['removeCorporateEnrollment']>) {
    return this.ops.removeCorporateEnrollment(
      ...(args as Parameters<AdminOpsApi['removeCorporateEnrollment']>),
    );
  }
  getInsuranceClaimsAdmin(...args: Parameters<AdminOpsApi['getInsuranceClaimsAdmin']>) {
    return this.ops.getInsuranceClaimsAdmin(
      ...(args as Parameters<AdminOpsApi['getInsuranceClaimsAdmin']>),
    );
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
    return this.ops.setPortalUserStatus(
      ...(args as Parameters<AdminOpsApi['setPortalUserStatus']>),
    );
  }
  getAuditRetentionStats(...args: Parameters<AdminReportsApi['getAuditRetentionStats']>) {
    return this.reports.getAuditRetentionStats(
      ...(args as Parameters<AdminReportsApi['getAuditRetentionStats']>),
    );
  }
  purgeAuditLogs(...args: Parameters<AdminReportsApi['purgeAuditLogs']>) {
    return this.reports.purgeAuditLogs(...(args as Parameters<AdminReportsApi['purgeAuditLogs']>));
  }
  getRbacMatrix(...args: Parameters<AdminReportsApi['getRbacMatrix']>) {
    return this.reports.getRbacMatrix(...(args as Parameters<AdminReportsApi['getRbacMatrix']>));
  }
  getPermissionPresets(...args: Parameters<AdminReportsApi['getPermissionPresets']>) {
    return this.reports.getPermissionPresets(
      ...(args as Parameters<AdminReportsApi['getPermissionPresets']>),
    );
  }
  getStaff(...args: Parameters<AdminReportsApi['getStaff']>) {
    return this.reports.getStaff(...(args as Parameters<AdminReportsApi['getStaff']>));
  }
  updateStaff(...args: Parameters<AdminReportsApi['updateStaff']>) {
    return this.reports.updateStaff(...(args as Parameters<AdminReportsApi['updateStaff']>));
  }
  getAdminStore(...args: Parameters<AdminHrApi['getAdminStore']>) {
    return this.hr.getAdminStore(...(args as Parameters<AdminHrApi['getAdminStore']>));
  }
  updateAdminStore(...args: Parameters<AdminHrApi['updateAdminStore']>) {
    return this.hr.updateAdminStore(...(args as Parameters<AdminHrApi['updateAdminStore']>));
  }
  listVacancies(...args: Parameters<AdminOpsApi['listVacancies']>) {
    return this.ops.listVacancies(...(args as Parameters<AdminOpsApi['listVacancies']>));
  }
  createVacancy(...args: Parameters<AdminOpsApi['createVacancy']>) {
    return this.ops.createVacancy(...(args as Parameters<AdminOpsApi['createVacancy']>));
  }
  updateVacancy(...args: Parameters<AdminOpsApi['updateVacancy']>) {
    return this.ops.updateVacancy(...(args as Parameters<AdminOpsApi['updateVacancy']>));
  }
  closeVacancy(...args: Parameters<AdminOpsApi['closeVacancy']>) {
    return this.ops.closeVacancy(...(args as Parameters<AdminOpsApi['closeVacancy']>));
  }
  listCounsellorApplications(...args: Parameters<AdminOpsApi['listCounsellorApplications']>) {
    return this.ops.listCounsellorApplications(
      ...(args as Parameters<AdminOpsApi['listCounsellorApplications']>),
    );
  }
  updateCounsellorApplicationStatus(
    ...args: Parameters<AdminOpsApi['updateCounsellorApplicationStatus']>
  ) {
    return this.ops.updateCounsellorApplicationStatus(
      ...(args as Parameters<AdminOpsApi['updateCounsellorApplicationStatus']>),
    );
  }

  listRewardRules() {
    return this.rewards.listRewardRules();
  }
  createRewardRule(payload: unknown) {
    return this.rewards.createRewardRule(payload);
  }
  updateRewardRule(id: string, payload: unknown) {
    return this.rewards.updateRewardRule(id, payload);
  }
  deleteRewardRule(id: string) {
    return this.rewards.deleteRewardRule(id);
  }
  listReferrals(limit = 50) {
    return this.rewards.listReferrals(limit);
  }

  listClinicalMethodOptions() {
    return this.clinical.listMethodOptions();
  }
  listAdminPrescriptions(...args: Parameters<AdminClinicalApi['listPrescriptions']>) {
    return this.clinical.listPrescriptions(...args);
  }
  getAdminPrescription(...args: Parameters<AdminClinicalApi['getPrescription']>) {
    return this.clinical.getPrescription(...args);
  }
  listAdminCaseAnalyses(...args: Parameters<AdminClinicalApi['listCaseAnalyses']>) {
    return this.clinical.listCaseAnalyses(...args);
  }
  getAdminCaseAnalysis(...args: Parameters<AdminClinicalApi['getCaseAnalysis']>) {
    return this.clinical.getCaseAnalysis(...args);
  }
  listPatientClinicalMedia(...args: Parameters<AdminClinicalApi['listPatientClinicalMedia']>) {
    return this.clinical.listPatientClinicalMedia(...args);
  }
}
