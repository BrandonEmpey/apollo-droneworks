import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

// Types for payroll analytics
export interface PayrollAnalytics {
  employeeId?: number;
  employeeName?: string;
  position?: string;
  periodId?: number;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  month?: string;
  totalGrossPay: string;
  totalTaxAmount: string;
  totalNetPay: string;
  totalRegularHours: string;
  totalOvertimeHours: string;
  averageGrossPay?: string;
  periodCount?: number;
  employeeCount?: number;
  entryCount?: number;
  averagePayPerEntry?: string;
}

export interface BillableHoursAnalytics {
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  billablePercentage: string;
  entriesByProject: ProjectBillableHours[];
}

export interface ProjectBillableHours {
  projectId: number;
  projectName: string;
  serviceType: string;
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  billablePercentage: string;
}

export type GroupByOption = 'employee' | 'period' | 'monthly';

export interface PayrollAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupByOption;
  employeeId?: number;
  periodId?: number;
}

export interface BillableHoursFilters {
  startDate?: string;
  endDate?: string;
  projectId?: number;
}

// Hook for payroll analytics
export function usePayrollAnalytics(filters: PayrollAnalyticsFilters = {}) {
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.groupBy) queryParams.append('groupBy', filters.groupBy);
  if (filters.employeeId) queryParams.append('employeeId', filters.employeeId.toString());
  if (filters.periodId) queryParams.append('periodId', filters.periodId.toString());
  
  const url = `/api/analytics/payroll?${queryParams.toString()}`;
  
  return useQuery<PayrollAnalytics[], Error>({
    queryKey: ['/api/analytics/payroll', filters],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error fetching payroll analytics",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

// Hook for billable hours analytics
export function useBillableHoursAnalytics(filters: BillableHoursFilters = {}) {
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.projectId) queryParams.append('projectId', filters.projectId.toString());
  
  const url = `/api/analytics/billable-hours?${queryParams.toString()}`;
  
  return useQuery<BillableHoursAnalytics, Error>({
    queryKey: ['/api/analytics/billable-hours', filters],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error fetching billable hours analytics",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

// Hook for synchronizing analytics data
export function useSyncAnalyticsData() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analytics Sync Complete",
        description: "Payroll and financial data has been synchronized with analytics system",
      });
      
      // Invalidate all analytics related queries
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}