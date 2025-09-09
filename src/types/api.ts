export interface VerifyInitDataResponse {
  ok: boolean;
}

export interface AdminCheckResponse {
  ok?: boolean;
  is_admin?: boolean;
}

export interface VipStatusResponse {
  vip?: {
    is_vip: boolean;
  };
}

export interface TrackEventResponse {
  success?: boolean;
  event_tracked?: string;
  error?: string;
}
