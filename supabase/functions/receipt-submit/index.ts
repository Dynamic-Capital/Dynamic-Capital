import { createClient, createClientForRequest } from "../_shared/client.ts";
import { bad, corsHeaders, json, oops, unauth } from "../_shared/http.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";
import { registerHandler } from "../_shared/serve.ts";
import { hashBlob } from "../_shared/hash.ts";
import { findTransferRecipient } from "../_shared/transfer-recipients.ts";

export const handler = registerHandler(async (req) => {
  const cors = corsHeaders(req, "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: cors,
    });
  }

  // Attempt to identify user via Supabase session
  const authHeader = req.headers.get("Authorization");
  let telegramId: string | null = null;
  if (authHeader) {
    try {
      const supaAuth = createClientForRequest(req, {
        auth: { persistSession: false },
      });
      const { data: { user } } = await supaAuth.auth.getUser();
      if (user) {
        telegramId = user.user_metadata?.telegram_id || user.id;
      }
    } catch (e) {
      console.warn("Auth check failed", e);
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON", undefined, req);
  }

  const {
    payment_id,
    file_path,
    bucket,
    initData,
    telegram_id,
    parsed_slip,
    order_id,
    reference_code,
  } = body;

  // If no auth, try Telegram initData
  if (!telegramId && initData) {
    try {
      const valid = await verifyInitData(initData);
      if (valid) {
        const params = new URLSearchParams(initData);
        const user = JSON.parse(params.get("user") || "{}");
        telegramId = String(user.id || "");
      } else {
        return unauth("Invalid Telegram initData", req);
      }
    } catch (err) {
      console.error("Error verifying Telegram initData:", err);
      return unauth("Telegram verification failed", req);
    }
  }

  // Fallback to explicit telegram_id (e.g., from bot)
  if (!telegramId && telegram_id) {
    telegramId = String(telegram_id);
  }

  if (!payment_id || !file_path) {
    return bad("Missing required fields", undefined, req);
  }

  console.log("Receipt submission:", {
    telegramId,
    payment_id,
    file_path,
    bucket,
  });

  const supa = createClient("service");

  try {
    const { data: payment, error: paymentLookupError } = await supa
      .from("payments")
      .select("id,user_id,webhook_data")
      .eq("id", payment_id)
      .maybeSingle();

    if (paymentLookupError) {
      console.error("Payment lookup error:", paymentLookupError);
    }
    if (!payment) {
      return oops("Payment not found", undefined, req);
    }

    const storageBucket = typeof bucket === "string" && bucket
      ? bucket
      : "payment-receipts";
    const { data: downloaded, error: downloadError } = await supa.storage
      .from(storageBucket)
      .download(file_path);

    if (downloadError || !downloaded) {
      console.error("Receipt download error:", downloadError);
      return oops("Failed to read receipt");
    }

    const imageHash = await hashBlob(downloaded);
    const fileBytes = typeof downloaded.size === "number" ? downloaded.size : 0;

    const orderId = typeof order_id === "string" && order_id.trim()
      ? order_id
      : null;
    const referenceCode =
      typeof reference_code === "string" && reference_code.trim()
        ? reference_code.trim()
        : null;

    let orderRecord:
      | { id: string; user_id: string; reference_code: string }
      | null = null;
    if (orderId || referenceCode) {
      const orderQuery = supa
        .from("orders")
        .select("id,user_id,reference_code")
        .limit(1);
      if (orderId) orderQuery.eq("id", orderId);
      else if (referenceCode) orderQuery.eq("reference_code", referenceCode);
      const { data: orderData, error: orderLookupError } = await orderQuery
        .maybeSingle();
      if (orderLookupError) {
        console.error(
          "Order lookup error during receipt submit",
          orderLookupError,
        );
      }
      if (orderData?.id) {
        orderRecord = {
          id: orderData.id as string,
          user_id: orderData.user_id as string,
          reference_code: orderData.reference_code as string,
        };
      }
    }

    const { data: existing, error: duplicateCheckError } = await supa
      .from("receipts")
      .select("id,payment_id,user_id,file_url")
      .eq("image_sha256", imageHash)
      .limit(1)
      .maybeSingle();

    if (duplicateCheckError) {
      console.error("Receipt duplicate check error:", duplicateCheckError);
    }

    if (existing) {
      await supa.storage.from(storageBucket).remove([file_path]).catch(
        (err) => {
          console.warn("Failed to remove duplicate receipt upload", err);
        },
      );
      return json(
        {
          ok: false,
          error: "duplicate_receipt",
          message:
            "This receipt was already submitted. Please upload a new image.",
        },
        409,
        cors,
      );
    }

    const baseWebhookData =
      typeof payment.webhook_data === "object" && payment.webhook_data !== null
        ? payment.webhook_data
        : {};
    const submittedAt = new Date().toISOString();
    const parsedSlipData = parsed_slip && typeof parsed_slip === "object"
      ? parsed_slip as Record<string, unknown>
      : null;
    const transferRecipient = parsedSlipData
      ? await findTransferRecipient(supa, {
        accountNumber: (parsedSlipData.toAccount as string | undefined) ?? null,
        accountName: (parsedSlipData.toName as string | undefined) ?? null,
      })
      : null;

    const webhookData: Record<string, unknown> = {
      ...baseWebhookData,
      file_path,
      bucket: storageBucket,
      storage_path: file_path,
      storage_bucket: storageBucket,
      image_sha256: imageHash,
      submitted_at: submittedAt,
    };

    if (parsedSlipData) {
      webhookData.parsed_slip = parsedSlipData;
      if (transferRecipient) {
        webhookData.transfer_recipient = transferRecipient;
      }
    }

    const { error: paymentError } = await supa
      .from("payments")
      .update({
        status: "pending",
        webhook_data: webhookData,
      })
      .eq("id", payment_id);

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return oops("Failed to update payment");
    }

    if (telegramId) {
      const { error: subscriptionError } = await supa
        .from("user_subscriptions")
        .update({
          payment_status: "pending",
          receipt_file_path: file_path,
        })
        .eq("telegram_user_id", telegramId);

      if (subscriptionError) {
        console.log(
          "Subscription update error (non-critical):",
          subscriptionError,
        );
      }
    }

    const receiptInsertPayload: Record<string, unknown> = {
      payment_id,
      user_id: payment.user_id,
      file_url: file_path,
      image_sha256: imageHash,
    };

    if (parsedSlipData) {
      const bank = parsedSlipData.bank as string | undefined;
      if (bank) receiptInsertPayload.bank = bank;

      const rawText = parsedSlipData.rawText as string | undefined;
      if (rawText) receiptInsertPayload.ocr_text = rawText;

      const amountValue = parsedSlipData.amount as number | string | undefined;
      const numericAmount = typeof amountValue === "number"
        ? amountValue
        : typeof amountValue === "string"
        ? Number(amountValue.replace(/,/g, ""))
        : null;
      if (Number.isFinite(numericAmount)) {
        receiptInsertPayload.ocr_amount = Number(numericAmount);
      }

      const currency = parsedSlipData.currency as string | undefined;
      if (currency) receiptInsertPayload.ocr_currency = currency;

      const status = parsedSlipData.status as string | undefined;
      if (status) receiptInsertPayload.ocr_status = status;

      if (typeof parsedSlipData.successWord === "boolean") {
        receiptInsertPayload.ocr_success_word = parsedSlipData.successWord;
      }

      const reference = parsedSlipData.reference as string | undefined;
      if (reference) receiptInsertPayload.ocr_reference = reference;

      const fromName = parsedSlipData.fromName as string | undefined;
      if (fromName) receiptInsertPayload.ocr_from_name = fromName;

      const toName = parsedSlipData.toName as string | undefined;
      if (toName) receiptInsertPayload.ocr_to_name = toName;

      const toAccount = parsedSlipData.toAccount as string | undefined;
      if (toAccount) receiptInsertPayload.ocr_to_account = toAccount;

      const payCode = parsedSlipData.payCode as string | undefined;
      if (payCode) receiptInsertPayload.ocr_pay_code = payCode;

      const txnDateIso = parsedSlipData.ocrTxnDateIso as string | undefined;
      if (txnDateIso) {
        const txnDate = new Date(txnDateIso);
        if (!Number.isNaN(txnDate.getTime())) {
          receiptInsertPayload.ocr_txn_date = txnDate.toISOString();
        }
      }

      const valueDateIso = parsedSlipData.ocrValueDateIso as string | undefined;
      if (valueDateIso) {
        const valueDate = new Date(valueDateIso);
        if (!Number.isNaN(valueDate.getTime())) {
          receiptInsertPayload.ocr_value_date = valueDate.toISOString();
        }
      }

      if (transferRecipient) {
        receiptInsertPayload.ocr_to_account = transferRecipient.account_number;
      }
    }

    const { error: receiptInsertError } = await supa.from("receipts").insert(
      receiptInsertPayload,
    );

    if (receiptInsertError) {
      console.error("Receipt insert error:", receiptInsertError);
      return oops("Failed to register receipt");
    }

    const uploadedBy = (orderRecord?.user_id || payment.user_id) as
      | string
      | null;
    if (orderRecord && uploadedBy) {
      await supa.from("receipt_uploads").upsert({
        order_id: orderRecord.id,
        storage_path: file_path,
        checksum_sha256: imageHash,
        file_bytes: fileBytes,
        uploaded_by: uploadedBy,
      }, { onConflict: "order_id,uploaded_by" }).catch((err) => {
        console.warn("receipt_uploads upsert failed", err);
      });

      await supa
        .from("orders")
        .update({ status: "verifying" })
        .eq("id", orderRecord.id)
        .in("status", ["awaiting_payment", "pending"]);

      await supa.from("verification_logs").insert({
        order_id: orderRecord.id,
        rule_name: "receipt_upload",
        result: "manual_review",
        notes: `Receipt uploaded ${file_path}`,
      }).catch((err) => {
        console.warn("receipt verification log insert failed", err);
      });

      await supa.from("audit_events").insert({
        entity_type: "order",
        entity_id: orderRecord.id,
        action: "receipt_uploaded",
        actor: telegramId ? `telegram:${telegramId}` : "receipt_submitter",
        payload: {
          storage_path: file_path,
          checksum_sha256: imageHash,
          reference_code: orderRecord.reference_code,
        },
      }).catch((err) => {
        console.warn("order audit insert failed", err);
      });
    }

    console.log("Receipt submitted successfully for payment:", payment_id);

    return json(
      {
        ok: true,
        success: true,
        message: "Receipt submitted successfully",
        payment_id,
      },
      200,
      cors,
    );
  } catch (error) {
    console.error("Receipt submission error:", error);
    return oops("Internal server error", undefined, req);
  }
});

export default handler;
