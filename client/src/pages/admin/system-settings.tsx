import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useDismissibleBanner, BANNER_REGISTRY, BannerRegistryEntry } from "@/hooks/use-dismissible-banner";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Users, Palette, Shield, Database, Loader2, Eye, Link2, Save, FolderOpen } from "lucide-react";
import type { BusinessConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function BannerRow({ entry }: { entry: BannerRegistryEntry }) {
  const { toast } = useToast();
  const { dismissed, dismiss, restore } = useDismissibleBanner(entry.key);

  const handleRestore = () => {
    restore();
    toast({ title: "Hint restored", description: `The "${entry.label}" will appear again.` });
  };

  const handleDismiss = () => {
    dismiss();
    toast({ title: "Hint dismissed", description: `The "${entry.label}" has been hidden.` });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{entry.label}</p>
        {entry.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {!dismissed ? "Currently visible" : "Dismissed — click to restore"}
        </p>
      </div>
      <div className="flex gap-2">
        {!dismissed ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestore}
          >
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

function ShareableLinkDisclaimerEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery<BusinessConfig | null>({
    queryKey: ["/api/business-config"],
  });
  const remoteValue = config?.shareableLinkDisclaimer ?? "";
  const [draft, setDraft] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the textarea once the GET resolves.
  useEffect(() => {
    if (!hydrated && !isLoading) {
      setDraft(remoteValue);
      setHydrated(true);
    }
  }, [hydrated, isLoading, remoteValue]);

  const isDirty = draft !== remoteValue;

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const trimmed = value.trim();
      const body: Partial<BusinessConfig> = {
        shareableLinkDisclaimer: trimmed.length > 0 ? trimmed : null,
      };
      const res = await apiRequest("POST", "/api/business-config", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/global-disclaimer"] });
      toast({ title: "Disclaimer saved", description: "The shareable link disclaimer has been updated." });
    },
    onError: (err: Error) => {
      toast({
        title: "Save failed",
        description: err.message || "Could not save the disclaimer.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-3">
      <Label htmlFor="shareable-link-disclaimer" className="text-xs text-muted-foreground">
        Disclaimer text
      </Label>
      <Textarea
        id="shareable-link-disclaimer"
        data-testid="input-shareable-link-disclaimer"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. Files shared through this link are confidential and intended only for the recipient."
        rows={4}
        disabled={isLoading || saveMutation.isPending}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {remoteValue
            ? "Currently active on every shareable link interstitial."
            : "No disclaimer is currently shown on shareable link interstitials."}
        </p>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(draft)}
          disabled={!isDirty || saveMutation.isPending}
          data-testid="button-save-shareable-link-disclaimer"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: systemInfo } = useQuery({
    queryKey: ["/api/system-info"],
  });

  return (
    <>
      <Helmet>
        <title>System Settings - Apollo DroneWorks Admin</title>
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Control Center
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Manage users, security, and system configuration
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Theme Editor
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">User Management</h2>
              <Link href="/admin/users">
                <Button>Manage Users</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users?.slice(0, 6)?.map((user: any) => (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{user.username}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Role: {user.isAdmin ? 'Admin' : 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Name: {user.firstName} {user.lastName}
                      </p>
                      {user.phone && (
                        <p className="text-sm text-muted-foreground">
                          Phone: {user.phone}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No users found. Add your first user to get started.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Theme Customization</h2>
              <Link href="/admin/theme">
                <Button>Customize Theme</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Color Scheme</CardTitle>
                  <CardDescription>Customize your brand colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Primary Color</span>
                      <div className="w-8 h-8 bg-primary rounded-md border"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Secondary Color</span>
                      <div className="w-8 h-8 bg-secondary rounded-md border"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Accent Color</span>
                      <div className="w-8 h-8 bg-accent rounded-md border"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Typography</CardTitle>
                  <CardDescription>Font and text settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Current font family: Inter
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Base font size: 16px
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Line height: 1.5
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Layout Options</CardTitle>
                  <CardDescription>Page layout preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Sidebar: Collapsible
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Header: Fixed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Container width: Max 1200px
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Dark Mode</CardTitle>
                  <CardDescription>Theme appearance settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Current mode: Light
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Auto-switch: Disabled
                    </p>
                    <p className="text-sm text-muted-foreground">
                      User preference: System
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Security Settings</h2>
              <Link href="/admin/security">
                <Button>Security Settings</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>Login and access controls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Session timeout: 24 hours
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Password policy: Strong
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Two-factor auth: Optional
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Access Control</CardTitle>
                  <CardDescription>User permissions and roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Admin users: 1
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Regular users: {users?.length ? users.length - 1 : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Guest access: Disabled
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>API Security</CardTitle>
                  <CardDescription>API access and rate limiting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Rate limiting: Enabled
                    </p>
                    <p className="text-sm text-muted-foreground">
                      API keys: Active
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CORS policy: Configured
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Data Protection</CardTitle>
                  <CardDescription>Privacy and data security</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Encryption: AES-256
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Backup frequency: Daily
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Data retention: 7 years
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">System Information</h2>
              <Link href="/admin/system">
                <Button>System Dashboard</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-xs text-muted-foreground">
                    Uptime: 99.9%
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Database</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Connected</div>
                  <p className="text-xs text-muted-foreground">
                    PostgreSQL 14.x
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {systemInfo?.storageUsed || '1.2'} GB
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {systemInfo?.storageTotal || '10'} GB used
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Application Info</CardTitle>
                  <CardDescription>Version and build information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Version: 2.1.0
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Build: #1247
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Environment: Production
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                  <CardDescription>System performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Response time: 120ms avg
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Memory usage: 45%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CPU usage: 12%
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance</CardTitle>
                  <CardDescription>System maintenance status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Last backup: 2 hours ago
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Next maintenance: Sunday 2 AM
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Auto-updates: Enabled
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">Admin Hints</CardTitle>
                    <CardDescription className="mt-1">Dismiss or restore informational banners from one place</CardDescription>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {BANNER_REGISTRY.map((entry) => (
                      <BannerRow key={entry.key} entry={entry} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">File Management</CardTitle>
                    <CardDescription className="mt-1">Review and purge expired client deliverable files</CardDescription>
                  </div>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-4">
                  <Link href="/admin/file-management">
                    <Button size="sm" variant="outline">Manage Expired Files</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">Shareable Link Disclaimer</CardTitle>
                    <CardDescription className="mt-1">
                      A single global disclaimer shown on every shareable link interstitial. Applies to all shareable links (not per-service, not per-customer). Editable until changed.
                    </CardDescription>
                  </div>
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-4">
                  <ShareableLinkDisclaimerEditor />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}