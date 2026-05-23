import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import logoPath from '@assets/noBgColor.png';

// Define a type for jsPDF with autoTable capabilities
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// Define the interfaces locally to avoid dependency on schema.ts
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

interface TimeEstimate {
  activity: string;
  hours: number;
  rate: number;
}

interface Personnel {
  role: string;
  hourlyRate: number;
  quantity: number;
}

interface Equipment {
  name: string;
  hourlyRate: number;
  included: boolean;
  quantity: number;
}

interface Expense {
  name: string;
  cost: number;
  expenseType: string;
  mileage?: number;
  costPerMile?: number;
  travelSpeed?: number;
  quantity?: number;
  unitPrice?: number;
}

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
  timeEstimates: TimeEstimate[];
  personnel: Personnel[];
  equipment: Equipment[];
  expenses: Expense[];
  thirdPartyProducts: Expense[];
  deliveryTimeHours: number;
  totalAmount: number | string;
  depreciableAssetsSplit?: number | string;
  advertisementSplit?: number | string;
  insuranceSplit?: number | string;
  netProfit?: number | string;
  notes: string;
  userId: number;
  
  // Database snake_case field aliases
  business_info?: BusinessInfo;
  time_estimates?: TimeEstimate[];
  third_party_products?: Expense[];
}

// Helper function to format currency
const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) ? `$${numAmount.toFixed(2)}` : '$0.00';
};

// Apollo DroneWorks brand colors
const APOLLO_GOLD: [number, number, number] = [27, 47, 77]; // 1b2f4d - replacing gold with blue
const APOLLO_LIGHT_GOLD: [number, number, number] = [27, 47, 77]; // 1b2f4d - replacing light gold with blue
const APOLLO_DARK_BLUE: [number, number, number] = [8, 14, 24]; // 080e18 - replacing dark blue

