-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "potential" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_contact_at" TIMESTAMPTZ,
    "converted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_follow_ups" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_posts" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "script" TEXT,
    "cta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "views" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_clinic_id_status_idx" ON "leads"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "lead_follow_ups_lead_id_idx" ON "lead_follow_ups"("lead_id");

-- CreateIndex
CREATE INDEX "content_posts_clinic_id_status_scheduled_at_idx" ON "content_posts"("clinic_id", "status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
