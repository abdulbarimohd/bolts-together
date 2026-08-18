-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('FRAME', 'FORK', 'BOTTOM_BRACKET', 'CRANKSET', 'CHAINRING', 'WHEELSET', 'TYRE', 'TUBE', 'BRAKE_CALIPER', 'BRAKE_LEVER', 'ROTOR', 'SHIFTER', 'REAR_DERAILLEUR', 'FRONT_DERAILLEUR', 'CASSETTE', 'CHAIN', 'HEADSET', 'REAR_SHOCK', 'HANDLEBAR', 'STEM', 'SEATPOST', 'SEAT_CLAMP', 'SADDLE', 'PEDAL', 'SHOE', 'CHAIN_GUIDE', 'DERAILLEUR_HANGER');

-- CreateEnum
CREATE TYPE "BbShellStandard" AS ENUM ('BSA_68', 'BSA_73', 'BSA_83', 'BSA_100', 'ITALIAN_70', 'PF92', 'PF107', 'BB86', 'BB90', 'T47_68', 'T47_73', 'T47_85_5', 'BB30', 'PF30');

-- CreateEnum
CREATE TYPE "SpindleInterface" AS ENUM ('DUB_29', 'GXP', 'HOLLOWTECH_II_24', 'CINCH_30', 'BB30_30', 'OCT_LINK_24', 'SQUARE_TAPER', 'ISIS');

-- CreateEnum
CREATE TYPE "BrakeMountType" AS ENUM ('FLAT_MOUNT', 'POST_MOUNT_160', 'POST_MOUNT_180', 'POST_MOUNT', 'IS_MOUNT', 'RIM_BRAKE');

-- CreateEnum
CREATE TYPE "AxleType" AS ENUM ('THRU_AXLE_142x12', 'THRU_AXLE_148x12_BOOST', 'THRU_AXLE_157x12_SUPERBOOST', 'THRU_AXLE_110x15_BOOST', 'THRU_AXLE_100x15', 'THRU_AXLE_100x12', 'QUICK_RELEASE_130x9', 'QUICK_RELEASE_135x9', 'QUICK_RELEASE_100x9', 'THRU_AXLE_20x110_DH', 'THRU_AXLE_150x12_DH');

-- CreateEnum
CREATE TYPE "AxleThreadPitch" AS ENUM ('M12_x_1_0', 'M12_x_1_5', 'M12_x_1_75', 'M15_x_1_5', 'NONE_QR');

-- CreateEnum
CREATE TYPE "DropoutType" AS ENUM ('THRU_AXLE', 'QUICK_RELEASE', 'UDH');

-- CreateEnum
CREATE TYPE "HeadsetTaper" AS ENUM ('TAPERED_1_5_TO_1_125', 'STRAIGHT_1_125', 'STRAIGHT_1_5');

-- CreateEnum
CREATE TYPE "HeadsetCupStandard" AS ENUM ('EC34', 'EC44', 'EC49', 'ZS44', 'ZS49', 'ZS56', 'IS41', 'IS42', 'IS52');

-- CreateEnum
CREATE TYPE "WheelDiameter" AS ENUM ('ISO_622', 'ISO_584', 'ISO_559', 'ISO_507');

-- CreateEnum
CREATE TYPE "FreehubBodyType" AS ENUM ('XD', 'XDR', 'MICRO_SPLINE', 'HG_11', 'HG_10', 'HG_12', 'CAMPAGNOLO_N3W');

-- CreateEnum
CREATE TYPE "CablePullStandard" AS ENUM ('SHIMANO_ROAD', 'SHIMANO_MTB', 'SRAM_EXACT_ACTUATION', 'SRAM_X_ACTUATION', 'SRAM_FULL_PULL', 'CAMPAGNOLO', 'MICROSHIFT_ADVENT_X', 'MICROSHIFT_SWORD', 'ELECTRONIC_AXS', 'ELECTRONIC_DI2', 'ELECTRONIC_EPS');

-- CreateEnum
CREATE TYPE "FrameMaterial" AS ENUM ('CARBON', 'ALUMINIUM', 'STEEL', 'TITANIUM');

