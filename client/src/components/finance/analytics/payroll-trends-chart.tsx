import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { PayrollAnalytics } from "@/hooks/use-payroll-analytics";

interface PayrollTrendsChartProps {
  data: PayrollAnalytics[];
}

export function PayrollTrendsChart({ data }: PayrollTrendsChartProps) {
  const chartData = useMemo(() => {
    // Check if month data is available
    const hasMonthData = data.some(item => item.month);
    
    if (hasMonthData) {
      // Sort data by month
      return [...data].sort((a, b) => {
        if (!a.month || !b.month) return 0;
        return a.month.localeCompare(b.month);
      });
    }
    
    // Check if period data is available
    const hasPeriodData = data.some(item => item.periodId);
    
    if (hasPeriodData) {
      // For period data, create labels based on period start dates
      return data.map(item => ({
        ...item,
        name: item.periodStart ? item.periodStart.substring(0, 10) : `Period ${item.periodId}`
      }));
    }
    
    // For employee data, use employee names
    return data.map(item => ({
      ...item,
      name: item.employeeName || `Employee ${item.employeeId}`
    }));
  }, [data]);

  // Determine chart type based on data
  const isTimeSeries = data.some(item => item.month || item.periodId);
  
  // Check if data contains hours
  const hasHoursData = data.some(item => 
    parseFloat(item.totalRegularHours || '0') > 0 || 
    parseFloat(item.totalOvertimeHours || '0') > 0
  );

  if (isTimeSeries) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            tickFormatter={(value) => `$${value}`}
          />
          {hasHoursData && (
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tickFormatter={(value) => `${value}h`}
            />
          )}
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'totalGrossPay' || name === 'totalNetPay' || name === 'totalTaxAmount') {
                return [`$${Number(value).toFixed(2)}`, name.replace('total', '')];
              }
              if (name === 'totalRegularHours' || name === 'totalOvertimeHours') {
                return [`${Number(value).toFixed(2)} hours`, name.replace('total', '')];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalGrossPay"
            name="Gross Pay"
            stroke="#B59410"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalNetPay"
            name="Net Pay"
            stroke="#40916c"
            activeDot={{ r: 8 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalTaxAmount"
            name="Tax"
            stroke="#E3651D"
            activeDot={{ r: 8 }}
          />
          {hasHoursData && (
            <>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalRegularHours"
                name="Regular Hours"
                stroke="#2563eb"
                activeDot={{ r: 8 }}
                strokeDasharray="5 5"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalOvertimeHours"
                name="Overtime Hours"
                stroke="#9333ea"
                activeDot={{ r: 8 }}
                strokeDasharray="5 5"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  } else {
    // For employee data, use a bar chart instead
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'totalGrossPay' || name === 'totalNetPay' || name === 'totalTaxAmount') {
                return [`$${Number(value).toFixed(2)}`, name.replace('total', '')];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar dataKey="totalGrossPay" name="Gross Pay" fill="#B59410" />
          <Bar dataKey="totalNetPay" name="Net Pay" fill="#40916c" />
          <Bar dataKey="totalTaxAmount" name="Tax" fill="#E3651D" />
        </BarChart>
      </ResponsiveContainer>
    );
  }
}