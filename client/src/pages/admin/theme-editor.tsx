import { useState } from "react";
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
import { ArrowLeft, Palette, Type, Layout, Eye } from "lucide-react";

export default function ThemeEditor() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [appearance, setAppearance] = useState("light");
  const [radius, setRadius] = useState([0.5]);
  const [variant, setVariant] = useState("professional");

  const handleSaveTheme = () => {
    const themeConfig = {
      primary: primaryColor,
      appearance,
      radius: radius[0],
      variant,
    };
    
    // Save theme configuration
    localStorage.setItem("theme-config", JSON.stringify(themeConfig));
    
    // Apply theme changes (this would typically update CSS custom properties)
    document.documentElement.style.setProperty("--primary", primaryColor);
  };

  return (
    <>
      <Helmet>
        <title>Theme Editor - Apollo DroneWorks Admin</title>
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
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Theme Editor
          </h1>
          <p className="text-muted-foreground">
            Customize the appearance and branding of your Apollo DroneWorks platform
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="colors" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Scheme</CardTitle>
                    <CardDescription>
                      Customize your brand colors and appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
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
                          placeholder="#3b82f6"
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
                    <CardDescription>
                      Configure fonts and text appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select defaultValue="inter">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                    <CardDescription>
                      Configure page layout and navigation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Sidebar Style</Label>
                      <Select defaultValue="collapsible">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                    <CardDescription>
                      Preview your theme changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="p-6 border rounded-lg"
                      style={{ 
                        backgroundColor: appearance === 'dark' ? '#1f2937' : '#ffffff',
                        color: appearance === 'dark' ? '#f9fafb' : '#111827',
                        borderRadius: `${radius[0]}rem`
                      }}
                    >
                      <h3 className="text-lg font-semibold mb-2">Sample Content</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This is how your content will look with the current theme settings.
                      </p>
                      <Button 
                        style={{ backgroundColor: primaryColor }}
                        className="text-white"
                      >
                        Primary Button
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Save or reset your theme changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSaveTheme} className="w-full">
                  Save Theme
                </Button>
                <Button variant="outline" className="w-full">
                  Reset to Default
                </Button>
                <Button variant="ghost" className="w-full">
                  Export Theme
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Current Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Primary Color:</span>
                  <span>{primaryColor}</span>
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
    </>
  );
}