import { ApolloConfig, GatewayConfig as SplitServicesGatewayConfig, ServiceConfig } from 'apollo-cli-plugin-split-services'
import {
  ApolloGateway,
  GatewayConfig,
  ServiceEndpointDefinition
} from '@apollo/gateway'
import { ApolloServer, ApolloServerExpressConfig } from 'apollo-server-express'
import { ServerInfo, ApolloServer as NormalApolloServer } from 'apollo-server'
import * as nodePath from 'path'
import { ConsoleError, GetServiceList, RemoteGatewayConfig, Require } from './interfaces'

/**
 * Goes through the apollo configuration and pull services from it in a way that is friendly to Apollo's Server.
 *
 * @param apolloConfig - Apollo configuration based off of the apollo.config.js file.
 * @param error - Error logging function.
 * @param requireModule - NodeJS require.
 * @param path - NodeJS path module.
 * @param cwd - Current working directory.
 */
export const getServiceList: GetServiceList = function getServiceList (
  apolloConfig: ApolloConfig<SplitServicesGatewayConfig>,
  error: ConsoleError = console.error,
  requireModule: Require = require,
  path: typeof nodePath = nodePath,
  cwd: string = process.cwd()
): ServiceEndpointDefinition[] {
  const thisPath = path.resolve(__dirname)
  return (apolloConfig as ApolloConfig<SplitServicesGatewayConfig>).splitServices.services.reduce<ServiceEndpointDefinition[]>((accumulator, service) => {
    const apolloConfigPath = service.apolloConfigPath || 'apollo.config.js'
    const serviceConfigAbsolutePath = path.resolve(cwd, service.directory, apolloConfigPath)
    const serviceApolloConfig: ApolloConfig<ServiceConfig> = requireModule(path.relative(thisPath, serviceConfigAbsolutePath))
    if (!serviceApolloConfig.splitServices || !serviceApolloConfig.splitServices.url) {
      error(`Could not find URL for service ${service.name}, please list it in the apollo.config.js file in the service project.`)
      return accumulator
    }

    return [...accumulator, { name: service.name, url: `${serviceApolloConfig.splitServices.url}` }]
  }, [])
}

/**
 * Creates a gateway server that will be managed or unmanged. Unmanaged configuration is automatically loaded from the apollo.config.js
 * file while a managed service relies on Apollo's Graph Manager.
 *
 * @param apolloConfig - Apollo configuration based off of the apollo.config.js file.
 * @param Server - {@link ApolloServer}
 * @param Gateway - {@link ApolloGateway}
 * @param gatewayConfig - Gateway configuration for Apollo {@link GatewayConfig}
 * @param serverConfig - Server configuration for Apollo Server {@link ApolloServerExpressConfig}
 * @param retrieveServiceList - {@link GetServiceList}
 */
export function createGateway (
  apolloConfig: ApolloConfig<SplitServicesGatewayConfig>,
  Server: typeof ApolloServer,
  Gateway: typeof ApolloGateway,
  gatewayConfig: GatewayConfig = {},
  serverConfig: ApolloServerExpressConfig = {},
  retrieveServiceList: GetServiceList = getServiceList
): ApolloServer {
  if (!process.env.ENGINE_API_KEY) {
    (gatewayConfig as RemoteGatewayConfig).serviceList = retrieveServiceList(apolloConfig)
  }

  if (!process.env.ENGINE_API_KEY && !gatewayConfig.experimental_pollInterval) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    gatewayConfig.experimental_pollInterval = 10000
  }

  if (process.env.ENGINE_API_KEY) {
    serverConfig.engine = {
      apiKey: process.env.ENGINE_API_KEY,
      schemaTag: process.env.ENGINE_SCHEMA_TAG
    }
  }

  return new Server({
    gateway: new Gateway(gatewayConfig),
    subscriptions: false, // Subscriptions are not yet supported by @apollo/gateway.
    ...serverConfig
  })
}

/**
 * @deprecated since version v1.1.0. - starting the gateway ends up being more trouble than what it is worth and will be replaced by {@link createGateway}
 * @param apolloConfig - apollo.config.js configuration.
 * @param Server - Apollo server from the base apollo-server or apollo-server-express etc...
 * @param gatewayConfig - Gateway configuration that Apollo is expecting {@link GatewayConfig}
 * @param serverConfig - Server configuration for Apollo Server {@link ApolloServerExpressConfig}
 */
export function startGateway (apolloConfig: ApolloConfig<SplitServicesGatewayConfig>, Server: typeof NormalApolloServer, gatewayConfig: GatewayConfig = {}, serverConfig: ApolloServerExpressConfig = {}): Promise<ServerInfo> {
  if (!process.env.ENGINE_API_KEY) {
    (gatewayConfig as RemoteGatewayConfig).serviceList = getServiceList(apolloConfig)
  }

  if (!process.env.ENGINE_API_KEY && !gatewayConfig.experimental_pollInterval) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    gatewayConfig.experimental_pollInterval = 10000
  }

  return new Server({
    gateway: new ApolloGateway(gatewayConfig),
    subscriptions: false, // Subscriptions are not yet supported by @apollo/gateway.
    ...serverConfig
  }).listen()
}
