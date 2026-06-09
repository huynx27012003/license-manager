import { createHash } from 'node:crypto'
import { cpus, networkInterfaces, hostname, totalmem, arch, platform, release, userInfo, homedir, uptime } from 'node:os'
import { execSync } from 'node:child_process'

const API = 'http://192.168.4.67:3000/v1'
const EMAIL = 'admin@example.com'
const PASSWORD = 'cac574a29b02b389cfe43d8d'

// Override bằng env vars để dùng resource có sẵn.
// Luồng client thật chỉ cần LICENSE_KEY; PRODUCT_ID/POLICY_ID chỉ để in log khi bạn muốn reuse demo auto-gen.
const PRODUCT_ID = process.env.PRODUCT_ID || ''
const POLICY_ID = process.env.POLICY_ID || ''
const LICENSE_KEY = process.env.LICENSE_KEY || ''

let token = null

function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

async function api(path, { method = 'GET', body, accept } = {}) {
  const headers = {
    'Accept': accept || 'application/vnd.api+json',
    'Keygen-Version': '1.8',
  }
  if (body) {
    headers['Content-Type'] = 'application/vnd.api+json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body && JSON.stringify(body),
  })
  const text = await res.text()
  try { return { status: res.status, data: JSON.parse(text) } }
  catch { return { status: res.status, data: text } }
}

