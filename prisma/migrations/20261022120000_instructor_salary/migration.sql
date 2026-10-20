-- CreateEnum
CREATE TYPE "SalaryMonthStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterTable
ALTER TABLE "InstructorProfile" ADD COLUMN     "monthlySalary" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "InstructorSalaryMonth" (
    "id" TEXT NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "salaryMonth" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SalaryMonthStatus" NOT NULL DEFAULT 'UNPAID',
    "paidOn" DATE,
    "note" VARCHAR(300),
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorSalaryMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstructorSalaryMonth_salaryMonth_idx" ON "InstructorSalaryMonth"("salaryMonth");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorSalaryMonth_instructorUserId_salaryMonth_key" ON "InstructorSalaryMonth"("instructorUserId", "salaryMonth");

-- AddForeignKey
ALTER TABLE "InstructorSalaryMonth" ADD CONSTRAINT "InstructorSalaryMonth_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "InstructorProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

