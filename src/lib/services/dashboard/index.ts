// Re-exports pour backward compatibility
export { getDashboardStats } from "../dashboardService";
export type { DashboardStats } from "./types";
export { computePeriodRange, computeVariation } from "./dateHelpers";
export type { PeriodRange } from "./dateHelpers";
export { fetchTrends } from "./trendQueries";
export type { Trends, TrendData } from "./trendQueries";
export { fetchRevenueTimeSeries, fetchConversionTimeSeries } from "./timeSeriesQueries";
export type { TimeSeriesPoint, ConversionPoint } from "./timeSeriesQueries";
export type { PaymentWithInvoice } from "./types";
