import { useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download, Mail, X, Send, Loader2 } from "lucide-react";
import { Booking, Service } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PrintableReceiptProps {
  booking: Booking;
  services: Service[];
  customerName: string;
  customerEmail: string;
}

// Group services by their (trimmed) disclaimer text so a customer never sees
// the exact same disclaimer more than once even when multiple selected
// services share identical text. Preserves first-occurrence order.
export function groupDisclaimers(
  services: Pick<Service, "id" | "name" | "disclaimer">[]
): { text: string; serviceNames: string[] }[] {
  const map = new Map<string, string[]>();
  for (const s of services) {
    const trimmed = s.disclaimer?.trim();
    if (!trimmed) continue;
    const list = map.get(trimmed);
    if (list) {
      if (!list.includes(s.name)) list.push(s.name);
    } else {
      map.set(trimmed, [s.name]);
    }
  }
  return Array.from(map, ([text, serviceNames]) => ({ text, serviceNames }));
}

export function PrintableReceipt({ booking, services, customerName, customerEmail }: PrintableReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState(customerEmail);
  const [emailTouched, setEmailTouched] = useState(false);
  const { toast } = useToast();

  // Basic RFC 5322-ish email check: requires non-empty local part, "@", and a
  // domain with at least one dot. Sufficient for client-side guardrail; the
  // server still validates before sending.
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = emailTo.trim();
  const isEmailEmpty = trimmedEmail.length === 0;
  const isEmailValid = EMAIL_REGEX.test(trimmedEmail);
  const emailError = emailTouched
    ? isEmailEmpty
      ? "Email address is required."
      : !isEmailValid
        ? "Please enter a valid email address."
        : null
    : null;

  const primaryService = services.find(s => s.id === booking.serviceId);
  const selectedServices = booking.selectedServices 
    ? services.filter(s => booking.selectedServices?.includes(s.id))
    : primaryService ? [primaryService] : [];

  // service.price is stored as integer cents; divide by 100 for dollar display.
  // booking.totalAmount is stored as a dollar-value numeric string (e.g. "299.00").
  const lineItemDollars = (cents: number): string => (cents / 100).toFixed(2);

  const lineItemSum = selectedServices.reduce((sum, s) => sum + s.price / 100, 0);
  const parsedTotal = booking.totalAmount != null ? parseFloat(booking.totalAmount) : NaN;
  const displayTotal = Number.isFinite(parsedTotal)
    ? parsedTotal.toFixed(2)
    : lineItemSum.toFixed(2);

  const hasDiscount =
    selectedServices.length > 0 &&
    Number.isFinite(parsedTotal) &&
    Math.abs(parsedTotal - lineItemSum) >= 0.01;

  const rawScheduledDate = booking.scheduledDate ?? booking.date;
  const scheduledDate = rawScheduledDate ? new Date(rawScheduledDate) : null;

  const emailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/receipts/${booking.id}/email`, {
        email: trimmedEmail,
        customerName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Receipt sent",
        description: `Your receipt has been emailed to ${trimmedEmail}.`,
      });
      setShowEmailForm(false);
    },
    onError: (err: any) => {
      const message = err?.message || "Failed to send email. Please try again.";
      toast({
        title: "Email failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const receiptNumber = `APLDW-${String(booking.id).padStart(6, "0")}`;
      const response = await fetch(`/api/receipts/${booking.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) {
        let message = "Unable to download the receipt PDF.";
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch {
          // non-JSON body — keep default message
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download the PDF. Please try again or use the Print option.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Apollo DroneWorks Receipt</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #C7AE6A;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #C7AE6A;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 14px;
              color: #333;
            }
            .services-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .services-table th {
              background: #f8f8f8;
              padding: 12px;
              text-align: left;
              border-bottom: 2px solid #C7AE6A;
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
            }
            .services-table td {
              padding: 12px;
              border-bottom: 1px solid #eee;
            }
            .total-row {
              font-weight: bold;
              background: #f8f8f8;
            }
            .total-row td {
              border-top: 2px solid #C7AE6A;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
            }
            .status-completed {
              background: #d4edda;
              color: #155724;
            }
            .status-pending {
              background: #fff3cd;
              color: #856404;
            }
            .discount-row td {
              color: #16a34a;
              font-weight: 500;
            }
            .subtotal-row td {
              color: #555;
            }
            .disclaimers {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #eee;
            }
            .disclaimers-heading {
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
              letter-spacing: 0.05em;
              margin-bottom: 10px;
            }
            .disclaimer-block {
              border: 1px solid #e5e7eb;
              border-left: 3px solid #C7AE6A;
              border-radius: 4px;
              padding: 10px 12px;
              margin-bottom: 8px;
              background: #faf8f2;
            }
            .disclaimer-service {
              font-size: 12px;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }
            .disclaimer-text {
              font-size: 12px;
              color: #555;
              line-height: 1.5;
              white-space: pre-line;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end no-print">
        <Button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          variant="outline"
          className="border-gold-dark/30 text-offwhite hover:bg-gold/10"
        >
          <Download className="h-4 w-4 mr-2" />
          {isGeneratingPdf ? "Generating..." : "Download PDF"}
        </Button>
        <Button onClick={handlePrint} variant="outline" className="border-gold-dark/30 text-offwhite hover:bg-gold/10">
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button
          onClick={() => { setEmailTo(customerEmail); setEmailTouched(false); setShowEmailForm(v => !v); }}
          variant="outline"
          className="border-gold-dark/30 text-offwhite hover:bg-gold/10"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email Receipt
        </Button>
      </div>

      {showEmailForm && (
        <div className="no-print rounded-lg border border-gold-dark/30 bg-[#080d17]/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-offwhite">Send receipt by email</p>
            <button
              onClick={() => setShowEmailForm(false)}
              className="text-offwhite/50 hover:text-offwhite transition-colors"
              aria-label="Close email form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receipt-email" className="text-xs text-offwhite/70">Email address</Label>
            <Input
              id="receipt-email"
              type="email"
              value={emailTo}
              onChange={(e) => { setEmailTo(e.target.value); setEmailTouched(true); }}
              onBlur={() => setEmailTouched(true)}
              placeholder="name@example.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "receipt-email-error" : undefined}
              className="bg-[#132642] border-gold-dark/30 text-offwhite placeholder:text-offwhite/30 focus-visible:ring-gold/40"
            />
            {emailError && (
              <p
                id="receipt-email-error"
                role="alert"
                data-testid="receipt-email-error"
                className="text-xs text-red-400"
              >
                {emailError}
              </p>
            )}
          </div>
          <Button
            onClick={() => { setEmailTouched(true); if (isEmailValid) emailMutation.mutate(); }}
            disabled={emailMutation.isPending || !isEmailValid}
            className="w-full bg-gold hover:bg-gold-dark text-navy font-semibold"
          >
            {emailMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Receipt
              </>
            )}
          </Button>
        </div>
      )}

      <div ref={receiptRef}>
        <Card className="bg-[#132642] border-gold-dark/30 print:bg-white print:text-black">
          <CardHeader className="text-center border-b border-gold-dark/30">
            <div className="logo text-2xl font-bold text-gold">Apollo DroneWorks</div>
            <div className="subtitle text-offwhite/60">Professional Drone Services</div>
            <CardTitle className="mt-4 text-lg text-offwhite">Service Receipt</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Receipt Number</div>
                <div className="info-value text-offwhite font-mono">APLDW-{String(booking.id).padStart(6, '0')}</div>
              </div>
              <div>
                <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Date</div>
                <div className="info-value text-offwhite">
                  {booking.createdAt ? format(new Date(booking.createdAt), "MMMM d, yyyy") : "N/A"}
                </div>
              </div>
              <div>
                <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Customer</div>
                <div className="info-value text-offwhite">{customerName}</div>
                <div className="info-value text-offwhite/70 text-sm">{customerEmail}</div>
              </div>
              <div>
                <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Payment Status</div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid'
                    ? 'bg-green-900/30 text-green-400' 
                    : 'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid' ? 'Paid' : 
                   booking.paymentStatus === 'free' ? 'Free' : 'Pending'}
                </span>
              </div>
            </div>

            {booking.projectName && (
              <div className="mb-6 p-4 bg-[#080d17]/50 rounded-lg border border-gold-dark/20">
                <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Project Name</div>
                <div className="info-value text-gold font-medium">{booking.projectName}</div>
              </div>
            )}

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-gold-dark/30">
                  <th className="text-left py-3 text-xs text-offwhite/60 uppercase">Service</th>
                  <th className="text-right py-3 text-xs text-offwhite/60 uppercase">Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedServices.map((service) => (
                  <tr key={service.id} className="border-b border-gold-dark/10">
                    <td className="py-3 text-offwhite">{service.name}</td>
                    <td className="py-3 text-right text-offwhite">${lineItemDollars(service.price)}</td>
                  </tr>
                ))}
                {hasDiscount ? (
                  <>
                    <tr className="subtotal-row">
                      <td className="py-3 text-offwhite/70 border-t border-gold-dark/20">Subtotal</td>
                      <td className="py-3 text-right text-offwhite/70 border-t border-gold-dark/20">
                        ${lineItemSum.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="discount-row">
                      <td className="py-3 text-green-400">Discount</td>
                      <td className="py-3 text-right text-green-400">
                        -${(lineItemSum - parsedTotal).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-[#080d17]/30 font-bold">
                      <td className="py-4 text-offwhite border-t-2 border-gold-dark/30">Total Due</td>
                      <td className="py-4 text-right text-gold text-lg border-t-2 border-gold-dark/30">
                        ${displayTotal}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr className="bg-[#080d17]/30 font-bold">
                    <td className="py-4 text-offwhite border-t-2 border-gold-dark/30">Total</td>
                    <td className="py-4 text-right text-gold text-lg border-t-2 border-gold-dark/30">
                      ${displayTotal}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {scheduledDate && (
              <div className="p-4 bg-[#080d17]/50 rounded-lg border border-gold-dark/20 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Scheduled Date</div>
                    <div className="info-value text-offwhite">{format(scheduledDate, "MMMM d, yyyy")}</div>
                  </div>
                  <div>
                    <div className="info-label text-xs text-offwhite/60 uppercase mb-1">Time</div>
                    <div className="info-value text-offwhite">{format(scheduledDate, "h:mm a")}</div>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const groups = groupDisclaimers(selectedServices);
              if (groups.length === 0) return null;
              return (
                <div className="disclaimers mb-6" data-testid="receipt-disclaimers">
                  <div className="disclaimers-heading text-xs text-offwhite/60 uppercase mb-2 tracking-wide">
                    Service Disclaimers
                  </div>
                  {groups.map((g) => (
                    <div
                      key={g.text}
                      className="disclaimer-block mb-2 rounded border border-gold-dark/20 bg-[#080d17]/50 p-3"
                    >
                      <div className="disclaimer-service text-xs font-semibold text-gold mb-1">
                        {g.serviceNames.join(", ")}
                      </div>
                      <p className="disclaimer-text text-xs text-offwhite/70 leading-relaxed whitespace-pre-line">
                        {g.text}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="text-center pt-6 border-t border-gold-dark/20">
              <p className="text-offwhite/60 text-sm">Thank you for choosing Apollo DroneWorks!</p>
              <p className="text-offwhite/40 text-xs mt-2">
                Questions? Contact us at support@apollodroneworks.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
