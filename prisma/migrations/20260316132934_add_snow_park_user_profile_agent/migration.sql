-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "disciplines" TEXT[],
    "primaryDiscipline" TEXT,
    "rideStyles" TEXT[],
    "freestyleLevel" TEXT,
    "snowPreference" TEXT,
    "offPiste" BOOLEAN NOT NULL DEFAULT false,
    "level" TEXT,
    "withChildren" BOOLEAN NOT NULL DEFAULT false,
    "regions" TEXT[],
    "budgetRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "AgentConversation_userId_idx" ON "AgentConversation"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConversation" ADD CONSTRAINT "AgentConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
