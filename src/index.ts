import { ApolloConfig, GatewayConfig as SplitServicesGatewayConfig, ServiceConfig } from 'apollo-cli-plugin-split-services'
import {
  ApolloGateway,
  GatewayConfig,
  ServiceEndpointDefinition,
  Experimental_DidFailCompositionCallback as ExperimentalDidFailCompositionCallback,
  Experimental_DidResolveQueryPlanCallback as ExperimentalDidResolveQueryPlanCallback,
  Experimental_UpdateServiceDefinitions as ExperimentalUpdateServiceDefinition,
  Experimental_DidUpdateCompositionCallback as ExperimentalDidUpdateCompositionCallback,
  GraphQLDataSource
} from '@apollo/gateway'
import { ApolloServer, ServerInfo } from 'apollo-server'
import * as path from 'path'
import { ServiceDefinition } from '@apollo/federation'

/**
 * This code is directly copied from Apollo https://github.com/apollographql/apollo-server/blob/fe3e928c8b55afff5ad0e216490c3c7adb85031c/packages/apollo-gateway/src/index.ts
 * I opened a Feature request for them to export these methods here https://github.com/apollographql/apollo-server/issues/3591
 */
interface GatewayConfigBase {
  debug?: boolean
  // TODO: expose the query plan in a more flexible JSON format in the future
  // and remove this config option in favor of `exposeQueryPlan`. Playground
  // should cutover to use the new option when it's built.
  __exposeQueryPlanExperimental?: boolean
  buildService?: (definition: ServiceEndpointDefinition) => GraphQLDataSource

  // experimental observability callbacks
  experimental_didResolveQueryPlan?: ExperimentalDidResolveQueryPlanCallback
  experimental_didFailComposition?: ExperimentalDidFailCompositionCallback
  experimental_updateServiceDefinitions?: ExperimentalUpdateServiceDefinition
  experimental_didUpdateComposition?: ExperimentalDidUpdateCompositionCallback
  experimental_pollInterval?: number
}

interface RemoteGatewayConfig extends GatewayConfigBase {
  serviceList: ServiceEndpointDefinition[]
  introspectionHeaders?: HeadersInit
}

interface ManagedGatewayConfig extends GatewayConfigBase {
  federationVersion?: number
}
interface LocalGatewayConfig extends GatewayConfigBase {
  localServiceList: ServiceDefinition[]
}
// End code that was copied from Apollo

export function getServiceList (apolloConfig: ApolloConfig<SplitServicesGatewayConfig>): ServiceEndpointDefinition[] {
  const thisPath = path.resolve(__dirname)
  const cwd = process.cwd()
  return (apolloConfig as ApolloConfig<SplitServicesGatewayConfig>).splitServices.services.reduce<ServiceEndpointDefinition[]>((accumulator, service) => {
    const apolloConfigPath = service.apolloConfigPath || 'apollo.config.js'
    const serviceConfigAbsolutePath = path.resolve(cwd, service.directory, apolloConfigPath)
    console.log('apolloConfigPath', apolloConfigPath)
    console.log('serviceConfigAbsolutePath', serviceConfigAbsolutePath)
    console.log('relativePath', path.relative(thisPath, serviceConfigAbsolutePath))
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceApolloConfig: ApolloConfig<ServiceConfig> = require(path.relative(thisPath, serviceConfigAbsolutePath))
    if (!serviceApolloConfig.splitServices.url) {
      console.error(`Could not find URL for service ${service.name}, please list it in the apollo.config.js file in the service project.`)
      return accumulator
    }

    return [...accumulator, { name: service.name, url: `${serviceApolloConfig.splitServices.url}/graphql` }]
  }, [])
}

export function startGateway (apolloConfig: ApolloConfig<SplitServicesGatewayConfig>, Server: typeof ApolloServer, gatewayConfig: GatewayConfig = {}): Promise<ServerInfo> {
  if (!process.env.ENGINE_API_KEY) {
    (gatewayConfig as RemoteGatewayConfig).serviceList = getServiceList(apolloConfig)
  }

  if (!process.env.ENGINE_API_KEY && !gatewayConfig.experimental_pollInterval) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    gatewayConfig.experimental_pollInterval = 10000
  }

  return new Server({
    gateway: new ApolloGateway(gatewayConfig),
    subscriptions: false // Subscriptions are not yet supported by @apollo/gateway.
  }).listen()
}
