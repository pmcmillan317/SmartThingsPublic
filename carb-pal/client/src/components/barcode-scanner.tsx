import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScanSuccess, onError }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef("barcode-scanner-" + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanning();
          setIsOpen(false);
        },
        (errorMessage) => {
          // Ignore decode errors (normal when no barcode in view)
        }
      );
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to start camera";
      setError(errorMsg);
      setIsScanning(false);
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
    setError(null);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        data-testid="button-open-barcode-scanner"
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        Scan Barcode
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error ? (
              <Card className="p-6 text-center border-destructive/50">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={startScanning} data-testid="button-retry-scan">
                  Try Again
                </Button>
              </Card>
            ) : (
              <>
                <div
                  id={scannerIdRef.current}
                  className="w-full rounded-lg overflow-hidden bg-black"
                  style={{ minHeight: "300px" }}
                />

                {isScanning && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Point your camera at a barcode
                    </p>
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Scanning...</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-close-scanner"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
