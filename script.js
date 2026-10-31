/* =====================================================
   SKYCAST WEATHER APP
   Dynamic:
   - Weather
   - Sunrise
   - Sunset
   - Current time
   - Sun position
   - Moon position
   - Day/night background
===================================================== */


/* =====================================================
   API
===================================================== */

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";


/* =====================================================
   DOM ELEMENTS
===================================================== */

const sun =
    document.getElementById("sun");

const moon =
    document.getElementById("moon");

const sunProgress =
    document.getElementById("sunProgress");

const currentTimeMarker =
    document.getElementById("currentTimeMarker");

const currentTimeLabel =
    document.getElementById("currentTimeLabel");

const sunPositionText =
    document.getElementById("sunPositionText");

const skyStatusIcon =
    document.getElementById("skyStatusIcon");

const skyStatusLabel =
    document.getElementById("skyStatusLabel");

const skyStatusText =
    document.getElementById("skyStatusText");

const clock =
    document.getElementById("clock");

const searchForm =
    document.getElementById("searchForm");

const cityInput =
    document.getElementById("cityInput");

const locationBtn =
    document.getElementById("locationBtn");

const loading =
    document.getElementById("loading");

const weatherContent =
    document.getElementById("weatherContent");

const errorMessage =
    document.getElementById("errorMessage");

const errorText =
    document.getElementById("errorText");

const cityName =
    document.getElementById("cityName");

const currentDate =
    document.getElementById("currentDate");

const weatherIcon =
    document.getElementById("weatherIcon");

const weatherDescription =
    document.getElementById("weatherDescription");

const temperature =
    document.getElementById("temperature");

const temperatureUnit =
    document.getElementById("temperatureUnit");

const feelsLike =
    document.getElementById("feelsLike");

const humidity =
    document.getElementById("humidity");

const wind =
    document.getElementById("wind");

const pressure =
    document.getElementById("pressure");

const visibility =
    document.getElementById("visibility");

const sunrise =
    document.getElementById("sunrise");

const sunset =
    document.getElementById("sunset");

const sunriseLabel =
    document.getElementById("sunriseLabel");

const sunsetLabel =
    document.getElementById("sunsetLabel");

const forecastGrid =
    document.getElementById("forecastGrid");

const coordinates =
    document.getElementById("coordinates");

const unitToggle =
    document.getElementById("unitToggle");


/* =====================================================
   STATE
===================================================== */

let weatherData = null;

let useCelsius = true;

let selectedLocation = {

    latitude: 22.5726,

    longitude: 88.3639,

    name: "Kolkata",

    country: "India"

};


/* =====================================================
   WEATHER CODES
===================================================== */

const weatherCodes = {

    0: ["Clear sky", "fa-sun"],

    1: ["Mainly clear", "fa-sun"],

    2: ["Partly cloudy", "fa-cloud-sun"],

    3: ["Overcast", "fa-cloud"],

    45: ["Fog", "fa-smog"],

    48: ["Rime fog", "fa-smog"],

    51: ["Light drizzle", "fa-cloud-rain"],

    53: ["Drizzle", "fa-cloud-rain"],

    55: ["Heavy drizzle", "fa-cloud-rain"],

    61: ["Light rain", "fa-cloud-rain"],

    63: ["Rain", "fa-cloud-showers-heavy"],

    65: ["Heavy rain", "fa-cloud-showers-heavy"],

    71: ["Light snow", "fa-snowflake"],

    73: ["Snow", "fa-snowflake"],

    75: ["Heavy snow", "fa-snowflake"],

    80: ["Rain showers", "fa-cloud-rain"],

    81: ["Heavy showers", "fa-cloud-showers-heavy"],

    82: ["Violent showers", "fa-cloud-showers-heavy"],

    95: ["Thunderstorm", "fa-cloud-bolt"],

    96: ["Thunderstorm", "fa-cloud-bolt"],

    99: ["Thunderstorm", "fa-cloud-bolt"]

};


/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateClock();

        setInterval(
            updateClock,
            1000
        );


        loadWeather(

            selectedLocation.latitude,

            selectedLocation.longitude,

            selectedLocation.name,

            selectedLocation.country

        );

    }
);


