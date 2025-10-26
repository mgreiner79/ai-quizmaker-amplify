// src/components/KnowledgeFileModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { list, uploadData } from 'aws-amplify/storage';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { useAuthenticator } from '@aws-amplify/ui-react';

interface KnowledgeFileModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (fileKey: string) => void;
}

type ListedItem = { key: string };

const KnowledgeFileModal: React.FC<KnowledgeFileModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const { user } = useAuthenticator();
  const [files, setFiles] = useState<{ key: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the list of files when the modal opens
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!(open && user?.userId)) return;
      try {
        const result = await list({ path: `knowledge/${user.userId}/` });
        if (cancelled) return;
        const items =
          result.items?.map((item: any) => ({ key: item.path as string })) ??
          [];
        setFiles(items);
      } catch (err) {
        // Keep silent here; higher-level UX handles errors elsewhere
        console.error('Error listing files: ', err);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleSelectChange = (
    event: React.ChangeEvent<{ value: unknown }> | any,
  ) => {
    setSelectedFile(String(event.target.value));
  };

  // Trigger file input when "Upload New File" is clicked
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file upload
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.userId) return;

    setUploading(true);
    try {
      const uploadTask = uploadData({
        data: file, // <— direct File upload
        path: `knowledge/${user.userId}/${file.name}`,
        options: {
          // optional but useful
          contentType: file.type || 'application/octet-stream',
          // onProgress: ({ transferredBytes, totalBytes }) => { ... } // if we later add a progress bar
        },
      });

      const result = await uploadTask.result;
      const newFileKey = result.path;

      // Update the list and selection
      setFiles((prev) => [...prev, { key: newFileKey }]);
      setSelectedFile(newFileKey);
      onSelect(newFileKey);
    } catch (err) {
      console.error('Error uploading file: ', err);
    } finally {
      setUploading(false);
      // clear the input so selecting the same file again will re-trigger change
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // When the user confirms their selection
  const handleConfirm = () => {
    if (selectedFile) onSelect(selectedFile);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Knowledge File</DialogTitle>
      <DialogContent>
        <Box mt={1}>
          <Select
            fullWidth
            value={selectedFile}
            onChange={handleSelectChange}
            displayEmpty
          >
            {files.length === 0 && (
              <MenuItem value="" disabled>
                No files found
              </MenuItem>
            )}
            {files.map((file) => (
              <MenuItem key={file.key} value={file.key}>
                {/* Display just the filename */}
                {file.key.split('/').pop()}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box mt={2}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".pdf,.txt,.doc,.docx"
          />
          <Button
            onClick={handleUploadClick}
            variant="outlined"
            fullWidth
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload New File'}
          </Button>
        </Box>
        {selectedFile && (
          <Box mt={2}>
            <Typography variant="body2">
              Selected: {selectedFile.split('/').pop()}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleConfirm}
          color="primary"
          disabled={!selectedFile || uploading}
        >
          OK
        </Button>
        <Button onClick={onClose} color="secondary" disabled={uploading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KnowledgeFileModal;
