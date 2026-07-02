import { Injectable } from '@angular/core';
import { AdminReportsApi } from './admin/admin-reports.api';
import { AdminDoctorsApi } from './admin/admin-doctors.api';
import { AdminCatalogApi } from './admin/admin-catalog.api';
import { AdminHrApi } from './admin/admin-hr.api';
import { AdminFinanceApi } from './admin/admin-finance.api';

@Injectable({
  providedIn: 'root'
})
export class AdminApi {
  constructor(
    private readonly reports: AdminReportsApi,
    private readonly doctors: AdminDoctorsApi,
    private readonly catalog: AdminCatalogApi,
    private readonly hr: AdminHrApi,
    private readonly finance: AdminFinanceApi
  ) {}

  getReports(...args: Parameters<AdminReportsApi['getReports']>) {
    return this.reports.getReports(...(args as Parameters<AdminReportsApi['getReports']>));
  }
  getAuditLogs(...args: Parameters<AdminReportsApi['getAuditLogs']>) {
    return this.reports.getAuditLogs(...(args as Parameters<AdminReportsApi['getAuditLogs']>));
  }
  getAdherenceRisk(...args: Parameters<AdminReportsApi['getAdherenceRisk']>) {
    return this.reports.getAdherenceRisk(...(args as Parameters<AdminReportsApi['getAdherenceRisk']>));
  }
  getPayments(...args: Parameters<AdminReportsApi['getPayments']>) {
    return this.reports.getPayments(...(args as Parameters<AdminReportsApi['getPayments']>));
  }
  exportPaymentsCsv(...args: Parameters<AdminReportsApi['exportPaymentsCsv']>) {
    return this.reports.exportPaymentsCsv(...(args as Parameters<AdminReportsApi['exportPaymentsCsv']>));
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
}
