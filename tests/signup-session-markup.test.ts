// Database-free. Server-renders the signup form for each Additional vehicle package and checks the session fieldsets in the
// markup. This is NOT a browser test: it cannot type into inputs or check that selections stay independent. Those are
// covered by the server rule tests (tests/catalog-session-rules.test.ts) and the route test in tests/mixed-package-sessions.test.ts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packageGroups } from "@/data/packages";
import SignupForm from "@/components/auth/SignupForm";
import type { CatalogGroup } from "@/lib/packages/format";
import { SESSION_VEHICLE_LABELS, regularVehiclesOf, sessionRuleFor, trialVehiclesOf } from "@/lib/registration/session-rules";

// The catalog the page would receive, built from the source names. The live names are checked separately.
const catalog: CatalogGroup[] = packageGroups.map((group) => ({
  label: group.label,
  options: group.options.map((option) => ({
    id: option.id,
    name: option.name,
    packageType: group.label === "Additional vehicle training" ? "ADDITIONAL_VEHICLE" : "REGULAR",
    price: option.price,
    group: group.label,
  })) as CatalogGroup["options"],
}));

const MIXED = packageGroups.find((g) => g.label === "Additional vehicle training")!.options.map((o) => o.id);

describe.each(MIXED.map((id) => [id]))("signup markup for %s", (packageId) => {
  const rule = sessionRuleFor(packageId);
  const regular = regularVehiclesOf(rule);
  const trial = trialVehiclesOf(rule);
  const html = renderToStaticMarkup(createElement(SignupForm, { catalog, initialPackageId: packageId }));

  it("shows the Regular vehicle as fixed 15 sessions, with no input for it", () => {
    expect(regular).toHaveLength(1);
    expect(html).toContain("Regular training is fixed at 15 sessions for each vehicle.");
    expect(html).toContain(`${SESSION_VEHICLE_LABELS[regular[0]]}: 15 sessions`);
    expect(html).not.toContain(`${SESSION_VEHICLE_LABELS[regular[0]]} sessions<input`);
  });

  it("gives each Trial vehicle its own 1 to 5 number input", () => {
    const inputs = html.match(/type="number"/g) ?? [];
    expect(inputs).toHaveLength(trial.length);
    for (const vehicle of trial) {
      expect(html).toContain(`${SESSION_VEHICLE_LABELS[vehicle]} sessions<input`);
    }
    expect((html.match(/min="1"/g) ?? []).length).toBe(trial.length);
    expect((html.match(/max="5"/g) ?? []).length).toBe(trial.length);
  });

  it("shows the package name from the catalog it was given", () => {
    const name = packageGroups.flatMap((g) => g.options).find((o) => o.id === packageId)!.name;
    expect(html).toContain(name.replace(/&/g, "&amp;"));
  });
});
