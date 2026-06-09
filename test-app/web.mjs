import { createHash } from 'node:crypto'
import { cpus, networkInterfaces, hostname, totalmem, arch, platform, release, userInfo, homedir, uptime } from 'node:os'
import { execSync } from 'node:child_process'
import { createServer } from 'node:http'

const API = 'http://192.168.4.67:3000/v1'
const EMAIL = 'admin@example.com'
const PASSWORD = 'cac574a29b02b389cfe43d8d'
const PORT = 4173

let token = null

function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

async function login() {
  if (token) return token

  const res = await fetch(`${API}/tokens`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(EMAIL, PASSWORD),
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      'Keygen-Version': '1.8',
    },
    body: JSON.stringify({ data: { type: 'tokens', attributes: {} } }),
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Login returned non-JSON response (${res.status}): ${text.slice(0, 300)}`)
  }
  token = data.data?.attributes?.token
  if (!token) {
    const message = data.errors?.map(error => error.detail || error.title || error.code).filter(Boolean).join(', ')
    throw new Error(message || `Login failed (${res.status})`)
  }

  return token
}

async function api(path, { method = 'GET', body } = {}) {
  await login()

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Keygen-Version': '1.8',
    },
    body: body && JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`API returned non-JSON response (${res.status}): ${text.slice(0, 300)}`)
  }

  if (!res.ok) {
    throw new Error(data?.errors?.map(error => error.detail).join(', ') || `HTTP ${res.status}`)
  }

  return data
}

function describeValidation(meta = {}) {
  if (meta.valid) return 'License hợp lệ.'

  const code = meta.code || 'INVALID'
  const detail = meta.detail || meta.message || ''
  const messages = {
    EXPIRED: 'License đã hết hạn.',
    SUSPENDED: 'License đang bị suspend.',
    NO_MACHINES: 'License chưa có machine hợp lệ hoặc cần activate máy.',
    TOO_MANY_MACHINES: 'License đã vượt quá số lượng device cho phép.',
    FINGERPRINT_SCOPE_MISMATCH: 'License hợp lệ nhưng máy này chưa được activate.',
    FINGERPRINT_SCOPE_REQUIRED: 'Policy yêu cầu fingerprint khi validate.',
    INVALID: 'License không hợp lệ.',
  }

  return messages[code] || detail || `License không hợp lệ (${code}).`
}

async function validateLicense(licenseKey, machine = collectFingerprint()) {
  const validation = await api('/licenses/actions/validate-key', {
    method: 'POST',
    body: { meta: { key: licenseKey, scope: { fingerprint: machine.fingerprint } } },
  })

  return {
    valid: Boolean(validation.meta?.valid),
    code: validation.meta?.code,
    message: describeValidation(validation.meta),
    machine,
    raw: validation.meta,
  }
}

function collectFingerprint() {
  const nets = networkInterfaces()
  const network = Object.entries(nets).flatMap(([name, addresses]) =>
    (addresses || []).filter(Boolean).map(address => ({
      name,
      address: address.address,
      family: address.family,
      mac: address.mac,
      internal: address.internal,
      cidr: address.cidr,
    })),
  )
  const macs = network.map(n => n.mac).filter(m => m && m !== '00:00:00:00:00:00')

  let diskSerial = ''
  let hardwareUuid = ''
  let machineId = ''
  let boardSerial = ''
  let systemModel = ''
  try {
    diskSerial = execSync(
      process.platform === 'darwin'
        ? 'system_profiler SPStorageDataType 2>/dev/null | grep -i "Serial Number" | head -1 | awk \'{print $3}\''
        : process.platform === 'linux'
          ? 'cat /sys/block/sda/serial 2>/dev/null || cat /sys/block/nvme0n1/serial 2>/dev/null || echo ""'
          : 'wmic diskdrive get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 },
    ).trim()
  } catch {}
  try {
    hardwareUuid = execSync(
      process.platform === 'darwin'
        ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/IOPlatformUUID/{print $4}\''
        : process.platform === 'linux'
          ? 'cat /sys/class/dmi/id/product_uuid 2>/dev/null || echo ""'
          : 'wmic csproduct get uuid 2>/dev/null | findstr /v "UUID" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 },
    ).trim()
  } catch {}
  try {
    machineId = execSync(
      process.platform === 'linux'
        ? 'cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/IOPlatformSerialNumber/{print $4}\''
          : 'wmic bios get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 },
    ).trim()
  } catch {}
  try {
    boardSerial = execSync(
      process.platform === 'linux'
        ? 'cat /sys/class/dmi/id/board_serial 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/board-id/{print $4}\''
          : 'wmic baseboard get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 },
    ).trim()
  } catch {}
  try {
    systemModel = execSync(
      process.platform === 'linux'
        ? 'cat /sys/class/dmi/id/product_name 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'sysctl -n hw.model 2>/dev/null || echo ""'
          : 'wmic computersystem get model 2>/dev/null | findstr /v "Model" || echo ""',
      { encoding: 'utf8', timeout: 5000 },
    ).trim()
  } catch {}

  const fingerprintRaw = [
    hardwareUuid,
    machineId,
    boardSerial,
    macs.sort().join(','),
    diskSerial,
    cpus().map(c => c.model.trim()).sort().join(','),
    hostname(),
  ].filter(Boolean).join('|')

  return {
    fingerprint: createHash('sha256').update(fingerprintRaw).digest('hex'),
    name: hostname(),
    hostname: hostname(),
    platform: `${platform()} ${release()}`,
    arch: arch(),
    cores: cpus().length,
    memory: totalmem(),
    cpuModel: cpus()[0]?.model?.trim() || '',
    hardwareUuid,
    machineId,
    boardSerial,
    systemModel,
    macs,
    network,
    diskSerial,
    username: userInfo().username,
    homedir: homedir(),
    uptime: uptime(),
  }
}

async function activateLicense(licenseKey) {
  const machine = collectFingerprint()

  const validation = await validateLicense(licenseKey, machine)
  const canActivate = validation.valid || ['NO_MACHINES', 'FINGERPRINT_SCOPE_MISMATCH'].includes(validation.code)
  if (!canActivate) throw new Error(validation.message)

  const licenses = await api(`/licenses?key=${encodeURIComponent(licenseKey)}`)
  const licenseId = licenses.data?.[0]?.id
  if (!licenseId) throw new Error('License not found')

  const existingMachines = await api(`/machines?license=${licenseId}`)
  let machineRes = existingMachines.data?.find(
    existing => existing.attributes?.fingerprint === machine.fingerprint,
  )
  const reused = Boolean(machineRes)

  if (!machineRes) {
    const created = await api('/machines', {
      method: 'POST',
      body: {
        data: {
          type: 'machines',
          attributes: {
            fingerprint: machine.fingerprint,
            name: machine.name,
            hostname: machine.hostname,
            platform: machine.platform,
            cores: machine.cores,
            memory: machine.memory,
            metadata: {
              cpuModel: machine.cpuModel,
              macAddresses: machine.macs.join(', '),
              networkInterfaces: JSON.stringify(machine.network),
              diskSerial: machine.diskSerial,
              arch: machine.arch,
              hardwareUuid: machine.hardwareUuid,
              machineId: machine.machineId,
              boardSerial: machine.boardSerial,
              systemModel: machine.systemModel,
              username: machine.username,
              homedir: machine.homedir,
              uptime: String(machine.uptime),
            },
          },
          relationships: { license: { data: { type: 'licenses', id: licenseId } } },
        },
      },
    })
    machineRes = created.data
  }

  const revalidation = await api('/licenses/actions/validate-key', {
    method: 'POST',
    body: { meta: { key: licenseKey, scope: { fingerprint: machine.fingerprint } } },
  })

  return {
    machine,
    machineId: machineRes.id,
    licenseId,
    reused,
    valid: revalidation.meta?.valid,
    code: revalidation.meta?.code,
  }
}

const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>License Activation Demo</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #071014; color: #f6fff9; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    [hidden] { display: none !important; }
    main { width: min(560px, calc(100vw - 32px)); border: 1px solid #1f323a; border-radius: 22px; padding: 28px; background: linear-gradient(180deg, #0b171d, #081015); box-shadow: 0 24px 80px #0009; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 24px; color: #9dafb8; }
    label { display: block; margin-bottom: 8px; font-size: 14px; color: #c7d5da; }
    input { width: 100%; box-sizing: border-box; padding: 15px 16px; border: 1px solid #263b44; border-radius: 14px; background: #030a0d; color: #f6fff9; font-size: 16px; outline: none; }
    input:focus { border-color: #6df690; box-shadow: 0 0 0 4px #6df6901f; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    button { width: 100%; padding: 15px 16px; border: 0; border-radius: 14px; background: #6df690; color: #041008; font-weight: 800; font-size: 16px; cursor: pointer; }
    button.secondary { background: #17242b; color: #d8e8ee; border: 1px solid #2a3d46; }
    button:disabled { opacity: .65; cursor: wait; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 18px 0 0; padding: 16px; border-radius: 14px; background: #030a0d; border: 1px solid #1f323a; color: #bfe8cb; }
    .error { color: #ff9aa8; }
    .welcome { display: grid; gap: 16px; }
    .badge { width: fit-content; padding: 7px 11px; border-radius: 999px; background: #6df6901f; color: #6df690; border: 1px solid #6df69055; font-weight: 800; font-size: 13px; }
    .panel { padding: 16px; border-radius: 16px; background: #030a0d; border: 1px solid #1f323a; color: #c7d5da; }
    .panel strong { color: #f6fff9; }
    .muted { color: #9dafb8; }
  </style>
</head>
<body>
  <main>
    <div id="screen"></div>
  </main>
  <script>
    const screen = document.querySelector('#screen')
    let currentKey = new URLSearchParams(location.search).get('key') || ''

    function setLoading(loading) {
      const buttons = Array.from(document.querySelectorAll('button'))
      for (const button of buttons) button.disabled = loading
    }

    function show(text, error = false) {
      const result = document.querySelector('#result')
      result.hidden = false
      result.className = error ? 'error' : ''
      result.textContent = text
    }

    async function readJson(res) {
      const text = await res.text()
      try {
        return text ? JSON.parse(text) : {}
      } catch {
        throw new Error('Server returned non-JSON response (' + res.status + '): ' + text.slice(0, 300))
      }
    }

    function renderActivation() {
      screen.innerHTML = [
        '<h1>Activate License</h1>',
        '<p>Nhập license key được cấp để kích hoạt máy hiện tại.</p>',
        '<form id="form">',
        '  <label for="key">License key</label>',
        '  <input id="key" name="key" placeholder="XXXXXX-XXXXXX-XXXXXX" autocomplete="off" required />',
        '  <div class="actions">',
        '    <button class="secondary" type="button" id="check">Check license</button>',
        '    <button type="submit">Activate this machine</button>',
        '  </div>',
        '</form>',
        '<pre id="result" hidden></pre>',
      ].join('')

      document.querySelector('#key').value = currentKey
      document.querySelector('#check').addEventListener('click', checkCurrentLicense)
      document.querySelector('#form').addEventListener('submit', async event => {
        event.preventDefault()
        currentKey = document.querySelector('#key').value.trim()
        await activateCurrentLicense()
      })
    }

    function renderWelcome(data) {
      screen.innerHTML = [
        '<section class="welcome">',
        '  <span class="badge">LICENSE VERIFIED</span>',
        '  <h1>Welcome to Demo App</h1>',
        '  <p>License hợp lệ. User được phép vào ứng dụng.</p>',
        '  <div class="panel">',
        '    <strong>License status:</strong> ' + (data.code || 'VALID') + '<br>',
        '    <strong>Message:</strong> ' + data.message + '<br>',
        '    <strong>License key:</strong> <span class="muted">' + currentKey + '</span>',
        '  </div>',
        '  <div class="actions">',
        '    <button class="secondary" type="button" id="change">Change license</button>',
        '    <button type="button" id="activate">Activate this machine</button>',
        '  </div>',
        '  <pre id="result" hidden></pre>',
        '</section>',
      ].join('')

      document.querySelector('#change').addEventListener('click', renderActivation)
      document.querySelector('#activate').addEventListener('click', activateCurrentLicense)
    }

    async function activateCurrentLicense() {
      if (!currentKey) return show('ERROR: Chưa nhập license key.', true)

      setLoading(true)
      show('Activating this machine...')

      try {
        const res = await fetch('/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: currentKey }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(data.error || 'Activation failed')

        show([
          data.reused ? 'ALREADY ACTIVATED' : 'ACTIVATION SUCCESS',
          'Machine ID: ' + data.machineId,
          'License ID: ' + data.licenseId,
          'Hostname: ' + data.machine.hostname,
          'Fingerprint: ' + data.machine.fingerprint,
          'Validation: ' + data.code + ' (valid: ' + data.valid + ')',
        ].join('\\n'))
      } catch (error) {
        show('ACTIVATION FAILED: ' + error.message, true)
      } finally {
        setLoading(false)
      }
    }

    async function checkCurrentLicense() {
      currentKey = document.querySelector('#key').value.trim()
      if (!currentKey) return show('ERROR: Chưa nhập license key.', true)

      setLoading(true)
      show('Checking license...')

      try {
        const res = await fetch('/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: currentKey }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(data.error || 'Check failed')

        if (data.valid) renderWelcome(data)
        else show([
          'LICENSE NOT VALID',
          'Code: ' + (data.code || '(none)'),
          'Message: ' + data.message,
        ].join('\\n'), true)
      } catch (error) {
        show('ERROR: ' + error.message, true)
      } finally {
        setLoading(false)
      }
    }

    renderActivation()
  </script>
</body>
</html>`

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (req.method === 'POST' && url.pathname === '/activate') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!body.licenseKey) throw new Error('License key is required')

      const result = await activateLicense(body.licenseKey)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    if (req.method === 'POST' && url.pathname === '/validate') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!body.licenseKey) throw new Error('License key is required')

      const result = await validateLicense(body.licenseKey)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    res.writeHead(404)
    res.end('Not found')
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: error.message }))
  }
}).listen(PORT, () => {
  console.log(`License activation demo: http://localhost:${PORT}`)
})
