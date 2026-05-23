import * as React from "react";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Users, 
  UserCheck, 
  FileText,
  DollarSign,
  History,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Clock,
  Shield
} from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertTrustEntitySchema,
  insertTrustAssetSchema,
  insertTrustTrusteeSchema,
  insertTrustBeneficiarySchema,
  insertTrustDistributionSchema,
  type TrustEntity,
  type TrustAsset,
  type TrustAssetHistory,
  type TrustTrustee,
  type TrustBeneficiary,
  type TrustDistribution
} from "@shared/schema";

// Types are now imported from @shared/schema.ts

// Schemas are now imported from @shared/schema.ts

export default function TrustAdministration() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("entities");
  const [selectedTrust, setSelectedTrust] = useState<number | null>(null);

  const [showEntityDialog, setShowEntityDialog] = useState(false);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showTrusteeDialog, setShowTrusteeDialog] = useState(false);
  const [showBeneficiaryDialog, setShowBeneficiaryDialog] = useState(false);
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TrustEntity | null>(null);
  const [editingAsset, setEditingAsset] = useState<TrustAsset | null>(null);
  const [editingTrustee, setEditingTrustee] = useState<TrustTrustee | null>(null);
  const [editingBeneficiary, setEditingBeneficiary] = useState<TrustBeneficiary | null>(null);
  const [editingDistribution, setEditingDistribution] = useState<TrustDistribution | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Queries
  const { data: trustEntities, isLoading: entitiesLoading } = useQuery<TrustEntity[]>({
    queryKey: ['/api/trust-entities']
  });

  const { data: trustAssets, isLoading: assetsLoading } = useQuery<TrustAsset[]>({
    queryKey: ['/api/trust-assets', selectedTrust],
    queryFn: () => fetch(`/api/trust-assets${selectedTrust ? `?trustId=${selectedTrust}` : ''}`).then(r => r.json())
  });

  const { data: assetHistory } = useQuery<TrustAssetHistory[]>({
    queryKey: ['/api/trust-asset-history', selectedTrust],
    queryFn: () => selectedTrust ? fetch(`/api/trust-asset-history/${selectedTrust}`).then(r => r.json()) : [],
    enabled: !!selectedTrust
  });

  const { data: trustTrustees, isLoading: trusteesLoading } = useQuery<TrustTrustee[]>({
    queryKey: ['/api/trust-trustees', selectedTrust],
    queryFn: () => fetch(`/api/trust-trustees${selectedTrust ? `?trustId=${selectedTrust}` : ''}`).then(r => r.json()),
    enabled: !!selectedTrust
  });

  const { data: trustBeneficiaries, isLoading: beneficiariesLoading } = useQuery<TrustBeneficiary[]>({
    queryKey: ['/api/trust-beneficiaries', selectedTrust],
    queryFn: () => fetch(`/api/trust-beneficiaries${selectedTrust ? `?trustId=${selectedTrust}` : ''}`).then(r => r.json()),
    enabled: !!selectedTrust
  });

  const { data: trustDistributions, isLoading: distributionsLoading } = useQuery<TrustDistribution[]>({
    queryKey: ['/api/trust-distributions', selectedTrust],
    queryFn: () => fetch(`/api/trust-distributions${selectedTrust ? `?trustId=${selectedTrust}` : ''}`).then(r => r.json()),
    enabled: !!selectedTrust
  });

  // Auto-select first trust when trust entities are loaded
  useEffect(() => {
    if (trustEntities && trustEntities.length > 0 && !selectedTrust) {
      setSelectedTrust(trustEntities[0].id);
    }
  }, [trustEntities, selectedTrust]);

  // Trust Entity Form
  const entityForm = useForm({
    resolver: zodResolver(insertTrustEntitySchema),
    defaultValues: {
      name: "",
      type: "family",
      establishmentDate: "",
      jurisdiction: "",
      taxId: "",
      status: "active",
      purpose: "",
      termConditions: "",
      governingLaw: "",
      notes: ""
    }
  });

  // Trust Asset Form
  const assetForm = useForm({
    resolver: zodResolver(insertTrustAssetSchema),
    defaultValues: {
      trustId: selectedTrust || undefined,
      assetType: "real_estate",
      assetName: "",
      description: "",
      acquisitionDate: "",
      acquisitionValue: undefined,
      currentValue: undefined,
      valuationDate: "",
      valuationMethod: "",
      assetIdentifier: "",
      location: "",
      custodian: "",
      generatesincome: false,
      incomeFrequency: "",
      lastIncomeDate: "",
      isDepreciable: false,
      depreciationMethod: "",
      depreciationRate: undefined,
      notes: "",
      changeReason: ""
    }
  });

  const trusteeForm = useForm({
    resolver: zodResolver(insertTrustTrusteeSchema.extend({
      appointmentDate: z.string().min(1, "Appointment date is required")
    })),
    defaultValues: {
      trustId: selectedTrust || undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      trusteeType: "individual",
      roleDescription: "",
      appointmentDate: "",
      terminationDate: "",
      notes: ""
    }
  });

  const beneficiaryForm = useForm({
    resolver: zodResolver(insertTrustBeneficiarySchema),
    defaultValues: {
      trustId: selectedTrust || undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      dateOfBirth: "",
      beneficiaryType: "primary",
      relationshipToTrustor: "",
      notes: ""
    }
  });

  const distributionForm = useForm({
    resolver: zodResolver(insertTrustDistributionSchema),
    defaultValues: {
      trustId: selectedTrust || undefined,
      beneficiaryId: undefined,
      distributionDate: "",
      distributionType: "income",
      amount: undefined,
      description: "",
      purpose: "",
      paymentMethod: "check",
      checkNumber: "",
      taxYear: undefined,
      notes: ""
    }
  });

  // Mutations
  const createEntityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trust-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trust entity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-entities'] });
      setShowEntityDialog(false);
      entityForm.reset();
      toast({ title: "Trust entity created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating trust entity", description: error.message, variant: "destructive" });
    }
  });

  const updateEntityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/trust-entities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update trust entity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-entities'] });
      setShowEntityDialog(false);
      setEditingEntity(null);
      entityForm.reset();
      toast({ title: "Trust entity updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating trust entity", description: error.message, variant: "destructive" });
    }
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trust-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trust asset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-assets', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['/api/trust-asset-history', selectedTrust] });
      setShowAssetDialog(false);
      assetForm.reset();
      toast({ title: "Trust asset added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding trust asset", description: error.message, variant: "destructive" });
    }
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/trust-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update trust asset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-assets', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['/api/trust-asset-history', selectedTrust] });
      setShowAssetDialog(false);
      setEditingAsset(null);
      assetForm.reset();
      toast({ title: "Trust asset updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating trust asset", description: error.message, variant: "destructive" });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async ({ id, changeReason }: { id: number, changeReason?: string }) => {
      const response = await fetch(`/api/trust-assets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeReason })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove trust asset');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-assets', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['/api/trust-asset-history', selectedTrust] });
      toast({ title: "Trust asset removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing trust asset", description: error.message, variant: "destructive" });
    }
  });

  // Trustee mutations
  const createTrusteeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trust-trustees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trustee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-trustees', selectedTrust] });
      setShowTrusteeDialog(false);
      trusteeForm.reset();
      toast({ title: "Trustee added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding trustee", description: error.message, variant: "destructive" });
    }
  });

  const updateTrusteeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/trust-trustees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update trustee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-trustees', selectedTrust] });
      setShowTrusteeDialog(false);
      setEditingTrustee(null);
      trusteeForm.reset();
      toast({ title: "Trustee updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating trustee", description: error.message, variant: "destructive" });
    }
  });

  const deleteTrusteeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trust-trustees/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove trustee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-trustees', selectedTrust] });
      toast({ title: "Trustee removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing trustee", description: error.message, variant: "destructive" });
    }
  });

  // Beneficiary mutations
  const createBeneficiaryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trust-beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create beneficiary');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-beneficiaries', selectedTrust] });
      setShowBeneficiaryDialog(false);
      beneficiaryForm.reset();
      toast({ title: "Beneficiary added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding beneficiary", description: error.message, variant: "destructive" });
    }
  });

  const updateBeneficiaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/trust-beneficiaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update beneficiary');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-beneficiaries', selectedTrust] });
      setShowBeneficiaryDialog(false);
      setEditingBeneficiary(null);
      beneficiaryForm.reset();
      toast({ title: "Beneficiary updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating beneficiary", description: error.message, variant: "destructive" });
    }
  });

  const deleteBeneficiaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trust-beneficiaries/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove beneficiary');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-beneficiaries', selectedTrust] });
      toast({ title: "Beneficiary removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing beneficiary", description: error.message, variant: "destructive" });
    }
  });

  // Distribution mutations
  const createDistributionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/trust-distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create distribution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-distributions', selectedTrust] });
      setShowDistributionDialog(false);
      distributionForm.reset();
      toast({ title: "Distribution recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error recording distribution", description: error.message, variant: "destructive" });
    }
  });

  const updateDistributionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/trust-distributions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update distribution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-distributions', selectedTrust] });
      setShowDistributionDialog(false);
      setEditingDistribution(null);
      distributionForm.reset();
      toast({ title: "Distribution updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating distribution", description: error.message, variant: "destructive" });
    }
  });

  const deleteDistributionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trust-distributions/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove distribution');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trust-distributions', selectedTrust] });
      toast({ title: "Distribution removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error removing distribution", description: error.message, variant: "destructive" });
    }
  });

  // Form handlers
  const onSubmitEntity = (data: any) => {
    if (editingEntity) {
      updateEntityMutation.mutate({ id: editingEntity.id, data });
    } else {
      createEntityMutation.mutate(data);
    }
  };

  const onSubmitAsset = (data: any) => {
    // Clean date fields - convert empty strings to null
    const cleanedData = {
      ...data,
      acquisitionDate: data.acquisitionDate || null,
      valuationDate: data.valuationDate || null,
      lastIncomeDate: data.lastIncomeDate || null
    };
    
    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, data: cleanedData });
    } else {
      createAssetMutation.mutate(cleanedData);
    }
  };

  const openEntityDialog = (entity?: TrustEntity) => {
    if (entity) {
      setEditingEntity(entity);
      entityForm.reset({
        name: entity.name,
        type: entity.type,
        establishmentDate: entity.establishmentDate,
        jurisdiction: entity.jurisdiction,
        taxId: entity.taxId || "",
        status: entity.status,
        purpose: entity.purpose || "",
        termConditions: entity.termConditions || "",
        governingLaw: entity.governingLaw || "",
        notes: entity.notes || ""
      });
    } else {
      setEditingEntity(null);
      entityForm.reset();
    }
    setShowEntityDialog(true);
  };

  const openAssetDialog = (asset?: TrustAsset) => {
    if (asset) {
      setEditingAsset(asset);
      assetForm.reset({
        trustId: asset.trustId,
        assetType: asset.assetType,
        assetName: asset.assetName,
        description: asset.description || "",
        acquisitionDate: asset.acquisitionDate ?? undefined,
        acquisitionValue: asset.acquisitionValue ? asset.acquisitionValue : undefined,
        currentValue: asset.currentValue ? asset.currentValue : undefined,
        valuationDate: asset.valuationDate ?? undefined,
        valuationMethod: asset.valuationMethod || "",
        assetIdentifier: asset.assetIdentifier || "",
        location: asset.location || "",
        custodian: asset.custodian || "",
        generatesincome: asset.generatesincome || false,
        incomeFrequency: asset.incomeFrequency || "",
        lastIncomeDate: asset.lastIncomeDate ?? undefined,
        isDepreciable: asset.isDepreciable || false,
        depreciationMethod: asset.depreciationMethod || "",
        depreciationRate: asset.depreciationRate ? asset.depreciationRate : undefined,
        notes: asset.notes || "",
        changeReason: ""
      });
    } else {
      setEditingAsset(null);
      assetForm.reset({
        trustId: selectedTrust || 0,
        assetType: "real_estate",
        assetName: "",
        description: "",
        acquisitionDate: "",
        acquisitionValue: undefined,
        currentValue: undefined,
        valuationDate: "",
        valuationMethod: "",
        assetIdentifier: "",
        location: "",
        custodian: "",
        generatesincome: false,
        incomeFrequency: "",
        lastIncomeDate: "",
        isDepreciable: false,
        depreciationMethod: "",
        depreciationRate: undefined,
        notes: "",
        changeReason: ""
      });
    }
    setShowAssetDialog(true);
  };

  const handleDeleteAsset = (assetId: number) => {
    const changeReason = window.prompt("Please provide a reason for removing this asset:");
    if (changeReason !== null) {
      deleteAssetMutation.mutate({ id: assetId, changeReason });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trust Administration - Apollo DroneWorks</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Trust Administration
          </h1>
          <p className="text-muted-foreground">
            Comprehensive trust management with complete audit history and bidirectional data synchronization
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="entities" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Trust Entities
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Schedule of Assets
            </TabsTrigger>
            <TabsTrigger value="trustees" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Trustees
            </TabsTrigger>
            <TabsTrigger value="beneficiaries" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Beneficiaries
            </TabsTrigger>
            <TabsTrigger value="distributions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Distributions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit History
            </TabsTrigger>
          </TabsList>

          {/* Trust Entities Tab */}
          <TabsContent value="entities" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Trust Entities Management</h2>
              <Button onClick={() => openEntityDialog()} data-testid="button-create-trust-entity">
                <Plus className="h-4 w-4 mr-2" />
                Create Trust Entity
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {entitiesLoading ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Loading trust entities...
                </div>
              ) : trustEntities && trustEntities.length > 0 ? (
                trustEntities.map((entity: TrustEntity) => (
                  <Card key={entity.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{entity.name}</CardTitle>
                          <CardDescription>
                            {entity.type} trust • {entity.jurisdiction}
                          </CardDescription>
                        </div>
                        <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
                          {entity.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">
                          Established: {new Date(entity.establishmentDate).toLocaleDateString()}
                        </p>
                        {entity.purpose && (
                          <p className="text-sm">{entity.purpose}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTrust(entity.id);
                            setActiveTab("assets");
                          }}
                          data-testid={`button-select-trust-${entity.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Assets
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEntityDialog(entity)}
                          data-testid={`button-edit-trust-${entity.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No trust entities found. Create your first trust entity to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Schedule of Assets Tab - The Key Feature */}
          <TabsContent value="assets" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Schedule of Assets</h2>
                <p className="text-muted-foreground">
                  {selectedTrust ? `Viewing assets for trust ID ${selectedTrust}` : 'Select a trust entity to manage assets'}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedTrust && (
                  <Button onClick={() => openAssetDialog()} data-testid="button-add-asset">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                )}
                <Select value={selectedTrust?.toString() || ""} onValueChange={(value) => setSelectedTrust(parseInt(value))}>
                  <SelectTrigger className="w-[200px]" data-testid="select-trust">
                    <SelectValue placeholder="Select Trust" />
                  </SelectTrigger>
                  <SelectContent>
                    {trustEntities && trustEntities.map((entity: TrustEntity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTrust ? (
              <div className="space-y-4">
                {assetsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading assets...
                  </div>
                ) : trustAssets && trustAssets.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {trustAssets.map((asset: TrustAsset) => (
                      <Card key={asset.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{asset.assetName}</CardTitle>
                              <CardDescription>
                                {asset.assetType?.replace('_', ' ')} • ${asset.currentValue ? parseInt(asset.currentValue).toLocaleString() : 'N/A'}
                              </CardDescription>
                            </div>
                            <Badge variant="outline">
                              {asset.assetType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 mb-4">
                            {asset.description && (
                              <p className="text-sm text-muted-foreground">{asset.description}</p>
                            )}
                            {asset.location && (
                              <p className="text-sm">Location: {asset.location}</p>
                            )}
                            {asset.custodian && (
                              <p className="text-sm">Custodian: {asset.custodian}</p>
                            )}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              {asset.generatesincome && <span>Income Generating</span>}
                              {asset.isDepreciable && <span>Depreciable</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssetDialog(asset)}
                              data-testid={`button-edit-asset-${asset.id}`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAsset(asset.id)}
                              data-testid={`button-delete-asset-${asset.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No assets found for this trust. Add assets to begin building the schedule.
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Trust Entity</h3>
                  <p className="text-muted-foreground">
                    Choose a trust entity from the dropdown above to view and manage its assets
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Asset Audit History</h2>
              <Select value={selectedTrust?.toString() || ""} onValueChange={(value) => setSelectedTrust(parseInt(value))}>
                <SelectTrigger className="w-[200px]" data-testid="select-trust-history">
                  <SelectValue placeholder="Select Trust" />
                </SelectTrigger>
                <SelectContent>
                  {trustEntities && trustEntities.map((entity: TrustEntity) => (
                    <SelectItem key={entity.id} value={entity.id.toString()}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTrust ? (
              <div className="space-y-4">
                {assetHistory && assetHistory.length > 0 ? (
                  <div className="space-y-4">
                    {assetHistory.map((entry: TrustAssetHistory) => (
                      <Card key={entry.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {entry.assetName}
                              </CardTitle>
                              <CardDescription>
                                {entry.changeDescription}
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                entry.actionType === 'added' ? 'default' :
                                entry.actionType === 'updated' ? 'secondary' :
                                'destructive'
                              }>
                                {entry.actionType}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(entry.actionDate).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Asset Type:</span> {entry.assetType?.replace('_', ' ') || 'Unknown'}
                            </div>
                            <div>
                              <span className="font-medium">Asset Value:</span> ${entry.assetValue ? parseInt(entry.assetValue).toLocaleString() : 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Action By:</span> User {entry.actionBy}
                            </div>
                          </div>
                          {entry.changeReason && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <span className="font-medium text-sm">Reason:</span>
                              <p className="text-sm mt-1">{entry.changeReason}</p>
                            </div>
                          )}
                          {entry.notes && (
                            <div className="mt-3">
                              <span className="font-medium text-sm">Notes:</span>
                              <p className="text-sm mt-1">{entry.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit history found for this trust.
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Trust Entity</h3>
                  <p className="text-muted-foreground">
                    Choose a trust entity to view its complete audit history
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Placeholder tabs for future development */}
          <TabsContent value="trustees" className="space-y-6">
            {!selectedTrust ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a trust entity to manage trustees
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trust Trustees</CardTitle>
                      <CardDescription>
                        Manage individuals and organizations serving as trustees
                      </CardDescription>
                    </div>
                    <Button onClick={() => {
                      setEditingTrustee(null);
                      trusteeForm.reset({
                        trustId: selectedTrust,
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        address: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: "",
                        trusteeType: "individual",
                        roleDescription: "",
                        appointmentDate: "",
                        terminationDate: "",
                        notes: ""
                      });
                      setShowTrusteeDialog(true);
                    }} className="flex items-center gap-2" data-testid="button-add-trustee">
                      <Plus className="h-4 w-4" />
                      Add Trustee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {trusteesLoading ? (
                    <div className="text-center py-8">Loading trustees...</div>
                  ) : !trustTrustees || trustTrustees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No trustees found. Add a trustee to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trustTrustees.map((trustee) => (
                        <div key={trustee.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`trustee-${trustee.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <h4 className="font-medium">{trustee.firstName} {trustee.lastName}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{trustee.trusteeType} Trustee</p>
                              </div>
                              {trustee.email && (
                                <div className="text-sm text-muted-foreground">
                                  {trustee.email}
                                </div>
                              )}
                              {trustee.appointmentDate && (
                                <div className="text-sm text-muted-foreground">
                                  Appointed: {new Date(trustee.appointmentDate).toLocaleDateString()}
                                </div>
                              )}
                              <Badge variant={trustee.isActive ? "default" : "secondary"}>
                                {trustee.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {trustee.roleDescription && (
                              <p className="text-sm text-muted-foreground mt-2">{trustee.roleDescription}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingTrustee(trustee);
                              trusteeForm.reset({
                                trustId: trustee.trustId,
                                firstName: trustee.firstName || "",
                                lastName: trustee.lastName || "",
                                email: trustee.email || "",
                                phone: trustee.phone || "",
                                address: trustee.address || "",
                                city: trustee.city || "",
                                state: trustee.state || "",
                                postalCode: trustee.postalCode || "",
                                country: trustee.country || "",
                                trusteeType: trustee.trusteeType,
                                roleDescription: trustee.roleDescription || "",
                                appointmentDate: trustee.appointmentDate,
                                terminationDate: trustee.terminationDate || "",
                                notes: trustee.notes || ""
                              });
                              setShowTrusteeDialog(true);
                            }} data-testid={`button-edit-trustee-${trustee.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              if (confirm('Are you sure you want to remove this trustee?')) {
                                deleteTrusteeMutation.mutate(trustee.id);
                              }
                            }} data-testid={`button-delete-trustee-${trustee.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="beneficiaries" className="space-y-6">
            {!selectedTrust ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a trust entity to manage beneficiaries
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trust Beneficiaries</CardTitle>
                      <CardDescription>
                        Manage individuals who receive distributions from the trust
                      </CardDescription>
                    </div>
                    <Button onClick={() => {
                      setEditingBeneficiary(null);
                      beneficiaryForm.reset({
                        trustId: selectedTrust,
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        address: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: "",
                        dateOfBirth: "",
                        beneficiaryType: "primary",
                        relationshipToTrustor: "",
                        notes: ""
                      });
                      setShowBeneficiaryDialog(true);
                    }} className="flex items-center gap-2" data-testid="button-add-beneficiary">
                      <Plus className="h-4 w-4" />
                      Add Beneficiary
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {beneficiariesLoading ? (
                    <div className="text-center py-8">Loading beneficiaries...</div>
                  ) : !trustBeneficiaries || trustBeneficiaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No beneficiaries found. Add a beneficiary to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trustBeneficiaries.map((beneficiary) => (
                        <div key={beneficiary.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`beneficiary-${beneficiary.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div>
                                <h4 className="font-medium">{beneficiary.firstName} {beneficiary.lastName}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{beneficiary.beneficiaryType} Beneficiary</p>
                              </div>
                              {beneficiary.email && (
                                <div className="text-sm text-muted-foreground">
                                  {beneficiary.email}
                                </div>
                              )}
                              {beneficiary.relationshipToTrustor && (
                                <div className="text-sm text-muted-foreground">
                                  {beneficiary.relationshipToTrustor}
                                </div>
                              )}
                              <Badge variant={beneficiary.isActive ? "default" : "secondary"}>
                                {beneficiary.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingBeneficiary(beneficiary);
                              beneficiaryForm.reset({
                                trustId: beneficiary.trustId,
                                firstName: beneficiary.firstName || "",
                                lastName: beneficiary.lastName || "",
                                email: beneficiary.email || "",
                                phone: beneficiary.phone || "",
                                address: beneficiary.address || "",
                                city: beneficiary.city || "",
                                state: beneficiary.state || "",
                                postalCode: beneficiary.postalCode || "",
                                country: beneficiary.country || "",
                                dateOfBirth: beneficiary.dateOfBirth || "",
                                beneficiaryType: beneficiary.beneficiaryType,
                                relationshipToTrustor: beneficiary.relationshipToTrustor || "",
                                notes: beneficiary.notes || ""
                              });
                              setShowBeneficiaryDialog(true);
                            }} data-testid={`button-edit-beneficiary-${beneficiary.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              if (confirm('Are you sure you want to remove this beneficiary?')) {
                                deleteBeneficiaryMutation.mutate(beneficiary.id);
                              }
                            }} data-testid={`button-delete-beneficiary-${beneficiary.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="distributions" className="space-y-6">
            {!selectedTrust ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a trust entity to manage distributions
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trust Distributions</CardTitle>
                      <CardDescription>
                        Track and record distributions made to beneficiaries
                      </CardDescription>
                    </div>
                    <Button onClick={() => {
                      setEditingDistribution(null);
                      distributionForm.reset({
                        trustId: selectedTrust,
                        beneficiaryId: undefined,
                        distributionDate: "",
                        distributionType: "income",
                        amount: undefined,
                        description: "",
                        purpose: "",
                        paymentMethod: "check",
                        checkNumber: "",
                        taxYear: undefined,
                        notes: ""
                      });
                      setShowDistributionDialog(true);
                    }} className="flex items-center gap-2" data-testid="button-add-distribution">
                      <Plus className="h-4 w-4" />
                      Record Distribution
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {distributionsLoading ? (
                    <div className="text-center py-8">Loading distributions...</div>
                  ) : !trustDistributions || trustDistributions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No distributions found. Record a distribution to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trustDistributions.map((distribution) => {
                        const beneficiary = trustBeneficiaries?.find(b => b.id === distribution.beneficiaryId);
                        return (
                          <div key={distribution.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`distribution-${distribution.id}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <div>
                                  <h4 className="font-medium">${distribution.amount}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}` : 'Unknown Beneficiary'}
                                  </p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(distribution.distributionDate).toLocaleDateString()}
                                </div>
                                <Badge variant="outline" className="capitalize">
                                  {distribution.distributionType}
                                </Badge>
                                {distribution.paymentMethod && (
                                  <div className="text-sm text-muted-foreground capitalize">
                                    {distribution.paymentMethod}
                                  </div>
                                )}
                              </div>
                              {distribution.description && (
                                <p className="text-sm text-muted-foreground mt-2">{distribution.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditingDistribution(distribution);
                                distributionForm.reset({
                                  trustId: distribution.trustId,
                                  beneficiaryId: undefined,
                                  distributionDate: distribution.distributionDate,
                                  distributionType: distribution.distributionType,
                                  amount: undefined,
                                  description: distribution.description || "",
                                  purpose: distribution.purpose || "",
                                  paymentMethod: distribution.paymentMethod || "check",
                                  checkNumber: distribution.checkNumber || "",
                                  taxYear: undefined,
                                  notes: distribution.notes || ""
                                });
                                setShowDistributionDialog(true);
                              }} data-testid={`button-edit-distribution-${distribution.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => {
                                if (confirm('Are you sure you want to remove this distribution record?')) {
                                  deleteDistributionMutation.mutate(distribution.id);
                                }
                              }} data-testid={`button-delete-distribution-${distribution.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Trust Entity Dialog */}
        <Dialog open={showEntityDialog} onOpenChange={setShowEntityDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntity ? "Edit Trust Entity" : "Create Trust Entity"}
              </DialogTitle>
              <DialogDescription>
                {editingEntity ? "Update the trust entity information" : "Create a new trust entity with the required information"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...entityForm}>
              <form onSubmit={entityForm.handleSubmit(onSubmitEntity)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={entityForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trust Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Family Trust Name" {...field} data-testid="input-trust-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={entityForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trust Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-trust-type">
                              <SelectValue placeholder="Select trust type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="family">Family Trust</SelectItem>
                            <SelectItem value="charitable">Charitable Trust</SelectItem>
                            <SelectItem value="business">Business Trust</SelectItem>
                            <SelectItem value="revocable">Revocable Trust</SelectItem>
                            <SelectItem value="irrevocable">Irrevocable Trust</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={entityForm.control}
                    name="establishmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Establishment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-establishment-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={entityForm.control}
                    name="jurisdiction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jurisdiction</FormLabel>
                        <FormControl>
                          <Input placeholder="State/Province" {...field} data-testid="input-jurisdiction" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={entityForm.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="EIN or Tax ID" {...field} data-testid="input-tax-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={entityForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-trust-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={entityForm.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trust Purpose (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the purpose and objectives of this trust" 
                          {...field} 
                          data-testid="textarea-trust-purpose"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={entityForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes or comments" 
                          {...field} 
                          data-testid="textarea-trust-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEntityDialog(false)}
                    data-testid="button-cancel-entity"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEntityMutation.isPending || updateEntityMutation.isPending}
                    data-testid="button-submit-entity"
                  >
                    {editingEntity ? "Update" : "Create"} Trust Entity
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Trust Asset Dialog */}
        <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Edit Trust Asset" : "Add Trust Asset"}
              </DialogTitle>
              <DialogDescription>
                {editingAsset ? "Update the asset information with change tracking" : "Add a new asset to the trust with complete audit trail"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...assetForm}>
              <form onSubmit={assetForm.handleSubmit(onSubmitAsset)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={assetForm.control}
                    name="assetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset name" {...field} data-testid="input-asset-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assetForm.control}
                    name="assetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asset-type">
                              <SelectValue placeholder="Select asset type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="real_estate">Real Estate</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="securities">Securities</SelectItem>
                            <SelectItem value="business_interest">Business Interest</SelectItem>
                            <SelectItem value="personal_property">Personal Property</SelectItem>
                            <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assetForm.control}
                    name="currentValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50000" {...field} data-testid="input-current-value" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={assetForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed description of the asset" 
                          {...field} 
                          data-testid="textarea-asset-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={assetForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Asset location" {...field} data-testid="input-asset-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assetForm.control}
                    name="custodian"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custodian (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Custodian name" {...field} data-testid="input-asset-custodian" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assetForm.control}
                    name="assetIdentifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Identifier (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ID, Serial, or Account #" {...field} data-testid="input-asset-identifier" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {editingAsset && (
                  <FormField
                    control={assetForm.control}
                    name="changeReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Change</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Explain why this asset is being modified" 
                            {...field} 
                            data-testid="textarea-change-reason"
                          />
                        </FormControl>
                        <FormDescription>
                          This will be recorded in the audit history
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssetDialog(false)}
                    data-testid="button-cancel-asset"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                    data-testid="button-submit-asset"
                  >
                    {editingAsset ? "Update" : "Add"} Asset
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Trustee Dialog */}
        <Dialog open={showTrusteeDialog} onOpenChange={setShowTrusteeDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTrustee ? "Edit Trustee" : "Add Trustee"}
              </DialogTitle>
              <DialogDescription>
                {editingTrustee ? "Update trustee information" : "Add a new trustee to the trust"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...trusteeForm}>
              <form onSubmit={trusteeForm.handleSubmit((data) => {
                // Convert empty date strings to null for database compatibility
                // Note: appointmentDate is required by the database schema
                const processedData = {
                  ...data,
                  terminationDate: data.terminationDate || null
                };
                
                if (editingTrustee) {
                  updateTrusteeMutation.mutate({ id: editingTrustee.id, data: processedData });
                } else {
                  createTrusteeMutation.mutate(processedData);
                }
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={trusteeForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} data-testid="input-trustee-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} data-testid="input-trustee-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-trustee-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} data-testid="input-trustee-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="trusteeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trustee Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-trustee-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                            <SelectItem value="successor">Successor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-trustee-appointment-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={trusteeForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} data-testid="input-trustee-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={trusteeForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-trustee-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} data-testid="input-trustee-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={trusteeForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} data-testid="input-trustee-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={trusteeForm.control}
                  name="roleDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the trustee's role and responsibilities" {...field} data-testid="input-trustee-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={trusteeForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Additional notes about this trustee"
                          className="w-full p-2 border rounded-md"
                          rows={3}
                          {...field}
                          data-testid="textarea-trustee-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowTrusteeDialog(false)}
                    data-testid="button-cancel-trustee"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTrusteeMutation.isPending || updateTrusteeMutation.isPending}
                    data-testid="button-submit-trustee"
                  >
                    {editingTrustee ? "Update" : "Add"} Trustee
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Beneficiary Dialog */}
        <Dialog open={showBeneficiaryDialog} onOpenChange={setShowBeneficiaryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBeneficiary ? "Edit Beneficiary" : "Add Beneficiary"}
              </DialogTitle>
              <DialogDescription>
                {editingBeneficiary ? "Update beneficiary information" : "Add a new beneficiary to the trust"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...beneficiaryForm}>
              <form onSubmit={beneficiaryForm.handleSubmit((data) => {
                // Convert empty date strings to null for database compatibility
                const processedData = {
                  ...data,
                  dateOfBirth: data.dateOfBirth || null
                };
                
                if (editingBeneficiary) {
                  updateBeneficiaryMutation.mutate({ id: editingBeneficiary.id, data: processedData });
                } else {
                  createBeneficiaryMutation.mutate(processedData);
                }
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={beneficiaryForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} data-testid="input-beneficiary-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} data-testid="input-beneficiary-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-beneficiary-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} data-testid="input-beneficiary-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="beneficiaryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beneficiary Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-beneficiary-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="contingent">Contingent</SelectItem>
                            <SelectItem value="remainder">Remainder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-beneficiary-dob" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={beneficiaryForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} data-testid="input-beneficiary-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={beneficiaryForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-beneficiary-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} data-testid="input-beneficiary-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={beneficiaryForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} data-testid="input-beneficiary-postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={beneficiaryForm.control}
                  name="relationshipToTrustor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship to Trustor</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Son, Daughter, Spouse" {...field} data-testid="input-beneficiary-relationship" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={beneficiaryForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Additional notes about this beneficiary"
                          className="w-full p-2 border rounded-md"
                          rows={3}
                          {...field}
                          data-testid="textarea-beneficiary-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowBeneficiaryDialog(false)}
                    data-testid="button-cancel-beneficiary"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBeneficiaryMutation.isPending || updateBeneficiaryMutation.isPending}
                    data-testid="button-submit-beneficiary"
                  >
                    {editingBeneficiary ? "Update" : "Add"} Beneficiary
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Distribution Dialog */}
        <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDistribution ? "Edit Distribution" : "Record Distribution"}
              </DialogTitle>
              <DialogDescription>
                {editingDistribution ? "Update distribution record" : "Record a new distribution to a beneficiary"}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...distributionForm}>
              <form onSubmit={distributionForm.handleSubmit((data) => {
                // Convert empty date strings to null for database compatibility
                const processedData = {
                  ...data,
                  distributionDate: data.distributionDate || null
                };
                
                if (editingDistribution) {
                  updateDistributionMutation.mutate({ id: editingDistribution.id, data: processedData });
                } else {
                  createDistributionMutation.mutate(processedData);
                }
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={distributionForm.control}
                    name="beneficiaryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beneficiary</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value ? String(field.value) : ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-distribution-beneficiary">
                              <SelectValue placeholder="Select beneficiary" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trustBeneficiaries?.map((beneficiary) => (
                              <SelectItem key={beneficiary.id} value={beneficiary.id.toString()}>
                                {beneficiary.firstName} {beneficiary.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={distributionForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} data-testid="input-distribution-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={distributionForm.control}
                    name="distributionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-distribution-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={distributionForm.control}
                    name="distributionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distribution Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-distribution-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="principal">Principal</SelectItem>
                            <SelectItem value="mandatory">Mandatory</SelectItem>
                            <SelectItem value="discretionary">Discretionary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={distributionForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="wire">Wire Transfer</SelectItem>
                            <SelectItem value="ach">ACH Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                </div>

                <FormField
                  control={distributionForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Purpose or description of this distribution" {...field} data-testid="input-distribution-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={distributionForm.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                      <FormControl>
                        <Input placeholder="Education, living expenses, healthcare, etc." {...field} data-testid="input-distribution-purpose" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={distributionForm.control}
                  name="taxYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Year</FormLabel>
                      <FormControl>
                        <Input placeholder="2024" {...field} data-testid="input-tax-year" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={distributionForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Additional notes about this distribution"
                          className="w-full p-2 border rounded-md"
                          rows={3}
                          {...field}
                          data-testid="textarea-distribution-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDistributionDialog(false)}
                    data-testid="button-cancel-distribution"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDistributionMutation.isPending || updateDistributionMutation.isPending}
                    data-testid="button-submit-distribution"
                  >
                    {editingDistribution ? "Update" : "Record"} Distribution
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
      
      <Footer />
    </div>
  );
}