import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, RotateCcw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ColorHistory {
  [key: string]: string[];
}

interface ThemeConfig {
  // Primary Colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  
  // Background Colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // UI State Colors
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  
  // Border and Input
  border: string;
  input: string;
  ring: string;
  
  // Navigation
  navigationBackground: string;
  navigationText: string;
  navigationHover: string;
  
  // Buttons
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  buttonHover: string;
  
  // Forms
  formBackground: string;
  formBorder: string;
  formText: string;
  formLabel: string;
  
  // Tables
  tableHeader: string;
  tableHeaderText: string;
  tableRow: string;
  tableRowAlt: string;
  tableText: string;
  
  // Status Colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Dashboard Specific
  dashboardSidebar: string;
  dashboardSidebarText: string;
  dashboardContent: string;
  
  // Service Cards
  serviceCardBackground: string;
  serviceCardBorder: string;
  serviceCardText: string;
  serviceCardPrice: string;
  
  // Gallery
  galleryOverlay: string;
  galleryText: string;
  
  // Footer
  footerBackground: string;
  footerText: string;
  footerLink: string;
}

const defaultTheme: ThemeConfig = {
  primary: "#2563eb",
  primaryForeground: "#ffffff",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
  background: "#ffffff",
  foreground: "#0f172a",
  card: "#ffffff",
  cardForeground: "#0f172a",
  popover: "#ffffff",
  popoverForeground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#e2e8f0",
  input: "#e2e8f0",
  ring: "#2563eb",
  navigationBackground: "#ffffff",
  navigationText: "#0f172a",
  navigationHover: "#f1f5f9",
  buttonPrimary: "#2563eb",
  buttonPrimaryText: "#ffffff",
  buttonSecondary: "#f1f5f9",
  buttonSecondaryText: "#0f172a",
  buttonHover: "#1d4ed8",
  formBackground: "#ffffff",
  formBorder: "#e2e8f0",
  formText: "#0f172a",
  formLabel: "#374151",
  tableHeader: "#f8fafc",
  tableHeaderText: "#374151",
  tableRow: "#ffffff",
  tableRowAlt: "#f8fafc",
  tableText: "#0f172a",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  dashboardSidebar: "#1e293b",
  dashboardSidebarText: "#e2e8f0",
  dashboardContent: "#f8fafc",
  serviceCardBackground: "#ffffff",
  serviceCardBorder: "#e2e8f0",
  serviceCardText: "#0f172a",
  serviceCardPrice: "#059669",
  galleryOverlay: "rgba(0, 0, 0, 0.7)",
  galleryText: "#ffffff",
  footerBackground: "#1e293b",
  footerText: "#e2e8f0",
  footerLink: "#60a5fa"
};

