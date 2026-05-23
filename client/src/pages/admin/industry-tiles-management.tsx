import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Plus, Edit, Trash2, Layers, GripVertical, Image as ImageIcon, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { IndustryTile, Service } from "@shared/schema";

const VALID_CATEGORIES = ["Real Estate & Marketing", "Property Inspections", "Mapping & Modeling"] as const;

interface TileFormData {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  targetPath: string;
  examples: string[];
  displayOrder: number;
  isActive: boolean;
}

export default function IndustryTilesManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [editingTile, setEditingTile] = useState<IndustryTile | null>(null);
  const [selectedTile, setSelectedTile] = useState<IndustryTile | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<TileFormData>({
    slug: "",
    title: "",
    subtitle: "",
    category: "",
    imageUrl: "",
    targetPath: "",
    examples: [],
    displayOrder: 100,
    isActive: true,
  });
  const [examplesText, setExamplesText] = useState("");
  const { toast } = useToast();
  const queryClientHook = useQueryClient();

  const { data: tiles = [], isLoading: tilesLoading } = useQuery<IndustryTile[]>({
    queryKey: ["/api/admin/industry-tiles"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TileFormData) => {
      return apiRequest("POST", "/api/admin/industry-tiles", data);
    },
    onSuccess: () => {
      queryClientHook.invalidateQueries({ queryKey: ["/api/admin/industry-tiles"] });
      queryClientHook.invalidateQueries({ queryKey: ["/api/industry-tiles"] });
      toast({ title: "Success", description: "Industry tile created successfully" });
      handleModalClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TileFormData> }) => {
      return apiRequest("PUT", `/api/admin/industry-tiles/${id}`, data);
    },
    onSuccess: () => {
      queryClientHook.invalidateQueries({ queryKey: ["/api/admin/industry-tiles"] });
      queryClientHook.invalidateQueries({ queryKey: ["/api/industry-tiles"] });
      toast({ title: "Success", description: "Industry tile updated successfully" });
      handleModalClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/industry-tiles/${id}`);
    },
    onSuccess: () => {
      queryClientHook.invalidateQueries({ queryKey: ["/api/admin/industry-tiles"] });
      queryClientHook.invalidateQueries({ queryKey: ["/api/industry-tiles"] });
      toast({ title: "Success", description: "Industry tile deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateServicesMutation = useMutation({
    mutationFn: async ({ tileId, serviceIds }: { tileId: number; serviceIds: number[] }) => {
      const currentServices = await fetch(`/api/admin/industry-tiles/${tileId}/services`).then(r => r.json());
      const currentServiceIds = currentServices.map((s: any) => s.serviceId);
      
      const toAdd = serviceIds.filter(id => !currentServiceIds.includes(id));
      const toRemove = currentServiceIds.filter((id: number) => !serviceIds.includes(id));
      
      for (const serviceId of toRemove) {
        await apiRequest("DELETE", `/api/admin/industry-tiles/${tileId}/services/${serviceId}`);
      }
      
      for (let i = 0; i < toAdd.length; i++) {
        await apiRequest("POST", `/api/admin/industry-tiles/${tileId}/services`, {
          serviceId: toAdd[i],
          displayOrder: (i + 1) * 10,
        });
      }
    },
    onSuccess: () => {
      queryClientHook.invalidateQueries({ queryKey: ["/api/admin/industry-tiles"] });
      toast({ title: "Success", description: "Services updated successfully" });
      setIsServicesModalOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    setEditingTile(null);
    setFormData({
      slug: "",
      title: "",
      subtitle: "",
      category: "",
      imageUrl: "",
      targetPath: "",
      examples: [],
      displayOrder: tiles.length * 10 + 10,
      isActive: true,
    });
    setExamplesText("");
    setIsModalOpen(true);
  };

  const handleEdit = (tile: IndustryTile) => {
    setEditingTile(tile);
    const examples = tile.examples || [];
    setFormData({
      slug: tile.slug,
      title: tile.title,
      subtitle: tile.subtitle || "",
      category: tile.category || "",
      imageUrl: tile.imageUrl || "",
      targetPath: tile.targetPath,
      examples: examples,
      displayOrder: tile.displayOrder || 100,
      isActive: tile.isActive ?? true,
    });
    setExamplesText(examples.join("\n"));
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTile(null);
  };

  const handleManageServices = async (tile: IndustryTile) => {
    setSelectedTile(tile);
    const currentServices = await fetch(`/api/admin/industry-tiles/${tile.id}/services`).then(r => r.json());
    setSelectedServiceIds(currentServices.map((s: any) => s.serviceId));
    setIsServicesModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category && !(VALID_CATEGORIES as readonly string[]).includes(formData.category)) {
      toast({
        title: "Invalid category",
        description: `"${formData.category}" does not match any service category. Please select a valid category from the dropdown or choose None.`,
        variant: "destructive",
      });
      return;
    }
    const examples = examplesText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
    const dataToSubmit = { ...formData, examples };
    if (editingTile) {
      updateMutation.mutate({ id: editingTile.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveServices = () => {
    if (selectedTile) {
      updateServicesMutation.mutate({ tileId: selectedTile.id, serviceIds: selectedServiceIds });
    }
  };

  if (tilesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Industry Tiles Management | Apollo DroneWorks Admin</title>
      </Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="page-title">Industry Tiles Management</h1>
          <p className="text-gray-400 mt-2">
            Manage the industry-focused navigation tiles displayed on the homepage
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-gold text-black hover:bg-gold/90" data-testid="button-create-tile">
          <Plus className="h-4 w-4 mr-2" />
          Create Tile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiles.map((tile: IndustryTile) => (
          <Card key={tile.id} className={`bg-gray-800 border-gray-700 ${!tile.isActive ? 'opacity-50' : ''}`} data-testid={`card-tile-${tile.id}`}>
            <CardHeader className="pb-2">
              {tile.imageUrl && (
                <div className="w-full h-32 rounded-md overflow-hidden mb-3 bg-gray-700">
                  <img 
                    src={tile.imageUrl} 
                    alt={tile.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {tile.category && (
                      <Badge variant="secondary" className="bg-gold/20 text-gold">
                        {tile.category}
                      </Badge>
                    )}
                    {!tile.isActive && (
                      <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-white text-lg mb-1">{tile.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {tile.subtitle}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Slug: {tile.slug}</span>
                <span>Order: {tile.displayOrder}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <a 
                  href={tile.targetPath} 
                  className="flex items-center gap-1 text-gold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tile.targetPath}
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageServices(tile)}
                  className="flex-1 text-gray-400 hover:text-white border-gray-600"
                  data-testid={`button-manage-services-${tile.id}`}
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Services
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(tile)}
                  className="text-gray-400 hover:text-white"
                  data-testid={`button-edit-tile-${tile.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(tile.id)}
                  className="text-red-400 hover:text-red-300"
                  data-testid={`button-delete-tile-${tile.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTile ? "Edit Industry Tile" : "Create Industry Tile"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingTile ? "Update the tile details" : "Create a new industry navigation tile"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-white">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., real-estate"
                  required
                  data-testid="input-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder" className="text-white">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="input-display-order"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., For Realtors"
                required
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle" className="text-white">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Description for the tile..."
                rows={2}
                data-testid="input-subtitle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white">Category Badge</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value === "__none__" ? "" : value })}
              >
                <SelectTrigger
                  id="category"
                  className="bg-gray-700 border-gray-600 text-white"
                  data-testid="select-category"
                >
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="__none__" className="text-gray-400">— None —</SelectItem>
                  {VALID_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-white">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.category && !(VALID_CATEGORIES as readonly string[]).includes(formData.category) && (
                <p className="text-xs text-amber-400" data-testid="category-invalid-warning">
                  Warning: "{formData.category}" is not a recognised category and won't match any service page. Please select a valid option above or choose None.
                </p>
              )}
              {!formData.category || (VALID_CATEGORIES as readonly string[]).includes(formData.category) ? (
                <p className="text-xs text-gray-500">
                  Only the three canonical service categories are available. Choosing a category links this tile to the matching /category/* page.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-white">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://example.com/image.jpg"
                data-testid="input-image-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetPath" className="text-white">Target Path</Label>
              <Input
                id="targetPath"
                value={formData.targetPath}
                onChange={(e) => setFormData({ ...formData, targetPath: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="/industry/real-estate"
                required
                data-testid="input-target-path"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examples" className="text-white">Examples (one per line)</Label>
              <Textarea
                id="examples"
                value={examplesText}
                onChange={(e) => setExamplesText(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Real Estate Photography&#10;Event Coverage&#10;Marketing Videos"
                rows={4}
                data-testid="input-examples"
              />
              <p className="text-xs text-gray-500">Enter each example on a new line. These will be displayed in two columns on the tile.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive" className="text-white">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleModalClose} className="border-gray-600 text-gray-400">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gold text-black hover:bg-gold/90"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-tile"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingTile ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isServicesModalOpen} onOpenChange={setIsServicesModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Manage Services for "{selectedTile?.title}"
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select which services appear on this industry page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {services.map((service: Service) => (
              <div 
                key={service.id} 
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700"
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={selectedServiceIds.includes(service.id)}
                  onCheckedChange={() => handleServiceToggle(service.id)}
                  data-testid={`checkbox-service-${service.id}`}
                />
                <label 
                  htmlFor={`service-${service.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="text-white font-medium">{service.name}</div>
                  <div className="text-sm text-gray-400">{service.description}</div>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsServicesModalOpen(false)} className="border-gray-600 text-gray-400">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveServices}
              className="bg-gold text-black hover:bg-gold/90"
              disabled={updateServicesMutation.isPending}
              data-testid="button-save-services"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateServicesMutation.isPending ? "Saving..." : "Save Services"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
