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
    if (open && user?.userId) {
      list({
        path: `knowledge/${user.userId}/`,
      })
        .then((result) => {
          console.log('Files:', result);
          setFiles(result.items.map((item: any) => ({ key: item.path })) || []);
        })
        .catch((err) => console.error('Error listing files: ', err));
    }
  }, [open, user]);

  // Handle dropdown change
  const handleSelectChange = (event: any) => {
    setSelectedFile(event.target.value);
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
    if (file && user?.userId) {
      setUploading(true);
      try {
        // Convert the file to an ArrayBuffer (you can also use file.arrayBuffer())
        const arrayBuffer = await file.arrayBuffer();
        // Upload the file
        const uploadResult = uploadData({
          data: arrayBuffer,
          path: `knowledge/${user.userId}/${file.name}`,
        });
        // Depending on your API, the uploaded file's key might be here:
        const result = await uploadResult.result;
        const newFileKey = result.path;
        // Update the file list and select the new file
        setFiles((prev) => [...prev, { key: newFileKey }]);
        setSelectedFile(newFileKey);
        onSelect(newFileKey);
      } catch (err) {
        console.error('Error uploading file: ', err);
      } finally {
        setUploading(false);
      }
    }
  };

  // When the user confirms their selection
  const handleConfirm = () => {
    onSelect(selectedFile);
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
          disabled={!selectedFile}
        >
          OK
        </Button>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KnowledgeFileModal;
