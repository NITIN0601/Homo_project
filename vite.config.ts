import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url))
const CACHE_DIR = path.resolve(ROOT_DIR, 'node_modules/.cache')
const BLOCKED_DATES_FILE = path.resolve(CACHE_DIR, 'calendar_sync.json')
const APPOINTMENTS_FILE = path.resolve(CACHE_DIR, 'appointments_sync.json')
const INVOICES_FILE = path.resolve(CACHE_DIR, 'invoices_sync.json')
const VISITS_FILE = path.resolve(CACHE_DIR, 'visits_sync.json')

const GOOGLE_CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com'
const GOOGLE_HOLIDAYS_ICS_URL = 'https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics'

let holidaysCache: Record<number, any[]> = {}
let lastFetchTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function readJsonFile(filePath: string, fallback: any) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (e) {
    console.error(`Error reading ${filePath}`, e)
  }
  return fallback
}

function writeJsonFile(filePath: string, data: any) {
  ensureCacheDir()
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Default Data Seeds ───────────────────────────────────────────────────────
const SEED_APPOINTMENTS = [
  {
    id: "apt-101",
    patientId: "usr-001",
    patientName: "John Doe",
    patientPhone: "+91 98123 45678",
    patientEmail: "john@agastyahomoeo.com",
    date: "Today",
    time: "10:30 AM",
    slot: "10:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Chronic Dyspepsia & Post-Exertion Soreness",
    status: "Confirmed",
  },
  {
    id: "apt-102",
    patientId: "usr-002",
    patientName: "Priya Sharma",
    patientPhone: "+91 99887 76655",
    patientEmail: "priya@agastyahomoeo.com",
    date: "Today",
    time: "11:30 AM",
    slot: "11:30",
    type: "Online Tele-Consultation",
    chiefReason: "Recurrent Migraine & Sleep Disturbance",
    status: "Confirmed",
  },
  {
    id: "apt-103",
    patientId: "usr-003",
    patientName: "Rajesh Varma",
    patientPhone: "+91 98203 34567",
    patientEmail: "rajesh@agastyahomoeo.com",
    date: "Today",
    time: "02:30 PM",
    slot: "14:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Allergic Rhinitis & Seasonal Sneezing Modalities",
    status: "Confirmed",
  },
  {
    id: "apt-104",
    patientId: "usr-004",
    patientName: "Sunita Rao",
    patientPhone: "+91 98204 45678",
    patientEmail: "sunita@agastyahomoeo.com",
    date: "Today",
    time: "04:15 PM",
    slot: "16:15",
    type: "Online Tele-Consultation",
    chiefReason: "Cervical Spondylosis Stiffness with Weather Aggravation",
    status: "Pending",
  },
  {
    id: "apt-105",
    patientId: "usr-005",
    patientName: "Amit Patel",
    patientPhone: "+91 98205 56789",
    patientEmail: "amit@agastyahomoeo.com",
    date: "Tomorrow",
    time: "10:30 AM",
    slot: "10:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Eczematous Rash & Skin Itching at Night",
    status: "Confirmed",
  },
]

const SEED_INVOICES = [
  {
    id: "INV-2026-101",
    patientId: "usr-001",
    patientName: "John Doe",
    doctorName: "Dr. Bramarambha K, MD (Homoeopathy)",
    visitDate: "2026-10-02",
    amountINR: 750,
    consultationType: "In-Person Clinic Visit",
    notes: "Chronic constitutional assessment & acute dyspepsia remedy prescription",
    status: "pending",
    issuedAt: "2026-10-02 10:30 AM",
  },
  {
    id: "INV-2026-102",
    patientId: "usr-002",
    patientName: "Priya Sharma",
    doctorName: "Dr. Bramarambha K, MD (Homoeopathy)",
    visitDate: "2026-09-28",
    amountINR: 750,
    consultationType: "Online Tele-Consultation",
    notes: "Migraine follow-up review & totality potency adjustment",
    status: "paid",
    issuedAt: "2026-09-28 11:45 AM",
    paidAt: "2026-09-28 12:10 PM",
    paymentMethod: "upi",
    transactionRef: "UPI-984210982-IN",
  },
]

function mapHolidayEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('republic') || n.includes('independence')) return '🇮🇳'
  if (n.includes('diwali') || n.includes('deepavali') || n.includes('naraka') || n.includes('lakshmi')) return '🪔'
  if (n.includes('holi') || n.includes('dahan')) return '🎨'
  if (n.includes('pongal') || n.includes('sankranti')) return '🌾'
  if (n.includes('shivaratri') || n.includes('shiva')) return '🔱'
  if (n.includes('ganesh') || n.includes('vinayaka')) return '🐘'
  if (n.includes('dussehra') || n.includes('dasara') || n.includes('vijayadashami') || n.includes('rama')) return '🏹'
  if (n.includes('durga') || n.includes('navratri') || n.includes('puja') || n.includes('ashtami') || n.includes('navami')) return '🪷'
  if (n.includes('eid') || n.includes('ramadan') || n.includes('ramzan') || n.includes('bakrid') || n.includes('muharram')) return '🌙'
  if (n.includes('christmas') || n.includes('xmas')) return '🎄'
  if (n.includes('buddha')) return '🪷'
  if (n.includes('guru') || n.includes('nanak')) return '🪔'
  if (n.includes('gandhi')) return '🕊️'
  if (n.includes('ambedkar')) return '📜'
  if (n.includes('rajyotsava')) return '💛'
  if (n.includes('ugadi') || n.includes('gudi padwa') || n.includes('new year')) return '🌿'
  return '✨'
}

