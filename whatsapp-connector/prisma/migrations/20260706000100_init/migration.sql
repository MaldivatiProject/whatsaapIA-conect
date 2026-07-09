CREATE TABLE "whatsapp_session" (
  "pkid_session" BIGINT GENERATED ALWAYS AS IDENTITY,
  "uuid_session" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" VARCHAR(64) NOT NULL,
  "owner_id" VARCHAR(128) NOT NULL,
  "status_json" TEXT NOT NULL,
  "config_json" TEXT NOT NULL,
  "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "expiration_date" TIMESTAMP(3),
  CONSTRAINT "pk_whatsapp_session" PRIMARY KEY ("pkid_session"),
  CONSTRAINT "uk_whatsapp_session_uuid" UNIQUE ("uuid_session"),
  CONSTRAINT "uk_whatsapp_session_owner_session" UNIQUE ("owner_id", "session_id")
);

CREATE INDEX "idx_whatsapp_session_uuid" ON "whatsapp_session" ("uuid_session");
CREATE INDEX "idx_whatsapp_session_owner" ON "whatsapp_session" ("owner_id");
CREATE INDEX "idx_whatsapp_session_active" ON "whatsapp_session" ("owner_id", "session_id") WHERE "expiration_date" IS NULL;
COMMENT ON TABLE "whatsapp_session" IS 'WhatsApp session metadata scoped to an owner; credentials are stored separately.';
