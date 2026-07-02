import { useState, useEffect } from 'react'
import { Wind, Thermometer, Droplets, RefreshCw, AlertTriangle, Info, Siren, History } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'

// Sites mapped to platform projects so alerts route to the right team
const SITES = [
  { name: 'The Creamery',   projectId: 'creamery', lat: 35.7796, lon: -78.6484, addr: '410 Glenwood Ave, Raleigh NC' },
  { name: 'Midtown Office', projectId: 'midtown',  lat: 35.7915, lon: -78.6419, addr: 'Raleigh, NC' },
  { name: 'Harbor Walk',    projectId: 'harbor',   lat: 35.7721, lon: -78.6401, addr: 'Raleigh, NC' },
]

const LIFT_LIMITS = { wind: { safe: 20, caution: 25, stop: 30 }, temp: { min: 35, max: 95 } }

function getLiftStatus(wind, temp) {
  if (wind >= LIFT_LIMITS.wind.stop) return { status: 'STOP', color: 'red', level: 'stop', icon: '🛑', msg: `Wind ${wind}mph exceeds ${LIFT_LIMITS.wind.stop}mph stop limit. No lifts.` }
  if (wind >= LIFT_LIMITS.wind.caution) return { status: 'CAUTION', color: 'amber', level: 'caution', icon: '⚠️', msg: `Wind ${wind}mph — proceed with caution. Notify superintendent.` }
  if (temp < LIFT_LIMITS.temp.min) return { status: 'CAUTION', color: 'amber', level: 'caution', icon: '❄️', msg: `Temperature ${temp}°F below ${LIFT_LIMITS.temp.min}°F minimum. Check sealant cure specs.` }
  if (temp > LIFT_LIMITS.temp.max) return { status: 'CAUTION', color: 'amber', level: 'caution', icon: '🌡️', msg: `Temperature ${temp}°F above ${LIFT_LIMITS.temp.max}°F. Monitor crew and glass heat stress.` }
  return { status: 'CLEAR', color: 'green', level: 'clear', icon: '✅', msg: 'Conditions within safe range. Lifts approved.' }
}

