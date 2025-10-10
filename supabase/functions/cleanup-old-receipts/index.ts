import { createClient } from "../_shared/client.ts";
import {
  createErrorReference,
  internalError,
  toSafeError,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[CLEANUP-RECEIPTS] ${step}`,
    details ? JSON.stringify(details) : "",
  );
};

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cleanup job started");

    const supabaseClient = createClient("service");

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    logStep("Cleaning files older than", { date: thirtyDaysAgo.toISOString() });

    // Get old files from storage
    const { data: files, error: listError } = await supabaseClient.storage
      .from("payment-receipts")
      .list("", {
        limit: 1000,
        sortBy: { column: "created_at", order: "asc" },
      });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      logStep("No files found in storage");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No files to clean",
          deletedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Filter files older than 30 days
    const oldFiles = files.filter((file) => {
      const fileDate = new Date(file.created_at);
      return fileDate < thirtyDaysAgo;
    });

    logStep("Found old files", {
      count: oldFiles.length,
      totalFiles: files.length,
    });

    if (oldFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No old files to delete",
          deletedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Delete old files from storage
    const filePaths = oldFiles.map((file) => file.name);
    const { error: deleteError } = await supabaseClient.storage
      .from("payment-receipts")
      .remove(filePaths);

    if (deleteError) {
      throw new Error(`Failed to delete files: ${deleteError.message}`);
    }

    logStep("Files deleted successfully", { deletedCount: oldFiles.length });

    // Also clean up database records that reference deleted files
    const { error: dbCleanupError } = await supabaseClient
      .from("user_subscriptions")
      .update({
        receipt_file_path: null,
        receipt_telegram_file_id: null,
      })
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (dbCleanupError) {
      logStep("Warning: DB cleanup failed", dbCleanupError);
    }

    // Clean up education enrollments receipts too
    const { error: eduCleanupError } = await supabaseClient
      .from("education_enrollments")
      .update({
        receipt_file_path: null,
        receipt_telegram_file_id: null,
      })
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (eduCleanupError) {
      logStep("Warning: Education DB cleanup failed", eduCleanupError);
    }

    logStep("Cleanup completed successfully", {
      deletedFiles: oldFiles.length,
      dbRecordsUpdated: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleanup completed successfully",
        deletedCount: oldFiles.length,
        filesDeleted: filePaths,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const reference = createErrorReference();
    const safeError = toSafeError(error);
    logStep("ERROR in cleanup", { message: safeError.message, reference });

    return internalError(safeError, {
      req,
      message: "Cleanup failed.",
      extra: { success: false },
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      reference,
      safeError,
    });
  }
});

export default handler;
