import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class ReceiptPdfService {
  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}
  async generatePdf(receipt: any, business: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // === HEADER WITH LOGO + BUSINESS INFO ===
        if (business.logo_url) {
          try {
            doc.image(business.logo_url, 50, 45, { width: 60 });
          } catch (_) {
            // ignore broken logo
          }
        }

        doc
          .fontSize(20)
          .text(business.name || 'Business Name', 120, 50, { align: 'left' })
          .moveDown();

        doc.fontSize(10).text(business.address || '', 120, 75);
        doc.text(business.email || '', 120, 90);
        doc.text(business.phone || '', 120, 105);

        doc.moveDown();

        // === RECEIPT INFO ===
        doc
          .fontSize(14)
          .text(`Receipt Reference: ${receipt.reference}`, { align: 'right' })
          .text(`Date: ${new Date(receipt.created_at).toLocaleString()}`, {
            align: 'right',
          })
          .text(`Cashier: ${receipt.created_by}`, { align: 'right' });

        doc.moveDown(2);

        // === CUSTOMER INFO ===
        if (receipt.customer) {
          doc.fontSize(12).text(`Billed To:`, { underline: true });
          doc.text(`${receipt.customer.name}`);
          doc.text(`${receipt.customer.email}`);
          doc.moveDown();
        }

        // === ITEMIZED TABLE HEADER ===
        doc.moveDown();
        doc.fontSize(12).text('Items:', { underline: true });
        doc.moveDown(0.5);

        // Column headers
        const tableTop = doc.y;
        doc.fontSize(10).text('Product', 50, tableTop);
        doc.text('Qty', 250, tableTop);
        doc.text('Unit Price', 300, tableTop, { width: 90, align: 'right' });
        doc.text('Subtotal', 400, tableTop, { width: 90, align: 'right' });

        doc.moveDown();

        // === ITEMS ===
        receipt.items.forEach((item: any, i: number) => {
          const y = tableTop + 25 + i * 20;
          doc.text(item.product_name, 50, y);
          doc.text(item.quantity.toString(), 250, y);
          doc.text(item.unit_price.toFixed(2), 300, y, {
            width: 90,
            align: 'right',
          });
          doc.text(item.subtotal.toFixed(2), 400, y, {
            width: 90,
            align: 'right',
          });
        });

        doc.moveDown(2);

        // === TOTALS ===
//         doc.fontSize(12).text(`Subtotal: ${receipt.subtotal.toFixed(2)}`, {
//           align: 'right',
//         });
//         if (receipt.tax) {
//           doc.text(`Tax: ${receipt.tax.toFixed(2)}`, { align: 'right' });
//         }
        doc.fontSize(14).text(`Total: ${receipt.total_amount.toFixed(2)}`, {
          align: 'right',
        });

        doc.moveDown(2);

        // === FOOTER ===
        doc
          .fontSize(10)
          .text('Thank you for shopping with us!', { align: 'center' });
        doc.text(`${business.website || ''}`, {
          align: 'center',
          link: business.website || null,
          underline: true,
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   *
   * @param receipt
   * @param business
   * @returns a url of the pdf file
   */
  async savePdf(receipt: any, business: any): Promise<string> {
    const pdfBuffer = await this.generatePdf(receipt, business);

    const fileName = `receipt_${receipt.reference || uuidv4()}.pdf`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('receipts') 
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(
        `Failed to upload receipt: ${error.message}`,
      );
    }

    // Generate a public URL
    const { data: urlData } = this.supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
}
