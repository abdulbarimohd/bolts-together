-- CreateEnum
CREATE TYPE "FeedProductScope" AS ENUM ('COMPONENT', 'COMPLETE_BIKE', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferAvailability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'BACK_ORDER', 'DISCONTINUED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferMatchMethod" AS ENUM ('NONE', 'EAN', 'GTIN', 'MPN', 'MERCHANT_SKU', 'MANUAL');

-- CreateEnum
CREATE TYPE "FeedSyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED_NO_CREDENTIALS');

-- CreateEnum
CREATE TYPE "ProductIdentifierKind" AS ENUM ('EAN', 'GTIN', 'UPC', 'MPN', 'MERCHANT_SKU');

-- AlterEnum
ALTER TYPE "VendorName" ADD VALUE 'RIBBLE_CYCLES';

-- CreateTable
CREATE TABLE "AffiliateNetwork" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "publisherIdEnvVar" TEXT,
    "apiKeyEnvVar" TEXT,
    "homepageUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "vendorId" TEXT,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "linkDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commissionNotes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerFeed" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "externalFeedId" TEXT NOT NULL,
    "label" TEXT,
    "scope" "FeedProductScope" NOT NULL DEFAULT 'UNKNOWN',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastRowCount" INTEGER,

    CONSTRAINT "RetailerFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerOffer" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "feedId" TEXT,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brandName" TEXT,
    "ean" TEXT,
    "mpn" TEXT,
    "gtin" TEXT,
    "categoryPath" TEXT,
    "imageUrl" TEXT,
    "productUrl" TEXT NOT NULL,
    "deepLinkUrl" TEXT,
    "pricePence" INTEGER NOT NULL,
    "wasPricePence" INTEGER,
    "deliveryPence" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "includesVat" BOOLEAN NOT NULL DEFAULT true,
    "availability" "OfferAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "stockQuantity" INTEGER,
    "partId" TEXT,
    "bikeModelId" TEXT,
    "matchMethod" "OfferMatchMethod" NOT NULL DEFAULT 'NONE',
    "matchedAt" TIMESTAMP(3),
    "matchNotes" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceChangedAt" TIMESTAMP(3),

    CONSTRAINT "RetailerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedSyncRun" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "feedId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "FeedSyncStatus" NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "offersUpserted" INTEGER NOT NULL DEFAULT 0,
    "offersMatched" INTEGER NOT NULL DEFAULT 0,
    "offersUnmatched" INTEGER NOT NULL DEFAULT 0,
    "pricesRecorded" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,

    CONSTRAINT "FeedSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIdentifier" (
    "id" TEXT NOT NULL,
    "partId" TEXT,
    "bikeModelId" TEXT,
    "kind" "ProductIdentifierKind" NOT NULL,
    "value" TEXT NOT NULL,
    "retailerId" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT 'UNVERIFIED',
    "sourceUrl" TEXT,
    "dataNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateNetwork_key_key" ON "AffiliateNetwork"("key");

-- CreateIndex
CREATE INDEX "AffiliateNetwork_enabled_idx" ON "AffiliateNetwork"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_slug_key" ON "Retailer"("slug");

-- CreateIndex
CREATE INDEX "Retailer_enabled_idx" ON "Retailer"("enabled");

-- CreateIndex
CREATE INDEX "Retailer_vendorId_idx" ON "Retailer"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_networkId_advertiserId_key" ON "Retailer"("networkId", "advertiserId");

-- CreateIndex
CREATE INDEX "RetailerFeed_enabled_idx" ON "RetailerFeed"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerFeed_retailerId_externalFeedId_key" ON "RetailerFeed"("retailerId", "externalFeedId");

-- CreateIndex
CREATE INDEX "RetailerOffer_partId_availability_idx" ON "RetailerOffer"("partId", "availability");

-- CreateIndex
CREATE INDEX "RetailerOffer_bikeModelId_idx" ON "RetailerOffer"("bikeModelId");

-- CreateIndex
CREATE INDEX "RetailerOffer_retailerId_lastSeenAt_idx" ON "RetailerOffer"("retailerId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "RetailerOffer_ean_idx" ON "RetailerOffer"("ean");

-- CreateIndex
CREATE INDEX "RetailerOffer_mpn_idx" ON "RetailerOffer"("mpn");

-- CreateIndex
CREATE INDEX "RetailerOffer_matchMethod_idx" ON "RetailerOffer"("matchMethod");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerOffer_retailerId_externalId_key" ON "RetailerOffer"("retailerId", "externalId");

-- CreateIndex
CREATE INDEX "FeedSyncRun_retailerId_startedAt_idx" ON "FeedSyncRun"("retailerId", "startedAt");

-- CreateIndex
CREATE INDEX "FeedSyncRun_status_idx" ON "FeedSyncRun"("status");

-- CreateIndex
CREATE INDEX "ProductIdentifier_kind_value_idx" ON "ProductIdentifier"("kind", "value");

-- CreateIndex
CREATE INDEX "ProductIdentifier_partId_idx" ON "ProductIdentifier"("partId");

-- CreateIndex
CREATE INDEX "ProductIdentifier_bikeModelId_idx" ON "ProductIdentifier"("bikeModelId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIdentifier_kind_value_partId_bikeModelId_retailerId_key" ON "ProductIdentifier"("kind", "value", "partId", "bikeModelId", "retailerId");

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerFeed" ADD CONSTRAINT "RetailerFeed_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerOffer" ADD CONSTRAINT "RetailerOffer_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerOffer" ADD CONSTRAINT "RetailerOffer_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "RetailerFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerOffer" ADD CONSTRAINT "RetailerOffer_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerOffer" ADD CONSTRAINT "RetailerOffer_bikeModelId_fkey" FOREIGN KEY ("bikeModelId") REFERENCES "BikeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedSyncRun" ADD CONSTRAINT "FeedSyncRun_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedSyncRun" ADD CONSTRAINT "FeedSyncRun_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "RetailerFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIdentifier" ADD CONSTRAINT "ProductIdentifier_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIdentifier" ADD CONSTRAINT "ProductIdentifier_bikeModelId_fkey" FOREIGN KEY ("bikeModelId") REFERENCES "BikeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIdentifier" ADD CONSTRAINT "ProductIdentifier_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
