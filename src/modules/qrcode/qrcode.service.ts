import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import * as QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class QrService {
    constructor(
        @Inject("SUPABASE_CLIENT") private readonly supabase: SupabaseClient
    ) {}

    /**
     * Generate QR code as Base64
     */
    async generateQrBase64(data: Record<string, any>): Promise<string> {
        try {
            const jsonString = JSON.stringify(data);
            return await QRCode.toDataURL(jsonString, {
                errorCorrectionLevel: "H",
                type: "image/png",
                margin: 2,
                width: 300
            });
        } catch (error) {
            throw new BadRequestException("Failed to generate QR code");
        }
    }

    /**
     * Generate and upload QR to Supabase storage
     */
    async generateAndUploadQr(
        data: Record<string, any>,
        variantId: string,
        businessName: string
    ): Promise<string> {
        try {
            const jsonString = JSON.stringify(data);
            const qrBuffer = await QRCode.toBuffer(jsonString, {
                errorCorrectionLevel: "H",
                type: "png",
                margin: 2,
                width: 300
            });

            const fileName = `businesses/${
                businessName.split(" ")[0]
            }/qrcodes/qr-${variantId}-${uuidv4()}.png`;
            const { data: uploadData, error } = await this.supabase.storage
                .from("products")
                .upload(fileName, qrBuffer, {
                    contentType: "image/png",
                    upsert: true
                });

            if (error) {
                throw new BadRequestException(
                    `Upload failed: ${error.message}`
                );
            }

            // Get public URL
            const {
                data: { publicUrl }
            } = this.supabase.storage.from("products").getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }
}
