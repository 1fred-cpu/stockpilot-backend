import { Injectable } from "@nestjs/common";
import { print, getDefaultPrinter } from "pdf-to-printer";

@Injectable()
export class ReceiptPrinterHelper {
    async printPdf(pdfPath: string, printerName?: string) {
        try {
            let options: any = {};

            if (printerName) {
                options.printer = printerName;
            } else {
                // Auto detect default printer
                const defaultPrinter = await getDefaultPrinter();
                if (defaultPrinter?.name) {
                    options.printer = defaultPrinter.name;
                }
            }

            await print(pdfPath, options);

            return {
                success: true,
                error: null,
                message: `Printed successfully on ${
                    options.printer || "default printer"
                }`
            };
        } catch (error) {
            return {error};
        }
    }
}
