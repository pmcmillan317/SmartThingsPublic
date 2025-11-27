import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const DISCLAIMER_KEY = "carbpal_disclaimer_accepted";

export function MedicalDisclaimer() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        hideClose={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <DialogTitle className="text-2xl">Medical Disclaimer</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed space-y-4 pt-4">
            <p className="font-semibold text-foreground">
              Important Information About CarbPal
            </p>

            <p>
              <strong>CarbPal is a carbohydrate calculation tool</strong> designed to help you estimate carbohydrate content in foods. This application is provided for <strong>informational and educational purposes only</strong>.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="font-semibold text-foreground">This app is NOT:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>A substitute for professional medical advice, diagnosis, or treatment</li>
                <li>A replacement for consultation with your healthcare provider</li>
                <li>Medical device or FDA-approved diabetes management tool</li>
                <li>Designed to provide insulin dosing recommendations</li>
              </ul>
            </div>

            <p>
              <strong>Always consult with your physician, certified diabetes educator, or qualified healthcare provider</strong> before making any decisions about your diabetes management, insulin dosing, dietary changes, or treatment plans.
            </p>

            <p>
              The nutritional information provided by CarbPal, including data from third-party databases (USDA FoodData Central and FatSecret Platform API), may contain inaccuracies or variations. <strong>Actual carbohydrate content may differ</strong> from displayed values due to variations in food preparation, portion sizes, product formulations, and data sources.
            </p>

            <p className="font-semibold text-foreground">
              Disclaimer of Liability
            </p>

            <p>
              By using CarbPal, you acknowledge and agree that the creator of this application <strong>assumes no responsibility or liability</strong> for any consequences arising from:
            </p>

            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use or misuse of information provided by this application</li>
              <li>Medical decisions made based on carbohydrate calculations</li>
              <li>Adverse health outcomes or complications</li>
              <li>Inaccuracies in nutritional data or calculations</li>
              <li>Technical errors or application malfunctions</li>
            </ul>

            <p className="text-sm text-muted-foreground italic mt-4">
              If you are experiencing a medical emergency, call 911 or your local emergency services immediately. Do not rely on this application for emergency medical situations.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            Scroll down to accept terms.
          </div>
          <Button
            onClick={handleAccept}
            data-testid="button-accept-disclaimer"
            size="lg"
            className="w-full sm:w-auto"
          >
            I Understand and Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
