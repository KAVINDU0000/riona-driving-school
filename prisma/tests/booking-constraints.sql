BEGIN;
-- ---- fixtures ----
INSERT INTO "User" ("userId","email","passwordHash","role","status","updatedAt") VALUES
 ('INS-1','i1@t.lk','x','INSTRUCTOR','ACTIVE',now()),
 ('INS-2','i2@t.lk','x','INSTRUCTOR','ACTIVE',now()),
 ('INS-3','i3@t.lk','x','INSTRUCTOR','ACTIVE',now()),
 ('STU-1','s1@t.lk','x','STUDENT','ACTIVE',now()),
 ('STU-2','s2@t.lk','x','STUDENT','ACTIVE',now()),
 ('STU-3','s3@t.lk','x','STUDENT','ACTIVE',now()),
 ('STU-4','s4@t.lk','x','STUDENT','ACTIVE',now()),
 ('STU-5','s5@t.lk','x','STUDENT','ACTIVE',now());
INSERT INTO "InstructorProfile" ("userId","fullName","phoneNumber","hireDate","status","updatedAt") VALUES
 ('INS-1','I One','0711111111','2025-01-01','ACTIVE',now()),
 ('INS-2','I Two','0722222222','2025-01-01','ACTIVE',now()),
 ('INS-3','I Three','0733333333','2025-01-01','ACTIVE',now());
INSERT INTO "StudentProfile" ("userId","fullName","address","birthday","nicNumber","phoneNumber","updatedAt") VALUES
 ('STU-1','Student 1','Colombo','2000-01-01','200000000001','0770000001',now()),
 ('STU-2','Student 2','Colombo','2000-01-01','200000000002','0770000002',now()),
 ('STU-3','Student 3','Colombo','2000-01-01','200000000003','0770000003',now()),
 ('STU-4','Student 4','Colombo','2000-01-01','200000000004','0770000004',now()),
 ('STU-5','Student 5','Colombo','2000-01-01','200000000005','0770000005',now());
INSERT INTO "Vehicle" ("id","vehicleType","registrationNumber","status","updatedAt") VALUES
 ('V1','CAR','CAB-1','ACTIVE',now()), ('V2','CAR','CAB-2','ACTIVE',now()),
 ('V3','CAR','CAB-3','MAINTENANCE',now()), ('V4','VAN','VAN-1','ACTIVE',now());
INSERT INTO "TrainingPackage" ("id","name","packageType","price","updatedAt") VALUES ('PKG1','Car and Van Training','REGULAR',26000,now());
INSERT INTO "Enrollment" ("id","studentUserId","packageId","agreedPrice","finalFee","status","updatedAt") VALUES
 ('E1','STU-1','PKG1',26000,26000,'ACTIVE',now()),
 ('E2','STU-1','PKG1',26000,26000,'ACTIVE',now()),
 ('E3','STU-2','PKG1',26000,26000,'ACTIVE',now()),
 ('E4','STU-3','PKG1',26000,26000,'ACTIVE',now()),
 ('E5','STU-4','PKG1',26000,26000,'ACTIVE',now()),
 ('E6','STU-5','PKG1',26000,26000,'COMPLETED',now());
INSERT INTO "EnrollmentTrainingRequirement" ("id","enrollmentId","vehicleType","trainingType","requiredSessions","updatedAt") VALUES
 ('R1','E1','CAR','REGULAR',10,now()), ('R2','E2','CAR','REGULAR',10,now()),
 ('R3','E3','CAR','REGULAR',10,now()), ('R4','E4','CAR','REGULAR',10,now()),
 ('R5','E5','CAR','REGULAR',10,now()), ('R6','E6','CAR','REGULAR',10,now());
INSERT INTO "InstructorAvailability" ("id","instructorUserId","availabilityDate","startTime","endTime","updatedAt") VALUES
 ('A1','INS-1','2026-10-20','09:00','12:00',now()),
 ('A2','INS-2','2026-10-20','09:00','12:00',now());

