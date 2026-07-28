const API_BASE = "https://v3.football.api-sports.io";

function dateInChicago(addDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + addDays);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function apiRequest(path, apiKey) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "x-apisports-key": apiKey
    }
  });

  const data = await response.json();

  if (
    !response.ok ||
    (data.errors && Object.keys(data.errors).length > 0)
  ) {
    throw new Error(
      JSON.stringify(data.errors || `API error ${response.status}`)
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

  const requestedDays = Number(request.query.days || 3);
  const days = [1, 3, 7].includes(requestedDays)
    ? requestedDays
    : 3;

  try {
    const from = dateInChicago(0);
    const to = dateInChicago(days);

    const [live, upcomingRaw] = await Promise.all([
      apiRequest(
        "/fixtures?live=all&timezone=America%2FChicago",
        apiKey
      ),
      apiRequest(
        `/fixtures?from=${from}&to=${to}&timezone=America%2FChicago`,
        apiKey
      )
    ]);

    const liveIds = new Set(
      live.map(match => match.fixture.id)
    );

    const upcoming = upcomingRaw
      .filter(match => !liveIds.has(match.fixture.id))
      .filter(match =>
        ["NS", "TBD"].includes(match.fixture.status.short)
      )
      .sort(
        (a, b) =>
          new Date(a.fixture.date) -
          new Date(b.fixture.date)
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
