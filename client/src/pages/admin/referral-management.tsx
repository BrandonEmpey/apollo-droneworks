import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Eye, Edit, Gift, TrendingUp, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const referralProgramSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  referrerRewardType: z.enum(["percentage", "fixed_amount", "service_credit"]),
  referrerRewardValue: z.string().min(1, "Reward value is required"),
  refereeRewardType: z.enum(["percentage", "fixed_amount", "service_credit"]),
  refereeRewardValue: z.string().min(1, "Reward value is required"),
  minimumOrderValue: z.string().optional(),
  maxRewardsPerReferrer: z.string().optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  termsAndConditions: z.string().optional()
});

const codeGenerationSchema = z.object({
  referrerId: z.string().min(1, "Referrer ID is required"),
  programId: z.string().min(1, "Program is required"),
  customCode: z.string().optional(),
  maxUsage: z.string().optional(),
  expiresAt: z.string().optional()
});

type ReferralProgram = {
  id: number;
  name: string;
  description?: string;
  referrerRewardType: string;
  referrerRewardValue: string;
  refereeRewardType: string;
  refereeRewardValue: string;
  minimumOrderValue?: string;
  maxRewardsPerReferrer?: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
};

type ReferralCode = {
  id: number;
  code: string;
  referrerId: number;
  programId: number;
  programName?: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  expiresAt?: string;
  createdAt: string;
};