function parseGoogleIcs(icsText: string): Record<number, any[]> {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '')
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g
  const byYear: Record<number, any[]> = {}
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = eventRegex.exec(unfolded)) !== null) {
    const block = match[1]
    const dtstartMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/)
    const summaryMatch = block.match(/SUMMARY:(.+?)(?:\r?\n|$)/)
    const descMatch = block.match(/DESCRIPTION:(.+?)(?:\r?\n|$)/)

    if (dtstartMatch && summaryMatch) {
      const rawDate = dtstartMatch[1]
      const year = parseInt(rawDate.substring(0, 4), 10)
      const month = rawDate.substring(4, 6)
      const day = rawDate.substring(6, 8)
      const ymd = `${year}-${month}-${day}`

      const rawName = summaryMatch[1].replace(/\\,/g, ',').replace(/\\;/g, ';').trim()
      const rawDesc = descMatch ? descMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : ''

      const dedupeKey = `${ymd}_${rawName}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const nameLower = rawName.toLowerCase()
      let holType = 'festival'
      if (nameLower.includes('republic') || nameLower.includes('independence') || nameLower.includes('gandhi jayanti')) {
        holType = 'national'
      } else if (nameLower.includes('rajyotsava')) {
        holType = 'state'
      }

      if (!byYear[year]) byYear[year] = []
      byYear[year].push({
        date: ymd,
        year,
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        name: rawName,
        type: holType,
        description: rawDesc,
        emoji: mapHolidayEmoji(rawName),
        source: 'google_calendar_feed',
        calendarId: GOOGLE_CALENDAR_ID,
      })
    }
  }

  for (const yr of Object.keys(byYear)) {
    byYear[Number(yr)].sort((a, b) => a.date.localeCompare(b.date))
  }

  return byYear
}

function fetchGoogleHolidays(): Promise<Record<number, any[]>> {
  return new Promise((resolve) => {
    https.get(GOOGLE_HOLIDAYS_ICS_URL, { headers: { 'User-Agent': 'AgastyaClinic-AppointmentEngine/1.0' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = parseGoogleIcs(data)
          resolve(parsed)
        } catch {
          resolve({})
        }
      })
    }).on('error', () => {
      resolve({})
    })
  })
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: any) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
  })
}

function sendJson(res: any, statusCode: number, data: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}

function clinicSyncPlugin() {
  return {
    name: 'clinic-sync-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || ''

        // Handle CORS Preflight
        if (req.method === 'OPTIONS' && url.startsWith('/api/')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.statusCode = 200
          res.end()
          return
        }

        // ─── 1. Google Calendar Holidays ─────────────────────────────────────
        if (url.startsWith('/api/calendar/holidays')) {
          const parsedUrl = new URL(url, 'http://localhost')
          const targetYear = parseInt(parsedUrl.searchParams.get('year') || '2026', 10)
          const targetMonth = parsedUrl.searchParams.get('month') ? parseInt(parsedUrl.searchParams.get('month')!, 10) : null

          const now = Date.now()
          if (!holidaysCache[targetYear] || now - lastFetchTime > CACHE_TTL) {
            const fetched = await fetchGoogleHolidays()
            if (Object.keys(fetched).length > 0) {
              holidaysCache = fetched
              lastFetchTime = now
            }
          }

          let result = holidaysCache[targetYear] || []
          if (targetMonth !== null) {
            result = result.filter((h) => h.month === targetMonth)
          }

          sendJson(res, 200, {
            status: 'success',
            year: targetYear,
            month: targetMonth,
            calendar_id: GOOGLE_CALENDAR_ID,
            source: 'google_calendar_public_feed',
            total: result.length,
            holidays: result,
          })
          return
        }

        // ─── 2. Blocked Dates / Leave ─────────────────────────────────────────
        if (url === '/api/blocked-dates') {
          if (req.method === 'GET') {
            const data = readJsonFile(BLOCKED_DATES_FILE, [])
            sendJson(res, 200, data)
            return
          }
          if (req.method === 'POST') {
            try {
              const parsed = await parseJsonBody(req)
              const uniqueMap = new Map<string, any>()
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item && item.date) uniqueMap.set(item.date, item)
                }
              }
              const deduplicated = Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date))
              writeJsonFile(BLOCKED_DATES_FILE, deduplicated)
              sendJson(res, 200, { success: true, count: deduplicated.length })
            } catch (err) {
              sendJson(res, 500, { error: String(err) })
            }
            return
          }
        }

        // ─── 3. Booked Appointments ──────────────────────────────────────────
        if (url === '/api/appointments') {
          if (req.method === 'GET') {
            const data = readJsonFile(APPOINTMENTS_FILE, SEED_APPOINTMENTS)
            sendJson(res, 200, data)
            return
          }
          if (req.method === 'POST') {
            try {
              const apt = await parseJsonBody(req)
              const current = readJsonFile(APPOINTMENTS_FILE, SEED_APPOINTMENTS)
              const idx = current.findIndex((a: any) => a.id === apt.id)
              if (idx >= 0) {
                current[idx] = { ...current[idx], ...apt }
              } else {
                current.unshift(apt)
              }
              writeJsonFile(APPOINTMENTS_FILE, current)
              sendJson(res, 200, { success: true, appointment: apt })
            } catch (err) {
              sendJson(res, 500, { error: String(err) })
            }
            return
          }
        }

        if (url.startsWith('/api/appointments/') && (url.endsWith('/status') || req.method === 'PUT')) {
          try {
            const parts = url.split('/')
            const aptId = parts[3]
            const body = await parseJsonBody(req)
            const current = readJsonFile(APPOINTMENTS_FILE, SEED_APPOINTMENTS)
            const target = current.find((a: any) => a.id === aptId)
            if (target) {
              target.status = body.status || target.status
              writeJsonFile(APPOINTMENTS_FILE, current)
              sendJson(res, 200, target)
            } else {
              sendJson(res, 404, { error: 'Appointment not found' })
            }
          } catch (err) {
            sendJson(res, 500, { error: String(err) })
          }
          return
        }

        // ─── 4. Book Appointment Endpoint (Invites + Multi-Port Sync) ────────
        if (url === '/api/book-appointment' && req.method === 'POST') {
          try {
            const reqBody = await parseJsonBody(req)
            const startTime = reqBody.start_time || new Date().toISOString()
            const datePart = startTime.includes('T') ? startTime.split('T')[0] : startTime
            const timePart = startTime.includes('T') ? startTime.split('T')[1].slice(0, 5) : '10:00'

            const aptRecord = {
              id: `apt-${Date.now()}`,
              patientId: reqBody.patient_id || `usr-${Date.now().toString().slice(-4)}`,
              patientName: reqBody.user_name || 'Valued Patient',
              patientPhone: reqBody.phone || '+91 98123 45678',
              patientEmail: reqBody.user_email,
              date: datePart,
              time: timePart,
              slot: timePart,
              type: 'In-Person Clinic Visit',
              chiefReason: reqBody.description || 'Clinical Consultation',
              status: 'Confirmed',
              createdAt: new Date().toISOString(),
            }

            const current = readJsonFile(APPOINTMENTS_FILE, SEED_APPOINTMENTS)
            current.unshift(aptRecord)
            writeJsonFile(APPOINTMENTS_FILE, current)

            sendJson(res, 201, {
              status: 'confirmed',
              message: 'Appointment booked successfully with Google Calendar invite & email confirmation dispatched.',
              appointment: aptRecord,
              calendar_event: {
                event_id: `gcal_sim_${Date.now()}`,
                html_link: `https://calendar.google.com/calendar/r/eventedit?text=Homoeopathy+Consultation`,
                send_updates: 'all',
                business_timezone: 'Asia/Kolkata',
              },
              email_delivery: {
                success: true,
                status: 'mock_delivered',
                customer_email: reqBody.user_email,
                cc: 'vaishnavikshetty@gmail.com',
              },
              patient: {
                name: reqBody.user_name,
                email: reqBody.user_email,
              },
            })
          } catch (err) {
            sendJson(res, 400, { error: String(err) })
          }
          return
        }

        // ─── 5. Consultation Invoices & Billing ──────────────────────────────
        if (url === '/api/consultation-invoices') {
          if (req.method === 'GET') {
            const data = readJsonFile(INVOICES_FILE, SEED_INVOICES)
            sendJson(res, 200, data)
            return
          }
          if (req.method === 'POST') {
            try {
              const invoice = await parseJsonBody(req)
              const current = readJsonFile(INVOICES_FILE, SEED_INVOICES)
              const idx = current.findIndex((i: any) => i.id === invoice.id)
              if (idx >= 0) {
                current[idx] = { ...current[idx], ...invoice }
              } else {
                current.unshift(invoice)
              }
              writeJsonFile(INVOICES_FILE, current)
              sendJson(res, 200, { success: true, invoice })
            } catch (err) {
              sendJson(res, 500, { error: String(err) })
            }
            return
          }
        }

        if (url.startsWith('/api/consultation-invoices/') && req.method === 'PUT') {
          try {
            const invoiceId = url.split('/')[3]
            const updates = await parseJsonBody(req)
            const current = readJsonFile(INVOICES_FILE, SEED_INVOICES)
            const target = current.find((i: any) => i.id === invoiceId)
            if (target) {
              Object.assign(target, updates)
              writeJsonFile(INVOICES_FILE, current)
              sendJson(res, 200, target)
            } else {
              sendJson(res, 404, { error: 'Invoice not found' })
            }
          } catch (err) {
            sendJson(res, 500, { error: String(err) })
          }
          return
        }

        // ─── 6. Visit Summaries ───────────────────────────────────────────────
        if (url === '/api/visit-summaries') {
          if (req.method === 'GET') {
            const data = readJsonFile(VISITS_FILE, {})
            sendJson(res, 200, data)
            return
          }
          if (req.method === 'POST') {
            try {
              const { patientId, visit } = await parseJsonBody(req)
              const current = readJsonFile(VISITS_FILE, {})
              const file = current[patientId] || { patientId, visits: [] }
              file.visits = [visit, ...(file.visits || [])]
              current[patientId] = file
              writeJsonFile(VISITS_FILE, current)
              sendJson(res, 200, { success: true, file })
            } catch (err) {
              sendJson(res, 500, { error: String(err) })
            }
            return
          }
        }

        // ─── 7. Test Email Dispatch Endpoint ──────────────────────────────────
        if (url === '/api/send-test-email' && req.method === 'POST') {
          try {
            const parsed = await parseJsonBody(req)
            const customerEmail = parsed.customer_email || parsed.to
            const apiKey = parsed.api_key || process.env.RESEND_API_KEY || ''
            const customerName = parsed.customer_name || 'Valued Patient'
            const apptTime = parsed.appointment_time || 'Upcoming Consultation'

            if (!apiKey || apiKey === 're_YourFreeApiKeyHere') {
              sendJson(res, 200, {
                success: true,
                simulated: true,
                message: 'Test email simulated successfully. Provide a real Resend API key for live transmission.',
                to: customerEmail,
                cc: 'vaishnavikshetty@gmail.com',
              })
              return
            }

            const emailPayload = JSON.stringify({
              from: 'Agastya Homoeopathy Clinic <onboarding@resend.dev>',
              to: [customerEmail],
              cc: ['vaishnavikshetty@gmail.com'],
              subject: 'Appointment Confirmed — Agastya Homoeopathy Clinic',
              html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 550px;">
                <h2 style="color: #1b4332; margin-top: 0;">Agastya Homoeopathy Clinic</h2>
                <p>Dear <strong>${customerName}</strong>,</p>
                <p>Your appointment has been confirmed!</p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 15px 0;">
                  <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${apptTime}</p>
                  <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. Bramarambha K</p>
                  <p style="margin: 4px 0;"><strong>Clinic:</strong> No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru – 560003</p>
                </div>
                <p style="font-size: 12px; color: #666;">This confirmation has also been CC'd to clinic admin (vaishnavikshetty@gmail.com).</p>
              </div>`
            })

            const resendReq = https.request('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(emailPayload)
              }
            }, (resendRes) => {
              let resendBody = ''
              resendRes.on('data', (chunk) => { resendBody += chunk })
              resendRes.on('end', () => {
                res.statusCode = resendRes.statusCode || 200
                res.setHeader('Content-Type', 'application/json')
                res.end(resendBody)
              })
            })

            resendReq.on('error', (err) => {
              sendJson(res, 500, { success: false, error: String(err) })
            })

            resendReq.write(emailPayload)
            resendReq.end()
          } catch (err) {
            sendJson(res, 400, { success: false, error: 'Invalid JSON body' })
          }
          return
        }

        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    clinicSyncPlugin(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/node_modules/**', '**/calendar_sync.json', '**/appointments_sync.json', '**/invoices_sync.json', '**/visits_sync.json', '**/.cache/**'],
    },
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/libphonenumber-js') || id.includes('node_modules/validator')) {
            return 'validation-vendor';
          }
        },
      },
    },
  },
})
