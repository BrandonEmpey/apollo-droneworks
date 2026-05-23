import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Addon {
  id: number;
  name: string;
  description: string;
  tooltipDescription: string;
  price: number;
  pricingType: string;
  percentage: number | null;
  isActive: boolean;
  displayOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function AddonsManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: addons = [], isLoading } = useQuery<Addon[]>({
    queryKey: ["/api/addons"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/addons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addons"] });
      toast({
        title: "Success",
        description: "Add-on deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingAddon(null);
    setIsModalOpen(true);
  };

  const handleEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAddon(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Add-ons Management | Apollo DroneWorks Admin</title>
      </Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Add-ons Management</h1>
          <p className="text-gray-400 mt-2">
            Manage add-on services that can be included with main services
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-gold text-black hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Add-on
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {addons.map((addon: Addon) => (
          <Card key={addon.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-white text-lg mb-2">{addon.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {addon.description}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(addon)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(addon.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-gold">
                      {addon.pricingType === "percentage" 
                        ? `${addon.percentage}%` 
                        : `$${(addon.price / 100).toFixed(2)}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {addon.pricingType === "percentage" ? "Percentage-based" : "Fixed price"}
                    </span>
                  </div>
                  <Badge variant={addon.isActive ? "default" : "secondary"} className={addon.isActive ? "bg-green-600" : "bg-gray-600"}>
                    {addon.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Package className="h-4 w-4" />
                  <span>Order: {addon.displayOrder}</span>
                </div>
                
                <div className="bg-gray-700 p-3 rounded">
                  <p className="text-xs text-gray-300 font-medium mb-1">Tooltip:</p>
                  <p className="text-sm text-gray-400">{addon.tooltipDescription}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Modal */}
      {isModalOpen && (
        <AddonModal
          addon={editingAddon}
          onClose={handleModalClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/addons"] });
            handleModalClose();
          }}
        />
      )}
    </div>
  );
}

// Simple custom modal component with guaranteed scrolling
function AddonModal({
  addon,
  onClose,
  onSuccess,
}: {
  addon: Addon | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: addon?.name || "",
    description: addon?.description || "",
    tooltipDescription: addon?.tooltipDescription || "",
    price: addon ? addon.price / 100 : 0,
    pricingType: addon?.pricingType || "fixed",
    percentage: addon?.percentage || 0,
    isActive: addon?.isActive ?? true,
    displayOrder: addon?.displayOrder || 999,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        price: Math.round(formData.price * 100), // Convert to cents
      };

      if (addon) {
        await apiRequest("PUT", `/api/addons/${addon.id}`, submitData);
        toast({ title: "Success", description: "Add-on updated successfully" });
      } else {
        await apiRequest("POST", "/api/addons", submitData);
        toast({ title: "Success", description: "Add-on created successfully" });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4">
      <div 
        className="bg-gray-900 rounded-lg w-full max-w-2xl border border-gray-700"
        style={{ 
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">
                {addon ? "Edit Add-on" : "Create New Add-on"}
              </h2>
              <p className="text-gray-400 mt-1">
                {addon ? "Update the add-on details" : "Add a new service add-on"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 p-6 overflow-y-auto"
          style={{ 
            minHeight: 0 // Important for flexbox scrolling
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Add-on Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                placeholder="e.g., Weekend Delivery"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                rows={3}
                placeholder="Brief description of the add-on service"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tooltip Description
              </label>
              <input
                type="text"
                value={formData.tooltipDescription}
                onChange={(e) => setFormData({ ...formData, tooltipDescription: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                placeholder="Short description for tooltip"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Pricing Type
              </label>
              <select
                value={formData.pricingType}
                onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
              >
                <option value="fixed">Fixed Price</option>
                <option value="percentage">Percentage of Service Price</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                  style={{ color: 'white' }}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                  style={{ color: 'white' }}
                  min="0"
                  max="1000"
                  disabled={formData.pricingType !== "percentage"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 999 })}
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                  style={{ color: 'white' }}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Status
                </label>
                <select
                  value={formData.isActive ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                  className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 rounded-md px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>


          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gold text-black hover:bg-gold/90"
          >
            {isSubmitting ? "Saving..." : addon ? "Update Add-on" : "Create Add-on"}
          </Button>
        </div>
      </div>
    </div>
  );
}