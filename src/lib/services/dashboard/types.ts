// Types du dashboard principal
import type { PaymentMethod as PaymentMethodType } from "@/lib/utils/payment-labels";

export interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  openDeals: number;
  openDealsAmount: number;
  openDealsWeighted: number;
  pendingQuotes: number;
  pendingQuotesAmount: number;
  monthlyRevenue: number;
  monthlyRevenueLastMonth: number;
  pipelineByStage: Array<{
    stage: string;
    label: string;
    color: string;
    count: number;
    amount: number;
  }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  overdueInvoices: Array<{
    id: string;
    reference: string | null;
    subject: string;
    company_name: string;
    total_ttc: number;
    due_date: string;
  }>;
  expiringQuotes: Array<{
    id: string;
    reference: string | null;
    subject: string;
    company_name: string;
    total_ttc: number;
    expires_at: string;
  }>;
  staleDeals: Array<{
    id: string;
    name: string;
    company_name: string;
    amount: number | null;
    stage: string;
    updated_at: string;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    due_date: string;
    priority: string;
    entity_type: string | null;
    entity_id: string | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    due_date: string;
    priority: string;
    entity_type: string | null;
    entity_id: string | null;
  }>;
  recentActivities: Array<{
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  totalReceivable: number;
  unpaidInvoices: number;
  recentPayments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethodType;
    invoice_reference: string | null;
    company_name: string | null;
  }>;
}

export type PaymentWithInvoice = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethodType;
  invoices: { reference: string | null; companies: { name: string } } | null;
};
