import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WhatsappHelper {
    private readonly logger = new Logger(WhatsappService.name);
    constructor(private readonly config: ConfigService) {}

    // Cloud API base URL
    private readonly apiUrl = "https://graph.facebook.com/v17.0";
    private readonly phoneNumberId = this.config.get<string>(
        "WHATSAPP_PHONE_NUMBER_ID"
    );

    private readonly token = this.config.get<string>("WHATSAPP_ACCESS_TOKEN"); // bearer token

    async sendReceipt(
        customerPhone: string,
        pdfUrl: string,
        storeName: string
    ) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: customerPhone,
                    type: "document",
                    document: {
                        link: pdfUrl,
                        caption: `Your receipt from ${storeName}`,
                        filename: `${storeName}-receipt.pdf`
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            this.logger.log(
                `WhatsApp message sent: ${response.data.messages[0].id}`
            );
            return response.data;
        } catch (error) {
            this.logger.error("Failed to send WhatsApp message", error);
            throw new Error(
                error.response?.data?.error?.message || error.message
            );
        }
    }
}
