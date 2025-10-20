"use client";

import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

type TelegramWindow = Window & {
  Telegram?: { WebApp?: { initData?: string } };
};

interface ReceiptUploadPayload {
  payment_id: string;
  filename: string;
  content_type: string;
  initData?: string;
}

interface ReceiptSubmitPayload {
  payment_id: string;
  file_path: string;
  bucket: string;
  initData?: string;
}

interface ReceiptUploaderProps {
  paymentId: string;
  onUploadComplete?: (success: boolean) => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  paymentId,
  onUploadComplete,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [retrying, setRetrying] = useState(false);

  const handleFileUpload = async () => {
    if (!uploadedFile || !paymentId) return;

    setUploading(true);
    setUploadStatus("idle");

    try {
      const initData = (window as TelegramWindow).Telegram?.WebApp?.initData;

      // Get upload URL
      const uploadBody: ReceiptUploadPayload = {
        payment_id: paymentId,
        filename: uploadedFile.name,
        content_type: uploadedFile.type,
      };
      if (initData) uploadBody.initData = initData;

      const { data: uploadData, error: uploadError } = await supabase.functions
        .invoke("receipt-upload-url", {
          body: uploadBody,
        });

      if (uploadError) throw uploadError;

      if (!uploadData?.upload_url) {
        throw new Error("No upload URL received");
      }

      // Upload file directly to the signed URL
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: "PUT",
        body: uploadedFile,
        headers: {
          "Content-Type": uploadedFile.type,
          "x-amz-acl": "private",
        },
      });

      if (!uploadResponse.ok) {
        console.error(
          "Upload failed:",
          uploadResponse.status,
          uploadResponse.statusText,
        );
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Submit receipt
      const submitBody: ReceiptSubmitPayload = {
        payment_id: paymentId,
        file_path: uploadData.file_path,
        bucket: uploadData.bucket,
      };
      if (initData) submitBody.initData = initData;

      const { error: submitError } = await supabase.functions.invoke(
        "receipt-submit",
        {
          body: submitBody,
        },
      );

      if (submitError) throw submitError;

      setUploadStatus("success");
      toast.success(
        "Receipt uploaded successfully! Your payment is being reviewed.",
      );
      onUploadComplete?.(true);
    } catch (error) {
      console.error("Receipt upload error:", error);
      setUploadStatus("error");
      const message = error instanceof Error
        ? error.message
        : "Failed to upload receipt";
      toast.error(message);
      onUploadComplete?.(false);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async () => {
    if (!uploadedFile) return;
    setRetrying(true);
    await handleFileUpload();
    setRetrying(false);
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
            setUploadStatus("idle");
          }}
          inputClassName="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />

        {uploadedFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {uploadedFile.name}{" "}
            ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
          </div>
        )}

        {uploadStatus === "success" && (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Receipt uploaded successfully! Your payment is being reviewed.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error" && (
          <Alert className="border-dc-brand/20 bg-dc-brand/10">
            <AlertCircle className="h-4 w-4 text-dc-brand-dark" />
            <AlertDescription className="text-dc-brand-dark">
              Upload failed. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error"
          ? (
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={retrying || uploading || !uploadedFile}
              className="w-full"
            >
              {retrying
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Upload className="h-4 w-4 mr-2" />}
              {retrying ? "Retrying..." : "Retry Upload"}
            </Button>
          )
          : (
            <Button
              onClick={handleFileUpload}
              disabled={!uploadedFile || uploading}
              className="w-full"
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading..." : "Submit Receipt"}
            </Button>
          )}
      </CardContent>
    </Card>
  );
};

export default ReceiptUploader;
