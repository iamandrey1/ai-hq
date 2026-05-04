"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Forecast {
  id: string;
  project_id: string;
  month_num: number;
  month_label: string;
  expected_revenue: number;
  expected_costs: number;
  created_at: string;
}

export interface ForecastChartData {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

export function useProjectForecast(projectId: string | null) {
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setForecast([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchForecast = async () => {
      const { data, error } = await supabase
        .from("project_forecast")
        .select("*")
        .eq("project_id", projectId)
        .order("month_num", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setForecast(data || []);
      }
      setLoading(false);
    };

    fetchForecast();
  }, [projectId]);

  const chartData: ForecastChartData[] = forecast.map((f) => ({
    month: f.month_label || `M${f.month_num}`,
    revenue: f.expected_revenue,
    costs: f.expected_costs,
    profit: f.expected_revenue - f.expected_costs,
  }));

  const totalProfit = forecast.reduce((sum, f) => sum + (f.expected_revenue - f.expected_costs), 0);
  const totalRevenue = forecast.reduce((sum, f) => sum + f.expected_revenue, 0);

  return { forecast, loading, error, chartData, totalProfit, totalRevenue };
}