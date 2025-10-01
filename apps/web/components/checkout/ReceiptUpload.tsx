"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Upload } from "lucide-react";

interface ReceiptUploadProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  handleFileUpload: () => void;
  uploading: boolean;
  uploadStatus: "idle" | "success" | "error";
  handleRetry: () => void;
  retrying: boolean;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = (
  {
    uploadedFile,
    setUploadedFile,
    handleFileUpload,
    uploading,
    uploadStatus,
    handleRetry,
    retrying,
  },
) => (
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
        onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
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
            onClick={handleRetry}
            disabled={retrying || uploading || !uploadedFile}
            className="w-full"
            variant="outline"
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

export default ReceiptUpload;
