import { FileText, Trash, Upload } from '@phosphor-icons/react';
import type React from 'react';
import { useState, useRef } from 'react';

import styles from './FileUpload.module.css';

interface FileUploadProps {
    /** Unique identifier for the file input */
    name: string;
    /** Current file value */
    file: File | null;
    /** Callback function to update the file */
    setFile: (file: File | null) => void;
    /** Label text displayed above the upload area */
    label?: string;
    /** Accepted file types (e.g., '.pdf,.doc,.docx' or 'image/*') */
    accept?: string;
    /** Maximum file size in MB */
    maxSizeMB?: number;
    /** Whether the field is required */
    isRequired?: boolean;
    /** Whether the input is disabled */
    isDisabled?: boolean;
    /** Error message to display */
    errorMessage?: string;
    /** Description text to show below the label */
    description?: string;
    /** Border radius preset */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function FileUpload({
    name,
    file,
    setFile,
    label,
    accept,
    maxSizeMB = 10,
    isRequired = false,
    isDisabled = false,
    errorMessage,
    description,
    radius = 'md',
}: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [validationError, setValidationError] = useState('');

    const computedErrorMessage = errorMessage || validationError;

    const validateFile = (selectedFile: File): boolean => {
        setValidationError('');

        // Check file size
        const fileSizeMB = selectedFile.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            setValidationError(`File size must be less than ${maxSizeMB}MB`);
            return false;
        }

        // Check file type if accept is specified
        if (accept) {
            const acceptedTypes = accept.split(',').map((type) => type.trim());
            const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
            const mimeType = selectedFile.type;

            const isValidType = acceptedTypes.some((acceptedType) => {
                if (acceptedType.startsWith('.')) {
                    return fileExtension === acceptedType.toLowerCase();
                } else if (acceptedType.includes('/*')) {
                    const prefix = acceptedType.split('/')[0];
                    return prefix !== undefined && mimeType.startsWith(prefix);
                } else {
                    return mimeType === acceptedType;
                }
            });

            if (!isValidType) {
                setValidationError(`File type not supported. Accepted types: ${accept}`);
                return false;
            }
        }

        return true;
    };

    const handleFileSelect = (selectedFile: File) => {
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (isDisabled) return;

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setValidationError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadClick = () => {
        if (!isDisabled) {
            fileInputRef.current?.click();
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={`${styles.container} ${isDisabled ? styles.disabled : ''}`}>
            {!!label && (
                <label className={styles.label} htmlFor={name}>
                    {label}
                    {!!isRequired && <span className={styles.required}>*</span>}
                </label>
            )}

            {!!description && <p className={styles.description}>{description}</p>}

            <div
                className={`${styles.dropzone} ${styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`]} ${dragActive ? styles.drag_active : ''} ${file ? styles.has_file : ''} ${computedErrorMessage ? styles.error : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleUploadClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUploadClick();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label={label || 'Upload file'}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    id={name}
                    name={name}
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={isDisabled}
                    className={styles.input}
                    aria-describedby={computedErrorMessage ? `${name}-error` : undefined}
                />

                {!file ? (
                    <div className={styles.empty_state}>
                        <div className={styles.icon}>
                            <Upload />
                        </div>
                        <div className={styles.text}>
                            <p className={styles.primary_text}>Click to upload</p>
                            <p className={styles.secondary_text}>or drag and drop</p>
                            {!!accept && <p className={styles.hint}>Supported formats: {accept}</p>}
                            <p className={styles.hint}>Max size: {maxSizeMB}MB</p>
                        </div>
                    </div>
                ) : (
                    <div className={styles.file_info}>
                        <div className={styles.file_icon}>
                            <FileText />
                        </div>
                        <div className={styles.file_details}>
                            <p className={styles.file_name}>{file.name}</p>
                            <p className={styles.file_size}>{formatFileSize(file.size)}</p>
                        </div>
                        <button
                            type="button"
                            className={styles.remove_button}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile();
                            }}
                            aria-label="Remove file"
                        >
                            <Trash />
                        </button>
                    </div>
                )}
            </div>

            {!!computedErrorMessage && (
                <span id={`${name}-error`} className={styles.error_message}>
                    {computedErrorMessage}
                </span>
            )}
        </div>
    );
}
