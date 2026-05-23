import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ServiceAddon {
  id: number;
  serviceId: number;
  addonServiceId?: number;
  price: number;
  weeklyPrice: number;
  monthlyPrice: number;
  isEnabled: boolean;
  isSubscription: boolean;
  billingFrequency: string;
  tooltipDescription?: string;
  addonName?: string;
  addonDescription?: string;
  addonBasePrice?: number;
  isStandalone?: boolean;
}

interface AddonEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: number;
  addon?: ServiceAddon;
  onSuccess: () => void;
}

export default function AddonEditorModal({
  open,
  onOpenChange,
  serviceId,
  addon,
  onSuccess,
}: AddonEditorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addonName, setAddonName] = useState("");
  const [addonDescription, setAddonDescription] = useState("");
  const [tooltipDescription, setTooltipDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [weeklyPrice, setWeeklyPrice] = useState("0");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSubscription, setIsSubscription] = useState(false);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    setSubmitAttempted(false);
    if (addon) {
      setAddonName(addon.addonName || "");
      setAddonDescription(addon.addonDescription || "");
      setTooltipDescription(addon.tooltipDescription || "");
      setPrice(Math.round(addon.price / 100).toString());
      setWeeklyPrice(Math.round(addon.weeklyPrice / 100).toString());
      setMonthlyPrice(Math.round(addon.monthlyPrice / 100).toString());
      setIsEnabled(addon.isEnabled);
      setIsSubscription(addon.isSubscription || false);
      const freqs = (addon.billingFrequency || "").split(",");
      setWeeklyEnabled(freqs.includes("weekly"));
      setMonthlyEnabled(freqs.includes("monthly"));
    } else {
      setAddonName("");
      setAddonDescription("");
      setTooltipDescription("");
      setPrice("0");
      setWeeklyPrice("0");
      setMonthlyPrice("0");
      setIsEnabled(true);
      setIsSubscription(false);
      setWeeklyEnabled(false);
      setMonthlyEnabled(false);
    }
  }, [addon, open]);

  const buildPayload = () => {
    const freqs = [
      weeklyEnabled && "weekly",
      monthlyEnabled && "monthly",
    ]
      .filter(Boolean)
      .join(",");

    return {
      serviceId,
      addonName: addonName.trim(),
      addonDescription: addonDescription.trim(),
      tooltipDescription: tooltipDescription.trim() || null,
      price: Math.round(parseFloat(price) * 100) || 0,
      weeklyPrice: Math.round(parseFloat(weeklyPrice) * 100) || 0,
      monthlyPrice: Math.round(parseFloat(monthlyPrice) * 100) || 0,
      isEnabled,
      isSubscription,
      billingFrequency: freqs || null,
      isStandalone: true,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildPayload>) => {
      const res = await apiRequest("POST", `/api/service-addons`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Add-on created successfully" });
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof buildPayload>) => {
      const res = await apiRequest("PUT", `/api/service-addons/${addon!.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Add-on updated successfully" });
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isPriceValid = (value: string) =>
    value.trim() !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;

  const handleSubmit = () => {
    setSubmitAttempted(true);
    const payload = buildPayload();
    if (!payload.addonName) {
      toast({ title: "Please enter an add-on name", variant: "destructive" });
      return;
    }
    if (!isPriceValid(price)) return;
    if (isSubscription && weeklyEnabled && !isPriceValid(weeklyPrice)) return;
    if (isSubscription && monthlyEnabled && !isPriceValid(monthlyPrice)) return;
    if (addon) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{addon ? "Edit Add-on" : "Create New Add-on"}</DialogTitle>
          <DialogDescription>
            {addon
              ? "Update the add-on details and pricing."
              : "Create a new add-on for this service."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Add-on Name</Label>
            <Input
              value={addonName}
              onChange={(e) => setAddonName(e.target.value)}
              placeholder="e.g. Thermal Imaging"
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={addonDescription}
              onChange={(e) => setAddonDescription(e.target.value)}
              placeholder="Describe the add-on..."
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Tooltip Description</Label>
            <Input
              value={tooltipDescription}
              onChange={(e) => setTooltipDescription(e.target.value)}
              placeholder="Short tooltip shown to customers"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>One-time Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={submitAttempted && !isPriceValid(price) ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {submitAttempted && !isPriceValid(price) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Weekly Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={weeklyPrice}
                onChange={(e) => setWeeklyPrice(e.target.value)}
                disabled={!isSubscription}
                className={submitAttempted && isSubscription && weeklyEnabled && !isPriceValid(weeklyPrice) ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {submitAttempted && isSubscription && weeklyEnabled && !isPriceValid(weeklyPrice) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Monthly Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                disabled={!isSubscription}
                className={submitAttempted && isSubscription && monthlyEnabled && !isPriceValid(monthlyPrice) ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {submitAttempted && isSubscription && monthlyEnabled && !isPriceValid(monthlyPrice) && (
                <p className="text-xs text-red-500">Please enter a valid price</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              <Label>Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isSubscription} onCheckedChange={setIsSubscription} />
              <Label>Subscription</Label>
            </div>
            {isSubscription && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={weeklyEnabled} onCheckedChange={setWeeklyEnabled} />
                  <Label>Weekly billing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={monthlyEnabled} onCheckedChange={setMonthlyEnabled} />
                  <Label>Monthly billing</Label>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : addon ? "Save Changes" : "Create Add-on"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
