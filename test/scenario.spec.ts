import {ContractsInstancesOrigin, ITestEnv} from "../utils/types"

import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {configuration as actionsConfiguration, deposit} from "./actions"
import {configuration as calculationsConfiguration} from "./utils/calculations"
import {executeStory, Scenario, Story} from "./engine/scenario-engine"
import fs from "fs"
import BigNumber from "bignumber.js"
import { ETHEREUM_ADDRESS } from "../utils/constants"

BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN })


const scenarioFolder = "./test/scenarios/"

fs.readdirSync(scenarioFolder).forEach(file => {
//  if (file !== "interest-redirection-negatives.json"  &&
//      file !== "interest-redirection.json" ) return

  const scenario = require(`./scenarios/${file}`)

  contract(scenario.title, async ([deployer, ...users]) => {
    let _testEnvProvider: ITestEnv

    before("Initializing configuration", async () => {
      _testEnvProvider = await testEnvProvider(
        artifacts,
        [deployer, ...users],
        ContractsInstancesOrigin.TruffleArtifacts,
      )

      const {
        deployedInstances: {
          lendingPoolInstance,
          lendingPoolCoreInstance
        },
        getWeb3,
        getReservesParams
      } = _testEnvProvider

      actionsConfiguration.lendingPoolInstance = lendingPoolInstance
      actionsConfiguration.lendingPoolCoreInstance = lendingPoolCoreInstance
      actionsConfiguration.ethereumAddress = ETHEREUM_ADDRESS
      actionsConfiguration.artifacts = artifacts
      actionsConfiguration.web3 = await getWeb3()
      actionsConfiguration.skipIntegrityCheck = false //set this to true to execute solidity-coverage
  
      calculationsConfiguration.reservesParams = await getReservesParams()
      calculationsConfiguration.web3 = actionsConfiguration.web3
      calculationsConfiguration.ethereumAddress = actionsConfiguration.ethereumAddress
    })

    for (const story of scenario.stories) {
      it(story.description, async () => {
        await executeStory(story, users)
      })
    }
  })
})
