// React에서 Electron의 app-data.json을 읽고/저장하는 헬퍼

declare global {
  interface Window {
    api: {
      loadAppData: () => Promise<any>;
      saveAppData: (data: any) => Promise<boolean>;
      ipcRenderer: {
        invoke: (...args: any[]) => Promise<any>;
        send: (...args: any[]) => void;
        on: (...args: any[]) => void;
      };
    };
  }
}

export async function loadAppData<T = any>(): Promise<T> {
  if (window.api && window.api.loadAppData) {
    return await window.api.loadAppData();
  }
  throw new Error('Electron API not available');
}

export async function saveAppData(data: any): Promise<boolean> {
  if (window.api && window.api.saveAppData) {
    return await window.api.saveAppData(data);
  }
  throw new Error('Electron API not available');
}