-- CreateEnum
CREATE TYPE "VendorName" AS ENUM ('CANYON_UK', 'TREDZ', 'EVANS_CYCLES', 'SIGMA_SPORTS', 'MERLIN_CYCLES');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GBP');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUFACTURER_SPEC', 'RETAILER_LISTING', 'DATA_FEED', 'COMMUNITY', 'ESTIMATED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "HangerStandard" AS ENUM ('UDH', 'PROPRIETARY', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "DerailleurMountStandard" AS ENUM ('STANDARD_HANGER', 'UDH_DIRECT_MOUNT', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "CageLength" AS ENUM ('SHORT_SS', 'MEDIUM_GS', 'LONG_SGS');

-- CreateEnum
CREATE TYPE "ChainStandard" AS ENUM ('SHIMANO_HG_10', 'SHIMANO_HG_11', 'SHIMANO_HG_12_MTB', 'SHIMANO_HG_12_ROAD', 'SRAM_EAGLE_12', 'SRAM_FLATTOP_12', 'SRAM_11', 'CAMPAGNOLO_12');

-- CreateEnum
CREATE TYPE "RotorMountStandard" AS ENUM ('SIX_BOLT', 'CENTERLOCK');

-- CreateEnum
CREATE TYPE "LockringType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "BrakeFluidType" AS ENUM ('DOT', 'MINERAL_OIL', 'NONE_MECHANICAL');

-- CreateEnum
CREATE TYPE "ValveType" AS ENUM ('PRESTA', 'SCHRADER');

-- CreateEnum
CREATE TYPE "ShockMountType" AS ENUM ('STANDARD_EYELET', 'TRUNNION');

-- CreateEnum
CREATE TYPE "ShockSizing" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "RoutingType" AS ENUM ('INTERNAL', 'EXTERNAL', 'MIXED', 'NONE');

-- CreateEnum
CREATE TYPE "DropperRemoteType" AS ENUM ('CABLE', 'ELECTRONIC', 'HYDRAULIC', 'NONE');

-- CreateEnum
CREATE TYPE "SaddleRailType" AS ENUM ('ROUND_7MM', 'OVAL_7X9MM', 'ROUND_8MM');

-- CreateEnum
CREATE TYPE "BarType" AS ENUM ('FLAT', 'RISER', 'DROP', 'AERO');

-- CreateEnum
CREATE TYPE "PedalThread" AS ENUM ('NINE_SIXTEENTHS', 'HALF_INCH');

-- CreateEnum
CREATE TYPE "CleatSystem" AS ENUM ('SPD', 'SPD_SL', 'LOOK_KEO', 'CRANK_BROTHERS', 'TIME', 'SPEEDPLAY', 'FLAT_NONE');

-- CreateEnum
CREATE TYPE "SoleDrilling" AS ENUM ('TWO_BOLT', 'THREE_BOLT', 'TWO_AND_THREE_BOLT', 'FLAT_NONE');

-- CreateEnum
CREATE TYPE "FdMountType" AS ENUM ('BRAZE_ON', 'CLAMP_28_6', 'CLAMP_31_8', 'CLAMP_34_9', 'DIRECT_MOUNT');

-- CreateEnum
CREATE TYPE "PullDirection" AS ENUM ('TOP_PULL', 'BOTTOM_PULL', 'DUAL_PULL', 'SIDE_SWING');

-- CreateEnum
CREATE TYPE "IscgStandard" AS ENUM ('ISCG_05', 'ISCG_OLD', 'BB_MOUNT', 'NONE');

