-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STUDENT', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('REGULAR', 'TRIAL_PREPARATION', 'ADDITIONAL_VEHICLE', 'DAILY');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'VAN', 'MOTORCYCLE', 'THREE_WHEELER');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('REGULAR', 'TRIAL_PREPARATION', 'DAILY');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATIC', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'BANK_DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LessonScheduleStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "MedicalAppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('WRITTEN', 'OFFICIAL_DRIVING_TRIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExamResult" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('MEDICAL', 'EXAM');

-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "nicNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "startDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "InstructorProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "hireDate" DATE NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "nicNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "additionalNote" TEXT,
    "selectedPackageId" TEXT NOT NULL,
    "packagePriceAtSubmission" DECIMAL(10,2) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "approvedStudentUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "durationDays" INTEGER,
    "sessionDurationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "requiredSessions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "manufacturingYear" INTEGER,
    "colour" TEXT,
    "transmissionType" "TransmissionType" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "registrationRequestId" TEXT,
    "enrollmentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionReference" TEXT,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "branch" TEXT,
    "reviewedByUserId" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSlip" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReviewHistory" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "decision" "PaymentReviewDecision" NOT NULL,
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "registrationRequestId" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreedPrice" DECIMAL(10,2) NOT NULL,
    "finalFee" DECIMAL(10,2) NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentTrainingRequirement" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "requiredSessions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentTrainingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonSchedule" (
    "id" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "LessonScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonScheduleStudent" (
    "id" TEXT NOT NULL,
    "lessonScheduleId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "trainingRequirementId" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "attendance" "AttendanceStatus",
    "attendanceMarkedAt" TIMESTAMP(3),
    "attendanceMarkedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonScheduleStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonFeedback" (
    "id" TEXT NOT NULL,
    "lessonScheduleStudentId" TEXT NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMedical" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "status" "MedicalAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExam" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "vehicleType" "VehicleType",
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "result" "ExamResult",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentDateHistory" (
    "id" TEXT NOT NULL,
    "appointmentType" "AppointmentType" NOT NULL,
    "studentMedicalId" TEXT,
    "studentExamId" TEXT,
    "previousDate" TIMESTAMP(3) NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentDateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_nicNumber_key" ON "StudentProfile"("nicNumber");

-- CreateIndex
CREATE INDEX "StudentProfile_fullName_idx" ON "StudentProfile"("fullName");

-- CreateIndex
CREATE INDEX "StudentProfile_phoneNumber_idx" ON "StudentProfile"("phoneNumber");

-- CreateIndex
CREATE INDEX "InstructorProfile_fullName_idx" ON "InstructorProfile"("fullName");

-- CreateIndex
CREATE INDEX "InstructorProfile_status_idx" ON "InstructorProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_referenceNumber_key" ON "RegistrationRequest"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequest_approvedStudentUserId_key" ON "RegistrationRequest"("approvedStudentUserId");

-- CreateIndex
CREATE INDEX "RegistrationRequest_status_submittedAt_idx" ON "RegistrationRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "RegistrationRequest_phoneNumber_idx" ON "RegistrationRequest"("phoneNumber");

-- CreateIndex
CREATE INDEX "RegistrationRequest_nicNumber_idx" ON "RegistrationRequest"("nicNumber");

-- CreateIndex
CREATE INDEX "RegistrationRequest_email_idx" ON "RegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "TrainingPackage_packageType_isActive_idx" ON "TrainingPackage"("packageType", "isActive");

-- CreateIndex
CREATE INDEX "TrainingPackage_name_idx" ON "TrainingPackage"("name");

-- CreateIndex
CREATE INDEX "TrainingPackageItem_vehicleType_trainingType_idx" ON "TrainingPackageItem"("vehicleType", "trainingType");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPackageItem_packageId_vehicleType_trainingType_key" ON "TrainingPackageItem"("packageId", "vehicleType", "trainingType");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleType_status_idx" ON "Vehicle"("vehicleType", "status");

-- CreateIndex
CREATE INDEX "Payment_status_paymentDate_idx" ON "Payment"("status", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_registrationRequestId_idx" ON "Payment"("registrationRequestId");

-- CreateIndex
CREATE INDEX "Payment_enrollmentId_idx" ON "Payment"("enrollmentId");

-- CreateIndex
CREATE INDEX "Payment_transactionReference_idx" ON "Payment"("transactionReference");

-- CreateIndex
CREATE INDEX "PaymentSlip_paymentId_uploadedAt_idx" ON "PaymentSlip"("paymentId", "uploadedAt");

-- CreateIndex
CREATE INDEX "PaymentReviewHistory_paymentId_reviewedAt_idx" ON "PaymentReviewHistory"("paymentId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_registrationRequestId_key" ON "Enrollment"("registrationRequestId");

-- CreateIndex
CREATE INDEX "Enrollment_studentUserId_status_idx" ON "Enrollment"("studentUserId", "status");

-- CreateIndex
CREATE INDEX "Enrollment_packageId_idx" ON "Enrollment"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentTrainingRequirement_enrollmentId_vehicleType_trai_key" ON "EnrollmentTrainingRequirement"("enrollmentId", "vehicleType", "trainingType");

-- CreateIndex
CREATE INDEX "LessonSchedule_lessonDate_startTime_endTime_idx" ON "LessonSchedule"("lessonDate", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "LessonSchedule_instructorUserId_lessonDate_idx" ON "LessonSchedule"("instructorUserId", "lessonDate");

-- CreateIndex
CREATE INDEX "LessonSchedule_vehicleId_lessonDate_idx" ON "LessonSchedule"("vehicleId", "lessonDate");

-- CreateIndex
CREATE INDEX "LessonScheduleStudent_studentUserId_attendance_idx" ON "LessonScheduleStudent"("studentUserId", "attendance");

-- CreateIndex
CREATE INDEX "LessonScheduleStudent_enrollmentId_vehicleType_trainingType_idx" ON "LessonScheduleStudent"("enrollmentId", "vehicleType", "trainingType", "attendance");

-- CreateIndex
CREATE UNIQUE INDEX "LessonScheduleStudent_lessonScheduleId_studentUserId_key" ON "LessonScheduleStudent"("lessonScheduleId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonFeedback_lessonScheduleStudentId_key" ON "LessonFeedback"("lessonScheduleStudentId");

-- CreateIndex
CREATE INDEX "LessonFeedback_instructorUserId_createdAt_idx" ON "LessonFeedback"("instructorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentMedical_studentUserId_appointmentDate_idx" ON "StudentMedical"("studentUserId", "appointmentDate");

-- CreateIndex
CREATE INDEX "StudentMedical_status_appointmentDate_idx" ON "StudentMedical"("status", "appointmentDate");

-- CreateIndex
CREATE INDEX "StudentExam_studentUserId_scheduledDate_idx" ON "StudentExam"("studentUserId", "scheduledDate");

-- CreateIndex
CREATE INDEX "StudentExam_status_scheduledDate_idx" ON "StudentExam"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "AppointmentDateHistory_studentMedicalId_changedAt_idx" ON "AppointmentDateHistory"("studentMedicalId", "changedAt");

-- CreateIndex
CREATE INDEX "AppointmentDateHistory_studentExamId_changedAt_idx" ON "AppointmentDateHistory"("studentExamId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_expiresAt_idx" ON "EmailChangeToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailChangeToken_newEmail_idx" ON "EmailChangeToken"("newEmail");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorProfile" ADD CONSTRAINT "InstructorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_selectedPackageId_fkey" FOREIGN KEY ("selectedPackageId") REFERENCES "TrainingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_approvedStudentUserId_fkey" FOREIGN KEY ("approvedStudentUserId") REFERENCES "StudentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPackageItem" ADD CONSTRAINT "TrainingPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TrainingPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "RegistrationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSlip" ADD CONSTRAINT "PaymentSlip_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReviewHistory" ADD CONSTRAINT "PaymentReviewHistory_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReviewHistory" ADD CONSTRAINT "PaymentReviewHistory_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "StudentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TrainingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "RegistrationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentTrainingRequirement" ADD CONSTRAINT "EnrollmentTrainingRequirement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "InstructorProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonScheduleStudent" ADD CONSTRAINT "LessonScheduleStudent_lessonScheduleId_fkey" FOREIGN KEY ("lessonScheduleId") REFERENCES "LessonSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonScheduleStudent" ADD CONSTRAINT "LessonScheduleStudent_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "StudentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonScheduleStudent" ADD CONSTRAINT "LessonScheduleStudent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonScheduleStudent" ADD CONSTRAINT "LessonScheduleStudent_trainingRequirementId_fkey" FOREIGN KEY ("trainingRequirementId") REFERENCES "EnrollmentTrainingRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonScheduleStudent" ADD CONSTRAINT "LessonScheduleStudent_attendanceMarkedByUserId_fkey" FOREIGN KEY ("attendanceMarkedByUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFeedback" ADD CONSTRAINT "LessonFeedback_lessonScheduleStudentId_fkey" FOREIGN KEY ("lessonScheduleStudentId") REFERENCES "LessonScheduleStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFeedback" ADD CONSTRAINT "LessonFeedback_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "InstructorProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMedical" ADD CONSTRAINT "StudentMedical_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "StudentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExam" ADD CONSTRAINT "StudentExam_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "StudentProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentDateHistory" ADD CONSTRAINT "AppointmentDateHistory_studentMedicalId_fkey" FOREIGN KEY ("studentMedicalId") REFERENCES "StudentMedical"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentDateHistory" ADD CONSTRAINT "AppointmentDateHistory_studentExamId_fkey" FOREIGN KEY ("studentExamId") REFERENCES "StudentExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentDateHistory" ADD CONSTRAINT "AppointmentDateHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
