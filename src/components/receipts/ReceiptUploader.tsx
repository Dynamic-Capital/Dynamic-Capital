import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptUploaderProps {
  paymentId: string;
  onUploadComplete?: (success: boolean) => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  paymentId,
  onUploadComplete
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = async () => {
    if (!uploadedFile || !paymentId) return;

    setUploading(true);
    setUploadStatus('idle');

    try {
      // Get upload URL
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('receipt-upload-url', {
        body: { 
          payment_id: paymentId,
          filename: uploadedFile.name,
          content_type: uploadedFile.type
        }
      });

      if (uploadError) throw uploadError;

      if (!uploadData?.upload_url) {
        throw new Error('No upload URL received');
      }

      // Upload file directly to the signed URL
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: uploadedFile,
        headers: { 
          'Content-Type': uploadedFile.type,
          'x-amz-acl': 'private'
        }
      });

      if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Submit receipt
      const { error: submitError } = await supabase.functions.invoke('receipt-submit', {
        body: { 
          payment_id: paymentId,
          file_path: uploadData.file_path,
          storage_bucket: uploadData.bucket
        }
      });

      if (submitError) throw submitError;

      setUploadStatus('success');
      toast.success('Receipt uploaded successfully! Your payment is being reviewed.');
      onUploadComplete?.(true);
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      setUploadStatus('error');
      toast.error(error.message || 'Failed to upload receipt');
      onUploadComplete?.(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Payment Receipt
        </CardTitle>
        <CardDescription>
          Upload a clear photo or screenshot of your payment confirmation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            setUploadedFile(e.target.files?.[0] || null);
            setUploadStatus('idle');
          }}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        
        {uploadedFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
          </div>
        )}

        {uploadStatus === 'success' && (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Receipt uploaded successfully! Your payment is being reviewed.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === 'error' && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              Upload failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleFileUpload}
          disabled={!uploadedFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? "Uploading..." : "Submit Receipt"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReceiptUploader;