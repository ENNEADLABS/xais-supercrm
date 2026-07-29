import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestContext,
  type Tenant,
  type TestContext,
  type TestUser,
} from "../helpers/factories";
import { readInvoiceAsAdmin, seedCompany, seedInvoice, SOFT_DELETED_AT } from "../helpers/seed";

// `invoices_delete` n'autorise le hard-delete que pour : admin + status='draft' +
// pas un avoir (is_credit_note=false) + déjà en corbeille (deleted_at not null).
// Obligation légale FR : on ne supprime pas une facture émise (ADR / RLS).
// Rappel : un DELETE refusé par `USING` affecte 0 ligne sans erreur → on relit
// l'état via service_role.
describe("RLS invoices — hard-delete restreint aux brouillons", () => {
  let ctx: TestContext;
  let orgA: Tenant;
  let admin: TestUser;
  let member: TestUser;
  let companyId: string;

  beforeAll(async () => {
    ctx = createTestContext();
    orgA = await ctx.createTenant();
    admin = orgA.owner;
    member = await ctx.addMember(orgA.orgId, "member");
    companyId = await seedCompany(orgA.orgId);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("un admin peut hard-delete une facture draft en corbeille", async () => {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, {
      status: "draft",
      deleted_at: SOFT_DELETED_AT,
    });
    const client = await ctx.authClientFor(admin);

    await client.from("invoices").delete().eq("id", invoiceId);

    expect(await readInvoiceAsAdmin(invoiceId)).toBeNull();
  });

  it("un admin ne peut pas delete une facture émise (status != draft)", async () => {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, {
      status: "sent",
      deleted_at: SOFT_DELETED_AT,
    });
    const client = await ctx.authClientFor(admin);

    await client.from("invoices").delete().eq("id", invoiceId);

    expect(await readInvoiceAsAdmin(invoiceId)).not.toBeNull();
  });

  it("un admin ne peut pas delete une facture draft pas encore en corbeille", async () => {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, { status: "draft" });
    const client = await ctx.authClientFor(admin);

    await client.from("invoices").delete().eq("id", invoiceId);

    expect(await readInvoiceAsAdmin(invoiceId)).not.toBeNull();
  });

  it("un member ne peut pas delete une facture draft en corbeille", async () => {
    const invoiceId = await seedInvoice(orgA.orgId, companyId, {
      status: "draft",
      deleted_at: SOFT_DELETED_AT,
    });
    const client = await ctx.authClientFor(member);

    await client.from("invoices").delete().eq("id", invoiceId);

    expect(await readInvoiceAsAdmin(invoiceId)).not.toBeNull();
  });

  it("un admin ne peut pas delete un avoir, même draft en corbeille", async () => {
    const parentId = await seedInvoice(orgA.orgId, companyId, { status: "sent" });
    const creditNoteId = await seedInvoice(orgA.orgId, companyId, {
      status: "draft",
      is_credit_note: true,
      credit_note_for: parentId,
      deleted_at: SOFT_DELETED_AT,
    });
    const client = await ctx.authClientFor(admin);

    await client.from("invoices").delete().eq("id", creditNoteId);

    expect(await readInvoiceAsAdmin(creditNoteId)).not.toBeNull();
  });
});
