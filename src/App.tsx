import React, { useState, useRef } from 'react';
import { Upload, Download, Image, Settings } from 'lucide-react';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // In development, use relative URLs (proxied by Vite)
  if (import.meta.env.DEV) {
    return '';
  }
  // In production, use the full HTTPS URL
  return 'https://api.pngtosvg.craftycatz.site';
};

interface ConversionOptions {
  preset?: string;
  threshold?: number;
  turdSize?: number;
  optCurve?: boolean;
  turnPolicy?: string;
}

interface BulkResult {
  filename: string;
  success: boolean;
  svgFilename?: string;
  svg?: string;
  error?: string;
}

interface BulkResponse {
  summary: {
    total: number;
    successful: number;
    failed: number;
    processing_time: string;
  };
  results: BulkResult[];
}

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    preset: 'logo',
    threshold: 128,
    turdSize: 2,
    optCurve: true,
    turnPolicy: 'minority',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const presets = [
    {
      id: 'logo',
      name: 'Logo',
      description: 'Best for simple graphics, logos, icons',
    },
    {
      id: 'photo',
      name: 'Photo',
      description: 'Best for complex photographic images',
    },
    {
      id: 'drawing',
      name: 'Drawing',
      description: 'Best for hand-drawn illustrations',
    },
    {
      id: 'text',
      name: 'Text',
      description: 'Best for text-heavy images, documents',
    },
  ];

  const handleFileSelect = (files: File[]) => {
    const pngFiles = files.filter((file) => file.type === 'image/png');

    if (pngFiles.length === 0) {
      setError('Please select PNG files only');
      return;
    }

    // limiting the total file size to (20MB limit)
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes
    const totalSize = pngFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_SIZE) {
      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setError(
        `Total file size (${sizeMB}MB) exceeds the 20MB limit. Please select smaller files or fewer files.`
      );
      return;
    }

    if (pngFiles.length !== files.length) {
      setError(
        `Selected ${pngFiles.length} PNG files out of ${files.length} total files. Only PNG files will be processed.`
      );
    } else {
      setError(null);
    }

    setSelectedFiles(pngFiles);
    setSvgResult(null);
    setBulkResults(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setSvgResult(null);
    setBulkResults(null);
    setError(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    setIsConverting(true);
    setError(null);
    setSvgResult(null);
    setBulkResults(null);

    try {
      if (selectedFiles.length > 1) {
        // Bulk conversion for multiple files
        const formData = new FormData();

        selectedFiles.forEach((file) => {
          formData.append('images', file);
        });

        // Add options to form data
        if (options.preset) formData.append('preset', options.preset);
        if (options.threshold)
          formData.append('threshold', options.threshold.toString());
        if (options.turdSize)
          formData.append('turdSize', options.turdSize.toString());
        if (options.optCurve !== undefined)
          formData.append('optCurve', options.optCurve.toString());
        if (options.turnPolicy)
          formData.append('turnPolicy', options.turnPolicy);
        formData.append('bulk', 'true');
        const response = await fetch(`${getApiBaseUrl()}/api/bulk-convert`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Bulk conversion failed');
        }

        const bulkResponse: BulkResponse = await response.json();
        setBulkResults(bulkResponse);
      } else {
        // Single file conversion
        const formData = new FormData();
        formData.append('image', selectedFiles[0]);

        // Add options to form data
        if (options.preset) formData.append('preset', options.preset);
        if (options.threshold)
          formData.append('threshold', options.threshold.toString());
        if (options.turdSize)
          formData.append('turdSize', options.turdSize.toString());
        if (options.optCurve !== undefined)
          formData.append('optCurve', options.optCurve.toString());
        if (options.turnPolicy)
          formData.append('turnPolicy', options.turnPolicy);

        const response = await fetch(`${getApiBaseUrl()}/api/convert`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Conversion failed');
        }

        const svgText = await response.text();
        setSvgResult(svgText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!svgResult || selectedFiles.length === 0) return;

    const blob = new Blob([svgResult], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      selectedFiles[0]?.name.replace('.png', '.svg') || 'converted.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDownload = (result: BulkResult) => {
    if (!result.success || !result.svg) return;

    const blob = new Blob([result.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      result.svgFilename || `${result.filename.replace('.png', '')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    if (!bulkResults) return;

    bulkResults.results.forEach((result, index) => {
      if (result.success) {
        // adding small delays to prevent browser blocking multiple downloads
        setTimeout(() => handleBulkDownload(result), index * 200);
      }
    });
  };

  const handlePresetChange = (presetId: string) => {
    setOptions({ ...options, preset: presetId });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = (): string => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(totalBytes);
  };

  const getSizePercentage = (): number => {
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return Math.min((totalBytes / MAX_SIZE) * 100, 100);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>PNG to SVG Converter</h1>
        <p>Convert your PNG images to scalable SVG graphics</p>
      </div>

      {/* Upload Section */}
      <div
        ref={dropZoneRef}
        className="upload-section"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">
          {selectedFiles.length > 0 ? <Image /> : <Upload />}
        </div>
        <div className="upload-text">
          {selectedFiles.length > 0 ? (
            selectedFiles.length === 1 ? (
              <>
                <strong>{selectedFiles[0].name}</strong>
                <br />
                Click to select different files
              </>
            ) : (
              <>
                <strong>{selectedFiles.length} files selected</strong>
                <br />
                Click to select different files
              </>
            )
          ) : (
            <>Drag & drop your PNG files here, or click to browse</>
          )}
        </div>
        <div className="upload-controls">
          <button className="upload-btn">
            {selectedFiles.length > 0 ? 'Change Files' : 'Select PNG Files'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png"
          multiple
          onChange={handleFileInputChange}
          className="file-input"
        />
      </div>

      {/* File List Section */}
      {selectedFiles.length > 0 && (
        <div className="file-list-section">
          <div className="file-list-header">
            <h3>Selected Files ({selectedFiles.length})</h3>
            <div className="size-info">
              <span className="total-size">Total: {getTotalSize()}</span>
              <span className="size-limit"> / 20MB</span>
            </div>
          </div>
          <div className="size-progress">
            <div
              className="size-progress-bar"
              style={{
                width: `${getSizePercentage()}%`,
                backgroundColor:
                  getSizePercentage() > 90
                    ? '#ff4757'
                    : getSizePercentage() > 70
                    ? '#ffa502'
                    : '#2ed573',
              }}
            ></div>
          </div>
          <div className="file-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile(index)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="clear-all-btn"
            onClick={clearAllFiles}
            type="button"
          >
            Clear All Files
          </button>
        </div>
      )}

      {/* Options Section */}
      {selectedFiles.length > 0 && (
        <div className="options-section">
          <h3 style={{ marginBottom: '1rem' }}>
            <Settings
              size={20}
              style={{
                verticalAlign: 'middle',
                marginRight: '8px',
              }}
            />
            Conversion Options
          </h3>

          {/* Presets */}
          <div className="preset-buttons">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={`preset-btn ${
                  options.preset === preset.id ? 'active' : ''
                }`}
                onClick={() => handlePresetChange(preset.id)}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Advanced Options */}
          <div className="options-grid">
            <div className="option-group">
              <label>Threshold (0-255)</label>
              <input
                type="number"
                min="0"
                max="255"
                value={options.threshold || 128}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    threshold: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="option-group">
              <label>Noise Removal</label>
              <input
                type="number"
                min="0"
                max="10"
                value={options.turdSize || 2}
                onChange={(e) =>
                  setOptions({ ...options, turdSize: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="option-group">
              <label>Turn Policy</label>
              <select
                value={options.turnPolicy || 'minority'}
                onChange={(e) =>
                  setOptions({ ...options, turnPolicy: e.target.value })
                }
              >
                <option value="minority">Minority</option>
                <option value="majority">Majority</option>
                <option value="black">Black</option>
                <option value="white">White</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.optCurve || false}
                  onChange={(e) =>
                    setOptions({ ...options, optCurve: e.target.checked })
                  }
                  style={{ marginRight: '8px' }}
                />
                Optimize Curves
              </label>
            </div>
          </div>

          {/* Convert Button */}
          <button
            className="convert-btn"
            onClick={handleConvert}
            disabled={selectedFiles.length === 0 || isConverting}
          >
            {isConverting ? (
              <div className="loading">
                <div className="spinner"></div>
                Converting...
              </div>
            ) : selectedFiles.length > 1 ? (
              `Convert ${selectedFiles.length} Images to SVG`
            ) : (
              'Convert to SVG'
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Result Section */}
      {svgResult && !bulkResults && (
        <div className="result-section">
          <div className="result-header">
            <h3>Conversion Complete!</h3>
            <button className="download-btn" onClick={handleDownload}>
              <Download size={16} style={{ marginRight: '8px' }} />
              Download SVG
            </button>
          </div>
          <div
            className="svg-preview"
            dangerouslySetInnerHTML={{ __html: svgResult }}
          />
        </div>
      )}

      {/* Bulk Results Section */}
      {bulkResults && (
        <div className="bulk-results-section">
          <div className="bulk-header">
            <h3>Bulk Conversion Complete!</h3>
            <div className="bulk-stats">
              Successful: {bulkResults.summary.successful} /{' '}
              {bulkResults.summary.total}
              {bulkResults.summary.failed > 0 && (
                <span className="failed-count">
                  {' '}
                  (Failed: {bulkResults.summary.failed})
                </span>
              )}
            </div>
            {bulkResults.summary.successful > 0 && (
              <button className="download-all-btn" onClick={handleDownloadAll}>
                <Download size={16} style={{ marginRight: '8px' }} />
                Download All ({bulkResults.summary.successful})
              </button>
            )}
          </div>

          <div className="bulk-results-list">
            {bulkResults.results.map((result, index) => (
              <div
                key={index}
                className={`bulk-result-item ${
                  result.success ? 'success' : 'error'
                }`}
              >
                <div className="result-info">
                  <span className="filename">{result.filename}</span>
                  {result.success ? (
                    <span className="status success">✓ Converted</span>
                  ) : (
                    <span className="status error">✗ {result.error}</span>
                  )}
                </div>
                {result.success && (
                  <div className="result-actions">
                    <button
                      className="download-single-btn"
                      onClick={() => handleBulkDownload(result)}
                    >
                      <Download size={14} />
                    </button>
                    <div
                      className="svg-preview-small"
                      dangerouslySetInnerHTML={{ __html: result.svg || '' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