-- CreateEnum
CREATE TYPE "ChainringMountStandard" AS ENUM ('BCD_104', 'BCD_96', 'BCD_94', 'BCD_110', 'BCD_76', 'SRAM_3_BOLT', 'RACE_FACE_CINCH', 'SHIMANO_DIRECT_MOUNT', 'SRAM_8_BOLT_ROAD_DM', 'SRAM_8_BOLT_EAGLE_DM');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('COMPRESSIONLESS', 'STANDARD');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('ROAD', 'GRAVEL', 'MTB');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Build',
    "userId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riderHeightCm" INTEGER,
    "riderInseamCm" INTEGER,
    "riderWeightKg" INTEGER,
    "basedOnModelId" TEXT,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeModel" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "variant" TEXT,
    "slug" TEXT NOT NULL,
    "msrpPence" INTEGER,
    "discipline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeModelPart" (
    "id" TEXT NOT NULL,
    "bikeModelId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "slot" TEXT,

    CONSTRAINT "BikeModelPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildPart" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "type" "PartType" NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "basePricePence" INTEGER,
    "weightGrams" INTEGER NOT NULL DEFAULT 0,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disciplines" "Discipline"[] DEFAULT ARRAY[]::"Discipline"[],
    "dataSource" "DataSource" NOT NULL DEFAULT 'UNVERIFIED',
    "sourceUrl" TEXT,
    "dataNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frame" (
    "partId" TEXT NOT NULL,
    "material" "FrameMaterial" NOT NULL,
    "bbShellStandard" "BbShellStandard" NOT NULL,
    "bbShellWidthMm" DECIMAL(4,1),
    "rearAxleType" "AxleType" NOT NULL,
    "rearAxleThreadPitch" "AxleThreadPitch",
    "rearAxleLengthMm" INTEGER,
    "dropoutType" "DropoutType",
    "headsetTaper" "HeadsetTaper",
    "headTubeUpperStandard" "HeadsetCupStandard",
    "headTubeLowerStandard" "HeadsetCupStandard",
    "headTubeLengthMm" INTEGER,
    "rearBrakeMountType" "BrakeMountType" NOT NULL,
    "maxRotorMmRear" INTEGER,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "mulletApproved" BOOLEAN NOT NULL DEFAULT false,
    "maxTyreWidthMm" INTEGER NOT NULL,
    "maxTyreWidthMm650b" INTEGER,
    "maxChainringTeeth" INTEGER,
    "maxForkTravelMm" INTEGER,
    "designAxleToCrownMm" INTEGER,
    "chainstayLengthMm" INTEGER,
    "hangerStandard" "HangerStandard",
    "seatpostDiameterMm" DOUBLE PRECISION,
    "seatClampDiameterMm" DOUBLE PRECISION,
    "maxSeatpostInsertionMm" INTEGER,
    "seatpostRouting" "RoutingType",
    "cableRouting" "RoutingType",
    "iscgStandard" "IscgStandard",
    "bottleMounts" INTEGER,
    "hasEyelets" BOOLEAN NOT NULL DEFAULT false,
    "fdMountType" "FdMountType",
    "fdPullDirection" "PullDirection",
    "shockEyeToEyeMm" INTEGER,
    "shockStrokeMm" INTEGER,
    "shockMountType" "ShockMountType",
    "shockHardwareWidthMm" INTEGER,
    "shockBushingDiameterMm" DOUBLE PRECISION,
    "leverageRatio" DOUBLE PRECISION,
    "suitableForCoil" BOOLEAN,
    "frameSize" TEXT,
    "standoverMm" INTEGER,
    "reachMm" INTEGER,
    "stackMm" INTEGER,
    "riderMinHeightCm" INTEGER,
    "riderMaxHeightCm" INTEGER,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Fork" (
    "partId" TEXT NOT NULL,
    "steererTubeTaper" "HeadsetTaper" NOT NULL,
    "steererLengthMm" INTEGER,
    "crownRaceDiameterMm" DOUBLE PRECISION,
    "frontAxleType" "AxleType" NOT NULL,
    "frontAxleThreadPitch" "AxleThreadPitch",
    "frontAxleLengthMm" INTEGER,
    "dropoutType" "DropoutType",
    "brakeMountType" "BrakeMountType" NOT NULL,
    "maxRotorMm" INTEGER,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "maxTyreWidthMm" INTEGER NOT NULL,
    "maxTyreWidthMm650b" INTEGER,
    "travelMm" INTEGER,
    "axleToCrownMm" INTEGER,
    "offsetMm" INTEGER,
    "isSuspension" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Fork_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BottomBracket" (
    "partId" TEXT NOT NULL,
    "frameInterface" "BbShellStandard" NOT NULL,
    "shellWidthMm" DECIMAL(4,1),
    "spindleInterface" "SpindleInterface" NOT NULL,

    CONSTRAINT "BottomBracket_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Crankset" (
    "partId" TEXT NOT NULL,
    "spindleDiameter" "SpindleInterface" NOT NULL,
    "chainlineType" TEXT NOT NULL,
    "chainlineMm" DOUBLE PRECISION,
    "spindleLengthMm" INTEGER,
    "qFactorMm" INTEGER,
    "crankLengthMm" INTEGER,
    "pedalThread" "PedalThread",
    "chainringMount" "ChainringMountStandard",
    "chainringCount" INTEGER,
    "maxChainringTeeth" INTEGER,

    CONSTRAINT "Crankset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Chainring" (
    "partId" TEXT NOT NULL,
    "mountStandard" "ChainringMountStandard" NOT NULL,
    "boltCount" INTEGER,
    "teeth" INTEGER NOT NULL,
    "narrowWide" BOOLEAN NOT NULL DEFAULT false,
    "offsetMm" DOUBLE PRECISION,
    "speeds" INTEGER,

    CONSTRAINT "Chainring_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Wheelset" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "frontAxleType" "AxleType" NOT NULL,
    "rearAxleType" "AxleType" NOT NULL,
    "freehubBodyType" "FreehubBodyType" NOT NULL,
    "rotorMountStandard" "RotorMountStandard" NOT NULL,
    "tubelessReady" BOOLEAN NOT NULL DEFAULT false,
    "hookless" BOOLEAN NOT NULL DEFAULT false,
    "maxPressurePsi" INTEGER,
    "internalRimWidthMm" INTEGER NOT NULL,
    "rimDepthMm" INTEGER,
    "valveHoleType" "ValveType",
    "hasBrakeTrack" BOOLEAN NOT NULL DEFAULT false,
    "convertibleEndCaps" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Wheelset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Tyre" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "tubeless" BOOLEAN NOT NULL DEFAULT false,
    "hooklessSafe" BOOLEAN NOT NULL DEFAULT false,
    "maxPressurePsi" INTEGER,

    CONSTRAINT "Tyre_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Tube" (
    "partId" TEXT NOT NULL,
    "wheelDiameter" "WheelDiameter" NOT NULL,
    "minWidthMm" INTEGER NOT NULL,
    "maxWidthMm" INTEGER NOT NULL,
    "valveType" "ValveType" NOT NULL,
    "valveLengthMm" INTEGER NOT NULL,

    CONSTRAINT "Tube_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BrakeCaliper" (
    "partId" TEXT NOT NULL,
    "mountType" "BrakeMountType" NOT NULL,
    "nativeRotorMm" INTEGER,
    "isHydraulic" BOOLEAN NOT NULL DEFAULT true,
    "fluidType" "BrakeFluidType",
    "brakeSystemFamily" TEXT,
    "padShape" TEXT,
    "minRotorThicknessMm" DOUBLE PRECISION,
    "maxRotorThicknessMm" DOUBLE PRECISION,

    CONSTRAINT "BrakeCaliper_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "BrakeLever" (
    "partId" TEXT NOT NULL,
    "isHydraulic" BOOLEAN NOT NULL DEFAULT true,
    "fluidType" "BrakeFluidType",
    "brakeSystemFamily" TEXT,
    "barType" "BarType",
    "clampDiameterMm" DOUBLE PRECISION,
    "requiresCompressionless" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BrakeLever_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Rotor" (
    "partId" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "mountStandard" "RotorMountStandard" NOT NULL,
    "lockringType" "LockringType",
    "thicknessMm" DOUBLE PRECISION,

    CONSTRAINT "Rotor_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Shifter" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,
    "barType" "BarType",
    "clampDiameterMm" DOUBLE PRECISION,

    CONSTRAINT "Shifter_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "RearDerailleur" (
    "partId" TEXT NOT NULL,
    "maxSpeeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,
    "maxCassetteCogTeeth" INTEGER NOT NULL,
    "minCassetteCogTeeth" INTEGER,
    "totalCapacityTeeth" INTEGER,
    "cageLength" "CageLength",
    "mountStandard" "DerailleurMountStandard",

    CONSTRAINT "RearDerailleur_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "FrontDerailleur" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "cablePullStandard" "CablePullStandard" NOT NULL,
    "mountType" "FdMountType" NOT NULL,
    "pullDirection" "PullDirection" NOT NULL,
    "maxChainringTeeth" INTEGER,

    CONSTRAINT "FrontDerailleur_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Cassette" (
    "partId" TEXT NOT NULL,
    "speeds" INTEGER NOT NULL,
    "freehubBodyType" "FreehubBodyType" NOT NULL,
    "smallestCogTeeth" INTEGER NOT NULL,
    "largestCogTeeth" INTEGER NOT NULL,
    "requiresSpacerMm" DOUBLE PRECISION,

    CONSTRAINT "Cassette_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Chain" (
    "partId" TEXT NOT NULL,
    "speedsMin" INTEGER NOT NULL,
    "speedsMax" INTEGER NOT NULL,
    "chainStandard" "ChainStandard" NOT NULL,
    "links" INTEGER,

    CONSTRAINT "Chain_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Headset" (
    "partId" TEXT NOT NULL,
    "upperStandard" "HeadsetCupStandard" NOT NULL,
    "lowerStandard" "HeadsetCupStandard" NOT NULL,
    "crownRaceDiameterMm" DOUBLE PRECISION,
    "stackHeightMm" DOUBLE PRECISION,

    CONSTRAINT "Headset_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "RearShock" (
    "partId" TEXT NOT NULL,
    "eyeToEyeMm" INTEGER NOT NULL,
    "strokeMm" INTEGER NOT NULL,
    "mountType" "ShockMountType" NOT NULL,
    "hardwareWidthMm" INTEGER,
    "bushingDiameterMm" DOUBLE PRECISION,
    "sizing" "ShockSizing" NOT NULL,
    "isCoil" BOOLEAN NOT NULL DEFAULT false,
    "springRate" INTEGER,
    "hasReservoir" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RearShock_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Handlebar" (
    "partId" TEXT NOT NULL,
    "clampDiameterMm" DOUBLE PRECISION NOT NULL,
    "controlClampDiameterMm" DOUBLE PRECISION NOT NULL,
    "barType" "BarType" NOT NULL,
    "widthMm" INTEGER,
    "riseMm" INTEGER,
    "internalRouting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Handlebar_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Stem" (
    "partId" TEXT NOT NULL,
    "barClampDiameterMm" DOUBLE PRECISION NOT NULL,
    "steererClampMm" DOUBLE PRECISION NOT NULL,
    "lengthMm" INTEGER,
    "riseDegrees" INTEGER,
    "integratedCockpit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stem_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Seatpost" (
    "partId" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,
    "totalLengthMm" INTEGER NOT NULL,
    "isDropper" BOOLEAN NOT NULL DEFAULT false,
    "travelMm" INTEGER,
    "routingType" "RoutingType",
    "remoteType" "DropperRemoteType",
    "railClampType" "SaddleRailType",
    "setbackMm" INTEGER,

    CONSTRAINT "Seatpost_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "SeatClamp" (
    "partId" TEXT NOT NULL,
    "diameterMm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SeatClamp_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Saddle" (
    "partId" TEXT NOT NULL,
    "railType" "SaddleRailType" NOT NULL,
    "widthMm" INTEGER,

    CONSTRAINT "Saddle_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Pedal" (
    "partId" TEXT NOT NULL,
    "thread" "PedalThread" NOT NULL,
    "cleatSystem" "CleatSystem" NOT NULL,

    CONSTRAINT "Pedal_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "Shoe" (
    "partId" TEXT NOT NULL,
    "soleDrilling" "SoleDrilling" NOT NULL,

    CONSTRAINT "Shoe_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "ChainGuide" (
    "partId" TEXT NOT NULL,
    "mountStandard" "IscgStandard" NOT NULL,
    "maxChainringTeeth" INTEGER,
    "minChainringTeeth" INTEGER,

    CONSTRAINT "ChainGuide_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "DerailleurHanger" (
    "partId" TEXT NOT NULL,
    "hangerStandard" "HangerStandard" NOT NULL,
    "model" TEXT,

    CONSTRAINT "DerailleurHanger_pkey" PRIMARY KEY ("partId")
);

-- CreateTable
CREATE TABLE "PartBundle" (
    "id" TEXT NOT NULL,
    "parentPartId" TEXT NOT NULL,
    "bundledPartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "role" TEXT,
    "dataSource" "DataSource" NOT NULL DEFAULT 'UNVERIFIED',
    "sourceUrl" TEXT,
    "dataNotes" TEXT,

    CONSTRAINT "PartBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" "VendorName" NOT NULL,
    "siteUrl" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "includesVat" BOOLEAN NOT NULL DEFAULT true,
    "vatRatePercent" INTEGER NOT NULL DEFAULT 20,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "productUrl" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "vendorId" TEXT,
    "targetPricePence" INTEGER,
    "notifyOnRestock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Build_userId_idx" ON "Build"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeModel_slug_key" ON "BikeModel"("slug");

-- CreateIndex
CREATE INDEX "BikeModel_brand_idx" ON "BikeModel"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "BikeModel_brand_model_year_variant_key" ON "BikeModel"("brand", "model", "year", "variant");

-- CreateIndex
CREATE INDEX "BikeModelPart_bikeModelId_idx" ON "BikeModelPart"("bikeModelId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeModelPart_bikeModelId_partId_slot_key" ON "BikeModelPart"("bikeModelId", "partId", "slot");

-- CreateIndex
CREATE INDEX "BuildPart_buildId_idx" ON "BuildPart"("buildId");

-- CreateIndex
CREATE UNIQUE INDEX "BuildPart_buildId_partId_slot_key" ON "BuildPart"("buildId", "partId", "slot");

-- CreateIndex
CREATE INDEX "Part_dataSource_idx" ON "Part"("dataSource");

-- CreateIndex
CREATE INDEX "Part_type_idx" ON "Part"("type");

-- CreateIndex
CREATE INDEX "Part_brand_idx" ON "Part"("brand");

-- CreateIndex
CREATE INDEX "Frame_bbShellStandard_idx" ON "Frame"("bbShellStandard");

-- CreateIndex
CREATE INDEX "Frame_rearAxleType_idx" ON "Frame"("rearAxleType");

-- CreateIndex
CREATE INDEX "Fork_frontAxleType_idx" ON "Fork"("frontAxleType");

-- CreateIndex
CREATE INDEX "BottomBracket_frameInterface_idx" ON "BottomBracket"("frameInterface");

-- CreateIndex
CREATE INDEX "PartBundle_parentPartId_idx" ON "PartBundle"("parentPartId");

-- CreateIndex
CREATE INDEX "PartBundle_bundledPartId_idx" ON "PartBundle"("bundledPartId");

-- CreateIndex
CREATE UNIQUE INDEX "PartBundle_parentPartId_bundledPartId_key" ON "PartBundle"("parentPartId", "bundledPartId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Price_partId_vendorId_recordedAt_idx" ON "Price"("partId", "vendorId", "recordedAt");

-- CreateIndex
CREATE INDEX "StockAlert_userId_idx" ON "StockAlert"("userId");

-- CreateIndex
CREATE INDEX "StockAlert_partId_idx" ON "StockAlert"("partId");

-- CreateIndex
CREATE INDEX "StockAlert_vendorId_idx" ON "StockAlert"("vendorId");

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_basedOnModelId_fkey" FOREIGN KEY ("basedOnModelId") REFERENCES "BikeModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeModelPart" ADD CONSTRAINT "BikeModelPart_bikeModelId_fkey" FOREIGN KEY ("bikeModelId") REFERENCES "BikeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeModelPart" ADD CONSTRAINT "BikeModelPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPart" ADD CONSTRAINT "BuildPart_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildPart" ADD CONSTRAINT "BuildPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frame" ADD CONSTRAINT "Frame_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fork" ADD CONSTRAINT "Fork_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BottomBracket" ADD CONSTRAINT "BottomBracket_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crankset" ADD CONSTRAINT "Crankset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chainring" ADD CONSTRAINT "Chainring_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wheelset" ADD CONSTRAINT "Wheelset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tyre" ADD CONSTRAINT "Tyre_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tube" ADD CONSTRAINT "Tube_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrakeCaliper" ADD CONSTRAINT "BrakeCaliper_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrakeLever" ADD CONSTRAINT "BrakeLever_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotor" ADD CONSTRAINT "Rotor_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shifter" ADD CONSTRAINT "Shifter_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RearDerailleur" ADD CONSTRAINT "RearDerailleur_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDerailleur" ADD CONSTRAINT "FrontDerailleur_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cassette" ADD CONSTRAINT "Cassette_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chain" ADD CONSTRAINT "Chain_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Headset" ADD CONSTRAINT "Headset_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RearShock" ADD CONSTRAINT "RearShock_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handlebar" ADD CONSTRAINT "Handlebar_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stem" ADD CONSTRAINT "Stem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seatpost" ADD CONSTRAINT "Seatpost_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatClamp" ADD CONSTRAINT "SeatClamp_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Saddle" ADD CONSTRAINT "Saddle_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedal" ADD CONSTRAINT "Pedal_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoe" ADD CONSTRAINT "Shoe_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainGuide" ADD CONSTRAINT "ChainGuide_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerailleurHanger" ADD CONSTRAINT "DerailleurHanger_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBundle" ADD CONSTRAINT "PartBundle_parentPartId_fkey" FOREIGN KEY ("parentPartId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBundle" ADD CONSTRAINT "PartBundle_bundledPartId_fkey" FOREIGN KEY ("bundledPartId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