/* =====================================================
   CLOCK
===================================================== */

function updateClock() {

    if (!weatherData) {

        clock.textContent =
            new Date().toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

        return;
    }


    const timeZone =
        weatherData.timezone ||
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    const localTime =
        new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone,

                hour: "2-digit",

                minute: "2-digit",

                second: "2-digit",

                hour12: true
            }
        ).format(
            new Date()
        );


    clock.textContent =
        localTime;


    updateCelestialSystem();

}


/* =====================================================
   SEARCH
===================================================== */

searchForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const city =
            cityInput.value.trim();


        if (!city) {

            showError(
                "Please enter a city name."
            );

            return;
        }


        await searchCity(city);

    }
);


/* =====================================================
   SEARCH CITY
===================================================== */

async function searchCity(city) {

    showLoading(true);

    hideError();


    try {

        const response =
            await fetch(

                `${GEOCODING_API}` +

                `?name=${encodeURIComponent(city)}` +

                `&count=1` +

                `&language=en` +

                `&format=json`

            );


        if (!response.ok) {

            throw new Error(
                "Could not search this city."
            );

        }


        const data =
            await response.json();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            throw new Error(
                `No city found for "${city}".`
            );

        }


        const result =
            data.results[0];


        selectedLocation = {

            latitude:
                result.latitude,

            longitude:
                result.longitude,

            name:
                result.name,

            country:
                result.country

        };


        await loadWeather(

            result.latitude,

            result.longitude,

            result.name,

            result.country

        );

    }


    catch (error) {

        console.error(error);

        showError(
            error.message
        );

    }


    finally {

        showLoading(false);

    }

}


/* =====================================================
   LOAD WEATHER
===================================================== */

