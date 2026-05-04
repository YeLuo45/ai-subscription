/**
 * PrintExport Component
 * Helper for PDF export via window.print()
 * 
 * Usage:
 * - Wrap content in <PrintExport> to enable PDF export
 * - Call print() to trigger window.print()
 */

import React, { useRef } from 'react';

interface PrintExportProps {
  children: React.ReactNode;
  className?: string;
  fileName?: string;
}

export default function PrintExport({ children, className = '' }: PrintExportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Create a clone for printing
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      
      // Add print-specific styles
      const printStyles = `
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .slide-container { page-break-after: always; }
          }
        </style>
      `;
      
      // For slides, we need to render each slide
      const slides = printRef.current.querySelectorAll('[data-slide]');
      if (slides.length > 0) {
        // Multi-slide print mode
        let printHTML = '<div style="padding: 20px;">';
        slides.forEach((slide, idx) => {
          printHTML += `<div style="page-break-after: always; margin-bottom: 20px;">${slide.innerHTML}</div>`;
        });
        printHTML += '</div>';
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`<!DOCTYPE html><html><head><title>Print</title>${printStyles}</head><body>${printHTML}</body></html>`);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      } else {
        // Single content print mode
        document.body.innerHTML = printStyles + printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
      }
    }
  };

  return (
    <div ref={printRef} id="print-area" className={className}>
      {children}
    </div>
  );
}

// Export function for standalone use
export const triggerPrint = () => {
  window.print();
};

// Export function for PNG download from SVG
export const svgToPNG = (svgElement: SVGElement, fileName = 'export.png') => {
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgElement);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = svgElement.clientWidth * 2;
    canvas.height = svgElement.clientHeight * 2;
    ctx?.scale(2, 2);
    ctx?.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
};
