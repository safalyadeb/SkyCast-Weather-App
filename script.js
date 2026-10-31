/* SkyCast Weather App — complete, repaired application logic */
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

const $ = id => document.getElementById(id);
const el = {
  sun:$("sun"), moon:$("moon"), sunProgress:$("sunProgress"),
  marker:$("currentTimeMarker"), markerLabel:$("currentTimeLabel"),
  sunPosition:$("sunPositionText"), skyStatusIcon:$("skyStatusIcon"),
  skyStatusLabel:$("skyStatusLabel"), skyStatusText:$("skyStatusText"),
  clock:$("clock"), searchForm:$("searchForm"), cityInput:$("cityInput"),
  locationBtn:$("locationBtn"), loading:$("loading"), weatherContent:$("weatherContent"),
  error:$("errorMessage"), errorText:$("errorText"), city:$("cityName"),
  date:$("currentDate"), weatherIcon:$("weatherIcon"), description:$("weatherDescription"),
  temperature:$("temperature"), unit:$("temperatureUnit"), feels:$("feelsLike"),
  humidity:$("humidity"), wind:$("wind"), pressure:$("pressure"), visibility:$("visibility"),
  sunrise:$("sunrise"), sunset:$("sunset"), sunriseLabel:$("sunriseLabel"),
  sunsetLabel:$("sunsetLabel"), forecast:$("forecastGrid"), coordinates:$("coordinates"),
  unitToggle:$("unitToggle")
};

let weatherData = null;
let useCelsius = true;
let selectedLocation = { latitude:22.5726, longitude:88.3639, name:"Kolkata", country:"India" };
let requestNumber = 0;

const weatherCodes = {
  0:["Clear sky","fa-sun"],1:["Mainly clear","fa-sun"],2:["Partly cloudy","fa-cloud-sun"],
  3:["Overcast","fa-cloud"],45:["Fog","fa-smog"],48:["Rime fog","fa-smog"],
  51:["Light drizzle","fa-cloud-rain"],53:["Drizzle","fa-cloud-rain"],55:["Heavy drizzle","fa-cloud-rain"],
  61:["Light rain","fa-cloud-rain"],63:["Rain","fa-cloud-rain"],65:["Heavy rain","fa-cloud-showers-heavy"],
  71:["Light snow","fa-snowflake"],73:["Snow","fa-snowflake"],75:["Heavy snow","fa-snowflake"],
  80:["Rain showers","fa-cloud-rain"],81:["Heavy showers","fa-cloud-showers-heavy"],
  82:["Violent showers","fa-cloud-showers-heavy"],95:["Thunderstorm","fa-cloud-bolt"],
  96:["Thunderstorm","fa-cloud-bolt"],99:["Thunderstorm","fa-cloud-bolt"]
};

function showLoading(active) {
  if (el.loading) el.loading.style.display = active ? "flex" : "none";
}
function showError(message) {
  if (el.errorText) el.errorText.textContent = message;
  if (el.error) el.error.style.display = "flex";
}
function hideError() {
  if (el.error) el.error.style.display = "none";
}
function formatClock(value) {
  return new Date(value).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
}
function convertTemperature(value) {
  return useCelsius ? value : (value * 9/5) + 32;
}
function formatTemperature(value) {
  return Math.round(convertTemperature(value)) + "°" + (useCelsius ? "C" : "F");
}
function weatherFor(code) {
  return weatherCodes[code] || ["Weather conditions","fa-cloud"];
}

async function loadWeather(latitude, longitude, name, country) {
  const thisRequest = ++requestNumber;
  showLoading(true);
  hideError();
  try {
    const params = new URLSearchParams({
      latitude:String(latitude), longitude:String(longitude),
      current:"temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m",
      hourly:"visibility",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      timezone:"auto", forecast_days:"7"
    });
    const response = await fetch(WEATHER_API + "?" + params.toString());
    if (!response.ok) {
      const detail = await response.json().catch(()=>({}));
      throw new Error(detail.reason || "Weather service returned an error (" + response.status + ").");
    }
    const data = await response.json();
    if (thisRequest !== requestNumber) return;
    if (!data.current || !data.daily || !data.hourly) throw new Error("Weather data is incomplete. Please try again.");
    weatherData = data;
    selectedLocation = {latitude,longitude,name,country};
    renderWeather(data,name,country,latitude,longitude);
    updateClock();
    updateCelestialSystem();
  } catch (error) {
    if (thisRequest === requestNumber) {
      console.error("SkyCast:",error);
      showError(error.message || "Could not load weather data. Check your connection and try again.");
    }
  } finally {
    if (thisRequest === requestNumber) showLoading(false);
  }
}