export default function ReferralManagement() {
  const [selectedProgram, setSelectedProgram] = useState<ReferralProgram | null>(null);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: programs = [] } = useQuery<ReferralProgram[]>({
    queryKey: ["/api/referral/programs"],
  });

  const { data: codes = [] } = useQuery<ReferralCode[]>({
    queryKey: ["/api/referral/codes"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/referral/analytics"],
  });

  const programForm = useForm<z.infer<typeof referralProgramSchema>>({
    resolver: zodResolver(referralProgramSchema),
    defaultValues: {
      isActive: true,
      referrerRewardType: "percentage",
      refereeRewardType: "percentage"
    }
  });

  const codeForm = useForm<z.infer<typeof codeGenerationSchema>>({
    resolver: zodResolver(codeGenerationSchema)
  });

  const createProgramMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/referral/programs", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/programs"] });
      setIsProgramDialogOpen(false);
      programForm.reset();
    }
  });

  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/referral/programs/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/programs"] });
      setIsProgramDialogOpen(false);
      setSelectedProgram(null);
      programForm.reset();
    }
  });

  const generateCodeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/referral/codes/generate", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/codes"] });
      setIsCodeDialogOpen(false);
      codeForm.reset();
    }
  });

  const onSubmitProgram = (data: z.infer<typeof referralProgramSchema>) => {
    const formattedData = {
      ...data,
      referrerRewardValue: parseFloat(data.referrerRewardValue),
      refereeRewardValue: parseFloat(data.refereeRewardValue),
      minimumOrderValue: data.minimumOrderValue ? parseFloat(data.minimumOrderValue) : null,
      maxRewardsPerReferrer: data.maxRewardsPerReferrer ? parseInt(data.maxRewardsPerReferrer) : null,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : null
    };

    if (selectedProgram) {
      updateProgramMutation.mutate({ id: selectedProgram.id, data: formattedData });
    } else {
      createProgramMutation.mutate(formattedData);
    }
  };

  const onSubmitCode = (data: z.infer<typeof codeGenerationSchema>) => {
    const formattedData = {
      ...data,
      referrerId: parseInt(data.referrerId),
      programId: parseInt(data.programId),
      maxUsage: data.maxUsage ? parseInt(data.maxUsage) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
    };
    generateCodeMutation.mutate(formattedData);
  };

  const editProgram = (program: ReferralProgram) => {
    setSelectedProgram(program);
    programForm.reset({
      name: program.name,
      description: program.description || "",
      referrerRewardType: program.referrerRewardType as any,
      referrerRewardValue: program.referrerRewardValue,
      refereeRewardType: program.refereeRewardType as any,
      refereeRewardValue: program.refereeRewardValue,
      minimumOrderValue: program.minimumOrderValue || "",
      maxRewardsPerReferrer: program.maxRewardsPerReferrer?.toString() || "",
      isActive: program.isActive,
      termsAndConditions: program.termsAndConditions || ""
    });
    setIsProgramDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Referral Management</h1>
          <p className="text-muted-foreground">Manage referral programs and track performance</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Gift className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Referral Code</DialogTitle>
                <DialogDescription>Create a new referral code for a customer</DialogDescription>
              </DialogHeader>
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="space-y-4">
                  <FormField
                    control={codeForm.control}
                    name="referrerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referrer Customer ID</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="Enter customer ID" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={codeForm.control}
                    name="programId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referral Program</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programs.filter(p => p.isActive).map((program) => (
                              <SelectItem key={program.id} value={program.id.toString()}>
                                {program.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={codeForm.control}
                    name="customCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Code (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Leave empty for auto-generated" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={codeForm.control}
                    name="maxUsage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Usage (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="Unlimited if empty" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={codeForm.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expires At (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={generateCodeMutation.isPending}>
                    Generate Code
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setSelectedProgram(null); programForm.reset(); }}>
                <Plus className="w-4 h-4 mr-2" />
                New Program
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedProgram ? "Edit Referral Program" : "Create Referral Program"}
                </DialogTitle>
                <DialogDescription>
                  Set up rewards for both referrers and new customers
                </DialogDescription>
              </DialogHeader>
              <Form {...programForm}>
                <form onSubmit={programForm.handleSubmit(onSubmitProgram)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={programForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Spring Referral Program" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={programForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={programForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Program description..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Referrer Rewards</h4>
                      <FormField
                        control={programForm.control}
                        name="referrerRewardType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                                <SelectItem value="service_credit">Service Credit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={programForm.control}
                        name="referrerRewardValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward Value</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="e.g., 10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">New Customer Rewards</h4>
                      <FormField
                        control={programForm.control}
                        name="refereeRewardType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                                <SelectItem value="service_credit">Service Credit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={programForm.control}
                        name="refereeRewardValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reward Value</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="e.g., 5" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={programForm.control}
                      name="minimumOrderValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Value (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="e.g., 100" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={programForm.control}
                      name="maxRewardsPerReferrer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Rewards per Referrer (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="e.g., 10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={programForm.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms and Conditions</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Program terms..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={createProgramMutation.isPending || updateProgramMutation.isPending}>
                    {selectedProgram ? "Update Program" : "Create Program"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalReferrals || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.totalRewardsPaid || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.completedReferrals || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.pendingReferrals || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="codes">Referral Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <div className="grid gap-4">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {program.name}
                        <Badge variant={program.isActive ? "default" : "secondary"}>
                          {program.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{program.description}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => editProgram(program)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Referrer Reward</p>
                      <p className="text-muted-foreground">
                        {program.referrerRewardType === 'percentage' ? `${program.referrerRewardValue}%` : 
                         program.referrerRewardType === 'fixed_amount' ? formatCurrency(parseFloat(program.referrerRewardValue)) :
                         `$${program.referrerRewardValue} Credit`}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">New Customer Reward</p>
                      <p className="text-muted-foreground">
                        {program.refereeRewardType === 'percentage' ? `${program.refereeRewardValue}%` : 
                         program.refereeRewardType === 'fixed_amount' ? formatCurrency(parseFloat(program.refereeRewardValue)) :
                         `$${program.refereeRewardValue} Credit`}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Min Order</p>
                      <p className="text-muted-foreground">
                        {program.minimumOrderValue ? formatCurrency(parseFloat(program.minimumOrderValue)) : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Max Rewards</p>
                      <p className="text-muted-foreground">
                        {program.maxRewardsPerReferrer || "Unlimited"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <div className="grid gap-4">
            {codes.map((code) => (
              <Card key={code.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-mono">
                        {code.code}
                        <Badge variant={code.isActive ? "default" : "secondary"}>
                          {code.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Program: {code.programName} | Referrer ID: {code.referrerId}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Usage Count</p>
                      <p className="text-muted-foreground">{code.usageCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Max Usage</p>
                      <p className="text-muted-foreground">{code.maxUsage || "Unlimited"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Expires</p>
                      <p className="text-muted-foreground">
                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}