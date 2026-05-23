import { useState, useEffect } from "react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, PlusCircle, Edit, Trash2, Save, X, Printer, Download, Send, Calculator, AlertCircle } from "lucide-react";
import { Quote, Service } from "@shared/schema";
import { calculateTotal } from "@/lib/quote-utils";

// Equipment interface for the quote
interface Equipment {
  name: string;
  hourlyRate: number;
  included: boolean;
  quantity: number;
}

// Personnel interface for the quote
interface Personnel {
  role: string;
  hourlyRate: number;
  quantity: number;
}

// TimeEstimate interface for the quote
interface TimeEstimate {
  activity: string;
  hours: number;
  rate: number;
}

// Expense interface for the quote
interface Expense {
  name: string;
  cost: number;
  expenseType: string; // Type of expense: 'Travel', 'Supplies', 'Accommodation', 'Other', etc.
  mileage?: number; // Optional mileage field for tracking distance (Travel)
  costPerMile?: number; // Optional cost per mile for calculation (Travel)
  travelSpeed?: number; // Optional average travel speed in mph (Travel)
  quantity?: number; // Optional quantity field for supplies
  unitPrice?: number; // Optional unit price for supplies
}

// Business information interface
interface BusinessInfo {
  name: string;
  logo: string;
  address: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  quoteValidity: number;
}

// Business costs interface
interface BusinessCosts {
  depreciableAssets: number;
  targetMissionsPerWeek: number;
  targetReinvestmentYears: number;
  yearlyAdvertisementCost: number;
  yearlyInsuranceCost: number;
}

// Complete quote interface
interface QuoteData {
  id?: number;
  clientName: string;
  clientEmail: string;
  projectName: string;
  projectDescription: string;
  dateCreated: Date;
  expiryDate: Date;
  status: string;
  businessInfo: BusinessInfo;
  businessCosts: BusinessCosts;
  timeEstimates: TimeEstimate[];
  personnel: Personnel[];
  equipment: Equipment[];
  expenses: Expense[];
  thirdPartyProducts: Expense[];
  deliveryTimeHours: number;
  totalAmount: number;
  depreciableAssetsSplit?: number | string;
  advertisementSplit?: number | string;
  insuranceSplit?: number | string;
  netProfit?: number | string;
  notes: string;
  userId: number;
}

// Initial quote data structure
const initialQuoteData: QuoteData = {
  clientName: "",
  clientEmail: "",
  projectName: "",
  projectDescription: "",
  dateCreated: new Date(),
  expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
  status: "Draft",
  businessInfo: {
    name: "Apollo DroneWorks",
    logo: "",
    address: "",
    state: "",
    zip: "",
    phone: "",
    website: "",
    quoteValidity: 30
  },
  // Default business costs values
  businessCosts: {
    depreciableAssets: 10000,
    targetMissionsPerWeek: 3,
    targetReinvestmentYears: 2,
    yearlyAdvertisementCost: 2000,
    yearlyInsuranceCost: 1500
  },
  timeEstimates: [
    { activity: "Planning", hours: 1, rate: 35 },
    { activity: "Time on-site", hours: 2, rate: 45 },
    { activity: "Data Processing", hours: 0.5, rate: 25 }
  ],
  personnel: [
    { role: "Pilot in Command", hourlyRate: 50, quantity: 1 },
    { role: "Visual Observer", hourlyRate: 50, quantity: 1 },
    { role: "Operator", hourlyRate: 0, quantity: 0 }
  ],
  equipment: [
    { name: "P4Pv2", hourlyRate: 15, included: true, quantity: 1 }
  ],
  expenses: [
    { name: "Mileage", cost: 34, expenseType: "Travel", mileage: 70, costPerMile: 0.485, travelSpeed: 55 }
  ],
  thirdPartyProducts: [
    { name: "Third Party Data Processing", cost: 35, expenseType: "Other" }
  ],
  deliveryTimeHours: 48,
  totalAmount: 0,
  notes: "",
  userId: 0
};

