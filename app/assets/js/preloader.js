const {ipcRenderer}  = require('electron')
const fs             = require('fs-extra')
const os             = require('os')
const path           = require('path')

const ConfigManager  = require('./configmanager')
const { DistroAPI }  = require('./distromanager')
const LangLoader     = require('./langloader')
const { LoggerUtil } = require('helios-core')
// eslint-disable-next-line no-unused-vars
const { EmeraldDistribution } = require('helios-core/common')

const logger = LoggerUtil.getLogger('Preloader')

logger.info('Loading..')

// Load ConfigManager
ConfigManager.load()

// Yuck!
// TODO Fix this
DistroAPI['commonDir'] = ConfigManager.getCommonDirectory()
DistroAPI['instanceDir'] = ConfigManager.getInstanceDirectory()

// Load Strings
LangLoader.setupLanguage()

/**
 * 
 * @param {EmeraldDistribution} data 
 */
function onDistroLoad(data){
    const resolvedData = data

    if(resolvedData != null && ConfigManager.getSelectedServer() == null){
        const mainServer = resolvedData.getMainServer()
        if(mainServer != null){
            ConfigManager.setSelectedServer(mainServer.rawServer.id)
            ConfigManager.save()
        }
    }

    ipcRenderer.send('distributionIndexDone', resolvedData != null)
}

;(async () => {
    try {
        const distro = await DistroAPI.getDistribution()
        DistroAPI.rawDistribution = distro.rawDistribution
        DistroAPI.distribution = distro
        setTimeout(() => {
            onDistroLoad(distro)
        }, 250)
    } catch (err) {
        logger.error('Failed to initialize default distribution.', err)
        setTimeout(() => {
            onDistroLoad(null)
        }, 250)
    }
})()

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Error while cleaning natives directory', err)
    } else {
        logger.info('Cleaned natives directory.')
    }
})