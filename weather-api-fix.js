/* SkyCast API compatibility fix: visibility is an hourly Open-Meteo variable. */
async function loadWeather(latitude, longitude, name, country) {
    showLoading(true);
    hideError();
    try {
        const params = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m",
            hourly: "visibility",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
            timezone: "auto",
            forecast_days: "7"
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error("Weather service is unavailable.");
        weatherData = await response.json();
        renderWeather(weatherData, name, country, latitude, longitude);
        const hourlyTimes = weatherData.hourly?.time || [];
        const hourlyVisibility = weatherData.hourly?.visibility || [];
        const currentTime = weatherData.current?.time;
        let index = hourlyTimes.indexOf(currentTime);
        if (index < 0 && hourlyTimes.length) {
            const target = new Date(currentTime).getTime();
            index = hourlyTimes.reduce((best, time, i) =>
                Math.abs(new Date(time).getTime() - target) <
                Math.abs(new Date(hourlyTimes[best]).getTime() - target) ? i : best, 0);
        }
        const meters = hourlyVisibility[index];
        visibility.textContent = Number.isFinite(meters) ? `${(meters / 1000).toFixed(1)} km` : "Unavailable";
        updateCelestialSystem();
    } catch (error) {
        console.error("SkyCast weather loading failed:", error);
        showError("Could not load weather data. Please try again.");
    } finally {
        showLoading(false);
    }
}
