"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CustomTable {
  id: string;
  project_id: string;
  title: string;
  order_num: number;
  created_at: string;
  created_by: string | null;
}

export interface CustomColumn {
  id: string;
  table_id: string;
  name: string;
  type: "text" | "number" | "date" | "checkbox" | "select" | "url";
  options: { choices?: string[] } | null;
  order_num: number;
  created_at: string;
}

export interface CustomRow {
  id: string;
  table_id: string;
  data: Record<string, unknown>;
  order_num: number;
  created_at: string;
  created_by: string | null;
}

export function useCustomTables(projectId: string | null) {
  const [tables, setTables] = useState<CustomTable[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setTables([]); setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_tables")
      .select("*")
      .eq("project_id", projectId)
      .order("order_num", { ascending: true });
    if (data) setTables(data as CustomTable[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`custom-tables-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_tables", filter: projectId ? `project_id=eq.${projectId}` : undefined }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, load]);

  const createTable = useCallback(async (title: string) => {
    if (!projectId) return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const maxOrder = tables.reduce((m, t) => Math.max(m, t.order_num), -1);
    const { data, error } = await supabase
      .from("custom_tables")
      .insert({ project_id: projectId, title, order_num: maxOrder + 1, created_by: user?.id || null })
      .select().single();
    if (error) return null;
    return data as CustomTable;
  }, [projectId, tables]);

  const deleteTable = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("custom_tables").delete().eq("id", id);
    return !error;
  }, []);

  return { tables, loading, createTable, deleteTable };
}

export function useCustomTableData(tableId: string | null) {
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [rows, setRows] = useState<CustomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tableId) { setColumns([]); setRows([]); setLoading(false); return; }
    const supabase = createClient();
    const [colsRes, rowsRes] = await Promise.all([
      supabase.from("custom_columns").select("*").eq("table_id", tableId).order("order_num", { ascending: true }),
      supabase.from("custom_rows").select("*").eq("table_id", tableId).order("order_num", { ascending: true }),
    ]);
    if (colsRes.data) setColumns(colsRes.data as CustomColumn[]);
    if (rowsRes.data) setRows(rowsRes.data as CustomRow[]);
    setLoading(false);
  }, [tableId]);

  useEffect(() => {
    load();
    if (!tableId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`custom-data-${tableId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_columns", filter: `table_id=eq.${tableId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_rows",   filter: `table_id=eq.${tableId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableId, load]);

  const addColumn = useCallback(async (name: string, type: CustomColumn["type"]) => {
    if (!tableId) return null;
    const supabase = createClient();
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.order_num), -1);
    const { data, error } = await supabase
      .from("custom_columns")
      .insert({ table_id: tableId, name, type, order_num: maxOrder + 1 })
      .select().single();
    return error ? null : data as CustomColumn;
  }, [tableId, columns]);

  const deleteColumn = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("custom_columns").delete().eq("id", id);
    setRows(prev => prev.map(row => {
      const d = { ...row.data };
      delete d[id];
      return { ...row, data: d };
    }));
  }, []);

  const addRow = useCallback(async () => {
    if (!tableId) return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order_num), -1);
    const { data, error } = await supabase
      .from("custom_rows")
      .insert({ table_id: tableId, data: {}, order_num: maxOrder + 1, created_by: user?.id || null })
      .select().single();
    return error ? null : data as CustomRow;
  }, [tableId, rows]);

  const updateCell = useCallback(async (rowId: string, colId: string, value: unknown) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const newData = { ...row.data, [colId]: value };
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    const supabase = createClient();
    await supabase.from("custom_rows").update({ data: newData }).eq("id", rowId);
  }, [rows]);

  const deleteRow = useCallback(async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    const supabase = createClient();
    await supabase.from("custom_rows").delete().eq("id", id);
  }, []);

  return { columns, rows, loading, addColumn, deleteColumn, addRow, updateCell, deleteRow };
}
