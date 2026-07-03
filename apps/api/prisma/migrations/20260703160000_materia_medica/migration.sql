-- CreateTable
CREATE TABLE "MateriaMedicaSource" (
    "id" TEXT NOT NULL,
    "oorepMmInfoId" INTEGER,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT,
    "year" INTEGER,
    "license" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateriaMedicaSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MateriaMedicaSection" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "remedyId" TEXT NOT NULL,
    "oorepSectionId" INTEGER,
    "depth" INTEGER NOT NULL DEFAULT 1,
    "heading" TEXT,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateriaMedicaSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MateriaMedicaSource_oorepMmInfoId_key" ON "MateriaMedicaSource"("oorepMmInfoId");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaMedicaSource_code_key" ON "MateriaMedicaSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaMedicaSection_oorepSectionId_key" ON "MateriaMedicaSection"("oorepSectionId");

-- CreateIndex
CREATE INDEX "MateriaMedicaSection_remedyId_sourceId_sortOrder_idx" ON "MateriaMedicaSection"("remedyId", "sourceId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MateriaMedicaSection" ADD CONSTRAINT "MateriaMedicaSection_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "MateriaMedicaSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaMedicaSection" ADD CONSTRAINT "MateriaMedicaSection_remedyId_fkey" FOREIGN KEY ("remedyId") REFERENCES "HomeopathicRemedy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
