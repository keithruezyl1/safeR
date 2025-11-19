-- Adjust EscrowState enum to new lifecycle
BEGIN;
CREATE TYPE "EscrowState_new" AS ENUM ('CREATED', 'FUNDED', 'P1_CONFIRMED', 'P2_CONFIRMED', 'RELEASED');
ALTER TABLE "public"."Escrow" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "Escrow" ALTER COLUMN "state" TYPE "EscrowState_new" USING ("state"::text::"EscrowState_new");
ALTER TYPE "EscrowState" RENAME TO "EscrowState_old";
ALTER TYPE "EscrowState_new" RENAME TO "EscrowState";
DROP TYPE "public"."EscrowState_old";
ALTER TABLE "Escrow" ALTER COLUMN "state" SET DEFAULT 'CREATED';
COMMIT;

-- Reshape Escrow table for single-escrow foundation
ALTER TABLE "Escrow"
    DROP COLUMN "description",
    DROP COLUMN "expiresAt",
    DROP COLUMN "timerHours",
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "id" SET DEFAULT 'ESCROW_SINGLE',
    ALTER COLUMN "amount" SET DEFAULT 0;

-- Replace actorId with actor label on events
ALTER TABLE "EscrowEvent"
    DROP COLUMN "actorId",
    ADD COLUMN "actor" TEXT;

-- Remove deprecated Config table
DROP TABLE IF EXISTS "Config";