function collectFingerprint() {
  const nets = networkInterfaces()
  const network = Object.entries(nets).flatMap(([name, addresses]) =>
    (addresses || []).filter(Boolean).map(address => ({ name, address: address.address, family: address.family, mac: address.mac, internal: address.internal, cidr: address.cidr })),
  )
  const macs = network.map(n => n.mac).filter(m => m && m !== '00:00:00:00:00:00')

  let diskSerial = ''
  let hardwareUuid = ''
  let machineId = ''
  let boardSerial = ''
  let systemModel = ''
  try {
    const out = execSync(
      process.platform === 'darwin'
        ? 'system_profiler SPStorageDataType 2>/dev/null | grep -i "Serial Number" | head -1 | awk \'{print $3}\''
        : process.platform === 'linux'
          ? 'cat /sys/block/sda/serial 2>/dev/null || cat /sys/block/nvme0n1/serial 2>/dev/null || echo ""'
          : 'wmic diskdrive get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 }
    ).trim()
    diskSerial = out
  } catch {}
  try {
    hardwareUuid = execSync(
      process.platform === 'darwin'
        ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/IOPlatformUUID/{print $4}\''
        : process.platform === 'linux'
          ? 'cat /sys/class/dmi/id/product_uuid 2>/dev/null || echo ""'
          : 'wmic csproduct get uuid 2>/dev/null | findstr /v "UUID" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 }
    ).trim()
  } catch {}
  try {
    machineId = execSync(
      process.platform === 'linux'
        ? 'cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/IOPlatformSerialNumber/{print $4}\''
          : 'wmic bios get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 }
    ).trim()
  } catch {}
  try {
    boardSerial = execSync(
      process.platform === 'linux'
        ? 'cat /sys/class/dmi/id/board_serial 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'ioreg -rd1 -c IOPlatformExpertDevice | awk -F\" \'/board-id/{print $4}\''
          : 'wmic baseboard get serialnumber 2>/dev/null | findstr /v "SerialNumber" | tr -d " " || echo ""',
      { encoding: 'utf8', timeout: 5000 }
    ).trim()
  } catch {}
  try {
    systemModel = execSync(
      process.platform === 'linux'
        ? 'cat /sys/class/dmi/id/product_name 2>/dev/null || echo ""'
        : process.platform === 'darwin'
          ? 'sysctl -n hw.model 2>/dev/null || echo ""'
          : 'wmic computersystem get model 2>/dev/null | findstr /v "Model" || echo ""',
      { encoding: 'utf8', timeout: 5000 }
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

  const fingerprint = createHash('sha256').update(fingerprintRaw).digest('hex')

  return {
    fingerprint,
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

async function main() {
  console.log('\n=== Keygen License Activation Demo ===\n')

  // 0. Login
  console.log('0. Authenticating...')
  const loginRes = await fetch(`${API}/tokens`, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth(EMAIL, PASSWORD),
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      'Keygen-Version': '1.8',
    },
    body: JSON.stringify({ data: { type: 'tokens', attributes: {} } }),
  })
  const loginData = await loginRes.json()
  token = loginData.data?.attributes?.token
  if (!token) {
    console.error('Login failed:', JSON.stringify(loginData.errors?.[0]?.detail || loginData))
    process.exit(1)
  }
  console.log(`   Token: ${token.substring(0, 16)}...`)

  // Collect machine fingerprint
  const machine = collectFingerprint()
  console.log('\nMachine Fingerprint:')
  console.log(`  Hostname: ${machine.name}`)
  console.log(`  Platform: ${machine.platform}`)
  console.log(`  CPU: ${machine.cpuModel} (${machine.cores} cores)`)
  console.log(`  MACs: ${machine.macs.join(', ')}`)
  console.log(`  Disk Serial: ${machine.diskSerial || '(not available)'}`)
  console.log(`  Fingerprint: ${machine.fingerprint}`)
  console.log()

  let licenseId, licenseKey

  if (LICENSE_KEY) {
    console.log('Using existing license:')
    if (PRODUCT_ID) console.log(`  Product: ${PRODUCT_ID}`)
    if (POLICY_ID) console.log(`  Policy:  ${POLICY_ID}`)
    console.log(`  License: ${LICENSE_KEY}`)
    licenseKey = LICENSE_KEY

    // Lấy license ID từ key
    const { data: lookup } = await api(`/licenses?key=${encodeURIComponent(LICENSE_KEY)}`)
    if (!lookup.data?.length) {
      console.error('   License not found!')
      process.exit(1)
    }
    licenseId = lookup.data[0].id
    console.log(`  License ID: ${licenseId}\n`)
  } else {
    // 1. Create product
    console.log('1. Creating product...')
    const { data: prodRes } = await api('/products', {
      method: 'POST',
      body: { data: { type: 'products', attributes: { name: 'Test App ' + Date.now() } } },
    })
    const productId = prodRes.data.id
    console.log(`   Product ID: ${productId}`)
    console.log(`   (set env PRODUCT_ID=${productId} to reuse)`)

    // 2. Create policy
    console.log('2. Creating policy (max_machines=2)...')
    const { data: polRes } = await api('/policies', {
      method: 'POST',
      body: {
        data: {
          type: 'policies',
          attributes: { name: 'Test Policy (2 devices)', max_machines: 2, strict: true, floating: true },
          relationships: { product: { data: { type: 'products', id: productId } } },
        },
      },
    })
    const policyId = polRes.data.id
    console.log(`   Policy ID: ${policyId}`)
    console.log(`   (set env POLICY_ID=${policyId} to reuse)`)

    // 3. Create license
    console.log('3. Creating license...')
    const { data: licRes } = await api('/licenses', {
      method: 'POST',
      body: {
        data: {
          type: 'licenses',
          attributes: { name: 'Test License' },
          relationships: { policy: { data: { type: 'policies', id: policyId } } },
        },
      },
    })
    licenseId = licRes.data.id
    licenseKey = licRes.data.attributes.key
    console.log(`   License ID: ${licenseId}`)
    console.log(`   License Key: ${licenseKey}`)
    console.log(`   (set env LICENSE_KEY=${licenseKey} to reuse)`)

    console.log('\n   --- To reuse these resources next time, run: ---')
    console.log(`   PRODUCT_ID=${productId} POLICY_ID=${policyId} LICENSE_KEY=${licenseKey} node test-app/index.mjs\n`)
  }

  // 4. Validate license key (anonymous)
  console.log('4. Validating license key...')
  const { data: valRes } = await api('/licenses/actions/validate-key', {
    method: 'POST',
    body: { meta: { key: licenseKey, scope: { fingerprint: machine.fingerprint } } },
  })
  console.log(`   Status: ${valRes.meta.code} (valid: ${valRes.meta.valid})`)
  if (!valRes.meta.valid && !['NO_MACHINES', 'FINGERPRINT_SCOPE_MISMATCH'].includes(valRes.meta.code)) {
    console.error('   Validation failed!')
    process.exit(1)
  }

  // 5. Activate machine
  console.log('5. Activating machine...')
  const { data: machRes } = await api('/machines', {
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
  const machineId = machRes.data.id
  console.log(`   Machine ID: ${machineId}`)

  // 6. Re-validate with fingerprint
  console.log('6. Re-validating with fingerprint...')
  const { data: val2Res } = await api('/licenses/actions/validate-key', {
    method: 'POST',
    body: { meta: { key: licenseKey, scope: { fingerprint: machine.fingerprint } } },
  })
  console.log(`   Status: ${val2Res.meta.code} (valid: ${val2Res.meta.valid})`)

  console.log('\n=== ✅ SUCCESS ===')
  console.log(`License Key: ${licenseKey}`)
  console.log(`Machine activated: ${machine.name}`)
  console.log(`Policy: max 2 device(s)`)
  console.log('\nTry running this script on another machine to test the 2-device limit!\n')
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
