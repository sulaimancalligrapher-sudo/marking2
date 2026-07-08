import {
  StudentSubmission,
  User,
  PredefinedText,
  WatermarkSettings,
  SavedCorrectionData,
  InitialData
} from './types';

class GasApiService {
  private get baseUrl(): string {
    return localStorage.getItem('gas_web_app_url') || '';
  }

  public get isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  public setConfig(url: string) {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/exec')) {
      // already correct
    } else if (cleanUrl.includes('/exec?')) {
      cleanUrl = cleanUrl.split('?')[0];
    }
    localStorage.setItem('gas_web_app_url', cleanUrl);
  }

  public clearConfig() {
    localStorage.removeItem('gas_web_app_url');
  }

  private async request<T>(params: Record<string, string>, options?: RequestInit): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('Google Apps Script URL is not configured.');
    }

    const queryParams = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}?${queryParams}`;

    const defaultOptions: RequestInit = {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Request failed on server.');
      }
      return result.data as T;
    } catch (error: any) {
      console.error('GAS API Error:', error);
      throw new Error(error.message || 'Network error occurred while connecting to Google Sheets.');
    }
  }

  private async postRequest<T>(action: string, payload: any): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('Google Apps Script URL is not configured.');
    }

    const url = this.baseUrl;
    const body = JSON.stringify({
      action,
      ...payload
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        body: body
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'POST request failed on server.');
      }
      return result.data as T;
    } catch (error: any) {
      console.error('GAS API POST Error:', error);
      throw new Error(error.message || 'Network error occurred during save.');
    }
  }

  public async testConnection(url: string): Promise<boolean> {
    try {
      let cleanUrl = url.trim().split('?')[0];
      const testUrl = `${cleanUrl}?action=getAdditionalHeaders`;
      const response = await fetch(testUrl, { mode: 'cors', redirect: 'follow' });
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  public async getInitialData(): Promise<InitialData> {
    const raw = await this.request<any>({ action: 'getData' });
    const profile = {
      logoUrl: raw.profile?.[0]?.[2] || '',
      title: raw.profile?.[0]?.[1] || 'لوحة تصحيح الدروس',
      subtitle: raw.profile?.[1]?.[1] || 'تصحيح تفاعلي احترافي'
    };
    const social = {
      facebook: raw.contact?.[0]?.[0] || '',
      instagram: raw.contact?.[0]?.[1] || '',
      youtube: raw.contact?.[0]?.[2] || '',
      line: raw.contact?.[0]?.[3] || ''
    };
    return { profile, social };
  }

  public async getTableData(): Promise<StudentSubmission[]> {
    return this.request<StudentSubmission[]>({ action: 'getTableData' });
  }

  public async getAdditionalHeaders(): Promise<string[]> {
    return this.request<string[]>({ action: 'getAdditionalHeaders' });
  }

  public async getPredefinedTexts(): Promise<PredefinedText[]> {
    return this.request<PredefinedText[]>({ action: 'getPredefinedTexts' });
  }

  public async getStickerUrls(): Promise<string[]> {
    return this.request<string[]>({ action: 'getStickerUrls' });
  }

  public async getWatermarkSettings(): Promise<WatermarkSettings> {
    return this.request<WatermarkSettings>({ action: 'getWatermarkSettings' });
  }

  public async getUsers(): Promise<User[]> {
    return this.request<User[]>({ action: 'getUsers' });
  }

  public async getMediaAsBase64(fileId: string): Promise<string> {
    const raw = await this.request<{ base64: string }>({ action: 'getMediaAsBase64', fileId });
    return raw.base64;
  }

  public async getSavedData(row: number): Promise<SavedCorrectionData> {
    return this.request<SavedCorrectionData>({ action: 'getSavedData', row: row.toString() });
  }

  public async loginUser(username: string, deviceId: string, lat: number | null, lng: number | null): Promise<{ success: boolean; message?: string }> {
    return this.postRequest<{ success: boolean; message?: string }>('loginUser', {
      username,
      deviceId,
      lat,
      lng
    });
  }

  public async saveAllMedia(payload: {
    canvasBase64: string | null;
    canvasFilename: string;
    imageBase64: string | null;
    imageFilename: string;
    videoBase64: string | null;
    videoFilename: string;
    audioBase64: string | null;
    audioFilename: string;
    row: number;
    notes: string;
    imageGrade: string;
    audioGrade: string;
  }): Promise<any> {
    return this.postRequest<any>('saveAllMedia', payload);
  }
}

export const gasApi = new GasApiService();