async function loadWeather(
    latitude,
    longitude,
    name,
    country
) {

    showLoading(true);

    hideError();


    try {

        // Visibility is an hourly Open-Meteo variable, not a current variable.
        const params = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m",
            hourly: "visibility",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
            timezone: "auto",
            forecast_days: "7"
        });
        const url = `${WEATHER_API}?${params.toString()}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Weather service is unavailable."
            );

        }


        const result = await response.json();
        if (!result.current || !result.hourly || !result.daily) {
            throw new Error("Weather service returned incomplete data.");
        }
        weatherData = result;

        renderWeather(

            weatherData,

            name,

            country,

            latitude,

            longitude

        );


        updateCelestialSystem();

    }


    catch (error) {

        console.error(error);

        showError(
            "Could not load weather data."
        );

    }


    finally {

        showLoading(false);

    }

}


/* =====================================================
   RENDER WEATHER
===================================================== */

function renderWeather(
    data,
    name,
    country,
    latitude,
    longitude
) {

    cityName.textContent =
        country
            ? `${name}, ${country}`
            : name;


    coordinates.textContent =

        `${Number(latitude).toFixed(2)}°, ` +

        `${Number(longitude).toFixed(2)}°`;


    renderCurrentWeather(data);

    renderSunTimes(data);

    renderForecast(data);

}


/* =====================================================
   CURRENT WEATHER
===================================================== */

function renderCurrentWeather(data) {

    const current =
        data.current;


    const weather =
        weatherCodes[
            current.weather_code
        ] ||
        [
            "Unknown",
            "fa-cloud"
        ];


    const temp =
        convertTemperature(
            current.temperature_2m
        );


    temperature.textContent =
        Math.round(temp);


    temperatureUnit.textContent =
        useCelsius
            ? "C"
            : "F";


    feelsLike.textContent =

        `${Math.round(

            convertTemperature(

                current.apparent_temperature

            )

        )}°${

            useCelsius
                ? "C"
                : "F"

        }`;


    humidity.textContent =
        `${current.relative_humidity_2m}%`;


    wind.textContent =
        `${Math.round(
            current.wind_speed_10m
        )} km/h`;


    pressure.textContent =
        `${Math.round(
            current.pressure_msl
        )} hPa`;


    const hourlyTimes = data.hourly?.time || [];
    const hourlyVisibility = data.hourly?.visibility || [];
    let visibilityIndex = hourlyTimes.indexOf(current.time);
    if (visibilityIndex < 0 && hourlyTimes.length) {
        const targetTime = new Date(current.time).getTime();
        visibilityIndex = hourlyTimes.reduce((bestIndex, time, index) => {
            const bestTime = new Date(hourlyTimes[bestIndex]).getTime();
            return Math.abs(new Date(time).getTime() - targetTime) <
                Math.abs(bestTime - targetTime) ? index : bestIndex;
        }, 0);
    }
    const visibilityMeters = hourlyVisibility[visibilityIndex];
    visibility.textContent = Number.isFinite(visibilityMeters)
        ? `${(visibilityMeters / 1000).toFixed(1)} km`
        : "N/A";


    weatherIcon.className =
        `fa-solid ${weather[1]}`;


    weatherDescription.textContent =
        weather[0];


    currentDate.textContent =

        new Intl.DateTimeFormat(
            "en-IN",
            {

                timeZone:
                    data.timezone,

                weekday:
                    "long",

                month:
                    "long",

                day:
                    "numeric"

            }
        ).format(
            new Date()
        );

}


/* =====================================================
   SUN TIMES
===================================================== */

function renderSunTimes(data) {

    const sunriseTime =
        data.daily.sunrise[0];


    const sunsetTime =
        data.daily.sunset[0];


    sunrise.textContent =
        formatTime(
            sunriseTime
        );


    sunset.textContent =
        formatTime(
            sunsetTime
        );


    sunriseLabel.textContent =
        formatTime(
            sunriseTime
        );


    sunsetLabel.textContent =
        formatTime(
            sunsetTime
        );

}


/* =====================================================
   MAIN SUN / MOON SYSTEM
===================================================== */

function updateCelestialSystem() {

    if (!weatherData) {
        return;
    }


    const sunriseString =
        weatherData.daily.sunrise[0];


    const sunsetString =
        weatherData.daily.sunset[0];


    const sunriseMinutes =
        getMinutesFromISO(
            sunriseString
        );


    const sunsetMinutes =
        getMinutesFromISO(
            sunsetString
        );


    const timeZone =
        weatherData.timezone ||
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    const now =
        new Date();


    const timeParts =
        new Intl.DateTimeFormat(
            "en-GB",
            {

                timeZone,

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    false

            }
        ).formatToParts(now);


    let hour =
        Number(
            timeParts.find(
                item =>
                    item.type === "hour"
            ).value
        );


    const minute =
        Number(
            timeParts.find(
                item =>
                    item.type === "minute"
            ).value
        );


    const second =
        Number(
            timeParts.find(
                item =>
                    item.type === "second"
            ).value
        );


    /*
        Some browsers can return
        24 for midnight.
    */

    if (hour === 24) {
        hour = 0;
    }


    const currentMinutes =

        hour * 60 +

        minute +

        second / 60;


    /* =====================================
       DAY
    ====================================== */

    if (

        currentMinutes >=
            sunriseMinutes &&

        currentMinutes <=
            sunsetMinutes

    ) {

        const dayProgress =

            (
                currentMinutes -
                sunriseMinutes
            )
            /
            (
                sunsetMinutes -
                sunriseMinutes
            );


        showSun();

        hideMoon();


        moveSun(
            dayProgress
        );


        updateDayTheme(
            dayProgress
        );


        updateCurrentTimeMarker(
            dayProgress,
            currentMinutes
        );


        sunProgress.style.width =
            `${dayProgress * 100}%`;


        return;
    }


    /* =====================================
       NIGHT
    ====================================== */

    hideSun();

    showMoon();


    let nightProgress;


    if (
        currentMinutes >
        sunsetMinutes
    ) {

        const nightLength =

            1440 -
            sunsetMinutes +
            sunriseMinutes;


        const afterSunset =

            currentMinutes -
            sunsetMinutes;


        nightProgress =

            afterSunset /
            nightLength;

    }

    else {

        const nightLength =

            1440 -
            sunsetMinutes +
            sunriseMinutes;


        nightProgress =

            (
                1440 -
                sunsetMinutes +
                currentMinutes
            )
            /
            nightLength;

    }


    nightProgress =

        Math.max(
            0,
            Math.min(
                1,
                nightProgress
            )
        );


    moveMoon(
        nightProgress
    );


    updateNightTheme();


    /*
        Keep current-time marker
        at the nearest end of the
        daylight bar during night.
    */

    const markerPosition =

        currentMinutes <
        sunriseMinutes

            ? 0

            : 100;


    updateCurrentTimeMarker(

        markerPosition / 100,

        currentMinutes,

        true

    );


    sunProgress.style.width =
        currentMinutes < sunriseMinutes
            ? "0%"
            : "100%";

}


/* =====================================================
   MOVE SUN
===================================================== */

function moveSun(progress) {

    /*
        X:
        Sunrise = 7%
        Sunset = 93%
    */

    const x =

        7 +
        progress * 86;


    /*
        Arc:
        Horizon → top → horizon
    */

    const arc =

        Math.sin(
            progress * Math.PI
        );


    const y =

        67 -
        arc * 53;


    sun.style.left =
        `${x}%`;


    sun.style.top =
        `${y}%`;

}


/* =====================================================
   MOVE MOON
===================================================== */

function moveMoon(progress) {

    const x =

        7 +
        progress * 86;


    const arc =

        Math.sin(
            progress * Math.PI
        );


    const y =

        67 -
        arc * 48;


    moon.style.left =
        `${x}%`;


    moon.style.top =
        `${y}%`;

}


/* =====================================================
   CURRENT TIME MARKER
===================================================== */

function updateCurrentTimeMarker(

    progress,

    currentMinutes,

    night = false

) {

    let percentage =
        progress * 100;


    percentage =

        Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        );


    currentTimeMarker.style.left =
        `${percentage}%`;


    currentTimeLabel.textContent =
        formatMinutes(
            currentMinutes
        );


    if (night) {

        currentTimeLabel.style.borderColor =
            "rgba(160,180,255,0.6)";

    }

    else {

        currentTimeLabel.style.borderColor =
            "rgba(255,200,100,0.65)";

    }

}


/* =====================================================
   DAY THEME
===================================================== */

function updateDayTheme(progress) {

    document.body.classList.remove(
        "day",
        "morning",
        "sunset",
        "night"
    );


    /*
        Sunrise → Morning
    */

    if (progress < 0.14) {

        document.body.classList.add(
            "morning"
        );


        skyStatusIcon.className =
            "fa-solid fa-sun";


        skyStatusLabel.textContent =
            "Sunrise";


        skyStatusText.textContent =
            "The sun is rising";

    }


    /*
        Sunset
    */

    else if (progress > 0.86) {

        document.body.classList.add(
            "sunset"
        );


        skyStatusIcon.className =
            "fa-solid fa-sun";


        skyStatusLabel.textContent =
            "Sunset";


        skyStatusText.textContent =
            "The sun is setting";

    }


    /*
        Normal daytime
    */

    else {

        document.body.classList.add(
            "day"
        );


        skyStatusIcon.className =
            "fa-solid fa-sun";


        skyStatusLabel.textContent =
            "Daylight";


        skyStatusText.textContent =
            "Sun is above the horizon";

    }


    sunPositionText.textContent =

        `${Math.round(
            progress * 100
        )}%`;

}


/* =====================================================
   NIGHT THEME
===================================================== */

function updateNightTheme() {

    document.body.classList.remove(
        "day",
        "morning",
        "sunset"
    );


    document.body.classList.add(
        "night"
    );


    skyStatusIcon.className =
        "fa-solid fa-moon";


    skyStatusLabel.textContent =
        "Night";


    skyStatusText.textContent =
        "The moon is above the horizon";


    sunPositionText.textContent =
        "Night";

}


/* =====================================================
   SHOW / HIDE SUN
===================================================== */

function showSun() {

    sun.style.opacity =
        "1";

}


function hideSun() {

    sun.style.opacity =
        "0";

}


/* =====================================================
   SHOW / HIDE MOON
===================================================== */

function showMoon() {

    moon.style.opacity =
        "1";

}


function hideMoon() {

    moon.style.opacity =
        "0";

}


/* =====================================================
   FORECAST
===================================================== */

function renderForecast(data) {

    forecastGrid.innerHTML = "";


    const daily =
        data.daily;


    for (
        let i = 0;
        i < daily.time.length;
        i++
    ) {

        const weather =

            weatherCodes[
                daily.weather_code[i]
            ] ||

            [
                "Unknown",
                "fa-cloud"
            ];


        const max =

            Math.round(

                convertTemperature(

                    daily.temperature_2m_max[i]

                )

            );


        const min =

            Math.round(

                convertTemperature(

                    daily.temperature_2m_min[i]

                )

            );


        const date =

            new Date(
                `${daily.time[i]}T12:00:00`
            );


        const card =
            document.createElement("div");


        card.className =

            `forecast-card ${
                i === 0
                    ? "today"
                    : ""
            }`;


        card.innerHTML = `

            <div class="forecast-day">

                ${
                    i === 0
                        ? "TODAY"
                        : getDayName(date)
                }

            </div>


            <div class="forecast-icon">

                <i
                    class="fa-solid ${weather[1]}"
                ></i>

            </div>


            <div class="forecast-condition">

                ${weather[0]}

            </div>


            <div class="forecast-temp">

                <strong>
                    ${max}°
                </strong>

                <span>
                    ${min}°
                </span>

            </div>

        `;


        forecastGrid.appendChild(
            card
        );

    }

}


/* =====================================================
   TEMPERATURE UNIT
===================================================== */

unitToggle.addEventListener(
    "click",
    () => {

        useCelsius =
            !useCelsius;


        unitToggle.textContent =

            useCelsius
                ? "°C"
                : "°F";


        if (weatherData) {

            renderCurrentWeather(
                weatherData
            );


            renderForecast(
                weatherData
            );

        }

    }
);


/* =====================================================
   MY LOCATION
===================================================== */

locationBtn.addEventListener(
    "click",
    () => {

        if (
            !navigator.geolocation
        ) {

            showError(
                "Geolocation is not supported."
            );

            return;
        }


        showLoading(true);

        hideError();


        navigator.geolocation.getCurrentPosition(

            async position => {

                const latitude =
                    position.coords.latitude;


                const longitude =
                    position.coords.longitude;


                selectedLocation = {

                    latitude,

                    longitude,

                    name:
                        "My Location",

                    country:
                        ""

                };


                await loadWeather(

                    latitude,

                    longitude,

                    "My Location",

                    ""

                );

            },


            () => {

                showError(
                    "Location permission was denied."
                );


                showLoading(false);

            }

        );

    }
);


/* =====================================================
   HELPERS
===================================================== */


/*
    Convert ISO time into minutes.
*/

function getMinutesFromISO(value) {

    const time =
        value.split("T")[1];


    const parts =
        time.split(":");


    return (

        Number(parts[0]) * 60 +

        Number(parts[1])

    );

}


/*
    Format minutes:
    05:30 → 05:30 AM
*/

function formatMinutes(
    totalMinutes
) {

    let hours =
        Math.floor(
            totalMinutes / 60
        );


    const minutes =
        Math.floor(
            totalMinutes % 60
        );


    const suffix =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 || 12;


    return (

        `${String(hours).padStart(2, "0")}:` +

        `${String(minutes).padStart(2, "0")} ` +

        suffix

    );

}


/*
    Format Open-Meteo time.
*/

function formatTime(value) {

    return formatMinutes(

        getMinutesFromISO(
            value
        )

    );

}


/*
    Day name.
*/

function getDayName(date) {

    return date.toLocaleDateString(

        "en-IN",

        {
            weekday:
                "short"
        }

    ).toUpperCase();

}


/*
    Temperature conversion.
*/

function convertTemperature(
    celsius
) {

    if (useCelsius) {

        return celsius;

    }


    return (

        celsius * 9 / 5

    ) + 32;

}


/* =====================================================
   LOADING
===================================================== */

function showLoading(show) {
    if (show) {
        loading.classList.remove("hidden");
        weatherContent.classList.add("hidden");
    } else {
        loading.classList.add("hidden");
        // Keep placeholders hidden if the first weather request fails.
        weatherContent.classList.toggle("hidden", !weatherData);
    }
}


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    errorText.textContent =
        message;


    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorMessage.classList.add(
        "hidden"
    );

}