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
  CheckCircle,
  X,
  FileText,
  Clock
} from "lucide-react";
import { Employee, TimeEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TimeEntryForm from "./time-entry-form";

interface TimeEntryListProps {
  employeeId?: number;
}

export default function TimeEntryList({ employeeId }: TimeEntryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTimeEntryId, setSelectedTimeEntryId] = useState<number | null>(null);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [activeTimeEntryId, setActiveTimeEntryId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch time entries
  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: employeeId 
      ? [`/api/payroll/employees/${employeeId}/time-entries`]
      : ["/api/payroll/time-entries"],
  });

  // Fetch employee data if employeeId is provided
  const { data: employee } = useQuery<Employee>({
    queryKey: [`/api/payroll/employees/${employeeId}`],
    enabled: !!employeeId,
  });

  // Fetch all employees for mapping employee IDs to names
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/payroll/employees"],
    enabled: !employeeId, // Only fetch all employees if employeeId is not provided
  });

  // Delete time entry mutation
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/payroll/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: employeeId 
          ? [`/api/payroll/employees/${employeeId}/time-entries`]
          : ["/api/payroll/time-entries"] 
      });
      setIsDeleteDialogOpen(false);
      setSelectedTimeEntryId(null);
      toast({
        title: "Success",
        description: "Time entry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete time entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Toggle time entry approval status
  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: number; approved: boolean }) => {
      await apiRequest("PATCH", `/api/payroll/time-entries/${id}`, { approved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: employeeId 
          ? [`/api/payroll/employees/${employeeId}/time-entries`]
          : ["/api/payroll/time-entries"] 
      });
      toast({
        title: "Success",
        description: "Time entry approval status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update approval status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle edit time entry
  const handleEditTimeEntry = (id: number) => {
    setActiveTimeEntryId(id);
    setShowTimeEntryForm(true);
  };

  // Handle add new time entry
  const handleAddTimeEntry = () => {
    setActiveTimeEntryId(null);
    setShowTimeEntryForm(true);
  };

  // Handle close time entry form
  const handleTimeEntryFormClose = () => {
    setShowTimeEntryForm(false);
    setActiveTimeEntryId(null);
  };

  // Search and filter time entries
  const filteredTimeEntries = timeEntries?.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.description.toLowerCase().includes(searchLower)
    );
  });

  // Get employee name by id
  const getEmployeeName = (employeeId: number | null) => {
    if (!employeeId) return "Unknown Employee";
    
    if (employee && employee.id === employeeId) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {showTimeEntryForm ? (
        <TimeEntryForm
          timeEntryId={activeTimeEntryId}
          employeeId={employeeId}
          onClose={handleTimeEntryFormClose}
        />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Time Entries</h2>
              <p className="text-muted-foreground">
                {employeeId 
                  ? "Manage employee's time entries for payroll processing"
                  : "Track and manage all employee time entries"
                }
              </p>
            </div>
            <Button onClick={handleAddTimeEntry}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Time Entry
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search time entries..."
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
              ) : filteredTimeEntries && filteredTimeEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {!employeeId && <TableHead>Employee</TableHead>}
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTimeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {formatDateDisplay(entry.entryDate)}
                          {entry.projectAnalyticsId && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              Project Assigned
                            </div>
                          )}
                        </TableCell>
                        {!employeeId && (
                          <TableCell>{getEmployeeName(entry.employeeId)}</TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{entry.description}</div>
                          {entry.billable && (
                            <Badge variant="outline" className="mt-1">Billable</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span>{entry.hoursWorked}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.approved ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-800">
                              Pending
                            </Badge>
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
                                onClick={() => handleEditTimeEntry(entry.id)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleApprovalMutation.mutate({
                                    id: entry.id,
                                    approved: !entry.approved,
                                  })
                                }
                              >
                                {entry.approved ? (
                                  <>
                                    <X className="mr-2 h-4 w-4" />
                                    Remove Approval
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedTimeEntryId(entry.id);
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
                  <h3 className="text-lg font-medium mb-2">No Time Entries Found</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    {searchTerm
                      ? "No time entries match your search criteria. Try a different search term."
                      : employeeId 
                        ? "This employee doesn't have any time entries yet. Add your first time entry to get started."
                        : "No time entries have been recorded yet. Add your first time entry to get started."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleAddTimeEntry}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add First Time Entry
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
                  Are you sure you want to delete this time entry? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-700">
                  Deleting time entries may affect payroll calculations if they have been processed.
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
                    if (selectedTimeEntryId !== null) {
                      deleteTimeEntryMutation.mutate(selectedTimeEntryId);
                    }
                  }}
                  disabled={deleteTimeEntryMutation.isPending}
                >
                  {deleteTimeEntryMutation.isPending ? "Deleting..." : "Delete Time Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}