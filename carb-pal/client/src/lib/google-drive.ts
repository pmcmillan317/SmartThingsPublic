// Google Drive client-side integration using OAuth 2.0 PKCE flow
// This implementation is fully client-side and works with the serverless PWA architecture

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

class GoogleDriveClient {
  private tokenClient: any = null;
  private gapiInited = false;
  private gisInited = false;
  private accessToken: string | null = null;
  private lastBackupTime: number = 0;
  private autoBackupEnabled: boolean = true;

  async initialize(): Promise<boolean> {
    try {
      // Skip initialization if required env vars are missing
      if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
        console.warn('Google Drive: Missing VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_API_KEY');
        return false;
      }

      await this.loadGoogleAPIs();

      // Restore access token from localStorage if available
      const storedToken = localStorage.getItem('google_drive_token');
      if (storedToken && (window as any).gapi?.client) {
        this.accessToken = storedToken;
        (window as any).gapi.client.setToken({ access_token: storedToken });
      }

      return this.gapiInited && this.gisInited;
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      return false;
    }
  }

  private loadGoogleAPIs(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Safety check - should not reach here if env vars missing, but double-check
      if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
        reject(new Error('Google API credentials not configured'));
        return;
      }

      // Load Google API script
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInited = true;
            this.checkInitialized(resolve);
          } catch (error) {
            console.error('Google API init error:', error);
            reject(error);
          }
        });
      };
      gapiScript.onerror = (error) => {
        console.error('Failed to load Google API script:', error);
        reject(error);
      };
      document.body.appendChild(gapiScript);

      // Load Google Identity Services script
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: '', // Will be set during sign-in
        });
        this.gisInited = true;
        this.checkInitialized(resolve);
      };
      gisScript.onerror = (error) => {
        console.error('Failed to load Google Identity Services script:', error);
        reject(error);
      };
      document.body.appendChild(gisScript);
    });
  }

  private checkInitialized(resolve: () => void) {
    if (this.gapiInited && this.gisInited) {
      resolve();
    }
  }

  async signIn(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Check if already have valid token
        if (this.accessToken && (window as any).gapi.client.getToken()) {
          resolve(true);
          return;
        }

        // Request new token
        this.tokenClient.callback = async (response: any) => {
          if (response.error) {
            reject(response);
            return;
          }
          this.accessToken = response.access_token;
          if (this.accessToken) {
            localStorage.setItem('google_drive_token', this.accessToken);
          }
          resolve(true);
        };

        if ((window as any).gapi.client.getToken() === null) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  signOut() {
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token);
      (window as any).gapi.client.setToken(null);
    }
    this.accessToken = null;
    localStorage.removeItem('google_drive_token');
  }

  isSignedIn(): boolean {
    return this.accessToken !== null && (window as any).gapi?.client?.getToken() !== null;
  }

  async uploadBackup(fileName: string, data: any): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: new Headers({ Authorization: `Bearer ${this.accessToken}` }),
        body: form,
      }
    );

    const result = await response.json();
    return result.id;
  }

  async listBackups(): Promise<GoogleDriveFile[]> {
    const response = await (window as any).gapi.client.drive.files.list({
      q: "mimeType='application/json' and name contains 'carbpal-backup'",
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 10,
    });

    return response.result.files || [];
  }

  async downloadBackup(fileId: string): Promise<any> {
    const response = await (window as any).gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });

    return response.result;
  }

  async deleteBackup(fileId: string): Promise<void> {
    await (window as any).gapi.client.drive.files.delete({
      fileId: fileId,
    });
  }

  async autoSync(data: any): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google Drive');
    }

    const fileName = `carbpal-backup-${new Date().toISOString().split('T')[0]}.json`;

    // Check if backup for today already exists
    const backups = await this.listBackups();
    const todayBackup = backups.find(b => b.name === fileName);

    if (todayBackup) {
      // Update existing backup
      await this.deleteBackup(todayBackup.id);
    }

    // Upload new backup
    await this.uploadBackup(fileName, data);
  }

  setAutoBackupEnabled(enabled: boolean) {
    this.autoBackupEnabled = enabled;
    localStorage.setItem('carbpal_auto_backup_enabled', enabled.toString());
  }

  isAutoBackupEnabled(): boolean {
    const stored = localStorage.getItem('carbpal_auto_backup_enabled');
    if (stored !== null) {
      this.autoBackupEnabled = stored === 'true';
    }
    return this.autoBackupEnabled;
  }

  async autoBackup(data: any, onSuccess?: () => void): Promise<void> {
    // Check if auto-backup is enabled
    if (!this.isAutoBackupEnabled()) {
      return;
    }

    // Check if signed in
    if (!this.isSignedIn()) {
      return;
    }

    // Throttle: only backup once per minute
    const now = Date.now();
    const ONE_MINUTE = 60 * 1000;

    if (now - this.lastBackupTime < ONE_MINUTE) {
      return; // Skip if backed up within last minute
    }

    try {
      await this.autoSync(data);
      this.lastBackupTime = now;
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Auto-backup failed:', error);
      // Silently fail - don't interrupt user experience
    }
  }
}

export const googleDriveClient = new GoogleDriveClient();
