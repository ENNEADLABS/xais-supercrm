import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestContext, type Tenant, type TestContext } from "../helpers/factories";

// Reproduit la finalisation d'onboarding : updateTenantConfig() fait un upsert
// sur tenant_config. Sans policy INSERT, l'upsert échoue sous RLS même quand la
// ligne existe (créée par handle_new_user). Régression « Erreur lors de la
// finalisation ».
describe("RLS tenant_config — upsert (finalisation onboarding)", () => {
  let ctx: TestContext;
  let orgA: Tenant;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("l'admin peut upsert sa tenant_config (onboarding_completed)", async () => {
    const client = await ctx.authClientFor(orgA.owner);

    const { error } = await client
      .from("tenant_config")
      .upsert(
        {
          organization_id: orgA.orgId,
          config: { onboarding_completed: true },
          updated_at: "2026-06-14T00:00:00.000Z",
        },
        { onConflict: "organization_id" },
      )
      .select("config");

    expect(error).toBeNull();
  });

  it("un viewer ne peut pas upsert la tenant_config", async () => {
    const viewer = await ctx.addMember(orgA.orgId, "viewer");
    const client = await ctx.authClientFor(viewer);

    const { error } = await client.from("tenant_config").upsert(
      {
        organization_id: orgA.orgId,
        config: { onboarding_completed: false },
        updated_at: "2026-06-14T00:00:00.000Z",
      },
      { onConflict: "organization_id" },
    );

    expect(error).not.toBeNull();
  });
});
