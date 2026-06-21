import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, BarChart4, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CustomCost {
  name: string;
  yearlyCost: number;
}

interface BusinessConfigData {
  id?: number;
  // Admin-configurable discount settings
  bundleDiscountPercentage: number; // 3D Digital Twin combo + Foundation to Finish
  partnerDiscountPercentage: number; // Partner account checkout discount
  // Base business configuration (manual values)
  depreciableAssets: number;
  targetMissionsPerWeek: number;
  targetReinvestmentYears: number;
  yearlyAdvertisementCost: number;
  yearlyInsuranceCost: number;
  yearlySoftwareSubscriptionsCost: number;
  taxPercentage: number;
  customCosts: CustomCost[];
  
  // Per-mission overhead costs (manual values)
  equipmentDepreciation?: number;
  batteryUsage?: number;
  insurance?: number;
  transportation?: number;
  
  // Auto-mode toggle settings for business configuration
  useAutoDepreciableAssets?: boolean;
  useAutoTargetMissionsPerWeek?: boolean;
  useAutoTargetReinvestmentYears?: boolean;
  useAutoYearlyAdvertisementCost?: boolean;
  useAutoYearlyInsuranceCost?: boolean;
  useAutoYearlySoftwareSubscriptionsCost?: boolean;
  useAutoTaxPercentage?: boolean;
  
  // Auto-mode toggle settings for per-mission overhead
  useAutoEquipmentDepreciation?: boolean;
  useAutoBatteryUsage?: boolean;
  useAutoInsurance?: boolean;
  useAutoTransportation?: boolean;
  
  // Auto-calculated values for business configuration from analytics
  autoDepreciableAssets?: number;
  autoTargetMissionsPerWeek?: number;
  autoTargetReinvestmentYears?: number;
  autoYearlyAdvertisementCost?: number;
  autoYearlyInsuranceCost?: number;
  autoYearlySoftwareSubscriptionsCost?: number;
  autoTaxPercentage?: number;
  
  // Auto-calculated values for per-mission overhead from analytics
  autoEquipmentDepreciation?: number;
  autoBatteryUsage?: number;
  autoInsurance?: number;
  autoTransportation?: number;
}

const initialConfigData: BusinessConfigData = {
  // Discount settings
  bundleDiscountPercentage: 25,
  partnerDiscountPercentage: 10,
  // Base business configuration
  depreciableAssets: 10000,
  targetMissionsPerWeek: 3,
  targetReinvestmentYears: 2,
  yearlyAdvertisementCost: 2000,
  yearlyInsuranceCost: 1500,
  yearlySoftwareSubscriptionsCost: 0,
  taxPercentage: 8.25,
  customCosts: [],
  
  // Per-mission overhead costs (manual values)
  equipmentDepreciation: 45,
  batteryUsage: 15,
  insurance: 25,
  transportation: 35,
  
  // Auto-mode toggle settings for business configuration (default to manual)
  useAutoDepreciableAssets: false,
  useAutoTargetMissionsPerWeek: false,
  useAutoTargetReinvestmentYears: false,
  useAutoYearlyAdvertisementCost: false,
  useAutoYearlyInsuranceCost: false,
  useAutoYearlySoftwareSubscriptionsCost: false,
  useAutoTaxPercentage: false,
  
  // Auto-mode toggle settings for per-mission overhead (default to manual)
  useAutoEquipmentDepreciation: false,
  useAutoBatteryUsage: false,
  useAutoInsurance: false,
  useAutoTransportation: false,
  
  // Auto-calculated values for business configuration (populated from analytics)
  autoDepreciableAssets: 0,
  autoTargetMissionsPerWeek: 0,
  autoTargetReinvestmentYears: 0,
  autoYearlyAdvertisementCost: 0,
  autoYearlyInsuranceCost: 0,
  autoYearlySoftwareSubscriptionsCost: 0,
  autoTaxPercentage: 0,
  
  // Auto-calculated values for per-mission overhead (populated from analytics)
  autoEquipmentDepreciation: 0,
  autoBatteryUsage: 0,
  autoInsurance: 0,
  autoTransportation: 0
};

const isInvalidNumericString = (val: string) =>
  val.trim() === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0;

