import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  FileText,
  Filter,
  DollarSign,
  MoreHorizontal,
  FileCheck,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface DateRange {
  from: Date;
  to: Date;
}

interface IncomeListProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onEdit: (id: number) => void;
}

export default function IncomeList({ dateRange, onEdit }: IncomeListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Format date range for API query
  const formattedDateRange = {
    startDate: dateRange.from ? dateRange.from.toISOString().split('T')[0] : '',
    endDate: dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''
  };

  // Fetch income data
  const { data: income, isLoading, error } = useQuery<any[]>({
    queryKey: [
      '/api/income',
      {
        ...formattedDateRange,
        query: searchQuery,
        status: statusFilter,
        category: categoryFilter
      }
    ],
    enabled: true
  });
  
  // Delete an income entry
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    
    try {
      await apiRequest('DELETE', `/api/income/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/income'] });
      toast({
        title: "Income entry deleted",
        description: "The income entry has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the income entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  // Format date string to MM/DD/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'paid': "bg-green-100 text-green-800 hover:bg-green-100",
      'pending': "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      'overdue': "bg-red-100 text-red-800 hover:bg-red-100",
      'cancelled': "bg-gray-100 text-gray-800 hover:bg-gray-100",
      'refunded': "bg-purple-100 text-purple-800 hover:bg-purple-100",
      'partially_paid': "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
    
    return statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800 hover:bg-gray-100";
  };

  // Get status display text
  const getStatusText = (status: string) => {
    const statusDisplay: Record<string, string> = {
      'paid': "Paid",
      'pending': "Pending",
      'overdue': "Overdue",
      'cancelled': "Cancelled",
      'refunded': "Refunded",
      'partially_paid': "Partially Paid",
    };
    
    return statusDisplay[status.toLowerCase()] || status;
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Service': "bg-blue-100 text-blue-800 hover:bg-blue-100",
      'Product': "bg-purple-100 text-purple-800 hover:bg-purple-100",
      'Rental': "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
      'Consultation': "bg-orange-100 text-orange-800 hover:bg-orange-100",
      'Training': "bg-amber-100 text-amber-800 hover:bg-amber-100",
      'Processing': "bg-green-100 text-green-800 hover:bg-green-100",
      'Other': "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    
    return colorMap[category] || "bg-gray-100 text-gray-800 hover:bg-gray-100";
  };

  // Status options for filter
  const statuses = [
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'partially_paid', label: 'Partially Paid' },
  ];

  // Categories for filter dropdown
  const categories = [
    { value: 'Service', label: 'Service' },
    { value: 'Product', label: 'Product' },
    { value: 'Rental', label: 'Rental' },
    { value: 'Consultation', label: 'Consultation' },
    { value: 'Training', label: 'Training' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Other', label: 'Other' },
  ];

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Error Loading Income</h3>
        <p className="text-muted-foreground mb-4">
          We encountered an issue while loading your income data. Please try again.
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/income'] })}>
          Retry
        </Button>
      </Card>
    );
  }

  // Empty state
  if (!income?.length) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold mb-2">No Income Found</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery || statusFilter || categoryFilter
            ? "No income entries match your search criteria. Try adjusting your search or filters."
            : "You haven't added any income in this date range yet. Add your first income entry to start tracking your revenue."
          }
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search income..."
            className="pl-8 w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Status</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statuses.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={statusFilter === status.value}
                  onCheckedChange={() => setStatusFilter(
                    statusFilter === status.value ? null : status.value
                  )}
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                Clear Status Filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Category</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.value}
                  checked={categoryFilter === category.value}
                  onCheckedChange={() => setCategoryFilter(
                    categoryFilter === category.value ? null : category.value
                  )}
                >
                  {category.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                Clear Category Filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSearchQuery("");
              setStatusFilter(null);
              setCategoryFilter(null);
            }}
          >
            Clear All
          </Button>

          <div className="text-sm text-muted-foreground">
            Showing {income.length} {income.length !== 1 ? 'entries' : 'entry'}
          </div>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {income.map((incomeItem) => (
              <TableRow key={incomeItem.id}>
                <TableCell>{formatDate(incomeItem.date)}</TableCell>
                <TableCell>{incomeItem.description || '-'}</TableCell>
                <TableCell>{incomeItem.client || '-'}</TableCell>
                <TableCell>
                  {incomeItem.category ? (
                    <Badge className={getCategoryColor(incomeItem.category)}>
                      {incomeItem.category}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {incomeItem.status ? (
                    <Badge className={getStatusBadge(incomeItem.status)}>
                      {getStatusText(incomeItem.status)}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatCurrency(incomeItem.amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(incomeItem.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(incomeItem.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      
                      {incomeItem.invoiceId && (
                        <DropdownMenuItem>
                          <FileCheck className="mr-2 h-4 w-4" />
                          View Invoice
                        </DropdownMenuItem>
                      )}
                      
                      {incomeItem.bookingId && (
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Booking
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 p-4 bg-muted rounded-md flex justify-between items-center">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
          <span className="text-sm font-medium">Total Income:</span>
        </div>
        <span className="font-bold text-green-600">
          {formatCurrency(
            income.reduce((sum, incomeItem) => sum + Number(incomeItem.amount), 0)
          )}
        </span>
      </div>
    </Card>
  );
}