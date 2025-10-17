"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Download,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Simplified table configuration for key tables
const AVAILABLE_TABLES = [
  {
    key: "kv_config",
    name: "Key-Value Config",
    icon: "⚙️",
    description: "Feature flags and configuration storage",
  },
  {
    key: "abuse_bans",
    name: "Abuse Bans",
    icon: "🚫",
    description: "User ban management and moderation",
  },
  {
    key: "admin_logs",
    name: "Admin Logs",
    icon: "📋",
    description: "Administrative action audit trail",
  },
  {
    key: "bot_users",
    name: "Bot Users",
    icon: "👥",
    description: "User accounts and authentication",
  },
  {
    key: "subscription_plans",
    name: "Subscription Plans",
    icon: "💎",
    description: "VIP subscription packages",
  },
] as const;

type TableKey = typeof AVAILABLE_TABLES[number]["key"];

interface TableRecord {
  [key: string]: any;
}

interface CreateKvConfigForm {
  key: string;
  value: string;
}

interface CreateAbuseBanForm {
  telegram_id: string;
  reason: string;
  expires_at: string;
  created_by: string;
}

export const AdminDataManager = () => {
  const [selectedTable, setSelectedTable] = useState<TableKey>("kv_config");
  const [records, setRecords] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const tableOptions = useMemo(
    () =>
      AVAILABLE_TABLES.map((table) => ({
        value: table.key,
        label: table.name,
        description: table.description,
        icon: (
          <span aria-hidden="true" className="text-lg">
            {table.icon}
          </span>
        ),
      })),
    [],
  );

  // Form states for different tables
  const [kvConfigForm, setKvConfigForm] = useState<CreateKvConfigForm>({
    key: "",
    value: "",
  });

  const [abuseBanForm, setAbuseBanForm] = useState<CreateAbuseBanForm>({
    telegram_id: "",
    reason: "",
    expires_at: "",
    created_by: "",
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleCreateKvConfig = async () => {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(kvConfigForm.value);
      } catch {
        parsedValue = kvConfigForm.value;
      }

      const { error } = await supabase
        .from("kv_config")
        .insert<TablesInsert<"kv_config">>({
          key: kvConfigForm.key,
          value: parsedValue,
        });

      if (error) throw error;

      toast.success("Config created successfully");
      setIsCreating(false);
      setKvConfigForm({ key: "", value: "" });
      fetchRecords();
    } catch (error) {
      console.error("Error creating config:", error);
      toast.error("Failed to create config");
    }
  };

  const handleCreateAbuseBan = async () => {
    try {
      const { error } = await supabase
        .from("abuse_bans")
        .insert<TablesInsert<"abuse_bans">>({
          telegram_id: abuseBanForm.telegram_id,
          reason: abuseBanForm.reason || null,
          expires_at: abuseBanForm.expires_at || null,
          created_by: abuseBanForm.created_by || null,
        });

      if (error) throw error;

      toast.success("Ban created successfully");
      setIsCreating(false);
      setAbuseBanForm({
        telegram_id: "",
        reason: "",
        expires_at: "",
        created_by: "",
      });
      fetchRecords();
    } catch (error) {
      console.error("Error creating ban:", error);
      toast.error("Failed to create ban");
    }
  };

  const handleDeleteRecord = async (record: TableRecord) => {
    try {
      let deleteQuery;

      if (selectedTable === "kv_config") {
        deleteQuery = supabase.from("kv_config").delete().eq("key", record.key);
      } else {
        deleteQuery = supabase.from(selectedTable).delete().eq("id", record.id);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      toast.success("Record deleted successfully");
      fetchRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Failed to delete record");
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from(selectedTable)
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row) =>
          Object.values(row).map((val) =>
            typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val
          ).join(",")
        );
        const csv = [headers, ...rows].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedTable}_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Data exported successfully");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const filteredRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedTableConfig = AVAILABLE_TABLES.find((t) =>
    t.key === selectedTable
  );

  const renderCreateForm = () => {
    if (selectedTable === "kv_config") {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="key">
              Key <span className="text-dc-brand">*</span>
            </Label>
            <Input
              id="key"
              value={kvConfigForm.key}
              onChange={(e) =>
                setKvConfigForm((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="feature_flag_name"
            />
          </div>
          <div>
            <Label htmlFor="value">Value (JSON)</Label>
            <Textarea
              id="value"
              value={kvConfigForm.value}
              onChange={(e) =>
                setKvConfigForm((prev) => ({ ...prev, value: e.target.value }))}
              placeholder='{"enabled": true}'
            />
          </div>
          <Button onClick={handleCreateKvConfig} disabled={!kvConfigForm.key}>
            Create Config
          </Button>
        </div>
      );
    }

    if (selectedTable === "abuse_bans") {
      return (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="telegram_id">
              Telegram ID <span className="text-dc-brand">*</span>
            </Label>
            <Input
              id="telegram_id"
              value={abuseBanForm.telegram_id}
              onChange={(e) =>
                setAbuseBanForm((prev) => ({
                  ...prev,
                  telegram_id: e.target.value,
                }))}
              placeholder="123456789"
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={abuseBanForm.reason}
              onChange={(e) =>
                setAbuseBanForm((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))}
              placeholder="Spam, abuse, etc."
            />
          </div>
          <div>
            <Label htmlFor="expires_at">Expires At</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={abuseBanForm.expires_at}
              onChange={(e) =>
                setAbuseBanForm((prev) => ({
                  ...prev,
                  expires_at: e.target.value,
                }))}
            />
          </div>
          <div>
            <Label htmlFor="created_by">Created By</Label>
            <Input
              id="created_by"
              value={abuseBanForm.created_by}
              onChange={(e) =>
                setAbuseBanForm((prev) => ({
                  ...prev,
                  created_by: e.target.value,
                }))}
              placeholder="Admin ID"
            />
          </div>
          <Button
            onClick={handleCreateAbuseBan}
            disabled={!abuseBanForm.telegram_id}
          >
            Create Ban
          </Button>
        </div>
      );
    }

    return (
      <div className="text-center text-muted-foreground py-8">
        Create functionality not yet implemented for this table.
        <br />
        Use the export function to view and manage data externally.
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Admin Data Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="table-select">Select Table</Label>
              <Select
                value={selectedTable}
                onValueChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value;
                  if (nextValue) {
                    setSelectedTable(nextValue as TableKey);
                  }
                }}
                options={tableOptions}
                placeholder="Select table"
                surfaceClassName="rounded-xl border border-border/60 bg-background"
                inputClassName="text-sm"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={fetchRecords}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setIsCreating(!isCreating)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? "Cancel" : "Create"}
              </Button>
            </div>
          </div>

          {selectedTableConfig && (
            <div className="mb-4">
              <Badge variant="secondary">
                {selectedTableConfig.icon} {selectedTableConfig.name}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTableConfig.description}
              </p>
              <p className="text-sm text-muted-foreground">
                Total records: {filteredRecords.length}
              </p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </div>

          {isCreating && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create New {selectedTableConfig?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderCreateForm()}
              </CardContent>
            </Card>
          )}

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredRecords.map((record, index) => (
                <Card key={record.id || record.key || index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {Object.entries(record).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {typeof value === "object" && value !== null
                                ? JSON.stringify(value).substring(0, 100) +
                                  "..."
                                : String(value || "—")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this record?",
                            )
                          ) {
                            handleDeleteRecord(record);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredRecords.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No records found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
