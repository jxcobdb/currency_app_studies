import { NextResponse } from "next/server";

const API_KEY = process.env.EXCHANGE_RATES_API_KEY;
const BASE_URL = "http://api.exchangeratesapi.io/v1";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get("currency");

    if (!currency) {
      return NextResponse.json(
        { error: "Currency parameter is required" },
        { status: 400 }
      );
    }

    // Get dates for the last 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    // Fetch historical data for each date
    const historicalData = await Promise.all(
      dates.map(async (date) => {
        const response = await fetch(
          `${BASE_URL}/${date}?access_key=${API_KEY}&base=EUR&symbols=${currency}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${date}`);
        }

        const data = await response.json();
        return {
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          rate: data.rates[currency] || null,
        };
      })
    );

    return NextResponse.json(historicalData);
  } catch (error) {
    console.error("Error fetching historical rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical rates" },
      { status: 500 }
    );
  }
}
