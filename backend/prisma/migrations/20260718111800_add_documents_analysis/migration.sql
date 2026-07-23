-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "filename" TEXT,
    "contract_text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "score_global" DOUBLE PRECISION NOT NULL,
    "resume" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "clauses_manquantes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "clause" TEXT NOT NULL,
    "severite" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference_legale" TEXT,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analyses_document_id_key" ON "analyses"("document_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
