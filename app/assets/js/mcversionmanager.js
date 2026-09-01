const https = require('https')
const fs = require('fs')

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const FALLBACK_VERSION_MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
const CACHE_TTL = 5 * 60 * 1000

let cache = null
let lastFetch = 0

// ------------------------------------------------------------
// Fetch JSON helper
// ------------------------------------------------------------
function fetchJson(url){
    return new Promise((resolve, reject) => {
        const req = https.get(url, res => {
            if(!res.statusCode || res.statusCode < 200 || res.statusCode >= 300){
                reject(new Error(`Failed to fetch JSON (${res.statusCode || 'unknown'})`))
                res.resume()
                return
            }

            let raw = ''
            res.setEncoding('utf8')
            res.on('data', chunk => raw += chunk)
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw))
                } catch (err) {
                    reject(err)
                }
            })
        })

        req.on('error', reject)
    })
}

// ------------------------------------------------------------
// Download file helper (used for jars)
// ------------------------------------------------------------
function downloadFile(url, output){
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(output)

        https.get(url, res => {
            if(res.statusCode !== 200){
                reject(new Error(`Failed to download file (${res.statusCode})`))
                return
            }

            res.pipe(file)
            file.on('finish', () => file.close(resolve))
        }).on('error', reject)
    })
}

// ------------------------------------------------------------
// Fetch global manifest (list of versions)
// ------------------------------------------------------------
async function fetchVersionManifest(){
    try {
        return await fetchJson(VERSION_MANIFEST_URL)
    } catch {
        return await fetchJson(FALLBACK_VERSION_MANIFEST_URL)
    }
}

// ------------------------------------------------------------
// Clean manifest structure
// ------------------------------------------------------------
function mapManifest(manifest){
    const latest = manifest.latest || {}
    const versions = Array.isArray(manifest.versions) ? manifest.versions : []

    return {
        latest,
        versions: versions.map(v => ({
            id: v.id,
            type: v.type,
            time: v.time,
            releaseTime: v.releaseTime,
            url: v.url
        }))
    }
}

// ------------------------------------------------------------
// Public: get list of Minecraft versions
// ------------------------------------------------------------
exports.getMinecraftVersions = async function(forceRefresh = false){
    const now = Date.now()

    if(!forceRefresh && cache && (now - lastFetch) < CACHE_TTL){
        return cache
    }

    const manifest = await fetchVersionManifest()
    cache = mapManifest(manifest)
    lastFetch = now

    return cache
}

// ------------------------------------------------------------
// Public: get details of a specific version (contains jar URLs)
// ------------------------------------------------------------
exports.getVersionDetails = async function(version){
    return await fetchJson(version.url)
}

// ------------------------------------------------------------
// Public: download client jar for a version
// ------------------------------------------------------------
exports.downloadClientJar = async function(version, outputPath = `./${version.id}.jar`){
    const details = await fetchJson(version.url)

    if(!details.downloads || !details.downloads.client){
        throw new Error(`Client jar not found for version ${version.id}`)
    }

    const jarUrl = details.downloads.client.url
    await downloadFile(jarUrl, outputPath)

    return outputPath
}