\echo '== A. Consecutive and multi-duration bookings (expect OK) =='
SAVEPOINT a1; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('L1','2026-10-20','09:00','09:30',30,'INS-1','V1','CAR','STU-1','E1','REGULAR','SCHEDULED',now()); RELEASE a1;
SAVEPOINT a2; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('L2','2026-10-20','09:30','10:00',30,'INS-1','V1','CAR','STU-2','E3','REGULAR','SCHEDULED',now()); RELEASE a2;
SAVEPOINT a3; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('L3','2026-10-20','10:00','11:00',60,'INS-1','V1','CAR','STU-1','E2','REGULAR','SCHEDULED',now()); RELEASE a3;
SAVEPOINT a4; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('L4','2026-10-20','11:00','11:45',45,'INS-1','V1','CAR','STU-4','E5','REGULAR','SCHEDULED',now()); RELEASE a4;

\echo '== B. Conflicts (expect FAIL) =='
\echo 'B1 instructor overlap'
SAVEPOINT b1; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('X1','2026-10-20','09:15','09:45',30,'INS-1','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO b1;
\echo 'B2 vehicle overlap (other instructor)'
SAVEPOINT b2; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('X2','2026-10-20','09:15','09:45',30,'INS-2','V1','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO b2;
\echo 'B3 student overlap (other instructor, other vehicle)'
SAVEPOINT b3; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('X3','2026-10-20','09:10','09:40',30,'INS-2','V2','CAR','STU-1','E1','REGULAR','SCHEDULED',now()); ROLLBACK TO b3;
\echo 'B4 student overlap with a 1-hour lesson (10:30-11:30 vs L3 10:00-11:00)'
SAVEPOINT b4; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('X4','2026-10-20','10:30','11:30',60,'INS-2','V2','CAR','STU-1','E1','REGULAR','SCHEDULED',now()); ROLLBACK TO b4;
\echo 'B5 completed lesson still blocks its slot'
SAVEPOINT b5a; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('C1','2026-10-20','10:00','10:30',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','COMPLETED',now()); RELEASE b5a;
SAVEPOINT b5b; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('X5','2026-10-20','10:15','10:45',30,'INS-2','V2','CAR','STU-4','E5','REGULAR','SCHEDULED',now()); ROLLBACK TO b5b;

\echo '== C. Cancelled lessons do not block (expect OK) =='
SAVEPOINT c1; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('G1','2026-10-20','09:00','09:30',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','CANCELLED',now()); RELEASE c1;
SAVEPOINT c2; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('G2','2026-10-20','09:00','09:30',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); RELEASE c2;

\echo '== D. Validation (expect FAIL unless noted) =='
\echo 'D1 end before start'
SAVEPOINT d1; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y1','2026-10-20','10:00','09:30',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d1;
\echo 'D2 duration 60 stored for a 30-minute interval'
SAVEPOINT d2; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y2','2026-10-20','09:00','09:30',60,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d2;
\echo 'D3 zero duration'
SAVEPOINT d3; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y3','2026-10-20','09:00','09:00',0,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d3;
\echo 'D4 starts before availability window'
SAVEPOINT d4; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y4','2026-10-20','08:30','09:00',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d4;
\echo 'D5 ends after availability window'
SAVEPOINT d5; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y5','2026-10-20','11:45','12:15',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d5;
\echo 'D6 no availability on that date'
SAVEPOINT d6; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y6','2026-10-21','09:00','09:30',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO d6;
\echo 'D7 ends exactly at window end (expect OK)'
SAVEPOINT d7; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Y7','2026-10-20','11:30','12:00',30,'INS-2','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); RELEASE d7;

\echo '== E. Resource and enrollment checks (expect FAIL) =='
\echo 'E1 inactive instructor (INS-3 has no availability row here, and status is set inactive below)'
UPDATE "InstructorProfile" SET status='INACTIVE' WHERE "userId"='INS-3';
INSERT INTO "InstructorAvailability" ("id","instructorUserId","availabilityDate","startTime","endTime","updatedAt") VALUES ('A3','INS-3','2026-10-20','09:00','12:00',now());
SAVEPOINT e1; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z1','2026-10-20','09:00','09:30',30,'INS-3','V2','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO e1;
\echo 'E2 vehicle under maintenance'
SAVEPOINT e2; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z2','2026-10-20','09:00','09:30',30,'INS-2','V3','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO e2;
\echo 'E3 enrollment not active (E6 is COMPLETED)'
SAVEPOINT e3; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z3','2026-10-20','09:00','09:30',30,'INS-2','V2','CAR','STU-5','E6','REGULAR','SCHEDULED',now()); ROLLBACK TO e3;
\echo 'E4 student does not match enrollment (STU-2 on E1)'
SAVEPOINT e4; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z4','2026-10-20','11:00','11:30',30,'INS-2','V2','CAR','STU-2','E1','REGULAR','SCHEDULED',now()); ROLLBACK TO e4;
\echo 'E5 vehicle type does not match vehicle (V4 is a VAN)'
SAVEPOINT e5; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z5','2026-10-20','11:00','11:30',30,'INS-2','V4','CAR','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO e5;
\echo 'E6 VAN lesson not covered by the enrollment requirement (E4 only requires CAR)'
SAVEPOINT e6; INSERT INTO "LessonSchedule" (id,"lessonDate","startTime","endTime","durationMinutes","instructorUserId","vehicleId","vehicleType","studentUserId","enrollmentId","trainingType","status","updatedAt") VALUES ('Z6','2026-10-20','11:00','11:30',30,'INS-2','V4','VAN','STU-3','E4','REGULAR','SCHEDULED',now()); ROLLBACK TO e6;

\echo '== F. Rescheduling a cancelled lesson =='
\echo 'F1 reactivate G1 into a free slot 11:00-11:30 (expect OK)'
SAVEPOINT f1; UPDATE "LessonSchedule" SET status='SCHEDULED', "startTime"='11:00', "endTime"='11:30', "durationMinutes"=30 WHERE id='G1'; RELEASE f1;
\echo 'F2 reactivate G1 into a slot that conflicts with L1 (expect FAIL)'
SAVEPOINT f2; UPDATE "LessonSchedule" SET status='SCHEDULED', "startTime"='09:15', "endTime"='09:45', "vehicleId"='V1' WHERE id='G1'; ROLLBACK TO f2;

\echo '== G. Attendance and feedback follow the individual lesson =='
\echo 'G1 attendance update after instructor deactivated (expect OK: trigger skips non-booking updates)'
SAVEPOINT g1; UPDATE "InstructorProfile" SET status='INACTIVE' WHERE "userId"='INS-1'; UPDATE "LessonSchedule" SET attendance='PRESENT', "attendanceMarkedAt"=now(), "attendanceMarkedByUserId"='INS-1' WHERE id='L1'; RELEASE g1;
\echo 'G2 feedback on the lesson (expect OK)'
SAVEPOINT g2; INSERT INTO "LessonFeedback" (id,"lessonScheduleId","instructorUserId",feedback,rating,"updatedAt") VALUES ('F1','L1','INS-1','Good clutch control',4,now()); RELEASE g2;
\echo 'G3 second feedback on the same lesson (expect FAIL)'
SAVEPOINT g3; INSERT INTO "LessonFeedback" (id,"lessonScheduleId","instructorUserId",feedback,"updatedAt") VALUES ('F2','L1','INS-1','Duplicate',now()); ROLLBACK TO g3;

\echo '== H. Appointment history =='
INSERT INTO "StudentMedical" (id,"studentUserId","appointmentDate","updatedAt") VALUES ('M1','STU-1','2026-11-01',now());
\echo 'H1 EXAM type with a medical id (expect FAIL)'
SAVEPOINT h1; INSERT INTO "AppointmentDateHistory" (id,"appointmentType","studentMedicalId","previousDate","newDate","changedByUserId") VALUES ('H1','EXAM','M1','2026-11-01','2026-11-03','INS-1'); ROLLBACK TO h1;
\echo 'H2 MEDICAL type with the medical id (expect OK)'
SAVEPOINT h2; INSERT INTO "AppointmentDateHistory" (id,"appointmentType","studentMedicalId","previousDate","newDate","changedByUserId") VALUES ('H2','MEDICAL','M1','2026-11-01','2026-11-03','INS-1'); RELEASE h2;
\echo 'H3 no reference id (expect FAIL)'
SAVEPOINT h3; INSERT INTO "AppointmentDateHistory" (id,"appointmentType","previousDate","newDate","changedByUserId") VALUES ('H3','MEDICAL','2026-11-01','2026-11-03','INS-1'); ROLLBACK TO h3;

\echo '== Final lesson rows inside the rolled-back transaction =='
SELECT id, "startTime", "endTime", "durationMinutes", "instructorUserId", "vehicleId", "studentUserId", status FROM "LessonSchedule" ORDER BY id;
ROLLBACK;