function renderWeather(data,name,country,latitude,longitude) {
  el.city.textContent = country ? name + ", " + country : name;
  el.coordinates.textContent = Number(latitude).toFixed(2) + "°, " + Number(longitude).toFixed(2) + "°";
  renderCurrentWeather(data);
  renderSunTimes(data);
  renderForecast(data);
  if (el.weatherContent) el.weatherContent.style.display = "block";
}

function renderCurrentWeather(data) {
  const current = data.current;
  const condition = weatherFor(current.weather_code);
  el.temperature.textContent = Math.round(convertTemperature(current.temperature_2m));
  el.unit.textContent = useCelsius ? "C" : "F";
  el.feels.textContent = formatTemperature(current.apparent_temperature);
  el.humidity.textContent = current.relative_humidity_2m + "%";
  el.wind.textContent = Math.round(current.wind_speed_10m) + " km/h";
  el.pressure.textContent = Math.round(current.pressure_msl) + " hPa";
  const hourlyTimes = data.hourly.time || [];
  const currentTime = current.time;
  let closest = hourlyTimes.indexOf(currentTime);
  if (closest < 0 && hourlyTimes.length) {
    const target = new Date(currentTime).getTime();
    closest = hourlyTimes.reduce((best,time,index) =>
      Math.abs(new Date(time).getTime()-target) < Math.abs(new Date(hourlyTimes[best]).getTime()-target) ? index : best,0);
  }
  const visibilityMeters = data.hourly.visibility?.[closest];
  el.visibility.textContent = Number.isFinite(visibilityMeters) ? (visibilityMeters/1000).toFixed(1) + " km" : "N/A";
  el.weatherIcon.className = "fa-solid " + condition[1];
  el.description.textContent = condition[0];
  el.date.textContent = new Intl.DateTimeFormat("en-IN",{timeZone:data.timezone,weekday:"long",month:"long",day:"numeric"}).format(new Date(current.time));
}

function renderSunTimes(data) {
  const rise = data.daily.sunrise?.[0], set = data.daily.sunset?.[0];
  if (!rise || !set) return;
  el.sunrise.textContent = formatClock(rise);
  el.sunset.textContent = formatClock(set);
  el.sunriseLabel.textContent = formatClock(rise);
  el.sunsetLabel.textContent = formatClock(set);
}

function renderForecast(data) {
  const days = data.daily;
  el.forecast.innerHTML = "";
  for (let i=0;i<days.time.length;i++) {
    const condition = weatherFor(days.weather_code[i]);
    const date = new Date(days.time[i] + "T12:00:00");
    const dayName = i===0 ? "Today" : new Intl.DateTimeFormat("en-IN",{weekday:"short"}).format(date);
    const card = document.createElement("article");
    card.className = "forecast-card";
    card.style.cssText = "min-width:120px;flex:1;padding:16px 12px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(255,255,255,.10);backdrop-filter:blur(12px);text-align:center;color:white;";
    card.innerHTML = '<div style="font-weight:600;margin-bottom:12px"></div><i class="fa-solid '+condition[1]+'" style="font-size:26px;margin:8px 0 12px"></i><div style="font-size:12px;opacity:.8;margin-bottom:10px"></div><strong></strong><span style="opacity:.7;margin-left:8px"></span>';
    card.children[0].textContent = dayName;
    card.children[2].textContent = condition[0];
    card.children[3].textContent = formatTemperature(days.temperature_2m_max[i]);
    card.children[4].textContent = formatTemperature(days.temperature_2m_min[i]);
    el.forecast.appendChild(card);
  }
  el.forecast.style.display = "flex";
  el.forecast.style.flexWrap = "wrap";
  el.forecast.style.gap = "12px";
}

