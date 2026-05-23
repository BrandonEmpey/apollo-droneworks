import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeList from "./employee-list";
import PayrollPeriods from "./payroll-periods";
import EmployeeForm from "./employee-form";

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState("periods");
  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  const handleEditEmployee = (id: number) => {
    setActiveEmployeeId(id);
    setShowEmployeeForm(true);
  };

  const handleEmployeeFormClose = () => {
    setShowEmployeeForm(false);
    setActiveEmployeeId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
        <p className="text-muted-foreground">
          Track employee information, manage pay periods, and process payroll.
        </p>
      </div>

      <Tabs
        defaultValue="periods"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="periods">Pay Periods</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="reports" disabled>Payroll Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-4">
          <PayrollPeriods />
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {showEmployeeForm ? (
            <EmployeeForm 
              employeeId={activeEmployeeId} 
              onClose={handleEmployeeFormClose} 
            />
          ) : (
            <EmployeeList onEdit={handleEditEmployee} />
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="rounded-md border p-8 text-center">
            <h3 className="text-lg font-medium mb-2">Payroll Reports</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Generate detailed payroll reports, tax summaries, and expense breakdowns.
              This feature will be available soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}