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
    headers: { "x-apisports-key": apiKey }
  });

  const data = await response.json();

  if (!response.ok || data.errors?.length || (data.errors && Object.keys(data.errors).length)) {
    throw new Error(
      typeof data.errors === "string"
        ? data.errors
        : JSON.stringify(data.errors || `API request failed (${response.status})`)
    );
  }

  return data.response || [];
}

exports.handler = async function(event) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing API_FOOTBALL_KEY in Netlify environment variables."
      })
    };
  }

  const requestedDays = Number(event.queryStringParameters?.days || 3);
  const days = [1, 3, 7].includes(requestedDays) ? requestedDays : 3;

  try {
    const from = dateInChicago(0);
    const to = dateInChicago(days);

    const [live, upcomingRaw] = await Promise.all([
      apiRequest("/fixtures?live=all&timezone=America%2FChicago", apiKey),
      apiRequest(`/fixtures?from=${from}&to=${to}&timezone=America%2FChicago`, apiKey)
    ]);

    const liveIds = new Set(live.map(match => match.fixture.id));
    const upcoming = upcomingRaw
      .filter(match => !liveIds.has(match.fixture.id))
      .filter(match => ["NS", "TBD"].includes(match.fixture.status.short))
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30"
      },
      body: JSON.stringify({
        live,
        upcoming,
        updatedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "API-Football could not be reached. Check your key and plan limits.",
        details: error.message
      })
    };
  }
};
