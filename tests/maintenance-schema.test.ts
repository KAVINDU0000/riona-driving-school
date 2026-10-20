// Database-free. Recognising "the maintenance tables are not in this database" and nothing else.
import { describe, expect, it } from "vitest";
import { isMaintenanceSchemaMissing } from "@/lib/vehicles/maintenance-schema";

describe("isMaintenanceSchemaMissing", () => {
  it("recognises a missing maintenance table (P2021), as Prisma reports it", () => {
    const error = { code: "P2021", message: "Invalid `prisma.vehicleInsurancePolicy.findMany()` invocation: The table `public.VehicleInsurancePolicy` does not exist in the current database." };
    expect(isMaintenanceSchemaMissing(error)).toBe(true);
  });

  it("recognises a missing maintenance column (P2022)", () => {
    expect(isMaintenanceSchemaMissing({ code: "P2022", message: "The column `VehicleFault.severity` does not exist in VehicleFault" })).toBe(true);
  });

  it("does not hide a missing table that is not a maintenance table", () => {
    expect(isMaintenanceSchemaMissing({ code: "P2021", message: "The table `public.User` does not exist in the current database." })).toBe(false);
  });

  it("does not hide other Prisma errors that name a maintenance table", () => {
    expect(isMaintenanceSchemaMissing({ code: "P2002", message: "Unique constraint failed on VehicleInsurancePolicy" })).toBe(false);
  });

  it("does not treat ordinary errors, or non-objects, as a missing schema", () => {
    expect(isMaintenanceSchemaMissing(new Error("VehicleInsurancePolicy is broken"))).toBe(false);
    expect(isMaintenanceSchemaMissing(null)).toBe(false);
    expect(isMaintenanceSchemaMissing("P2021")).toBe(false);
  });
});
