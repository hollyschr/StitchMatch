import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({ 
  onFileSelect, 
  onCancel,
  className = "" 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [driveFileId, setDriveFileId] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileIdSubmit = async () => {
    if (!driveFileId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Drive file ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create a mock file object from the Drive ID
      const file: GoogleDriveFile = {
        id: driveFileId.trim(),
        name: fileName || `Pattern_${driveFileId}`,
        mimeType: 'application/pdf',
        webViewLink: `https://drive.google.com/file/d/${driveFileId.trim()}/view`
      };
      
      onFileSelect(file);
      
      // Clear form
      setDriveFileId('');
      setFileName('');
      
      toast({
        title: "Success",
        description: "Google Drive file linked successfully",
      });
      
    } catch (error) {
      console.error('Error linking Google Drive file:', error);
      toast({
        title: "Error",
        description: "Failed to link Google Drive file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDriveFileId('');
    setFileName('');
    onCancel?.();
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          <p className="mb-2">To link a Google Drive PDF:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Upload your PDF to Google Drive</li>
            <li>Right-click the file and select "Share"</li>
            <li>Click "Copy link"</li>
            <li>Paste the link below (we'll extract the file ID)</li>
          </ol>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Google Drive Link:</label>
            <Input
              type="text"
              placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view"
              value={driveFileId}
              onChange={(e) => {
                const value = e.target.value;
                setDriveFileId(value);
                
                // Extract file ID from Google Drive link
                const match = value.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                  setDriveFileId(match[1]);
                }
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">File Name (optional):</label>
            <Input
              type="text"
              placeholder="Pattern name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleFileIdSubmit}
            disabled={isLoading || !driveFileId.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Linking...
              </div>
            ) : (
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Link Google Drive File
              </div>
            )}
          </Button>
          
          <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <p>💡 Tip: You can also just paste the file ID directly (the long string in the Google Drive URL)</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleDrivePicker; 