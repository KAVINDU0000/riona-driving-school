// Database-free. The dashboard's "Vehicles needing attention" card links to the vehicle list with status=NEEDS_ATTENTION.
import { describe, expect, it } from "vitest";
import { NEEDS_ATTENTION, vehicleListQuery } from "@/lib/admin/vehicles";

describe("vehicle list filter for the dashboard card", () => {
  it("accepts NEEDS_ATTENTION as a filter value, separate from any stored status", () => {
    expect(vehicleListQuery({ status: NEEDS_ATTENTION }).status).toBe(NEEDS_ATTENTION);
  });

  it("still accepts each real vehicle status and ignores unknown values", () => {
    expect(vehicleListQuery({ status: "MAINTENANCE" }).status).toBe("MAINTENANCE");
    expect(vehicleListQuery({ status: "INACTIVE" }).status).toBe("INACTIVE");
    expect(vehicleListQuery({ status: "RETIRED" }).status).toBeNull();
    expect(vehicleListQuery({}).status).toBeNull();
  });
});
