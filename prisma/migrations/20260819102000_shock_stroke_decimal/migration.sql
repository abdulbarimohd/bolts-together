-- R-SHK-01 compares shock eye-to-eye and stroke EXACTLY, with no tolerance.
-- As Int, real half-millimetre strokes were silently truncated: a Cannondale
-- Habit sourced at 210x47.5 was stored as 210x47, which would both block its
-- own correct shock and match no shock at all.
ALTER TABLE "RearShock" ALTER COLUMN "eyeToEyeMm" TYPE DECIMAL(5,1);
ALTER TABLE "RearShock" ALTER COLUMN "strokeMm"   TYPE DECIMAL(4,1);
ALTER TABLE "Frame"     ALTER COLUMN "shockEyeToEyeMm" TYPE DECIMAL(5,1);
ALTER TABLE "Frame"     ALTER COLUMN "shockStrokeMm"   TYPE DECIMAL(4,1);
