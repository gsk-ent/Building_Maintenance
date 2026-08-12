import "server-only";
import QRCode from "qrcode";

/** Renders a UPI payment URI as a QR code data URL (PNG), server-side. */
export async function upiQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 240 });
}
