import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Plus, Edit, Trash2, Package, GripVertical, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Service, ServiceDeliverable } from "@shared/schema";
import { Link } from "wouter";

const deliverableFormSchema = z.object({
  serviceId: z.number().min(1, "Service is required"),
  name: z.string().min(1, "Deliverable name is required"),
  description: z.string().optional(),
  defaultDaysToComplete: z.number().min(1, "Days to complete must be at least 1").default(7),
  displayOrder: z.number().min(0).default(0),
  isRequired: z.boolean().default(true),
  defaultExternalUrlLabel: z.string().optional(),
});

type DeliverableFormData = z.infer<typeof deliverableFormSchema>;

export default function DeliverablesManagement() {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<ServiceDeliverable | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: allDeliverables = [], isLoading: deliverablesLoading } = useQuery<ServiceDeliverable[]>({
    queryKey: ["/api/service-deliverables"],
  });

  const { data: serviceDeliverables = [], isLoading: serviceDeliverablesLoading } = useQuery<ServiceDeliverable[]>({
    queryKey: ["/api/service-deliverables", selectedServiceId],
    queryFn: async () => {
      if (!selectedServiceId) return [];
      const res = await fetch(`/api/service-deliverables?serviceId=${selectedServiceId}`);
      return res.json();
    },
    enabled: !!selectedServiceId,
  });

  const form = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: {
      serviceId: selectedServiceId || 0,
      name: "",
      description: "",
      defaultDaysToComplete: 7,
      displayOrder: 0,
      isRequired: true,
      defaultExternalUrlLabel: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeliverableFormData) => {
      return apiRequest("POST", "/api/admin/service-deliverables", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables", selectedServiceId] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Deliverable created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create deliverable", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DeliverableFormData> }) => {
      return apiRequest("PUT", `/api/admin/service-deliverables/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables", selectedServiceId] });
      setEditingDeliverable(null);
      form.reset();
      toast({ title: "Success", description: "Deliverable updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update deliverable", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/service-deliverables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-deliverables", selectedServiceId] });
      setDeleteConfirmId(null);
      toast({ title: "Success", description: "Deliverable deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete deliverable", variant: "destructive" });
    },
  });

  const onSubmit = (data: DeliverableFormData) => {
    if (editingDeliverable) {
      updateMutation.mutate({ id: editingDeliverable.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (deliverable: ServiceDeliverable) => {
    setEditingDeliverable(deliverable);
    form.reset({
      serviceId: deliverable.serviceId,
      name: deliverable.name,
      description: deliverable.description || "",
      defaultDaysToComplete: deliverable.defaultDaysToComplete || 7,
      displayOrder: deliverable.displayOrder || 0,
      isRequired: deliverable.isRequired ?? true,
      defaultExternalUrlLabel: deliverable.defaultExternalUrlLabel || "",
    });
  };

  const openCreateDialog = () => {
    setEditingDeliverable(null);
    form.reset({
      serviceId: selectedServiceId || 0,
      name: "",
      description: "",
      defaultDaysToComplete: 7,
      displayOrder: serviceDeliverables.length,
      isRequired: true,
      defaultExternalUrlLabel: "",
    });
    setIsCreateDialogOpen(true);
  };

  const getServiceDeliverableCount = (serviceId: number) => {
    return allDeliverables.filter(d => d.serviceId === serviceId).length;
  };

  const selectedService = services?.find(s => s.id === selectedServiceId);

  return (
    <>
      <Helmet>
        <title>Deliverables Management - Apollo DroneWorks Admin</title>
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Service Deliverables Management</h1>
            <p className="text-muted-foreground">
              Configure the deliverables that customers receive for each service
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Services
              </CardTitle>
              <CardDescription>
                Select a service to manage its deliverables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="text-center py-4">Loading services...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {services?.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedServiceId === service.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted border-transparent"
                      }`}
                    >
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <CheckCircle className="h-3 w-3" />
                        {getServiceDeliverableCount(service.id)} deliverables
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {selectedService ? selectedService.name : "Select a Service"}
                </CardTitle>
                <CardDescription>
                  {selectedService
                    ? "Manage the deliverables for this service"
                    : "Choose a service from the list to view and edit its deliverables"}
                </CardDescription>
              </div>
              {selectedService && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deliverable
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedService ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a service from the left to manage its deliverables</p>
                </div>
              ) : serviceDeliverablesLoading ? (
                <div className="text-center py-8">Loading deliverables...</div>
              ) : serviceDeliverables.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deliverables configured for this service yet</p>
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Deliverable
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceDeliverables.map((deliverable, index) => (
                    <div
                      key={deliverable.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {deliverable.name}
                            {deliverable.isRequired && (
                              <Badge variant="secondary" className="text-xs">Required</Badge>
                            )}
                          </div>
                          {deliverable.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {deliverable.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {deliverable.defaultDaysToComplete} days to complete
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(deliverable)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(deliverable.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen || !!editingDeliverable} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingDeliverable(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeliverable ? "Edit Deliverable" : "Add New Deliverable"}
            </DialogTitle>
            <DialogDescription>
              {editingDeliverable
                ? "Update the deliverable details"
                : "Configure a new deliverable for this service"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deliverable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., High-resolution aerial photos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this deliverable includes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultDaysToComplete"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Days to Complete</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated number of days to complete this deliverable
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Order in which this deliverable appears in lists
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Required Deliverable</FormLabel>
                      <FormDescription>
                        Mark this deliverable as required for the service
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultExternalUrlLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default External Link Label (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., "View 3D model on NIRA"'
                        {...field}
                        value={field.value || ""}
                        data-testid="input-default-external-url-label"
                      />
                    </FormControl>
                    <FormDescription>
                      Suggested button label when this deliverable is published with an external shareable link (e.g. NIRA viewer). Admins can override per project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingDeliverable(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingDeliverable ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deliverable</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deliverable? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
