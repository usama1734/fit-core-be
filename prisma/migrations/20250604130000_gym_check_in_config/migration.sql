-- CreateTable
CREATE TABLE "GymCheckInConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymCheckInConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymCheckInConfig_token_key" ON "GymCheckInConfig"("token");
