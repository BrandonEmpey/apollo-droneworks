import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Apollo colors
const APOLLO_GOLD: [number, number, number] = [27, 47, 77]; // RGB (1b2f4d) - replacing gold with new blue
const APOLLO_DARK_BLUE: [number, number, number] = [8, 14, 24]; // RGB (080e18) - replacing dark blue

/**
 * Generates a PDF report from analytics data
 * @param title Report title
 * @param subtitle Optional subtitle
 * @param data Array of data objects to include in the report
 * @param columns Column definitions for the table
 * @param dateRange Optional date range to include in the report header
 * @param charts Optional array of chart images (as base64 strings) to include in the report
 * @returns The generated PDF document
 */
export function generateAnalyticsPDF(
  title: string,
  subtitle: string = '',
  data: any[],
  columns: { header: string; dataKey: string }[],
  dateRange?: { from: string; to: string },
  charts?: (string | null)[]
) {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `${title} Report`,
    subject: subtitle,
    author: 'Apollo DroneWorks',
    creator: 'Apollo DroneWorks Analytics'
  });

  // Add company header
  doc.setFontSize(22);
  doc.setTextColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
  doc.text('APOLLO DRONEWORKS', 105, 20, { align: 'center' });
  
  // Add report title
  doc.setFontSize(18);
  doc.setTextColor(APOLLO_DARK_BLUE[0], APOLLO_DARK_BLUE[1], APOLLO_DARK_BLUE[2]);
  doc.text(title, 105, 30, { align: 'center' });
  
  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 105, 38, { align: 'center' });
  }
  
  // Add date range if provided
  if (dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const dateText = `Date Range: ${dateRange.from} to ${dateRange.to}`;
    doc.text(dateText, 105, 45, { align: 'center' });
  }
  
  // Add current date
  const today = new Date().toLocaleDateString();
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated on: ${today}`, 195, 10, { align: 'right' });
  
  // Add charts if provided
  let yPosition = 55;
  if (charts && charts.length > 0) {
    for (const chartImg of charts) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Add chart image
      try {
        if (chartImg) {
          doc.addImage(chartImg, 'PNG', 15, yPosition, 180, 90);
          yPosition += 100;
        }
      } catch (error) {
        console.error('Error adding chart to PDF:', error);
      }
    }
  }
  
  // Add new page if needed
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition += 10;
  }
  
  // Add data table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(item => columns.map(col => item[col.dataKey] || '')),
    startY: yPosition,
    headStyles: {
      fillColor: APOLLO_DARK_BLUE,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 10 },
    styles: {
      overflow: 'linebreak',
      cellPadding: 3,
      fontSize: 10
    },
    theme: 'grid'
  });
  
  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' });
    
    // Add company footer
    doc.setDrawColor(APOLLO_GOLD[0], APOLLO_GOLD[1], APOLLO_GOLD[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);
    doc.setFontSize(8);
    doc.text('Apollo DroneWorks © ' + new Date().getFullYear(), 105, 287, { align: 'center' });
  }
  
  return doc;
}

/**
 * Exports chart data as CSV
 * @param data Array of data objects
 * @param filename Name of the file to download
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    console.error('No data to export');
    return;
  }
  
  // Get headers from the first data object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(header => {
        // Handle special cases like nested objects, arrays, etc.
        const cell = row[header];
        if (cell === null || cell === undefined) {
          return '';
        } else if (typeof cell === 'object') {
          return JSON.stringify(cell).replace(/"/g, '""'); // Escape quotes
        } else {
          return String(cell).replace(/"/g, '""'); // Escape quotes
        }
      }).join(',');
    })
  ].join('\\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Captures a chart component as an image
 * @param chartRef React ref to the chart component
 * @returns Promise that resolves to base64 encoded PNG
 */
export async function captureChartAsImage(chartRef: React.RefObject<HTMLElement>): Promise<string> {
  if (!chartRef.current) {
    throw new Error('Chart ref is not available');
  }

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartRef.current, {
      scale: 2, // Higher scale for better quality
      backgroundColor: null, // Transparent background
      logging: false
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    throw error;
  }
}

/**
 * Exports chart data as Excel file
 * @param data Array of data objects
 * @param filename Name of the file to download
 * @param title Optional title for the worksheet
 */
export function exportToExcel(data: any[], filename: string, title: string = 'Analytics Data') {
  if (!data || !data.length) {
    console.error('No data to export');
    return;
  }

  try {
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add title to worksheet (optional)
    XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: 'A1' });
    
    // Auto-size columns
    const maxWidths: { [key: string]: number } = {};
    
    // Process column headers
    const headers = Object.keys(data[0]);
    headers.forEach((header, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 1, c: i });
      maxWidths[header] = Math.max(maxWidths[header] || 0, header.length);
    });
    
    // Process data cells
    data.forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        const value = row[header]?.toString() || '';
        maxWidths[header] = Math.max(maxWidths[header] || 0, value.length);
      });
    });
    
    // Apply column widths
    const wsCols: Array<{ wch: number }> = [];
    headers.forEach((header, i) => {
      const width = maxWidths[header] || 10;
      wsCols.push({ wch: Math.min(150, width + 2) });
    });
    worksheet['!cols'] = wsCols;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Data");
    
    // Generate the Excel file and trigger download
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
}