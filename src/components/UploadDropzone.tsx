import React, { useMemo } from 'react';
import { FileDropzone } from './ui/FileDropzone';
import type { FileUploadState } from '../hooks/useUploadTraducao';
import { MAX_FILES, MAX_FILE_BYTES } from '../hooks/useUploadTraducao';

interface UploadDropzoneProps {
  files: FileUploadState[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
  isUploading?: boolean;
  error?: string | null;
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  disabled,
  isUploading,
  error,
}) => {
  const fileObjects = useMemo(() => files.map((f) => f.file), [files]);

  const handleChange = (next: File[]) => {
    const existingFileObjects = new Set(fileObjects);
    const removed = files.filter((f) => !next.includes(f.file));
    const added = next.filter((f) => !existingFileObjects.has(f));

    if (added.length > 0) onAddFiles(added);
    removed.forEach((f) => onRemoveFile(f.id));
  };

  const overallStatus = isUploading
    ? 'uploading'
    : files.some((f) => f.status === 'error')
      ? 'error'
      : files.length > 0 && files.every((f) => f.status === 'done')
        ? 'done'
        : 'idle';

  return (
    <FileDropzone
      mode="multiple"
      accept={ACCEPT}
      maxSize={MAX_FILE_BYTES}
      maxFiles={MAX_FILES}
      value={fileObjects}
      onChange={handleChange}
      disabled={disabled}
      uploadStatus={overallStatus}
      errorMessage={error ?? undefined}
    />
  );
};
