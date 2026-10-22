import { VehicleType } from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";

/*
 * Seats per vehicle type: how many students one vehicle of that type can take in one session. Changing a limit affects
 * sessions opened after the change. Sessions already open keep the seat count they were opened with.
 */

export const SEATS_MIN = 1;
export const SEATS_MAX = 20;

export type SeatLimit = { vehicleType: VehicleType; seats: number };

export async function listSeatLimits(): Promise<SeatLimit[]> {
  const rows = await prisma.vehicleTypeCapacity.findMany({ orderBy: { vehicleType: "asc" } });
  return rows.map((row) => ({ vehicleType: row.vehicleType, seats: row.seats }));
}

export function parseVehicleType(value: string): VehicleType {
  if (Object.values(VehicleType).includes(value as VehicleType)) return value as VehicleType;
  throw new AuthError(400, "Choose a valid vehicle type.");
}

export function parseSeats(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < SEATS_MIN || value > SEATS_MAX) {
    throw new AuthError(400, `Seats must be a whole number from ${SEATS_MIN} to ${SEATS_MAX}.`);
  }
  return value;
}

export async function updateSeatLimit(vehicleType: VehicleType, seats: number): Promise<SeatLimit> {
  const row = await prisma.vehicleTypeCapacity.update({
    where: { vehicleType },
    data: { seats },
    select: { vehicleType: true, seats: true },
  });
  return row;
}
