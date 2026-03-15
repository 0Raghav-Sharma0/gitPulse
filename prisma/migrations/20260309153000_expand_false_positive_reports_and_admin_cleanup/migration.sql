CREATE TYPE "ReportFalsePositiveReason" AS ENUM (
    'NOT_A_VULNERABILITY',
    'TEST_OR_FIXTURE',
    'FALSE_DATAFLOW',
    'INTENDED_BEHAVIOR',
    'OTHER'
);

ALTER TABLE "ReportFalsePositive"
ADD COLUMN "reason" "ReportFalsePositiveReason" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "details" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ReportFalsePositive"
ALTER COLUMN "details" DROP DEFAULT,
ALTER COLUMN "reason" DROP DEFAULT;
