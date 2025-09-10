export interface ReceiptUploadBody {
  payment_id: string;
  filename: string;
  content_type: string;
  initData?: string;
}

export interface ReceiptSubmitBody {
  payment_id: string;
  file_path: string;
  bucket: string;
  initData?: string;
}

export interface ApiError {
  message: string;
}
