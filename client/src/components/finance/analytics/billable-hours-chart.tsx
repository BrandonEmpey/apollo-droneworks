import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { BillableHoursAnalytics } from "@/hooks/use-payroll-analytics";

interface BillableHoursChartProps {
  data: BillableHoursAnalytics | undefined;
}

export function BillableHoursChart({ data }: BillableHoursChartProps) {
  const pieData = useMemo(() => {
    if (!data) return [];
    
    return [
      {
        name: "Billable Hours",
        value: parseFloat(data.billableHours || "0"),
        color: "#B59410" // Gold color to match Apollo's branding
      },
      {
        name: "Non-Billable Hours",
        value: parseFloat(data.nonBillableHours || "0"),
        color: "#6b7280" // Gray color
      }
    ];
  }, [data]);
  
  const projectData = useMemo(() => {
    if (!data || !data.entriesByProject) return [];
    
    return data.entriesByProject.map(project => ({
      name: project.projectName,
      billable: parseFloat(project.billableHours),
      nonBillable: parseFloat(project.nonBillableHours)
    }));
  }, [data]);
  
  const COLORS = ["#B59410", "#6b7280"];
  
  const renderPieChart = () => (
    <div className="h-full flex flex-col">
      <div className="text-center mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Overall Billable Ratio</h3>
        <div className="text-2xl font-bold">{data?.billablePercentage || "0"}%</div>
      </div>
      
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => 
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [`${value.toFixed(2)} hours`, name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
  
  const renderProjectChart = () => {
    // Only show bar chart if there are projects
    if (projectData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No project data available</p>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={projectData}
          margin={{
            top: 20,
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
            tick={{ fontSize: 12 }}
          />
          <YAxis tickFormatter={(value) => `${value}h`} />
          <Tooltip formatter={(value) => [`${value.toFixed(2)} hours`]} />
          <Legend />
          <Bar dataKey="billable" name="Billable Hours" stackId="a" fill="#B59410" />
          <Bar dataKey="nonBillable" name="Non-Billable Hours" stackId="a" fill="#6b7280" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  // If there's only overall data and no projects, show only pie chart
  if (!data.entriesByProject || data.entriesByProject.length === 0) {
    return renderPieChart();
  }
  
  // If there are 1-2 projects, show both charts
  if (data.entriesByProject.length <= 2) {
    return (
      <div className="h-full">
        <div className="flex h-1/2 mb-4">
          {renderPieChart()}
        </div>
        <div className="h-1/2">
          {renderProjectChart()}
        </div>
      </div>
    );
  }
  
  // If there are more projects, only show bar chart
  return renderProjectChart();
}