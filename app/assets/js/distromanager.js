const { DistributionAPI } = require('helios-core/common')

const ConfigManager = require('./configmanager')

// Default game-version based launcher mode instead of a remote distro index.
exports.REMOTE_DISTRO_URL = ''

const DEFAULT_GAME_VERSION = '1.20.1'

function resolveSelectedGameVersion(){
    try {
        if(ConfigManager.isLoaded() && typeof ConfigManager.getGameVersion === 'function'){
            const configured = ConfigManager.getGameVersion()
            if(typeof configured === 'string' && configured.trim().length > 0){
                return configured.trim()
            }
        }
    } catch (_err) {
        // Fall through to default value.
    }

    return DEFAULT_GAME_VERSION
}

function normalizeServerId(version){
    return `mc-version-${version.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
}

function buildDefaultDistribution(){
    const selectedVersion = resolveSelectedGameVersion()
    const serverId = normalizeServerId(selectedVersion)
    const server = {
        rawServer: {
            id: serverId,
            name: `Minecraft ${selectedVersion}`,
            description: 'Version de jeu locale par défaut.',
            icon: '',
            version: selectedVersion,
            address: 'localhost',
            minecraftVersion: selectedVersion,
            mainServer: true,
            autoconnect: false,
            versionOnly: true,
            javaOptions: {
                distribution: null,
                suggestedMajor: 25,
                supported: ['>=25.x']
            }
        },
        modules: [],
        effectiveJavaOptions: {
            supported: '>=25.x',
            memory: { minimum: 2048, recommended: 4096 },
            distribution: null,
            suggestedMajor: 25
        }
    }

    return {
        servers: [server],
        rawDistribution: {
            rss: null,
            discord: null
        },
        getServerById(id){
            if(id == null){
                return this.servers[0]
            }
            return this.servers.find(serv => serv.rawServer.id === id) || this.servers[0]
        },
        getMainServer(){
            return this.servers[0]
        }
    }
}

const api = new DistributionAPI(
    ConfigManager.getLauncherDirectory(),
    null, // Injected forcefully by the preloader.
    null, // Injected forcefully by the preloader.
    exports.REMOTE_DISTRO_URL,
    false
)

api.getDistribution = async function(){
    return buildDefaultDistribution()
}

api.refreshDistributionOrFallback = async function(){
    return buildDefaultDistribution()
}

exports.DistroAPI = api