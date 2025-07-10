import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Upload } from 'lucide-react';

const API_KEY = "AIzaSyAxYBKySrX8tMXKByRF9yD3mEu0Kz79DlQ";
const CLIENT_ID = "112772870993-crm9ehha70r7e3i081fujtd2ggec46ld.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

interface GoogleDrivePickerProps {
  onFileSelect: (file: GoogleDriveFile) => void;
  onCancel?: () => void;
  className?: string;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({ 
  onFileSelect, 
  onCancel,
  className = "" 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  useEffect(() => {
    // Load Google API
    const loadGoogleAPI = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth', { callback: onAuthApiLoad });
        window.gapi.load('picker', { callback: onPickerApiLoad });
      };
      document.head.appendChild(script);
    };

    if (!window.gapi) {
      loadGoogleAPI();
    } else {
      window.gapi.load('auth', { callback: onAuthApiLoad });
      window.gapi.load('picker', { callback: onPickerApiLoad });
    }
  }, []);

  const onAuthApiLoad = () => {
    window.gapi.auth.authorize(
      {
        client_id: CLIENT_ID,
        scope: SCOPE,
        immediate: false,
      },
      handleAuthResult
    );
  };

  const onPickerApiLoad = () => {
    setIsPickerLoaded(true);
  };

  const handleAuthResult = (authResult: any) => {
    if (authResult && !authResult.error) {
      setOauthToken(authResult.access_token);
    } else {
      console.error('Auth failed:', authResult?.error);
    }
  };

  const handlePickFile = async () => {
    if (!oauthToken) {
      // Re-authenticate if no token
      onAuthApiLoad();
      return;
    }

    setIsLoading(true);
    
    try {
      // Initialize the Google Picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false)
          .setMimeTypes('application/pdf'))
        .setOAuthToken(oauthToken)
        .setDeveloperKey(API_KEY)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const file = data.docs[0];
            onFileSelect({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              webViewLink: file.url
            });
          }
          if (data.action === window.google.picker.Action.CANCEL) {
            onCancel?.();
          }
        })
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED, false)
        .setTitle('Select a PDF pattern file')
        .setWidth(600)
        .setHeight(400)
        .build();
      
      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening Google Drive picker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handlePickFile}
        disabled={!isPickerLoaded || isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
            Loading...
          </div>
        ) : (
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Select PDF from Google Drive
          </div>
        )}
      </Button>
    </div>
  );
};

export default GoogleDrivePicker; 