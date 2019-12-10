import { ApolloConfig, GatewayConfig as SplitServicesGatewayConfig, ServiceConfig } from 'apollo-cli-plugin-split-services'
import {
  ApolloGateway,
  GatewayConfig,
  ServiceEndpointDefinition
} from '@apollo/gateway'
import { ApolloServer, ServerInfo } from 'apollo-server'
import * as path from 'path'
import { ConsoleError, GetServiceList, PathRelative, PathResolve, RemoteGatewayConfig, Require } from './interfaces'

export const getServiceList: GetServiceList = function getServiceList (
  apolloConfig: ApolloConfig<SplitServicesGatewayConfig>,
  error: ConsoleError = console.error,
  requireModule: Require = require,
  pathResolve: PathResolve = path.resolve,
  pathRelative: PathRelative = path.relative,
  cwd: string = process.cwd()
): ServiceEndpointDefinition[] {
  const thisPath = pathResolve(__dirname)
  return (apolloConfig as ApolloConfig<SplitServicesGatewayConfig>).splitServices.services.reduce<ServiceEndpointDefinition[]>((accumulator, service) => {
    const apolloConfigPath = service.apolloConfigPath || 'apollo.config.js'
    const serviceConfigAbsolutePath = pathResolve(cwd, service.directory, apolloConfigPath)
    const serviceApolloConfig: ApolloConfig<ServiceConfig> = requireModule(pathRelative(thisPath, serviceConfigAbsolutePath))
    if (!serviceApolloConfig.splitServices || !serviceApolloConfig.splitServices.url) {
      error(`Could not find URL for service ${service.name}, please list it in the apollo.config.js file in the service project.`)
      return accumulator
    }

    return [...accumulator, { name: service.name, url: `${serviceApolloConfig.splitServices.url}` }]
  }, [])
}

/**
 * Starts the GraphQL Gateway.
 *
 * @param apolloConfig - Apollo configuration based off of the apollo.config.js file.
 * @param Server - {@link ApolloServer}
 * @param Gateway - {@link ApolloGateway}
 * @param gatewayConfig - {@link GatewayConfig}
 * @param retrieveServiceList - {@link GetServiceList}
 */
export function startGateway (
  apolloConfig: ApolloConfig<SplitServicesGatewayConfig>,
  Server: typeof ApolloServer,
  Gateway: typeof ApolloGateway,
  gatewayConfig: GatewayConfig = {},
  retrieveServiceList: GetServiceList = getServiceList
): Promise<ServerInfo> {
  if (!process.env.ENGINE_API_KEY) {
    (gatewayConfig as RemoteGatewayConfig).serviceList = retrieveServiceList(apolloConfig)
  }

  if (!process.env.ENGINE_API_KEY && !gatewayConfig.experimental_pollInterval) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    gatewayConfig.experimental_pollInterval = 10000
  }

  return new Server({
    gateway: new Gateway(gatewayConfig),
    subscriptions: false // Subscriptions are not yet supported by @apollo/gateway.
  }).listen()
}