// Quote manager component
export const QuoteManager = ({ quotes = [], userId }: { quotes: Quote[], userId: number }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData>({...initialQuoteData, userId});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState("general");
  const [quoteRangeTier, setQuoteRangeTier] = useState<Record<number, number>>({}); // serviceId -> tier index
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState("dateCreated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch services for dynamic service calculator tabs
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services'],
  });
  
  // Fetch business config for persistent business costs
  const { data: businessConfig, isLoading: isLoadingBusinessConfig } = useQuery({
    queryKey: ['/api/business-config'],
  });
  
  // Apply business config to new quotes when available
  useEffect(() => {
    if (businessConfig && !isEditing && !selectedQuote) {
      setQuoteData(prev => ({
        ...prev,
        businessCosts: {
          depreciableAssets: businessConfig.depreciableAssets || prev.businessCosts.depreciableAssets,
          targetMissionsPerWeek: businessConfig.targetMissionsPerWeek || prev.businessCosts.targetMissionsPerWeek,
          targetReinvestmentYears: businessConfig.targetReinvestmentYears || prev.businessCosts.targetReinvestmentYears,
          yearlyAdvertisementCost: businessConfig.yearlyAdvertisementCost || prev.businessCosts.yearlyAdvertisementCost,
          yearlyInsuranceCost: businessConfig.yearlyInsuranceCost || prev.businessCosts.yearlyInsuranceCost
        }
      }));
    }
  }, [businessConfig, isEditing, selectedQuote]);

  // Recalculate total when quote data changes
  useEffect(() => {
    if (isCreating || isEditing) {
      const total = calculateTotal(quoteData);
      setQuoteData(prev => ({...prev, totalAmount: total}));
    }
  }, [quoteData.timeEstimates, quoteData.personnel, quoteData.equipment, quoteData.expenses, quoteData.thirdPartyProducts, isCreating, isEditing]);

  // Sort and filter quotes
  const sortedQuotes = [...quotes].sort((a, b) => {
    const dateA = new Date(a.dateCreated).getTime();
    const dateB = new Date(b.dateCreated).getTime();
    
    if (sortField === "dateCreated") {
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    } else if (sortField === "clientName") {
      return sortDirection === "asc" 
        ? a.clientName.localeCompare(b.clientName)
        : b.clientName.localeCompare(a.clientName);
    } else if (sortField === "totalAmount") {
      const aAmount = typeof a.totalAmount === 'number' ? a.totalAmount : parseFloat(a.totalAmount as string || '0');
      const bAmount = typeof b.totalAmount === 'number' ? b.totalAmount : parseFloat(b.totalAmount as string || '0');
      return sortDirection === "asc" 
        ? aAmount - bAmount
        : bAmount - aAmount;
    }
    return 0;
  }).filter(quote => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.clientName.toLowerCase().includes(searchLower) ||
      quote.projectName.toLowerCase().includes(searchLower) ||
      quote.projectDescription.toLowerCase().includes(searchLower)
    );
  });

  // Filter quotes by status
  const filteredQuotes = activeTab === "all" 
    ? sortedQuotes 
    : sortedQuotes.filter(quote => quote.status.toLowerCase() === activeTab);

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (quote: QuoteData) => {
      const res = await apiRequest("POST", "/api/quotes", quote);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/quotes"]});
      setIsCreating(false);
      setQuoteData({...initialQuoteData, userId});
      toast({
        title: "Quote created",
        description: "The quote has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create quote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async (quote: QuoteData) => {
      const res = await apiRequest("PATCH", `/api/quotes/${quote.id}`, quote);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/quotes"]});
      setIsEditing(false);
      setSelectedQuote(null);
      setQuoteData({...initialQuoteData, userId});
      toast({
        title: "Quote updated",
        description: "The quote has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update quote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/quotes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/quotes"]});
      toast({
        title: "Quote deleted",
        description: "The quote has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete quote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // A numeric field is invalid if it isn't a finite number or is negative.
  const isInvalidNumber = (n: unknown): boolean => {
    const num = typeof n === "number" ? n : parseFloat(String(n ?? ""));
    return !Number.isFinite(num) || num < 0;
  };

  // Per-row validation flags for every line-item table.  The flags drive both
  // the red borders on individual inputs and the message list shown next to
  // the disabled Save button.
  const getQuoteLineItemValidation = (data: typeof quoteData) => {
    const messages: string[] = [];

    const timeEstimates = data.timeEstimates.map((row, i) => {
      const flags = {
        activity: !row.activity?.trim(),
        hours: isInvalidNumber(row.hours),
        rate: isInvalidNumber(row.rate),
      };
      if (flags.activity) messages.push(`Time estimate row ${i + 1}: activity is required`);
      if (flags.hours) messages.push(`Time estimate row ${i + 1}: hours must be a non-negative number`);
      if (flags.rate) messages.push(`Time estimate row ${i + 1}: rate must be a non-negative number`);
      return flags;
    });

    const personnel = data.personnel.map((row, i) => {
      const flags = {
        role: !row.role?.trim(),
        hourlyRate: isInvalidNumber(row.hourlyRate),
        quantity: isInvalidNumber(row.quantity),
      };
      if (flags.role) messages.push(`Personnel row ${i + 1}: role is required`);
      if (flags.hourlyRate) messages.push(`Personnel row ${i + 1}: hourly rate must be a non-negative number`);
      if (flags.quantity) messages.push(`Personnel row ${i + 1}: quantity must be a non-negative number`);
      return flags;
    });

    const equipment = data.equipment.map((row, i) => {
      const flags = {
        name: !row.name?.trim(),
        hourlyRate: isInvalidNumber(row.hourlyRate),
        quantity: isInvalidNumber(row.quantity),
      };
      if (flags.name) messages.push(`Equipment row ${i + 1}: name is required`);
      if (flags.hourlyRate) messages.push(`Equipment row ${i + 1}: rate must be a non-negative number`);
      if (flags.quantity) messages.push(`Equipment row ${i + 1}: quantity must be a non-negative number`);
      return flags;
    });

    let travelCount = 0;
    let otherCount = 0;
    const expenses = data.expenses.map((row) => {
      const isTravel = row.expenseType === "Travel";
      const label = isTravel
        ? `Travel row ${++travelCount}`
        : `Expense row ${++otherCount}`;
      const flags = {
        name: !row.name?.trim(),
        cost: isInvalidNumber(row.cost),
        mileage: isTravel ? isInvalidNumber(row.mileage ?? 0) : false,
        costPerMile: isTravel ? isInvalidNumber(row.costPerMile ?? 0) : false,
        travelSpeed: isTravel ? isInvalidNumber(row.travelSpeed ?? 0) : false,
        quantity: !isTravel ? isInvalidNumber(row.quantity ?? 0) : false,
        unitPrice: !isTravel ? isInvalidNumber(row.unitPrice ?? 0) : false,
      };
      if (flags.name) messages.push(`${label}: description is required`);
      if (flags.cost) messages.push(`${label}: total cost must be a non-negative number`);
      if (flags.mileage) messages.push(`${label}: mileage must be a non-negative number`);
      if (flags.costPerMile) messages.push(`${label}: cost per mile must be a non-negative number`);
      if (flags.travelSpeed) messages.push(`${label}: travel speed must be a non-negative number`);
      if (flags.quantity) messages.push(`${label}: quantity must be a non-negative number`);
      if (flags.unitPrice) messages.push(`${label}: unit price must be a non-negative number`);
      return flags;
    });

    const thirdPartyProducts = data.thirdPartyProducts.map((row, i) => {
      const flags = {
        name: !row.name?.trim(),
        cost: isInvalidNumber(row.cost),
      };
      if (flags.name) messages.push(`Third party product row ${i + 1}: name is required`);
      if (flags.cost) messages.push(`Third party product row ${i + 1}: cost must be a non-negative number`);
      return flags;
    });

    return { messages, timeEstimates, personnel, equipment, expenses, thirdPartyProducts };
  };

  // Centralised validation — returns an array of human-readable error strings.
  // Used both by the submit handlers and by renderQuoteForm so that the logic
  // never drifts between the disabled-state check and the actual save guard.
  const getQuoteValidationMessages = (data: typeof quoteData): string[] => {
    const msgs: string[] = [];
    if (!data.clientName.trim()) msgs.push("Client name is required");
    if (!data.projectName.trim()) msgs.push("Project name is required");
    if (
      data.clientEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clientEmail.trim())
    ) {
      msgs.push("Client email is not a valid address");
    }
    msgs.push(...getQuoteLineItemValidation(data).messages);
    return msgs;
  };

  // Handle quote creation
  const handleCreateQuote = async () => {
    const msgs = getQuoteValidationMessages(quoteData);
    if (msgs.length > 0) {
      toast({
        title: "Missing or invalid information",
        description: msgs.join(" • "),
        variant: "destructive",
      });
      return;
    }
    
    // Convert numeric fields to strings and prepare the data for backend
    // Structure for the database with business_info as a JSONB field
    const formattedQuoteData = {
      ...quoteData,
      // Convert numeric values to strings
      totalAmount: quoteData.totalAmount.toString(),
      deliveryTimeHours: quoteData.deliveryTimeHours.toString(),
      
      // Make sure business_info is properly structured as expected by the database
      business_info: quoteData.businessInfo,
      
      // Keep date fields properly formatted
      // expiryDate should already be a Date object
      
      // Make sure all JSON fields are properly configured
      time_estimates: quoteData.timeEstimates,
      personnel: quoteData.personnel,
      equipment: quoteData.equipment,
      expenses: quoteData.expenses,
      third_party_products: quoteData.thirdPartyProducts
    };
    
    createQuoteMutation.mutate(formattedQuoteData);
  };

  // Handle quote update
  const handleUpdateQuote = async () => {
    const msgs = getQuoteValidationMessages(quoteData);
    if (msgs.length > 0) {
      toast({
        title: "Missing or invalid information",
        description: msgs.join(" • "),
        variant: "destructive",
      });
      return;
    }
    
    // Convert numeric fields to strings and prepare the data for backend
    // Structure for the database with business_info as a JSONB field
    const formattedQuoteData = {
      ...quoteData,
      // Convert numeric values to strings
      totalAmount: quoteData.totalAmount.toString(),
      deliveryTimeHours: quoteData.deliveryTimeHours.toString(),
      
      // Make sure business_info is properly structured as expected by the database
      business_info: quoteData.businessInfo,
      
      // Make sure all JSON fields are properly configured
      time_estimates: quoteData.timeEstimates,
      personnel: quoteData.personnel,
      equipment: quoteData.equipment,
      expenses: quoteData.expenses,
      third_party_products: quoteData.thirdPartyProducts
    };
    
    updateQuoteMutation.mutate(formattedQuoteData);
  };

  // Handle quote deletion
  const handleDeleteQuote = (id: number) => {
    if (window.confirm("Are you sure you want to delete this quote?")) {
      deleteQuoteMutation.mutate(id);
    }
  };

  // Edit a quote
  const handleEditQuote = (id: number) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      // Make a deep clone of the quote
      const quoteClone = JSON.parse(JSON.stringify(quote));
      
      // Handle field name conversions from snake_case to camelCase
      if (quoteClone.business_info && !quoteClone.businessInfo) {
        quoteClone.businessInfo = quoteClone.business_info;
        delete quoteClone.business_info;
      }
      
      if (quoteClone.time_estimates && !quoteClone.timeEstimates) {
        quoteClone.timeEstimates = quoteClone.time_estimates;
        delete quoteClone.time_estimates;
      }
      
      if (quoteClone.third_party_products && !quoteClone.thirdPartyProducts) {
        quoteClone.thirdPartyProducts = quoteClone.third_party_products;
        delete quoteClone.third_party_products;
      }
      
      // Set default values if fields are missing
      if (!quoteClone.businessInfo) {
        quoteClone.businessInfo = {
          name: "Apollo DroneWorks",
          logo: "",
          address: "",
          state: "",
          zip: "",
          phone: "",
          website: "",
          quoteValidity: 30
        };
      }
      
      if (!quoteClone.businessCosts) {
        quoteClone.businessCosts = {
          depreciableAssets: parseFloat(quoteClone.depreciableAssets || '0'),
          targetMissionsPerWeek: parseFloat(quoteClone.targetMissionsPerWeek || '0'),
          targetReinvestmentYears: parseFloat(quoteClone.targetReinvestmentYears || '0'),
          yearlyAdvertisementCost: parseFloat(quoteClone.yearlyAdvertisementCost || '0'),
          yearlyInsuranceCost: parseFloat(quoteClone.yearlyInsuranceCost || '0')
        };
      }
      
      // Ensure all array fields are initialized
      if (!quoteClone.timeEstimates) quoteClone.timeEstimates = [];
      if (!quoteClone.personnel) quoteClone.personnel = [];
      if (!quoteClone.equipment) quoteClone.equipment = [];
      if (!quoteClone.expenses) quoteClone.expenses = [];
      if (!quoteClone.thirdPartyProducts) quoteClone.thirdPartyProducts = [];
      
      setQuoteData(quoteClone);
      setSelectedQuote(id);
      setIsEditing(true);
      setTouchedFields(new Set());
      setSaveAttempted(false);
    }
  };

  // Cancel creating/editing
  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedQuote(null);
    setQuoteData({...initialQuoteData, userId});
    setTouchedFields(new Set());
    setSaveAttempted(false);
  };

  // Add a time estimate
  const handleAddTimeEstimate = () => {
    setQuoteData(prev => ({
      ...prev,
      timeEstimates: [...prev.timeEstimates, { activity: "", hours: 0, rate: 0 }]
    }));
  };

  // Update a time estimate
  const handleUpdateTimeEstimate = (index: number, field: keyof TimeEstimate, value: string | number) => {
    const updatedEstimates = [...quoteData.timeEstimates];
    updatedEstimates[index] = {
      ...updatedEstimates[index],
      [field]: typeof value === 'string' && field !== 'activity' ? parseFloat(value) || 0 : value
    };
    
    setQuoteData(prev => ({
      ...prev,
      timeEstimates: updatedEstimates
    }));
  };

  // Remove a time estimate
  const handleRemoveTimeEstimate = (index: number) => {
    const updatedEstimates = quoteData.timeEstimates.filter((_, i) => i !== index);
    setQuoteData(prev => ({
      ...prev,
      timeEstimates: updatedEstimates
    }));
  };

  // Add personnel
  const handleAddPersonnel = () => {
    setQuoteData(prev => ({
      ...prev,
      personnel: [...prev.personnel, { role: "", hourlyRate: 0, quantity: 1 }]
    }));
  };

  // Update personnel
  const handleUpdatePersonnel = (index: number, field: keyof Personnel, value: string | number) => {
    const updatedPersonnel = [...quoteData.personnel];
    updatedPersonnel[index] = {
      ...updatedPersonnel[index],
      [field]: typeof value === 'string' && field !== 'role' ? parseFloat(value) || 0 : value
    };
    
    setQuoteData(prev => ({
      ...prev,
      personnel: updatedPersonnel
    }));
  };

  // Remove personnel
  const handleRemovePersonnel = (index: number) => {
    const updatedPersonnel = quoteData.personnel.filter((_, i) => i !== index);
    setQuoteData(prev => ({
      ...prev,
      personnel: updatedPersonnel
    }));
  };

  // Add equipment
  const handleAddEquipment = () => {
    setQuoteData(prev => ({
      ...prev,
      equipment: [...prev.equipment, { name: "", hourlyRate: 0, included: true, quantity: 1 }]
    }));
  };

  // Update equipment
  const handleUpdateEquipment = (index: number, field: keyof Equipment, value: string | number | boolean) => {
    const updatedEquipment = [...quoteData.equipment];
    updatedEquipment[index] = {
      ...updatedEquipment[index],
      [field]: typeof value === 'string' && field !== 'name' && field !== 'included' ? parseFloat(value) || 0 : value
    };
    
    setQuoteData(prev => ({
      ...prev,
      equipment: updatedEquipment
    }));
  };

  // Remove equipment
  const handleRemoveEquipment = (index: number) => {
    const updatedEquipment = quoteData.equipment.filter((_, i) => i !== index);
    setQuoteData(prev => ({
      ...prev,
      equipment: updatedEquipment
    }));
  };

  // Add expense
  const handleAddExpense = () => {
    setQuoteData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: "", cost: 0, expenseType: "Supplies", quantity: 1, unitPrice: 0 }]
    }));
  };
  
  // Add travel expense
  const handleAddTravelExpense = () => {
    setQuoteData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { name: "Travel to Location", cost: 0, expenseType: "Travel", mileage: 0, costPerMile: 0.485, travelSpeed: 55 }]
    }));
  };

  // Update expense
  const handleUpdateExpense = (index: number, field: keyof Expense, value: string | number) => {
    const updatedExpenses = [...quoteData.expenses];
    
    // Parse numeric fields
    if (field === 'cost' || field === 'mileage' || field === 'costPerMile' || field === 'travelSpeed' || field === 'quantity' || field === 'unitPrice') {
      value = typeof value === 'string' ? parseFloat(value) || 0 : value;
    }
    
    // Update the expense
    updatedExpenses[index] = {
      ...updatedExpenses[index],
      [field]: value
    };
    
    // If expense type changed, set default values for the new type
    if (field === 'expenseType') {
      const expenseType = value as string;
      if (expenseType === 'Travel') {
        updatedExpenses[index] = {
          ...updatedExpenses[index],
          mileage: updatedExpenses[index].mileage || 0,
          costPerMile: updatedExpenses[index].costPerMile || 0.485,
          travelSpeed: updatedExpenses[index].travelSpeed || 55,
        };
      } else {
        updatedExpenses[index] = {
          ...updatedExpenses[index],
          quantity: updatedExpenses[index].quantity || 1,
          unitPrice: updatedExpenses[index].unitPrice || 0
        };
      }
    }
    
    // Handle travel expense calculations
    if (field === 'mileage' || field === 'costPerMile' || field === 'travelSpeed' || 
        (field === 'expenseType' && value === 'Travel')) {
      const expense = updatedExpenses[index];
      
      if (expense.expenseType === 'Travel') {
        const mileage = typeof expense.mileage === 'number' ? expense.mileage : 0;
        const costPerMile = typeof expense.costPerMile === 'number' ? expense.costPerMile : 0;
        const travelSpeed = typeof expense.travelSpeed === 'number' ? expense.travelSpeed : 55;
        
        if (mileage > 0 && costPerMile > 0) {
          // Calculate the mileage cost
          const calculatedCost = mileage * costPerMile;
          
          // Find the Pilot in Command hourly rate
          const pilotInCommand = quoteData.personnel.find(person => person.role === "Pilot in Command");
          const pilotRate = pilotInCommand ? pilotInCommand.hourlyRate : 50; // Default to $50/hr if not found
          
          // Calculate travel time in hours
          const travelTimeHours = travelSpeed > 0 ? mileage / travelSpeed : 0;
          
          // Calculate travel time cost based on Pilot in Command hourly rate
          const travelTimeCost = travelTimeHours * pilotRate;
          
          // Update the expense with the total cost (mileage cost + travel time cost)
          updatedExpenses[index] = {
            ...updatedExpenses[index],
            cost: calculatedCost + travelTimeCost
          };
        }
      }
    }
    
    // Handle quantity-based expense calculations
    if (field === 'quantity' || field === 'unitPrice' || 
        (field === 'expenseType' && value !== 'Travel')) {
      const expense = updatedExpenses[index];
      
      if (expense.expenseType !== 'Travel') {
        const quantity = typeof expense.quantity === 'number' ? expense.quantity : 1;
        const unitPrice = typeof expense.unitPrice === 'number' ? expense.unitPrice : 0;
        
        if (quantity > 0 && unitPrice > 0) {
          // Calculate the total cost
          updatedExpenses[index] = {
            ...updatedExpenses[index],
            cost: quantity * unitPrice
          };
        }
      }
    }
    
    setQuoteData(prev => ({
      ...prev,
      expenses: updatedExpenses
    }));
  };

  // Remove expense
  const handleRemoveExpense = (index: number) => {
    const updatedExpenses = quoteData.expenses.filter((_, i) => i !== index);
    setQuoteData(prev => ({
      ...prev,
      expenses: updatedExpenses
    }));
  };

  // Add third party product
  const handleAddThirdPartyProduct = () => {
    setQuoteData(prev => ({
      ...prev,
      thirdPartyProducts: [...prev.thirdPartyProducts, { name: "", cost: 0, expenseType: "Other" }]
    }));
  };

  // Update third party product
  const handleUpdateThirdPartyProduct = (index: number, field: keyof Expense, value: string | number) => {
    const updatedProducts = [...quoteData.thirdPartyProducts];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: field === 'cost' && typeof value === 'string' ? parseFloat(value) || 0 : value
    };
    
    setQuoteData(prev => ({
      ...prev,
      thirdPartyProducts: updatedProducts
    }));
  };

  // Remove third party product
  const handleRemoveThirdPartyProduct = (index: number) => {
    const updatedProducts = quoteData.thirdPartyProducts.filter((_, i) => i !== index);
    setQuoteData(prev => ({
      ...prev,
      thirdPartyProducts: updatedProducts
    }));
  };

  // Print quote
  const handlePrintQuote = async (id: number) => {
    try {
      const quote = quotes.find(q => q.id === id);
      if (!quote) {
        toast({
          title: "Quote not found",
          description: "Could not find the quote to print.",
          variant: "destructive"
        });
        return;
      }
      
      // Convert DB format to the format expected by the PDF generator
      const formattedQuote = {
        ...quote,
        businessInfo: quote.business_info || quote.businessInfo || {
          name: "Apollo DroneWorks",
          logo: "",
          address: "",
          state: "",
          zip: "",
          phone: "",
          website: "",
          quoteValidity: 30
        },
        timeEstimates: quote.time_estimates || quote.timeEstimates || [],
        thirdPartyProducts: quote.third_party_products || quote.thirdPartyProducts || [],
        clientName: quote.clientName || "",
        clientEmail: quote.clientEmail || "",
        projectName: quote.projectName || "",
        projectDescription: quote.projectDescription || "",
        dateCreated: quote.dateCreated || new Date(),
        expiryDate: quote.expiryDate || new Date(),
        status: quote.status || "Draft",
        notes: quote.notes || "",
        personnel: quote.personnel || [],
        equipment: quote.equipment || [],
        expenses: quote.expenses || [],
        totalAmount: typeof quote.totalAmount === 'string' ? parseFloat(quote.totalAmount) : (quote.totalAmount || 0),
        deliveryTimeHours: typeof quote.deliveryTimeHours === 'string' ? parseFloat(quote.deliveryTimeHours) : (quote.deliveryTimeHours || 0),
        userId: quote.userId
      };
      
      // Import dynamically to reduce initial bundle size
      const { printQuotePDF } = await import("@/lib/pdfGenerator");
      await printQuotePDF(formattedQuote);
      
      toast({
        title: "Print Quote",
        description: "Quote has been sent to printer.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error printing quote:", error);
      toast({
        title: "Print failed",
        description: "Failed to print the quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Download quote as PDF
  const handleDownloadQuote = async (id: number) => {
    try {
      const quote = quotes.find(q => q.id === id);
      if (!quote) {
        toast({
          title: "Quote not found",
          description: "Could not find the quote to download.",
          variant: "destructive"
        });
        return;
      }
      
      // Convert DB format to the format expected by the PDF generator
      const formattedQuote = {
        ...quote,
        businessInfo: quote.business_info || quote.businessInfo || {
          name: "Apollo DroneWorks",
          logo: "",
          address: "",
          state: "",
          zip: "",
          phone: "",
          website: "",
          quoteValidity: 30
        },
        timeEstimates: quote.time_estimates || quote.timeEstimates || [],
        thirdPartyProducts: quote.third_party_products || quote.thirdPartyProducts || [],
        clientName: quote.clientName || "",
        clientEmail: quote.clientEmail || "",
        projectName: quote.projectName || "",
        projectDescription: quote.projectDescription || "",
        dateCreated: quote.dateCreated || new Date(),
        expiryDate: quote.expiryDate || new Date(),
        status: quote.status || "Draft",
        notes: quote.notes || "",
        personnel: quote.personnel || [],
        equipment: quote.equipment || [],
        expenses: quote.expenses || [],
        totalAmount: typeof quote.totalAmount === 'string' ? parseFloat(quote.totalAmount) : (quote.totalAmount || 0),
        deliveryTimeHours: typeof quote.deliveryTimeHours === 'string' ? parseFloat(quote.deliveryTimeHours) : (quote.deliveryTimeHours || 0),
        userId: quote.userId
      };
      
      // Import dynamically to reduce initial bundle size
      const { downloadQuotePDF } = await import("@/lib/pdfGenerator");
      const filename = `${formattedQuote.clientName.replace(/\s+/g, '_')}_Quote_${formattedQuote.id}.pdf`;
      await downloadQuotePDF(formattedQuote, filename);
      
      toast({
        title: "Quote Downloaded",
        description: "Your quote has been downloaded as a PDF.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error downloading quote:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Send quote via email
  const handleSendQuote = (id: number) => {
    // Email sending functionality would be implemented here
    toast({
      title: "Send quote",
      description: "Email sending functionality is not yet implemented.",
      variant: "default"  // Changed from "success" to "default" since "success" is not available
    });
  };

  // Calculate profitability and business cost allocations
  const handleCalculateProfitability = () => {
    // Calculate business costs per mission
    const { 
      depreciableAssets, 
      targetMissionsPerWeek, 
      targetReinvestmentYears,
      yearlyAdvertisementCost,
      yearlyInsuranceCost 
    } = quoteData.businessCosts;
    
    // Calculate how many missions in total before reinvestment
    const missionsBeforeReinvestment = targetMissionsPerWeek * 52 * targetReinvestmentYears;
    
    // Calculate per-mission costs
    const depreciableAssetsSplit = missionsBeforeReinvestment > 0 
      ? depreciableAssets / missionsBeforeReinvestment 
      : 0;
      
    const advertisementSplit = targetMissionsPerWeek > 0 
      ? yearlyAdvertisementCost / (targetMissionsPerWeek * 52) 
      : 0;
      
    const insuranceSplit = targetMissionsPerWeek > 0 
      ? yearlyInsuranceCost / (targetMissionsPerWeek * 52) 
      : 0;
    
    // Calculate net profit
    const totalCost = quoteData.totalAmount;
    const businessCostSum = depreciableAssetsSplit + advertisementSplit + insuranceSplit;
    const netProfit = totalCost - businessCostSum;
    
    // Update quote data with calculations
    setQuoteData({
      ...quoteData,
      depreciableAssetsSplit: depreciableAssetsSplit.toFixed(2),
      advertisementSplit: advertisementSplit.toFixed(2),
      insuranceSplit: insuranceSplit.toFixed(2),
      netProfit: netProfit.toFixed(2)
    });
    
    toast({
      title: "Profitability Calculation Complete",
      description: `Net profit: $${netProfit.toFixed(2)}`,
      variant: "default"
    });
  };

  // Change quote status
  const handleStatusChange = (id: number, newStatus: string) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      // Make sure numeric fields are converted to strings when updating
      // We need to construct a properly formatted quote object for the update with the right JSONB structure
      
      // Use the correct field name based on what's returned from the database (may vary)
      const businessInfo = quote.businessInfo || quote.business_info || {
        name: "Apollo DroneWorks",
        address: "",
        state: "",
        zip: "",
        phone: "",
        website: "",
        quoteValidity: 30
      };
      
      const timeEstimates = quote.timeEstimates || quote.time_estimates || [];
      const thirdPartyProducts = quote.thirdPartyProducts || quote.third_party_products || [];
      
      // This object should match the database field names when sent to the server
      const updatedQuote = {
        ...quote, 
        status: newStatus,
        
        // Make sure these fields use the correct snake_case field names expected by the backend
        business_info: businessInfo,
        time_estimates: timeEstimates,
        personnel: quote.personnel || [],
        equipment: quote.equipment || [],
        expenses: quote.expenses || [],
        third_party_products: thirdPartyProducts
      };
      
      updateQuoteMutation.mutate(updatedQuote as unknown as QuoteData);
    }
  };

  const markTouched = (field: string) =>
    setTouchedFields(prev => new Set(prev).add(field));

  // Render create/edit form
  const renderQuoteForm = () => {
    const validationMessages = getQuoteValidationMessages(quoteData);
    const hasValidationErrors = validationMessages.length > 0;
    const lineItemValidation = getQuoteLineItemValidation(quoteData);
    const errBorder = (bad: boolean) => (bad ? " border-destructive" : "");

    // Per-field flags used to highlight the relevant inputs
    const clientNameEmpty = !quoteData.clientName.trim();
    const projectNameEmpty = !quoteData.projectName.trim();
    const clientEmailInvalid =
      !!quoteData.clientEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteData.clientEmail.trim());

    const showClientNameError = clientNameEmpty && (touchedFields.has("clientName") || saveAttempted);
    const showProjectNameError = projectNameEmpty && (touchedFields.has("projectName") || saveAttempted);
    const showClientEmailError = clientEmailInvalid && (touchedFields.has("clientEmail") || saveAttempted);

    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
              <Input 
                id="clientName" 
                value={quoteData.clientName} 
                onChange={(e) => setQuoteData({...quoteData, clientName: e.target.value})}
                onBlur={() => markTouched("clientName")}
                placeholder="Enter client name"
                className={`text-gray-900 dark:text-gray-100${showClientNameError ? " border-destructive" : ""}`}
              />
              {showClientNameError && (
                <p className="text-xs text-destructive mt-1">Client name is required</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input 
                id="clientEmail" 
                value={quoteData.clientEmail} 
                onChange={(e) => setQuoteData({...quoteData, clientEmail: e.target.value})}
                onBlur={() => markTouched("clientEmail")}
                placeholder="Enter client email"
                type="email"
                className={`text-gray-900 dark:text-gray-100${showClientEmailError ? " border-destructive" : ""}`}
              />
              {showClientEmailError && (
                <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName">Project Name <span className="text-destructive">*</span></Label>
              <Input 
                id="projectName" 
                value={quoteData.projectName} 
                onChange={(e) => setQuoteData({...quoteData, projectName: e.target.value})}
                onBlur={() => markTouched("projectName")}
                placeholder="Enter project name"
                className={`text-gray-900 dark:text-gray-100${showProjectNameError ? " border-destructive" : ""}`}
              />
              {showProjectNameError && (
                <p className="text-xs text-destructive mt-1">Project name is required</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={quoteData.status} 
                onValueChange={(value) => setQuoteData({...quoteData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div>
          <Label htmlFor="projectDescription">Project Description</Label>
          <Textarea 
            id="projectDescription" 
            value={quoteData.projectDescription} 
            onChange={(e) => setQuoteData({...quoteData, projectDescription: e.target.value})}
            placeholder="Enter project description"
            rows={4}
            className="text-gray-900 dark:text-gray-100"
          />
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium" style={{ color: "#081120" }}>Time Estimates</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Select service type to load predefined estimates
            </div>
          </div>
          
          {/* Service type tabs for dynamic pricing calculator */}
          {!isLoadingServices && services && services.length > 0 && (
            <Tabs value={activeServiceTab} onValueChange={setActiveServiceTab} className="mb-6">
              <TabsList className="bg-[#0b111f] border border-gold-dark/30 flex flex-wrap">
                <TabsTrigger 
                  value="general" 
                  className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
                >
                  General
                </TabsTrigger>
                {services.map(service => (
                  <TabsTrigger 
                    key={service.id}
                    value={`service-${service.id}`}
                    className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
                  >
                    {service.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="general">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add general time estimates for this project
                </p>
              </TabsContent>
              
              {(services as Service[]).map((service) => {
                const isRangeBased = service.pricingType === "range_based" &&
                  Array.isArray(service.priceRanges) &&
                  service.priceRanges.length > 0;
                const selectedTierIdx = quoteRangeTier[service.id] ?? null;
                const selectedRange = isRangeBased && selectedTierIdx !== null
                  ? service.priceRanges![selectedTierIdx]
                  : null;

                // Unique expense name used to identify / replace the package-fee line for this service
                const packageExpenseName = (label: string) => `${service.name} – ${label}`;

                // Auto-update the expenses list to reflect the selected tier; replaces any
                // previous package-fee entry for this service so there's no double-counting.
                const handleTierSelect = (idx: number) => {
                  const range = service.priceRanges![idx];
                  const packageCost = range.minPrice / 100;
                  const expName = packageExpenseName(range.label);
                  // Remove any existing package-fee entry for this service then add the new one
                  const filteredExpenses = quoteData.expenses.filter(
                    (e) => !service.priceRanges!.some((r) => e.name === packageExpenseName(r.label))
                  );
                  setQuoteData({
                    ...quoteData,
                    expenses: [...filteredExpenses, { name: expName, cost: packageCost, expenseType: "Other" }],
                  });
                  setQuoteRangeTier((prev) => ({ ...prev, [service.id]: idx }));
                  toast({
                    title: "Package fee applied",
                    description: `${service.name} – ${range.label}: $${packageCost.toFixed(0)}`,
                  });
                };

                return (
                  <TabsContent key={service.id} value={`service-${service.id}`}>
                    <div className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">{service.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {service.shortDescription}
                      </p>

                      {/* Package picker for range-based services — selecting a tier auto-applies the fee */}
                      {isRangeBased && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5 uppercase tracking-wide">
                            Select package tier (auto-applied to quote)
                          </p>
                          <div className="flex flex-col gap-1">
                            {service.priceRanges!.map((range, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleTierSelect(idx)}
                                className={`flex justify-between items-center px-3 py-1.5 rounded text-sm border transition-colors ${
                                  selectedTierIdx === idx
                                    ? "bg-blue-100 dark:bg-blue-800/50 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100 font-medium"
                                    : "border-blue-200 dark:border-blue-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                }`}
                              >
                                <span>{range.label}</span>
                                <span className="ml-4 font-semibold">
                                  ${(range.minPrice / 100).toFixed(0)}
                                  {range.maxPrice && range.maxPrice !== range.minPrice
                                    ? ` – $${(range.maxPrice / 100).toFixed(0)}`
                                    : ""}
                                </span>
                              </button>
                            ))}
                          </div>
                          {selectedRange && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">
                              Applied: <strong>{selectedRange.label}</strong> — ${(selectedRange.minPrice / 100).toFixed(0)} added to expenses
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            let newEstimates = [...quoteData.timeEstimates];

                            if (service.name.includes("Roof")) {
                              newEstimates.push({ activity: "Roof Inspection Flight", hours: 1.5, rate: 150 });
                              newEstimates.push({ activity: "Data Processing", hours: 2, rate: 85 });
                              newEstimates.push({ activity: "Report Generation", hours: 1, rate: 75 });
                            } else if (service.name.includes("Real Estate")) {
                              newEstimates.push({ activity: "Property Photography", hours: 1, rate: 125 });
                              newEstimates.push({ activity: "Video Capture", hours: 1.5, rate: 150 });
                              newEstimates.push({ activity: "Editing & Post-Production", hours: 3, rate: 85 });
                            } else if (service.name.includes("3D") || service.name.includes("Photogrammetry")) {
                              newEstimates.push({ activity: "Site Survey & Planning", hours: 1, rate: 100 });
                              newEstimates.push({ activity: "Data Capture Flights", hours: 2, rate: 175 });
                              newEstimates.push({ activity: "3D Model Processing", hours: 4, rate: 95 });
                              newEstimates.push({ activity: "Model Refinement", hours: 2, rate: 85 });
                            } else {
                              newEstimates.push({ activity: `${service.name} - Flight Time`, hours: 1.5, rate: 150 });
                              newEstimates.push({ activity: `${service.name} - Data Processing`, hours: 2, rate: 85 });
                            }

                            setQuoteData({ ...quoteData, timeEstimates: newEstimates });
                            toast({
                              title: "Time estimates added",
                              description: `Added standard time estimates for ${service.name}`,
                            });
                          }}
                        >
                          Add Standard Time Estimates
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: "#081120" }}>Activity</TableHead>
                <TableHead style={{ color: "#081120" }}>Hours</TableHead>
                <TableHead style={{ color: "#081120" }}>Rate ($/hr)</TableHead>
                <TableHead style={{ color: "#081120" }}>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteData.timeEstimates.map((estimate, index) => {
                const rowFlags = lineItemValidation.timeEstimates[index];
                return (
                <TableRow key={index}>
                  <TableCell>
                    <Input 
                      value={estimate.activity} 
                      onChange={(e) => handleUpdateTimeEstimate(index, 'activity', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.activity)}`}
                    />
                    {rowFlags.activity && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Activity is required</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={estimate.hours} 
                      onChange={(e) => handleUpdateTimeEstimate(index, 'hours', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.hours)}`}
                    />
                    {rowFlags.hours && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={estimate.rate} 
                      onChange={(e) => handleUpdateTimeEstimate(index, 'rate', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.rate)}`}
                    />
                    {rowFlags.rate && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 font-medium">${(estimate.hours * estimate.rate).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveTimeEstimate(index)}
                    >
                      <X size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={5}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddTimeEstimate}
                    className="w-full"
                  >
                    <PlusCircle size={16} className="mr-2" />
                    Add Time Estimate
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-medium mb-4" style={{ color: "#081120" }}>Personnel</h3>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: "#081120" }}>Role</TableHead>
                <TableHead style={{ color: "#081120" }}>Hourly Rate</TableHead>
                <TableHead style={{ color: "#081120" }}>Quantity</TableHead>
                <TableHead style={{ color: "#081120" }}>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteData.personnel.map((person, index) => {
                const rowFlags = lineItemValidation.personnel[index];
                return (
                <TableRow key={index}>
                  <TableCell>
                    <Input 
                      value={person.role} 
                      onChange={(e) => handleUpdatePersonnel(index, 'role', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.role)}`}
                    />
                    {rowFlags.role && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Role is required</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={person.hourlyRate} 
                      onChange={(e) => handleUpdatePersonnel(index, 'hourlyRate', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.hourlyRate)}`}
                    />
                    {rowFlags.hourlyRate && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={person.quantity} 
                      onChange={(e) => handleUpdatePersonnel(index, 'quantity', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.quantity)}`}
                    />
                    {rowFlags.quantity && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 font-medium">${(person.hourlyRate * person.quantity).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemovePersonnel(index)}
                    >
                      <X size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={5}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddPersonnel}
                    className="w-full"
                  >
                    <PlusCircle size={16} className="mr-2" />
                    Add Personnel
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium" style={{ color: "#081120" }}>Equipment</h3>
            
            {!isLoadingServices && services && services.length > 0 && (
              <div className="flex gap-2">
                <Select 
                  onValueChange={(value) => {
                    const serviceId = parseInt(value.split('-')[1]);
                    const selectedService = services.find(s => s.id === serviceId);
                    
                    if (selectedService) {
                      let newEquipment = [...quoteData.equipment];
                      
                      // Add equipment based on service type
                      if (selectedService.name.includes("Roof")) {
                        newEquipment.push({ name: "DJI Mavic 3E", hourlyRate: 125, included: true, quantity: 1 });
                        newEquipment.push({ name: "Thermal Camera", hourlyRate: 75, included: true, quantity: 1 });
                        newEquipment.push({ name: "Data Processing Software", hourlyRate: 25, included: true, quantity: 1 });
                      } else if (selectedService.name.includes("Real Estate")) {
                        newEquipment.push({ name: "DJI Air 2S", hourlyRate: 95, included: true, quantity: 1 });
                        newEquipment.push({ name: "Professional Camera Gimbal", hourlyRate: 45, included: true, quantity: 1 });
                        newEquipment.push({ name: "Video Editing Suite", hourlyRate: 35, included: true, quantity: 1 });
                      } else if (selectedService.name.includes("3D") || selectedService.name.includes("Photogrammetry")) {
                        newEquipment.push({ name: "DJI Matrice 300 RTK", hourlyRate: 175, included: true, quantity: 1 });
                        newEquipment.push({ name: "RTK Base Station", hourlyRate: 85, included: true, quantity: 1 });
                        newEquipment.push({ name: "Pix4D Processing Software", hourlyRate: 65, included: true, quantity: 1 });
                      } else {
                        // Generic equipment for other services
                        newEquipment.push({ name: "Standard Drone", hourlyRate: 75, included: true, quantity: 1 });
                        newEquipment.push({ name: "Standard Software", hourlyRate: 25, included: true, quantity: 1 });
                      }
                      
                      setQuoteData({...quoteData, equipment: newEquipment});
                      toast({
                        title: "Equipment added",
                        description: `Added standard equipment for ${selectedService.name}`,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Add Service Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={`service-${service.id}`}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: "#081120" }}>Equipment</TableHead>
                <TableHead style={{ color: "#081120" }}>Rate</TableHead>
                <TableHead style={{ color: "#081120" }}>Included</TableHead>
                <TableHead style={{ color: "#081120" }}>Quantity</TableHead>
                <TableHead style={{ color: "#081120" }}>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteData.equipment.map((equip, index) => {
                const rowFlags = lineItemValidation.equipment[index];
                return (
                <TableRow key={index}>
                  <TableCell>
                    <Input 
                      value={equip.name} 
                      onChange={(e) => handleUpdateEquipment(index, 'name', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.name)}`}
                    />
                    {rowFlags.name && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Name is required</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={equip.hourlyRate} 
                      onChange={(e) => handleUpdateEquipment(index, 'hourlyRate', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.hourlyRate)}`}
                    />
                    {rowFlags.hourlyRate && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={equip.included} 
                      onCheckedChange={(checked) => handleUpdateEquipment(index, 'included', checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0"
                      value={equip.quantity} 
                      onChange={(e) => handleUpdateEquipment(index, 'quantity', e.target.value)}
                      className={`text-gray-900 dark:text-gray-100${errBorder(rowFlags.quantity)}`}
                    />
                    {rowFlags.quantity && saveAttempted && (
                      <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 font-medium">${equip.included ? (equip.hourlyRate * equip.quantity).toFixed(2) : "0.00"}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveEquipment(index)}
                    >
                      <X size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={6}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddEquipment}
                    className="w-full"
                  >
                    <PlusCircle size={16} className="mr-2" />
                    Add Equipment
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Travel Expenses Section */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: "#081120" }}>Travel</h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]" style={{ color: "#081120" }}>Location/Description</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Mileage</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Cost per Mile</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Travel Speed (mph)</TableHead>
                  <TableHead className="w-[20%]" style={{ color: "#081120" }}>Total Cost</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteData.expenses
                  .filter(expense => expense.expenseType === 'Travel')
                  .map((expense, index) => {
                    // Find the actual index in the full expenses array
                    const actualIndex = quoteData.expenses.findIndex(e => e === expense);
                    const rowFlags = lineItemValidation.expenses[actualIndex];
                    // Calculate the components of the cost
                    const mileageCost = (expense.mileage || 0) * (expense.costPerMile || 0);
                    const pilotRate = quoteData.personnel.find(p => p.role === "Pilot in Command")?.hourlyRate || 50;
                    const travelTimeHours = (expense.mileage || 0) / (expense.travelSpeed || 55);
                    const travelTimeCost = travelTimeHours * pilotRate;
                    
                    return (
                      <TableRow key={actualIndex}>
                        <TableCell>
                          <Input 
                            value={expense.name} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'name', e.target.value)}
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.name)}`}
                            placeholder="Location or route description"
                          />
                          {rowFlags.name && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Description is required</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.mileage || 0} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'mileage', e.target.value)}
                            placeholder="0"
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.mileage)}`}
                          />
                          {rowFlags.mileage && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.costPerMile || 0.485} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'costPerMile', e.target.value)}
                            step="0.01"
                            placeholder="0.485"
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.costPerMile)}`}
                          />
                          {rowFlags.costPerMile && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.travelSpeed || 55} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'travelSpeed', e.target.value)}
                            placeholder="55"
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.travelSpeed)}`}
                          />
                          {rowFlags.travelSpeed && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          <div className="font-semibold">${expense.cost.toFixed(2)}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <div>Mileage cost: ${mileageCost.toFixed(2)}</div>
                            <div>Time cost: ${travelTimeCost.toFixed(2)}</div>
                            <div className="text-xs italic mt-1">
                              ({travelTimeHours.toFixed(1)} hours @ ${pilotRate}/hr)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveExpense(actualIndex)}
                          >
                            <X size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                <TableRow>
                  <TableCell colSpan={6}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddTravelExpense}
                      className="w-full"
                    >
                      <PlusCircle size={16} className="mr-2" />
                      Add Travel Expense
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Other Expenses Section */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: "#081120" }}>Expenses</h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]" style={{ color: "#081120" }}>Expense Type</TableHead>
                  <TableHead className="w-[25%]" style={{ color: "#081120" }}>Item/Description</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Quantity</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Unit Price</TableHead>
                  <TableHead className="w-[15%]" style={{ color: "#081120" }}>Total Cost</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteData.expenses
                  .filter(expense => expense.expenseType !== 'Travel')
                  .map((expense, index) => {
                    // Find the actual index in the full expenses array
                    const actualIndex = quoteData.expenses.findIndex(e => e === expense);
                    const rowFlags = lineItemValidation.expenses[actualIndex];
                    return (
                      <TableRow key={actualIndex}>
                        <TableCell>
                          <Select
                            value={expense.expenseType}
                            onValueChange={(value) => handleUpdateExpense(actualIndex, 'expenseType', value)}
                          >
                            <SelectTrigger className="w-full text-gray-900 dark:text-gray-100">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Supplies">Supplies</SelectItem>
                              <SelectItem value="Accommodation">Accommodation</SelectItem>
                              <SelectItem value="Equipment">Equipment Rental</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={expense.name} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'name', e.target.value)}
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.name)}`}
                            placeholder="Item name"
                          />
                          {rowFlags.name && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Description is required</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.quantity || 1} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'quantity', e.target.value)}
                            placeholder="1"
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.quantity)}`}
                          />
                          {rowFlags.quantity && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.unitPrice || 0} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'unitPrice', e.target.value)}
                            step="0.01"
                            placeholder="0.00"
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.unitPrice)}`}
                          />
                          {rowFlags.unitPrice && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={expense.cost} 
                            onChange={(e) => handleUpdateExpense(actualIndex, 'cost', e.target.value)}
                            className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.cost)}`}
                          />
                          {rowFlags.cost && saveAttempted && (
                            <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveExpense(actualIndex)}
                          >
                            <X size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                <TableRow>
                  <TableCell colSpan={6}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddExpense}
                      className="w-full"
                    >
                      <PlusCircle size={16} className="mr-2" />
                      Add Expense
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 mb-6">
          <h3 className="text-lg font-medium mb-4" style={{ color: "#081120" }}>Third Party Products</h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70%]" style={{ color: "#081120" }}>Product</TableHead>
                  <TableHead className="w-[20%]" style={{ color: "#081120" }}>Cost</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quoteData.thirdPartyProducts.map((product, index) => {
                  const rowFlags = lineItemValidation.thirdPartyProducts[index];
                  return (
                  <TableRow key={index}>
                    <TableCell>
                      <Input 
                        value={product.name} 
                        onChange={(e) => handleUpdateThirdPartyProduct(index, 'name', e.target.value)}
                        className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.name)}`}
                      />
                      {rowFlags.name && saveAttempted && (
                        <p className="text-xs text-destructive mt-1">Name is required</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        min="0"
                        value={product.cost} 
                        onChange={(e) => handleUpdateThirdPartyProduct(index, 'cost', e.target.value)}
                        className={`w-full text-gray-900 dark:text-gray-100${errBorder(rowFlags.cost)}`}
                        step="0.01"
                      />
                      {rowFlags.cost && saveAttempted && (
                        <p className="text-xs text-destructive mt-1">Must be ≥ 0</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveThirdPartyProduct(index)}
                      >
                        <X size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddThirdPartyProduct}
                      className="w-full"
                    >
                      <PlusCircle size={16} className="mr-2" />
                      Add Third Party Product
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="deliveryTimeHours">Delivery Time (hours)</Label>
            <Input 
              id="deliveryTimeHours" 
              type="number" 
              value={quoteData.deliveryTimeHours} 
              onChange={(e) => setQuoteData({...quoteData, deliveryTimeHours: parseInt(e.target.value) || 0})}
              className="text-gray-900 dark:text-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Time from mission completion to delivery of data assets
            </p>
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea 
              id="notes" 
              value={quoteData.notes} 
              onChange={(e) => setQuoteData({...quoteData, notes: e.target.value})}
              placeholder="Enter additional notes or terms"
              rows={3}
              className="text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold" style={{ color: "#081120" }}>Total Quote Amount:</h3>
            <p className="text-2xl font-bold text-gold text-gray-900 dark:text-gray-100">${typeof quoteData.totalAmount === 'number' ? quoteData.totalAmount.toFixed(2) : parseFloat(String(quoteData.totalAmount || 0)).toFixed(2)}</p>
          </div>

          {/* Calculated Cost Allocations moved here from the Business Costs section */}
          {(quoteData.depreciableAssetsSplit || quoteData.advertisementSplit || quoteData.insuranceSplit) && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">Business Cost Allocations</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Depreciable Assets: </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${quoteData.depreciableAssetsSplit || '0.00'}/mission</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Advertisement: </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${quoteData.advertisementSplit || '0.00'}/mission</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Insurance: </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${quoteData.insuranceSplit || '0.00'}/mission</span>
                </div>
              </div>
              
              {quoteData.netProfit && (
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Net Profit:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">${quoteData.netProfit}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-block"
                      onClick={() => { if (hasValidationErrors) setSaveAttempted(true); }}
                    >
                      <Button
                        onClick={isEditing ? handleUpdateQuote : handleCreateQuote}
                        disabled={createQuoteMutation.isPending || updateQuoteMutation.isPending || hasValidationErrors}
                        className="bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white"
                        style={hasValidationErrors ? { pointerEvents: "none" } : undefined}
                      >
                        {createQuoteMutation.isPending || updateQuoteMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isEditing ? (
                          <Save className="mr-2 h-4 w-4" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        {isEditing ? "Update Quote" : "Create Quote"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {hasValidationErrors && (
                    <TooltipContent>
                      <p>Fix the highlighted fields before saving</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                onClick={handleCalculateProfitability}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Profitability
              </Button>
            </div>
            {hasValidationErrors && saveAttempted && (
              <div className="flex flex-col gap-1 text-sm text-destructive">
                {validationMessages.map((msg, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render quotes list
  const renderQuotesList = () => {
    if (filteredQuotes.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No quotes found.</p>
          <Button
            onClick={() => {
              setIsCreating(true);
              setQuoteData({...initialQuoteData, userId});
              setTouchedFields(new Set());
              setSaveAttempted(false);
            }}
            className="mt-4 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Quote
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <Input
              id="search"
              placeholder="Search quotes..."
              className="w-full md:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select 
              value={sortField} 
              onValueChange={setSortField}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateCreated">Date Created</SelectItem>
                <SelectItem value="clientName">Client Name</SelectItem>
                <SelectItem value="totalAmount">Amount</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={sortDirection} 
              onValueChange={setSortDirection}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => {
                setIsCreating(true);
                setQuoteData({...initialQuoteData, userId});
                setTouchedFields(new Set());
                setSaveAttempted(false);
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{quote.projectName}</CardTitle>
                    <CardDescription>Client: {quote.clientName}</CardDescription>
                  </div>
                  <Badge 
                    className={`
                      ${quote.status === 'Accepted' ? 'bg-green-100 text-green-800' : ''}
                      ${quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' : ''}
                      ${quote.status === 'Draft' ? 'bg-gray-100 text-gray-800' : ''}
                      ${quote.status === 'Declined' ? 'bg-red-100 text-red-800' : ''}
                      ${quote.status === 'Expired' ? 'bg-orange-100 text-orange-800' : ''}
                    `}
                  >
                    {quote.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <div className="text-sm text-gray-500 mb-2">
                  Created: {format(new Date(quote.dateCreated), 'MMM d, yyyy')}
                </div>
                
                <p className="line-clamp-2 text-sm mb-4">
                  {quote.projectDescription || "No description provided."}
                </p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="ml-2 font-bold text-gold text-gray-900 dark:text-gray-100">
                      ${typeof quote.totalAmount === 'number' 
                        ? quote.totalAmount.toFixed(2)
                        : parseFloat(quote.totalAmount as string).toFixed(2)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500">Expires:</span>
                    <span className="ml-2">{format(new Date(quote.expiryDate), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-wrap gap-2 justify-between pt-2">
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditQuote(quote.id!)}
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Trash2 size={14} className="mr-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this quote? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {}}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDeleteQuote(quote.id!)}
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePrintQuote(quote.id!)}
                  >
                    <Printer size={14} />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownloadQuote(quote.id!)}
                  >
                    <Download size={14} />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSendQuote(quote.id!)}
                  >
                    <Send size={14} />
                  </Button>
                  
                  <Select 
                    value={quote.status} 
                    onValueChange={(value) => handleStatusChange(quote.id!, value)}
                  >
                    <SelectTrigger className="h-8 w-[100px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Declined">Declined</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-amber-700">
          Quote Management
        </h2>
      </div>
      
      {isCreating || isEditing ? (
        renderQuoteForm()
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 bg-[#0b111f] border border-gold-dark/30">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              All Quotes
            </TabsTrigger>
            <TabsTrigger 
              value="draft" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              Drafts
            </TabsTrigger>
            <TabsTrigger 
              value="sent" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              Sent
            </TabsTrigger>
            <TabsTrigger 
              value="accepted" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              Accepted
            </TabsTrigger>
            <TabsTrigger 
              value="declined" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              Declined
            </TabsTrigger>
            <TabsTrigger 
              value="expired" 
              className="data-[state=active]:bg-[#1c304d] data-[state=active]:text-gold data-[state=active]:border-gold data-[state=active]:border-b-2"
            >
              Expired
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : (
              renderQuotesList()
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};