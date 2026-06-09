import express from 'express'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const app = express()
const PORT = 4000

const AT_LICENSE_API = 'http://192.168.4.67:3000/v1'
const AT_LICENSE_EMAIL = 'admin@example.com'
const AT_LICENSE_PASSWORD = 'cac574a29b02b389cfe43d8d'
const AT_LICENSE_ACCOUNT = '9d98fe60-dd63-4b7e-a8c9-26725058567b'

let adminToken = null

const DEMO_USERS = [
  { id: 'user-1', email: 'alice@example.com', password: '123456', name: 'Alice' },
  { id: 'user-2', email: 'bob@example.com', password: '123456', name: 'Bob' },
  { id: 'user-3', email: 'charlie@example.com', password: '123456', name: 'Charlie' },
]

const sessions = {}

const licenses = {}

app.use(express.json())
app.use(express.static(join(import.meta.dirname, 'public')))

async function loginAtLicense() {
  const res = await fetch(`${AT_LICENSE_API}/tokens`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${AT_LICENSE_EMAIL}:${AT_LICENSE_PASSWORD}`).toString('base64'),
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      'AtLicense-Version': '1.8',
    },
    body: JSON.stringify({ data: { type: 'tokens', attributes: {} } }),
  })
  const data = await res.json()
  adminToken = data.data?.attributes?.token
  return adminToken
}

async function at-licenseRequest(path, { method = 'GET', body } = {}) {
  if (!adminToken) await loginAtLicense()
  const headers = {
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'AtLicense-Version': '1.8',
    Authorization: `Bearer ${adminToken}`,
  }
  let res = await fetch(`${AT_LICENSE_API}${path}`, { method, headers, body: body && JSON.stringify(body) })

  if (res.status === 401) {
    await loginAtLicense()
    headers.Authorization = `Bearer ${adminToken}`
    res = await fetch(`${AT_LICENSE_API}${path}`, { method, headers, body: body && JSON.stringify(body) })
  }

  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

function getSession(req) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const sessionId = auth.slice(7)
  return sessions[sessionId] || null
}

function requireAuth(req, res, next) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not logged in' })
  req.session = session
  next()
}

function requireLicense(req, res, next) {
  const userId = req.session.userId
  const license = licenses[userId]
  if (!license || !license.activated) {
    return res.status(403).json({ error: 'License not activated', code: 'NO_LICENSE' })
  }
  req.license = license
  next()
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  const user = DEMO_USERS.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'Wrong email or password' })

  const sessionId = createHash('sha256').update(`${user.id}-${Date.now()}`).digest('hex')
  sessions[sessionId] = { userId: user.id, user }
  res.json({ sessionId, user: { id: user.id, name: user.name, email: user.email } })
})

app.post('/api/activate', requireAuth, async (req, res) => {
  const { licenseKey, fingerprint, browserDeviceId } = req.body
  if (!licenseKey || !fingerprint) {
    return res.status(400).json({ error: 'Missing licenseKey or fingerprint' })
  }

  const userId = req.session.userId
  const existing = licenses[userId]
  if (existing?.activated) {
    return res.json({ ok: true, alreadyActivated: true, licenseKey: existing.key, machineId: existing.machineId })
  }

  const validate = await at-licenseRequest('/licenses/actions/validate-key', {
    method: 'POST',
    body: { meta: { key: licenseKey, scope: { fingerprint } } },
  })

  const valid = validate.data?.meta?.valid
  const code = validate.data?.meta?.code
  if (!valid && code !== 'NO_MACHINES' && code !== 'FINGERPRINT_SCOPE_MISMATCH') {
    return res.status(400).json({ error: validate.data?.meta?.detail || `License not valid: ${code}`, code })
  }

  const lookup = await at-licenseRequest(`/licenses?key=${encodeURIComponent(licenseKey)}`)
  const at-licenseLicense = lookup.data?.data?.[0]
  if (!at-licenseLicense) return res.status(400).json({ error: 'License not found' })
  const at-licenseLicenseId = at-licenseLicense.id

  const existingMachines = await at-licenseRequest(`/machines?license=${at-licenseLicenseId}`)
  const matchedMachine = existingMachines.data?.data?.find(m => m.attributes?.fingerprint === fingerprint)

  let machineId
  if (matchedMachine) {
    machineId = matchedMachine.id
  } else {
    const createMachine = await at-licenseRequest('/machines', {
      method: 'POST',
      body: {
        data: {
          type: 'machines',
          attributes: { fingerprint, name: req.session.user.name + ' browser', metadata: { browserDeviceId } },
          relationships: { license: { data: { type: 'licenses', id: at-licenseLicenseId } } },
        },
      },
    })
    if (createMachine.data?.errors) {
      return res.status(400).json({ error: createMachine.data.errors[0]?.detail || 'Failed to create machine' })
    }
    machineId = createMachine.data?.data?.id
  }

  licenses[userId] = {
    key: licenseKey,
    at-licenseLicenseId,
    machineId,
    fingerprint,
    activated: true,
    activatedAt: new Date().toISOString(),
    policyName: at-licenseLicense.relationships?.policy?.data?.id || '',
  }

  res.json({ ok: true, machineId, at-licenseLicenseId })
})

app.get('/api/license/status', requireAuth, (req, res) => {
  const license = licenses[req.session.userId]
  if (!license?.activated) {
    return res.json({ activated: false })
  }
  res.json({
    activated: true,
    licenseKey: license.key,
    machineId: license.machineId,
    activatedAt: license.activatedAt,
  })
})

app.get('/api/data', requireAuth, requireLicense, async (req, res) => {
  const { fingerprint } = req.query
  if (!fingerprint) {
    return res.status(400).json({ error: 'Missing fingerprint query param' })
  }

  if (fingerprint !== req.license.fingerprint) {
    return res.status(403).json({ error: 'Fingerprint does not match activated machine', code: 'FINGERPRINT_MISMATCH' })
  }

  const at-licenseLicense = await at-licenseRequest(`/licenses/${req.license.at-licenseLicenseId}`)
  const status = at-licenseLicense.data?.data?.attributes?.status
  if (status === 'SUSPENDED' || status === 'BANNED') {
    return res.status(403).json({ error: `License is ${status}`, code: `LICENSE_${status}` })
  }

  const machineCount = at-licenseLicense.data?.data?.relationships?.machines?.meta?.count || 0
  const maxMachines = at-licenseLicense.data?.data?.attributes?.maxMachines || 0

  res.json({
    secret: 'This is protected data only for activated license!',
    licenseKey: req.license.key,
    machineId: req.license.machineId,
    machineCount,
    maxMachines,
    user: req.session.user.name,
  })
})

app.get('/api/admin/licenses', requireAuth, async (req, res) => {
  const result = await at-licenseRequest('/licenses')
  res.json(result.data)
})

app.get('/api/admin/machines', requireAuth, async (req, res) => {
  const result = await at-licenseRequest('/machines')
  res.json(result.data)
})

app.listen(PORT, () => {
  console.log(`Demo app backend: http://localhost:${PORT}`)
  console.log('Demo users:')
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email} / ${u.password} (${u.name})`)
  }
})
