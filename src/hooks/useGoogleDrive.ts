import { useState, useCallback } from 'react';
import { useStore } from './useStore';
import { DriveFile, DriveConnectionStatus, INTEGRATION_KEYS } from '@/types/integrations';
import { toast } from 'sonner';

// Mock drive files for demo (simulates API response)
const mockDriveFiles: DriveFile[] = [
  { id: 'drive-1', name: 'Contrato Cliente Premium.pdf', mimeType: 'application/pdf', modifiedTime: '2024-12-15T10:30:00Z', size: '2.4 MB' },
  { id: 'drive-2', name: 'Propuesta Comercial Q1.docx', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2024-12-14T15:20:00Z', size: '1.1 MB' },
  { id: 'drive-3', name: 'Manual de Procesos.pdf', mimeType: 'application/pdf', modifiedTime: '2024-12-10T09:00:00Z', size: '5.8 MB' },
  { id: 'drive-4', name: 'Presentación Ventas.pptx', mimeType: 'application/vnd.google-apps.presentation', modifiedTime: '2024-12-12T14:45:00Z', size: '8.2 MB' },
  { id: 'drive-5', name: 'Reporte Financiero Diciembre.xlsx', mimeType: 'application/vnd.google-apps.spreadsheet', modifiedTime: '2024-12-16T11:00:00Z', size: '450 KB' },
];

export function useGoogleDrive() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [driveToken, setDriveToken] = useStore<string | null>('google:drive_token', null);
  const [driveFiles, setDriveFiles] = useStore<DriveFile[]>('google:drive_files', []);

  const connectionStatus: DriveConnectionStatus = {
    connected: !!driveToken,
    lastSync: driveFiles.length > 0 ? new Date().toISOString() : undefined,
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Simulate OAuth flow - in production, this would open Google OAuth
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful connection
      const mockToken = `mock_drive_token_${Date.now()}`;
      setDriveToken(mockToken);
      setDriveFiles(mockDriveFiles);
      
      toast.success('Google Drive conectado exitosamente');
      return true;
    } catch (error) {
      console.error('Error connecting to Drive:', error);
      toast.error('Error al conectar con Google Drive');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [setDriveToken, setDriveFiles]);

  const disconnect = useCallback(() => {
    setDriveToken(null);
    setDriveFiles([]);
    toast.success('Google Drive desconectado');
  }, [setDriveToken, setDriveFiles]);

  const refreshFiles = useCallback(async () => {
    if (!driveToken) {
      toast.error('Conecta Google Drive primero');
      return;
    }
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDriveFiles(mockDriveFiles);
      toast.success('Archivos actualizados');
    } catch (error) {
      console.error('Error refreshing files:', error);
      toast.error('Error al actualizar archivos');
    } finally {
      setIsLoading(false);
    }
  }, [driveToken, setDriveFiles]);

  const getViewerUrl = useCallback((file: DriveFile) => {
    // Return appropriate viewer URL based on file type
    if (file.mimeType.includes('google-apps')) {
      return `https://docs.google.com/document/d/${file.id}/preview`;
    }
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }, []);

  const getOpenUrl = useCallback((file: DriveFile) => {
    return `https://drive.google.com/file/d/${file.id}/view`;
  }, []);

  return {
    connectionStatus,
    driveFiles,
    isConnecting,
    isLoading,
    connect,
    disconnect,
    refreshFiles,
    getViewerUrl,
    getOpenUrl,
  };
}
