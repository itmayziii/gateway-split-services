import { ApolloConfig, GatewayConfig } from 'apollo-cli-plugin-split-services'
import { getServiceList } from './index'

describe('getServiceList', () => {
  it('throws an error if the service apollo.config.js file cannot be dynamically required', () => {
    const apolloConfig: ApolloConfig<GatewayConfig> = {
      splitServices: {
        services: [
          {
            name: 'orders',
            gitURL: 'https://github.com/BudgetDumpster.com/orders',
            directory: 'services/orders'
          }
        ]
      }
    }
    const pathSpy = jasmine.createSpyObj(['resolve', 'relative'])
    pathSpy.resolve
      .withArgs(jasmine.anything()).and.returnValue('/this/path/node_modules/package')
      .withArgs('/this/path/other/path', 'services/orders', 'apollo.config.js').and.returnValue('/this/path/other/path/services/orders/apollo.config.js')
    pathSpy.relative
      .withArgs('/this/path/node_modules/package', '/this/path/other/path/services/orders/apollo.config.js').and.returnValue('../../other/path/services/orders/apollo.config.js')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requireModuleSpy: any = jasmine.createSpy('requireModule')
      .withArgs('../../other/path/services/orders/apollo.config.js').and.throwError('module not found')
    const errorSpy = jasmine.createSpy('error')

    expect(() => getServiceList(apolloConfig, errorSpy, requireModuleSpy, pathSpy, '/this/path/other/path'))
      .toThrowError('module not found')
  })

  it('should log an error if a service is missing a "url" property', () => {
    const apolloConfig: ApolloConfig<GatewayConfig> = {
      splitServices: {
        services: [
          {
            name: 'orders',
            gitURL: 'https://github.com/BudgetDumpster.com/orders',
            directory: 'services/orders'
          }
        ]
      }
    }
    const pathSpy = jasmine.createSpyObj(['resolve', 'relative'])
    pathSpy.resolve
      .withArgs(jasmine.anything()).and.returnValue('/this/path/node_modules/package')
      .withArgs('/this/path/other/path', 'services/orders', 'apollo.config.js').and.returnValue('/this/path/other/path/services/orders/apollo.config.js')
    pathSpy.relative
      .withArgs('/this/path/node_modules/package', '/this/path/other/path/services/orders/apollo.config.js').and.returnValue('../../other/path/services/orders/apollo.config.js')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requireModuleSpy: any = jasmine.createSpy('requireModule')
      .withArgs('../../other/path/services/orders/apollo.config.js').and.returnValue({})
    const errorSpy = jasmine.createSpy('error')

    getServiceList(apolloConfig, errorSpy, requireModuleSpy, pathSpy, '/this/path/other/path')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('Could not find URL for service orders, please list it in the apollo.config.js file in the service project.')
  })

  it('should return a list of services from the apollo.config.js file', () => {
    const apolloConfig: ApolloConfig<GatewayConfig> = {
      splitServices: {
        services: [
          {
            name: 'orders',
            gitURL: 'https://github.com/BudgetDumpster.com/orders',
            directory: 'services/orders'
          },
          {
            name: 'products',
            gitURL: 'https://github.com/BudgetDumpster.com/products',
            directory: 'services/products'
          }
        ]
      }
    }
    const pathSpy = jasmine.createSpyObj(['resolve', 'relative'])
    pathSpy.resolve
      .withArgs(jasmine.anything()).and.returnValue('/this/path/node_modules/package')
      .withArgs('/this/path/other/path', 'services/orders', 'apollo.config.js').and.returnValue('/this/path/other/path/services/orders/apollo.config.js')
      .withArgs('/this/path/other/path', 'services/products', 'apollo.config.js').and.returnValue('/this/path/other/path/services/products/apollo.config.js')
    pathSpy.relative
      .withArgs('/this/path/node_modules/package', '/this/path/other/path/services/orders/apollo.config.js').and.returnValue('../../other/path/services/orders/apollo.config.js')
      .withArgs('/this/path/node_modules/package', '/this/path/other/path/services/products/apollo.config.js').and.returnValue('../../other/path/services/products/apollo.config.js')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requireModuleSpy: any = jasmine.createSpy('requireModule')
      .withArgs('../../other/path/services/orders/apollo.config.js').and.returnValue({ splitServices: { url: 'http://localhost:4200/graphql' } })
      .withArgs('../../other/path/services/products/apollo.config.js').and.returnValue({ splitServices: { url: 'http://localhost:4400/graphql' } })
    const errorSpy = jasmine.createSpy('error')

    const actual = getServiceList(apolloConfig, errorSpy, requireModuleSpy, pathSpy, '/this/path/other/path')
    const expected = [{ name: 'orders', url: 'http://localhost:4200/graphql' }, { name: 'products', url: 'http://localhost:4400/graphql' }]
    expect(actual).toEqual(expected)
  })
})

// describe('startGateway', () => {
//   it('should start the gateway with the local configuration if in unmanaged mode', () => {
//     process.env.ENGINE_API_KEY = undefined
//     const apolloConfig: ApolloConfig<GatewayConfig> = {
//       splitServices: {
//         services: [
//           {
//             name: 'orders',
//             gitURL: 'https://github.com/BudgetDumpster.com/orders',
//             directory: 'services/orders'
//           }
//         ]
//       }
//     }
//     const serverSpy = jasmine.createSpyObj('ApolloServer', [''])
//     const gatewaySpy = jasmine.createSpyObj('ApolloGateway', [''])
//     const retrieveServiceListSpy = jasmine.createSpy('retrieveServiceList')
//       .and.returnValue({ name: 'orders', url: 'http://localhost:4200/graphql' })
//     return startGateway(apolloConfig, serverSpy, gatewaySpy, {}, retrieveServiceListSpy)
//       .then((val: any) => expect(val).toBe('Server Info'))
//   })
// })