const colorMap = {
  green: 'text-green-400 bg-green-400/10 border-green-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function WeatherPage() {
  const { user, userCan } = useAuth()
  const { issueWeatherAlert, weatherAlerts } = useData()
  const [site, setSite] = useState(SITES[0])
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [justIssued, setJustIssued] = useState(null)

  const fetchWeather = async (s) => {
    setLoading(true); setError(null)
    const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY || ''
    if (!API_KEY) {
      setWeather({ temp: 78, feels: 80, humidity: 62, wind: 12, description: 'Partly cloudy', icon: '02d' })
      setForecast([
        { day: 'Mon', high: 81, low: 66, wind: 14 },
        { day: 'Tue', high: 75, low: 64, wind: 22 },
        { day: 'Wed', high: 68, low: 58, wind: 33 },
        { day: 'Thu', high: 72, low: 61, wind: 8 },
        { day: 'Fri', high: 79, low: 65, wind: 15 },
      ])
      setLoading(false); return
    }
    try {
      const [curr, fore] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${s.lat}&lon=${s.lon}&units=imperial&appid=${API_KEY}`).then(r => r.json()),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${s.lat}&lon=${s.lon}&units=imperial&appid=${API_KEY}`).then(r => r.json()),
      ])
      setWeather({
        temp: Math.round(curr.main.temp), feels: Math.round(curr.main.feels_like),
        humidity: curr.main.humidity, wind: Math.round(curr.wind.speed),
        description: curr.weather[0].description, icon: curr.weather[0].icon,
      })
      const days = {}
      fore.list?.forEach(entry => {
        const d = new Date(entry.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })
        if (!days[d]) days[d] = { day: d, high: entry.main.temp_max, low: entry.main.temp_min, wind: entry.wind.speed }
        else { days[d].high = Math.max(days[d].high, entry.main.temp_max); days[d].low = Math.min(days[d].low, entry.main.temp_min); days[d].wind = Math.max(days[d].wind, entry.wind.speed) }
      })
      setForecast(Object.values(days).slice(0, 5).map(d => ({ ...d, high: Math.round(d.high), low: Math.round(d.low), wind: Math.round(d.wind) })))
    } catch { setError('Could not fetch weather. Check OpenWeatherMap API key in .env') }
    setLoading(false)
  }

  useEffect(() => { fetchWeather(site); setJustIssued(null) }, [site])

  const liftStatus = weather ? getLiftStatus(weather.wind, weather.temp) : null
  const canIssue = userCan('issue_weather_alert')
  const siteAlerts = weatherAlerts.filter(a => a.projectId === site.projectId).slice(0, 4)

  const issueAlert = (level) => {
    const isStop = level === 'stop'
    const alert = issueWeatherAlert({
      projectId: site.projectId,
      site: site.name,
      level,
      wind: weather?.wind,
      message: isStop
        ? `Sustained wind ${weather?.wind}mph at ${site.name}. Stop all lifts and exterior work.`
        : `Weather watch at ${site.name} — wind ${weather?.wind}mph. Monitor conditions.`,
      action: isStop ? 'Secure materials, lower crane boom to weathervane, clear deck' : 'Brief crew, hold lift picks until reassessed',
      issuedBy: user,
    })
    setJustIssued(alert)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-xl font-semibold">Weather & Lift Planner</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time site conditions, lift go/no-go, and storm alerts</p>
        </div>
        <button onClick={() => fetchWeather(site)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SITES.map(s => (
          <button key={s.name} onClick={() => setSite(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition border ${site.name === s.name ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'text-slate-400 bg-slate-800 border-slate-700 hover:text-white'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">{error}</div>}

      {!import.meta.env.VITE_OPENWEATHER_KEY && (
        <div className="flex items-center gap-2 p-2.5 bg-slate-700/40 border border-slate-600/40 rounded-lg text-slate-400 text-xs">
          <Info size={12} /> Running in demo mode — add VITE_OPENWEATHER_KEY to .env for live data
        </div>
      )}

      {justIssued && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${justIssued.level === 'stop' ? colorMap.red : colorMap.amber}`}>
          <Siren size={18} className="mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{justIssued.level === 'stop' ? 'STOP-WORK alert issued' : 'Weather watch issued'} — {justIssued.site}</p>
            <p className="text-xs opacity-80 mt-0.5">Notified PM, General Super, Superintendent, Asst. Super, Foreman, and Safety. Action: {justIssued.action}.</p>
          </div>
        </div>
      )}

      {weather && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Thermometer size={11} /> Temperature</p>
              <p className="text-3xl font-bold text-white">{weather.temp}°</p>
              <p className="text-slate-400 text-xs">Feels like {weather.feels}°F</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Wind size={11} /> Wind Speed</p>
              <p className={`text-3xl font-bold ${weather.wind >= 25 ? 'text-red-400' : weather.wind >= 20 ? 'text-amber-400' : 'text-white'}`}>{weather.wind}</p>
              <p className="text-slate-400 text-xs">mph sustained</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Droplets size={11} /> Humidity</p>
              <p className="text-3xl font-bold text-white">{weather.humidity}%</p>
              <p className="text-slate-400 text-xs capitalize">{weather.description}</p>
            </div>
            <div className={`rounded-xl p-4 border ${colorMap[liftStatus.color]}`}>
              <p className="text-xs mb-1 opacity-70">Lift Status</p>
              <p className="text-2xl font-bold">{liftStatus.icon} {liftStatus.status}</p>
              <p className="text-xs mt-1 opacity-80">{liftStatus.msg}</p>
            </div>
          </div>

          {/* Storm alert action */}
          <div className={`rounded-xl p-4 border ${liftStatus.level === 'stop' ? colorMap.red : 'bg-slate-800/60 border-slate-700/50'}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className={liftStatus.level === 'stop' ? 'text-red-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
                <div>
                  <h2 className="text-white font-medium text-sm">Storm Alert — {site.name}</h2>
                  <p className="text-slate-400 text-xs mt-0.5 max-w-md">
                    {liftStatus.level === 'stop'
                      ? 'Conditions exceed the stop limit. Issue a stop-work alert to clear the deck and lower the crane.'
                      : 'Issue an alert to the project team when conditions warrant a shutdown or crane lowering.'}
                  </p>
                </div>
              </div>
              {canIssue ? (
                <div className="flex gap-2">
                  <button onClick={() => issueAlert('caution')}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-amber-400/30 text-amber-300 hover:bg-amber-400/10 transition">
                    Issue Weather Watch
                  </button>
                  <button onClick={() => issueAlert('stop')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-400 text-white transition">
                    <Siren size={13} /> Issue Stop-Work
                  </button>
                </div>
              ) : (
                <p className="text-slate-500 text-xs self-center">Only superintendents, safety, and leadership can issue alerts.</p>
              )}
            </div>

            {siteAlerts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700/40 space-y-2">
                <p className="text-slate-500 text-xs flex items-center gap-1"><History size={11} /> Recent alerts</p>
                {siteAlerts.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${a.level === 'stop' ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}>
                      {a.level === 'stop' ? 'STOP' : 'WATCH'}
                    </span>
                    <span className="text-slate-400 flex-1 truncate">{a.message}</span>
                    <span className="text-slate-600">{a.issuedBy} · {timeAgo(a.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-white font-medium text-sm mb-3">Lift Safety Limits — SPS Policy</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center"><p className="text-green-400 font-semibold">≤ 20 mph</p><p className="text-slate-400 text-xs">Wind — Safe to lift</p></div>
              <div className="text-center"><p className="text-amber-400 font-semibold">20–30 mph</p><p className="text-slate-400 text-xs">Wind — Caution, notify super</p></div>
              <div className="text-center"><p className="text-red-400 font-semibold">≥ 30 mph</p><p className="text-slate-400 text-xs">Wind — Stop all lifts</p></div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-white font-medium text-sm mb-3">5-Day Outlook — {site.name}</h2>
            <div className="grid grid-cols-5 gap-2">
              {forecast.map(d => {
                const ls = getLiftStatus(d.wind, d.high)
                return (
                  <div key={d.day} className="text-center p-2 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 text-xs font-medium">{d.day}</p>
                    <p className="text-white font-bold text-lg my-1">{d.high}°</p>
                    <p className="text-slate-500 text-xs">{d.low}°</p>
                    <p className={`text-xs mt-1 font-medium ${ls.color === 'green' ? 'text-green-400' : ls.color === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>{d.wind}mph</p>
                    <p className="text-xs mt-0.5">{ls.icon}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
