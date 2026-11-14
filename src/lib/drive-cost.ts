import type { Drive } from "./queries";
import type { Trip } from "./trip";

export type DriveEnergyInput = Pick<Drive, "distanceKm" | "efficiencyWhPerKm">;

export function driveEnergyKwh(input: DriveEnergyInput): number | null {
  const { distanceKm, efficiencyWhPerKm } = input;
  if (distanceKm === null || efficiencyWhPerKm === null || distanceKm <= 0) {
    return null;
  }
  return (efficiencyWhPerKm * distanceKm) / 1000;
}

export function driveCost(
  input: DriveEnergyInput,
  pricePerKwh: number | null,
): number | null {
  const energy = driveEnergyKwh(input);
  if (energy === null || pricePerKwh === null) return null;
  return Math.round(energy * pricePerKwh * 100) / 100;
}

export function tripDrivingCost(
  trip: Trip,
  pricePerKwh: number | null,
): number | null {
  if (pricePerKwh === null) return null;
  let total = 0;
  let any = false;
  for (const drive of trip.drives) {
    const cost = driveCost(drive, pricePerKwh);
    if (cost !== null) {
      total += cost;
      any = true;
    }
  }
  return any ? Math.round(total * 100) / 100 : null;
}

export const driveCostDetail = "At your price per kWh";
