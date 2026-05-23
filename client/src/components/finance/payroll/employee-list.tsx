import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  PlusCircle, 
  MoreHorizontal,
  EyeIcon
} from "lucide-react";
import { Employee, Department } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmployeeListProps {
  onEdit: (id: number) => void;
}

export default function EmployeeList({ onEdit }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
  });

  // Fetch departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/payroll/departments"],
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/payroll/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      setIsDeleteDialogOpen(false);
      setSelectedEmployeeId(null);
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Toggle employee active status
  const toggleActiveStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/payroll/employees/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/employees"] });
      toast({
        title: "Success",
        description: "Employee status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update employee status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Search and filter employees
  const filteredEmployees = employees?.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    return (
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.position.toLowerCase().includes(searchLower)
    );
  });

  // Get department name by id
  const getDepartmentName = (departmentId: number | null) => {
    if (departmentId === null) return "No Department";
    const department = departments?.find(d => d.id === departmentId);
    return department ? department.name : "Unknown Department";
  };

  // Format pay display based on pay type
  const formatPayDisplay = (employee: Employee) => {
    if (employee.payType === "hourly") {
      return `$${Number(employee.payRate).toFixed(2)}/hr`;
    } else {
      return `$${Number(employee.payRate).toLocaleString()}/yr`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-muted-foreground">
            Manage your employee information and payroll settings
          </p>
        </div>
        <Button onClick={() => onEdit(-1)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                      <div className="text-xs text-muted-foreground mt-1">
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {departments ? getDepartmentName(employee.departmentId) : "Loading..."}
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{formatPayDisplay(employee)}</TableCell>
                    <TableCell>
                      {employee.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onEdit(employee.id)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <EyeIcon className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              toggleActiveStatusMutation.mutate({
                                id: employee.id,
                                isActive: !employee.isActive,
                              })
                            }
                          >
                            {employee.isActive ? (
                              <>Set as Inactive</>
                            ) : (
                              <>Set as Active</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-medium mb-2">No Employees Found</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {searchTerm
                  ? "No employees match your search criteria. Try a different search term."
                  : "You haven't added any employees yet. Add your first employee to get started with payroll."}
              </p>
              {!searchTerm && (
                <Button onClick={() => onEdit(-1)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add First Employee
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-700">
              Employees with payroll history cannot be deleted. Consider marking them as inactive instead.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedEmployeeId !== null) {
                  deleteEmployeeMutation.mutate(selectedEmployeeId);
                }
              }}
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}