function updateClock() {
  const zone = weatherData?.timezone || "Asia/Kolkata";
  el.clock.textContent = new Intl.DateTimeFormat("en-IN",{timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date());
}
function minutesInZone(date,zone) {
  const parts = new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(date);
  let h = Number(parts.find(p=>p.type==="hour").value);
  if (h===24) h=0;
  return h*60+Number(parts.find(p=>p.type==="minute").value);
}
function minutesFromIso(value) {
  const d = new Date(value);
  return d.getHours()*60+d.getMinutes();
}
function updateCelestialSystem() {
  if (!weatherData?.daily?.sunrise?.[0] || !weatherData?.daily?.sunset?.[0]) return;
  const zone = weatherData.timezone || "Asia/Kolkata";
  const rise = minutesFromIso(weatherData.daily.sunrise[0]);
  const set = minutesFromIso(weatherData.daily.sunset[0]);
  const now = minutesInZone(new Date(),zone);
  const daylight = set-rise;
  const isDay = now>=rise && now<=set;
  if (isDay) {
    const progress = Math.max(0,Math.min(1,(now-rise)/daylight));
    moveCelestial(el.sun,progress); el.sun.style.opacity="1"; el.moon.style.opacity="0";
    document.body.classList.remove("night"); document.body.classList.add(progress<.25?"morning":progress>.78?"sunset":"day");
    el.sunProgress.style.width=(progress*100)+"%";
    el.skyStatusIcon.className="fa-solid fa-sun";
    el.skyStatusLabel.textContent="Daylight";
    el.skyStatusText.textContent="Sun is above the horizon";
    el.sunPosition.textContent=Math.round(progress*100)+"%";
    el.marker.style.left=(progress*100)+"%";
  } else {
    const totalNight=1440-set+rise;
    const progress=now>set?(now-set)/totalNight:(1440-set+now)/totalNight;
    moveCelestial(el.moon,Math.max(0,Math.min(1,progress))); el.moon.style.opacity="1"; el.sun.style.opacity="0";
    document.body.classList.remove("day","morning","sunset"); document.body.classList.add("night");
    el.skyStatusIcon.className="fa-solid fa-moon";
    el.skyStatusLabel.textContent="Night";
    el.skyStatusText.textContent="Sun is below the horizon";
    el.sunPosition.textContent="0%";
    el.marker.style.left=now<rise?"0%":"100%";
  }
  el.markerLabel.textContent = new Intl.DateTimeFormat("en-IN",{timeZone:zone,hour:"2-digit",minute:"2-digit"}).format(new Date());
}
function moveCelestial(node,progress) {
  if (!node) return;
  const x=5+progress*85;
  const y=57-Math.sin(progress*Math.PI)*40;
  node.style.left=x+"%"; node.style.top=y+"%";
}
async function searchCity(city) {
  showLoading(true); hideError();
  try {
    const params = new URLSearchParams({name:city,count:"1",language:"en",format:"json"});
    const response=await fetch(GEOCODING_API+"?"+params.toString());
    if (!response.ok) throw new Error("Could not search for that city.");
    const data=await response.json();
    if (!data.results?.length) throw new Error('No city found for "'+city+'".');
    const place=data.results[0];
    await loadWeather(place.latitude,place.longitude,place.name,place.country);
  } catch(error) { showError(error.message || "City search failed."); showLoading(false); }
}

el.searchForm.addEventListener("submit",event=>{
  event.preventDefault();
  const city=el.cityInput.value.trim();
  if (!city) { showError("Please enter a city name."); return; }
  searchCity(city);
});
el.locationBtn.addEventListener("click",()=>{
  if (!navigator.geolocation) { showError("Geolocation is not supported by this browser."); return; }
  showLoading(true); hideError();
  navigator.geolocation.getCurrentPosition(
    position=>loadWeather(position.coords.latitude,position.coords.longitude,"Your Location",""),
    error=>{showLoading(false);showError(error.code===1?"Location permission was denied. Search for a city instead.":"Could not get your location. Please search for a city.");},
    {enableHighAccuracy:false,timeout:10000,maximumAge:300000}
  );
});
el.unitToggle.addEventListener("click",()=>{
  useCelsius=!useCelsius;
  el.unitToggle.textContent=useCelsius?"°C":"°F";
  if (weatherData) { renderCurrentWeather(weatherData); renderForecast(weatherData); }
});

document.addEventListener("DOMContentLoaded",()=>{
  showLoading(false); hideError();
  updateClock();
  setInterval(()=>{updateClock();updateCelestialSystem();},1000);
  loadWeather(selectedLocation.latitude,selectedLocation.longitude,selectedLocation.name,selectedLocation.country);
});