export default function ThemeEditor() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [colorHistory, setColorHistory] = useState<ColorHistory>({});
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved theme and color history from localStorage
    const savedTheme = localStorage.getItem('customTheme');
    const savedHistory = localStorage.getItem('colorHistory');
    
    if (savedTheme) {
      setTheme(JSON.parse(savedTheme));
    }
    
    if (savedHistory) {
      setColorHistory(JSON.parse(savedHistory));
    }
  }, []);

  const updateColor = (property: keyof ThemeConfig, color: string) => {
    const newTheme = { ...theme, [property]: color };
    setTheme(newTheme);
    
    // Update color history
    const newHistory = { ...colorHistory };
    if (!newHistory[property]) {
      newHistory[property] = [];
    }
    
    // Add to history if not already present
    if (!newHistory[property].includes(color)) {
      newHistory[property] = [color, ...newHistory[property].slice(0, 4)];
      setColorHistory(newHistory);
    }
    
    // Apply theme in preview mode
    if (previewMode) {
      applyThemeToPage(newTheme);
    }
  };

  const applyThemeToPage = (themeConfig: ThemeConfig) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(themeConfig).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
  };

  const saveTheme = () => {
    localStorage.setItem('customTheme', JSON.stringify(theme));
    localStorage.setItem('colorHistory', JSON.stringify(colorHistory));
    
    // Apply theme permanently
    applyThemeToPage(theme);
    
    toast({
      title: "Theme Saved",
      description: "Your custom theme has been saved and applied.",
    });
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    applyThemeToPage(defaultTheme);
    localStorage.removeItem('customTheme');
    
    toast({
      title: "Theme Reset",
      description: "Theme has been reset to default values.",
    });
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      applyThemeToPage(theme);
    } else {
      applyThemeToPage(defaultTheme);
    }
  };

  const ColorPicker = ({ 
    label, 
    property, 
    description 
  }: { 
    label: string; 
    property: keyof ThemeConfig; 
    description?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={property} className="text-sm font-medium">
        {label}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center space-x-2">
        <Input
          id={property}
          type="color"
          value={theme[property]}
          onChange={(e) => updateColor(property, e.target.value)}
          className="w-12 h-8 rounded border-0 cursor-pointer"
        />
        <Input
          type="text"
          value={theme[property]}
          onChange={(e) => updateColor(property, e.target.value)}
          className="flex-1 text-sm"
          placeholder="#000000"
        />
      </div>
      
      {/* Color History */}
      {colorHistory[property] && colorHistory[property].length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground">Recent:</span>
          {colorHistory[property].map((color, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer text-xs px-2 py-1"
              style={{ backgroundColor: color, color: getContrastColor(color) }}
              onClick={() => updateColor(property, color)}
            >
              {color}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Palette className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Theme Editor</h1>
            <p className="text-muted-foreground">Customize colors and styling for your drone platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={togglePreview}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>{previewMode ? 'Exit Preview' : 'Preview'}</span>
          </Button>
          <Button
            variant="outline"
            onClick={resetTheme}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          <Button
            onClick={saveTheme}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Theme</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="primary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="primary">Primary</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="primary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Primary"
                property="primary"
                description="Main brand color used for buttons, links, and highlights"
              />
              <ColorPicker
                label="Primary Foreground"
                property="primaryForeground"
                description="Text color on primary backgrounds"
              />
              <ColorPicker
                label="Secondary"
                property="secondary"
                description="Secondary brand color for subtle elements"
              />
              <ColorPicker
                label="Secondary Foreground"
                property="secondaryForeground"
                description="Text color on secondary backgrounds"
              />
              <ColorPicker
                label="Accent"
                property="accent"
                description="Accent color for interactive elements"
              />
              <ColorPicker
                label="Accent Foreground"
                property="accentForeground"
                description="Text color on accent backgrounds"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="background" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Background Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Background"
                property="background"
                description="Main page background color"
              />
              <ColorPicker
                label="Foreground"
                property="foreground"
                description="Main text color"
              />
              <ColorPicker
                label="Card"
                property="card"
                description="Card background color"
              />
              <ColorPicker
                label="Card Foreground"
                property="cardForeground"
                description="Text color on cards"
              />
              <ColorPicker
                label="Muted"
                property="muted"
                description="Muted background color"
              />
              <ColorPicker
                label="Muted Foreground"
                property="mutedForeground"
                description="Muted text color"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Navigation Background"
                property="navigationBackground"
                description="Header and navigation background"
              />
              <ColorPicker
                label="Navigation Text"
                property="navigationText"
                description="Navigation link text color"
              />
              <ColorPicker
                label="Navigation Hover"
                property="navigationHover"
                description="Navigation link hover background"
              />
              <ColorPicker
                label="Dashboard Sidebar"
                property="dashboardSidebar"
                description="Admin dashboard sidebar background"
              />
              <ColorPicker
                label="Dashboard Sidebar Text"
                property="dashboardSidebarText"
                description="Admin dashboard sidebar text"
              />
              <ColorPicker
                label="Dashboard Content"
                property="dashboardContent"
                description="Admin dashboard content area background"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buttons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Primary Button"
                property="buttonPrimary"
                description="Primary button background"
              />
              <ColorPicker
                label="Primary Button Text"
                property="buttonPrimaryText"
                description="Primary button text color"
              />
              <ColorPicker
                label="Secondary Button"
                property="buttonSecondary"
                description="Secondary button background"
              />
              <ColorPicker
                label="Secondary Button Text"
                property="buttonSecondaryText"
                description="Secondary button text color"
              />
              <ColorPicker
                label="Button Hover"
                property="buttonHover"
                description="Button hover state color"
              />
              <ColorPicker
                label="Destructive"
                property="destructive"
                description="Destructive button color (delete, etc.)"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Form Background"
                property="formBackground"
                description="Form field background color"
              />
              <ColorPicker
                label="Form Border"
                property="formBorder"
                description="Form field border color"
              />
              <ColorPicker
                label="Form Text"
                property="formText"
                description="Form field text color"
              />
              <ColorPicker
                label="Form Label"
                property="formLabel"
                description="Form label text color"
              />
              <ColorPicker
                label="Input Border"
                property="input"
                description="Input field border color"
              />
              <ColorPicker
                label="Focus Ring"
                property="ring"
                description="Focus ring color for form elements"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Table Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Table Header"
                property="tableHeader"
                description="Table header background"
              />
              <ColorPicker
                label="Table Header Text"
                property="tableHeaderText"
                description="Table header text color"
              />
              <ColorPicker
                label="Table Row"
                property="tableRow"
                description="Table row background"
              />
              <ColorPicker
                label="Table Row Alt"
                property="tableRowAlt"
                description="Alternating table row background"
              />
              <ColorPicker
                label="Table Text"
                property="tableText"
                description="Table cell text color"
              />
              <ColorPicker
                label="Border"
                property="border"
                description="Table and element border color"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Success"
                property="success"
                description="Success state color (green)"
              />
              <ColorPicker
                label="Warning"
                property="warning"
                description="Warning state color (amber)"
              />
              <ColorPicker
                label="Error"
                property="error"
                description="Error state color (red)"
              />
              <ColorPicker
                label="Info"
                property="info"
                description="Info state color (blue)"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ColorPicker
                label="Service Card Background"
                property="serviceCardBackground"
                description="Service card background color"
              />
              <ColorPicker
                label="Service Card Border"
                property="serviceCardBorder"
                description="Service card border color"
              />
              <ColorPicker
                label="Service Card Text"
                property="serviceCardText"
                description="Service card text color"
              />
              <ColorPicker
                label="Service Card Price"
                property="serviceCardPrice"
                description="Service card price color"
              />
              <ColorPicker
                label="Gallery Overlay"
                property="galleryOverlay"
                description="Gallery image overlay color"
              />
              <ColorPicker
                label="Gallery Text"
                property="galleryText"
                description="Gallery overlay text color"
              />
              <ColorPicker
                label="Footer Background"
                property="footerBackground"
                description="Footer background color"
              />
              <ColorPicker
                label="Footer Text"
                property="footerText"
                description="Footer text color"
              />
              <ColorPicker
                label="Footer Links"
                property="footerLink"
                description="Footer link color"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}