import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, ShieldAlert, ArrowLeft, Info } from "lucide-react";

function parseQuery(search: string): URLSearchParams {
  const qIndex = search.indexOf("?");
  return new URLSearchParams(qIndex >= 0 ? search.slice(qIndex + 1) : search);
}

export default function ExternalLinkPage() {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const [acknowledged, setAcknowledged] = useState(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return parseQuery(window.location.search);
  }, [location]);

  const rawTo = params.get("to") || "";
  const label = params.get("label") || "this resource";

  const parsed = useMemo(() => {
    try {
      if (!rawTo) return null;
      const u = new URL(rawTo);
      if (u.protocol !== "https:") return null;
      return u;
    } catch {
      return null;
    }
  }, [rawTo]);

  const isNira = parsed?.hostname.toLowerCase().endsWith("nira.app") ?? false;

  const { data: globalDisclaimer } = useQuery<{ disclaimer: string }>({
    queryKey: ["/api/global-disclaimer"],
  });
  const globalDisclaimerText = globalDisclaimer?.disclaimer?.trim() ?? "";

  useEffect(() => {
    document.title = "Leaving Apollo DroneWorks";
  }, []);

  if (!parsed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0b111f]">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle>Invalid external link</CardTitle>
            </div>
            <CardDescription>
              We couldn't open that link. The address is missing, malformed, or not served over a secure (https) connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard" data-testid="link-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const href = parsed.toString();
  const host = parsed.hostname;

  const handleContinue = () => {
    window.open(href, "_blank", "noopener,noreferrer");
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <>
      <Helmet>
        <title>Leaving Apollo DroneWorks</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#0b111f]">
        <Card className="max-w-xl w-full" data-testid="external-link-interstitial">
          <CardHeader>
            <div className="flex items-center gap-2 text-gold">
              <ExternalLink className="h-5 w-5" />
              <CardTitle>You're leaving Apollo DroneWorks</CardTitle>
            </div>
            <CardDescription>
              You're about to open <span className="font-semibold">{label}</span> on an external site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground">Destination</div>
              <div className="font-mono break-all" data-testid="text-destination-host">{host}</div>
              <div className="font-mono break-all text-xs text-muted-foreground mt-1" data-testid="text-destination-url">{href}</div>
            </div>

            {globalDisclaimerText && (
              <Alert
                className="border-gold/40 bg-gold/5"
                data-testid="global-shareable-disclaimer"
              >
                <Info className="h-4 w-4 text-gold" />
                <AlertTitle>Please read</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {globalDisclaimerText}
                </AlertDescription>
              </Alert>
            )}

            {isNira && (
              <Alert>
                <AlertTitle>About NIRA.app</AlertTitle>
                <AlertDescription>
                  NIRA hosts our high-resolution 3D models in your browser. Your deliverable will open in a new tab. Apollo DroneWorks does not control the NIRA viewer or its content.
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="default">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                This link goes to a website outside Apollo DroneWorks. We can't guarantee the content, performance, or privacy practices of third-party sites.
              </AlertDescription>
            </Alert>

            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                data-testid="checkbox-acknowledge"
              />
              <span>I understand I'm leaving Apollo DroneWorks and want to continue to {host}.</span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate("/dashboard");
                  }
                }}
                data-testid="button-cancel-external"
              >
                Cancel
              </Button>
              <Button
                disabled={!acknowledged}
                onClick={handleContinue}
                className="bg-gold text-[#0b111f] hover:bg-gold/90 font-semibold"
                data-testid="button-continue-external"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Continue to {host}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
