import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, AlertTriangle, Database, Download, Upload, Cloud, Settings as SettingsIcon, User, LogOut, Crown, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { exportAllData, downloadDataAsFile, importData, getDataSummary } from "@/lib/data-export";
import { googleDriveClient } from "@/lib/google-drive";
import { useAuth } from "@/lib/auth-context";
import { AuthDialog } from "@/components/auth-dialog";
import { SuggestionDialog } from "@/components/suggestion-dialog";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<'login' | 'signup'>('login');
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [dataSummary, setDataSummary] = useState({ customFoods: 0, calcHistory: 0, recipes: 0, meals: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGoogleDriveInitialized, setIsGoogleDriveInitialized] = useState(false);
  const [isGoogleDriveSignedIn, setIsGoogleDriveSignedIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(googleDriveClient.isAutoBackupEnabled());
  const [dataStorageDialogOpen, setDataStorageDialogOpen] = useState(false);
  const [medicalDisclaimerDialogOpen, setMedicalDisclaimerDialogOpen] = useState(false);
  const [privacyPolicyDialogOpen, setPrivacyPolicyDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  useEffect(() => {
    updateDataSummary();
    initializeGoogleDrive();
  }, []);

  const initializeGoogleDrive = async () => {
    const initialized = await googleDriveClient.initialize();
    setIsGoogleDriveInitialized(initialized);
    setIsGoogleDriveSignedIn(googleDriveClient.isSignedIn());
  };

  useEffect(() => {
    const handleStorageChange = () => {
      updateDataSummary();
    };

    const handleDataImported = () => {
      updateDataSummary();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataImported', handleDataImported);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataImported', handleDataImported);
    };
  }, []);

  const updateDataSummary = () => {
    setDataSummary(getDataSummary());
  };

  const handleExportData = async () => {
    const data = exportAllData();
    const success = await downloadDataAsFile(data);
    if (success) {
      toast({
        title: "Data Exported",
        description: "Your backup file has been downloaded",
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const result = importData(data);

        if (result.success) {
          toast({
            title: "Success",
            description: result.message,
          });
        } else {
          toast({
            title: "Import Failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid backup file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConnectGoogleDrive = async () => {
    setIsConnecting(true);
    try {
      const success = await googleDriveClient.signIn();
      if (success) {
        setIsGoogleDriveSignedIn(true);
        toast({
          title: "Connected to Google Drive",
          description: "Your data can now be backed up to Google Drive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Google Drive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogleDrive = () => {
    googleDriveClient.signOut();
    setIsGoogleDriveSignedIn(false);
    toast({
      title: "Disconnected",
      description: "Google Drive has been disconnected",
    });
  };

  const handleBackupToGoogleDrive = async () => {
    if (!isGoogleDriveSignedIn) {
      toast({
        title: "Not Connected",
        description: "Please connect to Google Drive first",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = exportAllData();
      await googleDriveClient.autoSync(data);
      toast({
        title: "Backup Complete",
        description: "Your data has been backed up to Google Drive",
      });
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Unable to backup data to Google Drive",
        variant: "destructive",
      });
    }
  };

  const handleRestoreFromGoogleDrive = async () => {
    if (!isGoogleDriveSignedIn) {
      toast({
        title: "Not Connected",
        description: "Please connect to Google Drive first",
        variant: "destructive",
      });
      return;
    }

    try {
      const backups = await googleDriveClient.listBackups();
      if (backups.length === 0) {
        toast({
          title: "No Backups Found",
          description: "No backup files found in Google Drive",
        });
        return;
      }

      // Get most recent backup
      const latestBackup = backups[0];
      const data = await googleDriveClient.downloadBackup(latestBackup.id);
      const result = importData(data);

      if (result.success) {
        toast({
          title: "Restore Complete",
          description: result.message,
        });
      } else {
        toast({
          title: "Restore Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Unable to restore data from Google Drive",
        variant: "destructive",
      });
    }
  };

  const handleAutoBackupToggle = (checked: boolean) => {
    googleDriveClient.setAutoBackupEnabled(checked);
    setAutoBackupEnabled(checked);
    toast({
      title: checked ? "Auto-Backup Enabled" : "Auto-Backup Disabled",
      description: checked
        ? "Your data will automatically backup to Google Drive after changes"
        : "Automatic backups have been disabled",
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const openAuthDialog = (mode: 'login' | 'signup') => {
    setAuthDialogMode(mode);
    setAuthDialogOpen(true);
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateApp = async () => {
    toast({
      title: "Updating App...",
      description: "Clearing cache and reloading the latest version",
    });

    // Clear service worker cache if it exists
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }

    // Force hard reload after a brief delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Customize your carb tracking experience"
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">

        {/* Account & Subscription */}
        <Card className="p-6 mb-6 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Account & Subscription</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
              <Crown className="h-3 w-3" />
              Premium Feature
            </span>
          </div>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium" data-testid="text-user-email">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.isPremium ? (
                      <span className="inline-flex items-center gap-1 text-primary" data-testid="text-premium-status">
                        <Crown className="h-3 w-3" />
                        Premium Member
                        {user.premiumExpiry && ` - Renews ${new Date(user.premiumExpiry).toLocaleDateString()}`}
                      </span>
                    ) : (
                      <span data-testid="text-free-status">Free Tier</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>

              {/* Subscription Management */}
              {user.isPremium ? (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your subscription, update payment method, or cancel anytime
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    data-testid="button-manage-subscription"
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-primary/10 border-primary/30">
                  <p className="text-sm font-medium mb-2">Upgrade to Premium</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Unlock FatSecret branded foods, barcode scanning, and Google Drive backup
                  </p>
                  <Button
                    onClick={() => window.location.href = '/pricing'}
                    data-testid="button-upgrade-premium"
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    View Pricing
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-primary/10 border-primary/30">
                <p className="text-sm font-medium mb-2">Unlock Premium Features</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Access FatSecret branded foods, barcode scanning, restaurant menus, and Google Drive backup
                </p>
                <div className="flex flex-wrap gap-3 mb-3">
                  <Button
                    onClick={() => window.location.href = '/pricing'}
                    data-testid="button-view-pricing"
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    View Pricing & Subscribe
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Already have an account?{' '}
                  <button
                    onClick={() => openAuthDialog('login')}
                    className="text-primary hover:underline"
                    data-testid="button-open-login"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* App Updates */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">App Updates</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you're not seeing the latest features or changes, use this button to force update the app and clear any cached versions.
            </p>
            <Button
              variant="default"
              onClick={handleUpdateApp}
              data-testid="button-update-app"
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Update App Now
            </Button>
            <p className="text-xs text-muted-foreground">
              This will clear cached files and reload the latest version of CarbPal.
            </p>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose your preferred color theme
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={toggleTheme}
                data-testid="button-theme-toggle-settings"
                className="gap-2 min-w-[140px]"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Data Backup & Sync */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Data Backup & Sync</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Protect your data with backup options
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDataStorageDialogOpen(true)}
              data-testid="button-data-storage"
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Data Storage
            </Button>
          </div>

          {/* Data Summary */}
          <div className="bg-muted p-4 rounded-lg mb-6">
            <p className="text-sm font-medium mb-2">Your Data:</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Custom Foods:</span>
                <span className="ml-2 font-medium">{dataSummary.customFoods}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Calculations:</span>
                <span className="ml-2 font-medium">{dataSummary.calcHistory}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Recipes:</span>
                <span className="ml-2 font-medium">{dataSummary.recipes}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Meals:</span>
                <span className="ml-2 font-medium">{dataSummary.meals}</span>
              </div>
            </div>
          </div>

          {/* Google Drive Sync */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Google Drive Sync</p>
                  <p className="text-sm text-muted-foreground">
                    {isGoogleDriveSignedIn ? "Connected" : "Backup to cloud storage"}
                  </p>
                </div>
              </div>
              {!isGoogleDriveSignedIn ? (
                <Button
                  variant="outline"
                  onClick={handleConnectGoogleDrive}
                  disabled={!isGoogleDriveInitialized || isConnecting}
                  data-testid="button-connect-google-drive"
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleDisconnectGoogleDrive}
                  data-testid="button-disconnect-google-drive"
                >
                  Disconnect
                </Button>
              )}
            </div>

            {/* Auto-Backup Toggle */}
            {isGoogleDriveSignedIn && (
              <div className="mt-4 flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="flex-1">
                  <Label htmlFor="auto-backup-toggle" className="text-sm font-medium">
                    Auto-Backup
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically backup after changes (once per minute)
                  </p>
                </div>
                <Switch
                  id="auto-backup-toggle"
                  checked={autoBackupEnabled}
                  onCheckedChange={handleAutoBackupToggle}
                  data-testid="switch-auto-backup"
                />
              </div>
            )}

            {/* Google Drive Actions */}
            {isGoogleDriveSignedIn && (
              <div className="mt-3 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleBackupToGoogleDrive}
                  data-testid="button-backup-google-drive"
                >
                  <Upload className="h-4 w-4" />
                  Backup Now
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleRestoreFromGoogleDrive}
                  data-testid="button-restore-google-drive"
                >
                  <Download className="h-4 w-4" />
                  Restore
                </Button>
              </div>
            )}
          </div>

          {/* Manual Backup */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Manual Backup</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleExportData}
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-import-data"
              >
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                data-testid="input-file-import"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Export creates a backup file you can save to your device or cloud storage. Import restores data from a backup file.
            </p>
          </div>
        </Card>

        {/* Legal & Privacy */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Legal & Privacy</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => setMedicalDisclaimerDialogOpen(true)}
              data-testid="button-medical-disclaimer"
              className="gap-2 justify-start"
            >
              <AlertTriangle className="h-4 w-4" />
              Medical Disclaimer
            </Button>
            <Button
              variant="outline"
              onClick={() => setPrivacyPolicyDialogOpen(true)}
              data-testid="button-privacy-policy"
              className="gap-2 justify-start"
            >
              <Database className="h-4 w-4" />
              Privacy Policy
            </Button>
            <Button
              variant="outline"
              onClick={() => setTermsDialogOpen(true)}
              data-testid="button-terms"
              className="gap-2 justify-start"
            >
              <Database className="h-4 w-4" />
              Terms & Conditions
            </Button>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">App Name</span>
              <span className="font-medium">CarbPal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">150+ Built-in Foods + {dataSummary.customFoods} Custom</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authDialogMode}
      />

      {/* Suggestion Dialog */}
      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />

      {/* Data Storage Dialog */}
      <Dialog open={dataStorageDialogOpen} onOpenChange={setDataStorageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Storage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              CarbPal stores all your data <strong>locally on your device</strong> using browser storage. This includes your calculation history, custom foods, recipes, and settings.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">Protect your data with backup options:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                <li><strong className="text-foreground">Google Drive Sync:</strong> Backup to cloud and restore across devices</li>
                <li><strong className="text-foreground">Manual Export:</strong> Download JSON backup files to your device</li>
                <li><strong className="text-foreground">Manual Import:</strong> Restore from previously exported backup files</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">Your data may be lost if you:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                <li>Clear your browser data, cache, or cookies</li>
                <li>Uninstall and reinstall the PWA</li>
                <li>Use your browser's "Clear browsing data" feature</li>
                <li>Reset your device to factory settings</li>
                <li>Use incognito/private browsing mode</li>
              </ul>
            </div>

            <p className="text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Without backups, your data exists only on this device and browser. Use Google Drive sync or manual exports to protect your information and access it across devices.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medical Disclaimer Dialog */}
      <Dialog open={medicalDisclaimerDialogOpen} onOpenChange={setMedicalDisclaimerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Medical Disclaimer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <strong>CarbPal is a carbohydrate calculation tool</strong> designed to help you estimate carbohydrate content in foods. This application is provided for <strong>informational and educational purposes only</strong>.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="font-semibold">This app is NOT:</p>
              <ul className="list-disc list-inside space-y-2 ml-2 text-muted-foreground">
                <li>A substitute for professional medical advice, diagnosis, or treatment</li>
                <li>A replacement for consultation with your healthcare provider</li>
                <li>Medical device or FDA-approved diabetes management tool</li>
                <li>Designed to provide insulin dosing recommendations</li>
              </ul>
            </div>

            <p>
              <strong>Always consult with your physician, certified diabetes educator, or qualified healthcare provider</strong> before making any decisions about your diabetes management, insulin dosing, dietary changes, or treatment plans.
            </p>

            <p className="text-muted-foreground">
              The nutritional information provided by CarbPal, including data from third-party databases (USDA FoodData Central and FatSecret Platform API), may contain inaccuracies or variations. <strong className="text-foreground">Actual carbohydrate content may differ</strong> from displayed values due to variations in food preparation, portion sizes, product formulations, and data sources.
            </p>

            <p className="text-xs text-muted-foreground italic">
              If you are experiencing a medical emergency, call 911 or your local emergency services immediately. Do not rely on this application for emergency medical situations.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyPolicyDialogOpen} onOpenChange={setPrivacyPolicyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p><strong>Last Updated:</strong> October 2025</p>

            <h3 className="font-semibold text-base">Data Collection</h3>
            <p>
              CarbPal stores all data locally on your device using browser storage. We do not collect, transmit, or store any personal data on external servers.
            </p>

            <h3 className="font-semibold text-base">Information Stored Locally</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Calculation history</li>
              <li>Custom foods and recipes</li>
              <li>User preferences and settings</li>
              <li>Meal logs</li>
            </ul>

            <h3 className="font-semibold text-base">Third-Party Services</h3>
            <p>
              CarbPal uses external APIs (USDA FoodData Central, FatSecret Platform API) to retrieve nutritional information. These services may have their own privacy policies.
            </p>

            <h3 className="font-semibold text-base">Google Drive Backup</h3>
            <p>
              If you choose to enable Google Drive backup, your data will be stored in your personal Google Drive account. We do not have access to your Google Drive data.
            </p>

            <h3 className="font-semibold text-base">Data Security</h3>
            <p>
              Your data is stored locally on your device. We recommend regular backups to prevent data loss. CarbPal does not transmit your personal data to external servers.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p><strong>Last Updated:</strong> October 2025</p>

            <h3 className="font-semibold text-base">Acceptance of Terms</h3>
            <p>
              By accessing and using CarbPal, you accept and agree to be bound by these Terms and Conditions.
            </p>

            <h3 className="font-semibold text-base">Use License</h3>
            <p>
              CarbPal grants you a personal, non-exclusive, non-transferable license to use this application for personal carbohydrate tracking purposes.
            </p>

            <h3 className="font-semibold text-base">Disclaimer</h3>
            <p>
              CarbPal is provided "as is" without warranty of any kind. The creator assumes no liability for medical decisions made based on information provided by this application.
            </p>

            <h3 className="font-semibold text-base">User Responsibilities</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Verify all nutritional information with healthcare providers</li>
              <li>Do not rely solely on this app for medical decisions</li>
              <li>Maintain regular backups of your data</li>
              <li>Use the application in accordance with medical advice</li>
            </ul>

            <h3 className="font-semibold text-base">Subscription Terms</h3>
            <p>
              Premium subscriptions are billed monthly or annually. You can cancel anytime through your account settings. Refunds are handled according to our refund policy.
            </p>

            <h3 className="font-semibold text-base">Modifications</h3>
            <p>
              We reserve the right to modify these terms at any time. Continued use of CarbPal constitutes acceptance of modified terms.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
