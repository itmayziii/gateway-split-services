import * as nodePath from 'path'
import {
  Experimental_DidFailCompositionCallback as ExperimentalDidFailCompositionCallback,
  Experimental_DidResolveQueryPlanCallback as ExperimentalDidResolveQueryPlanCallback,
  Experimental_DidUpdateCompositionCallback as ExperimentalDidUpdateCompositionCallback,
  Experimental_UpdateServiceDefinitions as ExperimentalUpdateServiceDefinition,
  GraphQLDataSource,
  ServiceEndpointDefinition,
} from '@apollo/gateway'
import { ServiceDefinition } from '@apollo/federation'
import { ApolloConfig } from 'apollo-cli-plugin-split-services'
import { GatewayConfig as SplitServicesGatewayConfig } from 'apollo-cli-plugin-split-services/dist/interfaces/apollo-config'

export type ConsoleError = typeof console.error
export type Require = typeof require

/**
 * Get a list of services based on the apollo.config.js file.
 */
export interface GetServiceList {
  /**
   * @param apolloConfig - Apollo gateway configuration based off of the apollo.config.js file.
   * @param error - Function to log errors with.
   * @param requireModule - {@link Require}
   * @param path - NodeJS path module.
   * @param cwd - Current working directory.
   * @returns A list of services based on the apollo.config.js file.
   * @throws Error when a service apollo.config.js file cannot be found.
   */
  (
    apolloConfig: ApolloConfig<SplitServicesGatewayConfig>,
    error?: ConsoleError,
    requireModule?: Require,
    path?: typeof nodePath,
    cwd?: string
  ): ServiceEndpointDefinition[]
}

/**
 * This code is directly copied from Apollo https://github.com/apollographql/apollo-server/blob/fe3e928c8b55afff5ad0e216490c3c7adb85031c/packages/apollo-gateway/src/index.ts
 * I opened a Feature request for them to export these methods here https://github.com/apollographql/apollo-server/issues/3591
 */
export interface GatewayConfigBase {
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

export interface RemoteGatewayConfig extends GatewayConfigBase {
  serviceList: ServiceEndpointDefinition[]
  introspectionHeaders?: HeadersInit
}

export interface ManagedGatewayConfig extends GatewayConfigBase {
  federationVersion?: number
}
export interface LocalGatewayConfig extends GatewayConfigBase {
  localServiceList: ServiceDefinition[]
}
// End code that was copied from Apollo