export const BusinessConfigManager = () => {
  const [configData, setConfigData] = useState<BusinessConfigData>(initialConfigData);
  const [newCustomCostName, setNewCustomCostName] = useState("");
  const [newCustomCostAmount, setNewCustomCostAmount] = useState("");
  const [fieldStrings, setFieldStrings] = useState<Partial<Record<keyof BusinessConfigData, string>>>({});
  const { toast } = useToast();
  
  // Fetch business config
  const { data: businessConfig, isLoading } = useQuery({
    queryKey: ['/api/business-config'],
  });
  
  // Fetch analytics data for auto mode
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/analytics/business-costs'],
    queryFn: getQueryFn({ on401: "returnNull" })
  });
  
  // Update config with fetched data when available
  useEffect(() => {
    if (businessConfig) {
      setConfigData({
        // Discount settings
        bundleDiscountPercentage: Number((businessConfig as any).bundleDiscountPercentage) || initialConfigData.bundleDiscountPercentage,
        partnerDiscountPercentage: Number((businessConfig as any).partnerDiscountPercentage) || initialConfigData.partnerDiscountPercentage,
        // Base configuration (manual values)
        id: businessConfig.id || undefined,
        depreciableAssets: Number(businessConfig.depreciableAssets) || initialConfigData.depreciableAssets,
        targetMissionsPerWeek: Number(businessConfig.targetMissionsPerWeek) || initialConfigData.targetMissionsPerWeek,
        targetReinvestmentYears: Number(businessConfig.targetReinvestmentYears) || initialConfigData.targetReinvestmentYears,
        yearlyAdvertisementCost: Number(businessConfig.yearlyAdvertisementCost) || initialConfigData.yearlyAdvertisementCost,
        yearlyInsuranceCost: Number(businessConfig.yearlyInsuranceCost) || initialConfigData.yearlyInsuranceCost,
        yearlySoftwareSubscriptionsCost: Number(businessConfig.yearlySoftwareSubscriptionsCost) || initialConfigData.yearlySoftwareSubscriptionsCost,
        taxPercentage: Number(businessConfig.taxPercentage) || initialConfigData.taxPercentage,
        customCosts: businessConfig.customCosts || initialConfigData.customCosts,
        
        // Per-mission overhead costs (manual values)
        equipmentDepreciation: Number(businessConfig.equipmentDepreciation) || initialConfigData.equipmentDepreciation,
        batteryUsage: Number(businessConfig.batteryUsage) || initialConfigData.batteryUsage,
        insurance: Number(businessConfig.insurance) || initialConfigData.insurance,
        transportation: Number(businessConfig.transportation) || initialConfigData.transportation,
        
        // Auto-mode toggle settings for business configuration
        useAutoDepreciableAssets: businessConfig.useAutoDepreciableAssets || initialConfigData.useAutoDepreciableAssets,
        useAutoTargetMissionsPerWeek: businessConfig.useAutoTargetMissionsPerWeek || initialConfigData.useAutoTargetMissionsPerWeek,
        useAutoTargetReinvestmentYears: businessConfig.useAutoTargetReinvestmentYears || initialConfigData.useAutoTargetReinvestmentYears,
        useAutoYearlyAdvertisementCost: businessConfig.useAutoYearlyAdvertisementCost || initialConfigData.useAutoYearlyAdvertisementCost,
        useAutoYearlyInsuranceCost: businessConfig.useAutoYearlyInsuranceCost || initialConfigData.useAutoYearlyInsuranceCost,
        useAutoYearlySoftwareSubscriptionsCost: businessConfig.useAutoYearlySoftwareSubscriptionsCost || initialConfigData.useAutoYearlySoftwareSubscriptionsCost,
        useAutoTaxPercentage: businessConfig.useAutoTaxPercentage || initialConfigData.useAutoTaxPercentage,
        
        // Auto-mode toggle settings for per-mission overhead
        useAutoEquipmentDepreciation: businessConfig.useAutoEquipmentDepreciation || initialConfigData.useAutoEquipmentDepreciation,
        useAutoBatteryUsage: businessConfig.useAutoBatteryUsage || initialConfigData.useAutoBatteryUsage,
        useAutoInsurance: businessConfig.useAutoInsurance || initialConfigData.useAutoInsurance,
        useAutoTransportation: businessConfig.useAutoTransportation || initialConfigData.useAutoTransportation,
        
        // Auto-calculated values for business configuration from analytics
        autoDepreciableAssets: Number(businessConfig.autoDepreciableAssets) || initialConfigData.autoDepreciableAssets,
        autoTargetMissionsPerWeek: Number(businessConfig.autoTargetMissionsPerWeek) || initialConfigData.autoTargetMissionsPerWeek,
        autoTargetReinvestmentYears: Number(businessConfig.autoTargetReinvestmentYears) || initialConfigData.autoTargetReinvestmentYears,
        autoYearlyAdvertisementCost: Number(businessConfig.autoYearlyAdvertisementCost) || initialConfigData.autoYearlyAdvertisementCost,
        autoYearlyInsuranceCost: Number(businessConfig.autoYearlyInsuranceCost) || initialConfigData.autoYearlyInsuranceCost,
        autoYearlySoftwareSubscriptionsCost: Number(businessConfig.autoYearlySoftwareSubscriptionsCost) || initialConfigData.autoYearlySoftwareSubscriptionsCost,
        autoTaxPercentage: Number(businessConfig.autoTaxPercentage) || initialConfigData.autoTaxPercentage,
        
        // Auto-calculated values for per-mission overhead from analytics
        autoEquipmentDepreciation: Number(businessConfig.autoEquipmentDepreciation) || initialConfigData.autoEquipmentDepreciation,
        autoBatteryUsage: Number(businessConfig.autoBatteryUsage) || initialConfigData.autoBatteryUsage,
        autoInsurance: Number(businessConfig.autoInsurance) || initialConfigData.autoInsurance,
        autoTransportation: Number(businessConfig.autoTransportation) || initialConfigData.autoTransportation
      });
    }
  }, [businessConfig]);
  
  // Update auto values from analytics data
  useEffect(() => {
    if (analyticsData) {
      // First update the raw analytics data values
      setConfigData(prev => {
        // Get auto values from analytics
        const autoDepreciableAssets = analyticsData.depreciableAssets || 0;
        const autoTargetMissionsPerWeek = analyticsData.targetMissionsPerWeek || 0;
        const autoTargetReinvestmentYears = analyticsData.targetReinvestmentYears || 0;
        const autoYearlyAdvertisementCost = analyticsData.yearlyAdvertisementCost || 0;
        const autoYearlyInsuranceCost = analyticsData.yearlyInsuranceCost || 0;
        const autoYearlySoftwareSubscriptionsCost = analyticsData.yearlySoftwareSubscriptionsCost || 0;
        const autoTaxPercentage = analyticsData.taxPercentage || 0;

        // Calculate missions per year for per-mission cost calculations
        const missionsPerYear = autoTargetMissionsPerWeek * 52;
        const missionsBeforeReinvestment = missionsPerYear * autoTargetReinvestmentYears;
        
        // Calculate auto values for per-mission overhead costs based on yearly costs
        // For equipment depreciation, we use the depreciable assets divided by missions before reinvestment
        const calculatedAutoEquipmentDepreciation = missionsBeforeReinvestment > 0 
          ? autoDepreciableAssets / missionsBeforeReinvestment 
          : 0;
        
        // For insurance, we use the yearly insurance cost divided by missions per year
        const calculatedAutoInsurance = missionsPerYear > 0 
          ? autoYearlyInsuranceCost / missionsPerYear 
          : 0;
          
        // Battery usage and transportation use the analytics values directly
        const autoBatteryUsage = analyticsData.batteryUsage || 0;
        const autoTransportation = analyticsData.transportation || 0;
        
        return {
          ...prev,
          // Auto values for main business configuration
          autoDepreciableAssets,
          autoTargetMissionsPerWeek,
          autoTargetReinvestmentYears,
          autoYearlyAdvertisementCost,
          autoYearlyInsuranceCost,
          autoYearlySoftwareSubscriptionsCost,
          autoTaxPercentage,
          
          // Auto values for per-mission overhead costs (some calculated based on yearly costs)
          autoEquipmentDepreciation: calculatedAutoEquipmentDepreciation,
          autoBatteryUsage,
          autoInsurance: calculatedAutoInsurance,
          autoTransportation
        };
      });
    }
  }, [analyticsData]);
  
  // Calculate mission costs based on current config data
  const calculateMissionCosts = () => {
    // Get the appropriate values based on auto/manual toggles
    const depreciableAssets = configData.useAutoDepreciableAssets 
      ? configData.autoDepreciableAssets || 0 
      : configData.depreciableAssets;
      
    const targetMissionsPerWeek = configData.useAutoTargetMissionsPerWeek 
      ? configData.autoTargetMissionsPerWeek || 0 
      : configData.targetMissionsPerWeek;
      
    const targetReinvestmentYears = configData.useAutoTargetReinvestmentYears 
      ? configData.autoTargetReinvestmentYears || 0 
      : configData.targetReinvestmentYears;
      
    const yearlyAdvertisementCost = configData.useAutoYearlyAdvertisementCost 
      ? configData.autoYearlyAdvertisementCost || 0 
      : configData.yearlyAdvertisementCost;
      
    const yearlyInsuranceCost = configData.useAutoYearlyInsuranceCost 
      ? configData.autoYearlyInsuranceCost || 0 
      : configData.yearlyInsuranceCost;
      
    const yearlySoftwareSubscriptionsCost = configData.useAutoYearlySoftwareSubscriptionsCost 
      ? configData.autoYearlySoftwareSubscriptionsCost || 0 
      : configData.yearlySoftwareSubscriptionsCost;
    
    const { customCosts } = configData;
    
    // Calculate how many missions in total before reinvestment
    const missionsBeforeReinvestment = targetMissionsPerWeek * 52 * targetReinvestmentYears;
    const missionsPerYear = targetMissionsPerWeek * 52;
    
    // Calculate per-mission costs
    const depreciableAssetsSplit = missionsBeforeReinvestment > 0 
      ? depreciableAssets / missionsBeforeReinvestment 
      : 0;
      
    const advertisementSplit = missionsPerYear > 0 
      ? yearlyAdvertisementCost / missionsPerYear 
      : 0;
      
    const insuranceSplit = missionsPerYear > 0 
      ? yearlyInsuranceCost / missionsPerYear 
      : 0;
    
    const softwareSplit = missionsPerYear > 0
      ? yearlySoftwareSubscriptionsCost / missionsPerYear
      : 0;
    
    // Calculate custom costs per mission
    let totalCustomCosts = 0;
    if (customCosts.length > 0) {
      totalCustomCosts = customCosts.reduce((sum, cost) => sum + cost.yearlyCost, 0);
    }
    
    const customCostsSplit = missionsPerYear > 0
      ? totalCustomCosts / missionsPerYear
      : 0;
    
    const totalPerMission = depreciableAssetsSplit + advertisementSplit + insuranceSplit + softwareSplit + customCostsSplit;
    
    return {
      depreciableAssetsSplit,
      advertisementSplit,
      insuranceSplit,
      softwareSplit,
      customCostsSplit,
      totalPerMission
    };
  };
  
  // Update business config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: BusinessConfigData) => {
      const res = await apiRequest("POST", "/api/business-config", config);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/business-config"]});
      toast({
        title: "Business configuration updated",
        description: "Your business costs configuration has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Check if any manual-mode cost field currently has an invalid value
  const hasInvalidFields = (
    (!configData.useAutoDepreciableAssets && fieldStrings.depreciableAssets !== undefined && isInvalidNumericString(fieldStrings.depreciableAssets)) ||
    (!configData.useAutoTargetMissionsPerWeek && fieldStrings.targetMissionsPerWeek !== undefined && isInvalidNumericString(fieldStrings.targetMissionsPerWeek)) ||
    (!configData.useAutoTargetReinvestmentYears && fieldStrings.targetReinvestmentYears !== undefined && isInvalidNumericString(fieldStrings.targetReinvestmentYears)) ||
    (!configData.useAutoYearlyAdvertisementCost && fieldStrings.yearlyAdvertisementCost !== undefined && isInvalidNumericString(fieldStrings.yearlyAdvertisementCost)) ||
    (!configData.useAutoYearlyInsuranceCost && fieldStrings.yearlyInsuranceCost !== undefined && isInvalidNumericString(fieldStrings.yearlyInsuranceCost)) ||
    (!configData.useAutoYearlySoftwareSubscriptionsCost && fieldStrings.yearlySoftwareSubscriptionsCost !== undefined && isInvalidNumericString(fieldStrings.yearlySoftwareSubscriptionsCost)) ||
    (!configData.useAutoTaxPercentage && fieldStrings.taxPercentage !== undefined && isInvalidNumericString(fieldStrings.taxPercentage)) ||
    (!configData.useAutoEquipmentDepreciation && fieldStrings.equipmentDepreciation !== undefined && isInvalidNumericString(fieldStrings.equipmentDepreciation)) ||
    (!configData.useAutoBatteryUsage && fieldStrings.batteryUsage !== undefined && isInvalidNumericString(fieldStrings.batteryUsage)) ||
    (!configData.useAutoInsurance && fieldStrings.insurance !== undefined && isInvalidNumericString(fieldStrings.insurance)) ||
    (!configData.useAutoTransportation && fieldStrings.transportation !== undefined && isInvalidNumericString(fieldStrings.transportation))
  );

  // Save configuration
  const handleSaveConfig = () => {
    if (hasInvalidFields) {
      toast({
        title: "Invalid values",
        description: "Please fix all highlighted cost fields before saving.",
        variant: "destructive",
      });
      return;
    }
    updateConfigMutation.mutate(configData);
  };
  
  // Handle input changes
  const handleInputChange = (field: keyof BusinessConfigData, value: string) => {
    setFieldStrings(prev => ({ ...prev, [field]: value }));
    setConfigData(prev => {
      // First create updated config with the new value
      const updatedConfig = {
        ...prev,
        [field]: parseFloat(value) || 0
      };
      
      // If any of these yearly cost fields change, also update the per-mission costs
      if (field === "depreciableAssets" || 
          field === "targetMissionsPerWeek" || 
          field === "targetReinvestmentYears" || 
          field === "yearlyInsuranceCost") {
        
        // Only recalculate if NOT in auto mode for the affected field
        if ((field === "depreciableAssets" && !prev.useAutoEquipmentDepreciation) ||
            (field === "yearlyInsuranceCost" && !prev.useAutoInsurance)) {
          // Update the equipment depreciation if depreciable assets, missions per week or reinvestment years changed
          if (field === "depreciableAssets" || field === "targetMissionsPerWeek" || field === "targetReinvestmentYears") {
            const missionsPerYear = updatedConfig.targetMissionsPerWeek * 52;
            const missionsBeforeReinvestment = missionsPerYear * updatedConfig.targetReinvestmentYears;
            
            if (missionsBeforeReinvestment > 0) {
              updatedConfig.equipmentDepreciation = Number(updatedConfig.depreciableAssets) / missionsBeforeReinvestment;
            }
          }
          
          // Update insurance cost per mission if yearly insurance cost or missions per week changed
          if (field === "yearlyInsuranceCost" || field === "targetMissionsPerWeek") {
            const missionsPerYear = updatedConfig.targetMissionsPerWeek * 52;
            
            if (missionsPerYear > 0) {
              updatedConfig.insurance = Number(updatedConfig.yearlyInsuranceCost) / missionsPerYear;
            }
          }
        }
        
        // Always update auto values when these fields change
        return updateAutoPerMissionValues(updatedConfig);
      }
      
      return updatedConfig;
    });
  };
  
  // Handle toggle switch changes for auto/manual mode
  // Function to update auto per-mission values based on current config
  const updateAutoPerMissionValues = (config: BusinessConfigData): BusinessConfigData => {
    // Get values based on auto/manual toggles
    const depreciableAssets = config.useAutoDepreciableAssets 
      ? (config.autoDepreciableAssets || 0) 
      : config.depreciableAssets;
      
    const targetMissionsPerWeek = config.useAutoTargetMissionsPerWeek 
      ? (config.autoTargetMissionsPerWeek || 0) 
      : config.targetMissionsPerWeek;
      
    const targetReinvestmentYears = config.useAutoTargetReinvestmentYears 
      ? (config.autoTargetReinvestmentYears || 0) 
      : config.targetReinvestmentYears;
      
    const yearlyInsuranceCost = config.useAutoYearlyInsuranceCost 
      ? (config.autoYearlyInsuranceCost || 0) 
      : config.yearlyInsuranceCost;
    
    // Calculate missions per year and before reinvestment
    const missionsPerYear = targetMissionsPerWeek * 52;
    const missionsBeforeReinvestment = missionsPerYear * targetReinvestmentYears;
    
    // Calculate equipment depreciation (assets ÷ total missions over replacement period)
    const calculatedEquipmentDepreciation = missionsBeforeReinvestment > 0 
      ? Number(depreciableAssets) / missionsBeforeReinvestment 
      : 0;
      
    // Calculate insurance cost per mission (yearly cost ÷ annual missions)
    const calculatedInsurance = missionsPerYear > 0 
      ? Number(yearlyInsuranceCost) / missionsPerYear 
      : 0;
    
    return {
      ...config,
      autoEquipmentDepreciation: calculatedEquipmentDepreciation,
      autoInsurance: calculatedInsurance
    };
  };

  const autoToggleToInputField: Partial<Record<keyof BusinessConfigData, keyof BusinessConfigData>> = {
    useAutoDepreciableAssets: "depreciableAssets",
    useAutoTargetMissionsPerWeek: "targetMissionsPerWeek",
    useAutoTargetReinvestmentYears: "targetReinvestmentYears",
    useAutoYearlyAdvertisementCost: "yearlyAdvertisementCost",
    useAutoYearlyInsuranceCost: "yearlyInsuranceCost",
    useAutoYearlySoftwareSubscriptionsCost: "yearlySoftwareSubscriptionsCost",
    useAutoTaxPercentage: "taxPercentage",
    useAutoEquipmentDepreciation: "equipmentDepreciation",
    useAutoBatteryUsage: "batteryUsage",
    useAutoInsurance: "insurance",
    useAutoTransportation: "transportation",
  };

  const handleAutoToggleChange = (field: keyof BusinessConfigData, checked: boolean) => {
    if (checked) {
      const inputField = autoToggleToInputField[field];
      if (inputField) {
        setFieldStrings(prev => {
          const next = { ...prev };
          delete next[inputField];
          return next;
        });
      }
    }
    setConfigData(prev => {
      // First update the toggle state
      const updatedConfig = {
        ...prev,
        [field]: checked
      };
      
      // Special handling for business configuration toggles that affect per-mission costs
      if (field === "useAutoDepreciableAssets" || 
          field === "useAutoTargetMissionsPerWeek" || 
          field === "useAutoTargetReinvestmentYears" || 
          field === "useAutoYearlyInsuranceCost" || 
          field === "useAutoEquipmentDepreciation" || 
          field === "useAutoInsurance") {
        // Recalculate auto values when these toggles change
        return updateAutoPerMissionValues(updatedConfig);
      }
      
      return updatedConfig;
    });
  };
  
  // Add a new custom cost
  const handleAddCustomCost = () => {
    if (newCustomCostName.trim() === "" || !newCustomCostAmount) {
      toast({
        title: "Invalid custom cost",
        description: "Please provide both a name and amount for the custom cost.",
        variant: "destructive",
      });
      return;
    }
    
    const newCustomCost: CustomCost = {
      name: newCustomCostName.trim(),
      yearlyCost: parseFloat(newCustomCostAmount) || 0
    };
    
    setConfigData({
      ...configData,
      customCosts: [...configData.customCosts, newCustomCost]
    });
    
    // Reset form fields
    setNewCustomCostName("");
    setNewCustomCostAmount("");
  };
  
  // Remove a custom cost by index
  const handleRemoveCustomCost = (index: number) => {
    const updatedCustomCosts = [...configData.customCosts];
    updatedCustomCosts.splice(index, 1);
    
    setConfigData({
      ...configData,
      customCosts: updatedCustomCosts
    });
  };
  
  // Calculate mission costs for display
  const missionCosts = calculateMissionCosts();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Business Costs Configuration</CardTitle>
        <CardDescription>
          These settings define your business costs that will be applied to all quotes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Discount Settings ───────────────────────────────────────────────── */}
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold">Pricing Discounts</h3>
            <p className="text-sm text-muted-foreground mt-1">
              These percentages drive live price calculations — changes apply immediately to quotes and booking flows without a code deploy.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bundleDiscountPercentage" className="text-sm font-medium">
                Bundle Discount (%)
              </Label>
              <p className="text-xs text-muted-foreground">
                Applied when both Indoor + Outdoor are selected on 3D Digital Twin, and to all Foundation to Finish entry-point totals.
              </p>
              <Input
                id="bundleDiscountPercentage"
                type="number"
                min={0}
                max={100}
                step={1}
                value={configData.bundleDiscountPercentage}
                onChange={e => setConfigData(prev => ({ ...prev, bundleDiscountPercentage: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partnerDiscountPercentage" className="text-sm font-medium">
                Partner Account Discount (%)
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically applied at checkout for any customer flagged as a Partner Account (real estate agents, roofing companies, builders, etc.).
              </p>
              <Input
                id="partnerDiscountPercentage"
                type="number"
                min={0}
                max={100}
                step={1}
                value={configData.partnerDiscountPercentage}
                onChange={e => setConfigData(prev => ({ ...prev, partnerDiscountPercentage: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="depreciableAssets" className="text-base font-medium">
                  Depreciable Assets ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoDepreciableAssets" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoDepreciableAssets"
                    checked={configData.useAutoDepreciableAssets}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoDepreciableAssets", checked)}
                  />
                  <Label htmlFor="useAutoDepreciableAssets" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoDepreciableAssets ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoDepreciableAssets"
                    value={configData.autoDepreciableAssets?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="depreciableAssets" 
                  type="number"
                  value={configData.depreciableAssets.toString()} 
                  onChange={(e) => handleInputChange("depreciableAssets", e.target.value)}
                  placeholder="Total value of depreciable assets"
                />
              )}
              {!configData.useAutoDepreciableAssets && fieldStrings.depreciableAssets !== undefined && isInvalidNumericString(fieldStrings.depreciableAssets) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Total value of equipment, drones, and other assets
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="targetMissionsPerWeek" className="text-base font-medium">
                  Target Missions per Week
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoTargetMissionsPerWeek" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoTargetMissionsPerWeek"
                    checked={configData.useAutoTargetMissionsPerWeek}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoTargetMissionsPerWeek", checked)}
                  />
                  <Label htmlFor="useAutoTargetMissionsPerWeek" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoTargetMissionsPerWeek ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoTargetMissionsPerWeek"
                    value={configData.autoTargetMissionsPerWeek?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="targetMissionsPerWeek" 
                  type="number"
                  value={configData.targetMissionsPerWeek.toString()} 
                  onChange={(e) => handleInputChange("targetMissionsPerWeek", e.target.value)}
                  placeholder="Average number of missions per week"
                />
              )}
              {!configData.useAutoTargetMissionsPerWeek && fieldStrings.targetMissionsPerWeek !== undefined && isInvalidNumericString(fieldStrings.targetMissionsPerWeek) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                How many missions you expect to complete weekly
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="targetReinvestmentYears" className="text-base font-medium">
                  Target Reinvestment Years
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoTargetReinvestmentYears" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoTargetReinvestmentYears"
                    checked={configData.useAutoTargetReinvestmentYears}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoTargetReinvestmentYears", checked)}
                  />
                  <Label htmlFor="useAutoTargetReinvestmentYears" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoTargetReinvestmentYears ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoTargetReinvestmentYears"
                    value={configData.autoTargetReinvestmentYears?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="targetReinvestmentYears" 
                  type="number"
                  value={configData.targetReinvestmentYears.toString()} 
                  onChange={(e) => handleInputChange("targetReinvestmentYears", e.target.value)}
                  placeholder="Years before reinvestment"
                />
              )}
              {!configData.useAutoTargetReinvestmentYears && fieldStrings.targetReinvestmentYears !== undefined && isInvalidNumericString(fieldStrings.targetReinvestmentYears) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Number of years before replacing or upgrading equipment
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="yearlyAdvertisementCost" className="text-base font-medium">
                  Yearly Advertisement Cost ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoYearlyAdvertisementCost" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoYearlyAdvertisementCost"
                    checked={configData.useAutoYearlyAdvertisementCost}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoYearlyAdvertisementCost", checked)}
                  />
                  <Label htmlFor="useAutoYearlyAdvertisementCost" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoYearlyAdvertisementCost ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoYearlyAdvertisementCost"
                    value={configData.autoYearlyAdvertisementCost?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="yearlyAdvertisementCost" 
                  type="number"
                  value={configData.yearlyAdvertisementCost.toString()} 
                  onChange={(e) => handleInputChange("yearlyAdvertisementCost", e.target.value)}
                  placeholder="Total yearly marketing expenses"
                />
              )}
              {!configData.useAutoYearlyAdvertisementCost && fieldStrings.yearlyAdvertisementCost !== undefined && isInvalidNumericString(fieldStrings.yearlyAdvertisementCost) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Annual expenses for marketing and advertising
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="yearlyInsuranceCost" className="text-base font-medium">
                  Yearly Insurance Cost ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoYearlyInsuranceCost" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoYearlyInsuranceCost"
                    checked={configData.useAutoYearlyInsuranceCost}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoYearlyInsuranceCost", checked)}
                  />
                  <Label htmlFor="useAutoYearlyInsuranceCost" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoYearlyInsuranceCost ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoYearlyInsuranceCost"
                    value={configData.autoYearlyInsuranceCost?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="yearlyInsuranceCost" 
                  type="number"
                  value={configData.yearlyInsuranceCost.toString()} 
                  onChange={(e) => handleInputChange("yearlyInsuranceCost", e.target.value)}
                  placeholder="Total yearly insurance expenses"
                />
              )}
              {!configData.useAutoYearlyInsuranceCost && fieldStrings.yearlyInsuranceCost !== undefined && isInvalidNumericString(fieldStrings.yearlyInsuranceCost) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Annual expenses for business insurance
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="yearlySoftwareSubscriptionsCost" className="text-base font-medium">
                  Yearly Software Subscriptions ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoYearlySoftwareSubscriptionsCost" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoYearlySoftwareSubscriptionsCost"
                    checked={configData.useAutoYearlySoftwareSubscriptionsCost}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoYearlySoftwareSubscriptionsCost", checked)}
                  />
                  <Label htmlFor="useAutoYearlySoftwareSubscriptionsCost" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoYearlySoftwareSubscriptionsCost ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoYearlySoftwareSubscriptionsCost"
                    value={configData.autoYearlySoftwareSubscriptionsCost?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="yearlySoftwareSubscriptionsCost" 
                  type="number"
                  value={configData.yearlySoftwareSubscriptionsCost.toString()} 
                  onChange={(e) => handleInputChange("yearlySoftwareSubscriptionsCost", e.target.value)}
                  placeholder="Total yearly software costs"
                />
              )}
              {!configData.useAutoYearlySoftwareSubscriptionsCost && fieldStrings.yearlySoftwareSubscriptionsCost !== undefined && isInvalidNumericString(fieldStrings.yearlySoftwareSubscriptionsCost) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Annual expenses for software licenses and subscriptions
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="taxPercentage" className="text-base font-medium">
                  Tax Percentage (%)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoTaxPercentage" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoTaxPercentage"
                    checked={configData.useAutoTaxPercentage}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoTaxPercentage", checked)}
                  />
                  <Label htmlFor="useAutoTaxPercentage" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoTaxPercentage ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoTaxPercentage"
                    value={configData.autoTaxPercentage?.toString() || "0"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Value calculated from previous year's analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input 
                  id="taxPercentage" 
                  type="number"
                  value={configData.taxPercentage.toString()} 
                  onChange={(e) => handleInputChange("taxPercentage", e.target.value)}
                  placeholder="Tax percentage for services"
                  step="0.01"
                />
              )}
              {!configData.useAutoTaxPercentage && fieldStrings.taxPercentage !== undefined && isInvalidNumericString(fieldStrings.taxPercentage) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Tax rate applied to all generated quotes
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Custom Costs Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Custom Business Costs</h3>
          <p className="text-sm text-muted-foreground">
            Add any additional business costs that are specific to your operations.
          </p>
          
          {/* List of existing custom costs */}
          {configData.customCosts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Custom Costs:</h4>
              <div className="space-y-2">
                {configData.customCosts.map((cost, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <Badge className="mr-2">${cost.yearlyCost.toFixed(2)}/year</Badge>
                      <span>{cost.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveCustomCost(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Form to add new custom costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="newCustomCostName">Cost Name</Label>
              <Input
                id="newCustomCostName"
                value={newCustomCostName}
                onChange={(e) => setNewCustomCostName(e.target.value)}
                placeholder="e.g., Office Rent, Vehicle Maintenance"
              />
            </div>
            
            <div>
              <Label htmlFor="newCustomCostAmount">Yearly Amount ($)</Label>
              <Input
                id="newCustomCostAmount"
                type="number"
                value={newCustomCostAmount}
                onChange={(e) => setNewCustomCostAmount(e.target.value)}
                placeholder="0.00"
              />
              {newCustomCostAmount !== "" && isInvalidNumericString(newCustomCostAmount) && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid price</p>
              )}
            </div>
          </div>
          
          <Button
            onClick={handleAddCustomCost}
            className="w-full md:w-auto"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Cost
          </Button>
        </div>
        
        <Separator />
        
        {/* Per-Mission Overhead Costs Section with Auto/Manual Toggle */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Per-Mission Overhead Costs</h3>
          
          {/* Description highlighting the connection with yearly costs */}
          <div className="bg-primary/10 p-3 rounded-md mb-4 border border-primary/20">
            <p className="text-sm flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
              <span>
                <strong>Note:</strong> When set to auto mode, Equipment Depreciation is calculated from Depreciable Assets ÷ 
                (Target Missions Per Week × 52 × Target Reinvestment Years).
                Insurance cost is calculated from Yearly Insurance Cost ÷ (Target Missions Per Week × 52).
              </span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Equipment Depreciation */}
            <div className="space-y-2 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <Label htmlFor="equipmentDepreciation" className="text-base font-medium">
                  Equipment Depreciation ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoEquipmentDepreciation" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoEquipmentDepreciation"
                    checked={configData.useAutoEquipmentDepreciation}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoEquipmentDepreciation", checked)}
                  />
                  <Label htmlFor="useAutoEquipmentDepreciation" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoEquipmentDepreciation ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoEquipmentDepreciation"
                    value={Number(configData.autoEquipmentDepreciation).toFixed(2) || "0.00"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          <strong>Calculation Formula:</strong><br />
                          Equipment Depreciation = Depreciable Assets ÷ Total Missions Before Replacement
                        </p>
                        <p className="text-xs mt-2">
                          <strong>Current Values:</strong><br />
                          ${(configData.useAutoDepreciableAssets 
                            ? Number(configData.autoDepreciableAssets) 
                            : Number(configData.depreciableAssets)).toFixed(2)} ÷ 
                          ({(configData.useAutoTargetMissionsPerWeek
                            ? Number(configData.autoTargetMissionsPerWeek) 
                            : Number(configData.targetMissionsPerWeek))} missions/week × 52 weeks × 
                          {(configData.useAutoTargetReinvestmentYears 
                            ? Number(configData.autoTargetReinvestmentYears) 
                            : Number(configData.targetReinvestmentYears))} years)
                        </p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          This allocates equipment costs evenly across all missions during the replacement period.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input
                  id="equipmentDepreciation"
                  type="number"
                  value={configData.equipmentDepreciation?.toString() || "0"}
                  onChange={(e) => handleInputChange("equipmentDepreciation", e.target.value)}
                  placeholder="Cost per mission"
                />
              )}
              {!configData.useAutoEquipmentDepreciation && fieldStrings.equipmentDepreciation !== undefined && isInvalidNumericString(fieldStrings.equipmentDepreciation) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground">
                Depreciation cost of equipment per mission
              </p>
            </div>
            
            {/* Battery Usage */}
            <div className="space-y-2 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <Label htmlFor="batteryUsage" className="text-base font-medium">
                  Battery Usage ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoBatteryUsage" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoBatteryUsage"
                    checked={configData.useAutoBatteryUsage}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoBatteryUsage", checked)}
                  />
                  <Label htmlFor="useAutoBatteryUsage" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoBatteryUsage ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoBatteryUsage"
                    value={Number(configData.autoBatteryUsage).toFixed(2) || "0.00"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Average battery usage cost per mission calculated from historical battery usage
                          patterns in the analytics system
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input
                  id="batteryUsage"
                  type="number"
                  value={configData.batteryUsage?.toString() || "0"}
                  onChange={(e) => handleInputChange("batteryUsage", e.target.value)}
                  placeholder="Cost per mission"
                />
              )}
              {!configData.useAutoBatteryUsage && fieldStrings.batteryUsage !== undefined && isInvalidNumericString(fieldStrings.batteryUsage) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground">
                Battery cycle cost per mission
              </p>
            </div>
            
            {/* Insurance */}
            <div className="space-y-2 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <Label htmlFor="insurance" className="text-base font-medium">
                  Insurance ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoInsurance" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoInsurance"
                    checked={configData.useAutoInsurance}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoInsurance", checked)}
                  />
                  <Label htmlFor="useAutoInsurance" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoInsurance ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoInsurance"
                    value={Number(configData.autoInsurance).toFixed(2) || "0.00"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          <strong>Calculation Formula:</strong><br />
                          Insurance Cost per Mission = Yearly Insurance Cost ÷ Annual Mission Count
                        </p>
                        <p className="text-xs mt-2">
                          <strong>Current Values:</strong><br />
                          ${(configData.useAutoYearlyInsuranceCost 
                            ? Number(configData.autoYearlyInsuranceCost) 
                            : Number(configData.yearlyInsuranceCost)).toFixed(2)} ÷ 
                          ({(configData.useAutoTargetMissionsPerWeek
                            ? Number(configData.autoTargetMissionsPerWeek) 
                            : Number(configData.targetMissionsPerWeek))} missions/week × 52 weeks)
                        </p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          This distributes yearly insurance costs evenly across all missions performed in a year.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input
                  id="insurance"
                  type="number"
                  value={configData.insurance?.toString() || "0"}
                  onChange={(e) => handleInputChange("insurance", e.target.value)}
                  placeholder="Cost per mission"
                />
              )}
              {!configData.useAutoInsurance && fieldStrings.insurance !== undefined && isInvalidNumericString(fieldStrings.insurance) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground">
                Insurance cost per mission
              </p>
            </div>
            
            {/* Transportation */}
            <div className="space-y-2 p-4 border rounded-md">
              <div className="flex items-center justify-between">
                <Label htmlFor="transportation" className="text-base font-medium">
                  Transportation ($)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoTransportation" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoTransportation"
                    checked={configData.useAutoTransportation}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoTransportation", checked)}
                  />
                  <Label htmlFor="useAutoTransportation" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoTransportation ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoTransportation"
                    value={Number(configData.autoTransportation).toFixed(2) || "0.00"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Average transportation cost per mission based on historical data from analytics
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <Input
                  id="transportation"
                  type="number"
                  value={configData.transportation?.toString() || "0"}
                  onChange={(e) => handleInputChange("transportation", e.target.value)}
                  placeholder="Cost per mission"
                />
              )}
              {!configData.useAutoTransportation && fieldStrings.transportation !== undefined && isInvalidNumericString(fieldStrings.transportation) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground">
                Fuel and transportation cost per mission
              </p>
            </div>
            
            {/* Tax Percentage */}
            <div className="space-y-2 p-4 border rounded-md md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="taxPercentageAuto" className="text-base font-medium">
                  Tax Percentage (%)
                </Label>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="useAutoTaxPercentage" className="text-xs">Manual</Label>
                  <Switch
                    id="useAutoTaxPercentage"
                    checked={configData.useAutoTaxPercentage}
                    onCheckedChange={(checked) => handleAutoToggleChange("useAutoTaxPercentage", checked)}
                  />
                  <Label htmlFor="useAutoTaxPercentage" className="text-xs">Auto</Label>
                </div>
              </div>
              
              {configData.useAutoTaxPercentage ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="autoTaxPercentage"
                    value={Number(configData.autoTaxPercentage).toFixed(2) || "0.00"}
                    disabled
                    className="bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <BarChart4 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Average tax percentage calculated from previously issued quotes and invoices
                          in the analytics system
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Input
                    id="taxPercentage"
                    type="number"
                    value={configData.taxPercentage.toString()}
                    onChange={(e) => handleInputChange("taxPercentage", e.target.value)}
                    placeholder="Tax percentage"
                    step="0.01"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This will override the default tax setting above</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {!configData.useAutoTaxPercentage && fieldStrings.taxPercentage !== undefined && isInvalidNumericString(fieldStrings.taxPercentage) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
              <p className="text-sm text-muted-foreground">
                Tax rate applied to all generated quotes
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Cost Breakdown Per Mission</h3>
          
          <div className="space-y-5">
            {/* Assets Cost */}
            <div className="p-3 border border-border/50 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Assets Cost per Mission</h4>
                <p className="text-lg font-bold">${missionCosts.depreciableAssetsSplit.toFixed(2)}</p>
              </div>
              <div className="mt-2 bg-background/50 p-2 rounded text-xs">
                <p className="mb-1 font-medium">Calculation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 text-muted-foreground">
                  <div className="space-y-1">
                    <p>Depreciable Assets:</p>
                    <p className="font-mono">${(configData.useAutoDepreciableAssets 
                      ? Number(configData.autoDepreciableAssets) 
                      : Number(configData.depreciableAssets)).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p>Missions Before Replacement:</p>
                    <p className="font-mono">
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek))} × 52 × 
                      {(configData.useAutoTargetReinvestmentYears 
                        ? Number(configData.autoTargetReinvestmentYears) 
                        : Number(configData.targetReinvestmentYears))} = 
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek)) * 52 * 
                      (configData.useAutoTargetReinvestmentYears 
                        ? Number(configData.autoTargetReinvestmentYears) 
                        : Number(configData.targetReinvestmentYears))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Formula:</p>
                    <p className="font-mono">Assets ÷ Total Missions</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Marketing Cost */}
            <div className="p-3 border border-border/50 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Marketing Cost per Mission</h4>
                <p className="text-lg font-bold">${missionCosts.advertisementSplit.toFixed(2)}</p>
              </div>
              <div className="mt-2 bg-background/50 p-2 rounded text-xs">
                <p className="mb-1 font-medium">Calculation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 text-muted-foreground">
                  <div className="space-y-1">
                    <p>Yearly Marketing Cost:</p>
                    <p className="font-mono">${(configData.useAutoYearlyAdvertisementCost 
                      ? Number(configData.autoYearlyAdvertisementCost) 
                      : Number(configData.yearlyAdvertisementCost)).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p>Annual Missions:</p>
                    <p className="font-mono">
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek))} × 52 = 
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek)) * 52}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Formula:</p>
                    <p className="font-mono">Yearly Cost ÷ Annual Missions</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Insurance Cost */}
            <div className="p-3 border border-border/50 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Insurance Cost per Mission</h4>
                <p className="text-lg font-bold">${missionCosts.insuranceSplit.toFixed(2)}</p>
              </div>
              <div className="mt-2 bg-background/50 p-2 rounded text-xs">
                <p className="mb-1 font-medium">Calculation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 text-muted-foreground">
                  <div className="space-y-1">
                    <p>Yearly Insurance Cost:</p>
                    <p className="font-mono">${(configData.useAutoYearlyInsuranceCost 
                      ? Number(configData.autoYearlyInsuranceCost) 
                      : Number(configData.yearlyInsuranceCost)).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p>Annual Missions:</p>
                    <p className="font-mono">
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek))} × 52 = 
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek)) * 52}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Formula:</p>
                    <p className="font-mono">Yearly Cost ÷ Annual Missions</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Software Cost */}
            <div className="p-3 border border-border/50 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Software Cost per Mission</h4>
                <p className="text-lg font-bold">${missionCosts.softwareSplit.toFixed(2)}</p>
              </div>
              <div className="mt-2 bg-background/50 p-2 rounded text-xs">
                <p className="mb-1 font-medium">Calculation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 text-muted-foreground">
                  <div className="space-y-1">
                    <p>Yearly Software Cost:</p>
                    <p className="font-mono">${(configData.useAutoYearlySoftwareSubscriptionsCost 
                      ? Number(configData.autoYearlySoftwareSubscriptionsCost) 
                      : Number(configData.yearlySoftwareSubscriptionsCost)).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p>Annual Missions:</p>
                    <p className="font-mono">
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek))} × 52 = 
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek)) * 52}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Formula:</p>
                    <p className="font-mono">Yearly Cost ÷ Annual Missions</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Custom Costs */}
            <div className="p-3 border border-border/50 rounded-md">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Custom Costs per Mission</h4>
                <p className="text-lg font-bold">${missionCosts.customCostsSplit.toFixed(2)}</p>
              </div>
              <div className="mt-2 bg-background/50 p-2 rounded text-xs">
                <p className="mb-1 font-medium">Calculation:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 text-muted-foreground">
                  <div className="space-y-1">
                    <p>Total Custom Costs (Yearly):</p>
                    <p className="font-mono">
                      ${configData.customCosts.reduce((sum, cost) => sum + cost.yearlyCost, 0).toFixed(2)}
                      {configData.customCosts.length > 0 && (
                        <span className="block mt-1 text-[10px]">
                          ({configData.customCosts.map(cost => `${cost.name}: $${cost.yearlyCost.toFixed(2)}`).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Annual Missions:</p>
                    <p className="font-mono">
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek))} × 52 = 
                      {(configData.useAutoTargetMissionsPerWeek
                        ? Number(configData.autoTargetMissionsPerWeek) 
                        : Number(configData.targetMissionsPerWeek)) * 52}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Formula:</p>
                    <p className="font-mono">Total Custom Costs ÷ Annual Missions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex justify-between items-center">
              <p className="font-medium">Total Overhead Cost per Mission</p>
              <p className="text-xl font-bold">${missionCosts.totalPerMission.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is the total overhead cost that will be added to each mission in the quote generator.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={updateConfigMutation.isPending || hasInvalidFields}
                  className="w-full md:w-auto"
                  style={hasInvalidFields ? { pointerEvents: "none" } : undefined}
                >
                  {updateConfigMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!updateConfigMutation.isPending && (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Configuration
                </Button>
              </span>
            </TooltipTrigger>
            {hasInvalidFields && (
              <TooltipContent>
                <p>Fix the highlighted fields before saving</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {hasInvalidFields && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Fix the highlighted fields before saving.
          </p>
        )}
      </CardFooter>
    </Card>
  );
};