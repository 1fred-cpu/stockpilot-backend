import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ReceiptService } from "../helpers/reciept.helper";
import { ReceiptPdfService } from "../helpers/reciept-pdf.helper";
import { MailService } from "../utils/mail/mail.service";

@Injectable()
export class SalesEventsListener {
    constructor(
        private readonly receiptService: ReceiptService,
        private readonly receiptPdfService: ReceiptPdfService,
        private readonly mailService: MailService,
        @Inject("SUPABASE_CLIENT") private readonly supabase: any
    ) {}

    @OnEvent("sales.events")
    async handleSalesEvents(payload: any) {
        const event = payload.value.event;
        const data = payload.value.data;
      

        if (event === "SaleCreated") {
            await this.handleSaleCreatedEvent(data);
        }
    }

    private async handleSaleCreatedEvent(sale: any) {
        // 1. Generate receipt data
        const receipt = await this.receiptService.generateReceipt(sale);

        // 2. Fetch business details
        const business = await this.fetchBusinessDetails(sale.business_id);

        // 3. Generate PDF & upload to Supabase
        const pdfUrl = await this.receiptPdfService.savePdf(receipt, business);

        //4 Update pdfUrl in sale
        await this.supabase
            .from("sales")
            .update({ pdf_url: pdfUrl })
            .eq("id", sale.id);

        // 5. Email receipt with download link
        if (sale.customer_email) {
            const html = `
      <h2>Thank you for your purchase from ${business.name}</h2>
      <p>We appreciate your business. Below are your receipt details:</p>
      <ul>
        <li><strong>Reference:</strong> ${receipt.reference}</li>
        <li><strong>Total Paid:</strong> ${receipt.total_amount}</li>
        <li><strong>Date:</strong> ${new Date(
            receipt.created_at
        ).toLocaleString()}</li>
      </ul>
      <p>You can <a href="${pdfUrl}" target="_blank">download your receipt PDF here</a>.</p>
      <br />
      <p>If you have any questions, feel free to contact us at ${
          business.email || "support@example.com"
      }.</p>
    `;

            await this.mailService.sendMail(
                sale.customer_email,
                "Your Purchase Receipt",
                html
            );
        }

        return receipt;
    }

    private async fetchBusinessDetails(businessId: string) {
        const { data: business, error } = await this.supabase
            .from("businesses")
            .select("*")
            .eq("id", businessId)
            .maybeSingle();

        if (error) {
            throw new BadGatewayException(error.message);
        }

        return business;
    }
}
