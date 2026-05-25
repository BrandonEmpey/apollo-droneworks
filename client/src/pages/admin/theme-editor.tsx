import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Palette, Type, Layout, Eye, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Apollo DroneWorks canonical theme values — always the safe fallback
const APOLLO_DEFAULTS = {
  primary: "#C7AE6A",
  appearance: "dark",
  radius: 0.5,
  variant: "professional",
} as const;

const STORAGE_KEY = "theme-config";

export default function ThemeEditor() {
  const { toast } = useToast();

  const [primaryColor, setPrimaryColor] = useState<string>(APOLLO_DEFAULTS.primary);
  const [appearance, setAppearance] = useState<string>(APOLLO_DEFAULTS.appearance);
  const [radius, setRadius] = useState<number[]>([APOLLO_DEFAULTS.radius]);
  const [variant, setVariant] = useState<string>(APOLLO_DEFAULTS.variant);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load previously saved theme on mount; fall back to Apollo defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.primary) setPrimaryColor(parsed.primary);
        if (parsed.appearance) setAppearance(parsed.appearance);
        if (typeof parsed.radius === "number") setRadius([parsed.radius]);
        if (parsed.variant) setVariant(parsed.variant);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  const commitSave = () => {
    const themeConfig = {
      primary: primaryColor,
      appearance,
      radius: radius[0],
      variant,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(themeConfig));

    // Apply only the shadcn --primary variable using the correct HSL format.
    // Apollo gold #C7AE6A ≈ hsl(46 45% 58%) — keep it in sync.
    // For any other value, convert it or leave the default alone.
    if (primaryColor === APOLLO_DEFAULTS.primary) {
      document.documentElement.style.removeProperty("--primary");
    } else {
      // Inline hex breaks hsl(var(--primary)) in shadcn — warn and skip
      toast({
        title: "Note",
        description: "Custom primary colours require a manual CSS update to fully apply. The value has been saved.",
      });
    }

    toast({
      title: "Theme saved",
      description: "Your theme settings have been saved.",
    });
  };

  const handleResetToDefault = () => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--primary-foreground");
    setPrimaryColor(APOLLO_DEFAULTS.primary);
    setAppearance(APOLLO_DEFAULTS.appearance);
    setRadius([APOLLO_DEFAULTS.radius]);
    setVariant(APOLLO_DEFAULTS.variant);
    toast({ title: "Reset complete", description: "Theme restored to Apollo DroneWorks defaults." });
  };

  return (
    <>
      <Helmet>
        <title>Theme Editor — Apollo DroneWorks Admin</title>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Link href="/admin/settings">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to System Settings
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-2">Theme Editor</h1>
          <p className="text-muted-foreground">
            Customise the appearance and branding of your Apollo DroneWorks platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="colors" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Colors
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center gap-2">
                  <Type className="h-4 w-4" /> Typography
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" /> Layout
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Colour Scheme</CardTitle>
                    <CardDescription>Customise brand colours and appearance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Colour</Label>
                      <div className="flex items-center space-x-4">
                        <Input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-20 h-10 p-1 border rounded cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#C7AE6A"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appearance">Appearance</Label>
                      <Select value={appearance} onValueChange={setAppearance}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select appearance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="variant">Theme Variant</Label>
                      <Select value={variant} onValueChange={setVariant}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="tint">Tint</SelectItem>
                          <SelectItem value="vibrant">Vibrant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="radius">Border Radius: {radius[0]}</Label>
                      <Slider
                        id="radius"
                        value={radius}
                        onValueChange={setRadius}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="typography" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Typography Settings</CardTitle>
                    <CardDescription>Configure fonts and text appearance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select defaultValue="inter">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inter">Inter</SelectItem>
                          <SelectItem value="roboto">Roboto</SelectItem>
                          <SelectItem value="opensans">Open Sans</SelectItem>
                          <SelectItem value="lato">Lato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Base Font Size</Label>
                      <Select defaultValue="16">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="14">14px</SelectItem>
                          <SelectItem value="16">16px</SelectItem>
                          <SelectItem value="18">18px</SelectItem>
                          <SelectItem value="20">20px</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Line Height</Label>
                      <Select defaultValue="1.5">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.2">1.2</SelectItem>
                          <SelectItem value="1.4">1.4</SelectItem>
                          <SelectItem value="1.5">1.5</SelectItem>
                          <SelectItem value="1.6">1.6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout Options</CardTitle>
                    <CardDescription>Configure page layout and navigation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Sidebar Style</Label>
                      <Select defaultValue="collapsible">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="collapsible">Collapsible</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Header Style</Label>
                      <Select defaultValue="fixed">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="static">Static</SelectItem>
                          <SelectItem value="sticky">Sticky</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Container Width</Label>
                      <Select defaultValue="1200">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024">1024px</SelectItem>
                          <SelectItem value="1200">1200px</SelectItem>
                          <SelectItem value="1400">1400px</SelectItem>
                          <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Preview</CardTitle>
                    <CardDescription>Preview your theme changes before saving.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="p-6 border rounded-lg"
                      style={{
                        backgroundColor: appearance === "dark" ? "#1f2937" : "#ffffff",
                        color: appearance === "dark" ? "#f9fafb" : "#111827",
                        borderRadius: `${radius[0]}rem`,
                      }}
                    >
                      <h3 className="text-lg font-semibold mb-2">Sample Content</h3>
                      <p className="text-sm opacity-70 mb-4">
                        This is how your content will look with the current theme settings.
                      </p>
                      <Button style={{ backgroundColor: primaryColor }} className="text-black font-semibold">
                        Primary Button
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Save or reset your theme changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setConfirmOpen(true)} className="w-full bg-gold text-black hover:bg-gold/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Theme
                </Button>
                <Button variant="outline" onClick={handleResetToDefault} className="w-full">
                  Reset to Apollo Default
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Current Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Primary Colour:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: primaryColor }} />
                    <span>{primaryColor}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Appearance:</span>
                  <span className="capitalize">{appearance}</span>
                </div>
                <div className="flex justify-between">
                  <span>Variant:</span>
                  <span className="capitalize">{variant}</span>
                </div>
                <div className="flex justify-between">
                  <span>Border Radius:</span>
                  <span>{radius[0]}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#132642] border-gold-dark/30 text-offwhite">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold-gradient">Save Theme Changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-offwhite/70">
              You are about to apply the following theme settings site-wide:
              <ul className="mt-3 space-y-1 text-sm text-offwhite/80 list-none">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white/30 inline-block" style={{ backgroundColor: primaryColor }} />
                  Primary colour: <strong>{primaryColor}</strong>
                </li>
                <li>Appearance: <strong className="capitalize">{appearance}</strong></li>
                <li>Variant: <strong className="capitalize">{variant}</strong></li>
                <li>Border radius: <strong>{radius[0]}</strong></li>
              </ul>
              <p className="mt-3">This will overwrite the current saved theme. Are you sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold-dark/40 text-offwhite hover:bg-gold-dark/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-gold text-black hover:bg-gold/90"
              onClick={commitSave}
            >
              Yes, Save Theme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
