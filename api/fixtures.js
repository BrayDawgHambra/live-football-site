const API_BASE = "https://v3.football.api-sports.io";

function dateInChicago(addDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + addDays);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find(part => part.type === "year").value;
  const month = parts.find(part => part.type === "month").value;
  const day = parts.find(part => part.type === "day").value;

  return `${year}-${month}-${day}`;
}

async function apiRequest(path, apiKey) {
  const apiResponse = await fetch(`${API_BASE}${path}`, {
    headers: {
      "x-apisports-key": apiKey
    }
  });

  const data = await apiResponse.json();

  if (
    !apiResponse.ok ||
    (data.errors && Object.keys(data.errors).length > 0)
  ) {
    throw new Error(
      JSON.stringify(data.errors || `API error ${apiResponse.status}`)
    );
  }

  return data.response || [];
}

export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return response.status(500).json({
      error: "API_FOOTBALL_KEY is missing in Vercel."
    });
  }

  const days = 1;

  try {
    const dates = [];

    dates.push(dateInChicago(0));
dates.push(dateInChicago(1));
    
    const livePromise = apiRequest(
      "/fixtures?live=all&timezone=America%2FChicago",
      apiKey
    );

    const upcomingPromises = dates.map(date =>
      apiRequest(
        `/fixtures?date=${date}&timezone=America%2FChicago`,
        apiKey
      )
    );

    const [live, upcomingDays] = await Promise.all([
      livePromise,
      Promise.all(upcomingPromises)
    ]);

    const liveIds = new Set(
      live.map(match => match.fixture.id)
    );

    const upcoming = upcomingDays
      .flat()
      .filter(match => !liveIds.has(match.fixture.id))
      .filter(match =>
        ["NS", "TBD"].includes(match.fixture.status.short)
      )
      .sort(
        (a, b) =>
          new Date(a.fixture.date) -
          new Date(b.fixture.date)
      );

    response.setHeader(
      "Cache-Control",
      "s-maxage=60, stale-while-revalidate=120"
    );

    return response.status(200).json({
      live,
      upcoming,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);

    return response.status(502).json({
      error: "Could not retrieve football matches.",
      details: error.message
    });
  }
}
