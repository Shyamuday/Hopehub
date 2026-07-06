-- CreateTable
CREATE TABLE "EmployeeSalary" (
    "id" TEXT NOT NULL,
    "employeeType" "EmployeeType" NOT NULL,
    "doctorId" TEXT,
    "storeStaffId" TEXT,
    "basicPaise" INTEGER NOT NULL DEFAULT 0,
    "hraPaise" INTEGER NOT NULL DEFAULT 0,
    "conveyancePaise" INTEGER NOT NULL DEFAULT 0,
    "medicalAllowancePaise" INTEGER NOT NULL DEFAULT 0,
    "specialAllowancePaise" INTEGER NOT NULL DEFAULT 0,
    "otherAllowancePaise" INTEGER NOT NULL DEFAULT 0,
    "employerPfPaise" INTEGER NOT NULL DEFAULT 0,
    "employeePfPaise" INTEGER NOT NULL DEFAULT 0,
    "employerEsiPaise" INTEGER NOT NULL DEFAULT 0,
    "employeeEsiPaise" INTEGER NOT NULL DEFAULT 0,
    "professionalTaxPaise" INTEGER NOT NULL DEFAULT 0,
    "tdsPaise" INTEGER NOT NULL DEFAULT 0,
    "otherDeductionPaise" INTEGER NOT NULL DEFAULT 0,
    "grossPaise" INTEGER NOT NULL DEFAULT 0,
    "netPaise" INTEGER NOT NULL DEFAULT 0,
    "ctcPaise" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalary_doctorId_key" ON "EmployeeSalary"("doctorId");
CREATE UNIQUE INDEX "EmployeeSalary_storeStaffId_key" ON "EmployeeSalary"("storeStaffId");
CREATE INDEX "EmployeeSalary_employeeType_idx" ON "EmployeeSalary"("employeeType");

-- AddForeignKey
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_storeStaffId_fkey" FOREIGN KEY ("storeStaffId") REFERENCES "StoreStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