// Function to generate a PDF from quote data
export const generateQuotePDF = async (quote: QuoteData): Promise<jsPDF> => {
  console.log('Generating PDF with quote data:', JSON.stringify(quote, null, 2));
  
  // Basic validation
  if (!quote || typeof quote !== 'object') {
    console.error('Invalid quote data:', quote);
    throw new Error('Invalid quote data provided');
  }
  
  try {
    // Create a new PDF document
    console.log('Creating new jsPDF instance');
    const doc = new jsPDF() as JsPDFWithAutoTable;
    console.log('jsPDF instance created successfully');
    
    // Add page background elements
    try {
      console.log('Setting up PDF document');
      doc.setFont('helvetica');
      doc.setFontSize(10);
      
      // Add Apollo DroneWorks logo in top left
      try {
        doc.addImage(logoPath, 'PNG', 20, 10, 40, 15);
      } catch (e) {
        console.error('Error adding logo:', e);
        // Continue without the logo if there's an error
      }
      
      // Add header with QUOTE text
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
      doc.text('QUOTE', 105, 20, { align: 'center' });
      
      console.log('Basic PDF setup successful');
    } catch (e) {
      console.error('Basic PDF setup failed:', e);
      throw e;
    }
    
    // Company information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]); // Set text color to dark blue
    const companyInfo = [
      quote.businessInfo.address || '',
      `${quote.businessInfo.state || ''} ${quote.businessInfo.zip || ''}`,
      `Phone: ${quote.businessInfo.phone || ''}`,
      `Website: ${quote.businessInfo.website || ''}`
    ].filter(line => line.trim() !== '').join('\n');
    
    if (companyInfo.trim() !== '') {
      doc.text(companyInfo, 105, 58, { align: 'center' });
    }
    
    // Quote details - left side
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE TO:', 20, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.text([
      quote.clientName,
      quote.clientEmail || '',
      ''
    ].filter(line => line.trim() !== '').join('\n'), 20, 70);
    
    // Quote details - right side
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + (quote.businessInfo.quoteValidity || 30));
    
    // Create a right-aligned two-column table for quote details
    const rightDetailsX = 120; // Starting x position for the right details section
    const rightDetailsY = 60;  // Starting y position for the right details section
    const lineHeight = 5;      // Space between lines
    
    const labels = ['QUOTE #:', 'DATE:', 'EXPIRY DATE:', 'STATUS:'];
    const values = [
      `Q-${quote.id?.toString().padStart(4, '0')}`,
      format(quote.dateCreated instanceof Date ? quote.dateCreated : today, 'MMM d, yyyy'),
      format(quote.expiryDate instanceof Date ? quote.expiryDate : expiry, 'MMM d, yyyy'),
      quote.status
    ];
    
    // Draw labels (left-aligned)
    doc.setFont('helvetica', 'bold');
    labels.forEach((label, index) => {
      doc.text(label, rightDetailsX, rightDetailsY + (index * lineHeight));
    });
    
    // Draw values (right-aligned) 
    doc.setFont('helvetica', 'normal');
    values.forEach((value, index) => {
      doc.text(value, 190, rightDetailsY + (index * lineHeight), { align: 'right' });
    });
    
    // Project details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT DETAILS', 20, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.text([
      `Name: ${quote.projectName}`,
      `Description: ${quote.projectDescription || ''}`
    ].join('\n'), 20, 110);
    
    // Start Y position for tables
    let yPos = 130;
    
    // Time Estimates Table
    if (quote.timeEstimates && quote.timeEstimates.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TIME ESTIMATES', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Activity', 'Hours', 'Rate ($/hr)', 'Total']],
        body: quote.timeEstimates.map((estimate: TimeEstimate) => [
          estimate.activity,
          estimate.hours.toString(),
          formatCurrency(estimate.rate),
          formatCurrency(estimate.hours * estimate.rate)
        ]),
        foot: [['', '', 'Subtotal:', formatCurrency(quote.timeEstimates.reduce((sum: number, est: TimeEstimate) => sum + (est.hours * est.rate), 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    // Personnel Table
    if (quote.personnel && quote.personnel.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PERSONNEL', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Role', 'Hourly Rate', 'Quantity', 'Total']],
        body: quote.personnel.map((person: Personnel) => [
          person.role,
          formatCurrency(person.hourlyRate),
          person.quantity.toString(),
          formatCurrency(person.hourlyRate * person.quantity)
        ]),
        foot: [['', '', 'Subtotal:', formatCurrency(quote.personnel.reduce((sum: number, p: Personnel) => sum + (p.hourlyRate * p.quantity), 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    // Check if we need to add a new page
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }
    
    // Equipment Table
    if (quote.equipment && quote.equipment.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EQUIPMENT', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Equipment', 'Rate', 'Included', 'Quantity', 'Total']],
        body: quote.equipment.map((equip: Equipment) => [
          equip.name,
          formatCurrency(equip.hourlyRate),
          equip.included ? 'Yes' : 'No',
          equip.quantity.toString(),
          formatCurrency(equip.included ? equip.hourlyRate * equip.quantity : 0)
        ]),
        foot: [['', '', '', 'Subtotal:', formatCurrency(quote.equipment.reduce((sum: number, e: Equipment) => sum + (e.included ? e.hourlyRate * e.quantity : 0), 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    // Check if we need to add a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    // Expenses Table
    const travelExpenses = quote.expenses.filter((e: Expense) => e.expenseType === 'Travel');
    const otherExpenses = quote.expenses.filter((e: Expense) => e.expenseType !== 'Travel');
    
    if (travelExpenses.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TRAVEL EXPENSES', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Mileage', 'Cost/Mile', 'Travel Speed', 'Total']],
        body: travelExpenses.map((expense: Expense) => [
          expense.name,
          expense.mileage?.toString() || '0',
          formatCurrency(expense.costPerMile || 0),
          `${expense.travelSpeed || 55} mph`,
          formatCurrency(expense.cost)
        ]),
        foot: [['', '', '', 'Subtotal:', formatCurrency(travelExpenses.reduce((sum: number, e: Expense) => sum + e.cost, 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    if (otherExpenses.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('OTHER EXPENSES', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Type', 'Quantity', 'Unit Price', 'Total']],
        body: otherExpenses.map((expense: Expense) => [
          expense.name,
          expense.expenseType,
          expense.quantity?.toString() || '1',
          formatCurrency(expense.unitPrice || 0),
          formatCurrency(expense.cost)
        ]),
        foot: [['', '', '', 'Subtotal:', formatCurrency(otherExpenses.reduce((sum: number, e: Expense) => sum + e.cost, 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    // Check if we need to add a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    // Third Party Products Table
    if (quote.thirdPartyProducts && quote.thirdPartyProducts.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('THIRD PARTY PRODUCTS', 20, yPos);
      yPos += 10;
      
      // Create the table
      autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Type', 'Cost']],
        body: quote.thirdPartyProducts.map((product: Expense) => [
          product.name,
          product.expenseType,
          formatCurrency(product.cost)
        ]),
        foot: [['', 'Subtotal:', formatCurrency(quote.thirdPartyProducts.reduce((sum: number, p: Expense) => sum + p.cost, 0))]],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: APOLLO_GOLD, textColor: 255 },
        footStyles: { fillColor: APOLLO_DARK_BLUE, textColor: 255, fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    }
    
    // Total Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 20, yPos);
    yPos += 10;
    
    // Calculate subtotals
    const timeEstimateSubtotal = quote.timeEstimates.reduce((sum: number, est: TimeEstimate) => sum + (est.hours * est.rate), 0);
    const personnelSubtotal = quote.personnel.reduce((sum: number, p: Personnel) => sum + (p.hourlyRate * p.quantity), 0);
    const equipmentSubtotal = quote.equipment.reduce((sum: number, e: Equipment) => sum + (e.included ? e.hourlyRate * e.quantity : 0), 0);
    const expensesSubtotal = quote.expenses.reduce((sum: number, e: Expense) => sum + e.cost, 0);
    const thirdPartySubtotal = quote.thirdPartyProducts.reduce((sum: number, p: Expense) => sum + p.cost, 0);
    
    // Create the table
    autoTable(doc, {
      startY: yPos,
      body: [
        ['Time Estimates', formatCurrency(timeEstimateSubtotal)],
        ['Personnel', formatCurrency(personnelSubtotal)],
        ['Equipment', formatCurrency(equipmentSubtotal)],
        ['Expenses', formatCurrency(expensesSubtotal)],
        ['Third Party Products', formatCurrency(thirdPartySubtotal)],
        ['TOTAL', formatCurrency(quote.totalAmount)]
      ],
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      },
      theme: 'grid'
    });
    
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
    
    // Business Cost Allocations and Profit (if available)
    if (quote.depreciableAssetsSplit || quote.advertisementSplit || quote.insuranceSplit || quote.netProfit) {
      // Check if we need to add a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('BUSINESS COST ALLOCATIONS & PROFIT', 20, yPos);
      yPos += 10;
      
      let costsTable = [];
      
      if (quote.depreciableAssetsSplit) {
        costsTable.push(['Depreciable Assets Split', formatCurrency(quote.depreciableAssetsSplit)]);
      }
      
      if (quote.advertisementSplit) {
        costsTable.push(['Advertisement Split', formatCurrency(quote.advertisementSplit)]);
      }
      
      if (quote.insuranceSplit) {
        costsTable.push(['Insurance Split', formatCurrency(quote.insuranceSplit)]);
      }
      
      if (quote.netProfit) {
        costsTable.push(['Net Profit', formatCurrency(quote.netProfit)]);
      }
      
      if (costsTable.length > 0) {
        autoTable(doc, {
          startY: yPos,
          body: costsTable,
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' }
          },
          theme: 'grid'
        });
        
        yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30;
      }
    }
    
    // Notes
    if (quote.notes && quote.notes.trim() !== '') {
      // Check if we need to add a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', 20, yPos);
      yPos += 10;
      
      doc.setFont('helvetica', 'normal');
      
      // Split notes into lines that fit the page width
      const textLines = doc.splitTextToSize(quote.notes, 170);
      doc.text(textLines, 20, yPos);
    }
    
    // Add validity note at the bottom of the last page
    const validityDays = quote.businessInfo.quoteValidity || 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`This quote is valid for ${validityDays} days from the date of issue.`, 105, 280, { align: 'center' });
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Function to download PDF
export const downloadQuotePDF = async (quote: QuoteData, filename?: string): Promise<void> => {
  try {
    const doc = await generateQuotePDF(quote);
    const defaultFilename = `Quote_${quote.id || 'new'}_${quote.clientName.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename || defaultFilename);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

// Function to print PDF
export const printQuotePDF = async (quote: QuoteData): Promise<void> => {
  try {
    const doc = await generateQuotePDF(quote);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
};