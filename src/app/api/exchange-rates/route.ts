import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const EXCHANGE_RATES_API_KEY = process.env.EXCHANGE_RATES_API_KEY;
const EXCHANGE_RATES_API_URL = "http://api.exchangeratesapi.io/v1/latest";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const needsUpdate = (lastUpdated: string) => {
  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 24;
};

async function fetchExchangeRates(baseCurrency: string) {
  if (!EXCHANGE_RATES_API_KEY) {
    throw new Error("EXCHANGE_RATES_API_KEY is not configured");
  }

  const response = await fetch(
    `${EXCHANGE_RATES_API_URL}?access_key=${EXCHANGE_RATES_API_KEY}&base=${baseCurrency}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`API Error: ${data.error?.info || "Unknown error"}`);
  }

  return data.rates;
}

async function updateRates(
  baseCurrency: string,
  rates: Record<string, number>
) {
  const now = new Date().toISOString();

  const upsertData = Object.entries(rates).map(([currency, rate]) => ({
    base_currency: baseCurrency,
    target_currency: currency,
    rate: rate,
    last_updated: now,
  }));

  const { error } = await supabaseAdmin
    .from("exchange_rates")
    .upsert(upsertData, {
      onConflict: "base_currency,target_currency",
    });

  if (error) throw error;
}

export async function GET(req: Request) {
  if (!EXCHANGE_RATES_API_KEY) {
    return NextResponse.json(
      { error: "ExchangeRatesAPI is not configured" },
      { status: 500 }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });
  const url = new URL(req.url);
  const baseCurrency = url.searchParams.get("base") || "EUR";

  try {
    const { data: currentRates, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", baseCurrency);

    if (error) throw error;

    const shouldUpdate =
      !currentRates?.length ||
      (currentRates[0]?.last_updated &&
        needsUpdate(currentRates[0].last_updated));

    if (shouldUpdate) {
      console.log(`Fetching new rates for ${baseCurrency}`);

      const newRates = await fetchExchangeRates(baseCurrency);

      await updateRates(baseCurrency, newRates);

      const { data: updatedRates, error: fetchError } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("base_currency", baseCurrency);

      if (fetchError) throw fetchError;

      return NextResponse.json(updatedRates);
    }

    return NextResponse.json(currentRates);
  } catch (error: any) {
    console.error("Error handling exchange rates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!EXCHANGE_RATES_API_KEY) {
    return NextResponse.json(
      { error: "ExchangeRatesAPI is not configured" },
      { status: 500 }
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    const { baseCurrency } = await req.json();

    if (!baseCurrency) {
      return NextResponse.json(
        { error: "Base currency is required" },
        { status: 400 }
      );
    }

    console.log(`Force updating rates for ${baseCurrency}`);

    const newRates = await fetchExchangeRates(baseCurrency);

    await updateRates(baseCurrency, newRates);

    const { data: updatedRates, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("base_currency", baseCurrency);

    if (error) throw error;

    return NextResponse.json(updatedRates);
  } catch (error: any) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
